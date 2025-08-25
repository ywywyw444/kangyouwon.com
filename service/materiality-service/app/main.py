"""
Materiality 서비스 메인 애플리케이션 진입점
"""
import os
import logging
import sys
import traceback
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, Request, Depends, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi import APIRouter

# Router import
from app.router.media_router import media_router

# 환경 변수 로드
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

# FastAPI 애플리케이션 생성
app = FastAPI(
    title="Materiality Service API",
    description="기업의 지속가능성 중대성 평가를 위한 서비스",
    version="0.1.0"
)

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용하도록 수정
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Trusted Host 미들웨어 추가
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # 프로덕션에서는 특정 호스트만 허용하도록 수정
)

# 라우터 등록
app.include_router(media_router, prefix="/api/v1", tags=["materiality"])

# 기본 루트 경로
@app.get("/")
async def root():
    return {
        "message": "Materiality Service API",
        "version": "0.1.0",
        "status": "running",
        "service": "materiality-service"
    }

# 헬스 체크 엔드포인트
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "materiality-service",
        "port": PORT,
        "timestamp": "2025-01-13T08:00:00Z"
    }

# 예외 처리 미들웨어 추가
@app.middleware("http")
async def log_requests(request: Request, call_next):
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

# 애플리케이션 시작 이벤트
@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 Materiality Service 시작됨 (포트: {PORT})")
    logger.info("📋 등록된 엔드포인트:")
    logger.info("   - POST /api/v1/materiality-service/search-media")
    logger.info("   - POST /api/v1/materiality-service/assessment")
    logger.info("   - GET /api/v1/materiality-service/reports")

# 애플리케이션 종료 이벤트
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Materiality Service 종료됨")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(PORT), reload=True)
