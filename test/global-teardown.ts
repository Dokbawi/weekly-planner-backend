import { MongoMemoryServer } from 'mongodb-memory-server';

module.exports = async function globalTeardown() {
  const mongod: MongoMemoryServer = (global as any).__MONGOD__;

  if (mongod) {
    await mongod.stop();
    console.log('[GLOBAL TEARDOWN] MongoDB Memory Server stopped');
  }
};
