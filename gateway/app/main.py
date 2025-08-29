from typing import Optional, List, Any, Dict
from fastapi import APIRouter, FastAPI, Request, UploadFile, File, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging
import sys
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import httpx
import json

from app.www.jwt_auth_middleware import AuthMiddleware
from app.domain.discovery.service_factory import SimpleServiceFactory

# Gateway는 DB에 직접 접근하지 않음 (MSA 원칙)

if os.getenv("RAILWAY_ENVIRONMENT") != "true":
    load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("gateway_api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Gateway API 서비스 시작")
    
    # 서비스 팩토리 초기화
    app.state.service_factory = SimpleServiceFactory()
    logger.info("✅ Service Factory 초기화 완료")
    
    yield
    logger.info("🛑 Gateway API 서비스 종료")

app = FastAPI(
    title="Gateway API",
    description="Gateway API for ausikor.com",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.kangyouwon.com",
        "https://kangyouwon.com",
        "https://esg-mate.vercel.app",
        "https://esg-mate-lywmmygs7-ywyw74s-projects.vercel.app",
        "https://zustand-beta.vercel.app",
        "https://zustand-git-main-ywyw74s-projects.vercel.app",
        "https://zustand-owlotwu22-ywyw74s-projects.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

app.add_middleware(AuthMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.kangyouwon.com",
        "https://kangyouwon.com",
        "https://esg-mate.vercel.app",
        "https://esg-mate-lywmmygs7-ywyw74s-projects.vercel.app",
        "https://zustand-beta.vercel.app",
        "https://zustand-git-main-ywyw74s-projects.vercel.app",
        "https://zustand-owlotwu22-ywyw74s-projects.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# 모든 요청 로깅 미들웨어 추가
@app.middleware("http")
async def log_all_requests(request: Request, call_next):
    logger.info(f"🌐 모든 요청 로깅: {request.method} {request.url.path}")
    logger.info(f"🌐 요청 헤더: {dict(request.headers)}")
    
    # 응답 처리
    response = await call_next(request)
    
    logger.info(f"🌐 응답 상태: {response.status_code}")
    return response

# ===== [여기부터 핵심 수정] 내부 서비스로 넘길 때 붙일 기본 prefix =====
FORWARD_BASE_PATH = "api/v1"
# ================================================================

# 라우터 생성
logger.info("🔧 Gateway 라우터 생성 시작...")

gateway_router = APIRouter(tags=["Gateway API"], prefix="/api/v1")

# 라우터 등록 확인 로그
logger.info("🔧 Gateway 라우터 생성 완료")
logger.info(f"🔧 라우터 prefix: {gateway_router.prefix}")
logger.info(f"🔧 라우터 tags: {gateway_router.tags}")

# ������ 파일이 필요한 서비스 목록 (현재는 없음)
FILE_REQUIRED_SERVICES = set()


@gateway_router.get("/{service}/{path:path}", summary="GET 프록시")
async def proxy_get(
    service: str, 
    path: str, 
    request: Request
):
    logger.info("🚀 GET 프록시 함수 시작!")
    try:
        service_factory = request.app.state.service_factory
        headers = dict(request.headers)

        # Service Factory가 모든 서비스 라우팅을 담당
        forward_path = f"/{service}/{path}"
        logger.info(f"🎯 Service Factory로 전달: {forward_path}")

        response = await service_factory.forward_request(
            method="GET",
            path=forward_path,
            headers=headers
        )
        
        if response.get("error"):
            return JSONResponse(
                content={"detail": response.get("detail", "Unknown error")},
                status_code=response.get("status_code", 500)
            )
        
        return JSONResponse(content=response.get("data", {}), status_code=response.get("status_code", 200))
    except Exception as e:
        logger.error(f"Error in GET proxy: {str(e)}")
        return JSONResponse(
            content={"detail": f"Error processing request: {str(e)}"},
            status_code=500
        )

from typing import Any, Dict, Optional
from fastapi import Body, HTTPException, Request
from fastapi.responses import JSONResponse
import json

@gateway_router.post("/{service}/{path:path}", summary="POST 프록시 (JSON 전용)")
async def proxy_post_json(
    service: str,
    path: str,
    request: Request,
    # ✅ JSON 전용 바디 선언 → Swagger에 JSON 에디터 표시
    payload: Dict[str, Any] = Body(
        ...,  # required
        example={"email": "test@example.com", "password": "****"}
    ),
):
    logger.info(f"🚀 POST 프록시(JSON) 시작: service={service}, path={path}")
    logger.info(f"🚀 요청 URL: {request.url}")

    try:
        headers = dict(request.headers)
        headers["content-type"] = "application/json"
        # Content-Length 헤더 제거 (자동 계산되도록)
        if "content-length" in headers:
            del headers["content-length"]
        body = json.dumps(payload)

        # Service Factory가 모든 서비스 라우팅을 담당
        service_factory = request.app.state.service_factory
        forward_path = f"/{service}/{path}"
        logger.info(f"🎯 Service Factory로 전달: {forward_path}")
        logger.info(f"🔧 전달할 body 크기: {len(body) if body else 0} bytes")
        logger.info(f"🔧 전달할 headers: {headers}")

        response = await service_factory.forward_request(
            method="POST",
            path=forward_path,
            headers=headers,
            body=body
        )

        # 이제 response는 Starlette Response이므로 직접 반환
        return response

    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
    except Exception as e:
        logger.error(f"🚨 POST(JSON) 처리 중 오류: {e}", exc_info=True)
        return JSONResponse(
            content={"detail": f"Gateway error: {str(e)}", "error_type": type(e).__name__},
            status_code=500
        )


@gateway_router.put("/{service}/{path:path}", summary="PUT 프록시")
async def proxy_put(service: str, path: str, request: Request):
    try:
        service_factory = request.app.state.service_factory
        headers = dict(request.headers)

        # ===== [수정] 내부로 넘길 경로 재작성 =====
        # auth-service는 /auth-service 경로를 포함해서 전달
        forward_path = f"/auth-service/{path}"
        logger.info(f"🎯 최종 전달 경로(PUT): {forward_path}")

        response = await service_factory.forward_request(
            method="PUT",
            path=forward_path,
            headers=headers,
            body=await request.body()
        )
        
        if response.get("error"):
            return JSONResponse(
                content={"detail": response.get("detail", "Unknown error")},
                status_code=response.get("status_code", 500)
            )
        
        return JSONResponse(content=response.get("data", {}), status_code=response.get("status_code", 200))
    except Exception as e:
        logger.error(f"Error in PUT proxy: {str(e)}")
        return JSONResponse(
            content={"detail": f"Error processing request: {str(e)}"},
            status_code=500
        )

@gateway_router.delete("/{service}/{path:path}", summary="DELETE 프록시")
async def proxy_delete(service: str, path: str, request: Request):
    try:
        service_factory = request.app.state.service_factory
        headers = dict(request.headers)

        # ===== [수정] 내부로 넘길 경로 재작성 =====
        # auth-service는 /auth-service 경로를 포함해서 전달
        forward_path = f"/auth-service/{path}"
        logger.info(f"🎯 최종 전달 경로(DELETE): {forward_path}")

        response = await service_factory.forward_request(
            method="DELETE",
            path=forward_path,
            headers=headers,
            body=await request.body()
        )
        
        # 이제 response는 Starlette Response이므로 직접 반환
        return response
    except Exception as e:
        logger.error(f"Error in DELETE proxy: {str(e)}")
        return JSONResponse(
            content={"detail": f"Error processing request: {str(e)}"},
            status_code=500
        )

@gateway_router.patch("/{service}/{path:path}", summary="PATCH 프록시")
async def proxy_patch(service: str, path: str, request: Request):
    try:
        service_factory = request.app.state.service_factory
        headers = dict(request.headers)

        # ===== [수정] 내부로 넘길 경로 재작성 =====
        # auth-service는 /auth-service 경로를 포함해서 전달
        forward_path = f"/auth-service/{path}"
        logger.info(f"🎯 최종 전달 경로(PATCH): {forward_path}")

        response = await service_factory.forward_request(
            method="PATCH",
            path=forward_path,
            headers=headers,
            body=await request.body()
        )
        
        # 이제 response는 Starlette Response이므로 직접 반환
        return response
    except Exception as e:
        logger.error(f"Error in PATCH proxy: {str(e)}")
        return JSONResponse(
            content={"detail": f"Error processing request: {str(e)}"},
            status_code=500
        )

# 라우터 등록 (모든 엔드포인트 정의 후)
logger.info("🔧 라우터 등록 중...")
app.include_router(gateway_router)
logger.info("✅ Gateway 라우터 등록 완료")

# 라우트 등록 확인 (모든 라우트 함수 정의 후)
logger.info("🔍 등록된 라우트들:")
post_routes_found = 0
for route in app.routes:
    if hasattr(route, 'path'):
        logger.info(f"  - {route.methods} {route.path}")
        if 'POST' in route.methods and '{service}' in route.path:
            post_routes_found += 1
            logger.info(f"🎯 POST 동적 라우트 발견: {route.path}")
            logger.info(f"🎯 라우트 함수: {route.endpoint.__name__ if hasattr(route, 'endpoint') else 'Unknown'}")
            logger.info(f"🎯 라우트 엔드포인트: {route.endpoint}")

logger.info(f"🎯 총 POST 동적 라우트 개수: {post_routes_found}")

logger.info(f"🔍 gateway_router.routes 개수: {len(gateway_router.routes)}")
for route in gateway_router.routes:
    if hasattr(route, 'path'):
        logger.info(f"  - {route.methods} {route.path}")

logger.info("🎯 라우트 매칭 테스트:")
test_path = "/api/v1/auth-service/signup"
logger.info(f"🎯 테스트 경로: {test_path}")
logger.info(f"🎯 경로에서 service 추출: {test_path.split('/')[3] if len(test_path.split('/')) > 3 else 'N/A'}")
logger.info(f"🔍 경로에서 path 추출: {test_path.split('/')[4:] if len(test_path.split('/')) > 4 else 'N/A'}")

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    logger.error(f"🚨 404 에러 발생!")
    logger.error(f"🚨 요청 URL: {request.url}")
    logger.error(f"🚨 요청 메서드: {request.method}")
    logger.error(f"🚨 요청 경로: {request.url.path}")
    logger.error(f"🚨 요청 쿼리: {request.query_params}")
    logger.error(f"🚨 요청 헤더: {dict(request.headers)}")
    
    path_parts = request.url.path.split('/')
    logger.error(f"🎯 경로 파싱: {path_parts}")
    if len(path_parts) >= 5:
        logger.error(f"🎯 추출된 service: {path_parts[3]}")
        logger.error(f"🚨 추출된 path: {path_parts[4:]}")
    
    logger.error(f"🚨 등록된 라우트들:")
    for route in app.routes:
        if hasattr(route, 'path'):
            logger.error(f"  - {route.methods} {route.path}")
    
    logger.error(f"🚨 gateway_router 라우트들:")
    for route in gateway_router.routes:
        if hasattr(route, 'path'):
            logger.error(f"  - {route.methods} {route.path}")
    
    return JSONResponse(
        status_code=404,
        content={"detail": f"요청한 리소스를 찾을 수 없습니다. URL: {request.url}"}
    )

@app.get("/")
async def root():
    return {"message": "Gateway API", "version": "0.1.0"}

@app.get("/health")
async def health_check_root():
    logger.info("🔍😁😁😁😁😁 루트 헬스 체크는 성공 !!!! ")
    return {"status": "healthy", "service": "gateway", "path": "root"}

@app.get("/health/db")
async def health_check_db():
    return {
        "status": "healthy",
        "service": "gateway",
        "message": "Database health check delegated to auth-service"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)