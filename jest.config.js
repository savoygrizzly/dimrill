module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'node'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  verbose: true,
  maxWorkers: 1,
  silent: false
};
