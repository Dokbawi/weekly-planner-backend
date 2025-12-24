import { Config } from '@jest/types';
import { baseConfig } from './jest.config';

const config: Config.InitialOptions = {
  ...baseConfig,
  displayName: 'unit',
  testMatch: ['<rootDir>/**/*.spec.ts', '!<rootDir>/**/*.e2e-spec.ts'],
};

export default config;
