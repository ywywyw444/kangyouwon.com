"""
Issue Pool Repository - BaseModel을 받아서 데이터베이스 작업을 수행하는 계층
데이터베이스 연결을 담당하며, BaseModel과 Entity 간의 변환을 처리
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domain.issuepool.schema import IssuePoolResponse
from app.domain.issuepool.entity import IssuePoolEntity
from app.common.database.issuepool_db import get_db
import logging

logger = logging.getLogger(__name__)

class IssuePoolRepository:
    """이슈풀 리포지토리 - 이슈풀 관련 데이터베이스 작업"""
    
    def __init__(self):
        pass
    
    async def get_all_issuepools(self):
        """모든 이슈풀 조회 - BaseModel 리스트 반환"""
        try:
            logger.info("🔍 리포지토리: 모든 이슈풀 조회")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = select(IssuePoolEntity)
                result = await db.execute(query)
                issuepool_entities = result.scalars().all()
                
                logger.info(f"🔍 DB에서 가져온 Entity 데이터: {len(issuepool_entities)}개")
                
                # Entity들을 BaseModel로 변환하여 반환
                issuepool_models = []
                for i, issuepool_entity in enumerate(issuepool_entities):
                    issuepool_model = IssuePoolResponse(
                        id=issuepool_entity.id,
                        corporation_id=issuepool_entity.corporation_id,
                        publish_year=issuepool_entity.publish_year,
                        ranking=issuepool_entity.ranking,
                        base_issue_pool=issuepool_entity.base_issue_pool,
                        issue_pool=issuepool_entity.issue_pool,
                        category_id=issuepool_entity.category_id,
                        esg_classification_id=issuepool_entity.esg_classification_id
                    )
                    issuepool_models.append(issuepool_model)
                
                logger.info(f"✅ 리포지토리: 모든 이슈풀 조회 완료 - {len(issuepool_models)}개 이슈풀")
                return issuepool_models
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 이슈풀 조회 중 오류 - {str(e)}")
            raise
    
    async def get_issuepools_by_corporation(self, corporation_id: int, publish_year: int = None):
        """기업별 이슈풀 조회 - BaseModel 리스트 반환"""
        try:
            logger.info(f"🔍 리포지토리: 기업별 이슈풀 조회 - corporation_id: {corporation_id}, publish_year: {publish_year}")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = select(IssuePoolEntity).where(IssuePoolEntity.corporation_id == corporation_id)
                if publish_year:
                    query = query.where(IssuePoolEntity.publish_year == publish_year)
                
                result = await db.execute(query)
                issuepool_entities = result.scalars().all()
                
                logger.info(f"🔍 DB에서 가져온 Entity 데이터: {len(issuepool_entities)}개")
                
                # Entity들을 BaseModel로 변환하여 반환
                issuepool_models = []
                for issuepool_entity in issuepool_entities:
                    issuepool_model = IssuePoolResponse(
                        id=issuepool_entity.id,
                        corporation_id=issuepool_entity.corporation_id,
                        publish_year=issuepool_entity.publish_year,
                        ranking=issuepool_entity.ranking,
                        base_issue_pool=issuepool_entity.base_issue_pool,
                        issue_pool=issuepool_entity.issue_pool,
                        category_id=issuepool_entity.category_id,
                        esg_classification_id=issuepool_entity.esg_classification_id
                    )
                    issuepool_models.append(issuepool_model)
                
                logger.info(f"✅ 리포지토리: 기업별 이슈풀 조회 완료 - {len(issuepool_models)}개 이슈풀")
                return issuepool_models
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 기업별 이슈풀 조회 중 오류 - {str(e)}")
            raise
    
    async def get_issuepools_by_year(self, publish_year: int):
        """연도별 이슈풀 조회 - BaseModel 리스트 반환"""
        try:
            logger.info(f"🔍 리포지토리: 연도별 이슈풀 조회 - publish_year: {publish_year}")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = select(IssuePoolEntity).where(IssuePoolEntity.publish_year == publish_year)
                result = await db.execute(query)
                issuepool_entities = result.scalars().all()
                
                logger.info(f"🔍 DB에서 가져온 Entity 데이터: {len(issuepool_entities)}개")
                
                # Entity들을 BaseModel로 변환하여 반환
                issuepool_models = []
                for issuepool_entity in issuepool_entities:
                    issuepool_model = IssuePoolResponse(
                        id=issuepool_entity.id,
                        corporation_id=issuepool_entity.corporation_id,
                        publish_year=issuepool_entity.publish_year,
                        ranking=issuepool_entity.ranking,
                        base_issue_pool=issuepool_entity.base_issue_pool,
                        issue_pool=issuepool_entity.issue_pool,
                        category_id=issuepool_entity.category_id,
                        esg_classification_id=issuepool_entity.esg_classification_id
                    )
                    issuepool_models.append(issuepool_model)
                
                logger.info(f"✅ 리포지토리: 연도별 이슈풀 조회 완료 - {len(issuepool_models)}개 이슈풀")
                return issuepool_models
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 연도별 이슈풀 조회 중 오류 - {str(e)}")
            raise
    
    async def find_issuepool_by_id(self, issuepool_id: int):
        """ID로 이슈풀 조회 - BaseModel 반환"""
        try:
            logger.info(f"🔍 리포지토리: ID로 이슈풀 조회 - issuepool_id: {issuepool_id}")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = select(IssuePoolEntity).where(IssuePoolEntity.id == issuepool_id)
                result = await db.execute(query)
                issuepool_entity = result.scalar_one_or_none()
                
                if issuepool_entity:
                    # Entity를 BaseModel로 변환하여 반환
                    issuepool_model = IssuePoolResponse(
                        id=issuepool_entity.id,
                        corporation_id=issuepool_entity.corporation_id,
                        publish_year=issuepool_entity.publish_year,
                        ranking=issuepool_entity.ranking,
                        base_issue_pool=issuepool_entity.base_issue_pool,
                        issue_pool=issuepool_entity.issue_pool,
                        category_id=issuepool_entity.category_id,
                        esg_classification_id=issuepool_entity.esg_classification_id
                    )
                    logger.info(f"✅ 리포지토리: 이슈풀 조회 성공 - ID: {issuepool_id}")
                    return issuepool_model
                else:
                    logger.info(f"❌ 리포지토리: 이슈풀 없음 - ID: {issuepool_id}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: ID 조회 중 오류 - {str(e)}")
            raise
