# 3.3.5. 워크스페이스 및 설정 API (Workspace & Settings API)

이 문서는 워크스페이스 정보, 팀원 관리, 외부 연동 설정 등과 관련된 API 엔드포인트를 명세합니다.

## 1. 워크스페이스 상세 조회

현재 사용자가 속한 워크스페이스의 상세 정보를 조회합니다.

- **엔드포인트:** `GET /workspaces/{workspaceId}`
- **인증:** 필요 (Bearer Token - `viewer` 이상 역할)

### 응답 (Responses)

- **`200 OK` - 성공**
  ```json
  {
    "id": "ws_piehands",
    "name": "Piehands Marketing Team",
    "createdAt": "2025-09-10T10:00:00Z"
  }
  ```
- **`403 Forbidden`** - 사용자가 해당 워크스페이스의 멤버가 아닌 경우.
- **`404 Not Found`** - 워크스페이스가 존재하지 않는 경우.

## 2. 워크스페이스 정보 수정

워크스페이스의 이름을 변경합니다.

- **엔드포인트:** `PUT /workspaces/{workspaceId}`
- **인증:** 필요 (Bearer Token - `admin` 역할)

### 요청 본문 (Request Body)
```json
{
  "name": "New Workspace Name"
}
```

### 응답 (Responses)
- **`200 OK` - 성공**

## 3. 팀원 목록 조회

워크스페이스에 속한 모든 팀원의 목록과 역할을 조회합니다.

- **엔드포인트:** `GET /workspaces/{workspaceId}/members`
- **인증:** 필요 (Bearer Token - `viewer` 이상 역할)

### 응답 (Responses)
- **`200 OK` - 성공**
  ```json
  [
    { "uid": "auth_uid_abc123", "email": "admin@piehands.com", "role": "admin" },
    { "uid": "auth_uid_def456", "email": "editor@piehands.com", "role": "editor" }
  ]
  ```

## 4. 팀원 초대

새로운 팀원을 워크스페이스에 이메일로 초대합니다. 초대 기반 회원가입 플로우를 시작시킵니다.

- **엔드포인트:** `POST /workspaces/{workspaceId}/members/invite`
- **인증:** 필요 (Bearer Token - `admin` 역할)

### 요청 본문 (Request Body)
```json
{
  "email": "new_user@example.com",
  "role": "editor"
}
```

### 응답 (Responses)
- **`200 OK` - 성공**
- **`409 Conflict`** - 이미 초대되었거나 가입된 이메일인 경우.

---

## 5. 팀원 역할 변경 (Update a Team Member's Role)
워크스페이스에 속한 팀원의 역할을 변경합니다. (예: `editor` -> `viewer`)
- **엔드포인트:** `PUT /workspaces/{workspaceId}/members/{uid}`
- **인증:** 필요 (Bearer Token - `admin` 역할)

### 요청 본문 (Request Body)
```json
{
  "role": "viewer"
}
```

### 응답 (Responses)
- **`200 OK` - 성공**

---

## 6. 팀원 삭제 (Remove a Team Member)
워크스페이스에서 팀원을 제거합니다.
- **엔드포인트:** `DELETE /workspaces/{workspaceId}/members/{uid}`
- **인증:** 필요 (Bearer Token - `admin` 역할)

### 응답 (Responses)
- **`204 No Content` - 성공**

---

## 7. 외부 연동 설정 조회 (Get Integration Settings)
현재 워크스페이스에 설정된 외부 서비스 연동 정보를 조회합니다.
- **엔드포인트:** `GET /workspaces/{workspaceId}/integrations`
- **인증:** 필요 (Bearer Token - `viewer` 이상 역할)

### 응답 (`200 OK`)
```json
{
  "slack": {
    "webhookUrl": "https://hooks.slack.com/services/..."
  },
  "mixpanel": {
    "projectToken": "YOUR_MIXPEL_TOKEN"
  }
}
```

## 8. 외부 연동 설정 수정 (Update Integration Settings)
Slack, Mixpanel 등 외부 서비스 연동을 위한 설정을 저장합니다.
- **엔드포인트:** `PUT /workspaces/{workspaceId}/integrations`
- **인증:** 필요 (Bearer Token - `admin` 역할)

### 요청 본문 (Request Body)
```json
{
  "slack": {
    "webhookUrl": "https://hooks.slack.com/services/..."
  },
  "mixpanel": {
    "projectToken": "YOUR_MIXPANEL_TOKEN"
  }
}
```

### 응답 (Responses)
- **`200 OK` - 성공**
