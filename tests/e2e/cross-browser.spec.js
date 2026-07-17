const path = require("path");
const {test, expect} = require("@playwright/test");
const {
  openCleanApp,
  createUniverse,
  archiveQuickRollCreation,
  createTwoArchivedCreations,
  uniqueTitle,
} = require("../support/app");

test.describe("critical cross-browser workflows", () => {
  test("boots cleanly and exposes the primary app shell", async ({page, browserName}) => {
    const runtimeErrors = await openCleanApp(page);

    await expect(page).toHaveTitle(/Wormholes Beta \d+ — Universe Builder/);
    await expect(page.locator("#homeScreen")).toBeVisible();
    await expect(page.locator("#createUniverseBtn")).toBeVisible();
    await expect(page.locator("#globalSearchBtn")).toBeVisible();
    expect(runtimeErrors, `${browserName} startup runtime errors`).toEqual([]);
  });

  test("creates, archives, reloads, and reopens persisted content", async ({page, browserName}) => {
    const runtimeErrors = await openCleanApp(page);
    const universeTitle = await createUniverse(page, uniqueTitle(`${browserName} Universe`));
    const creationTitle = await archiveQuickRollCreation(
      page,
      uniqueTitle(`${browserName} Creation`),
    );

    await page.reload({waitUntil: "domcontentloaded"});
    await expect(page.locator("#homeScreen")).toBeVisible();
    await page.locator("#enterUniverseBtn").click();
    await expect(page.locator("#universeArchiveModal")).toHaveClass(/open/);
    const savedUniverse = page
      .locator("#universeArchiveList .universe-entry")
      .filter({hasText: universeTitle});
    await expect(savedUniverse).toHaveCount(1);
    await savedUniverse.locator(".universe-entry-main").click();
    await expect(page.locator("#appScreen")).toBeVisible();
    await expect(page.locator("#currentUniverseLabel")).toHaveText(universeTitle);
    await page.locator("#archiveTabBtn").click();
    await expect(
      page.locator("#archiveList .entry-title-main", {hasText: creationTitle}),
    ).toBeVisible();

    expect(runtimeErrors, `${browserName} persistence-flow runtime errors`).toEqual([]);
  });

  test("global search navigates to an archived result", async ({page, browserName}) => {
    const runtimeErrors = await openCleanApp(page);
    const universeTitle = await createUniverse(page, uniqueTitle(`${browserName} Search Universe`));
    const creationTitle = await archiveQuickRollCreation(
      page,
      uniqueTitle(`${browserName} Search Creation`),
    );

    await page.locator("#homeBtn").click();
    await page.locator("#globalSearchBtn").click();
    await expect(page.locator("#globalSearchModal")).toHaveClass(/open/);
    await page.locator("#globalSearchInput").fill(creationTitle);

    const result = page.locator(".global-search-result", {hasText: creationTitle});
    await expect(result).toContainText(universeTitle);
    await result.click();

    await expect(page.locator("#appScreen")).toBeVisible();
    await expect(page.locator("#archiveTab")).toHaveClass(/active/);
    await expect(
      page.locator("#archiveList .entry-title-main", {hasText: creationTitle}),
    ).toBeVisible();
    expect(runtimeErrors, `${browserName} search-flow runtime errors`).toEqual([]);
  });

  test("uploads Literature and Vision Board files through browser storage", async ({
    page,
    browserName,
  }) => {
    const runtimeErrors = await openCleanApp(page);
    await createUniverse(page, uniqueTitle(`${browserName} Upload Universe`));

    await page.locator("#literatureTabBtn").click();
    await page
      .locator("#literatureFileInput")
      .setInputFiles(path.join(__dirname, "..", "fixtures", "literature-sample.txt"));
    await expect(page.locator("#literatureCount")).toHaveText("1 doc saved");
    await expect(
      page.locator("#literatureList .entry-title-main", {hasText: "literature-sample"}),
    ).toBeVisible();

    await page.locator("#visionTabBtn").click();
    await page
      .locator("#visionFileInput")
      .setInputFiles(path.join(__dirname, "..", "fixtures", "vision-sample.png"));
    await expect(page.locator("#visionBoardCount")).toHaveText("1 image added");
    await expect(page.locator("#visionBoardGrid .vision-pin")).toHaveCount(1);

    expect(runtimeErrors, `${browserName} upload-flow runtime errors`).toEqual([]);
  });

  test("creates a connection and renders its map plus text alternative", async ({
    page,
    browserName,
  }) => {
    const runtimeErrors = await openCleanApp(page);
    await createUniverse(page, uniqueTitle(`${browserName} Map Universe`));
    const {firstId, secondId, second} = await createTwoArchivedCreations(page);

    const sourceCard = page.locator(`#archiveList .entry[data-id="${firstId}"]`);
    await sourceCard.locator(".menu-button").click();
    await sourceCard.locator(".connect-action").click();
    await expect(page.locator("#connectPickerModal")).toHaveClass(/open/);
    await page.locator("#connectPickerList .nested-picker-select", {hasText: second}).click();
    await page.locator("#saveConnectPickerBtn").click();

    await page.locator("#connectionsBtn").click();
    await expect(page.locator("#connectionsScreen")).toBeVisible();
    await expect(
      page.locator(`#connectionsMapWrap .connection-node[data-id="${firstId}"]`),
    ).toBeVisible();
    await expect(
      page.locator(`#connectionsMapWrap .connection-node[data-id="${secondId}"]`),
    ).toBeVisible();

    await page.locator('[data-map-list-scope="connections"]').click();
    await expect(page.locator("#mapListViewModal")).toHaveClass(/open/);
    await expect(page.locator("#mapListViewModal")).toContainText(second);

    expect(runtimeErrors, `${browserName} connection-map runtime errors`).toEqual([]);
  });
});
