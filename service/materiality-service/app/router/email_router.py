"""
Email Router - Gmail API를 사용한 이메일 발송
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from app.common.email.gmail_service import gmail_service

logger = logging.getLogger(__name__)

email_router = APIRouter(prefix="/email", tags=["email"])

class EmailRequest(BaseModel):
    """이메일 발송 요청 모델"""
    to_emails: List[EmailStr]
    subject: str
    body: str
    html_body: Optional[str] = None

class SurveyEmailRequest(BaseModel):
    """설문 이메일 발송 요청 모델"""
    to_emails: List[EmailStr]
    survey_url: str
    company_name: str
    survey_title: Optional[str] = "중대성 평가 설문"

class EmailResponse(BaseModel):
    """이메일 발송 응답 모델"""
    success: bool
    message: str
    sent_count: Optional[int] = None

@email_router.post("/send", response_model=EmailResponse)
async def send_email(request: EmailRequest):
    """일반 이메일 발송"""
    try:
        logger.info(f"📧 이메일 발송 요청: {len(request.to_emails)}명")
        
        if not gmail_service.user_email:
            raise HTTPException(
                status_code=503, 
                detail="Gmail API 서비스가 사용 불가능합니다. 설정을 확인해주세요."
            )
        
        success = gmail_service.send_email(
            to_emails=request.to_emails,
            subject=request.subject,
            body=request.body,
            is_html=bool(request.html_body)
        )
        
        if success:
            return EmailResponse(
                success=True,
                message="이메일이 성공적으로 발송되었습니다.",
                sent_count=len(request.to_emails)
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="이메일 발송에 실패했습니다."
            )
            
    except Exception as e:
        logger.error(f"❌ 이메일 발송 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"이메일 발송 중 오류가 발생했습니다: {str(e)}"
        )

@email_router.post("/send-survey", response_model=EmailResponse)
async def send_survey_email(request: SurveyEmailRequest):
    """설문 이메일 발송"""
    try:
        logger.info(f"📊 설문 이메일 발송 요청: {len(request.to_emails)}명, 회사: {request.company_name}")
        
        if not gmail_service.user_email:
            raise HTTPException(
                status_code=503, 
                detail="Gmail API 서비스가 사용 불가능합니다. 설정을 확인해주세요."
            )
        
        success = gmail_service.send_survey_email(
            to_emails=request.to_emails,
            survey_url=request.survey_url,
            company_name=request.company_name,
            survey_title=request.survey_title
        )
        
        if success:
            return EmailResponse(
                success=True,
                message=f"{request.company_name} 설문 이메일이 성공적으로 발송되었습니다.",
                sent_count=len(request.to_emails)
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="설문 이메일 발송에 실패했습니다."
            )
            
    except Exception as e:
        logger.error(f"❌ 설문 이메일 발송 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"설문 이메일 발송 중 오류가 발생했습니다: {str(e)}"
        )

@email_router.get("/status")
async def get_email_service_status():
    """이메일 서비스 상태 확인"""
    return {
        "available": bool(gmail_service.user_email),
        "message": "Gmail API 서비스가 정상 작동 중입니다." if gmail_service.user_email else "Gmail API 서비스가 사용 불가능합니다."
    }

@email_router.post("/test")
async def test_email():
    """이메일 발송 테스트"""
    try:
        from app.gmail_send import gmail_send
        
        # 테스트 이메일 발송
        msg_id = gmail_send(
            to="test@example.com",
            subject="테스트 이메일",
            html="<h1>테스트</h1><p>이메일 발송이 정상 작동합니다.</p>",
            text="테스트 이메일 발송이 정상 작동합니다."
        )
        
        return {
            "success": True,
            "message": "이메일 발송 테스트 성공",
            "message_id": msg_id
        }
        
    except Exception as e:
        logger.error(f"❌ 이메일 테스트 실패: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"이메일 테스트 실패: {str(e)}"
        )
