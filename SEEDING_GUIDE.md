# 데이터베이스 시딩 가이드 (Database Seeding Guide)

이 문서는 로컬 개발 환경과 Google Cloud Platform (GCP) 환경 각각의 데이터베이스에 초기 데이터를 삽입(seeding)하는 방법을 안내합니다.

---

## 1. 로컬 개발 환경 (Docker) 에 시딩하기

로컬 개발 환경에서는 `docker-compose`를 사용하여 백엔드 애플리케이션과 PostgreSQL 데이터베이스를 함께 실행합니다. 시딩은 이 Docker 환경 안에서 자동으로 처리되거나 수동으로 실행할 수 있습니다.

### 자동 시딩 (권장)

`docker-compose.yml` 파일에 설정된 대로, Docker 컨테이너가 시작될 때 자동으로 데이터베이스 스키마 생성(`db push`)과 데이터 시딩(`prisma:seed`)이 실행됩니다.

**실행 방법:**

프로젝트 루트 디렉토리에서 다음 명령어를 실행하면 됩니다.

```bash
# backend 디렉토리로 이동
cd backend

# docker-compose로 모든 서비스 시작
docker-compose up
```

**작동 원리:**

- `docker-compose.yml` 파일 내의 `app` 서비스에는 `DATABASE_URL`이 Docker 내부의 `postgres` 컨테이너를 가리키도록 하드코딩되어 있습니다.
- `command` 지시어에 `npx prisma db push && npm run prisma:seed`가 포함되어 있어, 앱이 시작되기 전에 스키마 생성과 시딩이 먼저 실행됩니다.

### 수동 시딩

이미 Docker 컨테이너가 실행 중인 상태에서 데이터만 다시 시딩하고 싶을 때 사용합니다.

**실행 방법:**

```bash
# backend 디렉토리로 이동
cd backend

# 실행 중인 app 컨테이너에서 직접 시딩 스크립트 실행
docker-compose exec app npm run prisma:seed
```

---

## 2. GCP Cloud SQL 데이터베이스에 시딩하기

GCP에 배포된 데이터베이스에 직접 데이터를 시딩하는 방법입니다. 이 과정은 여러 단계의 인증과 설정이 필요하므로 주의 깊게 따라야 합니다.

### 사전 준비

1.  **Google Cloud CLI 인증:** `gcloud`와 `firebase` CLI가 모두 인증되어 있어야 합니다.
    ```bash
    gcloud auth login
    gcloud auth application-default login
    firebase login --reauth
    ```
2.  **Cloud SQL 인증 프록시:** 로컬 머신과 GCP 데이터베이스 간의 보안 터널을 생성하는 프록시입니다. [설치 가이드](https://cloud.google.com/sql/docs/postgres/connect-auth-proxy)

### 시딩 절차 (4단계)

#### 1단계: Cloud SQL 인증 프록시 실행

새로운 터미널 창을 열고 다음 명령어를 실행하여 프록시를 시작합니다. 이 터미널은 시딩 작업이 끝날 때까지 열어두어야 합니다.

```bash
# Mac/Linux 기준
/Users/eliott/google-cloud-sdk/bin/cloud-sql-proxy --port=5433 agent-growth-and-ops:us-central1:crm-database
```
- **`--port=5433`**: 로컬 머신의 `5433` 포트를 통해 GCP DB와 연결합니다. (`5432`는 로컬 Docker DB가 사용할 수 있으므로 충돌을 피합니다.)

#### 2단계: 데이터베이스 비밀번호 조회

GCP Secret Manager에 저장된 데이터베이스 사용자(`crm_user`)의 비밀번호를 조회합니다.

```bash
gcloud secrets versions access latest --secret="crm_user_password" --project="agent-growth-and-ops"
```
- 출력되는 긴 문자열이 비밀번호입니다. 복사해두세요. (이하 `[YOUR_DB_PASSWORD]`)

#### 3단계: 데이터베이스 스키마 생성 (`db push`)

**가장 중요한 단계입니다.** 비어있는 GCP 데이터베이스에 Prisma 스키마를 기반으로 모든 테이블 구조를 생성합니다.

`backend` 디렉토리에서 다음 명령어를 실행하세요.

```bash
# backend 디렉토리로 이동
cd backend

# [YOUR_DB_PASSWORD]를 2단계에서 복사한 실제 비밀번호로 교체
DATABASE_URL="postgresql://crm_user:[YOUR_DB_PASSWORD]@127.0.0.1:5433/crm?sslmode=disable" npx prisma db push
```
- `DATABASE_URL=...` : 이 명령어 실행 중에만 환경 변수를 GCP DB 주소로 임시 변경합니다.
- `@127.0.0.1:5433` : 1단계에서 실행한 Cloud SQL 프록시를 가리킵니다.

성공 시 `Your database is now in sync with your Prisma schema.` 메시지가 출력됩니다.

#### 4단계: 데이터 시딩 (`seed`)

이제 테이블이 준비되었으니, 실제 데이터를 삽입합니다.

`backend` 디렉토리에서 다음 명령어를 실행하세요.

```bash
# [YOUR_DB_PASSWORD]를 2단계에서 복사한 실제 비밀번호로 교체
DATABASE_URL="postgresql://crm_user:[YOUR_DB_PASSWORD]@127.0.0.1:5433/crm?sslmode=disable" npm run prisma:seed
```

`Seeding finished.` 메시지가 출력되면 모든 데이터가 GCP 데이터베이스에 성공적으로 삽입된 것입니다.
