import { MongoMemoryServer } from 'mongodb-memory-server';
import * as dotenv from 'dotenv';

dotenv.config({ path: './.env.test' });

module.exports = async function globalSetup() {
  // Use .env.test MONGODB_URI if provided, otherwise use in-memory MongoDB
  if (!process.env.MONGODB_URI) {
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'weekly_planner_test',
      },
    });

    const uri = mongod.getUri();

    // Store the instance and URI for use in tests and teardown
    (global as any).__MONGOD__ = mongod;
    process.env.MONGODB_URI = uri;

    console.log(`[GLOBAL SETUP] MongoDB Memory Server started at ${uri}`);
  } else {
    console.log(`[GLOBAL SETUP] Using MongoDB URI from .env.test: ${process.env.MONGODB_URI}`);
  }

  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-minimum-32-chars';
  process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';
};
