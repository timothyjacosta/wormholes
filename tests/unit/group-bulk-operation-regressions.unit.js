const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "..");
const archiveSource = fs.readFileSync(path.join(root, "scripts", "archive.js"), "utf8");
const literatureSource = fs.readFileSync(path.join(root, "scripts", "literature.js"), "utf8");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ids(items) {
  return Array.from(items || [], (item) => item.id);
}

function createClassList(initial = []) {
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
    toggle(name) {
      if (values.has(name)) values.delete(name);
      else values.add(name);
    },
  };
}

function createElement(id) {
  return {
    id,
    value: "",
    textContent: "",
    innerHTML: "",
    dataset: {},
    classList: createClassList(),
    focusCalled: false,
    focus() {
      this.focusCalled = true;
    },
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    closest() {
      return null;
    },
  };
}

function createArchiveHarness() {
  const elements = new Map();
  const calls = [];
  const offers = [];
  const cleanupGroups = [];
  const cleanupNotes = [];
  const cleanedEntityIds = [];
  let idCounter = 0;

  function element(id) {
    if (!elements.has(id)) elements.set(id, createElement(id));
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
    setTimeout(fn) {
      if (typeof fn === "function") fn();
      return 1;
    },
    clearTimeout() {},
    currentUniverseId: "u1",
    universes: [
      {id: "u1", title: "Alpha", bridges: []},
      {id: "u2", title: "Beta", bridges: []},
    ],
    archiveEntries: [],
    connectionNotes: {},
    bridgeNotes: {},
    connectSourceId: null,
    selectedMapNodeId: null,
    selectedWormholeCreation: null,
    activeGroupEntryId: null,
    activeGroupMode: "create",
    activeGroupContext: "creation",
    localFoldersEnabled: false,
    creationFolderHandle: null,
    wormholesCreationsRootHandle: null,
    archiveVisionObjectUrls: [],
    document: {
      getElementById: element,
      querySelectorAll(selector) {
        if (selector === "#groupCreationList .group-choice.selected") {
          return context.__selectedIds.map((id) => ({dataset: {entryId: id}}));
        }
        return [];
      },
      createElement() {
        return createElement("created");
      },
    },
    window: {},
    URL: {revokeObjectURL() {}},
    __selectedIds: [],
    __saveResult: true,
    __archivesByUniverse: {u1: [], u2: []},
    __connectionNotesByUniverse: {},
    makeId() {
      idCounter += 1;
      return `group-${idCounter}`;
    },
    displayValue(item) {
      return item ? String(item.val) : "—";
    },
    escapeHtml(value) {
      return String(value || "");
    },
    uniqueList(list) {
      return Array.from(new Set((list || []).filter(Boolean)));
    },
    readArchiveForUniverse(universeId) {
      return universeId === context.currentUniverseId
        ? context.archiveEntries
        : context.__archivesByUniverse[universeId] || [];
    },
    saveArchiveToStorage() {
      calls.push("save-archive");
      return context.__saveResult;
    },
    saveArchiveForUniverse(universeId, archive) {
      context.__archivesByUniverse[universeId] = clone(archive);
      calls.push(`save-archive:${universeId}`);
      return true;
    },
    saveConnectionNotesToStorage() {
      calls.push("save-connection-notes");
      return true;
    },
    readConnectionNotesForUniverse(universeId) {
      return clone(context.__connectionNotesByUniverse[universeId] || {});
    },
    saveConnectionNotesForUniverse(universeId, notes) {
      context.__connectionNotesByUniverse[universeId] = clone(notes);
      return true;
    },
    saveBridgeNotesToStorage() {
      calls.push("save-bridge-notes");
      return true;
    },
    saveUniversesToStorage() {
      calls.push("save-universes");
      return true;
    },
    normalizeBridges(bridges) {
      return Array.isArray(bridges) ? bridges.filter(Boolean).map((item) => ({...item})) : [];
    },
    normalizeUniverseBridges(universe) {
      return Array.isArray(universe?.bridges)
        ? universe.bridges.filter(Boolean).map((item) => ({...item}))
        : [];
    },
    normalizeUniverseBridge(bridge) {
      return bridge;
    },
    normalizeBridgeListForImport(bridges) {
      return Array.isArray(bridges) ? bridges : [];
    },
    normalizeBridge(bridge) {
      return bridge;
    },
    makeConnectionKeyFromIds(a, b) {
      return [a, b].sort().join("::");
    },
    bridgeNoteKeyForNodes(a, b) {
      return [a, b].sort().join("||");
    },
    getUniverseTitle(universeId) {
      return context.universes.find((item) => item.id === universeId)?.title || "";
    },
    getCreationTitleFromUniverse(universeId, creationId) {
      return (
        context.readArchiveForUniverse(universeId).find((item) => item.id === creationId)?.title ||
        ""
      );
    },
    getCurrentUniverse() {
      return context.universes.find((item) => item.id === context.currentUniverseId) || null;
    },
    showSavedToast(message) {
      calls.push(`toast:${message}`);
    },
    reportAppError() {},
    requestFolderPermission() {
      return Promise.resolve(false);
    },
    ensureUniverseFolders() {
      return Promise.resolve(null);
    },
    ensureWormholesFolderReadyForDestructiveSync() {
      return Promise.resolve(true);
    },
    deleteFolderBackedRecordFile() {
      return Promise.resolve();
    },
    pruneWormholesFolderToAppState() {
      return Promise.resolve();
    },
    writeBlobToFolder() {
      return Promise.resolve();
    },
    folderMigrationFileName() {
      return Promise.resolve("entry.docx");
    },
    createDocxBlobFromTextAndImages() {
      return Promise.resolve(new Blob(["doc"]));
    },
    linkedVisionRowsForCreationDocx() {
      return [];
    },
    docxImagesFromVisionRows() {
      return Promise.resolve({images: [], unavailable: []});
    },
    htmlToPlainText(value) {
      return String(value || "").replace(/<[^>]+>/g, "");
    },
    getVisionItemFromUniverse() {
      return null;
    },
    visionItemDisplaySrc() {
      return Promise.resolve("");
    },
    rememberFolderSaveFailure() {},
    renderCurrent() {},
    closeMenus() {},
    closeTitleModal() {},
  };
  context.globalThis = context;
  context.window = context;
  context.WormholesUndo = {
    captureState() {
      calls.push("capture-undo");
      return {snapshot: true};
    },
    offer(payload) {
      offers.push(payload);
      calls.push(`undo:${payload.message}`);
      return Promise.resolve(true);
    },
  };

  vm.createContext(context);
  vm.runInContext(archiveSource, context, {filename: "scripts/archive.js"});

  // Replace UI-heavy and cross-store functions with focused spies after declarations load.
  context.renderArchive = () => calls.push("render-archive");
  context.renderWormholesMap = () => calls.push("render-map");
  context.renderConnectionsMap = () => calls.push("render-connections-map");
  context.closeGroupModal = () => calls.push("close-group");
  context.writeArchiveEntryToFolderIfNeeded = () => {
    calls.push("write-group-file");
    return Promise.resolve(true);
  };
  context.removeExternalReferencesToGroup = (groupId) => cleanupGroups.push(groupId);
  context.removeGroupRelationshipNotes = (groupId) => cleanupNotes.push(groupId);
  context.cleanupLinksToDeletedEntity = (_universeId, entityId) => cleanedEntityIds.push(entityId);

  return {context, element, calls, offers, cleanupGroups, cleanupNotes, cleanedEntityIds};
}

function creation(id, title = id) {
  return {id, title, what: {val: "Creation"}, connections: [], bridges: [], notes: []};
}

function archiveGroup(id, childIds, title = id) {
  return {
    id,
    title,
    kind: "group",
    what: {val: "Group"},
    attr1: {val: "Grouped creations"},
    attr2: {val: `${childIds.length} grouped items`},
    pressure: {val: "Grouped"},
    groupIds: [...childIds],
    connections: [],
    bridges: [],
    notes: [],
  };
}

function createLiteratureHarness() {
  const elements = new Map();
  const calls = [];
  const offers = [];
  let idCounter = 0;

  function element(id) {
    if (!elements.has(id)) elements.set(id, createElement(id));
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
    setTimeout(fn) {
      if (typeof fn === "function") fn();
      return 1;
    },
    clearTimeout() {},
    currentUniverseId: "u1",
    universes: [{id: "u1", title: "Alpha"}],
    literatureEntries: [],
    archiveEntries: [],
    activeGroupEntryId: null,
    activeGroupMode: "create",
    activeGroupContext: "literature",
    activeLiteratureId: null,
    activeLiteratureTagId: null,
    literatureFolderHandle: null,
    localFoldersEnabled: false,
    document: {
      getElementById: element,
      querySelectorAll(selector) {
        if (selector === "#groupCreationList .group-choice.selected") {
          return context.__selectedIds.map((id) => ({dataset: {entryId: id}}));
        }
        return [];
      },
      createElement() {
        const created = createElement("created");
        Object.defineProperty(created, "innerHTML", {
          get() {
            return this.__html || "";
          },
          set(value) {
            this.__html = String(value || "");
            this.textContent = this.__html.replace(/<[^>]+>/g, " ");
            this.innerText = this.textContent;
          },
        });
        return created;
      },
    },
    window: {},
    __selectedIds: [],
    __saveResult: true,
    uniqueList(list) {
      return Array.from(new Set((list || []).filter(Boolean)));
    },
    selectedGroupChoiceIds() {
      return [...context.__selectedIds];
    },
    tagEntryKey(universeId, entryId) {
      return `${universeId}::${entryId}`;
    },
    makeId() {
      idCounter += 1;
      return `literature-group-${idCounter}`;
    },
    escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;");
    },
    getCurrentUniverse() {
      return context.universes[0];
    },
    getUniverseTitle() {
      return "Alpha";
    },
    requestStorageFootnoteUpdate() {},
    scheduleLiteratureLargeDataSave() {
      return Promise.resolve(true);
    },
    writeLiteratureMetadataOnly() {
      return context.__saveResult;
    },
    sanitizeLiteratureHtml(value) {
      return String(value || "");
    },
    reportAppError() {},
    showSavedToast(message) {
      calls.push(`toast:${message}`);
    },
    ensureWormholesFolderReadyForDestructiveSync() {
      return Promise.resolve(true);
    },
    ensureUniverseFolders() {
      return Promise.resolve(null);
    },
    deleteFolderBackedRecordFile() {
      return Promise.resolve();
    },
    deleteLargeDataValue() {
      return Promise.resolve(true);
    },
    pruneWormholesFolderToAppState() {
      return Promise.resolve();
    },
    refreshLiteratureLinkDisplays() {
      calls.push("refresh-literature");
    },
    renderArchive() {},
    renderConnectionsMap() {},
    renderWormholesMap() {},
    closeMenus() {},
    closeLiteratureViewer() {},
    closeVisionRenameModal() {},
    closeMapViewsForLiteratureJump() {},
    switchTab() {},
    protectAllControls() {},
    applyContextualActionAriaLabels() {},
    togglePositionedMenu() {},
    setDestructiveButtonVisibility() {},
    formatFileSize() {
      return "";
    },
    truncatePreview(value) {
      return value;
    },
    requestAnimationFrame(fn) {
      if (typeof fn === "function") fn();
    },
  };
  context.globalThis = context;
  context.window = context;
  context.WormholesUndo = {
    captureState() {
      calls.push("capture-undo");
      return {snapshot: true};
    },
    offer(payload) {
      offers.push(payload);
      calls.push(`undo:${payload.message}`);
      return Promise.resolve(true);
    },
  };

  vm.createContext(context);
  vm.runInContext(literatureSource, context, {filename: "scripts/literature.js"});

  context.saveLiteratureToStorage = () => {
    calls.push("save-literature");
    return context.__saveResult
      ? {ok: true, code: "ok"}
      : {
          ok: false,
          code: "storage_unavailable",
          userMessage: "Could not save your changes. Try again.",
        };
  };
  context.refreshLiteratureLinkDisplays = () => calls.push("refresh-literature");
  context.closeGroupModal = () => calls.push("close-group");
  context.showSavedToast = (message) => calls.push(`toast:${message}`);
  context.deleteLargeDataValue = () => Promise.resolve(true);
  context.pruneWormholesFolderToAppState = () => Promise.resolve(true);

  return {context, element, calls, offers};
}

function literatureDoc(id, tags = {}) {
  return {
    id,
    title: id,
    content: `<p>${id}</p>`,
    fileType: "text",
    fileSize: 10,
    tags: {universes: [...(tags.universes || [])], entries: [...(tags.entries || [])]},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function literatureGroup(id, childIds, tags = {}) {
  return {
    id,
    title: id,
    kind: "literatureGroup",
    fileType: "group",
    content: "",
    groupIds: [...childIds],
    tags: {universes: [...(tags.universes || [])], entries: [...(tags.entries || [])]},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

(async () => {
  // Archive grouping is one atomic multi-item save.
  {
    const {context, element, calls} = createArchiveHarness();
    context.archiveEntries = [creation("a"), creation("b"), creation("c")];
    context.activeGroupEntryId = "a";
    context.__selectedIds = ["b", "c", "b"];
    element("groupTitleInput").value = "Three Together";

    await context.createGroupFromModal();

    const group = context.archiveEntries.find(context.isGroupEntry);
    assert.ok(group, "creating a group should add one group record");
    assert.strictEqual(group.title, "Three Together");
    assert.deepStrictEqual(
      Array.from(group.groupIds),
      ["a", "b", "c"],
      "group members should be unique and preserve selected order",
    );
    assert.strictEqual(
      calls.filter((call) => call === "save-archive").length,
      1,
      "group creation should persist once",
    );
    assert.ok(calls.includes("write-group-file"));
    assert.ok(calls.includes("close-group"));
  }

  // A failed group creation must restore every selected item and keep the editor open.
  {
    const {context, element, calls} = createArchiveHarness();
    const original = [creation("a"), creation("b"), creation("c")];
    context.archiveEntries = clone(original);
    context.activeGroupEntryId = "a";
    context.__selectedIds = ["b", "c"];
    context.__saveResult = false;
    element("groupTitleInput").value = "Should Not Persist";

    await context.createGroupFromModal();

    assert.strictEqual(JSON.stringify(context.archiveEntries), JSON.stringify(original));
    assert.ok(!calls.includes("close-group"), "failed creation should keep the group modal open");
    assert.ok(!calls.includes("write-group-file"), "failed creation should not sync a group file");
  }

  // Editing can move several members and dissolve a source group only after persistence succeeds.
  {
    const {context, element, calls, offers, cleanupGroups, cleanupNotes} = createArchiveHarness();
    context.archiveEntries = [
      archiveGroup("g1", ["a", "b"]),
      creation("a"),
      creation("b"),
      archiveGroup("g2", ["c", "d", "e"]),
      creation("c"),
      creation("d"),
      creation("e"),
    ];
    context.activeGroupEntryId = "g1";
    context.__selectedIds = ["a", "c", "d"];
    element("groupTitleInput").value = "Reassigned Group";

    context.saveEditedGroupFromModal();

    const group = context.archiveEntries.find((item) => item.id === "g1");
    assert.deepStrictEqual(Array.from(group.groupIds), ["a", "c", "d"]);
    assert.ok(
      !context.archiveEntries.some((item) => item.id === "g2"),
      "a source group with fewer than two members should dissolve",
    );
    assert.deepStrictEqual(cleanupGroups, ["g2"]);
    assert.deepStrictEqual(cleanupNotes, ["g2"]);
    assert.strictEqual(calls.filter((call) => call === "save-archive").length, 1);
    assert.strictEqual(offers[0]?.message, "Group memberships updated");
  }

  // Failed multi-group edits must not partially move members or clean external references.
  {
    const {context, element, calls, offers, cleanupGroups} = createArchiveHarness();
    const original = [
      archiveGroup("g1", ["a", "b"]),
      creation("a"),
      creation("b"),
      archiveGroup("g2", ["c", "d", "e"]),
      creation("c"),
      creation("d"),
      creation("e"),
    ];
    context.archiveEntries = clone(original);
    context.activeGroupEntryId = "g1";
    context.__selectedIds = ["a", "c", "d"];
    context.__saveResult = false;
    element("groupTitleInput").value = "Failed Reassignment";

    context.saveEditedGroupFromModal();

    assert.strictEqual(JSON.stringify(context.archiveEntries), JSON.stringify(original));
    assert.deepStrictEqual(cleanupGroups, []);
    assert.deepStrictEqual(offers, []);
    assert.ok(!calls.includes("close-group"));
  }

  // Ungrouping should preserve children, support Undo, and delay cross-store cleanup until the save succeeds.
  {
    const {context, offers, cleanupGroups, cleanupNotes} = createArchiveHarness();
    context.archiveEntries = [archiveGroup("g", ["a", "b"]), creation("a"), creation("b")];
    context.ungroupEntry("g");
    assert.deepStrictEqual(ids(context.archiveEntries), ["a", "b"]);
    assert.deepStrictEqual(cleanupGroups, ["g"]);
    assert.deepStrictEqual(cleanupNotes, ["g"]);
    assert.strictEqual(offers[0]?.message, "Group removed");
  }
  {
    const {context, cleanupGroups, cleanupNotes, offers} = createArchiveHarness();
    const original = [archiveGroup("g", ["a", "b"]), creation("a"), creation("b")];
    context.archiveEntries = clone(original);
    context.connectSourceId = "g";
    context.selectedMapNodeId = "g";
    context.__saveResult = false;
    context.ungroupEntry("g");
    assert.strictEqual(JSON.stringify(context.archiveEntries), JSON.stringify(original));
    assert.strictEqual(context.connectSourceId, "g");
    assert.strictEqual(context.selectedMapNodeId, "g");
    assert.deepStrictEqual(cleanupGroups, []);
    assert.deepStrictEqual(cleanupNotes, []);
    assert.deepStrictEqual(offers, []);
  }

  // Bulk cleanup removes every requested item, dissolves undersized groups, and clears relationships once per item.
  {
    const {context, cleanupGroups, cleanedEntityIds} = createArchiveHarness();
    context.archiveEntries = [
      archiveGroup("g", ["a", "b", "c"]),
      {...creation("a"), connections: ["b", "x"]},
      {...creation("b"), connections: ["a", "x"]},
      {...creation("c"), connections: ["a", "b"]},
      {...creation("x"), connections: ["a", "b", "c"]},
    ];
    context.cleanupConnectionsForRemovedEntries(["a", "b", "a"]);
    assert.deepStrictEqual(ids(context.archiveEntries), ["c", "x"]);
    assert.deepStrictEqual(
      Array.from(context.archiveEntries.find((item) => item.id === "x").connections),
      ["c"],
    );
    assert.deepStrictEqual(cleanupGroups, ["g"]);
    assert.deepStrictEqual(cleanedEntityIds.sort(), ["a", "b"]);
  }

  // Literature group creation has the same failure-atomic multi-item behavior.
  {
    const {context, element, calls} = createLiteratureHarness();
    context.literatureEntries = [
      literatureDoc("a", {universes: ["u1"]}),
      literatureDoc("b", {universes: ["u2"]}),
      literatureDoc("c", {universes: ["u3"]}),
    ];
    context.activeGroupEntryId = "a";
    context.__selectedIds = ["b", "c", "b"];
    element("groupTitleInput").value = "Literature Set";

    context.createLiteratureGroupFromModal();

    const group = context.literatureEntries.find(context.isLiteratureGroup);
    assert.deepStrictEqual(Array.from(group.groupIds), ["a", "b", "c"]);
    assert.deepStrictEqual(Array.from(group.tags.universes).sort(), ["u1", "u2", "u3"]);
    assert.strictEqual(calls.filter((call) => call === "save-literature").length, 1);
  }
  {
    const {context, element, calls} = createLiteratureHarness();
    const original = [literatureDoc("a"), literatureDoc("b"), literatureDoc("c")];
    context.literatureEntries = clone(original);
    context.activeGroupEntryId = "a";
    context.__selectedIds = ["b", "c"];
    context.__saveResult = false;
    element("groupTitleInput").value = "Failed Literature Set";
    context.createLiteratureGroupFromModal();
    assert.strictEqual(JSON.stringify(context.literatureEntries), JSON.stringify(original));
    assert.ok(!calls.includes("close-group"));
  }

  // Literature group edits can move many members, dissolve an undersized source group, and remain atomic on failure.
  {
    const {context, element, offers} = createLiteratureHarness();
    context.literatureEntries = [
      literatureGroup("g1", ["a", "b"]),
      literatureDoc("a"),
      literatureDoc("b"),
      literatureGroup("g2", ["c", "d", "e"]),
      literatureDoc("c"),
      literatureDoc("d"),
      literatureDoc("e"),
    ];
    context.activeGroupEntryId = "g1";
    context.__selectedIds = ["a", "c", "d"];
    element("groupTitleInput").value = "Merged Literature";
    context.saveEditedLiteratureGroupFromModal();
    assert.deepStrictEqual(
      Array.from(context.literatureEntries.find((item) => item.id === "g1").groupIds),
      ["a", "c", "d"],
    );
    assert.ok(!context.literatureEntries.some((item) => item.id === "g2"));
    assert.strictEqual(offers[0]?.message, "Literature group updated");
  }
  {
    const {context, element, offers, calls} = createLiteratureHarness();
    const original = [
      literatureGroup("g1", ["a", "b"]),
      literatureDoc("a"),
      literatureDoc("b"),
      literatureGroup("g2", ["c", "d", "e"]),
      literatureDoc("c"),
      literatureDoc("d"),
      literatureDoc("e"),
    ];
    context.literatureEntries = clone(original);
    context.activeGroupEntryId = "g1";
    context.__selectedIds = ["a", "c", "d"];
    context.__saveResult = false;
    element("groupTitleInput").value = "Failed Literature Merge";
    context.saveEditedLiteratureGroupFromModal();
    assert.strictEqual(JSON.stringify(context.literatureEntries), JSON.stringify(original));
    assert.deepStrictEqual(offers, []);
    assert.ok(!calls.includes("close-group"));
  }

  // Ungrouping Literature is failure-atomic and preserves the selected group when persistence fails.
  {
    const {context, offers} = createLiteratureHarness();
    context.literatureEntries = [
      literatureGroup("g", ["a", "b"]),
      literatureDoc("a"),
      literatureDoc("b"),
    ];
    context.activeLiteratureId = "g";
    context.activeLiteratureTagId = "g";
    context.ungroupLiteratureGroup("g");
    assert.deepStrictEqual(ids(context.literatureEntries), ["a", "b"]);
    assert.strictEqual(context.activeLiteratureId, null);
    assert.strictEqual(context.activeLiteratureTagId, null);
    assert.strictEqual(offers[0]?.message, "Literature group removed");
  }
  {
    const {context, offers} = createLiteratureHarness();
    const original = [literatureGroup("g", ["a", "b"]), literatureDoc("a"), literatureDoc("b")];
    context.literatureEntries = clone(original);
    context.activeLiteratureId = "g";
    context.activeLiteratureTagId = "g";
    context.__saveResult = false;
    context.ungroupLiteratureGroup("g");
    assert.strictEqual(JSON.stringify(context.literatureEntries), JSON.stringify(original));
    assert.strictEqual(context.activeLiteratureId, "g");
    assert.strictEqual(context.activeLiteratureTagId, "g");
    assert.deepStrictEqual(offers, []);
  }

  // Deleting one grouped Literature document updates all affected members in the same save.
  {
    const {context, offers, calls} = createLiteratureHarness();
    context.literatureEntries = [
      literatureGroup("g", ["a", "b"]),
      literatureDoc("a"),
      literatureDoc("b"),
    ];
    await context.deleteLiteratureDoc("a");
    assert.deepStrictEqual(
      ids(context.literatureEntries),
      ["b"],
      "a two-document group should dissolve when one child is deleted",
    );
    assert.strictEqual(calls.filter((call) => call === "save-literature").length, 1);
    assert.strictEqual(offers[0]?.message, "Document deleted");
  }
  {
    const {context} = createLiteratureHarness();
    context.literatureEntries = [
      literatureGroup("g", ["a", "b", "c"]),
      literatureDoc("a"),
      literatureDoc("b"),
      literatureDoc("c"),
    ];
    await context.deleteLiteratureDoc("a");
    assert.deepStrictEqual(
      Array.from(context.literatureEntries.find((item) => item.id === "g").groupIds),
      ["b", "c"],
    );
  }
  {
    const {context, offers, calls} = createLiteratureHarness();
    const original = [literatureGroup("g", ["a", "b"]), literatureDoc("a"), literatureDoc("b")];
    context.literatureEntries = clone(original);
    context.activeLiteratureId = "a";
    context.__saveResult = false;
    await context.deleteLiteratureDoc("a");
    assert.strictEqual(JSON.stringify(context.literatureEntries), JSON.stringify(original));
    assert.strictEqual(context.activeLiteratureId, "a");
    assert.deepStrictEqual(offers, []);
    assert.ok(!calls.includes("refresh-literature"));
  }

  console.log("group-bulk-operation-regressions.unit.js passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
