"""
설문 관련 라우터
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from app.domain.survey.schema import (
    SurveyCreateRequest,
    SurveyResponseRequest,
    SurveyDataResponse,
    SurveyResponsesResponse,
    SurveyListResponse
)
from app.domain.survey.service import SurveyService
from app.domain.survey.repository import SurveyRepository
from app.common.database.survey_db import get_sync_session

logger = logging.getLogger(__name__)

# 설문 서비스 인스턴스 생성
survey_service = SurveyService()

# 설문 라우터 생성
survey_router = APIRouter()

@survey_router.post("/surveys", response_model=SurveyDataResponse)
async def create_survey(request: SurveyCreateRequest):
    """설문 생성"""
    try:
        logger.info(f"설문 생성 요청 시작: 회사 ID {request.company_id}")
        logger.info(f"요청 데이터: {request.dict()}")
        
        # 데이터베이스 세션 생성 및 repository 초기화
        with get_sync_session() as session:
            logger.info("데이터베이스 세션 생성 완료")
            repository = SurveyRepository(session)
            logger.info("Repository 초기화 완료")
            
            result = await survey_service.create_survey(request, repository)
            logger.info(f"설문 생성 성공: {result.survey_id}")
            return result
            
    except ValueError as e:
        logger.error(f"설문 생성 실패 (ValueError): {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"설문 생성 실패 (Exception): {e}")
        logger.error(f"에러 타입: {type(e)}")
        import traceback
        logger.error(f"스택 트레이스: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"설문 생성 실패: {str(e)}")

@survey_router.get("/surveys/{survey_id}", response_model=SurveyDataResponse)
async def get_survey(survey_id: str):
    """설문 조회"""
    try:
        logger.info(f"설문 조회 요청: {survey_id}")
        
        # 데이터베이스 세션 생성 및 repository 초기화
        with get_sync_session() as session:
            repository = SurveyRepository(session)
            result = await survey_service.get_survey(survey_id, repository)
            if not result:
                raise HTTPException(status_code=404, detail="설문을 찾을 수 없습니다.")
            return result
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"설문 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.get("/surveys/corporation/{corporation_id}", response_model=List[SurveyDataResponse])
async def get_surveys_by_corporation(corporation_id: str):
    """회사별 설문 목록 조회"""
    try:
        logger.info(f"회사별 설문 조회 요청: {corporation_id}")
        
        # 데이터베이스 세션 생성 및 repository 초기화
        with get_sync_session() as session:
            repository = SurveyRepository(session)
            result = await survey_service.get_surveys_by_corporation(corporation_id, repository)
            return result
            
    except Exception as e:
        logger.error(f"회사별 설문 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.post("/surveys/{survey_id}/responses")
async def submit_survey_response(survey_id: str, request: SurveyResponseRequest):
    """설문 응답 제출"""
    try:
        logger.info(f"설문 응답 제출 요청: {survey_id}, 참여자: {request.participant.name}")
        
        # survey_id 일치 확인
        if request.survey_id != survey_id:
            raise HTTPException(status_code=400, detail="설문 ID가 일치하지 않습니다.")
        
        # 데이터베이스 세션 생성 및 repository 초기화
        with get_sync_session() as session:
            repository = SurveyRepository(session)
            result = await survey_service.submit_survey_response(request, repository)
            return result
            
    except ValueError as e:
        logger.warning(f"중복 응답 시도: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"설문 응답 제출 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.get("/surveys/{survey_id}/responses", response_model=SurveyResponsesResponse)
async def get_survey_responses(survey_id: str):
    """설문 응답 목록 조회"""
    try:
        logger.info(f"설문 응답 목록 조회 요청: {survey_id}")
        
        # 데이터베이스 세션 생성 및 repository 초기화
        with get_sync_session() as session:
            repository = SurveyRepository(session)
            result = await survey_service.get_survey_responses(survey_id, repository)
            return result
            
    except Exception as e:
        logger.error(f"설문 응답 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.get("/surveys", response_model=SurveyListResponse)
async def get_all_surveys():
    """모든 설문 목록 조회"""
    try:
        logger.info("모든 설문 목록 조회 요청")
        
        # 데이터베이스 세션 생성 및 repository 초기화
        with get_sync_session() as session:
            repository = SurveyRepository(session)
            result = await survey_service.get_all_surveys(repository)
            return result
            
    except Exception as e:
        logger.error(f"모든 설문 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.delete("/surveys/{survey_id}")
async def delete_survey(survey_id: str):
    """설문 삭제"""
    try:
        logger.info(f"설문 삭제 요청: {survey_id}")
        
        # 데이터베이스 세션 생성 및 repository 초기화
        with get_sync_session() as session:
            repository = SurveyRepository(session)
            result = await survey_service.delete_survey(survey_id, repository)
            if not result:
                raise HTTPException(status_code=404, detail="설문을 찾을 수 없습니다.")
            return {"message": "설문이 성공적으로 삭제되었습니다."}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"설문 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.get("/health")
async def health_check():
    """설문 서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "survey-service",
        "message": "설문 서비스가 정상적으로 작동 중입니다."
    }
