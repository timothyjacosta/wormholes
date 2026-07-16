const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "..");
function quotaError(message = "Browser storage quota exceeded") {
  const error = new Error(message);
  error.name = "QuotaExceededError";
  return error;
}
function classList(active = false) {
  const values = new Set(active ? ["active"] : []);
  return {
    contains: (n) => values.has(n),
    add: (n) => values.add(n),
    remove: (n) => values.delete(n),
    toggle(n, force) {
      if (force) values.add(n);
      else values.delete(n);
    },
  };
}

async function testLocalStorageAtomicFailure() {
  const store = new Map();
  let failWrites = false;
  const reported = [];
  const localStorage = {
    get length() {
      return store.size;
    },
    key(i) {
      return Array.from(store.keys())[i] || null;
    },
    getItem(k) {
      return store.has(String(k)) ? store.get(String(k)) : null;
    },
    setItem(k, v) {
      if (failWrites) throw quotaError();
      store.set(String(k), String(v));
    },
    removeItem(k) {
      store.delete(String(k));
    },
  };
  const context = {
    console,
    localStorage,
    Blob,
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
    setTimeout,
    clearTimeout,
    navigator: {},
    document: {
      getElementById() {
        return null;
      },
    },
    window: {},
    reportAppError(label, error, options = {}) {
      reported.push({label, error, options});
    },
    currentUniverseId: "u1",
    universes: [],
    archiveEntries: [],
    connectionNotes: {},
    bridgeNotes: {},
    localFoldersEnabled: false,
    localFolderRestoreInProgress: false,
    localFolderSwitchInProgress: false,
    localFolderStorageMode: "native",
    wormholesRootFolderHandle: null,
    wormholesParentFolderHandle: null,
    wormholesCreationsRootHandle: null,
    wormholesLiteratureRootHandle: null,
    wormholesImagesRootHandle: null,
    creationFolderHandle: null,
    literatureFolderHandle: null,
    visionFolderHandle: null,
    recentStorageFailureMessage: "",
    recentStorageFailureAt: 0,
    recentFolderSaveWarningMessage: "",
    recentFolderSaveWarningAt: 0,
    PARTIAL_FOLDER_SAVE_MESSAGE: "Saved in app. Folder sync failed.",
    WORMHOLES_APP_SCHEMA_VERSION: 4,
    makeId() {
      return "id";
    },
    stableUniverseFolderName(u) {
      return u.title || "Universe";
    },
    normalizeBridges(v) {
      return Array.isArray(v) ? v : [];
    },
    normalizeArchiveGroups() {},
    largeDataStore() {
      return null;
    },
    localFolderApiSupported() {
      return false;
    },
    localFolderUsesPrivateStorage() {
      return false;
    },
    restoreFolderHandlesForCurrentUniverse() {
      return Promise.resolve(false);
    },
    hasFolderPermission() {
      return Promise.resolve(false);
    },
    universeFolderName(u) {
      return u.title || "";
    },
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "scripts", "storage.js"), "utf8"), context, {
    filename: "storage.js",
  });
  assert.strictEqual(context.saveLocalStorageJson("wormholesTest", {value: "old"}), true);
  const before = localStorage.getItem("wormholesTest");
  failWrites = true;
  assert.strictEqual(
    context.saveLocalStorageJson(
      "wormholesTest",
      {value: "new"},
      "Could not save test",
      "Browser storage is full. Changes were not saved.",
    ),
    false,
  );
  assert.strictEqual(
    localStorage.getItem("wormholesTest"),
    before,
    "a quota failure must leave the previous localStorage record byte-for-byte intact",
  );
  assert.match(reported.at(-1).options.userMessage, /storage is full/i);
  failWrites = false;
  assert.strictEqual(
    context.saveLocalStorageJson("wormholesTest", {value: "new"}),
    true,
    "saving should work after capacity becomes available",
  );
  assert.strictEqual(JSON.parse(localStorage.getItem("wormholesTest")).revision, 2);
}

async function testLargeDataQuotaReporting() {
  const source = fs.readFileSync(path.join(root, "scripts", "wormholes-app.js"), "utf8");
  const match = source.match(
    /async function persistLargeDataValue\([\s\S]*?\n}\n(?=async function loadLargeDataValue)/,
  );
  assert.ok(match, "large-data persistence helper should be extractable");
  const reports = [];
  const context = {
    console,
    Promise,
    largeDataStoreAvailable() {
      return true;
    },
    largeDataStore() {
      return {
        async put() {
          throw quotaError();
        },
      };
    },
    requestStorageFootnoteUpdate() {},
    reportAppError(label, error, options = {}) {
      reports.push({label, error, options});
    },
  };
  vm.createContext(context);
  vm.runInContext(match[0], context);
  assert.strictEqual(
    await context.persistLargeDataValue("literature:u1:d1:content", "text", "literature content"),
    false,
  );
  assert.match(
    reports[0].options.userMessage,
    /not saved/i,
    "IndexedDB quota failures should produce a concise user-facing warning",
  );
}

async function testLiteratureRetryState() {
  const elements = {
    literatureEditorScreen: {classList: classList(true)},
    literatureListScreen: {classList: classList(false)},
    literatureTitleInput: {value: "New title", disabled: false, focus() {}},
    literatureEditor: {innerHTML: "<p>New body</p>", contentEditable: "true"},
    literatureError: {textContent: ""},
    literatureEditorHeading: {textContent: "Edit Document"},
    literatureSaveStatus: {dataset: {}, textContent: ""},
  };
  const reports = [];
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
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    currentUniverseId: "u1",
    activeLiteratureId: "d1",
    literatureEntries: [
      {
        id: "d1",
        title: "Old title",
        content: "<p>Old body</p>",
        tags: {universes: ["u1"], entries: []},
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ],
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
    uniqueList(v) {
      return Array.from(new Set((v || []).filter(Boolean)));
    },
    tagEntryKey(a, b) {
      return `${a}::${b}`;
    },
    sanitizeLiteratureHtml(v) {
      return String(v || "");
    },
    literaturePlainPreview(v) {
      return String(v || "")
        .replace(/<[^>]*>/g, " ")
        .trim();
    },
    makeId() {
      return "new";
    },
    persistLargeDataValue: async () => true,
    largeDataStoreAvailable: () => true,
    reportAppError(label, error, options = {}) {
      reports.push({label, error, options});
    },
    requestStorageFootnoteUpdate() {},
    renderLiteratureList() {},
    refreshLiteratureLinkDisplays() {},
    showSavedToast() {},
    requestFolderPermission: async () => true,
    writeLiteratureDocToSpecificFolder: async () => {},
    rememberFolderSaveFailure() {},
    switchTab() {},
    showHomeScreen() {},
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "scripts", "literature.js"), "utf8"), context, {
    filename: "literature.js",
  });
  context.sanitizeLiteratureHtml = (v) => String(v || "");
  context.writeLiteratureMetadataOnly = () => ({
    ok: false,
    code: "quota_exceeded",
    userMessage: "Storage is full. Free some space, then try again.",
  });
  vm.runInContext(
    "literatureEditorChangeVersion=1; literatureEditorSavedVersion=0; literatureEditorSessionUniverseId=currentUniverseId;",
    context,
  );
  const failed = await context.performLiteratureEditorSave({reason: "autosave", syncFolder: false});
  assert.strictEqual(failed.ok, false);
  assert.strictEqual(elements.literatureSaveStatus.textContent, "Save failed");
  assert.strictEqual(
    context.literatureEditorHasUnresolvedChanges(),
    true,
    "failed autosave must remain dirty so the browser abandonment warning stays active",
  );
  assert.strictEqual(
    context.literatureEntries[0].content,
    "<p>Old body</p>",
    "a failed save must roll back the persisted in-memory model",
  );
  assert.strictEqual(
    elements.literatureEditor.innerHTML,
    "<p>New body</p>",
    "the editor draft should remain available for retry",
  );
  context.writeLiteratureMetadataOnly = () => ({ok: true, code: "ok"});
  const retried = await context.performLiteratureEditorSave({reason: "manual", syncFolder: false});
  assert.strictEqual(
    retried.ok,
    true,
    "Literature should retry successfully after storage becomes available",
  );
  assert.strictEqual(context.literatureEditorHasUnresolvedChanges(), false);
}

async function testVisionUploadRollback() {
  const message = {textContent: ""};
  const input = {value: "selected"};
  let largeDeletes = 0;
  let folderDeletes = 0;
  let toasts = 0;
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
    Blob,
    currentUniverseId: "u1",
    universes: [{id: "u1", title: "U"}],
    archiveEntries: [],
    visionEntries: [],
    localFoldersEnabled: true,
    visionFolderHandle: {name: "Images"},
    document: {
      getElementById(id) {
        if (id === "visionBoardMessage") return message;
        if (id === "visionFileInput") return input;
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      createElement() {
        return {
          style: {},
          classList: classList(),
          setAttribute() {},
          appendChild() {},
          remove() {},
          dataset: {},
        };
      },
    },
    window: {
      WormholesFileLimits: {
        enforce() {
          return {ok: true};
        },
      },
      WormholesEntityLimits: {
        ensure() {
          return {ok: true};
        },
      },
      WormholesStorageCapacity: {
        async preflight() {
          return {approved: true, status: "safe"};
        },
        estimateFileBatchBytes() {
          return 1;
        },
      },
    },
    URL: {
      createObjectURL() {
        return "blob:test";
      },
      revokeObjectURL() {},
    },
    CSS: {
      escape(v) {
        return String(v);
      },
    },
    navigator: {},
    makeId() {
      return "id";
    },
    normalizeLiteratureTags(t) {
      return t || {universes: [], entries: []};
    },
    normalizeImportedTags(t) {
      return t || {universes: [], entries: []};
    },
    readArchiveForUniverse() {
      return [];
    },
    getUniverseTitle() {
      return "U";
    },
    isGroupEntry() {
      return false;
    },
    readPersistedDatasetData(a, b, f) {
      return f;
    },
    visionStorageKey(id = "u1") {
      return `vision:${id}`;
    },
    oldVisionStorageKey(id = "u1") {
      return `old:${id}`;
    },
    saveLocalStorageJson() {
      return false;
    },
    requestStorageFootnoteUpdate() {},
    scheduleVisionLargeDataSave() {
      return Promise.resolve();
    },
    reportAppError() {},
    largeDataStoreAvailable() {
      return true;
    },
    loadLargeDataValue: async () => "",
    persistLargeDataValue: async () => true,
    dataUrlToBlob(v) {
      return new Blob([v]);
    },
    escapeHtml(v) {
      return String(v);
    },
    compactText(v) {
      return String(v || "").trim();
    },
    setContextualAriaLabel() {},
    syncAllAppButtonStates() {},
    protectAllControls() {},
    closeMenus() {},
    showSavedToast() {
      toasts += 1;
    },
    getCurrentUniverse() {
      return {id: "u1", title: "U"};
    },
    showBrowserStorageUploadPrompt() {},
    renderVisionBoard: async () => {},
    removeFileFromFolder: async () => {
      folderDeletes += 1;
      return true;
    },
    requestFolderPermission: async () => true,
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "scripts", "vision-board.js"), "utf8"), context, {
    filename: "vision-board.js",
  });
  context.convertUploadedVisionFile = async (file) => ({
    id: "v1",
    title: "Image",
    sourceName: file.name,
    dataUrl: "data:image/png;base64,AAAA",
    thumbnailDataUrl: "data:image/png;base64,AAAA",
    dataStoreKey: "vision:u1:v1:dataUrl",
    thumbnailStoreKey: "vision:u1:v1:thumbnailDataUrl",
    storage: "folder",
    folderFileName: "image.png",
    tags: {universes: ["u1"], entries: []},
  });
  context.persistVisionLargeData = async () => true;
  context.saveVisionBoardToStorage = () => ({
    ok: false,
    code: "quota_exceeded",
    userMessage: "Storage is full. Free some space, then try again.",
  });
  context.deleteVisionLargeData = async () => {
    largeDeletes += 1;
  };
  context.renderVisionBoard = async () => {};
  await context.uploadVisionFiles([{name: "image.png", size: 1024, type: "image/png"}]);
  assert.strictEqual(
    context.visionEntries.length,
    0,
    "failed image metadata save must not leave a phantom item in memory",
  );
  assert.strictEqual(
    largeDeletes,
    1,
    "failed image upload must clean up staged IndexedDB payloads",
  );
  assert.strictEqual(
    folderDeletes,
    1,
    "failed folder-backed image upload must clean up the staged folder file",
  );
  assert.strictEqual(toasts, 0, "a failed upload must not announce success");
  assert.match(message.textContent, /storage is full/i);
}

async function testSnapshotQuotaRollback() {
  const records = new Map();
  let nextId = 0;
  let value = 0;
  let exhaust = false;
  const adapter = {
    async put(record) {
      if (exhaust && record?.data?.universes?.[0]?.title === "Universe 7") throw quotaError();
      records.set(record.id, structuredClone(record));
      return true;
    },
    async get(id) {
      return records.has(id) ? structuredClone(records.get(id)) : null;
    },
    async list() {
      return Array.from(records.values()).map((record) => structuredClone(record));
    },
    async del(id) {
      records.delete(id);
      return true;
    },
  };
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
    structuredClone,
    setTimeout,
    clearTimeout,
    CustomEvent: function (type) {
      this.type = type;
    },
    WORMHOLES_APP_VERSION: "Beta 197",
    WORMHOLES_APP_SCHEMA_VERSION: 4,
    async buildWormholesAppDataExport() {
      return {
        format: "Wormholes App Data Export",
        schemaVersion: 4,
        currentUniverseId: "u1",
        universes: [{id: "u1", title: `Universe ${value}`}],
        bridgeNotes: {},
        universeData: {u1: {archive: [], connectionNotes: {}, literature: [], vision: []}},
        exportSummary: {},
      };
    },
    summarizeWormholesAppDataExport() {
      return {};
    },
    document: {
      getElementById() {
        return null;
      },
    },
    confirm() {
      return true;
    },
    dispatchEvent() {},
    crypto: {
      randomUUID() {
        nextId += 1;
        return `s-${nextId}`;
      },
    },
    WormholesSnapshotStorageAdapter: adapter,
    WormholesCorruptionStorageAdapter: {
      async put() {},
      async get() {
        return null;
      },
      async list() {
        return [];
      },
      async del() {},
    },
    WormholesSingleTab: {
      canWrite() {
        return true;
      },
    },
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, "scripts", "wormholes-snapshots.js"), "utf8"),
    context,
    {filename: "snapshots.js"},
  );
  for (let i = 1; i <= 6; i++) {
    value = i;
    await context.WormholesSnapshots.createSnapshot({force: true});
  }
  const before = await context.WormholesSnapshots.listSnapshots();
  assert.strictEqual(before.length, 5);
  exhaust = true;
  value = 7;
  await assert.rejects(() => context.WormholesSnapshots.createSnapshot({force: true}), /quota/i);
  const after = await context.WormholesSnapshots.listSnapshots();
  assert.deepStrictEqual(
    after.map((r) => r.id).sort(),
    before.map((r) => r.id).sort(),
    "failed rolling snapshot must restore the previous recovery set",
  );
}

async function testFolderQuotaAbort() {
  let aborted = false;
  const reports = [];
  const folder = {
    async getFileHandle() {
      return {
        async createWritable() {
          return {
            async write() {
              throw quotaError("Disk is full");
            },
            async close() {},
            async abort() {
              aborted = true;
            },
          };
        },
      };
    },
  };
  const context = {
    console,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
      length: 0,
      key() {
        return null;
      },
    },
    Blob,
    setTimeout,
    clearTimeout,
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
    Uint8Array,
    navigator: {},
    document: {
      getElementById() {
        return null;
      },
    },
    window: {showDirectoryPicker() {}, indexedDB: {}},
    indexedDB: {},
    URL: {
      createObjectURL() {
        return "";
      },
      revokeObjectURL() {},
    },
    Image: function () {},
    reportAppError(label, error, options = {}) {
      reports.push({label, error, options});
    },
    currentUniverseId: "u1",
    universes: [],
    archiveEntries: [],
    literatureEntries: [],
    visionEntries: [],
    connectionNotes: {},
    bridgeNotes: {},
    localFoldersEnabled: true,
    localFolderRestoreInProgress: false,
    localFolderSwitchInProgress: false,
    localFolderStorageMode: "native",
    previousWormholesSourceFolderHandle: null,
    wormholesRootFolderHandle: null,
    wormholesParentFolderHandle: null,
    wormholesCreationsRootHandle: null,
    wormholesLiteratureRootHandle: null,
    wormholesImagesRootHandle: null,
    creationFolderHandle: null,
    literatureFolderHandle: null,
    visionFolderHandle: null,
    visionObjectUrls: [],
    storageFootnoteTexts: {},
    recentStorageFailureMessage: "",
    recentStorageFailureAt: 0,
    recentFolderSaveWarningMessage: "",
    recentFolderSaveWarningAt: 0,
    PARTIAL_FOLDER_SAVE_MESSAGE: "Saved in app. Folder sync failed.",
    WORMHOLES_APP_SCHEMA_VERSION: 4,
    WORMHOLES_APP_VERSION: "Beta 197",
    WORMHOLES_MANAGED_MARKER: ".wormholes-managed.json",
    WORMHOLES_CATEGORY_NAMES: new Set(["Creations", "Literature", "Images"]),
    makeId() {
      return "id";
    },
    largeDataStore() {
      return null;
    },
    stableUniverseFolderName() {
      return "U";
    },
    legacyUniverseFolderName() {
      return "U";
    },
    universeFolderName() {
      return "U";
    },
    normalizeBridges(v) {
      return v || [];
    },
    normalizeArchiveGroups() {},
    requestStorageFootnoteUpdate() {},
    restoreFolderHandlesForCurrentUniverse() {
      return Promise.resolve(false);
    },
    readArchiveForUniverse() {
      return [];
    },
    readLiteratureForUniverse() {
      return [];
    },
    readVisionBoardForUniverse() {
      return [];
    },
  };
  context.globalThis = context;
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "scripts", "storage.js"), "utf8"), context, {
    filename: "storage.js",
  });
  vm.runInContext(
    fs.readFileSync(path.join(root, "scripts", "folder-storage.js"), "utf8"),
    context,
    {filename: "folder-storage.js"},
  );
  await assert.rejects(
    () => context.writeBlobToFolder(folder, "file.bin", new Blob(["x"])),
    /full/i,
  );
  assert.strictEqual(
    aborted,
    true,
    "a failed folder write must abort its temporary writable stream",
  );
  assert.match(reports.at(-1).options.userMessage, /available space/i);
}

async function testUndoQuotaRetry() {
  function element(tag = "div") {
    const children = [];
    return {
      tagName: tag.toUpperCase(),
      className: "",
      textContent: "",
      style: {setProperty() {}, removeProperty() {}},
      classList: classList(),
      append(...n) {
        children.push(...n);
      },
      replaceChildren(...n) {
        children.splice(0, children.length, ...n);
      },
      addEventListener() {},
      setAttribute() {},
      querySelector() {
        return null;
      },
    };
  }
  const reports = [];
  let fail = true;
  let storedArchive = [];
  const toast = element();
  const context = {
    console,
    Date,
    JSON,
    Object,
    Array,
    Set,
    Map,
    Promise,
    Math,
    structuredClone,
    setTimeout(fn) {
      if (fn) fn();
      return 1;
    },
    clearTimeout() {},
    requestAnimationFrame() {
      return 1;
    },
    cancelAnimationFrame() {},
    document: {
      getElementById(id) {
        return id === "savedToast" ? toast : null;
      },
      createElement: element,
    },
    window: {addEventListener() {}},
    universes: [{id: "u1", title: "U"}],
    currentUniverseId: "u1",
    bridgeNotes: {},
    archiveEntries: [],
    connectionNotes: {},
    literatureEntries: [],
    visionEntries: [],
    readArchiveForUniverse() {
      return storedArchive;
    },
    readConnectionNotesForUniverse() {
      return {};
    },
    readLiteratureForUniverse() {
      return [];
    },
    readVisionBoardForUniverse() {
      return [];
    },
    saveUniversesToStorage() {
      return true;
    },
    saveBridgeNotesToStorage() {
      return true;
    },
    saveArchiveForUniverse(id, entries) {
      if (fail) return false;
      storedArchive = structuredClone(entries);
      return true;
    },
    saveConnectionNotesForUniverse() {
      return true;
    },
    writeLiteratureMetadataOnly() {
      return true;
    },
    writeVisionMetadataOnly() {
      return true;
    },
    archiveStorageKey() {
      return "a";
    },
    oldArchiveStorageKey() {
      return "oa";
    },
    connectionNotesStorageKey() {
      return "n";
    },
    oldConnectionNotesStorageKey() {
      return "on";
    },
    literatureStorageKey() {
      return "l";
    },
    oldLiteratureStorageKey() {
      return "ol";
    },
    visionStorageKey() {
      return "v";
    },
    oldVisionStorageKey() {
      return "ov";
    },
    removeMigratedLocalStorageValue() {},
    loadArchiveFromStorage() {
      context.archiveEntries = structuredClone(storedArchive);
    },
    loadConnectionNotesFromStorage() {},
    loadLiteratureFromStorage() {},
    loadVisionBoardFromStorage() {},
    reportAppError(label, error, options = {}) {
      reports.push({label, error, options});
    },
    showSavedToast() {},
  };
  context.globalThis = context;
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, "scripts", "wormholes-undo.js"), "utf8"),
    context,
    {filename: "undo.js"},
  );
  const state = {
    universes: [{id: "u1", title: "U"}],
    currentUniverseId: "u1",
    bridgeNotes: {},
    universeData: {
      u1: {
        archive: [{id: "c1", title: "Restored"}],
        connectionNotes: {},
        literature: [],
        vision: [],
      },
    },
  };
  await assert.rejects(
    () => context.window.WormholesUndo.restoreState(state),
    /Could not restore an Archive/,
    "restore should report failure under quota",
  );
  fail = false;
  assert.strictEqual(
    await context.window.WormholesUndo.restoreState(state),
    true,
    "restore should succeed when storage becomes available",
  );
  assert.strictEqual(storedArchive[0].id, "c1");
}

(async () => {
  await testLocalStorageAtomicFailure();
  await testLargeDataQuotaReporting();
  await testLiteratureRetryState();
  await testVisionUploadRollback();
  await testSnapshotQuotaRollback();
  await testFolderQuotaAbort();
  await testUndoQuotaRetry();
  console.log("storage-exhaustion.unit.js passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
