from typing import Optional
from fastapi import HTTPException
import httpx
import os
import logging

logger = logging.getLogger(__name__)

# 서비스 URL 매핑
SERVICE_URLS = {
    "auth-service": os.getenv("AUTH_SERVICE_URL", "https://auth-service-production-f2ef.up.railway.app"),
    "chatbot-service": os.getenv("CHATBOT_SERVICE_URL", "https://chatbot-service-production-93a9.up.railway.app"),
    "gri-service": os.getenv("GRI_SERVICE_URL", "https://gri-service-production.up.railway.app"),
    "materiality-service": os.getenv("MATERIALITY_SERVICE_URL", "https://materiality-service-production-0876.up.railway.app"),
    "report-service": os.getenv("REPORT_SERVICE_URL", "https://report-service-production.up.railway.app"),
    "tcfd-service": os.getenv("TCFD_SERVICE_URL", "https://tcfd-service-production.up.railway.app"),
    "survey-service": os.getenv("SURVEY_SERVICE_URL", "https://survey-service-production.up.railway.app"),
}

class ServiceProxyFactory:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.base_url = SERVICE_URLS.get(service_name)
        
        if not self.base_url:
            raise ValueError(f"Service {service_name} not found in SERVICE_URLS")
        
        logger.info(f"👩🏻 Service URL: {self.base_url}")

    async def request(
        self,
        method: str,
        path: str,
        headers: Optional[dict] = None,
        body: Optional[str] = None
    ) -> httpx.Response:
        # 경로 구성 (서비스 prefix 포함)
        url = f"{self.base_url}{path}"
        logger.info(f"🎯🎯🎯 Requesting URL: {url}")
        
        # 기본 헤더 설정
        headers_dict = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # 외부 헤더가 있으면 병합
        if headers:
            headers_dict.update(headers)
        
        # host 헤더 제거 (프록시 요청시 문제 방지)
        if 'host' in headers_dict:
            del headers_dict['host']

        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers_dict,
                    content=body,
                    timeout=30.0
                )
                logger.info(f"Response status: {response.status_code}")
                logger.info(f"Request URL: {url}")
                if body:
                    logger.info(f"Request body: {body}")
                return response
            except Exception as e:
                logger.error(f"Request failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

# 간단한 서비스 팩토리 (기존 코드와의 호환성을 위해)
class SimpleServiceFactory:
    def __init__(self):
        # 모든 서비스 URL을 저장
        self.service_urls = SERVICE_URLS
        logger.info(f"🔧 모든 서비스 URL 로드: {list(self.service_urls.keys())}")
    
    async def forward_request(self, method: str, path: str, headers: dict = None, body: str = None) -> dict:
        """요청을 적절한 서비스로 전달"""
        try:
            # 경로에서 서비스명 추출 (예: /materiality-service/search/companies → materiality-service)
            path_parts = path.strip('/').split('/')
            if len(path_parts) > 0:
                service_name = path_parts[0]
                actual_path = '/' + '/'.join(path_parts[1:]) if len(path_parts) > 1 else '/'
            else:
                service_name = "auth-service"  # 기본값
                actual_path = path
            
            logger.info(f"🎯 서비스명: {service_name}")
            logger.info(f"🎯 실제 경로: {actual_path}")
            
            # 서비스 URL 가져오기
            service_url = self.service_urls.get(service_name)
            if not service_url:
                logger.error(f"❌ 서비스를 찾을 수 없음: {service_name}")
                return {
                    "error": True,
                    "status_code": 404,
                    "detail": f"Service {service_name} not found"
                }
            
            # URL 구성
            url = f"{service_url}{actual_path}"
            logger.info(f"🎯 {service_name}로 전달: {method} {url}")
            
            # 로그인/회원가입 요청 상세 로깅
            if body and ("login" in path or "signup" in path):
                try:
                    import json
                    body_data = json.loads(body)
                    logger.info(f"🔐 요청 데이터 상세:")
                    logger.info(f"   - 경로: {path}")
                    logger.info(f"   - 메서드: {method}")
                    if "auth_id" in body_data:
                        logger.info(f"   - 사용자 ID: {body_data.get('auth_id', 'N/A')}")
                    if "email" in body_data:
                        logger.info(f"   - 이메일: {body_data.get('email', 'N/A')}")
                    if "name" in body_data:
                        logger.info(f"   - 이름: {body_data.get('name', 'N/A')}")
                    if "company_id" in body_data:
                        logger.info(f"   - 회사 ID: {body_data.get('company_id', 'N/A')}")
                    logger.info(f"   - 전체 데이터: {body_data}")
                except Exception as e:
                    logger.warning(f"⚠️ 요청 데이터 파싱 실패: {str(e)}")
                    logger.info(f"   - 원본 데이터: {body}")
            
            # 헤더 준비
            request_headers = headers or {}
            if "host" in request_headers:
                del request_headers["host"]
            
            # 요청 파라미터
            request_kwargs = {
                "method": method,
                "url": url,
                "headers": request_headers,
                "timeout": 30.0
            }
            
            if body:
                request_kwargs["content"] = body
            
            # HTTP 요청 실행
            async with httpx.AsyncClient() as client:
                response = await client.request(**request_kwargs)
                
                logger.info(f"✅ {service_name} 응답: {response.status_code}")
                
                # 응답 데이터도 로깅
                if response.status_code < 400:
                    try:
                        response_data = response.json()
                        logger.info(f"📤 응답 데이터: {response_data}")
                        return {"status_code": response.status_code, "data": response_data}
                    except Exception:
                        response_text = response.text
                        logger.info(f"📤 응답 텍스트: {response_text}")
                        return {"status_code": response.status_code, "data": response_text}
                else:
                    error_detail = response.text
                    logger.error(f"❌ {service_name} 오류 응답: {response.status_code} - {error_detail}")
                    return {
                        "error": True,
                        "status_code": response.status_code,
                        "detail": error_detail
                    }
                    
        except Exception as e:
            logger.error(f"❌ 서비스 요청 실패: {str(e)}")
            return {"error": True, "detail": str(e)}
