// Provide a valid environment BEFORE any module imports `config/env.ts`
// (which validates and would otherwise exit the process). dotenv does not
// override already-set vars, so these win during tests.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/assetflow_test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-that-is-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-that-is-at-least-32-characters-long';
