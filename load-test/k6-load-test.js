import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const coldStartTime = new Trend('cold_start_time');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://weekly-planner-backend-gm4tlivy5q-du.a.run.app';

export const options = {
  scenarios: {
    // 1. Cold Start 테스트 (첫 요청)
    cold_start: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      startTime: '0s',
      maxDuration: '30s',
    },
    // 2. 점진적 부하 테스트 (500 VUs)
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // 50 VUs까지 증가 (워밍업)
        { duration: '30s', target: 100 },  // 100 VUs까지 증가
        { duration: '30s', target: 250 },  // 250 VUs까지 증가
        { duration: '30s', target: 500 },  // 500 VUs까지 증가
        { duration: '1m', target: 500 },   // 500 VUs 유지 (피크)
        { duration: '30s', target: 0 },    // 종료
      ],
      startTime: '35s',  // cold_start 후 시작
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95%가 2초 이내
    errors: ['rate<0.1'],               // 에러율 10% 미만
  },
};

// Test data
let testToken = '';
const testUser = {
  email: `loadtest_${Date.now()}@test.com`,
  password: 'testPassword123!',
  name: 'Load Test User',
};

export function setup() {
  console.log(`Testing against: ${BASE_URL}`);

  // Register test user
  const registerRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify(testUser),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (registerRes.status === 201 || registerRes.status === 409) {
    // Login to get token
    const loginRes = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ email: testUser.email, password: testUser.password }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (loginRes.status === 200) {
      const body = JSON.parse(loginRes.body);
      return { token: body.data.accessToken };
    }
  }

  return { token: '' };
}

export default function (data) {
  const token = data.token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 1. Health Check (Public)
  const healthRes = http.get(`${BASE_URL}/api/v1/health`);
  check(healthRes, {
    'health check status 200': (r) => r.status === 200,
  });
  errorRate.add(healthRes.status !== 200);

  if (__ITER === 0 && __VU === 1) {
    coldStartTime.add(healthRes.timings.duration);
    console.log(`Cold Start Time: ${healthRes.timings.duration}ms`);
  }

  sleep(0.5);

  // 2. Get Current Plan (Authenticated)
  if (token) {
    const planRes = http.get(`${BASE_URL}/api/v1/plans/current`, { headers });
    check(planRes, {
      'get plan status 200': (r) => r.status === 200,
    });
    errorRate.add(planRes.status !== 200);

    sleep(0.3);

    // 3. Get Today's Tasks
    const todayRes = http.get(`${BASE_URL}/api/v1/today`, { headers });
    check(todayRes, {
      'get today status 200': (r) => r.status === 200,
    });
    errorRate.add(todayRes.status !== 200);

    sleep(0.3);

    // 4. Get Notifications
    const notifRes = http.get(`${BASE_URL}/api/v1/notifications`, { headers });
    check(notifRes, {
      'get notifications status 200': (r) => r.status === 200,
    });
    errorRate.add(notifRes.status !== 200);
  }

  sleep(1);
}

export function handleSummary(data) {
  const duration = data.metrics.http_req_duration && data.metrics.http_req_duration.values;
  const reqs = data.metrics.http_reqs && data.metrics.http_reqs.values;
  const errs = data.metrics.errors && data.metrics.errors.values;
  const coldStart = data.metrics.cold_start_time && data.metrics.cold_start_time.values;
  const checks = data.root_group && data.root_group.checks;

  const summary = {
    timestamp: new Date().toISOString(),
    base_url: BASE_URL,
    metrics: {
      http_req_duration: {
        avg: duration ? duration.avg : null,
        p95: duration ? duration['p(95)'] : null,
        p99: duration ? duration['p(99)'] : null,
        max: duration ? duration.max : null,
      },
      http_reqs: {
        count: reqs ? reqs.count : null,
        rate: reqs ? reqs.rate : null,
      },
      errors: {
        rate: errs ? errs.rate : null,
      },
      cold_start_time: coldStart ? coldStart.avg : null,
    },
    checks: {
      passed: checks ? checks.reduce(function(sum, c) { return sum + c.passes; }, 0) : 0,
      failed: checks ? checks.reduce(function(sum, c) { return sum + c.fails; }, 0) : 0,
    },
  };

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'load-test/results.json': JSON.stringify(summary, null, 2),
  };
}
