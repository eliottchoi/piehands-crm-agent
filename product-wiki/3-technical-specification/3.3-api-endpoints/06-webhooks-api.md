# 3.3.6. 웹훅 API (Webhooks API)

## 1. 개요

이 문서는 SendGrid와 같은 외부 서비스로부터 발생하는 이벤트를 비동기적으로 수신하기 위한 웹훅(Webhook) 엔드포인트를 명세합니다.

## 2. SendGrid 이벤트 웹훅

SendGrid에서 발생하는 이메일 이벤트(Bounces, Unsubscribes 등)를 수신하여 시스템의 사용자 데이터와 동기화합니다.

- **엔드포인트:** `POST /webhooks/sendgrid`
- **인증:** 없음 (요청의 유효성은 SendGrid의 Signature Validation을 통해 확인함)

### 요청 본문 (Request Body)

SendGrid는 여러 이벤트를 배열 형태로 한 번에 전송합니다.
```json
[
  {
    "event": "bounce",
    "email": "bounced@example.com",
    "sg_message_id": "...",
    "reason": "550 5.1.1 The email account that you tried to reach does not exist.",
    "timestamp": 1672531200
  },
  {
    "event": "unsubscribe",
    "email": "unsubscribe@example.com",
    "sg_message_id": "...",
    "timestamp": 1672531201
  }
]
```

### 처리 로직

1.  **시그니처 검증:** 요청 헤더의 `X-Twilio-Email-Event-Webhook-Signature`와 `X-Twilio-Email-Event-Webhook-Timestamp`를 사용하여 요청이 실제로 SendGrid로부터 온 것인지 검증합니다.
2.  **비동기 처리:** 검증이 완료되면, 즉시 `204 No Content` 응답을 반환합니다. 이후의 모든 처리는 비동기적으로 수행됩니다.
3.  **데이터 처리:** 수신된 이벤트 배열을 Pub/Sub 또는 Cloud Tasks 큐에 전달하여 백그라운드 워커가 처리하도록 위임합니다.
4.  **상태 업데이트:** 워커는 이벤트 유형에 따라 PostgreSQL의 `users` 테이블을 업데이트합니다.
    - `bounce` 이벤트 발생 시: `email_status`를 `bounced`로 변경합니다.
    - `unsubscribe`, `spamreport` 이벤트 발생 시: `email_status`를 `unsubscribed`로 변경합니다.
