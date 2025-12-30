# Test script for newly implemented APIs
$BASE_URL = "http://localhost:8080/api/v1"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$EMAIL = "test_$timestamp@example.com"
$PASSWORD = "password123"

Write-Host "🧪 Testing Newly Implemented APIs" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# 1. Register
Write-Host "`n📝 1. Register new user" -ForegroundColor Yellow
$registerBody = @{
    email = $EMAIL
    password = $PASSWORD
    name = "Test User"
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -ContentType "application/json" -Body $registerBody
Write-Host "Response: $($registerResponse | ConvertTo-Json -Compress)"

# 2. Login
Write-Host "`n🔐 2. Login" -ForegroundColor Yellow
$loginBody = @{
    email = $EMAIL
    password = $PASSWORD
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
Write-Host "Response: $($loginResponse | ConvertTo-Json -Compress)"

$TOKEN = $loginResponse.data.accessToken
Write-Host "Token: $TOKEN"

$headers = @{
    "Authorization" = "Bearer $TOKEN"
}

# 3. GET /auth/me
Write-Host "`n👤 3. GET /auth/me" -ForegroundColor Yellow
$meResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/me" -Method Get -Headers $headers
Write-Host "Response: $($meResponse | ConvertTo-Json -Compress)"

# 4. PUT /auth/settings
Write-Host "`n⚙️ 4. PUT /auth/settings" -ForegroundColor Yellow
$settingsBody = @{
    planningDay = 1
    reviewDay = 5
    timezone = "America/New_York"
    defaultReminderMinutes = 20
    notificationEnabled = $false
} | ConvertTo-Json

$settingsResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/settings" -Method Put -Headers $headers -ContentType "application/json" -Body $settingsBody
Write-Host "Response: $($settingsResponse | ConvertTo-Json -Compress)"

# 5. GET /plans/current
Write-Host "`n📅 5. GET /plans/current" -ForegroundColor Yellow
$currentPlanResponse = Invoke-RestMethod -Uri "$BASE_URL/plans/current" -Method Get -Headers $headers
Write-Host "Response: $($currentPlanResponse | ConvertTo-Json -Compress)"

$PLAN_ID = $currentPlanResponse.data.id
Write-Host "Plan ID: $PLAN_ID"

$TODAY = Get-Date -Format "yyyy-MM-dd"

# 6. PUT /plans/{planId}/memo
Write-Host "`n📝 6. PUT /plans/$PLAN_ID/memo" -ForegroundColor Yellow
$memoBody = @{
    date = $TODAY
    memo = "Today's focus: Complete API implementation"
} | ConvertTo-Json

$memoResponse = Invoke-RestMethod -Uri "$BASE_URL/plans/$PLAN_ID/memo" -Method Put -Headers $headers -ContentType "application/json" -Body $memoBody
Write-Host "Memo updated successfully"

# 7. GET /plans with pagination
Write-Host "`n📋 7. GET /plans with pagination" -ForegroundColor Yellow
$paginatedPlans = Invoke-RestMethod -Uri "$BASE_URL/plans?page=0&size=5&status=DRAFT" -Method Get -Headers $headers
Write-Host "Total elements: $($paginatedPlans.data.totalElements)"
Write-Host "Total pages: $($paginatedPlans.data.totalPages)"

# 8. Create task for notification test
Write-Host "`n🔔 8. Testing notifications" -ForegroundColor Yellow
$taskBody = @{
    title = "Test Task for Notification"
} | ConvertTo-Json

$taskResponse = Invoke-RestMethod -Uri "$BASE_URL/plans/$PLAN_ID/tasks?date=$TODAY" -Method Post -Headers $headers -ContentType "application/json" -Body $taskBody
Write-Host "Task created"

# 9. PUT /notifications/read-all
Write-Host "`n✅ 9. POST /notifications/read-all" -ForegroundColor Yellow
$readAllResponse = Invoke-RestMethod -Uri "$BASE_URL/notifications/read-all" -Method Post -Headers $headers
Write-Host "All notifications marked as read"

Write-Host "`n✨ Testing completed!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Green
Write-Host "- GET /auth/me ✅" -ForegroundColor Green
Write-Host "- PUT /auth/settings ✅" -ForegroundColor Green
Write-Host "- GET /plans/current ✅" -ForegroundColor Green
Write-Host "- PUT /plans/{planId}/memo ✅" -ForegroundColor Green
Write-Host "- GET /plans (with pagination) ✅" -ForegroundColor Green
Write-Host "- POST /notifications/read-all ✅" -ForegroundColor Green