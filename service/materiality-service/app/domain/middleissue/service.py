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
import re
import numpy as np
from dateutil import parser

# 로거 설정
logger = logging.getLogger(__name__)

NEGATIVE_LEXICON = {
    "감소","하락","부진","악화","오염","위반","담합","부패","뇌물","횡령","배임","사기",
    "과징금","벌금","사고","사망","파업","분쟁","갈등","논란","소송","리콜","결함","불량",
    "누출","유출","화재","적자","파산","구조조정","정리해고","중단","차질","실패","불법",
    "철수","퇴출","부정","불공정","갑질","직장괴롭힘","폭언","횡포","환불","회수","손실",
    "경고","제재","해지","취소","낙제","부과","징계","중징계","부정청탁","경영권분쟁","위기","청산"
}

POSITIVE_LEXICON = {
    "성장","확대","증가","개선","호조","흑자","최고","선정","수상","포상","산업포장",
    "강화","상생","협력","도입","출시","선도","인증","확보","우수","도약","확장","회복",
    "고도화","최적화","안정화","신설","채용","증설","증산","확충","공급","수주","모범",
    "달성","신기술","개시","증빙","성과","매출증가","고성장","선도기업","수출확대",
    "해외진출","파트너십","리더","평판","재생에너지","감축","이행","혁신","개발","역대",
    "순항","껑충","기증","기부","전달","지원","캠페인","후원"
}

# 모델 경로 설정
MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    'models',
    'model_multinomialnb.joblib'
)

# 정규식 패턴 컴파일
_NEG_RE = re.compile("|".join(map(re.escape, sorted(NEGATIVE_LEXICON, key=len, reverse=True))))
_POS_RE = re.compile("|".join(map(re.escape, sorted(POSITIVE_LEXICON, key=len, reverse=True))))

def parse_pubdate(date_str: str) -> datetime:
    """다양한 형식의 날짜 문자열을 datetime으로 파싱"""
    try:
        # 1. ISO 형식 시도
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except ValueError:
            pass

        # 2. RSS 형식 시도 (예: 'Wed, 06 Aug 2023 12:30:00 +0900')
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(date_str)
        except Exception:
            pass

        # 3. 기타 일반적인 형식들 시도
        return parser.parse(date_str)

    except Exception as e:
        logger.warning(f"⚠️ 날짜 파싱 실패 ({date_str}): {str(e)}")
        return datetime.now()  # 파싱 실패 시 현재 시간 반환

def extract_keywords(text: str, patt: re.Pattern) -> List[str]:
    """텍스트에서 키워드 추출"""
    if not isinstance(text, str):
        return []
    return sorted(set(patt.findall(text)))

def load_sentiment_model():
    """감성 분석 모델 로드"""
    try:
        logger.info(f"🤖 감성 분석 모델 로드 시도: {MODEL_PATH}")
        model = joblib.load(MODEL_PATH)
        logger.info("✅ 감성 분석 모델 로드 성공")
        return model
    except Exception as e:
        logger.error(f"❌ 감성 분석 모델 로드 실패: {str(e)}")
        return None

def analyze_sentiment(model, articles: List[Article]) -> List[Dict[str, Any]]:
    """기사 감성 분석 수행"""
    try:
        analyzed_articles = []
        
        for article in articles:
            try:
                # 1. 텍스트 준비
                title_text = article.title
                desc_text = article.description
                full_text = f"{title_text} {desc_text}"
                
                # 2. 키워드 기반 분석
                neg_keywords = extract_keywords(full_text, _NEG_RE)
                pos_keywords = extract_keywords(full_text, _POS_RE)
                has_both = len(neg_keywords) > 0 and len(pos_keywords) > 0
                
                # 3. 모델 기반 분석
                if model is not None:
                    try:
                        # 예측 및 확률 계산
                        y_pred = model.predict([full_text])[0]
                        probas = model.predict_proba([full_text])[0]
                        
                        # negative 클래스의 인덱스 찾기
                        classes = getattr(model.named_steps["clf"], "classes_", None)
                        if classes is None:
                            classes = getattr(model, "classes_", None)
                        
                        if classes is not None and "negative" in classes:
                            neg_idx = int(np.where(classes == "negative")[0][0])
                            neg_proba = probas[neg_idx]
                        else:
                            neg_proba = 0.0
                            
                        # 부정+긍정 동시 출현 시 other로 변경
                        if y_pred == "negative" and has_both:
                            final_sentiment = "other"
                            final_basis = "부정+긍정 동시 출현 → other"
                        else:
                            final_sentiment = y_pred
                            final_basis = "모델 예측 유지"
                            
                    except Exception as e:
                        logger.error(f"❌ 모델 예측 중 오류: {str(e)}")
                        # 모델 실패 시 키워드 기반으로만 판단
                        final_sentiment = "negative" if len(neg_keywords) > len(pos_keywords) else "other"
                        final_basis = "키워드 기반 판단 (모델 실패)"
                        neg_proba = 1.0 if final_sentiment == "negative" else 0.0
                else:
                    # 모델이 없는 경우 키워드 기반으로만 판단
                    final_sentiment = "negative" if len(neg_keywords) > len(pos_keywords) else "other"
                    final_basis = "키워드 기반 판단 (모델 없음)"
                    neg_proba = 1.0 if final_sentiment == "negative" else 0.0
                
                analyzed_articles.append({
                    "title": title_text,
                    "description": desc_text,
                    "sentiment": final_sentiment,
                    "sentiment_confidence": neg_proba if final_sentiment == "negative" else (1 - neg_proba),
                    "neg_keywords": ", ".join(neg_keywords),
                    "pos_keywords": ", ".join(pos_keywords),
                    "sentiment_basis": final_basis,
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
    기사에 관련성 라벨 추가 및 점수 계산
    
    라벨 체계:
    - relevance: title에 기업명 포함 여부 (++ 또는 없음)
    - recent: pubdate 최신성 (++: 3개월 이내, +: 3-6개월, 없음)
    - rank: year-1 카테고리 매칭 여부 (++ 또는 없음)
    - reference: publish_year null 카테고리 매칭 여부 (++ 또는 없음)
    """
    try:
        for article in articles:
            # 라벨 초기화
            article["relevance"] = "없음"
            article["recent"] = "없음"
            article["rank"] = "없음"
            article["reference"] = "없음"
            article["label_reasons"] = []

            # 1. relevance: 제목에 기업명 포함 여부
            if company_id in article["title"]:
                article["relevance"] = "++"
                article["label_reasons"].append("제목에 기업명 포함")

            # 2. recent: 발행일 기준 최신성
            if article["pubDate"]:
                try:
                    pub_date = parse_pubdate(article["pubDate"])
                    months_diff = (search_date - pub_date).days / 30
                    
                    if months_diff <= 3:
                        article["recent"] = "++"
                        article["label_reasons"].append("최근 3개월 이내")
                    elif months_diff <= 6:
                        article["recent"] = "+"
                        article["label_reasons"].append("최근 3-6개월")
                except Exception as e:
                    logger.warning(f"⚠️ 발행일 처리 중 오류: {str(e)}")

            # 3. rank: year-1 카테고리 매칭
            if article["original_category"] and article["original_category"] in year_categories:
                article["rank"] = "++"
                article["label_reasons"].append("year-1 카테고리 매칭")

            # 4. reference: publish_year null 카테고리 매칭
            if article["original_category"] and article["original_category"] in common_categories:
                article["reference"] = "++"
                article["label_reasons"].append("공통 카테고리 매칭")

        return articles
    except Exception as e:
        logger.error(f"❌ 관련성 라벨 추가 중 오류 발생: {str(e)}")
        return articles

def calculate_category_scores(articles: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    카테고리별 점수 계산
    
    점수 체계:
    - frequency_score: 해당 카테고리 빈도 (0~1)
    - relevance_score: relevance ++면 1점, 아니면 0점
    - recent_score: recent ++면 1점, +면 0.5점, 아니면 0점
    - rank_score: rank ++면 1점, 아니면 0점
    - negative_score: 해당 카테고리의 부정적 기사 비율 (0~1)
    - reference_score: reference ++면 1점, 아니면 0점
    """
    try:
        total_articles = len(articles)
        if total_articles == 0:
            return {}

        # 카테고리별 데이터 수집
        category_data = {}
        
        for article in articles:
            category = article.get("original_category", "미분류")
            if category not in category_data:
                category_data[category] = {
                    "count": 0,
                    "relevance_count": 0,
                    "recent_plus_plus": 0,
                    "recent_plus": 0,
                    "rank_count": 0,
                    "reference_count": 0,
                    "negative_count": 0,
                    "articles": []
                }
            
            category_data[category]["count"] += 1
            category_data[category]["articles"].append(article)
            
            # 각 라벨별 카운트
            if article.get("relevance") == "++":
                category_data[category]["relevance_count"] += 1
            
            if article.get("recent") == "++":
                category_data[category]["recent_plus_plus"] += 1
            elif article.get("recent") == "+":
                category_data[category]["recent_plus"] += 1
            
            if article.get("rank") == "++":
                category_data[category]["rank_count"] += 1
            
            if article.get("reference") == "++":
                category_data[category]["reference_count"] += 1
            
            if article.get("sentiment") == "negative":
                category_data[category]["negative_count"] += 1

        # 카테고리별 점수 계산
        category_scores = {}
        
        for category, data in category_data.items():
            count = data["count"]
            
            # 1. frequency_score: 해당 카테고리 빈도 (0~1)
            frequency_score = count / total_articles
            
            # 2. relevance_score: relevance ++면 1점, 아니면 0점
            relevance_score = 1.0 if data["relevance_count"] > 0 else 0.0
            
            # 3. recent_score: recent ++면 1점, +면 0.5점, 아니면 0점
            recent_score = 0.0
            if data["recent_plus_plus"] > 0:
                recent_score = 1.0
            elif data["recent_plus"] > 0:
                recent_score = 0.5
            
            # 4. rank_score: rank ++면 1점, 아니면 0점
            rank_score = 1.0 if data["rank_count"] > 0 else 0.0
            
            # 5. negative_score: 해당 카테고리의 부정적 기사 비율 (0~1)
            negative_score = data["negative_count"] / count if count > 0 else 0.0
            
            # 6. reference_score: reference ++면 1점, 아니면 0점
            reference_score = 1.0 if data["reference_count"] > 0 else 0.0
            
            # 7. final_score 계산
            final_score = (
                0.4 * frequency_score +
                0.6 * relevance_score +
                0.2 * recent_score +
                0.4 * rank_score +
                0.6 * reference_score +
                0.8 * negative_score * (1 + 0.5 * frequency_score + 0.5 * relevance_score)
            )
            
            category_scores[category] = {
                "count": count,
                "frequency_score": frequency_score,
                "relevance_score": relevance_score,
                "recent_score": recent_score,
                "rank_score": rank_score,
                "negative_score": negative_score,
                "reference_score": reference_score,
                "final_score": final_score,
                "articles": data["articles"]
            }
        
        return category_scores
        
    except Exception as e:
        logger.error(f"❌ 카테고리 점수 계산 중 오류 발생: {str(e)}")
        return {}

def rank_categories_by_score(category_scores: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    카테고리를 final_score 기준으로 순위 매기기
    """
    try:
        # final_score 기준으로 내림차순 정렬
        ranked_categories = sorted(
            category_scores.items(),
            key=lambda x: x[1]["final_score"],
            reverse=True
        )
        
        # 순위 정보 추가
        ranked_result = []
        for rank, (category, scores) in enumerate(ranked_categories, 1):
            ranked_result.append({
                "rank": rank,
                "category": category,
                **scores
            })
        
        return ranked_result
        
    except Exception as e:
        logger.error(f"❌ 카테고리 순위 매기기 중 오류 발생: {str(e)}")
        return []

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

        # 6. 카테고리별 점수 계산
        logger.info("📊 카테고리별 점수 계산 시작")
        category_scores = calculate_category_scores(labeled_articles)
        
        # 7. 카테고리 순위 매기기
        logger.info("🏆 카테고리 순위 매기기 시작")
        ranked_categories = rank_categories_by_score(category_scores)
        
        # 8. 분석 결과 로깅
        negative_count = sum(1 for article in labeled_articles if article["sentiment"] == "negative")
        
        logger.info(f"분석된 기사 수: {len(labeled_articles)}")
        logger.info(f"부정적 기사 수: {negative_count}")
        logger.info(f"분석된 카테고리 수: {len(category_scores)}")
        
        # 9. 카테고리별 점수 상세 로깅
        logger.info("\n📊 카테고리별 점수 상세:")
        for rank_info in ranked_categories[:10]:  # 상위 10개만 로깅
            logger.info(f"\n순위 {rank_info['rank']}: {rank_info['category']}")
            logger.info(f"  기사 수: {rank_info['count']}개")
            logger.info(f"  최종 점수: {rank_info['final_score']:.3f}")
            logger.info(f"  세부 점수:")
            logger.info(f"    - 빈도 점수: {rank_info['frequency_score']:.3f}")
            logger.info(f"    - 관련성 점수: {rank_info['relevance_score']:.3f}")
            logger.info(f"    - 최신성 점수: {rank_info['recent_score']:.3f}")
            logger.info(f"    - 순위 점수: {rank_info['rank_score']:.3f}")
            logger.info(f"    - 참조 점수: {rank_info['reference_score']:.3f}")
            logger.info(f"    - 부정성 점수: {rank_info['negative_score']:.3f}")
            logger.info("-"*30)
        
        # 10. 최종 카테고리 순위 요약 로깅
                # 10. 최종 카테고리 순위 요약 로깅
        logger.info("\n🏆 최종 카테고리 순위 요약:")
        logger.info("순위 | 카테고리 | 최종점수 | 기사수")
        logger.info("-" * 50)
        for rank_info in ranked_categories[:20]:  # 상위 20개 표시
            logger.info(f"{rank_info['rank']:2d}위 | {rank_info['category']:15s} | {rank_info['final_score']:6.3f} | {rank_info['count']:3d}개")

        # ✅ 전체 카테고리 순위 로깅 추가
        logger.info("\n📋 전체 카테고리 순위:")
        logger.info("순위 | 카테고리 | 최종점수 | 기사수")
        logger.info("-" * 50)
        for rank_info in ranked_categories:  # 전체 출력
            logger.info(f"{rank_info['rank']:2d}위 | {rank_info['category']:15s} | {rank_info['final_score']:6.3f} | {rank_info['count']:3d}개")

        
        # 11. 샘플 기사 로깅 (최대 3개)
        logger.info("\n📰 샘플 기사 분석:")
        for idx, article in enumerate(labeled_articles[:3]):
            logger.info(f"\n기사 {idx + 1}:")
            logger.info(f"제목: {article['title']}")
            logger.info(f"감성: {article['sentiment']} (신뢰도: {article['sentiment_confidence']:.2f})")
            logger.info(f"카테고리: {article['original_category']}")
            logger.info(f"라벨: relevance={article.get('relevance', '없음')}, recent={article.get('recent', '없음')}, rank={article.get('rank', '없음')}, reference={article.get('reference', '없음')}")
            logger.info(f"라벨 이유: {', '.join(article.get('label_reasons', []))}")
            logger.info("-"*30)

        if len(labeled_articles) > 5:
            logger.info(f"... 외 {len(labeled_articles) - 5}개 기사")
        
        # 12. 응답 데이터 생성
        response_data = {
            "success": True,
            "message": "중대성 평가 데이터 분석이 완료되었습니다.",
            "data": {
                "company_id": request.company_id,
                "report_period": request.report_period,
                "assessment_status": "analyzed",
                "total_articles": len(labeled_articles),
                "negative_articles": negative_count,
                "negative_ratio": (negative_count/len(labeled_articles))*100 if labeled_articles else 0,
                "total_categories": len(category_scores),
                "ranked_categories": ranked_categories[:20],  # 상위 20개 카테고리만 포함
                "category_scores": category_scores,
                "analyzed_samples": labeled_articles[:3]  # 샘플 데이터만 포함
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