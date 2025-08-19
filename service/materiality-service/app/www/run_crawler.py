from media_crawling_train import NaverNewsCrawler

if __name__ == "__main__":

    crawler = NaverNewsCrawler(
        min_interval=0.5,          # 요청 사이 최소 1.5초
        per_keyword_pause=1,     # 키워드마다 2.5초 휴식
        max_retries=4,             # 최대 4회 재시도
    )
    crawler.build_training_dataset(
        excel_path="실패_키워드_목록.xlsx",
        start_date="2023-01-01",
        end_date="2023-12-31",
        max_results_per_keyword=1000,
    )
