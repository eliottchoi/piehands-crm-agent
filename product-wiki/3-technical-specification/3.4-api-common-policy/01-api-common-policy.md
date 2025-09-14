# 3.4. API 공통 정책

이 문서는 파이핸즈 CRM의 모든 백엔드 API가 일관성을 유지하기 위해 반드시 준수해야 하는 공통 정책들을 정의합니다.

## 1. 에러 응답 형식 (Error Response Format)

/* --- Backend Note ---
**결정 배경:** 클라이언트(웹 UI)가 에러 종류에 따라 효과적으로 분기 처리(예: 유효성 검사 실패 시 특정 입력 필드에 오류 표시)를 할 수 있도록, 기계가 읽을 수 있는 `code`를 포함한 구조화된 에러 객체를 모든 에러 응답의 표준으로 채택합니다.
*/

- 모든 API 에러 응답은 아래의 JSON 구조를 따라야 합니다.
- HTTP 상태 코드는 아래 '공통 에러 코드' 표에 정의된 코드를 사용합니다.

**표준 에러 응답 본문 (Body):**
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "A human-readable error message.",
    "details": {
      "field": "name",
      "reason": "missing"
    }
  }
}
```
- `error.details` 필드는 `VALIDATION_ERROR`와 같이 추가 정보가 필요한 경우에만 선택적으로 포함됩니다.

## 2. 공통 에러 코드 (Common Error Codes)

| HTTP 상태 | `error.code` | `error.message` 예시 | 설명 |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | "Field 'name' is required." | 요청 본문의 특정 필드가 유효성 검사에 실패했을 때 사용합니다. |
| `401 Unauthorized` | `AUTHENTICATION_FAILED` | "Invalid or expired token." | 유효하지 않은 인증 토큰으로 요청했을 때 사용합니다. |
| `403 Forbidden` | `PERMISSION_DENIED` | "You must be an admin to perform this action." | 인증은 되었으나, 해당 작업을 수행할 권한이 없을 때 사용합니다. |
| `404 Not Found` | `RESOURCE_NOT_FOUND` | "Campaign with ID 'camp_abc' not found." | 요청한 리소스(캠페인, 유저 등)가 존재하지 않을 때 사용합니다. |
| `409 Conflict` | `RESOURCE_CONFLICT` | "An item with this name already exists." | 리소스 생성 시 이미 같은 이름/ID의 리소스가 존재하여 충돌이 발생할 때 사용합니다. |
| `500 Internal Server Error` | `INTERNAL_SERVER_ERROR` | "An unexpected error occurred." | 서버 내부의 예측하지 못한 오류 발생 시 사용하는 최후의 보루입니다. |

## 3. 로깅 및 모니터링 (Logging & Monitoring)

- **로깅:**
  - 모든 API 요청 및 응답(성공/실패 모두)은 **Google Cloud Logging**에 기록됩니다.
  - 로그에는 `traceId`, `requestPath`, `httpMethod`, `statusCode`, `latency` 등의 구조화된 정보가 포함되어야 합니다.
  - 에러 발생 시, 에러 객체의 전체 내용과 스택 트레이스(Stack Trace)가 로그에 포함되어야 합니다.
- **모니터링:**
  - 주요 지표(API 요청 수, 에러율, 95th percentile latency 등)는 **Google Cloud Monitoring** 대시보드를 통해 시각화되고 모니터링됩니다.
  - 5xx 에러 발생률이 5분 동안 1%를 초과할 경우, **Google Cloud Alerting**을 통해 개발팀 Slack 채널로 알림이 발송되어야 합니다.
