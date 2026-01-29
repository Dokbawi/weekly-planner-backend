import * as request from 'supertest';
import { SuperAgentTest } from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Connection, Model } from 'mongoose';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { ValidationError } from 'class-validator';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { User } from '../src/user/schemas/user.schema';
import { WeeklyPlan } from '../src/plan/schemas/plan.schema';
import { ChangeLog } from '../src/changelog/schemas/changelog.schema';
import { Notification } from '../src/notification/schemas/notification.schema';
import { CommuteRoutine } from '../src/commute-routine/schemas/commute-routine.schema';

export interface TestModule {
  app?: INestApplication;
  connection?: Connection;
  moduleFixture?: TestingModule;
}

export interface TestGlobal {
  testModule?: TestModule;
}

export const DefaultUserInfo = {
  testUser: { email: 'test@example.com', password: 'password123', name: 'Test User' },
  testUser2: { email: 'test2@example.com', password: 'password456', name: 'Test User 2' },
};

interface SeedData<T = any> {
  model: string;
  data: T[];
  seedAfterEach?: (moduleFixture: TestingModule, data: T[]) => Promise<void>;
}

interface TestModuleConfig {
  needToClearModels?: string[];
  beforeAllCb?: (moduleFixture: TestingModule) => Promise<void>;
  beforeEachCb?: (moduleFixture: TestingModule) => Promise<void>;
  seedData?: () => SeedData[];
}

const setupBeforeAll = async (
  testGlobal: TestGlobal,
  beforeCb?: (moduleFixture: TestingModule) => Promise<void>,
) => {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  testGlobal.testModule!.moduleFixture = moduleFixture;

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        return new BadRequestException({
          error: 'ValidationFailed',
          errorDetail: validationErrors.map((e) => e.constraints),
        });
      },
    }),
  );

  await app.init();
  const connection = app.get(getConnectionToken());

  testGlobal.testModule!.app = app;
  testGlobal.testModule!.connection = connection;

  if (beforeCb) {
    try {
      await beforeCb(moduleFixture);
    } catch (e) {
      console.error('[BEFORE ALL] Error:', e);
    }
  }
};

const setupAfterAll = async (testGlobal: TestGlobal) => {
  if (testGlobal.testModule?.connection) {
    await testGlobal.testModule.connection.dropDatabase();
  }
  await testGlobal.testModule?.app?.close();
};

export const setupTestGlobal = (testGlobal: TestGlobal, config: TestModuleConfig = {}) => {
  testGlobal.testModule = {};

  beforeAll(async () => {
    await setupBeforeAll(testGlobal, config.beforeAllCb);
  });

  afterAll(async () => {
    await setupAfterAll(testGlobal);
  });

  beforeEach(async () => {
    if (config.seedData) {
      const seeds = config.seedData();
      for (const seed of seeds) {
        try {
          const model = testGlobal.testModule!.app!.get<Model<any>>(getModelToken(seed.model));
          await model.insertMany(seed.data);
          if (seed.seedAfterEach) {
            await seed.seedAfterEach(testGlobal.testModule!.moduleFixture!, seed.data);
          }
        } catch (e) {
          console.error(`[SEED] Error seeding ${seed.model}:`, e);
        }
      }
    }

    if (config.beforeEachCb) {
      await config.beforeEachCb(testGlobal.testModule!.moduleFixture!);
    }
  });

  afterEach(async () => {
    const modelsToClear = config.needToClearModels || [
      User.name,
      WeeklyPlan.name,
      ChangeLog.name,
      Notification.name,
      CommuteRoutine.name,
    ];

    for (const modelName of modelsToClear) {
      try {
        const model = testGlobal.testModule!.app!.get<Model<any>>(getModelToken(modelName));
        await model.deleteMany({});
      } catch (e) {
        // Model might not exist, skip
      }
    }
  });
};

export const registerUser = async (
  app: INestApplication,
  userData: { email: string; password: string; name: string },
): Promise<request.Response> => {
  return request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(userData);
};

export const loginUser = async (
  app: INestApplication,
  credentials: { email: string; password: string },
): Promise<request.Response> => {
  return request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send(credentials);
};

export const getAuthenticatedAgent = async (
  app: INestApplication,
  userData?: { email: string; password: string; name: string },
): Promise<SuperAgentTest> => {
  const user = userData || DefaultUserInfo.testUser;

  // Register user first
  await registerUser(app, user);

  // Login to get token
  const loginRes = await loginUser(app, { email: user.email, password: user.password });
  const accessToken = loginRes.body.data?.accessToken;

  // Create agent with auth
  const agent = request.agent(app.getHttpServer());
  if (accessToken) {
    agent.auth(accessToken, { type: 'bearer' });
  }

  return agent as any;
};

export const createWeeklyPlan = async (
  agent: SuperAgentTest,
  weekStartDate: string,
): Promise<request.Response> => {
  return agent.post('/api/v1/plans').send({ weekStartDate });
};

export const addTask = async (
  agent: SuperAgentTest,
  planId: string,
  date: string,
  taskData: { title: string; description?: string; priority?: string },
): Promise<request.Response> => {
  return agent.post(`/api/v1/plans/${planId}/tasks?date=${date}`).send(taskData);
};

export const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getWeekStartDate = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};
