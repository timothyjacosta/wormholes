const {test, expect} = require("@playwright/test");
const {appUrl, createUniverse, uniqueTitle} = require("../support/app");

const storageOriginUrl = `${new URL(appUrl()).origin}/tests/fixtures/storage-origin.html`;

function collectRuntimeErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function openApp(page) {
  await page.goto(appUrl(), {waitUntil: "domcontentloaded"});
  await expect(page.locator("#homeScreen:visible, #appScreen:visible")).toHaveCount(1);
}

async function expectNoSavedUniverses(page) {
  await page.locator("#enterUniverseBtn").click();
  await expect(page.locator("#universeArchiveModal")).toHaveClass(/open/);
  await expect(page.locator("#universeArchiveList")).toContainText("No saved universes yet");
  await page.locator("#closeUniverseArchiveBtn").click();
}

async function enterSavedUniverse(page, title) {
  if (await page.locator("#appScreen").isVisible()) {
    if ((await page.locator("#currentUniverseLabel").textContent()) === title) return;
    await page.locator("#homeBtn").click();
  }
  await page.locator("#enterUniverseBtn").click();
  await expect(page.locator("#universeArchiveModal")).toHaveClass(/open/);
  const entry = page.locator("#universeArchiveList .universe-entry").filter({hasText: title});
  await expect(entry).toHaveCount(1);
  await entry.locator(".universe-entry-main").click();
  await expect(page.locator("#currentUniverseLabel")).toHaveText(title);
}

async function listStorageState(page) {
  return page.evaluate(async () => ({
    localStorageKeys: Array.from({length: localStorage.length}, (_, index) =>
      localStorage.key(index),
    )
      .filter(Boolean)
      .sort(),
    sessionStorageKeys: Array.from({length: sessionStorage.length}, (_, index) =>
      sessionStorage.key(index),
    )
      .filter(Boolean)
      .sort(),
    databaseNames:
      typeof indexedDB.databases === "function"
        ? (await indexedDB.databases())
            .map((database) => database?.name)
            .filter(Boolean)
            .sort()
        : [],
    cacheNames: typeof caches !== "undefined" ? (await caches.keys()).sort() : [],
  }));
}

async function clearBrowserSiteData(context, options = {}) {
  const {
    localStorage: clearLocalStorage = true,
    sessionStorage: clearSessionStorage = true,
    indexedDB: clearIndexedDb = true,
    cacheStorage: clearCacheStorage = true,
  } = options;

  const existingPages = context.pages();
  let before =
    existingPages.length > 0 ? await listStorageState(existingPages[0]) : null;

  for (const page of existingPages) {
    await page.close();
  }

  const clearingPage = await context.newPage();
  await clearingPage.goto(storageOriginUrl, {waitUntil: "domcontentloaded"});
  if (!before) before = await listStorageState(clearingPage);

  await clearingPage.evaluate(
    async ({clearLocalStorage, clearSessionStorage, clearIndexedDb, clearCacheStorage}) => {
      if (clearLocalStorage) localStorage.clear();
      if (clearSessionStorage) sessionStorage.clear();

      if (clearCacheStorage && typeof caches !== "undefined") {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }

      if (clearIndexedDb && typeof indexedDB.databases === "function") {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases
            .map((database) => database?.name)
            .filter(Boolean)
            .map(
              (name) =>
                new Promise((resolve, reject) => {
                  const request = indexedDB.deleteDatabase(name);
                  request.onsuccess = () => resolve();
                  request.onerror = () =>
                    reject(request.error || new Error(`Could not delete ${name}`));
                  request.onblocked = () =>
                    reject(new Error(`IndexedDB deletion was blocked for ${name}`));
                }),
            ),
        );
      }
    },
    {clearLocalStorage, clearSessionStorage, clearIndexedDb, clearCacheStorage},
  );

  const after = await listStorageState(clearingPage);
  await clearingPage.close();
  return {before, after};
}

async function createLiteratureDocument(page, title, body) {
  await page.locator("#literatureTabBtn").click();
  await page.locator("#createLiteratureBtn").click();
  await expect(page.locator("#literatureEditorScreen")).toHaveClass(/active/);
  await page.locator("#literatureTitleInput").fill(title);
  await page.locator("#literatureEditor").fill(body);
  await page.locator("#saveLiteratureBtn").click();
  await expect(page.locator("#literatureListScreen")).toHaveClass(/active/);
  await expect(
    page.locator("#literatureList .literature-entry").filter({hasText: title}),
  ).toBeVisible();
}

async function openLiteratureDocument(page, title) {
  const entry = page.locator("#literatureList .literature-entry").filter({hasText: title});
  await expect(entry).toBeVisible();
  await entry.locator(":scope > .entry-top .menu-button").click();
  await entry.locator(":scope > .entry-top .literature-edit-action").click();
  await expect(page.locator("#literatureEditorHeading")).toHaveText("Edit Document");
}

test.describe("private browser and browser clearing", () => {
  test("private browser context cannot see regular-context data and is discarded when closed", async ({
    browser,
  }) => {
    const regularContext = await browser.newContext();
    const regularPage = await regularContext.newPage();
    const regularErrors = collectRuntimeErrors(regularPage);
    await openApp(regularPage);
    const regularTitle = await createUniverse(regularPage, uniqueTitle("Regular Context Universe"));

    const privateContext = await browser.newContext();
    const privatePage = await privateContext.newPage();
    const privateErrors = collectRuntimeErrors(privatePage);
    await openApp(privatePage);
    await expectNoSavedUniverses(privatePage);
    const privateTitle = await createUniverse(privatePage, uniqueTitle("Private Context Universe"));

    await regularPage.reload({waitUntil: "domcontentloaded"});
    await expect(regularPage.locator("#homeScreen")).toBeVisible();
    await enterSavedUniverse(regularPage, regularTitle);
    expect(
      await regularPage.evaluate(
        (title) => universes.some((universe) => universe.title === title),
        privateTitle,
      ),
    ).toBe(false);

    await privateContext.close();

    const reopenedPrivateContext = await browser.newContext();
    const reopenedPrivatePage = await reopenedPrivateContext.newPage();
    const reopenedErrors = collectRuntimeErrors(reopenedPrivatePage);
    await openApp(reopenedPrivatePage);
    await expectNoSavedUniverses(reopenedPrivatePage);

    expect(regularErrors).toEqual([]);
    expect(privateErrors).toEqual([]);
    expect(reopenedErrors).toEqual([]);
    await reopenedPrivateContext.close();
    await regularContext.close();
  });

  test("clearing all browser site data returns Wormholes to a clean usable state", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    let page = await context.newPage();
    const runtimeErrors = collectRuntimeErrors(page);
    await openApp(page);
    await createUniverse(page, uniqueTitle("Browser Clear Source"));
    await createLiteratureDocument(
      page,
      uniqueTitle("Browser Clear Literature"),
      "Content that should be removed by browser site-data clearing.",
    );
    await page.evaluate(async () => {
      sessionStorage.setItem("wormholesBrowserClearTest", "present");
      if (typeof caches !== "undefined") {
        const cache = await caches.open("wormholes-browser-clear-test");
        await cache.put(new Request("/wormholes-browser-clear-test"), new Response("test"));
      }
    });

    const cleared = await clearBrowserSiteData(context);
    expect(cleared.before.localStorageKeys.length).toBeGreaterThan(0);
    expect(cleared.before.sessionStorageKeys).toContain("wormholesBrowserClearTest");
    expect(cleared.before.databaseNames.some((name) => /wormholes/i.test(name))).toBe(true);
    expect(cleared.before.cacheNames).toContain("wormholes-browser-clear-test");
    expect(cleared.after.localStorageKeys).toEqual([]);
    expect(cleared.after.sessionStorageKeys).toEqual([]);
    expect(cleared.after.databaseNames).toEqual([]);
    expect(cleared.after.cacheNames).toEqual([]);

    page = await context.newPage();
    const postClearErrors = collectRuntimeErrors(page);
    await openApp(page);
    await expectNoSavedUniverses(page);
    const replacementTitle = await createUniverse(page, uniqueTitle("Browser Clear Recovery"));
    await expect(page.locator("#currentUniverseLabel")).toHaveText(replacementTitle);

    expect(runtimeErrors).toEqual([]);
    expect(postClearErrors).toEqual([]);
    await context.close();
  });

  test("clearing local storage does not resurrect orphaned IndexedDB content", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    let page = await context.newPage();
    const runtimeErrors = collectRuntimeErrors(page);
    await openApp(page);
    await createUniverse(page, uniqueTitle("Local Storage Clear Source"));
    await createLiteratureDocument(
      page,
      uniqueTitle("Orphaned IndexedDB Literature"),
      "This body is intentionally left behind in IndexedDB when local storage is cleared.",
    );

    const cleared = await clearBrowserSiteData(context, {
      indexedDB: false,
      cacheStorage: false,
    });
    expect(cleared.before.databaseNames.some((name) => name === "WormholesLargeData")).toBe(true);
    expect(cleared.after.localStorageKeys).toEqual([]);
    expect(cleared.after.databaseNames).toEqual(cleared.before.databaseNames);

    page = await context.newPage();
    const postClearErrors = collectRuntimeErrors(page);
    await openApp(page);
    await expectNoSavedUniverses(page);
    const newTitle = await createUniverse(page, uniqueTitle("Local Storage Clear Recovery"));
    await expect(page.locator("#currentUniverseLabel")).toHaveText(newTitle);

    expect(runtimeErrors).toEqual([]);
    expect(postClearErrors).toEqual([]);
    await context.close();
  });

  test("clearing IndexedDB while local metadata remains recovers portable Literature content", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    let page = await context.newPage();
    const runtimeErrors = collectRuntimeErrors(page);
    await openApp(page);
    const universeTitle = await createUniverse(page, uniqueTitle("IndexedDB Clear Universe"));
    const documentTitle = uniqueTitle("IndexedDB Clear Literature");
    const documentBody = "Portable content should remain available after IndexedDB is cleared.";
    await createLiteratureDocument(page, documentTitle, documentBody);
    await page.locator("#homeBtn").click();

    const cleared = await clearBrowserSiteData(context, {
      localStorage: false,
      sessionStorage: true,
      indexedDB: true,
      cacheStorage: false,
    });
    expect(cleared.before.localStorageKeys.length).toBeGreaterThan(0);
    expect(cleared.before.databaseNames.some((name) => /wormholes/i.test(name))).toBe(true);
    expect(cleared.after.localStorageKeys).toEqual(cleared.before.localStorageKeys);
    expect(cleared.after.databaseNames).toEqual([]);

    page = await context.newPage();
    const postClearErrors = collectRuntimeErrors(page);
    await openApp(page);
    await enterSavedUniverse(page, universeTitle);
    await page.locator("#literatureTabBtn").click();
    await openLiteratureDocument(page, documentTitle);
    await expect(page.locator("#literatureEditor")).toContainText(documentBody);

    expect(runtimeErrors).toEqual([]);
    expect(postClearErrors).toEqual([]);
    await context.close();
  });
});
