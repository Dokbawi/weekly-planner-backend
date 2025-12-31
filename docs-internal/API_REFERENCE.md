# API Reference

모든 API는 `/api/v1` 프리픽스를 사용합니다.

## 공통 응답 형식

모든 API는 다음 형식의 응답을 반환합니다:

```typescript
{
  "success": boolean,
  "data"?: T,           // 성공 시
  "error"?: {           // 실패 시
    "code": string,
    "message": string
  }
}
```

구현 위치: `src/common/dto/api-response.dto.ts`

---

## Authentication

### POST `/api/v1/auth/register`
회원가입

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동",
  "planningDay": "SUNDAY",
  "reviewDay": "SATURDAY"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "홍길동"
  }
}
```

---

### POST `/api/v1/auth/login`
로그인 (JWT 토큰 발급)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "홍길동"
    }
  }
}
```

**인증 헤더 사용법:**
이후 모든 보호된 엔드포인트는 다음 헤더 필요:
```
Authorization: Bearer <accessToken>
```

구현 위치: `src/auth/auth.controller.ts`

---

## Weekly Plans

### POST `/api/v1/plans`
주간 계획 생성 (DRAFT 상태)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "weekStartDate": "2025-01-06"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "weekStartDate": "2025-01-06T00:00:00.000Z",
    "weekEndDate": "2025-01-12T23:59:59.999Z",
    "status": "DRAFT",
    "dailyPlans": [
      { "date": "2025-01-06", "tasks": [] },
      { "date": "2025-01-07", "tasks": [] },
      ...
    ]
  }
}
```

---

### GET `/api/v1/plans`
전체 주간 계획 목록 조회

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "weekStartDate": "2025-01-06T00:00:00.000Z",
      "weekEndDate": "2025-01-12T23:59:59.999Z",
      "status": "CONFIRMED"
    },
    ...
  ]
}
```

---

### GET `/api/v1/plans/{planId}`
특정 주간 계획 상세 조회

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "weekStartDate": "2025-01-06T00:00:00.000Z",
    "weekEndDate": "2025-01-12T23:59:59.999Z",
    "status": "CONFIRMED",
    "dailyPlans": [
      {
        "date": "2025-01-06",
        "tasks": [
          {
            "id": "507f1f77bcf86cd799439013",
            "title": "회의 준비",
            "description": "주간 회의 자료 작성",
            "priority": "HIGH",
            "status": "PENDING",
            "tags": ["work"],
            "scheduledTime": "09:00",
            "reminder": {
              "enabled": true,
              "minutesBefore": 30
            }
          }
        ]
      },
      ...
    ]
  }
}
```

---

### GET `/api/v1/plans/by-date?date={date}`
특정 날짜가 포함된 주간 계획 조회

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `date` (required): YYYY-MM-DD 형식

**Example:** `GET /api/v1/plans/by-date?date=2025-01-08`

**Response:** `200 OK` (위 상세 조회와 동일)

---

### POST `/api/v1/plans/{planId}/confirm`
계획 확정 (DRAFT → CONFIRMED)

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "status": "CONFIRMED",
    ...
  }
}
```

**중요:** 확정 이후 Task 변경은 자동으로 ChangeLog에 기록됩니다.

구현 위치: `src/plan/plan.controller.ts`

---

## Tasks

### POST `/api/v1/plans/{planId}/tasks?date={date}`
Task 추가

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `date` (required): YYYY-MM-DD 형식

**Request Body:**
```json
{
  "title": "회의 준비",
  "description": "주간 회의 자료 작성",
  "priority": "HIGH",
  "tags": ["work"],
  "scheduledTime": "09:00",
  "reminder": {
    "enabled": true,
    "minutesBefore": 30
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "title": "회의 준비",
    "status": "PENDING",
    ...
  }
}
```

---

### PUT `/api/v1/plans/{planId}/tasks/{taskId}`
Task 수정

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "회의 준비 (수정됨)",
  "description": "업데이트된 설명",
  "priority": "MEDIUM",
  "status": "IN_PROGRESS"
}
```

**Response:** `200 OK`

---

### DELETE `/api/v1/plans/{planId}/tasks/{taskId}`
Task 삭제

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": null
}
```

---

### POST `/api/v1/plans/{planId}/tasks/{taskId}/move`
Task 다른 날로 이동

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "targetDate": "2025-01-09",
  "reason": "일정 변경으로 인한 연기"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439014",  // 새로 생성된 Task ID
    "title": "회의 준비",
    "status": "PENDING",
    ...
  }
}
```

**동작 방식:**
1. 원본 Task의 상태를 `POSTPONED`로 변경
2. 대상 날짜에 새로운 Task 생성 (상태: `PENDING`)
3. 계획이 CONFIRMED 상태이면 ChangeLog에 기록

구현 위치: `src/plan/plan.controller.ts`

---

## Change Logs

### GET `/api/v1/plans/{planId}/changes`
전체 변경 이력 조회

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439015",
      "targetDate": "2025-01-08",
      "taskId": "507f1f77bcf86cd799439013",
      "taskTitle": "회의 준비",
      "changeType": "MOVED",
      "changes": {
        "from": "2025-01-08",
        "to": "2025-01-09"
      },
      "reason": "일정 변경으로 인한 연기",
      "changedAt": "2025-01-08T10:30:00.000Z"
    },
    ...
  ]
}
```

---

### GET `/api/v1/plans/{planId}/changes/by-date?date={date}`
특정 날짜 변경 이력 조회

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `date` (required): YYYY-MM-DD 형식

**Response:** `200 OK` (위와 동일, 필터링됨)

구현 위치: `src/changelog/changelog.controller.ts`

---

## Weekly Review

### GET `/api/v1/plans/{planId}/review`
주간 회고 생성

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "weekStartDate": "2025-01-06",
    "weekEndDate": "2025-01-12",
    "summary": {
      "totalTasks": 25,
      "completedTasks": 18,
      "cancelledTasks": 2,
      "postponedTasks": 3,
      "incompleteTasks": 2,
      "completionRate": 72.0
    },
    "dailySummary": [
      {
        "date": "2025-01-06",
        "totalTasks": 5,
        "completedTasks": 4,
        "completionRate": 80.0
      },
      ...
    ],
    "changeLogs": [
      {
        "targetDate": "2025-01-08",
        "taskTitle": "회의 준비",
        "changeType": "MOVED",
        "reason": "일정 변경으로 인한 연기",
        "changedAt": "2025-01-08T10:30:00.000Z"
      },
      ...
    ]
  }
}
```

구현 위치: `src/review/review.controller.ts`

---

## Notifications

### GET `/api/v1/notifications`
전체 알림 목록 조회

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): 조회할 알림 수 (기본: 50)
- `offset` (optional): 페이지네이션 오프셋 (기본: 0)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439016",
      "type": "TASK_REMINDER",
      "title": "할 일 알림",
      "message": "30분 후 '회의 준비' 일정이 있습니다.",
      "isRead": false,
      "createdAt": "2025-01-08T08:30:00.000Z"
    },
    ...
  ]
}
```

---

### GET `/api/v1/notifications/unread`
읽지 않은 알림 조회

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK` (위와 동일, isRead=false만)

---

### GET `/api/v1/notifications/unread/count`
읽지 않은 알림 수 조회

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

### POST `/api/v1/notifications/{notificationId}/read`
알림 읽음 처리

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": null
}
```

---

### POST `/api/v1/notifications/read-all`
전체 알림 읽음 처리

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "modifiedCount": 5
  }
}
```

구현 위치: `src/notification/notification.controller.ts`

---

## Today

### GET `/api/v1/today`
오늘 할 일 조회

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "date": "2025-01-08",
    "tasks": [
      {
        "id": "507f1f77bcf86cd799439013",
        "title": "회의 준비",
        "description": "주간 회의 자료 작성",
        "priority": "HIGH",
        "status": "PENDING",
        "scheduledTime": "09:00"
      },
      ...
    ]
  }
}
```

구현 위치: `src/plan/plan.controller.ts`

---

## 에러 응답

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 설명"
  }
}
```

### 공통 에러 코드

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | BAD_REQUEST | 잘못된 요청 파라미터 |
| 401 | UNAUTHORIZED | 인증 실패 (토큰 없음/만료) |
| 403 | FORBIDDEN | 권한 없음 |
| 404 | NOT_FOUND | 리소스를 찾을 수 없음 |
| 409 | CONFLICT | 리소스 충돌 (예: 이메일 중복) |
| 500 | INTERNAL_SERVER_ERROR | 서버 내부 오류 |

### 도메인별 에러 코드

| Code | Description |
|------|-------------|
| PLAN_NOT_FOUND | 주간 계획을 찾을 수 없음 |
| TASK_NOT_FOUND | Task를 찾을 수 없음 |
| ALREADY_CONFIRMED | 이미 확정된 계획 |
| INVALID_DATE | 잘못된 날짜 형식 |
| INVALID_CREDENTIALS | 이메일/비밀번호 불일치 |
| EMAIL_ALREADY_EXISTS | 이미 존재하는 이메일 |

---

## Swagger 문서

로컬 실행 시 다음 URL에서 인터랙티브 API 문서를 확인할 수 있습니다:

```
http://localhost:3000/api-docs
```

Swagger UI에서 직접 API 테스트 가능합니다.
