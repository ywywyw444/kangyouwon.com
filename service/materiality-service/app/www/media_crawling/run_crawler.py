from media_crawling import NaverNewsCrawler

if __name__ == "__main__":

    crawler = NaverNewsCrawler(
        min_interval=0.3,          # 요청 사이 휴식
        per_keyword_pause=0.5,     # 키워드마다 휴식
        max_retries=3,             # 최대 4회 재시도
    )

    crawler.build_training_dataset(
    excel_path="22, 23미디어크롤링용 중대성평가 목록.xlsx",
    start_date="2023-01-01",
    end_date="2023-12-31",
    max_results_per_keyword=800,        # 회사+이슈 검색 당
    search_unique_companies=True,       # ✅ 고유 기업명 추가 검색
    unique_company_max_results=300,     # 기업명 단독 검색 당
    deduplicate=True
)
