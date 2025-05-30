module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.(ts|js)'],
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
};