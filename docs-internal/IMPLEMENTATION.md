# Implementation Details

이 문서는 프로젝트의 핵심 기능 구현을 설명합니다. 실제 코드는 참조된 파일 경로에서 확인할 수 있습니다.

---

## 1. 변경 추적 (Change Tracking)

### 개요
**가장 중요한 기능** - 주간 계획이 확정(CONFIRMED)된 이후 발생하는 모든 Task 변경을 자동으로 기록합니다.

### 동작 원리

1. **계획 확정 전 (DRAFT 상태)**
   - Task 변경이 자유롭게 가능
   - ChangeLog에 기록되지 않음

2. **계획 확정 후 (CONFIRMED 상태)**
   - 모든 Task 변경이 ChangeLog에 자동 기록
   - 변경 유형: ADDED, MODIFIED, DELETED, MOVED, STATUS_CHANGED

### 구현 위치

#### ChangelogService.trackChange()
**파일:** `src/changelog/changelog.service.ts:13`

주요 로직:
- 변경 파라미터를 받아 ChangeLog 문서 생성
- weeklyPlanId, userId, targetDate, taskId, changeType 등 기록
- reason(변경 사유) 옵션 지원

#### PlanService에서 ChangeLog 기록 호출

**Task 추가 시:**
- **파일:** `src/plan/plan.service.ts` (addTask 메서드)
- 계획이 CONFIRMED 상태이면 trackChange 호출
- changeType: 'ADDED'

**Task 수정 시:**
- **파일:** `src/plan/plan.service.ts` (updateTask 메서드)
- 계획이 CONFIRMED 상태이면 trackChange 호출
- changeType: 'MODIFIED'
- changes 필드에 변경 전후 데이터 저장

**Task 삭제 시:**
- **파일:** `src/plan/plan.service.ts` (deleteTask 메서드)
- 계획이 CONFIRMED 상태이면 trackChange 호출
- changeType: 'DELETED'

**Task 이동 시:**
- **파일:** `src/plan/plan.service.ts:265` (moveTask 메서드)
- 계획이 CONFIRMED 상태이면 trackChange 호출
- changeType: 'MOVED'
- changes 필드에 { from: sourceDate, to: targetDate } 저장

### ChangeLog 스키마

**파일:** `src/changelog/schemas/changelog.schema.ts`

주요 필드:
- `weeklyPlanId`: 주간 계획 참조
- `userId`: 사용자 참조
- `targetDate`: 변경 대상 날짜
- `taskId`: Task ID (string)
- `taskTitle`: Task 제목
- `changeType`: 변경 유형 (enum)
- `changes`: 변경 전후 데이터 (any)
- `reason`: 변경 사유 (optional)
- `changedAt`: 변경 시각

### 조회 API

**파일:** `src/changelog/changelog.controller.ts`

- `GET /api/v1/plans/{planId}/changes` - 전체 변경 이력
- `GET /api/v1/plans/{planId}/changes/by-date?date={date}` - 날짜별 변경 이력

---

## 2. Task 이동 처리 (Task Move)

### 개요
Task를 다른 날짜로 이동하는 기능. 단순 이동이 아닌, 원본 Task를 POSTPONED 상태로 변경하고 새로운 Task를 생성하는 방식입니다.

### 동작 원리

1. **원본 Task 상태 변경**
   - 원본 Task의 status를 `POSTPONED`로 변경
   - 원본 날짜에는 POSTPONED Task가 남아있음

2. **새 Task 생성**
   - 대상 날짜의 DailyPlan에 새로운 Task 생성
   - 새 Task는 새로운 ID 할당
   - 상태는 `PENDING`으로 초기화

3. **ChangeLog 기록**
   - 계획이 CONFIRMED 상태이면 이동 기록
   - changeType: 'MOVED'
   - changes: { from: sourceDate, to: targetDate }
   - reason: 사용자가 입력한 이유

### 구현 위치

#### PlanService.moveTask()
**파일:** `src/plan/plan.service.ts:265`

주요 단계:
```typescript
// 1. 원본 Task 찾기
const { dailyPlan: sourceDailyPlan, task, date: sourceDate } =
  this.findTaskInPlan(plan, taskId);

// 2. 원본 Task 상태 변경
task.status = TaskStatus.POSTPONED;

// 3. 대상 날짜의 DailyPlan 찾기
const targetDailyPlan = plan.dailyPlans.find(
  dp => dp.date.toISOString().split('T')[0] === dto.targetDate
);

// 4. 새 Task 생성 (새로운 ID)
const newTask: Task = {
  id: new Types.ObjectId().toString(),
  title: task.title,
  description: task.description,
  priority: task.priority,
  status: TaskStatus.PENDING,
  tags: task.tags,
  scheduledTime: task.scheduledTime,
  reminder: task.reminder,
};

// 5. 대상 DailyPlan에 추가
targetDailyPlan.tasks.push(newTask);

// 6. 저장
await plan.save();

// 7. ChangeLog 기록 (CONFIRMED 상태일 때만)
if (plan.status === PlanStatus.CONFIRMED) {
  await this.changelogService.trackChange({
    weeklyPlanId: plan._id.toString(),
    userId: userId,
    targetDate: dto.targetDate,
    taskId: newTask.id,
    taskTitle: newTask.title,
    changeType: ChangeType.MOVED,
    changes: { from: sourceDate, to: dto.targetDate },
    reason: dto.reason,
  });
}
```

#### API Endpoint
**파일:** `src/plan/plan.controller.ts:149`

- `POST /api/v1/plans/{planId}/tasks/{taskId}/move`
- Request Body: `{ targetDate: string, reason?: string }`
- Response: 새로 생성된 Task 정보 반환

### 사용 예시

```bash
POST /api/v1/plans/123/tasks/456/move
{
  "targetDate": "2025-01-10",
  "reason": "일정 변경으로 인한 연기"
}
```

---

## 3. 알림 스케줄러 (Notification Scheduler)

### 개요
Cron 기반으로 자동 실행되는 알림 스케줄러. 4가지 유형의 알림을 자동 생성합니다.

### 구현 위치
**파일:** `src/notification/notification.scheduler.ts`

### 스케줄러 목록

#### 1) Task 리마인더 (매 분 실행)
**메서드:** `checkTaskReminders()`
**Cron:** `@Cron(CronExpression.EVERY_MINUTE)` (line 21)

동작:
- 현재 시각으로부터 정확히 N분 후에 예정된 Task 찾기
- scheduledTime과 reminder.minutesBefore 계산
- 조건을 만족하는 Task에 대해 TASK_REMINDER 알림 생성

예시:
- 현재 시각: 08:30
- Task 예정 시각: 09:00
- minutesBefore: 30
- → 알림 생성

#### 2) 일일 할 일 요약 (매일 08:00)
**메서드:** `sendDailySummary()`
**Cron:** `@Cron('0 0 8 * * *')` (line 70)

동작:
- 오늘 날짜에 Task가 있는 모든 사용자 찾기
- 각 사용자에게 DAILY_SUMMARY 알림 생성
- 메시지: "오늘 할 일 N개가 있습니다."

#### 3) 계획 수립 알림 (매일 09:00)
**메서드:** `sendPlanningReminder()`
**Cron:** `@Cron('0 0 9 * * *')` (line 108)

동작:
- 오늘이 planningDay인 사용자 찾기
- DRAFT 상태의 주간 계획이 있는 사용자에게 알림
- 메시지: "주간 계획을 수립할 시간입니다."

예시:
- 사용자의 planningDay: SUNDAY
- 오늘: 일요일
- → 알림 생성

#### 4) 회고 알림 (매일 18:00)
**메서드:** `sendReviewReminder()`
**Cron:** `@Cron('0 0 18 * * *')` (line 146)

동작:
- 오늘이 reviewDay인 사용자 찾기
- CONFIRMED 상태의 주간 계획이 있는 사용자에게 알림
- 메시지: "주간 회고를 작성할 시간입니다."

예시:
- 사용자의 reviewDay: SATURDAY
- 오늘: 토요일
- → 알림 생성

### Notification 스키마

**파일:** `src/notification/schemas/notification.schema.ts`

주요 필드:
- `userId`: 사용자 참조
- `type`: 알림 유형 (TASK_REMINDER | DAILY_SUMMARY | PLANNING_REMINDER | REVIEW_REMINDER)
- `title`: 알림 제목
- `message`: 알림 내용
- `isRead`: 읽음 여부 (기본: false)
- `createdAt`: 생성 시각

### 알림 조회 및 관리 API

**파일:** `src/notification/notification.controller.ts`

- `GET /api/v1/notifications` - 전체 알림 목록
- `GET /api/v1/notifications/unread` - 읽지 않은 알림
- `GET /api/v1/notifications/unread/count` - 읽지 않은 알림 수
- `POST /api/v1/notifications/{id}/read` - 알림 읽음 처리
- `POST /api/v1/notifications/read-all` - 전체 읽음 처리

---

## 4. 주간 회고 생성 (Weekly Review)

### 개요
주간 계획의 완료 현황과 변경 이력을 분석하여 회고 데이터를 생성합니다.

### 구현 위치
**파일:** `src/review/review.service.ts`

### 회고 데이터 구조

```typescript
{
  weekStartDate: string,
  weekEndDate: string,
  summary: {
    totalTasks: number,           // 전체 Task 수
    completedTasks: number,        // 완료된 Task 수
    cancelledTasks: number,        // 취소된 Task 수
    postponedTasks: number,        // 연기된 Task 수
    incompleteTasks: number,       // 미완료 Task 수
    completionRate: number         // 완료율 (%)
  },
  dailySummary: [                  // 날짜별 요약
    {
      date: string,
      totalTasks: number,
      completedTasks: number,
      completionRate: number
    },
    ...
  ],
  changeLogs: ChangeLog[]          // 변경 이력 목록
}
```

### 주요 계산 로직

1. **전체 통계 계산**
   - 모든 DailyPlan의 Task를 순회
   - 상태별로 카운트 (COMPLETED, CANCELLED, POSTPONED 등)
   - 완료율 = (completedTasks / totalTasks) * 100

2. **날짜별 통계 계산**
   - 각 DailyPlan별로 통계 계산
   - 날짜별 완료율 산출

3. **변경 이력 조회**
   - ChangelogService를 통해 해당 계획의 모든 변경 이력 조회
   - 시간순으로 정렬

### API Endpoint
**파일:** `src/review/review.controller.ts`

- `GET /api/v1/plans/{planId}/review` - 주간 회고 조회

---

## 5. 오늘 할 일 조회 (Today's Tasks)

### 개요
현재 날짜에 해당하는 Task 목록을 빠르게 조회합니다.

### 구현 위치
**파일:** `src/plan/plan.service.ts` (getTodayTasks 메서드)

### 동작 원리

1. **현재 주간 계획 찾기**
   - 오늘 날짜가 포함된 주간 계획 조회
   - weekStartDate ≤ 오늘 ≤ weekEndDate

2. **오늘의 DailyPlan 찾기**
   - 오늘 날짜와 일치하는 DailyPlan 추출

3. **Task 목록 반환**
   - 해당 DailyPlan의 모든 Task 반환

### API Endpoint
**파일:** `src/plan/plan.controller.ts` (getTodayTasks 메서드)

- `GET /api/v1/today` - 오늘 할 일 조회

---

## 6. 공통 응답 Wrapper (API Response)

### 개요
모든 API 응답을 일관된 형식으로 래핑합니다.

### 구현 위치
**파일:** `src/common/dto/api-response.dto.ts`

### 응답 구조

```typescript
export class ApiResponse<T> {
  success: boolean;
  data?: T;           // 성공 시
  error?: ErrorDetail; // 실패 시
}

export class ErrorDetail {
  code: string;
  message: string;
}
```

### 사용 방법

**성공 응답:**
```typescript
return ApiResponse.ok(data);
// { success: true, data: {...} }
```

**실패 응답:**
```typescript
return ApiResponse.fail('ERROR_CODE', '에러 메시지');
// { success: false, error: { code: 'ERROR_CODE', message: '에러 메시지' } }
```

### 전역 예외 필터

**파일:** `src/common/filters/http-exception.filter.ts`

모든 예외를 자동으로 ApiResponse 형식으로 변환합니다.

---

## 7. 인증 및 권한 관리

### JWT Strategy

**파일:** `src/auth/strategies/jwt.strategy.ts`

동작:
- JWT 토큰에서 payload 추출
- payload의 userId로 사용자 조회
- 요청 객체에 user 정보 첨부

### JWT Guard

**파일:** `src/auth/guards/jwt-auth.guard.ts`

동작:
- 전역 가드로 모든 엔드포인트에 기본 적용
- `@Public()` 데코레이터가 있는 엔드포인트는 검증 생략

### 사용자 정보 추출 데코레이터

**파일:** `src/common/decorators/current-user.decorator.ts`

사용법:
```typescript
@Get('/profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

---

## 8. 로깅 시스템

### Winston Logger

**파일:** `src/common/config/winston.config.ts`

설정:
- 로그 레벨: error, warn, info, debug
- 파일 출력: `logs/error.log`, `logs/combined.log`
- 콘솔 출력 (개발 환경)
- JSON 포맷

### Logging Interceptor

**파일:** `src/common/interceptors/logging.interceptor.ts`

기능:
- 모든 요청/응답 자동 로깅
- 실행 시간 측정
- 에러 로깅

### Morgan Middleware

**파일:** `src/common/middleware/morgan.middleware.ts`

기능:
- HTTP 요청 로깅
- 포맷: `:method :url :status :response-time ms`

---

## 9. 성능 최적화

### MongoDB 인덱스

각 스키마 파일에서 인덱스가 정의되어 있습니다:

- **User:** `src/user/schemas/user.schema.ts`
  - `{ email: 1 }` - unique

- **WeeklyPlan:** `src/plan/schemas/plan.schema.ts`
  - `{ userId: 1, weekStartDate: -1 }` - unique

- **ChangeLog:** `src/changelog/schemas/changelog.schema.ts`
  - `{ weeklyPlanId: 1, changedAt: -1 }`
  - `{ userId: 1, changedAt: -1 }`

- **Notification:** `src/notification/schemas/notification.schema.ts`
  - `{ userId: 1, isRead: 1, createdAt: -1 }`

### 쿼리 최적화

- 필요한 필드만 조회 (projection)
- populate 사용 시 필드 제한
- 페이지네이션 구현 (알림 조회 등)

---

## 10. 테스트 전략

### E2E 테스트

**파일:** `test/*.e2e-spec.ts`

구성:
- MongoDB Memory Server 사용
- 독립적인 테스트 데이터베이스
- 각 테스트마다 DB 초기화

주요 테스트:
- 인증 플로우
- 계획 생성 및 확정
- Task CRUD 및 이동
- ChangeLog 기록
- 알림 생성 및 조회
- 회고 데이터 생성

### 단위 테스트

**파일:** `src/**/*.spec.ts`

테스트 대상:
- Service 로직
- 유틸리티 함수
- Validator

---

## 참고사항

### 코드 컨벤션

- **파일명:** kebab-case (예: `user.service.ts`)
- **클래스명:** PascalCase (예: `UserService`)
- **변수/함수:** camelCase (예: `getUserById`)
- **상수:** UPPER_SNAKE_CASE (예: `MAX_RETRY_COUNT`)

### 주석 작성

중요한 비즈니스 로직에는 주석 작성:
```typescript
// 계획이 CONFIRMED 상태일 때만 변경 기록
if (plan.status === PlanStatus.CONFIRMED) {
  await this.changelogService.trackChange({...});
}
```

### 에러 처리

명시적인 에러 메시지 사용:
```typescript
throw new NotFoundException('주간 계획을 찾을 수 없습니다.');
throw new ConflictException('이미 확정된 계획입니다.');
```
