const {test, expect} = require("@playwright/test");
const {createUniverse, archiveQuickRollCreation} = require("../support/app");
const {openSelfContainedApp} = require("../support/self-contained-app");

test.describe("screen-reader regression coverage", () => {
  test("Create Universe validation exposes and associates the error", async ({page}) => {
    await openSelfContainedApp(page, {inlineStyles: true});

    await page.locator("#createUniverseBtn").click();
    const input = page.locator("#universeTitleInput");
    const error = page.locator("#universeTitleError");

    await expect(input).not.toHaveAttribute("aria-invalid", "true");
    await page.locator("#saveUniverseTitleBtn").click();

    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute("role", "alert");
    await expect(error).toHaveAttribute("aria-live", "assertive");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAttribute("aria-errormessage", /(^|\s)universeTitleError(\s|$)/);
    await expect(input).toHaveAttribute("aria-describedby", /(^|\s)universeTitleError(\s|$)/);
    await expect(input).toBeFocused();
  });

  test("Connections view transitions move focus to the destination heading", async ({page}) => {
    await openSelfContainedApp(page, {inlineStyles: true});
    await createUniverse(page, "Screen Reader Focus Universe");
    await page.locator("#archiveTabBtn").click();

    await page.locator("#connectionsBtn").click();
    await expect(page.locator("#connectionsScreen")).toBeVisible();
    await expect(page.locator("#connectionsHeading")).toBeFocused();

    await page.locator("#backToArchiveBtn").click();
    await expect(page.locator("#archiveListScreen")).toBeVisible();
    await expect(page.locator("#archiveListHeading")).toBeFocused();
  });

  test("keyboard selection on a Connections map node preserves focus and exposes pressed state", async ({
    page,
  }) => {
    await openSelfContainedApp(page, {inlineStyles: true});
    await createUniverse(page, "Screen Reader Map Universe");
    await archiveQuickRollCreation(page, "Keyboard Map Item");

    await page.locator("#connectionsBtn").click();
    await expect(page.locator("#connectionsHeading")).toBeFocused();
    const node = page.locator('.connection-node[data-type="creation"]').first();
    await expect(node).toBeVisible();
    await expect(node).toHaveAttribute("aria-pressed", "false");

    await node.focus();
    await expect(node).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(node).toBeFocused();
    await expect(node).toHaveAttribute("aria-pressed", "true");
  });
});
