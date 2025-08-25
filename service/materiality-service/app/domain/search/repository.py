"""
Search Repository - BaseModel을 받아서 데이터베이스 작업을 수행하는 계층
데이터베이스 연결을 담당하며, BaseModel과 Entity 간의 변환을 처리
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domain.search.schema import CompanySearchRequest
from app.domain.search.entity import CorporationEntity
from app.common.database.corporation_db import get_db
import logging

logger = logging.getLogger(__name__)

class SearchRepository:
    """검색 리포지토리 - 기업명으로만 검색"""
    
    def __init__(self):
        pass
    
    async def get_all_corporations(self):
        """모든 기업 정보 조회 - BaseModel 리스트 반환"""
        try:
            logger.info("🔍 리포지토리: 모든 기업 정보 조회")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = select(CorporationEntity)
                result = await db.execute(query)
                corp_entities = result.scalars().all()
                
                # Entity들을 BaseModel로 변환하여 반환
                corp_models = []
                for corp_entity in corp_entities:
                    corp_model = CompanySearchRequest(
                        companyname=corp_entity.companyname
                    )
                    corp_models.append(corp_model)
                
                logger.info(f"✅ 리포지토리: 모든 기업 정보 조회 완료 - {len(corp_models)}개 기업")
                return corp_models
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 모든 기업 정보 조회 중 오류 - {str(e)}")
            raise
    
    async def find_corporation_by_name(self, companyname: str):
        """기업명으로 기업 정보 조회 - BaseModel 반환"""
        try:
            logger.info(f"🔍 리포지토리: 기업명으로 기업 정보 조회 - {companyname}")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = select(CorporationEntity).where(CorporationEntity.companyname == companyname)
                result = await db.execute(query)
                corp_entity = result.scalar_one_or_none()
                
                if corp_entity:
                    # Entity를 BaseModel로 변환하여 반환
                    corp_model = CompanySearchRequest(
                        companyname=corp_entity.companyname
                    )
                    logger.info(f"✅ 리포지토리: 기업 정보 조회 성공 - {companyname}")
                    return corp_model
                else:
                    logger.info(f"❌ 리포지토리: 기업 정보 없음 - {companyname}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 기업명 조회 중 오류 - {str(e)}")
            raise
