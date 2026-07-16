const fs = require("node:fs/promises");
const {test, expect} = require("@playwright/test");
const {openCleanApp} = require("../support/app");

test("Support Report previews and downloads technical details without creative content", async ({page}) => {
  const secret = "SECRET CREATIVE CONTENT 276";
  await openCleanApp(page);
  await page.evaluate((secretText) => {
    localStorage.setItem("wormholes_test_secret", secretText);
    window.WormholesActivityLog?.add?.({
      type: "error",
      message: `Could not save ${secretText} at /private/path.txt`,
      detail: {
        summary: `Private document body: ${secretText}`,
        technical: {code: "QUOTA_EXCEEDED", path: "/private/path.txt"},
      },
    });
  }, secret);

  await page.locator("#settingsGearBtn").click();
  await page.locator("#settingsHelpToggle").click();
  await page.locator("#supportReportBtn").click();

  await expect(page.locator("#supportReportModal")).toHaveClass(/open/);
  await expect(page.locator("#supportReportTitle")).toHaveText("Support Report");
  await expect(page.locator("#supportReportPrivacy")).toContainText("does not include your creations");
  await expect(page.locator("#downloadSupportReportBtn")).toBeEnabled();

  const preview = await page.locator("#supportReportPreview").textContent();
  expect(preview).toContain('"creativeContentIncluded": false');
  expect(preview).toContain('"version": "Wormholes Beta 279"');
  expect(preview).toContain('"browser"');
  expect(preview).toContain('"activeMode"');
  expect(preview).toContain('"schemas"');
  expect(preview).toContain('"logs"');
  expect(preview).not.toContain(secret);
  expect(preview).not.toContain("/private/path.txt");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#downloadSupportReportBtn").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^Wormholes_Support_Report_.+\.json$/);
  const downloadPath = await download.path();
  const data = JSON.parse(await fs.readFile(downloadPath, "utf8"));
  expect(data.privacy.creativeContentIncluded).toBe(false);
  expect(data.build.version).toBe("Wormholes Beta 279");
  expect(JSON.stringify(data)).not.toContain(secret);
  expect(JSON.stringify(data)).not.toContain("/private/path.txt");
  await expect(page.locator("#supportReportStatus")).toHaveText("Support report downloaded.");
});
