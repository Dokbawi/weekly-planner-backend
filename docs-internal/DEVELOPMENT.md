# Development Guide

## 필수 요구사항

- **Node.js**: 18.x 이상
- **MongoDB**: 8.x 이상 (로컬 설치 또는 MongoDB Atlas)
- **npm**: 9.x 이상 또는 **yarn**: 1.22.x 이상
- **Git**: 서브모듈 사용을 위해 필요

---

## 초기 설정

### 1. 저장소 클론

```bash
# 서브모듈 포함 클론
git clone --recurse-submodules https://github.com/{username}/weekly-planner-backend.git

# 또는 일반 클론 후 서브모듈 초기화
git clone https://github.com/{username}/weekly-planner-backend.git
cd weekly-planner-backend
git submodule update --init --recursive
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수를 설정합니다:

```bash
# MongoDB 연결 URI
MONGODB_URI=mongodb://localhost:27017/weekly_planner

# JWT 시크릿 키 (32자 이상 권장)
JWT_SECRET=your-256-bit-secret-key-here-minimum-32-chars

# JWT 만료 시간 (선택 사항, 기본값: 24h)
JWT_EXPIRATION=24h

# 애플리케이션 포트 (선택 사항, 기본값: 3000)
PORT=3000

# 환경 (development, production, test)
NODE_ENV=development
```

**.env.example 참조:** 프로젝트에 `.env.example` 파일이 포함되어 있습니다.

**보안 주의사항:**
- `.env` 파일은 절대로 Git에 커밋하지 마세요
- `.gitignore`에 `.env`가 포함되어 있는지 확인하세요
- 프로덕션 환경에서는 환경 변수를 안전하게 관리하세요

### 4. MongoDB 설정

#### 옵션 A: 로컬 MongoDB 설치

```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community@8.0
brew services start mongodb-community@8.0

# Ubuntu
sudo apt-get install -y mongodb-org
sudo systemctl start mongod

# Windows
# https://www.mongodb.com/try/download/community 에서 다운로드 및 설치
```

#### 옵션 B: MongoDB Atlas (클라우드)

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 가입
2. 무료 Cluster 생성
3. Database User 생성
4. Network Access에서 IP 주소 허용
5. Connection String 복사하여 `.env`의 `MONGODB_URI`에 설정

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/weekly_planner?retryWrites=true&w=majority
```

#### 옵션 C: Docker로 MongoDB 실행

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:8.0

# .env 설정
MONGODB_URI=mongodb://admin:password@localhost:27017/weekly_planner?authSource=admin
```

---

## 개발 스크립트

### 개발 모드 실행

```bash
# Watch 모드로 실행 (코드 변경 시 자동 재시작)
npm run start:dev

# 일반 실행
npm run start
```

서버가 정상 실행되면:
- API 서버: http://localhost:3000
- Swagger UI: http://localhost:3000/api-docs

### 프로덕션 빌드 및 실행

```bash
# TypeScript 컴파일
npm run build

# 빌드된 JavaScript 실행
npm run start:prod
```

빌드 결과물: `dist/` 디렉토리

### 린트 및 포맷팅

```bash
# ESLint 검사
npm run lint

# ESLint 자동 수정
npm run lint:fix

# Prettier 포맷팅 (설정된 경우)
npm run format
```

### 테스트

```bash
# 단위 테스트 실행
npm run test

# 단위 테스트 (watch 모드)
npm run test:watch

# 테스트 커버리지
npm run test:cov

# E2E 테스트
npm run test:e2e
```

**E2E 테스트 환경:**
- 별도의 테스트용 MongoDB 사용 (`.env.test` 참조)
- MongoDB Memory Server 사용 (인메모리 MongoDB)

테스트 파일:
- 단위 테스트: `src/**/*.spec.ts`
- E2E 테스트: `test/**/*.e2e-spec.ts`

---

## Git Submodule 관리

이 프로젝트는 `docs/` 디렉토리를 별도 저장소로 서브모듈화하여 관리합니다.

### 서브모듈 업데이트

```bash
# 최신 변경사항 가져오기
git submodule update --remote docs

# 특정 커밋으로 고정
cd docs
git checkout <commit-hash>
cd ..
git add docs
git commit -m "Update docs submodule"
```

### 서브모듈 추가 (초기 설정 시)

```bash
git submodule add https://github.com/{username}/weekly-planner-docs.git docs
```

### 서브모듈 포함 클론

```bash
# 새로운 환경에서 클론 시
git clone --recurse-submodules https://github.com/{username}/weekly-planner-backend.git

# 이미 클론된 저장소에서 서브모듈 초기화
git submodule update --init --recursive
```

---

## 데이터베이스 관리

### 인덱스 생성

인덱스는 스키마 파일에 정의되어 있으며, 애플리케이션 시작 시 자동으로 생성됩니다.

수동으로 인덱스 확인:
```bash
# MongoDB Shell 접속
mongosh "mongodb://localhost:27017/weekly_planner"

# 인덱스 확인
db.users.getIndexes()
db.weeklyplans.getIndexes()
db.changelogs.getIndexes()
db.notifications.getIndexes()
```

### 데이터베이스 초기화

```bash
# MongoDB Shell에서
use weekly_planner
db.dropDatabase()
```

### 샘플 데이터 생성

테스트용 샘플 데이터는 E2E 테스트에서 자동으로 생성됩니다.

---

## 디버깅

### VS Code 디버깅 설정

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeArgs": ["--nolazy", "-r", "ts-node/register", "-r", "tsconfig-paths/register"],
      "args": ["src/main.ts"],
      "cwd": "${workspaceFolder}",
      "protocol": "inspector",
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### 로그 확인

로그는 다음 위치에 저장됩니다:
- `logs/error.log` - 에러 로그
- `logs/combined.log` - 전체 로그

콘솔 출력:
```bash
# 개발 모드에서 실시간 로그 확인
npm run start:dev
```

---

## 코드 생성 (NestJS CLI)

### 새 모듈 생성

```bash
# 모듈, 서비스, 컨트롤러 한 번에 생성
nest g resource {module-name}

# 개별 생성
nest g module {module-name}
nest g service {module-name}
nest g controller {module-name}
```

### 기타 생성

```bash
# Guard
nest g guard {guard-name}

# Interceptor
nest g interceptor {interceptor-name}

# Filter
nest g filter {filter-name}

# Middleware
nest g middleware {middleware-name}

# Pipe
nest g pipe {pipe-name}

# Decorator
nest g decorator {decorator-name}
```

---

## 배포 준비

### 환경 변수 설정 (프로덕션)

프로덕션 환경에서는 다음 변수를 반드시 설정하세요:

```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://...  # Atlas 또는 프로덕션 MongoDB URI
JWT_SECRET=<강력한-랜덤-키>
JWT_EXPIRATION=24h
PORT=3000
```

### 프로덕션 빌드

```bash
npm run build
```

### 프로세스 관리 (PM2)

```bash
# PM2 설치
npm install -g pm2

# 애플리케이션 실행
pm2 start dist/main.js --name weekly-planner-api

# 로그 확인
pm2 logs weekly-planner-api

# 재시작
pm2 restart weekly-planner-api

# 중지
pm2 stop weekly-planner-api
```

### Docker 배포 (옵션)

`Dockerfile` 예시:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main"]
```

빌드 및 실행:
```bash
docker build -t weekly-planner-api .
docker run -p 3000:3000 --env-file .env weekly-planner-api
```

---

## 트러블슈팅

### MongoDB 연결 실패

**증상:** `MongooseServerSelectionError: connect ECONNREFUSED`

**해결 방법:**
1. MongoDB가 실행 중인지 확인:
   ```bash
   # macOS/Linux
   brew services list  # 또는 sudo systemctl status mongod

   # Windows
   # 서비스 관리자에서 MongoDB 서비스 확인
   ```

2. `.env` 파일의 `MONGODB_URI` 확인

3. MongoDB 포트 확인 (기본: 27017)

### JWT 토큰 만료

**증상:** `401 Unauthorized`

**해결 방법:**
1. `/api/v1/auth/login`으로 재로그인
2. 새로운 `accessToken` 발급받아 사용

### 포트 충돌

**증상:** `Error: listen EADDRINUSE: address already in use :::3000`

**해결 방법:**
```bash
# 해당 포트를 사용하는 프로세스 종료
# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# 또는 .env에서 다른 포트 사용
PORT=3001
```

### TypeScript 컴파일 에러

**해결 방법:**
```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install

# 캐시 정리
npm cache clean --force
```

---

## 개발 워크플로우

### 1. 새 기능 개발

```bash
# feature 브랜치 생성
git checkout -b feature/new-feature

# 개발 진행
# ...

# 테스트 실행
npm run test
npm run test:e2e

# 린트 검사
npm run lint

# 커밋
git add .
git commit -m "feat: Add new feature"

# Push
git push origin feature/new-feature

# Pull Request 생성
```

### 2. 버그 수정

```bash
# bugfix 브랜치 생성
git checkout -b bugfix/fix-issue

# 수정 진행
# ...

# 커밋
git commit -m "fix: Fix issue description"
```

### 3. 코드 리뷰 체크리스트

- [ ] 모든 테스트 통과
- [ ] ESLint 경고 없음
- [ ] Swagger 문서 업데이트
- [ ] 환경 변수 변경 시 `.env.example` 업데이트
- [ ] 새 의존성 추가 시 `package.json` 확인
- [ ] 주요 변경사항 문서화

---

## 유용한 명령어 모음

```bash
# 전체 프로젝트 정리
npm run clean  # (설정된 경우)
rm -rf dist node_modules

# 의존성 재설치
npm install

# 개발 서버 재시작
npm run start:dev

# 로그 실시간 확인
tail -f logs/combined.log

# MongoDB 쿼리 테스트
mongosh "mongodb://localhost:27017/weekly_planner"
```

---

## 참고 자료

- [NestJS Documentation](https://docs.nestjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Manual](https://www.mongodb.com/docs/manual/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
