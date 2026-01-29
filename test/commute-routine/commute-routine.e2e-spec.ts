import { SuperAgentTest } from 'supertest';
import {
  setupTestGlobal,
  TestGlobal,
  getAuthenticatedAgent,
  DefaultUserInfo,
} from '../test-helper';

describe('CommuteRoutine (e2e)', () => {
  const testGlobal: TestGlobal = {};
  let authenticatedAgent: SuperAgentTest;

  setupTestGlobal(testGlobal, {
    needToClearModels: ['User', 'CommuteRoutine'],
  });

  beforeEach(async () => {
    authenticatedAgent = await getAuthenticatedAgent(testGlobal.testModule!.app!);
  });

  describe('POST /api/v1/commute-routines', () => {
    it('should create a commute routine', async () => {
      const res = await authenticatedAgent
        .post('/api/v1/commute-routines')
        .send({
          name: '출근 루틴',
          steps: [
            { name: '샤워', durationMinutes: 15 },
            { name: '아침 식사', durationMinutes: 20 },
            { name: '이동', durationMinutes: 30 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: '출근 루틴',
        steps: expect.any(Array),
        totalDuration: 65,
      });
      expect(res.body.data.steps).toHaveLength(3);
    });

    it('should fail with empty steps', async () => {
      const res = await authenticatedAgent
        .post('/api/v1/commute-routines')
        .send({
          name: '빈 루틴',
          steps: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail without name', async () => {
      const res = await authenticatedAgent
        .post('/api/v1/commute-routines')
        .send({
          steps: [{ name: '이동', durationMinutes: 30 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/commute-routines', () => {
    beforeEach(async () => {
      await authenticatedAgent.post('/api/v1/commute-routines').send({
        name: '출근 루틴',
        steps: [{ name: '이동', durationMinutes: 30 }],
      });
      await authenticatedAgent.post('/api/v1/commute-routines').send({
        name: '퇴근 루틴',
        steps: [{ name: '이동', durationMinutes: 25 }],
      });
    });

    it('should return all routines for the user', async () => {
      const res = await authenticatedAgent.get('/api/v1/commute-routines');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should not return routines from other users', async () => {
      const otherAgent = await getAuthenticatedAgent(
        testGlobal.testModule!.app!,
        DefaultUserInfo.testUser2,
      );

      const res = await otherAgent.get('/api/v1/commute-routines');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/commute-routines/:routineId', () => {
    let routineId: string;

    beforeEach(async () => {
      const createRes = await authenticatedAgent.post('/api/v1/commute-routines').send({
        name: '출근 루틴',
        steps: [
          { name: '샤워', durationMinutes: 15 },
          { name: '이동', durationMinutes: 30 },
        ],
      });
      routineId = createRes.body.data.id;
    });

    it('should return specific routine', async () => {
      const res = await authenticatedAgent.get(`/api/v1/commute-routines/${routineId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(routineId);
      expect(res.body.data.name).toBe('출근 루틴');
    });

    it('should return 404 for non-existent routine', async () => {
      const res = await authenticatedAgent.get('/api/v1/commute-routines/507f1f77bcf86cd799439011');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/commute-routines/:routineId', () => {
    let routineId: string;

    beforeEach(async () => {
      const createRes = await authenticatedAgent.post('/api/v1/commute-routines').send({
        name: '출근 루틴',
        steps: [{ name: '이동', durationMinutes: 30 }],
      });
      routineId = createRes.body.data.id;
    });

    it('should update routine name', async () => {
      const res = await authenticatedAgent
        .put(`/api/v1/commute-routines/${routineId}`)
        .send({ name: '수정된 출근 루틴' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('수정된 출근 루틴');
    });

    it('should update routine steps', async () => {
      const res = await authenticatedAgent
        .put(`/api/v1/commute-routines/${routineId}`)
        .send({
          steps: [
            { name: '샤워', durationMinutes: 10 },
            { name: '이동', durationMinutes: 40 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.steps).toHaveLength(2);
      expect(res.body.data.totalDuration).toBe(50);
    });

    it('should return 404 for non-existent routine', async () => {
      const res = await authenticatedAgent
        .put('/api/v1/commute-routines/507f1f77bcf86cd799439011')
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/commute-routines/:routineId', () => {
    let routineId: string;

    beforeEach(async () => {
      const createRes = await authenticatedAgent.post('/api/v1/commute-routines').send({
        name: '삭제할 루틴',
        steps: [{ name: '이동', durationMinutes: 30 }],
      });
      routineId = createRes.body.data.id;
    });

    it('should delete a routine', async () => {
      const res = await authenticatedAgent.delete(`/api/v1/commute-routines/${routineId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should verify routine is deleted', async () => {
      await authenticatedAgent.delete(`/api/v1/commute-routines/${routineId}`);

      const res = await authenticatedAgent.get(`/api/v1/commute-routines/${routineId}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent routine', async () => {
      const res = await authenticatedAgent.delete('/api/v1/commute-routines/507f1f77bcf86cd799439011');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/commute-routines/:routineId/calculate', () => {
    let routineId: string;

    beforeEach(async () => {
      const createRes = await authenticatedAgent.post('/api/v1/commute-routines').send({
        name: '출근 루틴',
        steps: [
          { name: '샤워', durationMinutes: 15 },
          { name: '아침 식사', durationMinutes: 20 },
          { name: '이동', durationMinutes: 30 },
        ],
      });
      routineId = createRes.body.data.id;
    });

    it('should calculate departure time', async () => {
      const res = await authenticatedAgent
        .post(`/api/v1/commute-routines/${routineId}/calculate`)
        .send({ arrivalTime: '09:00' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        arrivalTime: '09:00',
        departureTime: expect.any(String),
        totalDuration: 65,
        steps: expect.any(Array),
      });
    });

    it('should calculate correct departure time (09:00 - 65min = 07:55)', async () => {
      const res = await authenticatedAgent
        .post(`/api/v1/commute-routines/${routineId}/calculate`)
        .send({ arrivalTime: '09:00' });

      expect(res.body.data.departureTime).toBe('07:55');
    });

    it('should apply offset to departure time', async () => {
      const res = await authenticatedAgent
        .post(`/api/v1/commute-routines/${routineId}/calculate`)
        .send({ arrivalTime: '09:00', offsetMinutes: 10 });

      // 09:00 - 65min - 10min = 07:45
      expect(res.body.data.departureTime).toBe('07:45');
    });

    it('should include step breakdown', async () => {
      const res = await authenticatedAgent
        .post(`/api/v1/commute-routines/${routineId}/calculate`)
        .send({ arrivalTime: '09:00' });

      expect(res.body.data.steps).toHaveLength(3);
      res.body.data.steps.forEach((step: any) => {
        expect(step).toMatchObject({
          name: expect.any(String),
          durationMinutes: expect.any(Number),
          startTime: expect.any(String),
          endTime: expect.any(String),
        });
      });
    });

    it('should fail without arrivalTime', async () => {
      const res = await authenticatedAgent
        .post(`/api/v1/commute-routines/${routineId}/calculate`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent routine', async () => {
      const res = await authenticatedAgent
        .post('/api/v1/commute-routines/507f1f77bcf86cd799439011/calculate')
        .send({ arrivalTime: '09:00' });

      expect(res.status).toBe(404);
    });
  });
});
