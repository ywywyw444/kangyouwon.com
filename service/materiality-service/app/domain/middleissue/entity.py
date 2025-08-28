"""
Middleissue Domain Entity - SQLAlchemy 모델
"""
from sqlalchemy import Column, Integer, Text, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base

# Base 클래스 정의
Base = declarative_base()

class MiddleIssueEntity(Base):
    """중간 이슈 SQLAlchemy 모델"""
    __tablename__ = "issuepool"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    corporation_id = Column(Integer, ForeignKey("corporation.id"), nullable=False)
    publish_year = Column(Integer, nullable=False)
    ranking = Column(Integer, nullable=False)
    base_issue_pool = Column(Text, nullable=False)
    issue_pool = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("materiality_category.id"), nullable=False)
    esg_classification_id = Column(Integer, ForeignKey("esg_classification.id"), nullable=False)

class CorporationEntity(Base):
    """기업 정보 SQLAlchemy 모델"""
    __tablename__ = "corporation"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    corp_code = Column(String(100), nullable=False)
    companyname = Column(String(100), nullable=False)  # corporation_name에서 companyname으로 변경
    market = Column(String(100), nullable=False)
    dart_code = Column(String(100), nullable=False)

class ESGClassificationEntity(Base):
    """ESG 분류 SQLAlchemy 모델"""
    __tablename__ = "esg_classification"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    classification_name = Column(String(100), nullable=False)
    classification_type = Column(String(50), nullable=False)