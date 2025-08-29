"""
Middleissue Repository - BaseModel을 받아서 데이터베이스 작업을 수행하는 계층
데이터베이스 연결을 담당하며, BaseModel과 Entity 간의 변환을 처리
"""
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, cast, Integer, func, text, join
from sqlalchemy.exc import ProgrammingError, DBAPIError
from typing import List, Optional, Dict
from app.domain.middleissue.schema import (
    MiddleIssueBase, IssueItem, CorporationIssueResponse, 
    CorporationBase, ESGClassificationBase, CategoryBase, CrawledArticleBase,
    CategoryDetailsResponse, BaseIssuePool
)
from app.domain.middleissue.entity import MiddleIssueEntity, CorporationEntity, CategoryEntity, ESGClassificationEntity
from app.common.database.issuepool_db import get_db
import logging

logger = logging.getLogger(__name__)

def _safe_text_to_int(text_value: str) -> Optional[int]:
    """Text 타입의 숫자 문자열을 안전하게 정수로 변환"""
    if not text_value or not isinstance(text_value, str):
        return None
    
    # 공백 제거 후 숫자만 있는지 확인
    cleaned = text_value.strip()
    if cleaned.isdigit():
        try:
            return int(cleaned)
        except (ValueError, TypeError):
            return None
    return None

def _safe_text_to_float(text_value: str) -> Optional[float]:
    """Text 타입의 숫자 문자열을 안전하게 실수로 변환"""
    if not text_value or not isinstance(text_value, str):
        return None
    
    # 공백 제거 후 숫자로 변환 가능한지 확인
    cleaned = text_value.strip()
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None

async def _safe_scalar(session, stmt, log_ctx: str) -> Optional[int]:
    """예외 발생 시 즉시 rollback 하고 None 반환"""
    try:
        return await session.scalar(stmt)
    except (ProgrammingError, DBAPIError) as e:
        logger.warning(f"⚠️ {log_ctx} 중 오류: {e}")
        try:
            await session.rollback()
            logger.info("↩️ 트랜잭션 롤백 완료")
        except Exception as rb_e:
            logger.error(f"❌ 롤백 중 오류: {rb_e}")
        return None

class MiddleIssueRepository:
    """중간 이슈 리포지토리 - 이슈풀 관련 데이터베이스 작업"""
    
    def __init__(self):
        pass
    
    async def get_corporation_issues(self, corporation_name: str, year: int) -> CorporationIssueResponse:
        """
        기업명과 연도로 이슈 조회
        - 입력받은 연도에서 1을 뺀 연도의 이슈와
        - publish_year가 null인 공통 이슈를 함께 반환
        """
        try:
            target_year = year - 1  # 입력받은 연도에서 1을 뺀 값
            logger.info(f"🔍 리포지토리: 기업 '{corporation_name}'의 {target_year}년도 이슈 및 공통 이슈 조회 시작")
            
            async for db in get_db():
                # 1. 먼저 기업명으로 corporation_id 조회
                corp_query = select(CorporationEntity).where(
                    CorporationEntity.companyname == corporation_name
                )
                corp_result = await db.execute(corp_query)
                corporation = corp_result.scalar_one_or_none()
                
                if not corporation:
                    logger.warning(f"⚠️ 기업 '{corporation_name}'을 찾을 수 없습니다.")
                    return CorporationIssueResponse(year_issues=[], common_issues=[])
                
                # 2. 해당 연도의 이슈와 공통 이슈(publish_year is null) 함께 조회
                # 안전한 TEXT -> INTEGER 캐스팅을 위한 쿼리 수정
                year_condition = or_(
                    MiddleIssueEntity.publish_year.is_(None),
                    MiddleIssueEntity.publish_year == '',  # 빈 문자열도 공통 이슈로 처리
                    MiddleIssueEntity.publish_year == '0',  # '0'도 공통 이슈로 처리
                    and_(
                        # 빈 문자열이 아닌지 확인
                        MiddleIssueEntity.publish_year != '',
                        MiddleIssueEntity.publish_year != '0',
                        # 숫자로만 구성된 문자열인지 확인 (공백 허용)
                        MiddleIssueEntity.publish_year.op('~')(r'^\s*\d+\s*$'),
                        # 안전하게 trim 후 캐스팅하여 비교
                        cast(func.trim(MiddleIssueEntity.publish_year), Integer) == target_year
                    )
                )
                
                query = select(MiddleIssueEntity).where(
                    and_(
                        MiddleIssueEntity.corporation_id == corporation.id,
                        year_condition
                    )
                )
                
                result = await db.execute(query)
                issue_entities = result.scalars().all()
                
                # 3. 연도별 이슈와 공통 이슈 분리
                year_issues = []
                common_issues = []
                
                for entity in issue_entities:
                    issue_item = IssueItem(
                        category_id=entity.category_id,
                        base_issue_pool=entity.base_issue_pool
                    )
                    
                    # publish_year가 None, 빈 문자열, 또는 '0'이면 공통 이슈
                    if entity.publish_year is None or entity.publish_year == '' or entity.publish_year == '0':
                        common_issues.append(issue_item)
                    else:
                        year_issues.append(issue_item)
                
                response = CorporationIssueResponse(
                    year_issues=year_issues,
                    common_issues=common_issues
                )
                
                logger.info(f"✅ 리포지토리: 기업 '{corporation_name}'의 {target_year}년도 이슈 {len(year_issues)}개, 공통 이슈 {len(common_issues)}개 조회 완료")
                return response
                
        except Exception as e:
            logger.error(f"❌ 리포지토리: 기업 이슈 조회 중 오류 - {str(e)}")
            raise

    async def get_category_details(self, corporation_name: str, category_id: str, year: int) -> Optional[CategoryDetailsResponse]:
        """
        특정 카테고리의 ESG 분류와 base_issuepool 상세 정보 조회
        
        Args:
            corporation_name: 기업명
            category_id: 카테고리 ID 또는 이름 (문자열)
            year: 검색 연도
            
        Returns:
            카테고리 상세 정보 (ESG 분류, base_issuepool 목록 포함)
        """
        try:
            logger.info(f"🔍 리포지토리: 카테고리 '{category_id}' 상세 정보 조회 시작")
            logger.info(f"🔍 파라미터: 기업명={corporation_name}, 카테고리ID={category_id}, 연도={year}")
            logger.info(f"🔍 카테고리 타입: {type(category_id)}")
            
            async for db in get_db():
                logger.info(f"🔍 데이터베이스 연결 성공")
                
                # 1. 먼저 기업명으로 corporation_id 조회
                corp_query = select(CorporationEntity).where(
                    CorporationEntity.companyname == corporation_name
                )
                logger.info(f"🔍 기업 조회 쿼리: {corp_query}")
                
                corp_result = await db.execute(corp_query)
                corporation = corp_result.scalar_one_or_none()
                
                if not corporation:
                    logger.warning(f"⚠️ 기업 '{corporation_name}'을 찾을 수 없습니다.")
                    return None
                
                logger.info(f"✅ 기업 조회 성공: ID={corporation.id}, 이름={corporation.companyname}")
                
                # 2. 카테고리 ID 정규화 (문자열이면 ID로 변환)
                normalized_category_id = category_id
                try:
                    # 숫자로 변환 가능한 경우 정수로 변환
                    if isinstance(category_id, str) and category_id.isdigit():
                        normalized_category_id = int(category_id)
                        logger.info(f"🔍 카테고리 ID 정규화 완료: {category_id} → {normalized_category_id}")
                    elif isinstance(category_id, int):
                        normalized_category_id = category_id
                        logger.info(f"🔍 카테고리 ID 이미 정수: {category_id}")
                    else:
                        logger.warning(f"⚠️ 카테고리 ID가 숫자가 아님: {category_id} (타입: {type(category_id)})")
                        # 간단한 카테고리 이름 → ID 변환 시도
                        logger.info(f"🔍 카테고리 이름 '{category_id}'를 ID로 변환 시도")
                        resolved_id = await _safe_scalar(
                            db, 
                            select(CategoryEntity.id).where(CategoryEntity.category_name == category_id), 
                            "카테고리 이름 매칭"
                        )
                        if resolved_id is not None:
                            normalized_category_id = int(resolved_id)
                            logger.info(f"✅ 카테고리 이름 매칭 성공: '{category_id}' → {normalized_category_id}")
                        else:
                            logger.warning(f"⚠️ 카테고리 이름 매칭 실패: '{category_id}'를 ID로 변환할 수 없음")
                            # 매칭 실패 시 매칭 불가로 처리
                            logger.error(f"❌ 카테고리 '{category_id}' 매칭 실패 → 매칭 불가")
                            return None
                except (ValueError, TypeError) as e:
                    logger.error(f"❌ 카테고리 ID 변환 실패: {category_id}, 오류: {e}")
                    # 변환 실패 시 원본 값 사용하되 로그 기록
                
                # 2. 안전한 publish_year 비교를 위한 조건 구성
                year_condition = None
                if year is not None:
                    # 연도 규약 통일: 내부에서 -1 적용
                    target_year = year - 1
                    logger.info(f"🔍 연도 조건 구성: {target_year}년도 또는 NULL/빈문자열/0 (입력: {year}년)")
                    
                    # 더 간단하고 명확한 연도 조건
                    year_condition = or_(
                        MiddleIssueEntity.publish_year.is_(None),
                        MiddleIssueEntity.publish_year == '',  # 빈 문자열도 공통 이슈로 처리
                        MiddleIssueEntity.publish_year == '0',  # '0'도 공통 이슈로 처리
                        # 숫자로만 구성된 문자열인지 확인하고 해당 연도와 비교
                        and_(
                            MiddleIssueEntity.publish_year != '',
                            MiddleIssueEntity.publish_year != '0',
                            MiddleIssueEntity.publish_year.op('~')(r'^\s*\d+\s*$'),
                            cast(func.trim(MiddleIssueEntity.publish_year), Integer) == target_year
                        )
                    )
                else:
                    # year가 None이면 publish_year가 NULL이거나 빈 문자열이거나 '0'인 것만 조회
                    year_condition = or_(
                        MiddleIssueEntity.publish_year.is_(None),
                        MiddleIssueEntity.publish_year == '',
                        MiddleIssueEntity.publish_year == '0'
                    )
                    logger.info(f"🔍 연도 조건: NULL 또는 빈문자열 또는 '0'만 조회")
                
                # 4. 해당 카테고리의 이슈풀 정보 조회 (ESG 분류 포함)
                # normalized_category_id가 정수인지 확인
                if not isinstance(normalized_category_id, int):
                    logger.error(f"❌ 카테고리 ID가 정수가 아님: {normalized_category_id} (타입: {type(normalized_category_id)})")
                    return None
                
                # JOIN을 사용하여 ESG 분류 정보도 함께 가져오기 (LEFT JOIN으로 변경)
                query = select(
                    MiddleIssueEntity,
                    ESGClassificationEntity.esg.label('esg_classification_name')
                ).outerjoin(  # INNER JOIN → LEFT JOIN으로 변경
                    ESGClassificationEntity,
                    MiddleIssueEntity.esg_classification_id == ESGClassificationEntity.id
                ).where(
                    and_(
                        MiddleIssueEntity.corporation_id == corporation.id,
                        MiddleIssueEntity.category_id == int(normalized_category_id),  # 정수 비교 보장
                        year_condition
                    )
                )
                
                logger.info(f"🔍 이슈풀 조회 쿼리: {query}")
                
                result = await db.execute(query)
                issue_rows = result.all()
                
                logger.info(f"🔍 이슈풀 조회 결과: {len(issue_rows)}개 행")
                
                # 연도 조건으로 데이터가 없으면, 연도 조건 없이 데이터 존재 여부 확인
                if len(issue_rows) == 0 and year_condition is not None:
                    logger.info(f"🔍 연도 조건으로 데이터가 없음. 연도 조건 없이 데이터 존재 여부 확인")
                    
                    # 연도 조건 없이 데이터 확인
                    no_year_query = select(
                        MiddleIssueEntity,
                        ESGClassificationEntity.esg.label('esg_classification_name')
                    ).outerjoin(
                        ESGClassificationEntity,
                        MiddleIssueEntity.esg_classification_id == ESGClassificationEntity.id
                    ).where(
                        and_(
                            MiddleIssueEntity.corporation_id == corporation.id,
                            MiddleIssueEntity.category_id == int(normalized_category_id)
                        )
                    )
                    
                    no_year_result = await db.execute(no_year_query)
                    no_year_rows = no_year_result.all()
                    
                    if len(no_year_rows) > 0:
                        logger.info(f"🔍 연도 조건 없이 데이터 존재: {len(no_year_rows)}개 행")
                        logger.info(f"🔍 publish_year 값들: {[row[0].publish_year for row in no_year_rows]}")
                        
                        # 연도 조건을 완화하여 재시도
                        relaxed_year_condition = or_(
                            MiddleIssueEntity.publish_year.is_(None),
                            MiddleIssueEntity.publish_year == '',
                            MiddleIssueEntity.publish_year == '0'
                        )
                        
                        relaxed_query = select(
                            MiddleIssueEntity,
                            ESGClassificationEntity.esg.label('esg_classification_name')
                        ).outerjoin(
                            ESGClassificationEntity,
                            MiddleIssueEntity.esg_classification_id == ESGClassificationEntity.id
                        ).where(
                            and_(
                                MiddleIssueEntity.corporation_id == corporation.id,
                                MiddleIssueEntity.category_id == int(normalized_category_id),
                                relaxed_year_condition
                            )
                        )
                        
                        relaxed_result = await db.execute(relaxed_query)
                        relaxed_rows = relaxed_result.all()
                        
                        if len(relaxed_rows) > 0:
                            logger.info(f"🔍 완화된 연도 조건으로 데이터 발견: {len(relaxed_rows)}개 행")
                            issue_rows = relaxed_rows
                        else:
                            logger.warning(f"⚠️ 완화된 연도 조건으로도 데이터 없음")
                    else:
                        logger.warning(f"⚠️ 해당 기업/카테고리 조합에 데이터가 전혀 없음")
                
                if not issue_rows:
                    logger.warning(f"⚠️ 카테고리 '{category_id}'에 해당하는 이슈풀을 찾을 수 없습니다.")
                    return None
                
                # 5. 첫 번째 행에서 ESG 분류 정보 추출 (모든 행이 동일한 ESG 분류를 가짐)
                first_row = issue_rows[0]
                first_entity = first_row[0]  # MiddleIssueEntity
                esg_classification_name = first_row[1]  # ESG 분류명
                
                logger.info(f"🔍 첫 번째 엔티티 정보: {first_entity}")
                logger.info(f"🔍 ESG 분류 정보: {esg_classification_name}")
                
                esg_classification_id = first_entity.esg_classification_id
                
                # 6. base_issuepool 목록 구성
                base_issuepools = []
                for i, row in enumerate(issue_rows):
                    entity = row[0]  # MiddleIssueEntity
                    issue_data = BaseIssuePool(
                        id=entity.id,
                        base_issue_pool=entity.base_issue_pool,
                        issue_pool=entity.issue_pool,
                        ranking=entity.ranking,
                        esg_classification_id=esg_classification_id,
                        esg_classification_name=esg_classification_name
                    )
                    base_issuepools.append(issue_data)
                    logger.info(f"🔍 이슈풀 {i+1}: {issue_data}")
                
                # 7. CategoryDetailsResponse 스키마로 변환하여 반환
                category_details = CategoryDetailsResponse(
                    category_id=str(category_id),
                    normalized_category_id=normalized_category_id,
                    esg_classification_id=esg_classification_id,
                    esg_classification_name=esg_classification_name,
                    base_issuepools=base_issuepools,
                    total_count=len(base_issuepools)
                )
                
                logger.info(f"✅ 리포지토리: 카테고리 '{category_id}' 상세 정보 조회 완료 - ESG: {esg_classification_name}, 이슈풀: {len(base_issuepools)}개")
                logger.info(f"✅ 반환할 데이터: {category_details}")
                return category_details
                
        except Exception as e:
            logger.error(f"❌ 리포지토리: 카테고리 상세 정보 조회 중 오류 - {str(e)}")
            logger.error(f"❌ 오류 상세: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")
            return None

    async def get_corporation_by_name(self, corporation_name: str) -> Optional[CorporationBase]:
        """기업명으로 기업 정보 조회"""
        try:
            async for db in get_db():
                query = select(CorporationEntity).where(
                    CorporationEntity.companyname == corporation_name
                )
                result = await db.execute(query)
                corporation = result.scalar_one_or_none()
                
                if corporation:
                    return CorporationBase(
                        id=corporation.id,
                        corp_code=corporation.corp_code,
                        companyname=corporation.companyname,
                        market=corporation.market,
                        dart_code=corporation.dart_code
                    )
                return None
        except Exception as e:
            logger.error(f"❌ 기업 정보 조회 중 오류: {str(e)}")
            return None

    async def get_category_by_id(self, category_id: int) -> Optional[CategoryBase]:
        """카테고리 ID로 카테고리 정보 조회"""
        try:
            async for db in get_db():
                query = select(CategoryEntity).where(CategoryEntity.id == category_id)
                result = await db.execute(query)
                category = result.scalar_one_or_none()
                
                if category:
                    return CategoryBase(
                        id=category.id,
                        category_name=category.category_name,
                        esg_classification_id=category.esg_classification_id
                    )
                return None
        except Exception as e:
            logger.error(f"❌ 카테고리 정보 조회 중 오류: {str(e)}")
            return None

    async def get_esg_classification_by_id(self, esg_id: int) -> Optional[ESGClassificationBase]:
        """ESG 분류 ID로 ESG 분류 정보 조회"""
        try:
            async for db in get_db():
                query = select(ESGClassificationEntity).where(ESGClassificationEntity.id == esg_id)
                result = await db.execute(query)
                esg = result.scalar_one_or_none()
                
                if esg:
                    return ESGClassificationBase(
                        id=esg.id,
                        esg=esg.esg
                    )
                return None
        except Exception as e:
            logger.error(f"❌ ESG 분류 정보 조회 중 오류: {str(e)}")
            return None

    async def get_category_id_by_name(self, category_name: str) -> Optional[int]:
        """카테고리 이름으로 카테고리 ID 조회 (라벨링용)"""
        try:
            async for db in get_db():
                query = select(CategoryEntity.id).where(CategoryEntity.category_name == category_name)
                result = await db.execute(query)
                category_id = result.scalar_one_or_none()
                return category_id
        except Exception as e:
            logger.error(f"❌ 카테고리 이름으로 ID 조회 중 오류: {str(e)}")
            return None

    async def get_category_esg_direct(self, category_name: str) -> Optional[str]:
        """materiality_category DB에서 카테고리 이름으로 직접 ESG 분류 조회"""
        try:
            async for db in get_db():
                # materiality_category 테이블에서 직접 ESG 분류 조회
                query = select(
                    ESGClassificationEntity.esg.label('esg_classification_name')
                ).join(
                    CategoryEntity,
                    CategoryEntity.esg_classification_id == ESGClassificationEntity.id
                ).where(
                    CategoryEntity.category_name == category_name
                )
                
                logger.info(f"🔍 materiality_category에서 ESG 분류 직접 조회: {category_name}")
                
                result = await db.execute(query)
                esg_classification = result.scalar_one_or_none()
                
                if esg_classification:
                    logger.info(f"✅ 카테고리 '{category_name}' ESG 분류 조회 성공: {esg_classification}")
                    return esg_classification
                else:
                    logger.warning(f"⚠️ 카테고리 '{category_name}'에 해당하는 ESG 분류가 없습니다.")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ materiality_category에서 ESG 분류 조회 중 오류: {str(e)}")
            return None

    async def get_middle_issue_with_relations(self, issue_id: int) -> Optional[MiddleIssueBase]:
        """이슈 ID로 이슈 정보와 관련 정보를 함께 조회"""
        try:
            async for db in get_db():
                # JOIN을 사용하여 관련 정보를 함께 가져오기
                query = select(
                    MiddleIssueEntity,
                    CorporationEntity.companyname.label('corporation_name'),
                    CategoryEntity.category_name.label('category_name'),
                    ESGClassificationEntity.esg.label('esg_classification_name')
                ).join(
                    CorporationEntity,
                    MiddleIssueEntity.corporation_id == CorporationEntity.id
                ).join(
                    CategoryEntity,
                    MiddleIssueEntity.category_id == CategoryEntity.id
                ).join(
                    ESGClassificationEntity,
                    MiddleIssueEntity.esg_classification_id == ESGClassificationEntity.id
                ).where(
                    MiddleIssueEntity.id == issue_id
                )
                
                result = await db.execute(query)
                row = result.first()
                
                if row:
                    issue_entity = row[0]
                    corporation_name = row[1]
                    category_name = row[2]
                    esg_name = row[3]
                    
                    return MiddleIssueBase(
                        id=issue_entity.id,
                        corporation_id=issue_entity.corporation_id,
                        publish_year=issue_entity.publish_year,
                        ranking=issue_entity.ranking,
                        base_issue_pool=issue_entity.base_issue_pool,
                        issue_pool=issue_entity.issue_pool,
                        category_id=issue_entity.category_id,
                        esg_classification_id=issue_entity.esg_classification_id
                    )
                return None
        except Exception as e:
            logger.error(f"❌ 이슈 정보 조회 중 오류: {str(e)}")
            return None

    async def get_category_by_name_direct(
        self, 
        corporation_name: str, 
        category_name: str, 
        year: int
    ) -> Optional[CategoryDetailsResponse]:
        """
        카테고리 이름으로 직접 조회하여 모든 관련 정보를 한 번에 가져오기
        JOIN을 사용하여 토큰화/별칭 매핑 없이 직접 매칭
        """
        try:
            logger.info(f"🔍 카테고리 이름으로 직접 조회: '{category_name}' (기업: {corporation_name}, 연도: {year})")
            
            async for db in get_db():
                # 1. 기업명으로 corporation_id 조회
                corp_query = select(CorporationEntity).where(
                    CorporationEntity.companyname == corporation_name
                )
                corp_result = await db.execute(corp_query)
                corporation = corp_result.scalar_one_or_none()
                
                if not corporation:
                    logger.warning(f"⚠️ 기업 '{corporation_name}'을 찾을 수 없습니다.")
                    return None
                
                # 2. 안전한 publish_year 비교를 위한 조건 구성
                year_condition = None
                if year is not None:
                    # 연도 규약 통일: 내부에서 -1 적용
                    target_year = year - 1
                    year_condition = or_(
                        MiddleIssueEntity.publish_year.is_(None),
                        MiddleIssueEntity.publish_year == '',  # 빈 문자열도 공통 이슈로 처리
                        and_(
                            MiddleIssueEntity.publish_year != '',
                            MiddleIssueEntity.publish_year.op('~')(r'^\s*\d+\s*$'),
                            cast(func.trim(MiddleIssueEntity.publish_year), Integer) == target_year
                        )
                    )
                    logger.info(f"🔍 연도 조건 구성: {target_year}년도 또는 NULL/빈문자열 (입력: {year}년)")
                else:
                    # year가 None이면 publish_year가 NULL이거나 빈 문자열인 것만 조회
                    year_condition = or_(
                        MiddleIssueEntity.publish_year.is_(None),
                        MiddleIssueEntity.publish_year == '',
                        MiddleIssueEntity.publish_year == '0'
                    )
                    logger.info(f"🔍 연도 조건: NULL 또는 빈문자열만 조회")
                
                # 3. JOIN을 사용하여 카테고리 이름으로 직접 조회
                query = select(
                    MiddleIssueEntity,
                    CategoryEntity.category_name,
                    ESGClassificationEntity.esg.label('esg_classification_name')
                ).join(
                    CategoryEntity,
                    MiddleIssueEntity.category_id == CategoryEntity.id
                ).outerjoin(  # INNER JOIN → LEFT JOIN으로 변경
                    ESGClassificationEntity,
                    MiddleIssueEntity.esg_classification_id == ESGClassificationEntity.id
                ).where(
                    and_(
                        MiddleIssueEntity.corporation_id == corporation.id,
                        CategoryEntity.category_name == category_name,  # 이름으로 직접 매칭
                        year_condition
                    )
                )
                
                logger.info(f"🔍 직접 조회 쿼리: {query}")
                
                result = await db.execute(query)
                issue_rows = result.all()
                
                logger.info(f"🔍 직접 조회 결과: {len(issue_rows)}개 행")
                
                # 연도 조건으로 데이터가 없으면, 연도 조건 없이 데이터 존재 여부 확인
                if len(issue_rows) == 0 and year_condition is not None:
                    logger.info(f"🔍 연도 조건으로 데이터가 없음. 연도 조건 없이 데이터 존재 여부 확인")
                    
                    # 연도 조건 없이 데이터 확인
                    no_year_query = select(
                        MiddleIssueEntity,
                        CategoryEntity.category_name,
                        ESGClassificationEntity.esg.label('esg_classification_name')
                    ).join(
                        CategoryEntity,
                        MiddleIssueEntity.category_id == CategoryEntity.id
                    ).outerjoin(
                        ESGClassificationEntity,
                        MiddleIssueEntity.esg_classification_id == ESGClassificationEntity.id
                    ).where(
                        and_(
                            MiddleIssueEntity.corporation_id == corporation.id,
                            CategoryEntity.category_name == category_name
                        )
                    )
                    
                    no_year_result = await db.execute(no_year_query)
                    no_year_rows = no_year_result.all()
                    
                    if len(no_year_rows) > 0:
                        logger.info(f"🔍 연도 조건 없이 데이터 존재: {len(no_year_rows)}개 행")
                        logger.info(f"🔍 publish_year 값들: {[row[0].publish_year for row in no_year_rows]}")
                        
                        # 연도 조건을 완화하여 재시도
                        relaxed_year_condition = or_(
                            MiddleIssueEntity.publish_year.is_(None),
                            MiddleIssueEntity.publish_year == '',
                            MiddleIssueEntity.publish_year == '0'
                        )
                        
                        relaxed_query = select(
                            MiddleIssueEntity,
                            CategoryEntity.category_name,
                            ESGClassificationEntity.esg.label('esg_classification_name')
                        ).join(
                            CategoryEntity,
                            MiddleIssueEntity.category_id == CategoryEntity.id
                        ).outerjoin(
                            ESGClassificationEntity,
                            MiddleIssueEntity.esg_classification_id == ESGClassificationEntity.id
                        ).where(
                            and_(
                                MiddleIssueEntity.corporation_id == corporation.id,
                                CategoryEntity.category_name == category_name,
                                relaxed_year_condition
                            )
                        )
                        
                        relaxed_result = await db.execute(relaxed_query)
                        relaxed_rows = relaxed_result.all()
                        
                        if len(relaxed_rows) > 0:
                            logger.info(f"🔍 완화된 연도 조건으로 데이터 발견: {len(relaxed_rows)}개 행")
                            issue_rows = relaxed_rows
                        else:
                            logger.warning(f"⚠️ 완화된 연도 조건으로도 데이터 없음")
                    else:
                        logger.warning(f"⚠️ 해당 기업/카테고리 조합에 데이터가 전혀 없음")
                
                if not issue_rows:
                    logger.warning(f"⚠️ 카테고리 '{category_name}'에 해당하는 이슈풀을 찾을 수 없습니다.")
                    return None
                
                # 4. 첫 번째 행에서 ESG 분류 정보 추출
                first_row = issue_rows[0]
                first_entity = first_row[0]  # MiddleIssueEntity
                esg_classification_name = first_row[2]  # ESG 분류명
                
                esg_classification_id = first_entity.esg_classification_id
                category_id = first_entity.category_id
                
                # 5. base_issuepool 목록 구성
                base_issuepools = []
                for i, row in enumerate(issue_rows):
                    entity = row[0]  # MiddleIssueEntity
                    issue_data = BaseIssuePool(
                        id=entity.id,
                        base_issue_pool=entity.base_issue_pool,
                        issue_pool=entity.issue_pool,
                        ranking=entity.ranking,
                        esg_classification_id=esg_classification_id,
                        esg_classification_name=esg_classification_name
                    )
                    base_issuepools.append(issue_data)
                    logger.info(f"🔍 이슈풀 {i+1}: {issue_data}")
                
                # 6. CategoryDetailsResponse 스키마로 변환하여 반환
                category_details = CategoryDetailsResponse(
                    category_id=category_name,
                    normalized_category_id=category_id,
                    esg_classification_id=esg_classification_id,
                    esg_classification_name=esg_classification_name,
                    base_issuepools=base_issuepools,
                    total_count=len(base_issuepools)
                )
                
                logger.info(f"✅ 카테고리 '{category_name}' 직접 조회 완료 - ESG: {esg_classification_name}, 이슈풀: {len(base_issuepools)}개")
                return category_details
                
        except Exception as e:
            logger.error(f"❌ 카테고리 직접 조회 중 오류: {str(e)}")
            logger.error(f"❌ 오류 상세: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")
            return None