const {test, expect} = require("@playwright/test");
const {appUrl, createUniverse, uniqueTitle} = require("../support/app");

function literatureEntry(page, title) {
  return page.locator("#literatureList .literature-entry").filter({hasText: title});
}

async function failLargeDataIndexedDb(page) {
  await page.addInitScript(() => {
    const originalIndexedDb = window.indexedDB;
    const failingIndexedDb = new Proxy(originalIndexedDb, {
      get(target, property) {
        if (property === "open") {
          return (name, version) => {
            if (name !== "WormholesLargeData") return target.open(name, version);
            const request = {};
            queueMicrotask(() => {
              request.error = new DOMException("Large data IndexedDB is unavailable.", "UnknownError");
              request.onerror?.({target: request});
            });
            return request;
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: failingIndexedDb,
    });
  });
}

async function enterSavedUniverse(page, title) {
  await page.locator("#enterUniverseBtn").click();
  await expect(page.locator("#universeArchiveModal")).toHaveClass(/open/);
  const entry = page.locator("#universeArchiveList .universe-entry").filter({hasText: title});
  await expect(entry).toHaveCount(1);
  await entry.locator(".universe-entry-main").click();
  await expect(page.locator("#currentUniverseLabel")).toHaveText(title);
}

test("Literature keeps its content when IndexedDB is unavailable", async ({page}) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await failLargeDataIndexedDb(page);
  await page.goto(appUrl(), {waitUntil: "domcontentloaded"});
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({waitUntil: "domcontentloaded"});
  await expect(page.locator("#homeScreen")).toBeVisible();

  const universeTitle = await createUniverse(page, uniqueTitle("IndexedDB Fallback"));
  const documentTitle = uniqueTitle("Fallback Literature");
  const documentBody = "This body must survive without IndexedDB.";

  await expect(
    page.evaluate(() => ({
      supported: window.WormholesLargeDataStore?.supported,
      status: window.WormholesLargeDataStore?.status?.(),
    })),
  ).resolves.toMatchObject({supported: false});

  await page.locator("#literatureTabBtn").click();
  await page.locator("#createLiteratureBtn").click();
  await page.locator("#literatureTitleInput").fill(documentTitle);
  await page.locator("#literatureEditor").fill(documentBody);
  await page.locator("#saveLiteratureBtn").click();

  await expect(page.locator("#literatureCount")).toHaveText("1 doc saved");
  await expect(literatureEntry(page, documentTitle)).toBeVisible();

  const storedBeforeReload = await page.evaluate((title) => {
    const key = Object.keys(localStorage).find((candidate) =>
      candidate.startsWith("wormholesUniverseLiterature:"),
    );
    const envelope = key ? JSON.parse(localStorage.getItem(key)) : null;
    return envelope?.data?.find((doc) => doc.title === title) || null;
  }, documentTitle);

  expect(storedBeforeReload?.content).toContain(documentBody);
  expect(storedBeforeReload?.contentStored).not.toBe("indexedDB");

  await page.reload({waitUntil: "domcontentloaded"});
  await expect(page.locator("#homeScreen")).toBeVisible();
  await enterSavedUniverse(page, universeTitle);
  await page.locator("#literatureTabBtn").click();
  await expect(page.locator("#literatureCount")).toHaveText("1 doc saved");
  await expect(literatureEntry(page, documentTitle)).toBeVisible();

  const entry = literatureEntry(page, documentTitle);
  await entry.locator(":scope > .entry-top .menu-button").click();
  await entry.locator(":scope > .entry-top .literature-edit-action").click();
  await expect(page.locator("#literatureTitleInput")).toHaveValue(documentTitle);
  await expect(page.locator("#literatureEditor")).toContainText(documentBody);

  expect(runtimeErrors).toEqual([]);
});
