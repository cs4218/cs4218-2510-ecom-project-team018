module.exports = {
  displayName: "integration",
  testEnvironment: "jest-environment-jsdom",
  testMatch: ["<rootDir>/**/*.it.test.js"],
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },
  setupFiles: ["<rootDir>/tests/setupIntegration.js"],
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
  testTimeout: 30000,
  collectCoverage: false,
};
