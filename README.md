# Weekly Planner Backend

주간 계획 관리를 위한 REST API 서버

## 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| Language | TypeScript | 5.3+ |
| Framework | NestJS | 10.3+ |
| Database | MongoDB + Mongoose | 8.0+ |
| Auth | JWT (Passport) | - |
| Scheduler | @nestjs/schedule | 4.0+ |
| API Docs | Swagger (OpenAPI) | - |

## 시작하기

### 요구사항

- Node.js 18+
- MongoDB 6.0+

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
```

### 환경 변수

```env
# Database
MONGODB_URI=mongodb://localhost:27017/weekly_planner

# JWT
JWT_SECRET=your-256-bit-secret-key-here-minimum-32-chars

# Server (optional)
PORT=3000
```

### 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod
```

## API 문서

서버 실행 후 Swagger UI에서 API를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:3000/api-docs
- **API Base URL**: http://localhost:3000/api/v1

### 주요 엔드포인트

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | 회원가입 |
| POST | /auth/login | 로그인 |
| GET | /auth/me | 현재 사용자 정보 |
| GET | /plans | 주간 계획 목록 |
| GET | /plans/current | 현재 주 계획 (자동 생성) |
| POST | /plans/{planId}/tasks | Task 추가 |
| POST | /plans/{planId}/tasks/{taskId}/move | Task 이동 |
| GET | /plans/{planId}/changes | 변경 이력 |
| GET | /reviews/{planId} | 주간 회고 |
| GET | /notifications | 알림 목록 |
| GET | /today | 오늘 할 일 |

## 프로젝트 구조

```
src/
├── auth/          # 인증 (JWT)
├── user/          # 사용자 관리
├── plan/          # 주간 계획 및 Task
├── changelog/     # 변경 추적
├── notification/  # 알림 및 스케줄러
├── review/        # 주간 회고
├── today/         # 오늘 할 일
└── common/        # 공통 모듈
    ├── decorators/
    ├── filters/
    └── interceptors/
```

## 테스트

```bash
# 전체 테스트
npm run test

# 유닛 테스트
npm run test:unit

# E2E 테스트
npm run test:e2e

# 커버리지
npm run test:cov
```

## 핵심 기능

### 변경 추적 시스템

계획 확정(CONFIRMED) 후 모든 Task 변경을 자동 기록합니다.

- TASK_CREATED: Task 추가
- TASK_UPDATED: Task 수정
- TASK_DELETED: Task 삭제
- MOVED_TO_ANOTHER_DAY: 다른 날로 이동

### Task 이동

Task를 다른 날짜로 이동하면:
1. 원본 Task → POSTPONED 상태로 변경
2. 대상 날짜에 새 Task 생성 (PENDING 상태)
3. ChangeLog에 자동 기록

### 알림 스케줄러

- Task 리마인더 (매 분 체크)
- 일일 할 일 요약 (08:00)
- 계획 수립 알림 (planningDay 09:00)
- 회고 알림 (reviewDay 18:00)

## 문서

- [API Contract](./docs/api-contract.md) - REST API 명세
- [Domain Model](./docs/domain-model.md) - 도메인 모델
- [Business Rules](./docs/business-rules.md) - 비즈니스 규칙
- [Architecture](./docs-internal/ARCHITECTURE.md) - 아키텍처 상세
- [Development](./docs-internal/DEVELOPMENT.md) - 개발 가이드

## Claude Code 활용

이 프로젝트는 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)를 활용하여 개발되었습니다.

### CLAUDE.md 활용

프로젝트 루트에 `CLAUDE.md` 파일을 작성하여 Claude Code가 프로젝트 컨텍스트를 빠르게 파악할 수 있도록 했습니다:

```
CLAUDE.md
├── 빠른 시작 가이드
├── 문서 구조 (docs/, docs-internal/)
├── 핵심 기능 및 구현 위치
├── 기술 스택
└── API 엔드포인트 요약
```

### 효율적인 활용 사례

**1. 버그 수정**
- JWT payload에서 userId 추출 오류 → `@CurrentUser('sub')` 데코레이터 수정
- 에러 로그와 코드를 함께 분석하여 원인 파악 및 즉시 수정

**2. API 문서 동기화**
- 실제 백엔드 구현과 API 명세서 간 불일치 탐지
- `docs/` 서브모듈 전체 문서 일괄 업데이트 및 커밋

**3. 코드 표준화**
- REST 컨벤션에 맞게 HTTP 메서드 변경 (POST → PUT)
- 관련 문서까지 자동으로 동기화

**4. 테스트 작성**
- E2E 테스트 케이스 추가 (중복 계획 생성 방지 등)
- 기존 테스트 패턴을 분석하여 일관된 스타일로 작성

### 문서 구조

Claude Code가 프로젝트를 이해하는 데 도움이 되도록 문서를 계층화했습니다:

```
docs/                    # 공유 문서 (Git 서브모듈)
├── api-contract.md      # REST API 명세
├── domain-model.md      # 도메인 모델
└── business-rules.md    # 비즈니스 규칙

docs-internal/           # 백엔드 전용 문서
├── ARCHITECTURE.md      # 아키텍처 상세
├── API_REFERENCE.md     # API 레퍼런스
├── DEVELOPMENT.md       # 개발 가이드
└── IMPLEMENTATION.md    # 구현 상세
```

## 라이선스

MIT
