#!/usr/bin/env python3
"""
Gmail API 인증 설정 스크립트
이 스크립트를 실행하여 Gmail API 사용을 위한 refresh token을 생성합니다.
"""

import os
import json
import pickle
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Gmail API 스코프
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def setup_gmail_auth():
    """Gmail API 인증 설정"""
    
    print("🚀 Gmail API 인증 설정을 시작합니다...")
    print("=" * 50)
    
    # 1. credentials.json 파일 확인
    credentials_file = "credentials.json"
    if not os.path.exists(credentials_file):
        print(f"❌ {credentials_file} 파일을 찾을 수 없습니다.")
        print("Google Cloud Console에서 OAuth 2.0 클라이언트 ID를 다운로드하여")
        print(f"현재 디렉토리에 {credentials_file}로 저장해주세요.")
        return False
    
    print(f"✅ {credentials_file} 파일을 찾았습니다.")
    
    # 2. OAuth 2.0 플로우 실행
    creds = None
    token_file = "token.pickle"
    
    # 기존 토큰 파일이 있는지 확인
    if os.path.exists(token_file):
        print(f"📁 기존 토큰 파일을 찾았습니다: {token_file}")
        with open(token_file, 'rb') as token:
            creds = pickle.load(token)
    
    # 유효한 자격 증명이 없으면 사용자에게 로그인 요청
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 토큰을 갱신합니다...")
            creds.refresh(Request())
        else:
            print("🔐 Gmail 계정으로 로그인합니다...")
            flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # 토큰을 파일에 저장
        with open(token_file, 'wb') as token:
            pickle.dump(creds, token)
        print(f"💾 토큰을 {token_file}에 저장했습니다.")
    
    # 3. Gmail API 서비스 테스트
    try:
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()
        print(f"✅ Gmail API 연결 성공!")
        print(f"📧 연결된 계정: {profile.get('emailAddress')}")
        
        # 4. 환경변수 정보 출력
        print("\n" + "=" * 50)
        print("🔧 Railway 환경변수 설정 정보:")
        print("=" * 50)
        
        # credentials.json에서 클라이언트 정보 추출
        with open(credentials_file, 'r') as f:
            client_info = json.load(f)
        
        client_id = client_info['installed']['client_id']
        client_secret = client_info['installed']['client_secret']
        refresh_token = creds.refresh_token
        user_email = profile.get('emailAddress')
        
        print(f"GMAIL_CLIENT_ID={client_id}")
        print(f"GMAIL_CLIENT_SECRET={client_secret}")
        print(f"GMAIL_REFRESH_TOKEN={refresh_token}")
        print(f"GMAIL_USER_EMAIL={user_email}")
        
        print("\n" + "=" * 50)
        print("📋 Railway 설정 방법:")
        print("=" * 50)
        print("1. Railway 대시보드에서 materiality-service 프로젝트 선택")
        print("2. Variables 탭으로 이동")
        print("3. 위의 환경변수들을 추가:")
        print("   - GMAIL_CLIENT_ID")
        print("   - GMAIL_CLIENT_SECRET") 
        print("   - GMAIL_REFRESH_TOKEN")
        print("   - GMAIL_USER_EMAIL")
        print("4. 서비스 재배포")
        
        return True
        
    except Exception as e:
        print(f"❌ Gmail API 테스트 실패: {str(e)}")
        return False

def test_email_sending():
    """이메일 발송 테스트"""
    print("\n" + "=" * 50)
    print("📧 이메일 발송 테스트")
    print("=" * 50)
    
    test_email = input("테스트 이메일 주소를 입력하세요 (Enter로 건너뛰기): ").strip()
    
    if not test_email:
        print("이메일 발송 테스트를 건너뜁니다.")
        return
    
    try:
        from app.common.email.gmail_service import gmail_service
        
        # 환경변수 설정
        os.environ['GMAIL_CLIENT_ID'] = input("GMAIL_CLIENT_ID: ").strip()
        os.environ['GMAIL_CLIENT_SECRET'] = input("GMAIL_CLIENT_SECRET: ").strip()
        os.environ['GMAIL_REFRESH_TOKEN'] = input("GMAIL_REFRESH_TOKEN: ").strip()
        os.environ['GMAIL_USER_EMAIL'] = input("GMAIL_USER_EMAIL: ").strip()
        
        # 이메일 발송 테스트
        success = gmail_service.send_email(
            to_emails=[test_email],
            subject="Gmail API 테스트 이메일",
            body="이것은 Gmail API 테스트 이메일입니다.",
            html_body="<h2>Gmail API 테스트</h2><p>이것은 Gmail API 테스트 이메일입니다.</p>"
        )
        
        if success:
            print("✅ 테스트 이메일 발송 성공!")
        else:
            print("❌ 테스트 이메일 발송 실패!")
            
    except Exception as e:
        print(f"❌ 이메일 발송 테스트 실패: {str(e)}")

if __name__ == "__main__":
    print("Gmail API 설정 도구")
    print("=" * 50)
    
    # 1. 인증 설정
    if setup_gmail_auth():
        # 2. 이메일 발송 테스트 (선택사항)
        test_choice = input("\n이메일 발송 테스트를 진행하시겠습니까? (y/N): ").strip().lower()
        if test_choice == 'y':
            test_email_sending()
    
    print("\n🎉 Gmail API 설정이 완료되었습니다!")
