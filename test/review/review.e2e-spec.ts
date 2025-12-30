import { SuperAgentTest } from 'supertest';
import {
  setupTestGlobal,
  TestGlobal,
  getAuthenticatedAgent,
  createWeeklyPlan,
  addTask,
  getWeekStartDate,
} from '../test-helper';

describe('Review (e2e)', () => {
  const testGlobal: TestGlobal = {};
  let authenticatedAgent: SuperAgentTest;
  const weekStartDate = getWeekStartDate();

  setupTestGlobal(testGlobal, {
    needToClearModels: ['User', 'WeeklyPlan', 'ChangeLog'],
  });

  beforeEach(async () => {
    authenticatedAgent = await getAuthenticatedAgent(testGlobal.testModule!.app!);
  });

  describe('GET /api/v1/plans/:planId/review', () => {
    let planId: string;

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;

      // Add tasks with various statuses
      await addTask(authenticatedAgent, planId, weekStartDate, { title: 'Task 1' });
      await addTask(authenticatedAgent, planId, weekStartDate, { title: 'Task 2' });
      await addTask(authenticatedAgent, planId, weekStartDate, { title: 'Task 3' });
    });

    it('should return review statistics for a plan', async () => {
      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/review`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        weeklyPlanId: planId,
        weekStartDate: weekStartDate,
        weekEndDate: expect.any(String),
        statistics: expect.objectContaining({
          totalPlanned: expect.any(Number),
          completed: expect.any(Number),
          cancelled: expect.any(Number),
          postponed: expect.any(Number),
          completionRate: expect.any(Number),
          totalChanges: expect.any(Number),
        }),
        dailyBreakdown: expect.any(Array),
        changeHistory: expect.any(Array),
      });
    });

    it('should include statistics with correct totals', async () => {
      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/review`);

      expect(res.body.data.statistics.totalPlanned).toBe(3);
      expect(res.body.data.statistics.completed).toBe(0);
    });

    it('should include dailyBreakdown for all 7 days', async () => {
      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/review`);

      expect(res.body.data.dailyBreakdown).toHaveLength(7);
      res.body.data.dailyBreakdown.forEach((day: any) => {
        expect(day).toMatchObject({
          date: expect.any(String),
          totalTasks: expect.any(Number),
          completed: expect.any(Number),
          completionRate: expect.any(Number),
        });
      });
    });

    it('should update statistics when tasks are completed', async () => {
      // Get the task ID
      const planRes = await authenticatedAgent.get(`/api/v1/plans/${planId}`);
      const taskId = planRes.body.data.dailyPlans[0].tasks[0].id;

      // Complete the task
      await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/${taskId}`)
        .send({ status: 'COMPLETED' });

      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/review`);

      expect(res.body.data.statistics.completed).toBe(1);
      expect(res.body.data.statistics.completionRate).toBeGreaterThan(0);
    });

    it('should include change history after confirmation', async () => {
      // Confirm the plan
      await authenticatedAgent.post(`/api/v1/plans/${planId}/confirm`);

      // Make some changes
      await addTask(authenticatedAgent, planId, weekStartDate, { title: 'New Task' });

      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/review`);

      expect(res.body.data.statistics.addedAfterConfirm).toBe(1);
      expect(res.body.data.changeHistory.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent plan', async () => {
      const res = await authenticatedAgent.get('/api/v1/plans/507f1f77bcf86cd799439011/review');

      expect(res.status).toBe(404);
    });

    it('should calculate correct completion rate', async () => {
      const planRes = await authenticatedAgent.get(`/api/v1/plans/${planId}`);
      const tasks = planRes.body.data.dailyPlans[0].tasks;

      // Complete 2 out of 3 tasks
      await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/${tasks[0].id}`)
        .send({ status: 'COMPLETED' });
      await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/${tasks[1].id}`)
        .send({ status: 'COMPLETED' });

      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/review`);

      expect(res.body.data.statistics.completed).toBe(2);
      expect(res.body.data.statistics.completionRate).toBe(67); // 2/3 ≈ 67%
    });

    it('should handle cancelled tasks in completion rate', async () => {
      const planRes = await authenticatedAgent.get(`/api/v1/plans/${planId}`);
      const tasks = planRes.body.data.dailyPlans[0].tasks;

      // Complete 1, cancel 1, leave 1 pending
      await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/${tasks[0].id}`)
        .send({ status: 'COMPLETED' });
      await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/${tasks[1].id}`)
        .send({ status: 'CANCELLED' });

      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/review`);

      // Completion rate should be 1/2 = 50% (cancelled not counted in total)
      expect(res.body.data.statistics.completed).toBe(1);
      expect(res.body.data.statistics.cancelled).toBe(1);
      expect(res.body.data.statistics.completionRate).toBe(50);
    });
  });
});
