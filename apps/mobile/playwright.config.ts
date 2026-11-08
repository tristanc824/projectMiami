import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.NEST_TEST_PORT || 8081);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { baseURL, ...devices['iPhone 13'], defaultBrowserType: 'chromium', browserName: 'chromium', launchOptions: { channel: 'chrome' }, trace: 'retain-on-failure' },
  webServer: { command: `npm run web -- --port ${port}`, url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
