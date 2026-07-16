const { defineConfig, devices } = require('@playwright/test');
const { STORAGE_HEAVY_TEST_MATCH } = require('./support/storage-heavy-specs');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 45000,
  expect: { timeout: 7000 },
  fullyParallel: true,
  testIgnore: STORAGE_HEAVY_TEST_MATCH,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'python3 support/secure-static-server.py',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 15000
  },
  use: {
    launchOptions: process.env.WORMHOLES_CHROMIUM_PATH ? {
      executablePath: process.env.WORMHOLES_CHROMIUM_PATH,
      args: ['--no-sandbox']
    } : undefined,
    actionTimeout: 10000,
    navigationTimeout: 15000,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 }
      }
    }
  ]
});
