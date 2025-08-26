# app/service/service.py

import os
import time
import random
import logging
import email.utils
import traceback
import re
import html
import io
import base64
from datetime import datetime, timezone, date
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

import httpx
import pandas as pd
from app.domain.media.repository import MediaRepository

logger = logging.getLogger("materiality.service")

# ──────────────────────────────────────────────────────────────────────────────
# 카테고리 처리 및 검색 키워드 생성
# ──────────────────────────────────────────────────────────────────────────────

def process_materiality_categories(categories: List[Any]) -> Tuple[List[str], Dict[str, str]]:
    """materiality_category 데이터를 처리하여 슬래시로 분리하고 원본 카테고리와 매핑"""
    try:
        logger.info(f"🔍 process_materiality_categories 시작: {len(categories)}개 카테고리 입력")
        
        # 카테고리를 슬래시로 분리하여 개별 이슈로 만들기
        all_issues = []
        issue_to_category = {}  # 이슈 -> 원본 카테고리 매핑
        
        for i, category in enumerate(categories):
            # Pydantic BaseModel의 경우 getattr을 사용하거나 직접 속성에 접근
            try:
                category_name = getattr(category, 'category_name', None)
                if category_name:
                    # 슬래시(/)로 구분된 카테고리를 개별 이슈로 분리
                    issues = [issue.strip() for issue in category_name.split('/') if issue.strip()]
                    
                    for issue in issues:
                        all_issues.append(issue)
                        issue_to_category[issue] = category_name  # 각 이슈를 원본 카테고리와 매핑
                else:
                    logger.warning(f"    category_name이 비어있음: {category}")
            except Exception as attr_error:
                logger.error(f"    category_name 속성 접근 오류: {attr_error}")
                logger.error(f"    category 객체: {category}")
        
        # 중복 제거 및 정렬
        unique_issues = sorted(list(set(all_issues)))
        
        logger.info(f"✅ materiality_category에서 {len(categories)}개 카테고리를 가져와서 {len(unique_issues)}개 이슈로 분리했습니다.")
        logger.info(f"📋 이슈 목록: {unique_issues}")
        
        return unique_issues, issue_to_category
        
    except Exception as e:
        logger.error(f"❌ materiality_category 처리 실패: {str(e)}")
        logger.error(f"상세 오류: {traceback.format_exc()}")
        # 기본 이슈 반환
        default_issues = ["ESG", "지속가능성", "중대성"]
        default_mapping = {issue: issue for issue in default_issues}
        return default_issues, default_mapping

# ──────────────────────────────────────────────────────────────────────────────
# 네이버 뉴스 API 클라이언트 (동기)  — service에서 to_thread로 실행
# ──────────────────────────────────────────────────────────────────────────────

BASE_URL = "https://openapi.naver.com/v1/search/news.json"
MAX_DISPLAY = 100  # 네이버 API 최대값 유지
MAX_START_LIMIT = 1000
JITTER_RANGE = (0.02, 0.08)  # 지터 범위를 줄여서 더 빠르게


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

        self.min_interval = float(os.getenv("NAVER_API_MIN_INTERVAL", "0.8") if min_interval is None else min_interval)  # 1.2 → 0.8초로 단축
        self.per_keyword_pause = float(os.getenv("NAVER_API_PER_KEYWORD_PAUSE", "1.0") if per_keyword_pause is None else per_keyword_pause)  # 2.0 → 1.0초로 단축
        self.max_retries = int(os.getenv("NAVER_API_MAX_RETRIES", "3") if max_retries is None else max_retries)

        self._last_request_ts = 0.0

        self.session = httpx.Client()
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
                    raise httpx.HTTPStatusError(f"HTTP {resp.status_code}: {resp.text[:160]}")
                resp.raise_for_status()
                return resp.json()
            except httpx.RequestError as e:
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
# 데이터 정제 함수들 (tuning.py 기반)
# ──────────────────────────────────────────────────────────────────────────────

def strip_html(text: str) -> str:
    """HTML 태그 제거 및 엔티티 해제"""
    if not text or pd.isna(text):
        return ""
    s = str(text)
    s = re.sub(r'<\s*br\s*/?>', ' ', s, flags=re.I)  # <br> → 공백
    s = re.sub(r'<[^>]+>', '', s)   # 모든 태그 제거
    s = html.unescape(s)             # &quot; 등 엔티티 해제
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def clean_pubdate(pubdate_str: str) -> str:
    """pubDate를 'Thu, 14 Aug 2025' 형태로 정제"""
    if not pubdate_str:
        return ""
    
    try:
        # RFC 2822 형식 파싱 (Thu, 14 Aug 2025 07:08:00 +0900)
        dt = email.utils.parsedate_to_datetime(pubdate_str)
        if dt:
            # 요일, 일, 월, 년도만 추출
            return dt.strftime("%a, %d %b %Y")
    except Exception:
        pass
    
    # 파싱 실패 시 원본 반환
    return str(pubdate_str)


def norm_plain(text: str) -> str:
    """일반 정규화(영문+한글)"""
    s = strip_html(text).lower()
    s = re.sub(r'[^가-힣a-z0-9]', '', s)
    return s


def has_triangle_then_company(desc: str, company: str) -> bool:
    """△/▲ 뒤에 회사명이 나오면 True (혼합표기 시 한글만 일치도 허용)"""
    if not desc or not company:
        return False
    
    d = strip_html(desc).lower()
    comp_norm = norm_plain(company)
    
    if not comp_norm:
        return False
    
    # △/▲ 이후 회사명이 나오는지 확인
    pattern = rf'[△▲][^△▲]*{re.escape(comp_norm)}'
    return bool(re.search(pattern, d))


def filter_news_items(items: List[Dict[str, Any]], company: str) -> List[Dict[str, Any]]:
    """뉴스 아이템 필터링 및 정제"""
    if not items:
        return []
    
    filtered_items = []
    
    for item in items:
        # HTML 태그 제거
        if "title" in item:
            item["title"] = strip_html(item["title"])
        if "description" in item:
            item["description"] = strip_html(item["description"])
        
        # pubDate 정제
        if "pubDate" in item:
            item["pubDate"] = clean_pubdate(item["pubDate"])
        
        # △/▲ 뒤에 회사명이 나오는 기사 제외
        if has_triangle_then_company(item.get("description", ""), company):
            continue
        
        # 불용 키워드 기사 제외 (완화된 버전)
        # 너무 엄격한 필터링으로 인해 기사가 모두 제거되는 것을 방지
        keywords = ["부고", "기고"]  # 정말 불필요한 것만 제외
        pattern = "|".join(keywords)
        
        title = item.get("title", "").lower()
        description = item.get("description", "").lower()
        
        # 제목과 내용 모두에 불용 키워드가 있는 경우만 제외
        if re.search(pattern, title) and re.search(pattern, description):
            continue
        
        filtered_items.append(item)
    
    return filtered_items


def _make_excel_bytes(items: List[Dict[str, Any]], company_id: str) -> Tuple[str, bytes]:
    """엑셀을 메모리에서 생성하여 바이트와 파일명 반환"""
    if not items:
        raise ValueError("엑셀 생성할 데이터가 없습니다")
    
    try:
        # DataFrame 생성 전 데이터 정리
        cleaned_items = []
        for item in items:
            cleaned_item = {}
            for key, value in item.items():
                # None 값과 빈 문자열 처리
                if value is None:
                    cleaned_item[key] = ""
                elif isinstance(value, (dict, list)):
                    cleaned_item[key] = str(value)
                else:
                    cleaned_item[key] = str(value).strip() if isinstance(value, str) else value
            cleaned_items.append(cleaned_item)
        
        # DataFrame 생성
        df = pd.DataFrame(cleaned_items)
        logger.info(f"📊 DataFrame 생성 완료: {df.shape[0]}행 x {df.shape[1]}열")
        
        # 컬럼 순서 정리
        columns_order = [
            'company', 'issue', 'original_category', 'query_kind', 'keyword',
            'title', 'description', 'pubDate', 'originallink', '네이버링크'
        ]
        
        # 존재하는 컬럼만 선택
        existing_columns = [col for col in columns_order if col in df.columns]
        df_ordered = df[existing_columns]
        
        # NaN 값 처리
        df_ordered = df_ordered.fillna("")
        
        # 메모리에서 엑셀 생성
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df_ordered.to_excel(writer, sheet_name="검색결과", index=False)
            
            # 워크시트 스타일링
            worksheet = writer.sheets["검색결과"]
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width
        
        buf.seek(0)
        excel_bytes = buf.getvalue()
        
        # 파일명 생성
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"media_search_{company_id}_{timestamp_str}.xlsx"
        
        logger.info(f"✅ 메모리에서 엑셀 생성 완료: {filename} (크기: {len(excel_bytes)} bytes)")
        
        return filename, excel_bytes
        
    except Exception as e:
        logger.error(f"❌ 엑셀 생성 중 오류: {str(e)}")
        logger.error(f"상세 오류: {traceback.format_exc()}")
        raise


# ──────────────────────────────────────────────────────────────────────────────
# 서비스 엔트리포인트 (비동기)
# ──────────────────────────────────────────────────────────────────────────────

async def search_media(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    프론트에서 전달한 JSON(payload)을 받아, 회사×이슈 조합으로
    네이버 뉴스 API를 검색한 뒤 JSON 결과를 반환한다.

    반환 형식:
    {
        "success": True,
        "message": "...",
        "data": {
            "company_id": "...",
            "search_period": {"start_date": "...", "end_date": "..."},
            "search_type": "...",
            "total_results": int,
            "articles": [...],  # title, description, pubDate, originallink, 네이버링크, company, issue, keyword, query_kind
        },
        "timestamp": "...(요청에서 받은 값 그대로 반환)"
    }
    """
    # 요청 데이터 파싱
    company_id: str = payload.get("company_id") or payload.get("companyname") or ""
    if not company_id:
        raise ValueError("company_id 가 필요합니다.")

    rp: Dict[str, Any] = payload.get("report_period") or {}
    start_date: str = rp.get("start_date")
    if not start_date:
        raise ValueError("report_period.start_date 가 필요합니다.")

    # end_date는 '검색 당일'로 유동 적용
    end_date: str = date.today().isoformat()

    search_type: str = payload.get("search_type", "materiality_assessment")
    timestamp: Optional[str] = payload.get("timestamp")

    logger.info("🔍 매체검색: company_id=%s, start=%s, end=%s, type=%s", company_id, start_date, end_date, search_type)

    # materiality_category 테이블에서 카테고리 가져오기 (리포지토리 사용)
    try:
        repository = MediaRepository()
        # 동기 함수에서 비동기 리포지토리 호출을 위해 더 안전한 방식 사용
        import asyncio
        import concurrent.futures
        
        # 새 스레드에서 비동기 함수 실행
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, repository.get_all_materiality_categories())
            categories = future.result()
        
        # 카테고리 데이터 처리
        logger.info(f"🔍 DB에서 가져온 카테고리 데이터: {len(categories)}개")
        tokens, issue_to_category = process_materiality_categories(categories)
            
    except Exception as e:
        logger.error(f"❌ materiality_category 조회 실패: {str(e)}")
        logger.error(f"상세 오류: {traceback.format_exc()}")
        # 기본 토큰 사용
        tokens = ["ESG", "지속가능성", "중대성"]
        issue_to_category = {token: token for token in tokens}

    # 토큰이 없으면 회사명 단독 검색만 수행
    if not tokens:
        logger.warning("카테고리 토큰이 없어 회사명 단독 검색만 수행합니다. company=%s", company_id)

    # 네이버 API 클라이언트
    try:
        # 동기 클라이언트 초기화를 비동기로 실행
        import asyncio
        loop = asyncio.get_event_loop()
        client = await loop.run_in_executor(None, NaverNewsClient)
        logger.info("✅ NaverNewsClient 초기화 성공")
    except Exception as e:
        logger.error(f"❌ NaverNewsClient 초기화 실패: {str(e)}")
        logger.error(f"상세 오류: {traceback.format_exc()}")
        raise ValueError(f"네이버 API 클라이언트 초기화 실패: {str(e)}")

    # 질의 목록 구성: (회사명 + 토큰) + 회사명 단독
    queries: List[Dict[str, Any]] = []
    max_results_per_keyword = int(os.getenv("NAVER_MAX_RESULTS_PER_KEYWORD", "500"))  # 300 → 500으로 증가
    unique_company_max_results = int(os.getenv("NAVER_UNIQUE_COMPANY_MAX_RESULTS", "300"))  # 150 → 300으로 증가

    for tok in tokens:
        # 검색 키워드를 더 단순하게 구성
        keyword = f"{company_id} {tok}"
        queries.append(
            {
                "keyword": keyword,
                "company": company_id,
                "issue": tok,
                "query_kind": "company_issue",
                "max_results": max_results_per_keyword,
            }
        )
        
        # 회사명만으로도 검색 추가 (더 많은 결과를 위해)
        if tok:  # 빈 토큰이 아닌 경우에만
            queries.append(
                {
                    "keyword": company_id,  # 회사명만
                    "company": company_id,
                    "issue": tok,
                    "query_kind": "company_only_issue",
                    "max_results": max_results_per_keyword // 2,  # 절반만
                }
            )

    # 회사명 단독 검색도 추가
    queries.append(
        {
            "keyword": company_id,
            "company": company_id,
            "issue": "",
            "query_kind": "company_only",
            "max_results": unique_company_max_results,
        }
    )

                   # 실행
               all_items: List[Dict[str, Any]] = []
               
               # 간단한 테스트 검색 먼저 시도
               try:
                   logger.info("🔍 간단한 테스트 검색 시작: '세방'")
                   test_result = await loop.run_in_executor(
                       None, 
                       client.search, 
                       "세방"
                   )
                   logger.info(f"✅ 테스트 검색 결과: {len(test_result.get('items', []))}개 기사")
                   
                   # 테스트 결과를 all_items에 추가
                   for it in test_result.get("items", []):
                       it["company"] = company_id
                       it["issue"] = "테스트"
                       it["keyword"] = "세방"
                       it["query_kind"] = "test_search"
                       it["original_category"] = "테스트"
                       all_items.append(it)
                       
               except Exception as e:
                   logger.error(f"❌ 테스트 검색 실패: {str(e)}")
                   logger.error(f"상세 오류: {traceback.format_exc()}")
               
               # 기존 검색 로직
               for q in queries:
                   kw = q["keyword"]
                   company = q["company"]
                   issue = q["issue"]
                   query_kind = q["query_kind"]
                   per_kw_limit = int(q["max_results"])
                   logger.info("▶︎ 네이버 검색 시작 [%s]: %s (%s~%s, limit=%d)", query_kind, kw, start_date, end_date, per_kw_limit)
                   try:
                       # 동기 함수를 비동기로 실행
                       import asyncio
                       loop = asyncio.get_event_loop()
                       result = await loop.run_in_executor(
                           None, 
                           client.search_by_date_range,
                           kw, start_date, end_date, per_kw_limit
                       )
                       for it in result.get("items", []):
                           it["company"] = company
                           it["issue"] = issue
                           it["keyword"] = kw
                           it["query_kind"] = query_kind
                           # 원본 카테고리 정보 추가
                           if issue in issue_to_category:
                               it["original_category"] = issue_to_category[issue]
                           else:
                               it["original_category"] = issue
                           all_items.append(it)
                       # 키워드 간 간격 (지터 포함) - 비동기로 대기
                       await asyncio.sleep(max(0.0, client.per_keyword_pause) + random.uniform(*JITTER_RANGE))
                   except Exception as e:
                       logger.error("검색 실패 [%s] %s: %s", query_kind, kw, e)

                   if not all_items:
                   logger.warning("수집된 뉴스가 없습니다. company=%s", company_id)
                   logger.warning("🔍 검색된 기사가 0건입니다. 다음을 확인해보세요:")
                   logger.warning("  1. 검색 키워드: %s", [q["keyword"] for q in queries])
                   logger.warning("  2. 검색 기간: %s ~ %s", start_date, end_date)
                   logger.warning("  3. 네이버 API 응답 확인 필요")
                   logger.warning("  4. 네이버 API 키 설정 확인 필요")
                   logger.warning("  5. 네이버 API 할당량 확인 필요")
               else:
                   logger.info(f"✅ 네이버 API에서 총 {len(all_items)}건의 기사를 수집했습니다.")
                   logger.info(f"📊 기사 샘플: {[item.get('title', '제목없음')[:30] for item in all_items[:3]]}")

    # URL 기준 중복 제거(기업 범위 내)
    try:
        all_items = _dedupe_by_url(all_items)
        logger.info(f"✅ 중복 제거 완료: {len(all_items)}개 기사")
    except Exception as e:
        logger.warning("중복 제거 중 오류(무시하고 계속): %s", e)

    # 데이터 정제
    try:
        original_count = len(all_items)
        all_items = filter_news_items(all_items, company_id)
        filtered_count = len(all_items)
        logger.info(f"✅ 데이터 정제 완료: {original_count}개 → {filtered_count}개 기사")
    except Exception as e:
        logger.warning("데이터 정제 중 오류(무시하고 계속): %s", e)

    # 엑셀 생성 (메모리에서)
    excel_filename = None
    excel_base64 = None
    if all_items:
        try:
            # 동기 엑셀 생성 함수를 비동기로 실행
            import asyncio
            loop = asyncio.get_event_loop()
            filename, excel_bytes = await loop.run_in_executor(
                None, 
                _make_excel_bytes, 
                all_items, 
                company_id
            )
            excel_filename = filename
            excel_base64 = base64.b64encode(excel_bytes).decode("ascii")
            logger.info(f"✅ 엑셀 생성 완료: {filename} (Base64 길이: {len(excel_base64)})")
        except Exception as e:
            logger.error(f"❌ 엑셀 생성 중 오류: {str(e)}")
            logger.error(f"상세 오류: {traceback.format_exc()}")
            excel_filename = None
            excel_base64 = None

    response = {
        "success": True,
        "message": "미디어 검색 요청이 성공적으로 처리되었습니다",
        "data": {
            "company_id": company_id,
            "search_period": {"start_date": start_date, "end_date": end_date},
            "search_type": search_type,
            "total_results": len(all_items),
            "articles": all_items,  # 그대로 반환 (title/description/pubDate/originallink/네이버링크 등 포함)
        },
        "timestamp": timestamp,
        "excel_filename": excel_filename,
        "excel_base64": excel_base64
    }
    return response
