/* GENERATED from scripts/modules/universe-controller.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 universes module. Split from wormholes-app.js. */

async function beginUniverseMutationJournal(options = {}) {
  const journal = window.WormholesWriteAheadJournal;
  if (!journal) return null;
  if (
    typeof (globalThis.controllerServices || globalThis).buildWormholesAppDataExport !== "function" ||
    !window.WormholesSnapshots?.createSnapshot
  ) {
    throw new Error("Universe recovery tools are unavailable.");
  }
  const rollbackData = await (globalThis.controllerServices || globalThis).buildWormholesAppDataExport();
  const recoveryPoint = await window.WormholesSnapshots.createSnapshot({
    reason: options.snapshotReason || "before-universe-delete",
    force: true,
    data: rollbackData,
    skipCapacityPreflight: true,
    verifyWrite: true,
    preserveExistingUntilCommitted: true,
  });
  if (!recoveryPoint?.id) throw new Error("The universe restore point could not be verified.");
  const transaction = await journal.begin({
    operation: options.operation || "universe-delete",
    label: options.label || "Universe deletion",
    rollbackSnapshotId: recoveryPoint.id,
    additionalUniverses: options.additionalUniverses || [],
  });
  await journal.markPhase(transaction, "writing-browser-stores");
  return transaction;
}

async function restoreUniverseMutationFromJournal(transaction) {
  if (!transaction || !window.WormholesWriteAheadJournal) return false;
  await window.WormholesWriteAheadJournal.rollback(transaction, {applyRuntime: true});
  if (typeof (globalThis.controllerServices || globalThis).renderAfterWormholesAppDataImport === "function")
    await (globalThis.controllerServices || globalThis).renderAfterWormholesAppDataImport();
  if (typeof renderUniverseArchiveList === "function") renderUniverseArchiveList();
  return true;
}

function reportUniverseMutationFailure(context, error) {
  console.error(context, error);
  if (typeof reportAppError === "function") {
    reportAppError(context, error, {
      userMessage:
        "The universe operation could not finish safely. Your previous data was restored when possible.",
    });
  } else if (typeof showSavedToast === "function") {
    showSavedToast("Universe operation did not finish");
  }
}

async function deleteUniverseLargeData(universeId) {
  const repository = window.WormholesRepositories?.largeData;
  if (!universeId || !repository?.supported) return;
  try {
    await repository.deletePrefix(`literature:${universeId}:`);
    await repository.deletePrefix(`vision:${universeId}:`);
  } catch (e) {
    reportAppError("Could not remove this universe's large app data", e, {
      userMessage: "Some large app data could not be removed.",
    });
  }
}

function normalizeBridgeListForImport(bridges, sourceUniverseId = "", validUniverseIds = null) {
  const seen = new Set();
  const validIds = validUniverseIds instanceof Set ? validUniverseIds : null;

  return (Array.isArray(bridges) ? bridges : [])
    .map((bridge) => (globalThis.controllerServices || globalThis).normalizeBridge(bridge))
    .filter((bridge) => {
      if (!bridge || !bridge.universeId) return false;
      if (sourceUniverseId && bridge.universeId === sourceUniverseId && !bridge.creationId)
        return false;
      if (validIds && !validIds.has(bridge.universeId)) return false;
      const key = (globalThis.controllerServices || globalThis).bridgeKey(bridge.universeId, bridge.creationId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeSchemaUniverse(universe, options = {}) {
  const validUniverseIds =
    options.validUniverseIds instanceof Set ? options.validUniverseIds : null;
  const canonicalBuilder = window.WormholesCanonicalPersistence?.builders?.universe;
  if (canonicalBuilder) {
    const canonical = canonicalBuilder(universe || {}, {
      idFactory: makeId,
      folderNameFor: stableUniverseFolderName,
      validUniverseIds,
      dropInvalidReferences: !!validUniverseIds,
    });
    return {...canonical, bridges: canonical.bridges.map((bridge) => ({...bridge}))};
  }
  const normalized = {
    ...universe,
    id: universe?.id || makeId(),
    title: universe?.title || "Untitled Universe",
    summary: universe?.summary || "",
    bridges: Array.isArray(universe?.bridges)
      ? validUniverseIds
        ? normalizeBridgeListForImport(universe.bridges, universe?.id || "", validUniverseIds)
        : (globalThis.controllerServices || globalThis).normalizeUniverseBridges(universe)
      : [],
    createdAt: universe?.createdAt || new Date().toISOString(),
  };
  if (!normalized.diskFolderName) {
    normalized.diskFolderName = stableUniverseFolderName(normalized);
  }
  return normalized;
}

function runAppSchemaMigrations() {
  const storedVersion = readStoredSchemaVersion();
  let changed = storedVersion < WORMHOLES_APP_SCHEMA_VERSION;
  universes = (universes || []).map((universe) => {
    const before = JSON.stringify(universe || {});
    const after = normalizeSchemaUniverse(universe || {});
    if (JSON.stringify(after) !== before) changed = true;
    return after;
  });

  if (storedVersion >= WORMHOLES_APP_SCHEMA_VERSION && !changed) return;

  universes.forEach((universe) => {
    let rawArchive = [];
    let rawNotes = {};
    let rawLiterature = [];
    let rawVision = [];
    try {
      rawArchive =
        (typeof wormholesRepository === "function" ? wormholesRepository("archive") : null)?.read(
          universe.id,
          [],
        ) ??
        readPersistedDatasetData(
          archiveStorageKey(universe.id),
          oldArchiveStorageKey(universe.id),
          [],
        );
    } catch (error) {}
    try {
      rawNotes =
        (typeof wormholesRepository === "function"
          ? wormholesRepository("connectionNotes")
          : null
        )?.read(universe.id, {}) ??
        readPersistedDatasetData(
          connectionNotesStorageKey(universe.id),
          oldConnectionNotesStorageKey(universe.id),
          {},
        );
    } catch (error) {}
    try {
      rawLiterature =
        (typeof wormholesRepository === "function"
          ? wormholesRepository("literature")
          : null
        )?.read(universe.id, []) ??
        readPersistedDatasetData(
          literatureStorageKey(universe.id),
          oldLiteratureStorageKey(universe.id),
          [],
        );
    } catch (error) {}
    try {
      rawVision =
        (typeof wormholesRepository === "function" ? wormholesRepository("vision") : null)?.read(
          universe.id,
          [],
        ) ??
        readPersistedDatasetData(
          visionStorageKey(universe.id),
          oldVisionStorageKey(universe.id),
          [],
        );
    } catch (error) {}
    const archive = (Array.isArray(rawArchive) ? rawArchive : []).map(
      (globalThis.controllerServices || globalThis).normalizeSchemaArchiveEntry,
    );
    saveArchiveForUniverse(universe.id, archive);
    if (!rawNotes || typeof rawNotes !== "object" || Array.isArray(rawNotes))
      saveConnectionNotesForUniverse(universe.id, {});
    const literature = (Array.isArray(rawLiterature) ? rawLiterature : []).map((doc) =>
      (globalThis.controllerServices || globalThis).normalizeImportedLiteratureDoc(doc, universe.id),
    );
    (globalThis.controllerServices || globalThis).writeLiteratureMetadataOnly(universe.id, literature);
    const vision = (Array.isArray(rawVision) ? rawVision : []).map((item) =>
      (globalThis.controllerServices || globalThis).normalizeImportedVisionItem(item, universe.id),
    );
    (globalThis.controllerServices || globalThis).writeVisionMetadataOnly(universe.id, vision);
  });

  if (changed) saveUniversesToStorage();
  saveStoredSchemaVersion();
}

function universeIdSuffix(universe) {
  return (
    String(universe?.id || "unknown")
      .replace(/[^a-z0-9-]/gi, "")
      .slice(0, 8) || "unknown"
  );
}

function stableUniverseFolderName(universe) {
  const titlePart =
    (globalThis.controllerServices || globalThis).sanitizeFileNamePart(universe?.title || "Untitled Universe", "Untitled Universe")
      .slice(0, 56)
      .trim() || "Untitled Universe";
  return (globalThis.controllerServices || globalThis).sanitizeFileNamePart(
    `${titlePart} -- ${universeIdSuffix(universe)}`,
    `Universe -- ${universeIdSuffix(universe)}`,
  );
}

function legacyUniverseFolderName(universe) {
  return (globalThis.controllerServices || globalThis).sanitizeFileNamePart(
    universe?.title || "Untitled Universe",
    "Untitled Universe",
  );
}

function ensureUniverseDiskFolderName(universe) {
  if (!universe) return "Untitled Universe";
  if (!universe.diskFolderName) {
    universe.diskFolderName = stableUniverseFolderName(universe);
  }
  return universe.diskFolderName;
}

function normalizedUniverseTitle(title) {
  return String(title || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function duplicateUniverseTitleExists(title, ignoreId = "") {
  const normalized = normalizedUniverseTitle(title);
  if (!normalized) return false;
  return universes.some(
    (universe) =>
      universe.id !== ignoreId && normalizedUniverseTitle(universe.title) === normalized,
  );
}

function removeOriginalUniverse() {
  // Current behavior does not delete universes based on the visible title "Original Universe".
  // Legacy cleanup must never remove a user-created universe that happens to use that name.
}

function getCurrentUniverse() {
  return universes.find((universe) => universe.id === currentUniverseId) || null;
}

function showHomeScreen() {
  document.body?.classList.add("home-mode");
  document.body?.classList.remove("app-mode");
  document.getElementById("homeScreen").classList.add("active");
  document.getElementById("appScreen").classList.remove("active");
  (globalThis.controllerServices || globalThis).closeMenus();
  (globalThis.controllerServices || globalThis).closeTitleModal();
  closeUniverseTitleModal();
  closeUniverseArchiveModal();
  (globalThis.controllerServices || globalThis).closeGroupModal();
  (globalThis.controllerServices || globalThis).closeGroupConnectionModal();
  (globalThis.controllerServices || globalThis).closeLiteratureTagModal();
  (globalThis.controllerServices || globalThis).closeLiteratureViewer();
  (globalThis.controllerServices || globalThis).closeLiteratureUploadModal();
  (globalThis.controllerServices || globalThis).closeVisionUploadModal();
  (globalThis.controllerServices || globalThis).closeLiteratureLinksModal();
  closeMigrateModal();
  closeMigrateNewUniverseModal();
  closeCopyToUniverseModal?.();
  closeCopyNewUniverseModal?.();
  (globalThis.controllerServices || globalThis).closeBridgeModal();
  (globalThis.controllerServices || globalThis).closeBridgeNewUniverseModal();
  (globalThis.controllerServices || globalThis).closeWormholesModal();
  closeUniverseSummaryModal();
  closeUniverseEditModal();
  (globalThis.controllerServices || globalThis).closeDeleteEntryConfirm();
  closeDeleteUniverseModal();
  closeDeleteUniverseMigrateModal();
}

function showAppScreen() {
  document.body?.classList.remove("home-mode");
  document.body?.classList.add("app-mode");
  document.getElementById("homeScreen").classList.remove("active");
  document.getElementById("appScreen").classList.add("active");
}

function openUniverseTitleModal() {
  const input = document.getElementById("universeTitleInput");
  document.getElementById("universeTitleError").classList.remove("show");
  input.value = "";
  document.getElementById("universeTitleModal").classList.add("open");
  setTimeout(() => input.focus(), 0);
}

function closeUniverseTitleModal() {
  document.getElementById("universeTitleModal").classList.remove("open");
}

function createUniverseFromModal() {
  const input = document.getElementById("universeTitleInput");
  const title = input.value.trim();
  const error = document.getElementById("universeTitleError");
  error.classList.remove("show");

  if (!title) {
    (globalThis.controllerServices || globalThis).setModalErrorText("universeTitleError", "A universe title is required.");
    input.focus();
    return;
  }

  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("title", title, {
      fieldName: "universe title",
      operation: "create this universe",
    }).ok
  )
    return;

  if (duplicateUniverseTitleExists(title)) {
    (globalThis.controllerServices || globalThis).setModalErrorText(
      "universeTitleError",
      "A universe with that title already exists. Choose a unique title so archives, folders, and bridges stay clear.",
    );
    input.focus();
    return;
  }

  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("universes", universes.length, 1, {
      operation: "create another universe",
    }).ok
  )
    return;

  const universe = {
    id: makeId(),
    title,
    summary: "",
    bridges: [],
    createdAt: new Date().toISOString(),
  };
  universe.diskFolderName = stableUniverseFolderName(universe);

  const previousUniverses = universes.slice();
  universes.unshift(universe);

  if (!saveUniversesToStorage()) {
    universes = previousUniverses;
    (globalThis.controllerServices || globalThis).setModalErrorText(
      "universeTitleError",
      "Could not save universe. Try again.",
    );
    input.focus();
    return;
  }

  if (localFoldersEnabled && wormholesParentFolderHandle) {
    prepareWormholesFolderHandles({requestPermission: true})
      .then(() => ensureUniverseFolders(universe))
      .catch(() => {});
  }

  closeUniverseTitleModal();
  enterUniverse(universe.id);
  showSavedToast("Universe created");
}

function openUniverseArchiveModal() {
  renderUniverseArchiveList();
  document.getElementById("universeArchiveModal").classList.add("open");
}

function closeUniverseArchiveModal() {
  document.getElementById("universeArchiveModal").classList.remove("open");
}

function renderUniverseArchiveList() {
  universes =
    window.WormholesRenderValidation?.validateUniverses?.(universes, {
      storageKey: UNIVERSES_KEY,
      report: false,
    })?.value || universes;
  const list = document.getElementById("universeArchiveList");

  if (universes.length === 0) {
    list.innerHTML = `<div class="universe-empty">No saved universes yet. Choose Create New to begin.</div>`;
    return;
  }

  list.innerHTML = universes
    .map((universe) => {
      let creationCount = 0;
      let groupCount = 0;
      try {
        const archive =
          (typeof wormholesRepository === "function" ? wormholesRepository("archive") : null)?.read(
            universe.id,
            [],
          ) ??
          readPersistedDatasetData(
            archiveStorageKey(universe.id),
            oldArchiveStorageKey(universe.id),
            [],
          );
        creationCount = archive.filter((entry) => !(globalThis.controllerServices || globalThis).isGroupEntry(entry)).length;
        groupCount = archive.filter((entry) => (globalThis.controllerServices || globalThis).isGroupEntry(entry)).length;
      } catch (e) {
        creationCount = 0;
        groupCount = 0;
      }

      const savedLiteratureEntries = (globalThis.controllerServices || globalThis).readLiteratureForUniverse(universe.id);
      const savedLiteratureCount = savedLiteratureEntries.filter(
        (doc) => !(globalThis.controllerServices || globalThis).isLiteratureGroup(doc),
      ).length;
      const literatureGroupCount = savedLiteratureEntries.filter((doc) =>
        (globalThis.controllerServices || globalThis).isLiteratureGroup(doc),
      ).length;
      const savedImageCount = (globalThis.controllerServices || globalThis).readVisionBoardForUniverse(universe.id).length;
      const metaParts = [
        `${creationCount} archived creation${creationCount === 1 ? "" : "s"}`,
        ...(groupCount > 0 ? [`${groupCount} group${groupCount === 1 ? "" : "s"}`] : []),
        ...(literatureGroupCount > 0
          ? [`${literatureGroupCount} literature group${literatureGroupCount === 1 ? "" : "s"}`]
          : []),
        `${savedLiteratureCount} saved literature`,
        `${savedImageCount} saved image${savedImageCount === 1 ? "" : "s"}`,
      ];

      return `
      <div class="universe-entry ellipsis-row" data-id="${escapeHtml(universe.id)}">
        <button class="universe-entry-main ellipsis-row-main app-button" type="button" data-app-button="true">
          <span class="universe-entry-title">${escapeHtml(universe.title)}</span>
          ${universe.summary ? `<span class="universe-entry-summary">${escapeHtml(universe.summary)}</span>` : ""}
          <span class="universe-entry-meta">${metaParts.join(" · ")}</span>
        </button>
        <div class="menu-wrap ellipsis-row-actions">
          <button class="menu-button app-button" type="button" aria-label="Open universe menu" data-app-button="true">⋮</button>
          <div class="menu">
            <button class="universe-summary-action app-button" type="button" data-app-button="true">Add Summary</button>
            <button class="universe-edit-action app-button" type="button" data-app-button="true">Edit</button>
            <button class="universe-delete-action app-button" type="button" data-app-button="true">Delete Universe</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  document.querySelectorAll(".universe-entry-main").forEach((button) => {
    button.addEventListener("click", () => {
      const entryEl = button.closest(".universe-entry");
      closeUniverseArchiveModal();
      enterUniverse(entryEl.dataset.id);
    });
  });

  document.querySelectorAll("#universeArchiveList .menu-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const menu = button.closest(".menu-wrap").querySelector(".menu");
      (globalThis.controllerServices || globalThis).togglePositionedMenu(menu);
    });
  });

  document.querySelectorAll(".universe-summary-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".universe-entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      openUniverseSummaryModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".universe-edit-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".universe-entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      openUniverseEditModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".universe-delete-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".universe-entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      openDeleteUniverseModal(entryEl.dataset.id);
    });
  });
}

function openUniverseSummaryModal(universeId) {
  const universe = universes.find((item) => item.id === universeId);
  if (!universe) return;

  activeUniverseSummaryId = universeId;
  document.getElementById("universeSummaryError").classList.remove("show");
  document.getElementById("universeSummarySubtitle").textContent = universe.title;
  document.getElementById("universeSummaryInput").value = universe.summary || "";
  document.getElementById("universeSummaryModal").classList.add("open");
  setTimeout(() => document.getElementById("universeSummaryInput").focus(), 0);
}

function closeUniverseSummaryModal() {
  document.getElementById("universeSummaryModal").classList.remove("open");
  activeUniverseSummaryId = null;
}

function saveUniverseSummary() {
  const universe = universes.find((item) => item.id === activeUniverseSummaryId);
  if (!universe) return;

  const summary = document.getElementById("universeSummaryInput").value.trim();
  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("note", summary, {
      previousValue: universe.summary || "",
      fieldName: "universe summary",
      context: universe.title || "",
      operation: "save this summary",
    }).ok
  )
    return;
  const previousSummary = universe.summary || "";
  universe.summary = summary;
  if (!saveUniversesToStorage()) {
    universe.summary = previousSummary;
    return;
  }
  closeUniverseSummaryModal();
  renderUniverseArchiveList();
  showSavedToast("Summary saved");

  if (currentUniverseId === universe.id) {
    document.getElementById("currentUniverseLabel").textContent = universe.title;
  }
}

function openUniverseEditModal(universeId) {
  const universe = universes.find((item) => item.id === universeId);
  if (!universe) return;

  activeUniverseEditId = universeId;
  document.getElementById("universeEditError").classList.remove("show");
  document.getElementById("universeEditTitleInput").value = universe.title || "";
  document.getElementById("universeEditSummaryInput").value = universe.summary || "";
  document.getElementById("universeEditModal").classList.add("open");
  setTimeout(() => document.getElementById("universeEditTitleInput").focus(), 0);
}

function closeUniverseEditModal() {
  document.getElementById("universeEditModal").classList.remove("open");
  activeUniverseEditId = null;
}

function saveUniverseEdit() {
  const universe = universes.find((item) => item.id === activeUniverseEditId);
  if (!universe) return;

  const title = document.getElementById("universeEditTitleInput").value.trim();
  const summary = document.getElementById("universeEditSummaryInput").value.trim();
  const error = document.getElementById("universeEditError");
  error.classList.remove("show");

  if (!title) {
    (globalThis.controllerServices || globalThis).setModalErrorText("universeEditError", "A universe title is required.");
    document.getElementById("universeEditTitleInput").focus();
    return;
  }

  if (window.WormholesContentLimits) {
    if (
      !window.WormholesContentLimits.ensureString("title", title, {
        previousValue: universe.title || "",
        fieldName: "universe title",
        operation: "save this universe",
      }).ok
    )
      return;
    if (
      !window.WormholesContentLimits.ensureString("note", summary, {
        previousValue: universe.summary || "",
        fieldName: "universe summary",
        context: title,
        operation: "save this universe",
      }).ok
    )
      return;
  }

  if (duplicateUniverseTitleExists(title, universe.id)) {
    (globalThis.controllerServices || globalThis).setModalErrorText(
      "universeEditError",
      "A universe with that title already exists. Choose a unique title.",
    );
    document.getElementById("universeEditTitleInput").focus();
    return;
  }

  const previousTitle = universe.title || "";
  const previousSummary = universe.summary || "";
  const hadDiskFolderName = Object.prototype.hasOwnProperty.call(universe, "diskFolderName");
  const previousDiskFolderName = universe.diskFolderName;

  universe.title = title;
  universe.summary = summary;
  ensureUniverseDiskFolderName(universe);

  if (!saveUniversesToStorage()) {
    universe.title = previousTitle;
    universe.summary = previousSummary;
    if (hadDiskFolderName) universe.diskFolderName = previousDiskFolderName;
    else delete universe.diskFolderName;
    return;
  }
  closeUniverseEditModal();
  renderUniverseArchiveList();
  showSavedToast("Universe updated");

  if (currentUniverseId === universe.id) {
    document.getElementById("currentUniverseLabel").textContent = universe.title;
  }
}

function openDeleteUniverseModal(universeId) {
  const universe = universes.find((item) => item.id === universeId);
  if (!universe) return;

  activeUniverseDeleteId = universeId;
  const count = readArchiveForUniverse(universeId).length;
  document.getElementById("deleteUniverseTitle").textContent = `Delete “${universe.title}”?`;
  document.getElementById("deleteUniverseText").textContent =
    "This removes the universe, its creations, Literature, images, connections, and bridges.";
  document.getElementById("deleteUniverseMigratePrompt").textContent =
    count > 0
      ? `Move ${count} archived creation${count === 1 ? "" : "s"} first, or delete everything. You can restore the universe from the notification or Recent Activity for two minutes.`
      : "There are no archived creations to move. You can restore the deleted universe from the notification or Recent Activity for two minutes.";
  document.getElementById("migrateBeforeDeleteUniverseBtn").disabled =
    count === 0 || universes.filter((item) => item.id !== universeId).length === 0;
  document.getElementById("deleteUniverseModal").classList.add("open");
}

function closeDeleteUniverseModal() {
  document.getElementById("deleteUniverseModal").classList.remove("open");
}

function cleanupBridgesToUniverse(universeId) {
  let universesChanged = false;

  universes.forEach((universe) => {
    const archive =
      universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id);
    let changed = false;
    const cleaned = archive.map((entry) => {
      const oldBridges = (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges);
      const newBridges = oldBridges.filter((bridge) => bridge.universeId !== universeId);
      if (JSON.stringify(newBridges) !== JSON.stringify(oldBridges)) changed = true;
      return {...entry, bridges: newBridges};
    });

    if (changed) {
      if (universe.id === currentUniverseId) {
        archiveEntries = cleaned;
        saveArchiveToStorage();
      } else {
        saveArchiveForUniverse(universe.id, cleaned);
      }
    }

    const oldUniverseBridges = (globalThis.controllerServices || globalThis).normalizeUniverseBridges(universe);
    const newUniverseBridges = oldUniverseBridges.filter(
      (bridge) => bridge.universeId !== universeId,
    );
    if (JSON.stringify(newUniverseBridges) !== JSON.stringify(oldUniverseBridges)) {
      universe.bridges = newUniverseBridges;
      universesChanged = true;
    }
  });

  Object.keys(bridgeNotes).forEach((key) => {
    const nodes = key.split("||").filter(Boolean);
    const referencesDeletedUniverse = nodes.some(
      (nodeKey) => nodeKey === `U:${universeId}` || nodeKey.startsWith(`C:${universeId}:`),
    );
    if (referencesDeletedUniverse) delete bridgeNotes[key];
  });
  (globalThis.controllerServices || globalThis).cleanupBridgeNotes();

  if (universesChanged) {
    saveUniversesToStorage();
  }
}

async function deleteUniverseStorage(universeId, options = {}) {
  const deferCleanup = !!options.deferCleanup;
  const keepUniverseArchiveOpen = document
    .getElementById("universeArchiveModal")
    ?.classList.contains("open");
  const deletedUniverse = universes.find((universe) => universe.id === universeId) || null;

  if (!deferCleanup && localFoldersEnabled && deletedUniverse) {
    await (globalThis.controllerServices || globalThis).deleteUniverseFoldersFromDisk(deletedUniverse);
  }

  try {
    removeMigratedLocalStorageValue(
      archiveStorageKey(universeId),
      oldArchiveStorageKey(universeId),
    );
    removeMigratedLocalStorageValue(
      connectionNotesStorageKey(universeId),
      oldConnectionNotesStorageKey(universeId),
    );
    removeMigratedLocalStorageValue(
      literatureStorageKey(universeId),
      oldLiteratureStorageKey(universeId),
    );
    removeMigratedLocalStorageValue(visionStorageKey(universeId), oldVisionStorageKey(universeId));
    if (!deferCleanup) await deleteUniverseLargeData(universeId);
  } catch (e) {}

  universes = universes.filter((universe) => universe.id !== universeId);
  cleanupBridgesToUniverse(universeId);
  saveUniversesToStorage();
  if (!deferCleanup) await (globalThis.controllerServices || globalThis).pruneWormholesFolderToAppState();

  if (currentUniverseId === universeId) {
    currentUniverseId = null;
    archiveEntries = [];
    literatureEntries = [];
    visionEntries = [];
    visionFolderHandle = null;
    literatureFolderHandle = null;
    creationFolderHandle = null;
    if (universes.length === 0 && !deferCleanup) {
      wormholesParentFolderHandle = null;
      wormholesRootFolderHandle = null;
      wormholesLiteratureRootHandle = null;
      wormholesImagesRootHandle = null;
      wormholesCreationsRootHandle = null;
    }
    connectionNotes = {};

    if (keepUniverseArchiveOpen) {
      document.getElementById("homeScreen").classList.add("active");
      document.getElementById("appScreen").classList.remove("active");
      (globalThis.controllerServices || globalThis).closeMenus();
      (globalThis.controllerServices || globalThis).closeTitleModal();
      closeUniverseTitleModal();
      (globalThis.controllerServices || globalThis).closeGroupModal();
      (globalThis.controllerServices || globalThis).closeGroupConnectionModal();
      (globalThis.controllerServices || globalThis).closeLiteratureTagModal();
      (globalThis.controllerServices || globalThis).closeLiteratureViewer();
      (globalThis.controllerServices || globalThis).closeLiteratureUploadModal();
      (globalThis.controllerServices || globalThis).closeVisionUploadModal();
      (globalThis.controllerServices || globalThis).closeLiteratureLinksModal();
      closeMigrateModal();
      closeMigrateNewUniverseModal();
      closeCopyToUniverseModal?.();
      closeCopyNewUniverseModal?.();
      (globalThis.controllerServices || globalThis).closeBridgeModal();
      (globalThis.controllerServices || globalThis).closeBridgeNewUniverseModal();
      (globalThis.controllerServices || globalThis).closeWormholesModal();
      closeUniverseSummaryModal();
      closeUniverseEditModal();
      (globalThis.controllerServices || globalThis).closeDeleteEntryConfirm();
    } else {
      showHomeScreen();
    }
  }

  if (!deferCleanup) {
    window.WormholesManualDrafts?.removeUniverseDrafts?.(universeId);
    return null;
  }
  return async () => {
    if (localFoldersEnabled && deletedUniverse) {
      await (globalThis.controllerServices || globalThis).deleteUniverseFoldersFromDisk(deletedUniverse);
    }
    await deleteUniverseLargeData(universeId);
    await (globalThis.controllerServices || globalThis).pruneWormholesFolderToAppState();
    window.WormholesManualDrafts?.removeUniverseDrafts?.(universeId);
    if (universes.length === 0 && !currentUniverseId) {
      wormholesRootFolderHandle = null;
      wormholesLiteratureRootHandle = null;
      wormholesImagesRootHandle = null;
      wormholesCreationsRootHandle = null;
    }
  };
}

async function confirmDeleteUniverseWithoutMigration() {
  if (!activeUniverseDeleteId) return;

  const id = activeUniverseDeleteId;
  const undoState = window.WormholesUndo?.captureState?.();
  let journalTransaction = null;
  try {
    journalTransaction = await beginUniverseMutationJournal({
      operation: "universe-delete",
      label: "Universe deletion",
      snapshotReason: "before-universe-delete",
    });
    closeDeleteUniverseModal();
    const finalize = await deleteUniverseStorage(id, {
      deferCleanup: !!(window.WormholesUndo && undoState),
    });
    activeUniverseDeleteId = null;
    renderUniverseArchiveList();
    if (window.WormholesUndo && undoState) {
      if (journalTransaction) {
        await window.WormholesUndo.offer({
          message: "Universe deleted",
          restoredMessage: "Universe restored",
          undo: async () => {
            const restored = await window.WormholesUndo.restoreState(undoState);
            if (restored && journalTransaction) {
              await window.WormholesWriteAheadJournal.discardAfterRollback(journalTransaction);
              journalTransaction = null;
            }
            return restored;
          },
          finalize: async () => {
            await finalize?.();
            if (journalTransaction) {
              await window.WormholesWriteAheadJournal.markPhase(
                journalTransaction,
                "cleanup-complete",
              );
              await window.WormholesWriteAheadJournal.commit(journalTransaction);
              journalTransaction = null;
            }
          },
        });
      } else {
        await window.WormholesUndo.offer({
          message: "Universe deleted",
          restoredMessage: "Universe restored",
          state: undoState,
          finalize,
        });
      }
    } else {
      if (journalTransaction) {
        await window.WormholesWriteAheadJournal.markPhase(journalTransaction, "cleanup-complete");
        await window.WormholesWriteAheadJournal.commit(journalTransaction);
        journalTransaction = null;
      }
      showSavedToast("Universe deleted");
    }
  } catch (error) {
    activeUniverseDeleteId = null;
    if (journalTransaction) {
      try {
        await restoreUniverseMutationFromJournal(journalTransaction);
      } catch (rollbackError) {
        console.error("Universe deletion journal rollback failed", rollbackError);
      }
    }
    reportUniverseMutationFailure("Universe deletion failed", error);
  }
}

function openDeleteUniverseMigrateModal() {
  if (!activeUniverseDeleteId) return;

  closeDeleteUniverseModal();
  renderDeleteUniverseMigrateList();
  document.getElementById("deleteUniverseMigrateModal").classList.add("open");
}

function closeDeleteUniverseMigrateModal() {
  document.getElementById("deleteUniverseMigrateModal").classList.remove("open");
}

function renderDeleteUniverseMigrateList() {
  const list = document.getElementById("deleteUniverseMigrateList");
  const sourceUniverse = universes.find((item) => item.id === activeUniverseDeleteId);
  const options = universes.filter((item) => item.id !== activeUniverseDeleteId);

  document.getElementById("deleteUniverseMigrateSubtitle").textContent = sourceUniverse
    ? `Choose a universe for the creations from “${sourceUniverse.title}”. The source universe will then be deleted.`
    : "Choose a universe for the creations. The source universe will then be deleted.";

  if (options.length === 0) {
    list.innerHTML = `<div class="universe-empty">No other universes available.</div>`;
    return;
  }

  list.innerHTML = options
    .map((universe) => {
      const count = readArchiveForUniverse(universe.id).length;
      return `
      <button class="universe-entry-button delete-migrate-target app-button" type="button" data-id="${escapeHtml(universe.id)}" data-app-button="true">
        <span class="universe-entry-title">${escapeHtml(universe.title)}</span>
        ${universe.summary ? `<span class="universe-entry-summary">${escapeHtml(universe.summary)}</span>` : ""}
        <span class="universe-entry-meta">${count} archived creation${count === 1 ? "" : "s"}</span>
      </button>
    `;
    })
    .join("");

  document.querySelectorAll(".delete-migrate-target").forEach((button) => {
    button.addEventListener("click", () => migrateAllAndDeleteUniverse(button.dataset.id));
  });
}

async function migrateAllAndDeleteUniverse(targetUniverseId) {
  if (!activeUniverseDeleteId || !targetUniverseId || targetUniverseId === activeUniverseDeleteId)
    return;

  const undoState = window.WormholesUndo?.captureState?.();
  const sourceUniverse = universes.find((item) => item.id === activeUniverseDeleteId);
  const sourceArchive = readArchiveForUniverse(activeUniverseDeleteId);
  const sourceNotes = readConnectionNotesForUniverse(activeUniverseDeleteId);
  const idsToMigrate = sourceArchive.map((entry) => entry.id);
  const {idMap, migratedEntries} = (globalThis.controllerServices || globalThis).cloneMigratedArchiveEntries(
    sourceArchive,
    idsToMigrate,
    sourceUniverse,
    targetUniverseId,
  );
  const deletedId = activeUniverseDeleteId;
  let journalTransaction = null;
  const targetArchive = readArchiveForUniverse(targetUniverseId);
  if (window.WormholesDuplicateCreations?.reviewBatch) {
    const duplicateReview = await window.WormholesDuplicateCreations.reviewBatch(
      migratedEntries,
      targetArchive,
      {
        actionLabel: "Move Anyway",
        actionKind: "move",
        opener: document.querySelector(
          `.delete-migrate-target[data-id="${cssEscapeValue(targetUniverseId)}"]`,
        ),
      },
    );
    if (duplicateReview.decision === "view") {
      closeDeleteUniverseMigrateModal();
      activeUniverseDeleteId = null;
      enterUniverse(targetUniverseId);
      switchTab("archive");
      (globalThis.controllerServices || globalThis).revealArchiveEntryForTag(duplicateReview.match?.existing?.id || "");
      return;
    }
    if (duplicateReview.decision !== "proceed") return;
  }

  try {
    journalTransaction = await beginUniverseMutationJournal({
      operation: "universe-migrate-delete",
      label: "Moving creations and deleting universe",
      snapshotReason: "before-universe-migrate-delete",
    });

    saveArchiveForUniverse(targetUniverseId, [...migratedEntries, ...targetArchive]);

    const targetNotes = readConnectionNotesForUniverse(targetUniverseId);
    Object.entries(sourceNotes).forEach(([key, note]) => {
      const [a, b] = key.split("::");
      if (idMap[a] && idMap[b]) {
        targetNotes[(globalThis.controllerServices || globalThis).makeConnectionKeyFromIds(idMap[a], idMap[b])] = note;
      }
    });
    saveConnectionNotesForUniverse(targetUniverseId, targetNotes);

    (globalThis.controllerServices || globalThis).remapIncomingBridgesForMigration(
      activeUniverseDeleteId,
      targetUniverseId,
      idMap,
    );
    (globalThis.controllerServices || globalThis).remapBridgeNotesForMigratedEntries(
      activeUniverseDeleteId,
      targetUniverseId,
      idMap,
    );

    closeDeleteUniverseMigrateModal();
    const finalize = await deleteUniverseStorage(deletedId, {
      deferCleanup: !!(window.WormholesUndo && undoState),
    });
    activeUniverseDeleteId = null;
    renderUniverseArchiveList();
    if (window.WormholesUndo && undoState) {
      if (journalTransaction) {
        await window.WormholesUndo.offer({
          message: "Creations moved; universe deleted",
          restoredMessage: "Universe deletion undone",
          undo: async () => {
            const restored = await window.WormholesUndo.restoreState(undoState);
            if (restored && journalTransaction) {
              await window.WormholesWriteAheadJournal.discardAfterRollback(journalTransaction);
              journalTransaction = null;
            }
            return restored;
          },
          finalize: async () => {
            await finalize?.();
            if (journalTransaction) {
              await window.WormholesWriteAheadJournal.markPhase(
                journalTransaction,
                "cleanup-complete",
              );
              await window.WormholesWriteAheadJournal.commit(journalTransaction);
              journalTransaction = null;
            }
          },
        });
      } else {
        await window.WormholesUndo.offer({
          message: "Creations moved; universe deleted",
          restoredMessage: "Universe deletion undone",
          state: undoState,
          finalize,
        });
      }
    } else {
      if (journalTransaction) {
        await window.WormholesWriteAheadJournal.markPhase(journalTransaction, "cleanup-complete");
        await window.WormholesWriteAheadJournal.commit(journalTransaction);
        journalTransaction = null;
      }
      showSavedToast("Universe deleted");
    }
  } catch (error) {
    activeUniverseDeleteId = null;
    if (journalTransaction) {
      try {
        await restoreUniverseMutationFromJournal(journalTransaction);
      } catch (rollbackError) {
        console.error("Universe migration journal rollback failed", rollbackError);
      }
    }
    reportUniverseMutationFailure("Moving creations and deleting the universe failed", error);
  }
}

function openMigrateNewUniverseModal() {
  if (!activeMigrateEntryId) return;

  document.getElementById("migrateNewUniverseError").classList.remove("show");
  document.getElementById("migrateNewUniverseInput").value = "";
  document.getElementById("migrateNewUniverseModal").classList.add("open");
  setTimeout(() => document.getElementById("migrateNewUniverseInput").focus(), 0);
}

function closeMigrateNewUniverseModal() {
  document.getElementById("migrateNewUniverseModal")?.classList.remove("open");
}

async function createMigrateNewUniverse() {
  const sourceEntry = (globalThis.controllerServices || globalThis).getEntry(activeMigrateEntryId);
  const sourceUniverse = getCurrentUniverse();
  if (!sourceEntry || !sourceUniverse) return;

  const input = document.getElementById("migrateNewUniverseInput");
  const title = input.value.trim();
  const error = document.getElementById("migrateNewUniverseError");
  error.classList.remove("show");

  if (!title) {
    (globalThis.controllerServices || globalThis).setModalErrorText(
      "migrateNewUniverseError",
      "A universe title is required.",
    );
    input.focus();
    return;
  }

  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("title", title, {
      fieldName: "universe title",
      operation: "create this universe",
    }).ok
  )
    return;

  if (duplicateUniverseTitleExists(title)) {
    (globalThis.controllerServices || globalThis).setModalErrorText(
      "migrateNewUniverseError",
      "A universe with that title already exists. Choose a unique title.",
    );
    input.focus();
    return;
  }

  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("universes", universes.length, 1, {
      operation: "create another universe",
    }).ok
  )
    return;
  const migrationCount = (globalThis.controllerServices || globalThis).isGroupEntry(sourceEntry)
    ? 1 + (globalThis.controllerServices || globalThis).groupChildIds(sourceEntry).length
    : 1;
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("archive", 0, migrationCount, {
      context: title,
      operation: "move these Archive items",
    }).ok
  )
    return;

  const universe = {
    id: makeId(),
    title,
    summary: "",
    bridges: [],
    createdAt: new Date().toISOString(),
  };
  universe.diskFolderName = stableUniverseFolderName(universe);

  universes.unshift(universe);
  saveUniversesToStorage();

  closeMigrateNewUniverseModal();
  await (globalThis.controllerServices || globalThis).migrateEntryToUniverse(universe.id);
  renderUniverseArchiveList();
}

function openMigrateModal(entryId) {
  const entry = (globalThis.controllerServices || globalThis).getEntry(entryId);
  if (!entry) return;

  activeMigrateEntryId = entryId;
  stagedMigrateTargetUniverseId = null;
  const isGroup = (globalThis.controllerServices || globalThis).isGroupEntry(entry);
  document.getElementById("migrateModalTitle").textContent = isGroup
    ? "Move Creation Group"
    : "Move Creation";
  document.getElementById("migrateModalSubtitle").textContent =
    `Choose a universe for “${entry.title}”. The original will be removed from this universe.`;
  document.getElementById("saveMigrateBtn").textContent = isGroup ? "Move Group" : "Move Creation";
  renderMigrateUniverseList();
  document.getElementById("migrateModal").classList.add("open");
}

function closeMigrateModal() {
  document.getElementById("migrateModal").classList.remove("open");
  activeMigrateEntryId = null;
  stagedMigrateTargetUniverseId = null;
}

function renderMigrateUniverseList() {
  const list = document.getElementById("migrateUniverseList");

  if (universes.length === 0) {
    list.innerHTML = `<div class="universe-empty">No saved universes available.</div>`;
    return;
  }

  const saveButton = document.getElementById("saveMigrateBtn");
  if (saveButton) {
    const disabled = !stagedMigrateTargetUniverseId;
    saveButton.setAttribute("aria-disabled", disabled ? "true" : "false");
    saveButton.toggleAttribute("disabled", disabled);
  }

  list.innerHTML = universes
    .map((universe) => {
      let count = 0;
      try {
        count = readArchiveForUniverse(universe.id).length;
      } catch (e) {
        count = 0;
      }

      const isCurrent = universe.id === currentUniverseId;
      const isSelected = universe.id === stagedMigrateTargetUniverseId;

      return `
      <button class="universe-entry-button migrate-universe-button app-button ${isSelected ? "selected" : ""}" type="button" data-id="${escapeHtml(universe.id)}" ${isCurrent ? "disabled" : ""} data-app-button="true" aria-pressed="${isSelected ? "true" : "false"}">
        <span class="universe-entry-title">${escapeHtml(universe.title)}</span>
        ${universe.summary ? `<span class="universe-entry-summary">${escapeHtml(universe.summary)}</span>` : ""}
        <span class="universe-entry-meta">${isCurrent ? "Current universe" : isSelected ? "Selected target" : `${count} archived creation${count === 1 ? "" : "s"}`}</span>
      </button>
    `;
    })
    .join("");

  document.querySelectorAll(".migrate-universe-button:not(:disabled)").forEach((button) => {
    button.addEventListener("click", () => selectMigrateUniverseTarget(button.dataset.id));
  });
}

function selectMigrateUniverseTarget(targetUniverseId) {
  if (!targetUniverseId || targetUniverseId === currentUniverseId) return;
  stagedMigrateTargetUniverseId = targetUniverseId;
  renderMigrateUniverseList();
}

async function saveMigratePickerModal() {
  if (!stagedMigrateTargetUniverseId) return;
  await (globalThis.controllerServices || globalThis).migrateEntryToUniverse(stagedMigrateTargetUniverseId);
}

function enterUniverse(universeId) {
  const universe = universes.find((item) => item.id === universeId);
  if (!universe) return;

  if (currentUniverseId && typeof (globalThis.controllerServices || globalThis).persistManualCreateDraft === "function") {
    (globalThis.controllerServices || globalThis).persistManualCreateDraft({
      universeId: currentUniverseId,
      showStatus: false,
    });
  }
  ensureUniverseDiskFolderName(universe);
  currentUniverseId = universe.id;

  current = {what: null, attr1: null, attr2: null, pressure: null};
  if (typeof (globalThis.controllerServices || globalThis).resetCurrentGenerationDiagnostics === "function")
    (globalThis.controllerServices || globalThis).resetCurrentGenerationDiagnostics();
  connectSourceId = null;
  selectedMapNodeId = null;
  activeConnectionKey = null;

  loadArchiveFromStorage();
  (globalThis.controllerServices || globalThis).normalizeArchiveNotes();
  loadConnectionNotesFromStorage();
  (globalThis.controllerServices || globalThis).loadLiteratureFromStorage();
  (globalThis.controllerServices || globalThis).loadVisionBoardFromStorage();
  restoreFolderHandlesForCurrentUniverse();

  document.getElementById("currentUniverseLabel").textContent = universe.title;
  if (typeof (globalThis.controllerServices || globalThis).restoreManualCreateDraftForCurrentUniverse === "function")
    (globalThis.controllerServices || globalThis).restoreManualCreateDraftForCurrentUniverse();
  else (globalThis.controllerServices || globalThis).clearManualCreate();
  renderCurrent();
  (globalThis.controllerServices || globalThis).renderArchive();
  showArchiveListScreen();
  switchTab("current");
  showAppScreen();
}

/* Public controller surface for served ES-module builds. */
const UNIVERSE_CONTROLLER_API = Object.freeze({
  beginUniverseMutationJournal,
  restoreUniverseMutationFromJournal,
  reportUniverseMutationFailure,
  deleteUniverseLargeData,
  normalizeBridgeListForImport,
  normalizeSchemaUniverse,
  runAppSchemaMigrations,
  universeIdSuffix,
  stableUniverseFolderName,
  legacyUniverseFolderName,
  ensureUniverseDiskFolderName,
  normalizedUniverseTitle,
  duplicateUniverseTitleExists,
  removeOriginalUniverse,
  getCurrentUniverse,
  showHomeScreen,
  showAppScreen,
  openUniverseTitleModal,
  closeUniverseTitleModal,
  createUniverseFromModal,
  openUniverseArchiveModal,
  closeUniverseArchiveModal,
  renderUniverseArchiveList,
  openUniverseSummaryModal,
  closeUniverseSummaryModal,
  saveUniverseSummary,
  openUniverseEditModal,
  closeUniverseEditModal,
  saveUniverseEdit,
  openDeleteUniverseModal,
  closeDeleteUniverseModal,
  cleanupBridgesToUniverse,
  deleteUniverseStorage,
  confirmDeleteUniverseWithoutMigration,
  openDeleteUniverseMigrateModal,
  closeDeleteUniverseMigrateModal,
  renderDeleteUniverseMigrateList,
  migrateAllAndDeleteUniverse,
  openMigrateNewUniverseModal,
  closeMigrateNewUniverseModal,
  createMigrateNewUniverse,
  openMigrateModal,
  closeMigrateModal,
  renderMigrateUniverseList,
  selectMigrateUniverseTarget,
  saveMigratePickerModal,
  enterUniverse,
});
(globalThis.registerControllerServices || (() => {}))(UNIVERSE_CONTROLLER_API);
