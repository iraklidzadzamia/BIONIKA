// Test setup file - loads environment variables for testing

// Set required environment variables for tests
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/petbuddy-test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-do-not-use-in-production';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only-do-not-use';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.COOKIE_MAX_AGE = '604800000';
process.env.INTERNAL_SERVICE_API_KEY = 'test-internal-service-api-key-32-chars-minimum-length';
process.env.CORS_ORIGIN = 'http://localhost:3000';
