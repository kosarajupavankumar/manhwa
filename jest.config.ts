import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest with a dedicated test tsconfig that includes both src/ and tests/
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/cli/**', // thin wrappers, tested via integration
    '!src/index.ts', // barrel re-export only
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};

export default config;
