const {test, expect} = require("@playwright/test");
const {openCleanApp} = require("../support/app");

async function visibleErrorText(page) {
  const panel = page.locator("#appErrorPanel");
  await expect(panel).toHaveClass(/open/);
  return {
    message: await page.locator("#appErrorMessage").textContent(),
    details: await page.locator("#appErrorDetails li").allTextContents(),
  };
}

test("schema failures show a validation message, not a storage-full message", async ({page}) => {
  const runtimeErrors = await openCleanApp(page);
  const result = await page.evaluate(() => {
    const repo = window.WormholesRepositories.datasets.createRepository({
      key: "wormholes-e2e-invalid-schema",
      schema: "literature",
      fallback: () => [],
      context: "Could not save test Literature",
    });
    return repo.save(null, [{id: "incomplete", fileSize: "not-a-number"}]);
  });

  expect(result.ok).toBe(false);
  expect(result.code).toBe("schema_invalid");
  const ui = await visibleErrorText(page);
  expect(ui.message).toMatch(/incomplete or invalid/i);
  expect(ui.message).not.toMatch(/storage is full/i);
  expect(await page.locator("#appErrorDetails li").count()).toBe(1);
  expect(runtimeErrors).toEqual([]);
});

test("only a real quota error shows Storage is full", async ({page}) => {
  const runtimeErrors = await openCleanApp(page);
  const result = await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
    try {
      return window.WormholesRepositories.local.set("wormholes-e2e-quota", "value");
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  expect(result.ok).toBe(false);
  expect(result.code).toBe("quota_exceeded");
  const ui = await visibleErrorText(page);
  expect(ui.message).toMatch(/Storage is full/i);
  expect(await page.locator("#appErrorDetails li").count()).toBe(1);
  expect(runtimeErrors).toEqual([]);
});

test("unavailable browser storage has its own message", async ({page}) => {
  const runtimeErrors = await openCleanApp(page);
  const result = await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException("Storage backend unavailable", "InvalidStateError");
    };
    try {
      return window.WormholesRepositories.local.set("wormholes-e2e-unavailable", "value");
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  expect(result.ok).toBe(false);
  expect(result.code).toBe("storage_unavailable");
  const ui = await visibleErrorText(page);
  expect(ui.message).toMatch(/Browser storage is not available/i);
  expect(ui.message).not.toMatch(/Storage is full/i);
  expect(await page.locator("#appErrorDetails li").count()).toBe(1);
  expect(runtimeErrors).toEqual([]);
});

test("folder permission and folder sync failures use different messages", async ({page}) => {
  const runtimeErrors = await openCleanApp(page);

  const permissionResult = await page.evaluate(() => {
    const error = new DOMException("Permission denied", "NotAllowedError");
    return window.WormholesStorageFacade.rememberFolderSaveFailure(
      "Could not update folder",
      error,
    );
  });
  expect(permissionResult.code).toBe("permission_denied");
  let ui = await visibleErrorText(page);
  expect(ui.message).toMatch(/permission to save there/i);

  await page.locator("#appErrorDismissBtn").click();
  const syncResult = await page.evaluate(() => {
    const error = new DOMException("Folder write failed", "UnknownError");
    return window.WormholesStorageFacade.rememberFolderSaveFailure(
      "Could not update folder",
      error,
    );
  });
  expect(syncResult.code).toBe("folder_sync_failed");
  ui = await visibleErrorText(page);
  expect(ui.message).toMatch(/folder could not be updated/i);
  expect(ui.message).not.toMatch(/permission to save there/i);
  expect(runtimeErrors).toEqual([]);
});
