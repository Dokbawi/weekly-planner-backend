import { Config } from '@jest/types';
import { baseConfig } from './jest.config';

const config: Config.InitialOptions = {
  ...baseConfig,
  displayName: 'E2E',
  testMatch: ['<rootDir>/**/*.e2e-spec.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  maxWorkers: '50%',
  testTimeout: 30000,
};

export default config;
