# 3.1.3. 캠페인 실행 엔진 (Campaign Execution Engine)

## 1. 개요

캠페인 실행 엔진은 `canvasDefinition`에 정의된 로직에 따라 사용자의 여정을 진행시키는 핵심 구성 요소입니다. 엔진은 Cloud Tasks와 백그라운드 워커(Cloud Run)의 조합으로 구현되며, 모든 노드(Node)의 실행을 비동기적으로 처리합니다.

## 2. 엔진 실행 흐름

```mermaid
sequenceDiagram
    participant LastStep as 이전 단계 워커
    participant TaskQueue as Cloud Tasks (campaign-queue)
    participant EngineWorker as 캠페인 실행 워커
    participant Rdbms as PostgreSQL
    participant Nosql as Firestore
    participant ExternalApi as 외부 API (SendGrid 등)

    LastStep->>+TaskQueue: ExecuteNode Task 생성 (userId, campaignId, nodeId)
    TaskQueue-->>+EngineWorker: Trigger Worker (payload)
    
    EngineWorker->>+Nosql: 1. `enrollments` 문서 조회 (현재 상태 확인)
    Nosql-->>-EngineWorker: 현재 enrollment 상태
    
    EngineWorker->>+Nosql: 2. `canvasDefinition` 조회
    Nosql-->>-EngineWorker: 전체 캔버스 구조
    
    EngineWorker->>EngineWorker: 3. 현재 노드(nodeId) 로직 실행
    
    alt Action Node (예: 이메일 발송)
        EngineWorker->>+Rdbms: `templates` 테이블에서 템플릿 조회
        Rdbms-->>-EngineWorker: 템플릿 내용
        EngineWorker->>+ExternalApi: SendGrid API 호출 (이메일 발송)
        ExternalApi-->>-EngineWorker: 발송 성공
    
    else Flow Control Node (예: 시간 대기)
        EngineWorker->>EngineWorker: 대기 종료 시각 계산
        EngineWorker->>+TaskQueue: 예약 Task 생성 (ExecuteNode, 대기 종료 시각)
        EngineWorker-->>-TaskQueue: 작업 완료 (ACK)
        Note right of EngineWorker: 현재 흐름은 여기서<br>일시적으로 종료됨
    end

    EngineWorker->>EngineWorker: 4. 다음 노드(Node) 찾기
    
    alt 다음 노드가 존재할 경우
        EngineWorker->>+Nosql: 5. `enrollments` 문서 업데이트 (currentNodeId 변경)
        Nosql-->>-EngineWorker: 업데이트 성공
        EngineWorker->>+TaskQueue: 6. 다음 노드 실행 Task 즉시 생성
        TaskQueue-->>-EngineWorker: 생성 성공
    else 여정 종료
        EngineWorker->>+Nosql: 5. `enrollments` 문서 업데이트 (status: COMPLETED)
        Nosql-->>-EngineWorker: 업데이트 성공
    end
    
    EngineWorker-->>-TaskQueue: 작업 완료 (ACK)
```

## 3. 핵심 로직: 노드(Node) 실행

모든 캠페인 여정의 단계는 `ExecuteNode`라는 단일 유형의 태스크(Task)로 Cloud Tasks 큐에 추가됩니다.

- **Task Payload**: `{ "userId": "...", "campaignId": "...", "nodeId": "..." }`

캠페인 실행 워커는 이 Payload를 받아 다음 로직을 순서대로 수행합니다.

1.  **상태 조회**: Firestore의 `users/{userId}/enrollments`에서 해당 캠페인의 참여 상태를 조회하여, 여전히 `ACTIVE` 상태인지 확인합니다.
2.  **캔버스 로드**: Firestore의 `campaigns/{campaignId}`에서 `canvasDefinition`을 가져와 전체 캠페인 구조를 메모리에 로드합니다.
3.  **현재 노드 실행**: `nodeId`에 해당하는 노드를 찾아 해당 노드의 유형에 맞는 로직을 실행합니다.
    - **`액션 (Action)` 노드: 이메일 발송**
        1.  PostgreSQL에서 `templateId`에 해당하는 템플릿 정보를 조회합니다.
        2.  **LLM 변수 포함 여부 확인**: 템플릿 내용에 `{{llm.generate(...)}}`와 같은 변수가 포함되어 있는지 검사합니다.
            - **(LLM 미포함 시) 일반 발송**:
                - 사용자 속성과 템플릿을 조합하여 최종 메시지를 생성합니다.
                - SendGrid API를 직접 호출하여 이메일을 발송하고, 결과를 내부 이벤트로 기록합니다. (Rate Limit 정책 준수)
            - **(LLM 포함 시) LLM 처리 위임**:
                - `userId`, `templateId`, `context` 등의 정보를 포함한 작업을 **LLM 처리 전용 큐(Cloud Tasks)**에 등록하고, 현재 캠페인 워커의 작업은 **여기서 즉시 종료**합니다. 이메일 발송 자체는 LLM 워커가 담당하게 됩니다.

## 4. LLM 전용 워커 로직

LLM 처리 큐의 작업을 전담하는 별도의 워커입니다.

1.  **작업 수신**: 큐로부터 `{ "userId": "...", "templateId": "..." }` 형태의 작업을 전달받습니다.
2.  **데이터 조회**: `userId`와 `templateId`를 이용해 PostgreSQL에서 사용자 속성과 이메일 템플릿을 조회합니다.
3.  **LLM API 호출**: 템플릿 내용과 사용자 속성을 조합하여 LLM API에 전달할 프롬프트(Prompt)를 생성하고, API를 호출합니다.
4.  **최종 콘텐츠 생성**: LLM API로부터 받은 응답(생성된 텍스트)을 원본 템플릿에 결합하여 최종 이메일 콘텐츠를 완성합니다.
5.  **이메일 발송**: 완성된 콘텐츠로 SendGrid API를 호출하여 이메일을 발송합니다.

### LLM 워커 에러 핸들링

- **LLM API 타임아웃/오류**:
  - **재시도**: 일시적인 네트워크 오류 등을 고려하여 최대 2회까지 재시도합니다.
  - **Fallback 처리**: 재시도에도 실패할 경우, 미리 정의된 **Fallback 템플릿**(예: "AI 추천 컨텐츠를 불러오는 데 실패했습니다.")을 사용하여 이메일을 발송하거나, 발송 자체를 실패 처리하고 내부 알림을 보냅니다.
- **치명적 오류**:
  - 잘못된 `templateId` 등으로 데이터 조회가 불가능한 경우, 재시도 없이 즉시 데드 레터 큐로 보내고 에러를 리포팅합니다.

## 5. 일반 실패 처리 및 재시도 정책

안정적인 여정 진행을 위해 모든 태스크는 실패 시 재시도 로직을 가집니다.

- **재시도 정책**:
  - 외부 API 호출 실패, 일시적인 데이터베이스 오류 등 복구 가능한 에러에 대해 Cloud Tasks의 지수 백오프(Exponential Backoff) 재시도 정책을 적용합니다.
  - **설정**: 최대 5회 재시도, 초기 대기 시간 10초.
- **최종 실패 처리 (Dead-lettering)**:
  - 재시도 횟수를 초과하여 최종적으로 실패한 태스크는 데드 레터 큐(Dead-letter Queue)로 전송됩니다.
  - 데드 레터 큐로 전송된 태스크는 개발팀의 수동 개입(조사, 데이터 보정, 재처리)을 위해 별도의 모니터링 및 알림(Alerting) 채널(예: Slack)로 전송됩니다.
  - 해당 사용자의 캠페인 참여 상태(`enrollments` 문서)는 `DROPPED`로 변경하여, 더 이상 비정상적인 여정이 진행되지 않도록 격리합니다.
- **치명적 오류**:
  - 페이로드(`payload`)의 데이터가 잘못되어 파싱이 불가능하거나, `canvasDefinition`에 `nodeId`가 존재하지 않는 등 재시도해도 절대 성공할 수 없는 오류의 경우, 즉시 데드 레터 큐로 보내고 에러 리포팅 시스템(Sentry 등)에 보고합니다.
