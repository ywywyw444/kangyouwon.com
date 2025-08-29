"""
중대성 평가 중간 이슈 관련 라우터
"""
from fastapi import APIRouter, HTTPException
from typing import List
from app.domain.middleissue.schema import (
    MiddleIssueRequest,
    MiddleIssueResponse,
    MiddleIssueAssessmentResponse
)
from app.domain.middleissue.controller import middleissue_controller
import logging

# 로거 설정
logger = logging.getLogger(__name__)

# 라우터 생성
middleissue_router = APIRouter()

# 엔드포인트
@middleissue_router.post("/middleissue/assessment", response_model=MiddleIssueResponse)
async def start_middleissue_assessment(request: MiddleIssueRequest):
    """새로운 중대성 평가 시작"""
    try:
        logger.info(f"📊 중대성 평가 시작 요청 받음 - 기업: {request.company_id}")
        
        # 컨트롤러로 요청 전달
        result = await middleissue_controller.start_assessment(request)
        
        logger.info(f"✅ 중대성 평가 시작 응답 전송 - {result.get('success', False)}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ 중대성 평가 시작 처리 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@middleissue_router.get("/middleissue/list", response_model=List[dict])
async def list_middle_issues():
    """중간 이슈 목록 조회"""
    try:
        # TODO: 실제 데이터베이스 연동 로직 구현
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))