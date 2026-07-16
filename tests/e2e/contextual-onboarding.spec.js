const {test, expect} = require("@playwright/test");
const {openCleanApp} = require("../support/app");

test.describe("contextual onboarding", () => {
  test("shows remembered footer help for screens and first-use controls", async ({page}) => {
    const runtimeErrors = await openCleanApp(page);
    const footer = page.locator("#contextualOnboardingFooter");

    await expect(footer).toBeVisible();
    await expect(footer.locator("#contextualOnboardingTitle")).toHaveText("Welcome to Wormholes");
    await expect(footer.locator("#contextualOnboardingDisable")).not.toBeChecked();
    await expect(page.locator("#homeScreen #contextualOnboardingFooter")).toBeVisible();

    await footer.locator("#hideContextualOnboardingBtn").click();
    await expect(footer).toBeHidden();
    await expect(page.locator("#homeScreen #contextualHelpBtn")).toBeVisible();

    await page.locator("#createUniverseBtn").click();
    await expect(page.locator("#universeTitleModal")).toHaveClass(/open/);
    await expect(footer).toBeVisible();
    await expect(footer.locator("#contextualOnboardingTitle")).toHaveText("Create a universe");
    await expect(page.locator("#universeTitleModal #contextualOnboardingFooter")).toBeVisible();

    const stored = await page.evaluate(() => ({
      home: localStorage.getItem("wormholesOnboardingSeen:screen:home"),
      createButton: localStorage.getItem("wormholesOnboardingSeen:control:createUniverseBtn"),
    }));
    expect(stored).toEqual({home: "true", createButton: "true"});
    expect(runtimeErrors).toEqual([]);
  });

  test("remembers the global tip preference but keeps contextual help available", async ({page}) => {
    await openCleanApp(page);
    const footer = page.locator("#contextualOnboardingFooter");

    await footer.locator("#contextualOnboardingDisable").check();
    await footer.locator("#hideContextualOnboardingBtn").click();
    await expect(footer).toBeHidden();
    await expect(page.locator("#contextualHelpBtn")).toBeVisible();

    await page.reload({waitUntil: "domcontentloaded"});
    await expect(footer).toBeHidden();
    await expect(page.locator("#contextualHelpBtn")).toBeVisible();

    await page.locator("#contextualHelpBtn").click();
    await expect(footer).toBeVisible();
    await expect(footer.locator("#contextualOnboardingTitle")).toHaveText("Welcome to Wormholes");
    await expect(footer.locator("#contextualOnboardingDisable")).toBeChecked();
  });
});
