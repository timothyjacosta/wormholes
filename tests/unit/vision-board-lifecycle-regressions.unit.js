const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "..");
const visionSource = fs.readFileSync(path.join(root, "scripts", "vision-board.js"), "utf8");
const literatureSource = fs.readFileSync(path.join(root, "scripts", "literature.js"), "utf8");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function classList(initial = []) {
  const values = new Set(initial);
  return {
    values,
    add(...names) {
      names.forEach((name) => values.add(name));
    },
    remove(...names) {
      names.forEach((name) => values.delete(name));
    },
    contains(name) {
      return values.has(name);
    },
    toggle(name, force) {
      if (force === true) {
        values.add(name);
        return true;
      }
      if (force === false) {
        values.delete(name);
        return false;
      }
      if (values.has(name)) {
        values.delete(name);
        return false;
      }
      values.add(name);
      return true;
    },
  };
}

function createHarness() {
  const elements = new Map();
  const calls = [];
  const metadataByUniverse = new Map();
  const largeData = new Map();
  const undoOffers = [];
  let idCounter = 0;

  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        value: "",
        innerHTML: "",
        textContent: "",
        dataset: {},
        disabled: false,
        classList: classList(),
        focus() {
          calls.push(`focus:${id}`);
        },
        click() {
          calls.push(`click:${id}`);
        },
        scrollIntoView() {},
        setAttribute() {},
        removeAttribute() {},
        addEventListener() {},
        querySelector() {
          return null;
        },
        querySelectorAll() {
          return [];
        },
        prepend() {},
        replaceChildren() {},
      });
    }
    return elements.get(id);
  }

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
    URL: {
      createObjectURL() {
        return "blob:vision";
      },
      revokeObjectURL() {},
    },
    CSS: {
      escape(value) {
        return String(value || "");
      },
    },
    currentUniverseId: "u1",
    universes: [
      {id: "u1", title: "First Universe"},
      {id: "u2", title: "Second Universe"},
    ],
    archiveEntries: [],
    literatureEntries: [],
    visionEntries: [],
    visionObjectUrls: [],
    visionLinksObjectUrls: [],
    visionImageViewerObjectUrl: "",
    visionMoveMode: false,
    activeVisionDragId: null,
    visionPointerDragState: null,
    expandedVisionId: null,
    expandedVisionPlaceholder: null,
    activeVisionRenameId: null,
    activeVisionDeleteId: null,
    activeVisionTagId: null,
    activeVisionTagGoTarget: null,
    activeLiteratureTagId: null,
    activeGroupEntryId: null,
    stagedTagUniverseIds: new Set(),
    stagedTagEntryKeys: new Set(),
    expandedLiteratureTagGroups: new Set(),
    tagPickerHasUnsavedChanges: false,
    localFoldersEnabled: false,
    visionFolderHandle: null,
    wormholesImagesRootHandle: null,
    previousWormholesSourceFolderHandle: null,
    document: {
      getElementById: element,
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      createElement() {
        return {
          style: {},
          dataset: {},
          classList: classList(),
          innerHTML: "",
          textContent: "",
          appendChild() {},
          remove() {},
          setAttribute() {},
          removeAttribute() {},
          querySelector() {
            return null;
          },
          querySelectorAll() {
            return [];
          },
        };
      },
    },
    window: {},
    setTimeout(fn) {
      if (typeof fn === "function") fn();
      return 1;
    },
    clearTimeout() {},
    requestAnimationFrame(fn) {
      if (typeof fn === "function") fn();
    },
    uniqueList(list) {
      return Array.from(new Set((list || []).filter(Boolean)));
    },
    compactText(value) {
      return String(value || "").trim();
    },
    escapeHtml(value) {
      return String(value || "");
    },
    formatFileSize() {
      return "0 B";
    },
    makeId() {
      idCounter += 1;
      return `vision-${idCounter}`;
    },
    getUniverseTitle(id) {
      return context.universes.find((item) => item.id === id)?.title || "";
    },
    getCurrentUniverse() {
      return context.universes.find((item) => item.id === context.currentUniverseId) || null;
    },
    isGroupEntry() {
      return false;
    },
    groupChildIds() {
      return [];
    },
    readArchiveForUniverse() {
      return [];
    },
    visibleEntryTitleForUniverseEntry() {
      return "";
    },
    visionStorageKey(id = context.currentUniverseId) {
      return `vision:${id}`;
    },
    oldVisionStorageKey(id = context.currentUniverseId) {
      return `old-vision:${id}`;
    },
    literatureStorageKey(id = context.currentUniverseId) {
      return `literature:${id}`;
    },
    oldLiteratureStorageKey(id = context.currentUniverseId) {
      return `old-literature:${id}`;
    },
    readPersistedDatasetData(primaryKey, oldKey, fallbackValue) {
      return fallbackValue;
    },
    saveLocalStorageJson() {
      return true;
    },
    requestStorageFootnoteUpdate() {
      calls.push("storage-footnote");
    },
    largeDataStoreAvailable() {
      return true;
    },
    async persistLargeDataValue(key, value) {
      calls.push(`persist-large:${key}`);
      largeData.set(key, String(value || ""));
      return true;
    },
    async loadLargeDataValue(key) {
      calls.push(`load-large:${key}`);
      return largeData.get(key) || "";
    },
    async deleteLargeDataValue(key) {
      calls.push(`delete-large:${key}`);
      largeData.delete(key);
      return true;
    },
    dataUrlToBlob(dataUrl) {
      return new Blob([String(dataUrl || "")], {type: "image/png"});
    },
    reportAppError(message) {
      calls.push(`error:${message}`);
    },
    renderArchive() {
      calls.push("render-archive");
    },
    renderConnectionsMap() {
      calls.push("render-connections-map");
    },
    renderWormholesMap() {
      calls.push("render-wormholes-map");
    },
    refreshLiteratureLinkDisplays() {
      calls.push("refresh-literature");
    },
    installLiteratureListControlDelegation() {},
    protectAllControls() {},
    syncAllAppButtonStates() {},
    closeMenus() {
      calls.push("close-menus");
    },
    showSavedToast(message) {
      calls.push(`toast:${message}`);
    },
    showBrowserStorageUploadPrompt() {
      calls.push("browser-storage-prompt");
    },
    requestFolderPermission: async () => true,
    extensionForStoredFileName() {
      return ".png";
    },
    renameFolderBackedRecordFile: async (record) => record,
    writeBlobToFolder: async () => true,
    removeFileFromFolder: async () => true,
    rememberFolderSaveFailure() {
      calls.push("folder-warning");
    },
    ensureWormholesFolderReadyForDestructiveSync: async () => true,
    ensureUniverseFolders: async () => null,
    deleteFolderBackedRecordFile: async () => true,
    pruneWormholesFolderToAppState: async () => {
      calls.push("prune-folders");
    },
    togglePositionedMenu() {},
    setContextualAriaLabel() {},
    prefersReducedMotion() {
      return true;
    },
    switchTab() {},
    revealArchiveEntryForTag() {},
    enterUniverse(id) {
      context.currentUniverseId = id;
    },
    nestedPickerKey(type, id) {
      return `${type}:${id}`;
    },
    initializeTagPickerDraft() {},
    renderLiteratureTagList() {},
    toggleDraftUniverseTag() {},
    toggleDraftEntryTag() {},
    tagEntryKey(universeId, entryId) {
      return `${universeId}::${entryId}`;
    },
    splitTagEntryKey(key) {
      const [universeId, entryId] = String(key || "").split("::");
      return {universeId, entryId};
    },
    activeTagTarget() {
      if (context.activeVisionTagId)
        return context.visionEntries.find((item) => item.id === context.activeVisionTagId) || null;
      return null;
    },
    readLiteratureForUniverse() {
      return [];
    },
    saveLiteratureToStorage() {
      return true;
    },
    isLiteratureGroup() {
      return false;
    },
    sanitizeLiteratureHtml(value) {
      return String(value || "");
    },
    literaturePlainPreview(value) {
      return String(value || "");
    },
    normalizeLiteratureGroups() {
      return false;
    },
  };

  context.global = context;
  context.globalThis = context;
  context.window.WormholesUndo = {
    captureState() {
      calls.push("capture-undo");
      return {visionEntries: clone(context.visionEntries), universeId: context.currentUniverseId};
    },
    async offer(options) {
      undoOffers.push(options);
      calls.push(`undo:${options.message}`);
    },
  };

  context.wormholesRepository = (name) =>
    name === "vision"
      ? {
          read(universeId, fallback) {
            return clone(metadataByUniverse.get(universeId) || fallback);
          },
          save(universeId, entries) {
            calls.push(`write-vision:${universeId}`);
            if (context.__metadataSaveResult === false) return false;
            metadataByUniverse.set(universeId, clone(entries || []));
            return true;
          },
        }
      : null;

  vm.createContext(context);
  vm.runInContext(visionSource, context, {filename: "scripts/vision-board.js"});
  vm.runInContext(literatureSource, context, {filename: "scripts/literature.js"});

  context.scheduleVisionLargeDataSave = (universeId) => {
    calls.push(`schedule-large:${universeId}`);
    return Promise.resolve(true);
  };
  context.renderVisionBoard = async () => {
    calls.push("render-vision");
  };
  context.closeLiteratureTagModal = () => {
    calls.push("close-tags");
    context.activeVisionTagId = null;
    context.activeLiteratureTagId = null;
  };

  return {context, element, calls, metadataByUniverse, largeData, undoOffers};
}

function visionRecord(id = "image-1", title = "Original image") {
  return {
    id,
    title,
    sourceName: `${id}.png`,
    fileType: "image",
    mimeType: "image/png",
    thumbnailDataUrl: "data:image/png;base64,VEhVTUI=",
    dataUrl: "data:image/png;base64,SU1BR0U=",
    storage: "",
    folderFileName: "",
    dataStoreKey: `vision:u1:${id}:dataUrl`,
    thumbnailStoreKey: `vision:u1:${id}:thumbnailDataUrl`,
    dataStored: "",
    thumbnailStored: "",
    fileSize: 12,
    tags: {universes: ["u1"], entries: []},
    createdAt: "2026-07-01T00:00:00.000Z",
  };
}

(async () => {
  // Upload should create metadata, persist large image payloads, and survive reload.
  {
    const {context, metadataByUniverse, largeData} = createHarness();
    context.convertUploadedVisionFile = async (file) =>
      visionRecord("image-1", file.name.replace(/\.[^.]+$/, ""));

    await context.uploadVisionFiles([{name: "Lifecycle Image.png", type: "image/png", size: 12}]);
    assert.strictEqual(context.visionEntries.length, 1);
    assert.strictEqual(metadataByUniverse.get("u1")[0].title, "Lifecycle Image");
    assert.strictEqual(
      metadataByUniverse.get("u1")[0].dataUrl,
      "",
      "localStorage metadata should not duplicate persisted image data",
    );
    assert.strictEqual(
      largeData.get("vision:u1:image-1:dataUrl"),
      "data:image/png;base64,SU1BR0U=",
    );
    assert.strictEqual(
      largeData.get("vision:u1:image-1:thumbnailDataUrl"),
      "data:image/png;base64,VEhVTUI=",
    );

    context.visionEntries = [];
    context.loadVisionBoardFromStorage();
    assert.strictEqual(context.visionEntries[0].title, "Lifecycle Image");
    assert.strictEqual(context.visionEntries[0].dataUrl, "");
    await context.materializeVisionItemLargeData(context.visionEntries[0], "u1");
    assert.strictEqual(context.visionEntries[0].dataUrl, "data:image/png;base64,SU1BR0U=");
  }

  // Universe switching must load each board from its own repository boundary.
  {
    const {context, metadataByUniverse} = createHarness();
    context.visionEntries = [visionRecord("u1-image", "First board image")];
    assert.strictEqual(context.saveVisionBoardToStorage().ok, true);

    context.currentUniverseId = "u2";
    context.visionEntries = [visionRecord("u2-image", "Second board image")];
    context.visionEntries[0].dataStoreKey = "vision:u2:u2-image:dataUrl";
    context.visionEntries[0].thumbnailStoreKey = "vision:u2:u2-image:thumbnailDataUrl";
    assert.strictEqual(context.saveVisionBoardToStorage().ok, true);

    context.visionEntries = [];
    context.currentUniverseId = "u1";
    context.loadVisionBoardFromStorage();
    assert.deepStrictEqual(
      Array.from(context.visionEntries, (item) => item.title),
      ["First board image"],
    );
    assert.strictEqual(metadataByUniverse.get("u2")[0].title, "Second board image");
  }

  // Rename should update the existing record and persist the new title.
  {
    const {context, element, metadataByUniverse} = createHarness();
    context.visionEntries = [visionRecord()];
    context.activeVisionRenameId = "image-1";
    element("visionRenameModal").classList.add("open");
    element("visionRenameInput").value = "Renamed image";

    const result = await context.saveVisionRename();
    assert.strictEqual(result, true);
    assert.strictEqual(context.visionEntries[0].id, "image-1");
    assert.strictEqual(context.visionEntries[0].title, "Renamed image");
    assert.strictEqual(metadataByUniverse.get("u1")[0].title, "Renamed image");
    assert.strictEqual(element("visionRenameModal").classList.contains("open"), false);
  }

  // Failed rename persistence must restore every in-memory field and keep the modal open.
  {
    const {context, element, calls} = createHarness();
    const original = visionRecord();
    context.visionEntries = [clone(original)];
    context.activeVisionRenameId = "image-1";
    context.__metadataSaveResult = false;
    element("visionRenameModal").classList.add("open");
    element("visionRenameInput").value = "Unsaved rename";

    const result = await context.saveVisionRename();
    assert.strictEqual(result, false);
    assert.strictEqual(JSON.stringify(context.visionEntries[0]), JSON.stringify(original));
    assert.strictEqual(context.activeVisionRenameId, "image-1");
    assert.strictEqual(element("visionRenameModal").classList.contains("open"), true);
    assert.ok(calls.includes("error:Could not save Vision Board rename"));
    assert.ok(!calls.includes("toast:Image renamed"));
    assert.ok(
      !calls.includes("schedule-large:u1"),
      "failed metadata writes must not queue a later large-data metadata rewrite",
    );
  }

  // Tag changes should persist atomically and retain the picker when storage rejects them.
  {
    const {context, calls, undoOffers} = createHarness();
    const item = visionRecord();
    context.visionEntries = [item];
    context.activeVisionTagId = "image-1";
    context.stagedTagUniverseIds = new Set(["u2"]);
    context.stagedTagEntryKeys = new Set(["u2::entry-2"]);
    context.__metadataSaveResult = false;

    const failed = context.saveAndCloseLiteratureTagModal();
    assert.strictEqual(failed, false);
    assert.strictEqual(JSON.stringify(item.tags), JSON.stringify({universes: ["u1"], entries: []}));
    assert.strictEqual(context.activeVisionTagId, "image-1");
    assert.ok(calls.includes("error:Could not save Vision Board tags"));
    assert.ok(!calls.includes("close-tags"));

    context.__metadataSaveResult = true;
    const saved = context.saveAndCloseLiteratureTagModal();
    assert.strictEqual(saved, true);
    assert.strictEqual(
      JSON.stringify(item.tags),
      JSON.stringify({universes: ["u2"], entries: [{universeId: "u2", entryId: "entry-2"}]}),
    );
    assert.strictEqual(context.activeVisionTagId, null);
    assert.strictEqual(undoOffers.length, 1, "removing an existing tag should offer Undo");
    assert.strictEqual(undoOffers[0].message, "Tags updated");
  }

  // Reordering should persist on success and restore the previous order on failure.
  {
    const {context, calls} = createHarness();
    context.visionEntries = [
      visionRecord("a", "A"),
      visionRecord("b", "B"),
      visionRecord("c", "C"),
    ];

    assert.strictEqual(context.moveVisionItemToIndex("a", 3), true);
    assert.deepStrictEqual(
      Array.from(context.visionEntries, (item) => item.id),
      ["b", "c", "a"],
    );

    context.__metadataSaveResult = false;
    const beforeFailure = context.visionEntries.map((item) => item.id);
    assert.strictEqual(context.moveVisionItemToIndex("b", 3), false);
    assert.deepStrictEqual(
      Array.from(context.visionEntries, (item) => item.id),
      beforeFailure,
    );
    assert.ok(calls.includes("error:Could not save image order"));
    assert.strictEqual(
      calls.filter((call) => call === "schedule-large:u1").length,
      1,
      "only the successful reorder should schedule large-data reconciliation",
    );
  }

  // Deletion should remove metadata immediately, preserve large data through Undo,
  // and finalize destructive cleanup only after the Undo window ends.
  {
    const {context, largeData, undoOffers, calls} = createHarness();
    const item = visionRecord();
    item.dataStored = "indexedDB";
    item.thumbnailStored = "indexedDB";
    item.dataUrl = "";
    item.thumbnailDataUrl = "";
    context.visionEntries = [item];
    largeData.set(item.dataStoreKey, "data:image/png;base64,SU1BR0U=");
    largeData.set(item.thumbnailStoreKey, "data:image/png;base64,VEhVTUI=");
    context.activeVisionDeleteId = "image-1";

    const result = await context.confirmVisionDelete();
    assert.strictEqual(result, true);
    assert.deepStrictEqual(Array.from(context.visionEntries), []);
    assert.strictEqual(undoOffers.length, 1);
    assert.strictEqual(undoOffers[0].message, "Image deleted");
    assert.strictEqual(
      largeData.has(item.dataStoreKey),
      true,
      "Undo window should preserve the original image",
    );
    assert.strictEqual(
      largeData.has(item.thumbnailStoreKey),
      true,
      "Undo window should preserve the thumbnail",
    );

    await undoOffers[0].finalize();
    assert.strictEqual(largeData.has(item.dataStoreKey), false);
    assert.strictEqual(largeData.has(item.thumbnailStoreKey), false);
    assert.ok(calls.includes(`delete-large:${item.dataStoreKey}`));
    assert.ok(calls.includes("prune-folders"));
  }

  // Failed deletion persistence must restore the image and avoid Undo/finalization.
  {
    const {context, largeData, undoOffers, calls} = createHarness();
    const item = visionRecord();
    item.dataStored = "indexedDB";
    item.thumbnailStored = "indexedDB";
    item.dataUrl = "";
    item.thumbnailDataUrl = "";
    context.visionEntries = [item];
    largeData.set(item.dataStoreKey, "image");
    largeData.set(item.thumbnailStoreKey, "thumb");
    context.activeVisionDeleteId = "image-1";
    context.__metadataSaveResult = false;

    const result = await context.confirmVisionDelete();
    assert.strictEqual(result, false);
    assert.strictEqual(context.visionEntries.length, 1);
    assert.strictEqual(context.visionEntries[0].id, "image-1");
    assert.strictEqual(undoOffers.length, 0);
    assert.strictEqual(largeData.has(item.dataStoreKey), true);
    assert.ok(calls.includes("error:Could not delete Vision Board image"));
    assert.ok(!calls.some((call) => call.startsWith("delete-large:")));
    assert.ok(
      !calls.includes("schedule-large:u1"),
      "failed deletion must not queue a later metadata rewrite",
    );
  }

  console.log("vision-board-lifecycle-regressions.unit.js passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
