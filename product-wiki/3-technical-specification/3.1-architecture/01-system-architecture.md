# 3.1.1. 시스템 아키텍처 (하이브리드 DB 모델)

이 문서는 파이핸즈 CRM 플랫폼의 전체 시스템 구성과 구성 요소 간의 상호작용, 그리고 주요 기술 정책을 정의합니다. 본 아키텍처는 데이터의 성격에 따라 최적의 데이터베이스를 사용하는 **"목적에 맞는 데이터베이스(Polyglot Persistence)"** 접근법을 따릅니다.

## 1. 시스템 구성 요소 다이어그램

```mermaid
graph TD
    subgraph "사용자 인터페이스 (Client)"
        WebApp[Web UI<br>(React on Firebase Hosting)]
    end

    subgraph "API & 로직 (Backend on Google Cloud)"
        ApiServer[API 서버<br>(Cloud Run)]
        TaskQueueHigh[우선순위 큐 (High)<br>(Cloud Tasks)]
        TaskQueueDefault[일반 큐 (Default)<br>(Cloud Tasks)]
        Worker[백그라운드 워커<br>(Cloud Run)]
    end

    subgraph "데이터 저장소 (Databases)"
        RDBMS[<b>Cloud SQL (PostgreSQL)</b><br>Users, Workspaces, Campaigns, Templates]
        NoSQL[<b>Firestore</b><br>Events, Enrollments, Canvas Definitions]
    end

    subgraph "외부 서비스 (External Services)"
        Auth[Firebase Auth]
        SendGrid[SendGrid API]
        Mixpanel[Mixpanel API]
    end

    WebApp -- HTTPS API Request --> ApiServer
    ApiServer -- User Auth --> Auth
    ApiServer -- Create Task --> TaskQueueHigh & TaskQueueDefault
    
    ApiServer -- CRUD (정형 데이터) --> RDBMS
    ApiServer -- Read/Write (비정형 데이터) --> NoSQL

    TaskQueueHigh & TaskQueueDefault -- Trigger --> Worker

    Worker -- Send Email --> SendGrid
    Worker -- Track Event --> Mixpanel
    Worker -- Read (정형) --> RDBMS
    Worker -- Write (로그) --> NoSQL
```

## 2. 데이터베이스 역할 분담

/* --- Backend Note ---
**결정 배경:** 초기에는 단일 Firestore 모델을 고려했으나, CRM의 핵심인 유저 및 워크스페이스 데이터의 정합성과 관계 표현의 중요성을 고려하여 하이브리드 모델로 전환합니다. 관계형 데이터베이스(PostgreSQL)가 데이터 무결성을 보장하고, NoSQL(Firestore)이 대규모 이벤트 로그의 확장성을 담당함으로써, 두 시스템의 장점을 모두 활용합니다.
*/

- **Cloud SQL (PostgreSQL): 정형 데이터 및 관계 관리**
  - **대상:** `users`, `workspaces`, `campaigns` (메타데이터), `templates` 등 스키마가 명확하고 관계가 중요한 핵심 데이터.
  - **역할:** 엄격한 스키마, 트랜잭션을 통해 데이터의 정합성과 무결성을 보장합니다.

- **Firestore: 대규모 비정형 데이터 및 로그 저장**
  - **대상:** `events` (유저 행동 로그), `enrollments` (캠페인 참여 기록), `canvasDefinition` (유연한 JSON 구조) 등.
  - **역할:** 수평적 확장을 통해 대규모 쓰기/읽기 작업을 처리하고, 유연한 데이터 구조를 지원합니다.

## 3. 핵심 아키텍처 정책
(기존 우선순위 큐 정책 등은 동일)

## 4. 미래 확장성 고려사항 (Future Scalability)

- **대규모 단일 워크스페이스 데이터 처리**:
  - **문제**: 특정 워크스페이스의 `users` 테이블이 수십억 건 이상으로 증가할 경우, 단일 PostgreSQL 인스턴스의 성능 한계에 도달할 수 있습니다.
  - **해결 전략**:
    1.  **논리적 샤딩(Sharding)**: 초기에는 `workspace_id`를 파티션 키로 사용하여 테이블을 분리하고, 쿼리가 항상 `workspace_id`를 포함하도록 하여 성능을 보장합니다.
    2.  **물리적 샤딩**: 장기적으로는 Google Cloud Spanner 또는 Citus와 같은 분산 SQL 데이터베이스 도입을 검토하여, 단일 데이터베이스의 물리적 한계를 넘어 수평적으로 확장할 수 있는 아키텍처로 전환을 고려합니다.

- **분석 데이터 처리**:
  - **문제**: Firestore의 `events` 데이터가 증가함에 따라 운영 데이터베이스에서의 직접 분석 쿼리는 성능에 영향을 줄 수 있습니다.
  - **해결 전략**: Firestore에서 BigQuery로 데이터를 스트리밍하는 파이프라인을 구축합니다. 이를 통해 운영 시스템에 영향을 주지 않고, 대규모 데이터에 대한 복잡한 분석 쿼리를 수행할 수 있는 환경을 마련합니다.
