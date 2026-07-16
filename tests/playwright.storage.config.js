const { defineConfig } = require('@playwright/test');
const baseConfig = require('./playwright.config');
const { STORAGE_HEAVY_TEST_MATCH } = require('./support/storage-heavy-specs');

module.exports = defineConfig({
  ...baseConfig,
  testMatch: STORAGE_HEAVY_TEST_MATCH,
  testIgnore: [],
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-storage-heavy' }]
  ]
});
