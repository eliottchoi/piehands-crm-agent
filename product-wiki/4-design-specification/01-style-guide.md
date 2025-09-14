# 4.1. 스타일 가이드

이 문서는 Piehands CRM 프로젝트의 일관된 사용자 경험을 제공하기 위한 기본 UI 스타일 가이드를 정의합니다. 모든 UI 컴포넌트는 특별한 명시가 없는 한 이 가이드를 따라야 합니다.

---

### 1. 색상 (Color Palette)

| 역할 | 색상 코드 | 설명 |
| --- | --- | --- |
| **Primary** | `#4A90E2` | 주요 버튼, 링크, 활성화된 요소 등 핵심 상호작용에 사용됩니다. |
| **Secondary** | `#F5A623` | 보조적인 액션이나 주의를 환기시킬 때 사용됩니다. (예: 경고) |
| **Text (Primary)** | `#333333` | 본문, 제목 등 대부분의 텍스트에 사용됩니다. |
| **Text (Secondary)** | `#777777` | 보조적인 정보, 비활성화된 텍스트에 사용됩니다. |
| **Border / Line** | `#DDDDDD` | 컴포넌트 간 경계선, 구분선에 사용됩니다. |
| **Background** | `#F9F9F9` | 페이지 및 컴포넌트의 기본 배경색입니다. |
| **Success** | `#7ED321` | 성공 상태를 나타낼 때 사용됩니다. |
| **Error** | `#D0021B` | 오류 상태를 나타낼 때 사용됩니다. |

---

### 2. 타이포그래피 (Typography)

- **기본 폰트:** `Inter` 또는 시스템 기본 sans-serif 폰트
- **기본 크기:** `14px`
- **기본 줄 간격:** `1.5`

| 스타일 | 크기 | 두께 | 설명 |
| --- | --- | --- | --- |
| **Heading 1** | `24px` | `Bold` | 페이지 제목 |
| **Heading 2** | `20px` | `Bold` | 섹션 제목 |
| **Heading 3** | `16px` | `Semi-bold` | 하위 섹션 제목 |
| **Body (Default)** | `14px` | `Regular` | 본문 텍스트 |
| **Label** | `12px` | `Medium` | 입력 필드 레이블, 작은 텍스트 |

---

### 3. 버튼 (Buttons)

- **기본 스타일:** `Rounded Rectangle` (border-radius: `4px`)
- **패딩:** `8px 16px` (세로 x 가로)

| 종류 | 배경색 | 글자색 | 테두리 | 호버(Hover) 상태 |
| --- | --- | --- | --- | --- |
| **Primary** | `Primary` (`#4A90E2`) | `#FFFFFF` | 없음 | 배경색 밝기 10% 증가 |
| **Secondary** | `Transparent` | `Text (Primary)` | `1px solid #DDDDDD` | 배경색 `#F9F9F9` |
| **Destructive** | `Error` (`#D0021B`) | `#FFFFFF` | 없음 | 배경색 밝기 10% 증가 |

---

### 4. 입력 필드 (Input Fields)

- **기본 스타일:** `Rounded Rectangle` (border-radius: `4px`)
- **패딩:** `8px 12px`
- **배경색:** `#FFFFFF`
- **테두리:** `1px solid #DDDDDD`
- **Focus 상태:** 테두리 색상을 `Primary` (`#4A90E2`)로 변경하고, `box-shadow` 효과 적용
