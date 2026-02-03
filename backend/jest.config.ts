module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(ts|js)',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  verbose: true,
};
