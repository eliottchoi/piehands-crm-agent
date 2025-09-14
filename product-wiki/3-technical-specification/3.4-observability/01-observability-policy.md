# 3.4.1. 관측 가능성 정책 (Observability Policy)

## 1. 개요

안정적이고 신뢰할 수 있는 서비스를 제공하기 위해, 본 문서는 시스템의 상태를 효과적으로 파악하고 문제 발생 시 신속하게 대응하기 위한 로깅, 모니터링, 에러 트래킹 정책을 정의합니다.

## 2. 로깅 (Logging)

모든 로그는 **Google Cloud Logging**을 통해 수집 및 관리하며, JSON 형식으로 구조화하여 기록합니다.

- **로그 레벨 (Log Level)**: `INFO`, `WARN`, `ERROR`, `FATAL`
- **핵심 포함 정보**:
  - `timestamp`: 로그 생성 시간
  - `severity`: 로그 레벨
  - `message`: 로그 메시지
  - `traceId`: 분산 추적을 위한 고유 ID. API 요청 시작 시 생성되어 모든 하위 작업(Task, DB 쿼리 등)에 전파됩니다.
  - `serviceName`: 로그를 생성한 서비스 이름 (예: `api-server`, `campaign-worker`)
  - `context`: 구체적인 작업 컨텍스트 정보 (예: `userId`, `campaignId`, `nodeId`)

- **로그 기록 시점**:
  - `INFO`: 주요 비즈니스 로직의 시작과 끝 (예: `캠페인 여정 시작`, `이메일 발송 완료`)
  - `WARN`: 예상치 못한 상황이지만, 시스템 장애로 이어지지는 않는 경우 (예: `외부 API 응답 지연`)
  - `ERROR`: 처리 중 발생한 오류. 재시도가 필요한 경우 (예: `DB 연결 실패`)
  - `FATAL`: 프로세스를 즉시 중단시켜야 하는 심각한 오류

## 3. 모니터링 (Monitoring)

시스템의 상태와 성능 지표는 **Google Cloud Monitoring**을 통해 수집하고, 대시보드를 구성하여 시각화합니다.

- **핵심 모니터링 지표 (Metrics)**:
  - **API 서버 (Cloud Run)**:
    - 요청 수 (Request Count)
    - 5xx 에러 비율 (Error Rate)
    - 응답 지연 시간 (Latency, 95th percentile)
    - 컨테이너 인스턴스 수, CPU/메모리 사용률
  - **데이터베이스 (Cloud SQL & Firestore)**:
    - CPU/메모리 사용률, 활성 연결(Connection) 수
    - 읽기/쓰기 작업 수 및 지연 시간
  - **태스크 큐 (Cloud Tasks)**:
    - 큐에 쌓인 작업 수 (Queue Depth)
    - 초당 실행되는 태스크 수 (Dispatch Rate)
    - 실패율 (Failure Rate)

- **알림 (Alerting)**:
  - 주요 지표가 사전 정의된 임계값(Threshold)을 초과할 경우, PagerDuty 또는 Slack을 통해 담당자에게 즉시 알림을 보냅니다.
  - **알림 조건 예시**: `API 서버의 5xx 에러 비율이 5분 동안 1% 이상일 경우`

## 4. 에러 트래킹 (Error Tracking)

애플리케이션 코드 레벨에서 발생하는 모든 예외(Exception)는 **Sentry**를 통해 수집하고 관리합니다.

- **수집 대상**:
  - 처리되지 않은 모든 예외 (Unhandled Exceptions)
  - `try-catch` 문으로 잡았으나, 비즈니스 로직 상 문제가 되는 예외 (예: `외부 API 인증 실패`)
- **에러 리포트 포함 정보**:
  - `traceId`, `userId`, `context` 등 로그와 동일한 컨텍스트 정보
  - 전체 스택 트레이스 (Stack Trace)
  - 요청 파라미터 및 헤더 정보
- **운영**: 동일한 유형의 에러는 그룹화하여 관리하며, 새로운 에러 발생 시 즉시 담당자에게 알림을 보내 신속한 원인 분석 및 해결을 지원합니다.
