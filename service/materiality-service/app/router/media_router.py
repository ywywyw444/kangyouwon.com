from fastapi import APIRouter, Request
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

        # 요청 데이터 추출
        company_id = body["company_id"]
        start_date = body["report_period"]["start_date"]
        end_date = body["report_period"]["end_date"]
        search_type = body.get("search_type", "materiality_assessment")
        timestamp = body.get("timestamp")

        logger.info(f"🔍 검색 파라미터: 기업={company_id}, 기간={start_date}~{end_date}, 타입={search_type}")

        # TODO: 실제 미디어 검색 로직 구현
        # 여기에 데이터베이스 조회, 외부 API 호출 등의 로직 추가

        # 임시 응답 데이터 (실제로는 검색 결과를 반환해야 함)
        search_results = {
            "company_id": company_id,
            "search_period": {"start_date": start_date, "end_date": end_date},
            "search_type": search_type,
            "total_results": 0,
            "articles": [],
            "status": "processing",
        }

        logger.info(f"✅ 미디어 검색 요청 처리 완료: {company_id}")

        return {
            "success": True,
            "message": "미디어 검색 요청이 성공적으로 처리되었습니다",
            "data": search_results,
            "timestamp": timestamp,
        }

    except Exception as e:
        logger.error(f"❌ 미디어 검색 처리 중 오류: {str(e)}")
        logger.error(traceback.format_exc())
        return {"success": False, "message": f"미디어 검색 처리 중 오류가 발생했습니다: {str(e)}"}

@media_router.post("/assessment", summary="중대성 평가 생성")
async def create_assessment(request: Request):
    """
    새로운 중대성 평가를 생성하는 엔드포인트
    최종 경로: /materiality-service/assessment
    """
    logger.info("📝 중대성 평가 생성 POST 요청 받음")
    try:
        body = await request.json()
        logger.info(f"📥 중대성 평가 생성 요청: {body}")

        # TODO: 실제 중대성 평가 생성 로직 구현

        return {
            "success": True,
            "message": "중대성 평가가 성공적으로 생성되었습니다",
            "assessment_id": "temp_assessment_001",
        }

    except Exception as e:
        logger.error(f"❌ 중대성 평가 생성 중 오류: {str(e)}")
        return {"success": False, "message": f"중대성 평가 생성에 실패했습니다: {str(e)}"}

@media_router.get("/reports", summary="보고서 조회")
async def get_reports(company_id: str | None = None, limit: int = 10):
    """
    중대성 평가 보고서 목록을 조회하는 엔드포인트
    최종 경로: /materiality-service/reports
    """
    logger.info(f"📊 보고서 조회 GET 요청 받음: company_id={company_id}, limit={limit}")
    try:
        # TODO: 실제 보고서 조회 로직 구현

        return {
            "success": True,
            "data": {
                "reports": [],
                "total_count": 0,
                "company_id": company_id,
            },
        }

    except Exception as e:
        logger.error(f"❌ 보고서 조회 중 오류: {str(e)}")
        return {"success": False, "message": f"보고서 조회에 실패했습니다: {str(e)}"}
