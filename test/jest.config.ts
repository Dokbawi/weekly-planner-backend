import { Config } from '@jest/types';

export const baseConfig: Config.InitialOptions = {
  rootDir: '..',
  testEnvironment: 'node',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  moduleFileExtensions: ['js', 'json', 'ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  coveragePathIgnorePatterns: ['node_modules', '.schema.ts', '.dto.ts', '.module.ts'],
};

const config: Config.InitialOptions = {
  projects: ['./test/jest.config.unit.ts', './test/jest.config.e2e.ts'],
};

export default config;
