/* GENERATED from scripts/modules/data-portability-controller.mjs. Do not edit this direct-file compatibility adapter. */
/* EMBEDDED from scripts/modules/data-portability-backup-helpers.mjs for direct-file compatibility. */
/* Wormholes Beta 261 — Local-folder backup creation, reconstruction, and restore workflows.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */


const DATA_PORTABILITY_BACKUP_MANIFEST_FILE = "wormholes-app-data-backup.json";

function backupWorkflowError(code, message, options = {}) {
  const appErrors =
    typeof importedAppErrorsApi !== "undefined" ? importedAppErrorsApi : window.WormholesAppErrors;
  if (appErrors?.createError) return appErrors.createError(code, message, options);
  return Object.assign(new Error(message), {code, ...options});
}

async function pickNativeDirectory() {
  if (!(globalThis.controllerServices || globalThis).localFolderNativeApiSupported()) {
    throw backupWorkflowError(
      "WORMHOLES_FOLDER_UNAVAILABLE",
      "Folder picker is unavailable in this browser.",
    );
  }
  const handle = await window.showDirectoryPicker({mode: "readwrite", startIn: "desktop"});
  if (!(await (globalThis.controllerServices || globalThis).requestFolderPermission(handle))) {
    throw backupWorkflowError("WORMHOLES_FOLDER_PERMISSION", "Folder permission was not granted.");
  }
  return handle;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function handlesAreSameEntry(a, b) {
  if (!a || !b || !a.isSameEntry) return false;
  try {
    return await a.isSameEntry(b);
  } catch (e) {
    return false;
  }
}

async function copyDirectoryContents(sourceHandle, destinationHandle) {
  if (!sourceHandle || !destinationHandle)
    throw backupWorkflowError("WORMHOLES_FOLDER_READ", "Missing folder.");
  if (await handlesAreSameEntry(sourceHandle, destinationHandle)) {
    throw backupWorkflowError(
      "WORMHOLES_BACKUP_TARGET",
      "Choose a different folder for the backup.",
    );
  }
  for await (const [name, handle] of sourceHandle.entries()) {
    if (handle.kind === "file") {
      const file = await handle.getFile();
      await (globalThis.controllerServices || globalThis).writeBlobToFolder(destinationHandle, name, file);
    } else if (handle.kind === "directory") {
      const nextDestination = await (globalThis.controllerServices || globalThis).getOrCreateDirectory(
        destinationHandle,
        name,
      );
      await copyDirectoryContents(handle, nextDestination);
    }
  }
}

async function readManagedFolderMarkerJson(folderHandle) {
  if (!folderHandle) return null;
  try {
    const fileHandle = await folderHandle.getFileHandle(WORMHOLES_MANAGED_MARKER, {
      create: false,
    });
    const file = await fileHandle.getFile();
    window.WormholesFileLimits?.assertFile?.(file, "backupCreation", {
      label: "backup marker file",
    });
    return JSON.parse(await file.text());
  } catch (e) {
    if (e?.code === "WORMHOLES_FILE_TOO_LARGE") throw e;
    return null;
  }
}

function titleFromUniverseFolderName(folderName) {
  const cleaned = String(folderName || "")
    .replace(/\s--\s[a-z0-9-]{8,}$/i, "")
    .trim();
  return cleaned || (globalThis.controllerServices || globalThis).fileTitleFromName(folderName) || "Restored Universe";
}

async function selectedFolderAsWormholesRoot(selectedHandle) {
  if (!selectedHandle) return null;
  if (await (globalThis.controllerServices || globalThis).folderHasCategoryDirectories(selectedHandle)) return selectedHandle;
  try {
    const child = await selectedHandle.getDirectoryHandle("Wormholes", {create: false});
    if (await (globalThis.controllerServices || globalThis).folderHasCategoryDirectories(child)) return child;
  } catch (e) {}
  return null;
}

function backupUniverseKeyFromFolder(folderName, marker) {
  return String(marker?.universeId || folderName || makeId());
}

function ensureBackupUniverseRecord(restoreMap, folderName, marker = {}) {
  const key = backupUniverseKeyFromFolder(folderName, marker);
  if (!restoreMap.has(key)) {
    const title = marker?.title || titleFromUniverseFolderName(folderName);
    const id = marker?.universeId || makeId();
    restoreMap.set(key, {
      id,
      title,
      summary: "",
      bridges: [],
      createdAt: marker?.createdAt || new Date().toISOString(),
      diskFolderName: folderName,
      folders: {creations: null, literature: null, images: null},
    });
  } else {
    const record = restoreMap.get(key);
    if (marker?.title && (!record.title || /^Restored Universe/i.test(record.title)))
      record.title = marker.title;
    if (marker?.universeId && record.id !== marker.universeId) record.id = marker.universeId;
    if (!record.diskFolderName) record.diskFolderName = folderName;
  }
  return restoreMap.get(key);
}

async function collectBackupUniverseFolders(rootHandle) {
  const restoreMap = new Map();
  const categories = [
    {key: "creations", directory: "Creations"},
    {key: "literature", directory: "Literature"},
    {key: "images", directory: "Images"},
  ];

  for (const category of categories) {
    let categoryHandle = null;
    try {
      categoryHandle = await rootHandle.getDirectoryHandle(category.directory, {create: false});
    } catch (e) {
      continue;
    }

    const categoryUniverseIds = new Map();
    for await (const [folderName, folderHandle] of categoryHandle.entries()) {
      if (
        folderHandle.kind !== "directory" ||
        (globalThis.controllerServices || globalThis).shouldSkipFolderPruneEntry(folderName)
      )
        continue;
      const marker = (await readManagedFolderMarkerJson(folderHandle)) || {};
      const markerId = String(marker?.universeId || "");
      if (markerId) {
        if (categoryUniverseIds.has(markerId) && categoryUniverseIds.get(markerId) !== folderName) {
          const result = window.WormholesIdIntegrity?.duplicateResult?.("universe", markerId, {
            context: `the ${category.directory} backup folders`,
          });
          if (result) throw window.WormholesIdIntegrity.errorFor(result);
          throw backupWorkflowError(
            "WORMHOLES_DUPLICATE_ID",
            "This backup contains duplicate universe IDs.",
          );
        }
        categoryUniverseIds.set(markerId, folderName);
      }
      const record = ensureBackupUniverseRecord(restoreMap, folderName, marker);
      record.folders[category.key] = folderHandle;
    }
  }

  return Array.from(restoreMap.values());
}

async function textFromBackupFile(file, fileName = "", limitKind = "backupLiterature") {
  const name = String(fileName || file?.name || "");
  try {
    window.WormholesFileLimits?.assertFile?.(file, limitKind, {
      label: limitKind === "backupCreation" ? "backup creation file" : "backup Literature document",
    });
    if (/\.docx$/i.test(name)) {
      return await convertDocxArrayBufferToText(await file.arrayBuffer());
    }
    if (/\.doc$/i.test(name)) {
      return convertDocArrayBufferToText(await file.arrayBuffer());
    }
    return await file.text();
  } catch (e) {
    if (e?.code === "WORMHOLES_FILE_TOO_LARGE") throw e;
    return "";
  }
}

function backupTextLineValue(text, label) {
  const pattern = new RegExp(
    `^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*(.*)$`,
    "im",
  );
  const match = String(text || "").match(pattern);
  return match ? match[1].trim() : "";
}

function backupTextSection(text, header) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
  const headerIndex = lines.findIndex(
    (line) => line.trim().toLowerCase() === `${header.toLowerCase()}:`,
  );
  if (headerIndex < 0) return "";
  const collected = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (
      /^\s*(Notes|Connections|Bridges|Linked Literature|Linked Images)\s*:\s*$/i.test(line) &&
      collected.length
    )
      break;
    collected.push(line);
  }
  return collected.join("\n").trim().replace(/^—$/, "");
}

function creationEntryFromBackupFileText(fileName, text, file) {
  const titleLine = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  const title =
    titleLine && !/^Universe\s*:/i.test(titleLine)
      ? titleLine
      : (globalThis.controllerServices || globalThis).fileTitleFromName(fileName);
  const type = backupTextLineValue(text, "Type");
  const what = backupTextLineValue(text, "What") || type || "Restored Creation";
  const attr1 = backupTextLineValue(text, "Attribute");
  const allAttrMatches = Array.from(String(text || "").matchAll(/^Attribute\s*:\s*(.*)$/gim))
    .map((match) => match[1].trim())
    .filter(Boolean);
  const attr2 = allAttrMatches[1] || "Restored from folder backup";
  const story = backupTextLineValue(text, "Story") || "Restored from local folder backup.";
  const summary = backupTextSection(text, "Summary");
  return (globalThis.controllerServices || globalThis).normalizeSchemaArchiveEntry({
    id: makeId(),
    title: title || (globalThis.controllerServices || globalThis).fileTitleFromName(fileName) || "Restored Creation",
    what: {val: what},
    attr1: {val: attr1 || "Restored from folder backup"},
    attr2: {val: attr2},
    pressure: {val: story},
    summary: summary || "",
    notes: [],
    connections: [],
    bridges: [],
    storage: "folder",
    folderFileName: fileName,
    sourceName: fileName,
    fileSize: file?.size || 0,
    createdAt: new Date().toISOString(),
  });
}

async function readBackupCreationsForUniverse(universeRecord) {
  const entries = [];
  const folder = universeRecord?.folders?.creations;
  if (!folder) return entries;

  for await (const [fileName, handle] of folder.entries()) {
    if (handle.kind !== "file" || (globalThis.controllerServices || globalThis).shouldSkipFolderPruneEntry(fileName)) continue;
    const file = await handle.getFile();
    const text = await textFromBackupFile(file, fileName, "backupCreation");
    entries.push(creationEntryFromBackupFileText(fileName, text, file));
  }

  return entries;
}

async function readBackupImagesForUniverse(universeRecord) {
  const items = [];
  const folder = universeRecord?.folders?.images;
  if (!folder) return items;

  for await (const [fileName, handle] of folder.entries()) {
    if (handle.kind !== "file" || (globalThis.controllerServices || globalThis).shouldSkipFolderPruneEntry(fileName)) continue;
    if (!/\.(jpe?g|png)$/i.test(fileName)) continue;
    const file = await handle.getFile();
    window.WormholesFileLimits?.assertFile?.(file, "backupImage", {label: "backup image"});
    let thumbnailDataUrl = "";
    try {
      thumbnailDataUrl = await (globalThis.controllerServices || globalThis).imageFileToThumbnailDataUrl(file);
    } catch (e) {}
    items.push(
      (globalThis.controllerServices || globalThis).normalizeImportedVisionItem(
        {
          id: makeId(),
          title: (globalThis.controllerServices || globalThis).fileTitleFromName(fileName),
          sourceName: fileName,
          fileType: "image",
          mimeType: file.type || (/\.png$/i.test(fileName) ? "image/png" : "image/jpeg"),
          dataUrl: "",
          thumbnailDataUrl,
          storage: "folder",
          folderFileName: fileName,
          fileSize: file.size || 0,
          createdAt: new Date().toISOString(),
        },
        universeRecord.id,
      ),
    );
  }

  return items;
}

async function readWormholesBackupManifest(folderHandle) {
  if (!folderHandle) return null;
  try {
    const fileHandle = await folderHandle.getFileHandle(DATA_PORTABILITY_BACKUP_MANIFEST_FILE, {
      create: false,
    });
    const file = await fileHandle.getFile();
    window.WormholesFileLimits?.assertFile?.(file, "backupManifest", {
      label: "Wormholes backup manifest",
    });
    return JSON.parse(await file.text());
  } catch (e) {
    if (e?.code === "WORMHOLES_FILE_TOO_LARGE") throw e;
    return null;
  }
}

async function restoreAppStateFromAppDataManifest(manifest) {
  const prepared = prepareWormholesAppDataImport(manifest);
  await writePreparedWormholesAppDataImport(prepared);
  return {
    rootHandle: null,
    prepared,
    universes: prepared.universes,
    currentUniverseId: prepared.currentUniverseId,
    bridgeNotes: prepared.bridgeNotes,
    summary:
      prepared.importData.exportSummary || summarizeWormholesAppDataExport(prepared.importData),
    source: "manifest",
  };
}

async function prepareAppStateFromLocalBackupFolder(selectedHandle) {
  const rootHandle = await selectedFolderAsWormholesRoot(selectedHandle);
  if (!rootHandle) {
    throw new Error(
      "That folder does not look like a Wormholes backup. Choose the folder that contains Creations, Literature, and Images, or the parent folder that contains Wormholes.",
    );
  }

  if (!(await (globalThis.controllerServices || globalThis).requestFolderPermission(rootHandle, "read"))) {
    throw backupWorkflowError(
      "WORMHOLES_FOLDER_PERMISSION",
      "Folder read permission was not granted.",
    );
  }

  const manifest =
    (await readWormholesBackupManifest(rootHandle)) ||
    (await readWormholesBackupManifest(selectedHandle));
  if (manifest) {
    const prepared = prepareWormholesAppDataImport(manifest);
    return {
      rootHandle,
      prepared,
      universes: prepared.universes,
      currentUniverseId: prepared.currentUniverseId,
      bridgeNotes: prepared.bridgeNotes,
      summary:
        prepared.importData.exportSummary || summarizeWormholesAppDataExport(prepared.importData),
      source: "manifest",
    };
  }

  const records = await collectBackupUniverseFolders(rootHandle);
  if (!records.length) {
    throw backupWorkflowError(
      "WORMHOLES_NOT_APP_DATA",
      "No universe folders were found in that backup.",
    );
  }

  const restoredUniverses = records.map((record) =>
    (globalThis.controllerServices || globalThis).normalizeSchemaUniverse({
      id: record.id || makeId(),
      title: record.title || "Restored Universe",
      summary: "",
      bridges: [],
      createdAt: record.createdAt || new Date().toISOString(),
      diskFolderName: record.diskFolderName || (globalThis.controllerServices || globalThis).stableUniverseFolderName(record),
    }),
  );

  const summary = {
    universes: restoredUniverses.length,
    creations: 0,
    literature: 0,
    literatureWithText: 0,
    images: 0,
  };
  const universeData = {};

  // Read and stage the entire backup before changing any live app data.
  for (let i = 0; i < restoredUniverses.length; i += 1) {
    const universe = restoredUniverses[i];
    const record = records[i];
    const archive = await readBackupCreationsForUniverse(record);
    const literature = await (globalThis.controllerServices || globalThis).readBackupLiteratureForUniverse({
      ...record,
      id: universe.id,
    });
    const vision = await readBackupImagesForUniverse({...record, id: universe.id});

    summary.creations += archive.filter((entry) => !(globalThis.controllerServices || globalThis).isGroupEntry(entry)).length;
    summary.literature += literature.filter(
      (doc) => !(globalThis.controllerServices || globalThis).isLiteratureGroup(doc),
    ).length;
    summary.literatureWithText += literature.filter(
      (doc) =>
        !(globalThis.controllerServices || globalThis).isLiteratureGroup(doc) &&
        (globalThis.controllerServices || globalThis).literaturePlainPreview(doc.content || ""),
    ).length;
    summary.images += vision.length;

    universeData[universe.id] = {
      archive,
      connectionNotes: {},
      literature,
      vision,
    };
  }

  const stagedImport = {
    format: "Wormholes App Data Export",
    schemaVersion: WORMHOLES_APP_SCHEMA_VERSION,
    appVersion: WORMHOLES_APP_VERSION,
    exportedAt: new Date().toISOString(),
    currentUniverseId: restoredUniverses[0]?.id || null,
    universes: restoredUniverses,
    bridgeNotes: {},
    universeData,
  };
  const prepared = prepareWormholesAppDataImport(stagedImport);
  return {
    rootHandle,
    prepared,
    universes: prepared.universes,
    currentUniverseId: prepared.currentUniverseId,
    bridgeNotes: prepared.bridgeNotes,
    summary,
    source: "folder-scan",
  };
}

async function rebuildAppStateFromLocalBackupFolder(selectedHandle) {
  const restored = await prepareAppStateFromLocalBackupFolder(selectedHandle);
  await writePreparedWormholesAppDataImport(restored.prepared);
  return restored;
}

function formatLocalFolderRestoreSummary(summary = {}) {
  if (summary.archiveEntries !== undefined || summary.literatureDocuments !== undefined) {
    return formatWormholesAppDataExportSummary(summary);
  }
  return `${summary.universes || 0} universe${summary.universes === 1 ? "" : "s"}, ${summary.creations || 0} creation${summary.creations === 1 ? "" : "s"}, ${summary.literature || 0} saved literature (${summary.literatureWithText || 0}/${summary.literature || 0} with text), ${summary.images || 0} image${summary.images === 1 ? "" : "s"}`;
}

async function removeIncompleteBackupCommitFiles(folderHandle) {
  if (!folderHandle?.removeEntry) return;
  const markerName =
    typeof WORMHOLES_MANAGED_MARKER !== "undefined"
      ? WORMHOLES_MANAGED_MARKER
      : ".wormholes-managed.json";
  for (const name of [DATA_PORTABILITY_BACKUP_MANIFEST_FILE, markerName]) {
    try {
      await folderHandle.removeEntry(name);
    } catch (error) {
      if (error?.name !== "NotFoundError")
        console.error("Could not clean incomplete backup", error);
    }
  }
}

async function createBackupFromSettings() {
  (globalThis.controllerServices || globalThis).setSettingsStatus("Choose a folder for the backup copy.");
  try {
    if (!localFoldersEnabled) {
      throw backupWorkflowError("WORMHOLES_FOLDER_PERMISSION", "Turn on local folder first.");
    }
    if (!wormholesParentFolderHandle) {
      wormholesParentFolderHandle = await (globalThis.controllerServices || globalThis).loadWormholesParentFolderHandle();
    }
    if (
      !wormholesParentFolderHandle ||
      !(await prepareWormholesFolderHandles({requestPermission: true}))
    ) {
      throw backupWorkflowError("WORMHOLES_FOLDER_PERMISSION", "Reconnect the local folder first.");
    }

    const sourceRoot = wormholesRootFolderHandle;
    const backupFolder = await pickNativeDirectory();
    const appDataManifest = await buildWormholesAppDataExport();
    validateWormholesAppDataImport(appDataManifest);

    const steps = [
      {
        name: "copy-backup-content",
        phase: "large-content",
        execute: () => copyDirectoryContents(sourceRoot, backupFolder),
      },
      {
        name: "write-backup-manifest",
        phase: "collection-metadata",
        execute: () =>
          (globalThis.controllerServices || globalThis).writeBlobToFolder(
            backupFolder,
            DATA_PORTABILITY_BACKUP_MANIFEST_FILE,
            new Blob([JSON.stringify(appDataManifest, null, 2)], {type: "application/json"}),
          ),
      },
      {
        name: "commit-backup-marker",
        phase: "core-metadata",
        execute: () =>
          writeManagedFolderMarker(backupFolder, {
            kind: "backup",
            version: WORMHOLES_APP_VERSION,
            manifest: DATA_PORTABILITY_BACKUP_MANIFEST_FILE,
          }),
      },
    ];

    const transaction = window.WormholesTransactionalPersistence;
    if (transaction?.run) {
      await transaction.run({
        operation: "create backup folder",
        validate: [() => validateWormholesAppDataImport(appDataManifest)],
        steps,
        rollback: () => removeIncompleteBackupCommitFiles(backupFolder),
        failureMessage: "The backup could not be completed.",
      });
    } else {
      try {
        for (const step of steps) await step.execute();
      } catch (error) {
        await removeIncompleteBackupCommitFiles(backupFolder);
        throw error;
      }
    }

    window.WormholesBackupStatus?.recordSuccess?.("folder");
    (globalThis.controllerServices || globalThis).setSettingsStatus(
      `Backup folder created: ${formatWormholesAppDataExportSummary(appDataManifest.exportSummary)}.`,
    );
    requestStorageFootnoteUpdate();
  } catch (error) {
    if (error?.name !== "AbortError") window.WormholesBackupStatus?.recordFailure?.("folder");
    if (error?.name === "AbortError") {
      (globalThis.controllerServices || globalThis).setSettingsStatus("");
      return;
    }
    (globalThis.controllerServices || globalThis).setSettingsStatus(
      "Backup failed. The selected folder may contain an incomplete copy.",
    );
  }
}

function getActiveWormholesTabName() {
  if (document.getElementById("archiveTab")?.classList.contains("active")) return "archive";
  if (document.getElementById("literatureTab")?.classList.contains("active")) return "literature";
  if (document.getElementById("visionTab")?.classList.contains("active")) return "vision";
  if (document.getElementById("createTab")?.classList.contains("active")) return "create";
  return "current";
}

function captureFolderRestoreReturnView() {
  return {
    homeActive: !!document.getElementById("homeScreen")?.classList.contains("active"),
    appActive: !!document.getElementById("appScreen")?.classList.contains("active"),
    tabName: getActiveWormholesTabName(),
    archiveConnectionsActive: !!document
      .getElementById("connectionsScreen")
      ?.classList.contains("active"),
    literatureEditorActive: !!document
      .getElementById("literatureEditorScreen")
      ?.classList.contains("active"),
    literatureDocId: activeLiteratureId || null,
    universeId: currentUniverseId || null,
  };
}

async function restoreVisibleScreenAfterFolderRestore(returnView) {
  if (typeof (globalThis.controllerServices || globalThis).renderUniverseArchiveList === "function")
    (globalThis.controllerServices || globalThis).renderUniverseArchiveList();

  if (returnView?.homeActive || !returnView?.appActive) {
    (globalThis.controllerServices || globalThis).showHomeScreen();
    return;
  }

  (globalThis.controllerServices || globalThis).showAppScreen();
  switchTab(returnView?.tabName || "current");

  if (returnView?.tabName === "archive" && returnView.archiveConnectionsActive) {
    (globalThis.controllerServices || globalThis).showConnectionsScreen();
  }

  if (
    returnView?.tabName === "literature" &&
    returnView.literatureEditorActive &&
    returnView.literatureDocId
  ) {
    const docStillExists = !!(globalThis.controllerServices || globalThis).getLiteratureDoc(returnView.literatureDocId);
    if (docStillExists) {
      await (globalThis.controllerServices || globalThis).showLiteratureEditorScreen(returnView.literatureDocId);
    }
  }
}

function captureLocalFolderStateForBackupRestore() {
  return {
    previousSourceHandle: previousWormholesSourceFolderHandle || null,
    parentHandle: wormholesParentFolderHandle || null,
    rootHandle: wormholesRootFolderHandle || null,
    literatureRootHandle: wormholesLiteratureRootHandle || null,
    imagesRootHandle: wormholesImagesRootHandle || null,
    creationsRootHandle: wormholesCreationsRootHandle || null,
    localFoldersEnabled: !!localFoldersEnabled,
    localFolderPendingSync: !!localFolderPendingSync,
    localFolderSwitchInProgress: !!localFolderSwitchInProgress,
    localFolderStorageMode: localFolderStorageMode || "native",
  };
}

async function restoreLocalFolderStateAfterFailedBackupRestore(state) {
  if (!state) return;
  previousWormholesSourceFolderHandle = state.previousSourceHandle;
  wormholesParentFolderHandle = state.parentHandle;
  wormholesRootFolderHandle = state.rootHandle;
  wormholesLiteratureRootHandle = state.literatureRootHandle;
  wormholesImagesRootHandle = state.imagesRootHandle;
  wormholesCreationsRootHandle = state.creationsRootHandle;
  localFoldersEnabled = state.localFoldersEnabled;
  localFolderPendingSync = state.localFolderPendingSync;
  localFolderSwitchInProgress = state.localFolderSwitchInProgress;
  localFolderStorageMode = state.localFolderStorageMode;

  try {
    (globalThis.controllerServices || globalThis).saveLocalFolderStorageMode(state.localFolderStorageMode);
  } catch (e) {}
  try {
    if (state.parentHandle)
      await (globalThis.controllerServices || globalThis).saveWormholesParentFolderHandle(state.parentHandle);
    else if (typeof (globalThis.controllerServices || globalThis).removeWormholesParentFolderHandle === "function")
      await (globalThis.controllerServices || globalThis).removeWormholesParentFolderHandle();
  } catch (e) {}
  try {
    (globalThis.controllerServices || globalThis).saveLocalFolderEnabled();
  } catch (e) {}
}

function simpleBackupFolderRestoreFailureMessage(error) {
  const message = String(error?.message || "");
  if (/does not look like a Wormholes backup/i.test(message))
    return "Restore failed. Choose a Wormholes backup folder.";
  if (/permission/i.test(message)) return "Restore failed. Reconnect the folder and try again.";
  if (/No universe folders/i.test(message))
    return "Restore failed. No Wormholes backup was found in that folder.";
  if (/newer Wormholes version/i.test(message))
    return "Restore failed. This backup needs a newer Wormholes version.";
  if (/could not start safely/i.test(message))
    return "Restore couldn’t start safely. Your existing data was not changed.";
  return "Restore failed. Your existing data was not changed.";
}

async function restoreBackupFromSettings() {
  const returnView = captureFolderRestoreReturnView();
  const previousFolderState = captureLocalFolderStateForBackupRestore();
  let restorePlan = null;
  let rollbackSnapshot = null;
  let restoreWriteStarted = false;
  let journalTransaction = null;

  (globalThis.controllerServices || globalThis).setSettingsStatus("Choose a Wormholes backup folder to restore from.");
  try {
    const selectedHandle = await pickNativeDirectory();

    // Read and validate the full backup first. No live data changes occur during this stage.
    restorePlan = await prepareAppStateFromLocalBackupFolder(selectedHandle);

    try {
      rollbackSnapshot = await buildWormholesAppDataExport();
      const capacityResult = await preflightAppDataStorageCapacity(
        restorePlan.prepared.importData,
        rollbackSnapshot,
        {
          operationLabel: "restoring this backup folder",
          continueLabel: "Restore Anyway",
        },
      );
      if (!capacityResult.approved) {
        (globalThis.controllerServices || globalThis).setSettingsStatus(
          capacityResult.status === "block"
            ? "Restore didn’t start. Free browser storage, then try again."
            : "Restore canceled. Nothing changed.",
        );
        showSavedToast("Restore did not start");
        return;
      }
    } catch (snapshotError) {
      console.error("Could not prepare backup-folder restore safety snapshot", snapshotError);
      throw backupWorkflowError("WORMHOLES_IMPORT_SAFETY", "Restore could not start safely.");
    }

    const confirmed = await confirmAppDataImportOverwrite(restorePlan.prepared.importData, {
      operation: "restore",
      sourceName: selectedHandle?.name || "",
      currentSummary:
        rollbackSnapshot?.exportSummary || summarizeWormholesAppDataExport(rollbackSnapshot),
      showPortableWarnings: false,
    });
    if (!confirmed) {
      (globalThis.controllerServices || globalThis).setSettingsStatus("Restore canceled. Nothing was changed.");
      (globalThis.controllerServices || globalThis).updateLocalFolderCheckboxes();
      return;
    }

    try {
      const recoveryPoint = await window.WormholesSnapshots?.createSnapshot?.({
        reason: "before-backup-restore",
        force: true,
        data: rollbackSnapshot,
        skipCapacityPreflight: true,
        verifyWrite: !!window.WormholesWriteAheadJournal,
        preserveExistingUntilCommitted: !!window.WormholesWriteAheadJournal,
      });
      if (window.WormholesWriteAheadJournal) {
        if (!recoveryPoint?.id)
          throw backupWorkflowError(
            "WORMHOLES_IMPORT_SAFETY",
            "The backup restore point could not be verified.",
          );
        journalTransaction = await window.WormholesWriteAheadJournal.begin({
          operation: "backup-folder-restore",
          label: "Backup folder restore",
          rollbackSnapshotId: recoveryPoint.id,
          additionalUniverses: restorePlan.prepared.universes,
          folderState: previousFolderState,
        });
        await window.WormholesWriteAheadJournal.markPhase(
          journalTransaction,
          "writing-browser-stores",
        );
      }
    } catch (persistentSnapshotError) {
      console.error("Could not prepare backup-folder restore journal", persistentSnapshotError);
      throw backupWorkflowError("WORMHOLES_IMPORT_SAFETY", "Restore could not start safely.");
    }

    restoreWriteStarted = true;
    await writePreparedWormholesAppDataImport(restorePlan.prepared, {journal: false});
    if (journalTransaction)
      await window.WormholesWriteAheadJournal.markPhase(
        journalTransaction,
        "switching-folder-source",
      );
    const restored = restorePlan;

    previousWormholesSourceFolderHandle = selectedHandle;
    (globalThis.controllerServices || globalThis).clearWormholesFolderHandles();
    wormholesParentFolderHandle = selectedHandle;
    localFoldersEnabled = true;
    localFolderPendingSync = false;
    localFolderSwitchInProgress = false;
    (globalThis.controllerServices || globalThis).saveLocalFolderStorageMode("native");

    const ready = await prepareWormholesFolderHandles({requestPermission: true});
    if (!ready)
      throw backupWorkflowError(
        "WORMHOLES_FOLDER_READ",
        "The backup folder could not be made active.",
      );

    await (globalThis.controllerServices || globalThis).saveWormholesParentFolderHandle(selectedHandle);
    (globalThis.controllerServices || globalThis).saveLocalFolderEnabled();

    universes = restored.universes;
    const preservedUniverseId =
      returnView?.universeId && universes.some((universe) => universe.id === returnView.universeId)
        ? returnView.universeId
        : null;
    currentUniverseId =
      preservedUniverseId || restored.currentUniverseId || universes[0]?.id || null;
    bridgeNotes =
      restored.bridgeNotes && typeof restored.bridgeNotes === "object" ? restored.bridgeNotes : {};

    loadArchiveFromStorage();
    loadConnectionNotesFromStorage();
    (globalThis.controllerServices || globalThis).loadLiteratureFromStorage();
    (globalThis.controllerServices || globalThis).loadVisionBoardFromStorage();

    if (currentUniverseId) {
      const currentUniverseLabel = document.getElementById("currentUniverseLabel");
      if (currentUniverseLabel)
        currentUniverseLabel.textContent = (globalThis.controllerServices || globalThis).getCurrentUniverse()?.title || "";
      restoreFolderHandlesForCurrentUniverse();
      renderCurrent();
      (globalThis.controllerServices || globalThis).renderArchive();
      (globalThis.controllerServices || globalThis).renderLiteratureList();
      await (globalThis.controllerServices || globalThis).renderVisionBoard();
      await restoreVisibleScreenAfterFolderRestore(returnView);
    } else {
      (globalThis.controllerServices || globalThis).showHomeScreen();
    }

    requestStorageFootnoteUpdate();
    if (journalTransaction) {
      await window.WormholesWriteAheadJournal.markPhase(journalTransaction, "complete");
      await window.WormholesWriteAheadJournal.commit(journalTransaction);
      journalTransaction = null;
    }
    if (window.WormholesUndo && rollbackSnapshot) {
      await window.WormholesUndo.offer({
        message: "Backup folder restored",
        restoredMessage: "Previous backup state restored",
        undo: async () => {
          const rollbackPrepared = prepareWormholesAppDataImport(rollbackSnapshot, {
            allowOverLimit: true,
            allowDuplicateIds: true,
            allowBrokenReferences: true,
            allowUnsafeUrls: true,
          });
          await writePreparedWormholesAppDataImport(rollbackPrepared, {
            additionalUniverses: restorePlan?.prepared?.universes || [],
          });
          applyPreparedWormholesAppDataToRuntime(rollbackPrepared);
          await restoreLocalFolderStateAfterFailedBackupRestore(previousFolderState);
          const currentUniverseLabel = document.getElementById("currentUniverseLabel");
          if (currentUniverseLabel)
            currentUniverseLabel.textContent = (globalThis.controllerServices || globalThis).getCurrentUniverse()?.title || "";
          await renderAfterWormholesAppDataImport();
          await restoreVisibleScreenAfterFolderRestore(returnView);
          requestStorageFootnoteUpdate();
          return true;
        },
      });
    } else {
      showSavedToast("Backup folder restored");
    }
    (globalThis.controllerServices || globalThis).setSettingsStatus(
      `Backup folder restored: ${formatLocalFolderRestoreSummary(restored.summary)}.`,
    );
  } catch (e) {
    if (e?.name === "AbortError") {
      (globalThis.controllerServices || globalThis).setSettingsStatus("");
      (globalThis.controllerServices || globalThis).updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_DUPLICATE_ID") {
      window.WormholesIdIntegrity?.showDialog?.(e.idIntegrityResult);
      (globalThis.controllerServices || globalThis).setSettingsStatus(
        "Restore did not start because the backup contains duplicate internal IDs. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      (globalThis.controllerServices || globalThis).updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_BROKEN_REFERENCE") {
      window.WormholesReferenceIntegrity?.showDialog?.(e.referenceIntegrityResult);
      (globalThis.controllerServices || globalThis).setSettingsStatus(
        "Restore did not start because some linked items are missing or inconsistent. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      (globalThis.controllerServices || globalThis).updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_ENTITY_LIMIT_EXCEEDED") {
      window.WormholesEntityLimits?.showDialog?.(e.entityLimitResult);
      (globalThis.controllerServices || globalThis).setSettingsStatus(
        "Restore did not start because the backup exceeds a supported Wormholes entity limit. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      (globalThis.controllerServices || globalThis).updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_STRING_TOO_LONG" || e?.code === "WORMHOLES_NESTING_TOO_DEEP") {
      window.WormholesContentLimits?.showDialog?.(e.contentLimitResult);
      (globalThis.controllerServices || globalThis).setSettingsStatus(
        "Restore did not start because the backup exceeds a supported text or nesting-depth limit. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      (globalThis.controllerServices || globalThis).updateLocalFolderCheckboxes();
      return;
    }

    if (
      e?.code === "WORMHOLES_EMBEDDED_MEDIA_TOO_LARGE" ||
      e?.code === "WORMHOLES_EMBEDDED_MEDIA_INVALID"
    ) {
      window.WormholesMediaLimits?.showDialog?.(e.mediaLimitResult);
      (globalThis.controllerServices || globalThis).setSettingsStatus(
        "Restore did not start because the backup contains unsupported or oversized embedded media. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      (globalThis.controllerServices || globalThis).updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_UNSAFE_URL") {
      window.WormholesUrlSafety?.showDialog?.(e.urlSafetyResult, {importing: true});
      (globalThis.controllerServices || globalThis).setSettingsStatus(
        "Restore did not start because the backup contains an unsafe link. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      (globalThis.controllerServices || globalThis).updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_FILE_TOO_LARGE") {
      window.WormholesFileLimits?.showDialog?.(e.fileLimitResult, {
        label: e.fileLimitResult?.label || "backup file",
      });
      (globalThis.controllerServices || globalThis).setSettingsStatus(
        "Restore did not start because a backup file exceeds Wormholes’ size limit. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      (globalThis.controllerServices || globalThis).updateLocalFolderCheckboxes();
      return;
    }

    let rollbackSucceeded = false;
    let rollbackFailed = false;
    if (restoreWriteStarted && rollbackSnapshot) {
      try {
        const rollbackPrepared = prepareWormholesAppDataImport(rollbackSnapshot, {
          allowOverLimit: true,
          allowDuplicateIds: true,
          allowBrokenReferences: true,
          allowUnsafeUrls: true,
        });
        await writePreparedWormholesAppDataImport(rollbackPrepared, {
          additionalUniverses: restorePlan?.prepared?.universes || [],
          journal: false,
        });
        applyPreparedWormholesAppDataToRuntime(rollbackPrepared);
        await restoreLocalFolderStateAfterFailedBackupRestore(previousFolderState);

        const currentUniverseLabel = document.getElementById("currentUniverseLabel");
        if (currentUniverseLabel)
          currentUniverseLabel.textContent = (globalThis.controllerServices || globalThis).getCurrentUniverse()?.title || "";
        await renderAfterWormholesAppDataImport();
        await restoreVisibleScreenAfterFolderRestore(returnView);
        if (journalTransaction) {
          await window.WormholesWriteAheadJournal.discardAfterRollback(journalTransaction);
          journalTransaction = null;
        }
        rollbackSucceeded = true;
      } catch (rollbackError) {
        rollbackFailed = true;
        console.error("Backup-folder restore rollback failed", rollbackError);
      }
    } else {
      await restoreLocalFolderStateAfterFailedBackupRestore(previousFolderState);
      if (journalTransaction) {
        try {
          await window.WormholesWriteAheadJournal.discardAfterRollback(journalTransaction);
          journalTransaction = null;
        } catch (journalError) {
          console.error("Could not close the unused backup-restore journal", journalError);
        }
      }
    }

    reportAppError("Backup folder restore failed", e, {
      code: rollbackFailed ? "WORMHOLES_RECOVERY_INCOMPLETE" : "WORMHOLES_RESTORE_FAILED",
      userMessage: rollbackFailed
        ? "Restore failed, and recovery was incomplete. Keep this tab open."
        : rollbackSucceeded
          ? "Restore failed. Your previous data was restored."
          : simpleBackupFolderRestoreFailureMessage(e),
    });

    if (rollbackFailed) {
      (globalThis.controllerServices || globalThis).setSettingsStatus(
        "Restore failed, and recovery was incomplete. Keep this tab open and use your latest backup.",
      );
      showSavedToast("Restore failed — use your latest backup");
    } else if (rollbackSucceeded) {
      (globalThis.controllerServices || globalThis).setSettingsStatus("Restore failed. Your previous data was restored.");
      showSavedToast("Restore failed — previous data restored");
    } else {
      const message = simpleBackupFolderRestoreFailureMessage(e);
      (globalThis.controllerServices || globalThis).setSettingsStatus(message);
      showSavedToast("Restore failed");
    }
    (globalThis.controllerServices || globalThis).updateLocalFolderCheckboxes();
  }
}

const DATA_PORTABILITY_BACKUP_HELPERS_API = Object.freeze({
  pickNativeDirectory,
  delay,
  handlesAreSameEntry,
  copyDirectoryContents,
  readManagedFolderMarkerJson,
  titleFromUniverseFolderName,
  selectedFolderAsWormholesRoot,
  backupUniverseKeyFromFolder,
  ensureBackupUniverseRecord,
  collectBackupUniverseFolders,
  textFromBackupFile,
  backupTextLineValue,
  backupTextSection,
  creationEntryFromBackupFileText,
  readBackupCreationsForUniverse,
  readBackupImagesForUniverse,
  readWormholesBackupManifest,
  restoreAppStateFromAppDataManifest,
  prepareAppStateFromLocalBackupFolder,
  rebuildAppStateFromLocalBackupFolder,
  formatLocalFolderRestoreSummary,
  createBackupFromSettings,
  getActiveWormholesTabName,
  captureFolderRestoreReturnView,
  restoreVisibleScreenAfterFolderRestore,
  captureLocalFolderStateForBackupRestore,
  restoreLocalFolderStateAfterFailedBackupRestore,
  simpleBackupFolderRestoreFailureMessage,
  restoreBackupFromSettings,
});

function installLegacyDataPortabilityBackupHelpersBindings(target = globalThis) {
  Object.assign(target, DATA_PORTABILITY_BACKUP_HELPERS_API);
  target.WormholesDataPortabilityBackupHelpers = DATA_PORTABILITY_BACKUP_HELPERS_API;
  return DATA_PORTABILITY_BACKUP_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyDataPortabilityBackupHelpersBindings(window);

/* EMBEDDED from scripts/modules/data-portability-transaction-helpers.mjs for direct-file compatibility. */
/* Wormholes Beta 301 data-portability transaction helpers.
   Validates every prepared dataset before an import or restore starts writing. */

function validatePreparedAppDataForWrite(prepared, options = {}) {
  const makeError =
    typeof options.makeError === "function"
      ? options.makeError
      : (code, message) => Object.assign(new Error(message), {code});
  if (!prepared || typeof prepared !== "object") {
    throw makeError("WORMHOLES_MALFORMED_IMPORT", "This backup is incomplete.");
  }

  const validateDataset = (schemaName, value, scope) => {
    const schema = options.schema;
    if (!schema?.validate) return true;
    const result = schema.validate(schemaName, value, {mode: "write", scope});
    if (result?.ok) return true;
    throw schema.errorFor
      ? schema.errorFor(result)
      : makeError("WORMHOLES_SCHEMA_INVALID", "Some backup data is incomplete or invalid.");
  };

  const universes = Array.isArray(prepared.universes) ? prepared.universes : [];
  validateDataset("universes", universes, null);
  validateDataset("bridgeNotes", prepared.bridgeNotes || {}, null);
  universes.forEach((universe) => {
    const data = prepared.importData?.universeData?.[universe.id] || {};
    validateDataset("archive", Array.isArray(data.archive) ? data.archive : [], universe.id);
    validateDataset(
      "connectionNotes",
      data.connectionNotes && typeof data.connectionNotes === "object" ? data.connectionNotes : {},
      universe.id,
    );
    validateDataset(
      "literature",
      Array.isArray(data.literature) ? data.literature : [],
      universe.id,
    );
    validateDataset("vision", Array.isArray(data.vision) ? data.vision : [], universe.id);
  });
  return true;
}

function assertAppDataWriteResult(result, message, makeError) {
  if (result === false || result?.ok === false) {
    throw (
      result?.error ||
      (typeof makeError === "function"
        ? makeError("WORMHOLES_IMPORT_FAILED", message)
        : Object.assign(new Error(message), {code: "WORMHOLES_IMPORT_FAILED"}))
    );
  }
  return result;
}

/* EMBEDDED from scripts/modules/theme-deck-portability.mjs for direct-file compatibility. */
/* Wormholes Beta 301 Theme Deck backup and restore helpers. */

function themeStateForAppDataExport(target = globalThis) {
  return (
    target.WormholesThemeDecks?.exportState?.() || {
      version: 1,
      customDecks: [],
      selectedThemeIds: [],
    }
  );
}

function prepareThemeStateForAppDataImport(importData, target = globalThis) {
  if (!Object.prototype.hasOwnProperty.call(importData || {}, "themes")) return null;
  return target.WormholesThemeDecks?.prepareImportedState?.(importData.themes) || null;
}

function appendThemeStateWriteSteps(
  steps,
  prepared,
  assertWriteResult,
  target = globalThis,
) {
  const api = target.WormholesThemeDecks;
  if (!prepared?.themeState || !api) return;
  const previous = api.exportState?.();
  steps.push(
    {
      name: "custom-theme-decks",
      phase: "collection-metadata",
      execute: () =>
        assertWriteResult(
          api.writePreparedCustomDecks?.(prepared.themeState),
          "Custom themes could not be saved.",
        ),
      rollback: () => (previous ? api.writePreparedCustomDecks?.(previous) : true),
    },
    {
      name: "selected-themes",
      phase: "collection-metadata",
      execute: () =>
        assertWriteResult(
          api.writePreparedSelection?.(prepared.themeState),
          "Theme choices could not be saved.",
        ),
      rollback: () => (previous ? api.writePreparedSelection?.(previous) : true),
    },
  );
}

function applyPreparedThemeStateToRuntime(prepared, target = globalThis) {
  if (!prepared?.themeState) return false;
  return (
    target.WormholesThemeDecks?.applyPreparedState?.(prepared.themeState, {reason: "restore"}) ||
    false
  );
}

/* EMBEDDED from scripts/modules/data-portability-storage-helpers.mjs for direct-file compatibility. */
/* Wormholes Beta 301 app-data storage-key helpers. */

function appDataKeysForUniverse(universeId) {
  return [
    archiveStorageKey(universeId),
    oldArchiveStorageKey(universeId),
    connectionNotesStorageKey(universeId),
    oldConnectionNotesStorageKey(universeId),
    literatureStorageKey(universeId),
    oldLiteratureStorageKey(universeId),
    visionStorageKey(universeId),
    oldVisionStorageKey(universeId),
  ];
}

function removeStoredAppKey(key, target = globalThis) {
  const repository = target.WormholesRepositories?.local;
  if (repository) return repository.remove(key);
  if (typeof target.removeLocalStorageKey === "function") return target.removeLocalStorageKey(key);
  try {
    target.localStorage?.removeItem?.(key);
    return true;
  } catch (error) {
    return false;
  }
}
/* Wormholes Beta 301 — Export/import, backup, restore, and transaction coordination. */







const WORMHOLES_BACKUP_MANIFEST_FILE = "wormholes-app-data-backup.json";

function dataPortabilityError(code, message, options = {}) {
  const appErrors =
    typeof importedAppErrorsApi !== "undefined" ? importedAppErrorsApi : window.WormholesAppErrors;
  if (appErrors?.createError) return appErrors.createError(code, message, options);
  return Object.assign(new Error(message), {code, ...options});
}

function wormholesSourceSchemaVersion(data) {
  const value = data && typeof data === "object" ? data.schemaVersion : data;
  const versions = typeof window !== "undefined" ? window.WormholesSchemaVersions : null;
  if (versions?.sourceVersion) return versions.sourceVersion(value);
  const numeric = Number(value ?? 1);
  return Number.isInteger(numeric) && numeric >= 1 ? numeric : 1;
}

function assertSupportedWormholesSchemaVersion(data) {
  const sourceVersion = wormholesSourceSchemaVersion(data);
  const versions = typeof window !== "undefined" ? window.WormholesSchemaVersions : null;
  if (versions?.assertSupported) return versions.assertSupported(sourceVersion);
  if (sourceVersion > WORMHOLES_APP_SCHEMA_VERSION) {
    throw dataPortabilityError(
      "WORMHOLES_NEWER_VERSION",
      "This backup was made by a newer Wormholes version.",
    );
  }
  return sourceVersion;
}

function migrateWormholesAppDataImport(data) {
  const migrated = data && typeof data === "object" ? {...data} : data;
  if (!migrated || typeof migrated !== "object") return migrated;
  assertSupportedWormholesSchemaVersion(migrated);
  migrated.schemaVersion = WORMHOLES_APP_SCHEMA_VERSION;
  const preparedUniverses = Array.isArray(migrated.universes)
    ? migrated.universes.map((universe) => ({...universe, id: universe?.id || makeId()}))
    : [];
  const validUniverseIds = new Set(
    preparedUniverses.map((universe) => universe.id).filter(Boolean),
  );
  migrated.universes = preparedUniverses.map((universe) =>
    (globalThis.controllerServices || globalThis).normalizeSchemaUniverse(universe, {validUniverseIds}),
  );
  migrated.bridgeNotes =
    migrated.bridgeNotes && typeof migrated.bridgeNotes === "object" ? migrated.bridgeNotes : {};
  migrated.universeData =
    migrated.universeData && typeof migrated.universeData === "object" ? migrated.universeData : {};
  if (Object.prototype.hasOwnProperty.call(migrated, "themes")) {
    migrated.themes = cloneForAppDataExport(migrated.themes);
  }
  migrated.universes.forEach((universe) => {
    const dataForUniverse = migrated.universeData[universe.id] || {};
    migrated.universeData[universe.id] = {
      archive: Array.isArray(dataForUniverse.archive)
        ? dataForUniverse.archive.map((entry) =>
            (globalThis.controllerServices || globalThis).normalizeSchemaArchiveEntry(entry, {validUniverseIds}),
          )
        : [],
      connectionNotes:
        dataForUniverse.connectionNotes && typeof dataForUniverse.connectionNotes === "object"
          ? dataForUniverse.connectionNotes
          : {},
      literature: Array.isArray(dataForUniverse.literature)
        ? dataForUniverse.literature.map((doc) =>
            (globalThis.controllerServices || globalThis).normalizeImportedLiteratureDoc(doc, universe.id),
          )
        : [],
      vision: Array.isArray(dataForUniverse.vision)
        ? dataForUniverse.vision.map((item) =>
            (globalThis.controllerServices || globalThis).normalizeImportedVisionItem(item, universe.id),
          )
        : [],
    };
  });
  return migrated;
}

function cloneForAppDataExport(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch (e) {
    return value ?? null;
  }
}

function normalizeImportedTags(tags) {
  return {
    universes: Array.isArray(tags?.universes) ? tags.universes : [],
    entries: Array.isArray(tags?.entries) ? tags.entries : [],
  };
}

async function flushPendingLargeDataForAppDataExport() {
  if (!largeDataStoreAvailable()) return;

  const jobs = [];
  for (const universe of universes || []) {
    const universeId = universe?.id;
    if (!universeId) continue;

    const docs =
      universeId === currentUniverseId
        ? literatureEntries
        : (globalThis.controllerServices || globalThis).readLiteratureForUniverse(universeId);
    const images =
      universeId === currentUniverseId
        ? visionEntries
        : (globalThis.controllerServices || globalThis).readVisionBoardForUniverse(universeId);

    docs.forEach((doc) => {
      if (
        doc &&
        !(globalThis.controllerServices || globalThis).isLiteratureGroup(doc) &&
        doc.content &&
        doc.contentStored !== "indexedDB"
      ) {
        jobs.push((globalThis.controllerServices || globalThis).persistLiteratureLargeData(universeId, doc));
      }
    });

    images.forEach((item) => {
      if (
        item &&
        ((item.dataUrl && item.dataStored !== "indexedDB") ||
          (item.thumbnailDataUrl && item.thumbnailStored !== "indexedDB"))
      ) {
        jobs.push((globalThis.controllerServices || globalThis).persistVisionLargeData(universeId, item));
      }
    });
  }

  if (jobs.length) {
    await Promise.allSettled(jobs);
  }
}

async function folderFileForAppDataExport(kind, universeId, fileName) {
  if (!localFoldersEnabled || !fileName) return null;
  const universe = universes.find((item) => item.id === universeId);
  if (!universe) return null;

  let folder = null;
  try {
    if (kind === "literature" && universeId === currentUniverseId && literatureFolderHandle) {
      folder = literatureFolderHandle;
    }
    if (kind === "images" && universeId === currentUniverseId && visionFolderHandle) {
      folder = visionFolderHandle;
    }

    if (!folder && wormholesParentFolderHandle) {
      await prepareWormholesFolderHandles({requestPermission: true});
    }

    if (!folder && kind === "literature" && wormholesLiteratureRootHandle) {
      const folders = await ensureUniverseFolders(universe);
      folder = folders?.literature || null;
    }
    if (!folder && kind === "images" && wormholesImagesRootHandle) {
      const folders = await ensureUniverseFolders(universe);
      folder = folders?.images || null;
    }

    if (folder && (await (globalThis.controllerServices || globalThis).requestFolderPermission(folder))) {
      const fileHandle = await folder.getFileHandle(fileName);
      return await fileHandle.getFile();
    }
  } catch (e) {}

  try {
    return await (globalThis.controllerServices || globalThis).sourceFileFromPreviousFolder(kind, universe, fileName);
  } catch (e) {
    return null;
  }
}

function summarizeWormholesAppDataExport(exportData) {
  const dataByUniverse = exportData?.universeData || {};
  const summary = {
    universes: (exportData?.universes || []).length,
    archiveEntries: 0,
    groups: 0,
    literatureDocuments: 0,
    literatureGroups: 0,
    literatureDocumentsWithBody: 0,
    visionItems: 0,
    visionItemsWithImageData: 0,
    connections: 0,
    bridges: 0,
  };
  const connectionSeen = new Set();

  (exportData?.universes || []).forEach((universe) => {
    const universeData = dataByUniverse[universe.id] || {};
    const archive = Array.isArray(universeData.archive) ? universeData.archive : [];
    const literature = Array.isArray(universeData.literature) ? universeData.literature : [];
    const vision = Array.isArray(universeData.vision) ? universeData.vision : [];

    summary.bridges += (globalThis.controllerServices || globalThis).normalizeBridgeListForImport(
      universe.bridges,
      universe.id,
    ).length;
    archive.forEach((entry) => {
      if ((globalThis.controllerServices || globalThis).isGroupEntry(entry)) {
        summary.groups += 1;
      } else {
        summary.archiveEntries += 1;
      }
      summary.bridges += (globalThis.controllerServices || globalThis).normalizeBridgeListForImport(entry.bridges).length;
      (entry.connections || []).forEach((targetId) => {
        if (!targetId || targetId === entry.id) return;
        connectionSeen.add(
          `${universe.id}:${(globalThis.controllerServices || globalThis).makeConnectionKeyFromIds(entry.id, targetId)}`,
        );
      });
    });

    literature.forEach((doc) => {
      if ((globalThis.controllerServices || globalThis).isLiteratureGroup(doc)) {
        summary.literatureGroups += 1;
      } else {
        summary.literatureDocuments += 1;
        if ((globalThis.controllerServices || globalThis).literaturePlainPreview(doc.content || ""))
          summary.literatureDocumentsWithBody += 1;
      }
    });
    summary.visionItems += vision.length;
    summary.visionItemsWithImageData += vision.filter((item) => !!item.dataUrl).length;
  });

  summary.connections = connectionSeen.size;
  return summary;
}

function formatWormholesAppDataExportSummary(summary) {
  if (!summary) return "";

  const parts = [
    `${summary.universes || 0} universe${summary.universes === 1 ? "" : "s"}`,
    `${summary.archiveEntries || 0} creation${summary.archiveEntries === 1 ? "" : "s"}`,
    `${summary.groups || 0} creation group${summary.groups === 1 ? "" : "s"}`,
    `${summary.literatureDocuments || 0} saved literature${summary.literatureDocuments === 1 ? "" : " documents"}`,
  ];

  if (summary.literatureGroups) {
    parts.push(
      `${summary.literatureGroups} literature group${summary.literatureGroups === 1 ? "" : "s"}`,
    );
  }

  parts.push(
    `${summary.literatureDocumentsWithBody || 0}/${summary.literatureDocuments || 0} with text`,
  );
  parts.push(`${summary.visionItems || 0} saved image${summary.visionItems === 1 ? "" : "s"}`);
  parts.push(
    `${summary.visionItemsWithImageData || 0}/${summary.visionItems || 0} with image data`,
  );
  parts.push(`${summary.connections || 0} connection${summary.connections === 1 ? "" : "s"}`);
  parts.push(`${summary.bridges || 0} bridge${summary.bridges === 1 ? "" : "s"}`);

  return parts.join(", ");
}

function normalizeAppDataReviewSummary(summary = {}) {
  return {
    universes: Number(summary.universes || 0),
    archiveItems: Number(summary.archiveEntries || 0) + Number(summary.groups || 0),
    literatureItems:
      Number(summary.literatureDocuments || 0) + Number(summary.literatureGroups || 0),
    visionItems: Number(summary.visionItems || 0),
    connections: Number(summary.connections || 0),
    bridges: Number(summary.bridges || 0),
  };
}

function appDataReviewRows(currentSummary = {}, backupSummary = {}) {
  const current = normalizeAppDataReviewSummary(currentSummary);
  const backup = normalizeAppDataReviewSummary(backupSummary);
  return [
    {label: "Universes", current: current.universes, backup: backup.universes},
    {label: "Archive items", current: current.archiveItems, backup: backup.archiveItems},
    {label: "Literature", current: current.literatureItems, backup: backup.literatureItems},
    {label: "Images", current: current.visionItems, backup: backup.visionItems},
    {label: "Connections", current: current.connections, backup: backup.connections},
    {label: "Bridges", current: current.bridges, backup: backup.bridges},
  ];
}

function renderAppDataImportReview(currentSummary, backupSummary) {
  const comparison = document.getElementById("appDataImportComparison");
  if (!comparison) return;
  comparison.textContent = "";

  const header = document.createElement("div");
  header.className = "app-data-import-comparison-row app-data-import-comparison-header";
  ["", "Current", "Backup"].forEach((text) => {
    const cell = document.createElement("span");
    cell.textContent = text;
    header.appendChild(cell);
  });
  comparison.appendChild(header);

  appDataReviewRows(currentSummary, backupSummary).forEach((row) => {
    const rowElement = document.createElement("div");
    rowElement.className = "app-data-import-comparison-row";
    const label = document.createElement("span");
    label.textContent = row.label;
    const current = document.createElement("span");
    current.textContent = row.current.toLocaleString();
    const backup = document.createElement("span");
    backup.textContent = row.backup.toLocaleString();
    rowElement.append(label, current, backup);
    comparison.appendChild(rowElement);
  });
}

function appDataImportReviewWarning(summary = {}, options = {}) {
  if (options.showPortableWarnings === false) return "";
  const missingLiterature = Math.max(
    0,
    Number(summary.literatureDocuments || 0) - Number(summary.literatureDocumentsWithBody || 0),
  );
  const missingImages = Math.max(
    0,
    Number(summary.visionItems || 0) - Number(summary.visionItemsWithImageData || 0),
  );
  if (!missingLiterature && !missingImages) return "";
  if (missingLiterature && missingImages)
    return "Some Literature text and image data are not embedded in this backup.";
  if (missingLiterature) return "Some Literature text is not embedded in this backup.";
  return "Some image data is not embedded in this backup.";
}

async function buildWormholesAppDataExport() {
  if (currentUniverseId) {
    saveArchiveToStorage();
    saveConnectionNotesToStorage();
    (globalThis.controllerServices || globalThis).saveLiteratureToStorage();
    (globalThis.controllerServices || globalThis).saveVisionBoardToStorage();
  }
  saveUniversesToStorage();
  saveBridgeNotesToStorage();
  await flushPendingLargeDataForAppDataExport();

  const universeData = {};
  for (const universe of universes) {
    const universeId = universe.id;
    const archive =
      universeId === currentUniverseId ? archiveEntries : readArchiveForUniverse(universeId);
    const notes =
      universeId === currentUniverseId
        ? connectionNotes
        : readConnectionNotesForUniverse(universeId);
    const literature =
      universeId === currentUniverseId
        ? literatureEntries
        : (globalThis.controllerServices || globalThis).readLiteratureForUniverse(universeId);
    const vision =
      universeId === currentUniverseId
        ? visionEntries
        : (globalThis.controllerServices || globalThis).readVisionBoardForUniverse(universeId);
    universeData[universeId] = {
      archive: cloneForAppDataExport(archive) || [],
      connectionNotes: cloneForAppDataExport(notes) || {},
      literature: await (globalThis.controllerServices || globalThis).materializeLiteratureForExport(literature, universeId),
      vision: await (globalThis.controllerServices || globalThis).materializeVisionForExport(vision, universeId),
    };
  }

  const exportData = {
    format: "Wormholes App Data Export",
    schemaVersion: WORMHOLES_APP_SCHEMA_VERSION,
    appVersion: WORMHOLES_APP_VERSION,
    exportedAt: new Date().toISOString(),
    currentUniverseId: currentUniverseId || "",
    universes: cloneForAppDataExport(universes) || [],
    bridgeNotes: cloneForAppDataExport(bridgeNotes) || {},
    themes: cloneForAppDataExport(themeStateForAppDataExport(window)),
    universeData,
  };
  exportData.exportSummary = summarizeWormholesAppDataExport(exportData);
  return exportData;
}

function wormholesExportFileName() {
  const stamp = new Date()
    .toISOString()
    .replace(/[:]/g, "-")
    .replace(/\.\d{3}Z$/, "Z");
  return `Wormholes_App_Data_${stamp}.json`;
}

const WORMHOLES_SAFE_DOWNLOAD_ATTR = "data-wormholes-safe-download";

function isWormholesSafeDownloadElement(element) {
  return !!element?.closest?.(`[${WORMHOLES_SAFE_DOWNLOAD_ATTR}=\"true\"]`);
}

function downloadJsonFile(data, fileName) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  link.setAttribute(WORMHOLES_SAFE_DOWNLOAD_ATTR, "true");
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function openAppDataExportSummaryModal(exportData, fileName) {
  const modal = document.getElementById("appDataExportSummaryModal");
  if (!modal) return;

  const summary = exportData?.exportSummary || summarizeWormholesAppDataExport(exportData);
  const summaryText = document.getElementById("appDataExportSummaryText");
  if (summaryText) {
    const warnings = [];
    if ((summary.literatureDocuments || 0) > (summary.literatureDocumentsWithBody || 0)) {
      warnings.push("Some saved literature has no embedded text in this JSON.");
    }
    if ((summary.visionItems || 0) > (summary.visionItemsWithImageData || 0)) {
      warnings.push("Some saved images have no embedded image data in this JSON.");
    }
    summaryText.textContent = `Backup created: ${formatWormholesAppDataExportSummary(summary)}.${warnings.length ? " " + warnings.join(" ") : ""}`;
  }

  const fileText = document.getElementById("appDataExportFileName");
  if (fileText) {
    fileText.textContent = fileName ? `Downloaded JSON: ${fileName}` : "Downloaded JSON created.";
  }

  (globalThis.controllerServices || globalThis).toggleSettingsMenu(false);
  modal.classList.add("open");
  setTimeout(() => document.getElementById("closeAppDataExportSummaryBtn")?.focus(), 0);
}

function closeAppDataExportSummaryModal() {
  document.getElementById("appDataExportSummaryModal")?.classList.remove("open");
}

async function exportAppDataFromSettings() {
  (globalThis.controllerServices || globalThis).setSettingsStatus("Preparing app data export…");
  try {
    const data = await buildWormholesAppDataExport();
    const fileName = wormholesExportFileName();
    downloadJsonFile(data, fileName);
    window.WormholesBackupStatus?.recordSuccess?.("json");
    (globalThis.controllerServices || globalThis).setSettingsStatus(
      `App data exported. Backup includes ${formatWormholesAppDataExportSummary(data.exportSummary)}.`,
    );
    openAppDataExportSummaryModal(data, fileName);
    requestStorageFootnoteUpdate();
  } catch (e) {
    window.WormholesBackupStatus?.recordFailure?.("json");
    reportAppError("Could not export app data", e, {
      code: "WORMHOLES_EXPORT_FAILED",
    });
    (globalThis.controllerServices || globalThis).setSettingsStatus(e?.message || "App data export failed.");
  }
}

let pendingAppDataImportConfirmation = null;

function closeAppDataImportConfirmModal(result) {
  const modal = document.getElementById("appDataImportConfirmModal");
  if (modal) modal.classList.remove("open");
  const pending = pendingAppDataImportConfirmation;
  pendingAppDataImportConfirmation = null;
  if (pending) pending.resolve(!!result);
}

function confirmAppDataImportOverwrite(importData, options = {}) {
  const modal = document.getElementById("appDataImportConfirmModal");
  const operation = options.operation === "restore" ? "restore" : "import";
  if (!modal) {
    (globalThis.controllerServices || globalThis).setSettingsStatus(
      `${operation === "restore" ? "Restore" : "Import"} could not start. Nothing was changed.`,
    );
    showSavedToast(`${operation === "restore" ? "Restore" : "Import"} could not start`);
    return Promise.resolve(false);
  }

  const backupSummary = importData?.exportSummary || summarizeWormholesAppDataExport(importData);
  const currentSummary = options.currentSummary || {};
  renderAppDataImportReview(currentSummary, backupSummary);

  const title = document.getElementById("appDataImportConfirmTitle");
  if (title)
    title.textContent =
      operation === "restore" ? "Restore this backup?" : "Replace all current data?";

  const intro = document.getElementById("appDataImportConfirmIntro");
  if (intro) {
    intro.textContent =
      operation === "restore"
        ? "This backup folder replaces all app data stored in this browser."
        : "This backup replaces all app data stored in this browser.";
  }

  const sourceName = document.getElementById("appDataImportSourceName");
  if (sourceName) {
    const text = String(options.sourceName || "").trim();
    sourceName.textContent = text ? `Selected: ${text}` : "";
    sourceName.hidden = !text;
  }

  const detail = document.getElementById("appDataImportConfirmDetail");
  if (detail) {
    detail.textContent = "A restore point will be saved first. The data will not be merged.";
  }

  const warning = document.getElementById("appDataImportConfirmWarning");
  if (warning) {
    const warningParts = [];
    const portableWarning = appDataImportReviewWarning(backupSummary, options);
    if (portableWarning) warningParts.push(portableWarning);
    const duplicateReview =
      options.duplicateReview || window.WormholesDuplicateCreations?.scanAppData?.(importData);
    if (duplicateReview?.count) {
      warningParts.push(
        `This backup contains ${duplicateReview.count} possible duplicate creation${duplicateReview.count === 1 ? "" : "s"}.`,
      );
    }
    const warningText = warningParts.join(" ");
    warning.textContent = warningText;
    warning.hidden = !warningText;
  }

  const cancelButton = document.getElementById("cancelAppDataImportBtn");
  if (cancelButton) cancelButton.textContent = "Keep Current Data";

  const confirmButton = document.getElementById("confirmAppDataImportBtn");
  if (confirmButton) {
    confirmButton.textContent =
      operation === "restore" ? "Restore This Backup" : "Replace All Data";
  }

  if (pendingAppDataImportConfirmation) {
    pendingAppDataImportConfirmation.resolve(false);
  }

  (globalThis.controllerServices || globalThis).toggleSettingsMenu(false);

  return new Promise((resolve) => {
    pendingAppDataImportConfirmation = {resolve};
    modal.classList.add("open");
    setTimeout(() => document.getElementById("cancelAppDataImportBtn")?.focus(), 0);
  });
}

function importAppDataFromSettings() {
  const input = document.getElementById("appDataImportInput");
  if (!input) {
    (globalThis.controllerServices || globalThis).setSettingsStatus("Import control is unavailable.");
    return;
  }
  (globalThis.controllerServices || globalThis).setSettingsStatus("Choose a Wormholes app-data JSON file.");
  input.value = "";
  input.click();
}

function validateWormholesAppDataImport(data) {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw dataPortabilityError(
      "WORMHOLES_NOT_APP_DATA",
      "That file is not a valid Wormholes app-data export.",
    );
  if (data.format !== "Wormholes App Data Export")
    throw dataPortabilityError(
      "WORMHOLES_NOT_APP_DATA",
      "That JSON file was not created by Download Backup.",
    );
  assertSupportedWormholesSchemaVersion(data);
  if (!Array.isArray(data.universes))
    throw dataPortabilityError(
      "WORMHOLES_MALFORMED_IMPORT",
      "The app-data export is missing its universe list.",
    );
  if (!Object.prototype.hasOwnProperty.call(data, "universeData") || data.universeData === null)
    throw dataPortabilityError(
      "WORMHOLES_MALFORMED_IMPORT",
      "The app-data export is missing universe details.",
    );
  validateWormholesAppDataStructure(data);
  return true;
}

function sanitizeImportedRichTextBeforeStaging(importData) {
  let staged;
  try {
    staged = JSON.parse(JSON.stringify(importData));
  } catch (error) {
    throw dataPortabilityError(
      "WORMHOLES_IMPORT_SAFETY",
      "This backup could not be prepared safely.",
    );
  }

  if (!staged || typeof staged !== "object") return staged;
  if (typeof (globalThis.controllerServices || globalThis).sanitizeLiteratureHtml !== "function") {
    throw dataPortabilityError(
      "WORMHOLES_IMPORT_SAFETY",
      "The Literature sanitizer is unavailable, so this backup was not staged.",
    );
  }

  const universeData = staged.universeData;
  if (!universeData || typeof universeData !== "object") return staged;

  Object.values(universeData).forEach((dataForUniverse) => {
    if (
      !dataForUniverse ||
      typeof dataForUniverse !== "object" ||
      !Array.isArray(dataForUniverse.literature)
    )
      return;
    dataForUniverse.literature = dataForUniverse.literature.map((doc) => {
      if (!doc || typeof doc !== "object" || Array.isArray(doc)) return doc;
      const sanitized = {...doc};
      const isGroup =
        sanitized.kind === "literatureGroup" ||
        sanitized.fileType === "group" ||
        Array.isArray(sanitized.groupIds) ||
        Array.isArray(sanitized.children);
      sanitized.content = isGroup
        ? ""
        : (globalThis.controllerServices || globalThis).sanitizeLiteratureHtml(sanitized.content || "");
      return sanitized;
    });
  });

  return staged;
}

async function clearExistingAppDataBeforeImport(importData, options = {}) {
  const ids = new Set();
  universes.forEach((universe) => universe?.id && ids.add(universe.id));
  (importData.universes || []).forEach((universe) => universe?.id && ids.add(universe.id));
  (options.additionalUniverses || []).forEach((universe) => universe?.id && ids.add(universe.id));

  const appDataRepository =
    typeof wormholesRepository === "function" ? wormholesRepository("appData") : null;
  if (appDataRepository) {
    ids.forEach((universeId) => appDataRepository.removeUniverse(universeId));
    appDataRepository.removeCore();
  } else {
    ids.forEach((universeId) => {
      appDataKeysForUniverse(universeId).forEach((key) => removeStoredAppKey(key));
    });
    [
      UNIVERSES_KEY,
      OLD_UNIVERSES_KEY,
      WORMHOLE_BRIDGE_NOTES_KEY,
      OLD_WORMHOLE_BRIDGE_NOTES_KEY,
    ].forEach((key) => removeStoredAppKey(key));
  }

  for (const universeId of ids) {
    await (globalThis.controllerServices || globalThis).deleteUniverseLargeData(universeId);
  }
}

function prepareWormholesAppDataImport(importData, options = {}) {
  validateWormholesAppDataImport(importData);
  window.WormholesIdIntegrity?.validateAppData?.(importData, {
    allowDuplicateIds: !!options.allowDuplicateIds,
  });
  window.WormholesReferenceIntegrity?.validateAppData?.(importData, {
    allowBrokenReferences: !!options.allowBrokenReferences,
  });
  window.WormholesMediaLimits?.validateAppData?.(importData, {
    allowOverLimit: !!options.allowOverLimit,
  });
  window.WormholesUrlSafety?.validateAppData?.(importData, {
    allowUnsafeUrls: !!options.allowUnsafeUrls,
  });
  window.WormholesContentLimits?.validateAppData?.(importData, {
    allowOverLimit: !!options.allowOverLimit,
  });

  // From this point forward, dry-run summaries, storage estimates, snapshots, and
  // persistence receive only the detached, sanitized copy. The source object is
  // never mutated, and normalization sanitizes once more as defense in depth.
  const sanitizedImport = sanitizeImportedRichTextBeforeStaging(importData);
  const migrated = migrateWormholesAppDataImport(sanitizedImport);
  validateWormholesAppDataImport(migrated);
  window.WormholesIdIntegrity?.validateAppData?.(migrated, {
    allowDuplicateIds: !!options.allowDuplicateIds,
  });
  window.WormholesReferenceIntegrity?.validateAppData?.(migrated, {
    allowBrokenReferences: !!options.allowBrokenReferences,
  });
  window.WormholesMediaLimits?.validateAppData?.(migrated, {
    allowOverLimit: !!options.allowOverLimit,
  });
  window.WormholesUrlSafety?.validateAppData?.(migrated, {
    allowUnsafeUrls: !!options.allowUnsafeUrls,
  });
  window.WormholesContentLimits?.validateAppData?.(migrated, {
    allowOverLimit: !!options.allowOverLimit,
  });
  window.WormholesEntityLimits?.validateAppData?.(migrated, {
    allowOverLimit: !!options.allowOverLimit,
  });

  const now = new Date().toISOString();
  const importedUniverses = (migrated.universes || []).map((universe) => {
    const normalized = {
      ...universe,
      id: universe?.id || makeId(),
      title: universe?.title || "Untitled Universe",
      summary: universe?.summary || "",
      bridges: Array.isArray(universe?.bridges) ? universe.bridges : [],
      createdAt: universe?.createdAt || now,
    };
    if (!normalized.diskFolderName) {
      normalized.diskFolderName = (globalThis.controllerServices || globalThis).stableUniverseFolderName(normalized);
    }
    return normalized;
  });

  const importedCurrentUniverseId = importedUniverses.some(
    (universe) => universe.id === migrated.currentUniverseId,
  )
    ? migrated.currentUniverseId
    : importedUniverses[0]?.id || null;

  const themeState = prepareThemeStateForAppDataImport(migrated, window);

  return {
    importData: migrated,
    universes: importedUniverses,
    currentUniverseId: importedCurrentUniverseId,
    bridgeNotes:
      migrated.bridgeNotes && typeof migrated.bridgeNotes === "object" ? migrated.bridgeNotes : {},
    themeState,
  };
}

function validatePreparedWormholesAppDataForWrite(prepared) {
  return validatePreparedAppDataForWrite(prepared, {
    schema: window.WormholesPersistedSchema,
    makeError: dataPortabilityError,
  });
}

function assertImportWriteResult(result, message) {
  return assertAppDataWriteResult(result, message, dataPortabilityError);
}

async function writePreparedWormholesAppDataImport(prepared, options = {}) {
  validatePreparedWormholesAppDataForWrite(prepared);
  const importData = prepared.importData;
  const importedUniverses = prepared.universes;
  const staged = importedUniverses.map((universe) => {
    const data = importData.universeData?.[universe.id] || {};
    const literatureSource = Array.isArray(data.literature) ? data.literature : [];
    const visionSource = Array.isArray(data.vision) ? data.vision : [];
    return {
      universe,
      archive: Array.isArray(data.archive) ? data.archive : [],
      connectionNotes:
        data.connectionNotes && typeof data.connectionNotes === "object"
          ? data.connectionNotes
          : {},
      literature:
        typeof (globalThis.controllerServices || globalThis).prepareImportedLiteratureForUniverse === "function"
          ? (globalThis.controllerServices || globalThis).prepareImportedLiteratureForUniverse(universe.id, literatureSource)
          : literatureSource,
      vision:
        typeof (globalThis.controllerServices || globalThis).prepareImportedVisionForUniverse === "function"
          ? (globalThis.controllerServices || globalThis).prepareImportedVisionForUniverse(universe.id, visionSource)
          : visionSource,
    };
  });

  const steps = [
    {
      name: "clear-old-app-data",
      phase: "large-content",
      execute: () =>
        clearExistingAppDataBeforeImport(importData, {
          additionalUniverses: Array.isArray(options.additionalUniverses)
            ? options.additionalUniverses
            : [],
        }),
    },
  ];

  staged.forEach((row) => {
    if (typeof (globalThis.controllerServices || globalThis).persistPreparedLiteratureLargeData === "function") {
      steps.push({
        name: `literature-content:${row.universe.id}`,
        phase: "large-content",
        execute: () =>
          (globalThis.controllerServices || globalThis).persistPreparedLiteratureLargeData(row.universe.id, row.literature),
      });
    }
    if (typeof (globalThis.controllerServices || globalThis).persistPreparedVisionLargeData === "function") {
      steps.push({
        name: `vision-content:${row.universe.id}`,
        phase: "large-content",
        execute: () =>
          (globalThis.controllerServices || globalThis).persistPreparedVisionLargeData(row.universe.id, row.vision),
      });
    }
  });

  staged.forEach((row) => {
    steps.push(
      {
        name: `archive-metadata:${row.universe.id}`,
        phase: "record-metadata",
        execute: () =>
          assertImportWriteResult(
            saveArchiveForUniverse(row.universe.id, row.archive),
            "Imported Archive items could not be saved.",
          ),
      },
      {
        name: `connection-metadata:${row.universe.id}`,
        phase: "record-metadata",
        execute: () =>
          assertImportWriteResult(
            saveConnectionNotesForUniverse(row.universe.id, row.connectionNotes),
            "Imported connection details could not be saved.",
          ),
      },
    );
  });
  staged.forEach((row) => {
    steps.push(
      {
        name: `literature-metadata:${row.universe.id}`,
        phase: "collection-metadata",
        execute: async () => {
          const result =
            typeof (globalThis.controllerServices || globalThis).writePreparedLiteratureMetadata === "function"
              ? (globalThis.controllerServices || globalThis).writePreparedLiteratureMetadata(row.universe.id, row.literature)
              : await (globalThis.controllerServices || globalThis).saveImportedLiteratureForUniverse(
                  row.universe.id,
                  row.literature,
                );
          return assertImportWriteResult(result, "Imported documents could not be saved.");
        },
      },
      {
        name: `vision-metadata:${row.universe.id}`,
        phase: "collection-metadata",
        execute: async () => {
          const result =
            typeof (globalThis.controllerServices || globalThis).writePreparedVisionMetadata === "function"
              ? (globalThis.controllerServices || globalThis).writePreparedVisionMetadata(row.universe.id, row.vision)
              : await (globalThis.controllerServices || globalThis).saveImportedVisionForUniverse(row.universe.id, row.vision);
          return assertImportWriteResult(result, "Imported images could not be saved.");
        },
      },
    );
  });

  appendThemeStateWriteSteps(steps, prepared, assertImportWriteResult, window);

  steps.push(
    {
      name: "bridge-notes-metadata",
      phase: "collection-metadata",
      execute() {
        const repository =
          typeof wormholesRepository === "function" ? wormholesRepository("bridgeNotes") : null;
        const result = repository
          ? repository.save(null, prepared.bridgeNotes, {
              context: "Imported bridge notes could not be saved",
            })
          : saveLocalStorageJson(
              WORMHOLE_BRIDGE_NOTES_KEY,
              prepared.bridgeNotes,
              "Imported bridge notes could not be saved",
              "Imported bridge notes could not be saved.",
            );
        return assertImportWriteResult(result, "Imported bridge notes could not be saved.");
      },
    },
    {
      name: "schema-version",
      phase: "core-metadata",
      execute: () =>
        assertImportWriteResult(
          saveLocalStorageText(
            WORMHOLES_SCHEMA_KEY,
            String(WORMHOLES_APP_SCHEMA_VERSION),
            "Could not save schema version",
            "The backup version could not be saved.",
          ),
          "The backup version could not be saved.",
        ),
    },
    {
      name: "universe-index",
      phase: "core-metadata",
      execute() {
        const repository =
          typeof wormholesRepository === "function" ? wormholesRepository("universes") : null;
        const result = repository
          ? repository.save(null, importedUniverses, {
              context: "Imported universes could not be saved",
            })
          : saveLocalStorageJson(
              UNIVERSES_KEY,
              importedUniverses,
              "Imported universes could not be saved",
              "Imported universes could not be saved.",
            );
        return assertImportWriteResult(result, "Imported universes could not be saved.");
      },
    },
  );

  const transaction = window.WormholesTransactionalPersistence;
  if (transaction?.run) {
    await transaction.run({
      operation: options.operation || "replace app data",
      validate: [() => validatePreparedWormholesAppDataForWrite(prepared)],
      steps,
      failureMessage: "The backup could not be fully saved. Your previous data will be restored.",
    });
    return true;
  }

  for (const step of steps) {
    assertImportWriteResult(await step.execute(), "The backup could not be fully saved.");
  }
  return true;
}

function applyPreparedWormholesAppDataToRuntime(prepared) {
  if (currentUniverseId && typeof (globalThis.controllerServices || globalThis).persistManualCreateDraft === "function") {
    (globalThis.controllerServices || globalThis).persistManualCreateDraft({
      universeId: currentUniverseId,
      showStatus: false,
    });
  }
  universes = prepared.universes;
  bridgeNotes = prepared.bridgeNotes;
  currentUniverseId = prepared.currentUniverseId;
  applyPreparedThemeStateToRuntime(prepared, window);

  window.WormholesManualDrafts?.prune?.(
    (universes || []).map((universe) => universe?.id).filter(Boolean),
  );
  loadArchiveFromStorage();
  loadConnectionNotesFromStorage();
  (globalThis.controllerServices || globalThis).loadLiteratureFromStorage();
  (globalThis.controllerServices || globalThis).loadVisionBoardFromStorage();
  if (typeof (globalThis.controllerServices || globalThis).restoreManualCreateDraftForCurrentUniverse === "function")
    (globalThis.controllerServices || globalThis).restoreManualCreateDraftForCurrentUniverse();
}

async function renderAfterWormholesAppDataImport() {
  renderCurrent();
  (globalThis.controllerServices || globalThis).renderArchive();
  (globalThis.controllerServices || globalThis).renderLiteratureList();
  await (globalThis.controllerServices || globalThis).renderVisionBoard();
  if (typeof (globalThis.controllerServices || globalThis).renderUniverseArchiveList === "function")
    (globalThis.controllerServices || globalThis).renderUniverseArchiveList();
  if (typeof renderWormholesUniverseList === "function") renderWormholesUniverseList();
}

function appDataImportFailureReport(error, options = {}) {
  const code = String(error?.code || options.code || "WORMHOLES_IMPORT_FAILED");
  const rawMessage = String(
    error?.message || options.technicalMessage || "The import could not be completed.",
  );
  const sourceName = String(options.sourceName || "").trim();
  const existingData =
    options.rollbackStatus === "failed"
      ? "Recovery could not be confirmed. Keep this tab open and use Restore Points or your latest backup."
      : options.rollbackStatus === "restored"
        ? "Your previous data was restored."
        : "Your existing data was not changed.";

  let cause = "The selected file could not be validated or safely written to Wormholes storage.";
  let steps = [
    "Confirm that the file was created with Download Backup in Wormholes.",
    "Try the import again after closing other Wormholes tabs.",
    "If the problem continues, use a different recent backup.",
  ];

  if (
    error instanceof SyntaxError ||
    error?.name === "SyntaxError" ||
    code === "WORMHOLES_INVALID_JSON"
  ) {
    cause = "The file is damaged, incomplete, or not a readable App Data backup.";
    steps = [
      "Return to the Wormholes copy that created the backup and export App Data again.",
      "Do not edit the exported JSON in a word processor or notes app.",
      "Choose the newly exported file and retry the import.",
    ];
  } else if (
    code === "WORMHOLES_NOT_APP_DATA" ||
    /not a valid Wormholes app-data export|not created by Download Backup/i.test(rawMessage)
  ) {
    cause = "The file is not a Wormholes App Data backup.";
    steps = [
      "Choose a file produced by Gear menu → Download Backup.",
      "Do not use an individual Literature file, image, or local-folder file for App Data import.",
      "Export a fresh App Data backup from the source Wormholes installation if needed.",
    ];
  } else if (code === "WORMHOLES_NEWER_VERSION" || /newer Wormholes version/i.test(rawMessage)) {
    cause = "The backup needs a newer Wormholes version.";
    steps = [
      "Open the backup with the same or a newer Wormholes build than the one that exported it.",
      "Avoid manually changing the version fields in the JSON.",
      "After opening it successfully, create a fresh backup before making further changes.",
    ];
  } else if (code === "WORMHOLES_MALFORMED_IMPORT") {
    cause = "A required part of the backup is missing or damaged.";
    steps = [
      "Export the App Data again from the original Wormholes installation.",
      "Make sure the export finished before moving, syncing, or renaming the file.",
      "Try another recent backup if a fresh export is unavailable.",
    ];
  } else if (code === "WORMHOLES_DUPLICATE_ID") {
    cause = "The backup contains duplicate records, so linked items cannot be matched safely.";
    steps = [
      "Create a fresh App Data export from the source app; normal Wormholes exports repair many ID issues before writing.",
      "If the source app also reports duplicate IDs, restore an earlier point there first.",
      "Retry using the newly exported backup.",
    ];
  } else if (code === "WORMHOLES_BROKEN_REFERENCE") {
    cause = "Some links point to items that are missing from the backup.";
    steps = [
      "Export again from the source app so all linked records are included together.",
      "If the source app reports missing links, restore an earlier point before exporting.",
      "Use another recent backup when the source data cannot be repaired.",
    ];
  } else if (code === "WORMHOLES_ENTITY_LIMIT_EXCEEDED") {
    cause = "The backup contains more content than this build can safely import at once.";
    steps = [
      "Open the source app and remove or archive content you no longer need after making a backup.",
      "Download Backup again after reducing the reported category.",
      "Retry the import with the smaller export.",
    ];
  } else if (code === "WORMHOLES_STRING_TOO_LONG" || code === "WORMHOLES_NESTING_TOO_DEEP") {
    cause = "Some content is too large or complex to import safely.";
    steps = [
      "Create a fresh export from Wormholes rather than importing hand-edited JSON.",
      "In the source app, shorten the reported field if the same error appears again.",
      "Retry with the new export or another recent backup.",
    ];
  } else if (
    code === "WORMHOLES_EMBEDDED_MEDIA_TOO_LARGE" ||
    code === "WORMHOLES_EMBEDDED_MEDIA_INVALID"
  ) {
    cause = "An embedded image or document is damaged, unsupported, or too large.";
    steps = [
      "In the source app, remove or replace the reported media item with a smaller supported file.",
      "Download Backup again.",
      "Retry the import with the new backup.",
    ];
  } else if (code === "WORMHOLES_UNSAFE_URL") {
    cause = "The backup contains a link type Wormholes does not allow.";
    steps = [
      "Open the source app and replace the reported link with an https:// or other supported safe link.",
      "Download Backup again after saving the correction.",
      "Retry the import with the corrected backup.",
    ];
  } else if (code === "WORMHOLES_FILE_TOO_LARGE") {
    cause = "The selected backup exceeds the maximum App Data file size supported by this build.";
    steps = [
      "Reduce large images or Literature files in the source app after making a backup.",
      "Create a new App Data export.",
      "Retry with the smaller file.",
    ];
  } else if (
    code === "WORMHOLES_STORAGE_CAPACITY" ||
    /storage|quota|fully saved/i.test(rawMessage)
  ) {
    cause = "The browser may not have enough free storage for the import and its restore point.";
    steps = [
      "Open Gear menu → See more and check Browser capacity.",
      "Free browser storage or remove large Wormholes images/documents only after making a portable backup.",
      "Reload Wormholes and retry the import.",
    ];
  } else if (code === "WORMHOLES_IMPORT_SAFETY") {
    cause = "Wormholes could not verify the restore point required before import.";
    steps = [
      "Keep the current data open and create a portable App Data export.",
      "Check browser storage capacity and close other Wormholes tabs.",
      "Reload the app and retry only after the safety snapshot can be created.",
    ];
  } else if (options.rollbackStatus === "failed") {
    cause = "The import failed, and the previous data could not be fully verified.";
    steps = [
      "Keep this tab open and avoid making additional edits.",
      "Open Gear menu → Restore Points and restore the most recent pre-import snapshot.",
      "If recovery is unavailable, restore your latest portable App Data backup.",
    ];
  }

  return {
    title: "Import report",
    summary: `${simpleAppDataImportFailureMessage(error)} ${existingData}`,
    cause,
    steps,
    technical: {
      ...(sourceName ? {File: sourceName} : {}),
      Code: code,
      Phase: String(options.phase || "validation/import"),
      "Rollback status": String(options.rollbackStatus || "not needed"),
      Message: rawMessage,
      ...(options.rollbackError
        ? {"Rollback message": String(options.rollbackError?.message || options.rollbackError)}
        : {}),
    },
  };
}

function showActionableAppDataImportFailure(error, options = {}) {
  const report = appDataImportFailureReport(error, options);
  const toastMessage = options.toastMessage || "Import failed. Your data was not changed.";
  showSavedToast(toastMessage, {
    durationMs: 12000,
    moreInfo: report,
    moreInfoLabel: "More information",
    logType: "error",
    logMessage: report.summary,
    logAction: options.rollbackStatus === "failed" ? {kind: "recovery", label: "Recovery"} : null,
  });
  return report;
}

function simpleAppDataImportFailureMessage(error) {
  if (error instanceof SyntaxError || error?.name === "SyntaxError") {
    return "Import failed. This file is damaged or unreadable. Your existing data was not changed.";
  }
  const message = String(error?.message || "");
  if (
    error?.code === "WORMHOLES_NOT_APP_DATA" ||
    /not a valid Wormholes app-data export|not created by Download Backup/i.test(message)
  ) {
    return "Import failed. Choose a Wormholes App Data backup. Your existing data was not changed.";
  }
  if (error?.code === "WORMHOLES_NEWER_VERSION" || /newer Wormholes version/i.test(message)) {
    return "Import failed. This backup needs a newer Wormholes version. Your existing data was not changed.";
  }
  if (error?.code === "WORMHOLES_MALFORMED_IMPORT" || /missing/i.test(message)) {
    return "Import failed. This backup is incomplete or damaged. Your existing data was not changed.";
  }
  if (error?.code === "WORMHOLES_DUPLICATE_ID") {
    return "Import failed. This backup has duplicate records. Your existing data was not changed.";
  }
  if (error?.code === "WORMHOLES_BROKEN_REFERENCE") {
    return "Import failed. This backup has missing links. Your existing data was not changed.";
  }
  if (error?.code === "WORMHOLES_ENTITY_LIMIT_EXCEEDED") {
    return "Import failed. This backup has too much content. Your existing data was not changed.";
  }
  if (error?.code === "WORMHOLES_STRING_TOO_LONG" || error?.code === "WORMHOLES_NESTING_TOO_DEEP") {
    return "Import failed. Some content is too large or complex. Your existing data was not changed.";
  }
  if (
    error?.code === "WORMHOLES_EMBEDDED_MEDIA_TOO_LARGE" ||
    error?.code === "WORMHOLES_EMBEDDED_MEDIA_INVALID"
  ) {
    return "Import failed. An embedded file is too large or unsupported. Your existing data was not changed.";
  }
  if (error?.code === "WORMHOLES_UNSAFE_URL") {
    return "Import failed. A link uses an unsupported address. Your existing data was not changed.";
  }
  return "Import failed. Your existing data was not changed.";
}

async function preflightAppDataStorageCapacity(importData, rollbackData, options = {}) {
  const capacity = window.WormholesStorageCapacity;
  if (!capacity?.preflight) return {approved: true, status: "unknown"};
  const requiredBytes = capacity.estimateAppDataOperationBytes(importData, rollbackData);
  return await capacity.preflight({
    operationLabel: options.operationLabel || "this app-data operation",
    requiredBytes,
    continueLabel: options.continueLabel || "Continue",
  });
}

async function restoreImportedAppDataToLocalFolderIfPossible(
  importedUniverses,
  importedCurrentUniverseId,
) {
  if (!localFoldersEnabled) return "";

  try {
    if (!wormholesParentFolderHandle) {
      wormholesParentFolderHandle = await (globalThis.controllerServices || globalThis).loadWormholesParentFolderHandle();
    }
    if (
      !wormholesParentFolderHandle ||
      !(await prepareWormholesFolderHandles({requestPermission: true}))
    ) {
      return " Local folder was not connected, so imported files were restored to app storage only.";
    }

    universes = importedUniverses;
    currentUniverseId = importedCurrentUniverseId || importedUniverses[0]?.id || null;
    loadArchiveFromStorage();
    (globalThis.controllerServices || globalThis).loadLiteratureFromStorage();
    (globalThis.controllerServices || globalThis).loadVisionBoardFromStorage();
    await (globalThis.controllerServices || globalThis).migrateAllArchiveEntriesToFolder(true);
    await (globalThis.controllerServices || globalThis).migrateAllLiteratureEntriesToFolder(true);
    await (globalThis.controllerServices || globalThis).migrateAllVisionBoardsToFolder(true);
    return " Local folder files were also refreshed.";
  } catch (e) {
    reportAppError("Could not refresh local folder after app-data import", e, {
      userMessage: "Import restored app storage, but the local folder could not be refreshed.",
    });
    return " Imported app data was restored, but the local folder could not be refreshed.";
  }
}

async function applyWormholesAppDataImport(importData, options = {}) {
  const prepared = prepareWormholesAppDataImport(importData, {
    allowOverLimit: !!options.allowEntityLimitBypass,
    allowDuplicateIds: !!options.allowDuplicateIdBypass,
    allowBrokenReferences: !!options.allowBrokenReferenceBypass,
    allowUnsafeUrls: !!options.allowUnsafeUrlBypass,
  });
  const duplicateCreationReview = window.WormholesDuplicateCreations?.scanAppData?.(
    prepared.importData,
  ) || {count: 0};

  (globalThis.controllerServices || globalThis).setSettingsStatus("Checking backup…");
  let rollbackSnapshot;
  try {
    rollbackSnapshot = await buildWormholesAppDataExport();
    if (options.capacityPreflight !== false) {
      const capacityResult = await preflightAppDataStorageCapacity(
        prepared.importData,
        rollbackSnapshot,
        {
          operationLabel: options.capacityOperationLabel || "importing this app-data backup",
          continueLabel: options.capacityContinueLabel || "Import Anyway",
        },
      );
      if (!capacityResult.approved) {
        const message =
          capacityResult.status === "block"
            ? "Import did not start because there is not enough estimated browser storage. Your existing data was not changed."
            : "Import canceled. Your existing data was not changed.";
        (globalThis.controllerServices || globalThis).setSettingsStatus(message);
        if (capacityResult.status === "block") {
          const capacityError = Object.assign(new Error(message), {
            code: "WORMHOLES_STORAGE_CAPACITY",
          });
          showActionableAppDataImportFailure(capacityError, {
            sourceName: options.reviewSourceName || "",
            phase: "capacity check",
            toastMessage: "Import did not start",
          });
        } else {
          showSavedToast("Import canceled");
        }
        return false;
      }
    }
  } catch (error) {
    console.error("Could not prepare import safety snapshot", error);
    const message = "Import could not start safely. Your existing Wormholes data was not changed.";
    (globalThis.controllerServices || globalThis).setSettingsStatus(message);
    const safetyError = Object.assign(
      error instanceof Error ? error : new Error(String(error || message)),
      {code: error?.code || "WORMHOLES_IMPORT_SAFETY"},
    );
    showActionableAppDataImportFailure(safetyError, {
      sourceName: options.reviewSourceName || "",
      phase: "safety snapshot",
      toastMessage: "Import did not start",
    });
    return false;
  }

  if (!options.skipConfirmation) {
    const confirmed = await confirmAppDataImportOverwrite(prepared.importData, {
      operation: "import",
      sourceName: options.reviewSourceName || "",
      currentSummary:
        rollbackSnapshot?.exportSummary || summarizeWormholesAppDataExport(rollbackSnapshot),
      showPortableWarnings: true,
      duplicateReview: duplicateCreationReview,
    });
    if (!confirmed) {
      (globalThis.controllerServices || globalThis).setSettingsStatus("Import canceled. Nothing was changed.");
      return false;
    }
  }

  const journal = window.WormholesWriteAheadJournal;
  let journalTransaction = null;
  (globalThis.controllerServices || globalThis).setSettingsStatus("Preparing a safe import…");
  try {
    if (journal) {
      const recoveryPoint = await window.WormholesSnapshots?.createSnapshot?.({
        reason: options.snapshotReason || "before-import",
        force: true,
        data: rollbackSnapshot,
        skipCapacityPreflight: true,
        verifyWrite: true,
        preserveExistingUntilCommitted: true,
      });
      if (!recoveryPoint?.id)
        throw dataPortabilityError(
          "WORMHOLES_IMPORT_SAFETY",
          "The import restore point could not be verified.",
        );
      journalTransaction = await journal.begin({
        operation: options.journalOperation || "app-data-import",
        label: options.successMessage || "App data import",
        rollbackSnapshotId: recoveryPoint.id,
        additionalUniverses: prepared.universes,
      });
      await journal.markPhase(journalTransaction, "writing-browser-stores");
    } else if (options.persistentSnapshot !== false) {
      await window.WormholesSnapshots?.createSnapshot?.({
        reason: options.snapshotReason || "before-import",
        force: true,
        data: rollbackSnapshot,
        skipCapacityPreflight: true,
      });
    }
  } catch (safetyError) {
    console.error("Could not prepare the import write-ahead journal", safetyError);
    const message = "Import could not start safely. Your existing Wormholes data was not changed.";
    (globalThis.controllerServices || globalThis).setSettingsStatus(message);
    const journalError = Object.assign(
      safetyError instanceof Error ? safetyError : new Error(String(safetyError || message)),
      {code: safetyError?.code || "WORMHOLES_IMPORT_SAFETY"},
    );
    showActionableAppDataImportFailure(journalError, {
      sourceName: options.reviewSourceName || "",
      phase: "write-ahead journal",
      toastMessage: "Import did not start",
    });
    return false;
  }

  (globalThis.controllerServices || globalThis).setSettingsStatus("Importing app data…");
  try {
    await writePreparedWormholesAppDataImport(prepared, {journal: false});
    if (journalTransaction) {
      await journal.markPhase(journalTransaction, "browser-stores-written");
      await journal.commit(journalTransaction);
      journalTransaction = null;
    }
  } catch (importError) {
    console.error("App-data import failed; restoring previous data", importError);
    try {
      const rollbackPrepared = prepareWormholesAppDataImport(rollbackSnapshot, {
        allowOverLimit: true,
        allowDuplicateIds: true,
        allowBrokenReferences: true,
        allowUnsafeUrls: true,
      });
      await writePreparedWormholesAppDataImport(rollbackPrepared, {
        additionalUniverses: prepared.universes,
        journal: false,
      });
      applyPreparedWormholesAppDataToRuntime(rollbackPrepared);
      await renderAfterWormholesAppDataImport();
      requestStorageFootnoteUpdate();
      if (journalTransaction) {
        await journal.discardAfterRollback(journalTransaction);
        journalTransaction = null;
      }
      const message =
        "Import failed. Your existing Wormholes data was restored and was not changed.";
      (globalThis.controllerServices || globalThis).setSettingsStatus(message);
      showActionableAppDataImportFailure(importError, {
        sourceName: options.reviewSourceName || "",
        phase: "writing imported data",
        rollbackStatus: "restored",
        toastMessage: "Import failed — existing data restored",
      });
      return false;
    } catch (rollbackError) {
      console.error("App-data import rollback failed", rollbackError);
      const message =
        "Import failed, and Wormholes could not fully restore your previous data. Keep this tab open and use your latest backup.";
      (globalThis.controllerServices || globalThis).setSettingsStatus(message);
      showActionableAppDataImportFailure(importError, {
        sourceName: options.reviewSourceName || "",
        phase: "writing imported data",
        rollbackStatus: "failed",
        rollbackError,
        toastMessage: "Import needs attention",
      });
      return false;
    }
  }

  const localFolderImportMessage = await restoreImportedAppDataToLocalFolderIfPossible(
    prepared.universes,
    prepared.currentUniverseId,
  );
  applyPreparedWormholesAppDataToRuntime(prepared);

  await renderAfterWormholesAppDataImport();
  (globalThis.controllerServices || globalThis).toggleSettingsMenu(false);
  (globalThis.controllerServices || globalThis).showHomeScreen();
  requestStorageFootnoteUpdate();
  const successMessage = options.successMessage || "App data imported";
  const canOfferUndo = options.offerUndo !== false && window.WormholesUndo && rollbackSnapshot;
  if (canOfferUndo) {
    await window.WormholesUndo.offer({
      message: successMessage,
      restoredMessage: "Previous app data restored",
      undo: async () =>
        await applyWormholesAppDataImport(rollbackSnapshot, {
          skipConfirmation: true,
          persistentSnapshot: false,
          offerUndo: false,
          suppressSuccessToast: true,
          capacityPreflight: false,
          allowEntityLimitBypass: true,
          allowDuplicateIdBypass: true,
          allowBrokenReferenceBypass: true,
          allowUnsafeUrlBypass: true,
          journalOperation: "app-data-import-undo",
          successMessage: "Previous app data restored",
        }),
    });
  } else if (!options.suppressSuccessToast) {
    showSavedToast(successMessage);
  }
  (globalThis.controllerServices || globalThis).setSettingsStatus(
    `${successMessage}. Restored ${formatWormholesAppDataExportSummary(prepared.importData.exportSummary || summarizeWormholesAppDataExport(prepared.importData))}.${localFolderImportMessage || ""}`,
  );
  if (duplicateCreationReview.count) {
    window.WormholesActivityLog?.recordAction?.(
      `Imported data with ${duplicateCreationReview.count} possible duplicate creation${duplicateCreationReview.count === 1 ? "" : "s"}`,
      {
        detail: {
          title: "Possible duplicates in imported data",
          summary: "The import completed. Similar creations were kept as separate items.",
          steps: ["Review the imported Archive if any copies were unintended."],
        },
      },
    );
  }
  return true;
}

async function handleAppDataImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    (globalThis.controllerServices || globalThis).setSettingsStatus("");
    return;
  }

  try {
    const sizeResult = window.WormholesFileLimits?.enforce?.([file], "appData", {
      label: "Wormholes app-data backup",
    });
    if (sizeResult && !sizeResult.ok) {
      const message =
        "Import did not start because the selected backup is too large. Nothing was changed.";
      (globalThis.controllerServices || globalThis).setSettingsStatus(message);
      const sizeError = Object.assign(new Error(message), {code: "WORMHOLES_FILE_TOO_LARGE"});
      showActionableAppDataImportFailure(sizeError, {
        sourceName: file.name,
        phase: "file-size check",
        toastMessage: "Import did not start",
      });
      return;
    }
    const text = await file.text();
    const data = JSON.parse(text);
    await applyWormholesAppDataImport(data, {reviewSourceName: file.name});
  } catch (e) {
    console.error("Could not import app data", e);
    if (e?.code === "WORMHOLES_DUPLICATE_ID") {
      window.WormholesIdIntegrity?.showDialog?.(e.idIntegrityResult);
    }
    if (e?.code === "WORMHOLES_BROKEN_REFERENCE") {
      window.WormholesReferenceIntegrity?.showDialog?.(e.referenceIntegrityResult);
    }
    if (e?.code === "WORMHOLES_ENTITY_LIMIT_EXCEEDED") {
      window.WormholesEntityLimits?.showDialog?.(e.entityLimitResult);
    }
    if (e?.code === "WORMHOLES_STRING_TOO_LONG" || e?.code === "WORMHOLES_NESTING_TOO_DEEP") {
      window.WormholesContentLimits?.showDialog?.(e.contentLimitResult);
    }
    if (
      e?.code === "WORMHOLES_EMBEDDED_MEDIA_TOO_LARGE" ||
      e?.code === "WORMHOLES_EMBEDDED_MEDIA_INVALID"
    ) {
      window.WormholesMediaLimits?.showDialog?.(e.mediaLimitResult);
    }
    if (e?.code === "WORMHOLES_UNSAFE_URL") {
      window.WormholesUrlSafety?.showDialog?.(e.urlSafetyResult, {importing: true});
    }
    const message = simpleAppDataImportFailureMessage(e);
    (globalThis.controllerServices || globalThis).setSettingsStatus(message);
    showActionableAppDataImportFailure(e, {
      sourceName: file.name,
      phase: "file validation",
      toastMessage: "Import failed — existing data unchanged",
    });
  } finally {
    event.target.value = "";
  }
}

/* --- clear app data --- */

let clearAppDataConfirmStep = 1;

function setClearAppDataConfirmStep(step) {
  clearAppDataConfirmStep = step === 2 ? 2 : 1;
  const title = document.getElementById("clearAppDataConfirmTitle");
  const text = document.getElementById("clearAppDataConfirmText");
  const detail = document.getElementById("clearAppDataConfirmDetail");
  const confirm = document.getElementById("confirmClearAppDataBtn");
  const cancel = document.getElementById("cancelClearAppDataBtn");

  if (title)
    title.textContent =
      clearAppDataConfirmStep === 2 ? "Clear all data now?" : "Clear all app data?";
  if (text)
    text.textContent =
      clearAppDataConfirmStep === 2
        ? "This is the final step."
        : "This removes every universe, creation, document, image, and draft from this browser.";
  if (detail)
    detail.textContent =
      clearAppDataConfirmStep === 2
        ? "You can restore the cleared data from the notification or Recent Activity for two minutes. Your folder connection stays saved."
        : "A restore point is saved first. Connected Wormholes folder files are also cleared when possible.";
  if (confirm) {
    confirm.disabled = false;
    confirm.textContent = clearAppDataConfirmStep === 2 ? "Clear All Data" : "Continue";
  }
  if (cancel) {
    cancel.disabled = false;
    cancel.textContent = "Keep Data";
  }
}

function openClearAppDataConfirmModal() {
  const modal = document.getElementById("clearAppDataConfirmModal");
  if (!modal) {
    (globalThis.controllerServices || globalThis).setSettingsStatus("Clear Data could not open. Nothing was changed.");
    showSavedToast("Nothing was changed");
    return;
  }
  setClearAppDataConfirmStep(1);
  (globalThis.controllerServices || globalThis).toggleSettingsMenu(false);
  modal.classList.add("open");
  setTimeout(() => document.getElementById("cancelClearAppDataBtn")?.focus(), 0);
}

function closeClearAppDataConfirmModal() {
  const modal = document.getElementById("clearAppDataConfirmModal");
  if (modal) modal.classList.remove("open");
  setClearAppDataConfirmStep(1);
}

function shouldClearWormholesStorageKey(key) {
  const value = String(key || "");
  return /wormholes/i.test(value) || /worldBuilder/.test(value);
}

function clearWormholesLocalStorageKeys(options = {}) {
  const keys = [];
  const preserveFolderConnection = !!options.preserveFolderConnection;
  const preservedKeys = new Set();
  const singleTabLeaseKey = window.WormholesSingleTab?.storageKey;
  if (singleTabLeaseKey) preservedKeys.add(singleTabLeaseKey);
  const backupStatusKey = window.WormholesBackupStatus?.storageKey;
  if (backupStatusKey) preservedKeys.add(backupStatusKey);
  const activityLogKey = window.WormholesActivityLog?.storageKey;
  if (activityLogKey) preservedKeys.add(activityLogKey);
  if (preserveFolderConnection) {
    [
      WORMHOLES_LOCAL_ENABLED_KEY,
      OLD_WORMHOLES_LOCAL_ENABLED_KEY,
      WORMHOLES_LOCAL_MODE_KEY,
      OLD_WORMHOLES_LOCAL_MODE_KEY,
    ].forEach((key) => key && preservedKeys.add(key));
  }

  try {
    const appDataRepository =
      typeof wormholesRepository === "function" ? wormholesRepository("appData") : null;
    if (appDataRepository) {
      return appDataRepository.clearLocalMatching(shouldClearWormholesStorageKey, {
        preserveKeys: preservedKeys,
      });
    }
    const repository = window.WormholesRepositories?.local;
    const storage = globalThis.localStorage;
    const availableKeys =
      repository?.keys?.() ||
      Array.from({length: storage?.length || 0}, (_, index) => storage.key(index)).filter(Boolean);
    availableKeys.forEach((key) => {
      if (key && shouldClearWormholesStorageKey(key) && !preservedKeys.has(key)) keys.push(key);
    });
    keys.forEach((key) => removeStoredAppKey(key));
  } catch (e) {
    if (!window.__wormholesClearingAppData) {
      reportAppError("Could not clear local app storage", e, {
        userMessage: "App data could not be fully cleared.",
      });
    }
    throw e;
  }
  return keys.length;
}

async function clearLargeAppDataStore() {
  try {
    const repository =
      typeof wormholesRepository === "function" ? wormholesRepository("appData") : null;
    if (repository) {
      await repository.clearLargeData();
      return true;
    }
    const legacyBackend = window["WormholesLargeDataStore"] || globalThis.WormholesLargeDataStore;
    if (legacyBackend?.clearAll) {
      await legacyBackend.clearAll();
      return true;
    }
  } catch (e) {
    if (!window.__wormholesClearingAppData) {
      reportAppError("Could not clear large app data store", e, {
        userMessage: "Large app data could not be fully cleared.",
      });
    }
    throw e;
  }
  return false;
}

async function clearStoredFolderHandleDatabases() {
  try {
    return (await window.WormholesFolderHandleRepository?.clearAll?.()) || false;
  } catch (e) {
    if (!window.__wormholesClearingAppData) {
      reportAppError("Could not clear saved folder handles", e, {
        userMessage: "Saved folder handles could not be fully cleared.",
      });
    }
    throw e;
  }
}

function appClearFolderResult(attempted = false) {
  return {attempted: !!attempted, removed: 0, failures: []};
}

function mergeAppClearFolderResults(target, source) {
  const merged = target || appClearFolderResult(false);
  if (!source) return merged;
  merged.attempted = !!(merged.attempted || source.attempted);
  merged.removed += Number(source.removed || 0);
  if (Array.isArray(source.failures) && source.failures.length) {
    merged.failures.push(...source.failures);
  }
  return merged;
}

function folderClearFailureMessage(result) {
  const failures = Array.isArray(result?.failures) ? result.failures : [];
  if (!failures.length) return "";
  const first = failures[0];
  const label = first?.label || "local folder";
  const names = failures
    .slice(0, 3)
    .map((item) => item.name)
    .filter(Boolean)
    .join(", ");
  return `Browser blocked ${failures.length} local-folder delete${failures.length === 1 ? "" : "s"}${names ? ` in ${label}: ${names}` : ""}.`;
}

async function removeEntryFromFolderForAppClear(
  folderHandle,
  name,
  options = {},
  label = "local folder",
) {
  const result = appClearFolderResult(true);
  if (!folderHandle?.removeEntry || !name) return result;
  if (
    typeof (globalThis.controllerServices || globalThis).isIgnorableFolderSyncArtifact === "function" &&
    (globalThis.controllerServices || globalThis).isIgnorableFolderSyncArtifact(name)
  )
    return result;
  try {
    await folderHandle.removeEntry(name, {recursive: !!options.recursive});
    result.removed += 1;
    if (typeof delay === "function") await delay(20);
  } catch (e) {
    if (e?.name !== "NotFoundError") {
      result.failures.push({name, label, error: e});
    }
  }
  return result;
}

async function clearDirectoryContentsForAppClear(folderHandle, label = "local folder") {
  const result = appClearFolderResult(!!folderHandle);
  if (!folderHandle?.entries || !folderHandle?.removeEntry) return result;

  for await (const [name, handle] of folderHandle.entries()) {
    if (
      typeof (globalThis.controllerServices || globalThis).isIgnorableFolderSyncArtifact === "function" &&
      (globalThis.controllerServices || globalThis).isIgnorableFolderSyncArtifact(name)
    )
      continue;

    if (handle?.kind === "directory") {
      const clearedNested = await clearDirectoryContentsForAppClear(handle, `${name} folder`);
      mergeAppClearFolderResults(result, clearedNested);
      const removedDirectory = await removeEntryFromFolderForAppClear(
        folderHandle,
        name,
        {recursive: false},
        label,
      );
      mergeAppClearFolderResults(result, removedDirectory);
      if (removedDirectory.failures.length && !removedDirectory.removed) {
        const fallbackRemovedDirectory = await removeEntryFromFolderForAppClear(
          folderHandle,
          name,
          {recursive: true},
          label,
        );
        mergeAppClearFolderResults(result, fallbackRemovedDirectory);
      }
      continue;
    }

    const removedFile = await removeEntryFromFolderForAppClear(
      folderHandle,
      name,
      {recursive: false},
      label,
    );
    mergeAppClearFolderResults(result, removedFile);
  }

  return result;
}

async function removeNamedDirectoryAfterContentsForAppClear(
  parentHandle,
  directoryName,
  directoryHandle,
  label,
) {
  const result = appClearFolderResult(!!parentHandle || !!directoryHandle);
  if (directoryHandle) {
    const clearedContents = await clearDirectoryContentsForAppClear(
      directoryHandle,
      `${directoryName} folder`,
    );
    mergeAppClearFolderResults(result, clearedContents);
  }
  if (parentHandle?.removeEntry && directoryName) {
    const removedDirectory = await removeEntryFromFolderForAppClear(
      parentHandle,
      directoryName,
      {recursive: false},
      label,
    );
    mergeAppClearFolderResults(result, removedDirectory);
    if (removedDirectory.failures.length) {
      const fallbackRemovedDirectory = await removeEntryFromFolderForAppClear(
        parentHandle,
        directoryName,
        {recursive: true},
        label,
      );
      mergeAppClearFolderResults(result, fallbackRemovedDirectory);
    }
  }
  return result;
}

async function clearWormholesManagedRootFolderData(rootHandle) {
  const result = appClearFolderResult(!!rootHandle);
  if (!rootHandle) return result;

  for (const categoryName of ["Creations", "Literature", "Images"]) {
    let categoryHandle = null;
    try {
      categoryHandle = await rootHandle.getDirectoryHandle(categoryName, {create: false});
    } catch (e) {}

    const removedCategory = await removeNamedDirectoryAfterContentsForAppClear(
      rootHandle,
      categoryName,
      categoryHandle,
      "Wormholes local folder",
    );
    mergeAppClearFolderResults(result, removedCategory);
  }

  const managedMarkerName =
    typeof WORMHOLES_MANAGED_MARKER !== "undefined"
      ? WORMHOLES_MANAGED_MARKER
      : ".wormholes-managed.json";
  for (const fileName of [managedMarkerName, WORMHOLES_BACKUP_MANIFEST_FILE]) {
    const removedFile = await removeEntryFromFolderForAppClear(
      rootHandle,
      fileName,
      {recursive: false},
      "Wormholes local folder",
    );
    mergeAppClearFolderResults(result, removedFile);
  }

  return result;
}

function savedUniversesSnapshotForAppClear() {
  if (typeof universes !== "undefined" && Array.isArray(universes)) return universes.slice();
  if (Array.isArray(globalThis.universes)) return globalThis.universes.slice();

  try {
    if (typeof loadUniversesFromStorage === "function") {
      const loaded = loadUniversesFromStorage();
      if (Array.isArray(loaded)) return loaded.slice();
    }
  } catch (e) {}

  try {
    const raw =
      typeof readMigratedLocalStorageValue === "function"
        ? readMigratedLocalStorageValue(UNIVERSES_STORAGE_KEY, OLD_UNIVERSES_STORAGE_KEY)
        : window.WormholesRepositories?.local?.get?.(UNIVERSES_STORAGE_KEY) ||
          window.WormholesRepositories?.local?.get?.(OLD_UNIVERSES_STORAGE_KEY) ||
          "";
    const parsed = raw ? parsePersistedDatasetText(raw, []).data : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function appClearUniverseFolderNameCandidates(universe) {
  const names = new Set();
  if (universe?.diskFolderName) names.add(universe.diskFolderName);
  if (typeof universeFolderName === "function") {
    try {
      names.add(universeFolderName(universe));
    } catch (e) {}
  }
  if (typeof (globalThis.controllerServices || globalThis).stableUniverseFolderName === "function") {
    try {
      names.add((globalThis.controllerServices || globalThis).stableUniverseFolderName(universe));
    } catch (e) {}
  }
  if (typeof (globalThis.controllerServices || globalThis).legacyUniverseFolderName === "function") {
    try {
      names.add((globalThis.controllerServices || globalThis).legacyUniverseFolderName(universe));
    } catch (e) {}
  }
  if (universe?.title) names.add(universe.title);
  return Array.from(names).filter(Boolean);
}

async function getExistingSubdirectoryForAppClear(parentHandle, directoryName) {
  if (!parentHandle || !directoryName) return null;
  if (typeof (globalThis.controllerServices || globalThis).getExistingDirectory === "function") {
    try {
      return await (globalThis.controllerServices || globalThis).getExistingDirectory(parentHandle, directoryName);
    } catch (e) {}
  }
  try {
    return await parentHandle.getDirectoryHandle(directoryName, {create: false});
  } catch (e) {
    return null;
  }
}

async function getUniverseFolderForAppClear(categoryRootHandle, universe) {
  if (!categoryRootHandle || !universe) return null;
  const names = appClearUniverseFolderNameCandidates(universe);
  for (const name of names) {
    const handle = await getExistingSubdirectoryForAppClear(categoryRootHandle, name);
    if (handle) return handle;
  }
  return null;
}

function appClearRecordHasFolderFile(record) {
  return !!(
    record &&
    record.folderFileName &&
    (!record.kind || record.kind !== "literatureGroup") &&
    record.fileType !== "group"
  );
}

async function deleteRecordFolderFilesForAppClear(records, folderHandle, label) {
  const result = appClearFolderResult(!!folderHandle);
  if (!folderHandle || !Array.isArray(records)) return result;

  const names = new Set();
  records.forEach((record) => {
    if (appClearRecordHasFolderFile(record)) names.add(record.folderFileName);
  });

  for (const name of names) {
    const removed = await removeEntryFromFolderForAppClear(
      folderHandle,
      name,
      {recursive: false},
      label,
    );
    mergeAppClearFolderResults(result, removed);
  }
  return result;
}

function readArchiveRecordsForAppClear(universeId) {
  try {
    return typeof readArchiveForUniverse === "function" ? readArchiveForUniverse(universeId) : [];
  } catch (e) {
    return [];
  }
}

function readLiteratureRecordsForAppClear(universeId) {
  try {
    return typeof (globalThis.controllerServices || globalThis).readLiteratureForUniverse === "function"
      ? (globalThis.controllerServices || globalThis).readLiteratureForUniverse(universeId)
      : [];
  } catch (e) {
    return [];
  }
}

function readVisionRecordsForAppClear(universeId) {
  try {
    return typeof (globalThis.controllerServices || globalThis).readVisionBoardForUniverse === "function"
      ? (globalThis.controllerServices || globalThis).readVisionBoardForUniverse(universeId)
      : [];
  } catch (e) {
    return [];
  }
}

async function deleteSavedUniverseFolderFilesOneToOneForAppClear(
  handles,
  universeList = savedUniversesSnapshotForAppClear(),
) {
  const result = appClearFolderResult(!!handles);
  if (!handles || !Array.isArray(universeList) || !universeList.length) return result;

  for (const universe of universeList) {
    if (!universe?.id) continue;

    const creationFolder = await getUniverseFolderForAppClear(handles.creationsRoot, universe);
    mergeAppClearFolderResults(
      result,
      await deleteRecordFolderFilesForAppClear(
        readArchiveRecordsForAppClear(universe.id),
        creationFolder,
        `${universe.title || "Universe"} creations`,
      ),
    );

    const literatureFolder = await getUniverseFolderForAppClear(handles.literatureRoot, universe);
    mergeAppClearFolderResults(
      result,
      await deleteRecordFolderFilesForAppClear(
        readLiteratureRecordsForAppClear(universe.id),
        literatureFolder,
        `${universe.title || "Universe"} literature`,
      ),
    );

    const imageFolder = await getUniverseFolderForAppClear(handles.imagesRoot, universe);
    mergeAppClearFolderResults(
      result,
      await deleteRecordFolderFilesForAppClear(
        readVisionRecordsForAppClear(universe.id),
        imageFolder,
        `${universe.title || "Universe"} images`,
      ),
    );
  }

  return result;
}

async function clearSavedUniverseBrowserDataOneByOneForAppClear(
  universeList = savedUniversesSnapshotForAppClear(),
  options = {},
) {
  const skipLargeData = !!options.skipLargeData;
  for (const universe of universeList) {
    const universeId = universe?.id;
    if (!universeId) continue;
    try {
      if (typeof removeMigratedLocalStorageValue === "function") {
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
        removeMigratedLocalStorageValue(
          visionStorageKey(universeId),
          oldVisionStorageKey(universeId),
        );
      }
      if (!skipLargeData && typeof (globalThis.controllerServices || globalThis).deleteUniverseLargeData === "function")
        await (globalThis.controllerServices || globalThis).deleteUniverseLargeData(universeId);
    } catch (e) {}
  }

  if (typeof universes !== "undefined" && Array.isArray(universes)) universes = [];
  if (Array.isArray(globalThis.universes)) globalThis.universes = [];
  if (typeof currentUniverseId !== "undefined") currentUniverseId = null;
}

async function prepareNativeWormholesFolderHandlesForAppClear() {
  const parentHandle =
    (typeof wormholesParentFolderHandle !== "undefined" && wormholesParentFolderHandle) ||
    (typeof previousWormholesSourceFolderHandle !== "undefined" &&
      previousWormholesSourceFolderHandle) ||
    (typeof (globalThis.controllerServices || globalThis).loadWormholesParentFolderHandle === "function"
      ? await (globalThis.controllerServices || globalThis).loadWormholesParentFolderHandle()
      : null);
  if (!parentHandle) return null;

  if (typeof (globalThis.controllerServices || globalThis).requestFolderPermission === "function") {
    const allowed = await (globalThis.controllerServices || globalThis).requestFolderPermission(parentHandle, "readwrite");
    if (!allowed) {
      const result = appClearFolderResult(true);
      result.failures.push({
        name: parentHandle.name || "local folder",
        label: "local folder",
        error: dataPortabilityError(
          "WORMHOLES_FOLDER_PERMISSION",
          "Local folder permission was not granted.",
        ),
      });
      return {permissionDenied: true, result};
    }
  }

  if (typeof wormholesParentFolderHandle !== "undefined")
    wormholesParentFolderHandle = parentHandle;

  if (typeof prepareWormholesFolderHandles === "function") {
    try {
      await prepareWormholesFolderHandles({requestPermission: true});
    } catch (e) {}
  }

  let rootHandle =
    (typeof wormholesRootFolderHandle !== "undefined" && wormholesRootFolderHandle) || null;
  if (!rootHandle) {
    const parentIsWormholesRoot =
      parentHandle.name === "Wormholes" ||
      (typeof (globalThis.controllerServices || globalThis).folderHasCategoryDirectories === "function" &&
        (await (globalThis.controllerServices || globalThis).folderHasCategoryDirectories(parentHandle))) ||
      (typeof folderHasManagedMarker === "function" &&
        (await folderHasManagedMarker(parentHandle)));
    rootHandle = parentIsWormholesRoot
      ? parentHandle
      : await getExistingSubdirectoryForAppClear(parentHandle, "Wormholes");
  }
  if (!rootHandle) return null;

  const literatureRoot =
    (typeof wormholesLiteratureRootHandle !== "undefined" && wormholesLiteratureRootHandle) ||
    (await getExistingSubdirectoryForAppClear(rootHandle, "Literature"));
  const imagesRoot =
    (typeof wormholesImagesRootHandle !== "undefined" && wormholesImagesRootHandle) ||
    (await getExistingSubdirectoryForAppClear(rootHandle, "Images"));
  const creationsRoot =
    (typeof wormholesCreationsRootHandle !== "undefined" && wormholesCreationsRootHandle) ||
    (await getExistingSubdirectoryForAppClear(rootHandle, "Creations"));

  if (typeof wormholesRootFolderHandle !== "undefined") wormholesRootFolderHandle = rootHandle;
  if (typeof wormholesLiteratureRootHandle !== "undefined")
    wormholesLiteratureRootHandle = literatureRoot;
  if (typeof wormholesImagesRootHandle !== "undefined") wormholesImagesRootHandle = imagesRoot;
  if (typeof wormholesCreationsRootHandle !== "undefined")
    wormholesCreationsRootHandle = creationsRoot;

  return {root: rootHandle, literatureRoot, imagesRoot, creationsRoot};
}

async function clearKnownCategoryRootsForAppClear(handles) {
  const result = appClearFolderResult(!!handles);
  if (!handles) return result;

  for (const [name, handle] of [
    ["Creations", handles.creationsRoot],
    ["Literature", handles.literatureRoot],
    ["Images", handles.imagesRoot],
  ]) {
    if (!handle) continue;
    const cleared = await clearDirectoryContentsForAppClear(handle, `${name} folder`);
    mergeAppClearFolderResults(result, cleared);
    if (handles.root) {
      const removed = await removeEntryFromFolderForAppClear(
        handles.root,
        name,
        {recursive: false},
        "Wormholes local folder",
      );
      mergeAppClearFolderResults(result, removed);
    }
  }

  if (handles.root) {
    const managedMarkerName =
      typeof WORMHOLES_MANAGED_MARKER !== "undefined"
        ? WORMHOLES_MANAGED_MARKER
        : ".wormholes-managed.json";
    for (const fileName of [managedMarkerName, WORMHOLES_BACKUP_MANIFEST_FILE]) {
      const removedFile = await removeEntryFromFolderForAppClear(
        handles.root,
        fileName,
        {recursive: false},
        "Wormholes local folder",
      );
      mergeAppClearFolderResults(result, removedFile);
    }

    for await (const [name, handle] of handles.root.entries?.() || []) {
      if (
        typeof (globalThis.controllerServices || globalThis).isIgnorableFolderSyncArtifact === "function" &&
        (globalThis.controllerServices || globalThis).isIgnorableFolderSyncArtifact(name)
      )
        continue;
      const removed = await removeEntryFromFolderForAppClear(
        handles.root,
        name,
        {recursive: handle?.kind === "directory"},
        "Wormholes local folder",
      );
      mergeAppClearFolderResults(result, removed);
    }
  }

  return result;
}

async function clearOriginPrivateFileSystemDirectory() {
  if (!navigator.storage?.getDirectory) return false;
  try {
    const root = await navigator.storage.getDirectory();
    return await clearDirectoryContentsForAppClear(root, "browser-local folder");
  } catch (e) {
    if (!window.__wormholesClearingAppData) {
      reportAppError("Could not clear browser-local folder data", e, {
        userMessage: "Browser-local folder data could not be fully cleared.",
      });
    }
    throw e;
  }
}

async function clearConnectedNativeWormholesFolderData() {
  if (
    typeof (globalThis.controllerServices || globalThis).localFolderNativeApiSupported !== "function" ||
    !(globalThis.controllerServices || globalThis).localFolderNativeApiSupported()
  )
    return appClearFolderResult(false);

  const savedMode =
    typeof (globalThis.controllerServices || globalThis).loadLocalFolderStorageMode === "function"
      ? (globalThis.controllerServices || globalThis).loadLocalFolderStorageMode()
      : typeof localFolderStorageMode === "string"
        ? localFolderStorageMode
        : "native";
  if (savedMode === "opfs") return appClearFolderResult(false);

  const handles = await prepareNativeWormholesFolderHandlesForAppClear();
  if (!handles) return appClearFolderResult(false);
  if (handles.permissionDenied) return handles.result || appClearFolderResult(true);

  const result = appClearFolderResult(true);
  const universesToClear = savedUniversesSnapshotForAppClear();

  // First, mirror normal item deletion by removing every known record file by its exact stored file name.
  mergeAppClearFolderResults(
    result,
    await deleteSavedUniverseFolderFilesOneToOneForAppClear(handles, universesToClear),
  );

  // Then sweep the managed category roots for orphaned universe folders/files that no longer have app records.
  mergeAppClearFolderResults(result, await clearKnownCategoryRootsForAppClear(handles));

  return result;
}

async function clearLocalFolderDataForAppClear() {
  const mode =
    typeof (globalThis.controllerServices || globalThis).loadLocalFolderStorageMode === "function"
      ? (globalThis.controllerServices || globalThis).loadLocalFolderStorageMode()
      : typeof localFolderStorageMode === "string"
        ? localFolderStorageMode
        : "native";
  if (mode === "opfs") {
    return await clearOriginPrivateFileSystemDirectory();
  }
  const nativeResult = await clearConnectedNativeWormholesFolderData();
  if (nativeResult.attempted) return nativeResult;
  if (
    typeof (globalThis.controllerServices || globalThis).localFolderPrivateStorageSupported === "function" &&
    (globalThis.controllerServices || globalThis).localFolderPrivateStorageSupported()
  )
    return await clearOriginPrivateFileSystemDirectory();
  return appClearFolderResult(false);
}

function clearWormholesSessionStorageKeys() {
  if (typeof sessionStorage === "undefined") return;
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && shouldClearWormholesStorageKey(key)) keys.push(key);
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch (e) {}
}

async function clearAllWormholesAppData(options = {}) {
  window.__wormholesClearingAppData = true;
  const deferCleanup = !!options.deferCleanup;
  const preserveFolderConnection = !!(
    typeof localFoldersEnabled !== "undefined" && localFoldersEnabled
  );
  const preservedFolderMode =
    typeof localFolderStorageMode !== "undefined" ? localFolderStorageMode : "native";
  const universesToClear = savedUniversesSnapshotForAppClear();
  const summary = {
    localFolder: appClearFolderResult(false),
    warnings: [],
    preservedFolderConnection: preserveFolderConnection,
    finalize: null,
  };

  if (!deferCleanup) {
    try {
      summary.localFolder = await clearLocalFolderDataForAppClear();
      const folderWarning = folderClearFailureMessage(summary.localFolder);
      if (folderWarning) summary.warnings.push(folderWarning);
    } catch (e) {
      summary.warnings.push(e?.message || "Browser blocked some local-folder deletes.");
    }

    await clearLargeAppDataStore();
    if (!preserveFolderConnection) {
      await clearStoredFolderHandleDatabases();
      if (typeof (globalThis.controllerServices || globalThis).clearWormholesFolderHandles === "function")
        (globalThis.controllerServices || globalThis).clearWormholesFolderHandles();
    }
  }

  if (typeof localFoldersEnabled !== "undefined") localFoldersEnabled = preserveFolderConnection;
  if (typeof localFolderPendingSync !== "undefined") localFolderPendingSync = false;
  if (typeof localFolderRestoreInProgress !== "undefined") localFolderRestoreInProgress = false;
  if (typeof localFolderSwitchInProgress !== "undefined") localFolderSwitchInProgress = false;
  if (typeof localFolderStorageMode !== "undefined")
    localFolderStorageMode = preserveFolderConnection ? preservedFolderMode : "native";
  await clearSavedUniverseBrowserDataOneByOneForAppClear(universesToClear, {
    skipLargeData: deferCleanup,
  });
  clearWormholesLocalStorageKeys({preserveFolderConnection});
  if (preserveFolderConnection) {
    const normalizedPreservedFolderMode =
      typeof (globalThis.controllerServices || globalThis).normalizeLocalFolderStorageMode === "function"
        ? (globalThis.controllerServices || globalThis).normalizeLocalFolderStorageMode(preservedFolderMode)
        : preservedFolderMode || "native";
    saveLocalStorageText(
      WORMHOLES_LOCAL_ENABLED_KEY,
      "true",
      "Could not preserve folder-mode setting",
      "Folder setting could not be saved.",
    );
    saveLocalStorageText(
      WORMHOLES_LOCAL_MODE_KEY,
      normalizedPreservedFolderMode,
      "Could not preserve folder storage mode",
      "Folder setting could not be saved.",
    );
    removeLocalStorageKey(OLD_WORMHOLES_LOCAL_ENABLED_KEY);
    removeLocalStorageKey(OLD_WORMHOLES_LOCAL_MODE_KEY);
  }
  clearWormholesSessionStorageKeys();
  if (typeof archiveEntries !== "undefined") archiveEntries = [];
  if (typeof literatureEntries !== "undefined") literatureEntries = [];
  if (typeof visionEntries !== "undefined") visionEntries = [];
  if (typeof connectionNotes !== "undefined") connectionNotes = {};
  if (typeof bridgeNotes !== "undefined") bridgeNotes = {};

  if (deferCleanup) {
    summary.finalize = async () => {
      window.__wormholesClearingAppData = true;
      try {
        summary.localFolder = await clearLocalFolderDataForAppClear();
        const folderWarning = folderClearFailureMessage(summary.localFolder);
        if (folderWarning) summary.warnings.push(folderWarning);
      } catch (e) {
        summary.warnings.push(e?.message || "Browser blocked some local-folder deletes.");
      }
      await clearLargeAppDataStore();
      if (!preserveFolderConnection) {
        await clearStoredFolderHandleDatabases();
        if (typeof (globalThis.controllerServices || globalThis).clearWormholesFolderHandles === "function")
          (globalThis.controllerServices || globalThis).clearWormholesFolderHandles();
      }
      window.__wormholesClearingAppData = false;
    };
    window.__wormholesClearingAppData = false;
  }
  return summary;
}

async function performClearAppDataFromConfirm() {
  const confirm = document.getElementById("confirmClearAppDataBtn");
  const cancel = document.getElementById("cancelClearAppDataBtn");
  const title = document.getElementById("clearAppDataConfirmTitle");
  const text = document.getElementById("clearAppDataConfirmText");
  const detail = document.getElementById("clearAppDataConfirmDetail");
  let journalTransaction = null;
  let clearStarted = false;
  if (confirm) {
    confirm.disabled = true;
    confirm.textContent = "Clearing…";
  }
  if (cancel) cancel.disabled = true;
  if (title) title.textContent = "Clearing app data…";
  if (text) text.textContent = "Wormholes is clearing the data stored in this browser.";
  if (detail)
    detail.textContent =
      "A restore option will be available from the notification and Recent Activity when clearing is complete.";

  try {
    if (!window.WormholesSnapshots?.preserveEmergencySnapshotBeforeClearData) {
      throw new Error(
        "Restore Point storage is unavailable. Download Backup before deleting data.",
      );
    }
    const undoState = window.WormholesUndo?.captureState?.();
    if (detail) detail.textContent = "Saving an emergency restore point before deleting data…";
    const emergencySnapshot =
      await window.WormholesSnapshots.preserveEmergencySnapshotBeforeClearData();
    if (!emergencySnapshot?.id) {
      throw new Error("The emergency restore point could not be verified. Nothing was deleted.");
    }
    if (window.WormholesWriteAheadJournal) {
      journalTransaction = await window.WormholesWriteAheadJournal.begin({
        operation: "clear-app-data",
        label: "Clear app data",
        rollbackSnapshotId: emergencySnapshot.id,
        additionalUniverses: emergencySnapshot.data?.universes || [],
      });
      await window.WormholesWriteAheadJournal.markPhase(
        journalTransaction,
        "clearing-browser-stores",
      );
    }
    if (detail) detail.textContent = "Restore point saved. Deleting browser app data now…";
    const canUndo = !!(window.WormholesUndo && undoState);
    clearStarted = true;
    const summary = await clearAllWormholesAppData({deferCleanup: canUndo});

    closeClearAppDataConfirmModal();
    try {
      (globalThis.controllerServices || globalThis).showHomeScreen();
    } catch (error) {}
    try {
      (globalThis.controllerServices || globalThis).renderUniverseArchiveList();
    } catch (error) {}
    try {
      renderCurrent();
    } catch (error) {}

    if (canUndo) {
      if (journalTransaction) {
        await window.WormholesUndo.offer({
          message: "App data cleared",
          restoredMessage: "App data restored",
          undo: async () => {
            const restored = await window.WormholesUndo.restoreState(undoState);
            if (restored && journalTransaction) {
              await window.WormholesWriteAheadJournal.discardAfterRollback(journalTransaction);
              journalTransaction = null;
            }
            return restored;
          },
          finalize: async () => {
            await summary.finalize?.();
            if (journalTransaction) {
              await window.WormholesWriteAheadJournal.markPhase(
                journalTransaction,
                "cleanup-complete",
              );
              await window.WormholesWriteAheadJournal.commit(journalTransaction);
              journalTransaction = null;
            }
            setTimeout(() => window.location.reload(), 0);
          },
        });
      } else {
        await window.WormholesUndo.offer({
          message: "App data cleared",
          restoredMessage: "App data restored",
          state: undoState,
          finalize: async () => {
            await summary.finalize?.();
            setTimeout(() => window.location.reload(), 0);
          },
        });
      }
      (globalThis.controllerServices || globalThis).setSettingsStatus(
        "App data cleared. Choose Undo within eight seconds to restore it.",
      );
    } else {
      if (journalTransaction) {
        await window.WormholesWriteAheadJournal.markPhase(journalTransaction, "cleanup-complete");
        await window.WormholesWriteAheadJournal.commit(journalTransaction);
        journalTransaction = null;
      }
      const warning = summary?.warnings?.[0] || "";
      showSavedToast("App data cleared");
      setTimeout(() => window.location.reload(), warning ? 1600 : 900);
    }
  } catch (e) {
    window.__wormholesClearingAppData = false;
    if (journalTransaction) {
      try {
        if (clearStarted) {
          await window.WormholesWriteAheadJournal.rollback(journalTransaction, {
            applyRuntime: true,
          });
          if (typeof renderAfterWormholesAppDataImport === "function")
            await renderAfterWormholesAppDataImport();
        } else {
          await window.WormholesWriteAheadJournal.discardAfterRollback(journalTransaction);
        }
        journalTransaction = null;
      } catch (rollbackError) {
        console.error("Clear Data journal rollback failed", rollbackError);
      }
    }
    if (title) title.textContent = "Could not clear app data";
    if (text) text.textContent = "Wormholes could not clear the browser app data.";
    if (detail) detail.textContent = e?.message || "Try again.";
    if (confirm) {
      confirm.disabled = false;
      confirm.textContent = "Try Again";
    }
    if (cancel) cancel.disabled = false;
    clearAppDataConfirmStep = 2;
  }
}

function proceedClearAppDataConfirm() {
  if (clearAppDataConfirmStep === 1) {
    setClearAppDataConfirmStep(2);
    setTimeout(() => document.getElementById("confirmClearAppDataBtn")?.focus(), 0);
    return;
  }
  performClearAppDataFromConfirm();
}

/* Public controller surface for served ES-module builds. */
const DATA_PORTABILITY_CONTROLLER_API = Object.freeze({
  wormholesSourceSchemaVersion,
  assertSupportedWormholesSchemaVersion,
  migrateWormholesAppDataImport,
  pickNativeDirectory,
  delay,
  handlesAreSameEntry,
  copyDirectoryContents,
  readManagedFolderMarkerJson,
  titleFromUniverseFolderName,
  selectedFolderAsWormholesRoot,
  backupUniverseKeyFromFolder,
  ensureBackupUniverseRecord,
  collectBackupUniverseFolders,
  textFromBackupFile,
  backupTextLineValue,
  backupTextSection,
  creationEntryFromBackupFileText,
  readBackupCreationsForUniverse,
  readBackupImagesForUniverse,
  readWormholesBackupManifest,
  restoreAppStateFromAppDataManifest,
  prepareAppStateFromLocalBackupFolder,
  rebuildAppStateFromLocalBackupFolder,
  formatLocalFolderRestoreSummary,
  createBackupFromSettings,
  getActiveWormholesTabName,
  captureFolderRestoreReturnView,
  restoreVisibleScreenAfterFolderRestore,
  captureLocalFolderStateForBackupRestore,
  restoreLocalFolderStateAfterFailedBackupRestore,
  simpleBackupFolderRestoreFailureMessage,
  restoreBackupFromSettings,
  cloneForAppDataExport,
  normalizeImportedTags,
  flushPendingLargeDataForAppDataExport,
  folderFileForAppDataExport,
  summarizeWormholesAppDataExport,
  formatWormholesAppDataExportSummary,
  normalizeAppDataReviewSummary,
  appDataReviewRows,
  renderAppDataImportReview,
  appDataImportReviewWarning,
  buildWormholesAppDataExport,
  wormholesExportFileName,
  isWormholesSafeDownloadElement,
  downloadJsonFile,
  openAppDataExportSummaryModal,
  closeAppDataExportSummaryModal,
  exportAppDataFromSettings,
  closeAppDataImportConfirmModal,
  confirmAppDataImportOverwrite,
  importAppDataFromSettings,
  wormholesImportPlainObject,
  malformedWormholesImportError,
  assertWormholesImportShape,
  validateOptionalImportString,
  validateImportStringArray,
  validateImportBridge,
  validateImportBridgeList,
  validateImportTags,
  validateImportValueCell,
  validateImportNotes,
  validateImportUniverseRecord,
  validateImportArchiveRecord,
  validateImportLiteratureRecord,
  validateImportVisionRecord,
  validateImportThemeDeck,
  validateImportThemeState,
  validateWormholesAppDataStructure,
  validateWormholesAppDataImport,
  sanitizeImportedRichTextBeforeStaging,
  appDataKeysForUniverse,
  removeStoredAppKey,
  clearExistingAppDataBeforeImport,
  prepareWormholesAppDataImport,
  writePreparedWormholesAppDataImport,
  applyPreparedWormholesAppDataToRuntime,
  renderAfterWormholesAppDataImport,
  appDataImportFailureReport,
  showActionableAppDataImportFailure,
  simpleAppDataImportFailureMessage,
  preflightAppDataStorageCapacity,
  restoreImportedAppDataToLocalFolderIfPossible,
  applyWormholesAppDataImport,
  handleAppDataImportFile,
  setClearAppDataConfirmStep,
  openClearAppDataConfirmModal,
  closeClearAppDataConfirmModal,
  shouldClearWormholesStorageKey,
  clearWormholesLocalStorageKeys,
  clearLargeAppDataStore,
  clearStoredFolderHandleDatabases,
  appClearFolderResult,
  mergeAppClearFolderResults,
  folderClearFailureMessage,
  removeEntryFromFolderForAppClear,
  clearDirectoryContentsForAppClear,
  removeNamedDirectoryAfterContentsForAppClear,
  clearWormholesManagedRootFolderData,
  savedUniversesSnapshotForAppClear,
  appClearUniverseFolderNameCandidates,
  getExistingSubdirectoryForAppClear,
  getUniverseFolderForAppClear,
  appClearRecordHasFolderFile,
  deleteRecordFolderFilesForAppClear,
  readArchiveRecordsForAppClear,
  readLiteratureRecordsForAppClear,
  readVisionRecordsForAppClear,
  deleteSavedUniverseFolderFilesOneToOneForAppClear,
  clearSavedUniverseBrowserDataOneByOneForAppClear,
  prepareNativeWormholesFolderHandlesForAppClear,
  clearKnownCategoryRootsForAppClear,
  clearOriginPrivateFileSystemDirectory,
  clearConnectedNativeWormholesFolderData,
  clearLocalFolderDataForAppClear,
  clearWormholesSessionStorageKeys,
  clearAllWormholesAppData,
  performClearAppDataFromConfirm,
  proceedClearAppDataConfirm,
});
(globalThis.registerControllerServices || (() => {}))(DATA_PORTABILITY_CONTROLLER_API);
