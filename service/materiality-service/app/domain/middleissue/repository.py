"""
Middleissue Repository - BaseModel을 받아서 데이터베이스 작업을 수행하는 계층
데이터베이스 연결을 담당하며, BaseModel과 Entity 간의 변환을 처리
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, cast, Integer, func, text
from typing import List, Optional
from app.domain.middleissue.schema import MiddleIssueBase, IssueItem, CorporationIssueResponse
from app.domain.middleissue.entity import MiddleIssueEntity, CorporationEntity
from app.common.database.issuepool_db import get_db
import logging

logger = logging.getLogger(__name__)

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
                    and_(
                        # 빈 문자열이 아닌지 확인
                        MiddleIssueEntity.publish_year != '',
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
                    
                    if entity.publish_year is None:
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

    async def get_category_details(self, corporation_name: str, category_id: str, year: int) -> Optional[dict]:
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
                        # 문자열인 경우 쿼리에서 안전하게 처리
                except (ValueError, TypeError) as e:
                    logger.error(f"❌ 카테고리 ID 변환 실패: {category_id}, 오류: {e}")
                    # 변환 실패 시 원본 값 사용하되 로그 기록
                
                # 3. 안전한 publish_year 비교를 위한 조건 구성
                year_condition = None
                if year is not None:
                    # publish_year가 null이거나, 숫자로 변환 가능한 경우에만 비교
                    year_condition = or_(
                        MiddleIssueEntity.publish_year.is_(None),
                        and_(
                            # 빈 문자열이 아닌지 확인
                            MiddleIssueEntity.publish_year != '',
                            # 숫자로만 구성된 문자열인지 확인
                            MiddleIssueEntity.publish_year.op('~')(r'^\s*\d+\s*$'),
                            # 안전하게 trim 후 캐스팅하여 비교
                            cast(func.trim(MiddleIssueEntity.publish_year), Integer) == year
                        )
                    )
                    logger.info(f"🔍 연도 조건 구성: {year}년도 또는 NULL")
                else:
                    # year가 None이면 publish_year가 NULL인 것만 조회
                    year_condition = MiddleIssueEntity.publish_year.is_(None)
                    logger.info(f"🔍 연도 조건: NULL만 조회")
                
                # 4. 해당 카테고리의 이슈풀 정보 조회 (ESG 분류 포함)
                query = select(MiddleIssueEntity).where(
                    and_(
                        MiddleIssueEntity.corporation_id == corporation.id,
                        MiddleIssueEntity.category_id == normalized_category_id,
                        year_condition
                    )
                )
                
                logger.info(f"🔍 이슈풀 조회 쿼리: {query}")
                
                result = await db.execute(query)
                issue_entities = result.scalars().all()
                
                logger.info(f"🔍 이슈풀 조회 결과: {len(issue_entities)}개 엔티티")
                
                if not issue_entities:
                    logger.warning(f"⚠️ 카테고리 '{category_id}'에 해당하는 이슈풀을 찾을 수 없습니다.")
                    return None
                
                # 5. 첫 번째 엔티티에서 ESG 분류 정보 추출 (모든 엔티티가 동일한 ESG 분류를 가짐)
                first_entity = issue_entities[0]
                logger.info(f"🔍 첫 번째 엔티티 정보: {first_entity}")
                
                esg_classification_id = getattr(first_entity, 'esg_classification_id', None)
                esg_classification_name = getattr(first_entity, 'esg_classification_name', None)
                
                logger.info(f"🔍 ESG 분류 정보: ID={esg_classification_id}, 이름={esg_classification_name}")
                
                # 6. base_issuepool 목록 구성
                base_issuepools = []
                for i, entity in enumerate(issue_entities):
                    issue_data = {
                        "id": entity.id,
                        "base_issue_pool": entity.base_issue_pool,
                        "issue_pool": entity.issue_pool,
                        "ranking": getattr(entity, 'ranking', None),
                        "esg_classification_id": esg_classification_id,
                        "esg_classification_name": esg_classification_name
                    }
                    base_issuepools.append(issue_data)
                    logger.info(f"🔍 이슈풀 {i+1}: {issue_data}")
                
                # 7. 카테고리 상세 정보 반환
                category_details = {
                    "category_id": category_id,
                    "normalized_category_id": normalized_category_id,
                    "esg_classification_id": esg_classification_id,
                    "esg_classification_name": esg_classification_name,
                    "base_issuepools": base_issuepools,
                    "total_count": len(base_issuepools)
                }
                
                logger.info(f"✅ 리포지토리: 카테고리 '{category_id}' 상세 정보 조회 완료 - ESG: {esg_classification_name}, 이슈풀: {len(base_issuepools)}개")
                logger.info(f"✅ 반환할 데이터: {category_details}")
                return category_details
                
        except Exception as e:
            logger.error(f"❌ 리포지토리: 카테고리 상세 정보 조회 중 오류 - {str(e)}")
            logger.error(f"❌ 오류 상세: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")
            return None