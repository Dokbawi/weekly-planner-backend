# Weekly Planner - Backend

NestJS + TypeScript 기반 REST API 서버

---

## 빠른 시작

```bash
# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
MONGODB_URI=mongodb://localhost:27017/weekly_planner
JWT_SECRET=your-256-bit-secret-key-here-minimum-32-chars

# 개발 모드 실행
npm run start:dev
```

서버 실행 후:
- API 서버: http://localhost:3000
- Swagger UI: http://localhost:3000/api-docs

---

## 문서 구조

### 개발 문서 (docs-internal/)

- **[README.md](./docs-internal/README.md)**
  - 프로젝트 개요 및 빠른 시작 가이드
  - 기술 스택 요약
  - 문서 인덱스

- **[ARCHITECTURE.md](./docs-internal/ARCHITECTURE.md)**
  - 기술 스택 상세
  - 프로젝트 구조 및 모듈 구성
  - 데이터 모델 개요
  - MongoDB 인덱스 전략
  - 인증/인가 시스템

- **[API_REFERENCE.md](./docs-internal/API_REFERENCE.md)**
  - 공통 응답 형식
  - 전체 API 엔드포인트 레퍼런스
  - 요청/응답 예시
  - 에러 코드 정의

- **[DEVELOPMENT.md](./docs-internal/DEVELOPMENT.md)**
  - 로컬 환경 설정 (Node.js, MongoDB)
  - 환경 변수 구성
  - 개발/테스트/빌드 스크립트
  - Git 서브모듈 관리
  - 디버깅 가이드
  - 트러블슈팅

- **[IMPLEMENTATION.md](./docs-internal/IMPLEMENTATION.md)**
  - 변경 추적 (ChangeLog) 시스템
  - Task 이동 처리 로직
  - 알림 스케줄러 (Cron)
  - 주간 회고 생성
  - 공통 응답 Wrapper
  - 로깅 시스템
  - 실제 코드 파일 참조

### 도메인 문서 (docs/ 서브모듈)

외부 서브모듈로 관리되는 공유 문서:

- `docs/domain-model.md` - 도메인 모델 정의
- `docs/api-contract.md` - REST API 계약 스펙
- `docs/business-rules.md` - 비즈니스 규칙

---

## 핵심 기능

### 1. 변경 추적 시스템
- 계획 확정(CONFIRMED) 후 모든 Task 변경을 자동 기록
- 변경 유형: ADDED, MODIFIED, DELETED, MOVED, STATUS_CHANGED
- 구현: `src/changelog/changelog.service.ts:13`

### 2. Task 이동 처리
- 원본 Task → POSTPONED 상태 변경
- 대상 날짜에 새 Task 생성 (PENDING 상태)
- ChangeLog 자동 기록
- 구현: `src/plan/plan.service.ts:265`

### 3. 알림 스케줄러
- Task 리마인더 (매 분)
- 일일 할 일 요약 (08:00)
- 계획 수립 알림 (09:00)
- 회고 알림 (18:00)
- 구현: `src/notification/notification.scheduler.ts`

### 4. 주간 회고
- 완료율, 통계, 변경 이력 분석
- 구현: `src/review/review.service.ts`

---

## 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| Language | TypeScript | 5.3+ |
| Framework | NestJS | 10.3+ |
| Database | MongoDB + Mongoose | 8.0+ |
| Auth | JWT (Passport) | - |
| Scheduler | @nestjs/schedule | 4.0+ |
| Docs | Swagger (OpenAPI) | - |

상세 정보: [ARCHITECTURE.md](./docs-internal/ARCHITECTURE.md)

---

## API 엔드포인트

- `POST /api/v1/auth/register` - 회원가입
- `POST /api/v1/auth/login` - 로그인
- `GET /api/v1/plans` - 주간 계획 목록
- `POST /api/v1/plans/{planId}/tasks` - Task 추가
- `POST /api/v1/plans/{planId}/tasks/{taskId}/move` - Task 이동
- `GET /api/v1/plans/{planId}/changes` - 변경 이력 조회
- `GET /api/v1/plans/{planId}/review` - 주간 회고
- `GET /api/v1/notifications` - 알림 목록
- `GET /api/v1/today` - 오늘 할 일

전체 API: [API_REFERENCE.md](./docs-internal/API_REFERENCE.md) 또는 [Swagger](http://localhost:3000/api-docs)

---

## 개발 스크립트

```bash
# 개발 모드
npm run start:dev

# 프로덕션 빌드
npm run build

# 테스트
npm run test
npm run test:e2e

# 린트
npm run lint
```

상세 가이드: [DEVELOPMENT.md](./docs-internal/DEVELOPMENT.md)

---

## 프로젝트 구조

```
src/
├── auth/          # 인증 (JWT)
├── user/          # 사용자 관리
├── plan/          # 주간 계획 및 Task
├── changelog/     # 변경 추적
├── notification/  # 알림 및 스케줄러
├── review/        # 주간 회고
└── common/        # 공통 모듈 (decorators, filters, interceptors)
```

상세 구조: [ARCHITECTURE.md](./docs-internal/ARCHITECTURE.md)

---

## 라이선스

MIT
