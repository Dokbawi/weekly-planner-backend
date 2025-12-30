# Weekly Planner API Guide

## 🚀 Quick Start

### Base URL
```
http://localhost:8080/api/v1
```

### API Documentation
- **Swagger UI**: http://localhost:8080/api-docs
- 실시간 테스트 가능, 모든 엔드포인트와 스키마 확인 가능

### Authentication
대부분의 API는 JWT 토큰 인증이 필요합니다.

```http
Authorization: Bearer {your_jwt_token}
```

---

## 📋 주요 API 엔드포인트

### 1. Authentication

#### 회원가입
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동"
}
```

#### 로그인
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "tokenType": "Bearer",
    "expiresIn": 86400
  }
}
```

### 2. Weekly Plans

#### 주간 계획 생성
```http
POST /plans
Authorization: Bearer {token}
Content-Type: application/json

{
  "weekStartDate": "2025-01-06"  // 주의 시작일 (월요일)
}
```

#### 주간 계획 조회
```http
GET /plans/{planId}
Authorization: Bearer {token}
```

#### 계획 확정
```http
POST /plans/{planId}/confirm
Authorization: Bearer {token}
```

### 3. Tasks

#### Task 추가
```http
POST /plans/{planId}/tasks?date=2025-01-06
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "프로젝트 회의",
  "description": "주간 스프린트 계획",
  "priority": "HIGH",
  "scheduledTime": "2025-01-06T10:00:00Z",
  "reminderMinutes": 15
}
```

#### Task 상태 업데이트
```http
PUT /plans/{planId}/tasks/{taskId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "COMPLETED"  // PENDING, IN_PROGRESS, COMPLETED, CANCELLED, POSTPONED
}
```

#### Task 이동
```http
POST /plans/{planId}/tasks/{taskId}/move
Authorization: Bearer {token}
Content-Type: application/json

{
  "targetDate": "2025-01-07",
  "reason": "일정 변경"
}
```

### 4. Today (오늘 할 일)

#### 오늘의 Task 조회
```http
GET /today
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "date": "2025-01-06",
    "tasks": [...],
    "weeklyPlan": {...}
  }
}
```

### 5. Notifications

#### 알림 목록
```http
GET /notifications
Authorization: Bearer {token}
```

#### 읽지 않은 알림 수
```http
GET /notifications/unread/count
Authorization: Bearer {token}
```

#### 알림 읽음 처리
```http
POST /notifications/{notificationId}/read
Authorization: Bearer {token}
```

### 6. Review (회고)

#### 주간 회고 조회
```http
GET /plans/{planId}/review
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "statistics": {
      "totalPlanned": 15,
      "completed": 12,
      "completionRate": 80,
      ...
    },
    "dailyBreakdown": [...],
    "changeHistory": [...]
  }
}
```

### 7. Change Logs

#### 변경 이력 조회
```http
GET /plans/{planId}/changes
Authorization: Bearer {token}
```

#### 특정 날짜 변경 이력
```http
GET /plans/{planId}/changes/by-date?date=2025-01-06
Authorization: Bearer {token}
```

---

## 🔄 공통 응답 형식

### 성공 응답
```json
{
  "success": true,
  "data": {
    // 응답 데이터
  }
}
```

### 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

---

## 📊 주요 Enum 값

### Task Status
- `PENDING`: 대기중
- `IN_PROGRESS`: 진행중
- `COMPLETED`: 완료
- `CANCELLED`: 취소됨
- `POSTPONED`: 연기됨

### Task Priority
- `LOW`: 낮음
- `MEDIUM`: 중간
- `HIGH`: 높음
- `URGENT`: 긴급

### Plan Status
- `DRAFT`: 초안
- `CONFIRMED`: 확정됨

### Notification Type
- `TASK_REMINDER`: Task 알림
- `DAILY_SUMMARY`: 일일 요약
- `PLANNING_REMINDER`: 계획 수립 알림
- `REVIEW_REMINDER`: 회고 알림

---

## 🔧 테스트 방법

### 1. Swagger UI 사용 (추천)
1. http://localhost:8080/api-docs 접속
2. 원하는 엔드포인트 클릭
3. "Try it out" 버튼 클릭
4. 파라미터 입력 후 "Execute"

### 2. Postman/Insomnia 사용
1. 위의 API 엔드포인트 정보 참고
2. Authorization 헤더에 JWT 토큰 설정
3. 요청 전송

### 3. cURL 사용
```bash
# 로그인
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 계획 조회 (토큰 필요)
curl -X GET http://localhost:8080/api/v1/plans \
  -H "Authorization: Bearer {your_token}"
```

---

## 📝 참고사항

1. **인증이 필요한 API**: `/auth/*` 엔드포인트를 제외한 모든 API는 JWT 토큰 필요
2. **날짜 형식**: `YYYY-MM-DD` (예: 2025-01-06)
3. **시간 형식**: ISO 8601 (예: 2025-01-06T10:00:00Z)
4. **페이지네이션**: 일부 목록 API는 `?page=1&limit=10` 파라미터 지원
5. **에러 처리**: 모든 에러는 일관된 형식으로 반환됨

---

## 💡 문의사항

- **Swagger UI**: http://localhost:8080/api-docs 에서 실시간으로 확인
- **상세 도메인 모델**: `/docs/domain-model.md` 참고
- **비즈니스 규칙**: `/docs/business-rules.md` 참고