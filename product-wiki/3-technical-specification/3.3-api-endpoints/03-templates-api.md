# 3.3.3. 템플릿 API (Templates API)

이 문서는 메시지 템플릿 관리를 위한 API 엔드포인트를 명세합니다. 모든 템플릿 데이터는 PostgreSQL에 저장됩니다.

---

## 1. 템플릿 생성 (Create a Template)
새로운 메시지 템플릿을 생성합니다.

- **엔드포인트:** `POST /templates`
- **인증:** 필요 (Bearer Token - `editor` 이상 역할)

### 요청 본문 (Request Body)
```json
{
  "workspaceId": "ws_...",
  "name": "신규 가입자 환영 이메일",
  "type": "EMAIL",
  "content": {
    "subject": "안녕하세요, {{user.name}}님!",
    "body_html": "<html><body>환영합니다! {{llm.generate(prompt: '환영 인사말', fallback: '어서오세요!')}}</body></html>"
  }
}
```

### 응답 (`201 Created`)
생성된 템플릿의 전체 객체를 반환합니다.
```json
{
  "id": "tmpl_...",
  "workspaceId": "ws_...",
  "name": "신규 가입자 환영 이메일",
  "type": "EMAIL",
  "content": {
    "subject": "안녕하세요, {{user.name}}님!",
    "body_html": "<html><body>환영합니다! {{llm.generate(prompt: '환영 인사말', fallback: '어서오세요!')}}</body></html>"
  },
  "createdBy": "auth_uid_...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 2. 템플릿 목록 조회 (List Templates)
- **엔드포인트:** `GET /templates`
- **인증:** 필요 (Bearer Token - `viewer` 이상 역할)
- **쿼리 파라미터:** `workspaceId`, `type`

---

## 3. 템플릿 상세 조회 (Retrieve a Template)
- **엔드포인트:** `GET /templates/{templateId}`
- **인증:** 필요 (Bearer Token - `viewer` 이상 역할)

---

## 4. 템플릿 수정 (Update a Template)
- **엔드포인트:** `PUT /templates/{templateId}`
- **인증:** 필요 (Bearer Token - `editor` 이상 역할)
- **참고:** 활성 캠페인에서 사용 중인 템플릿 수정 시 `?force=true` 파라미터 필요.

---

## 5. 템플릿 삭제 (Delete a Template)
- **엔드포인트:** `DELETE /templates/{templateId}`
- **인증:** 필요 (Bearer Token - `editor` 이상 역할)
- **주의:** 활성 캠페인에서 사용 중인 템플릿은 삭제할 수 없습니다.
