const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir:'./e2e',
  testMatch:/long-session-soak-self-contained\.spec\.js/,
  timeout:15 * 60 * 1000,
  expect:{timeout:10000},
  fullyParallel:false,
  workers:1,
  forbidOnly:!!process.env.CI,
  retries:process.env.CI ? 1 : 0,
  reporter:[['list'], ['html', {open:'never', outputFolder:'soak/playwright-report'}]],
  use:{
    launchOptions:{
      executablePath:process.env.WORMHOLES_CHROMIUM_PATH || undefined,
      args:['--no-sandbox', '--enable-precise-memory-info']
    },
    actionTimeout:15000,
    navigationTimeout:30000,
    trace:'retain-on-failure'
  },
  projects:[{
    name:'chromium-soak',
    use:{
      ...devices['Desktop Chrome'],
      viewport:{width:1280, height:900}
    }
  }]
});
