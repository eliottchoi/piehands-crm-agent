# 3.2.3. PostgreSQL 스키마

이 문서는 우리 시스템의 **Cloud SQL (PostgreSQL)** 데이터베이스 스키마를 정의합니다. 모든 테이블과 컬럼은 반드시 이 명세를 따라야 합니다.

---

### `workspaces` 테이블
| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY` | 워크스페이스 고유 ID. `ws_` 접두사를 붙여 사용. |
| `name` | `varchar(100)`| `NOT NULL` | 워크스페이스 이름. |
| `created_at` | `timestamptz` | `NOT NULL` | 생성 시각. |

### `team_members` 테이블
| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `workspace_id`| `uuid` | `PRIMARY KEY, REFERENCES workspaces(id)` | 속한 워크스페이스 ID. |
| `user_id` | `varchar(255)`| `PRIMARY KEY` | Firebase Auth UID. |
| `role` | `varchar(20)` | `NOT NULL, CHECK (role IN ('admin', 'editor', 'viewer'))` | 팀 멤버의 역할. |
| `created_at` | `timestamptz` | `NOT NULL` | 추가된 시각. |

### `users` 테이블
/* --- Backend Note ---
유저의 `distinct_id`는 워크스페이스 내에서 고유해야 합니다. 이를 위해 `UNIQUE` 복합 인덱스를 `(workspace_id, distinct_id)`에 생성하여 데이터베이스 레벨에서 고유성을 강제합니다. `email` 필드는 중복될 수 있습니다.
*/
| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY` | 시스템 내부 유저 고유 ID. |
| `workspace_id`| `uuid` | `NOT NULL, REFERENCES workspaces(id)` | 속한 워크스페이스 ID. |
| `distinct_id` | `varchar(255)`| `NOT NULL` | 외부 시스템에서 사용하는 유저 식별자. |
| `properties` | `jsonb` | | 이름, 레벨 등 모든 속성을 저장하는 JSON 객체. |
| `email_status` | `varchar(20)`| `NOT NULL, DEFAULT 'active'` | 이메일 수신 상태 (active, unsubscribed, bounced). |
| `created_at` | `timestamptz` | `NOT NULL` | 생성 시각. |
| `updated_at` | `timestamptz` | `NOT NULL` | 마지막 업데이트 시각. |

### `campaigns` 테이블
| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY` | 캠페인 고유 ID. `camp_` 접두사를 붙여 사용. |
| `workspace_id`| `uuid` | `NOT NULL, REFERENCES workspaces(id)` | 속한 워크스페이스 ID. |
| `name` | `varchar(100)`| `NOT NULL` | 캠페인 이름. |
| `description` | `text` | | 캠페인에 대한 상세 설명 (선택 사항). |
| `status` | `varchar(20)` | `NOT NULL, DEFAULT 'DRAFT'` | 캠페인 상태. |
| `priority` | `varchar(20)` | `NOT NULL, DEFAULT 'DEFAULT'` | 작업 우선순위. |
| `created_by` | `varchar(255)`| `NOT NULL` | 생성한 팀 멤버의 `user_id`. |
| `created_at` | `timestamptz` | `NOT NULL` | 생성 시각. |
| `updated_at` | `timestamptz` | `NOT NULL` | 마지막 업데이트 시각. |

### `templates` 테이블
| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY` | 템플릿 고유 ID. `tmpl_` 접두사를 붙여 사용. |
| `workspace_id`| `uuid` | `NOT NULL, REFERENCES workspaces(id)` | 속한 워크스페이스 ID. |
| `name` | `varchar(100)`| `NOT NULL` | 팀 멤버가 식별하기 위한 템플릿 이름. |
| `type` | `varchar(20)` | `NOT NULL, CHECK (type IN ('EMAIL', 'SMS'))` | 템플릿의 종류. |
| `content` | `jsonb` | `NOT NULL` | 템플릿의 실제 내용. 타입에 따라 구조가 다름. |
| `created_by` | `varchar(255)`| `NOT NULL` | 생성한 팀 멤버의 `user_id`. |
| `created_at` | `timestamptz` | `NOT NULL` | 생성 시각. |
| `updated_at` | `timestamptz` | `NOT NULL` | 마지막 업데이트 시각. |

#### `content` 필드 JSON 구조 예시
- **`type: 'EMAIL'`일 경우:**
  ```json
  {
    "subject": "안녕하세요, {{user.name}}님!",
    "body_html": "<html>...</html>"
  }
  ```
- **`type: 'EMAIL'` (AI 변수 포함):**
  ```json
  {
    "subject": "AI가 추천하는 특별한 소식!",
    "body_html": "안녕하세요, {{user.name}}님! {{llm.generate(prompt: '{{user.name}}님을 위한 맞춤 인사말', fallback: '특별한 하루 보내세요!', timeout: 15, max_tokens: 50)}}"
  }
  ```
- **`type: 'SMS'`일 경우:**
  ```json
  {
    "message": "{{user.name}}님, 주문이 완료되었습니다."
  }
  ```
