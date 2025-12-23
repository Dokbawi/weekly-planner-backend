# Weekly Planner - Backend

NestJS + TypeScript 기반 REST API 서버

## 프로젝트 개요

주간 일정 관리 서비스의 백엔드 API 서버입니다.
상세 도메인 모델과 API 스펙은 `docs/` 서브모듈을 참조하세요.

### 참조 문서 (docs/ 서브모듈)
- `docs/domain-model.md` - 도메인 모델 정의
- `docs/api-contract.md` - REST API 스펙
- `docs/business-rules.md` - 비즈니스 규칙

---

## 로컬 실행 가이드

### 필수 요구사항
- Node.js 18+
- MongoDB (로컬 설치 또는 Atlas)
- npm 또는 yarn

### 환경 변수 설정

`.env` 파일을 프로젝트 루트에 생성하거나 환경 변수로 설정:

```bash
# MongoDB 연결 URI
MONGODB_URI=mongodb://localhost:27017/weekly_planner

# JWT 시크릿 키 (32자 이상)
JWT_SECRET=your-256-bit-secret-key-here-minimum-32-chars

# JWT 만료 시간 (선택, 기본: 24h)
JWT_EXPIRATION=24h
```

### 실행 방법

```bash
# 서브모듈 초기화 (최초 1회)
git submodule update --init --recursive

# 의존성 설치
npm install

# 개발 모드 실행
npm run start:dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

### 확인
- API 서버: http://localhost:3000
- Swagger UI: http://localhost:3000/api-docs
- API Prefix: `/api/v1`

---

## 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| Language | TypeScript | 5.3+ |
| Framework | NestJS | 10.3+ |
| Database | MongoDB + Mongoose | 8.0+ |
| Auth | JWT (Passport) | passport-jwt |
| Docs | Swagger (OpenAPI) | @nestjs/swagger |
| Scheduler | @nestjs/schedule | 4.0+ |

---

## 프로젝트 구조

```
src/
├── main.ts                          # Application bootstrap
├── app.module.ts                    # Root module
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # @CurrentUser()
│   │   └── public.decorator.ts         # @Public()
│   ├── dto/
│   │   └── api-response.dto.ts         # 공통 응답 wrapper
│   ├── filters/
│   │   └── http-exception.filter.ts    # 전역 예외 처리
│   └── interfaces/
│       └── request-with-user.interface.ts
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── dto/
│   │   └── auth.dto.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   └── guards/
│       └── jwt-auth.guard.ts
│
├── user/
│   ├── user.module.ts
│   ├── user.service.ts
│   ├── schemas/
│   │   └── user.schema.ts
│   └── dto/
│       └── user-response.dto.ts
│
├── plan/
│   ├── plan.module.ts
│   ├── plan.service.ts
│   ├── plan.controller.ts           # PlanController + TodayController
│   ├── schemas/
│   │   └── plan.schema.ts           # WeeklyPlan, DailyPlan, Task
│   └── dto/
│       └── plan.dto.ts
│
├── changelog/
│   ├── changelog.module.ts
│   ├── changelog.service.ts
│   ├── changelog.controller.ts
│   ├── schemas/
│   │   └── changelog.schema.ts
│   └── dto/
│       └── changelog.dto.ts
│
├── notification/
│   ├── notification.module.ts
│   ├── notification.service.ts
│   ├── notification.controller.ts
│   ├── notification.scheduler.ts     # @Cron 알림 스케줄러
│   ├── schemas/
│   │   └── notification.schema.ts
│   └── dto/
│       └── notification.dto.ts
│
└── review/
    ├── review.module.ts
    ├── review.service.ts
    ├── review.controller.ts
    └── dto/
        └── review.dto.ts
```

---

## 핵심 구현 사항

### 1. 변경 추적 (ChangelogService)

**가장 중요한 기능** - 확정 후 모든 Task 변경을 기록

```typescript
// changelog.service.ts
async trackChange(params: TrackChangeParams): Promise<ChangeLog> {
  const changeLog = new this.changeLogModel({
    weeklyPlanId: new Types.ObjectId(params.weeklyPlanId),
    userId: new Types.ObjectId(params.userId),
    targetDate: params.targetDate,
    taskId: params.taskId,
    taskTitle: params.taskTitle,
    changeType: params.changeType,
    changes: params.changes,
    reason: params.reason,
    changedAt: new Date(),
  });

  return changeLog.save();
}
```

### 2. Task 이동 처리

```typescript
// plan.service.ts
async moveTask(planId: string, userId: string, taskId: string, dto: MoveTaskDto): Promise<TaskResponseDto> {
  const plan = await this.findPlanOrThrow(planId, userId);
  const { dailyPlan: sourceDailyPlan, task, date: sourceDate } = this.findTaskInPlan(plan, taskId);

  // 1. 원본 상태를 POSTPONED로 변경
  task.status = TaskStatus.POSTPONED;

  // 2. 대상 날짜에 새 Task 생성
  const newTask: Task = {
    id: new Types.ObjectId().toString(),
    title: task.title,
    status: TaskStatus.PENDING,
    // ... other fields
  };
  targetDailyPlan.tasks.push(newTask);

  // 3. 변경 기록 (CONFIRMED 상태일 때만)
  if (plan.status === PlanStatus.CONFIRMED) {
    await this.changelogService.trackChange({...});
  }

  return this.toTaskResponse(newTask);
}
```

### 3. 알림 스케줄러

```typescript
// notification.scheduler.ts
@Injectable()
export class NotificationScheduler {
  // 매 분 실행 - Task 알림 체크
  @Cron(CronExpression.EVERY_MINUTE)
  async checkTaskReminders() {
    // scheduledTime - minutesBefore == now 인 Task 찾기
    // Notification 생성
  }

  // 매일 08:00 - 오늘 할 일 요약
  @Cron('0 0 8 * * *')
  async sendDailySummary() {
    // 오늘 Task가 있는 사용자에게 알림
  }

  // 매일 09:00 - 계획 수립 알림 (planningDay인 사용자)
  @Cron('0 0 9 * * *')
  async sendPlanningReminder() {
    // DRAFT 상태 계획이 있는 사용자에게 알림
  }

  // 매일 18:00 - 회고 알림 (reviewDay인 사용자)
  @Cron('0 0 18 * * *')
  async sendReviewReminder() {
    // CONFIRMED 상태 계획이 있는 사용자에게 알림
  }
}
```

---

## API 응답 형식

```typescript
// 공통 응답 wrapper
export class ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorDetail;

  static ok<T>(data: T): ApiResponse<T> {
    return { success: true, data };
  }

  static fail(code: string, message: string): ApiResponse<null> {
    return { success: false, error: { code, message } };
  }
}

export class ErrorDetail {
  code: string;
  message: string;
}
```

---

## 구현된 API 목록

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /register | 회원가입 |
| POST | /login | 로그인 (JWT 토큰 발급) |

### Weekly Plans (`/api/v1/plans`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | / | 주간 계획 생성 |
| GET | / | 전체 주간 계획 목록 |
| GET | /{planId} | 특정 주간 계획 조회 |
| GET | /by-date?date={date} | 날짜로 주간 계획 조회 |
| POST | /{planId}/confirm | 계획 확정 |

### Tasks (`/api/v1/plans/{planId}/tasks`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /?date={date} | Task 추가 |
| PUT | /{taskId} | Task 수정 |
| DELETE | /{taskId} | Task 삭제 |
| POST | /{taskId}/move | Task 다른 날로 이동 |

### Change Logs (`/api/v1/plans/{planId}/changes`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | 전체 변경 이력 |
| GET | /by-date?date={date} | 특정 날짜 변경 이력 |

### Weekly Review (`/api/v1/plans/{planId}/review`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | 주간 회고 생성 |

### Notifications (`/api/v1/notifications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | 전체 알림 목록 |
| GET | /unread | 읽지 않은 알림 |
| GET | /unread/count | 읽지 않은 알림 수 |
| POST | /{notificationId}/read | 알림 읽음 처리 |
| POST | /read-all | 전체 알림 읽음 처리 |

### Today (`/api/v1/today`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | 오늘 할 일 조회 |

---

## MongoDB 인덱스

스키마에 직접 정의됨:

```typescript
// user.schema.ts
UserSchema.index({ email: 1 }, { unique: true });

// plan.schema.ts
WeeklyPlanSchema.index({ userId: 1, weekStartDate: -1 }, { unique: true });

// changelog.schema.ts
ChangeLogSchema.index({ weeklyPlanId: 1, changedAt: -1 });
ChangeLogSchema.index({ userId: 1, changedAt: -1 });

// notification.schema.ts
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
```

---

## CORS 설정

```typescript
// main.ts
app.enableCors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});
```

---

## 개발 스크립트

```bash
# 개발 모드 (watch)
npm run start:dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod

# 린트
npm run lint

# 테스트
npm run test

# E2E 테스트
npm run test:e2e
```

---

## Git Submodule 설정

```bash
# docs 서브모듈 추가
git submodule add https://github.com/{username}/weekly-planner-docs.git docs

# 클론 시 서브모듈 포함
git clone --recurse-submodules https://github.com/{username}/weekly-planner-backend.git

# 서브모듈 업데이트
git submodule update --remote docs
```
