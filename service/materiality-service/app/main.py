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
from app.router.issuepool_router import issuepool_router
from app.router.middleissue_router import middleissue_router
from app.router.category_router import category_router
from app.router.survey_router import survey_router

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
# app.include_router(media_router,  prefix="/materiality-service", tags=["materiality"])
app.include_router(media_router,  prefix="/materiality-service", tags=["survey"])
app.include_router(search_router, prefix="/materiality-service", tags=["search"])
app.include_router(issuepool_router, prefix="/materiality-service", tags=["issuepool"])
app.include_router(middleissue_router, prefix="/materiality-service", tags=["middleissue"])
app.include_router(category_router, prefix="/materiality-service", tags=["category"])
app.include_router(survey_router, prefix="/materiality-service", tags=["survey"])

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

# 디버깅용 임시 설문 엔드포인트
@app.post("/debug-surveys")
async def debug_create_survey():
    """디버깅용 설문 생성 엔드포인트"""
    return {
        "message": "디버깅용 설문 엔드포인트가 작동 중입니다.",
        "timestamp": "2025-09-01T11:19:47Z"
    }

@app.get("/debug-routes")
async def debug_routes():
    """등록된 라우터 정보 확인"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'path'):
            routes.append({
                "path": route.path,
                "methods": [method for method in route.methods] if hasattr(route, 'methods') else [],
                "name": route.name if hasattr(route, 'name') else "Unknown"
            })
    return {
        "total_routes": len(routes),
        "routes": routes
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
    
    # 데이터베이스 연결 테스트
    try:
        from app.common.database.survey_db import test_connection
        import asyncio
        
        # 비동기 연결 테스트 실행
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            if loop.run_until_complete(test_connection()):
                logger.info("✅ PostgreSQL 데이터베이스 연결 성공")
            else:
                logger.warning("⚠️ PostgreSQL 데이터베이스 연결 실패")
        finally:
            loop.close()
    except Exception as e:
        logger.warning(f"⚠️ 데이터베이스 연결 테스트 실패: {e}")
    
    logger.info("📋 등록된 엔드포인트(주요):")
    logger.info("   - POST /materiality-service/search-media")
    logger.info("   - POST /materiality-service/assessment")
    logger.info("   - GET  /materiality-service/reports")
    logger.info("   - GET  /materiality-service/middleissue/list")
    logger.info("   - POST /materiality-service/middleissue/create")
    logger.info("   - GET  /materiality-service/issuepool/all (신규: issuepool DB 전체 데이터)")
    logger.info("   - POST /materiality-service/category/categories/all (신규: 전체 카테고리 목록)")
    logger.info("   - POST /materiality-service/surveys (신규: 설문 생성)")
    logger.info("   - GET  /materiality-service/surveys/{survey_id} (신규: 설문 조회)")
    logger.info("   - GET  /materiality-service/surveys/corporation/{corporation_id} (신규: 회사별 설문 목록)")
    logger.info("   - POST /materiality-service/surveys/{survey_id}/responses (신규: 설문 응답 제출)")
    logger.info("   - (search_router 내 엔드포인트들도 /materiality-service/* 로 노출)")

@app.on_event("shutdown")
async def shutdown_event():
    """서비스 종료 시 실행되는 이벤트"""
    logger.info("🛑 Materiality Service 종료됨")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(PORT), reload=True)
