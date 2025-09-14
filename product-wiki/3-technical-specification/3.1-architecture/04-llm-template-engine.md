# 3.1.4. LLM 템플릿 실행 엔진 아키텍처

## 1. 개요

이 문서는 이메일 템플릿에 `{{llm.generate()}}` 변수가 포함된 경우, LLM API 호출로 인해 전체 메시지 발송이 지연되는 것을 방지하기 위한 비동기 처리 아키텍처를 정의합니다.

## 2. 아키텍처 다이어그램

```mermaid
sequenceDiagram
    participant CampaignWorker as 메인 워커
    participant LlmQueue as LLM 전용 큐 (Cloud Tasks)
    participant LlmWorker as LLM 전담 워커
    participant LlmApi as LLM API (e.g., OpenAI)
    participant SendGrid as SendGrid API

    CampaignWorker->>CampaignWorker: 1. `{{llm.generate()}}` 변수 감지
    CampaignWorker->>+LlmQueue: 2. LLM 처리 작업 등록 (userId, templateId)
    Note right of CampaignWorker: 메인 워커는<br>즉시 다음 작업 처리

    LlmQueue-->>+LlmWorker: 3. 작업 수신
    LlmWorker->>LlmWorker: 4. DB에서 유저, 템플릿 정보 조회
    LlmWorker->>+LlmApi: 5. LLM API 호출 (프롬프트 전달)
    
    alt LLM 호출 성공
        LlmApi-->>-LlmWorker: 6a. 생성된 텍스트 응답
        LlmWorker->>LlmWorker: 7a. 최종 이메일 콘텐츠 생성
        LlmWorker->>+SendGrid: 8a. 이메일 발송
        SendGrid-->>-LlmWorker: 발송 완료
    else LLM 호출 실패/타임아웃
        LlmApi-->>-LlmWorker: 6b. 에러 또는 타임아웃 발생
        LlmWorker->>LlmWorker: 7b. Fallback 문구로 콘텐츠 생성
        LlmWorker->>+SendGrid: 8b. Fallback 이메일 발송
        SendGrid-->>-LlmWorker: 발송 완료
    end
    LlmWorker-->>-LlmQueue: 작업 완료 (ACK)
```

## 3. 핵심 구성 요소

-   **메인 워커 (CampaignWorker):** 기존의 캠페인 실행 워커입니다. 이메일 발송 노드 처리 시, `{{llm.generate()}}` 변수가 있으면 작업을 LLM 전용 큐에 등록하고 자신의 역할은 즉시 종료합니다.
-   **LLM 전용 큐 (LlmQueue):** `Cloud Tasks`를 사용하여 구성합니다. LLM API 호출 및 발송 작업을 위한 전용 큐로, 메인 워크플로우와 분리되어 동작합니다.
-   **LLM 전담 워커 (LlmWorker):** LLM 전용 큐에 등록된 작업만을 처리하는 별도의 Cloud Run 서비스입니다. LLM API 호출, 최종 콘텐츠 생성, SendGrid를 통한 이메일 발송을 모두 책임집니다.

## 4. 에러 핸들링 및 재시도 정책

-   **LLM API 호출 실패:**
    -   **타임아웃:** API 호출 시 UX 명세에 정의된 `timeout` (기본 15초)을 설정합니다.
    -   **재시도:** 5xx 에러 등 일시적인 문제에 대해 최대 2회까지 즉시 재시도합니다.
    -   **Fallback 처리:** 재시도에도 실패하거나 타임아웃이 발생하면, 템플릿에 정의된 `fallback` 메시지를 사용하여 이메일을 발송합니다. `fallback` 메시지가 정의되지 않은 경우, 해당 이메일 발송은 실패로 기록되고 시스템에 알림을 보냅니다.
-   **치명적 오류:**
    -   `userId`나 `templateId`가 유효하지 않는 등 재시도가 무의미한 오류는 즉시 데드 레터 큐(Dead-letter Queue)로 보내고, 개발팀이 수동으로 문제를 해결할 수 있도록 에러를 리포팅합니다.
