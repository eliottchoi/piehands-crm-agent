# 3.2.4. 데이터베이스 보안 정책

이 문서는 멀티테넌트(Multi-tenant) 환경에서 데이터 격리(Isolation)를 보장하기 위한 데이터베이스 레벨의 보안 정책을 정의합니다.

## 1. 핵심 원칙: 워크스페이스 기반 격리

- **정책:** 모든 데이터는 `workspace_id`를 기준으로 논리적으로 격리되어야 합니다. 팀 멤버는 자신이 명시적으로 속한 워크스페이스의 데이터 외에는 어떤 경우에도 접근(읽기, 쓰기, 수정, 삭제)할 수 없습니다.
- **구현:** 이 원칙은 애플리케이션 레벨의 로직뿐만 아니라, 데이터베이스 자체의 보안 기능을 통해 최후의 방어선에서 강제되어야 합니다.

## 2. PostgreSQL: 행 수준 보안 (Row-Level Security, RLS)

/* --- Backend Note ---
**결정 배경:** 고객사(워크스페이스)가 늘어날 때마다 물리적으로 DB를 분리하는 것은 운영 비용과 복잡성을 기하급수적으로 증가시킵니다. PostgreSQL의 RLS는 단일 데이터베이스 내에서 각 고객사의 데이터를 논리적으로, 하지만 매우 강력하게 격리할 수 있는 현대적인 SaaS 아키텍처의 표준적인 해결책입니다. 애플리케이션 코드에 실수가 있더라도, DB 레벨에서 데이터 유출을 원천적으로 차단할 수 있습니다.
*/

- **정책:** `workspace_id` 컬럼을 가진 모든 테이블에는 행 수준 보안(RLS)을 활성화해야 합니다.
- **구현 방식:**
  1. API 서버가 DB에 연결할 때, 현재 요청을 보낸 팀 멤버의 인증 정보(UID, 소속 `workspace_id`)를 `SET session.user.id = '...'` 와 같은 명령어로 세션 변수에 설정합니다.
  2. 각 테이블에는 이 세션 변수를 사용하여 현재 팀 멤버가 접근할 수 있는 행만 필터링하는 RLS 정책을 생성합니다.

- **정책 예시 코드 (`campaigns` 테이블):**
  ```sql
  -- 1. 테이블에 RLS 활성화
  ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

  -- 2. SELECT 정책: 현재 세션의 workspace_id와 일치하는 행만 조회 허용
  CREATE POLICY select_campaigns ON campaigns FOR SELECT
  USING (workspace_id = current_setting('session.workspace.id')::uuid);

  -- 3. INSERT 정책: 현재 세션의 workspace_id와 동일한 값으로만 삽입 허용
  CREATE POLICY insert_campaigns ON campaigns FOR INSERT
  WITH CHECK (workspace_id = current_setting('session.workspace.id')::uuid);

  -- (UPDATE, DELETE 정책도 유사하게 생성)
  ```

## 3. Firestore: 보안 규칙 (Security Rules)

- **정책:** Firestore에 저장되는 모든 데이터(Events, Enrollments 등)는 서버 측 보안 규칙을 통해 접근이 제어되어야 합니다.
- **구현 방식:**
  1. 클라이언트(웹 UI)에서 직접 Firestore에 접근하는 경우는 최소화합니다.
  2. 서버(Cloud Run)에서 Firestore에 접근할 때는 Admin SDK를 사용하므로 모든 권한을 가집니다. 하지만 만약을 대비하여, 아래와 같이 워크스페이스 멤버십을 확인하는 규칙을 기본으로 설정합니다.
- **규칙 예시 코드 (`enrollments` 하위 컬렉션):**
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      // users/{userId}/enrollments/{enrollmentId}
      match /users/{userId}/enrollments/{enrollmentId} {
        // 로그인했고, 해당 문서의 workspaceId에 속한 멤버인지 확인
        allow read, write: if request.auth != null &&
                           exists(/databases/$(database)/documents/workspaces/$(getResourceWorkspaceId())/members/$(request.auth.uid));
      }
    }

    // 문서의 workspaceId를 가져오는 헬퍼 함수
    function getResourceWorkspaceId() {
      // (구현 필요: enrollments 문서에서 campaignId를 읽고, 다시 campaigns 테이블에서 workspaceId를 조회하는 등의 로직)
    }
  }
  ```
