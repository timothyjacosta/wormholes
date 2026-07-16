const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {latestDirectHtmlName, latestDirectHtmlPath} = require("../support/release-path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "..");
const html = fs.readFileSync(latestDirectHtmlPath(root), "utf8");
const mapInspectorSource = fs.readFileSync(
  path.join(root, "scripts", "wormholes-map-inspector.js"),
  "utf8",
);
const keyboardSource = fs.readFileSync(
  path.join(root, "scripts", "wormholes-dialog-keyboard.js"),
  "utf8",
);

const EXPECTED_STATIC_DIALOGS = [
  "globalSearchModal",
  "appDataImportConfirmModal",
  "fileSizeLimitModal",
  "entityLimitModal",
  "duplicateIdModal",
  "referenceIntegrityModal",
  "mediaLimitModal",
  "contentLimitModal",
  "urlSafetyModal",
  "storageCapacityPreflightModal",
  "recoverySnapshotsModal",
  "localDataHelpModal",
  "storageUsageDashboardModal",
  "activityLogModal",
  "activityDetailModal",
  "clearAppDataConfirmModal",
  "appDataExportSummaryModal",
  "themePickerModal",
  "themeManagerModal",
  "themeDeleteConfirmModal",
  "universeTitleModal",
  "universeArchiveModal",
  "migrateModal",
  "migrateNewUniverseModal",
  "copyToUniverseModal",
  "copyNewUniverseModal",
  "universeSummaryModal",
  "universeEditModal",
  "deleteEntryConfirmModal",
  "literatureDeleteConfirmModal",
  "clearMapConfirmModal",
  "deleteUniverseModal",
  "deleteUniverseMigrateModal",
  "bridgeModal",
  "bridgeNewUniverseModal",
  "wormholesModal",
  "titleModal",
  "connectionModal",
  "relationshipRemovalConfirmModal",
  "summaryModal",
  "noteModal",
  "groupModal",
  "groupConnectionModal",
  "connectPickerModal",
  "literatureViewerModal",
  "literatureUploadModal",
  "visionUploadModal",
  "quickStartModal",
  "buildDiagnosticsModal",
  "supportReportModal",
  "localFolderDeletionWarningModal",
  "localFolderSyncModal",
  "localFolderNotFoundModal",
  "literatureLinksModal",
  "visionLinksModal",
  "visionImageViewerModal",
  "visionRenameModal",
  "visionDeleteConfirmModal",
  "visionTagGoModal",
  "duplicateCreationModal",
  "literatureTagModal",
  "editModal",
];

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || "";
}

function tagForId(source, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    source.match(
      new RegExp(`<(?:button|input|select|textarea|a)\\b(?=[^>]*\\bid="${escaped}")[^>]*>`),
    )?.[0] || ""
  );
}

const modalTagPattern = /<div\b(?=[^>]*\bclass="[^"]*\bmodal-backdrop\b[^"]*")[^>]*>/g;
const modalMatches = Array.from(html.matchAll(modalTagPattern));
const staticIds = modalMatches.map((match) => attr(match[0], "id"));
assert.deepStrictEqual(
  staticIds,
  EXPECTED_STATIC_DIALOGS,
  "the keyboard lifecycle inventory must include every static dialog exactly once",
);

const allowedKinds = new Set([
  "search",
  "confirmation",
  "information",
  "editor",
  "chooser",
  "picker",
  "viewer",
  "required",
  "choice",
]);
modalMatches.forEach((match, index) => {
  const tag = match[0];
  const id = attr(tag, "id");
  const nextIndex = modalMatches[index + 1]?.index ?? html.length;
  const region = html.slice(match.index, nextIndex);
  const labelId = attr(tag, "aria-labelledby");
  const escapePolicy = attr(tag, "data-escape-dismiss");
  const backdropPolicy = attr(tag, "data-backdrop-dismiss");
  const kind = attr(tag, "data-dialog-kind");
  const initialFocusId = attr(tag, "data-dialog-initial-focus");

  assert.strictEqual(attr(tag, "role"), "dialog", `${id} should expose dialog semantics`);
  assert.strictEqual(attr(tag, "aria-modal"), "true", `${id} should be modal`);
  assert.ok(
    labelId && new RegExp(`\\bid="${labelId}"`).test(region),
    `${id} should reference a heading inside itself`,
  );
  assert.ok(allowedKinds.has(kind), `${id} should declare a supported dialog kind`);
  assert.ok(escapePolicy, `${id} should declare its Escape policy`);
  assert.ok(backdropPolicy, `${id} should declare its backdrop policy`);
  assert.ok(initialFocusId, `${id} should declare its opening focus target`);

  const initialTag = tagForId(region, initialFocusId);
  assert.ok(
    initialTag,
    `${id} opening focus target ${initialFocusId} should be a control inside the dialog`,
  );
  assert.ok(
    !/\bdisabled(?:\s|=|>)/.test(initialTag),
    `${id} opening focus target should be enabled`,
  );
  assert.ok(
    !/\bhidden(?:\s|=|>)/.test(initialTag),
    `${id} opening focus target should not be hidden`,
  );
  assert.ok(
    !/\btype="hidden"/.test(initialTag),
    `${id} opening focus target should not be a hidden input`,
  );

  if (escapePolicy !== "none") {
    const escapeTag = tagForId(region, escapePolicy);
    assert.ok(
      escapeTag,
      `${id} Escape target ${escapePolicy} should be a control inside the dialog`,
    );
  }
});

assert.ok(
  mapInspectorSource.includes('modal.id = "mapListViewModal"'),
  "the dynamic Map List View dialog should be part of the inventory",
);
assert.ok(
  mapInspectorSource.includes('modal.dataset.escapeDismiss = "closeMapListViewBtn"'),
  "Map List View should declare Escape dismissal",
);
assert.ok(
  mapInspectorSource.includes('modal.dataset.backdropDismiss = "same"'),
  "Map List View should declare backdrop dismissal",
);
assert.ok(
  mapInspectorSource.includes('modal.dataset.dialogKind = "viewer"'),
  "Map List View should declare its dialog kind",
);
assert.ok(
  mapInspectorSource.includes('modal.dataset.dialogInitialFocus = "closeMapListViewBtn"'),
  "Map List View should declare opening focus",
);
assert.ok(
  mapInspectorSource.includes('id="closeMapListViewBtn"'),
  "Map List View opening focus target should exist",
);

const keyboardScriptIndex = html.indexOf("scripts/wormholes-dialog-keyboard.js");
const accessibilityScriptIndex = html.indexOf("scripts/wormholes-accessibility.js");
assert.ok(
  keyboardScriptIndex >= 0 && keyboardScriptIndex < accessibilityScriptIndex,
  "dialog keyboard helpers should load before the accessibility coordinator",
);

function makeElement(id, {focusable = true, disabled = false, hidden = false} = {}) {
  const attributes = {};
  const element = {
    id,
    disabled,
    hidden,
    isConnected: true,
    dataset: {},
    attributes,
    focusable,
    parentElement: null,
    focusCount: 0,
    hasAttribute(name) {
      if (name === "disabled") return this.disabled;
      if (name === "hidden") return this.hidden;
      return Object.prototype.hasOwnProperty.call(attributes, name);
    },
    getAttribute(name) {
      if (name === "aria-disabled") return attributes[name] || null;
      return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    removeAttribute(name) {
      delete attributes[name];
    },
    matches(selector) {
      return this.focusable && selector.includes("button:not([disabled])");
    },
    closest(selector) {
      if (
        (selector.includes("[hidden]") && this.hidden) ||
        (selector.includes("[aria-hidden") && attributes["aria-hidden"] === "true")
      )
        return this;
      return null;
    },
    getClientRects() {
      return this.hidden ? [] : [{width: 1, height: 1}];
    },
    focus() {
      this.focusCount += 1;
      context.document.activeElement = this;
    },
  };
  return element;
}

const first = makeElement("first");
const declared = makeElement("declared");
const disabled = makeElement("disabled", {disabled: true});
const hidden = makeElement("hidden", {hidden: true});
const last = makeElement("last");
const controls = [first, declared, disabled, hidden, last];
const modal = makeElement("dialog", {focusable: false});
modal.dataset.dialogInitialFocus = "declared";
modal.contains = (element) => controls.includes(element) || element === modal;
modal.querySelectorAll = () => controls;
modal.querySelector = (selector) => (selector === ".modal" ? modal : null);
controls.forEach((control) => {
  control.parentElement = modal;
});

const ids = Object.fromEntries([modal, ...controls].map((element) => [element.id, element]));
const context = {
  console,
  document: {
    body: makeElement("body", {focusable: false}),
    documentElement: makeElement("documentElement", {focusable: false}),
    activeElement: null,
    getElementById(id) {
      return ids[id] || null;
    },
  },
  getComputedStyle(element) {
    return {display: element.hidden ? "none" : "block", visibility: "visible"};
  },
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(keyboardSource, context, {filename: "scripts/wormholes-dialog-keyboard.js"});
const api = context.WormholesDialogKeyboard;

assert.ok(api, "dialog keyboard helpers should be exported");
assert.deepStrictEqual(
  Array.from(api.getFocusableElements(modal)).map((item) => item.id),
  ["first", "declared", "last"],
  "disabled and hidden controls should not enter the Tab cycle",
);
assert.strictEqual(
  api.initialFocusTarget(modal),
  declared,
  "declared opening focus should win over DOM order",
);
api.focusInitial(modal);
assert.strictEqual(
  context.document.activeElement,
  declared,
  "opening a dialog should focus its declared target",
);

function tabEvent(shiftKey = false) {
  return {
    key: "Tab",
    shiftKey,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  };
}

context.document.activeElement = last;
let event = tabEvent(false);
assert.strictEqual(api.trapTab(event, modal), true, "Tab at the last control should be contained");
assert.strictEqual(
  context.document.activeElement,
  first,
  "Tab at the end should wrap to the first control",
);
assert.strictEqual(event.prevented, true);

context.document.activeElement = first;
event = tabEvent(true);
assert.strictEqual(
  api.trapTab(event, modal),
  true,
  "Shift+Tab at the first control should be contained",
);
assert.strictEqual(
  context.document.activeElement,
  last,
  "Shift+Tab at the start should wrap to the last control",
);

context.document.activeElement = context.document.body;
event = tabEvent(false);
api.trapTab(event, modal);
assert.strictEqual(
  context.document.activeElement,
  first,
  "focus that escapes a dialog should be returned to its first control",
);

modal.dataset.dialogInitialFocus = "disabled";
assert.strictEqual(
  api.initialFocusTarget(modal),
  first,
  "an unusable declared target should safely fall back",
);

const emptyModal = makeElement("emptyDialog", {focusable: false});
emptyModal.dataset = {};
emptyModal.contains = (element) => element === emptyModal;
emptyModal.querySelectorAll = () => [];
emptyModal.querySelector = (selector) => (selector === ".modal" ? emptyModal : null);
api.focusInitial(emptyModal);
assert.strictEqual(
  emptyModal.getAttribute("tabindex"),
  "-1",
  "a dialog without controls should receive temporary fallback focus",
);
assert.strictEqual(context.document.activeElement, emptyModal);

event = tabEvent(false);
assert.strictEqual(
  api.trapTab(event, emptyModal),
  true,
  "Tab should remain contained even when a dialog has no controls",
);

console.log(
  `dialog-keyboard-lifecycle.unit.js passed (${EXPECTED_STATIC_DIALOGS.length + 1} dialogs covered)`,
);
