import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['backend/tests/unit/**/*.test.js'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['backend/tests/integration/**/*.test.js'],
          fileParallelism: false,
          testTimeout: 15000,
          hookTimeout: 20000,
        },
      },
      {
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['frontend/tests/**/*.test.js'],
        },
      },
    ],
  },
});
