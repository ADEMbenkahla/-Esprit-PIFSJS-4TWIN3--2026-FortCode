// __tests__/setup.js
process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

// Nettoyage après chaque test
afterEach(() => {
  jest.clearAllMocks();
});