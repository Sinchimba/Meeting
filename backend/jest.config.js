module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/?(*.)+(spec|test).[t]s?(x)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
