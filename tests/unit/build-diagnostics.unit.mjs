import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";

const root = path.resolve(import.meta.dirname, "../..");
const htmlFiles = ["Wormholes_Beta_301.html", "Wormholes_Beta_301.served.html"];

for (const filename of htmlFiles) {
  const html = fs.readFileSync(path.join(root, filename), "utf8");
  assert.match(html, /name="wormholes-build-version"/);
  assert.match(html, /name="wormholes-layout-mode"/);
  assert.match(html, /name="wormholes-build-commit"/);
  assert.match(html, /name="wormholes-build-timestamp"/);
  assert.match(html, /name="wormholes-build-id"/);
  assert.match(html, /id="buildDiagnosticsBtn"[^>]*>About Wormholes</);
  assert.match(html, /id="buildDiagnosticsModal"/);
  assert.match(html, /id="copyBuildDiagnosticsBtn"[^>]*>Copy build details</);
}

assert.match(
  fs.readFileSync(path.join(root, ".gitattributes"), "utf8"),
  /Wormholes_Beta_\*\.html\s+export-subst/,
  "release HTML must expand Git commit placeholders during git archive",
);

const originalDocument = globalThis.document;
const originalNavigator = globalThis.navigator;
const elements = new Map();
for (const id of [
  "buildDiagnosticsVersion",
  "buildDiagnosticsLayout",
  "buildDiagnosticsId",
  "buildDiagnosticsCommit",
  "buildDiagnosticsTimestamp",
  "buildDiagnosticsCopyStatus",
]) {
  elements.set(id, {textContent: "", title: ""});
}
const meta = new Map([
  ["wormholes-build-version", "Wormholes Beta 301"],
  ["wormholes-layout-mode", "Desktop only"],
  ["wormholes-build-commit", "1234567890abcdef1234567890abcdef12345678"],
  ["wormholes-build-timestamp", "2026-07-15T21:45:00-05:00"],
  ["wormholes-build-id", "beta-290-1234567"],
]);
let copiedText = "";

globalThis.document = {
  title: "Wormholes Beta 301 — Universe Builder",
  querySelector(selector) {
    const match = /meta\[name="([^"]+)"\]/.exec(selector);
    if (!match || !meta.has(match[1])) return null;
    return {getAttribute: () => meta.get(match[1])};
  },
  getElementById(id) {
    return elements.get(id) || null;
  },
};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    clipboard: {
      writeText: async (text) => {
        copiedText = text;
      },
    },
  },
});

try {
  const moduleUrl = `${pathToFileURL(path.join(root, "scripts/modules/settings-controller.mjs")).href}?build-diagnostics-test=${Date.now()}`;
  const diagnostics = await import(moduleUrl);
  const info = diagnostics.getBuildDiagnosticsInfo();
  assert.equal(info.version, "Wormholes Beta 301");
  assert.equal(info.layout, "Desktop only");
  assert.equal(info.buildId, "beta-290-1234567");
  assert.equal(info.commit, "1234567890abcdef1234567890abcdef12345678");
  assert.match(info.timestampLabel, /2026/);

  diagnostics.renderBuildDiagnostics();
  assert.equal(elements.get("buildDiagnosticsVersion").textContent, "Wormholes Beta 301");
  assert.equal(elements.get("buildDiagnosticsLayout").textContent, "Desktop only");
  assert.equal(elements.get("buildDiagnosticsCommit").textContent, info.commit);

  assert.equal(await diagnostics.copyBuildDiagnostics(), true);
  assert.match(copiedText, /Version: Wormholes Beta 301/);
  assert.match(copiedText, /Layout: Desktop only/);
  assert.match(copiedText, /Build ID: beta-290-1234567/);
  assert.match(copiedText, /Source commit: 1234567890abcdef/);
  assert.equal(elements.get("buildDiagnosticsCopyStatus").textContent, "Build details copied.");

  meta.set("wormholes-build-commit", "$Format:%H$");
  meta.set("wormholes-build-timestamp", "$Format:%cI$");
  meta.set("wormholes-build-id", "beta-290-$Format:%h$");
  const localInfo = diagnostics.getBuildDiagnosticsInfo();
  assert.equal(localInfo.commit, "Local copy");
  assert.equal(localInfo.buildId, "Local copy");
  assert.equal(localInfo.timestampLabel, "Local copy");
} finally {
  globalThis.document = originalDocument;
  if (originalNavigator === undefined) delete globalThis.navigator;
  else
    Object.defineProperty(globalThis, "navigator", {configurable: true, value: originalNavigator});
}

console.log("Build diagnostics unit checks passed.");
