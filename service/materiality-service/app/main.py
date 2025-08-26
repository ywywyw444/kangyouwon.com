"""
Materiality 서비스 메인 애플리케이션 진입점
"""
import os
import logging
import sys
import traceback
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# 라우터
from app.router.media_router import media_router
from app.router.search_router import search_router

# 환경 변수 로드 (Railway 환경에서는 건너뛰기)
if os.getenv("RAILWAY_ENVIRONMENT") != "true":
    load_dotenv()

# Railway 환경변수 처리
PORT = os.getenv("PORT", "8002")
if not PORT.isdigit():
    PORT = "8002"

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("materiality_service")

# FastAPI 앱 생성
app = FastAPI(
    title="Materiality Service API",
    description="기업의 지속가능성 중대성 평가를 위한 서비스",
    version="0.1.0"
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한 권장
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# TrustedHost 미들웨어 설정
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # 프로덕션에서는 특정 호스트로 제한 권장
)

# ─────────────────────────────────────────────────────────
# 라우터 등록 (prefix는 여기에서만 부여)
# ─────────────────────────────────────────────────────────
app.include_router(media_router,  prefix="/materiality-service", tags=["materiality"])
app.include_router(search_router, prefix="/materiality-service", tags=["search"])

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Materiality Service API",
        "version": "0.1.0",
        "status": "running",
        "service": "materiality-service"
    }

@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "Materiality Service",
        "port": PORT,
    }

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """HTTP 요청 로깅 미들웨어"""
    client_host = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")
    logger.info(f"📥 요청: {request.method} {request.url.path} (클라이언트: {client_host})")
    try:
        response = await call_next(request)
        logger.info(f"📤 응답: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"❌ 요청 처리 중 오류: {str(e)}")
        logger.error(traceback.format_exc())
        raise

@app.on_event("startup")
async def startup_event():
    """서비스 시작 시 실행되는 이벤트"""
    logger.info(f"🚀 Materiality Service 시작됨 (포트: {PORT})")
    logger.info("📋 등록된 엔드포인트(주요):")
    logger.info("   - POST /materiality-service/search-media")
    logger.info("   - POST /materiality-service/assessment")
    logger.info("   - GET  /materiality-service/reports")
    logger.info("   - (search_router 내 엔드포인트들도 /materiality-service/* 로 노출)")

@app.on_event("shutdown")
async def shutdown_event():
    """서비스 종료 시 실행되는 이벤트"""
    logger.info("🛑 Materiality Service 종료됨")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(PORT), reload=True)
