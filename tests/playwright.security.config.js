const {defineConfig} = require('@playwright/test');
const baseConfig = require('./playwright.config');

module.exports = defineConfig({
  ...baseConfig,
  testIgnore: [],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', {open: 'never', outputFolder: 'playwright-report-security'}]
  ]
});
