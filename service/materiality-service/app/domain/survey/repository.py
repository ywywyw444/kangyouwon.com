import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, text

from app.domain.survey.entity import SurveyEntity, SurveyResponseEntity
from app.domain.survey.schema import (
    SurveyCreateRequest,
    SurveyResponseRequest,
    SurveyDataResponse,
    SurveyResponsesResponse,
    SurveyListResponse
)

logger = logging.getLogger(__name__)

class SurveyRepository:
    """설문 데이터 리포지토리"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def _check_corporation_exists(self, corporation_id: str) -> bool:
        """기업 ID가 존재하는지 확인"""
        try:
            result = self.session.execute(
                text("SELECT COUNT(*) FROM corporation WHERE id = :corporation_id"),
                {"corporation_id": corporation_id}
            )
            count = result.scalar()
            exists = count > 0
            
            if not exists:
                logger.warning(f"기업 ID가 존재하지 않습니다: {corporation_id}")
            
            return exists
            
        except Exception as e:
            logger.error(f"기업 존재 여부 확인 중 오류: {e}")
            return False
    
    def _check_survey_exists(self, survey_id: str) -> bool:
        """설문 ID가 존재하는지 확인"""
        try:
            result = self.session.execute(
                text("SELECT COUNT(*) FROM surveys WHERE survey_id = :survey_id"),
                {"survey_id": survey_id}
            )
            count = result.scalar()
            exists = count > 0
            
            if not exists:
                logger.warning(f"설문 ID가 존재하지 않습니다: {survey_id}")
            
            return exists
            
        except Exception as e:
            logger.error(f"설문 존재 여부 확인 중 오류: {e}")
            return False
    
    def create_survey(self, request: SurveyCreateRequest) -> SurveyEntity:
        """설문 생성"""
        try:
            # Frontend에서 보내는 company_id를 corporation_id로 사용
            corporation_id = request.company_id
            
            # 기업 존재 여부 먼저 확인
            if not self._check_corporation_exists(corporation_id):
                raise ValueError(f"기업 ID {corporation_id}가 존재하지 않습니다.")
            
            # 고유한 설문 ID 생성
            survey_id = f"{corporation_id}_{int(datetime.now().timestamp())}"
            
            # 설문 엔티티 생성
            survey_entity = SurveyEntity(
                survey_id=survey_id,
                corporation_id=corporation_id,
                timestamp=datetime.now(),
                total_categories=len(request.categories),
                categories=request.categories,  # 이미 Dict 형태로 전달됨
                excel_data=request.excel_data
            )
            
            # 데이터베이스에 저장
            self.session.add(survey_entity)
            self.session.flush()  # ID 생성을 위한 flush
            
            logger.info(f"설문 생성 완료: {survey_id}, 회사: {request.corporation_id}")
            return survey_entity
            
        except Exception as e:
            logger.error(f"설문 생성 실패: {e}")
            raise
    
    def get_survey(self, survey_id: str) -> Optional[SurveyEntity]:
        """설문 조회"""
        try:
            survey = self.session.query(SurveyEntity).filter(
                SurveyEntity.survey_id == survey_id
            ).first()
            return survey
            
        except Exception as e:
            logger.error(f"설문 조회 실패: {e}")
            raise
    
    def get_surveys_by_corporation(self, corporation_id: str) -> List[SurveyEntity]:
        """회사별 설문 목록 조회"""
        try:
            # 기업 존재 여부 먼저 확인
            if not self._check_corporation_exists(corporation_id):
                logger.warning(f"기업 ID가 존재하지 않습니다: {corporation_id}")
                return []
            
            surveys = self.session.query(SurveyEntity).filter(
                SurveyEntity.corporation_id == corporation_id
            ).order_by(desc(SurveyEntity.created_at)).all()
            return surveys
            
        except Exception as e:
            logger.error(f"회사별 설문 조회 실패: {e}")
            raise
    
    def get_all_surveys(self) -> List[SurveyEntity]:
        """모든 설문 목록 조회"""
        try:
            surveys = self.session.query(SurveyEntity).order_by(
                desc(SurveyEntity.created_at)
            ).all()
            return surveys
            
        except Exception as e:
            logger.error(f"모든 설문 목록 조회 실패: {e}")
            raise
    
    def delete_survey(self, survey_id: str) -> bool:
        """설문 삭제"""
        try:
            # 설문 조회
            survey = self.get_survey(survey_id)
            if not survey:
                return False
            
            # 관련 응답도 삭제
            self.session.query(SurveyResponseEntity).filter(
                SurveyResponseEntity.survey_id == survey_id
            ).delete()
            
            # 설문 삭제
            self.session.delete(survey)
            
            logger.info(f"설문 삭제 완료: {survey_id}")
            return True
            
        except Exception as e:
            logger.error(f"설문 삭제 실패: {e}")
            raise
    
    def submit_survey_response(self, request: SurveyResponseRequest) -> SurveyResponseEntity:
        """설문 응답 제출"""
        try:
            # Frontend에서 보내는 company_id를 corporation_id로 사용
            corporation_id = request.company_id
            
            # 기업 존재 여부 먼저 확인
            if not self._check_corporation_exists(corporation_id):
                raise ValueError(f"기업 ID {corporation_id}가 존재하지 않습니다.")
            
            # 설문 존재 여부 먼저 확인
            if not self._check_survey_exists(request.survey_id):
                raise ValueError(f"설문 ID {request.survey_id}가 존재하지 않습니다.")
            
            # 중복 응답 확인
            existing_response = self.session.query(SurveyResponseEntity).filter(
                and_(
                    SurveyResponseEntity.participant_email == request.participant.email,
                    SurveyResponseEntity.survey_id == request.survey_id
                )
            ).first()
            
            if existing_response:
                raise ValueError("이미 이 설문에 응답하셨습니다.")
            
            # 응답 엔티티 생성
            response_entity = SurveyResponseEntity(
                participant_id=f"{request.participant.email}_{int(datetime.now().timestamp())}",
                survey_id=request.survey_id,
                corporation_id=corporation_id,
                participant_name=request.participant.name,
                participant_company=request.participant.company,
                participant_position=request.participant.position,
                participant_email=request.participant.email,
                responses=request.responses,  # 이미 Dict 형태로 전달됨
                timestamp=datetime.now()
            )
            
            # 데이터베이스에 저장
            self.session.add(response_entity)
            self.session.flush()
            
            logger.info(f"설문 응답 제출 완료: {request.survey_id}, 참여자: {request.participant.name}")
            return response_entity
            
        except Exception as e:
            logger.error(f"설문 응답 제출 실패: {e}")
            raise
    
    def get_survey_responses(self, survey_id: str) -> List[SurveyResponseEntity]:
        """설문 응답 목록 조회"""
        try:
            # 설문 존재 여부 먼저 확인
            if not self._check_survey_exists(survey_id):
                logger.warning(f"설문 ID가 존재하지 않습니다: {survey_id}")
                return []
            
            responses = self.session.query(SurveyResponseEntity).filter(
                SurveyResponseEntity.survey_id == survey_id
            ).order_by(SurveyResponseEntity.created_at).all()
            return responses
            
        except Exception as e:
            logger.error(f"설문 응답 목록 조회 실패: {e}")
            raise
    
    def get_response_count(self, survey_id: str) -> int:
        """설문 응답 수 조회"""
        try:
            count = self.session.query(SurveyResponseEntity).filter(
                SurveyResponseEntity.survey_id == survey_id
            ).count()
            return count
            
        except Exception as e:
            logger.error(f"응답 수 조회 실패: {e}")
            raise
