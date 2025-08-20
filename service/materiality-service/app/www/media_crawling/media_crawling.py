"""
네이버 뉴스 API 크롤러 (날짜필터 + 쓰로틀/백오프 + 학습데이터 엑셀 생성)
"""
import os
import time
import random
import logging
import email.utils
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

import requests
import pandas as pd
from dotenv import load_dotenv

# .env 로드 (서비스 루트가 따로 있다면 여기에 경로 지정)
load_dotenv()

# ── 로거 ────────────────────────────────────────────────────────────────────────
logger = logging.getLogger("naver-news")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# ── 상수 ────────────────────────────────────────────────────────────────────────
BASE_URL = "https://openapi.naver.com/v1/search/news.json"
MAX_DISPLAY = 100           # 네이버 API 최대 display
MAX_START_LIMIT = 1000      # 네이버 API start 최대 한도
JITTER_RANGE = (0.05, 0.25) # 지터 범위(초)


class NaverNewsCrawler:
    """네이버 뉴스 API 크롤러"""

    def __init__(
        self,
        min_interval: float = None,
        per_keyword_pause: float = None,
        max_retries: int = None,
    ):
        self.client_id = os.getenv("NAVER_CLIENT_ID")
        self.client_secret = os.getenv("NAVER_CLIENT_SECRET")
        if not self.client_id or not self.client_secret:
            raise ValueError("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이(가) 없습니다.")

        # 요청 간 최소 간격/키워드 간 간격/재시도
        self.min_interval = float(os.getenv("NAVER_API_MIN_INTERVAL", "1.2") if min_interval is None else min_interval)
        self.per_keyword_pause = float(os.getenv("NAVER_API_PER_KEYWORD_PAUSE", "2.0") if per_keyword_pause is None else per_keyword_pause)
        self.max_retries = int(os.getenv("NAVER_API_MAX_RETRIES", "3") if max_retries is None else max_retries)

        self._last_request_ts = 0.0

        # 세션
        self.session = requests.Session()
        self.session.headers.update({
            "X-Naver-Client-Id": self.client_id,
            "X-Naver-Client-Secret": self.client_secret,
            "User-Agent": "materiality-service/1.0",
        })

    # ── 내부 유틸 ───────────────────────────────────────────────────────────────
    def _throttle(self) -> None:
        """요청 간 최소 간격 + 지터"""
        elapsed = time.time() - self._last_request_ts
        wait = self.min_interval - elapsed
        if wait > 0:
            time.sleep(wait + random.uniform(*JITTER_RANGE))
        self._last_request_ts = time.time()

    def _request_with_retry(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """재시도/백오프 래퍼"""
        last_exc: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                self._throttle()
                resp = self.session.get(BASE_URL, params=params, timeout=10)
                if resp.status_code == 429 or 500 <= resp.status_code < 600:
                    raise requests.HTTPError(f"HTTP {resp.status_code}: {resp.text[:160]}")
                resp.raise_for_status()
                return resp.json()
            except requests.RequestException as e:
                last_exc = e
                backoff = (self.min_interval * (2 ** (attempt - 1))) + random.uniform(*JITTER_RANGE)
                logger.warning("요청 실패(%s/%s): %s → %.2fs 대기 후 재시도", attempt, self.max_retries, e, backoff)
                time.sleep(backoff)
        logger.error("네이버 뉴스 API 요청 실패(최대 재시도 초과): %s", last_exc)
        raise last_exc if last_exc else RuntimeError("Unknown request error")

    # ── API ────────────────────────────────────────────────────────────────────
    def search_news(self, keyword: str, display: int = 5, sort: str = "date", start: int = 1) -> Dict[str, Any]:
        return self._request_with_retry({"query": keyword, "display": display, "sort": sort, "start": start})

    def search_news_by_date_range(
        self,
        keyword: str,
        start_date: str,
        end_date: str,
        max_results: int = 100,
    ) -> Dict[str, Any]:
        """pubDate가 start_date~end_date 내인 기사만 수집"""
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if start_dt > end_dt:
            raise ValueError("시작 날짜가 종료 날짜보다 늦습니다.")

        collected: List[Dict[str, Any]] = []
        start = 1
        display = MAX_DISPLAY

        while start <= max_results and len(collected) < max_results:
            result = self.search_news(keyword, display=display, start=start, sort="date")
            items = result.get("items", [])
            if not items:
                break

            for item in items:
                try:
                    pub_dt = email.utils.parsedate_to_datetime(item["pubDate"])
                except Exception:
                    continue
                if start_dt <= pub_dt <= end_dt:
                    # 링크 정규화(필요시 활용). 최종 저장 컬럼에는 포함하지 않음.
                    origin = item.get("originallink", "")
                    link = item.get("link", "")
                    item["네이버링크"] = link if ("n.news.naver.com" in (link or "")) else ""
                    item["원본링크"] = origin
                    collected.append(item)

            start += display
            if start > MAX_START_LIMIT:
                break

        return {"total": len(collected), "items": collected[:max_results], "start_date": start_date, "end_date": end_date}

    # ── 저장 헬퍼 ───────────────────────────────────────────────────────────────
    @staticmethod
    def _auto_fit_columns(ws) -> None:
        for column in ws.columns:
            max_len = 0
            col_letter = column[0].column_letter
            for cell in column:
                v = "" if cell.value is None else str(cell.value)
                if len(v) > max_len:
                    max_len = len(v)
            ws.column_dimensions[col_letter].width = min(max_len + 2, 50)

    def save_to_excel(self, data: Dict[str, Any], filename: str = "naver_news_results.xlsx") -> str:
        """단일 검색결과를 보기 좋게 엑셀로 저장 (한글 컬럼)"""
        items = data.get("items", [])
        if not items:
            logger.warning("저장할 뉴스 데이터가 없습니다.")
            return ""

        df = pd.DataFrame(items)
        df["검색_시작일"] = data.get("start_date", "")
        df["검색_종료일"] = data.get("end_date", "")
        df["총_검색결과수"] = data.get("total", 0)

        df = df.rename(columns={
            "title": "제목",
            "description": "요약",
            "pubDate": "발행일",
            "원본링크": "원본링크",
            "네이버링크": "네이버링크",
        })
        display_columns = ["제목", "요약", "발행일", "원본링크", "네이버링크", "검색_시작일", "검색_종료일", "총_검색결과수"]
        df = df.reindex(columns=display_columns)

        xlsx_path = Path.cwd() / filename
        with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="뉴스검색결과", index=False)
            self._auto_fit_columns(writer.sheets["뉴스검색결과"])

        logger.info("엑셀 저장 완료: %s", xlsx_path)
        return str(xlsx_path)

    def build_training_dataset(
        self,
        excel_path: str,
        output_file: str = "2023,2022년 중대성평가 목록 기반 뉴스데이터(중복허용).xlsx",
        start_date: str = "2023-01-01",
        end_date: str = "2023-12-31",
        max_results_per_keyword: int = 1000,
        *,
        # ⬇️ 추가된 옵션
        search_unique_companies: bool = True,
        unique_company_max_results: int = 300,
        deduplicate: bool = True,
    ) -> str:
        """
        입력 엑셀(기업명, 중대성평가 목록) 기반으로 기사 크롤링 후
        학습 데이터 엑셀 생성.
        최종 컬럼: title, description, originallink, pubDate, company, issue, keyword, query_kind
        query_kind ∈ {"company_issue", "company_only"}
        """
        seed_df = pd.read_excel(excel_path)

        # ── 1) 질의 목록 구성 ─────────────────────────────────────────────
        queries: List[Dict[str, str]] = []

        # 1-1) 기존: "기업명 + 이슈" 조합
        for _, row in seed_df.iterrows():
            company = str(row["기업명"]).strip() if pd.notna(row.get("기업명")) else ""
            issue = str(row["중대성평가 목록"]).strip() if pd.notna(row.get("중대성평가 목록")) else ""
            if not company or not issue:
                continue
            queries.append({
                "keyword": f"{company} {issue}",
                "company": company,
                "issue": issue,
                "query_kind": "company_issue",
                "max_results": str(max_results_per_keyword),
            })

        # 1-2) 추가: 고유 기업명만으로 검색
        if search_unique_companies and "기업명" in seed_df.columns:
            unique_companies = (
                seed_df["기업명"]
                .dropna()
                .astype(str)
                .str.strip()
                .replace("", pd.NA)
                .dropna()
                .drop_duplicates()
                .tolist()
            )
            for company in unique_companies:
                queries.append({
                    "keyword": company,
                    "company": company,
                    "issue": "",  # 이슈는 공백
                    "query_kind": "company_only",
                    "max_results": str(unique_company_max_results),
                })

        if not queries:
            logger.warning("생성된 검색 질의가 없습니다. 엑셀의 '기업명', '중대성평가 목록'을 확인하세요.")
            return ""

        # ── 2) 수집 실행 ─────────────────────────────────────────────────
        all_items: List[Dict[str, Any]] = []
        for q in queries:
            keyword = q["keyword"]
            company = q["company"]
            issue = q["issue"]
            query_kind = q["query_kind"]
            per_kw_limit = int(q["max_results"])

            logger.info("검색 시작 [%s]: %s", query_kind, keyword)
            try:
                result = self.search_news_by_date_range(
                    keyword=keyword,
                    start_date=start_date,
                    end_date=end_date,
                    max_results=per_kw_limit,
                )
                for it in result.get("items", []):
                    it["company"] = company
                    it["issue"] = issue
                    it["keyword"] = keyword
                    it["query_kind"] = query_kind
                    all_items.append(it)

                # 키워드 간 간격
                time.sleep(max(0.0, self.per_keyword_pause) + random.uniform(*JITTER_RANGE))
            except Exception as e:
                logger.error("검색 실패 [%s]: %s (%s)", query_kind, keyword, e)

        if not all_items:
            logger.warning("수집된 뉴스가 없습니다.")
            return ""

        # ── 3) DataFrame 구성 + (옵션) 중복제거 ──────────────────────────
        df = pd.DataFrame(all_items)

        # 필요한 컬럼 보강
        desired_cols = [
            "title", "description", "originallink", "pubDate",
            "company", "issue", "keyword", "query_kind"
        ]
        for c in desired_cols:
            if c not in df.columns:
                df[c] = ""

        df = df[desired_cols]

        # 중복 제거 (제목+원본링크+발행일 기준) — 필요시 기준 수정 가능
        # if deduplicate:
        #     before = len(df)
        #     df = df.drop_duplicates(subset=["title", "originallink", "pubDate"])
        #     after = len(df)
        #     logger.info("중복 제거: %d → %d (-%d)", before, after, before - after)

        # ── 4) 저장 ─────────────────────────────────────────────────────
        save_path = Path.cwd() / output_file
        with pd.ExcelWriter(save_path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="뉴스데이터", index=False)
            self._auto_fit_columns(writer.sheets["뉴스데이터"])

        logger.info("전체 뉴스 데이터 저장 완료: %s", save_path)
        return str(save_path)
    
