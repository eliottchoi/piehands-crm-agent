# 3.3.2. 유저 API (Users API)

이 문서는 유저(End-user) 정보 관리를 위한 API 엔드포인트를 명세합니다. 모든 엔드포인트는 기본 URL `https://api.piehands.com/v1`에 상대적입니다.

## 1. 유저 생성 및 수정 (Upsert)

새로운 유저를 생성하거나, `distinct_id`가 이미 존재하는 경우 정보를 업데이트합니다. `jsonl` 대량 가져오기 기능 또한 이 엔드포인트를 내부적으로 활용합니다.

- **엔드포인트:** `POST /users`
- **인증:** 필요 (Bearer Token - `editor` 이상 역할)
- **권한:** API Key 또는 내부 서비스 인증 필요.

### 요청 본문 (Request Body)

```json
{
  "workspaceId": "ws_piehands",
  "user": {
    "distinct_id": "user-123",
    "properties": {
      "email": "test@example.com",
      "name": "홍길동",
      "level": "GOLD"
    }
  }
}
```

### 응답 (Responses)

- **`200 OK` - 성공**
- **`400 Bad Request`** - 필수 필드(`workspaceId`, `user.distinct_id`)가 누락된 경우.
- **`403 Forbidden`** - 권한이 없는 경우.

## 2. 유저 목록 조회

필터 조건을 조합하여 특정 유저 그룹을 조회합니다. 검색, 필터링, 컬럼 커스터마이징 기능을 지원합니다.

- **엔드포인트:** `GET /users`
- **인증:** 필요 (Bearer Token - `viewer` 이상 역할)

### 쿼리 파라미터 (Query Parameters)

| 필드 | 타입 | 설명 | 예시 |
| :--- | :--- | :--- | :--- |
| `workspaceId` | `String` | **(필수)** 조회할 워크스페이스 ID | `ws_piehands` |
| `query` | `String` | 검색어. `email`, `name`, `distinct_id` 필드에서 검색. | `홍길동` |
| `filters` | `String` | JSON 문자열 형식의 필터 조건. | `[{"property":"level","operator":"eq","value":"VIP"},{"property":"login_count","operator":"gt","value":30}]` |
| `fields` | `String` | 목록에 포함할 속성 필드 목록 (쉼표로 구분). | `email,name,level` |
| `limit` | `Number` | 페이지 당 항목 수. 기본값 50. | `100` |
| `nextToken` | `String` | 다음 페이지를 위한 토큰. | `...` |

### 응답 (Responses)

- **`200 OK` - 성공**

```json
{
  "users": [
    {
      "distinct_id": "user-123",
      "properties": {
        "email": "user123@example.com",
        "name": "김VIP",
        "level": "VIP"
      },
      "last_seen_at": "2025-09-16T10:00:00Z"
    }
  ],
  "nextToken": "..."
}
```

## 3. 유저 상세 정보 조회

특정 유저의 모든 속성과 최근 활동 이력을 조회합니다.

- **엔드포인트:** `GET /users/{distinct_id}`
- **인증:** 필요 (Bearer Token - `viewer` 이상 역할)

### 쿼리 파라미터 (Query Parameters)

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `workspaceId` | `String` | **(필수)** 조회할 워크스페이스 ID |

### 응답 (Responses)

- **`200 OK` - 성공**
- **`404 Not Found`** - 해당 `distinct_id`의 유저가 없는 경우.

## 4. 유저 속성 수정

특정 유저의 개별 속성을 수정합니다.

- **엔드포인트:** `PATCH /users/{distinct_id}/properties`
- **인증:** 필요 (Bearer Token - `editor` 이상 역할)

### 요청 본문 (Request Body)

```json
{
  "workspaceId": "ws_piehands",
  "properties": {
    "level": "GOLD",
    "memo": "전화 통화 필요"
  }
}
```

### 응답 (Responses)

- **`200 OK` - 성공**
- **`404 Not Found`** - 해당 `distinct_id`의 유저가 없는 경우.

## 5. 유저 병합 (Merge)

두 명 이상의 유저를 하나로 병합합니다.

- **엔드포인트:** `POST /users/merge`
- **인증:** 필요 (Bearer Token - `editor` 이상 역할)

### 요청 본문 (Request Body)

```json
{
  "workspaceId": "ws_piehands",
  "primaryUserId": "user-abc",
  "secondaryUserIds": ["user-def", "user-ghi"],
  "propertyOverrides": {
    "level": "VIP"
  }
}
```

---

## 6. 유저 삭제 (Delete a User)
특정 유저를 시스템에서 영구적으로 삭제합니다. GDPR Right to be Forgotten을 준수하기 위해 필요합니다.
- **엔드포인트:** `DELETE /users/{distinct_id}`
- **인증:** 필요 (Bearer Token - `admin` 역할)

### 요청 본문 (Request Body)
```json
{
  "workspaceId": "ws_piehands"
}
```

### 응답 (Responses)
- **`204 No Content` - 성공**
- **`403 Forbidden`** - 권한이 없는 경우.
- **`404 Not Found`** - 해당 `distinct_id`의 유저가 없는 경우.

