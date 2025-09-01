from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class SurveyCategorySchema(BaseModel):
    """설문 카테고리 스키마"""
    category_name: str = Field(..., description="카테고리명")
    esg_classification: str = Field(..., description="ESG 분류")
    rank: int = Field(..., description="순위")
    score: float = Field(..., description="점수")
    question_number: int = Field(..., description="질문 번호")

class SurveyParticipantSchema(BaseModel):
    """설문 참여자 스키마"""
    name: str = Field(..., description="참여자 이름")
    company: str = Field(..., description="참여자 회사")
    position: str = Field(..., description="참여자 직책")
    email: str = Field(..., description="참여자 이메일")

class SurveyResponseSchema(BaseModel):
    """설문 응답 스키마"""
    category_name: str = Field(..., description="카테고리명")
    score: int = Field(..., ge=1, le=5, description="응답 점수 (1-5)")
    comment: Optional[str] = Field(None, description="추가 의견")

class SurveyCreateRequest(BaseModel):
    """설문 생성 요청 스키마"""
    corporation_id: str = Field(..., description="회사 ID")
    categories: List[SurveyCategorySchema] = Field(..., description="설문 카테고리 목록")
    excel_data: Optional[Dict[str, Any]] = Field(None, description="엑셀 데이터")

class SurveyResponseRequest(BaseModel):
    """설문 응답 요청 스키마"""
    survey_id: str = Field(..., description="설문 ID")
    corporation_id: str = Field(..., description="회사 ID")
    participant: SurveyParticipantSchema = Field(..., description="참여자 정보")
    responses: List[SurveyResponseSchema] = Field(..., description="응답 목록")

class SurveyDataResponse(BaseModel):
    """설문 데이터 응답 스키마"""
    survey_id: str = Field(..., description="설문 ID")
    corporation_id: str = Field(..., description="회사 ID")
    timestamp: datetime = Field(..., description="생성 시간")
    total_categories: int = Field(..., description="총 카테고리 수")
    categories: List[Dict[str, Any]] = Field(..., description="카테고리 데이터")
    excel_data: Optional[Dict[str, Any]] = Field(None, description="엑셀 데이터")

class SurveyResponsesResponse(BaseModel):
    """설문 응답 목록 응답 스키마"""
    survey_id: str = Field(..., description="설문 ID")
    corporation_id: str = Field(..., description="회사 ID")
    total_responses: int = Field(..., description="총 응답 수")
    responses: List[Dict[str, Any]] = Field(..., description="응답 목록")

class SurveyListResponse(BaseModel):
    """설문 목록 응답 스키마"""
    surveys: List[SurveyDataResponse] = Field(..., description="설문 목록")
    total_count: int = Field(..., description="총 설문 수")
