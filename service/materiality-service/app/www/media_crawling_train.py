"""
네이버 뉴스 API를 사용한 미디어 크롤링 모듈
(pubDate 기반 날짜 필터링 + 링크 정규화 + 학습데이터 구축 기능 + 요청 쓰로틀링/백오프)
"""
import os
import sys
import time
import random
import requests
from typing import Dict, Any, List
import logging
from datetime import datetime, timezone
import email.utils  # pubDate 파싱용
from pathlib import Path
import pandas as pd

# materiality-service 루트 디렉토리 경로 설정
SERVICE_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(SERVICE_ROOT))

# .env 파일 로드
from dotenv import load_dotenv
load_dotenv(SERVICE_ROOT / ".env")

# 로거 설정
logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    )


class NaverNewsCrawler:
    """네이버 뉴스 API를 사용한 뉴스 크롤링 클래스"""

    def __init__(
        self,
        min_interval: float = None,
        per_keyword_pause: float = None,
        max_retries: int = None,
    ):
        self.client_id = os.getenv("NAVER_CLIENT_ID")
        self.client_secret = os.getenv("NAVER_CLIENT_SECRET")

        if not self.client_id or not self.client_secret:
            raise ValueError("NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.")

        self.base_url = "https://openapi.naver.com/v1/search/news.json"

        # 요청 간 최소 간격(초) 및 키워드 간 추가 대기(초), 재시도 횟수
        self.min_interval = float(os.getenv("NAVER_API_MIN_INTERVAL", "1.2")) if min_interval is None else float(min_interval)
        self.per_keyword_pause = float(os.getenv("NAVER_API_PER_KEYWORD_PAUSE", "2.0")) if per_keyword_pause is None else float(per_keyword_pause)
        self.max_retries = int(os.getenv("NAVER_API_MAX_RETRIES", "3")) if max_retries is None else int(max_retries)

        # 지터(무작위 소량 대기) 범위
        self._jitter_range = (0.05, 0.25)

        # 마지막 요청 시각 (쓰로틀링용)
        self._last_request_ts = 0.0

        # 세션 재사용
        self.session = requests.Session()
        self.session.headers.update({
            'X-Naver-Client-Id': self.client_id,
            'X-Naver-Client-Secret': self.client_secret,
            'User-Agent': 'materiality-service/1.0'
        })

    def _throttle(self):
        """요청 간 최소 간격 보장 + 소량 지터"""
        now = time.time()
        elapsed = now - self._last_request_ts
        wait_needed = self.min_interval - elapsed
        if wait_needed > 0:
            jitter = random.uniform(*self._jitter_range)
            sleep_for = wait_needed + jitter
            time.sleep(sleep_for)
        self._last_request_ts = time.time()

    def _request_with_retry(self, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """재시도 + 백오프를 포함한 GET 요청 래퍼"""
        last_exc = None
        for attempt in range(1, self.max_retries + 1):
            try:
                self._throttle()
                resp = self.session.get(url, params=params, timeout=10)
                # 429/5xx 처리
                if resp.status_code == 429 or 500 <= resp.status_code < 600:
                    raise requests.exceptions.HTTPError(
                        f"HTTP {resp.status_code}: {resp.text[:200]}"
                    )
                resp.raise_for_status()
                return resp.json()
            except requests.exceptions.RequestException as e:
                last_exc = e
                backoff = (self.min_interval * (2 ** (attempt - 1))) + random.uniform(*self._jitter_range)
                logger.warning(f"요청 실패(시도 {attempt}/{self.max_retries}): {e}. {backoff:.2f}s 후 재시도")
                time.sleep(backoff)
        # 모든 시도 실패
        logger.error(f"❌ 네이버 뉴스 API 요청 실패(최대 재시도 초과): {last_exc}")
        raise last_exc

    def search_news(self, keyword: str, display: int = 5, sort: str = "date", start: int = 1) -> Dict[str, Any]:
        """네이버 뉴스 검색"""
        params = {
            'query': keyword,
            'display': display,
            'sort': sort,
            'start': start
        }
        return self._request_with_retry(self.base_url, params=params)

    def search_news_by_date_range(self, keyword: str, start_date: str, end_date: str, max_results: int = 100) -> Dict[str, Any]:
        """
        pubDate 기반으로 특정 날짜 범위 내 뉴스를 필터링
        (페이지네이션 요청도 쓰로틀링/백오프 적용)
        """
        # 날짜 변환 (시간대 정보 추가)
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

        if start_dt > end_dt:
            raise ValueError("시작 날짜가 종료 날짜보다 늦을 수 없습니다.")

        all_items: List[Dict[str, Any]] = []
        start = 1
        display = 100  # 네이버 API 최대값

        while start <= max_results and len(all_items) < max_results:
            result = self.search_news(keyword, display=display, start=start, sort="date")
            items = result.get("items", [])
            if not items:
                break

            # pubDate 파싱해서 필터링
            for item in items:
                try:
                    pub_dt = email.utils.parsedate_to_datetime(item["pubDate"])  # RFC 2822 → datetime
                except Exception:
                    # pubDate 파싱 실패 시 스킵
                    continue
                if start_dt <= pub_dt <= end_dt:
                    all_items.append(item)

            start += display
            if start > 1000:  # 네이버 API 최대 제한
                break

        # 🔹 링크 정규화 추가
        for item in all_items:
            origin = item.get("originallink", "")
            link = item.get("link", "")

            # 네이버 뉴스 도메인만 인정
            if link and "n.news.naver.com" in link:
                item["네이버링크"] = link
            else:
                item["네이버링크"] = ""   # 네이버 링크 없으면 공란 처리
            item["원본링크"] = origin

        return {
            "total": len(all_items),
            "items": all_items[:max_results],
            "start_date": start_date,
            "end_date": end_date
        }

    def save_to_excel(self, data: Dict[str, Any], filename: str = "naver_news_results.xlsx") -> str:
        """
        검색 결과를 DataFrame으로 변환하여 Excel 파일로 저장
        """
        try:
            if not data.get("items"):
                logger.warning("저장할 뉴스 데이터가 없습니다.")
                return ""

            # DataFrame 생성
            df = pd.DataFrame(data["items"])

            # 날짜 정보 추가
            df["검색_시작일"] = data.get("start_date", "")
            df["검색_종료일"] = data.get("end_date", "")
            df["총_검색결과수"] = data.get("total", 0)

            # 컬럼 순서 조정 및 한글 컬럼명
            columns_mapping = {
                "title": "제목",
                "description": "요약",
                "pubDate": "발행일",
                "원본링크": "원본링크",
                "네이버링크": "네이버링크",
            }

            # 컬럼명 변경
            df = df.rename(columns=columns_mapping)

            # 컬럼 순서 조정
            display_columns = ["제목", "요약", "발행일", "원본링크", "네이버링크", "검색_시작일", "검색_종료일", "총_검색결과수"]
            df = df.reindex(columns=display_columns)

            # Excel 파일 저장 (현재 작업 디렉토리에 저장)
            excel_path = Path.cwd() / filename
            with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='뉴스검색결과', index=False)

                # 워크시트 가져오기
                worksheet = writer.sheets['뉴스검색결과']

                # 컬럼 너비 자동 조정
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except Exception:
                            pass
                    adjusted_width = min(max_length + 2, 50)  # 최대 50자로 제한
                    worksheet.column_dimensions[column_letter].width = adjusted_width

            logger.info(f"✅ Excel 파일 저장 완료: {excel_path}")
            return str(excel_path)

        except Exception as e:
            logger.error(f"❌ Excel 저장 중 오류: {str(e)}")
            raise

    def build_training_dataset(
        self,
        excel_path: str,
        output_file: str = "2023,2022년 중대성평가 목록 기반 뉴스데이터.xlsx",
        start_date: str = "2023-01-01",
        end_date: str = "2023-12-31",
        max_results_per_keyword: int = 1000,
        per_keyword_pause: float = None,
    ):
        """
        기업명 + 중대성평가 목록을 조합한 키워드로 뉴스를 검색하고 결과를 하나의 엑셀로 저장
        - 키워드별 검색 종료 후 per_keyword_pause 만큼 대기하여 과도한 호출 방지
        - 내부적으로 각 요청은 min_interval + 지터로 쓰로틀링됨
        """
        pause = self.per_keyword_pause if per_keyword_pause is None else float(per_keyword_pause)

        df = pd.read_excel(excel_path)
        all_results = []  # 전체 뉴스 데이터 저장용

        for idx, row in df.iterrows():
            company = str(row["기업명"]).strip()
            issue = str(row["중대성평가 목록"]).strip()
            keyword = f"{company} {issue}"

            try:
                print(f"🔍 검색 시작: {keyword}")
                result = self.search_news_by_date_range(
                    keyword=keyword,
                    start_date=start_date,
                    end_date=end_date,
                    max_results=max_results_per_keyword
                )

                for item in result["items"]:
                    item["기업명"] = company
                    item["중대성평가_항목"] = issue
                    all_results.append(item)

                # 키워드별 추가 대기
                jitter = random.uniform(*self._jitter_range)
                sleep_for = max(0.0, pause) + jitter
                time.sleep(sleep_for)
                logger.info(f"⏳ 키워드 간 대기: {sleep_for:.2f}s (기준 {pause}s + 지터)")

            except Exception as e:
                print(f"❌ 검색 실패: {keyword} - {e}")

        if not all_results:
            print("⚠️ 수집된 뉴스가 없습니다.")
            return ""

        # DataFrame 변환
        news_df = pd.DataFrame(all_results)

        # 엑셀 저장
        save_path = Path.cwd() / output_file
        with pd.ExcelWriter(save_path, engine="openpyxl") as writer:
            news_df.to_excel(writer, sheet_name="뉴스데이터", index=False)

        print(f"✅ 전체 뉴스 데이터 저장 완료: {save_path}")
        return str(save_path)
