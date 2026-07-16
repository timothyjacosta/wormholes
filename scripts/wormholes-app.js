/* GENERATED from scripts/modules/app-core.mjs. Do not edit this direct-file compatibility adapter. */





/* Wormholes Beta 301 app core. Canonical ES-module source with a generated direct-file adapter. */

/* Generation module: moved creation roll tables and current creation state to scripts/generation.js. */

/* Application state moved to ownership-based state modules in Beta 248. */

/* Generation module: moved roll state and skip-animation preference to scripts/generation.js. */

/* Generation module: moved loadSkipRollAnimation() to scripts/generation.js. */

/* Generation module: moved saveSkipRollAnimation() to scripts/generation.js. */

/* Generation module: moved updateSkipRollAnimationControl() to scripts/generation.js. */

/* Generation module: moved handleSkipRollAnimationToggle() to scripts/generation.js. */

/* Generation module: moved updateSkipRollLayout() to scripts/generation.js. */

/* Generation module: moved installSkipRollLayoutWatcher() to scripts/generation.js. */

/* Generation module: moved shouldSkipRollAnimation() to scripts/generation.js. */

/* Generation module: moved prefersReducedMotion() to scripts/generation.js. */

/* Generation module: moved resultFromRoll() to scripts/generation.js. */

/* Generation module: moved normalizedAttributeValue() to scripts/generation.js. */

/* Generation module: moved selectedAttributeValuesFromCurrent() to scripts/generation.js. */

/* Generation module: moved resultFromRollExcluding() to scripts/generation.js. */

/* Generation module: moved animateD20() to scripts/generation.js. */

/* Generation module: moved animateQuickRollD20s() to scripts/generation.js. */

function makeId() {
  const integrity = window.WormholesIdIntegrity;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const candidate =
      window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : "creation-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    if (!integrity?.claimGeneratedId || integrity.claimGeneratedId(candidate)) return candidate;
  }
  let fallback =
    "creation-" +
    Date.now() +
    "-" +
    Math.random().toString(16).slice(2) +
    "-" +
    Math.random().toString(16).slice(2);
  while (integrity?.claimGeneratedId && !integrity.claimGeneratedId(fallback)) {
    fallback =
      "creation-" +
      Date.now() +
      "-" +
      Math.random().toString(16).slice(2) +
      "-" +
      Math.random().toString(16).slice(2);
  }
  return fallback;
}

/* WormholesSafeRender provides the shared escapeHtml() compatibility helper. */

function compactText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function directChildWithClass(element, className) {
  return (
    Array.from(element?.children || []).find((child) => child.classList?.contains(className)) ||
    null
  );
}

function firstCompactText(element, selector, fallback = "") {
  return compactText(element?.querySelector?.(selector)?.textContent || fallback);
}

function setContextualAriaLabel(container, selector, label) {
  const target = container?.querySelector?.(selector);
  if (target && label) target.setAttribute("aria-label", label);
}

function applyArchiveEntryActionLabels(entryEl) {
  const top = directChildWithClass(entryEl, "entry-top");
  if (!top) return;

  const title = firstCompactText(top, ".entry-title-main", "Untitled creation");
  const type = entryEl.classList.contains("group-entry") ? "creation group" : "creation";
  const openLabel = entryEl.classList.contains("group-entry")
    ? `Open or collapse ${type}: ${title}`
    : `Open ${type}: ${title}`;

  setContextualAriaLabel(top, ".entry-title", openLabel);
  setContextualAriaLabel(top, ".menu-button", `Open actions for ${type}: ${title}`);
  setContextualAriaLabel(top, ".edit-action", `Edit ${type}: ${title}`);
  setContextualAriaLabel(top, ".summarize-action", `Add or edit summary for ${type}: ${title}`);
  setContextualAriaLabel(top, ".note-action", `Add note to ${type}: ${title}`);
  setContextualAriaLabel(top, ".group-action", `Group creation: ${title}`);
  setContextualAriaLabel(top, ".edit-group-action", `Edit creation group: ${title}`);
  setContextualAriaLabel(top, ".ungroup-action", `Ungroup creation group: ${title}`);
  setContextualAriaLabel(
    top,
    ".move-universe-action",
    `Move ${type} to another universe: ${title}`,
  );
  setContextualAriaLabel(
    top,
    ".copy-universe-action",
    `Copy ${type} to another universe: ${title}`,
  );
  setContextualAriaLabel(top, ".connect-action", `Connect ${type}: ${title}`);
  setContextualAriaLabel(top, ".bridge-action", `Bridge ${type}: ${title}`);
  setContextualAriaLabel(top, ".delete-action", `Delete ${type}: ${title}`);
}
/* Literature module: moved applyLiteratureEntryActionLabels() to scripts/literature.js. */

/* Vision Board module: moved applyVisionPinActionLabels() to scripts/vision-board.js. */

function applyContextualActionAriaLabels(root = document) {
  const archiveEntriesToLabel =
    root?.id === "archiveList"
      ? root.querySelectorAll?.(".entry")
      : root.querySelectorAll?.("#archiveList .entry");
  archiveEntriesToLabel?.forEach(applyArchiveEntryActionLabels);

  const literatureEntriesToLabel =
    root?.id === "literatureList"
      ? root.querySelectorAll?.(".entry")
      : root.querySelectorAll?.("#literatureList .entry");
  literatureEntriesToLabel?.forEach(applyLiteratureEntryActionLabels);

  const visionPinsToLabel =
    root?.id === "visionBoardGrid"
      ? root.querySelectorAll?.(".vision-pin")
      : root.querySelectorAll?.("#visionBoardGrid .vision-pin");
  visionPinsToLabel?.forEach(applyVisionPinActionLabels);
}

function installSvgKeyboardActivation(element) {
  if (!element || element.dataset.keyboardActivationInstalled === "true") return;
  element.dataset.keyboardActivationInstalled = "true";
  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    element.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true, view: window}));
  });
}

function labelConnectionMapNode(node) {
  const text = compactText(node.textContent) || "Map item";
  const type = node.dataset.type || "item";
  if (type === "current-universe")
    return `Current universe: ${text}. Press Enter to select or bridge.`;
  if (type === "external") return `External map item: ${text}. Press Enter to select or bridge.`;
  return `Creation: ${text}. Press Enter to select, connect, or bridge.`;
}

function labelConnectionMapEdge(edge) {
  const noteLabel = edge.dataset.label || "Connection line";
  if (edge.classList.contains("bridge-note-edge"))
    return `Bridge: ${compactText(noteLabel)}. Press Enter to add or edit notes.`;
  const source = edge.dataset.source ? getTitle(edge.dataset.source) : "source";
  const target = edge.dataset.target ? getTitle(edge.dataset.target) : "target";
  return `Connection: ${source} to ${target}. Press Enter to add or edit notes.`;
}

function improveSvgMapAccessibility(root = document) {
  root.querySelectorAll?.(".connection-node").forEach((node) => {
    node.setAttribute("role", "button");
    node.setAttribute("tabindex", "0");
    node.setAttribute("aria-label", labelConnectionMapNode(node));
    node.setAttribute("aria-pressed", node.classList.contains("selected") ? "true" : "false");
    installSvgKeyboardActivation(node);
  });
  root.querySelectorAll?.(".connection-edge-group").forEach((edge) => {
    edge.setAttribute("role", "button");
    edge.setAttribute("tabindex", "0");
    edge.setAttribute("aria-label", labelConnectionMapEdge(edge));
    installSvgKeyboardActivation(edge);
  });
  root.querySelectorAll?.(".wormhole-cluster-title").forEach((node) => {
    node.setAttribute("role", "button");
    node.setAttribute("tabindex", "0");
    node.setAttribute(
      "aria-label",
      `Universe: ${compactText(node.textContent) || "Untitled Universe"}. Press Enter to select.`,
    );
    installSvgKeyboardActivation(node);
  });
  root.querySelectorAll?.(".wormhole-creation").forEach((node) => {
    node.setAttribute("role", "button");
    node.setAttribute("tabindex", "0");
    node.setAttribute(
      "aria-label",
      `Creation: ${compactText(node.textContent) || "Untitled Creation"}. Press Enter to select or bridge.`,
    );
    installSvgKeyboardActivation(node);
  });
  root.querySelectorAll?.(".wormhole-bridge-note-group").forEach((edge) => {
    edge.setAttribute("role", "button");
    edge.setAttribute("tabindex", "0");
    edge.setAttribute(
      "aria-label",
      `Bridge: ${compactText(edge.dataset.label || "Bridge line")}. Press Enter to add or edit notes.`,
    );
    installSvgKeyboardActivation(edge);
  });
}

/* Shell interface: moved displayValue() and hasCurrentCreation() to scripts/wormholes-shell-interface.js. */

/* Archive module: moved getEntry() to scripts/archive.js. */

/* Archive module: moved getTitle() to scripts/archive.js. */

/* Archive module: moved isGroupEntry() to scripts/archive.js. */

/* Archive module: moved groupChildIds() to scripts/archive.js. */

/* Archive module: moved getGroupForEntryId() to scripts/archive.js. */

/* Archive module: moved topLevelArchiveEntries() to scripts/archive.js. */

/* Archive module: moved mapArchiveEntries() to scripts/archive.js. */

/* Archive module: moved mapEntryForIdInEntries() to scripts/archive.js. */

/* Archive module: moved getMapArchiveEntryFromUniverse() to scripts/archive.js. */

/* Archive module: moved visibleEntryIdForUniverseEntry() to scripts/archive.js. */

/* Archive module: moved visibleEntryTitleForUniverseEntry() to scripts/archive.js. */

/* Archive module: moved isGroupedChildInUniverse() to scripts/archive.js. */

/* Archive module: moved displayEntryWhat() to scripts/archive.js. */

/* Archive module: moved normalizeArchiveGroups() to scripts/archive.js. */

function addUniqueId(list, id) {
  if (!id) return list || [];
  const next = list || [];
  if (!next.includes(id)) next.push(id);
  return next;
}

function addUniqueBridgeToEntry(entry, bridge) {
  if (!entry || !bridge || !bridge.universeId) return;
  const key = bridgeKey(bridge.universeId, bridge.creationId);
  entry.bridges = normalizeBridges(entry.bridges);
  if (!entry.bridges.some((item) => bridgeKey(item.universeId, item.creationId) === key)) {
    entry.bridges.push({
      universeId: bridge.universeId,
      creationId: bridge.creationId || null,
    });
  }
}

function moveConnectionNote(fromA, fromB, toA, toB) {
  const oldKey = connectionKey(fromA, fromB);
  const newKey = connectionKey(toA, toB);
  if (connectionNotes[oldKey] && !connectionNotes[newKey]) {
    connectionNotes[newKey] = connectionNotes[oldKey];
  }
  delete connectionNotes[oldKey];
}

function moveBridgeNotesFromChildrenToGroup(childIds, groupId, universeId = currentUniverseId) {
  const childKeys = new Set(childIds.map((id) => `C:${universeId}:${id}`));
  const groupKey = `C:${universeId}:${groupId}`;
  let changed = false;

  Object.keys(bridgeNotes).forEach((key) => {
    const parts = key.split("||");
    if (!parts.some((part) => childKeys.has(part))) return;

    const newKey = parts
      .map((part) => (childKeys.has(part) ? groupKey : part))
      .sort()
      .join("||");

    if (!bridgeNotes[newKey]) {
      bridgeNotes[newKey] = bridgeNotes[key];
    }
    delete bridgeNotes[key];
    changed = true;
  });

  if (changed) {
    saveBridgeNotesToStorage();
  }
}

function redirectIncomingBridgesToGroup(childIds, groupId, universeId = currentUniverseId) {
  const childSet = new Set(childIds);
  let universesChanged = false;

  universes.forEach((universe) => {
    universe.bridges = normalizeUniverseBridges(universe).map((bridge) => {
      if (bridge.universeId === universeId && childSet.has(bridge.creationId)) {
        universesChanged = true;
        return {...bridge, creationId: groupId};
      }
      return bridge;
    });

    const archive =
      universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id);
    let archiveChanged = false;

    archive.forEach((entry) => {
      if (childSet.has(entry.id) && universe.id === universeId) return;

      const nextBridges = [];
      const seen = new Set();

      normalizeBridges(entry.bridges).forEach((bridge) => {
        const redirected =
          bridge.universeId === universeId && childSet.has(bridge.creationId)
            ? {...bridge, creationId: groupId}
            : bridge;
        const key = bridgeKey(redirected.universeId, redirected.creationId);
        if (!seen.has(key)) {
          seen.add(key);
          nextBridges.push(redirected);
        }
        if (key !== bridgeKey(bridge.universeId, bridge.creationId)) {
          archiveChanged = true;
        }
      });

      entry.bridges = nextBridges;
    });

    if (archiveChanged && universe.id !== currentUniverseId) {
      saveArchiveForUniverse(universe.id, archive);
    }
  });

  if (universesChanged) {
    saveUniversesToStorage();
  }
}

function transferGroupedExternalLinksToGroup(groupEntry, selectedIds) {
  if (!groupEntry || !currentUniverseId) return;

  const childSet = new Set(selectedIds);
  const outsideConnectionIds = new Set();

  selectedIds.forEach((childId) => {
    const child = getEntry(childId);
    if (!child) return;

    child.connections = child.connections || [];
    const keptChildConnections = [];

    child.connections.forEach((targetId) => {
      if (childSet.has(targetId)) {
        keptChildConnections.push(targetId);
        return;
      }

      const target = getEntry(targetId);
      if (!target || targetId === groupEntry.id) return;

      outsideConnectionIds.add(targetId);
      target.connections = (target.connections || []).filter(
        (id) => id !== childId && !childSet.has(id),
      );
      target.connections = addUniqueId(target.connections, groupEntry.id);
      moveConnectionNote(childId, targetId, groupEntry.id, targetId);
    });

    child.connections = Array.from(new Set(keptChildConnections));

    normalizeBridges(child.bridges).forEach((bridge) => addUniqueBridgeToEntry(groupEntry, bridge));
    child.bridges = [];
  });

  groupEntry.connections = groupEntry.connections || [];
  outsideConnectionIds.forEach((targetId) => {
    groupEntry.connections = addUniqueId(groupEntry.connections, targetId);
  });

  groupEntry.bridges = normalizeBridges(groupEntry.bridges);
  redirectIncomingBridgesToGroup(selectedIds, groupEntry.id, currentUniverseId);
  moveBridgeNotesFromChildrenToGroup(selectedIds, groupEntry.id, currentUniverseId);
  saveConnectionNotesToStorage();
}

/* Shell interface: moved tab switching, Generate rendering, and button-state orchestration to scripts/wormholes-shell-interface.js. */

/* Connections module: moved renderConnectStatus() to scripts/connections.js in Beta 138. */

/* Storage module: moved localStorage safety helpers to scripts/storage.js. */

/* Shell interface: moved notification orchestration to scripts/wormholes-shell-interface.js. */

/* Connections module: moved connectionsWorkspaceIsActive() to scripts/connections.js in Beta 138. */

/* Connections module: moved shouldSuppressRelationshipToast() to scripts/connections.js in Beta 138. */

/* Shell interface: moved app-error routing to scripts/wormholes-shell-interface.js. */
/* Literature module: moved openLiteratureGroupModal() to scripts/literature.js. */

/* Literature module: moved openEditLiteratureGroupModal() to scripts/literature.js. */

/* Literature module: moved createLiteratureGroupFromModal() to scripts/literature.js. */

/* Literature module: moved saveEditedLiteratureGroupFromModal() to scripts/literature.js. */

/* Literature module: moved ungroupLiteratureGroup() to scripts/literature.js. */

/* Archive module: moved removeExternalReferencesToGroup() to scripts/archive.js. */

/* Archive module: moved removeGroupRelationshipNotes() to scripts/archive.js. */

/* Archive module: moved ungroupEntry() to scripts/archive.js. */

/* Archive module: moved openGroupConnectionModal() to scripts/archive.js. */

/* Archive module: moved closeGroupConnectionModal() to scripts/archive.js. */

/* Archive module: moved applyGroupConnectionChoice() to scripts/archive.js. */

/* Connections module: moved openConnectPickerModal() to scripts/connections.js in Beta 138. */

/* Connections module: moved closeConnectPickerModal() to scripts/connections.js in Beta 138. */

/* Connections module: moved renderConnectEntryPicker() to scripts/connections.js in Beta 138. */

/* Connections module: moved renderConnectPickerList() to scripts/connections.js in Beta 138. */

/* Connections module: moved applyConnectPickerChoice() to scripts/connections.js in Beta 138. */

/* Connections module: moved saveConnectPickerModal() to scripts/connections.js in Beta 138. */

/* Beta 37 large-data helpers: metadata stays in localStorage; bulky literature/image data moves to IndexedDB. */
function largeDataStore() {
  return window.WormholesRepositories?.largeData || null;
}
function largeDataStoreAvailable() {
  return !!largeDataStore()?.supported;
}
/* Literature module: moved literatureContentStoreKeyFor() to scripts/literature.js. */

/* Vision Board module: moved visionDataStoreKeyFor() to scripts/vision-board.js. */
/* Vision Board module: moved visionThumbnailStoreKeyFor() to scripts/vision-board.js. */
async function persistLargeDataValue(key, value, label) {
  if (!key || !largeDataStoreAvailable()) return false;
  try {
    await largeDataStore().put(key, value || "");
    requestStorageFootnoteUpdate();
    return true;
  } catch (e) {
    reportAppError(`Could not save ${label || "large data"} outside localStorage`, e, {
      userMessage: "Storage needs attention. Some large data was not saved.",
    });
    return false;
  }
}
async function loadLargeDataValue(key, label) {
  if (!key || !largeDataStoreAvailable()) return "";
  try {
    return (await largeDataStore().get(key)) || "";
  } catch (e) {
    reportAppError(`Could not load ${label || "large data"}`, e, {
      userMessage: "Storage needs attention. Some saved data could not be loaded.",
    });
    return "";
  }
}
async function deleteLargeDataValue(key) {
  if (!key || !largeDataStoreAvailable()) return false;
  try {
    await largeDataStore().delete(key);
    requestStorageFootnoteUpdate();
    return true;
  } catch (e) {
    reportAppError("Could not remove large data from app storage", e, {
      userMessage: "Some old app data could not be removed.",
    });
    return false;
  }
}
/* Universes module: moved deleteUniverseLargeData() to scripts/universes.js. */

/* Literature module: moved literatureMetadataStorageKeyFor() to scripts/literature.js. */

/* Vision Board module: moved visionMetadataStorageKeyFor() to scripts/vision-board.js. */
/* Literature module: moved trimLiteratureDocForLocalStorage() to scripts/literature.js. */

/* Literature module: moved writeLiteratureMetadataOnly() to scripts/literature.js. */

/* Literature module: moved persistLiteratureLargeData() to scripts/literature.js. */

/* Literature module: moved scheduleLiteratureLargeDataSave() to scripts/literature.js. */

/* Literature module: moved materializeLiteratureDocForUniverse() to scripts/literature.js. */

/* Literature module: moved hydrateLiteratureEntriesFromLargeDataStore() to scripts/literature.js. */

/* Vision Board module: moved trimVisionItemForLocalStorage() to scripts/vision-board.js. */
/* Vision Board module: moved writeVisionMetadataOnly() to scripts/vision-board.js. */
/* Vision Board module: moved persistVisionLargeData() to scripts/vision-board.js. */
/* Vision Board module: moved scheduleVisionLargeDataSave() to scripts/vision-board.js. */
/* Vision Board module: moved materializeVisionItemLargeData() to scripts/vision-board.js. */
/* Vision Board module: moved deleteVisionLargeData() to scripts/vision-board.js. */
/* Literature module: moved loadLiteratureFromStorage() to scripts/literature.js. */

/* Literature module: moved normalizeLiteratureDoc() to scripts/literature.js. */

/* Literature module: moved normalizeLiteratureEntries() to scripts/literature.js. */

/* Literature module: moved saveLiteratureToStorage() to scripts/literature.js. */

/* Literature module: moved writeLiteratureDocToFolder() to scripts/literature.js. */

/* Document, DOCX, and ZIP helpers moved to scripts/modules/document-zip-helpers.mjs in Beta 249. */

/* Literature module: moved convertUploadedFileToLiterature() to scripts/literature.js. */

/* Literature module: moved readLiteratureForUniverse() to scripts/literature.js. */

/* Literature module: moved normalizedLiteratureListForUniverse() to scripts/literature.js. */

/* Literature module: moved allLiteratureEntriesWithHome() to scripts/literature.js. */

/* Literature module: moved literatureDocsForUniverseTag() to scripts/literature.js. */

/* Literature module: moved literatureDocsForEntryTag() to scripts/literature.js. */

/* Literature module: moved literatureDocsForUniverseAndEntriesTag() to scripts/literature.js. */

/* Literature module: moved literatureDocsForGroupChildrenTag() to scripts/literature.js. */

/* Literature module: moved literatureCountForUniverseTag() to scripts/literature.js. */

/* Literature module: moved literatureCountForUniverseAndEntriesTag() to scripts/literature.js. */

/* Literature module: moved literatureCountForEntryTag() to scripts/literature.js. */

/* Literature module: moved literatureCountForGroupChildrenTag() to scripts/literature.js. */

/* Vision Board module: moved allVisionItemsWithHomeUniverse() to scripts/vision-board.js. */

/* Vision Board module: moved getVisionItem() to scripts/vision-board.js. */

/* Vision Board module: moved getVisionItemFromUniverse() to scripts/vision-board.js. */

/* Vision Board module: moved visionItemHasUniverseTag() to scripts/vision-board.js. */

/* Vision Board module: moved visionItemHasEntryTag() to scripts/vision-board.js. */

/* Vision Board module: moved visionItemsForUniverseTag() to scripts/vision-board.js. */

/* Vision Board module: moved visionItemsForEntryTag() to scripts/vision-board.js. */

/* Vision Board module: moved visionItemsForUniverseAndEntriesTag() to scripts/vision-board.js. */

/* Vision Board module: moved visionItemsForGroupChildrenTag() to scripts/vision-board.js. */

/* Vision Board module: moved visionCountForUniverseTag() to scripts/vision-board.js. */

/* Vision Board module: moved visionCountForUniverseAndEntriesTag() to scripts/vision-board.js. */

/* Vision Board module: moved visionCountForEntryTag() to scripts/vision-board.js. */

/* Vision Board module: moved visionCountForGroupChildrenTag() to scripts/vision-board.js. */

/* Vision Board module: moved normalizeVisionEntry() to scripts/vision-board.js. */

/* Vision Board module: moved loadVisionBoardFromStorage() to scripts/vision-board.js. */

/* Vision Board module: moved saveVisionBoardToStorage() to scripts/vision-board.js. */

/* Vision Board module: moved visionFileKind() to scripts/vision-board.js. */

/* Vision Board module: moved mimeTypeFromDataUrl() to scripts/vision-board.js. */
/* Vision Board module: moved dataUrlWithMimeType() to scripts/vision-board.js. */

/* Vision Board module: moved visionMimeTypeForFolderFile() to scripts/vision-board.js. */

/* Vision Board module: moved visionOutputMimeTypeForFile() to scripts/vision-board.js. */

/* Vision Board module: moved visionExtensionForMimeType() to scripts/vision-board.js. */

/* Vision Board module: moved visionStoredMimeType() to scripts/vision-board.js. */

/* Vision Board module: moved visionExtensionForStoredItem() to scripts/vision-board.js. */

/* Vision Board module: moved readFileAsDataUrl() to scripts/vision-board.js. */

/* Vision Board module: moved loadImageElementFromFile() to scripts/vision-board.js. */

/* Vision Board module: moved imageFileToCanvasDataUrl() to scripts/vision-board.js. */

/* Vision Board module: moved imageFileToPinboardDataUrl() to scripts/vision-board.js. */

/* Vision Board module: moved imageFileToThumbnailDataUrl() to scripts/vision-board.js. */

/* Vision Board module: moved imageBlobToThumbnailBlob() to scripts/vision-board.js. */

/* Vision Board module: moved convertUploadedVisionFile() to scripts/vision-board.js. */

/* Vision Board module: moved migrateVisionBoardToFolder() to scripts/vision-board.js. */

/* Vision Board module: moved syncVisionFolderEntries() to scripts/vision-board.js. */

/* Vision Board module: moved visionItemDisplaySrc() to scripts/vision-board.js. */

/* Vision Board module: moved renderVisionBoard() to scripts/vision-board.js. */

/* Vision Board module: moved closeExpandedVisionImage() to scripts/vision-board.js. */

/* Vision Board module: moved openExpandedVisionImage() to scripts/vision-board.js. */

/* Vision Board module: moved toggleExpandedVisionImage() to scripts/vision-board.js. */

/* Vision Board module: moved handleVisionBoardDelegatedClick() to scripts/vision-board.js. */

/* Vision Board module: moved installVisionBoardMenuHandlers() to scripts/vision-board.js. */

/* Vision Board module: moved openVisionRenameModal() to scripts/vision-board.js. */

/* Vision Board module: moved closeVisionRenameModal() to scripts/vision-board.js. */

/* Vision Board module: moved saveVisionRename() to scripts/vision-board.js. */

/* Vision Board module: moved moveVisionItem() to scripts/vision-board.js. */

/* Vision Board module: moved finishVisionMoveMode() to scripts/vision-board.js. */

/* Vision Board module: moved moveVisionItemToIndex() to scripts/vision-board.js. */

/* Vision Board module: moved moveVisionItemToTarget() to scripts/vision-board.js. */

/* Vision Board module: moved moveVisionItemToEnd() to scripts/vision-board.js. */

/* Vision Board module: moved openVisionDeleteConfirm() to scripts/vision-board.js. */

/* Vision Board module: moved closeVisionDeleteConfirm() to scripts/vision-board.js. */

/* Vision Board module: moved confirmVisionDelete() to scripts/vision-board.js. */

/* Vision Board module: moved deleteVisionItem() to scripts/vision-board.js. */

/* Vision Board module: moved openVisionLinksModal() to scripts/vision-board.js. */

/* Vision Board module: moved populateVisionLinksThumbnails() to scripts/vision-board.js. */

/* Vision Board module: moved closeVisionLinksModal() to scripts/vision-board.js. */

/* Vision Board module: moved clearVisionImageViewerObjectUrl() to scripts/vision-board.js. */

/* Vision Board module: moved resetVisionImageViewer() to scripts/vision-board.js. */

/* Vision Board module: moved openVisionImageViewer() to scripts/vision-board.js. */

/* Vision Board module: moved closeVisionImageViewerModal() to scripts/vision-board.js. */

/* Vision Board module: moved bindVisionBadgeClickHandlers() to scripts/vision-board.js. */

/* Vision Board module: moved openVisionUploadModal() to scripts/vision-board.js. */

/* Vision Board module: moved closeVisionUploadModal() to scripts/vision-board.js. */

/* Vision Board module: moved chooseVisionUploadFiles() to scripts/vision-board.js. */

/* Vision Board module: moved uploadVisionFiles() to scripts/vision-board.js. */
/* Literature module: moved showLiteratureFolderMessage() to scripts/literature.js. */

/* Vision Board module: moved connectVisionLocalFolder() to scripts/vision-board.js. */
/* Literature module: moved connectLiteratureLocalFolder() to scripts/literature.js. */

/* Literature module: moved literatureBadgeHtml() to scripts/literature.js. */

/* Archive module: moved archiveLiteratureBadgeHtml() to scripts/archive.js. */

/* Archive module: moved archiveVisionThumbnailsHtml() to scripts/archive.js. */

/* Literature module: moved literatureBadgeSvg() to scripts/literature.js. */

/* Vision Board module: moved visionBadgeSvg() to scripts/vision-board.js. */

function badgeStackCounts(type, universeId, entryId, count = null, visionCount = null) {
  return {
    literature:
      count ??
      (type === "universe"
        ? literatureCountForUniverseTag(universeId)
        : type === "groupChildren"
          ? literatureCountForGroupChildrenTag(universeId, entryId)
          : literatureCountForEntryTag(universeId, entryId)),
    vision:
      visionCount ??
      (type === "universe"
        ? visionCountForUniverseTag(universeId)
        : type === "groupChildren"
          ? visionCountForGroupChildrenTag(universeId, entryId)
          : visionCountForEntryTag(universeId, entryId)),
  };
}

function badgeStackSvgAt(type, universeId, entryId, x, y, count = null, visionCount = null) {
  const totals = badgeStackCounts(type, universeId, entryId, count, visionCount);
  const hasLiterature = totals.literature > 0;
  const hasVision = totals.vision > 0;
  if (!hasLiterature && !hasVision) return "";

  const horizontalGap = 36;
  const literatureLocalX = hasLiterature && hasVision ? -horizontalGap / 2 : 0;
  const visionLocalX = hasLiterature && hasVision ? horizontalGap / 2 : 0;

  return `
    <g class="svg-badge-stack" data-badge-x="${x}" data-badge-y="${y}" transform="${svgBadgeStackTransform(x, y)}">
      ${hasLiterature ? literatureBadgeSvg(type, universeId, entryId, literatureLocalX, totals.literature) : ""}
      ${hasVision ? visionBadgeSvg(type, universeId, entryId, visionLocalX, totals.vision) : ""}
    </g>
  `;
}

function circleBadgeStackSvg(type, universeId, entryId, cx, cy, r, options = {}) {
  const totals = badgeStackCounts(
    type,
    universeId,
    entryId,
    options.count ?? null,
    options.visionCount ?? null,
  );
  if (totals.literature <= 0 && totals.vision <= 0) return "";

  const anchorX = cx;
  const anchorY = cy + r;
  return badgeStackSvgAt(
    type,
    universeId,
    entryId,
    anchorX,
    anchorY,
    totals.literature,
    totals.vision,
  );
}

function rectangleBadgeStackSvg(type, universeId, entryId, shape, options = {}) {
  const totals = badgeStackCounts(
    type,
    universeId,
    entryId,
    options.count ?? null,
    options.visionCount ?? null,
  );
  if (totals.literature <= 0 && totals.vision <= 0) return "";

  const anchorX = shape.x + shape.w / 2;
  const anchorY = shape.y + shape.h;
  return badgeStackSvgAt(
    type,
    universeId,
    entryId,
    anchorX,
    anchorY,
    totals.literature,
    totals.vision,
  );
}
/* Literature module: moved renderLiteratureTags() to scripts/literature.js. */

/* Vision Board module: moved visionTagTargets() to scripts/vision-board.js. */

/* Vision Board module: moved visionTagLabels() to scripts/vision-board.js. */

/* Vision Board module: moved visionTagCount() to scripts/vision-board.js. */

/* Vision Board module: moved visionTagCountBadgeHtml() to scripts/vision-board.js. */

/* Vision Board module: moved renderVisionTagsHtml() to scripts/vision-board.js. */

/* Vision Board module: moved openVisionTagGoModal() to scripts/vision-board.js. */

/* Vision Board module: moved closeVisionTagGoModal() to scripts/vision-board.js. */

/* Archive module: moved markArchiveEntryOpen() to scripts/archive.js. */

/* Archive module: moved applyPendingArchiveReveal() to scripts/archive.js. */

/* Archive module: moved revealArchiveEntryForTag() to scripts/archive.js. */

/* Vision Board module: moved goToVisionTagTarget() to scripts/vision-board.js. */
/* Literature module: moved openLiteratureViewer() to scripts/literature.js. */

/* Literature module: moved closeLiteratureViewer() to scripts/literature.js. */

/* Literature module: moved openLiteratureUploadModal() to scripts/literature.js. */

/* Literature module: moved closeLiteratureUploadModal() to scripts/literature.js. */

/* Literature module: moved chooseLiteratureUploadFiles() to scripts/literature.js. */

/* Literature module: moved closeMapViewsForLiteratureJump() to scripts/literature.js. */

/* Literature module: moved loadUniverseForLiteratureEditing() to scripts/literature.js. */

/* Literature module: moved openLiteratureEditorForDoc() to scripts/literature.js. */

/* Literature module: moved editActiveLiteratureFromViewer() to scripts/literature.js. */

/* Literature module: moved closeLiteratureLinksModal() to scripts/literature.js. */

/* Literature module: moved literatureLinkRowSubtext() to scripts/literature.js. */

/* Literature module: moved openLiteratureLinksModal() to scripts/literature.js. */

/* Literature module: moved refreshLiteratureLinkDisplays() to scripts/literature.js. */

/* Literature module: moved showLiteratureListScreen() to scripts/literature.js. */

/* Literature module: moved showLiteratureEditorScreen() to scripts/literature.js. */

/* Literature module: moved installLiteratureListControlDelegation() to scripts/literature.js. */

/* Literature module: moved renderLiteratureList() to scripts/literature.js. */

/* Literature module: moved saveLiteratureDoc() to scripts/literature.js. */

/* Literature module: moved deleteLiteratureDoc() to scripts/literature.js. */

/* Literature module: moved applyLiteratureFormat() to scripts/literature.js. */

/* Literature module: moved uploadLiteratureFiles() to scripts/literature.js. */

/* Literature module: moved closeLiteratureTagModal() to scripts/literature.js. */

/* Literature module: moved saveAndCloseLiteratureTagModal() to scripts/literature.js. */

/* Literature module: moved openLiteratureTagModal() to scripts/literature.js. */

/* Vision Board module: moved openVisionTagModal() to scripts/vision-board.js. */
/* Literature module: moved literatureDocHasUniverseTag() to scripts/literature.js. */

/* Literature module: moved literatureDocHasEntryTag() to scripts/literature.js. */

/* Literature module: moved toggleLiteratureUniverseTag() to scripts/literature.js. */

/* Literature module: moved toggleLiteratureEntryTag() to scripts/literature.js. */

/* Vision Board module: moved toggleVisionUniverseTag() to scripts/vision-board.js. */

/* Vision Board module: moved toggleVisionEntryTag() to scripts/vision-board.js. */
/* Literature module: moved renderLiteratureTagEntryCard() to scripts/literature.js. */

/* Literature module: moved renderLiteratureTagList() to scripts/literature.js. */

/* Archive module: moved renderArchive() to scripts/archive.js. */

/* Archive module: moved populateArchiveVisionThumbnails() to scripts/archive.js. */

/* Archive module: moved connectEntries() to scripts/archive.js. */

/* Archive module: moved deleteEntry() to scripts/archive.js. */

/* Archive module: moved archiveForUniverseLinkCheck() to scripts/archive.js. */

/* Archive module: moved entityExistsInUniverse() to scripts/archive.js. */

/* Archive module: moved linkBridgeTargetStillExists() to scripts/archive.js. */

/* Archive module: moved uniqueList() to scripts/archive.js. */

/* Archive module: moved cleanupConnectionNotesForArchive() to scripts/archive.js. */

/* Archive module: moved bridgeNoteNodeStillExists() to scripts/archive.js. */

/* Archive module: moved cleanupBridgeNotes() to scripts/archive.js. */

/* Archive module: moved cleanupLinksInArchive() to scripts/archive.js. */

/* Archive module: moved cleanupAllStaleLinks() to scripts/archive.js. */

/* Archive module: moved cleanupLinksToDeletedEntity() to scripts/archive.js. */

/* Modals/settings module: moved closeMenus() to scripts/modals-settings.js. */

/* Modals/settings module: moved openPositionedMenu() to scripts/modals-settings.js. */

/* Modals/settings module: moved togglePositionedMenu() to scripts/modals-settings.js. */

/* Storage module: moved storage key constants and migration helpers to scripts/storage.js. */

/* Storage module: moved folder storage key constants to scripts/storage.js. */

/* Folder storage module: moved local-folder and file-handle helpers to scripts/folder-storage.js. */

const WORMHOLES_APP_VERSION = "Beta 301";
const WORMHOLES_APP_SCHEMA_VERSION = window.WormholesSchemaVersions?.current || 5;
/* Storage module: moved schema storage key to scripts/storage.js. */
const WORMHOLES_MANAGED_MARKER = ".wormholes-managed.json";
const WORMHOLES_CATEGORY_NAMES = new Set(["Creations", "Literature", "Images"]);
/* Export/import module: moved WORMHOLES_BACKUP_MANIFEST_FILE to scripts/export-import.js. */

/* Storage module: moved readStoredSchemaVersion() to scripts/storage.js. */

/* Storage module: moved saveStoredSchemaVersion() to scripts/storage.js. */

/* Universes module: moved normalizeBridgeListForImport() to scripts/universes.js. */

/* Universes module: moved normalizeSchemaUniverse() to scripts/universes.js. */

/* Archive module: moved normalizeSchemaArchiveEntry() to scripts/archive.js. */

/* Export/import module: moved migrateWormholesAppDataImport to scripts/export-import.js. */

/* Universes module: moved runAppSchemaMigrations() to scripts/universes.js. */

/* Modals/settings module: moved installOnboardingTooltips() to scripts/modals-settings.js. */

/* Universes module: moved universeIdSuffix() to scripts/universes.js. */

/* Universes module: moved stableUniverseFolderName() to scripts/universes.js. */

/* Universes module: moved legacyUniverseFolderName() to scripts/universes.js. */

/* Universes module: moved ensureUniverseDiskFolderName() to scripts/universes.js. */

/* Universes module: moved normalizedUniverseTitle() to scripts/universes.js. */

/* Universes module: moved duplicateUniverseTitleExists() to scripts/universes.js. */

/* Modals/settings module: moved setModalErrorText() to scripts/modals-settings.js. */

/* Generation module: moved isCurrentCreationComplete() to scripts/generation.js. */

/* Generation module: moved manualIsComplete() to scripts/generation.js. */

/* Generation module: moved manualHasArchivableCreationData() to scripts/generation.js. */

/* Generation module: moved valueOrNull() to scripts/generation.js. */

/* Archive module: moved entryHasArchivableCreationData() to scripts/archive.js. */

async function writeManagedFolderMarker(folderHandle, meta = {}) {
  if (!folderHandle) return false;
  try {
    const payload = {
      app: "Wormholes",
      managed: true,
      version: WORMHOLES_APP_VERSION,
      updatedAt: new Date().toISOString(),
      ...meta,
    };
    await writeBlobToFolder(
      folderHandle,
      WORMHOLES_MANAGED_MARKER,
      new Blob([JSON.stringify(payload, null, 2)], {type: "application/json"}),
    );
    return true;
  } catch (e) {
    return false;
  }
}

async function folderHasManagedMarker(folderHandle) {
  if (!folderHandle) return false;
  try {
    await folderHandle.getFileHandle(WORMHOLES_MANAGED_MARKER, {create: false});
    return true;
  } catch (e) {
    return false;
  }
}

function folderNameLooksManagedUniverse(name) {
  return /\s--\s[a-z0-9-]{8,}$/i.test(String(name || ""));
}

/* Archive module: moved cloneMigratedArchiveEntries() to scripts/archive.js. */

/* Archive module: moved remapBridgeNotesForMigratedEntries() to scripts/archive.js. */

/* Archive module: moved remapIncomingBridgesForMigration() to scripts/archive.js. */

/* Archive module: moved cleanupConnectionsForRemovedEntries() to scripts/archive.js. */

function universeFolderName(universe) {
  return ensureUniverseDiskFolderName(universe);
}

async function ensureUniverseFolders(universe) {
  if (
    !wormholesLiteratureRootHandle ||
    !wormholesImagesRootHandle ||
    !wormholesCreationsRootHandle ||
    !universe
  )
    return null;

  const folderName = universeFolderName(universe);
  const literature = await getOrCreateDirectory(wormholesLiteratureRootHandle, folderName);
  const images = await getOrCreateDirectory(wormholesImagesRootHandle, folderName);
  const creations = await getOrCreateDirectory(wormholesCreationsRootHandle, folderName);

  await writeManagedFolderMarker(literature, {
    kind: "literature",
    universeId: universe.id,
    title: universe.title,
  });
  await writeManagedFolderMarker(images, {
    kind: "images",
    universeId: universe.id,
    title: universe.title,
  });
  await writeManagedFolderMarker(creations, {
    kind: "creations",
    universeId: universe.id,
    title: universe.title,
  });

  return {literature, images, creations};
}

async function ensureAllUniverseFolders() {
  if (!wormholesLiteratureRootHandle || !wormholesImagesRootHandle || !wormholesCreationsRootHandle)
    return;

  for (const universe of universes) {
    await ensureUniverseFolders(universe);
  }
}

async function prepareWormholesFolderHandles(options = {}) {
  const shouldRequest = options.requestPermission !== false;

  if (!wormholesParentFolderHandle) return false;
  const allowed = shouldRequest
    ? await requestFolderPermission(wormholesParentFolderHandle)
    : await hasFolderPermission(wormholesParentFolderHandle);

  if (!allowed) return false;

  wormholesRootFolderHandle =
    wormholesParentFolderHandle.name === "Wormholes" ||
    (await folderHasCategoryDirectories(wormholesParentFolderHandle))
      ? wormholesParentFolderHandle
      : await getOrCreateDirectory(wormholesParentFolderHandle, "Wormholes");
  await writeManagedFolderMarker(wormholesRootFolderHandle, {kind: "root"});

  wormholesLiteratureRootHandle = await getOrCreateDirectory(
    wormholesRootFolderHandle,
    "Literature",
  );
  wormholesImagesRootHandle = await getOrCreateDirectory(wormholesRootFolderHandle, "Images");
  wormholesCreationsRootHandle = await getOrCreateDirectory(wormholesRootFolderHandle, "Creations");
  await writeManagedFolderMarker(wormholesLiteratureRootHandle, {kind: "literature-root"});
  await writeManagedFolderMarker(wormholesImagesRootHandle, {kind: "images-root"});
  await writeManagedFolderMarker(wormholesCreationsRootHandle, {kind: "creations-root"});

  await ensureAllUniverseFolders();

  const currentUniverse = getCurrentUniverse();
  if (currentUniverse) {
    const folders = await ensureUniverseFolders(currentUniverse);
    literatureFolderHandle = folders?.literature || null;
    visionFolderHandle = folders?.images || null;
    creationFolderHandle = folders?.creations || null;
  }

  return true;
}
async function verifyWormholesFolderHandles() {
  if (!wormholesParentFolderHandle) return false;

  try {
    const ready = await prepareWormholesFolderHandles({requestPermission: false});
    if (!ready) return false;

    // Touch the main category folders so deleted/moved folder handles fail immediately.
    await wormholesRootFolderHandle.getDirectoryHandle("Literature", {create: false});
    await wormholesRootFolderHandle.getDirectoryHandle("Images", {create: false});
    await wormholesRootFolderHandle.getDirectoryHandle("Creations", {create: false});
    return true;
  } catch (e) {
    return false;
  }
}

async function selectWormholesParentFolder() {
  if (localFolderNativeApiSupported()) {
    saveLocalFolderStorageMode("native");
    let handle;
    try {
      handle = await window.showDirectoryPicker({
        mode: "readwrite",
        startIn: "desktop",
      });
    } catch (e) {
      const blockedRootMessage =
        "The browser blocked that folder. Select a normal project folder so the app can create Wormholes inside it, or use the picker’s New Folder option and name the folder Wormholes. Browser security often rejects top-level folders because they may contain system files.";
      if (
        String(e?.message || "")
          .toLowerCase()
          .includes("system files")
      ) {
        throw new Error(blockedRootMessage);
      }
      throw e;
    }

    if (!(await requestFolderPermission(handle))) {
      throw new Error("Folder permission was not granted.");
    }

    wormholesParentFolderHandle = handle;
    await saveWormholesParentFolderHandle(handle);
    await prepareWormholesFolderHandles({requestPermission: true});
    return;
  }

  if (localFolderPrivateStorageSupported()) {
    saveLocalFolderStorageMode("opfs");
    try {
      await navigator.storage?.persist?.();
    } catch (e) {}
    wormholesParentFolderHandle = await navigator.storage.getDirectory();
    await saveWormholesParentFolderHandle(wormholesParentFolderHandle);
    await prepareWormholesFolderHandles({requestPermission: true});
    return;
  }

  throw new Error("Folder access is unavailable. App-only storage still works.");
}

async function enableWormholesLocalFolders(syncExisting, options = {}) {
  localFoldersEnabled = true;
  saveLocalFolderEnabled();
  await prepareWormholesFolderHandles({requestPermission: true});

  const targetMatchesPreviousFolder = await currentTargetMatchesPreviousWormholesFolder();

  if (syncExisting) {
    // When the user reconnects the same Wormholes folder after temporarily using browser
    // storage, sync only browser-only records. Re-exporting every folder-backed record
    // would create duplicate title-based files such as name-2.docx or image-2.jpg.
    const migrationOptions = {
      force: !targetMatchesPreviousFolder,
      preserveExistingFolderFileNames: true,
    };
    await migrateAllArchiveEntriesToFolder(migrationOptions);
    await migrateAllLiteratureEntriesToFolder(migrationOptions);
    await migrateAllVisionBoardsToFolder(migrationOptions);
  }

  await saveWormholesParentFolderHandle(wormholesParentFolderHandle);
  previousWormholesSourceFolderHandle = wormholesParentFolderHandle;
  localFolderSwitchInProgress = false;
  await syncFolderBackedTitlesFromFileNames();
  if (options.prune !== false) {
    await pruneWormholesFolderToAppState();
  }
  renderArchive();
  renderLiteratureList();
  await renderVisionBoard();
}

/* Modals/settings module: moved getCompactSettingsStatusText() to scripts/modals-settings.js. */

/* Modals/settings module: moved setSettingsStatus() to scripts/modals-settings.js. */

/* Modals/settings module: moved toggleSettingsMenu() to scripts/modals-settings.js. */

/* Modals/settings module: moved openQuickStartModal() to scripts/modals-settings.js. */

/* Modals/settings module: moved closeQuickStartModal() to scripts/modals-settings.js. */

/* Export/import module: moved pickNativeDirectory to scripts/export-import.js. */

/* Export/import module: moved delay to scripts/export-import.js. */

/* Export/import module: moved handlesAreSameEntry to scripts/export-import.js. */

/* Export/import module: moved copyDirectoryContents to scripts/export-import.js. */

/* Export/import module: moved readManagedFolderMarkerJson to scripts/export-import.js. */

/* Export/import module: moved titleFromUniverseFolderName to scripts/export-import.js. */

/* Export/import module: moved selectedFolderAsWormholesRoot to scripts/export-import.js. */

/* Export/import module: moved backupUniverseKeyFromFolder to scripts/export-import.js. */

/* Export/import module: moved ensureBackupUniverseRecord to scripts/export-import.js. */

/* Export/import module: moved collectBackupUniverseFolders to scripts/export-import.js. */

/* Export/import module: moved textFromBackupFile to scripts/export-import.js. */

/* Export/import module: moved backupTextLineValue to scripts/export-import.js. */

/* Export/import module: moved backupTextSection to scripts/export-import.js. */

/* Export/import module: moved creationEntryFromBackupFileText to scripts/export-import.js. */

/* Export/import module: moved readBackupCreationsForUniverse to scripts/export-import.js. */

/* Literature module: moved readBackupLiteratureForUniverse() to scripts/literature.js. */

/* Export/import module: moved readBackupImagesForUniverse to scripts/export-import.js. */

/* Export/import module: moved readWormholesBackupManifest to scripts/export-import.js. */

/* Export/import module: moved restoreAppStateFromAppDataManifest to scripts/export-import.js. */

/* Export/import module: moved rebuildAppStateFromLocalBackupFolder to scripts/export-import.js. */

/* Export/import module: moved formatLocalFolderRestoreSummary to scripts/export-import.js. */

/* Export/import module: moved createBackupFromSettings to scripts/export-import.js. */

async function activateSelectedStorageFolder(selectedHandle, message, options = {}) {
  previousWormholesSourceFolderHandle = selectedHandle;
  clearWormholesFolderHandles();
  wormholesParentFolderHandle = selectedHandle;
  localFoldersEnabled = true;
  localFolderPendingSync = false;
  localFolderSwitchInProgress = false;
  saveLocalFolderStorageMode("native");

  const ready = await prepareWormholesFolderHandles({requestPermission: true});
  if (!ready) throw new Error("Could not open that folder.");

  await saveWormholesParentFolderHandle(selectedHandle);
  saveLocalFolderEnabled();
  await syncFolderBackedTitlesFromFileNames();
  if (options.prune !== false) {
    await pruneWormholesFolderToAppState();
  }
  renderArchive();
  renderLiteratureList();
  await renderVisionBoard();
  setSettingsStatus(message);
  requestStorageFootnoteUpdate();
}

/* Export/import module: moved getActiveWormholesTabName to scripts/export-import.js. */

/* Export/import module: moved captureFolderRestoreReturnView to scripts/export-import.js. */

/* Export/import module: moved restoreVisibleScreenAfterFolderRestore to scripts/export-import.js. */

/* Export/import module: moved restoreBackupFromSettings to scripts/export-import.js. */

/* Export/import module: moved cloneForAppDataExport to scripts/export-import.js. */

/* Export/import module: moved normalizeImportedTags to scripts/export-import.js. */

/* Literature module: moved normalizeImportedLiteratureDoc() to scripts/literature.js. */

/* Vision Board module: moved normalizeImportedVisionItem() to scripts/vision-board.js. */

/* Export/import module: moved flushPendingLargeDataForAppDataExport to scripts/export-import.js. */

/* Export/import module: moved folderFileForAppDataExport to scripts/export-import.js. */

/* Literature module: moved materializeLiteratureDocForAppDataExport() to scripts/literature.js. */

/* Vision Board module: moved materializeVisionItemForAppDataExport() to scripts/vision-board.js. */
/* Literature module: moved materializeLiteratureForExport() to scripts/literature.js. */

/* Vision Board module: moved materializeVisionForExport() to scripts/vision-board.js. */

/* Export/import module: moved summarizeWormholesAppDataExport to scripts/export-import.js. */

/* Export/import module: moved formatWormholesAppDataExportSummary to scripts/export-import.js. */

/* Export/import module: moved buildWormholesAppDataExport to scripts/export-import.js. */

/* Export/import module: moved wormholesExportFileName to scripts/export-import.js. */

/* Export/import module: moved WORMHOLES_SAFE_DOWNLOAD_ATTR to scripts/export-import.js. */

/* Export/import module: moved isWormholesSafeDownloadElement to scripts/export-import.js. */

/* Export/import module: moved downloadJsonFile to scripts/export-import.js. */

/* Export/import module: moved openAppDataExportSummaryModal to scripts/export-import.js. */

/* Export/import module: moved closeAppDataExportSummaryModal to scripts/export-import.js. */

/* Export/import module: moved exportAppDataFromSettings to scripts/export-import.js. */

/* Export/import module: moved pendingAppDataImportConfirmation to scripts/export-import.js. */

/* Export/import module: moved closeAppDataImportConfirmModal to scripts/export-import.js. */

/* Export/import module: moved confirmAppDataImportOverwrite to scripts/export-import.js. */

/* Export/import module: moved importAppDataFromSettings to scripts/export-import.js. */

/* Export/import module: moved validateWormholesAppDataImport to scripts/export-import.js. */

/* Export/import module: moved appDataKeysForUniverse to scripts/export-import.js. */

/* Export/import module: moved clearExistingAppDataBeforeImport to scripts/export-import.js. */

/* Literature module: moved saveImportedLiteratureForUniverse() to scripts/literature.js. */

/* Vision Board module: moved saveImportedVisionForUniverse() to scripts/vision-board.js. */

/* Export/import module: moved restoreImportedAppDataToLocalFolderIfPossible to scripts/export-import.js. */

/* Export/import module: moved applyWormholesAppDataImport to scripts/export-import.js. */

/* Export/import module: moved handleAppDataImportFile to scripts/export-import.js. */

async function changeTargetStorageFromSettings() {
  setSettingsStatus("Choose the new target folder.");
  toggleSettingsMenu(false);
  try {
    await chooseLocalFolderFromCheckbox();
  } catch (e) {
    setSettingsStatus(e?.name === "AbortError" ? "" : e?.message || "Could not change folder.");
  }
}

/* Modals/settings module: moved openLocalFolderDeletionWarningModal() to scripts/modals-settings.js. */

/* Modals/settings module: moved closeLocalFolderDeletionWarningModal() to scripts/modals-settings.js. */

/* Modals/settings module: moved acknowledgeLocalFolderDeletionWarning() to scripts/modals-settings.js. */

/* Modals/settings module: moved openLocalFolderSyncModal() to scripts/modals-settings.js. */

/* Modals/settings module: moved closeLocalFolderSyncModal() to scripts/modals-settings.js. */

/* Modals/settings module: moved openLocalFolderNotFoundModal() to scripts/modals-settings.js. */

/* Modals/settings module: moved closeLocalFolderNotFoundModal() to scripts/modals-settings.js. */

/* Modals/settings module: moved findLocalFolderFromNotFoundModal() to scripts/modals-settings.js. */

/* Modals/settings module: moved useAppOnlyFromNotFoundModal() to scripts/modals-settings.js. */

async function reconnectSavedLocalFolderFromModal() {
  const savedHandle =
    previousWormholesSourceFolderHandle || (await loadWormholesParentFolderHandle());

  if (!savedHandle) {
    openLocalFolderNotFoundModal(
      "No saved Wormholes folder handle was found. Choose Find Folder to select the folder again.",
    );
    return;
  }

  localFolderRestoreInProgress = true;
  let lastError = null;

  try {
    // Retry once after the permission prompt. Some browsers grant the handle but do not make
    // the nested directory handles usable until the next micro-session. This keeps reconnect
    // from falsely reporting "folder not found" after the user approved access.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        wormholesParentFolderHandle = savedHandle;
        clearWormholesChildFolderHandles();

        const ready = await prepareWormholesFolderHandles({requestPermission: true});
        if (!ready) {
          throw new Error("Permission was not granted.");
        }

        localFoldersEnabled = true;
        localFolderPendingSync = false;
        localFolderSwitchInProgress = false;
        previousWormholesSourceFolderHandle = wormholesParentFolderHandle;
        await saveWormholesParentFolderHandle(wormholesParentFolderHandle);
        saveLocalFolderEnabled();

        await syncAllArchiveFolderEntries();
        await syncAllLiteratureFolderEntries();
        await syncAllVisionFolderEntries();
        await syncFolderBackedTitlesFromFileNames();
        await pruneWormholesFolderToAppState();

        closeLocalFolderNotFoundModal();

        if (document.getElementById("archiveTab")?.classList.contains("active")) renderArchive();
        if (document.getElementById("literatureTab")?.classList.contains("active"))
          renderLiteratureList();
        if (document.getElementById("visionTab")?.classList.contains("active"))
          await renderVisionBoard();
        requestStorageFootnoteUpdate();
        return;
      } catch (e) {
        lastError = e;
        if (attempt === 0) {
          await delay(150);
        }
      }
    }

    // Keep the saved handle available. A failed first reconnect is often just a browser
    // permission timing issue, and retrying should not require manually finding the folder.
    wormholesParentFolderHandle = savedHandle;
    previousWormholesSourceFolderHandle = savedHandle;
    clearWormholesChildFolderHandles();
    openLocalFolderNotFoundModal(
      "Could not reconnect yet. Try Reconnect Saved Folder again or choose Find Folder.",
    );
    if (lastError) {
      console.warn("[Wormholes] Saved folder reconnect failed:", lastError);
    }
  } finally {
    localFolderRestoreInProgress = false;
    updateLocalFolderCheckboxes();
  }
}

async function chooseLocalFolderFromCheckbox() {
  const visionMessage = document.getElementById("visionBoardMessage");

  try {
    // Preserve the previously selected folder as a read source for full backups into the newly selected folder.
    previousWormholesSourceFolderHandle =
      wormholesParentFolderHandle || (await loadWormholesParentFolderHandle());

    clearWormholesFolderHandles();
    await selectWormholesParentFolder();
    localFolderPendingSync = true;
    openLocalFolderDeletionWarningModal();
  } catch (e) {
    localFoldersEnabled = false;
    localFolderPendingSync = false;
    localFolderSwitchInProgress = false;
    clearWormholesFolderHandles();
    saveLocalFolderEnabled();
    if (visionMessage)
      visionMessage.textContent =
        e?.name === "AbortError"
          ? ""
          : e?.message || "Could not set up folder storage. Use app-only mode or reconnect later.";
  }
}

async function handleLocalFolderToggleChange(event) {
  const shouldEnable = !!event.target.checked;

  if (!shouldEnable) {
    previousWormholesSourceFolderHandle =
      wormholesParentFolderHandle || (await loadWormholesParentFolderHandle());
    localFoldersEnabled = false;
    localFolderPendingSync = false;
    clearWormholesFolderHandles();
    saveLocalFolderEnabled();
    return;
  }

  // Turning local storage on always starts a fresh folder-picker flow.
  // The previously selected folder is kept only as a read source for backup/switch-folder sync.
  event.target.checked = false;
  previousWormholesSourceFolderHandle =
    wormholesParentFolderHandle || (await loadWormholesParentFolderHandle());
  localFoldersEnabled = false;
  localFolderPendingSync = false;
  localFolderSwitchInProgress = true;
  clearWormholesFolderHandles();
  saveLocalFolderEnabled();

  await chooseLocalFolderFromCheckbox();
}

async function confirmLocalFolderSync(syncExisting) {
  if (!localFolderPendingSync || !wormholesParentFolderHandle) return;

  closeLocalFolderSyncModal();
  await enableWormholesLocalFolders(syncExisting);
}

async function restoreFolderHandlesForCurrentUniverse(options = {}) {
  loadLocalFolderEnabled();

  previousWormholesSourceFolderHandle = await loadWormholesParentFolderHandle();
  literatureFolderHandle = null;
  visionFolderHandle = null;
  creationFolderHandle = null;

  if (!localFoldersEnabled) return true;

  wormholesParentFolderHandle = previousWormholesSourceFolderHandle;

  if (!wormholesParentFolderHandle) {
    clearWormholesFolderHandles();
    if (options.showPrompt !== false) {
      openLocalFolderNotFoundModal(
        "The app could not find a saved Wormholes folder. Choose Find Folder to reconnect or select a new folder.",
      );
    }
    return false;
  }

  localFolderRestoreInProgress = true;

  try {
    const ready = await verifyWormholesFolderHandles();

    if (!ready) {
      clearWormholesChildFolderHandles();
      wormholesParentFolderHandle = previousWormholesSourceFolderHandle;
      if (options.showPrompt !== false) {
        openLocalFolderNotFoundModal("Folder permission needed. Click Reconnect Saved Folder.");
      }
      return false;
    }

    await syncAllArchiveFolderEntries();
    await syncAllLiteratureFolderEntries();
    await syncAllVisionFolderEntries();
    await syncFolderBackedTitlesFromFileNames();
    await pruneWormholesFolderToAppState();

    if (options.skipRender !== true) {
      if (document.getElementById("archiveTab")?.classList.contains("active")) renderArchive();
      if (document.getElementById("literatureTab")?.classList.contains("active"))
        renderLiteratureList();
      if (document.getElementById("visionTab")?.classList.contains("active")) renderVisionBoard();
    }

    return true;
  } catch (e) {
    clearWormholesChildFolderHandles();
    wormholesParentFolderHandle = previousWormholesSourceFolderHandle;
    if (options.showPrompt !== false) {
      openLocalFolderNotFoundModal(
        "Could not reconnect yet. Click Reconnect Saved Folder or choose Find Folder.",
      );
    }
    console.warn("[Wormholes] Saved folder restore failed:", e);
    return false;
  } finally {
    localFolderRestoreInProgress = false;
    updateLocalFolderCheckboxes();
  }
}

async function autoSyncLocalFolderOnStartup() {
  loadLocalFolderEnabled();

  if (!localFoldersEnabled) return;

  previousWormholesSourceFolderHandle = await loadWormholesParentFolderHandle();

  if (!previousWormholesSourceFolderHandle) {
    openLocalFolderNotFoundModal(
      "Local storage is turned on, but no saved Wormholes folder was found. Choose Find Folder to reconnect or select a new folder.",
    );
    return;
  }

  await restoreFolderHandlesForCurrentUniverse({showPrompt: true});
}

/* Storage module: moved loadBridgeNotesFromStorage() to scripts/storage.js. */

/* Storage module: moved saveBridgeNotesToStorage() to scripts/storage.js. */

/* Storage module: moved saveUniversesToStorage() to scripts/storage.js. */

/* Storage module: moved loadUniversesFromStorage() to scripts/storage.js. */

/* Storage module: moved migrateLegacyArchiveIfNeeded() to scripts/storage.js. */

/* Universes module: moved removeOriginalUniverse() to scripts/universes.js. */

/* Universes module: moved getCurrentUniverse() to scripts/universes.js. */

/* Literature module: moved saveLiteratureForUniverse() to scripts/literature.js. */

/* Literature module: moved writeLiteratureDocToSpecificFolder() to scripts/literature.js. */

/* Literature module: moved migrateAllLiteratureEntriesToFolder() to scripts/literature.js. */

/* Literature module: moved syncAllLiteratureFolderEntries() to scripts/literature.js. */

/* Vision Board module: moved readVisionBoardForUniverse() to scripts/vision-board.js. */

/* Vision Board module: moved saveVisionBoardForUniverse() to scripts/vision-board.js. */

/* Vision Board module: moved migrateAllVisionBoardsToFolder() to scripts/vision-board.js. */

/* Vision Board module: moved syncAllVisionFolderEntries() to scripts/vision-board.js. */

/* Storage module: moved saveConnectionNotesToStorage() to scripts/storage.js. */

/* Storage module: moved loadConnectionNotesFromStorage() to scripts/storage.js. */

/* Storage module: moved loadArchiveFromStorage() to scripts/storage.js. */

/* Universes module: moved showHomeScreen() to scripts/universes.js. */

/* Universes module: moved showAppScreen() to scripts/universes.js. */

/* Universes module: moved openUniverseTitleModal() to scripts/universes.js. */

/* Universes module: moved closeUniverseTitleModal() to scripts/universes.js. */

/* Universes module: moved createUniverseFromModal() to scripts/universes.js. */

/* Universes module: moved openUniverseArchiveModal() to scripts/universes.js. */

/* Universes module: moved closeUniverseArchiveModal() to scripts/universes.js. */

/* Universes module: moved renderUniverseArchiveList() to scripts/universes.js. */

/* Universes module: moved openUniverseSummaryModal() to scripts/universes.js. */

/* Universes module: moved closeUniverseSummaryModal() to scripts/universes.js. */

/* Universes module: moved saveUniverseSummary() to scripts/universes.js. */

/* Universes module: moved openUniverseEditModal() to scripts/universes.js. */

/* Universes module: moved closeUniverseEditModal() to scripts/universes.js. */

/* Universes module: moved saveUniverseEdit() to scripts/universes.js. */

/* Archive module: moved openDeleteEntryConfirm() to scripts/archive.js. */

/* Archive module: moved closeDeleteEntryConfirm() to scripts/archive.js. */

/* Archive module: moved confirmDeleteEntry() to scripts/archive.js. */

/* Universes module: moved openDeleteUniverseModal() to scripts/universes.js. */

/* Universes module: moved closeDeleteUniverseModal() to scripts/universes.js. */

/* Universes module: moved cleanupBridgesToUniverse() to scripts/universes.js. */

/* Universes module: moved deleteUniverseStorage() to scripts/universes.js. */

/* Universes module: moved confirmDeleteUniverseWithoutMigration() to scripts/universes.js. */

/* Universes module: moved openDeleteUniverseMigrateModal() to scripts/universes.js. */

/* Universes module: moved closeDeleteUniverseMigrateModal() to scripts/universes.js. */

/* Universes module: moved renderDeleteUniverseMigrateList() to scripts/universes.js. */

/* Universes module: moved migrateAllAndDeleteUniverse() to scripts/universes.js. */

/* Storage module: moved readArchiveForUniverse() to scripts/storage.js. */

/* Storage module: moved saveArchiveForUniverse() to scripts/storage.js. */

/* Storage module: moved readConnectionNotesForUniverse() to scripts/storage.js. */

/* Storage module: moved saveConnectionNotesForUniverse() to scripts/storage.js. */

/* Connections module: moved makeConnectionKeyFromIds() to scripts/connections.js in Beta 138. */

/* Universes module: moved openMigrateNewUniverseModal() to scripts/universes.js. */

/* Universes module: moved closeMigrateNewUniverseModal() to scripts/universes.js. */

/* Universes module: moved createMigrateNewUniverse() to scripts/universes.js. */

/* Universes module: moved openMigrateModal() to scripts/universes.js. */

/* Universes module: moved closeMigrateModal() to scripts/universes.js. */

/* Universes module: moved renderMigrateUniverseList() to scripts/universes.js. */

/* Universes module: moved selectMigrateUniverseTarget() to scripts/universes.js. */

/* Universes module: moved saveMigratePickerModal() to scripts/universes.js. */

/* Archive module: moved cleanupConnectionsForRemovedEntry() to scripts/archive.js. */

/* Archive module: moved migrateEntryToUniverse() to scripts/archive.js. */

/* Universes module: moved enterUniverse() to scripts/universes.js. */

/* Generation module: moved rollWhat() to scripts/generation.js. */

/* Generation module: moved rollAttr() to scripts/generation.js. */

/* Generation module: moved rollPressure() to scripts/generation.js. */

/* Generation module: moved quickFullRoll() to scripts/generation.js. */

/* Generation module: moved newCreation() to scripts/generation.js. */

/* Generation module: moved openTitleModal() to scripts/generation.js. */

/* Generation module: moved closeTitleModal() to scripts/generation.js. */

/* Archive module: moved saveCurrentToArchive() to scripts/archive.js. */

/* Generation module: moved populateManualSelects() to scripts/generation.js. */

/* Generation module: moved fillSelect() to scripts/generation.js. */

/* Generation module: moved setupCustomSelect() to scripts/generation.js. */

/* Generation module: moved getManualValue() to scripts/generation.js. */

/* Generation module: moved manualAttributeDuplicateExists() to scripts/generation.js. */

/* Generation module: moved updateManualAttributeOptionStates() to scripts/generation.js. */

/* Generation module: moved manualHasAnyData() to scripts/generation.js. */

/* Generation module: moved updateManualButtons() to scripts/generation.js. */

/* Generation module: moved clearManualCreate() to scripts/generation.js. */

/* Generation module: moved saveManualCreation() to scripts/generation.js. */

function showArchiveListScreen() {
  selectedMapNodeId = null;
  window.WormholesMapSearch?.clearActive?.("connections");
  document.getElementById("archiveListScreen").classList.add("active");
  document.getElementById("connectionsScreen").classList.remove("active");
  updateDestructiveClearButtons();

  if (creationFolderHandle) {
    syncArchiveFolderEntries()
      .then(() => renderArchive())
      .catch(() => {});
  }
}

/* Connections module: moved showConnectionsScreen() to scripts/connections.js in Beta 138. */

function truncateSvgText(text, maxLength = 24) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/* Connections module: moved connectionKey() to scripts/connections.js in Beta 138. */

/* Connections module: moved getConnectionNote() to scripts/connections.js in Beta 138. */

/* Connections module: moved setConnectionNote() to scripts/connections.js in Beta 138. */

function truncatePreview(text, maxLength = 34) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/* Bridges module: moved wormholeNodeKey() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved bridgeNoteKeyForNodes() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved getBridgeNote() to scripts/bridges.js in Beta 138. */

function setDestructiveButtonVisibility(id, hasSomethingToDelete) {
  const button = document.getElementById(id);
  if (!button) return;

  const shouldHide = !hasSomethingToDelete;
  button.hidden = shouldHide;
  button.disabled = shouldHide;
}

/* Connections module: moved currentUniverseHasClearableConnections() to scripts/connections.js in Beta 138. */

/* Bridges module: moved universeHasClearableBridges() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved appHasClearableBridges() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved updateDestructiveClearButtons() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved openBridgeNoteModal() to scripts/bridges.js in Beta 138. */

/* Connections module: moved openConnectionModal() to scripts/connections.js in Beta 138. */

/* Connections module: moved closeConnectionModal() to scripts/connections.js in Beta 138. */

/* Connections module: moved saveConnectionModalText() to scripts/connections.js in Beta 138. */

/* Connections module: moved deleteConnectionModalText() to scripts/connections.js in Beta 138. */

/* Connections module: moved clearMapSelection() to scripts/connections.js in Beta 138. */

/* Connections module: moved toggleMapConnection() to scripts/connections.js in Beta 138. */

/* Connections module: moved parseConnectionsExternalNodeId() to scripts/connections.js in Beta 138. */

/* Connections module: moved connectionsMapNodeTitle() to scripts/connections.js in Beta 138. */

/* Connections module: moved isSelectableConnectionsMapNodeId() to scripts/connections.js in Beta 138. */

/* Connections module: moved isCurrentUniverseConnectionsMapNodeId() to scripts/connections.js in Beta 138. */

/* Connections module: moved isExternalConnectionsMapNodeId() to scripts/connections.js in Beta 138. */

/* Bridges module: moved targetCreationIdsForBridgeNode() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved addBridgeToEntryTarget() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved addBridgeToUniverseTarget() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved toggleEntryBridgeToExternalNode() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved toggleUniverseBridgeToExternalNode() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved removeUniverseMapBridgeToExternalNode() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved removeMapBridgeToExternalNode() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved getUniverseTitle() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved getUniverseSummary() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved normalizeHue() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved hslColor() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved mapUniversePalette() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved mapUniversePaletteStyle() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved normalizeUniverseBridge() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved normalizeUniverseBridges() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved findUniverseBridgeBetween() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved areUniversesBridged() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved getUniverseBridgeTargetsForFocus() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved findUniverseToCreationBridgeBetween() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved removeUniverseToCreationBridge() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved getUniverseToCreationBridgeContextForFocus() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved findIncomingUniverseToCreationBridge() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved isUniverseBridgedToCreation() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved toggleUniverseBridge() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved normalizeBridge() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved normalizeBridges() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved bridgeKey() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved hasBridge() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved getCreationTitleFromUniverse() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved nestedPickerKey() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved entryPickerMeta() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved hasUniverseBridge() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved openUniverseBridgeModal() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved openBridgeModal() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved closeBridgeModal() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved renderBridgeEntryPicker() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved renderBridgeUniverseList() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved bindBridgePickerControls() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved bridgeEntryToUniverse() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved bridgePickerTargetNode() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved saveBridgePickerModal() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved openBridgeNewUniverseModal() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved closeBridgeNewUniverseModal() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved createBridgeNewUniverse() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved openWormholesModal() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved closeWormholesModal() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved clearWormholeFocus() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved setWormholeUniverseFocus() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved getArchiveEntryFromUniverse() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved saveUniverseArchiveAndRefresh() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved toggleWormholeInternalConnection() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved getEntryBridgeRecord() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved findCreationBridgeBetween() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved removeCreationBridgeRecord() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved findCreationBridgeWithFocusedUniverse() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved getCreationBridgeContextForUniverse() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved getCreationBridgeTargetsForCreation() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved getUniverseBridgeTargetsForCreation() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved findBridgeBetweenCreationAndUniverse() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved removeBridgeBetweenCreationAndUniverse() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved toggleWormholeBridge() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved handleWormholeCreationClick() to scripts/bridges.js in Beta 138. */

/* Bridges module: moved handleWormholeUniverseClick() to scripts/bridges.js in Beta 138. */

function capsuleBadgeStackSvg(type, universeId, entryId, cx, cy, rx, ry, options = {}) {
  const totals = badgeStackCounts(
    type,
    universeId,
    entryId,
    options.count ?? null,
    options.visionCount ?? null,
  );
  if (totals.literature <= 0 && totals.vision <= 0) return "";

  const anchorX = cx;
  const anchorY = cy + ry;
  return badgeStackSvgAt(
    type,
    universeId,
    entryId,
    anchorX,
    anchorY,
    totals.literature,
    totals.vision,
  );
}

/* Duplicate capsuleShapeFromPosition declaration removed during Beta 249 ES-module conversion. */

/* renderWormholesMapStatus moved to scripts/bridges-map.js in Beta 110. */

function mapFilterClass(filters) {
  const safeFilters = filters || {};
  return [
    safeFilters.bridges === false ? "map-filter-hide-bridges" : "",
    safeFilters.connections === false ? "map-filter-hide-connections" : "",
    safeFilters.literature === false ? "map-filter-hide-literature" : "",
    safeFilters.images === false ? "map-filter-hide-images" : "",
    safeFilters.relationships === false ? "map-filter-hide-relationships" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function mapFilterControlsHtml(scope, filters) {
  const safeScope = scope === "wormholes" ? "wormholes" : "connections";
  const safeFilters = filters || {};
  const options = [
    ["bridges", "Bridges"],
    ["connections", "Connections"],
    ["literature", "Literature"],
    ["images", "Images"],
    ["relationships", "Relationship"],
  ];

  return `
    <fieldset class="map-filter-panel" aria-label="Map legend filters">
      <legend>Show</legend>
      <div class="map-filter-toggles" role="group" aria-label="Map filters">
        ${options
          .map(([key, label]) => {
            const on = safeFilters[key] !== false;
            const inputId = `${safeScope}MapFilter${key.charAt(0).toUpperCase()}${key.slice(1)}`;
            return `
            <label class="map-filter-toggle ${on ? "active" : ""}" for="${inputId}">
              <input id="${inputId}" type="checkbox" data-map-filter-scope="${safeScope}" data-map-filter="${key}" ${on ? "checked" : ""}>
              <span>${label}</span>
            </label>
          `;
          })
          .join("")}
      </div>
      <button class="map-list-view-button app-button" data-app-button="true" data-map-list-scope="${safeScope}" type="button">List View</button>
    </fieldset>
  `;
}

function bindMapFilterControls(scope) {
  const isWormholes = scope === "wormholes";
  const filters = isWormholes ? wormholesMapFilters : connectionsMapFilters;

  document.querySelectorAll(`[data-map-list-scope="${scope}"]`).forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMapListView(scope);
    });
  });

  document
    .querySelectorAll(`[data-map-filter-scope="${scope}"][data-map-filter]`)
    .forEach((input) => {
      input.addEventListener("change", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = input.dataset.mapFilter;
        if (!Object.prototype.hasOwnProperty.call(filters, key)) return;
        filters[key] = !!input.checked;
        saveMapFilters(scope, filters);

        if (isWormholes) {
          if ((key === "connections" || key === "bridges") && filters[key] === false) {
            selectedWormholeCreation = null;
            wormholeFocusUniverseId = null;
          }
          renderWormholesMap();
        } else {
          if (
            key === "bridges" &&
            filters.bridges === false &&
            (isExternalConnectionsMapNodeId(selectedMapNodeId) ||
              isCurrentUniverseConnectionsMapNodeId(selectedMapNodeId))
          ) {
            selectedMapNodeId = null;
          }
          if (
            key === "connections" &&
            filters.connections === false &&
            selectedMapNodeId &&
            getEntry(selectedMapNodeId)
          ) {
            selectedMapNodeId = null;
          }
          renderConnectionsMap();
        }
      });
    });
}

/* buildWormholesMapListViewHtml moved to scripts/bridges-map.js in Beta 110. */

function mapPanForZoomAroundViewportCenter(wrap, oldZoom, newZoom, panX, panY) {
  const safeOldZoom = Number.isFinite(oldZoom) && oldZoom > 0 ? oldZoom : 1;
  const safeNewZoom = Number.isFinite(newZoom) && newZoom > 0 ? newZoom : safeOldZoom;
  const centerX = (wrap?.clientWidth || 0) / 2;
  const centerY = (wrap?.clientHeight || 0) / 2;
  const contentCenterX = (centerX - panX) / safeOldZoom;
  const contentCenterY = (centerY - panY) / safeOldZoom;

  return {
    panX: centerX - contentCenterX * safeNewZoom,
    panY: centerY - contentCenterY * safeNewZoom,
  };
}

/* applyWormholesMapTransform moved to scripts/bridges-map.js in Beta 110. */

/* fitWormholesMapToViewport moved to scripts/bridges-map.js in Beta 110. */

/* bindWormholesMapViewport moved to scripts/bridges-map.js in Beta 110. */

/* renderWormholesMap moved to scripts/bridges-map.js in Beta 110. */

function openClearMapConfirm(kind) {
  activeClearMapAction = kind;
  const title = document.getElementById("clearMapConfirmTitle");
  const text = document.getElementById("clearMapConfirmText");
  const confirm = document.getElementById("confirmClearMapBtn");
  const cancel = document.getElementById("cancelClearMapBtn");

  if (kind === "bridges") {
    title.textContent = "Clear all bridges?";
    text.textContent =
      "This removes every bridge. Connections will stay. You can restore the bridges from the notification or Recent Activity for two minutes.";
    confirm.textContent = "Clear All Bridges";
    if (cancel) cancel.textContent = "Keep Bridges";
  } else {
    title.textContent = "Remove all connections?";
    text.textContent =
      "This removes every connection in the current universe. Bridges will stay. You can restore the connections from the notification or Recent Activity for two minutes.";
    confirm.textContent = "Remove All Connections";
    if (cancel) cancel.textContent = "Keep Connections";
  }

  const modal = document.getElementById("clearMapConfirmModal");
  modal.classList.add("open");
  requestAnimationFrame(() => modal.classList.add("open"));
}

function closeClearMapConfirm() {
  document.getElementById("clearMapConfirmModal")?.classList.remove("open");
  activeClearMapAction = null;
}

/* Bridges module: moved clearAllBridgesOnly() to scripts/bridges.js in Beta 138. */

/* Connections module: moved clearCurrentUniverseConnectionsOnly() to scripts/connections.js in Beta 138. */

function confirmClearMapAction() {
  if (activeClearMapAction === "bridges") {
    clearAllBridgesOnly();
    return;
  }

  if (activeClearMapAction === "connections") {
    clearCurrentUniverseConnectionsOnly();
    return;
  }

  closeClearMapConfirm();
}

/* Connections map module: moved renderer and viewport helpers to scripts/connections-map.js. */

/* Modals/settings module: moved swallowDownloadBehavior() to scripts/modals-settings.js. */

/* Modals/settings module: moved installSafeControl() to scripts/modals-settings.js. */

/* Modals/settings module: moved syncAppButtonState() to scripts/modals-settings.js. */

/* Modals/settings module: moved setAppButtonDisabled() to scripts/modals-settings.js. */

/* Modals/settings module: moved syncAllAppButtonStates() to scripts/modals-settings.js. */

/* Modals/settings module: moved disableNativeDownloadBehaviors() to scripts/modals-settings.js. */

/* Modals/settings module: moved activateAppButtonFromKeyboard() to scripts/modals-settings.js. */

/* Modals/settings module: keyboard app-button guard installed by installUiProtectionGuards(). */

/* Modals/settings module: moved installPrimarySafeControls() to scripts/modals-settings.js. */

/* Modals/settings module: moved APP_CONTROL_SELECTOR to scripts/modals-settings.js. */

/* Modals/settings module: moved isFormLikeControl() to scripts/modals-settings.js. */

/* Modals/settings module: moved getProtectedControlTarget() to scripts/modals-settings.js. */

/* Modals/settings module: moved removeDownloadAttributesNear() to scripts/modals-settings.js. */

/* Modals/settings module: moved protectControlElement() to scripts/modals-settings.js. */

/* Modals/settings module: moved protectAllControls() to scripts/modals-settings.js. */

/* Modals/settings module: moved guardAgainstDownloadWrapper() to scripts/modals-settings.js. */

/* Modals/settings module: download guards and mutation observer installed by installUiProtectionGuards(). */

/* Bootstrap module: moved startup wiring to scripts/bootstrap.js in Beta 138. */

/* Compatibility publication for controllers that are still transitioning away
   from shared classic globals. Served builds import this module natively; the
   generated direct-file adapter preserves the same global surface. */
function installLegacyAppCoreBindings(target = globalThis) {
  const bindings = {
    makeId,
    compactText,
    directChildWithClass,
    firstCompactText,
    setContextualAriaLabel,
    applyArchiveEntryActionLabels,
    applyContextualActionAriaLabels,
    installSvgKeyboardActivation,
    labelConnectionMapNode,
    labelConnectionMapEdge,
    improveSvgMapAccessibility,
    addUniqueId,
    addUniqueBridgeToEntry,
    moveConnectionNote,
    moveBridgeNotesFromChildrenToGroup,
    redirectIncomingBridgesToGroup,
    transferGroupedExternalLinksToGroup,
    populateEditSelects,
    setupEditCustomSelect,
    setEditSelectValue,
    openEditModal,
    closeEditModal,
    saveEditEntry,
    largeDataStore,
    largeDataStoreAvailable,
    persistLargeDataValue,
    loadLargeDataValue,
    deleteLargeDataValue,
    activeTagTarget,
    activeTagHasUniverseTag,
    activeTagHasEntryTag,
    cssEscapeValue,
    handleTaggedImageThumbnailClick,
    browserStorageUploadPromptDismissed,
    dismissBrowserStorageUploadPrompt,
    shouldShowBrowserStorageUploadPrompt,
    browserStorageUploadPromptMessage,
    createBrowserStorageUploadPrompt,
    showBrowserStorageUploadPrompt,
    svgBadgeTransform,
    svgBadgeStackTransform,
    svgBadgeIconTransform,
    mapBadgeScaleForZoom,
    mapBadgeOffsetScaleForZoom,
    mapConnectionBadgeScaleForZoom,
    mapConnectionBadgeOffsetScaleForZoom,
    updateSvgMapBadgeScale,
    updateMapReadabilityState,
    badgeStackCounts,
    badgeStackSvgAt,
    circleBadgeStackSvg,
    rectangleBadgeStackSvg,
    tagEntryKey,
    splitTagEntryKey,
    initializeTagPickerDraft,
    toggleDraftUniverseTag,
    toggleDraftEntryTag,
    writeManagedFolderMarker,
    folderHasManagedMarker,
    folderNameLooksManagedUniverse,
    universeFolderName,
    ensureUniverseFolders,
    ensureAllUniverseFolders,
    prepareWormholesFolderHandles,
    verifyWormholesFolderHandles,
    selectWormholesParentFolder,
    enableWormholesLocalFolders,
    activateSelectedStorageFolder,
    changeTargetStorageFromSettings,
    reconnectSavedLocalFolderFromModal,
    chooseLocalFolderFromCheckbox,
    handleLocalFolderToggleChange,
    confirmLocalFolderSync,
    restoreFolderHandlesForCurrentUniverse,
    autoSyncLocalFolderOnStartup,
    showArchiveListScreen,
    truncateSvgText,
    truncatePreview,
    setDestructiveButtonVisibility,
    notePointNearSource,
    shapeCenter,
    pointOnCircleOutline,
    pointOnEllipseOutline,
    pointOnCapsuleOutline,
    capsuleShapeFromPosition,
    capsuleRectSvg,
    orbitCapsuleRectSvg,
    wormholeNodeTextX,
    capsuleBadgeStackSvg,
    pointOnRectOutline,
    pointOnShapeOutline,
    clippedLineBetweenShapes,
    rectShapeFromPosition,
    edgeEndpointDots,
    approximateTextWidth,
    fitTextToWidth,
    wrapTextToLines,
    fitTextToBubble,
    fitTextToCircle,
    fitCreationCircle,
    fitWormholeGroupCircle,
    pointInsideRect,
    distancePointToRect,
    distancePointToSegment,
    notePointAvoidingRects,
    mapFilterClass,
    mapFilterControlsHtml,
    bindMapFilterControls,
    ensureMapListViewModal,
    closeMapListView,
    refreshOpenMapListView,
    mapInspectorEscape,
    mapInspectorEntryType,
    mapInspectorAttachmentPill,
    mapInspectorDirectConnections,
    mapInspectorBridgeTargetLabel,
    mapInspectorEntryBridges,
    mapInspectorNoteCountForEntry,
    mapInspectorEntryTitleFromArchive,
    mapInspectorPairKey,
    mapInspectorConnectionLedgerForArchive,
    mapInspectorBridgeNodeLabel,
    mapInspectorBridgeLedgerForUniverse,
    mapInspectorAllBridgeLedger,
    mapInspectorEndpointKeyForUniverse,
    mapInspectorConnectedEntityCountForUniverse,
    mapInspectorBridgeRowsForUniverse,
    mapInspectorBridgedEntityCountForUniverse,
    mapInspectorJumpKeyForEntry,
    mapInspectorEntityRowForEntry,
    mapInspectorConnectedEntityRowsForUniverse,
    mapInspectorBridgedEntityRowsForUniverse,
    mapInspectorEntityCountButtonHtml,
    mapInspectorEntityPanelHtml,
    mapInspectorLinksForEntry,
    mapInspectorLinksForUniverse,
    mapInspectorLedgerListHtml,
    mapInspectorEntityCardHtml,
    mapInspectorEntityIndexHtml,
    buildConnectionMapListViewHtml,
    openMapListView,
    mapPanForZoomAroundViewportCenter,
    openClearMapConfirm,
    closeClearMapConfirm,
    confirmClearMapAction,
    WORMHOLES_APP_VERSION,
    WORMHOLES_APP_SCHEMA_VERSION,
    WORMHOLES_MANAGED_MARKER,
    WORMHOLES_CATEGORY_NAMES,
  };
  Object.assign(target, bindings);
  return Object.freeze({...bindings});
}

if (typeof window !== "undefined") installLegacyAppCoreBindings(window);
