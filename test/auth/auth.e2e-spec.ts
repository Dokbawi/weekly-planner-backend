import * as request from 'supertest';
import {
  setupTestGlobal,
  TestGlobal,
  DefaultUserInfo,
  registerUser,
  loginUser,
} from '../test-helper';

describe('Auth (e2e)', () => {
  const testGlobal: TestGlobal = {};

  setupTestGlobal(testGlobal, {
    needToClearModels: ['User'],
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await registerUser(testGlobal.testModule!.app!, DefaultUserInfo.testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        email: DefaultUserInfo.testUser.email,
        name: DefaultUserInfo.testUser.name,
      });
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.password).toBeUndefined();
    });

    it('should fail with duplicate email', async () => {
      await registerUser(testGlobal.testModule!.app!, DefaultUserInfo.testUser);

      const res = await registerUser(testGlobal.testModule!.app!, DefaultUserInfo.testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid email format', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with short password', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with missing required fields', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await registerUser(testGlobal.testModule!.app!, DefaultUserInfo.testUser);
    });

    it('should login successfully with valid credentials', async () => {
      const res = await loginUser(testGlobal.testModule!.app!, {
        email: DefaultUserInfo.testUser.email,
        password: DefaultUserInfo.testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: expect.any(Number),
      });
    });

    it('should fail with wrong password', async () => {
      const res = await loginUser(testGlobal.testModule!.app!, {
        email: DefaultUserInfo.testUser.email,
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with non-existent email', async () => {
      const res = await loginUser(testGlobal.testModule!.app!, {
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid email format', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected Routes', () => {
    it('should reject requests without authentication token', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .get('/api/v1/plans');

      expect(res.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .get('/api/v1/plans')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should accept requests with valid token', async () => {
      await registerUser(testGlobal.testModule!.app!, DefaultUserInfo.testUser);
      const loginRes = await loginUser(testGlobal.testModule!.app!, {
        email: DefaultUserInfo.testUser.email,
        password: DefaultUserInfo.testUser.password,
      });

      const res = await request(testGlobal.testModule!.app!.getHttpServer())
        .get('/api/v1/plans')
        .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);

      expect(res.status).toBe(200);
    });
  });
});
