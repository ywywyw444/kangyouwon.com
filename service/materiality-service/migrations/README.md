# Database Migrations

이 디렉토리는 Materiality Service의 데이터베이스 마이그레이션 스크립트를 포함합니다.

## 현재 마이그레이션

### 1. content_hash 컬럼 추가 (add_content_hash_to_surveys.sql)

**목적**: 설문 내용 중복 방지를 위한 `content_hash` 컬럼 추가

**변경사항**:
- `surveys` 테이블에 `content_hash VARCHAR(255)` 컬럼 추가
- `content_hash` 컬럼에 인덱스 추가 (성능 최적화)
- 기존 데이터와의 호환성 보장

**영향받는 테이블**:
- `surveys` 테이블

## 마이그레이션 실행 방법

### 방법 1: 스크립트 사용 (권장)

#### Linux/Mac:
```bash
cd service/materiality-service
chmod +x migrate.sh
./migrate.sh
```

#### Windows:
```cmd
cd service\materiality-service
migrate.bat
```

### 방법 2: Python 스크립트 직접 실행

```bash
cd service/materiality-service

# 테이블 구조 확인
python migrations/run_migration.py --check

# 마이그레이션 실행
python migrations/run_migration.py --migrate
```

### 방법 3: SQL 직접 실행

PostgreSQL 클라이언트에서 직접 실행:
```sql
-- migrations/add_content_hash_to_surveys.sql 파일의 내용을 복사하여 실행
```

## 마이그레이션 전 확인사항

1. **환경변수 설정**: `DATABASE_URL`이 올바르게 설정되어 있는지 확인
2. **데이터베이스 연결**: 데이터베이스에 접근 가능한지 확인
3. **백업**: 중요한 데이터가 있다면 마이그레이션 전 백업 수행

## 마이그레이션 후 확인사항

1. **컬럼 추가 확인**: `content_hash` 컬럼이 정상적으로 추가되었는지 확인
2. **인덱스 생성 확인**: `idx_surveys_content_hash` 인덱스가 생성되었는지 확인
3. **애플리케이션 테스트**: 설문 생성 및 조회 기능이 정상 작동하는지 확인

## 롤백 방법

만약 마이그레이션을 되돌려야 하는 경우:

```sql
-- content_hash 컬럼 제거 (주의: 데이터 손실)
ALTER TABLE surveys DROP COLUMN IF EXISTS content_hash;
DROP INDEX IF EXISTS idx_surveys_content_hash;
```

## 문제 해결

### 일반적인 오류

1. **DATABASE_URL 오류**: 환경변수가 올바르게 설정되어 있는지 확인
2. **권한 오류**: 데이터베이스 사용자가 테이블 수정 권한을 가지고 있는지 확인
3. **연결 오류**: 데이터베이스 서버가 실행 중이고 접근 가능한지 확인

### 로그 확인

마이그레이션 실행 시 상세한 로그가 출력됩니다. 오류가 발생하면 로그를 확인하여 문제를 진단하세요.

## 향후 마이그레이션

새로운 마이그레이션이 필요한 경우:

1. `migrations/` 디렉토리에 새로운 SQL 파일 생성
2. `run_migration.py` 스크립트에 새로운 마이그레이션 로직 추가
3. 테스트 환경에서 먼저 검증
4. 프로덕션 환경에 적용
