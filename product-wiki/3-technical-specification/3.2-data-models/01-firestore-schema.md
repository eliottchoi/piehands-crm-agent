# 3.2.1. Firestore 스키마 (하이브리드 DB 모델)

이 문서는 우리 시스템의 **Firestore** 데이터베이스 컬렉션의 정식 구조를 정의합니다. 정형 데이터(Users, Workspaces 등)의 스키마는 `03-postgresql-schema.md` 문서를 참조하십시오.

---

## `campaigns` 컬렉션
캠페인의 유연한 `canvasDefinition`을 저장하는 데 사용됩니다. 캠페인의 핵심 메타데이터는 PostgreSQL에 저장됩니다.

| 필드명 | 타입 | 필수 여부 | 설명 | 예시 |
| :--- | :--- | :--- | :--- | :--- |
| `canvasDefinition`| `Map` | Yes | 모든 노드와 연결, 설정을 포함하는 캔버스 객체. | `{ "nodes": [...], "edges": [...] }` |
| `updatedAt` | `Timestamp`| Yes | 캔버스가 마지막으로 수정된 시간. | `2025-09-18T15:00:00Z` |

---

## `users/{userId}/events` (하위 컬렉션)
특정 유저가 발생시킨 모든 이벤트의 타임라인을 저장합니다.

| 필드명 | 타입 | 필수 여부 | 설명 | 예시 |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `String` | Yes | 이벤트 이름 (예: `Login`, `Purchase`) | "Purchase" |
| `timestamp`| `Timestamp`| Yes | 이벤트 발생 시간 | `2025-09-16T11:00:00Z`|
| `properties`| `Map` | No | 이벤트 관련 추가 정보 | `{ "product_id": "abc" }` |

---

## `users/{userId}/enrollments` (하위 컬렉션)
특정 유저가 참여한 모든 캠페인 여정의 상태와 현재 위치를 기록합니다.

| 필드명 | 타입 | 필수 여부 | 설명 | 예시 |
| :--- | :--- | :--- | :--- | :--- |
| `campaignId` | `String` | Yes | 참여 중인 캠페인의 ID. | `camp_abc123` |
| `status` | `String` | Yes | 여정 상태 (`ACTIVE`, `COMPLETED`, `DROPPED`) | "ACTIVE" |
| `currentNodeId`| `String` | No | 현재 머물러 있는 캔버스 노드의 ID. | `node_email_001` |
| `enrolledAt` | `Timestamp`| Yes | 여정을 시작한 시간. | `2025-09-16T11:00:00Z` |
| `updatedAt` | `Timestamp`| Yes | 상태가 마지막으로 업데이트된 시간. | `2025-09-17T11:05:00Z` |
