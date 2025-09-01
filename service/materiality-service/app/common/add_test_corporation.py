#!/usr/bin/env python3
"""
테스트용 corporation 데이터 추가 스크립트
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from datetime import datetime

# 프로젝트 루트 경로를 Python 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def add_test_corporation():
    """테스트용 corporation 데이터 추가"""
    # Railway PostgreSQL 연결 정보
    database_url = "postgresql://postgres:ZzfwBnlMFrPIUpGsleepqCrOrEVJCbAK@trolley.proxy.rlwy.net:52468/railway"
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # 테스트용 corporation 데이터 추가
            test_corporations = [
                {
                    "id": "test_company",
                    "name": "테스트 회사",
                    "industry": "IT",
                    "created_at": datetime.now()
                },
                {
                    "id": "sample_corp",
                    "name": "샘플 기업",
                    "industry": "제조업",
                    "created_at": datetime.now()
                }
            ]
            
            for corp in test_corporations:
                # 기존 데이터 확인
                result = conn.execute(text("SELECT COUNT(*) FROM corporation WHERE id = :id"), {"id": corp["id"]})
                count = result.fetchone()[0]
                
                if count == 0:
                    # 새 데이터 삽입
                    conn.execute(text("""
                        INSERT INTO corporation (id, name, industry, created_at)
                        VALUES (:id, :name, :industry, :created_at)
                    """), corp)
                    print(f"✅ 테스트 corporation 추가: {corp['id']} - {corp['name']}")
                else:
                    print(f"⚠️ 이미 존재하는 corporation: {corp['id']}")
            
            conn.commit()
            
            # 결과 확인
            result = conn.execute(text("SELECT COUNT(*) FROM corporation"))
            total_count = result.fetchone()[0]
            print(f"📊 총 corporation 수: {total_count}")
            
            return True
            
    except Exception as e:
        print(f"❌ 테스트 corporation 추가 실패: {e}")
        return False

if __name__ == "__main__":
    print("🧪 테스트용 corporation 데이터 추가 시작...")
    if add_test_corporation():
        print("✨ 테스트용 corporation 데이터 추가 완료!")
    else:
        print("💥 테스트용 corporation 데이터 추가 실패!")
