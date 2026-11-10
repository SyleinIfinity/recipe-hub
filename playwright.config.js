import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:5175', browserName: 'firefox' },
  webServer: [
    {
      command: 'node backend/src/server.js',
      url: 'http://127.0.0.1:3101/health/ready',
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test',
        APP_DOCS_ENABLED: 'true',
        SMTP_ENABLED: 'false',
        MEDIA_PROVIDER: 'fake',
        CLOUDINARY_FOLDER_MODE: 'dynamic',
        IMAGE_DELIVERY_POLICY: 'authenticated',
        APP_ORIGINS: 'http://127.0.0.1:3101,http://127.0.0.1:5175',
        AUTH_RATE_LIMIT: '1000',
        CSRF_RATE_LIMIT: '1000',
        PORT: '3101',
        HOST: '127.0.0.1',
        DB_NAME: 'recipe-hub-test',
        MONGODB_URI:
          process.env.TEST_MONGODB_URI ||
          'mongodb://127.0.0.1:27018/recipe-hub-test',
      },
    },
    {
      command: 'npm run dev:web -- --port 5175 --strictPort',
      url: 'http://127.0.0.1:5175',
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: 'http://127.0.0.1:3101' },
    },
  ],
});
