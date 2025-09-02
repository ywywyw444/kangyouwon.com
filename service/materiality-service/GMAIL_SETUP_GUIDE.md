# Gmail API 설정 가이드

이 가이드는 Materiality Service에서 Gmail API를 사용하여 설문 이메일을 발송하는 방법을 설명합니다.

## 📋 사전 준비사항

1. **Google Cloud Console 프로젝트 생성**
2. **Gmail API 활성화**
3. **OAuth 2.0 클라이언트 ID 생성**
4. **credentials.json 파일 다운로드**

## 🔧 1단계: Google Cloud Console 설정

### 1.1 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 이름: `esg-mate` (또는 원하는 이름)

### 1.2 Gmail API 활성화
1. Google Cloud Console에서 "API 및 서비스" > "라이브러리" 이동
2. "Gmail API" 검색
3. Gmail API 선택 후 "사용" 클릭

### 1.3 OAuth 2.0 클라이언트 ID 생성
1. "API 및 서비스" > "사용자 인증 정보" 이동
2. "사용자 인증 정보 만들기" > "OAuth 클라이언트 ID" 선택
3. 애플리케이션 유형: "데스크톱 애플리케이션"
4. 이름: `Materiality Service Gmail API`
5. "만들기" 클릭

### 1.4 credentials.json 다운로드
1. 생성된 OAuth 2.0 클라이언트 ID 클릭
2. "JSON 다운로드" 클릭
3. 다운로드된 파일을 `credentials.json`으로 이름 변경
4. `service/materiality-service/` 디렉토리에 저장

## 🚀 2단계: 로컬 인증 설정

### 2.1 필요한 패키지 설치
```bash
cd service/materiality-service
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### 2.2 인증 토큰 생성
```bash
python setup_gmail_auth.py
```

이 스크립트는:
1. `credentials.json` 파일을 읽어 OAuth 2.0 플로우 실행
2. 브라우저에서 Gmail 계정 로그인 요청
3. `token.pickle` 파일에 refresh token 저장
4. Railway 환경변수 설정 정보 출력

## 🔑 3단계: Railway 환경변수 설정

### 3.1 Railway 대시보드 접속
1. [Railway](https://railway.app/) 로그인
2. `materiality-service` 프로젝트 선택

### 3.2 환경변수 추가
1. 프로젝트 대시보드에서 "Variables" 탭 클릭
2. 다음 환경변수들을 추가:

```
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
GMAIL_USER_EMAIL=your_gmail_address@gmail.com
```

### 3.3 서비스 재배포
환경변수 추가 후 서비스가 자동으로 재배포됩니다.

## 📧 4단계: 이메일 발송 기능 사용

### 4.1 설문 생성 시 이메일 발송
프론트엔드에서 설문 생성 요청 시 다음 필드를 추가:

```json
{
  "corporation_id": "1",
  "categories": [...],
  "excel_data": {...},
  "content_hash": "...",
  "send_email": true,
  "company_name": "회사명"
}
```

### 4.2 직접 이메일 발송 API 사용
```bash
curl -X POST "https://gateway-production-4c8b.up.railway.app/api/v1/materiality-service/email/send-survey" \
  -H "Content-Type: application/json" \
  -d '{
    "to_emails": ["test@example.com"],
    "survey_url": "https://kangyouwon.com/survey?id=survey_id",
    "company_name": "테스트 회사",
    "survey_title": "중대성 평가 설문"
  }'
```

## 🧪 5단계: 테스트

### 5.1 이메일 서비스 상태 확인
```bash
curl "https://gateway-production-4c8b.up.railway.app/api/v1/materiality-service/email/status"
```

### 5.2 테스트 이메일 발송
```bash
curl -X POST "https://gateway-production-4c8b.up.railway.app/api/v1/materiality-service/email/send" \
  -H "Content-Type: application/json" \
  -d '{
    "to_emails": ["your_email@gmail.com"],
    "subject": "테스트 이메일",
    "body": "Gmail API 테스트 이메일입니다.",
    "html_body": "<h2>테스트</h2><p>Gmail API 테스트 이메일입니다.</p>"
  }'
```

## 🔍 문제 해결

### 일반적인 오류

1. **"Gmail API 서비스가 사용 불가능합니다"**
   - Railway 환경변수가 올바르게 설정되었는지 확인
   - 서비스가 재배포되었는지 확인

2. **"토큰 갱신 실패"**
   - `GMAIL_REFRESH_TOKEN`이 올바른지 확인
   - `setup_gmail_auth.py`를 다시 실행하여 새 토큰 생성

3. **"권한 없음" 오류**
   - Gmail API가 활성화되었는지 확인
   - OAuth 2.0 클라이언트 ID가 올바른지 확인

### 로그 확인
Railway 대시보드에서 서비스 로그를 확인하여 오류 메시지를 파악할 수 있습니다.

## 📚 API 엔드포인트

### 이메일 발송
- `POST /api/v1/materiality-service/email/send` - 일반 이메일 발송
- `POST /api/v1/materiality-service/email/send-survey` - 설문 이메일 발송
- `GET /api/v1/materiality-service/email/status` - 이메일 서비스 상태 확인

### 설문 생성 (이메일 발송 포함)
- `POST /api/v1/materiality-service/surveys` - 설문 생성 (send_email: true로 설정)

## 🔒 보안 고려사항

1. **환경변수 보안**: Railway에서 환경변수는 암호화되어 저장됩니다.
2. **토큰 관리**: refresh token은 안전하게 보관되어야 합니다.
3. **API 제한**: Gmail API는 일일 사용량 제한이 있습니다.
4. **스팸 방지**: 이메일 발송 시 스팸 필터를 고려해야 합니다.

## 📞 지원

문제가 발생하면 다음을 확인해주세요:
1. Railway 서비스 로그
2. Gmail API 할당량 사용량
3. 환경변수 설정 상태
4. 네트워크 연결 상태
