import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/website', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5176', browserName: 'chromium', launchOptions: { channel: 'chrome' }, trace: 'retain-on-failure' },
  webServer: { command: 'npm --prefix ../../web-earth run dev -- --port 5176 --strictPort', url: 'http://127.0.0.1:5176', reuseExistingServer: false, timeout: 60_000, env: { NEST_WEB_APP_DIR: '../apps/mobile/dist-website-tests' } },
});
