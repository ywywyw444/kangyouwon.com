import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.domain.survey.schema import (
    SurveyCreateRequest, 
    SurveyResponseRequest, 
    SurveyDataResponse,
    SurveyResponsesResponse,
    SurveyListResponse
)
from app.domain.survey.repository import SurveyRepository

logger = logging.getLogger(__name__)

class SurveyService:
    """설문 서비스 (비즈니스 로직 처리)"""
    
    def __init__(self):
        """서비스 초기화"""
        pass
    
    async def create_survey(self, request: SurveyCreateRequest, repository: SurveyRepository) -> SurveyDataResponse:
        """설문 생성"""
        try:
            logger.info(f"설문 생성 시작: 회사 ID {request.corporation_id}")
            
            # repository를 통해 설문 생성
            survey_entity = repository.create_survey(request)
            
            # 응답 스키마로 변환
            return SurveyDataResponse(
                survey_id=survey_entity.survey_id,
                corporation_id=survey_entity.corporation_id,
                timestamp=survey_entity.timestamp,
                total_categories=survey_entity.total_categories,
                categories=survey_entity.categories,
                excel_data=survey_entity.excel_data
            )
                
        except Exception as e:
            logger.error(f"설문 생성 실패: {e}")
            raise
    
    async def get_survey(self, survey_id: str, repository: SurveyRepository) -> Optional[SurveyDataResponse]:
        """설문 조회"""
        try:
            logger.info(f"설문 조회 시작: {survey_id}")
            
            # repository를 통해 설문 조회
            survey_entity = repository.get_survey(survey_id)
            
            if not survey_entity:
                return None
            
            # 응답 스키마로 변환
            return SurveyDataResponse(
                survey_id=survey_entity.survey_id,
                corporation_id=survey_entity.corporation_id,
                timestamp=survey_entity.timestamp,
                total_categories=survey_entity.total_categories,
                categories=survey_entity.categories,
                excel_data=survey_entity.excel_data
            )
                
        except Exception as e:
            logger.error(f"설문 조회 실패: {e}")
            raise
    
    async def get_surveys_by_corporation(self, corporation_id: str, repository: SurveyRepository) -> List[SurveyDataResponse]:
        """회사별 설문 목록 조회"""
        try:
            logger.info(f"회사별 설문 조회 시작: {corporation_id}")
            
            # repository를 통해 설문 목록 조회
            survey_entities = repository.get_surveys_by_corporation(corporation_id)
            
            # 응답 스키마로 변환
            return [
                SurveyDataResponse(
                    survey_id=entity.survey_id,
                    corporation_id=entity.corporation_id,
                    timestamp=entity.timestamp,
                    total_categories=entity.total_categories,
                    categories=entity.categories,
                    excel_data=entity.excel_data
                )
                for entity in survey_entities
            ]
                
        except Exception as e:
            logger.error(f"회사별 설문 조회 실패: {e}")
            raise
    
    async def submit_survey_response(self, request: SurveyResponseRequest, repository: SurveyRepository) -> Dict[str, Any]:
        """설문 응답 제출"""
        try:
            logger.info(f"설문 응답 제출 시작: {request.survey_id}")
            
            # repository를 통해 응답 제출
            response_entity = repository.submit_survey_response(request)
            
            # 응답 수 조회
            total_responses = repository.get_response_count(request.survey_id)
            
            return {
                "message": "설문 응답이 성공적으로 제출되었습니다.",
                "participant_id": response_entity.participant_id,
                "total_responses": total_responses
            }
                
        except Exception as e:
            logger.error(f"설문 응답 제출 실패: {e}")
            raise
    
    async def get_survey_responses(self, survey_id: str, repository: SurveyRepository) -> SurveyResponsesResponse:
        """설문 응답 목록 조회"""
        try:
            logger.info(f"설문 응답 목록 조회 시작: {survey_id}")
            
            # repository를 통해 응답 목록 조회
            response_entities = repository.get_survey_responses(survey_id)
            
            # 응답 데이터 변환
            responses = []
            for entity in response_entities:
                response_data = {
                    "participant_id": entity.participant_id,
                    "participant": {
                        "name": entity.participant_name,
                        "company": entity.participant_company,
                        "position": entity.participant_position,
                        "email": entity.participant_email
                    },
                    "responses": entity.responses,
                    "timestamp": entity.timestamp.isoformat(),
                    "survey_id": entity.survey_id,
                    "corporation_id": entity.corporation_id
                }
                responses.append(response_data)
            
            return SurveyResponsesResponse(
                survey_id=survey_id,
                corporation_id=responses[0]["corporation_id"] if responses else "",
                total_responses=len(responses),
                responses=responses
            )
                
        except Exception as e:
            logger.error(f"설문 응답 목록 조회 실패: {e}")
            raise
    
    async def get_all_surveys(self, repository: SurveyRepository) -> SurveyListResponse:
        """모든 설문 목록 조회"""
        try:
            logger.info("모든 설문 목록 조회 시작")
            
            # repository를 통해 모든 설문 조회
            survey_entities = repository.get_all_surveys()
            
            # 응답 스키마로 변환
            surveys = [
                SurveyDataResponse(
                    survey_id=entity.survey_id,
                    corporation_id=entity.corporation_id,
                    timestamp=entity.timestamp,
                    total_categories=entity.total_categories,
                    categories=entity.categories,
                    excel_data=entity.excel_data
                )
                for entity in survey_entities
            ]
            
            return SurveyListResponse(
                surveys=surveys,
                total_count=len(surveys)
            )
                
        except Exception as e:
            logger.error(f"모든 설문 목록 조회 실패: {e}")
            raise
    
    async def delete_survey(self, survey_id: str, repository: SurveyRepository) -> bool:
        """설문 삭제"""
        try:
            logger.info(f"설문 삭제 시작: {survey_id}")
            
            # repository를 통해 설문 삭제
            return repository.delete_survey(survey_id)
                
        except Exception as e:
            logger.error(f"설문 삭제 실패: {e}")
            raise
