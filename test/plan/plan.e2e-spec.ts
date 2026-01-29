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

    it('should fail when creating duplicate weekly plan', async () => {
      // Create first plan
      const firstRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      expect(firstRes.status).toBe(201);

      // Try to create duplicate plan
      const res = await authenticatedAgent
        .post('/api/v1/plans')
        .send({ weekStartDate });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Weekly plan already exists');
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

  describe('GET /api/v1/plans/current', () => {
    it('should return current week plan if exists', async () => {
      await createWeeklyPlan(authenticatedAgent, weekStartDate);

      const res = await authenticatedAgent.get('/api/v1/plans/current');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.weekStartDate).toBe(weekStartDate);
    });

    it('should auto-create plan if not exists', async () => {
      const res = await authenticatedAgent.get('/api/v1/plans/current');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.weekStartDate).toBe(weekStartDate);
      expect(res.body.data.dailyPlans).toHaveLength(7);
    });
  });

  describe('PUT /api/v1/plans/:planId/memo', () => {
    let planId: string;

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;
    });

    it('should update daily memo', async () => {
      const res = await authenticatedAgent
        .put(`/api/v1/plans/${planId}/memo`)
        .send({ date: weekStartDate, memo: '오늘의 메모입니다' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dailyPlan = res.body.data.dailyPlans.find((dp: any) => dp.date === weekStartDate);
      expect(dailyPlan.memo).toBe('오늘의 메모입니다');
    });

    it('should update memo to empty string', async () => {
      // First set memo
      await authenticatedAgent
        .put(`/api/v1/plans/${planId}/memo`)
        .send({ date: weekStartDate, memo: '메모' });

      // Then clear it
      const res = await authenticatedAgent
        .put(`/api/v1/plans/${planId}/memo`)
        .send({ date: weekStartDate, memo: '' });

      expect(res.status).toBe(200);
      const dailyPlan = res.body.data.dailyPlans.find((dp: any) => dp.date === weekStartDate);
      expect(dailyPlan.memo).toBe('');
    });

    it('should fail with invalid date', async () => {
      const res = await authenticatedAgent
        .put(`/api/v1/plans/${planId}/memo`)
        .send({ date: '2020-01-01', memo: '메모' });

      expect(res.status).toBe(400);
    });

    it('should fail without date', async () => {
      const res = await authenticatedAgent
        .put(`/api/v1/plans/${planId}/memo`)
        .send({ memo: '메모' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/v1/plans/:planId/tasks/reorder', () => {
    let planId: string;
    let taskIds: string[];

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;

      // Add 3 tasks
      const task1 = await addTask(authenticatedAgent, planId, weekStartDate, { title: 'Task 1' });
      const task2 = await addTask(authenticatedAgent, planId, weekStartDate, { title: 'Task 2' });
      const task3 = await addTask(authenticatedAgent, planId, weekStartDate, { title: 'Task 3' });

      taskIds = [task1.body.data.id, task2.body.data.id, task3.body.data.id];
    });

    it('should reorder tasks', async () => {
      const newOrder = [taskIds[2], taskIds[0], taskIds[1]]; // 3, 1, 2

      const res = await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/reorder`)
        .send({ date: weekStartDate, taskIds: newOrder });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify order
      const planRes = await authenticatedAgent.get(`/api/v1/plans/${planId}`);
      const dailyPlan = planRes.body.data.dailyPlans.find((dp: any) => dp.date === weekStartDate);

      expect(dailyPlan.tasks[0].title).toBe('Task 3');
      expect(dailyPlan.tasks[1].title).toBe('Task 1');
      expect(dailyPlan.tasks[2].title).toBe('Task 2');
    });

    it('should fail with non-existent task id', async () => {
      const res = await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/reorder`)
        .send({ date: weekStartDate, taskIds: ['invalid-id'] });

      expect(res.status).toBe(400);
    });

    it('should fail with invalid date', async () => {
      const res = await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/reorder`)
        .send({ date: '2020-01-01', taskIds: taskIds });

      expect(res.status).toBe(400);
    });

    it('should keep remaining tasks at the end', async () => {
      // Only reorder first task
      const res = await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/reorder`)
        .send({ date: weekStartDate, taskIds: [taskIds[2]] });

      expect(res.status).toBe(200);

      const planRes = await authenticatedAgent.get(`/api/v1/plans/${planId}`);
      const dailyPlan = planRes.body.data.dailyPlans.find((dp: any) => dp.date === weekStartDate);

      expect(dailyPlan.tasks[0].title).toBe('Task 3');
      expect(dailyPlan.tasks).toHaveLength(3);
    });
  });
});
