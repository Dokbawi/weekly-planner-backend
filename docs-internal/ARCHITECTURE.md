# Architecture

## 기술 스택

| 구분 | 기술 | 버전 | 용도 |
|------|------|------|------|
| Language | TypeScript | 5.3+ | 타입 안정성 및 개발 생산성 |
| Framework | NestJS | 10.3+ | 엔터프라이즈급 Node.js 프레임워크 |
| Database | MongoDB | 8.0+ | NoSQL 문서 데이터베이스 |
| ODM | Mongoose | 8.0+ | MongoDB 객체 모델링 |
| Auth | JWT (Passport) | - | 토큰 기반 인증 |
| Scheduler | @nestjs/schedule | 4.0+ | Cron 기반 작업 스케줄링 |
| Documentation | @nestjs/swagger | - | OpenAPI 문서 자동 생성 |
| Testing | Jest | - | 단위/통합/E2E 테스트 |
| Logging | Winston | - | 구조화된 로깅 |

---

## 프로젝트 구조

```
src/
├── main.ts                          # Application bootstrap
├── app.module.ts                    # Root module
│
├── common/                          # 공통 모듈
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # @CurrentUser() - 현재 로그인 사용자 데코레이터
│   │   └── public.decorator.ts         # @Public() - JWT 인증 제외 데코레이터
│   ├── dto/
│   │   └── api-response.dto.ts         # 공통 API 응답 wrapper
│   ├── filters/
│   │   └── http-exception.filter.ts    # 전역 예외 처리 필터
│   ├── interfaces/
│   │   └── request-with-user.interface.ts  # JWT 인증된 Request 타입
│   ├── interceptors/
│   │   ├── logging.interceptor.ts      # 요청/응답 로깅
│   │   └── performance.interceptor.ts  # 성능 측정
│   ├── middleware/
│   │   └── morgan.middleware.ts        # HTTP 요청 로깅 (Morgan)
│   ├── config/
│   │   └── winston.config.ts           # Winston 로거 설정
│   └── logger/
│       └── logger.module.ts            # 로거 모듈
│
├── auth/                            # 인증 모듈
│   ├── auth.module.ts
│   ├── auth.service.ts              # 회원가입, 로그인 로직
│   ├── auth.controller.ts           # /api/v1/auth
│   ├── dto/
│   │   └── auth.dto.ts              # RegisterDto, LoginDto
│   ├── strategies/
│   │   └── jwt.strategy.ts          # Passport JWT 전략
│   └── guards/
│       └── jwt-auth.guard.ts        # JWT 인증 가드
│
├── user/                            # 사용자 모듈
│   ├── user.module.ts
│   ├── user.service.ts              # 사용자 조회/생성/검증
│   ├── schemas/
│   │   └── user.schema.ts           # User 스키마 (Mongoose)
│   └── dto/
│       └── user-response.dto.ts     # 사용자 응답 DTO
│
├── plan/                            # 주간 계획 모듈
│   ├── plan.module.ts
│   ├── plan.service.ts              # 계획 생성/조회/확정, Task CRUD/이동
│   ├── plan.controller.ts           # /api/v1/plans, /api/v1/today
│   ├── schemas/
│   │   └── plan.schema.ts           # WeeklyPlan, DailyPlan, Task 스키마
│   └── dto/
│       └── plan.dto.ts              # CreatePlanDto, AddTaskDto, MoveTaskDto 등
│
├── changelog/                       # 변경 추적 모듈
│   ├── changelog.module.ts
│   ├── changelog.service.ts         # 변경 기록 생성/조회
│   ├── changelog.controller.ts      # /api/v1/plans/{planId}/changes
│   ├── schemas/
│   │   └── changelog.schema.ts      # ChangeLog 스키마
│   └── dto/
│       └── changelog.dto.ts         # ChangeLog 응답 DTO
│
├── notification/                    # 알림 모듈
│   ├── notification.module.ts
│   ├── notification.service.ts      # 알림 생성/조회/읽음 처리
│   ├── notification.controller.ts   # /api/v1/notifications
│   ├── notification.scheduler.ts    # Cron 기반 알림 스케줄러
│   ├── schemas/
│   │   └── notification.schema.ts   # Notification 스키마
│   └── dto/
│       └── notification.dto.ts      # Notification 응답 DTO
│
└── review/                          # 회고 모듈
    ├── review.module.ts
    ├── review.service.ts            # 주간 회고 데이터 생성
    ├── review.controller.ts         # /api/v1/plans/{planId}/review
    └── dto/
        └── review.dto.ts            # WeeklyReviewDto
```

---

## 모듈 의존성 다이어그램

```
AppModule
├── ConfigModule (global)
├── MongooseModule (global)
├── LoggerModule (global)
├── AuthModule
│   └── UserModule
├── PlanModule
│   ├── UserModule
│   └── ChangelogModule
├── ChangelogModule
├── NotificationModule
│   └── PlanModule
└── ReviewModule
    ├── PlanModule
    └── ChangelogModule
```

---

## 데이터 모델 개요

### User (사용자)
- `_id`: ObjectId
- `email`: string (unique)
- `name`: string
- `password`: string (bcrypt hashed)
- `planningDay`: DayOfWeek (계획 수립일)
- `reviewDay`: DayOfWeek (회고일)

### WeeklyPlan (주간 계획)
- `_id`: ObjectId
- `userId`: ObjectId (ref: User)
- `weekStartDate`: Date (월요일)
- `weekEndDate`: Date (일요일)
- `status`: 'DRAFT' | 'CONFIRMED'
- `dailyPlans`: DailyPlan[] (임베디드)

### DailyPlan (일일 계획)
- `date`: Date
- `tasks`: Task[] (임베디드)

### Task (할 일)
- `id`: string (ObjectId string)
- `title`: string
- `description?`: string
- `priority`: 'HIGH' | 'MEDIUM' | 'LOW'
- `status`: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED'
- `tags`: string[]
- `scheduledTime?`: string (HH:mm)
- `reminder?`: Reminder

### ChangeLog (변경 이력)
- `_id`: ObjectId
- `weeklyPlanId`: ObjectId (ref: WeeklyPlan)
- `userId`: ObjectId (ref: User)
- `targetDate`: Date
- `taskId`: string
- `taskTitle`: string
- `changeType`: 'ADDED' | 'MODIFIED' | 'DELETED' | 'MOVED' | 'STATUS_CHANGED'
- `changes`: any (변경 전후 데이터)
- `reason?`: string
- `changedAt`: Date

### Notification (알림)
- `_id`: ObjectId
- `userId`: ObjectId (ref: User)
- `type`: 'TASK_REMINDER' | 'DAILY_SUMMARY' | 'PLANNING_REMINDER' | 'REVIEW_REMINDER'
- `title`: string
- `message`: string
- `isRead`: boolean
- `createdAt`: Date

**상세 스키마**: 각 모듈의 `schemas/` 디렉토리 참조

---

## MongoDB 인덱스 전략

성능 최적화를 위해 다음 인덱스가 스키마에 정의되어 있습니다:

### User
- `{ email: 1 }` - unique (로그인 시 이메일 조회)

구현 위치: `src/user/schemas/user.schema.ts`

### WeeklyPlan
- `{ userId: 1, weekStartDate: -1 }` - unique (사용자별 주간 계획 조회)

구현 위치: `src/plan/schemas/plan.schema.ts`

### ChangeLog
- `{ weeklyPlanId: 1, changedAt: -1 }` (계획별 변경 이력 조회)
- `{ userId: 1, changedAt: -1 }` (사용자별 변경 이력 조회)

구현 위치: `src/changelog/schemas/changelog.schema.ts`

### Notification
- `{ userId: 1, isRead: 1, createdAt: -1 }` (읽지 않은 알림 조회)

구현 위치: `src/notification/schemas/notification.schema.ts`

---

## 인증 및 인가

### JWT 기반 인증 흐름

1. **회원가입** (`POST /api/v1/auth/register`)
   - 이메일 중복 확인
   - 비밀번호 bcrypt 해싱
   - User 생성

2. **로그인** (`POST /api/v1/auth/login`)
   - 이메일/비밀번호 검증
   - JWT 토큰 발급 (payload: userId, email)
   - 클라이언트에 토큰 반환

3. **보호된 엔드포인트 접근**
   - `Authorization: Bearer <token>` 헤더 검증
   - JwtStrategy에서 토큰 검증 및 사용자 정보 추출
   - `@CurrentUser()` 데코레이터로 컨트롤러에서 사용자 정보 접근

4. **공개 엔드포인트**
   - `@Public()` 데코레이터 사용 시 JWT 검증 생략

구현 위치:
- JWT Strategy: `src/auth/strategies/jwt.strategy.ts`
- JWT Guard: `src/auth/guards/jwt-auth.guard.ts`
- Auth Service: `src/auth/auth.service.ts`

---

## 로깅 및 모니터링

### Winston Logger
- 구조화된 JSON 로깅
- 로그 레벨: error, warn, info, debug
- 파일 저장: `logs/error.log`, `logs/combined.log`
- 콘솔 출력 (개발 환경)

구현 위치: `src/common/config/winston.config.ts`

### Morgan Middleware
- HTTP 요청 로깅
- 포맷: `:method :url :status :response-time ms`

구현 위치: `src/common/middleware/morgan.middleware.ts`

### Logging Interceptor
- 요청/응답 자동 로깅
- 성능 측정

구현 위치: `src/common/interceptors/logging.interceptor.ts`

---

## 전역 설정

### CORS
CORS 설정은 `main.ts`에서 구성됩니다:

```typescript
app.enableCors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});
```

구현 위치: `src/main.ts`

### Global Prefix
모든 API는 `/api/v1` 프리픽스를 사용합니다.

### Swagger
- URL: `/api-docs`
- 자동 생성된 OpenAPI 3.0 문서
- 각 DTO에 `@ApiProperty()` 데코레이터로 스키마 정의

구현 위치: `src/main.ts`

---

## 테스트 구조

```
test/
├── auth.e2e-spec.ts           # 인증 E2E 테스트
├── plan.e2e-spec.ts           # 계획 E2E 테스트
├── changelog.e2e-spec.ts      # 변경 이력 E2E 테스트
├── notification.e2e-spec.ts   # 알림 E2E 테스트
└── review.e2e-spec.ts         # 회고 E2E 테스트
```

각 모듈 내 `*.spec.ts` 파일에서 단위 테스트 수행

---

## 확장 가능성

### 새 모듈 추가 시 고려사항

1. **모듈 생성**
   ```bash
   nest g module {module-name}
   nest g service {module-name}
   nest g controller {module-name}
   ```

2. **스키마 정의**
   - `schemas/` 디렉토리에 Mongoose 스키마 생성
   - 필요한 인덱스 추가

3. **DTO 정의**
   - `dto/` 디렉토리에 요청/응답 DTO 생성
   - `@ApiProperty()` 데코레이터로 Swagger 문서화

4. **의존성 주입**
   - 필요한 모듈을 `imports`에 추가
   - 필요한 서비스를 생성자에 주입

5. **테스트 작성**
   - 단위 테스트 (`*.spec.ts`)
   - E2E 테스트 (`test/*.e2e-spec.ts`)
