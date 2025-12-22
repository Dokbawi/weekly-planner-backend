# Weekly Planner - Backend

Spring Boot + Kotlin 기반 REST API 서버

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
- JDK 17+
- MongoDB (로컬 설치 또는 Atlas)
- Gradle 8.x (Wrapper 사용 가능)

### 환경 변수 설정

`.env` 파일을 프로젝트 루트에 생성하거나 환경 변수로 설정:

```bash
# MongoDB 연결 URI
MONGODB_URI=mongodb://localhost:27017/weekly

# JWT 시크릿 키 (32자 이상)
JWT_SECRET=your-256-bit-secret-key-here-minimum-32-chars
```

### 실행 방법

```bash
# 서브모듈 초기화 (최초 1회)
git submodule update --init --recursive

# 의존성 설치 및 빌드
./gradlew build

# 애플리케이션 실행
./gradlew bootRun
```

### 확인
- API 서버: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- API Docs: http://localhost:8080/api-docs

---

## 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| Language | Kotlin | 1.9+ |
| Framework | Spring Boot | 3.2+ |
| Database | MongoDB | (Atlas 무료 티어) |
| Build | Gradle | Kotlin DSL |
| Auth | JWT | jjwt 0.12+ |
| Docs | SpringDoc OpenAPI | 2.3+ |

---

## 프로젝트 구조

```
src/main/kotlin/com/planner/weekly/
├── WeeklyPlannerApplication.kt
│
├── config/
│   ├── MongoConfig.kt           # MongoDB 설정 및 인덱스
│   ├── SecurityConfig.kt        # Spring Security + JWT
│   ├── WebConfig.kt             # CORS 설정
│   ├── SchedulerConfig.kt       # @EnableScheduling
│   ├── OpenApiConfig.kt         # Swagger 설정
│   └── LoggingFilter.kt         # HTTP 요청/응답 로깅
│
├── domain/
│   ├── user/
│   │   ├── User.kt              # @Document
│   │   ├── UserRepository.kt    # MongoRepository
│   │   └── UserService.kt
│   │
│   ├── plan/
│   │   ├── WeeklyPlan.kt        # @Document
│   │   ├── DailyPlan.kt         # Embedded
│   │   ├── Task.kt              # Embedded
│   │   ├── WeeklyPlanRepository.kt
│   │   └── WeeklyPlanService.kt
│   │
│   ├── changelog/
│   │   ├── ChangeLog.kt         # @Document
│   │   ├── ChangeLogRepository.kt
│   │   └── ChangeTrackingService.kt  # 변경 추적 핵심 로직
│   │
│   ├── notification/
│   │   ├── Notification.kt      # @Document
│   │   ├── NotificationRepository.kt
│   │   ├── NotificationService.kt
│   │   └── NotificationScheduler.kt  # @Scheduled 알림 체크
│   │
│   └── review/
│       ├── WeeklyReview.kt      # DTO (저장 안 함)
│       └── WeeklyReviewService.kt
│
├── api/
│   └── v1/
│       ├── AuthController.kt
│       ├── WeeklyPlanController.kt
│       ├── TaskController.kt
│       ├── ChangeLogController.kt
│       ├── ReviewController.kt
│       ├── NotificationController.kt
│       └── TodayController.kt
│
├── dto/
│   ├── request/
│   │   ├── LoginRequest.kt
│   │   ├── RegisterRequest.kt
│   │   ├── CreateTaskRequest.kt
│   │   ├── UpdateTaskRequest.kt
│   │   └── ...
│   └── response/
│       ├── ApiResponse.kt       # 공통 응답 wrapper
│       ├── TokenResponse.kt
│       ├── TaskResponse.kt
│       └── ...
│
├── security/
│   ├── JwtTokenProvider.kt
│   ├── JwtAuthenticationFilter.kt
│   └── UserPrincipal.kt
│
├── exception/
│   ├── ApiException.kt
│   ├── ErrorCode.kt
│   └── GlobalExceptionHandler.kt
│
└── util/
    ├── DateUtils.kt             # 주간 계산, timezone 처리
    └── Extensions.kt
```

---

## 핵심 구현 사항

### 1. 변경 추적 (ChangeTrackingService)

**가장 중요한 기능** - 확정 후 모든 Task 변경을 기록

```kotlin
@Service
class ChangeTrackingService(
    private val changeLogRepository: ChangeLogRepository
) {
    fun trackChange(
        weeklyPlan: WeeklyPlan,
        taskId: String,
        taskTitle: String,
        targetDate: LocalDate,
        changeType: ChangeType,
        previousTask: Task?,
        newTask: Task?,
        reason: String? = null
    ) {
        // CONFIRMED 상태일 때만 기록
        if (weeklyPlan.status != PlanStatus.CONFIRMED) return
        
        val changes = detectFieldChanges(previousTask, newTask)
        if (changes.isEmpty() && changeType == ChangeType.TASK_UPDATED) return
        
        val log = ChangeLog(
            weeklyPlanId = weeklyPlan.id,
            userId = weeklyPlan.userId,
            targetDate = targetDate,
            taskId = taskId,
            taskTitle = taskTitle,
            changeType = changeType,
            changes = changes,
            reason = reason
        )
        
        changeLogRepository.save(log)
    }
    
    private fun detectFieldChanges(prev: Task?, new: Task?): List<FieldChange> {
        // 필드별 비교하여 변경된 것만 반환
        // null 처리 주의
    }
}
```

### 2. Task 이동 처리

```kotlin
// WeeklyPlanService.kt
fun moveTask(planId: String, taskId: String, targetDate: LocalDate, reason: String?): Task {
    val plan = findPlanOrThrow(planId)
    val (sourceDate, task) = findTaskInPlan(plan, taskId)
    
    // 1. 원본 상태를 POSTPONED로 변경
    val postponedTask = task.copy(status = TaskStatus.POSTPONED)
    updateTaskInPlan(plan, sourceDate, postponedTask)
    
    // 2. 대상 날짜에 새 Task 생성
    val newTask = task.copy(
        id = ObjectId().toString(),
        status = TaskStatus.PENDING,
        createdAt = Instant.now()
    )
    addTaskToPlan(plan, targetDate, newTask)
    
    // 3. 변경 기록
    changeTrackingService.trackChange(
        plan, task.id, task.title, sourceDate,
        ChangeType.MOVED_TO_ANOTHER_DAY,
        task, postponedTask,
        reason ?: "Moved to $targetDate"
    )
    
    weeklyPlanRepository.save(plan)
    return newTask
}
```

### 3. 주간 회고 생성

```kotlin
// WeeklyReviewService.kt
fun generateReview(planId: String): WeeklyReview {
    val plan = weeklyPlanRepository.findById(planId).orElseThrow()
    val changes = changeLogRepository.findByWeeklyPlanIdOrderByChangedAtDesc(planId)
    
    val allTasks = plan.dailyPlans.values.flatMap { it.tasks }
    
    val statistics = ReviewStatistics(
        totalPlanned = allTasks.size,
        completed = allTasks.count { it.status == TaskStatus.COMPLETED },
        cancelled = allTasks.count { it.status == TaskStatus.CANCELLED },
        postponed = allTasks.count { it.status == TaskStatus.POSTPONED },
        addedAfterConfirm = changes.count { it.changeType == ChangeType.TASK_CREATED },
        completionRate = calculateRate(allTasks),
        totalChanges = changes.size,
        changesByType = changes.groupingBy { it.changeType }.eachCount()
    )
    
    // dailyBreakdown 계산...
    
    return WeeklyReview(
        weeklyPlanId = planId,
        weekStartDate = plan.weekStartDate,
        weekEndDate = plan.weekEndDate,
        statistics = statistics,
        dailyBreakdown = dailyBreakdown,
        changeHistory = changes
    )
}
```

### 4. 알림 스케줄러

```kotlin
@Component
class NotificationScheduler(
    private val weeklyPlanRepository: WeeklyPlanRepository,
    private val notificationService: NotificationService,
    private val userRepository: UserRepository
) {
    // 매 분 실행 - Task 알림 체크
    @Scheduled(cron = "0 * * * * *")
    fun checkTaskReminders() {
        val now = LocalDateTime.now(ZoneId.of("Asia/Seoul"))
        // scheduledTime - minutesBefore == now 인 Task 찾기
        // Notification 생성
    }
    
    // 매일 08:00 - 오늘 할 일 요약
    @Scheduled(cron = "0 0 8 * * *")
    fun sendDailySummary() {
        // 오늘 Task가 있는 사용자에게 알림
    }
    
    // 매일 09:00 - 계획 수립 알림 (planningDay인 사용자)
    @Scheduled(cron = "0 0 9 * * *")
    fun sendPlanningReminder() {
        val today = LocalDate.now()
        val users = userRepository.findBySettingsPlanningDay(today.dayOfWeek)
        // DRAFT 상태 계획이 있는 사용자에게 알림
    }
    
    // 매일 18:00 - 회고 알림 (reviewDay인 사용자)
    @Scheduled(cron = "0 0 18 * * *")
    fun sendReviewReminder() {
        val today = LocalDate.now()
        val users = userRepository.findBySettingsReviewDay(today.dayOfWeek)
        // CONFIRMED 상태 계획이 있는 사용자에게 알림
    }
}
```

---

## Gradle 설정 (build.gradle.kts)

```kotlin
plugins {
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
    kotlin("jvm") version "1.9.21"
    kotlin("plugin.spring") version "1.9.21"
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
}

dependencies {
    // Spring Boot
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-mongodb")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    
    // Kotlin
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    
    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.12.3")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.3")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.3")
    
    // OpenAPI (Swagger)
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0")
    
    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("de.flapdoodle.embed:de.flapdoodle.embed.mongo.spring30x:4.9.3")
}
```

---

## 환경 설정

### application.yml
```yaml
spring:
  application:
    name: weekly-planner-api
  data:
    mongodb:
      uri: ${MONGODB_URI:mongodb://localhost:27017/weekly_planner}

jwt:
  secret: ${JWT_SECRET:your-256-bit-secret-key-here-minimum-32-chars}
  expiration: 86400000  # 24시간

server:
  port: 8080

springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui
```

### application-prod.yml
```yaml
spring:
  data:
    mongodb:
      uri: ${MONGODB_URI}

jwt:
  secret: ${JWT_SECRET}

logging:
  level:
    root: INFO
```

---

## MongoDB 인덱스

```kotlin
@Configuration
class MongoConfig(private val mongoTemplate: MongoTemplate) {
    
    @EventListener(ApplicationReadyEvent::class)
    fun createIndexes() {
        // users
        mongoTemplate.indexOps("users").ensureIndex(
            Index("email", Sort.Direction.ASC).unique()
        )
        
        // weekly_plans
        mongoTemplate.indexOps("weekly_plans").ensureIndex(
            Index()
                .on("userId", Sort.Direction.ASC)
                .on("weekStartDate", Sort.Direction.DESC)
                .unique()
        )
        
        // change_logs
        mongoTemplate.indexOps("change_logs").ensureIndex(
            Index()
                .on("weeklyPlanId", Sort.Direction.ASC)
                .on("changedAt", Sort.Direction.DESC)
        )
        
        // notifications
        mongoTemplate.indexOps("notifications").ensureIndex(
            Index()
                .on("userId", Sort.Direction.ASC)
                .on("isRead", Sort.Direction.ASC)
                .on("createdAt", Sort.Direction.DESC)
        )
    }
}
```

---

## API 응답 형식

```kotlin
// 공통 응답 wrapper
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ErrorDetail? = null
) {
    companion object {
        fun <T> ok(data: T) = ApiResponse(success = true, data = data)
        fun fail(code: String, message: String) = ApiResponse<Nothing>(
            success = false, 
            error = ErrorDetail(code, message)
        )
    }
}

data class ErrorDetail(
    val code: String,
    val message: String
)
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

## CORS 설정

```kotlin
@Configuration
class WebConfig : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/api/**")
            .allowedOrigins(
                "http://localhost:3000",      // 개발
                "https://your-domain.com"     // 프로덕션
            )
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
    }
}
```

---

## 구현 순서

### Phase 1: 기본 구조
1. 프로젝트 초기 설정 (Spring Boot + MongoDB)
2. 공통 응답/예외 처리
3. User 도메인 + JWT 인증
4. WeeklyPlan, Task CRUD

### Phase 2: 핵심 기능
5. ChangeLog 도메인
6. ChangeTrackingService 구현
7. Task 이동/상태 변경 + 추적
8. WeeklyReview 생성

### Phase 3: 알림
9. Notification 도메인
10. NotificationScheduler
11. 알림 API

### Phase 4: 고도화
12. Swagger 문서화
13. 테스트 코드
14. Docker 설정
15. AWS 배포 준비

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
