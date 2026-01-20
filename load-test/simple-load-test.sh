#!/bin/bash

# Simple Load Test Script using curl
# Usage: ./simple-load-test.sh [BASE_URL]

BASE_URL="${1:-https://weekly-planner-backend-gm4tlivy5q-du.a.run.app}"

echo "=========================================="
echo "Weekly Planner Load Test"
echo "Base URL: $BASE_URL"
echo "Date: $(date)"
echo "=========================================="

# 1. Cold Start Test
echo ""
echo "1. Cold Start Test (First Request)"
echo "------------------------------------------"

START_TIME=$(date +%s%3N)
RESPONSE=$(curl -s -w "\n%{http_code}|%{time_total}" "$BASE_URL/api/v1/health")
END_TIME=$(date +%s%3N)

HTTP_CODE=$(echo "$RESPONSE" | tail -1 | cut -d'|' -f1)
RESPONSE_TIME=$(echo "$RESPONSE" | tail -1 | cut -d'|' -f2)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response Time: ${RESPONSE_TIME}s"
echo "Response: $BODY"

# 2. Warm Requests (10 consecutive)
echo ""
echo "2. Warm Requests Test (10 consecutive)"
echo "------------------------------------------"

TOTAL_TIME=0
SUCCESS=0
FAIL=0

for i in {1..10}; do
  RESPONSE=$(curl -s -w "%{time_total}" -o /dev/null "$BASE_URL/api/v1/health")
  TOTAL_TIME=$(echo "$TOTAL_TIME + $RESPONSE" | bc)

  if [ "$(echo "$RESPONSE < 1" | bc)" -eq 1 ]; then
    SUCCESS=$((SUCCESS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
  echo "Request $i: ${RESPONSE}s"
done

AVG_TIME=$(echo "scale=3; $TOTAL_TIME / 10" | bc)
echo ""
echo "Average Response Time: ${AVG_TIME}s"
echo "Success: $SUCCESS / 10"

# 3. Concurrent Requests Test
echo ""
echo "3. Concurrent Requests Test (10 parallel)"
echo "------------------------------------------"

START_TIME=$(date +%s%3N)

for i in {1..10}; do
  curl -s -o /dev/null "$BASE_URL/api/v1/health" &
done
wait

END_TIME=$(date +%s%3N)
TOTAL_CONCURRENT_TIME=$((END_TIME - START_TIME))

echo "10 concurrent requests completed in: ${TOTAL_CONCURRENT_TIME}ms"

# 4. Auth Endpoint Test
echo ""
echo "4. Auth Endpoint Test (Register + Login)"
echo "------------------------------------------"

TEST_EMAIL="loadtest_$(date +%s)@test.com"
TEST_PASSWORD="TestPassword123!"

# Register
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}|%{time_total}" \
  -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Load Test\"}")

REG_CODE=$(echo "$REGISTER_RESPONSE" | tail -1 | cut -d'|' -f1)
REG_TIME=$(echo "$REGISTER_RESPONSE" | tail -1 | cut -d'|' -f2)
echo "Register: HTTP $REG_CODE (${REG_TIME}s)"

# Login
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}|%{time_total}" \
  -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -1 | cut -d'|' -f1)
LOGIN_TIME=$(echo "$LOGIN_RESPONSE" | tail -1 | cut -d'|' -f2)
echo "Login: HTTP $LOGIN_CODE (${LOGIN_TIME}s)"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | sed '$d' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "Token acquired successfully"

  # 5. Authenticated Requests Test
  echo ""
  echo "5. Authenticated Endpoints Test"
  echo "------------------------------------------"

  # Get current plan
  PLAN_RESPONSE=$(curl -s -w "\n%{http_code}|%{time_total}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/v1/plans/current")

  PLAN_CODE=$(echo "$PLAN_RESPONSE" | tail -1 | cut -d'|' -f1)
  PLAN_TIME=$(echo "$PLAN_RESPONSE" | tail -1 | cut -d'|' -f2)
  echo "GET /plans/current: HTTP $PLAN_CODE (${PLAN_TIME}s)"

  # Get today
  TODAY_RESPONSE=$(curl -s -w "\n%{http_code}|%{time_total}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/v1/today")

  TODAY_CODE=$(echo "$TODAY_RESPONSE" | tail -1 | cut -d'|' -f1)
  TODAY_TIME=$(echo "$TODAY_RESPONSE" | tail -1 | cut -d'|' -f2)
  echo "GET /today: HTTP $TODAY_CODE (${TODAY_TIME}s)"

  # Get notifications
  NOTIF_RESPONSE=$(curl -s -w "\n%{http_code}|%{time_total}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/v1/notifications")

  NOTIF_CODE=$(echo "$NOTIF_RESPONSE" | tail -1 | cut -d'|' -f1)
  NOTIF_TIME=$(echo "$NOTIF_RESPONSE" | tail -1 | cut -d'|' -f2)
  echo "GET /notifications: HTTP $NOTIF_CODE (${NOTIF_TIME}s)"
fi

echo ""
echo "=========================================="
echo "Load Test Completed"
echo "=========================================="
