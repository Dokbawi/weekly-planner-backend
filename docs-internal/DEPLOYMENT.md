# GCP Cloud Run 배포 가이드

## 목차
1. [사전 준비](#사전-준비)
2. [GCP 프로젝트 설정](#gcp-프로젝트-설정)
3. [GitHub Secrets 설정](#github-secrets-설정)
4. [MongoDB Atlas 설정](#mongodb-atlas-설정)
5. [배포 실행](#배포-실행)
6. [프론트엔드 배포](#프론트엔드-배포)
7. [비용 예상](#비용-예상)

---

## 사전 준비

### 필요한 계정
- GCP 계정 (신규 가입 시 $300 크레딧 제공)
- GitHub 계정
- MongoDB Atlas 계정 (무료 티어 사용)

### 설치할 도구
```bash
# Google Cloud CLI
curl https://sdk.cloud.google.com | bash
gcloud init

# Docker (로컬 테스트용)
# https://docs.docker.com/get-docker/
```

---

## GCP 프로젝트 설정

### 1. 프로젝트 생성
```bash
# 프로젝트 생성
gcloud projects create weekly-planner-prod --name="Weekly Planner"

# 프로젝트 설정
gcloud config set project weekly-planner-prod
```

### 2. 필요한 API 활성화
```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com
```

### 3. Artifact Registry 저장소 생성
```bash
gcloud artifacts repositories create weekly-planner \
  --repository-format=docker \
  --location=asia-northeast3 \
  --description="Weekly Planner Docker images"
```

### 4. 서비스 계정 생성 (GitHub Actions용)
```bash
# 서비스 계정 생성
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# 권한 부여
PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

### 5. Workload Identity Federation 설정
```bash
# Workload Identity Pool 생성
gcloud iam workload-identity-pools create github-pool \
  --location="global" \
  --display-name="GitHub Pool"

# OIDC Provider 생성
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 서비스 계정에 Workload Identity 연결
# YOUR_GITHUB_ORG/YOUR_REPO를 실제 값으로 변경
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_ORG/weekly-planner-backend"
```

### 6. Secret Manager에 시크릿 추가
```bash
# MongoDB URI 시크릿 생성
echo -n "mongodb+srv://user:password@cluster.mongodb.net/weekly_planner" | \
  gcloud secrets create MONGODB_URI --data-file=-

# JWT Secret 시크릿 생성
echo -n "your-256-bit-secret-key-here-minimum-32-chars" | \
  gcloud secrets create JWT_SECRET --data-file=-

# Cloud Run 서비스 계정에 시크릿 접근 권한 부여
gcloud secrets add-iam-policy-binding MONGODB_URI \
  --member="serviceAccount:$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding JWT_SECRET \
  --member="serviceAccount:$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## GitHub Secrets 설정

GitHub 저장소 Settings > Secrets and variables > Actions에서 다음 시크릿 추가:

| Secret 이름 | 설명 | 값 예시 |
|------------|------|--------|
| `GCP_PROJECT_ID` | GCP 프로젝트 ID | `weekly-planner-prod` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider | `projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | 서비스 계정 이메일 | `github-actions@weekly-planner-prod.iam.gserviceaccount.com` |

### Workload Identity Provider 값 확인
```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

---

## MongoDB Atlas 설정

### 1. 무료 클러스터 생성
1. [MongoDB Atlas](https://www.mongodb.com/atlas) 접속
2. Free Tier (M0) 클러스터 생성
3. 리전: `asia-northeast3` (서울) 또는 가까운 리전 선택

### 2. 네트워크 액세스 설정
- IP Access List에 `0.0.0.0/0` 추가 (Cloud Run IP가 동적이므로)
- 또는 VPC Peering 설정 (프로덕션 권장)

### 3. 데이터베이스 사용자 생성
- 강력한 비밀번호 사용
- `readWriteAnyDatabase` 권한 부여

### 4. 연결 문자열
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/weekly_planner?retryWrites=true&w=majority
```

---

## 배포 실행

### 자동 배포 (GitHub Actions)
`main` 브랜치에 push하면 자동으로 배포됩니다.

```bash
git checkout main
git merge develop
git push origin main
```

### 수동 배포
GitHub Actions 탭에서 "Deploy to Cloud Run" 워크플로우를 수동 실행할 수 있습니다.

### 로컬에서 직접 배포 (긴급 시)
```bash
# 인증
gcloud auth login

# Docker 이미지 빌드 및 푸시
gcloud builds submit --tag asia-northeast3-docker.pkg.dev/weekly-planner-prod/weekly-planner/backend:latest

# Cloud Run 배포
gcloud run deploy weekly-planner-backend \
  --image asia-northeast3-docker.pkg.dev/weekly-planner-prod/weekly-planner/backend:latest \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-secrets "MONGODB_URI=MONGODB_URI:latest,JWT_SECRET=JWT_SECRET:latest"
```

---

## 프론트엔드 배포

### Firebase Hosting (추천)
```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 초기화
firebase init hosting

# 배포
firebase deploy --only hosting
```

**firebase.json 예시:**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### Cloud Run으로 프론트엔드 배포 (SSR 필요 시)
백엔드와 동일한 방식으로 Dockerfile 작성 후 배포

---

## 비용 예상

### GCP Cloud Run (무료 티어 기준)
| 항목 | 무료 할당량 | 예상 사용량 (일일 1000명) |
|------|------------|-------------------------|
| 요청 수 | 200만/월 | 60만/월 |
| vCPU-초 | 180,000/월 | ~50,000/월 |
| 메모리 GiB-초 | 360,000/월 | ~100,000/월 |
| 네트워크 | 1GB/월 | ~500MB/월 |

**예상 월 비용: $0 ~ $5** (무료 티어 내)

### MongoDB Atlas (M0 무료 티어)
- 저장소: 512MB
- RAM: 공유
- 비용: **무료**

### Firebase Hosting (무료 티어)
- 저장소: 10GB
- 전송: 360MB/일
- 비용: **무료**

### 총 예상 비용
- **무료 티어 내 운영 가능** (일일 500~1000명 기준)
- 트래픽 증가 시: 월 $10~30 예상

---

## 트러블슈팅

### Cold Start 최적화
```yaml
# deploy.yml에서 min-instances 조정
--min-instances=1  # 항상 1개 인스턴스 유지 (추가 비용 발생)
```

### 메모리 부족
```yaml
--memory=1Gi  # 512Mi → 1Gi로 증가
```

### 타임아웃 에러
```yaml
--timeout=600  # 기본 300초 → 600초로 증가
```

### 로그 확인
```bash
# Cloud Run 로그
gcloud logging read "resource.type=cloud_run_revision" --limit=100

# 실시간 로그
gcloud beta run services logs tail weekly-planner-backend --region=asia-northeast3
```

---

## 다음 단계

1. [ ] 커스텀 도메인 연결
2. [ ] SSL 인증서 설정 (자동 제공됨)
3. [ ] Cloud Monitoring 알림 설정
4. [ ] 백업 전략 수립
