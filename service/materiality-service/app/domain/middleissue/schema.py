"""
Middleissue Schema - Pydantic BaseModel
Entity의 Base를 직접 매핑하는 스키마 및 응답용 스키마
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Article(BaseModel):
    """크롤링된 기사 데이터 스키마"""
    company: str
    issue: Optional[str] = None
    original_category: Optional[str] = None
    query_kind: Optional[str] = None
    keyword: Optional[str] = None
    title: str
    description: str
    pubDate: Optional[str] = None
    originallink: Optional[str] = None

class MiddleIssueRequest(BaseModel):
    """중간 이슈 요청 스키마"""
    company_id: str
    report_period: dict
    request_type: str = "middleissue_assessment"
    timestamp: str = datetime.now().isoformat()
    articles: List[Article] = []
    total_results: int = 0

class MiddleIssueResponse(BaseModel):
    """중간 이슈 응답 스키마"""
    success: bool
    message: str
    data: Optional[dict] = None

class MiddleIssueBase(BaseModel):
    """중간 이슈 기본 스키마 - Entity와 1:1 매핑"""
    id: Optional[int] = None
    corporation_id: int
    publish_year: Optional[int] = None
    ranking: int
    base_issue_pool: str
    issue_pool: str
    category_id: int
    esg_classification_id: int

    class Config:
        orm_mode = True

class IssueItem(BaseModel):
    """이슈 항목 응답 스키마"""
    category_id: int
    base_issue_pool: str

class CorporationIssueResponse(BaseModel):
    """기업별 이슈 응답 스키마"""
    year_issues: List[IssueItem]  # 특정 연도 이슈
    common_issues: List[IssueItem]  # publish_year가 null인 이슈

    class Config:
        orm_mode = True