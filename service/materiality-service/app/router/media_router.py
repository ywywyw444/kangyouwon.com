from fastapi import APIRouter, Request
from app.domain.media.controller import media_controller
import logging
import traceback

# 로거 설정
logger = logging.getLogger(__name__)

# ⚠️ 여기서는 prefix를 주지 않습니다. (main.py에서만 붙임)
media_router = APIRouter(tags=["Media"])

@media_router.post("/search-media", summary="미디어 검색")
async def search_media(request: Request):
    """
    gateway에서 넘어온 미디어 검색 요청을 처리하는 엔드포인트
    최종 경로: /materiality-service/search-media
    """
    logger.info("🔍 미디어 검색 POST 요청 받음")
    try:
        # 요청 본문 파싱
        body = await request.json()
        logger.info(f"📥 미디어 검색 요청 받음: {body}")

        # 데이터 검증
        if not body.get("company_id"):
            logger.warning("필수 필드 누락: company_id")
            return {"success": False, "message": "company_id가 필요합니다"}

        if not body.get("report_period"):
            logger.warning("필수 필드 누락: report_period")
            return {"success": False, "message": "report_period가 필요합니다"}

        if not body.get("report_period", {}).get("start_date"):
            logger.warning("필수 필드 누락: start_date")
            return {"success": False, "message": "start_date가 필요합니다"}

        if not body.get("report_period", {}).get("end_date"):
            logger.warning("필수 필드 누락: end_date")
            return {"success": False, "message": "end_date가 필요합니다"}

        # Controller를 통해 Service 호출
        result = await media_controller.search_media(body)
        
        logger.info(f"✅ 미디어 검색 요청 처리 완료: {body.get('company_id')}")
        return result

    except Exception as e:
        logger.error(f"❌ 미디어 검색 처리 중 오류: {str(e)}")
        logger.error(traceback.format_exc())
        return {"success": False, "message": f"미디어 검색 처리 중 오류가 발생했습니다: {str(e)}"}
