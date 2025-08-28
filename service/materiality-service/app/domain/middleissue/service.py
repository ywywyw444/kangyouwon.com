"""
Middleissue Service - 중대성 평가 관련 비즈니스 로직 처리
크롤링 데이터 처리, 머신러닝 모델 적용, 점수 계산 등을 담당
"""
# 1. 크롤링한 전체 데이터 -> 머신러닝 모델로 긍부정평가
# 2. relevance, recent, negative, rank, 기준서/평가기관 지표 판단
# 3. 각 지표별 score 부여
# 4. final score 계산
# 5. frontend로 보내고 메모리 저장

import logging
import json
import os
import joblib
from datetime import datetime, timedelta
from typing import Dict, Any, List, Set, Tuple
from app.domain.middleissue.schema import MiddleIssueRequest, MiddleIssueResponse, Article
from app.domain.middleissue.repository import MiddleIssueRepository

# 로거 설정
logger = logging.getLogger(__name__)

# 모델 경로 설정
MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    'models',
    'model_multinomialnb.joblib'
)

def load_sentiment_model():
    """감성 분석 모델 로드"""
    try:
        logger.info(f"🤖 감성 분석 모델 로드 시도: {MODEL_PATH}")
        
        # 모델 파일이 없는 경우 기본값 반환
        if not os.path.exists(MODEL_PATH):
            logger.warning(f"⚠️ 모델 파일이 없습니다. 모든 텍스트를 'other'로 분류합니다.")
            return None
            
        model = joblib.load(MODEL_PATH)
        logger.info("✅ 감성 분석 모델 로드 성공")
        return model
    except Exception as e:
        logger.error(f"❌ 감성 분석 모델 로드 실패: {str(e)}")
        return None

def analyze_text_sentiment(model, text: str) -> Tuple[str, float]:
    """텍스트 감성 분석 수행"""
    try:
        # 모델이 없는 경우 기본값 반환
        if model is None:
            return "other", 1.0
            
        prediction = model.predict([text])[0]
        # predict_proba로 확률값도 가져옴
        probabilities = model.predict_proba([text])[0]
        confidence = max(probabilities)  # 가장 높은 확률값
        sentiment = "negative" if prediction == 1 else "other"
        return sentiment, confidence
    except Exception as e:
        logger.error(f"❌ 텍스트 감성 분석 중 오류: {str(e)}")
        return "other", 0.0

def analyze_sentiment(model, articles: List[Article]) -> List[Dict[str, Any]]:
    """기사 감성 분석 수행"""
    try:
        if not model:
            logger.error("❌ 감성 분석 모델이 로드되지 않았습니다.")
            return []

        analyzed_articles = []
        for article in articles:
            try:
                # 제목과 본문을 각각 분석
                title_text = f"{article.title} {article.original_category or ''}"
                title_sentiment, title_confidence = analyze_text_sentiment(model, title_text)
                
                desc_sentiment, desc_confidence = analyze_text_sentiment(model, article.description)
                
                # 제목과 본문의 감성이 다른 경우, 더 높은 confidence를 가진 쪽을 선택
                if title_sentiment != desc_sentiment:
                    if title_confidence > desc_confidence:
                        final_sentiment = title_sentiment
                        confidence = title_confidence
                    else:
                        final_sentiment = desc_sentiment
                        confidence = desc_confidence
                else:
                    # 같은 감성이면 평균 confidence 사용
                    final_sentiment = title_sentiment
                    confidence = (title_confidence + desc_confidence) / 2
                
                analyzed_articles.append({
                    "title": article.title,
                    "description": article.description,
                    "sentiment": final_sentiment,
                    "sentiment_confidence": confidence,
                    "title_sentiment": title_sentiment,
                    "desc_sentiment": desc_sentiment,
                    "original_category": article.original_category,
                    "issue": article.issue,
                    "pubDate": article.pubDate,
                    "originallink": article.originallink,
                    "company": article.company,
                    "relevance_score": 0.0  # 관련성 점수 초기화
                })
                
            except Exception as e:
                logger.error(f"❌ 기사 감성 분석 중 오류: {str(e)}")
                logger.error(f"문제된 기사 제목: {article.title}")
                continue

        return analyzed_articles
    except Exception as e:
        logger.error(f"❌ 감성 분석 중 오류 발생: {str(e)}")
        return []

async def add_relevance_labels(
    articles: List[Dict[str, Any]], 
    company_id: str,
    search_date: datetime,
    year_categories: Set[str],
    common_categories: Set[str]
) -> List[Dict[str, Any]]:
    """
    기사에 관련성 라벨 추가
    
    점수 체계:
    - ++ : 1.0점
    - +  : 0.5점
    - 없음: 0점
    """
    try:
        for article in articles:
            score = 0.0  # float으로 변경
            reasons = []

            # 1. 제목에 기업명 포함 여부 (++)
            if company_id in article["title"]:
                score += 1.0
                reasons.append("제목에 기업명 포함 (1.0)")

            # 2. 발행일 기준 최신성 (3개월 이내: ++, 3-6개월: +)
            if article["pubDate"]:
                pub_date = datetime.fromisoformat(article["pubDate"].replace('Z', '+00:00'))
                months_diff = (search_date - pub_date).days / 30
                
                if months_diff <= 3:
                    score += 1.0
                    reasons.append("최근 3개월 이내 (1.0)")
                elif months_diff <= 6:
                    score += 0.5
                    reasons.append("최근 3-6개월 (0.5)")

            # 3 & 4. 카테고리 매칭
            if article["original_category"]:
                # 해당 연도 카테고리와 매칭 (++)
                if article["original_category"] in year_categories:
                    score += 1.0
                    reasons.append("연도별 카테고리 매칭 (1.0)")
                
                # 공통 카테고리와 매칭 (++)
                if article["original_category"] in common_categories:
                    score += 1.0
                    reasons.append("공통 카테고리 매칭 (1.0)")

            # 결과 저장
            article["relevance_score"] = score
            article["relevance_reasons"] = reasons

        return articles
    except Exception as e:
        logger.error(f"❌ 관련성 라벨 추가 중 오류 발생: {str(e)}")
        return articles

async def start_assessment(request: MiddleIssueRequest) -> Dict[str, Any]:
    """
    중대성 평가 시작 - 크롤링 데이터 처리 및 분석 시작
    
    Args:
        request: 중대성 평가 시작 요청 데이터 (MiddleIssueRequest)
        
    Returns:
        Dict[str, Any]: 중대성 평가 시작 응답
    """
    try:
        # 1. 요청 데이터 로깅
        logger.info("="*50)
        logger.info("🚀 새로운 중대성 평가 시작")
        logger.info(f"기업명: {request.company_id}")
        logger.info(f"보고기간: {request.report_period}")
        logger.info(f"요청 타입: {request.request_type}")
        logger.info(f"타임스탬프: {request.timestamp}")
        logger.info(f"총 크롤링 기사 수: {request.total_results}")
        
        # 크롤링 데이터 구조 확인
        logger.info("-"*50)
        logger.info("📋 크롤링 데이터 구조 확인")
        
        if request.articles and len(request.articles) > 0:
            sample_article = request.articles[0]
            logger.info("수집된 데이터 필드:")
            
            # 필수 필드
            logger.info("필수 필드:")
            logger.info(f"- title ✓")
            logger.info(f"- description ✓")
            logger.info(f"- company ✓")
            
            # 선택적 필드 존재 여부 확인
            logger.info("\n선택적 필드:")
            logger.info(f"- originallink {'✓' if sample_article.originallink else '✗'}")
            logger.info(f"- pubDate {'✓' if sample_article.pubDate else '✗'}")
            logger.info(f"- issue {'✓' if sample_article.issue else '✗'}")
            logger.info(f"- original_category {'✓' if sample_article.original_category else '✗'}")
            logger.info(f"- query_kind {'✓' if sample_article.query_kind else '✗'}")
            logger.info(f"- keyword {'✓' if sample_article.keyword else '✗'}")
            
            # 예시 데이터 구조
            logger.info("\n데이터 구조 예시:")
            logger.info(f"- title: [제목 텍스트...]")
            logger.info(f"- description: [본문 텍스트...]")
            logger.info(f"- company: {sample_article.company}")
            if sample_article.original_category:
                logger.info(f"- original_category: {sample_article.original_category}")
            if sample_article.query_kind:
                logger.info(f"- query_kind: {sample_article.query_kind}")
            if sample_article.keyword:
                logger.info(f"- keyword: {sample_article.keyword}")
        else:
            logger.warning("⚠️ 크롤링된 기사가 없습니다!")
            
        logger.info("-"*50)

        # 2. 감성 분석 모델 로드
        model = load_sentiment_model()
        if not model:
            raise Exception("감성 분석 모델 로드 실패")

        # 3. 크롤링 데이터 감성 분석
        logger.info("📊 크롤링 데이터 감성 분석 시작")
        analyzed_articles = analyze_sentiment(model, request.articles)
        
        # 4. 카테고리 데이터 조회
        repository = MiddleIssueRepository()
        search_year = int(request.report_period["end_date"][:4])  # 검색 연도
        corporation_issues = await repository.get_corporation_issues(
            corporation_name=request.company_id,
            year=search_year
        )

        # 카테고리 세트 생성
        year_categories = {str(issue.category_id) for issue in corporation_issues.year_issues}
        common_categories = {str(issue.category_id) for issue in corporation_issues.common_issues}

        # 5. 관련성 라벨 추가
        logger.info("🏷️ 관련성 라벨 추가 시작")
        search_date = datetime.now()
        labeled_articles = await add_relevance_labels(
            analyzed_articles,
            request.company_id,
            search_date,
            year_categories,
            common_categories
        )

        # 6. 분석 결과 로깅
        negative_count = sum(1 for article in labeled_articles if article["sentiment"] == "negative")
        high_relevance_count = sum(1 for article in labeled_articles if article["relevance_score"] >= 2.0)  # 4점 만점의 절반 이상
        
        logger.info(f"분석된 기사 수: {len(labeled_articles)}")
        logger.info(f"부정적 기사 수: {negative_count}")
        logger.info(f"높은 관련성(2.0점 이상) 기사 수: {high_relevance_count}")
        
        # 7. 샘플 결과 로깅 (최대 5개)
        logger.info("\n📰 분석 결과 샘플:")
        for idx, article in enumerate(labeled_articles[:5]):
            logger.info(f"\n기사 {idx + 1}:")
            logger.info(f"제목: {article['title']}")
            logger.info(f"감성: {article['sentiment']} (신뢰도: {article['sentiment_confidence']:.2f})")
            logger.info(f"제목 감성: {article['title_sentiment']}")
            logger.info(f"본문 감성: {article['desc_sentiment']}")
            logger.info(f"관련성 점수: {article['relevance_score']:.1f}/4.0")
            logger.info(f"관련성 이유: {', '.join(article['relevance_reasons'])}")
            logger.info(f"카테고리: {article['original_category']}")
            logger.info(f"발행일: {article['pubDate']}")
            logger.info("-"*30)

        if len(labeled_articles) > 5:
            logger.info(f"... 외 {len(labeled_articles) - 5}개 기사")
        
        # 8. 응답 데이터 생성
        response_data = {
            "success": True,
            "message": "중대성 평가 데이터 분석이 완료되었습니다.",
            "data": {
                "company_id": request.company_id,
                "report_period": request.report_period,
                "assessment_status": "analyzed",
                "total_articles": len(labeled_articles),
                "negative_articles": negative_count,
                "high_relevance_articles": high_relevance_count,
                "negative_ratio": (negative_count/len(labeled_articles))*100 if labeled_articles else 0,
                "analyzed_samples": labeled_articles[:5]  # 샘플 데이터만 포함
            }
        }
        
        logger.info("✅ 데이터 분석 완료")
        logger.info("="*50)
        
        return response_data
        
    except Exception as e:
        error_msg = f"❌ 중대성 평가 시작 중 오류 발생: {str(e)}"
        logger.error(error_msg)
        logger.error("="*50)
        
        return {
            "success": False,
            "message": error_msg,
            "data": None
        }