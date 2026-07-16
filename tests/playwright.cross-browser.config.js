const {defineConfig, devices} = require("@playwright/test");

const chromiumLaunchOptions = process.env.WORMHOLES_CHROMIUM_PATH
  ? {
      executablePath: process.env.WORMHOLES_CHROMIUM_PATH,
      args: ["--no-sandbox"],
    }
  : undefined;

module.exports = defineConfig({
  testDir: "./e2e",
  testMatch: "cross-browser.spec.js",
  timeout: 45000,
  expect: {timeout: 7000},
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", {open: "never"}]],
  webServer: {
    command: "python3 support/secure-static-server.py",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 15000,
  },
  use: {
    actionTimeout: 10000,
    navigationTimeout: 15000,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: {width: 1280, height: 900},
        launchOptions: chromiumLaunchOptions,
      },
    },
    {
      name: "firefox-desktop",
      use: {
        ...devices["Desktop Firefox"],
        viewport: {width: 1280, height: 900},
      },
    },
    {
      name: "webkit-desktop",
      use: {
        ...devices["Desktop Safari"],
        viewport: {width: 1280, height: 900},
      },
    },
  ],
});
