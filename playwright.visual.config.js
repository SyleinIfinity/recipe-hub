import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

export default defineConfig({
  ...base,
  testMatch: 'public-kitchen.spec.js',
  workers: 1,
  webServer: [
    ...base.webServer,
    {
      command:
        'node node_modules/vite/bin/vite.js tmp/FE-04-VR-before/frontend --host 127.0.0.1 --port 5176 --strictPort',
      url: 'http://127.0.0.1:5176',
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: 'http://127.0.0.1:3101' },
    },
  ],
});
