import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts'],
    // bcryptjs (pure-JS, cost 12) is deliberately slow; some tests chain several
    // hash/verify calls, so give them generous headroom.
    testTimeout: 20_000,
  },
});
