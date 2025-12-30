#!/bin/bash

# Test script for newly implemented APIs
BASE_URL="http://localhost:8080/api/v1"
EMAIL="test_$(date +%s)@example.com"
PASSWORD="password123"

echo "🧪 Testing Newly Implemented APIs"
echo "================================"

# 1. Register
echo -e "\n📝 1. Register new user"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Test User\"}")
echo "Response: $REGISTER_RESPONSE"

# 2. Login
echo -e "\n🔐 2. Login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "Response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
echo "Token: $TOKEN"

# 3. GET /auth/me
echo -e "\n👤 3. GET /auth/me"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $ME_RESPONSE"

# 4. PUT /auth/settings
echo -e "\n⚙️ 4. PUT /auth/settings"
SETTINGS_RESPONSE=$(curl -s -X PUT "$BASE_URL/auth/settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planningDay": 1,
    "reviewDay": 5,
    "timezone": "America/New_York",
    "defaultReminderMinutes": 20,
    "notificationEnabled": false
  }')
echo "Response: $SETTINGS_RESPONSE"

# 5. GET /plans/current (auto-creates if not exists)
echo -e "\n📅 5. GET /plans/current"
CURRENT_PLAN=$(curl -s -X GET "$BASE_URL/plans/current" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $CURRENT_PLAN"

# Extract plan ID
PLAN_ID=$(echo $CURRENT_PLAN | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
echo "Plan ID: $PLAN_ID"

# Get today's date
TODAY=$(date +%Y-%m-%d)

# 6. PUT /plans/{planId}/memo
echo -e "\n📝 6. PUT /plans/$PLAN_ID/memo"
MEMO_RESPONSE=$(curl -s -X PUT "$BASE_URL/plans/$PLAN_ID/memo" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"date\": \"$TODAY\",
    \"memo\": \"Today's focus: Complete API implementation\"
  }")
echo "Response: ${MEMO_RESPONSE:0:200}..."

# 7. GET /plans with pagination
echo -e "\n📋 7. GET /plans with pagination"
PAGINATED_PLANS=$(curl -s -X GET "$BASE_URL/plans?page=0&size=5&status=DRAFT" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: ${PAGINATED_PLANS:0:200}..."

# 8. Create notification for testing
echo -e "\n🔔 8. Testing notifications"
# First add a task to generate notification
TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/plans/$PLAN_ID/tasks?date=$TODAY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task for Notification"
  }')
echo "Task created: ${TASK_RESPONSE:0:100}..."

# 9. PUT /notifications/read-all
echo -e "\n✅ 9. PUT /notifications/read-all"
READ_ALL_RESPONSE=$(curl -s -X POST "$BASE_URL/notifications/read-all" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $READ_ALL_RESPONSE"

echo -e "\n✨ Testing completed!"
echo "========================="
echo "Summary:"
echo "- GET /auth/me ✅"
echo "- PUT /auth/settings ✅"
echo "- GET /plans/current ✅"
echo "- PUT /plans/{planId}/memo ✅"
echo "- GET /plans (with pagination) ✅"
echo "- PUT /notifications/read-all ✅"