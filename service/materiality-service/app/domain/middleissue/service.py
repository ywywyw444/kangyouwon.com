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

# Railway 환경에서 로그 레이트 리밋 방지를 위한 로깅 설정
if os.getenv('RAILWAY_ENVIRONMENT') or True:  # 즉시 적용을 위해 True로 설정
    # Railway 환경에서는 로깅 레벨을 WARNING으로 설정
    logging.getLogger('app.domain.middleissue.service').setLevel(logging.WARNING)
    logging.getLogger('app.domain.middleissue.repository').setLevel(logging.WARNING)
    print("🚨 Railway 환경 감지: 로깅 레벨을 WARNING으로 설정하여 로그 레이트 리밋 방지")

logger = logging.getLogger(__name__)

# 로깅 레벨 강제 설정 (즉시 적용)
logger.setLevel(logging.WARNING)

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
                "rank_sum": 0.0,        # rank_label 합계로 변경
                "reference_sum": 0.0,   # reference_label 합계로 변경
                "articles": []
            })

            b["count"] += 1
            b["articles"].append(a)
            b["relevance_sum"] += 1.0 if a.get("relevance_label") else 0.0
            b["recent_sum"] += float(a.get("recent_value", 0.0))
            
            # 안전한 부정점수 계산
            sentiment = a.get("sentiment")
            if sentiment is not None:
                # 대소문자 구분 없이 비교
                if str(sentiment).lower() == "negative":
                    b["negative_count"] += 1
                    logger.debug(f"🔍 부정 기사 감지: {sentiment}")
                elif str(sentiment).lower() not in ["positive", "other"]:
                    logger.warning(f"⚠️ 예상치 못한 sentiment 값: '{sentiment}'")
            else:
                logger.warning(f"⚠️ sentiment 값이 None인 기사 발견")
            
            # rank와 reference를 합계로 누적
            rank_label = a.get("rank_label")
            reference_label = a.get("reference_label")
            
            # 안전한 rank_label 처리
            if rank_label is not None:
                if isinstance(rank_label, bool):
                    b["rank_sum"] += 1.0 if rank_label else 0.0
                elif isinstance(rank_label, (int, float)):
                    b["rank_sum"] += float(rank_label)
                else:
                    logger.warning(f"⚠️ 예상치 못한 rank_label 타입: {type(rank_label)}, 값: {rank_label}")
                    b["rank_sum"] += 0.0
            else:
                b["rank_sum"] += 0.0
            
            # 안전한 reference_label 처리
            if reference_label is not None:
                if isinstance(reference_label, bool):
                    b["reference_sum"] += 1.0 if reference_label else 0.0
                elif isinstance(reference_label, (int, float)):
                    b["reference_sum"] += float(reference_label)
                else:
                    logger.warning(f"⚠️ 예상치 못한 reference_label 타입: {type(reference_label)}, 값: {reference_label}")
                    b["reference_sum"] += 0.0
            else:
                b["reference_sum"] += 0.0

        results: Dict[str, Dict[str, Any]] = {}
        for key, b in buckets.items():
            c = b["count"]
            
            # 안전한 빈도점수 계산
            try:
                frequency = c / total_articles if total_articles > 0 else 0.0
                # 논리적 검증: 빈도가 1을 초과할 수 없음
                if frequency > 1.0:
                    logger.warning(f"⚠️ 카테고리 '{key}' 빈도점수 비정상: {frequency:.4f} > 1.0, 1.0으로 조정")
                    frequency = 1.0
            except Exception as e:
                logger.error(f"❌ 카테고리 '{key}' 빈도점수 계산 오류: {e}, 기본값 0.0 사용")
                frequency = 0.0
            
            # 안전한 다른 점수들 계산
            relevance = (b["relevance_sum"] / c) if c > 0 else 0.0
            recent = (b["recent_sum"] / c) if c > 0 else 0.0
            rank = (b["rank_sum"] / c) if c > 0 else 0.0
            reference = (b["reference_sum"] / c) if c > 0 else 0.0
            negative = (b["negative_count"] / c) if c > 0 else 0.0

            # 안전한 최종 점수 계산
            try:
                final_score = (
                    0.4 * frequency
                    + 0.6 * relevance
                    + 0.2 * recent
                    + 0.4 * rank
                    + 0.6 * reference
                    + 0.8 * negative * (1 + 0.5 * frequency + 0.5 * relevance)
                )
                
                # 점수 범위 검증 (0~10 범위로 가정)
                if final_score < 0:
                    logger.warning(f"⚠️ 카테고리 '{key}' 최종점수 음수: {final_score:.6f}, 0으로 조정")
                    final_score = 0.0
                elif final_score > 10:
                    logger.warning(f"⚠️ 카테고리 '{key}' 최종점수 과대: {final_score:.6f}, 10으로 조정")
                    final_score = 10.0
                    
            except Exception as e:
                logger.error(f"❌ 카테고리 '{key}' 최종점수 계산 오류: {e}, 기본값 0.0 사용")
                final_score = 0.0

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
            
            # 디버깅을 위한 상세 로그 (로그 레이트 리밋 방지를 위해 제거)
            # if logger.isEnabledFor(logging.INFO):
            #     logger.info(f"🔍 카테고리 '{key}' 점수 계산 상세:")
            #     logger.info(f"   - 빈도: {c}/{total_articles} = {frequency:.4f}")
            #     logger.info(f"   - 관련성: {b['relevance_sum']}/{c} = {relevance:.4f}")
            #     logger.info(f"   - 최신성: {b['recent_sum']}/{c} = {recent:.4f}")
            #     logger.info(f"   - 순위: {b['rank_sum']}/{c} = {rank:.4f}")
            #     logger.info(f"   - 참조: {b['reference_sum']}/{c} = {reference:.4f}")
            #     logger.info(f"   - 부정성: {b['negative_count']}/{c} = {negative:.4f}")
            #     logger.info(f"   - 최종점수: {final_score:.6f}")

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
    카테고리별로 ESG 분류와 base_issuepool을 배치 쿼리로 매칭
    
    매칭 규칙:
    1. materiality_category DB에서 모든 카테고리 ESG 분류를 배치로 조회 (연도 조건 없음)
    2. base_issuepool은 새로운 배치 조회 메서드 사용 (연도 조건 없음 - 카테고리만 매칭)
    3. 카테고리 하나당 ESG 분류는 하나, base_issuepool은 여러 개
    4. 중복 제거는 공백을 포함한 문자 그대로 비교
    """
    try:
        repository = MiddleIssueRepository()
        
        logger.info(f"🔍 배치 카테고리 매칭 시작 - 기업: {company_id}, 연도: {search_year}")
        logger.info(f"🔍 매칭할 카테고리 수: {len(ranked_categories)}")
        
        # 1. 모든 카테고리 키 수집
        category_keys = [str(cat['category']) for cat in ranked_categories]
        
        # 2. 배치로 ESG 분류 조회 (한 번에 모든 카테고리)
        logger.info(f"🔍 배치 ESG 분류 조회 시작: {len(category_keys)}개 카테고리")
        esg_mapping = {}
        for category_key in category_keys:
            try:
                esg_classification = await repository.get_category_esg_direct(category_key)
                esg_mapping[category_key] = esg_classification or '미분류'
            except Exception as e:
                logger.warning(f"⚠️ 카테고리 '{category_key}' ESG 분류 조회 실패: {str(e)}")
                esg_mapping[category_key] = '미분류'
        
        logger.info(f"✅ 배치 ESG 분류 조회 완료: {len(esg_mapping)}개 카테고리")
        
        # 3. 🔥 새로운 배치 조회 메서드 사용 (N+1 문제 해결)
        logger.warning(f"🔍 배치 Base IssuePool 조회 시작 (새로운 메서드)")
        details_map = {}
        
        try:
            # 새로운 배치 조회 메서드 사용 (연도 조건 없음)
            details_map = await repository.get_categories_details_batch(
                corporation_name=company_id,
                categories=category_keys,
                year=search_year  # year는 전달하되 내부에서 무시됨
            )
            
            logger.warning(f"✅ 배치 Base IssuePool 조회 완료: {len(details_map)}개 카테고리")
            
        except Exception as e:
            logger.error(f"❌ 배치 Base IssuePool 조회 실패: {str(e)}")
            # 모든 카테고리에 대해 빈 배열로 설정
            details_map = {name: None for name in category_keys}
        
        # 4. 결과 조합 (빠른 처리)
        logger.warning(f"🔍 결과 조합 시작")
        matched_categories = []
        
        for category_info in ranked_categories:
            category_key = str(category_info['category'])
            
            # 배치 조회 결과에서 데이터 가져오기
            details = details_map.get(category_key)
            
            if details:
                # 배치 조회에서 가져온 데이터 사용
                esg_classification = details.esg_classification_name or esg_mapping.get(category_key, '미분류')
                esg_classification_id = details.esg_classification_id
                base_issuepools = []
                
                # BaseIssuePool을 dict로 변환
                for issue in details.base_issuepools:
                    base_issuepools.append({
                        "id": issue.id,
                        "base_issue_pool": issue.base_issue_pool,
                        "issue_pool": issue.issue_pool,
                        "ranking": issue.ranking,
                        "esg_classification_id": esg_classification_id,
                        "esg_classification_name": esg_classification
                    })
                
                total_issuepools = len(base_issuepools)
            else:
                # 배치 조회에서 데이터가 없는 경우 기본값
                esg_classification = esg_mapping.get(category_key, '미분류')
                esg_classification_id = None
                base_issuepools = []
                total_issuepools = 0
            
            matched_category = {
                **category_info,  # 기존 점수 정보 유지
                "esg_classification": esg_classification,
                "esg_classification_id": esg_classification_id,
                "base_issuepools": base_issuepools,
                "total_issuepools": total_issuepools
            }
            
            matched_categories.append(matched_category)
        
        # 5. 요약 로깅 (성능 향상을 위해 간소화)
        total_issuepools = sum(len(cat.get('base_issuepools', [])) for cat in matched_categories)
        esg_distribution = {}
        for esg in esg_mapping.values():
            esg_distribution[esg] = esg_distribution.get(esg, 0) + 1
        
        logger.warning(f"🔗 배치 매칭 완료:")
        logger.warning(f"   - 총 카테고리: {len(matched_categories)}개")
        logger.warning(f"   - 총 IssuePool: {total_issuepools}개")
        logger.warning(f"   - ESG 분포: {esg_distribution}")
        
        # 🔍 base_issue_pool 내용 상세 확인 (상위 5개 카테고리만)
        logger.warning(f"🔍 base_issue_pool 상세 내용 확인 (상위 5개 카테고리):")
        for i, category_info in enumerate(matched_categories[:5]):
            category_key = str(category_info['category'])
            base_issuepools = category_info.get('base_issuepools', [])
            esg_name = category_info.get('esg_classification', '미분류')
            
            logger.warning(f"   {i+1}. 카테고리 '{category_key}' (ESG: {esg_name}):")
            logger.warning(f"      - base_issue_pool 수: {len(base_issuepools)}개")
            
            if base_issuepools:
                # 상위 3개만 상세 로깅
                for j, pool in enumerate(base_issuepools[:3]):
                    logger.warning(f"        {j+1}. {pool.get('base_issue_pool', 'N/A')}")
                    logger.warning(f"           issue_pool: {pool.get('issue_pool', 'N/A')}")
                    logger.warning(f"           ranking: {pool.get('ranking', 'N/A')}")
                
                if len(base_issuepools) > 3:
                    logger.warning(f"        ... 외 {len(base_issuepools) - 3}개")
            else:
                logger.warning(f"        - base_issue_pool 없음")
        
        # 나머지 카테고리는 요약만
        if len(matched_categories) > 5:
            remaining_categories = matched_categories[5:]
            remaining_issuepools = sum(len(cat.get('base_issuepools', [])) for cat in remaining_categories)
            logger.warning(f"   ... 나머지 {len(remaining_categories)}개 카테고리: 총 {remaining_issuepools}개 base_issue_pool")
        
        # 🔍 base_issue_pool 매칭 결과 요약 (핵심만)
        matched_count = sum(1 for cat in matched_categories if cat.get('total_issuepools', 0) > 0)
        unmatched_count = len(matched_categories) - matched_count
        
        logger.warning(f"🔍 Base IssuePool 매칭 결과:")
        logger.warning(f"   - 매칭 성공: {matched_count}개 카테고리")
        logger.warning(f"   - 매칭 실패: {unmatched_count}개 카테고리")
        
        if unmatched_count > 0:
            unmatched_categories = [cat['category'] for cat in matched_categories if cat.get('total_issuepools', 0) == 0]
            logger.warning(f"   - 매칭 실패 카테고리: {unmatched_categories}")
        
        return matched_categories
        
    except Exception as e:
        logger.error(f"❌ 배치 카테고리 매칭 중 전체 오류 발생: {str(e)}")
        logger.error(f"❌ 오류 상세: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")
        
        # 오류 발생 시 기존 개별 처리 방식으로 fallback
        logger.info(f"🔄 기존 개별 처리 방식으로 fallback")
        return await _fallback_individual_matching(ranked_categories, company_id, search_year)


async def _fallback_individual_matching(
    ranked_categories: List[Dict[str, Any]], 
    company_id: str, 
    search_year: int
) -> List[Dict[str, Any]]:
    """
    Fallback: 기존 개별 처리 방식 (배치 처리 실패 시 사용)
    """
    try:
        repository = MiddleIssueRepository()
        matched_categories = []
        
        logger.info(f"🔄 Fallback 개별 처리 시작: {len(ranked_categories)}개 카테고리")
        
        for category_info in ranked_categories:
            category_name = str(category_info['category'])
            
            try:
                # 1. materiality_category DB에서 ESG 분류 조회 (연도 조건 없음)
                esg_classification = await repository.get_category_esg_direct(category_name)
                if not esg_classification:
                    esg_classification = '미분류'
                
                # 2. base_issuepool 정보 조회 (연도 조건 없음 - 카테고리만 매칭)
                base_issuepools = []
                try:
                    if category_name.isdigit():
                        # ID로 조회하되 연도 조건 제거
                        category_details = await repository.get_category_details(
                            corporation_name=company_id,
                            category_id=int(category_name),
                            year=search_year,  # year는 전달하되 내부에서 무시됨
                        )
                    else:
                        # 이름으로 직접 조회하되 연도 조건 제거
                        category_details = await repository.get_category_by_name_direct(
                            corporation_name=company_id,
                            category_name=category_name,
                            year=search_year,  # year는 전달하되 내부에서 무시됨
                        )
                    
                    if category_details and category_details.base_issuepools:
                        # 중복 제거를 위한 set 사용
                        seen_pools = set()
                        for issue in category_details.base_issuepools:
                            # 공백을 포함한 문자 그대로 비교하여 중복 체크
                            pool_key = (issue.base_issue_pool, issue.issue_pool)
                            if pool_key not in seen_pools:
                                seen_pools.add(pool_key)
                                base_issuepools.append({
                                    "id": issue.id,
                                    "base_issue_pool": issue.base_issue_pool,
                                    "issue_pool": issue.issue_pool,
                                    "ranking": issue.ranking,
                                    "esg_classification_id": category_details.esg_classification_id,
                                    "esg_classification_name": esg_classification
                                })
                        
                except Exception as e:
                    logger.warning(f"⚠️ Fallback: 카테고리 '{category_name}' base_issuepool 조회 실패: {str(e)}")
                
                # 3. 매칭된 카테고리 정보 생성
                matched_category = {
                    **category_info,
                    "esg_classification": esg_classification,
                    "esg_classification_id": None,
                    "base_issuepools": base_issuepools,
                    "total_issuepools": len(base_issuepools)
                }
                
                matched_categories.append(matched_category)
                
            except Exception as e:
                logger.error(f"❌ Fallback: 카테고리 '{category_name}' 매칭 중 오류: {str(e)}")
                matched_category = {
                    **category_info,
                    "esg_classification": "미분류",
                    "esg_classification_id": None,
                    "base_issuepools": [],
                    "total_issuepools": 0
                }
                matched_categories.append(matched_category)
        
        logger.info(f"🔄 Fallback 개별 처리 완료: {len(matched_categories)}개 카테고리")
        return matched_categories
        
    except Exception as e:
        logger.error(f"❌ Fallback 개별 처리도 실패: {str(e)}")
        # 최후 수단: 원본 카테고리 정보만 반환
        return ranked_categories

async def start_assessment(request: MiddleIssueRequest) -> Dict[str, Any]:
    """
    중대성 평가 시작 - 크롤링 데이터 처리 및 분석 시작
    """
    try:
        # 1) 요청 로깅
        start_time = datetime.now()
        logger.info("="*50)
        logger.info("🚀 새로운 중대성 평가 시작")
        logger.info(f"기업명: {request.company_id}")
        logger.info(f"보고기간: {request.report_period}")
        logger.info(f"요청 타입: {request.request_type}")
        logger.info(f"총 크롤링 기사 수: {request.total_results}")
        logger.info("-"*50)

        # 2) 모델 로드
        model_start = datetime.now()
        logger.info("🔥 크롤링 데이터 감성 분석 시작")
        model = load_sentiment_model()
        if not model:
            raise Exception("감성 분석 모델 로드 실패")
        model_load_time = (datetime.now() - model_start).total_seconds()
        logger.info(f"⏱️ 모델 로드 완료: {model_load_time:.2f}초")

        # 3) 감성 분석
        sentiment_start = datetime.now()
        logger.info("🔥 크롤링 데이터 감성 분석 시작")
        analyzed_articles = analyze_sentiment(model, request.articles)
        sentiment_time = (datetime.now() - sentiment_start).total_seconds()
        logger.info(f"⏱️ 감성 분석 완료: {sentiment_time:.2f}초 ({len(analyzed_articles)}개 기사)")

        # 4) (검색 기준연도 - 1) & 공통(NULL) 카테고리 조회
        db_query_start = datetime.now()
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
        
        logger.info(f"🔍 prev_year_categories: {len(prev_year_categories)}개, reference_categories: {len(reference_categories)}개")
        db_query_time = (datetime.now() - db_query_start).total_seconds()
        logger.info(f"⏱️ DB 조회 완료: {db_query_time:.2f}초")

        # 5) 라벨 부여
        labeling_start = datetime.now()
        logger.info("🏷️ 라벨(relevance/recent/rank/reference) 부여 시작")
        search_date = datetime.now()
        labeled_articles = await add_relevance_labels(
            analyzed_articles,
            request.company_id,
            search_date,
            prev_year_categories,
            reference_categories
        )
        labeling_time = (datetime.now() - labeling_start).total_seconds()
        logger.info(f"⏱️ 라벨 부여 완료: {labeling_time:.2f}초")

        # 6) 카테고리별 점수 계산
        scoring_start = datetime.now()
        logger.info("📊 카테고리별 점수 계산 시작")
        category_scores = calculate_category_scores(labeled_articles)
        scoring_time = (datetime.now() - scoring_start).total_seconds()
        logger.info(f"⏱️ 점수 계산 완료: {scoring_time:.2f}초")

        # 🔍 디버깅: 라벨링 결과 분석
        debug_labeling_results(labeled_articles, category_scores)

        # 📊 디버깅용 Excel 파일 자동 생성
        excel_start = datetime.now()
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            company_name = request.company_id.replace(" ", "_").replace("/", "_")
            
            # 절대 경로로 저장 (서버의 /tmp 디렉토리 또는 현재 작업 디렉토리)
            import os
            current_dir = os.getcwd()
            logger.info(f"📁 현재 작업 디렉토리: {current_dir}")
            
            # 1. 통합 분석 Excel (라벨링 + 점수)
            combined_filename = os.path.join(current_dir, f"combined_analysis_{company_name}_{timestamp}.xlsx")
            export_combined_analysis_to_excel(labeled_articles, category_scores, combined_filename)
            
            # 2. 라벨링된 기사 Excel
            labeled_filename = os.path.join(current_dir, f"labeled_articles_{company_name}_{timestamp}.xlsx")
            export_labeled_articles_to_excel(labeled_articles, labeled_filename)
            
            # 3. 카테고리 점수 Excel
            scores_filename = os.path.join(current_dir, f"category_scores_{company_name}_{timestamp}.xlsx")
            export_category_scores_to_excel(category_scores, scores_filename)
            
            logger.info(f"📊 디버깅용 Excel 파일 생성 완료:")
            logger.info(f"   - 통합 분석: {combined_filename}")
            logger.info(f"   - 라벨링 기사: {labeled_filename}")
            logger.info(f"   - 카테고리 점수: {scores_filename}")
            logger.info(f"📁 파일 저장 위치: {current_dir}")
            
        except Exception as e:
            logger.warning(f"⚠️ Excel 파일 생성 실패: {str(e)}")
        
        excel_time = (datetime.now() - excel_start).total_seconds()
        logger.info(f"⏱️ Excel 파일 생성 완료: {excel_time:.2f}초")

        # 7) 카테고리 랭킹
        ranking_start = datetime.now()
        logger.info("🏆 카테고리 순위 매기기 시작")
        ranked_categories = rank_categories_by_score(category_scores)
        ranking_time = (datetime.now() - ranking_start).total_seconds()
        logger.info(f"⏱️ 카테고리 랭킹 완료: {ranking_time:.2f}초")

        # 8) 카테고리별 ESG 분류 및 이슈풀 매칭 (배치 처리로 성능 향상)
        matching_start = datetime.now()
        logger.info("🔗 카테고리별 ESG 분류 및 이슈풀 매칭 시작 (배치 처리)")
        matched_categories = await match_categories_with_esg_and_issuepool(
            ranked_categories, 
            request.company_id, 
            search_year
        )
        matching_time = (datetime.now() - matching_start).total_seconds()
        logger.info(f"⏱️ ESG/이슈풀 매칭 완료: {matching_time:.2f}초")

        # 9) 통계/로깅
        negative_count = sum(1 for a in labeled_articles if a["sentiment"] == "negative")
        logger.info(f"📊 분석 완료 통계:")
        logger.info(f"   - 분석된 기사 수: {len(labeled_articles)}")
        logger.info(f"   - 부정적 기사 수: {negative_count}")
        logger.info(f"   - 분석된 카테고리 수: {len(category_scores)}")
        logger.info(f"   - 매칭된 카테고리 수: {len(matched_categories)}")

        # 🔥 최종 카테고리 순위 (상위 5개만 info로)
        logger.info("\n🏆 최종 카테고리 순위 (상위 5개):")
        for i, row in enumerate(matched_categories[:5]):
            esg_name = row.get('esg_classification', '미분류')
            issue_count = len(row.get('base_issuepools', []))
            final_score = row.get('final_score', 0.0)
            logger.info(
                f"{i+1:>2}위 | 카테고리: {row['category']} | ESG: {esg_name} | "
                f"이슈풀: {issue_count}개 | 최종점수: {final_score:.3f}"
            )
        
        # 나머지는 debug 레벨로
        if len(matched_categories) > 5:
            logger.debug(f"📋 나머지 {len(matched_categories) - 5}개 카테고리 (debug 레벨)")

        # 🔥 전체 카테고리 순위 요약
        logger.info(f"\n📋 전체 {len(matched_categories)}개 카테고리 매칭 완료")
        
        # ⏱️ 전체 처리 시간 요약
        total_time = (datetime.now() - start_time).total_seconds()
        logger.info("="*50)
        logger.info(f"⏱️ 전체 처리 시간 요약:")
        logger.info(f"   - 모델 로드: {model_load_time:.2f}초")
        logger.info(f"   - 감성 분석: {sentiment_time:.2f}초")
        logger.info(f"   - DB 조회: {db_query_time:.2f}초")
        logger.info(f"   - 라벨 부여: {labeling_time:.2f}초")
        logger.info(f"   - 점수 계산: {scoring_time:.2f}초")
        logger.info(f"   - Excel 생성: {excel_time:.2f}초")
        logger.info(f"   - 카테고리 랭킹: {ranking_time:.2f}초")
        logger.info(f"   - ESG/이슈풀 매칭: {matching_time:.2f}초")
        logger.info(f"   - 총 처리 시간: {total_time:.2f}초")
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


# ============================================================================
# 🚧 성능 향상을 위한 타임아웃 래퍼 함수
# ============================================================================

async def start_assessment_with_timeout(request: MiddleIssueRequest, timeout_seconds: int = 300) -> Dict[str, Any]:
    """
    중대성 평가를 타임아웃과 함께 실행 (500 에러 방지)
    
    Args:
        request: 중대성 평가 요청
        timeout_seconds: 타임아웃 시간 (초), 기본값 5분
    
    Returns:
        Dict[str, Any]: 중대성 평가 결과 또는 타임아웃 에러
    """
    try:
        import asyncio
        
        logger.info(f"⏰ 중대성 평가 타임아웃 설정: {timeout_seconds}초")
        logger.info(f"🚀 배치 처리 방식으로 성능 향상 적용됨")
        
        # 타임아웃과 함께 중대성 평가 실행
        result = await asyncio.wait_for(
            start_assessment(request), 
            timeout=timeout_seconds
        )
        
        logger.info("✅ 중대성 평가 타임아웃 내 완료")
        return result
        
    except asyncio.TimeoutError:
        error_msg = f"❌ 중대성 평가 타임아웃 ({timeout_seconds}초 초과)"
        logger.error(error_msg)
        logger.error("💡 배치 처리 방식 적용 후에도 타임아웃 발생 - 추가 성능 최적화 필요")
        logger.error("="*50)
        return {
            "success": False, 
            "message": error_msg, 
            "data": None,
            "timeout": True
        }
    except Exception as e:
        error_msg = f"❌ 중대성 평가 실행 중 예상치 못한 오류: {str(e)}"
        logger.error(error_msg)
        logger.error("="*50)
        return {
            "success": False, 
            "message": error_msg, 
            "data": None
        }


# ============================================================================
# 🚧 디버깅용 Excel 내보내기 함수들 (나중에 삭제 가능)
# ============================================================================

def export_labeled_articles_to_excel(labeled_articles: List[Dict[str, Any]], output_path: str = "labeled_articles_debug.xlsx"):
    """
    라벨링된 기사들을 Excel로 내보내기 (디버깅용)
    
    Args:
        labeled_articles: 라벨링된 기사 리스트
        output_path: 출력 파일 경로
    
    Note: 이 함수는 디버깅 목적으로만 사용되며, 나중에 삭제 가능합니다.
    """
    try:
        import pandas as pd
        from datetime import datetime
        
        logger.info(f"📊 라벨링된 기사 Excel 내보내기 시작: {len(labeled_articles)}개 기사")
        
        # 1. Raw Data 시트
        raw_data = []
        for article in labeled_articles:
            raw_data.append({
                'company': article.get('company', ''),
                'issue': article.get('issue', ''),
                'original_category': article.get('original_category', ''),
                'title': article.get('title', ''),
                'description': article.get('description', ''),
                'pubDate': article.get('pubDate', ''),
                'sentiment': article.get('sentiment', ''),
                'relevance_label': article.get('relevance_label', False),
                'recent_label': article.get('recent_label', False),
                'rank_label': article.get('rank_label', False),
                'reference_label': article.get('reference_label', False),
                'relevance_score': article.get('relevance_score', 0.0),
                'recent_score': article.get('recent_score', 0.0),
                'rank_score': article.get('rank_score', 0.0),
                'reference_score': article.get('reference_score', 0.0),
                'negative_score': article.get('negative_score', 0.0)
            })
        
        # 2. Summary 시트
        summary_data = {
            '총 기사 수': len(labeled_articles),
            '부정적 기사 수': sum(1 for a in labeled_articles if a.get('sentiment') == 'negative'),
            '긍정적 기사 수': sum(1 for a in labeled_articles if a.get('sentiment') == 'positive'),
            '중립적 기사 수': sum(1 for a in labeled_articles if a.get('sentiment') == 'neutral'),
            'relevance_label True': sum(1 for a in labeled_articles if a.get('relevance_label')),
            'recent_label True': sum(1 for a in labeled_articles if a.get('recent_label')),
            'rank_label True': sum(1 for a in labeled_articles if a.get('rank_label')),
            'reference_label True': sum(1 for a in labeled_articles if a.get('reference_label'))
        }
        
        # 3. Category Stats 시트
        category_stats = {}
        for article in labeled_articles:
            category = article.get('original_category', '')
            if category not in category_stats:
                category_stats[category] = {
                    'count': 0,
                    'negative_count': 0,
                    'relevance_true': 0,
                    'recent_true': 0,
                    'rank_true': 0,
                    'reference_true': 0
                }
            
            category_stats[category]['count'] += 1
            if article.get('sentiment') == 'negative':
                category_stats[category]['negative_count'] += 1
            if article.get('relevance_label'):
                category_stats[category]['relevance_true'] += 1
            if article.get('recent_label'):
                category_stats[category]['recent_true'] += 1
            if article.get('rank_label'):
                category_stats[category]['rank_true'] += 1
            if article.get('reference_label'):
                category_stats[category]['reference_true'] += 1
        
        # Excel 파일 생성
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Raw Data
            pd.DataFrame(raw_data).to_excel(writer, sheet_name='Raw Data', index=False)
            
            # Summary
            pd.DataFrame([summary_data]).to_excel(writer, sheet_name='Summary', index=False)
            
            # Category Stats
            category_df = pd.DataFrame.from_dict(category_stats, orient='index')
            category_df.to_excel(writer, sheet_name='Category Stats')
        
        logger.info(f"✅ 라벨링된 기사 Excel 내보내기 완료: {output_path}")
        
    except Exception as e:
        logger.error(f"❌ 라벨링된 기사 Excel 내보내기 실패: {str(e)}")


def export_category_scores_to_excel(category_scores: Dict[str, Dict[str, Any]], output_path: str = "category_scores_debug.xlsx"):
    """
    카테고리 점수들을 Excel로 내보내기 (디버깅용)
    
    Args:
        category_scores: 카테고리별 점수 딕셔너리
        output_path: 출력 파일 경로
    
    Note: 이 함수는 디버깅 목적으로만 사용되며, 나중에 삭제 가능합니다.
    """
    try:
        import pandas as pd
        
        logger.info(f"📊 카테고리 점수 Excel 내보내기 시작: {len(category_scores)}개 카테고리")
        
        # 1. Sorted Scores 시트 (최종 점수 순)
        sorted_scores = []
        for category, scores in category_scores.items():
            sorted_scores.append({
                'category': category,
                'final_score': scores.get('final_score', 0.0),
                'frequency_score': scores.get('frequency_score', 0.0),
                'relevance_score': scores.get('relevance_score', 0.0),
                'recent_score': scores.get('recent_score', 0.0),
                'rank_score': scores.get('rank_score', 0.0),
                'reference_score': scores.get('reference_score', 0.0),
                'negative_score': scores.get('negative_score', 0.0),
                'total_articles': scores.get('total_articles', 0),
                'negative_articles': scores.get('negative_articles', 0)
            })
        
        # 최종 점수 순으로 정렬
        sorted_scores.sort(key=lambda x: x['final_score'], reverse=True)
        
        # 2. Raw Scores 시트 (원본 데이터)
        raw_scores = []
        for category, scores in category_scores.items():
            raw_scores.append({
                'category': category,
                **scores
            })
        
        # 3. Score Distribution 시트
        score_ranges = {
            '0-1': 0, '1-2': 0, '2-3': 0, '3-4': 0, '4-5': 0,
            '5-6': 0, '6-7': 0, '7-8': 0, '8-9': 0, '9-10': 0
        }
        
        for category, scores in category_scores.items():
            final_score = scores.get('final_score', 0.0)
            if final_score < 1:
                score_ranges['0-1'] += 1
            elif final_score < 2:
                score_ranges['1-2'] += 1
            elif final_score < 3:
                score_ranges['2-3'] += 1
            elif final_score < 4:
                score_ranges['3-4'] += 1
            elif final_score < 5:
                score_ranges['4-5'] += 1
            elif final_score < 6:
                score_ranges['5-6'] += 1
            elif final_score < 7:
                score_ranges['6-7'] += 1
            elif final_score < 8:
                score_ranges['7-8'] += 1
            elif final_score < 9:
                score_ranges['8-9'] += 1
            else:
                score_ranges['9-10'] += 1
        
        # 4. Top/Bottom Categories 시트
        top_categories = sorted_scores[:10]  # 상위 10개
        bottom_categories = sorted_scores[-10:]  # 하위 10개
        
        # Excel 파일 생성
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Sorted Scores
            pd.DataFrame(sorted_scores).to_excel(writer, sheet_name='Sorted Scores', index=False)
            
            # Raw Scores
            pd.DataFrame(raw_scores).to_excel(writer, sheet_name='Raw Scores', index=False)
            
            # Score Distribution
            distribution_df = pd.DataFrame([score_ranges])
            distribution_df.to_excel(writer, sheet_name='Score Distribution', index=False)
            
            # Top Categories
            pd.DataFrame(top_categories).to_excel(writer, sheet_name='Top Categories', index=False)
            
            # Bottom Categories
            pd.DataFrame(bottom_categories).to_excel(writer, sheet_name='Bottom Categories', index=False)
        
        logger.info(f"✅ 카테고리 점수 Excel 내보내기 완료: {output_path}")
        
    except Exception as e:
        logger.error(f"❌ 카테고리 점수 Excel 내보내기 실패: {str(e)}")


# ============================================================================
# 🚧 디버깅용 Excel 내보내기 함수들 끝
# ============================================================================

def export_combined_analysis_to_excel(
    labeled_articles: List[Dict[str, Any]], 
    category_scores: Dict[str, Dict[str, Any]], 
    output_path: str = "combined_analysis_debug.xlsx"
):
    """
    라벨링과 카테고리 점수를 하나의 시트에 열을 길게 이어붙여서 하나의 Excel로 내보내기 (디버깅용)
    
    Args:
        labeled_articles: 라벨링된 기사 리스트
        category_scores: 카테고리별 점수 딕셔너리
        output_path: 출력 파일 경로
    
    Note: 이 함수는 디버깅 목적으로만 사용되며, 나중에 삭제 가능합니다.
    """
    try:
        import pandas as pd
        
        logger.info(f"📊 통합 분석 Excel 내보내기 시작")
        logger.info(f"   - 라벨링된 기사: {len(labeled_articles)}개")
        logger.info(f"   - 카테고리 점수: {len(category_scores)}개")
        
        # 1. 라벨링 데이터를 DataFrame으로 변환
        labeled_df = pd.DataFrame(labeled_articles)
        
        # 2. 카테고리 점수를 DataFrame으로 변환
        scores_data = []
        for category, scores in category_scores.items():
            scores_data.append({
                'category': category,
                **scores
            })
        scores_df = pd.DataFrame(scores_data)
        
        # 3. 두 DataFrame을 열 방향으로 연결 (가로로 이어붙이기)
        # 라벨링 데이터가 더 길면 scores_df를 반복하여 맞춤
        if len(labeled_df) > len(scores_df):
            # scores_df를 labeled_df 길이만큼 반복
            repeated_scores = []
            for i in range(len(labeled_df)):
                category_idx = i % len(scores_df)
                repeated_scores.append(scores_data[category_idx])
            scores_df_extended = pd.DataFrame(repeated_scores)
            
            # 열 방향으로 연결
            combined_df = pd.concat([labeled_df, scores_df_extended], axis=1)
            
        else:
            # labeled_df를 scores_df 길이만큼 반복
            repeated_labeled = []
            for i in range(len(scores_df)):
                article_idx = i % len(labeled_df) if len(labeled_df) > 0 else 0
                if len(labeled_df) > 0:
                    repeated_labeled.append(labeled_articles[article_idx])
                else:
                    # labeled_articles가 비어있는 경우 빈 딕셔너리로 채움
                    repeated_labeled.append({})
            labeled_df_extended = pd.DataFrame(repeated_labeled)
            
            # 열 방향으로 연결
            combined_df = pd.concat([labeled_df_extended, scores_df], axis=1)
        
        # 4. 열 이름 정리 및 순서 조정
        # 라벨링 관련 열들
        labeled_columns = [
            'company', 'issue', 'original_category', 'title', 'description', 
            'pubDate', 'sentiment', 'sentiment_confidence', 'neg_keywords', 
            'pos_keywords', 'sentiment_basis', 'relevance_label', 'recent_value', 
            'rank_label', 'reference_label', 'label_reasons'
        ]
        
        # 점수 관련 열들
        score_columns = [
            'category', 'count', 'frequency_score', 'relevance_score', 
            'recent_score', 'rank_score', 'reference_score', 'negative_score', 
            'final_score'
        ]
        
        # 실제 존재하는 열들만 필터링
        existing_labeled_cols = [col for col in labeled_columns if col in combined_df.columns]
        existing_score_cols = [col for col in score_columns if col in combined_df.columns]
        
        # 열 순서 재정렬
        final_columns = existing_labeled_cols + existing_score_cols
        combined_df = combined_df[final_columns]
        
        # 5. Excel 파일 생성
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # 통합 데이터 시트
            combined_df.to_excel(writer, sheet_name='Combined Analysis', index=False)
            
            # 요약 통계 시트
            summary_data = {
                '분석 항목': [
                    '총 기사 수',
                    '총 카테고리 수',
                    '부정적 기사 수',
                    '긍정적 기사 수',
                    '중립적 기사 수',
                    'relevance_label True',
                    'recent_label True',
                    'rank_label True',
                    'reference_label True',
                    '최고 점수 카테고리',
                    '최저 점수 카테고리',
                    '평균 최종 점수'
                ],
                '값': [
                    len(labeled_articles),
                    len(category_scores),
                    sum(1 for a in labeled_articles if a.get('sentiment') == 'negative'),
                    sum(1 for a in labeled_articles if a.get('sentiment') == 'positive'),
                    sum(1 for a in labeled_articles if a.get('sentiment') == 'neutral'),
                    sum(1 for a in labeled_articles if a.get('relevance_label')),
                    sum(1 for a in labeled_articles if a.get('recent_value', 0) > 0),
                    sum(1 for a in labeled_articles if a.get('rank_label')),
                    sum(1 for a in labeled_articles if a.get('reference_label')),
                    max(category_scores.items(), key=lambda x: x[1].get('final_score', 0))[0] if category_scores else 'N/A',
                    min(category_scores.items(), key=lambda x: x[1].get('final_score', 0))[0] if category_scores else 'N/A',
                    round(sum(s.get('final_score', 0) for s in category_scores.values()) / len(category_scores), 3) if category_scores else 0.0
                ]
            }
            
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
            
            # 카테고리별 점수 순위 시트
            if category_scores:
                sorted_scores = sorted(
                    [(cat, scores) for cat, scores in category_scores.items()],
                    key=lambda x: x[1].get('final_score', 0),
                    reverse=True
                )
                
                ranking_data = []
                for i, (category, scores) in enumerate(sorted_scores, 1):
                    ranking_data.append({
                        '순위': i,
                        '카테고리': category,
                        '최종점수': scores.get('final_score', 0.0),
                        '빈도점수': scores.get('frequency_score', 0.0),
                        '관련성점수': scores.get('relevance_score', 0.0),
                        '최신성점수': scores.get('recent_score', 0.0),
                        '순위점수': scores.get('rank_score', 0.0),
                        '참조점수': scores.get('reference_score', 0.0),
                        '부정성점수': scores.get('negative_score', 0.0),
                        '기사수': scores.get('count', 0)
                    })
                
                ranking_df = pd.DataFrame(ranking_data)
                ranking_df.to_excel(writer, sheet_name='Category Ranking', index=False)
        
        logger.info(f"✅ 통합 분석 Excel 내보내기 완료: {output_path}")
        logger.info(f"📊 총 {len(combined_df)}행, {len(combined_df.columns)}열의 데이터 생성")
        
    except Exception as e:
        logger.error(f"❌ 통합 분석 Excel 내보내기 실패: {str(e)}")
        import traceback
        logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")


# ============================================================================
# 🚧 통합 분석 Excel 내보내기 함수 끝
# ============================================================================

def debug_labeling_results(labeled_articles: List[Dict[str, Any]], category_scores: Dict[str, Dict[str, Any]]):
    """
    라벨링 결과를 디버깅하기 위한 간단한 분석 함수
    """
    try:
        logger.info("🔍 라벨링 결과 디버깅 시작")
        
        # 1. 라벨링 통계
        total_articles = len(labeled_articles)
        logger.info(f"📊 총 기사 수: {total_articles}")
        
        if total_articles == 0:
            logger.warning("⚠️ 라벨링된 기사가 없습니다.")
            return
        
        # 2. 최신성 점수 분석
        recent_values = [a.get('recent_value', 0.0) for a in labeled_articles]
        recent_1_0 = sum(1 for v in recent_values if v == 1.0)
        recent_0_5 = sum(1 for v in recent_values if v == 0.5)
        recent_0_0 = sum(1 for v in recent_values if v == 0.0)
        
        logger.info(f"🔍 최신성 점수 분석:")
        logger.info(f"   - 1.0 (3개월 이내): {recent_1_0}개 ({recent_1_0/total_articles*100:.1f}%)")
        logger.info(f"   - 0.5 (3~6개월): {recent_0_5}개 ({recent_0_5/total_articles*100:.1f}%)")
        logger.info(f"   - 0.0 (6개월 이상): {recent_0_0}개 ({recent_0_0/total_articles*100:.1f}%)")
        
        # 3. rank/reference 라벨 분석
        rank_true = sum(1 for a in labeled_articles if a.get('rank_label'))
        reference_true = sum(1 for a in labeled_articles if a.get('reference_label'))
        
        logger.info(f"🔍 rank/reference 라벨 분석:")
        logger.info(f"   - rank_label True: {rank_true}개 ({rank_true/total_articles*100:.1f}%)")
        logger.info(f"   - reference_label True: {reference_true}개 ({reference_true/total_articles*100:.1f}%)")
        
        # 4. 카테고리별 점수 분석
        if category_scores:
            logger.info(f"🔍 카테고리 점수 분석:")
            for category, scores in list(category_scores.items())[:5]:  # 상위 5개만
                logger.info(f"   - '{category}':")
                logger.info(f"     recent_score: {scores.get('recent_score', 0.0):.3f}")
                logger.info(f"     rank_score: {scores.get('rank_score', 0.0):.3f}")
                logger.info(f"     reference_score: {scores.get('reference_score', 0.0):.3f}")
        
        # 5. 샘플 기사 분석
        logger.info(f"🔍 샘플 기사 분석 (상위 3개):")
        for i, article in enumerate(labeled_articles[:3]):
            logger.info(f"   {i+1}. '{article.get('title', '')[:50]}...'")
            logger.info(f"      - recent_value: {article.get('recent_value', 0.0)}")
            logger.info(f"      - rank_label: {article.get('rank_label', False)}")
            logger.info(f"      - reference_label: {article.get('reference_label', False)}")
            logger.info(f"      - original_category: {article.get('original_category', 'N/A')}")
            logger.info(f"      - pubDate: {article.get('pubDate', 'N/A')}")
        
        # 6. ESG 분류 조회 결과 분석
        logger.info(f"🔍 ESG 분류 조회 결과 분석:")
        esg_results = {}
        for article in labeled_articles:
            category = article.get('original_category', '')
            if category:
                esg_results[category] = esg_results.get(category, 0) + 1
        
        logger.info(f"   - 총 카테고리 수: {len(esg_results)}")
        logger.info(f"   - 카테고리별 기사 수: {esg_results}")
        
        logger.info("✅ 라벨링 결과 디버깅 완료")
        
    except Exception as e:
        logger.error(f"❌ 라벨링 결과 디버깅 중 오류: {str(e)}")


# ============================================================================
# 🚧 디버깅 함수 끝
# ============================================================================
