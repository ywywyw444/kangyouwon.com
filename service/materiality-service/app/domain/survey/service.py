import logging
import json
import anyio
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
        self.repository = SurveyRepository()
    
    def _prepare_response_data(self, data: Any) -> Any:
        """응답 데이터를 Frontend에 전달하기 위해 준비"""
        if isinstance(data, str):
            # JSON 문자열인 경우 파싱
            try:
                return json.loads(data)
            except (json.JSONDecodeError, TypeError):
                return data
        elif data is None:
            return None
        else:
            # 이미 파이썬 객체인 경우 그대로 반환
            return data
    
    async def create_survey(self, request: SurveyCreateRequest) -> SurveyDataResponse:
        """설문 생성"""
        try:
            logger.info(f"설문 생성 시작: 회사 ID {request.corporation_id}")
            
            # repository를 통해 설문 생성 (동기 호출을 별도 스레드로 실행)
            survey_entity = await anyio.to_thread.run_sync(self.repository.create_survey, request)
            
            # 응답 스키마로 변환 (Repository에서 이미 필요한 속성들을 미리 로드함)
            return SurveyDataResponse(
                survey_id=survey_entity.survey_id,
                corporation_id=survey_entity.corporation_id,
                timestamp=survey_entity.timestamp,
                total_categories=survey_entity.total_categories,
                categories=survey_entity.categories,  # 이미 로드된 속성 직접 사용
                excel_data=survey_entity.excel_data   # 이미 로드된 속성 직접 사용
            )
                
        except Exception as e:
            logger.error(f"설문 생성 실패: {e}")
            raise
    
    async def get_survey(self, survey_id: str) -> Optional[SurveyDataResponse]:
        """설문 조회"""
        try:
            logger.info(f"설문 조회 시작: {survey_id}")
            
            # repository를 통해 설문 조회 (동기 호출을 별도 스레드로 실행)
            survey_entity = await anyio.to_thread.run_sync(self.repository.get_survey, survey_id)
            
            if not survey_entity:
                return None
            
            # 응답 데이터를 Frontend에 전달하기 위해 준비
            categories_data = self._prepare_response_data(survey_entity.categories)
            excel_data_data = self._prepare_response_data(survey_entity.excel_data)
            
            # 응답 스키마로 변환
            return SurveyDataResponse(
                survey_id=survey_entity.survey_id,
                corporation_id=survey_entity.corporation_id,
                timestamp=survey_entity.timestamp,
                total_categories=survey_entity.total_categories,
                categories=categories_data,  # 파이썬 객체로 변환
                excel_data=excel_data_data   # 파이썬 객체로 변환
            )
                
        except Exception as e:
            logger.error(f"설문 조회 실패: {e}")
            raise
    
    async def get_surveys_by_corporation(self, corporation_id: str) -> List[SurveyDataResponse]:
        """회사별 설문 목록 조회"""
        try:
            logger.info(f"회사별 설문 조회 시작: {corporation_id}")
            
            # repository를 통해 설문 목록 조회 (동기 호출을 별도 스레드로 실행)
            survey_entities = await anyio.to_thread.run_sync(self.repository.get_surveys_by_corporation, corporation_id)
            
            # 응답 스키마로 변환
            return [
                SurveyDataResponse(
                    survey_id=entity.survey_id,
                    corporation_id=entity.corporation_id,
                    content_hash=entity.content_hash,
                    timestamp=entity.timestamp,
                    total_categories=entity.total_categories,
                    categories=self._prepare_response_data(entity.categories),  # 파이썬 객체로 변환
                    excel_data=self._prepare_response_data(entity.excel_data)   # 파이썬 객체로 변환
                )
                for entity in survey_entities
            ]
                
        except Exception as e:
            logger.error(f"회사별 설문 조회 실패: {e}")
            raise
    
    async def submit_survey_response(self, request: SurveyResponseRequest) -> Dict[str, Any]:
        """설문 응답 제출"""
        try:
            logger.info(f"설문 응답 제출 시작: {request.survey_id}")
            
            # repository를 통해 응답 제출 (동기 호출을 별도 스레드로 실행)
            response_entity = await anyio.to_thread.run_sync(self.repository.submit_survey_response, request)
            
            # 응답 수 조회 (동기 호출을 별도 스레드로 실행)
            total_responses = await anyio.to_thread.run_sync(self.repository.get_response_count, request.survey_id)
            
            return {
                "message": "설문 응답이 성공적으로 제출되었습니다.",
                "participant_id": response_entity.participant_id,
                "total_responses": total_responses
            }
                
        except Exception as e:
            logger.error(f"설문 응답 제출 실패: {e}")
            raise
    
    async def get_survey_responses(self, survey_id: str) -> SurveyResponsesResponse:
        """설문 응답 목록 조회"""
        try:
            logger.info(f"설문 응답 목록 조회 시작: {survey_id}")
            
            # repository를 통해 응답 목록 조회 (동기 호출을 별도 스레드로 실행)
            response_entities = await anyio.to_thread.run_sync(self.repository.get_survey_responses, survey_id)
            
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
                    "responses": self._prepare_response_data(entity.responses),  # 파이썬 객체로 변환
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
    
    async def get_survey_responses_by_content_hash(self, content_hash: str) -> SurveyResponsesResponse:
        """동일한 내용 해시를 가진 설문들의 모든 응답 조회"""
        try:
            logger.info(f"내용 해시별 설문 응답 목록 조회 시작: {content_hash}")
            
            # repository를 통해 동일한 내용 해시를 가진 설문들의 모든 응답 조회
            response_entities = await anyio.to_thread.run_sync(self.repository.get_responses_by_content_hash, content_hash)
            
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
                    "responses": self._prepare_response_data(entity.responses),  # 파이썬 객체로 변환
                    "timestamp": entity.timestamp.isoformat(),
                    "survey_id": entity.survey_id,
                    "corporation_id": entity.corporation_id
                }
                responses.append(response_data)
            
            logger.info(f"동일한 내용의 설문들에서 총 {len(responses)}개 응답을 찾았습니다.")
            
            return SurveyResponsesResponse(
                survey_id="",  # 여러 설문의 응답이므로 빈 문자열
                corporation_id=responses[0]["corporation_id"] if responses else "",
                total_responses=len(responses),
                responses=responses
            )
                
        except Exception as e:
            logger.error(f"내용 해시별 설문 응답 목록 조회 실패: {e}")
            raise
    
    async def get_all_surveys(self) -> SurveyListResponse:
        """모든 설문 목록 조회"""
        try:
            logger.info("모든 설문 목록 조회 시작")
            
            # repository를 통해 모든 설문 조회 (동기 호출을 별도 스레드로 실행)
            survey_entities = await anyio.to_thread.run_sync(self.repository.get_all_surveys)
            
            # 응답 스키마로 변환
            surveys = [
                SurveyDataResponse(
                    survey_id=entity.survey_id,
                    corporation_id=entity.corporation_id,
                    content_hash=entity.content_hash,
                    timestamp=entity.timestamp,
                    total_categories=entity.total_categories,
                    categories=self._prepare_response_data(entity.categories),  # 파이썬 객체로 변환
                    excel_data=self._prepare_response_data(entity.excel_data)   # 파이썬 객체로 변환
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
    
    async def delete_survey(self, survey_id: str) -> bool:
        """설문 삭제"""
        try:
            logger.info(f"설문 삭제 시작: {survey_id}")
            
            # repository를 통해 설문 삭제 (동기 호출을 별도 스레드로 실행)
            return await anyio.to_thread.run_sync(self.repository.delete_survey, survey_id)
                
        except Exception as e:
            logger.error(f"설문 삭제 실패: {e}")
            raise
