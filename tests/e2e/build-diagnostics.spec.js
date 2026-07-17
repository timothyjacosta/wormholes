const {test, expect} = require("@playwright/test");
const {openCleanApp} = require("../support/app");

const EXPECT_RELEASE_METADATA = process.env.WORMHOLES_EXPECT_RELEASE_METADATA === "true";

test("About Wormholes shows and copies build details", async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedWormholesBuildDetails = text;
        },
      },
    });
  });

  await openCleanApp(page);
  await page.locator("#settingsGearBtn").click();
  await page.locator("#settingsHelpToggle").click();
  await page.locator("#buildDiagnosticsBtn").click();

  await expect(page.locator("#buildDiagnosticsModal")).toHaveClass(/open/);
  await expect(page.locator("#buildDiagnosticsTitle")).toHaveText("About Wormholes");
  await expect(page.locator("#buildDiagnosticsVersion")).toHaveText("Wormholes Beta 301");

  if (EXPECT_RELEASE_METADATA) {
    await expect(page.locator("#buildDiagnosticsId")).toHaveText(/^beta-297-[0-9a-f]{7,40}$/);
    await expect(page.locator("#buildDiagnosticsCommit")).toHaveText(/^[0-9a-f]{40}$/);
    await expect(page.locator("#buildDiagnosticsTimestamp")).not.toHaveText("Local copy");
  }

  await page.locator("#copyBuildDiagnosticsBtn").click();
  await expect(page.locator("#buildDiagnosticsCopyStatus")).toHaveText("Build details copied.");
  const copied = await page.evaluate(() => window.__copiedWormholesBuildDetails || "");
  expect(copied).toContain("Version: Wormholes Beta 301");
  expect(copied).toContain("Build ID:");
  expect(copied).toContain("Source commit:");
  expect(copied).toContain("Built:");

  await page.locator("#closeBuildDiagnosticsBtn").click();
  await expect(page.locator("#buildDiagnosticsModal")).not.toHaveClass(/open/);
  await expect(page.locator("#settingsPanel")).toBeVisible();
});
