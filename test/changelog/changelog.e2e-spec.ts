import { SuperAgentTest } from 'supertest';
import {
  setupTestGlobal,
  TestGlobal,
  getAuthenticatedAgent,
  createWeeklyPlan,
  addTask,
  getWeekStartDate,
} from '../test-helper';

describe('ChangeLog (e2e)', () => {
  const testGlobal: TestGlobal = {};
  let authenticatedAgent: SuperAgentTest;
  const weekStartDate = getWeekStartDate();

  setupTestGlobal(testGlobal, {
    needToClearModels: ['User', 'WeeklyPlan', 'ChangeLog'],
  });

  beforeEach(async () => {
    authenticatedAgent = await getAuthenticatedAgent(testGlobal.testModule!.app!);
  });

  describe('Change tracking after plan confirmation', () => {
    let planId: string;
    let taskId: string;

    beforeEach(async () => {
      // Create plan
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;

      // Add initial task
      const taskRes = await addTask(authenticatedAgent, planId, weekStartDate, {
        title: 'Initial Task',
      });
      taskId = taskRes.body.data.id;

      // Confirm the plan
      await authenticatedAgent.post(`/api/v1/plans/${planId}/confirm`);
    });

    it('should track task creation after confirmation', async () => {
      await addTask(authenticatedAgent, planId, weekStartDate, {
        title: 'New Task After Confirm',
      });

      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/changes`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const createChange = res.body.data.find(
        (c: any) => c.changeType === 'TASK_CREATED' && c.taskTitle === 'New Task After Confirm',
      );
      expect(createChange).toBeDefined();
    });

    it('should track task update after confirmation', async () => {
      await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/${taskId}`)
        .send({ title: 'Updated Title', reason: 'Changed priority' });

      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/changes`);

      expect(res.status).toBe(200);
      const updateChange = res.body.data.find((c: any) => c.changeType === 'TASK_UPDATED');
      expect(updateChange).toBeDefined();
      expect(updateChange.changes).toContainEqual(
        expect.objectContaining({
          field: 'title',
          oldValue: 'Initial Task',
          newValue: 'Updated Title',
        }),
      );
    });

    it('should track task deletion after confirmation', async () => {
      await authenticatedAgent
        .delete(`/api/v1/plans/${planId}/tasks/${taskId}`)
        .query({ reason: 'No longer needed' });

      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/changes`);

      expect(res.status).toBe(200);
      const deleteChange = res.body.data.find((c: any) => c.changeType === 'TASK_DELETED');
      expect(deleteChange).toBeDefined();
      expect(deleteChange.taskTitle).toBe('Initial Task');
    });

    it('should track task move after confirmation', async () => {
      const nextDay = new Date(weekStartDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const targetDate = nextDay.toISOString().split('T')[0];

      await authenticatedAgent
        .post(`/api/v1/plans/${planId}/tasks/${taskId}/move`)
        .send({ targetDate, reason: 'Postponed' });

      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/changes`);

      expect(res.status).toBe(200);
      const moveChange = res.body.data.find((c: any) => c.changeType === 'MOVED_TO_ANOTHER_DAY');
      expect(moveChange).toBeDefined();
    });
  });

  describe('GET /api/v1/plans/:planId/changes', () => {
    let planId: string;

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;

      await addTask(authenticatedAgent, planId, weekStartDate, { title: 'Task 1' });
      await authenticatedAgent.post(`/api/v1/plans/${planId}/confirm`);
      await addTask(authenticatedAgent, planId, weekStartDate, { title: 'Task 2' });
    });

    it('should return all changes for a plan', async () => {
      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/changes`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should return changes sorted by changedAt DESC', async () => {
      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/changes`);

      if (res.body.data.length > 1) {
        const changedTimes = res.body.data.map((c: any) => new Date(c.changedAt).getTime());
        for (let i = 1; i < changedTimes.length; i++) {
          expect(changedTimes[i - 1]).toBeGreaterThanOrEqual(changedTimes[i]);
        }
      }
    });
  });

  describe('GET /api/v1/plans/:planId/changes/by-date', () => {
    let planId: string;

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;

      await addTask(authenticatedAgent, planId, weekStartDate, { title: 'Task 1' });
      await authenticatedAgent.post(`/api/v1/plans/${planId}/confirm`);
      await addTask(authenticatedAgent, planId, weekStartDate, { title: 'Task 2' });
    });

    it('should return changes for specific date', async () => {
      const res = await authenticatedAgent.get(
        `/api/v1/plans/${planId}/changes/by-date?date=${weekStartDate}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach((change: any) => {
        expect(change.targetDate).toBe(weekStartDate);
      });
    });

    it('should return empty for date without changes', async () => {
      const res = await authenticatedAgent.get(
        `/api/v1/plans/${planId}/changes/by-date?date=2020-01-01`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('No tracking before confirmation', () => {
    let planId: string;

    beforeEach(async () => {
      const createRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = createRes.body.data.id;
    });

    it('should not track changes for DRAFT plan', async () => {
      const taskRes = await addTask(authenticatedAgent, planId, weekStartDate, {
        title: 'Draft Task',
      });
      const taskId = taskRes.body.data.id;

      await authenticatedAgent
        .put(`/api/v1/plans/${planId}/tasks/${taskId}`)
        .send({ title: 'Updated Draft Task' });

      await authenticatedAgent.delete(`/api/v1/plans/${planId}/tasks/${taskId}`);

      const res = await authenticatedAgent.get(`/api/v1/plans/${planId}/changes`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
