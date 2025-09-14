# 3.3.4. Events API

이 문서는 외부 시스템(고객사 웹/앱 등)에서 사용자 행동 이벤트를 수집하기 위한 API 엔드포인트를 명세합니다.

## 1. 이벤트 수집 (Track)

단일 사용자 이벤트를 시스템에 기록합니다. 이 엔드포인트는 높은 처리량(High-throughput)을 감당할 수 있도록 최적화되어야 하며, 요청에 대한 응답은 최대한 빠르게(asynchronously) 처리되어야 합니다.

- **엔드포인트:** `POST /events/track`
- **인증:** API Key (각 워크스페이스에 발급된 고유 키)

### 요청 본문 (Request Body)

```json
{
  "workspaceId": "ws_piehands",
  "event": {
    "userId": "user-123",
    "name": "Product Viewed",
    "timestamp": "2025-09-16T11:00:00Z",
    "properties": {
      "product_id": "prod-abc",
      "product_name": "초콜릿",
      "price": 3000
    }
  }
}
```

| 필드 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `workspaceId` | `String` | Yes | 이벤트가 속한 워크스페이스의 ID. |
| `event.userId` | `String` | Yes | 이벤트를 발생시킨 사용자의 `distinct_id`. |
| `event.name` | `String` | Yes | 이벤트의 이름. |
| `event.timestamp`| `String` | No | ISO 8601 형식의 이벤트 발생 시각. 생략 시 서버 수신 시간으로 기록. |
| `event.properties`| `Map` | No | 이벤트에 대한 추가 정보. |

### 응답 (Responses)

- **`202 Accepted` - 성공**
  - 서버가 요청을 성공적으로 수신했으며, 비동기적으로 처리할 것임을 의미합니다. 실제 데이터 처리 중 발생하는 오류는 이 응답에 영향을 주지 않습니다.

- **`400 Bad Request`**
  - 필수 필드(`workspaceId`, `event.userId`, `event.name`)가 누락된 경우.

- **`401 Unauthorized`**
  - 유효하지 않은 API Key로 요청한 경우.
