# 3.3.6. SendGrid 웹훅 API

## 1. 개요

이 문서는 SendGrid로부터 이메일 발송 관련 이벤트(예: 수신 거부, 반송)를 비동기적으로 수신하기 위한 웹훅(Webhook) 엔드포인트를 명세합니다.

## 2. SendGrid 이벤트 수신

- **엔드포인트:** `POST /webhooks/sendgrid`
- **인증:** SendGrid의 Signature Validation을 통해 요청의 유효성을 검증합니다.

### 처리 흐름

1.  **시그니처 검증:** 요청 헤더에 포함된 `X-Twilio-Email-Event-Webhook-Signature`와 `X-Twilio-Email-Event-Webhook-Timestamp`를 사용하여 SendGrid에서 온 유효한 요청인지 확인합니다. 유효하지 않으면 `401 Unauthorized`로 응답합니다.
2.  **빠른 응답:** 검증이 성공하면, 즉시 `204 No Content`를 응답하여 SendGrid와의 연결을 종료합니다. 모든 데이터 처리는 백그라운드에서 비동기적으로 수행됩니다.
3.  **비동기 처리:** 수신된 이벤트 데이터를 이벤트 처리 큐(Pub/Sub)에 발행하여, 백그라운드 워커가 안정적으로 처리하도록 위임합니다.
4.  **데이터베이스 업데이트:** 백그라운드 워커는 이벤트의 `email`과 `event` 유형을 확인하고, `users` 테이블의 `email_status`를 다음과 같이 업데이트합니다.
    - `unsubscribe` 또는 `spamreport` 이벤트: `unsubscribed`로 변경
    - `bounce` 이벤트: `bounced`로 변경

### 요청 본문 예시 (from SendGrid)

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
