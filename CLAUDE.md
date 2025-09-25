# Piehands CRM - Claude Instructions

## 🚨 Docker 빌드 및 배포 절대 규칙 (M1/M2 Mac)

### ⛔ 절대 하지 말아야 할 것들
1. **NEVER** use `docker buildx` for production deployments
2. **NEVER** add `--platform` flag in Dockerfile FROM statements
3. **NEVER** use just `docker build` without platform flag on M1/M2 Macs
4. **NEVER** deploy without verifying the image architecture first

### ✅ 반드시 따라야 할 배포 프로세스

#### 1. 이미지 빌드 (M1/M2 Mac)
```bash
# 반드시 이 명령어만 사용!
docker build --platform linux/amd64 -t piehands-crm-backend .

# 절대 사용하지 말 것:
# ❌ docker build -t piehands-crm-backend .
# ❌ docker buildx build --platform linux/amd64 ...
```

#### 2. 아키텍처 검증 (필수!)
```bash
# 빌드 후 반드시 확인
docker image inspect piehands-crm-backend --format='{{.Architecture}}'
# 출력이 "amd64"여야만 진행
```

#### 3. 태그 및 푸시
```bash
docker tag piehands-crm-backend gcr.io/agent-growth-and-ops/piehands-crm-backend:latest
docker push gcr.io/agent-growth-and-ops/piehands-crm-backend:latest
```

#### 4. 배포
```bash
gcloud run deploy piehands-crm-backend \
  --region=us-central1 \
  --image=gcr.io/agent-growth-and-ops/piehands-crm-backend:latest \
  --project=agent-growth-and-ops
```

#### 5. 트래픽 전환 확인
```bash
# 배포 후 반드시 실행 - 새 리비전이 트래픽을 받지 못할 수 있음
gcloud run services update-traffic piehands-crm-backend \
  --to-latest \
  --region=us-central1 \
  --project=agent-growth-and-ops
```

### 🔍 배포 실패 시 체크리스트
1. **exec format error** 발생 시:
   - Docker 캐시 완전 제거: `docker system prune -a -f`
   - 다시 빌드: `docker build --platform linux/amd64 -t piehands-crm-backend .`
   - 아키텍처 확인: `docker image inspect piehands-crm-backend --format='{{.Architecture}}'`

2. **새 리비전이 생성되었지만 트래픽을 받지 못할 때**:
   - 리비전 상태 확인: `gcloud run revisions list --service=piehands-crm-backend --region=us-central1`
   - 트래픽 강제 전환: `gcloud run services update-traffic piehands-crm-backend --to-latest --region=us-central1`

3. **Dockerfile 규칙**:
   - ❌ 절대 사용 금지: `FROM --platform=linux/amd64 node:20-slim`
   - ✅ 올바른 사용: `FROM node:20-slim`
   - 플랫폼 지정은 오직 `docker build` 명령어에서만!

### 🔍 GCP 리소스 확인 방법
**기존 Artifact Registry/Container Registry 확인:**
```bash
gcloud artifacts repositories list
```

**현재 사용 중인 저장소:**
- `gcr.io` (Google Container Registry) - agent-growth-and-ops 프로젝트
- 새로운 Artifact Registry가 아닌 기존 GCR 사용

**올바른 이미지 태그 형식:**
```bash
# GCR 사용 (현재 설정)
gcr.io/agent-growth-and-ops/piehands-crm-backend:latest

# Artifact Registry 사용 시 (향후 마이그레이션)
us-central1-docker.pkg.dev/agent-growth-and-ops/[REPOSITORY]/backend:latest
```

### CORS 설정
Frontend URL이 변경될 때마다 backend의 `src/main.ts`에서 CORS origin 목록을 업데이트해야 합니다:
```typescript
app.enableCors({
  origin: [
    'http://localhost:5173',
    'https://piehands-crm.web.app',
    'https://piehands-crm.firebaseapp.com',
    'https://piehands-crm-app.web.app'  // 새 도메인 추가
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
});
```

## Frontend 환경변수 설정

### 주의사항
- 환경변수 이름: `VITE_API_BASE_URL` (VITE_API_URL 아님)
- `.env.production`과 `.env.production.local` 파일 모두 확인
- `.env.production.local`이 `.env.production`을 덮어쓸 수 있음

**올바른 설정:**
```
VITE_API_BASE_URL=https://crm-backend-gbhojycnbq-uc.a.run.app
```

## 배포된 서비스
- Backend: https://crm-backend-gbhojycnbq-uc.a.run.app
- Frontend: https://piehands-crm-app.web.app
- Database: Cloud SQL PostgreSQL (agent-growth-and-ops:us-central1:piehands-crm-db)