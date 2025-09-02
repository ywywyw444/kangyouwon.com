#!/usr/bin/env python3
"""
Database Migration Script for Materiality Service
Adds content_hash column to surveys table
"""

import os
import sys
import logging
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("❌ psycopg2가 설치되지 않았습니다. 설치해주세요: pip install psycopg2-binary")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """Run the content_hash migration"""
    
    # Get database URL from environment
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        logger.error("❌ DATABASE_URL 환경변수가 설정되지 않았습니다.")
        return False
    
    logger.info(f"🔗 데이터베이스 연결: {DATABASE_URL.split('@')[0]}@***")
    
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Read migration SQL file
        migration_file = Path(__file__).parent / "add_content_hash_to_surveys.sql"
        if not migration_file.exists():
            logger.error(f"❌ 마이그레이션 파일을 찾을 수 없습니다: {migration_file}")
            return False
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        logger.info("🚀 마이그레이션 시작...")
        
        # Execute migration
        cursor.execute(migration_sql)
        
        logger.info("✅ 마이그레이션 완료!")
        
        # Verify the migration
        cursor.execute("""
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'surveys' 
            AND column_name = 'content_hash'
        """)
        
        columns = cursor.fetchall()
        if columns:
            logger.info("🔍 content_hash 컬럼 확인:")
            for col in columns:
                logger.info(f"  - {col[0]}: {col[1]} (nullable: {col[2]})")
        else:
            logger.warning("⚠️ content_hash 컬럼을 찾을 수 없습니다.")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ 마이그레이션 실패: {str(e)}")
        return False

def create_tables():
    """Create surveys and survey_responses tables"""
    
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        logger.error("❌ DATABASE_URL 환경변수가 설정되지 않았습니다.")
        return False
    
    logger.info(f"🔗 데이터베이스 연결: {DATABASE_URL.split('@')[0]}@***")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Read table creation SQL file
        table_file = Path(__file__).parent / "create_surveys_table.sql"
        if not table_file.exists():
            logger.error(f"❌ 테이블 생성 파일을 찾을 수 없습니다: {table_file}")
            return False
        
        with open(table_file, 'r', encoding='utf-8') as f:
            table_sql = f.read()
        
        logger.info("🚀 테이블 생성 시작...")
        
        # Execute table creation
        cursor.execute(table_sql)
        
        logger.info("✅ 테이블 생성 완료!")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ 테이블 생성 실패: {str(e)}")
        return False

def check_surveys_table():
    """Check if surveys table exists and show its structure"""
    
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        logger.error("❌ DATABASE_URL 환경변수가 설정되지 않았습니다.")
        return
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check if surveys table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'surveys'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if table_exists:
            logger.info("✅ surveys 테이블이 존재합니다.")
            
            # Show table structure
            cursor.execute("""
                SELECT 
                    column_name, 
                    data_type, 
                    is_nullable,
                    column_default
                FROM information_schema.columns 
                WHERE table_name = 'surveys'
                ORDER BY ordinal_position;
            """)
            
            columns = cursor.fetchall()
            logger.info("📋 surveys 테이블 구조:")
            for col in columns:
                logger.info(f"  - {col[0]}: {col[1]} (nullable: {col[2]})")
        else:
            logger.warning("⚠️ surveys 테이블이 존재하지 않습니다.")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        logger.error(f"❌ 테이블 확인 실패: {str(e)}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Database Migration for Materiality Service")
    parser.add_argument("--check", action="store_true", help="Check surveys table structure")
    parser.add_argument("--create-tables", action="store_true", help="Create surveys and survey_responses tables")
    parser.add_argument("--migrate", action="store_true", help="Run content_hash migration")
    
    args = parser.parse_args()
    
    if args.check:
        check_surveys_table()
    elif args.create_tables:
        success = create_tables()
        sys.exit(0 if success else 1)
    elif args.migrate:
        success = run_migration()
        sys.exit(0 if success else 1)
    else:
        print("사용법:")
        print("  python run_migration.py --check         # 테이블 구조 확인")
        print("  python run_migration.py --create-tables # 테이블 생성")
        print("  python run_migration.py --migrate       # 마이그레이션 실행")
