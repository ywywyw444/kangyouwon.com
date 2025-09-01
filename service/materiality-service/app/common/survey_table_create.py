#!/usr/bin/env python3
"""
설문 데이터베이스 테이블 생성 스크립트

사용법:
    python -m app.common.survey_table_create

또는 직접 실행:
    python survey_table_create.py
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

# 프로젝트 루트 경로를 Python 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.common.database.survey_db import test_connection, create_tables, drop_tables

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def create_survey_tables():
    """설문 관련 테이블 생성"""
    try:
        logger.info("🚀 설문 데이터베이스 테이블 생성을 시작합니다...")
        
        # 데이터베이스 연결 테스트
        if not await test_connection():
            logger.error("❌ 데이터베이스 연결에 실패했습니다.")
            return False
        
        # 테이블 생성
        if await create_tables():
            logger.info("✅ 설문 데이터베이스 테이블 생성이 완료되었습니다!")
            return True
        else:
            logger.error("❌ 테이블 생성에 실패했습니다.")
            return False
        
    except Exception as e:
        logger.error(f"❌ 테이블 생성 중 오류가 발생했습니다: {e}")
        return False

async def drop_survey_tables():
    """설문 관련 테이블 삭제 (주의: 모든 데이터가 손실됩니다)"""
    try:
        logger.warning("⚠️ 설문 관련 테이블을 삭제합니다. 모든 데이터가 손실됩니다!")
        
        confirm = input("정말로 테이블을 삭제하시겠습니까? (yes/no): ")
        if confirm.lower() != 'yes':
            logger.info("테이블 삭제가 취소되었습니다.")
            return False
        
        # 데이터베이스 연결 테스트
        if not await test_connection():
            logger.error("❌ 데이터베이스 연결에 실패했습니다.")
            return False
        
        # 테이블 삭제
        if await drop_tables():
            logger.info("✅ 설문 데이터베이스 테이블 삭제가 완료되었습니다!")
            return True
        else:
            logger.error("❌ 테이블 삭제에 실패했습니다.")
            return False
        
    except Exception as e:
        logger.error(f"❌ 테이블 삭제 중 오류가 발생했습니다: {e}")
        return False

def show_table_info():
    """테이블 정보 표시"""
    try:
        logger.info("📋 설문 데이터베이스 테이블 정보:")
        
        # surveys 테이블 정보
        logger.info("""
        📊 surveys 테이블:
        - survey_id (String, PK): 설문 고유 ID
        - corporation_id (String, FK): 회사 ID (corporation.id 참조, 외래키 제약조건)
        - timestamp (DateTime): 설문 생성 시간
        - total_categories (Integer): 총 카테고리 수
        - categories (JSON): 카테고리 데이터
        - excel_data (JSON): 엑셀 데이터
        - created_at (DateTime): 생성 시간
        - updated_at (DateTime): 수정 시간
        
        🔗 외래키 관계:
        - corporation_id → corporation.id (기업 정보 테이블)
        """)
        
        # survey_responses 테이블 정보
        logger.info("""
        📝 survey_responses 테이블:
        - id (Integer, PK, Auto): 응답 고유 ID
        - participant_id (String): 참여자 ID
        - survey_id (String, FK): 설문 ID (surveys.survey_id 참조, 외래키 제약조건)
        - corporation_id (String, FK): 회사 ID (corporation.id 참조, 외래키 제약조건)
        - participant_name (String): 참여자 이름
        - participant_company (String): 참여자 회사
        - participant_position (String): 참여자 직책
        - participant_email (String): 참여자 이메일
        - responses (JSON): 응답 데이터
        - timestamp (DateTime): 응답 시간
        - created_at (DateTime): 생성 시간
        - updated_at (DateTime): 수정 시간
        
        🔗 외래키 관계:
        - survey_id → surveys.survey_id (설문 테이블)
        - corporation_id → corporation.id (기업 정보 테이블)
        """)
        
        # 데이터 무결성 정보
        logger.info("""
        🛡️ 데이터 무결성 보장:
        - 설문 생성 시 corporation_id가 corporation 테이블에 존재해야 함
        - 응답 제출 시 survey_id와 corporation_id가 모두 유효해야 함
        - 존재하지 않는 기업 ID나 설문 ID 사용 시 오류 발생
        """)
        
    except Exception as e:
        logger.error(f"❌ 테이블 정보 표시 중 오류가 발생했습니다: {e}")

async def main():
    """메인 함수"""
    logger.info("🔧 설문 데이터베이스 관리 도구")
    logger.info("=" * 50)
    
    while True:
        print("\n사용 가능한 작업:")
        print("1. 설문 테이블 생성")
        print("2. 설문 테이블 삭제 (주의: 모든 데이터 손실)")
        print("3. 테이블 정보 보기")
        print("4. 종료")
        
        choice = input("\n작업을 선택하세요 (1-4): ").strip()
        
        if choice == '1':
            if await create_survey_tables():
                logger.info("🎉 테이블 생성이 성공적으로 완료되었습니다!")
            else:
                logger.error("💥 테이블 생성에 실패했습니다.")
        
        elif choice == '2':
            if await drop_survey_tables():
                logger.info("🗑️ 테이블 삭제가 성공적으로 완료되었습니다!")
            else:
                logger.error("💥 테이블 삭제에 실패했습니다.")
        
        elif choice == '3':
            show_table_info()
        
        elif choice == '4':
            logger.info("👋 프로그램을 종료합니다.")
            break
        
        else:
            logger.warning("⚠️ 잘못된 선택입니다. 1-4 중에서 선택해주세요.")

if __name__ == "__main__":
    # 비동기 메인 함수 실행
    asyncio.run(main())
