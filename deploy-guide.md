# 🚀 GCP 배포 가이드 - 10,000명 이메일 발송 미션

## 📋 **사용자님이 해야 할 설정 작업들**

### **1. GCP 프로젝트 생성 (15분)**
```bash
# 1. GCP Console (console.cloud.google.com) 접속
# 2. 새 프로젝트 생성: "piehands-crm-prod"
# 3. 결제 계정 연결 (무료 크레딧 $300 활용)
```

### **2. 필요한 GCP API 활성화 (5분)**
```bash
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

### **3. Cloud SQL PostgreSQL 생성 (10분)**
```bash
# GCP Console → SQL → 인스턴스 만들기
# - 데이터베이스 엔진: PostgreSQL 15
# - 인스턴스 ID: piehands-db-prod
# - 지역: us-central1
# - 머신 유형: db-f1-micro (시작용) → db-custom-2-4096 (프로덕션)
# - 스토리지: 20GB (시작용) → 100GB (프로덕션)
```

### **4. Secret Manager에 환경 변수 저장 (5분)**
```bash
# SendGrid API Key
gcloud secrets create sendgrid-api-key --data-file=- <<< "SG.YOUR_API_KEY"

# SendGrid From Email  
gcloud secrets create sendgrid-from-email --data-file=- <<< "campaign@yourdomain.com"

# Database URL (Cloud SQL 연결 문자열)
gcloud secrets create database-url --data-file=- <<< "postgresql://username:password@/dbname?host=/cloudsql/piehands-crm-prod:us-central1:piehands-db-prod"
```

### **5. GitHub Repository Secrets 설정 (10분)**
GitHub Repository → Settings → Secrets and variables → Actions:
```
GCP_SA_KEY: [Service Account JSON 키]
VERCEL_TOKEN: [Vercel 배포 토큰] 
VERCEL_ORG_ID: [Vercel 조직 ID]
VERCEL_PROJECT_ID: [Vercel 프로젝트 ID]
```

---

## 🔧 **GCP 서비스 구성 세부사항**

### **💰 비용 추정 (월간)**
| 서비스 | 사양 | 예상 비용 |
|--------|-----|----------|
| **Cloud Run** | 2 CPU, 4GB RAM, 100 req/sec | $50-100 |
| **Cloud SQL** | db-custom-2-4096, 100GB | $150-200 |
| **SendGrid Pro** | 100K emails/month | $90 |
| **기타** | Secret Manager, Monitoring | $20 |
| **총합** | | **$310-410/월** |

### **⚡ 성능 목표**
- **동시 접속**: 100명
- **이메일 발송**: 10,000명/시간 (초당 2.8개)
- **응답 시간**: <500ms (API)
- **가용성**: 99.9% (월 44분 다운타임)

---

## 🚀 **배포 순서**

### **Step 1: 백엔드 배포 (오늘)**
1. GCP 프로젝트 + API 활성화
2. Cloud SQL 생성 + Secret Manager 설정  
3. GitHub push → 자동 배포 트리거
4. Health check 확인: `https://your-service-url/health`

### **Step 2: 프론트엔드 배포 (내일)**
1. Vercel 계정 + 프로젝트 생성
2. Environment Variables: `VITE_API_URL=https://your-backend-url`
3. GitHub push → Vercel 자동 배포

### **Step 3: 통합 테스트 (모레)**
1. 프론트엔드 → 백엔드 API 연결 확인
2. SendGrid 테스트 발송 (본인 이메일)
3. CSV 사용자 import → 10명 캠페인 발송

---

## 🎯 **즉시 시작하시겠습니까?**

제가 지금 배포 설정을 모두 준비해두었습니다:
- ✅ **프로덕션 Docker**: 멀티스테이지 빌드 + 보안 강화
- ✅ **Cloud Build**: 자동 빌드 + Cloud Run 배포
- ✅ **GitHub Actions**: CI/CD 파이프라인
- ✅ **Vercel 설정**: 프론트엔드 배포

**가장 먼저 할 것:**
1. **GCP 프로젝트 생성** (5분)
2. **API 활성화** (5분)  
3. **GitHub에 푸시** → 자동 배포 시작!

시작하시겠습니까? 🚀
