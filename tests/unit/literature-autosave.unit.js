const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function classList(active = false) {
  const values = new Set(active ? ["active"] : []);
  return {
    contains(name) {
      return values.has(name);
    },
    add(name) {
      values.add(name);
    },
    remove(name) {
      values.delete(name);
    },
  };
}

const elements = {
  literatureEditorScreen: {classList: classList(true)},
  literatureListScreen: {classList: classList(false)},
  literatureTitleInput: {
    value: "Autosaved title",
    focus() {
      this.focused = true;
    },
  },
  literatureEditor: {innerHTML: "<p>Autosaved body</p>"},
  literatureError: {textContent: ""},
  literatureEditorHeading: {textContent: "Edit Document"},
  literatureSaveStatus: {dataset: {}, textContent: ""},
};

let timerCallback = null;
let timerDelay = null;
let nextTimerId = 0;
let folderSyncCalls = 0;
let renderCalls = 0;
let refreshCalls = 0;

const context = {
  console,
  Date,
  JSON,
  Object,
  Number,
  String,
  Math,
  Map,
  Set,
  Array,
  Promise,
  currentUniverseId: "u1",
  literatureEntries: [
    {
      id: "doc-1",
      title: "Original title",
      content: "<p>Original body</p>",
      fileType: "text",
      tags: {universes: ["u1"], entries: []},
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T00:00:00.000Z",
    },
  ],
  activeLiteratureId: "doc-1",
  localFoldersEnabled: false,
  literatureFolderHandle: null,
  document: {
    getElementById(id) {
      return elements[id] || null;
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return {innerHTML: "", textContent: "", innerText: ""};
    },
  },
  window: {},
  setTimeout(callback, delay) {
    timerCallback = callback;
    timerDelay = delay;
    nextTimerId += 1;
    return nextTimerId;
  },
  clearTimeout() {
    timerCallback = null;
  },
  uniqueList(list) {
    return Array.from(new Set((list || []).filter(Boolean)));
  },
  tagEntryKey(universeId, entryId) {
    return `${universeId}::${entryId}`;
  },
  sanitizeLiteratureHtml(value) {
    return String(value || "");
  },
  literaturePlainPreview(value) {
    return String(value || "")
      .replace(/<[^>]*>/g, " ")
      .trim();
  },
  makeId() {
    return "new-doc";
  },
  persistLargeDataValue: async () => true,
  largeDataStoreAvailable: () => true,
  reportAppError() {},
  requestStorageFootnoteUpdate() {},
  renderLiteratureList() {
    renderCalls += 1;
  },
  refreshLiteratureLinkDisplays() {
    refreshCalls += 1;
  },
  showSavedToast() {},
  requestFolderPermission: async () => true,
  writeLiteratureDocToSpecificFolder: async () => {
    folderSyncCalls += 1;
  },
  rememberFolderSaveFailure() {},
  switchTab() {},
  showHomeScreen() {},
};
context.globalThis = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.resolve(__dirname, "..", "..", "scripts", "literature.js"), "utf8"),
  context,
);

// Replace the storage boundary so this unit focuses on editor orchestration.
context.sanitizeLiteratureHtml = (value) => String(value || "");
context.saveLiteratureToStorage = () => ({ok: true, code: "ok"});
context.writeLiteratureMetadataOnly = () => true;
context.renderLiteratureList = () => {
  renderCalls += 1;
};
context.refreshLiteratureLinkDisplays = () => {
  refreshCalls += 1;
};
context.writeLiteratureDocToSpecificFolder = async () => {
  folderSyncCalls += 1;
};

(async () => {
  vm.runInContext(
    "literatureEditorChangeVersion = 1; literatureEditorSavedVersion = 0; literatureFolderSyncPending = false; literatureEditorSessionUniverseId = currentUniverseId;",
    context,
  );

  const autosave = await context.performLiteratureEditorSave({
    reason: "autosave",
    syncFolder: false,
  });
  assert.strictEqual(autosave.ok, true);
  assert.strictEqual(context.literatureEntries[0].title, "Autosaved title");
  assert.strictEqual(context.literatureEntries[0].content, "<p>Autosaved body</p>");
  assert.strictEqual(folderSyncCalls, 0, "editor autosave must not write to the local folder");
  assert.strictEqual(elements.literatureSaveStatus.textContent, "Saved in app");

  elements.literatureTitleInput.value = "Changed again";
  context.markLiteratureEditorDirty();
  assert.strictEqual(timerDelay, 1500, "autosave should use the intended non-irritating debounce");
  assert.strictEqual(elements.literatureSaveStatus.textContent, "Unsaved changes");
  assert.strictEqual(typeof timerCallback, "function");
  timerCallback();
  await vm.runInContext("literatureSaveQueue", context);
  assert.strictEqual(context.literatureEntries[0].title, "Changed again");
  assert.strictEqual(folderSyncCalls, 0, "debounced autosave must remain app-only");

  // Clearing an existing body must write the empty payload instead of leaving stale IndexedDB text.
  elements.literatureEditor.innerHTML = "";
  vm.runInContext("literatureEditorChangeVersion += 1;", context);
  await context.performLiteratureEditorSave({reason: "autosave", syncFolder: false});
  assert.strictEqual(context.literatureEntries[0].content, "");

  context.localFoldersEnabled = true;
  context.literatureFolderHandle = {name: "Literature"};
  vm.runInContext(
    "literatureFolderSyncPending = true; literatureEditorSavedVersion = literatureEditorChangeVersion;",
    context,
  );
  const closed = await context.closeLiteratureEditor();
  assert.strictEqual(closed, true);
  assert.strictEqual(folderSyncCalls, 1, "closing the editor should sync the latest app copy once");
  assert.strictEqual(elements.literatureEditorScreen.classList.contains("active"), false);
  assert.strictEqual(elements.literatureListScreen.classList.contains("active"), true);
  assert.ok(renderCalls >= 1);
  assert.ok(refreshCalls >= 1);

  console.log("literature-autosave.unit.js passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
