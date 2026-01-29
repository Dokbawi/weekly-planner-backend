import * as request from 'supertest';
import { setupTestGlobal, TestGlobal } from '../test-helper';

describe('Health (e2e)', () => {
  const testGlobal: TestGlobal = {};

  setupTestGlobal(testGlobal, {
    needToClearModels: [],
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'ok',
        info: expect.any(Object),
      });
    });

    it('should include mongodb health check', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .get('/api/v1/health');

      expect(res.body.info.mongodb).toBeDefined();
      expect(res.body.info.mongodb.status).toBe('up');
    });

    it('should be accessible without authentication', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .get('/api/v1/health');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/health/live', () => {
    it('should return liveness status', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .get('/api/v1/health/live');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'ok',
      });
    });

    it('should be accessible without authentication', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .get('/api/v1/health/live');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return readiness status', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .get('/api/v1/health/ready');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'ok',
      });
    });

    it('should include mongodb readiness', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .get('/api/v1/health/ready');

      expect(res.body.info).toBeDefined();
      expect(res.body.info.mongodb).toBeDefined();
    });

    it('should be accessible without authentication', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .get('/api/v1/health/ready');

      expect(res.status).toBe(200);
    });
  });
});
