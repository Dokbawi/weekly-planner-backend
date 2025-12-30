import * as request from 'supertest';
import { SuperAgentTest } from 'supertest';
import {
  setupTestGlobal,
  TestGlobal,
  getAuthenticatedAgent,
  createWeeklyPlan,
  addTask,
  getWeekStartDate,
  DefaultUserInfo,
} from '../test-helper';

describe('Plan (e2e)', () => {
  const testGlobal: TestGlobal = {};
  let authenticatedAgent: SuperAgentTest;
  const weekStartDate = getWeekStartDate();

  setupTestGlobal(testGlobal, {
    needToClearModels: ['User', 'WeeklyPlan', 'ChangeLog'],
  });

  beforeEach(async () => {
    authenticatedAgent = await getAuthenticatedAgent(testGlobal.testModule!.app!);
  });

  describe('POST /api/v1/plans', () => {
    it('should create a new weekly plan', async () => {
      const res = await createWeeklyPlan(authenticatedAgent, weekStartDate);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        weekStartDate,
        status: 'DRAFT',
        dailyPlans: expect.any(Array),
      });
      expect(res.body.data.dailyPlans).toHaveLength(7);
    });

    it('should fail with invalid date format', async () => {
      const res = await authenticatedAgent
        .post('/api/v1/plans')
        .send({ weekStartDate: 'invalid-date' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .post('/api/v1/plans')
        .send({ weekStartDate });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/plans', () => {
    beforeEach(async () => {
      await createWeeklyPlan(authenticatedAgent, weekStartDate);
    });

    it('should return all plans for the user', async () => {
      const res = await authenticatedAgent.get('/api/v1/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].weekStartDate).toBe(weekStartDate);
    });

    it('should not return plans from other users', async () => {
      const otherAgent = await getAuthenticatedAgent(
        testGlobal.testModule!.app!,
        DefaultUserInfo.testUser2,
      );

      const res = await otherAgent.get('/api/v1/plans');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/plans/:planId', () => {
    let planId: string;

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;
    });

    it('should return specific plan', async () => {
      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(planId);
    });

    it('should return 404 for non-existent plan', async () => {
      const res = await authenticatedAgent.get('/api/v1/plans/507f1f77bcf86cd799439011');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/plans/by-date', () => {
    beforeEach(async () => {
      await createWeeklyPlan(authenticatedAgent, weekStartDate);
    });

    it('should return plan by date', async () => {
      const res = await authenticatedAgent.get(`/api/v1/plans/by-date?date=${weekStartDate}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.weekStartDate).toBe(weekStartDate);
    });

    it('should return null for date without plan', async () => {
      const res = await authenticatedAgent.get('/api/v1/plans/by-date?date=2020-01-01');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  describe('POST /api/v1/plans/:planId/confirm', () => {
    let planId: string;

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;
    });

    it('should confirm a draft plan', async () => {
      const res = await authenticatedAgent.post(`/api/v1/plans/${planId}/confirm`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.confirmedAt).toBeDefined();
    });

    it('should fail to confirm already confirmed plan', async () => {
      await authenticatedAgent.post(`/api/v1/plans/${planId}/confirm`);

      const res = await authenticatedAgent.post(`/api/v1/plans/${planId}/confirm`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/plans/:planId/tasks', () => {
    let planId: string;

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;
    });

    it('should add a task to a specific date', async () => {
      const res = await addTask(authenticatedAgent, planId, weekStartDate, {
        title: 'Test Task',
        description: 'Test Description',
        priority: 'HIGH',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        title: 'Test Task',
        description: 'Test Description',
        priority: 'HIGH',
        status: 'PENDING',
      });
    });

    it('should fail with invalid date not in plan', async () => {
      const res = await addTask(authenticatedAgent, planId, '2020-01-01', {
        title: 'Test Task',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail without task title', async () => {
      const res = await authenticatedAgent
        .post(`/api/v1/plans/${planId}/tasks?date=${weekStartDate}`)
        .send({ description: 'No title' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/plans/:planId/tasks/:taskId', () => {
    let planId: string;
    let taskId: string;

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;

      const taskRes = await addTask(authenticatedAgent, planId, weekStartDate, {
        title: 'Original Task',
      });
      taskId = taskRes.body.data.id;
    });

    it('should update task title', async () => {
      const res = await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/${taskId}`)
        .send({ title: 'Updated Task' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Task');
    });

    it('should update task status to COMPLETED', async () => {
      const res = await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/${taskId}`)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.completedAt).toBeDefined();
    });

    it('should return 404 for non-existent task', async () => {
      const res = await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/507f1f77bcf86cd799439011`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/plans/:planId/tasks/:taskId', () => {
    let planId: string;
    let taskId: string;

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;

      const taskRes = await addTask(authenticatedAgent, planId, weekStartDate, {
        title: 'Task to Delete',
      });
      taskId = taskRes.body.data.id;
    });

    it('should delete a task', async () => {
      const res = await authenticatedAgent.delete(`/api/v1/plans/${planId}/tasks/${taskId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should verify task is deleted', async () => {
      await authenticatedAgent.delete(`/api/v1/plans/${planId}/tasks/${taskId}`);

      const planRes = await authenticatedAgent.get(`/api/v1/plans/${planId}`);
      const dailyPlan = planRes.body.data.dailyPlans.find((dp: any) => dp.date === weekStartDate);

      expect(dailyPlan.tasks).toHaveLength(0);
    });
  });

  describe('POST /api/v1/plans/:planId/tasks/:taskId/move', () => {
    let planId: string;
    let taskId: string;
    let targetDate: string;

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;

      const taskRes = await addTask(authenticatedAgent, planId, weekStartDate, {
        title: 'Task to Move',
      });
      taskId = taskRes.body.data.id;

      // Get second day of the week
      const nextDay = new Date(weekStartDate);
      nextDay.setDate(nextDay.getDate() + 1);
      targetDate = nextDay.toISOString().split('T')[0];
    });

    it('should move task to another day', async () => {
      const res = await authenticatedAgent
        .post(`/api/v1/plans/${planId}/tasks/${taskId}/move`)
        .send({ targetDate, reason: 'Rescheduled' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should mark original task as POSTPONED', async () => {
      await authenticatedAgent
        .post(`/api/v1/plans/${planId}/tasks/${taskId}/move`)
        .send({ targetDate });

      const planRes = await authenticatedAgent.get(`/api/v1/plans/${planId}`);
      const sourceDailyPlan = planRes.body.data.dailyPlans.find((dp: any) => dp.date === weekStartDate);
      const originalTask = sourceDailyPlan.tasks.find((t: any) => t.id === taskId);

      expect(originalTask.status).toBe('POSTPONED');
    });

    it('should fail with invalid target date', async () => {
      const res = await authenticatedAgent
        .post(`/api/v1/plans/${planId}/tasks/${taskId}/move`)
        .send({ targetDate: '2020-01-01' });

      expect(res.status).toBe(400);
    });
  });
});
