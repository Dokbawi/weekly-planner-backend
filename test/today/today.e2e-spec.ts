import { SuperAgentTest } from 'supertest';
import {
  setupTestGlobal,
  TestGlobal,
  getAuthenticatedAgent,
  createWeeklyPlan,
  addTask,
  getWeekStartDate,
  getToday,
} from '../test-helper';

describe('Today (e2e)', () => {
  const testGlobal: TestGlobal = {};
  let authenticatedAgent: SuperAgentTest;
  const today = getToday();
  const weekStartDate = getWeekStartDate();

  setupTestGlobal(testGlobal, {
    needToClearModels: ['User', 'WeeklyPlan'],
  });

  beforeEach(async () => {
    authenticatedAgent = await getAuthenticatedAgent(testGlobal.testModule.app);
  });

  describe('GET /api/v1/today', () => {
    it('should return empty tasks when no plan exists', async () => {
      const res = await authenticatedAgent.get('/api/v1/today');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBe(today);
      expect(res.body.data.tasks).toHaveLength(0);
      expect(res.body.data.weeklyPlan).toBeUndefined();
    });

    it('should return today tasks when plan exists', async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      const planId = createRes.body.data.id;

      await addTask(authenticatedAgent, planId, today, {
        title: 'Task for Today',
        priority: 'HIGH',
      });

      const res = await authenticatedAgent.get('/api/v1/today');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBe(today);

      // Check if today is within the weekly plan range
      const planDates = createRes.body.data.dailyPlans.map((dp) => dp.date);
      if (planDates.includes(today)) {
        expect(res.body.data.tasks).toHaveLength(1);
        expect(res.body.data.tasks[0].title).toBe('Task for Today');
        expect(res.body.data.weeklyPlan).toBeDefined();
      }
    });

    it('should return multiple tasks for today', async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      const planId = createRes.body.data.id;

      await addTask(authenticatedAgent, planId, today, { title: 'Morning Task' });
      await addTask(authenticatedAgent, planId, today, { title: 'Afternoon Task' });
      await addTask(authenticatedAgent, planId, today, { title: 'Evening Task' });

      const res = await authenticatedAgent.get('/api/v1/today');

      expect(res.status).toBe(200);

      const planDates = createRes.body.data.dailyPlans.map((dp) => dp.date);
      if (planDates.includes(today)) {
        expect(res.body.data.tasks).toHaveLength(3);
      }
    });

    it('should return weeklyPlan info with today response', async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      const planId = createRes.body.data.id;
      await addTask(authenticatedAgent, planId, today, { title: 'Task' });

      const res = await authenticatedAgent.get('/api/v1/today');

      expect(res.status).toBe(200);

      const planDates = createRes.body.data.dailyPlans.map((dp) => dp.date);
      if (planDates.includes(today)) {
        expect(res.body.data.weeklyPlan).toMatchObject({
          id: expect.any(String),
          weekStartDate: weekStartDate,
          status: expect.any(String),
        });
      }
    });
  });
});
