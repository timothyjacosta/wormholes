import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";

const root = path.resolve(import.meta.dirname, "../..");
for (const filename of ["Wormholes_Beta_301.html", "Wormholes_Beta_301.served.html"]) {
  const html = fs.readFileSync(path.join(root, filename), "utf8");
  assert.match(html, /id="supportReportBtn"[^>]*>Support Report</);
  assert.match(html, /id="supportReportModal"/);
  assert.match(html, /id="supportReportPreview"/);
  assert.match(html, /id="downloadSupportReportBtn"[^>]*>Download report</);
  assert.match(html, /does not include your creations, Literature, images, imported files, folder names, paths, or links/i);
}

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalNavigator = globalThis.navigator;
const originalLocation = globalThis.location;
const originalLocalStorage = globalThis.localStorage;
const originalMatchMedia = globalThis.matchMedia;
const originalIndexedDb = globalThis.indexedDB;
const originalActivity = globalThis.WormholesActivityLog;
const originalSchema = globalThis.WormholesSchemaVersions;
const originalStorage = globalThis.WormholesStorageFacade;
const originalLargeStore = globalThis.WormholesLargeDataStore;
const originalLocalFoldersEnabled = globalThis.localFoldersEnabled;

const metas = new Map([
  ["wormholes-build-version", "Wormholes Beta 301"],
  ["wormholes-layout-mode", "Desktop only"],
  ["wormholes-build-id", "beta-290-abc1234"],
  ["wormholes-build-commit", "abcdef0123456789abcdef0123456789abcdef01"],
  ["wormholes-build-timestamp", "2026-07-15T22:22:38Z"],
]);
const storage = new Map([
  ["wormholesSkipRollAnimation", "true"],
  ["wormholesUniverses", JSON.stringify([{title: "SECRET UNIVERSE TITLE"}])],
  ["wormholesLiterature", "SECRET LITERATURE BODY"],
]);

globalThis.document = {
  title: "Wormholes Beta 301 — Universe Builder",
  readyState: "loading",
  addEventListener() {},
  querySelector(selector) {
    const match = /meta\[name="([^"]+)"\]/.exec(selector);
    if (!match || !metas.has(match[1])) return null;
    return {getAttribute: () => metas.get(match[1])};
  },
  getElementById() {
    return null;
  },
};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    userAgent: "Mozilla/5.0 Chrome/150.0.0.0 Safari/537.36",
    platform: "TestOS",
    language: "en-US",
    storage: {persisted: async () => true},
  },
});
globalThis.location = {protocol: "https:"};
globalThis.localStorage = {
  getItem(key) {
    return storage.get(key) ?? null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  },
};
globalThis.matchMedia = () => ({matches: true});
globalThis.indexedDB = {};
globalThis.localFoldersEnabled = true;
globalThis.WormholesLargeDataStore = {supported: true};
globalThis.WormholesSchemaVersions = {current: 4, supported: [1, 2, 3, 4]};
globalThis.WormholesStorageFacade = {readStoredSchemaVersion: () => 4};
globalThis.WormholesActivityLog = {
  state: {
    items: [
      {
        time: "2026-07-15T22:00:00Z",
        type: "error",
        message: "Could not save SECRET CREATION TITLE at /Users/name/secret.txt https://example.com/private",
        detail: {
          title: "SECRET DETAIL TITLE",
          summary: "SECRET LITERATURE BODY",
          technical: {
            code: "QUOTA_EXCEEDED",
            path: "/Users/name/secret.txt",
            url: "https://example.com/private",
          },
        },
      },
    ],
  },
};

try {
  const moduleUrl = `${pathToFileURL(path.join(root, "scripts/modules/support-bundle.mjs")).href}?test=${Date.now()}`;
  const support = await import(moduleUrl);
  const report = await support.api.createSupportReport();
  const serialized = JSON.stringify(report);

  assert.equal(report.format, "wormholes-support-report");
  assert.equal(report.privacy.creativeContentIncluded, false);
  assert.equal(report.build.version, "Wormholes Beta 301");
  assert.equal(report.build.layout, "Desktop only");
  assert.equal(report.environment.browser, "Chrome 150");
  assert.equal(report.environment.platform, "TestOS");
  assert.equal(report.storage.activeMode, "Browser and local folder");
  assert.equal(report.storage.persistentStorage, "Granted");
  assert.equal(report.configuration.runtime, "Served");
  assert.equal(report.configuration.skipRollAnimation, true);
  assert.equal(report.schemas.appDataCurrent, 4);
  assert.equal(report.schemas.storedAppDataVersion, 4);
  assert.equal(report.logs.length, 1);
  assert.equal(report.logs[0].errorCode, "QUOTA_EXCEEDED");
  assert.ok(!("message" in report.logs[0]), "raw activity messages must not be exported");

  for (const secret of [
    "SECRET UNIVERSE TITLE",
    "SECRET CREATION TITLE",
    "SECRET LITERATURE BODY",
    "SECRET DETAIL TITLE",
    "/Users/name/secret.txt",
    "https://example.com/private",
  ]) {
    assert.equal(serialized.includes(secret), false, `support report leaked: ${secret}`);
  }
} finally {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  globalThis.document = originalDocument;
  if (originalNavigator === undefined) delete globalThis.navigator;
  else Object.defineProperty(globalThis, "navigator", {configurable: true, value: originalNavigator});
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
  if (originalLocalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalLocalStorage;
  if (originalMatchMedia === undefined) delete globalThis.matchMedia;
  else globalThis.matchMedia = originalMatchMedia;
  if (originalIndexedDb === undefined) delete globalThis.indexedDB;
  else globalThis.indexedDB = originalIndexedDb;
  if (originalActivity === undefined) delete globalThis.WormholesActivityLog;
  else globalThis.WormholesActivityLog = originalActivity;
  if (originalSchema === undefined) delete globalThis.WormholesSchemaVersions;
  else globalThis.WormholesSchemaVersions = originalSchema;
  if (originalStorage === undefined) delete globalThis.WormholesStorageFacade;
  else globalThis.WormholesStorageFacade = originalStorage;
  if (originalLargeStore === undefined) delete globalThis.WormholesLargeDataStore;
  else globalThis.WormholesLargeDataStore = originalLargeStore;
  if (originalLocalFoldersEnabled === undefined) delete globalThis.localFoldersEnabled;
  else globalThis.localFoldersEnabled = originalLocalFoldersEnabled;
}

console.log("Support report privacy and content checks passed.");
