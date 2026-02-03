# Weekly Template 기능

## 개요
사용자가 자주 사용하는 주간 일정 패턴(템플릿)을 저장하고, 새 주간 계획 생성 시 템플릿을 불러와서 적용하는 기능.

## 데이터 모델

### WeeklyTemplate
| 필드 | 타입 | 설명 |
|------|------|------|
| userId | ObjectId | 소유자 |
| name | string | 템플릿 이름 |
| description | string? | 설명 |
| dayPlans | TemplateDayPlan[] | 요일별 Task 목록 |
| isDefault | boolean | 기본 템플릿 여부 |

### TemplateDayPlan
| 필드 | 타입 | 설명 |
|------|------|------|
| dayOfWeek | number (0-6) | 요일 (0=일, 6=토) |
| tasks | TemplateTask[] | 해당 요일의 Task 목록 |

### TemplateTask
Task의 경량 버전. `id`, `status`, `completedAt`, `createdAt` 등 런타임 데이터 제외.

| 필드 | 타입 |
|------|------|
| title | string |
| description | string? |
| priority | TaskPriority |
| scheduledTime | string? |
| reminderMinutesBefore | number? |
| tags | string[] |

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /templates | 템플릿 생성 |
| GET | /templates | 목록 조회 |
| GET | /templates/:id | 상세 조회 |
| PUT | /templates/:id | 수정 |
| DELETE | /templates/:id | 삭제 |
| POST | /templates/from-plan/:planId | 기존 계획에서 생성 |
| POST | /plans/:planId/apply-template/:templateId | 계획에 적용 |

## 비즈니스 규칙

1. **사용자당 최대 20개** 템플릿
2. **기본 템플릿**: 한 사용자에 하나만 가능 (새로 지정 시 기존 해제)
3. **적용 조건**: DRAFT 상태 계획에만 적용 가능
4. **적용 모드**:
   - `overwrite`: 기존 Task를 템플릿 Task로 교체
   - `merge`: 기존 Task 유지 + 템플릿 Task 추가
5. **from-plan**: 계획에서 생성 시 런타임 데이터(id, status, completedAt) 제외

## 캐싱

| 캐시 키 | TTL | 무효화 시점 |
|---------|-----|------------|
| `template:list:{userId}` | 10분 | 생성/수정/삭제 |
| `template:id:{id}:{userId}` | 15분 | 수정/삭제 |

템플릿 적용 시 관련 Plan 캐시도 함께 무효화.

## 파일 구조

```
src/template/
├── schemas/
│   └── template.schema.ts    # Mongoose 스키마
├── dto/
│   └── template.dto.ts       # Request/Response DTO
├── template.controller.ts    # API 컨트롤러
├── template.service.ts       # 비즈니스 로직
└── template.module.ts        # NestJS 모듈
```
