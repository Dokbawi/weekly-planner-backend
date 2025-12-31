# Weekly Planner - Backend

NestJS + TypeScript 기반 REST API 서버

## 프로젝트 개요

주간 일정 관리 서비스의 백엔드 API 서버입니다.

### 핵심 기능
- JWT 기반 사용자 인증
- 주간 계획 수립 및 관리
- Task 생성/수정/삭제/이동
- 계획 확정 후 변경 추적 (Changelog)
- 스케줄러 기반 알림 시스템
- 주간 회고 생성

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
- API Prefix: `/api/v1`

---

## 문서 구조

### 📚 개발 문서
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 프로젝트 구조 및 기술 스택
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - 로컬 환경 설정 및 개발 가이드
- **[API_REFERENCE.md](./API_REFERENCE.md)** - REST API 엔드포인트 레퍼런스
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - 핵심 기능 구현 상세

### 📋 도메인 문서 (docs/ 서브모듈)
- `docs/domain-model.md` - 도메인 모델 정의
- `docs/api-contract.md` - REST API 계약 스펙
- `docs/business-rules.md` - 비즈니스 규칙

---

## 기술 스택 요약

| 구분 | 기술 |
|------|------|
| Runtime | Node.js 18+ |
| Language | TypeScript 5.3+ |
| Framework | NestJS 10.3+ |
| Database | MongoDB 8.0+ (Mongoose) |
| Authentication | JWT (Passport) |
| Scheduler | @nestjs/schedule |
| Documentation | Swagger (OpenAPI) |

---

## 프로젝트 링크

- Frontend Repository: TBD
- Design System: TBD
- API Documentation: [Swagger UI](http://localhost:3000/api-docs) (로컬 실행 시)

---

## 개발 참여

### 브랜치 전략
- `main` - 프로덕션 브랜치
- `develop` - 개발 브랜치
- `feature/*` - 기능 개발 브랜치
- `bugfix/*` - 버그 수정 브랜치

### 커밋 컨벤션
- `feat:` - 새로운 기능 추가
- `fix:` - 버그 수정
- `docs:` - 문서 수정
- `refactor:` - 코드 리팩토링
- `test:` - 테스트 코드 추가/수정
- `chore:` - 빌드 설정, 패키지 매니저 설정 등

---

## 라이선스

MIT
