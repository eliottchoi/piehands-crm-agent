# 3.3.1. 캠페인 API (Campaigns API)

이 문서는 캠페인 관리를 위한 API 엔드포인트를 명세합니다. 데이터는 PostgreSQL과 Firestore에 나뉘어 저장되며, API는 이를 조합하여 완전한 객체를 제공합니다.

---

## 1. 캠페인 생성 (Create a Campaign)
`DRAFT` 상태의 새 캠페인을 생성합니다. 메타데이터는 PostgreSQL에, `canvasDefinition`은 Firestore에 저장됩니다.

- **엔드포인트:** `POST /campaigns`
- **인증:** 필요 (Bearer Token - `editor` 이상 역할)

### 요청 본문 (Request Body)
```json
{
  "workspaceId": "ws_...",
  "name": "4분기 홀리데이 프로모션"
}
```

### 응답 (`201 Created`)
생성된 캠페인의 전체 객체를 반환합니다. `canvasDefinition`은 빈 객체로 초기화됩니다.
```json
{
  "id": "camp_...",
  "workspaceId": "ws_...",
  "name": "4분기 홀리데이 프로모션",
  "status": "DRAFT",
  "canvasDefinition": {
    "nodes": [],
    "edges": []
  },
  "createdBy": "auth_uid_...",
  "createdAt": "2025-09-15T10:00:00Z",
  "updatedAt": "2025-09-15T10:00:00Z"
}
```

---

## 2. 캠페인 목록 조회 (List Campaigns)
워크스페이스의 캠페인 목록을 조회합니다. 성능을 위해 `canvasDefinition`은 응답에 포함되지 않습니다.

- **엔드포인트:** `GET /campaigns`
- **인증:** 필요 (Bearer Token - `viewer` 이상 역할)
- **쿼리 파라미터:** `workspaceId`, `status`, `limit`, `cursor`

### 응답 (`200 OK`)
```json
{
  "data": [
    {
      "id": "camp_...",
      "name": "Q4 Holiday Promotion",
      "status": "ACTIVE",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "nextCursor": "..."
}
```

---

## 3. 단일 캠페인 조회 (Retrieve a Campaign)
특정 캠페인의 전체 정보를 조회합니다. PostgreSQL과 Firestore에서 데이터를 조합하여 반환합니다.

- **엔드포인트:** `GET /campaigns/{campaignId}`
- **인증:** 필요 (Bearer Token - `viewer` 이상 역할)

### 응답 (`200 OK`)
(캠페인 생성 시의 응답 객체와 동일한 전체 캠페인 객체를 반환합니다.)

---

## 4. 캠페인 수정 (Update a Campaign)
캠페인의 `name`, `description`, `status`, `canvasDefinition`을 수정합니다.

- **엔드포인트:** `PATCH /campaigns/{campaignId}`
- **인증:** 필요 (Bearer Token - `editor` 이상 역할)

### 수정 정책

- **`DRAFT`, `INACTIVE` 상태:** `name`, `description`, `canvasDefinition`, `status` 등 대부분의 속성을 수정할 수 있습니다.
- **`ACTIVE` 상태:** 운영 중인 캠페인을 보호하기 위해, `status`를 `INACTIVE`로 변경하는 것만 허용됩니다. 다른 모든 속성은 수정할 수 없습니다.
- **상태 전환 규칙**:
  - `DRAFT` -> `ACTIVE`
  - `ACTIVE` -> `INACTIVE` (일시 중지)
  - `INACTIVE` -> `ACTIVE` (재개)
  - `INACTIVE` -> `ARCHIVED` (보관)

### 요청 본문 (예: 캔버스 수정)
```json
{
  "canvasDefinition": {
    "nodes": [ { "id": "node1", "type": "EMAIL", ... } ],
    "edges": []
  }
}
```

### 응답 (`200 OK`)
수정된 전체 캠페인 객체를 반환합니다.

---

## 5. 캠페인 삭제 (Delete a Campaign)
캠페인을 영구적으로 삭제합니다. 관련 데이터(PostgreSQL, Firestore)가 모두 삭제됩니다.
- **엔드포인트:** `DELETE /campaigns/{campaignId}`
- **인증:** 필요 (Bearer Token - `admin` 역할)
- **주의:** `ACTIVE` 상태인 캠페인은 삭제할 수 없습니다. 먼저 `INACTIVE` 상태로 변경해야 합니다.

### 응답 (`204 No Content`)
성공적으로 삭제되었으며, 별도의 본문은 없습니다.
