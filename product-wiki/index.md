# Product Wiki: 파이핸즈 CRM

이 위키는 파이핸즈 CRM 플랫폼의 프로덕트, 디자인, 엔지니어링에 대한 단일 진실 공급원(Single Source of Truth)입니다. 프로덕트가 발전함에 따라 지속적으로 업데이트되는 살아있는 문서입니다.

## 이 위키를 작성하고 읽는 방법: 행동 중심 개발 (BDD)

이 위키의 모든 사용자 플로우 문서는 **행동 중심 개발(Behavior-Driven Development, BDD)** 방법론을 따릅니다. 이는 "예제를 통한 명세(Specification by Example)" 철학을 기반으로, 모호함을 제거하고 모든 팀원(기획, 디자인, 개발, QA)이 동일한 이해를 공유하기 위한 강력한 소통 도구입니다.

### 핵심: Gherkin 구문을 사용한 시나리오
우리는 사용자의 행동을 구체적인 시나리오 예제로 설명하기 위해 **Gherkin(거킨)**이라는 표준 구문을 사용합니다. 모든 시나리오는 다음 세 가지 키워드로 구성됩니다.

- `Given` (주어진 상황): 시나리오가 시작되기 전의 **초기 상태**를 설명합니다.
- `When` (사용자가 행동하면): 시나리오의 주인공이 수행하는 **특정 행동**을 설명합니다.
- `Then` (다음과 같이 되어야 한다): `When`의 행동으로 인해 발생해야 하는 **예상 결과**를 설명합니다.

### 실제 예시
```gherkin
기능: 캠페인 상태 변경

시나리오: 캠페인 활성화

Given "신규 가입자 환영" 캠페인이 'DRAFT' 상태로 존재한다
And 사용자가 '캠페인 목록' 페이지에 있다
When 사용자가 해당 캠페인의 컨텍스트 메뉴에서 [활성화] 버튼을 클릭한다
Then 해당 캠페인의 상태는 'ACTIVE'로 변경되어야 한다
And 사용자에게 "캠페인이 활성화되었습니다." 라는 토스트 메시지가 보여야 한다
```

이처럼, 우리는 추상적인 기능 목록 대신 **구체적인 예시**를 통해 제품이 어떻게 '행동'해야 하는지를 정의합니다. 이 시나리오는 기획의 요구사항인 동시에, 개발의 구현 가이드이며, QA의 테스트 케이스가 됩니다.

## 목차

### 1. 프로덕트 개요
- [1.1. 비전과 목표](./1-product-overview/01-vision-and-goals.md)
- [1.2. 핵심 개념](./1-product-overview/02-core-concepts.md)

### 2. 사용자 경험(UX) & 디자인
- **공통**
  - [2.1. 로그인 및 회원가입](./2-user-experience/00-common/00-login-signup.md)
- **대시보드**
  - [2.2. 대시보드](./2-user-experience/01-dashboard/01-dashboard-view.md)
- **캠페인**
  - [2.3. 캠페인 목록](./2-user-experience/02-campaigns/01-campaign-list.md)
  - [2.4. 캠페인 편집기](./2-user-experience/02-campaigns/02-campaign-editor.md)
- **템플릿**
  - [2.5. 템플릿 목록](./2-user-experience/03-templates/01-template-list.md)
  - [2.6. 템플릿 편집기](./2-user-experience/03-templates/02-template-editor.md)
- **유저**
  - [2.7. 유저 목록](./2-user-experience/04-users/01-user-list.md)
  - [2.8. 유저 상세](./2-user-experience/04-users/02-user-detail.md)
- **설정**
  - [2.9. 설정](./2-user-experience/05-settings/01-settings-view.md)
- **고급 기능**
  - [2.10. SendGrid 웹훅 연동](./2-user-experience/06-advanced-features/01-sendgrid-webhook-integration.md)
  - [2.11. 실시간 AI 문구 생성](./2-user-experience/06-advanced-features/02-ai-template-feature.md)

### 3. 기술 명세
- **3.1. 아키텍처**
  - [3.1.1. 시스템 아키텍처](./3-technical-specification/3.1-architecture/01-system-architecture.md)
  - [3.1.2. 인증 및 권한 정책](./3-technical-specification/3.1-architecture/02-auth-policy.md)
- **3.2. 데이터 모델**
  - [3.2.1. Firestore 스키마](./3-technical-specification/3.2-data-models/01-firestore-schema.md)
  - [3.2.2. 캔버스 노드 상세 명세](./3-technical-specification/3.2-data-models/02-canvas-node-spec.md)
  - [3.2.3. PostgreSQL 스키마](./3-technical-specification/3.2-data-models/03-postgresql-schema.md)
  - [3.2.4. 데이터베이스 보안 정책](./3-technical-specification/3.2-data-models/04-database-security.md)
- **3.3. API 엔드포인트**
  - [3.3.1. Campaigns API](./3-technical-specification/3.3-api-endpoints/01-campaigns-api.md)
  - [3.3.2. 유저 API](./3-technical-specification/3.3-api-endpoints/02-users-api.md)
  - [3.3.3. 템플릿 API](./3-technical-specification/3.3-api-endpoints/03-templates-api.md)
  - [3.3.4. 이벤트 API](./3-technical-specification/3.3-api-endpoints/04-events-api.md)
  - [3.3.5. 워크스페이스 및 설정 API](./3-technical-specification/3.3-api-endpoints/05-workspace-settings-api.md)
- **3.4. 공통 정책**
  - [3.4.1. API 공통 정책](./3-technical-specification/3.4-api-common-policy/01-api-common-policy.md)
- **3.5. DevOps 및 CI/CD**
  - [3.5.1. DevOps 및 CI/CD 전략](./3-technical-specification/3.5-devops-and-ci-cd/01-devops-and-ci-cd.md)
