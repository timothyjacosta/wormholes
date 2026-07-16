import {
  cloneLiteratureCollection,
  runLiteraturePersistenceTransaction,
} from "./literature-persistence-helpers.mjs";

/* Wormholes Beta 110 literature module. Split from the original single-file build. */

import {controllerServices, registerControllerServices} from "./controller-service-registry.mjs";
import {
  LITERATURE_PAGE_SIZE,
  getLiteraturePage,
  setLiteraturePage,
  resetLiteraturePage,
  scrollLiteraturePageToTop,
  renderLiteraturePagination,
  defaultLiteratureFilterState,
  getLiteratureFilterState,
  literatureFilterActiveCount,
  getLiteratureSortMode,
  setLiteratureSortMode,
  literatureSortModeLabel,
  literatureItemHasTags,
  literatureItemHasContent,
  literatureItemMatchesStatus,
  literatureGroupOptions,
  sanitizeLiteratureFilterState,
  buildLiteratureViewPlan,
  literatureSortTimestamp,
  literatureSortComparator,
  sortLiteratureViewPlan,
  syncLiteratureViewControls,
  setLiteratureFilterPanelOpen,
  toggleLiteratureFilterPanel,
  closeLiteratureFilterPanel,
  applyLiteratureFiltersFromControls,
  resetLiteratureFilters,
  setLiteratureSortPanelOpen,
  toggleLiteratureSortPanel,
  closeLiteratureSortPanel,
  applyLiteratureSortFromControl,
  resetLiteratureSort,
  applyLiteratureEntryActionLabels,
} from "./literature-view-helpers.mjs";
import {
  openLiteratureGroupModal,
  openEditLiteratureGroupModal,
  createLiteratureGroupFromModal,
  saveEditedLiteratureGroupFromModal,
  ungroupLiteratureGroup,
} from "./literature-group-helpers.mjs";
import {
  normalizeLiteratureTags,
  mergeLiteratureTags,
  literatureGroupTagUnion,
  normalizeLiteratureGroups,
  literaturePlainPreview,
  escapeLiteratureUploadText,
  literatureFileKind,
  literatureFileTypeLabel,
  sanitizeLiteratureHtml,
  plainTextToLiteratureHtml,
  convertUploadedFileToLiterature,
  buildCanonicalLiteratureRecord,
} from "./literature-content-helpers.mjs";

const literatureExpandedGroupIds = new Set();
const LITERATURE_AUTOSAVE_DELAY_MS = 1500;
let literatureAutosaveTimer = null;
let literatureSaveQueue = Promise.resolve();
let literatureEditorChangeVersion = 0;
let literatureEditorSavedVersion = 0;
let literatureFolderSyncPending = false;
let literatureEditorSessionUniverseId = null;
let literatureEditorClosing = false;

/* Archive module: moved renderSummary() to scripts/archive.js. */

/* Archive module: moved openSummaryModal() to scripts/archive.js. */

/* Archive module: moved closeSummaryModal() to scripts/archive.js. */

/* Archive module: moved saveSummaryText() to scripts/archive.js. */

/* Archive module: moved deleteSummaryText() to scripts/archive.js. */

/* Archive module: moved cleanNoteText() to scripts/archive.js. */

/* Archive module: moved cleanNotesArray() to scripts/archive.js. */

/* Archive module: moved normalizeArchiveNotes() to scripts/archive.js. */

/* Archive module: moved renderEditNotesList() to scripts/archive.js. */

/* Archive module: moved getEditNotesFromList() to scripts/archive.js. */

/* Archive module: moved saveEditNotesOnly() to scripts/archive.js. */

/* Archive module: moved openEditAddNoteModal() to scripts/archive.js. */

/* Archive module: moved renderNotes() to scripts/archive.js. */

/* Archive module: moved openNoteModal() to scripts/archive.js. */

/* Archive module: moved closeNoteModal() to scripts/archive.js. */

/* Archive module: moved saveNoteText() to scripts/archive.js. */

/* Archive module: moved renderBridges() to scripts/archive.js. */

/* Archive module: moved renderConnections() to scripts/archive.js. */

/* Archive module: moved renderGroupChoiceList() to scripts/archive.js. */

/* Archive module: moved openGroupModal() to scripts/archive.js. */

/* Archive module: moved openEditGroupModal() to scripts/archive.js. */

/* Archive module: moved closeGroupModal() to scripts/archive.js. */

/* Archive module: moved selectedGroupChoiceIds() to scripts/archive.js. */

/* Archive module: moved saveGroupModal() to scripts/archive.js. */

/* Archive module: moved createGroupFromModal() to scripts/archive.js. */

/* Archive module: moved saveEditedGroupFromModal() to scripts/archive.js. */

function literatureContentStoreKeyFor(universeId, docId) {
  return `literature:${universeId || currentUniverseId || "none"}:${docId}:content`;
}

function literatureMetadataStorageKeyFor(universeId = currentUniverseId) {
  return literatureStorageKey(universeId);
}

function trimLiteratureDocForLocalStorage(doc, universeId = currentUniverseId) {
  const contentStoreKey =
    doc.contentStoreKey || (doc.id ? literatureContentStoreKeyFor(universeId, doc.id) : "");
  const indexedContentReady = !!(doc.contentStored === "indexedDB" && contentStoreKey);

  // Beta 47: keep a portable HTML body in app metadata as a backup copy.
  // Beta 37 moved literature bodies to IndexedDB, but real-world regression tests showed
  // the title metadata could survive while the body text became unavailable during JSON
  // export/import or local-folder rebuilds. Literature text is critical user data, so the
  // metadata copy is now authoritative fallback data; IndexedDB remains a secondary large-data cache.
  const safeContent = isLiteratureGroup(doc) ? "" : sanitizeLiteratureHtml(doc.content || "");
  const hasPortableContent = !!literaturePlainPreview(safeContent);

  return {
    ...doc,
    content: safeContent,
    fileData: "",
    contentStoreKey: indexedContentReady
      ? contentStoreKey
      : doc.contentStoreKey || contentStoreKey || "",
    contentStored: indexedContentReady
      ? "indexedDB"
      : hasPortableContent
        ? "pending-indexedDB"
        : doc.contentStored || "",
  };
}

function normalizeLiteraturePersistenceResult(result) {
  if (result && typeof result === "object" && typeof result.ok === "boolean") return result;
  return result
    ? {ok: true, code: "ok"}
    : {
        ok: false,
        code: "storage_unavailable",
        userMessage: "Could not save this document. Try again.",
        recoverable: true,
      };
}

function writeLiteratureMetadataOnly(universeId, docs) {
  // The repository write schema intentionally requires the complete canonical Literature shape.
  // Normalize every candidate again at the persistence boundary so drafts, uploads, imports, and
  // future feature paths cannot accidentally persist partial records.
  const canonicalDocs = (docs || []).map((doc) => normalizeLiteratureDoc(doc, universeId));
  const prepared = canonicalDocs.map((doc) => trimLiteratureDocForLocalStorage(doc, universeId));
  const repository =
    typeof wormholesRepository === "function" ? wormholesRepository("literature") : null;
  const result = repository
    ? repository.save(universeId, prepared)
    : saveLocalStorageJson(
        literatureMetadataStorageKeyFor(universeId),
        prepared,
        "Could not save document details to app storage",
        "Document details could not be saved.",
      );
  return normalizeLiteraturePersistenceResult(result);
}

async function persistLiteratureLargeData(universeId, doc) {
  if (!doc || !doc.id || isLiteratureGroup(doc)) return doc;
  const key = doc.contentStoreKey || literatureContentStoreKeyFor(universeId, doc.id);
  if (
    await persistLargeDataValue(
      key,
      sanitizeLiteratureHtml(doc.content || ""),
      "literature content",
    )
  ) {
    doc.contentStoreKey = key;
    doc.contentStored = "indexedDB";
  }
  return doc;
}

function scheduleLiteratureLargeDataSave(universeId, docs) {
  if (!largeDataStoreAvailable()) {
    if ((docs || []).some((doc) => doc?.content && doc.content.length > 100000)) {
      reportAppError(
        "IndexedDB is unavailable for large literature storage",
        new Error("IndexedDB unavailable"),
        {
          userMessage: "Large literature is using app-only fallback storage in this browser.",
        },
      );
    }
    return Promise.resolve(false);
  }
  const pending = (docs || []).filter((doc) => doc?.content && doc.contentStored !== "indexedDB");
  if (!pending.length) return Promise.resolve(true);
  return Promise.all(pending.map((doc) => persistLiteratureLargeData(universeId, doc)))
    .then(() => writeLiteratureMetadataOnly(universeId, docs))
    .catch((e) => {
      reportAppError("Could not move literature content out of localStorage", e, {
        userMessage: "Large literature storage needs attention.",
      });
      return false;
    });
}

async function materializeLiteratureDocForUniverse(doc, universeId = currentUniverseId) {
  if (!doc) return null;
  if (isLiteratureGroup(doc)) return doc;

  const candidateKeys = controllerServices.uniqueList([
    doc.contentStoreKey,
    doc.id ? literatureContentStoreKeyFor(universeId, doc.id) : "",
  ]);

  if (!doc.content) {
    for (const key of candidateKeys) {
      const content = await loadLargeDataValue(key, "literature content");
      if (content) {
        doc.content = sanitizeLiteratureHtml(content);
        doc.contentStoreKey = key;
        doc.contentStored = "indexedDB";
        break;
      }
    }
  }

  return doc;
}

async function hydrateLiteratureEntriesFromLargeDataStore(universeId = currentUniverseId) {
  if (!largeDataStoreAvailable() || !universeId || universeId !== currentUniverseId) return;
  let changed = false;
  for (const doc of literatureEntries) {
    if (!doc.content && doc.contentStoreKey) {
      const content = await loadLargeDataValue(doc.contentStoreKey, "literature content");
      if (content) {
        doc.content = sanitizeLiteratureHtml(content);
        doc.contentStored = "indexedDB";
        changed = true;
      }
    }
  }
  if (changed && universeId === currentUniverseId) {
    writeLiteratureMetadataOnly(universeId, literatureEntries);
    renderLiteratureList?.();
    refreshLiteratureLinkDisplays?.();
  }
}

function loadLiteratureFromStorage() {
  if (!currentUniverseId) {
    literatureEntries = [];
    window.WormholesAppModel?.replace?.("literature", literatureEntries, {
      source: "persistence",
      reason: "clear literature",
    });
    return;
  }

  try {
    literatureEntries =
      (typeof wormholesRepository === "function" ? wormholesRepository("literature") : null)?.read(
        currentUniverseId,
        [],
      ) ?? readPersistedDatasetData(literatureStorageKey(), oldLiteratureStorageKey(), []);
  } catch (e) {
    literatureEntries = [];
    reportAppError("Could not load document details from app storage", e, {
      userMessage: "Document details could not be loaded.",
    });
  }

  normalizeLiteratureEntries();
  window.WormholesAppModel?.replace?.("literature", literatureEntries, {
    source: "persistence",
    reason: "load literature",
  });
  scheduleLiteratureLargeDataSave(currentUniverseId, literatureEntries);
  hydrateLiteratureEntriesFromLargeDataStore(currentUniverseId);
}

function normalizeLiteratureDoc(doc, universeId = currentUniverseId) {
  return buildCanonicalLiteratureRecord(doc, universeId, {
    idFactory: typeof makeId === "function" ? makeId : undefined,
    contentStoreKeyFor: literatureContentStoreKeyFor,
    normalizeTags: normalizeLiteratureTags,
  });
}

function normalizeLiteratureEntries() {
  literatureEntries = (literatureEntries || []).map((doc) =>
    normalizeLiteratureDoc(doc, currentUniverseId),
  );
  literatureEntries =
    window.WormholesRenderValidation?.validateLiterature?.(literatureEntries, {
      storageKey: literatureStorageKey(),
      universeId: currentUniverseId,
      releaseProtection: true,
    })?.value || literatureEntries;
  normalizeLiteratureGroups();
  literatureEntries =
    window.WormholesRenderValidation?.validateLiterature?.(literatureEntries, {
      storageKey: literatureStorageKey(),
      universeId: currentUniverseId,
      report: false,
    })?.value || literatureEntries;
}

function saveLiteratureToStorage(options = {}) {
  if (!currentUniverseId) return {ok: true, code: "ok"};

  const result = writeLiteratureMetadataOnly(currentUniverseId, literatureEntries);
  if (!result.ok) return result;

  window.WormholesAppModel?.replace?.("literature", literatureEntries, {
    source: "persistence",
    reason: "save literature",
  });
  if (!options.skipLargeData) scheduleLiteratureLargeDataSave(currentUniverseId, literatureEntries);
  requestStorageFootnoteUpdate();
  return result;
}

async function persistLiteratureCollectionTransaction(universeId, candidateEntries, options = {}) {
  return runLiteraturePersistenceTransaction({
    universeId,
    candidateEntries,
    previousEntries: options.previousEntries,
    operation: options.operation,
    normalizeDoc: normalizeLiteratureDoc,
    isGroup: isLiteratureGroup,
    largeDataAvailable: largeDataStoreAvailable,
    contentKey: literatureContentStoreKeyFor,
    sanitize: sanitizeLiteratureHtml,
    loadLarge: (key) =>
      typeof loadLargeDataValue === "function"
        ? loadLargeDataValue(key, "literature content")
        : Promise.resolve(""),
    persistLarge: (key, value) => persistLargeDataValue(key, value, "literature content"),
    deleteLarge: (key) =>
      typeof deleteLargeDataValue === "function"
        ? deleteLargeDataValue(key)
        : Promise.resolve(false),
    writeMetadata: writeLiteratureMetadataOnly,
    normalizeResult: normalizeLiteraturePersistenceResult,
    transactionApi: window.WormholesTransactionalPersistence,
    validate(candidates, scope) {
      const result = window.WormholesPersistedSchema?.validate?.("literature", candidates, {
        mode: "write",
        scope,
      });
      if (result && !result.ok) throw window.WormholesPersistedSchema.errorFor(result);
      return true;
    },
    commitRuntime: options.commitRuntime,
    restoreRuntime: options.restoreRuntime,
  });
}

async function writeLiteratureDocToFolder(doc, content = doc?.content || "") {
  return await writeLiteratureDocToSpecificFolder(doc, literatureFolderHandle, content);
}

function literatureContentToFolderText(content) {
  return plainTextToFolderText(htmlToPlainText(content || ""));
}

function folderTextToLiteratureContent(text) {
  return plainTextToLiteratureHtml(String(text || ""));
}

function sourceLiteratureTextToFolderText(text, fileName = "") {
  const isHtml =
    /\.html?$/i.test(fileName) || /<\s*(html|body|p|div|br|h1|h2|h3)[\s>]/i.test(text || "");
  return isHtml
    ? literatureContentToFolderText(extractBodyFromSavedHtml(text))
    : plainTextToFolderText(text);
}

function sourceLiteratureTextToAppContent(text, fileName = "") {
  const isHtml =
    /\.html?$/i.test(fileName) || /<\s*(html|body|p|div|br|h1|h2|h3)[\s>]/i.test(text || "");
  return isHtml
    ? sanitizeLiteratureHtml(extractBodyFromSavedHtml(text))
    : folderTextToLiteratureContent(text);
}

async function materializeLiteratureDoc(doc) {
  if (!doc) return null;
  if (isLiteratureGroup(doc)) return doc;

  await materializeLiteratureDocForUniverse(doc, currentUniverseId);

  if (doc.storage === "folder" && !doc.content) {
    if (
      !literatureFolderHandle ||
      !(await controllerServices.requestFolderPermission(literatureFolderHandle))
    ) {
      return doc;
    }

    try {
      if (/\.docx$/i.test(doc.folderFileName || "")) {
        doc.content =
          "<p>This literature document is stored as a DOCX file in the local folder. Its editable text is kept in the app when available.</p>";
      } else {
        const text = await controllerServices.readTextFromFolderFile(
          literatureFolderHandle,
          doc.folderFileName,
        );
        doc.content = sourceLiteratureTextToAppContent(text, doc.folderFileName);
      }
    } catch (e) {
      doc.content = "<p>This literature file is missing from its local folder.</p>";
    }
  }

  return doc;
}

async function syncLiteratureFolderEntries() {
  // Folder deletion is not auto-applied to app metadata.
  // This prevents backup/switch-folder workflows from erasing literature when a source folder is missing.
  return;
}

async function migrateLiteratureEntriesToFolder() {
  if (
    !literatureFolderHandle ||
    !(await controllerServices.requestFolderPermission(literatureFolderHandle))
  )
    return;

  let changed = false;
  for (const doc of literatureEntries) {
    if (isLiteratureGroup(doc) || doc.storage === "folder") continue;
    await writeLiteratureDocToFolder(doc, doc.content || "<p></p>");
    changed = true;
  }

  if (changed) saveLiteratureToStorage();
}

function getLiteratureDoc(docId) {
  return (
    window.WormholesAppModel?.collections?.findById?.(literatureEntries, docId) ||
    literatureEntries.find((doc) => doc.id === docId) ||
    null
  );
}

function isLiteratureGroup(doc) {
  return (
    !!doc &&
    (doc.kind === "literatureGroup" ||
      doc.fileType === "group" ||
      Array.isArray(doc.groupIds) ||
      Array.isArray(doc.children))
  );
}

function literatureGroupChildIds(doc) {
  if (!isLiteratureGroup(doc)) return [];
  return (
    window.WormholesAppModel?.collections?.groupChildIds?.(doc) ||
    (Array.isArray(doc.groupIds) ? doc.groupIds : Array.isArray(doc.children) ? doc.children : [])
  );
}

function getLiteratureGroupForDocId(docId, docs = literatureEntries) {
  return (
    window.WormholesAppModel?.collections?.groupForChild?.(docs || [], docId, isLiteratureGroup) ||
    (docs || []).find(
      (doc) => isLiteratureGroup(doc) && literatureGroupChildIds(doc).includes(docId),
    ) ||
    null
  );
}

function topLevelLiteratureEntries(docs = literatureEntries) {
  return (
    window.WormholesAppModel?.collections?.topLevelItems?.(docs || [], isLiteratureGroup) ||
    (() => {
      const groupedIds = new Set();
      (docs || []).forEach((doc) => {
        if (isLiteratureGroup(doc))
          literatureGroupChildIds(doc).forEach((id) => groupedIds.add(id));
      });
      return (docs || []).filter((doc) => !groupedIds.has(doc.id));
    })()
  );
}

function literatureGroupChildDocs(group, docs = literatureEntries) {
  return (
    window.WormholesAppModel?.collections?.childItems?.(group, docs || []) ||
    literatureGroupChildIds(group)
      .map((id) => (docs || []).find((doc) => doc.id === id))
      .filter(Boolean)
  );
}

function readLiteratureForUniverse(universeId) {
  if (universeId === currentUniverseId) return literatureEntries;
  try {
    const docs =
      (typeof wormholesRepository === "function" ? wormholesRepository("literature") : null)?.read(
        universeId,
        [],
      ) ??
      readPersistedDatasetData(
        literatureStorageKey(universeId),
        oldLiteratureStorageKey(universeId),
        [],
      );
    const normalized = (docs || []).map((doc) => normalizeLiteratureDoc(doc, universeId));
    return (
      window.WormholesRenderValidation?.validateLiterature?.(normalized, {
        storageKey: literatureStorageKey(universeId),
        universeId,
        report: false,
        releaseProtection: true,
      })?.value || normalized
    );
  } catch (e) {
    reportAppError("Could not load document details for a universe", e);
    return [];
  }
}

function normalizedLiteratureListForUniverse(universeId) {
  const docs = readLiteratureForUniverse(universeId);
  const existingIds = new Set(docs.filter((doc) => !isLiteratureGroup(doc)).map((doc) => doc.id));
  return docs
    .map((doc) => {
      if (!isLiteratureGroup(doc)) return doc;
      const groupIds = controllerServices
        .uniqueList(literatureGroupChildIds(doc))
        .filter((id) => existingIds.has(id) && id !== doc.id);
      return {
        ...doc,
        groupIds,
        tags: literatureGroupTagUnion(groupIds, doc.tags, docs),
      };
    })
    .filter((doc) => !isLiteratureGroup(doc) || literatureGroupChildIds(doc).length >= 2);
}

function allLiteratureEntriesWithHome() {
  const rows = [];
  universes.forEach((universe) => {
    topLevelLiteratureEntries(normalizedLiteratureListForUniverse(universe.id)).forEach((doc) =>
      rows.push({homeUniverseId: universe.id, doc}),
    );
  });
  return rows;
}

function literatureDocsForUniverseTag(universeId) {
  return allLiteratureEntriesWithHome().filter((item) =>
    (item.doc.tags?.universes || []).includes(universeId),
  );
}

function literatureDocsForEntryTag(universeId, entryId) {
  return allLiteratureEntriesWithHome().filter((item) =>
    (item.doc.tags?.entries || []).some(
      (tag) => tag.universeId === universeId && tag.entryId === entryId,
    ),
  );
}

function literatureDocsForUniverseAndEntriesTag(universeId) {
  const seen = new Set();
  const docs = [];

  allLiteratureEntriesWithHome().forEach((item) => {
    const hasUniverseTag = (item.doc.tags?.universes || []).includes(universeId);
    const hasEntryTag = (item.doc.tags?.entries || []).some((tag) => tag.universeId === universeId);

    if (!hasUniverseTag && !hasEntryTag) return;

    const key = `${item.homeUniverseId}:${item.doc.id}`;
    if (seen.has(key)) return;

    seen.add(key);
    docs.push(item);
  });

  return docs;
}

function literatureDocsForGroupChildrenTag(universeId, groupId) {
  const archive =
    universeId === currentUniverseId ? archiveEntries : readArchiveForUniverse(universeId);
  const group = archive.find((entry) => entry.id === groupId);
  if (!controllerServices.isGroupEntry(group)) return [];

  const rows = [];
  const seen = new Set();
  controllerServices.groupChildIds(group).forEach((childId) => {
    literatureDocsForEntryTag(universeId, childId).forEach((item) => {
      const key = `${item.homeUniverseId}:${item.doc.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({
        ...item,
        taggedEntryId: childId,
        taggedEntryTitle: controllerServices.visibleEntryTitleForUniverseEntry(universeId, childId),
      });
    });
  });
  return rows;
}

function literatureCountForUniverseTag(universeId) {
  return literatureDocsForUniverseTag(universeId).length;
}

function literatureCountForUniverseAndEntriesTag(universeId) {
  return literatureDocsForUniverseAndEntriesTag(universeId).length;
}

function literatureCountForEntryTag(universeId, entryId) {
  return literatureDocsForEntryTag(universeId, entryId).length;
}

function literatureCountForGroupChildrenTag(universeId, groupId) {
  return literatureDocsForGroupChildrenTag(universeId, groupId).length;
}

function showLiteratureFolderMessage(text) {
  const list = document.getElementById("literatureList");
  if (!list) return;
  const note = document.createElement("div");
  note.className = "manual-error literature-upload-warning";
  note.textContent = text;
  list.prepend(note);
}

async function connectLiteratureLocalFolder() {
  await chooseLocalFolderFromCheckbox();
}

function literatureBadgeHtml(type, universeId, entryId = "", count = null, size = "normal") {
  const total =
    count ??
    (type === "universe"
      ? literatureCountForUniverseTag(universeId)
      : type === "groupChildren"
        ? literatureCountForGroupChildrenTag(universeId, entryId)
        : literatureCountForEntryTag(universeId, entryId));
  return total > 0
    ? `<button class="literature-link-indicator ${size === "small" ? "small-page" : ""} app-button" data-literature-link-type="${escapeHtml(type)}" data-universe-id="${escapeHtml(universeId)}" data-entry-id="${escapeHtml(entryId)}" type="button" data-app-button="true" aria-label="${total} linked literature file${total === 1 ? "" : "s"}"><span class="literature-page-icon"><span class="literature-page-fold"></span><span class="literature-page-count">${total}</span></span></button>`
    : "";
}

function literatureBadgeSvg(type, universeId, entryId, localX = 0, count = null) {
  const total =
    count ??
    (type === "universe"
      ? literatureCountForUniverseTag(universeId)
      : type === "groupChildren"
        ? literatureCountForGroupChildrenTag(universeId, entryId)
        : literatureCountForEntryTag(universeId, entryId));
  if (total <= 0) return "";
  return `
    <g class="svg-literature-indicator" data-literature-link-type="${escapeHtml(type)}" data-universe-id="${escapeHtml(universeId)}" data-entry-id="${escapeHtml(entryId || "")}" data-badge-local-x="${localX}" transform="${svgBadgeIconTransform(localX)}">
      <path class="svg-literature-page" d="M -12 -15 H 7 L 14 -8 V 15 H -12 Z"></path>
      <path class="svg-literature-fold" d="M 7 -15 V -8 H 14"></path>
      <text x="1" y="6" text-anchor="middle">${total}</text>
    </g>
  `;
}

function renderLiteratureTags(doc) {
  const universeTags = (doc.tags?.universes || [])
    .map((id) => controllerServices.getUniverseTitle(id))
    .filter(Boolean);
  const entryTags = (doc.tags?.entries || [])
    .map((tag) => {
      const archive =
        tag.universeId === currentUniverseId
          ? archiveEntries
          : readArchiveForUniverse(tag.universeId);
      const entry = archive.find((item) => item.id === tag.entryId);
      return entry
        ? `${entry.title} (${controllerServices.getUniverseTitle(tag.universeId)})`
        : null;
    })
    .filter(Boolean);
  const tags = [...universeTags, ...entryTags];
  return tags.length ? tags.join(" · ") : "No tags";
}

async function openLiteratureViewer(docId, homeUniverseId = currentUniverseId) {
  const doc =
    homeUniverseId === currentUniverseId
      ? await materializeLiteratureDoc(getLiteratureDoc(docId))
      : await materializeLiteratureDocForUniverse(
          readLiteratureForUniverse(homeUniverseId).find((item) => item.id === docId),
          homeUniverseId,
        );
  if (!doc) return;

  activeLiteratureId = doc.id;
  activeLiteratureViewerHomeUniverseId = homeUniverseId;
  document.getElementById("literatureViewerTitle").textContent = doc.title;
  const fileSize = formatFileSize(doc.fileSize);
  const homeTitle = controllerServices.getUniverseTitle(homeUniverseId);
  const editButton = document.getElementById("editFromLiteratureViewerBtn");
  const viewerContent = document.getElementById("literatureViewerContent");
  const isGroupViewer = isLiteratureGroup(doc);
  viewerContent?.classList.toggle("literature-group-viewer-content", isGroupViewer);

  if (isGroupViewer) {
    const homeDocs = normalizedLiteratureListForUniverse(homeUniverseId);
    const childDocs = literatureGroupChildIds(doc)
      .map((id) => homeDocs.find((item) => item.id === id))
      .filter(Boolean);
    document.getElementById("literatureViewerMeta").textContent =
      `Literature Group · ${childDocs.length} document${childDocs.length === 1 ? "" : "s"} · Saved in ${homeTitle}`;
    viewerContent.innerHTML = childDocs.length
      ? `<ul class="literature-group-viewer-list">${childDocs
          .map(
            (child) => `
        <li>
          <button class="literature-group-viewer-child app-button" type="button" data-app-button="true" data-doc-id="${escapeHtml(child.id)}" data-home-universe-id="${escapeHtml(homeUniverseId)}">
            <span class="literature-group-viewer-child-title">${escapeHtml(child.title)}</span>
            <span class="literature-group-viewer-child-meta">${escapeHtml(renderLiteratureTags(child))}</span>
          </button>
        </li>
      `,
          )
          .join("")}</ul>`
      : "<p>This literature group is empty.</p>";
    document
      .querySelectorAll("#literatureViewerContent .literature-group-viewer-child")
      .forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openLiteratureViewer(
            button.dataset.docId,
            button.dataset.homeUniverseId || homeUniverseId,
          );
        });
      });
    editButton.textContent = "Edit Group";
  } else {
    document.getElementById("literatureViewerMeta").textContent =
      `${literatureFileTypeLabel(doc)}${fileSize ? ` · ${fileSize}` : ""}${doc.sourceName ? ` · ${doc.sourceName}` : ""} · Saved in ${homeTitle}`;
    viewerContent.innerHTML = sanitizeLiteratureHtml(doc.content || "<p>No text saved.</p>");
    editButton.textContent = "Edit";
  }

  editButton.dataset.docId = doc.id;
  editButton.dataset.homeUniverseId = homeUniverseId;
  document.getElementById("literatureViewerModal").classList.add("open");
}

function closeLiteratureViewer() {
  document.getElementById("literatureViewerModal")?.classList.remove("open");
  document
    .getElementById("literatureViewerContent")
    ?.classList.remove("literature-group-viewer-content");
}

function openLiteratureUploadModal() {
  document.getElementById("literatureUploadModal")?.classList.add("open");
}

function closeLiteratureUploadModal() {
  document.getElementById("literatureUploadModal")?.classList.remove("open");
}

function chooseLiteratureUploadFiles() {
  closeLiteratureUploadModal();
  document.getElementById("literatureFileInput").click();
}

function closeMapViewsForLiteratureJump() {
  document.getElementById("wormholesModal")?.classList.remove("open");
  document.getElementById("bridgeModal")?.classList.remove("open");
  document.getElementById("bridgeNewUniverseModal")?.classList.remove("open");
  document.getElementById("groupConnectionModal")?.classList.remove("open");
  selectedWormholeCreation = null;
  wormholeFocusUniverseId = null;
  selectedMapNodeId = null;
  controllerServices.closeMenus();
}

function loadUniverseForLiteratureEditing(universeId) {
  const universe = universes.find((item) => item.id === universeId);
  if (!universe) return false;

  if (currentUniverseId && typeof controllerServices.persistManualCreateDraft === "function") {
    controllerServices.persistManualCreateDraft({
      universeId: currentUniverseId,
      showStatus: false,
    });
  }
  currentUniverseId = universe.id;

  current = {what: null, attr1: null, attr2: null, pressure: null};
  if (typeof controllerServices.resetCurrentGenerationDiagnostics === "function")
    controllerServices.resetCurrentGenerationDiagnostics();
  connectSourceId = null;
  selectedMapNodeId = null;
  activeConnectionKey = null;

  loadArchiveFromStorage();
  controllerServices.normalizeArchiveNotes();
  loadConnectionNotesFromStorage();
  loadLiteratureFromStorage();
  controllerServices.loadVisionBoardFromStorage();
  restoreFolderHandlesForCurrentUniverse({showPrompt: true});

  document.getElementById("currentUniverseLabel").textContent = universe.title;
  if (typeof controllerServices.restoreManualCreateDraftForCurrentUniverse === "function")
    controllerServices.restoreManualCreateDraftForCurrentUniverse();
  else controllerServices.clearManualCreate();
  renderCurrent();
  controllerServices.renderArchive();
  controllerServices.showAppScreen();
  return true;
}

function openLiteratureEditorForDoc(docId, homeUniverseId = currentUniverseId) {
  if (!docId) return;

  const targetUniverseId = homeUniverseId || currentUniverseId;
  closeLiteratureLinksModal();
  controllerServices.closeVisionLinksModal();
  controllerServices.closeVisionRenameModal();
  closeLiteratureViewer();
  closeMapViewsForLiteratureJump();

  if (targetUniverseId && targetUniverseId !== currentUniverseId) {
    if (!loadUniverseForLiteratureEditing(targetUniverseId)) return;
  } else {
    loadLiteratureFromStorage();
  }

  switchTab("literature");

  const doc = getLiteratureDoc(docId);
  if (!doc) {
    showLiteratureListScreen();
    const error = document.createElement("div");
    error.className = "manual-error literature-upload-warning";
    error.textContent = "That literature file could not be found in this universe.";
    document.getElementById("literatureList")?.prepend(error);
    return;
  }

  showLiteratureEditorScreen(docId);
}

function editActiveLiteratureFromViewer() {
  const editButton = document.getElementById("editFromLiteratureViewerBtn");
  const docId = editButton?.dataset?.docId || activeLiteratureId;
  const homeUniverseId =
    editButton?.dataset?.homeUniverseId ||
    activeLiteratureViewerHomeUniverseId ||
    currentUniverseId;
  const doc =
    homeUniverseId === currentUniverseId
      ? getLiteratureDoc(docId)
      : normalizedLiteratureListForUniverse(homeUniverseId).find((item) => item.id === docId);
  if (isLiteratureGroup(doc)) {
    closeLiteratureViewer();
    if (homeUniverseId && homeUniverseId !== currentUniverseId) {
      if (!loadUniverseForLiteratureEditing(homeUniverseId)) return;
    }
    switchTab("literature");
    openEditLiteratureGroupModal(docId);
    return;
  }
  openLiteratureEditorForDoc(docId, homeUniverseId);
}

function closeLiteratureLinksModal() {
  document.getElementById("literatureLinksModal")?.classList.remove("open");
}

function literatureLinkRowSubtext(item, contextType = "") {
  const allTags = renderLiteratureTags(item.doc);
  const homeTitle = controllerServices.getUniverseTitle(item.homeUniverseId);
  const typeText = isLiteratureGroup(item.doc)
    ? "Literature group"
    : literatureFileTypeLabel(item.doc);
  const tagText =
    allTags && allTags !== "No tags"
      ? `${typeText} · Tags: ${allTags}`
      : `${typeText} · Saved in ${homeTitle}`;

  if (contextType === "groupChildren" && item.taggedEntryTitle) {
    return `Matched child: ${item.taggedEntryTitle} · ${tagText}`;
  }

  return tagText;
}

function openLiteratureLinksModal(type, universeId, entryId = "") {
  const docs =
    type === "universe"
      ? literatureDocsForUniverseTag(universeId)
      : type === "groupChildren"
        ? literatureDocsForGroupChildrenTag(universeId, entryId)
        : literatureDocsForEntryTag(universeId, entryId);

  const title =
    type === "universe"
      ? controllerServices.getUniverseTitle(universeId)
      : type === "groupChildren"
        ? `${controllerServices.visibleEntryTitleForUniverseEntry(universeId, entryId)} children`
        : controllerServices.visibleEntryTitleForUniverseEntry(universeId, entryId);

  document.getElementById("literatureLinksTitle").textContent = `Literature linked to ${title}`;
  document.getElementById("literatureLinksSubtitle").textContent =
    `${docs.length} document${docs.length === 1 ? "" : "s"} tagged here.`;
  document.getElementById("literatureLinksList").innerHTML = docs.length
    ? docs
        .map(
          (item) => `
        <div class="literature-link-row" data-home-universe-id="${escapeHtml(item.homeUniverseId)}" data-doc-id="${escapeHtml(item.doc.id)}" tabindex="0">
          <span class="literature-link-title">${escapeHtml(item.doc.title)}</span>
          <span class="literature-link-meta">${escapeHtml(literatureLinkRowSubtext(item, type))}</span>
        </div>
      `,
        )
        .join("")
    : `<p class="empty-archive">No literature is tagged here yet.</p>`;

  document.getElementById("literatureLinksModal").classList.add("open");

  document.querySelectorAll(".literature-link-row").forEach((row) => {
    const open = () => {
      closeLiteratureLinksModal();
      openLiteratureViewer(row.dataset.docId, row.dataset.homeUniverseId);
    };
    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });

  controllerServices.protectAllControls(document.getElementById("literatureLinksModal"));
}

function refreshLiteratureLinkDisplays() {
  renderLiteratureList();
  controllerServices.renderArchive();

  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    controllerServices.renderConnectionsMap();
  }

  if (document.getElementById("wormholesModal")?.classList.contains("open")) {
    controllerServices.renderWormholesMap();
  }
}

function literatureEditorIsOpen() {
  return !!document.getElementById("literatureEditorScreen")?.classList.contains("active");
}

function literatureEditorHasUnresolvedChanges() {
  if (!literatureEditorIsOpen()) return false;

  const draft = currentLiteratureEditorDraft();
  const statusState = document.getElementById("literatureSaveStatus")?.dataset?.state || "";
  const hasVersionedChanges = literatureEditorChangeVersion > literatureEditorSavedVersion;
  const saveIsUnresolved = statusState === "saving" || statusState === "error";

  if (!hasVersionedChanges && !saveIsUnresolved) return false;

  // Do not warn for a brand-new editor that has been returned to a truly empty state.
  // Existing documents still warn for any unresolved title/body change, including a cleared title.
  if (!activeLiteratureId && !draft.title && !literaturePlainPreview(draft.content)) {
    return saveIsUnresolved;
  }

  return true;
}

function handleLiteratureBeforeUnload(event) {
  if (!literatureEditorHasUnresolvedChanges()) return undefined;
  if (event?.preventDefault) event.preventDefault();
  if (event) event.returnValue = "";
  return "";
}

function setLiteratureSaveStatus(state, text) {
  const status = document.getElementById("literatureSaveStatus");
  if (!status) return;
  status.dataset.state = state || "";
  status.textContent = text || "";
}

function currentLiteratureEditorDraft() {
  const titleInput = document.getElementById("literatureTitleInput");
  const editor = document.getElementById("literatureEditor");
  return {
    title: String(titleInput?.value || "").trim(),
    content: String(editor?.innerHTML || ""),
  };
}

function clearLiteratureAutosaveTimer() {
  if (literatureAutosaveTimer) {
    clearTimeout(literatureAutosaveTimer);
    literatureAutosaveTimer = null;
  }
}

function resetLiteratureAutosaveSession(doc) {
  clearLiteratureAutosaveTimer();
  literatureEditorChangeVersion = 0;
  literatureEditorSavedVersion = 0;
  literatureFolderSyncPending = false;
  literatureEditorSessionUniverseId = currentUniverseId || null;
  literatureEditorClosing = false;
  setLiteratureSaveStatus(doc ? "saved" : "idle", doc ? "Saved in app" : "Not saved yet");
}

function markLiteratureEditorDirty() {
  if (!literatureEditorIsOpen() || literatureEditorClosing) return;
  literatureEditorChangeVersion += 1;
  const draft = currentLiteratureEditorDraft();
  setLiteratureSaveStatus(
    draft.title ? "dirty" : "needs-title",
    draft.title ? "Unsaved changes" : "Add a title to autosave",
  );
  clearLiteratureAutosaveTimer();
  if (!draft.title) return;
  literatureAutosaveTimer = setTimeout(() => {
    literatureAutosaveTimer = null;
    queueLiteratureEditorSave({reason: "autosave", syncFolder: false});
  }, LITERATURE_AUTOSAVE_DELAY_MS);
}

async function syncActiveLiteratureEditorDocToFolder(doc, content) {
  if (!doc || !localFoldersEnabled || !literatureFolderHandle) return true;
  if (!(await controllerServices.requestFolderPermission(literatureFolderHandle))) return false;
  try {
    await writeLiteratureDocToSpecificFolder(doc, literatureFolderHandle, content, {
      forceTitleFileName: true,
    });
    if (!writeLiteratureMetadataOnly(currentUniverseId, literatureEntries)) {
      literatureFolderSyncPending = true;
      return false;
    }
    literatureFolderSyncPending = false;
    return true;
  } catch (e) {
    literatureFolderSyncPending = true;
    rememberFolderSaveFailure("Document saved in app, but could not sync to local folder", e);
    return false;
  }
}

async function performLiteratureEditorSave(options = {}) {
  if (!literatureEditorIsOpen()) return {ok: true, skipped: true};
  if (
    literatureEditorSessionUniverseId &&
    literatureEditorSessionUniverseId !== currentUniverseId
  ) {
    return {ok: false, skipped: true};
  }

  const reason = options.reason || "autosave";
  const syncFolder = !!options.syncFolder;
  const draft = currentLiteratureEditorDraft();
  const error = document.getElementById("literatureError");

  if (!draft.title) {
    if (reason !== "autosave") {
      if (error) error.textContent = "A title is required.";
      document.getElementById("literatureTitleInput")?.focus();
    }
    setLiteratureSaveStatus("needs-title", "Add a title to autosave");
    return {ok: false, missingTitle: true};
  }

  if (error && error.textContent === "A title is required.") error.textContent = "";
  const existingDoc = activeLiteratureId ? getLiteratureDoc(activeLiteratureId) : null;
  if (window.WormholesContentLimits) {
    const showContentLimitDialog = reason !== "autosave";
    const titleResult = window.WormholesContentLimits.ensureString("title", draft.title, {
      previousValue: existingDoc?.title || "",
      fieldName: "Document title",
      context: existingDoc?.title || "",
      operation: "save this document",
      showDialog: showContentLimitDialog,
    });
    const contentResult = titleResult.ok
      ? window.WormholesContentLimits.ensureHtml(draft.content, {
          previousValue: existingDoc?.content || "",
          fieldName: "Document",
          context: draft.title,
          operation: "save this document",
          showDialog: showContentLimitDialog,
        })
      : null;
    if (!titleResult.ok || !contentResult?.ok) {
      setLiteratureSaveStatus(
        "error",
        titleResult.ok ? "Document is too large" : "Title is too long",
      );
      if (error)
        error.textContent = titleResult.ok
          ? "This document is too large or complex. Split it into smaller documents, then try again."
          : "This title is too long. Shorten it, then try again.";
      return {ok: false, contentLimit: true, doc: existingDoc};
    }
  }
  draft.content = sanitizeLiteratureHtml(draft.content);
  if (window.WormholesStorageCapacity?.preflight) {
    const contentBytes = window.WormholesStorageCapacity.byteLength(draft.content || "");
    if (contentBytes >= window.WormholesStorageCapacity.largeLiteratureThresholdBytes) {
      const capacityResult = await window.WormholesStorageCapacity.preflight({
        operationLabel: "saving this large document",
        requiredBytes: window.WormholesStorageCapacity.estimateLiteratureSaveBytes(
          draft.content,
          existingDoc?.content || "",
        ),
        continueLabel: "Save Anyway",
        mode: reason === "autosave" ? "silent-allow" : "interactive",
      });
      if (!capacityResult.approved) {
        setLiteratureSaveStatus("error", "Storage is too full");
        if (error) error.textContent = "Storage is too full to save this document.";
        reportAppError(
          "Literature capacity preflight blocked save",
          new Error("Insufficient estimated browser storage"),
          {userMessage: "Storage is too full to save this document."},
        );
        return {ok: false, storageFailed: true, capacityBlocked: true, doc: existingDoc};
      }
    }
  }
  setLiteratureSaveStatus("saving", syncFolder ? "Saving and syncing…" : "Saving…");

  const saveVersion = literatureEditorChangeVersion;
  const now = new Date().toISOString();
  const previousEntries = cloneLiteratureCollection(literatureEntries);
  const candidateEntries = cloneLiteratureCollection(literatureEntries);
  let candidateDoc = existingDoc
    ? candidateEntries.find((item) => item.id === existingDoc.id) || null
    : null;
  const createdDoc = !candidateDoc;

  if (candidateDoc) {
    candidateDoc.title = draft.title;
    candidateDoc.content = draft.content;
    candidateDoc.updatedAt = now;
  } else {
    if (
      window.WormholesEntityLimits &&
      !window.WormholesEntityLimits.ensure("literature", literatureEntries.length, 1, {
        context: controllerServices.getCurrentUniverse()?.title || "",
        operation: "save another document",
      }).ok
    ) {
      setLiteratureSaveStatus("error", "Document limit reached");
      return {ok: false, entityLimit: true};
    }
    candidateDoc = normalizeLiteratureDoc(
      {
        id: makeId(),
        title: draft.title,
        content: draft.content,
        sourceName: "",
        fileType: "text",
        mimeType: "text/html",
        tags: {universes: [currentUniverseId], entries: []},
        createdAt: now,
        updatedAt: now,
      },
      currentUniverseId,
    );
    candidateEntries.unshift(candidateDoc);
  }

  try {
    await persistLiteratureCollectionTransaction(currentUniverseId, candidateEntries, {
      operation: reason === "autosave" ? "autosave this document" : "save this document",
      previousEntries,
      commitRuntime(entries) {
        literatureEntries = entries;
        activeLiteratureId = candidateDoc.id;
        const heading = document.getElementById("literatureEditorHeading");
        if (createdDoc && heading) heading.textContent = "Edit Document";
        window.WormholesAppModel?.replace?.("literature", literatureEntries, {
          source: "persistence",
          reason: "save literature",
        });
      },
    });
  } catch (saveError) {
    setLiteratureSaveStatus("error", "Save failed");
    if (error) error.textContent = "This document could not be saved. Nothing was changed.";
    reportAppError("Could not save document", saveError, {
      userMessage: "This document could not be saved. Nothing was changed.",
    });
    return {ok: false, storageFailed: true, persistence: saveError, doc: existingDoc};
  }

  candidateDoc = getLiteratureDoc(candidateDoc.id);
  requestStorageFootnoteUpdate();
  literatureEditorSavedVersion = Math.max(literatureEditorSavedVersion, saveVersion);
  literatureFolderSyncPending =
    literatureFolderSyncPending || !!(localFoldersEnabled && literatureFolderHandle);

  let folderOk = true;
  if (syncFolder && literatureFolderSyncPending) {
    folderOk = await syncActiveLiteratureEditorDocToFolder(candidateDoc, draft.content);
  }

  if (literatureEditorChangeVersion > saveVersion) {
    setLiteratureSaveStatus("dirty", "Unsaved changes");
  } else if (folderOk) {
    setLiteratureSaveStatus(
      "saved",
      syncFolder && localFoldersEnabled && literatureFolderHandle
        ? "Saved and synced"
        : "Saved in app",
    );
  } else {
    setLiteratureSaveStatus("warning", "Saved in Wormholes · Folder not updated");
  }

  return {ok: true, doc: candidateDoc, folderOk};
}

function queueLiteratureEditorSave(options = {}) {
  clearLiteratureAutosaveTimer();
  literatureSaveQueue = literatureSaveQueue
    .catch(() => null)
    .then(() => performLiteratureEditorSave(options));
  return literatureSaveQueue;
}

async function closeLiteratureEditor(options = {}) {
  if (!literatureEditorIsOpen()) {
    if (options.destinationTab && typeof switchTab === "function")
      switchTab(options.destinationTab, {skipLiteratureEditorClose: true});
    else if (options.showHome && typeof controllerServices.showHomeScreen === "function")
      controllerServices.showHomeScreen();
    return true;
  }

  clearLiteratureAutosaveTimer();
  literatureEditorClosing = true;
  const titleInput = document.getElementById("literatureTitleInput");
  const editor = document.getElementById("literatureEditor");
  if (titleInput) titleInput.disabled = true;
  if (editor) editor.contentEditable = "false";

  await literatureSaveQueue.catch(() => null);
  const draft = currentLiteratureEditorDraft();
  const hasUnsavedChanges = literatureEditorChangeVersion > literatureEditorSavedVersion;
  let result = {ok: true};

  if (draft.title && (hasUnsavedChanges || !activeLiteratureId)) {
    result = await queueLiteratureEditorSave({reason: "exit", syncFolder: false});
  }

  if (!result.ok && draft.title) {
    literatureEditorClosing = false;
    if (titleInput) titleInput.disabled = false;
    if (editor) editor.contentEditable = "true";
    return false;
  }

  let folderOk = true;
  if (result.ok && activeLiteratureId && literatureFolderSyncPending) {
    const doc = getLiteratureDoc(activeLiteratureId);
    if (doc) folderOk = await syncActiveLiteratureEditorDocToFolder(doc, doc.content || "");
  }

  document.getElementById("literatureEditorScreen").classList.remove("active");
  document.getElementById("literatureListScreen").classList.add("active");
  activeLiteratureId = null;
  literatureEditorSessionUniverseId = null;
  literatureEditorClosing = false;
  if (titleInput) titleInput.disabled = false;
  if (editor) editor.contentEditable = "true";
  clearLiteratureAutosaveTimer();
  renderLiteratureList();
  refreshLiteratureLinkDisplays();

  if (options.destinationTab && typeof switchTab === "function") {
    switchTab(options.destinationTab, {skipLiteratureEditorClose: true});
  } else if (options.showHome && typeof controllerServices.showHomeScreen === "function") {
    controllerServices.showHomeScreen();
  }
  if (!folderOk) showSavedToast("Saved in Wormholes, but the folder was not updated.");
  return result.ok;
}

function showLiteratureListScreen() {
  document.getElementById("literatureEditorScreen").classList.remove("active");
  document.getElementById("literatureListScreen").classList.add("active");
  activeLiteratureId = null;
  literatureEditorSessionUniverseId = null;
  clearLiteratureAutosaveTimer();
  renderLiteratureList();
}

async function showLiteratureEditorScreen(docId = null) {
  const rawDoc = docId ? getLiteratureDoc(docId) : null;
  if (isLiteratureGroup(rawDoc)) {
    openEditLiteratureGroupModal(docId);
    return;
  }
  const doc = docId ? await materializeLiteratureDoc(rawDoc) : null;
  activeLiteratureId = doc ? doc.id : null;
  document.getElementById("literatureListScreen").classList.remove("active");
  document.getElementById("literatureEditorScreen").classList.add("active");
  document.getElementById("literatureEditorHeading").textContent = doc
    ? "Edit Document"
    : "New Document";
  document.getElementById("literatureError").textContent = "";
  document.getElementById("literatureTitleInput").value = doc ? doc.title : "";
  document.getElementById("literatureEditor").innerHTML = doc
    ? sanitizeLiteratureHtml(doc.content)
    : "";
  if (doc && (doc.fileType === "doc" || doc.fileType === "docx")) {
    document.getElementById("literatureError").textContent =
      `Converted from ${literatureFileTypeLabel(doc)}. You can now edit the extracted text.`;
  }
  document.getElementById("literatureTextSize").value = "3";
  resetLiteratureAutosaveSession(doc);
  setTimeout(() => document.getElementById("literatureTitleInput").focus(), 0);
}

function handleLiteratureTitleToggle(button, event) {
  if (!button) return;
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.stopImmediatePropagation?.();

  const entryEl = button.closest?.(".literature-entry");
  if (!entryEl) return;

  const doc = getLiteratureDoc(entryEl.dataset.id);
  if (isLiteratureGroup(doc)) {
    entryEl.classList.toggle("open");
    const isOpen = entryEl.classList.contains("open");
    button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) {
      literatureExpandedGroupIds.add(doc.id);
    } else {
      literatureExpandedGroupIds.delete(doc.id);
    }
    return;
  }

  openLiteratureViewer(entryEl.dataset.id, currentUniverseId);
}

function installLiteratureTitleToggleHandlers(list) {
  if (!list) return;
  list.querySelectorAll(".literature-title-toggle").forEach((button) => {
    button.addEventListener("click", (event) => handleLiteratureTitleToggle(button, event));
  });
}

function installLiteratureListControlDelegation(list) {
  if (!list || list.dataset.literatureDelegationInstalled === "true") return;
  list.dataset.literatureDelegationInstalled = "true";

  // Handle title toggles in the capture phase so app-wide button/download guards
  // and any stale bubble listeners cannot double-toggle a literature group after
  // returning from the editor save flow.
  list.addEventListener(
    "click",
    (event) => {
      const titleButton = event.target.closest?.(".literature-title-toggle");
      if (titleButton && list.contains(titleButton)) {
        handleLiteratureTitleToggle(titleButton, event);
      }
    },
    true,
  );

  list.addEventListener("click", (event) => {
    const menuButton = event.target.closest?.("#literatureList .menu-button");
    if (menuButton) {
      event.preventDefault();
      event.stopPropagation();
      controllerServices.togglePositionedMenu(menuButton.nextElementSibling);
      return;
    }

    const editButton = event.target.closest?.("#literatureList .literature-edit-action");
    if (editButton) {
      event.preventDefault();
      event.stopPropagation();
      controllerServices.closeMenus();
      showLiteratureEditorScreen(editButton.closest(".entry").dataset.id);
      return;
    }

    const tagButton = event.target.closest?.("#literatureList .literature-tag-action");
    if (tagButton) {
      event.preventDefault();
      event.stopPropagation();
      controllerServices.closeMenus();
      openLiteratureTagModal(tagButton.closest(".entry").dataset.id);
      return;
    }

    const groupButton = event.target.closest?.("#literatureList .literature-group-action");
    if (groupButton) {
      event.preventDefault();
      event.stopPropagation();
      controllerServices.closeMenus();
      openLiteratureGroupModal(groupButton.closest(".entry").dataset.id);
      return;
    }

    const editGroupButton = event.target.closest?.("#literatureList .literature-edit-group-action");
    if (editGroupButton) {
      event.preventDefault();
      event.stopPropagation();
      controllerServices.closeMenus();
      openEditLiteratureGroupModal(editGroupButton.closest(".entry").dataset.id);
      return;
    }

    const ungroupButton = event.target.closest?.("#literatureList .literature-ungroup-action");
    if (ungroupButton) {
      event.preventDefault();
      event.stopPropagation();
      controllerServices.closeMenus();
      ungroupLiteratureGroup(ungroupButton.closest(".entry").dataset.id);
      return;
    }

    const copyButton = event.target.closest?.("#literatureList .literature-copy-universe-action");
    if (copyButton) {
      event.preventDefault();
      event.stopPropagation();
      controllerServices.closeMenus();
      openCopyToUniverseModal("literature", copyButton.closest(".entry").dataset.id);
      return;
    }

    const deleteButton = event.target.closest?.("#literatureList .literature-delete-action");
    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      controllerServices.closeMenus();
      openLiteratureDeleteConfirm(deleteButton.closest(".entry").dataset.id);
      return;
    }

    // Title toggles are handled above in capture phase to prevent duplicate
    // toggles after literature editor re-renders.
  });
}

function renderLiteratureListView() {
  literatureEntries =
    window.WormholesRenderValidation?.validateLiterature?.(literatureEntries, {
      storageKey: literatureStorageKey(),
      universeId: currentUniverseId,
      report: false,
    })?.value || literatureEntries;
  const count = document.getElementById("literatureCount");
  const list = document.getElementById("literatureList");
  if (!count || !list) return;

  syncLiteratureViewControls(literatureEntries);
  const filterState = sanitizeLiteratureFilterState(getLiteratureFilterState(), literatureEntries);
  const viewPlan = sortLiteratureViewPlan(
    buildLiteratureViewPlan(literatureEntries, filterState),
    getLiteratureSortMode(),
  );
  const literaturePages = window.WormholesPagination?.paginateGroupedPlan?.(
    viewPlan,
    LITERATURE_PAGE_SIZE,
    (entry) => isLiteratureGroup(entry),
  ) || [viewPlan];
  const currentLiteraturePage =
    window.WormholesPagination?.clampPage?.(getLiteraturePage(), literaturePages.length) || 1;
  setLiteraturePage(currentLiteraturePage);
  const pagePlan = literaturePages[currentLiteraturePage - 1] || [];
  const docCount = literatureEntries.filter((doc) => !isLiteratureGroup(doc)).length;
  const groupCount = literatureEntries.filter(isLiteratureGroup).length;
  const visibleDocIds = new Set();
  let visibleGroupCount = 0;
  viewPlan.forEach((row) => {
    if (isLiteratureGroup(row.entry)) {
      visibleGroupCount += 1;
      (row.childEntries || []).forEach((child) => visibleDocIds.add(child.id));
    } else {
      visibleDocIds.add(row.entry.id);
    }
  });
  const filtered = literatureFilterActiveCount(filterState) > 0;
  count.textContent = filtered
    ? `${visibleDocIds.size} of ${docCount} doc${docCount === 1 ? "" : "s"}${groupCount ? ` · ${visibleGroupCount} of ${groupCount} groups` : ""}`
    : `${docCount} doc${docCount === 1 ? "" : "s"} saved${groupCount ? ` · ${groupCount} group${groupCount === 1 ? "" : "s"}` : ""}`;
  const resultCount = document.getElementById("literatureFilterResultCount");
  if (resultCount) {
    resultCount.textContent = filtered
      ? `${visibleDocIds.size} document${visibleDocIds.size === 1 ? "" : "s"} shown`
      : `${docCount} document${docCount === 1 ? "" : "s"}`;
  }

  if (viewPlan.length === 0) {
    renderLiteraturePagination(1, 1);
    list.innerHTML = literatureEntries.length
      ? `<p class="empty-archive">No documents match these filters.</p>`
      : `<p class="empty-archive">No documents yet. Add a file or create a new document.</p>`;
    return;
  }

  function renderLiteratureCard(doc, isSubdoc = false, filteredChildren = null) {
    const isGroup = isLiteratureGroup(doc);
    const childDocs = isGroup
      ? Array.isArray(filteredChildren)
        ? filteredChildren
        : literatureGroupChildDocs(doc)
      : [];
    const preview = isGroup
      ? childDocs.map((child) => child.title).join(" · ")
      : literaturePlainPreview(doc.content);
    const fileLabel = literatureFileTypeLabel(doc);
    const fileSize = isGroup ? "" : formatFileSize(doc.fileSize);
    const availableUngroupedCount = literatureEntries.filter(
      (item) => !isLiteratureGroup(item) && !getLiteratureGroupForDocId(item.id),
    ).length;
    const canGroup =
      !isGroup && !isSubdoc && !getLiteratureGroupForDocId(doc.id) && availableUngroupedCount >= 2;

    const childHtml = isGroup
      ? `
          <div class="group-children literature-group-children">
            <div class="group-children-title">Grouped literature</div>
            ${childDocs.length ? childDocs.map((child) => renderLiteratureCard(child, true)).join("") : `<p class="empty-archive">This literature group is empty.</p>`}
          </div>
        `
      : "";

    const detailsHtml = isGroup
      ? `
          <p><b>Tags:</b> ${escapeHtml(renderLiteratureTags(doc))}</p>
          <p><b>Type:</b> ${escapeHtml(fileLabel)}</p>
          <p><b>Grouped literature:</b> ${escapeHtml(childDocs.length ? childDocs.map((child) => child.title).join(" · ") : "—")}</p>
          ${childHtml}
        `
      : `
          <p><b>Tags:</b> ${escapeHtml(renderLiteratureTags(doc))}</p>
          <p><b>Type:</b> ${escapeHtml(fileLabel)}${fileSize ? ` · ${escapeHtml(fileSize)}` : ""}</p>
          <p><b>Preview:</b> ${escapeHtml(preview ? truncatePreview(preview, 260) : "—")}</p>
          ${doc.sourceName ? `<p><b>Source:</b> ${escapeHtml(doc.sourceName)}</p>` : ""}
          ${doc.convertedFrom ? `<p><b>Converted from:</b> ${escapeHtml(doc.convertedFrom)}</p>` : ""}
        `;

    const isExpandedGroup = isGroup && literatureExpandedGroupIds.has(doc.id);

    return `
      <div class="entry literature-entry ${isGroup ? "literature-group-entry" : ""} ${isSubdoc ? "literature-subentry group-subentry" : ""} ${isExpandedGroup ? "open" : ""} ${doc.fileType ? `literature-file-${doc.fileType}` : ""}" data-id="${escapeHtml(doc.id)}">
        <div class="entry-top ellipsis-row">
          <button class="entry-title ellipsis-row-main app-button literature-title-toggle" type="button" data-app-button="true" aria-expanded="${isExpandedGroup ? "true" : "false"}">
            <span class="entry-title-text">
              <span class="entry-title-main">${escapeHtml(doc.title)}</span>
              <span class="entry-title-what">${escapeHtml(renderLiteratureTags(doc))}</span>
            </span>
          </button>
          <div class="menu-wrap ellipsis-row-actions">
            <button class="menu-button app-button" type="button" aria-label="Open literature menu" data-app-button="true">⋮</button>
            <div class="menu">
              ${isGroup ? "" : `<button class="literature-edit-action app-button" type="button" data-app-button="true">Edit</button>`}
              <button class="literature-tag-action app-button" type="button" data-app-button="true">Tag</button>
              ${canGroup ? `<button class="literature-group-action app-button" type="button" data-app-button="true">Group</button>` : ""}
              ${isGroup ? `<button class="literature-edit-group-action app-button" type="button" data-app-button="true">Edit Group</button>` : ""}
              ${isGroup ? `<button class="literature-ungroup-action app-button" type="button" data-app-button="true">Ungroup Documents</button>` : ""}
              <button class="literature-copy-universe-action app-button" type="button" data-app-button="true">Copy to Universe</button>
              <button class="literature-delete-action app-button" type="button" data-app-button="true">${isGroup ? "Delete Group" : "Delete Document"}</button>
            </div>
          </div>
        </div>
        <div class="entry-details">
          ${detailsHtml}
        </div>
      </div>
    `;
  }

  list.innerHTML = pagePlan
    .map((row) => renderLiteratureCard(row.entry, false, row.childEntries))
    .join("");
  renderLiteraturePagination(literaturePages.length, currentLiteraturePage);

  applyContextualActionAriaLabels(list);

  // Title toggles are handled through one stable delegated listener.
  // Keeping this single path prevents a post-save group click from double-toggling open again.
  installLiteratureListControlDelegation(list);
  controllerServices.protectAllControls(document.getElementById("literatureTab"));
}

async function saveLiteratureDoc() {
  const result = await queueLiteratureEditorSave({reason: "manual", syncFolder: true});
  if (!result.ok) return;

  document.getElementById("literatureEditorScreen").classList.remove("active");
  document.getElementById("literatureListScreen").classList.add("active");
  activeLiteratureId = null;
  literatureEditorSessionUniverseId = null;
  clearLiteratureAutosaveTimer();
  switchTab("literature", {skipLiteratureEditorClose: true});
  refreshLiteratureLinkDisplays();
  showSavedToast(
    result.folderOk === false
      ? "Saved in Wormholes, but the folder was not updated."
      : "Document saved",
  );
}

function openLiteratureDeleteConfirm(docId) {
  const doc = getLiteratureDoc(docId);
  if (!doc) return;
  const isGroup = isLiteratureGroup(doc);
  activeLiteratureDeleteId = docId;
  document.getElementById("literatureDeleteConfirmTitle").textContent = isGroup
    ? `Delete group “${doc.title}”?`
    : `Delete “${doc.title}”?`;
  document.getElementById("literatureDeleteConfirmText").textContent = isGroup
    ? "The documents will stay in Literature. You can restore the group from the notification or Recent Activity for two minutes."
    : "This removes the document and its tags. You can restore it from the notification or Recent Activity for two minutes.";
  document.getElementById("cancelLiteratureDeleteBtn").textContent = isGroup
    ? "Keep Group"
    : "Keep Document";
  document.getElementById("confirmLiteratureDeleteBtn").textContent = isGroup
    ? "Delete Group"
    : "Delete Document";
  document.getElementById("literatureDeleteConfirmModal").classList.add("open");
}

function closeLiteratureDeleteConfirm() {
  document.getElementById("literatureDeleteConfirmModal")?.classList.remove("open");
  activeLiteratureDeleteId = null;
}

async function confirmLiteratureDelete() {
  const docId = activeLiteratureDeleteId;
  if (!docId) return;
  closeLiteratureDeleteConfirm();
  await deleteLiteratureDoc(docId);
}

async function deleteLiteratureDoc(docId) {
  const doc = getLiteratureDoc(docId);
  if (!doc) return;
  const undoState = window.WormholesUndo?.captureState?.();
  const deletedDoc = JSON.parse(JSON.stringify(doc));
  const deletedUniverse = controllerServices.getCurrentUniverse();
  const deletedLiteratureFolderHandle = literatureFolderHandle;
  const previousLiteratureEntries = JSON.parse(JSON.stringify(literatureEntries));
  const previousActiveLiteratureId = activeLiteratureId;

  literatureEntries = literatureEntries.filter((item) => item.id !== docId);
  if (activeLiteratureId === docId) activeLiteratureId = null;
  normalizeLiteratureGroups({persist: false});
  if (!saveLiteratureToStorage().ok) {
    literatureEntries = previousLiteratureEntries;
    activeLiteratureId = previousActiveLiteratureId;
    return;
  }
  refreshLiteratureLinkDisplays();

  const finalize = async () => {
    if (localFoldersEnabled && !isLiteratureGroup(deletedDoc)) {
      await controllerServices.ensureWormholesFolderReadyForDestructiveSync();
      let folderHandle = deletedLiteratureFolderHandle;
      if (!folderHandle) {
        const folders = deletedUniverse ? await ensureUniverseFolders(deletedUniverse) : null;
        folderHandle = folders?.literature || null;
      }
      await controllerServices.deleteFolderBackedRecordFile(deletedDoc, folderHandle);
    }
    if (deletedDoc?.contentStoreKey) await deleteLargeDataValue(deletedDoc.contentStoreKey);
    await controllerServices.pruneWormholesFolderToAppState();
  };

  const deletedMessage = isLiteratureGroup(deletedDoc)
    ? "Literature group deleted"
    : "Document deleted";
  const restoredMessage = isLiteratureGroup(deletedDoc)
    ? "Literature group restored"
    : "Document restored";
  if (window.WormholesUndo && undoState) {
    await window.WormholesUndo.offer({
      message: deletedMessage,
      restoredMessage,
      state: undoState,
      finalize,
    });
  } else {
    await finalize();
    showSavedToast(deletedMessage);
  }
}

function placeLiteratureCaretFromPoint(clientX, clientY) {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
  const selection = document.getSelection?.();
  if (!selection) return;
  let range = null;
  if (typeof document.caretRangeFromPoint === "function") {
    range = document.caretRangeFromPoint(clientX, clientY);
  } else if (typeof document.caretPositionFromPoint === "function") {
    const position = document.caretPositionFromPoint(clientX, clientY);
    if (position) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
    }
  }
  if (!range) return;
  const editor = document.getElementById("literatureEditor");
  if (!editor?.contains(range.startContainer)) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertPlainTextIntoLiteratureEditor(text, options = {}) {
  const editor = document.getElementById("literatureEditor");
  if (!editor) return;
  editor.focus();
  placeLiteratureCaretFromPoint(Number(options.clientX), Number(options.clientY));
  const plainText = String(text || "");
  if (typeof document.execCommand === "function") {
    document.execCommand("insertText", false, plainText);
  } else {
    const selection = document.getSelection?.();
    const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    if (range && editor.contains(range.startContainer)) {
      range.deleteContents();
      const node = document.createTextNode(plainText);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editor.appendChild(document.createTextNode(plainText));
    }
  }
  setTimeout(markLiteratureEditorDirty, 0);
}

function handleLiteratureEditorTextTransfer(event) {
  event?.preventDefault?.();
  const transfer = event?.clipboardData || event?.dataTransfer;
  const text = transfer?.getData?.("text/plain") || "";
  insertPlainTextIntoLiteratureEditor(text, {
    clientX: event?.type === "drop" ? event.clientX : undefined,
    clientY: event?.type === "drop" ? event.clientY : undefined,
  });
}

function applyLiteratureFormat(command, value = null) {
  const editor = document.getElementById("literatureEditor");
  editor.focus();
  try {
    if (typeof document.execCommand === "function") {
      document.execCommand(command, false, value);
      markLiteratureEditorDirty();
    }
  } catch (e) {
    const error = document.getElementById("literatureError");
    if (error) error.textContent = "This browser does not support that text command.";
  }
}

async function uploadLiteratureFiles(files) {
  const fileList = Array.from(files || []);
  if (fileList.length === 0) return;

  const sizeResult = window.WormholesFileLimits?.enforce?.(fileList, "literature", {
    label: "Document",
  });
  if (sizeResult && !sizeResult.ok) {
    const input = document.getElementById("literatureFileInput");
    if (input) input.value = "";
    const currentList = document.getElementById("literatureList");
    if (currentList) {
      const warning = document.createElement("div");
      warning.className = "manual-error literature-upload-warning";
      warning.textContent = "Files were not added because the selected file or batch is too large.";
      currentList.prepend(warning);
    }
    return;
  }

  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("literature", literatureEntries.length, fileList.length, {
      context: controllerServices.getCurrentUniverse()?.title || "",
      operation: "add these documents",
    }).ok
  ) {
    const input = document.getElementById("literatureFileInput");
    if (input) input.value = "";
    return;
  }

  if (window.WormholesStorageCapacity?.preflight) {
    const capacityResult = await window.WormholesStorageCapacity.preflight({
      operationLabel: `adding ${fileList.length} file${fileList.length === 1 ? "" : "s"}`,
      requiredBytes: window.WormholesStorageCapacity.estimateFileBatchBytes(fileList, {
        kind: "literature",
      }),
      continueLabel: "Add Anyway",
    });
    if (!capacityResult.approved) {
      const input = document.getElementById("literatureFileInput");
      if (input) input.value = "";
      const currentList = document.getElementById("literatureList");
      if (currentList) {
        const warning = document.createElement("div");
        warning.className = "manual-error literature-upload-warning";
        warning.textContent =
          capacityResult.status === "block"
            ? "Files were not added because there is not enough estimated browser storage."
            : "Adding files was canceled.";
        currentList.prepend(warning);
      }
      return;
    }
  }

  const list = document.getElementById("literatureList");
  if (list) {
    list.innerHTML = `<p class="empty-archive">Converting files into editable text...</p>`;
  }

  const skipped = [];
  let savedCount = 0;

  for (const file of fileList) {
    try {
      // File conversion returns an upload draft. Canonicalize it before any persistence, folder
      // sync, or live-collection insertion so every upload format follows the same record builder.
      const doc = normalizeLiteratureDoc(
        await convertUploadedFileToLiterature(file),
        currentUniverseId,
      );
      if (window.WormholesContentLimits) {
        const titleResult = window.WormholesContentLimits.ensureString("title", doc.title, {
          fieldName: "Document title",
          context: file.name || "",
          operation: "add this document",
        });
        const contentResult = titleResult.ok
          ? window.WormholesContentLimits.ensureHtml(doc.content, {
              fieldName: "Document",
              context: doc.title || file.name || "",
              operation: "add this document",
            })
          : null;
        if (!titleResult.ok || !contentResult?.ok)
          throw window.WormholesContentLimits.errorFor(
            titleResult.ok ? contentResult : titleResult,
          );
      }
      if (
        literatureFolderHandle &&
        (await controllerServices.requestFolderPermission(literatureFolderHandle))
      ) {
        try {
          await writeLiteratureDocToFolder(doc, doc.content || "<p></p>");
        } catch (e) {
          rememberFolderSaveFailure(
            "Document saved in app, but could not sync to local folder",
            e,
            "Saved in Wormholes, but the folder was not updated.",
          );
        }
      }
      literatureEntries.unshift(doc);
      await persistLiteratureLargeData(currentUniverseId, doc);

      const saveResult = saveLiteratureToStorage();
      if (saveResult.ok) {
        savedCount += 1;
      } else {
        literatureEntries = literatureEntries.filter((item) => item.id !== doc.id);
        skipped.push(
          `${file.name}: ${saveResult.userMessage || "Could not save this file. Try again."}`,
        );
      }
    } catch (e) {
      skipped.push(`${file.name}: ${e?.message || "Could not convert this file."}`);
    }
  }

  refreshLiteratureLinkDisplays();
  if (savedCount > 0) {
    showBrowserStorageUploadPrompt("literature");
    showSavedToast("Files added");
  }

  const currentList = document.getElementById("literatureList");
  if (skipped.length) {
    const warning = document.createElement("div");
    warning.className = "manual-error literature-upload-warning";
    warning.textContent = `Saved ${savedCount} file${savedCount === 1 ? "" : "s"}. Skipped ${skipped.length} file${skipped.length === 1 ? "" : "s"}: ${skipped.join(" | ")}`;
    currentList?.prepend(warning);
  }

  document.getElementById("literatureFileInput").value = "";
}

function closeLiteratureTagModal() {
  document.getElementById("literatureTagModal")?.classList.remove("open");
  activeLiteratureTagId = null;
  activeVisionTagId = null;
  expandedLiteratureTagGroups = new Set();
  stagedTagUniverseIds = new Set();
  stagedTagEntryKeys = new Set();
  tagPickerHasUnsavedChanges = false;
  installLiteratureListControlDelegation(document.getElementById("literatureList"));
  controllerServices.protectAllControls(document.getElementById("literatureTab"));
  controllerServices.renderVisionBoard();
}

function saveAndCloseLiteratureTagModal() {
  const target = activeTagTarget();
  if (!target) return;

  const oldUniverseTags = new Set(
    Array.isArray(target.tags?.universes) ? target.tags.universes : [],
  );
  const oldEntryTags = new Set(
    (Array.isArray(target.tags?.entries) ? target.tags.entries : []).map((tag) =>
      tagEntryKey(tag.universeId, tag.entryId),
    ),
  );
  const removedTags =
    Array.from(oldUniverseTags).some((id) => !stagedTagUniverseIds.has(id)) ||
    Array.from(oldEntryTags).some((key) => !stagedTagEntryKeys.has(key));
  const undoState = removedTags ? window.WormholesUndo?.captureState?.() : null;

  const previousTags = JSON.parse(JSON.stringify(target.tags || {universes: [], entries: []}));
  target.tags = {
    universes: Array.from(stagedTagUniverseIds),
    entries: Array.from(stagedTagEntryKeys)
      .map(splitTagEntryKey)
      .filter((tag) => tag.universeId && tag.entryId),
  };

  if (activeVisionTagId) {
    const visionSaveResult = controllerServices.saveVisionBoardToStorage();
    if (!(visionSaveResult === true || visionSaveResult?.ok === true)) {
      target.tags = previousTags;
      reportAppError(
        "Could not save Vision Board tags",
        new Error("Vision Board tag persistence failed"),
        {
          userMessage: "Image tags could not be saved. Your previous tags were kept.",
        },
      );
      return false;
    }
    controllerServices.renderArchive();
    if (document.getElementById("connectionsScreen")?.classList.contains("active"))
      controllerServices.renderConnectionsMap();
  } else {
    if (!saveLiteratureToStorage().ok) {
      target.tags = previousTags;
      reportAppError(
        "Could not save document tags",
        new Error("Literature tag persistence failed"),
        {
          userMessage: "Tags could not be saved. Your previous tags were kept.",
        },
      );
      return false;
    }
    refreshLiteratureLinkDisplays();
    installLiteratureListControlDelegation(document.getElementById("literatureList"));
  }

  closeLiteratureTagModal();
  if (removedTags && window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({
      message: "Tags updated",
      restoredMessage: "Tag changes undone",
      state: undoState,
    });
  } else {
    showSavedToast("Tags saved");
  }
  return true;
}

function openLiteratureTagModal(docId) {
  const doc = getLiteratureDoc(docId);
  if (!doc) return;
  activeLiteratureTagId = docId;
  activeVisionTagId = null;
  expandedLiteratureTagGroups = new Set([
    controllerServices.nestedPickerKey("literature-universe", currentUniverseId),
  ]);
  initializeTagPickerDraft(doc);
  document.getElementById("literatureTagTitle").textContent =
    `${isLiteratureGroup(doc) ? "Tag Literature Group" : "Tag Document"}: ${doc.title}`;
  document.getElementById("literatureTagSubtitle").textContent =
    "Choose tags, then Save and Close.";
  renderLiteratureTagList();
  document.getElementById("literatureTagModal").classList.add("open");
}

function literatureDocHasUniverseTag(doc, universeId) {
  return (doc.tags?.universes || []).includes(universeId);
}

function literatureDocHasEntryTag(doc, universeId, entryId) {
  return (doc.tags?.entries || []).some(
    (tag) => tag.universeId === universeId && tag.entryId === entryId,
  );
}

function toggleLiteratureUniverseTag(universeId) {
  toggleDraftUniverseTag(universeId);
}

function toggleLiteratureEntryTag(universeId, entryId) {
  toggleDraftEntryTag(universeId, entryId);
}

function renderLiteratureTagEntryCard(universeId, entry, depth = 0) {
  const isSelected = stagedTagEntryKeys.has(tagEntryKey(universeId, entry.id));
  const isGroup = controllerServices.isGroupEntry(entry);
  const expanded = expandedLiteratureTagGroups.has(
    controllerServices.nestedPickerKey("literature-group", universeId, entry.id),
  );
  const archive =
    universeId === currentUniverseId ? archiveEntries : readArchiveForUniverse(universeId);
  const children = isGroup
    ? controllerServices
        .groupChildIds(entry)
        .map((id) => archive.find((item) => item.id === id))
        .filter(Boolean)
    : [];

  return `
    <div class="literature-tag-entry depth-${depth}">
      <div class="group-choice literature-tag-choice ${isSelected ? "selected" : ""}" data-tag-type="entry" data-universe-id="${escapeHtml(universeId)}" data-entry-id="${escapeHtml(entry.id)}" tabindex="0" role="checkbox" aria-checked="${isSelected ? "true" : "false"}" aria-label="${escapeHtml(`${isSelected ? "Remove tag" : "Add tag"}: ${entry.title} in ${controllerServices.getUniverseTitle(universeId) || "universe"}`)}">
        <span>
          <span class="group-choice-title">${escapeHtml(entry.title)}</span>
          <span class="group-choice-meta">${escapeHtml(isGroup ? controllerServices.displayEntryWhat(entry) : entry.what?.val ? entry.what.val.split("—")[0].trim() : "Creation")}${isSelected ? " · selected" : ""}</span>
        </span>
        ${isGroup ? `<button class="literature-expand-group app-button" data-picker-key="${escapeHtml(controllerServices.nestedPickerKey("literature-group", universeId, entry.id))}" type="button" data-app-button="true">${expanded ? "▾" : "▸"}</button>` : ""}
      </div>
      ${isGroup && expanded ? `<div class="literature-tag-children">${children.map((child) => renderLiteratureTagEntryCard(universeId, child, depth + 1)).join("")}</div>` : ""}
    </div>
  `;
}

function renderLiteratureTagList() {
  const target = activeTagTarget();
  const list = document.getElementById("literatureTagList");
  if (!target) {
    list.innerHTML = `<div class="universe-empty">No item selected.</div>`;
    return;
  }

  list.innerHTML = universes
    .map((universe) => {
      const archive = readArchiveForUniverse(universe.id);
      const topEntries = controllerServices.topLevelArchiveEntries(archive);
      const universeSelected = stagedTagUniverseIds.has(universe.id);
      const universeKey = controllerServices.nestedPickerKey("literature-universe", universe.id);
      const expanded = expandedLiteratureTagGroups.has(universeKey);

      return `
      <div class="literature-tag-universe nested-picker-universe" data-universe-id="${escapeHtml(universe.id)}">
        <div class="nested-picker-row ${universeSelected ? "selected" : ""}">
          <button class="nested-picker-select literature-tag-choice app-button" data-tag-type="universe" data-universe-id="${escapeHtml(universe.id)}" type="button" data-app-button="true" role="checkbox" aria-checked="${universeSelected ? "true" : "false"}" aria-label="${escapeHtml(`${universeSelected ? "Remove universe tag" : "Add universe tag"}: ${universe.title}`)}">
            <span class="group-choice-title">${escapeHtml(universe.title)}</span>
            <span class="group-choice-meta">Universe tag${universeSelected ? " · selected" : ""}</span>
          </button>
          <button class="nested-picker-expander literature-expand-universe app-button" data-picker-key="${escapeHtml(universeKey)}" type="button" data-app-button="true">${expanded ? "▾" : "▸"}</button>
        </div>
        ${
          expanded
            ? `<div class="literature-tag-entry-list nested-picker-children">
          ${topEntries.length ? topEntries.map((entry) => renderLiteratureTagEntryCard(universe.id, entry)).join("") : `<div class="universe-empty">No creations in this universe.</div>`}
        </div>`
            : ""
        }
      </div>
    `;
    })
    .join("");

  list.querySelectorAll(".literature-tag-choice").forEach((choice) => {
    const activate = (event) => {
      if (
        event?.target?.closest?.(
          ".literature-expand-group, .literature-expand-universe, .nested-picker-expander",
        )
      )
        return;
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (choice.dataset.tagType === "universe") {
        toggleDraftUniverseTag(choice.dataset.universeId);
      } else {
        toggleDraftEntryTag(choice.dataset.universeId, choice.dataset.entryId);
      }
    };

    choice.addEventListener("click", activate);
    choice.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate(event);
      }
    });
  });

  list
    .querySelectorAll(".literature-expand-group, .literature-expand-universe")
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const key = button.dataset.pickerKey;
        if (expandedLiteratureTagGroups.has(key)) expandedLiteratureTagGroups.delete(key);
        else expandedLiteratureTagGroups.add(key);
        renderLiteratureTagList();
      });
    });

  controllerServices.protectAllControls(list);
}

async function readBackupLiteratureForUniverse(universeRecord) {
  const docs = [];
  const folder = universeRecord?.folders?.literature;
  if (!folder) return docs;

  for await (const [fileName, handle] of folder.entries()) {
    if (handle.kind !== "file" || controllerServices.shouldSkipFolderPruneEntry(fileName)) continue;
    const file = await handle.getFile();
    const text = await controllerServices.textFromBackupFile(file, fileName, "backupLiterature");
    const content = plainTextToLiteratureHtml(text || "");
    docs.push(
      normalizeImportedLiteratureDoc(
        {
          id: makeId(),
          title: controllerServices.fileTitleFromName(fileName),
          content,
          sourceName: fileName,
          fileType: /\.docx?$/i.test(fileName) ? "docx" : "text",
          mimeType:
            file.type ||
            (/\.docx$/i.test(fileName)
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "text/plain"),
          fileSize: file.size || 0,
          storage: "folder",
          folderFileName: fileName,
          createdAt: new Date().toISOString(),
        },
        universeRecord.id,
      ),
    );
  }

  return docs;
}

function normalizeImportedLiteratureDoc(doc, universeId) {
  return buildCanonicalLiteratureRecord(doc, universeId, {
    idFactory: typeof makeId === "function" ? makeId : undefined,
    contentStoreKeyFor: literatureContentStoreKeyFor,
    normalizeTags: controllerServices.normalizeImportedTags,
    imported: true,
  });
}

async function materializeLiteratureDocForAppDataExport(doc, universeId) {
  if (!doc || isLiteratureGroup(doc)) return doc;

  await materializeLiteratureDocForUniverse(doc, universeId);

  if (!literaturePlainPreview(doc.content || "") && doc.contentStoreKey) {
    const indexedContent = await loadLargeDataValue(doc.contentStoreKey, "literature content");
    if (indexedContent) {
      doc.content = sanitizeLiteratureHtml(indexedContent);
      doc.contentStored = "indexedDB";
    }
  }

  if (!literaturePlainPreview(doc.content || "") && doc.id) {
    const canonicalKey = literatureContentStoreKeyFor(universeId, doc.id);
    if (canonicalKey !== doc.contentStoreKey) {
      const indexedContent = await loadLargeDataValue(canonicalKey, "literature content");
      if (indexedContent) {
        doc.content = sanitizeLiteratureHtml(indexedContent);
        doc.contentStoreKey = canonicalKey;
        doc.contentStored = "indexedDB";
      }
    }
  }

  if (
    !literaturePlainPreview(doc.content || "") &&
    doc.storage === "folder" &&
    doc.folderFileName
  ) {
    const file = await controllerServices.folderFileForAppDataExport(
      "literature",
      universeId,
      doc.folderFileName,
    );
    if (file) {
      try {
        const sourceName = doc.folderFileName || file.name || "";
        if (/\.docx$/i.test(sourceName)) {
          const text = await convertDocxArrayBufferToText(await file.arrayBuffer());
          doc.content = plainTextToLiteratureHtml(text);
        } else if (/\.doc$/i.test(sourceName)) {
          const text = convertDocArrayBufferToText(await file.arrayBuffer());
          doc.content = plainTextToLiteratureHtml(text);
        } else {
          doc.content = sourceLiteratureTextToAppContent(await file.text(), sourceName);
        }
      } catch (e) {}
    }
  }

  doc.content = sanitizeLiteratureHtml(doc.content || "");
  return doc;
}

async function materializeLiteratureForExport(docs, universeId) {
  const result = [];
  for (const original of docs || []) {
    const doc = normalizeImportedLiteratureDoc(
      controllerServices.cloneForAppDataExport(original),
      universeId,
    );
    await materializeLiteratureDocForAppDataExport(doc, universeId);
    const embeddedContent = literaturePlainPreview(doc.content || "")
      ? sanitizeLiteratureHtml(doc.content || "")
      : "";
    result.push({
      ...doc,
      content: embeddedContent,
      contentStored: embeddedContent ? "embedded-export" : doc.contentStored || "",
      fileData: "",
    });
  }
  return result;
}

function prepareImportedLiteratureForUniverse(universeId, docs) {
  return (docs || []).map((doc) => normalizeImportedLiteratureDoc(doc, universeId));
}

async function persistPreparedLiteratureLargeData(universeId, docs) {
  if (!largeDataStoreAvailable()) return true;
  for (const doc of docs || []) {
    if (!doc?.id || isLiteratureGroup(doc)) continue;
    const saved = await persistLargeDataValue(
      doc.contentStoreKey || literatureContentStoreKeyFor(universeId, doc.id),
      sanitizeLiteratureHtml(doc.content || ""),
      "literature content",
    );
    if (!saved) return false;
    doc.contentStoreKey = doc.contentStoreKey || literatureContentStoreKeyFor(universeId, doc.id);
    doc.contentStored = "indexedDB";
  }
  return true;
}

function writePreparedLiteratureMetadata(universeId, docs) {
  return writeLiteratureMetadataOnly(universeId, docs || []);
}

async function saveImportedLiteratureForUniverse(universeId, docs) {
  const normalized = prepareImportedLiteratureForUniverse(universeId, docs);
  if (!(await persistPreparedLiteratureLargeData(universeId, normalized))) {
    return {
      ok: false,
      code: "storage_unavailable",
      userMessage: "Imported documents could not be saved.",
    };
  }
  return writePreparedLiteratureMetadata(universeId, normalized);
}

/* Storage module: moved saveArchiveToStorage() to scripts/storage.js. */

/* Archive module: moved archiveEntryDisplayWhat() to scripts/archive.js. */

/* Archive module: moved creationFileText() to scripts/archive.js. */

/* Archive module: moved createCreationDocxBlob() to scripts/archive.js. */

/* Archive module: moved writeArchiveEntryToFolder() to scripts/archive.js. */

/* Archive module: moved writeArchiveEntryToFolderIfNeeded() to scripts/archive.js. */

/* Archive module: moved migrateArchiveEntriesToFolder() to scripts/archive.js. */

/* Archive module: moved migrateAllArchiveEntriesToFolder() to scripts/archive.js. */

/* Archive module: moved syncArchiveFolderEntries() to scripts/archive.js. */

/* Archive module: moved syncAllArchiveFolderEntries() to scripts/archive.js. */

function saveLiteratureForUniverse(universeId, docs) {
  scheduleLiteratureLargeDataSave(universeId, docs || []);
  const ok = writeLiteratureMetadataOnly(universeId, docs || []);
  if (universeId === currentUniverseId) requestStorageFootnoteUpdate();
  return ok;
}

async function writeLiteratureDocToSpecificFolder(
  doc,
  folderHandle,
  content = doc?.content || "",
  options = {},
) {
  if (!doc || !localFoldersEnabled || !folderHandle) return doc;
  if (!(await controllerServices.requestFolderPermission(folderHandle))) return doc;

  const textContent = literatureContentToFolderText(content || "<p></p>");
  const blob = createDocxBlobFromText(textContent);

  if (options.forceTitleFileName || !doc.folderFileName) {
    await controllerServices.renameFolderBackedRecordFile(
      doc,
      folderHandle,
      doc.title || doc.sourceName || "literature",
      ".docx",
      blob,
    );
  } else {
    await controllerServices.writeBlobToFolder(folderHandle, doc.folderFileName, blob);
    doc.storage = "folder";
  }

  doc.mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  doc.content = content;
  return doc;
}

async function migrateAllLiteratureEntriesToFolder(options = false) {
  const migrationOptions = controllerServices.normalizeFolderMigrationOptions(options);
  const force = migrationOptions.force;
  if (!localFoldersEnabled || !wormholesLiteratureRootHandle) return;

  for (const universe of universes) {
    const folders = await ensureUniverseFolders(universe);
    if (!folders?.literature) continue;

    const docs = readLiteratureForUniverse(universe.id);
    let changed = false;

    for (const doc of docs) {
      if (isLiteratureGroup(doc)) continue;
      if (doc.storage === "folder" && !force) continue;

      await materializeLiteratureDocForUniverse(doc, universe.id);

      const folderFileName = await controllerServices.folderMigrationFileName(
        doc,
        folders.literature,
        doc.title || doc.sourceName || "literature",
        ".docx",
        migrationOptions,
      );

      if (doc.content) {
        doc.folderFileName = folderFileName;
        await writeLiteratureDocToSpecificFolder(doc, folders.literature, doc.content, {
          forceTitleFileName: false,
        });
        changed = true;
        continue;
      }

      const sourceFile = await controllerServices.sourceFileFromPreviousFolder(
        "literature",
        universe,
        doc.folderFileName,
      );
      if (sourceFile) {
        const sourceText = await sourceFile.text();
        const folderText = sourceLiteratureTextToFolderText(sourceText, doc.folderFileName);
        doc.content = sourceLiteratureTextToAppContent(sourceText, doc.folderFileName);
        doc.folderFileName = folderFileName;
        await controllerServices.writeBlobToFolder(
          folders.literature,
          folderFileName,
          createDocxBlobFromText(folderText),
        );
        doc.storage = "folder";
        doc.mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        changed = true;
      }
    }

    if (changed) {
      if (universe.id === currentUniverseId) {
        literatureEntries = docs;
        saveLiteratureToStorage();
      } else {
        saveLiteratureForUniverse(universe.id, docs);
      }
    }
  }
}

async function syncAllLiteratureFolderEntries() {
  // Intentionally no-op: literature metadata stays in the app; strict folder cleanup happens in pruneWormholesFolderToAppState().
  return;
}

/* Rendering boundary: callers request a named view; DOM implementation stays behind the coordinator. */
window.WormholesRendering?.register?.("literature", renderLiteratureListView, {
  domains: ["literature"],
});
function renderLiteratureList() {
  const coordinator = window.WormholesRendering;
  if (coordinator?.has?.("literature")) return coordinator.render("literature");
  return renderLiteratureListView();
}

/* Public controller surface for served ES-module builds. */
const LITERATURE_CONTROLLER_API = Object.freeze({
  getLiteraturePage,
  setLiteraturePage,
  resetLiteraturePage,
  scrollLiteraturePageToTop,
  renderLiteraturePagination,
  defaultLiteratureFilterState,
  getLiteratureFilterState,
  literatureFilterActiveCount,
  getLiteratureSortMode,
  setLiteratureSortMode,
  literatureSortModeLabel,
  literatureItemHasTags,
  literatureItemHasContent,
  literatureItemMatchesStatus,
  literatureGroupOptions,
  sanitizeLiteratureFilterState,
  buildLiteratureViewPlan,
  literatureSortTimestamp,
  literatureSortComparator,
  sortLiteratureViewPlan,
  syncLiteratureViewControls,
  setLiteratureFilterPanelOpen,
  toggleLiteratureFilterPanel,
  closeLiteratureFilterPanel,
  applyLiteratureFiltersFromControls,
  resetLiteratureFilters,
  setLiteratureSortPanelOpen,
  toggleLiteratureSortPanel,
  closeLiteratureSortPanel,
  applyLiteratureSortFromControl,
  resetLiteratureSort,
  applyLiteratureEntryActionLabels,
  openLiteratureGroupModal,
  openEditLiteratureGroupModal,
  createLiteratureGroupFromModal,
  saveEditedLiteratureGroupFromModal,
  ungroupLiteratureGroup,
  literatureContentStoreKeyFor,
  literatureMetadataStorageKeyFor,
  trimLiteratureDocForLocalStorage,
  writeLiteratureMetadataOnly,
  persistLiteratureLargeData,
  scheduleLiteratureLargeDataSave,
  materializeLiteratureDocForUniverse,
  hydrateLiteratureEntriesFromLargeDataStore,
  loadLiteratureFromStorage,
  normalizeLiteratureDoc,
  normalizeLiteratureEntries,
  saveLiteratureToStorage,
  writeLiteratureDocToFolder,
  literatureContentToFolderText,
  folderTextToLiteratureContent,
  sourceLiteratureTextToFolderText,
  sourceLiteratureTextToAppContent,
  materializeLiteratureDoc,
  syncLiteratureFolderEntries,
  migrateLiteratureEntriesToFolder,
  getLiteratureDoc,
  isLiteratureGroup,
  literatureGroupChildIds,
  getLiteratureGroupForDocId,
  topLevelLiteratureEntries,
  literatureGroupChildDocs,
  normalizeLiteratureTags,
  mergeLiteratureTags,
  literatureGroupTagUnion,
  normalizeLiteratureGroups,
  literaturePlainPreview,
  escapeLiteratureUploadText,
  literatureFileKind,
  literatureFileTypeLabel,
  sanitizeLiteratureHtml,
  plainTextToLiteratureHtml,
  convertUploadedFileToLiterature,
  readLiteratureForUniverse,
  normalizedLiteratureListForUniverse,
  allLiteratureEntriesWithHome,
  literatureDocsForUniverseTag,
  literatureDocsForEntryTag,
  literatureDocsForUniverseAndEntriesTag,
  literatureDocsForGroupChildrenTag,
  literatureCountForUniverseTag,
  literatureCountForUniverseAndEntriesTag,
  literatureCountForEntryTag,
  literatureCountForGroupChildrenTag,
  showLiteratureFolderMessage,
  connectLiteratureLocalFolder,
  literatureBadgeHtml,
  literatureBadgeSvg,
  renderLiteratureTags,
  openLiteratureViewer,
  closeLiteratureViewer,
  openLiteratureUploadModal,
  closeLiteratureUploadModal,
  chooseLiteratureUploadFiles,
  closeMapViewsForLiteratureJump,
  loadUniverseForLiteratureEditing,
  openLiteratureEditorForDoc,
  editActiveLiteratureFromViewer,
  closeLiteratureLinksModal,
  literatureLinkRowSubtext,
  openLiteratureLinksModal,
  refreshLiteratureLinkDisplays,
  literatureEditorIsOpen,
  literatureEditorHasUnresolvedChanges,
  handleLiteratureBeforeUnload,
  setLiteratureSaveStatus,
  currentLiteratureEditorDraft,
  clearLiteratureAutosaveTimer,
  resetLiteratureAutosaveSession,
  markLiteratureEditorDirty,
  syncActiveLiteratureEditorDocToFolder,
  performLiteratureEditorSave,
  queueLiteratureEditorSave,
  closeLiteratureEditor,
  showLiteratureListScreen,
  showLiteratureEditorScreen,
  handleLiteratureTitleToggle,
  installLiteratureTitleToggleHandlers,
  installLiteratureListControlDelegation,
  renderLiteratureListView,
  saveLiteratureDoc,
  openLiteratureDeleteConfirm,
  closeLiteratureDeleteConfirm,
  confirmLiteratureDelete,
  deleteLiteratureDoc,
  placeLiteratureCaretFromPoint,
  insertPlainTextIntoLiteratureEditor,
  handleLiteratureEditorTextTransfer,
  applyLiteratureFormat,
  uploadLiteratureFiles,
  closeLiteratureTagModal,
  saveAndCloseLiteratureTagModal,
  openLiteratureTagModal,
  literatureDocHasUniverseTag,
  literatureDocHasEntryTag,
  toggleLiteratureUniverseTag,
  toggleLiteratureEntryTag,
  renderLiteratureTagEntryCard,
  renderLiteratureTagList,
  readBackupLiteratureForUniverse,
  normalizeImportedLiteratureDoc,
  materializeLiteratureDocForAppDataExport,
  materializeLiteratureForExport,
  prepareImportedLiteratureForUniverse,
  persistPreparedLiteratureLargeData,
  writePreparedLiteratureMetadata,
  saveImportedLiteratureForUniverse,
  saveLiteratureForUniverse,
  writeLiteratureDocToSpecificFolder,
  migrateAllLiteratureEntriesToFolder,
  syncAllLiteratureFolderEntries,
  renderLiteratureList,
});
registerControllerServices(LITERATURE_CONTROLLER_API);

export {
  getLiteraturePage,
  setLiteraturePage,
  resetLiteraturePage,
  scrollLiteraturePageToTop,
  renderLiteraturePagination,
  defaultLiteratureFilterState,
  getLiteratureFilterState,
  literatureFilterActiveCount,
  getLiteratureSortMode,
  setLiteratureSortMode,
  literatureSortModeLabel,
  literatureItemHasTags,
  literatureItemHasContent,
  literatureItemMatchesStatus,
  literatureGroupOptions,
  sanitizeLiteratureFilterState,
  buildLiteratureViewPlan,
  literatureSortTimestamp,
  literatureSortComparator,
  sortLiteratureViewPlan,
  syncLiteratureViewControls,
  setLiteratureFilterPanelOpen,
  toggleLiteratureFilterPanel,
  closeLiteratureFilterPanel,
  applyLiteratureFiltersFromControls,
  resetLiteratureFilters,
  setLiteratureSortPanelOpen,
  toggleLiteratureSortPanel,
  closeLiteratureSortPanel,
  applyLiteratureSortFromControl,
  resetLiteratureSort,
  applyLiteratureEntryActionLabels,
  openLiteratureGroupModal,
  openEditLiteratureGroupModal,
  createLiteratureGroupFromModal,
  saveEditedLiteratureGroupFromModal,
  ungroupLiteratureGroup,
  literatureContentStoreKeyFor,
  literatureMetadataStorageKeyFor,
  trimLiteratureDocForLocalStorage,
  writeLiteratureMetadataOnly,
  persistLiteratureLargeData,
  scheduleLiteratureLargeDataSave,
  materializeLiteratureDocForUniverse,
  hydrateLiteratureEntriesFromLargeDataStore,
  loadLiteratureFromStorage,
  normalizeLiteratureDoc,
  normalizeLiteratureEntries,
  saveLiteratureToStorage,
  writeLiteratureDocToFolder,
  literatureContentToFolderText,
  folderTextToLiteratureContent,
  sourceLiteratureTextToFolderText,
  sourceLiteratureTextToAppContent,
  materializeLiteratureDoc,
  syncLiteratureFolderEntries,
  migrateLiteratureEntriesToFolder,
  getLiteratureDoc,
  isLiteratureGroup,
  literatureGroupChildIds,
  getLiteratureGroupForDocId,
  topLevelLiteratureEntries,
  literatureGroupChildDocs,
  normalizeLiteratureTags,
  mergeLiteratureTags,
  literatureGroupTagUnion,
  normalizeLiteratureGroups,
  literaturePlainPreview,
  escapeLiteratureUploadText,
  literatureFileKind,
  literatureFileTypeLabel,
  sanitizeLiteratureHtml,
  plainTextToLiteratureHtml,
  convertUploadedFileToLiterature,
  readLiteratureForUniverse,
  normalizedLiteratureListForUniverse,
  allLiteratureEntriesWithHome,
  literatureDocsForUniverseTag,
  literatureDocsForEntryTag,
  literatureDocsForUniverseAndEntriesTag,
  literatureDocsForGroupChildrenTag,
  literatureCountForUniverseTag,
  literatureCountForUniverseAndEntriesTag,
  literatureCountForEntryTag,
  literatureCountForGroupChildrenTag,
  showLiteratureFolderMessage,
  connectLiteratureLocalFolder,
  literatureBadgeHtml,
  literatureBadgeSvg,
  renderLiteratureTags,
  openLiteratureViewer,
  closeLiteratureViewer,
  openLiteratureUploadModal,
  closeLiteratureUploadModal,
  chooseLiteratureUploadFiles,
  closeMapViewsForLiteratureJump,
  loadUniverseForLiteratureEditing,
  openLiteratureEditorForDoc,
  editActiveLiteratureFromViewer,
  closeLiteratureLinksModal,
  literatureLinkRowSubtext,
  openLiteratureLinksModal,
  refreshLiteratureLinkDisplays,
  literatureEditorIsOpen,
  literatureEditorHasUnresolvedChanges,
  handleLiteratureBeforeUnload,
  setLiteratureSaveStatus,
  currentLiteratureEditorDraft,
  clearLiteratureAutosaveTimer,
  resetLiteratureAutosaveSession,
  markLiteratureEditorDirty,
  syncActiveLiteratureEditorDocToFolder,
  performLiteratureEditorSave,
  queueLiteratureEditorSave,
  closeLiteratureEditor,
  showLiteratureListScreen,
  showLiteratureEditorScreen,
  handleLiteratureTitleToggle,
  installLiteratureTitleToggleHandlers,
  installLiteratureListControlDelegation,
  renderLiteratureListView,
  saveLiteratureDoc,
  openLiteratureDeleteConfirm,
  closeLiteratureDeleteConfirm,
  confirmLiteratureDelete,
  deleteLiteratureDoc,
  placeLiteratureCaretFromPoint,
  insertPlainTextIntoLiteratureEditor,
  handleLiteratureEditorTextTransfer,
  applyLiteratureFormat,
  uploadLiteratureFiles,
  closeLiteratureTagModal,
  saveAndCloseLiteratureTagModal,
  openLiteratureTagModal,
  literatureDocHasUniverseTag,
  literatureDocHasEntryTag,
  toggleLiteratureUniverseTag,
  toggleLiteratureEntryTag,
  renderLiteratureTagEntryCard,
  renderLiteratureTagList,
  readBackupLiteratureForUniverse,
  normalizeImportedLiteratureDoc,
  materializeLiteratureDocForAppDataExport,
  materializeLiteratureForExport,
  prepareImportedLiteratureForUniverse,
  persistPreparedLiteratureLargeData,
  writePreparedLiteratureMetadata,
  saveImportedLiteratureForUniverse,
  saveLiteratureForUniverse,
  writeLiteratureDocToSpecificFolder,
  migrateAllLiteratureEntriesToFolder,
  syncAllLiteratureFolderEntries,
  renderLiteratureList,
};
