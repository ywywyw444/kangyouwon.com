"""
Middleissue Repository - BaseModel을 받아서 데이터베이스 작업을 수행하는 계층
데이터베이스 연결을 담당하며, BaseModel과 Entity 간의 변환을 처리
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
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
                    CorporationEntity.companyname == corporation_name  # corporation_name에서 companyname으로 변경
                )
                corp_result = await db.execute(corp_query)
                corporation = corp_result.scalar_one_or_none()
                
                if not corporation:
                    logger.warning(f"⚠️ 기업 '{corporation_name}'을 찾을 수 없습니다.")
                    return CorporationIssueResponse(year_issues=[], common_issues=[])
                
                # 2. 해당 연도의 이슈와 공통 이슈(publish_year is null) 함께 조회
                query = select(MiddleIssueEntity).where(
                    and_(
                        MiddleIssueEntity.corporation_id == corporation.id,
                        or_(
                            MiddleIssueEntity.publish_year == target_year,
                            MiddleIssueEntity.publish_year.is_(None)
                        )
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