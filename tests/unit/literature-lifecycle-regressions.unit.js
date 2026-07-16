const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "..");
const source = fs.readFileSync(path.join(root, "scripts", "literature.js"), "utf8");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function classList(initial = []) {
  const values = new Set(initial);
  return {
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
        contentEditable: "true",
        disabled: false,
        dataset: {},
        classList: classList(id === "literatureEditorScreen" ? ["active"] : []),
        focus() {
          calls.push(`focus:${id}`);
        },
        prepend() {},
        setAttribute() {},
        removeAttribute() {},
        addEventListener() {},
        querySelector() {
          return null;
        },
        querySelectorAll() {
          return [];
        },
      });
    }
    return elements.get(id);
  }

  element("literatureListScreen").classList.remove("active");
  element("literatureEditorHeading").textContent = "New Document";
  element("literatureTitleInput").value = "";
  element("literatureEditor").innerHTML = "";
  element("literatureSaveStatus").dataset.state = "idle";

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
    universes: [{id: "u1", title: "Lifecycle Universe"}],
    literatureEntries: [],
    archiveEntries: [],
    visionEntries: [],
    activeLiteratureId: null,
    activeLiteratureViewerHomeUniverseId: null,
    activeLiteratureTagId: null,
    activeVisionTagId: null,
    activeGroupEntryId: null,
    stagedTagUniverseIds: new Set(),
    stagedTagEntryKeys: new Set(),
    expandedLiteratureTagGroups: new Set(),
    tagPickerHasUnsavedChanges: false,
    localFoldersEnabled: false,
    literatureFolderHandle: null,
    document: {
      getElementById: element,
      querySelectorAll() {
        return [];
      },
      createElement() {
        return {innerHTML: "", textContent: "", innerText: "", className: "", prepend() {}};
      },
      execCommand() {
        return true;
      },
    },
    window: {},
    setTimeout(fn) {
      calls.push("set-timeout");
      return 1;
    },
    clearTimeout() {},
    requestAnimationFrame(fn) {
      if (typeof fn === "function") fn();
    },
    uniqueList(list) {
      return Array.from(new Set((list || []).filter(Boolean)));
    },
    tagEntryKey(universeId, entryId) {
      return `${universeId}::${entryId}`;
    },
    splitTagEntryKey(key) {
      const [universeId, entryId] = String(key || "").split("::");
      return {universeId, entryId};
    },
    escapeHtml(value) {
      return String(value || "");
    },
    formatFileSize() {
      return "0 B";
    },
    getUniverseTitle(id) {
      return context.universes.find((item) => item.id === id)?.title || "";
    },
    getCurrentUniverse() {
      return context.universes.find((item) => item.id === context.currentUniverseId) || null;
    },
    makeId() {
      idCounter += 1;
      return `literature-${idCounter}`;
    },
    literatureStorageKey(id = context.currentUniverseId) {
      return `literature:${id}`;
    },
    oldLiteratureStorageKey(id = context.currentUniverseId) {
      return `old-literature:${id}`;
    },
    readPersistedDatasetData() {
      return [];
    },
    saveLocalStorageJson() {
      return true;
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
      return largeData.get(key) || "";
    },
    async deleteLargeDataValue(key) {
      calls.push(`delete-large:${key}`);
      largeData.delete(key);
      return true;
    },
    reportAppError(message) {
      calls.push(`error:${message}`);
    },
    requestStorageFootnoteUpdate() {
      calls.push("storage-footnote");
    },
    renderLiteratureList() {
      calls.push("render-literature");
    },
    refreshLiteratureLinkDisplays() {
      calls.push("refresh-literature");
    },
    renderArchive() {
      calls.push("render-archive");
    },
    renderVisionBoard() {
      calls.push("render-vision");
    },
    renderConnectionsMap() {
      calls.push("render-connections-map");
    },
    installLiteratureListControlDelegation() {},
    protectAllControls() {},
    showSavedToast(message) {
      calls.push(`toast:${message || "Saved"}`);
    },
    requestFolderPermission: async () => true,
    writeLiteratureDocToSpecificFolder: async () => true,
    rememberFolderSaveFailure() {},
    ensureWormholesFolderReadyForDestructiveSync: async () => true,
    ensureUniverseFolders: async () => null,
    deleteFolderBackedRecordFile: async () => true,
    pruneWormholesFolderToAppState: async () => {
      calls.push("prune-folders");
    },
    showBrowserStorageUploadPrompt() {},
    closeMenus() {},
    switchTab() {},
    showHomeScreen() {},
    isGroupEntry() {
      return false;
    },
    groupChildIds() {
      return [];
    },
    readArchiveForUniverse() {
      return [];
    },
    activeTagTarget() {
      return (
        context.literatureEntries.find((item) => item.id === context.activeLiteratureTagId) || null
      );
    },
    initializeTagPickerDraft() {},
    nestedPickerKey() {
      return "key";
    },
  };
  context.global = context;
  context.globalThis = context;
  context.window.WormholesUndo = {
    captureState() {
      calls.push("capture-undo");
      return {snapshot: true};
    },
    async offer(options) {
      undoOffers.push(options);
      calls.push(`undo:${options.message}`);
    },
  };

  vm.createContext(context);
  vm.runInContext(source, context, {filename: "scripts/literature.js"});

  // Replace storage and rendering boundaries so the lifecycle logic runs against
  // deterministic in-memory stores while retaining the production orchestration.
  context.sanitizeLiteratureHtml = (value) => String(value || "");
  context.literaturePlainPreview = (value) =>
    String(value || "")
      .replace(/<[^>]*>/g, " ")
      .trim();
  context.writeLiteratureMetadataOnly = (universeId, docs) => {
    calls.push(`write-metadata:${universeId}`);
    if (context.__metadataSaveResult === false) {
      return {
        ok: false,
        code: "storage_unavailable",
        userMessage: "Could not save this Literature. Try again.",
      };
    }
    metadataByUniverse.set(universeId, clone(docs || []));
    return {ok: true, code: "ok"};
  };
  context.saveLiteratureToStorage = () => {
    calls.push("save-literature");
    return context.writeLiteratureMetadataOnly(
      context.currentUniverseId,
      context.literatureEntries,
    );
  };
  context.wormholesRepository = (name) =>
    name === "literature"
      ? {
          read(universeId, fallback) {
            return clone(metadataByUniverse.get(universeId) || fallback);
          },
          save(universeId, docs) {
            return context.writeLiteratureMetadataOnly(universeId, docs);
          },
        }
      : null;
  context.normalizeLiteratureGroups = () => false;
  context.renderLiteratureList = () => calls.push("render-literature");
  context.refreshLiteratureLinkDisplays = () => calls.push("refresh-literature");
  context.closeLiteratureTagModal = () => {
    calls.push("close-tags");
    context.activeLiteratureTagId = null;
  };

  return {context, element, calls, metadataByUniverse, largeData, undoOffers};
}

function setEditorSession(context, changeVersion, savedVersion = 0) {
  vm.runInContext(
    `literatureEditorChangeVersion = ${changeVersion}; literatureEditorSavedVersion = ${savedVersion}; literatureFolderSyncPending = false; literatureEditorSessionUniverseId = currentUniverseId; literatureEditorClosing = false;`,
    context,
  );
}

function documentRecord(id = "doc-1") {
  return {
    id,
    kind: "",
    title: "Original title",
    content: "<p>Original body</p>",
    sourceName: "",
    fileType: "text",
    mimeType: "text/html",
    fileData: "",
    fileSize: 0,
    convertedFrom: "",
    storage: "",
    folderFileName: "",
    contentStoreKey: `literature:u1:${id}:content`,
    contentStored: "indexedDB",
    tags: {universes: ["u1"], entries: []},
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

(async () => {
  // A new document should move through create, portable metadata persistence,
  // IndexedDB caching, and reload without losing title or body.
  {
    const {context, element, metadataByUniverse, largeData} = createHarness();
    element("literatureTitleInput").value = "Lifecycle draft";
    element("literatureEditor").innerHTML = "<p>Lifecycle body</p>";
    setEditorSession(context, 1, 0);

    const result = await context.performLiteratureEditorSave({reason: "manual", syncFolder: false});
    assert.strictEqual(result.ok, true);
    assert.strictEqual(context.literatureEntries.length, 1);
    assert.strictEqual(context.activeLiteratureId, "literature-1");
    assert.strictEqual(element("literatureEditorHeading").textContent, "Edit Document");
    assert.strictEqual(metadataByUniverse.get("u1")[0].title, "Lifecycle draft");
    assert.strictEqual(metadataByUniverse.get("u1")[0].content, "<p>Lifecycle body</p>");
    assert.strictEqual(
      largeData.get("literature:u1:literature-1:content"),
      "<p>Lifecycle body</p>",
    );
    assert.strictEqual(element("literatureSaveStatus").textContent, "Saved in app");

    context.literatureEntries = [];
    context.loadLiteratureFromStorage();
    assert.strictEqual(context.literatureEntries[0].title, "Lifecycle draft");
    assert.strictEqual(context.literatureEntries[0].content, "<p>Lifecycle body</p>");
  }

  // Editing an existing document should update the same record and survive reload.
  {
    const {context, element, metadataByUniverse} = createHarness();
    context.literatureEntries = [documentRecord()];
    context.activeLiteratureId = "doc-1";
    element("literatureEditorHeading").textContent = "Edit Document";
    element("literatureTitleInput").value = "Edited title";
    element("literatureEditor").innerHTML = "<p>Edited body</p>";
    setEditorSession(context, 2, 1);

    const result = await context.performLiteratureEditorSave({
      reason: "autosave",
      syncFolder: false,
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(context.literatureEntries.length, 1);
    assert.strictEqual(context.literatureEntries[0].id, "doc-1");
    assert.strictEqual(metadataByUniverse.get("u1")[0].title, "Edited title");
    assert.strictEqual(metadataByUniverse.get("u1")[0].content, "<p>Edited body</p>");
  }

  // A failed edit must not leave unsaved title, body, timestamps, or cache state in memory.
  {
    const {context, element, calls, largeData} = createHarness();
    const original = documentRecord();
    context.literatureEntries = [clone(original)];
    largeData.set(original.contentStoreKey, original.content);
    context.activeLiteratureId = "doc-1";
    context.__metadataSaveResult = false;
    element("literatureEditorHeading").textContent = "Edit Document";
    element("literatureTitleInput").value = "Unsaved edit";
    element("literatureEditor").innerHTML = "<p>Unsaved body</p>";
    setEditorSession(context, 2, 1);

    const result = await context.performLiteratureEditorSave({reason: "manual", syncFolder: false});
    assert.strictEqual(result.ok, false);
    assert.strictEqual(JSON.stringify(context.literatureEntries[0]), JSON.stringify(original));
    assert.strictEqual(context.activeLiteratureId, "doc-1");
    assert.strictEqual(element("literatureEditorHeading").textContent, "Edit Document");
    assert.strictEqual(element("literatureSaveStatus").textContent, "Save failed");
    assert.strictEqual(
      largeData.get(original.contentStoreKey),
      original.content,
      "failed metadata save must restore the previous IndexedDB content",
    );
    assert.ok(
      calls.filter((call) => call === `persist-large:${original.contentStoreKey}`).length >= 2,
      "the transaction should write the candidate content and then restore the previous content",
    );
  }

  // A failed first save must not create a phantom document or convert the editor to edit mode.
  {
    const {context, element, calls} = createHarness();
    context.__metadataSaveResult = false;
    element("literatureTitleInput").value = "Rejected draft";
    element("literatureEditor").innerHTML = "<p>Rejected body</p>";
    setEditorSession(context, 1, 0);

    const result = await context.performLiteratureEditorSave({reason: "manual", syncFolder: false});
    assert.strictEqual(result.ok, false);
    assert.deepStrictEqual(Array.from(context.literatureEntries), []);
    assert.strictEqual(context.activeLiteratureId, null);
    assert.strictEqual(element("literatureEditorHeading").textContent, "New Document");
    assert.ok(
      calls.some((call) => call.startsWith("persist-large:")),
      "the candidate content should be written before metadata",
    );
    assert.ok(
      calls.some((call) => call.startsWith("delete-large:")),
      "failed first save must remove orphaned large-data content",
    );
  }

  // An editor from another universe must not write into the newly selected universe.
  {
    const {context, element, calls} = createHarness();
    context.literatureEntries = [documentRecord()];
    context.activeLiteratureId = "doc-1";
    element("literatureTitleInput").value = "Wrong universe edit";
    element("literatureEditor").innerHTML = "<p>Wrong universe body</p>";
    vm.runInContext(
      'literatureEditorChangeVersion = 2; literatureEditorSavedVersion = 1; literatureEditorSessionUniverseId = "u-other";',
      context,
    );

    const result = await context.performLiteratureEditorSave({reason: "autosave"});
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.skipped, true);
    assert.strictEqual(context.literatureEntries[0].title, "Original title");
    assert.ok(!calls.some((call) => call.startsWith("write-metadata:")));
  }

  // Failed tag persistence should restore the previous tag set and keep the picker open.
  {
    const {context, calls} = createHarness();
    const doc = documentRecord();
    doc.tags = {universes: ["u1"], entries: [{universeId: "u1", entryId: "entry-a"}]};
    context.literatureEntries = [doc];
    context.activeLiteratureTagId = "doc-1";
    context.stagedTagUniverseIds = new Set(["u2"]);
    context.stagedTagEntryKeys = new Set(["u2::entry-b"]);
    context.__metadataSaveResult = false;

    const result = context.saveAndCloseLiteratureTagModal();
    assert.strictEqual(result, false);
    assert.strictEqual(
      JSON.stringify(doc.tags),
      JSON.stringify({universes: ["u1"], entries: [{universeId: "u1", entryId: "entry-a"}]}),
    );
    assert.strictEqual(context.activeLiteratureTagId, "doc-1");
    assert.ok(!calls.includes("close-tags"));
    assert.ok(calls.includes("error:Could not save document tags"));
  }

  // Deletion should persist immediately, defer destructive cache cleanup through Undo,
  // and finalize only after the Undo window ends.
  {
    const {context, largeData, undoOffers, calls} = createHarness();
    const doc = documentRecord();
    context.literatureEntries = [doc];
    context.activeLiteratureId = "doc-1";
    largeData.set(doc.contentStoreKey, doc.content);

    await context.deleteLiteratureDoc("doc-1");
    assert.deepStrictEqual(Array.from(context.literatureEntries), []);
    assert.strictEqual(context.activeLiteratureId, null);
    assert.strictEqual(undoOffers.length, 1);
    assert.strictEqual(undoOffers[0].message, "Document deleted");
    assert.strictEqual(
      largeData.has(doc.contentStoreKey),
      true,
      "Undo window should preserve cached content",
    );

    await undoOffers[0].finalize();
    assert.strictEqual(largeData.has(doc.contentStoreKey), false);
    assert.ok(calls.includes(`delete-large:${doc.contentStoreKey}`));
    assert.ok(calls.includes("prune-folders"));
  }

  console.log("literature-lifecycle-regressions.unit.js passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
