# app/domain/media/service.py

from __future__ import annotations

import os
import time
import random
import logging
import email.utils
import asyncio
from datetime import datetime, timezone, date
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

import requests

from app.domain.media.repository import MediaRepository

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# 네이버 뉴스 API 클라이언트 (동기)  — service에서 to_thread로 실행
# ──────────────────────────────────────────────────────────────────────────────

BASE_URL = "https://openapi.naver.com/v1/search/news.json"
MAX_DISPLAY = 100
MAX_START_LIMIT = 1000
JITTER_RANGE = (0.05, 0.25)


class NaverNewsClient:
    def __init__(
        self,
        *,
        min_interval: float | None = None,
        per_keyword_pause: float | None = None,
        max_retries: int | None = None,
    ) -> None:
        self.client_id = os.getenv("NAVER_CLIENT_ID")
        self.client_secret = os.getenv("NAVER_CLIENT_SECRET")
        if not self.client_id or not self.client_secret:
            raise ValueError("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 필요합니다.")

        self.min_interval = float(os.getenv("NAVER_API_MIN_INTERVAL", "1.2") if min_interval is None else min_interval)
        self.per_keyword_pause = float(os.getenv("NAVER_API_PER_KEYWORD_PAUSE", "2.0") if per_keyword_pause is None else per_keyword_pause)
        self.max_retries = int(os.getenv("NAVER_API_MAX_RETRIES", "3") if max_retries is None else max_retries)

        self._last_request_ts = 0.0

        self.session = requests.Session()
        self.session.headers.update(
            {
                "X-Naver-Client-Id": self.client_id,
                "X-Naver-Client-Secret": self.client_secret,
                "User-Agent": "materiality-service/1.0",
            }
        )

    # 내부 유틸 (동기)
    def _throttle(self) -> None:
        elapsed = time.time() - self._last_request_ts
        wait = self.min_interval - elapsed
        if wait > 0:
            time.sleep(wait + random.uniform(*JITTER_RANGE))
        self._last_request_ts = time.time()

    def _request_with_retry(self, params: Dict[str, Any]) -> Dict[str, Any]:
        last_exc: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                self._throttle()
                resp = self.session.get(BASE_URL, params=params, timeout=10)
                if resp.status_code == 429 or 500 <= resp.status_code < 600:
                    raise requests.HTTPError(f"HTTP {resp.status_code}: {resp.text[:180]}")
                resp.raise_for_status()
                return resp.json()
            except requests.RequestException as e:
                last_exc = e
                backoff = (self.min_interval * (2 ** (attempt - 1))) + random.uniform(*JITTER_RANGE)
                logger.warning("네이버 API 요청 실패(%s/%s): %s → %.2fs 후 재시도", attempt, self.max_retries, e, backoff)
                time.sleep(backoff)
        logger.error("네이버 뉴스 API 요청 실패(최대 재시도 초과): %s", last_exc)
        raise last_exc if last_exc else RuntimeError("Unknown request error")

    # 동기 API
    def search(self, keyword: str, *, display: int = MAX_DISPLAY, sort: str = "date", start: int = 1) -> Dict[str, Any]:
        return self._request_with_retry({"query": keyword, "display": display, "sort": sort, "start": start})

    def search_by_date_range(
        self,
        *,
        keyword: str,
        start_date: str,
        end_date: str,
        max_results: int = 300,
    ) -> Dict[str, Any]:
        """pubDate가 start_date~end_date 내인 기사만 수집 (동기)"""
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if start_dt > end_dt:
            raise ValueError("시작 날짜가 종료 날짜보다 늦습니다.")

        collected: List[Dict[str, Any]] = []
        start = 1
        display = MAX_DISPLAY

        while start <= max_results and len(collected) < max_results:
            data = self.search(keyword, display=display, sort="date", start=start)
            items = data.get("items", [])
            if not items:
                break

            for item in items:
                try:
                    pub_dt = email.utils.parsedate_to_datetime(item.get("pubDate", ""))
                except Exception:
                    continue
                if not pub_dt:
                    continue
                if start_dt <= pub_dt <= end_dt:
                    origin = (item.get("originallink") or "").strip()
                    link = (item.get("link") or "").strip()
                    item["네이버링크"] = link if ("n.news.naver.com" in link) else ""
                    item["원본링크"] = origin
                    collected.append(item)

            start += display
            if start > MAX_START_LIMIT:
                break

        return {"total": len(collected), "items": collected[:max_results], "start_date": start_date, "end_date": end_date}

    # URL 정규화 (중복 제거용 키)
    @staticmethod
    def canonicalize_url(url: str) -> str:
        if not url:
            return ""
        try:
            p = urlparse(url.strip())
            netloc = p.netloc.lower()
            if netloc.startswith("www."):
                netloc = netloc[4:]
            drop_keys = {
                "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
                "gclid", "fbclid", "igshid", "mc_cid", "mc_eid", "ref"
            }
            q = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True) if k not in drop_keys]
            path = p.path.rstrip("/")
            return urlunparse((p.scheme, netloc, path, "", urlencode(q, doseq=True), ""))
        except Exception:
            return url.strip()


# ──────────────────────────────────────────────────────────────────────────────
# 유틸: 카테고리 슬래시 분해 & 중복 제거
# ──────────────────────────────────────────────────────────────────────────────

def _split_category_tokens(raw: str | None) -> List[str]:
    """
    'A/B/C' 또는 'A／B｜C' 형태의 카테고리를 '/' 기준으로 분해하여 토큰 리스트 생성.
    공백 제거 및 빈 토큰 제거.
    """
    if not raw:
        return []
    s = str(raw).strip().replace("／", "/").replace("｜", "/")
    return [p.strip() for p in s.split("/") if p and p.strip()]


def _dedupe_by_url(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """기업 범위에서 URL(정규화) 기준 중복 제거"""
    seen: set[Tuple[str, str]] = set()
    out: List[Dict[str, Any]] = []
    for it in items:
        url_raw = it.get("originallink") or it.get("원본링크") or it.get("link") or it.get("네이버링크") or ""
        key = NaverNewsClient.canonicalize_url(url_raw)
        pair = (it.get("company", ""), key)
        if pair in seen:
            continue
        seen.add(pair)
        out.append(it)
    return out


# ──────────────────────────────────────────────────────────────────────────────
# 서비스 엔트리포인트 (비동기)
# ──────────────────────────────────────────────────────────────────────────────

async def search_media(search_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    controller → service 진입점.
    - search_data: {'company_id': '...', 'report_period': {'start_date': 'YYYY-MM-DD', 'end_date': '...'}, ...}
    - end_date는 무시하고 '오늘 날짜'로 자동 설정.
    - repository에서 모든 카테고리를 BaseModel로 받아와 category_name을 '/' 분해하여 토큰 생성.
    """
    company_id = (search_data or {}).get("company_id") or (search_data or {}).get("companyname") or ""
    if not company_id:
        return {"success": False, "message": "company_id가 필요합니다."}

    rp = (search_data or {}).get("report_period") or {}
    start_date = rp.get("start_date")
    if not start_date:
        return {"success": False, "message": "report_period.start_date가 필요합니다."}

    # 검색 종료일은 '요청 시점의 당일'
    end_date = date.today().isoformat()
    search_type = (search_data or {}).get("search_type", "materiality_assessment")
    timestamp = (search_data or {}).get("timestamp")

    logger.info("🔎 미디어 검색: company=%s, start=%s, end=%s, type=%s", company_id, start_date, end_date, search_type)

    # 1) Repository에서 모든 카테고리(BaseModel) 조회 후 토큰화
    repo = MediaRepository()
    category_models = await repo.get_all_materiality_categories()  # List[MaterialityCategoryRequest]
    tokens: List[str] = []
    for cm in category_models or []:
        # BaseModel: MaterialityCategoryRequest(category_name, esg_classification_id)
        tokens.extend(_split_category_tokens(getattr(cm, "category_name", None)))

    # 중복 제거 & 정렬
    tokens = sorted({t for t in tokens if t})

    if not tokens:
        logger.warning("카테고리 토큰이 비어 있어 회사명 단독 검색만 수행합니다.")

    # 2) 네이버 클라이언트 설정
    client = NaverNewsClient()

    # 환경변수 기반 튜닝
    max_results_per_keyword = int(os.getenv("NAVER_MAX_RESULTS_PER_KEYWORD", "300"))
    unique_company_max_results = int(os.getenv("NAVER_UNIQUE_COMPANY_MAX_RESULTS", "150"))

    # 3) 질의 구성: (회사명 × 토큰) + 회사명 단독
    queries: List[Dict[str, Any]] = []
    for tok in tokens:
        queries.append(
            {
                "keyword": f"{company_id} {tok}",
                "company": company_id,
                "issue": tok,
                "query_kind": "company_issue",
                "max_results": max_results_per_keyword,
            }
        )
    # 회사명 단독
    queries.append(
        {
            "keyword": company_id,
            "company": company_id,
            "issue": "",
            "query_kind": "company_only",
            "max_results": unique_company_max_results,
        }
    )

    # 4) 실행 (동기 클라이언트를 스레드로 돌림)
    all_items: List[Dict[str, Any]] = []
    for q in queries:
        kw = q["keyword"]
        company = q["company"]
        issue = q["issue"]
        query_kind = q["query_kind"]
        per_kw_limit = int(q["max_results"])

        logger.info("▶︎ 네이버 검색 시작 [%s]: %s (%s~%s, limit=%d)", query_kind, kw, start_date, end_date, per_kw_limit)

        try:
            result: Dict[str, Any] = await asyncio.to_thread(
                client.search_by_date_range,
                keyword=kw,
                start_date=start_date,
                end_date=end_date,
                max_results=per_kw_limit,
            )
            for it in result.get("items", []):
                it["company"] = company
                it["issue"] = issue
                it["keyword"] = kw
                it["query_kind"] = query_kind
                all_items.append(it)

            # 키워드 간 대기 (이건 비동기 sleep)
            await asyncio.sleep(max(0.0, client.per_keyword_pause) + random.uniform(*JITTER_RANGE))
        except Exception as e:
            logger.error("검색 실패 [%s] %s: %s", query_kind, kw, e)

    if not all_items:
        logger.warning("수집된 뉴스가 없습니다. company=%s", company_id)

    # 5) 중복 제거
    try:
        all_items = _dedupe_by_url(all_items)
    except Exception as e:
        logger.warning("중복 제거 중 오류: %s (무시)", e)

    # 6) 결과 반환(JSON)
    return {
        "success": True,
        "message": "미디어 검색 요청이 성공적으로 처리되었습니다",
        "data": {
            "company_id": company_id,
            "search_period": {"start_date": start_date, "end_date": end_date},
            "search_type": search_type,
            "total_results": len(all_items),
            "articles": all_items,
        },
        "timestamp": timestamp,
    }
