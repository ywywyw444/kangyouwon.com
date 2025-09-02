"""
Gmail API Service for sending emails
"""

import os
import base64
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# Gmail API 스코프
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

class GmailService:
    """Gmail API를 사용한 이메일 발송 서비스"""
    
    def __init__(self):
        self.service = None
        self.credentials = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Gmail API 서비스 초기화"""
        try:
            # 환경변수에서 Gmail API 설정 가져오기
            client_id = os.getenv('GMAIL_CLIENT_ID')
            client_secret = os.getenv('GMAIL_CLIENT_SECRET')
            refresh_token = os.getenv('GMAIL_REFRESH_TOKEN')
            user_email = os.getenv('GMAIL_USER_EMAIL')
            
            if not all([client_id, client_secret, refresh_token, user_email]):
                logger.error("❌ Gmail API 환경변수가 설정되지 않았습니다.")
                logger.error("필요한 환경변수: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER_EMAIL")
                return
            
            # Credentials 객체 생성
            self.credentials = Credentials(
                token=None,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=client_id,
                client_secret=client_secret,
                scopes=SCOPES
            )
            
            # 토큰 갱신
            if not self.credentials.valid:
                if self.credentials.expired and self.credentials.refresh_token:
                    self.credentials.refresh(Request())
                    logger.info("✅ Gmail API 토큰 갱신 완료")
                else:
                    logger.error("❌ Gmail API 토큰 갱신 실패")
                    return
            
            # Gmail API 서비스 빌드
            self.service = build('gmail', 'v1', credentials=self.credentials)
            logger.info("✅ Gmail API 서비스 초기화 완료")
            
        except Exception as e:
            logger.error(f"❌ Gmail API 서비스 초기화 실패: {str(e)}")
            self.service = None
    
    def send_email(self, to_emails: List[str], subject: str, body: str, 
                   html_body: Optional[str] = None, from_email: Optional[str] = None) -> bool:
        """
        이메일 발송
        
        Args:
            to_emails: 수신자 이메일 주소 리스트
            subject: 이메일 제목
            body: 이메일 본문 (텍스트)
            html_body: 이메일 본문 (HTML, 선택사항)
            from_email: 발신자 이메일 (기본값: 환경변수에서 가져옴)
        
        Returns:
            bool: 발송 성공 여부
        """
        if not self.service:
            logger.error("❌ Gmail API 서비스가 초기화되지 않았습니다.")
            return False
        
        try:
            # 발신자 이메일 설정
            if not from_email:
                from_email = os.getenv('GMAIL_USER_EMAIL')
            
            if not from_email:
                logger.error("❌ 발신자 이메일이 설정되지 않았습니다.")
                return False
            
            # 이메일 메시지 생성
            message = MIMEMultipart('alternative')
            message['to'] = ', '.join(to_emails)
            message['from'] = from_email
            message['subject'] = subject
            
            # 텍스트 본문 추가
            text_part = MIMEText(body, 'plain', 'utf-8')
            message.attach(text_part)
            
            # HTML 본문 추가 (있는 경우)
            if html_body:
                html_part = MIMEText(html_body, 'html', 'utf-8')
                message.attach(html_part)
            
            # 이메일 인코딩
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            # 이메일 발송
            send_message = self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            logger.info(f"✅ 이메일 발송 성공: {send_message['id']}")
            logger.info(f"📧 수신자: {', '.join(to_emails)}")
            logger.info(f"📝 제목: {subject}")
            
            return True
            
        except HttpError as error:
            logger.error(f"❌ Gmail API 오류: {error}")
            return False
        except Exception as e:
            logger.error(f"❌ 이메일 발송 실패: {str(e)}")
            return False
    
    def send_survey_email(self, to_emails: List[str], survey_url: str, 
                         company_name: str, survey_title: str = "중대성 평가 설문") -> bool:
        """
        설문 이메일 발송 (전용 메서드)
        
        Args:
            to_emails: 수신자 이메일 주소 리스트
            survey_url: 설문 URL
            company_name: 회사명
            survey_title: 설문 제목
        
        Returns:
            bool: 발송 성공 여부
        """
        subject = f"[{company_name}] {survey_title} 참여 요청"
        
        # 텍스트 본문
        text_body = f"""
안녕하세요.

{company_name}의 {survey_title}에 참여해주셔서 감사합니다.

아래 링크를 클릭하여 설문에 참여해주세요:
{survey_url}

※ 주의사항:
- 같은 이메일 주소로는 한 번만 응답할 수 있습니다.
- 설문은 익명으로 처리되며, 개인정보는 보호됩니다.
- 설문 참여는 자유롭게 선택하실 수 있습니다.

문의사항이 있으시면 언제든지 연락주시기 바랍니다.

감사합니다.
{company_name} ESG팀
        """.strip()
        
        # HTML 본문
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
        .content {{ padding: 20px; }}
        .button {{ 
            display: inline-block; 
            background-color: #007bff; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
        }}
        .button:hover {{ background-color: #0056b3; }}
        .footer {{ background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; }}
        .warning {{ background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>{company_name} {survey_title}</h2>
        </div>
        
        <div class="content">
            <p>안녕하세요.</p>
            
            <p>{company_name}의 {survey_title}에 참여해주셔서 감사합니다.</p>
            
            <p>아래 버튼을 클릭하여 설문에 참여해주세요:</p>
            
            <div style="text-align: center;">
                <a href="{survey_url}" class="button">설문 참여하기</a>
            </div>
            
            <div class="warning">
                <strong>※ 주의사항:</strong>
                <ul>
                    <li>같은 이메일 주소로는 한 번만 응답할 수 있습니다.</li>
                    <li>설문은 익명으로 처리되며, 개인정보는 보호됩니다.</li>
                    <li>설문 참여는 자유롭게 선택하실 수 있습니다.</li>
                </ul>
            </div>
            
            <p>문의사항이 있으시면 언제든지 연락주시기 바랍니다.</p>
        </div>
        
        <div class="footer">
            <p>감사합니다.<br>
            {company_name} ESG팀</p>
        </div>
    </div>
</body>
</html>
        """.strip()
        
        return self.send_email(
            to_emails=to_emails,
            subject=subject,
            body=text_body,
            html_body=html_body
        )
    
    def is_available(self) -> bool:
        """Gmail API 서비스 사용 가능 여부 확인"""
        return self.service is not None

# 전역 Gmail 서비스 인스턴스
gmail_service = GmailService()
