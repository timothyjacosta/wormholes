/* Wormholes Beta 261 — Local-folder backup creation, reconstruction, and restore workflows.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

import {controllerServices} from "./controller-service-registry.mjs";
import importedAppErrorsApi from "./app-errors.mjs";

const DATA_PORTABILITY_BACKUP_MANIFEST_FILE = "wormholes-app-data-backup.json";

function backupWorkflowError(code, message, options = {}) {
  const appErrors =
    typeof importedAppErrorsApi !== "undefined" ? importedAppErrorsApi : window.WormholesAppErrors;
  if (appErrors?.createError) return appErrors.createError(code, message, options);
  return Object.assign(new Error(message), {code, ...options});
}

async function pickNativeDirectory() {
  if (!controllerServices.localFolderNativeApiSupported()) {
    throw backupWorkflowError(
      "WORMHOLES_FOLDER_UNAVAILABLE",
      "Folder picker is unavailable in this browser.",
    );
  }
  const handle = await window.showDirectoryPicker({mode: "readwrite", startIn: "desktop"});
  if (!(await controllerServices.requestFolderPermission(handle))) {
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
      await controllerServices.writeBlobToFolder(destinationHandle, name, file);
    } else if (handle.kind === "directory") {
      const nextDestination = await controllerServices.getOrCreateDirectory(
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
  return cleaned || controllerServices.fileTitleFromName(folderName) || "Restored Universe";
}

async function selectedFolderAsWormholesRoot(selectedHandle) {
  if (!selectedHandle) return null;
  if (await controllerServices.folderHasCategoryDirectories(selectedHandle)) return selectedHandle;
  try {
    const child = await selectedHandle.getDirectoryHandle("Wormholes", {create: false});
    if (await controllerServices.folderHasCategoryDirectories(child)) return child;
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
        controllerServices.shouldSkipFolderPruneEntry(folderName)
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
      : controllerServices.fileTitleFromName(fileName);
  const type = backupTextLineValue(text, "Type");
  const what = backupTextLineValue(text, "What") || type || "Restored Creation";
  const attr1 = backupTextLineValue(text, "Attribute");
  const allAttrMatches = Array.from(String(text || "").matchAll(/^Attribute\s*:\s*(.*)$/gim))
    .map((match) => match[1].trim())
    .filter(Boolean);
  const attr2 = allAttrMatches[1] || "Restored from folder backup";
  const story = backupTextLineValue(text, "Story") || "Restored from local folder backup.";
  const summary = backupTextSection(text, "Summary");
  return controllerServices.normalizeSchemaArchiveEntry({
    id: makeId(),
    title: title || controllerServices.fileTitleFromName(fileName) || "Restored Creation",
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
    if (handle.kind !== "file" || controllerServices.shouldSkipFolderPruneEntry(fileName)) continue;
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
    if (handle.kind !== "file" || controllerServices.shouldSkipFolderPruneEntry(fileName)) continue;
    if (!/\.(jpe?g|png)$/i.test(fileName)) continue;
    const file = await handle.getFile();
    window.WormholesFileLimits?.assertFile?.(file, "backupImage", {label: "backup image"});
    let thumbnailDataUrl = "";
    try {
      thumbnailDataUrl = await controllerServices.imageFileToThumbnailDataUrl(file);
    } catch (e) {}
    items.push(
      controllerServices.normalizeImportedVisionItem(
        {
          id: makeId(),
          title: controllerServices.fileTitleFromName(fileName),
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

  if (!(await controllerServices.requestFolderPermission(rootHandle, "read"))) {
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
    controllerServices.normalizeSchemaUniverse({
      id: record.id || makeId(),
      title: record.title || "Restored Universe",
      summary: "",
      bridges: [],
      createdAt: record.createdAt || new Date().toISOString(),
      diskFolderName: record.diskFolderName || controllerServices.stableUniverseFolderName(record),
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
    const literature = await controllerServices.readBackupLiteratureForUniverse({
      ...record,
      id: universe.id,
    });
    const vision = await readBackupImagesForUniverse({...record, id: universe.id});

    summary.creations += archive.filter((entry) => !controllerServices.isGroupEntry(entry)).length;
    summary.literature += literature.filter(
      (doc) => !controllerServices.isLiteratureGroup(doc),
    ).length;
    summary.literatureWithText += literature.filter(
      (doc) =>
        !controllerServices.isLiteratureGroup(doc) &&
        controllerServices.literaturePlainPreview(doc.content || ""),
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
  controllerServices.setSettingsStatus("Choose a folder for the backup copy.");
  try {
    if (!localFoldersEnabled) {
      throw backupWorkflowError("WORMHOLES_FOLDER_PERMISSION", "Turn on local folder first.");
    }
    if (!wormholesParentFolderHandle) {
      wormholesParentFolderHandle = await controllerServices.loadWormholesParentFolderHandle();
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
          controllerServices.writeBlobToFolder(
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
    controllerServices.setSettingsStatus(
      `Backup folder created: ${formatWormholesAppDataExportSummary(appDataManifest.exportSummary)}.`,
    );
    requestStorageFootnoteUpdate();
  } catch (error) {
    if (error?.name !== "AbortError") window.WormholesBackupStatus?.recordFailure?.("folder");
    if (error?.name === "AbortError") {
      controllerServices.setSettingsStatus("");
      return;
    }
    controllerServices.setSettingsStatus(
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
  if (typeof controllerServices.renderUniverseArchiveList === "function")
    controllerServices.renderUniverseArchiveList();

  if (returnView?.homeActive || !returnView?.appActive) {
    controllerServices.showHomeScreen();
    return;
  }

  controllerServices.showAppScreen();
  switchTab(returnView?.tabName || "current");

  if (returnView?.tabName === "archive" && returnView.archiveConnectionsActive) {
    controllerServices.showConnectionsScreen();
  }

  if (
    returnView?.tabName === "literature" &&
    returnView.literatureEditorActive &&
    returnView.literatureDocId
  ) {
    const docStillExists = !!controllerServices.getLiteratureDoc(returnView.literatureDocId);
    if (docStillExists) {
      await controllerServices.showLiteratureEditorScreen(returnView.literatureDocId);
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
    controllerServices.saveLocalFolderStorageMode(state.localFolderStorageMode);
  } catch (e) {}
  try {
    if (state.parentHandle)
      await controllerServices.saveWormholesParentFolderHandle(state.parentHandle);
    else if (typeof controllerServices.removeWormholesParentFolderHandle === "function")
      await controllerServices.removeWormholesParentFolderHandle();
  } catch (e) {}
  try {
    controllerServices.saveLocalFolderEnabled();
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

  controllerServices.setSettingsStatus("Choose a Wormholes backup folder to restore from.");
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
        controllerServices.setSettingsStatus(
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
      controllerServices.setSettingsStatus("Restore canceled. Nothing was changed.");
      controllerServices.updateLocalFolderCheckboxes();
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
    controllerServices.clearWormholesFolderHandles();
    wormholesParentFolderHandle = selectedHandle;
    localFoldersEnabled = true;
    localFolderPendingSync = false;
    localFolderSwitchInProgress = false;
    controllerServices.saveLocalFolderStorageMode("native");

    const ready = await prepareWormholesFolderHandles({requestPermission: true});
    if (!ready)
      throw backupWorkflowError(
        "WORMHOLES_FOLDER_READ",
        "The backup folder could not be made active.",
      );

    await controllerServices.saveWormholesParentFolderHandle(selectedHandle);
    controllerServices.saveLocalFolderEnabled();

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
    controllerServices.loadLiteratureFromStorage();
    controllerServices.loadVisionBoardFromStorage();

    if (currentUniverseId) {
      const currentUniverseLabel = document.getElementById("currentUniverseLabel");
      if (currentUniverseLabel)
        currentUniverseLabel.textContent = controllerServices.getCurrentUniverse()?.title || "";
      restoreFolderHandlesForCurrentUniverse();
      renderCurrent();
      controllerServices.renderArchive();
      controllerServices.renderLiteratureList();
      await controllerServices.renderVisionBoard();
      await restoreVisibleScreenAfterFolderRestore(returnView);
    } else {
      controllerServices.showHomeScreen();
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
            currentUniverseLabel.textContent = controllerServices.getCurrentUniverse()?.title || "";
          await renderAfterWormholesAppDataImport();
          await restoreVisibleScreenAfterFolderRestore(returnView);
          requestStorageFootnoteUpdate();
          return true;
        },
      });
    } else {
      showSavedToast("Backup folder restored");
    }
    controllerServices.setSettingsStatus(
      `Backup folder restored: ${formatLocalFolderRestoreSummary(restored.summary)}.`,
    );
  } catch (e) {
    if (e?.name === "AbortError") {
      controllerServices.setSettingsStatus("");
      controllerServices.updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_DUPLICATE_ID") {
      window.WormholesIdIntegrity?.showDialog?.(e.idIntegrityResult);
      controllerServices.setSettingsStatus(
        "Restore did not start because the backup contains duplicate internal IDs. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      controllerServices.updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_BROKEN_REFERENCE") {
      window.WormholesReferenceIntegrity?.showDialog?.(e.referenceIntegrityResult);
      controllerServices.setSettingsStatus(
        "Restore did not start because some linked items are missing or inconsistent. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      controllerServices.updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_ENTITY_LIMIT_EXCEEDED") {
      window.WormholesEntityLimits?.showDialog?.(e.entityLimitResult);
      controllerServices.setSettingsStatus(
        "Restore did not start because the backup exceeds a supported Wormholes entity limit. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      controllerServices.updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_STRING_TOO_LONG" || e?.code === "WORMHOLES_NESTING_TOO_DEEP") {
      window.WormholesContentLimits?.showDialog?.(e.contentLimitResult);
      controllerServices.setSettingsStatus(
        "Restore did not start because the backup exceeds a supported text or nesting-depth limit. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      controllerServices.updateLocalFolderCheckboxes();
      return;
    }

    if (
      e?.code === "WORMHOLES_EMBEDDED_MEDIA_TOO_LARGE" ||
      e?.code === "WORMHOLES_EMBEDDED_MEDIA_INVALID"
    ) {
      window.WormholesMediaLimits?.showDialog?.(e.mediaLimitResult);
      controllerServices.setSettingsStatus(
        "Restore did not start because the backup contains unsupported or oversized embedded media. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      controllerServices.updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_UNSAFE_URL") {
      window.WormholesUrlSafety?.showDialog?.(e.urlSafetyResult, {importing: true});
      controllerServices.setSettingsStatus(
        "Restore did not start because the backup contains an unsafe link. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      controllerServices.updateLocalFolderCheckboxes();
      return;
    }

    if (e?.code === "WORMHOLES_FILE_TOO_LARGE") {
      window.WormholesFileLimits?.showDialog?.(e.fileLimitResult, {
        label: e.fileLimitResult?.label || "backup file",
      });
      controllerServices.setSettingsStatus(
        "Restore did not start because a backup file exceeds Wormholes’ size limit. Nothing was changed.",
      );
      showSavedToast("Restore did not start");
      controllerServices.updateLocalFolderCheckboxes();
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
          currentUniverseLabel.textContent = controllerServices.getCurrentUniverse()?.title || "";
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
      controllerServices.setSettingsStatus(
        "Restore failed, and recovery was incomplete. Keep this tab open and use your latest backup.",
      );
      showSavedToast("Restore failed — use your latest backup");
    } else if (rollbackSucceeded) {
      controllerServices.setSettingsStatus("Restore failed. Your previous data was restored.");
      showSavedToast("Restore failed — previous data restored");
    } else {
      const message = simpleBackupFolderRestoreFailureMessage(e);
      controllerServices.setSettingsStatus(message);
      showSavedToast("Restore failed");
    }
    controllerServices.updateLocalFolderCheckboxes();
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

export function installLegacyDataPortabilityBackupHelpersBindings(target = globalThis) {
  Object.assign(target, DATA_PORTABILITY_BACKUP_HELPERS_API);
  target.WormholesDataPortabilityBackupHelpers = DATA_PORTABILITY_BACKUP_HELPERS_API;
  return DATA_PORTABILITY_BACKUP_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyDataPortabilityBackupHelpersBindings(window);

export {
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
};
