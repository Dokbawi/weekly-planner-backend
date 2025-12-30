import { SuperAgentTest } from 'supertest';
import {
  setupTestGlobal,
  TestGlobal,
  getAuthenticatedAgent,
  DefaultUserInfo,
} from '../test-helper';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

describe('Notification (e2e)', () => {
  const testGlobal: TestGlobal = {};
  let authenticatedAgent: SuperAgentTest;
  let userId: string;

  setupTestGlobal(testGlobal, {
    needToClearModels: ['User', 'Notification'],
  });

  beforeEach(async () => {
    authenticatedAgent = await getAuthenticatedAgent(testGlobal.testModule!.app!);

    // Get the user ID from the registered user
    const userModel = testGlobal.testModule!.app!.get<Model<any>>(getModelToken('User'));
    const user = await userModel.findOne({ email: DefaultUserInfo.testUser.email });
    userId = user._id.toString();

    // Seed some notifications
    const notificationModel = testGlobal.testModule!.app!.get<Model<any>>(
      getModelToken('Notification'),
    );
    await notificationModel.insertMany([
      {
        userId: new Types.ObjectId(userId),
        type: 'TASK_REMINDER',
        title: 'Task Reminder 1',
        message: 'Your task is due soon',
        isRead: false,
      },
      {
        userId: new Types.ObjectId(userId),
        type: 'DAILY_SUMMARY',
        title: 'Daily Summary',
        message: 'You have 3 tasks today',
        isRead: false,
      },
      {
        userId: new Types.ObjectId(userId),
        type: 'PLANNING_REMINDER',
        title: 'Planning Reminder',
        message: 'Time to plan your week',
        isRead: true,
        readAt: new Date(),
      },
    ]);
  });

  describe('GET /api/v1/notifications', () => {
    it('should return all notifications for the user', async () => {
      const res = await authenticatedAgent.get('/api/v1/notifications');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
    });

    it('should return notifications sorted by createdAt DESC', async () => {
      const res = await authenticatedAgent.get('/api/v1/notifications');

      expect(res.status).toBe(200);
      const createdTimes = res.body.data.map((n: any) => new Date(n.createdAt).getTime());
      for (let i = 1; i < createdTimes.length; i++) {
        expect(createdTimes[i - 1]).toBeGreaterThanOrEqual(createdTimes[i]);
      }
    });
  });

  describe('GET /api/v1/notifications/unread', () => {
    it('should return only unread notifications', async () => {
      const res = await authenticatedAgent.get('/api/v1/notifications/unread');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach((notification: any) => {
        expect(notification.isRead).toBe(false);
      });
    });
  });

  describe('GET /api/v1/notifications/unread/count', () => {
    it('should return count of unread notifications', async () => {
      const res = await authenticatedAgent.get('/api/v1/notifications/unread/count');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(2);
    });
  });

  describe('POST /api/v1/notifications/:notificationId/read', () => {
    it('should mark notification as read', async () => {
      const listRes = await authenticatedAgent.get('/api/v1/notifications/unread');
      const notificationId = listRes.body.data[0].id;

      const res = await authenticatedAgent.post(`/api/v1/notifications/${notificationId}/read`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).toBeDefined();
    });

    it('should return 404 for non-existent notification', async () => {
      const res = await authenticatedAgent.post(
        '/api/v1/notifications/507f1f77bcf86cd799439011/read',
      );

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const res = await authenticatedAgent.post('/api/v1/notifications/read-all');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify all are read
      const countRes = await authenticatedAgent.get('/api/v1/notifications/unread/count');
      expect(countRes.body.data.count).toBe(0);
    });
  });
});
