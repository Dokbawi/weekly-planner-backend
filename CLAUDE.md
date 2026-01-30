# Weekly Planner - Backend

NestJS + TypeScript 기반 REST API 서버

## 빠른 시작

```bash
npm install
npm run start:dev
```

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api-docs

## 환경 변수

```env
MONGODB_URI=mongodb://localhost:27017/weekly_planner
JWT_SECRET=your-256-bit-secret-key-minimum-32-chars
REDIS_URL=redis://localhost:6379    # 미설정 시 인메모리 캐시 사용
PORT=3000
```

---

## 문서 참조 가이드

### 백엔드 개발 (docs-internal/)

| 작업 | 참조 문서 |
|------|----------|
| 프로젝트 구조, 모듈 이해 | [ARCHITECTURE.md](./docs-internal/ARCHITECTURE.md) |
| API 엔드포인트 확인 | [API_REFERENCE.md](./docs-internal/API_REFERENCE.md) |
| 로컬 환경 설정, 테스트 | [DEVELOPMENT.md](./docs-internal/DEVELOPMENT.md) |
| 핵심 기능 구현 상세 | [IMPLEMENTATION.md](./docs-internal/IMPLEMENTATION.md) |
| GCP 배포 가이드 | [DEPLOYMENT.md](./docs-internal/DEPLOYMENT.md) |

### 프론트엔드 연동 (docs/ 서브모듈)

| 작업 | 참조 문서 |
|------|----------|
| 프로젝트 전체 개요 | [PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md) |
| API 스펙 확인 | [api-contract.md](./docs/api-contract.md) |
| 도메인 모델 이해 | [domain-model.md](./docs/domain-model.md) |
| 비즈니스 규칙 확인 | [business-rules.md](./docs/business-rules.md) |
| API 연동 가이드 | [backend-integration-guide.md](./docs/backend-integration-guide.md) |
| 백엔드 API 요청 | [backend-api-requests.md](./docs/backend-api-requests.md) |

---

## 프로젝트 구조

```
src/
├── auth/              # 인증 (JWT, Passport)
├── user/              # 사용자 관리
├── plan/              # 주간 계획 및 Task CRUD
├── changelog/         # 변경 추적 시스템
├── notification/      # 알림 및 스케줄러
├── review/            # 주간 회고
├── commute-routine/   # 출퇴근 계산기
├── health/            # 헬스 체크
└── common/            # 공통 모듈
    ├── cache/         # Redis/인메모리 캐시 (Cache-Aside)
    ├── decorators/
    ├── filters/
    ├── interceptors/
    └── config/
```

---

## 핵심 기능 요약

### 1. 변경 추적 시스템
계획 확정(CONFIRMED) 후 Task 변경 자동 기록
- 구현: `src/changelog/changelog.service.ts`
- 상세: [IMPLEMENTATION.md#변경-추적](./docs-internal/IMPLEMENTATION.md)

### 2. Task 이동 처리
원본 POSTPONED → 대상 날짜에 새 Task 생성
- 구현: `src/plan/plan.service.ts`
- 상세: [IMPLEMENTATION.md#task-이동](./docs-internal/IMPLEMENTATION.md)

### 3. 알림 스케줄러
Cron 기반 자동 알림 (리마인더, 일일 요약, 계획/회고 알림)
- 구현: `src/notification/notification.scheduler.ts`
- 상세: [IMPLEMENTATION.md#알림-스케줄러](./docs-internal/IMPLEMENTATION.md)

### 4. 주간 회고
완료율, 통계, 변경 이력 자동 분석
- 구현: `src/review/review.service.ts`
- 상세: [IMPLEMENTATION.md#주간-회고](./docs-internal/IMPLEMENTATION.md)

### 5. 출퇴근 계산기
도착 시간 기준 출발 시간 역산
- 구현: `src/commute-routine/commute-routine.service.ts`
- API: `POST /commute-routines/{id}/calculate`

### 6. Redis 캐싱 (Cache-Aside 패턴)
읽기 빈도가 높은 API에 캐시 적용, 쓰기 시 자동 무효화
- 구현: `src/common/cache/cache.module.ts`, `src/common/cache/cache.service.ts`
- 적용 서비스: plan (5분), notification (2분), commute-routine (30분), review (30분)
- `REDIS_URL` 설정 시 Redis, 미설정 시 인메모리 캐시 자동 전환
- 모든 캐시 연산은 실패 시 graceful fallback (서비스 중단 없음)

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | NestJS 10.3+ |
| Language | TypeScript 5.3+ |
| Database | MongoDB 8.0+ (Mongoose) |
| Auth | JWT (Passport) |
| Cache | Redis (cache-manager + cache-manager-redis-yet) |
| Scheduler | @nestjs/schedule |
| Docs | Swagger (OpenAPI) |

상세: [ARCHITECTURE.md](./docs-internal/ARCHITECTURE.md)

---

## 배포

| 항목 | 값 |
|------|-----|
| 플랫폼 | GCP Cloud Run |
| 리전 | asia-northeast3 (Seoul) |
| CI/CD | GitHub Actions |
| DB | MongoDB Atlas |
| Cache | Redis Cloud (Free tier) |
| 인증 | Workload Identity Federation |

상세: [DEPLOYMENT.md](./docs-internal/DEPLOYMENT.md)

---

## 주요 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /auth/register | 회원가입 |
| POST | /auth/login | 로그인 |
| GET | /auth/me | 현재 사용자 |
| GET | /plans/current | 현재 주 계획 |
| POST | /plans/{id}/confirm | 계획 확정 |
| POST | /plans/{id}/tasks | Task 추가 |
| PUT | /plans/{id}/tasks/reorder | Task 순서 변경 |
| POST | /plans/{id}/tasks/{taskId}/move | Task 이동 |
| PUT | /plans/{id}/memo | 일일 메모 수정 |
| GET | /plans/{id}/changes | 변경 이력 |
| GET | /reviews/{id} | 주간 회고 |
| GET | /notifications | 알림 목록 |
| PUT | /notifications/{id}/read | 알림 읽음 |
| GET | /today | 오늘 할 일 |
| GET | /commute-routines | 출퇴근 루틴 목록 |
| POST | /commute-routines | 루틴 생성 |
| POST | /commute-routines/{id}/calculate | 출발 시간 계산 |

전체 API: [API_REFERENCE.md](./docs-internal/API_REFERENCE.md)

---

## 개발 명령어

```bash
npm run start:dev    # 개발 모드
npm run build        # 빌드
npm run test         # 테스트
npm run test:e2e     # E2E 테스트
npm run lint         # 린트
```

상세: [DEVELOPMENT.md](./docs-internal/DEVELOPMENT.md)

---

## 테스트

### 테스트 구조

```
test/
├── test-helper.ts           # 공통 테스트 유틸 (인증, 헬퍼 함수)
├── auth/
│   └── auth.e2e-spec.ts     # 인증 API 테스트
├── plan/
│   └── plan.e2e-spec.ts     # 주간 계획, Task CRUD 테스트
├── today/
│   └── today.e2e-spec.ts    # 오늘 할 일 API 테스트
├── notification/
│   └── notification.e2e-spec.ts  # 알림 API 테스트
├── changelog/
│   └── changelog.e2e-spec.ts     # 변경 추적 테스트
├── review/
│   └── review.e2e-spec.ts   # 주간 회고 테스트
├── commute-routine/
│   └── commute-routine.e2e-spec.ts  # 출퇴근 루틴 테스트
└── health/
    └── health.e2e-spec.ts   # 헬스 체크 테스트
```

### 테스트 실행

```bash
# 전체 E2E 테스트
npm run test:e2e

# 특정 모듈 테스트
npm run test:e2e -- --testPathPattern=auth
npm run test:e2e -- --testPathPattern=plan
npm run test:e2e -- --testPathPattern=commute-routine

# watch 모드
npm run test:e2e -- --watch
```

### 테스트 헬퍼 사용법

```typescript
import {
  setupTestGlobal,
  TestGlobal,
  getAuthenticatedAgent,
  createWeeklyPlan,
  addTask,
  getWeekStartDate,
} from '../test-helper';

describe('MyModule (e2e)', () => {
  const testGlobal: TestGlobal = {};
  let authenticatedAgent: SuperAgentTest;

  setupTestGlobal(testGlobal, {
    needToClearModels: ['User', 'WeeklyPlan'],
  });

  beforeEach(async () => {
    authenticatedAgent = await getAuthenticatedAgent(testGlobal.testModule!.app!);
  });

  it('should do something', async () => {
    const res = await authenticatedAgent.get('/api/v1/endpoint');
    expect(res.status).toBe(200);
  });
});
```

### 부하 테스트

```bash
# k6 설치 후 실행
k6 run load-test/k6-load-test.js

# 환경변수로 URL 지정
k6 run -e BASE_URL=https://your-server.run.app load-test/k6-load-test.js
```

- 스크립트: `load-test/k6-load-test.js`
- 시나리오: 500 VUs 점진적 부하 테스트
- 최신 결과: `load-test/results.json`
- 결과 히스토리: `load-test/results-history.json`
