"""
설문 컨트롤러 (서비스 호출 역할)
"""
import logging
from typing import List, Optional, Dict, Any

from app.domain.survey.schema import (
    SurveyCreateRequest, 
    SurveyResponseRequest, 
    SurveyDataResponse,
    SurveyResponsesResponse,
    SurveyListResponse
)
from app.domain.survey.service import SurveyService
from app.domain.survey.repository import SurveyRepository

logger = logging.getLogger(__name__)

class SurveyController:
    """설문 컨트롤러 - 서비스 호출 및 데이터 변환 담당"""
    
    def __init__(self):
        """컨트롤러 초기화"""
        self.service = SurveyService()
    
    async def create_survey(self, request: SurveyCreateRequest, repository: SurveyRepository) -> SurveyDataResponse:
        """설문 생성 - 서비스 호출"""
        logger.info(f"컨트롤러: 설문 생성 요청 처리 시작")
        return await self.service.create_survey(request, repository)
    
    async def get_survey(self, survey_id: str, repository: SurveyRepository) -> Optional[SurveyDataResponse]:
        """설문 조회 - 서비스 호출"""
        logger.info(f"컨트롤러: 설문 조회 요청 처리 시작")
        return await self.service.get_survey(survey_id, repository)
    
    async def get_surveys_by_corporation(self, corporation_id: str, repository: SurveyRepository) -> List[SurveyDataResponse]:
        """회사별 설문 목록 조회 - 서비스 호출"""
        logger.info(f"컨트롤러: 회사별 설문 조회 요청 처리 시작")
        return await self.service.get_surveys_by_corporation(corporation_id, repository)
    
    async def submit_survey_response(self, request: SurveyResponseRequest, repository: SurveyRepository) -> Dict[str, Any]:
        """설문 응답 제출 - 서비스 호출"""
        logger.info(f"컨트롤러: 설문 응답 제출 요청 처리 시작")
        return await self.service.submit_survey_response(request, repository)
    
    async def get_survey_responses(self, survey_id: str, repository: SurveyRepository) -> SurveyResponsesResponse:
        """설문 응답 목록 조회 - 서비스 호출"""
        logger.info(f"컨트롤러: 설문 응답 목록 조회 요청 처리 시작")
        return await self.service.get_survey_responses(survey_id, repository)
    
    async def get_all_surveys(self, repository: SurveyRepository) -> SurveyListResponse:
        """모든 설문 목록 조회 - 서비스 호출"""
        logger.info(f"컨트롤러: 모든 설문 목록 조회 요청 처리 시작")
        return await self.service.get_all_surveys(repository)
    
    async def delete_survey(self, survey_id: str, repository: SurveyRepository) -> bool:
        """설문 삭제 - 서비스 호출"""
        logger.info(f"컨트롤러: 설문 삭제 요청 처리 시작")
        return await self.service.delete_survey(survey_id, repository)
