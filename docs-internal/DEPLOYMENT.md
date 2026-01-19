# GCP Cloud Run 배포 가이드

## 목차
1. [사전 준비](#사전-준비)
2. [GCP 프로젝트 설정](#gcp-프로젝트-설정)
3. [GitHub Secrets 설정](#github-secrets-설정)
4. [MongoDB Atlas 설정](#mongodb-atlas-설정)
5. [배포 실행](#배포-실행)
6. [트러블슈팅](#트러블슈팅)

---

## 사전 준비

### 필요한 계정
- GCP 계정 (신규 가입 시 $300 크레딧 제공)
- GitHub 계정
- MongoDB Atlas 계정 (무료 티어 사용)

### 설치할 도구
```bash
# Google Cloud CLI
# Windows: https://cloud.google.com/sdk/docs/install
# Mac/Linux:
curl https://sdk.cloud.google.com | bash
gcloud init

# GitHub CLI (선택사항 - Secrets 설정에 유용)
# Windows: winget install GitHub.cli
# Mac: brew install gh
```

---

## GCP 프로젝트 설정

### 1. 프로젝트 생성

> **주의**: 프로젝트 ID는 전 세계적으로 고유해야 합니다. 이미 사용 중인 ID는 사용할 수 없습니다.

```bash
# 프로젝트 생성 (고유한 ID 사용)
gcloud projects create YOUR_PROJECT_ID --name="Weekly Planner"

# 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID

# 결제 계정 연결 (필수)
gcloud billing accounts list
gcloud billing projects link YOUR_PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
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
PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# 서비스 계정 생성
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# 권한 부여
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

> **주의**: `attribute-condition`의 GitHub 저장소 이름은 **대소문자를 정확히** 맞춰야 합니다.

```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Workload Identity Pool 생성
gcloud iam workload-identity-pools create github-pool \
  --location="global" \
  --display-name="GitHub Pool"

# OIDC Provider 생성 (GitHub 저장소 대소문자 주의!)
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='YOUR_GITHUB_ORG/YOUR_REPO'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 서비스 계정에 Workload Identity 연결
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_ORG/YOUR_REPO"
```

### 6. Secret Manager에 시크릿 추가
```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# MongoDB URI 시크릿 생성
echo -n "YOUR_MONGODB_URI" | gcloud secrets create MONGODB_URI --data-file=-

# JWT Secret 시크릿 생성
echo -n "YOUR_JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=-

# Cloud Run 서비스 계정에 시크릿 접근 권한 부여
gcloud secrets add-iam-policy-binding MONGODB_URI \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding JWT_SECRET \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## GitHub Secrets 설정

### GitHub CLI 사용 (권장)
```bash
# GitHub 로그인
gh auth login

# Secrets 설정
PROJECT_ID=$(gcloud config get-value project)

gh secret set GCP_PROJECT_ID --body "$PROJECT_ID"
gh secret set GCP_SERVICE_ACCOUNT --body "github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Workload Identity Provider 값 확인 후 설정
PROVIDER=$(gcloud iam workload-identity-pools providers describe github-provider \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)")
gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER --body "$PROVIDER"

# 설정 확인
gh secret list
```

### 수동 설정 (GitHub 웹)
GitHub 저장소 → Settings → Secrets and variables → Actions에서 추가:

| Secret 이름 | 설명 |
|------------|------|
| `GCP_PROJECT_ID` | GCP 프로젝트 ID |
| `GCP_SERVICE_ACCOUNT` | `github-actions@PROJECT_ID.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider 전체 경로 |

---

## MongoDB Atlas 설정

### 1. 클러스터 생성
1. [MongoDB Atlas](https://www.mongodb.com/atlas) 접속
2. Free Tier (M0) 클러스터 생성
3. 리전: `asia-northeast3` (서울) 권장

### 2. 네트워크 액세스 설정

> **중요**: Cloud Run의 IP는 동적이므로 모든 IP를 허용해야 합니다.

1. Network Access → Add IP Address
2. **Allow Access from Anywhere** 선택 (또는 `0.0.0.0/0` 입력)
3. Confirm

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
git push origin main
```

### 수동 배포
```bash
# GitHub CLI 사용
gh workflow run deploy.yml

# 배포 상태 확인
gh run watch
```

### 배포 확인
```bash
# Cloud Run 서비스 URL 확인
gcloud run services describe weekly-planner-backend \
  --region=asia-northeast3 \
  --format="value(status.url)"
```

---

## 트러블슈팅

### 권한 에러: `iam.serviceAccounts.getAccessToken`
Workload Identity 연결 시 GitHub 저장소 이름의 대소문자가 일치하지 않을 때 발생합니다.

```bash
# GitHub 저장소 이름 확인
gh repo view --json nameWithOwner

# 대소문자 정확히 맞춰서 다시 설정
```

### 컨테이너 시작 실패: `PORT=8080`
NestJS 앱이 `0.0.0.0`에 바인딩되지 않으면 발생합니다.

```typescript
// src/main.ts
await app.listen(port, '0.0.0.0');
```

### MongoDB 연결 실패
MongoDB Atlas Network Access에서 `0.0.0.0/0`을 허용했는지 확인하세요.

### 로그 확인
```bash
# Cloud Run 로그
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=weekly-planner-backend" --limit=50

# 실시간 로그
gcloud beta run services logs tail weekly-planner-backend --region=asia-northeast3
```

### Cold Start 최적화
```bash
# 항상 1개 인스턴스 유지 (추가 비용 발생)
gcloud run services update weekly-planner-backend \
  --region=asia-northeast3 \
  --min-instances=1
```

---

## 비용 예상

| 서비스 | 무료 티어 | 예상 비용 |
|--------|----------|----------|
| Cloud Run | 200만 요청/월 | $0 (무료 티어 내) |
| MongoDB Atlas M0 | 512MB | $0 (무료) |
| Secret Manager | 6개 시크릿 버전 | $0 (무료 티어 내) |

**총 예상 비용**: 무료 티어 내 운영 가능 (일일 500~1000명 기준)
