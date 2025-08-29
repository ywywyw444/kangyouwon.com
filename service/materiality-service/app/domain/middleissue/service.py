"""
Middleissue Service - 중대성 평가 관련 비즈니스 로직 처리
크롤링 데이터 처리, 머신러닝 모델 적용, 점수 계산 등을 담당
"""
# 1. 크롤링한 전체 데이터 -> 머신러닝 모델로 긍부정평가
# 2. relevance, recent, negative, rank(검색연도-1), reference(NULL) 라벨 부여
# 3. 각 지표별 score 부여
# 4. final score 계산
# 5. frontend로 보내고 메모리 저장

import logging
import os
import re
import json
import joblib
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Set, Tuple

from dateutil import parser
from app.domain.middleissue.schema import (
    MiddleIssueRequest, MiddleIssueResponse, Article,
    CategoryDetailsResponse, BaseIssuePool
)
from app.domain.middleissue.repository import MiddleIssueRepository

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
        # 1) ISO 형식
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except ValueError:
            pass
        # 2) RSS 형식
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(date_str)
        except Exception:
            pass
        # 3) 일반 파서
        return parser.parse(date_str)
    except Exception as e:
        logger.warning(f"⚠️ 날짜 파싱 실패 ({date_str}): {str(e)}")
        return datetime.now()  # 파싱 실패 시 현재 시간 반환

def extract_keywords(text: str, patt: re.Pattern) -> List[str]:
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
        analyzed_articles: List[Dict[str, Any]] = []
        for article in articles:
            try:
                title_text = article.title
                desc_text = article.description
                full_text = f"{title_text} {desc_text}"

                # 키워드 기반
                neg_keywords = extract_keywords(full_text, _NEG_RE)
                pos_keywords = extract_keywords(full_text, _POS_RE)
                has_both = len(neg_keywords) > 0 and len(pos_keywords) > 0

                # 모델 기반
                if model is not None:
                    try:
                        y_pred = model.predict([full_text])[0]
                        probas = model.predict_proba([full_text])[0]

                        classes = getattr(model.named_steps.get("clf", model), "classes_", None)
                        if classes is None:
                            classes = getattr(model, "classes_", None)

                        if classes is not None and "negative" in classes:
                            neg_idx = int(np.where(classes == "negative")[0][0])
                            neg_proba = float(probas[neg_idx])
                        else:
                            neg_proba = 0.0

                        if y_pred == "negative" and has_both:
                            final_sentiment = "other"
                            final_basis = "부정+긍정 동시 출현 → other"
                        else:
                            final_sentiment = y_pred
                            final_basis = "모델 예측 유지"
                    except Exception as e:
                        logger.error(f"❌ 모델 예측 중 오류: {str(e)}")
                        final_sentiment = "negative" if len(neg_keywords) > len(pos_keywords) else "other"
                        final_basis = "키워드 기반 판단 (모델 실패)"
                        neg_proba = 1.0 if final_sentiment == "negative" else 0.0
                else:
                    final_sentiment = "negative" if len(neg_keywords) > len(pos_keywords) else "other"
                    final_basis = "키워드 기반 판단 (모델 없음)"
                    neg_proba = 1.0 if final_sentiment == "negative" else 0.0

                analyzed_articles.append({
                    "title": title_text,
                    "description": desc_text,
                    "sentiment": final_sentiment,
                    "sentiment_confidence": float(neg_proba if final_sentiment == "negative" else (1 - neg_proba)),
                    "neg_keywords": ", ".join(neg_keywords),
                    "pos_keywords": ", ".join(pos_keywords),
                    "sentiment_basis": final_basis,
                    "original_category": article.original_category,
                    "issue": article.issue,
                    "pubDate": article.pubDate,
                    "originallink": article.originallink,
                    "company": article.company,
                })

            except Exception as e:
                logger.error(f"❌ 기사 감성 분석 중 오류: {str(e)}; 제목: {getattr(article, 'title', '')}")
                continue

        return analyzed_articles
    except Exception as e:
        logger.error(f"❌ 감성 분석 중 오류 발생: {str(e)}")
        return []

async def add_relevance_labels(
    articles: List[Dict[str, Any]],
    company_id: str,
    search_date: datetime,
    prev_year_categories: Set[str],   # (검색 기준연도 - 1)의 category id 집합
    reference_categories: Set[str],   # publish_year = NULL/''/'0' 의 category id 집합
) -> List[Dict[str, Any]]:
    """
    라벨 정의:
    - relevance : 제목에 기업명 포함이면 '++' (True)
    - recent    : 3개월 이내=1.0, 3~6개월=0.5, 그 외=0.0
    - rank      : original_category ∈ prev_year_categories → True
    - reference : original_category ∈ reference_categories → True
    """
    try:
        repository = MiddleIssueRepository()
        
        for a in articles:
            a["relevance_label"] = False
            a["recent_value"] = 0.0
            a["rank_label"] = False
            a["reference_label"] = False
            a["label_reasons"] = []

            # relevance
            title = a.get("title") or ""
            if isinstance(title, str) and company_id and company_id in title:
                a["relevance_label"] = True
                a["label_reasons"].append("제목에 기업명 포함")

            # recent
            pub_str = a.get("pubDate")
            if pub_str:
                try:
                    pub_dt = parse_pubdate(pub_str)
                    months_diff = (search_date - pub_dt).days / 30
                    if months_diff <= 3:
                        a["recent_value"] = 1.0
                        a["label_reasons"].append("최근 3개월 이내")
                    elif months_diff <= 6:
                        a["recent_value"] = 0.5
                        a["label_reasons"].append("최근 3~6개월")
                except Exception as e:
                    logger.warning(f"⚠️ recent 계산 중 날짜 파싱 실패: {e}")

            # rank/reference (카테고리 이름을 ID로 변환하여 비교)
            oc = a.get("original_category")
            if oc is not None:
                try:
                    # 카테고리 이름을 ID로 변환
                    category_id = await repository.get_category_id_by_name(str(oc))
                    if category_id is not None:
                        oc_key = str(category_id)
                        
                        if oc_key in prev_year_categories:
                            a["rank_label"] = True
                            a["label_reasons"].append("이전년도 카테고리 매칭")

                        if oc_key in reference_categories:
                            a["reference_label"] = True
                            a["label_reasons"].append("공통 카테고리 매칭")
                    else:
                        logger.warning(f"⚠️ 카테고리 이름 '{oc}'을 ID로 변환할 수 없음")
                except Exception as e:
                    logger.warning(f"⚠️ 카테고리 ID 변환 중 오류: {e}")

        return articles
    except Exception as e:
        logger.error(f"❌ 라벨 부여 중 오류: {e}")
        return articles

def calculate_category_scores(articles: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    카테고리별 점수 계산

    점수 체계:
    - frequency_score: 해당 카테고리 빈도 (0~1)
    - relevance_score: 카테고리 기사들의 relevance_label 평균 (True=1, False=0)
    - recent_score   : 카테고리 기사들의 recent_value 평균 (1/0.5/0)
    - rank_score     : 카테고리 내 rank_label 존재 여부(0/1)  ※ 전부 동일하다는 가정
    - negative_score : 카테고리 내 부정 기사 비율 (0~1)
    - reference_score: 카테고리 내 reference_label 존재 여부(0/1)

    최종 점수:
    final = 0.4*frequency
          + 0.6*relevance
          + 0.2*recent
          + 0.4*rank
          + 0.6*reference
          + 0.8*negative*(1 + 0.5*frequency + 0.5*relevance)
    """
    try:
        total_articles = len(articles)
        if total_articles == 0:
            return {}

        buckets: Dict[str, Dict[str, Any]] = {}
        for a in articles:
            cat = a.get("original_category")
            if cat is None:
                continue
            key = str(cat)
            b = buckets.setdefault(key, {
                "count": 0,
                "relevance_sum": 0.0,
                "recent_sum": 0.0,
                "negative_count": 0,
                "rank_label": None,
                "reference_label": None,
                "articles": []
            })

            b["count"] += 1
            b["articles"].append(a)
            b["relevance_sum"] += 1.0 if a.get("relevance_label") else 0.0
            b["recent_sum"] += float(a.get("recent_value", 0.0))
            if a.get("sentiment") == "negative":
                b["negative_count"] += 1
            if b["rank_label"] is None:
                b["rank_label"] = 1.0 if a.get("rank_label") else 0.0
            if b["reference_label"] is None:
                b["reference_label"] = 1.0 if a.get("reference_label") else 0.0

        results: Dict[str, Dict[str, Any]] = {}
        for key, b in buckets.items():
            c = b["count"]
            frequency = c / total_articles
            relevance = (b["relevance_sum"] / c) if c else 0.0
            recent = (b["recent_sum"] / c) if c else 0.0
            rank = b["rank_label"] or 0.0
            reference = b["reference_label"] or 0.0
            negative = (b["negative_count"] / c) if c else 0.0

            final_score = (
                0.4 * frequency
                + 0.6 * relevance
                + 0.2 * recent
                + 0.4 * rank
                + 0.6 * reference
                + 0.8 * negative * (1 + 0.5 * frequency + 0.5 * relevance)
            )

            results[key] = {
                "count": c,
                "frequency_score": round(frequency, 6),
                "relevance_score": round(relevance, 6),
                "recent_score": round(recent, 6),
                "rank_score": round(rank, 6),
                "reference_score": round(reference, 6),
                "negative_score": round(negative, 6),
                "final_score": round(final_score, 6),
                "articles": b["articles"],
            }

        return results
    except Exception as e:
        logger.error(f"❌ 카테고리 점수 계산 중 오류 발생: {str(e)}")
        return {}

def rank_categories_by_score(category_scores: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    """카테고리를 final_score 기준으로 순위 매기기"""
    try:
        ranked = sorted(
            category_scores.items(),
            key=lambda x: x[1]["final_score"],
            reverse=True
        )
        out: List[Dict[str, Any]] = []
        for idx, (cat, scores) in enumerate(ranked, start=1):
            out.append({
                "rank": idx,
                "category": cat,
                **scores
            })
        return out
    except Exception as e:
        logger.error(f"❌ 카테고리 순위 매기기 중 오류 발생: {str(e)}")
        return []

async def match_categories_with_esg_and_issuepool(
    ranked_categories: List[Dict[str, Any]], 
    company_id: str, 
    search_year: int
) -> List[Dict[str, Any]]:
    """
    카테고리별로 ESG 분류와 base_issuepool을 매칭
    
    매칭 규칙:
    1. 카테고리 이름으로 직접 조회 (토큰화/별칭 매핑 없음)
    2. repository의 JOIN 기능을 활용하여 모든 정보를 한 번에 가져오기
    3. 카테고리 하나당 ESG 분류는 하나, base_issuepool은 여러 개
    """
    try:
        repository = MiddleIssueRepository()
        matched_categories = []
        
        logger.info(f"🔍 카테고리 매칭 시작 - 기업: {company_id}, 연도: {search_year}")
        logger.info(f"🔍 매칭할 카테고리 수: {len(ranked_categories)}")
        
        for category_info in ranked_categories:
            name_or_id = str(category_info['category'])
            
            try:
                # ID인지 이름인지 구분하여 처리
                if name_or_id.isdigit():
                    # ID로 조회
                    category_details = await repository.get_category_details(
                        corporation_name=company_id,
                        category_id=int(name_or_id),
                        year=search_year,   # repo가 내부에서 -1 처리
                    )
                else:
                    # 이름으로 직접 조회
                    category_details = await repository.get_category_by_name_direct(
                        corporation_name=company_id,
                        category_name=name_or_id,
                        year=search_year,   # repo가 내부에서 -1 처리하도록 위에서 수정
                    )
                
                if category_details:
                    # 이미 모든 정보가 포함된 CategoryDetailsResponse에서 추출
                    esg_classification = category_details.esg_classification_name or '미분류'
                    esg_classification_id = category_details.esg_classification_id
                    
                    # BaseIssuePool 객체를 dict로 변환
                    base_issuepools = []
                    if category_details.base_issuepools:
                        for issue in category_details.base_issuepools:
                            # BaseIssuePool 객체의 속성에 직접 접근
                            base_issuepools.append({
                                "id": issue.id,
                                "base_issue_pool": issue.base_issue_pool,
                                "issue_pool": issue.issue_pool,
                                "ranking": issue.ranking,
                                "esg_classification_id": esg_classification_id,
                                "esg_classification_name": esg_classification
                            })
                    
                    # 매칭된 카테고리 정보 생성
                    matched_category = {
                        **category_info,  # 기존 점수 정보 유지
                        "esg_classification": esg_classification,
                        "esg_classification_id": esg_classification_id,
                        "base_issuepools": base_issuepools,
                        "total_issuepools": len(base_issuepools)
                    }
                    
                    matched_categories.append(matched_category)
                    
                    # 카테고리-ESG 매핑 및 base issuepool 매핑 결과 로그
                    logger.info(f"✅ 카테고리 '{name_or_id}' 매칭 완료:")
                    logger.info(f"   - ESG 분류: {esg_classification} (ID: {esg_classification_id})")
                    logger.info(f"   - Base IssuePool 수: {len(base_issuepools)}개")
                    if base_issuepools:
                        for i, pool in enumerate(base_issuepools[:3]):  # 상위 3개만 표시
                            logger.info(f"     {i+1}. {pool['base_issue_pool']} (순위: {pool['ranking']})")
                        if len(base_issuepools) > 3:
                            logger.info(f"     ... 외 {len(base_issuepools) - 3}개")
                else:
                    # 매칭되지 않은 경우 기본값으로 설정
                    matched_category = {
                        **category_info,
                        "esg_classification": "미분류",
                        "esg_classification_id": None,
                        "base_issuepools": [],
                        "total_issuepools": 0
                    }
                    matched_categories.append(matched_category)
                    
                    logger.warning(f"⚠️ 카테고리 '{name_or_id}' 매칭 실패: ESG 분류 및 이슈풀 정보 없음")
                    
            except Exception as e:
                logger.error(f"❌ 카테고리 '{name_or_id}' 매칭 중 오류: {str(e)}")
                # 오류 발생 시에도 기본값으로 설정
                matched_category = {
                    **category_info,
                    "esg_classification": "미분류",
                    "esg_classification_id": None,
                    "base_issuepools": [],
                    "total_issuepools": 0
                }
                matched_categories.append(matched_category)
        
        logger.info(f"🔗 총 {len(matched_categories)}개 카테고리 매칭 완료")
        return matched_categories
        
    except Exception as e:
        logger.error(f"❌ 카테고리 매칭 중 전체 오류 발생: {str(e)}")
        logger.error(f"❌ 오류 상세: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")
        # 오류 발생 시 원본 카테고리 정보 반환
        return ranked_categories

async def start_assessment(request: MiddleIssueRequest) -> Dict[str, Any]:
    """
    중대성 평가 시작 - 크롤링 데이터 처리 및 분석 시작
    """
    try:
        # 1) 요청 로깅
        logger.info("="*50)
        logger.info("🚀 새로운 중대성 평가 시작")
        logger.info(f"기업명: {request.company_id}")
        logger.info(f"보고기간: {request.report_period}")
        logger.info(f"요청 타입: {request.request_type}")
        logger.info(f"타임스탬프: {request.timestamp}")
        logger.info(f"총 크롤링 기사 수: {request.total_results}")
        logger.info("-"*50)

        # 2) 모델 로드
        model = load_sentiment_model()
        if not model:
            raise Exception("감성 분석 모델 로드 실패")

        # 3) 감성 분석
        logger.info("📊 크롤링 데이터 감성 분석 시작")
        analyzed_articles = analyze_sentiment(model, request.articles)

        # 4) (검색 기준연도 - 1) & 공통(NULL) 카테고리 조회
        repository = MiddleIssueRepository()
        search_year = int(request.report_period["end_date"][:4])  # 검색 기준연도 (YYYY)
        
        # repository 내부에서 -1 처리하므로 search_year를 그대로 전달
        corp_issues_prev = await repository.get_corporation_issues(
            corporation_name=request.company_id,
            year=search_year  # repository 내부에서 -1 처리
        )
        # 2. prev_year_categories와 reference_categories 수집
        # prev_year 기준 카테고리와 공통(NULL/빈문자열/'0') 카테고리 세트
        prev_year_categories = {str(issue.category_id) for issue in corp_issues_prev.year_issues}
        reference_categories = {str(issue.category_id) for issue in corp_issues_prev.common_issues}
        
        logger.info(f"🔍 prev_year_categories: {len(prev_year_categories)}개 - {prev_year_categories}")
        logger.info(f"🔍 reference_categories: {len(reference_categories)}개 - {reference_categories}")

        # 5) 라벨 부여
        logger.info("🏷️ 라벨(relevance/recent/rank/reference) 부여 시작")
        search_date = datetime.now()
        labeled_articles = await add_relevance_labels(
            analyzed_articles,
            request.company_id,
            search_date,
            prev_year_categories,
            reference_categories
        )

        # 6) 카테고리별 점수 계산
        logger.info("📊 카테고리별 점수 계산 시작")
        category_scores = calculate_category_scores(labeled_articles)

        # 7) 카테고리 랭킹
        logger.info("🏆 카테고리 순위 매기기 시작")
        ranked_categories = rank_categories_by_score(category_scores)

        # 8) 카테고리별 ESG 분류 및 이슈풀 매칭
        logger.info("🔗 카테고리별 ESG 분류 및 이슈풀 매칭 시작")
        matched_categories = await match_categories_with_esg_and_issuepool(
            ranked_categories, 
            request.company_id, 
            search_year
        )

        # 9) 통계/로깅
        negative_count = sum(1 for a in labeled_articles if a["sentiment"] == "negative")
        logger.info(f"📊 분석 완료 통계:")
        logger.info(f"   - 분석된 기사 수: {len(labeled_articles)}")
        logger.info(f"   - 부정적 기사 수: {negative_count}")
        logger.info(f"   - 분석된 카테고리 수: {len(category_scores)}")
        logger.info(f"   - 매칭된 카테고리 수: {len(matched_categories)}")

        # 🔥 최종 카테고리 순위 (ESG 분류 및 base issuepool 매칭 결과)
        logger.info("\n🏆 최종 카테고리 순위 (ESG 분류 및 base issuepool 매칭 완료):")
        for i, row in enumerate(matched_categories[:10]):  # 상위 10개
            esg_name = row.get('esg_classification', '미분류')
            issue_count = len(row.get('base_issuepools', []))
            final_score = row.get('final_score', 0.0)
            logger.info(
                f"{i+1:>2}위 | 카테고리: {row['category']} | ESG: {esg_name} | "
                f"이슈풀: {issue_count}개 | 최종점수: {final_score:.3f}"
            )
            
            # base issuepool 상세 정보 (상위 3개만)
            base_issuepools = row.get('base_issuepools', [])
            if base_issuepools:
                for j, pool in enumerate(base_issuepools[:3]):
                    logger.info(f"     {j+1}. {pool.get('base_issue_pool', 'N/A')} (순위: {pool.get('ranking', 'N/A')})")
                if len(base_issuepools) > 3:
                    logger.info(f"     ... 외 {len(base_issuepools) - 3}개")

        # 🔥 전체 카테고리 순위 요약
        logger.info(f"\n📋 전체 {len(matched_categories)}개 카테고리 매칭 완료")
        logger.info("="*50)

        # 9) 응답
        response_data = {
            "success": True,
            "message": "중대성 평가 데이터 분석이 완료되었습니다.",
            "data": {
                "company_id": request.company_id,
                "report_period": request.report_period,
                "assessment_status": "analyzed",
                "total_articles": len(labeled_articles),
                "negative_articles": negative_count,
                "negative_ratio": (negative_count / len(labeled_articles))*100 if labeled_articles else 0.0,
                "total_categories": len(category_scores),
                "matched_categories": matched_categories,  # ESG 분류 및 이슈풀 매칭된 카테고리
                "ranked_categories": ranked_categories[:20],  # 상위 20개 (원본)
                # 필요 시 프론트 디버깅/리뷰용 원자료
                "category_scores": category_scores,
                "analyzed_samples": labeled_articles[:3],
            }
        }

        logger.info("✅ 데이터 분석 완료")
        logger.info("="*50)
        return response_data

    except Exception as e:
        error_msg = f"❌ 중대성 평가 시작 중 오류 발생: {str(e)}"
        logger.error(error_msg)
        logger.error("="*50)
        return {"success": False, "message": error_msg, "data": None}
