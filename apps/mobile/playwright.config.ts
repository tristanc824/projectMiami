import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:8081', ...devices['iPhone 13'], defaultBrowserType: 'chromium', browserName: 'chromium', launchOptions: { channel: 'chrome' }, trace: 'retain-on-failure' },
  webServer: { command: 'npm start -- --port 8081', url: 'http://127.0.0.1:8081', reuseExistingServer: true, timeout: 120_000 },
});
