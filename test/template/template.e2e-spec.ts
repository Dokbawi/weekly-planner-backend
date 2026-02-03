import { SuperAgentTest } from 'supertest';
import {
  setupTestGlobal,
  TestGlobal,
  getAuthenticatedAgent,
  createWeeklyPlan,
  addTask,
  getWeekStartDate,
} from '../test-helper';

describe('Template (e2e)', () => {
  const testGlobal: TestGlobal = {};
  let authenticatedAgent: SuperAgentTest;
  const weekStartDate = getWeekStartDate();

  setupTestGlobal(testGlobal, {
    needToClearModels: ['User', 'WeeklyPlan', 'WeeklyTemplate'],
  });

  beforeEach(async () => {
    authenticatedAgent = await getAuthenticatedAgent(testGlobal.testModule!.app!);
  });

  describe('POST /api/v1/templates', () => {
    it('should create a template', async () => {
      const res = await authenticatedAgent
        .post('/api/v1/templates')
        .send({
          name: 'Work Week',
          description: 'Standard work week template',
          dayPlans: [
            {
              dayOfWeek: 1,
              tasks: [
                { title: 'Morning standup', priority: 'HIGH', scheduledTime: '09:00' },
                { title: 'Code review', priority: 'MEDIUM' },
              ],
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: 'Work Week',
        description: 'Standard work week template',
        isDefault: false,
      });
      expect(res.body.data.dayPlans).toHaveLength(1);
      expect(res.body.data.dayPlans[0].tasks).toHaveLength(2);
    });

    it('should create a template with isDefault', async () => {
      const res = await authenticatedAgent
        .post('/api/v1/templates')
        .send({ name: 'Default', isDefault: true });

      expect(res.status).toBe(201);
      expect(res.body.data.isDefault).toBe(true);
    });

    it('should clear previous default when setting new default', async () => {
      await authenticatedAgent
        .post('/api/v1/templates')
        .send({ name: 'First Default', isDefault: true });

      await authenticatedAgent
        .post('/api/v1/templates')
        .send({ name: 'Second Default', isDefault: true });

      const listRes = await authenticatedAgent.get('/api/v1/templates');
      const defaults = listRes.body.data.filter((t: any) => t.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].name).toBe('Second Default');
    });

    it('should enforce max 20 templates per user', async () => {
      for (let i = 0; i < 20; i++) {
        await authenticatedAgent
          .post('/api/v1/templates')
          .send({ name: `Template ${i}` });
      }

      const res = await authenticatedAgent
        .post('/api/v1/templates')
        .send({ name: 'Template 21' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Maximum');
    });
  });

  describe('GET /api/v1/templates', () => {
    beforeEach(async () => {
      await authenticatedAgent
        .post('/api/v1/templates')
        .send({ name: 'Template A' });
      await authenticatedAgent
        .post('/api/v1/templates')
        .send({ name: 'Template B', isDefault: true });
    });

    it('should return all templates for the user', async () => {
      const res = await authenticatedAgent.get('/api/v1/templates');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      // Default first
      expect(res.body.data[0].name).toBe('Template B');
    });
  });

  describe('GET /api/v1/templates/:id', () => {
    it('should return a template by id', async () => {
      const createRes = await authenticatedAgent
        .post('/api/v1/templates')
        .send({ name: 'My Template' });
      const id = createRes.body.data.id;

      const res = await authenticatedAgent.get(`/api/v1/templates/${id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('My Template');
    });

    it('should return 404 for non-existent template', async () => {
      const res = await authenticatedAgent.get('/api/v1/templates/000000000000000000000000');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/templates/:id', () => {
    it('should update a template', async () => {
      const createRes = await authenticatedAgent
        .post('/api/v1/templates')
        .send({ name: 'Old Name' });
      const id = createRes.body.data.id;

      const res = await authenticatedAgent
        .put(`/api/v1/templates/${id}`)
        .send({ name: 'New Name', description: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.description).toBe('Updated');
    });
  });

  describe('DELETE /api/v1/templates/:id', () => {
    it('should delete a template', async () => {
      const createRes = await authenticatedAgent
        .post('/api/v1/templates')
        .send({ name: 'To Delete' });
      const id = createRes.body.data.id;

      const deleteRes = await authenticatedAgent.delete(`/api/v1/templates/${id}`);
      expect(deleteRes.status).toBe(200);

      const getRes = await authenticatedAgent.get(`/api/v1/templates/${id}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('POST /api/v1/templates/from-plan/:planId', () => {
    it('should create template from existing plan', async () => {
      const planRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      const planId = planRes.body.data.id;
      const date = planRes.body.data.dailyPlans[0].date;

      await addTask(authenticatedAgent, planId, date, {
        title: 'Task from plan',
        priority: 'HIGH',
      });

      const res = await authenticatedAgent
        .post(`/api/v1/templates/from-plan/${planId}`)
        .send({ name: 'From Current Week' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('From Current Week');
      // Should have day plans derived from the weekly plan
      expect(res.body.data.dayPlans.length).toBeGreaterThan(0);

      // Find the day plan that has tasks
      const dayWithTasks = res.body.data.dayPlans.find(
        (dp: any) => dp.tasks.length > 0,
      );
      expect(dayWithTasks).toBeDefined();
      expect(dayWithTasks.tasks[0].title).toBe('Task from plan');
      // Should NOT include runtime data
      expect(dayWithTasks.tasks[0].id).toBeUndefined();
      expect(dayWithTasks.tasks[0].status).toBeUndefined();
      expect(dayWithTasks.tasks[0].completedAt).toBeUndefined();
      expect(dayWithTasks.tasks[0].createdAt).toBeUndefined();
    });
  });

  describe('POST /api/v1/plans/:planId/apply-template/:templateId', () => {
    let planId: string;
    let templateId: string;

    beforeEach(async () => {
      // Create a plan
      const planRes = await createWeeklyPlan(authenticatedAgent, weekStartDate);
      planId = planRes.body.data.id;

      // Create a template with tasks for Monday (dayOfWeek=1)
      const templateRes = await authenticatedAgent
        .post('/api/v1/templates')
        .send({
          name: 'Test Template',
          dayPlans: [
            {
              dayOfWeek: 1,
              tasks: [
                { title: 'Template Task 1', priority: 'HIGH' },
                { title: 'Template Task 2', priority: 'LOW' },
              ],
            },
          ],
        });
      templateId = templateRes.body.data.id;
    });

    it('should apply template in overwrite mode', async () => {
      const res = await authenticatedAgent
        .post(`/api/v1/plans/${planId}/apply-template/${templateId}`)
        .send({ mode: 'overwrite' });

      expect(res.status).toBe(201);

      // Verify plan was updated
      const planRes = await authenticatedAgent.get(`/api/v1/plans/${planId}`);
      const mondayPlan = planRes.body.data.dailyPlans.find((dp: any) => {
        const date = new Date(dp.date);
        return date.getDay() === 1;
      });

      if (mondayPlan) {
        expect(mondayPlan.tasks).toHaveLength(2);
        expect(mondayPlan.tasks[0].title).toBe('Template Task 1');
      }
    });

    it('should apply template in merge mode', async () => {
      // Add an existing task first
      const date = (await authenticatedAgent.get(`/api/v1/plans/${planId}`))
        .body.data.dailyPlans.find((dp: any) => new Date(dp.date).getDay() === 1)?.date;

      if (date) {
        await addTask(authenticatedAgent, planId, date, { title: 'Existing Task' });

        const res = await authenticatedAgent
          .post(`/api/v1/plans/${planId}/apply-template/${templateId}`)
          .send({ mode: 'merge' });

        expect(res.status).toBe(201);

        const planRes = await authenticatedAgent.get(`/api/v1/plans/${planId}`);
        const mondayPlan = planRes.body.data.dailyPlans.find(
          (dp: any) => dp.date === date,
        );
        // Should have existing + template tasks
        expect(mondayPlan.tasks.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should fail to apply template to CONFIRMED plan', async () => {
      // Confirm the plan first
      await authenticatedAgent.post(`/api/v1/plans/${planId}/confirm`);

      const res = await authenticatedAgent
        .post(`/api/v1/plans/${planId}/apply-template/${templateId}`)
        .send({ mode: 'overwrite' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('DRAFT');
    });
  });
});
