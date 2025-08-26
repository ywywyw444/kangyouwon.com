from __future__ import annotations

import os
import json
import logging
from typing import Optional, Tuple, Dict, Any, Union

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# 서비스 URL 매핑 (환경변수 우선)
# ─────────────────────────────────────────────────────────────────────────────
SERVICE_URLS: Dict[str, str] = {
    "auth-service":        os.getenv("AUTH_SERVICE_URL",        "https://auth-service-production-f2ef.up.railway.app"),
    "chatbot-service":     os.getenv("CHATBOT_SERVICE_URL",     "https://chatbot-service-production-93a9.up.railway.app"),
    "gri-service":         os.getenv("GRI_SERVICE_URL",         "https://gri-service-production.up.railway.app"),
    "materiality-service": os.getenv("MATERIALITY_SERVICE_URL", "https://materiality-service-production-0876.up.railway.app"),
    "report-service":      os.getenv("REPORT_SERVICE_URL",      "https://report-service-production.up.railway.app"),
    "tcfd-service":        os.getenv("TCFD_SERVICE_URL",        "https://tcfd-service-production.up.railway.app"),
    "survey-service":      os.getenv("SURVEY_SERVICE_URL",      "https://survey-service-production.up.railway.app"),
}

# '/search' → materiality 별칭 라우팅
ALIAS_TO_SERVICE: Dict[str, str] = {
    "search": "materiality-service",
}

# 🔥 별칭 전용 추가 프리픽스 (서비스 프리픽스 뒤에 붙일 경로)
# 예) /api/v1/search/companies  ->  /materiality-service/**search**/companies
ALIAS_EXTRA_PREFIX: Dict[str, str] = {
    "search": "/search",
}

# 각 서비스가 **백엔드에서 기대하는 프리픽스** (auth처럼 모두 동일 규칙으로 강제)
REQUIRED_PREFIX: Dict[str, str] = {
    "auth-service":        "/auth-service",
    "materiality-service": "/materiality-service",
    "chatbot-service":     "/chatbot-service",
    "gri-service":         "/gri-service",
    "report-service":      "/report-service",
    "tcfd-service":        "/tcfd-service",
    "survey-service":      "/survey-service",
}

# 제거할 hop-by-hop 헤더(대소문자 무시)
HOP_BY_HOP_HEADERS = {
    "host",
    "connection",
    "keep-alive",
    "proxy-connection",
    "transfer-encoding",
    "upgrade",
    "expect",
    "te",
    "trailer",
}

# ─────────────────────────────────────────────────────────────────────────────
# httpx.AsyncClient 재사용 (모듈 단위 싱글톤)
# ─────────────────────────────────────────────────────────────────────────────
_CLIENT: Optional[httpx.AsyncClient] = None

async def get_client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
        )
    return _CLIENT

async def close_client() -> None:
    global _CLIENT
    if _CLIENT is not None:
        await _CLIENT.aclose()
        _CLIENT = None

# ─────────────────────────────────────────────────────────────────────────────
# 유틸
# ─────────────────────────────────────────────────────────────────────────────
def join_url(base: str, path: str) -> str:
    """이중 슬래시 방지하고 안전하게 합치기"""
    base_clean = base.rstrip("/")
    path_clean = path if path.startswith("/") else f"/{path}"
    return f"{base_clean}{path_clean}"

def strip_hop_by_hop_headers(headers: Optional[Dict[str, str]]) -> Dict[str, str]:
    if not headers:
        return {}
    cleaned: Dict[str, str] = {}
    for k, v in headers.items():
        if k.lower() not in HOP_BY_HOP_HEADERS:
            cleaned[k] = v
    return cleaned

def prepare_request_kwargs(
    method: str,
    url: str,
    headers: Optional[Dict[str, str]],
    body: Optional[Union[str, Dict[str, Any], list]]
) -> Dict[str, Any]:
    req_headers = strip_hop_by_hop_headers(headers)
    kwargs: Dict[str, Any] = {"method": method, "url": url, "headers": req_headers}

    if body is None:
        return kwargs

    if isinstance(body, (dict, list)):
        kwargs["json"] = body
    else:
        kwargs["content"] = body
        if not any(k.lower() == "content-type" for k in req_headers):
            req_headers["Content-Type"] = "application/json"
    return kwargs

def parse_gateway_path(path: str) -> Tuple[Optional[str], str]:
    """
    게이트웨이로 들어온 경로를 서비스명/실경로로 분해.
    - "/auth-service/login"         -> ("auth-service", "/login")
    - "/materiality-service/news"   -> ("materiality-service", "/news")
    - "/search?q=..."               -> ("search", "/")
    - "/" 또는 ""                    -> (None, "/")
    """
    raw = (path or "").strip()
    if raw == "" or raw == "/":
        return None, "/"

    parts = raw.strip("/").split("/")
    first = parts[0] if parts else None
    rest = "/" + "/".join(parts[1:]) if len(parts) > 1 else "/"
    return first, rest

def ensure_required_prefix(service_name: str, path: str) -> str:
    """
    각 서비스가 **백엔드에서 기대하는 고정 프리픽스**(REQUIRED_PREFIX)를 보장.
    auth-service 방식과 동일: 없으면 붙여준다.
    """
    required = REQUIRED_PREFIX.get(service_name)
    if not required:
        # 혹시 딕셔너리에 없으면 기본 규칙(/service-name)을 사용
        required = f"/{service_name}"

    if path.startswith(required):
        return path
    # path가 이미 '/'로 시작하므로 required + path
    return f"{required}{path}"

def prepend_path(prefix: str, path: str) -> str:
    """prefix와 path를 안전하게 이어붙임 (중복 슬래시 방지)"""
    if not prefix:
        return path
    p1 = prefix.rstrip("/")
    p2 = path if path.startswith("/") else f"/{path}"
    return f"{p1}{p2}"

# ─────────────────────────────────────────────────────────────────────────────
# ServiceProxyFactory: 직접 서비스명 알고 있을 때 쓰는 경량 프록시
# ─────────────────────────────────────────────────────────────────────────────
class ServiceProxyFactory:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.base_url = SERVICE_URLS.get(service_name)
        if not self.base_url:
            raise ValueError(f"Service {service_name} not found in SERVICE_URLS")
        logger.info(f"🔗 Service URL: {self.base_url}")

    async def request(
        self,
        method: str,
        path: str,
        headers: Optional[dict] = None,
        body: Optional[Union[str, Dict[str, Any], list]] = None
    ) -> httpx.Response:
        # 직접 호출 시에도 서비스 고정 프리픽스를 강제하여 일관성 유지
        path_with_prefix = ensure_required_prefix(self.service_name, path)
        url = join_url(self.base_url, path_with_prefix)

        logger.info(f"➡️  Proxy → {self.service_name}: {method} {url} (orig_path={path})")

        client = await get_client()
        try:
            req_kwargs = prepare_request_kwargs(method, url, headers, body)
            if body:
                logger.debug(f"Request body: {body if isinstance(body, str) else json.dumps(body, ensure_ascii=False)}")
            resp = await client.request(**req_kwargs)
            logger.info(f"⬅️  {self.service_name} status: {resp.status_code}")
            return resp
        except Exception as e:
            logger.exception(f"Request failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────────────
# SimpleServiceFactory: 게이트웨이 경로를 보고 라우팅/프록시
# ─────────────────────────────────────────────────────────────────────────────
class SimpleServiceFactory:
    def __init__(self):
        self.service_urls = SERVICE_URLS
        logger.info(f"🔧 Loaded services: {list(self.service_urls.keys())}")

    async def forward_request(
        self,
        method: str,
        path: str,
        headers: Optional[Dict[str, str]] = None,
        body: Optional[Union[str, Dict[str, Any], list]] = None,
    ) -> Dict[str, Any]:
        try:
            service_name, actual_path = parse_gateway_path(path)

            # 루트로 들어오면 간단 응답
            if service_name is None:
                logger.info("🌐 Gateway root requested; returning simple health response.")
                return {"status_code": 200, "data": {"ok": True, "gateway": "up"}}

            # 별칭 → 실제 서비스명 매핑 (예: /search → materiality-service)
            if service_name in ALIAS_TO_SERVICE:
                mapped = ALIAS_TO_SERVICE[service_name]
                logger.info(f"🔁 Alias mapping: '{service_name}' → '{mapped}'")
                # ✅ 별칭 전용 추가 프리픽스 적용 (예: '/search')
                extra = ALIAS_EXTRA_PREFIX.get(service_name, "")
                actual_path = prepend_path(extra, actual_path)  # '/companies' -> '/search/companies'
                service_name = mapped

            # 서비스별 전용/제너릭 분기 (모두 동일 규칙: 서비스 프리픽스 보장)
            if service_name == "auth-service":
                return await self._handle_known_service("auth-service", method, actual_path, headers, body)
            elif service_name == "materiality-service":
                return await self._handle_known_service("materiality-service", method, actual_path, headers, body)
            elif service_name in {"chatbot-service", "gri-service", "report-service", "tcfd-service", "survey-service"}:
                return await self._handle_known_service(service_name, method, actual_path, headers, body)
            else:
                # 미등록 서비스명일 경우도 동일 로직으로 시도 (URL이 있으면 진행)
                return await self._handle_known_service(service_name, method, actual_path, headers, body)

        except Exception as e:
            logger.exception(f"❌ Forward failed: {e}")
            return {"error": True, "detail": str(e)}

    async def _handle_known_service(
        self,
        service_name: str,
        method: str,
        raw_path: str,
        headers: Optional[Dict[str, str]] = None,
        body: Optional[Union[str, Dict[str, Any], list]] = None,
    ) -> Dict[str, Any]:
        service_url = self.service_urls.get(service_name)
        if not service_url:
            logger.error(f"❌ Unknown service: {service_name}")
            return {"error": True, "status_code": 404, "detail": f"Service {service_name} not found"}

        # ✅ 핵심: "해당 서비스가 기대하는 프리픽스"를 반드시 붙인다 (auth 방식과 동일)
        path_with_prefix = ensure_required_prefix(service_name, raw_path)
        url = join_url(service_url, path_with_prefix)

        logger.info(f"➡️  Gateway → {service_name}: {method} {url} (orig_path={raw_path})")

        client = await get_client()
        try:
            req_kwargs = prepare_request_kwargs(method, url, headers, body)
            resp = await client.request(**req_kwargs)
            logger.info(f"⬅️  {service_name} status: {resp.status_code}")

            return await self._to_dict_response(resp)
        except Exception as e:
            logger.exception(f"❌ {service_name} request failed: {e}")
            return {"error": True, "detail": str(e)}

    # ────────────── 공통 응답 변환 ──────────────
    @staticmethod
    async def _to_dict_response(resp: httpx.Response) -> Dict[str, Any]:
        if resp.status_code < 400:
            try:
                return {"status_code": resp.status_code, "data": resp.json()}
            except Exception:
                return {"status_code": resp.status_code, "data": resp.text}
        else:
            return {"error": True, "status_code": resp.status_code, "detail": resp.text}