/* GENERATED from scripts/modules/folder-storage-controller.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 folder-storage repository module.
   Contains local-folder mode, handle persistence, folder/file helpers, folder pruning helpers, and folder-backed record utilities split from wormholes-app.js. */

function localFolderNativeApiSupported() {
  return !!(window.showDirectoryPicker && window.indexedDB);
}

function localFolderPrivateStorageSupported() {
  return !!(navigator.storage && navigator.storage.getDirectory);
}

function normalizeLocalFolderStorageMode(mode) {
  return mode === "opfs" ? "opfs" : "native";
}

function loadLocalFolderStorageMode() {
  try {
    localFolderStorageMode = normalizeLocalFolderStorageMode(
      readMigratedLocalStorageValue(WORMHOLES_LOCAL_MODE_KEY, OLD_WORMHOLES_LOCAL_MODE_KEY) ||
        "native",
    );
  } catch (e) {
    localFolderStorageMode = "native";
  }

  if (localFolderStorageMode === "opfs" && !localFolderPrivateStorageSupported()) {
    localFolderStorageMode = "native";
  }

  if (
    localFolderStorageMode === "native" &&
    !localFolderNativeApiSupported() &&
    localFolderPrivateStorageSupported()
  ) {
    localFolderStorageMode = "opfs";
  }

  return localFolderStorageMode;
}

function saveLocalFolderStorageMode(mode = localFolderStorageMode) {
  localFolderStorageMode = normalizeLocalFolderStorageMode(mode);
  if (
    saveLocalStorageText(
      WORMHOLES_LOCAL_MODE_KEY,
      localFolderStorageMode,
      "Could not save folder storage mode",
      "Folder setting could not be saved.",
    )
  ) {
    removeLocalStorageKey(OLD_WORMHOLES_LOCAL_MODE_KEY);
  }
  return localFolderStorageMode;
}

function localFolderUsesPrivateStorage() {
  return loadLocalFolderStorageMode() === "opfs";
}

function openFolderHandlesDb(dbName = FOLDER_HANDLES_DB) {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FOLDER_HANDLES_STORE)) {
        db.createObjectStore(FOLDER_HANDLES_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Could not open folder handle storage."));
  });
}

async function saveFolderHandleByKeyToDb(dbName, key, handle) {
  const db = await openFolderHandlesDb(dbName);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOLDER_HANDLES_STORE, "readwrite");
    tx.objectStore(FOLDER_HANDLES_STORE).put(handle, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("Could not save the folder handle."));
  });
}

async function loadFolderHandleByKeyFromDb(dbName, key) {
  const db = await openFolderHandlesDb(dbName);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOLDER_HANDLES_STORE, "readonly");
    const request = tx.objectStore(FOLDER_HANDLES_STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Could not load the folder handle."));
  });
}

async function removeFolderHandleByKeyFromDb(dbName, key) {
  const db = await openFolderHandlesDb(dbName);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOLDER_HANDLES_STORE, "readwrite");
    tx.objectStore(FOLDER_HANDLES_STORE).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("Could not remove the folder handle."));
  });
}

async function saveFolderHandleByKey(key, handle) {
  let saved = false;
  let lastError = null;
  for (const dbName of FOLDER_HANDLE_DATABASES) {
    try {
      await saveFolderHandleByKeyToDb(dbName, key, handle);
      saved = true;
    } catch (e) {
      lastError = e;
    }
  }
  if (!saved && lastError) throw lastError;
  return saved;
}

async function loadFolderHandleByKey(key) {
  for (const dbName of FOLDER_HANDLE_DATABASES) {
    try {
      const saved = await loadFolderHandleByKeyFromDb(dbName, key);
      if (saved) {
        // Best-effort mirror so future builds can find the same handle. Do not delete the source.
        FOLDER_HANDLE_DATABASES.forEach((otherDbName) => {
          if (otherDbName !== dbName) {
            saveFolderHandleByKeyToDb(otherDbName, key, saved).catch(() => {});
          }
        });
        return saved;
      }
    } catch (e) {}
  }
  return null;
}

async function removeFolderHandleByKey(key) {
  let removed = false;
  for (const dbName of FOLDER_HANDLE_DATABASES) {
    try {
      await removeFolderHandleByKeyFromDb(dbName, key);
      removed = true;
    } catch (e) {}
  }
  return removed;
}

async function saveFolderHandle(kind, handle) {
  return saveFolderHandleByKey(folderHandleKey(kind), handle);
}

async function loadFolderHandle(kind) {
  return loadFolderHandleByKey(folderHandleKey(kind));
}

async function removeFolderHandle(kind) {
  return removeFolderHandleByKey(folderHandleKey(kind));
}

async function saveWormholesParentFolderHandle(handle) {
  if (localFolderUsesPrivateStorage()) {
    saveLocalFolderStorageMode("opfs");
    return true;
  }
  saveLocalFolderStorageMode("native");
  return saveFolderHandleByKey(WORMHOLES_PARENT_HANDLE_KEY, handle);
}

async function loadWormholesParentFolderHandle() {
  loadLocalFolderStorageMode();
  if (localFolderStorageMode === "opfs" && localFolderPrivateStorageSupported()) {
    try {
      return await navigator.storage.getDirectory();
    } catch (e) {
      return null;
    }
  }
  return loadFolderHandleByKey(WORMHOLES_PARENT_HANDLE_KEY);
}

async function removeWormholesParentFolderHandle() {
  return removeFolderHandleByKey(WORMHOLES_PARENT_HANDLE_KEY);
}

async function hasFolderPermission(handle, mode = "readwrite") {
  if (!handle) return false;
  if (localFolderUsesPrivateStorage()) return true;
  if (!handle.queryPermission) return false;
  try {
    return (await handle.queryPermission({mode})) === "granted";
  } catch (e) {
    return false;
  }
}

async function requestFolderPermission(handle, mode = "readwrite") {
  if (!handle) return false;
  if (localFolderUsesPrivateStorage()) return true;
  if (await hasFolderPermission(handle, mode)) return true;
  if (!handle.requestPermission) return false;

  try {
    const result = await handle.requestPermission({mode});
    if (result !== "granted") return false;
    // Some browsers finish updating the handle permission just after the chooser resolves.
    // A short query keeps the first reconnect click from failing after the user has already approved.
    await (globalThis.controllerServices || globalThis).delay(40);
    return (await hasFolderPermission(handle, mode)) || result === "granted";
  } catch (e) {
    return false;
  }
}

function localFolderApiSupported() {
  return localFolderNativeApiSupported() || localFolderPrivateStorageSupported();
}

function sanitizeFileNamePart(text, fallback = "file") {
  const cleaned = String(text || fallback)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

async function fileExistsInFolder(folderHandle, fileName) {
  if (!folderHandle || !fileName) return false;
  try {
    await folderHandle.getFileHandle(fileName);
    return true;
  } catch (e) {
    return false;
  }
}

function folderBaseNameFromTitle(title, extension) {
  const safeExt = extension.startsWith(".") ? extension : `.${extension}`;
  let safeBase = sanitizeFileNamePart(title || "file", "file");

  if (safeBase.toLowerCase().endsWith(safeExt.toLowerCase())) {
    safeBase = safeBase.slice(0, -safeExt.length).trim();
  }

  return safeBase || "file";
}

async function uniqueFolderFileName(folderHandle, baseName, extension) {
  const safeExt = extension.startsWith(".") ? extension : `.${extension}`;
  const safeBase = folderBaseNameFromTitle(baseName, safeExt);
  let candidate = `${safeBase}${safeExt}`;
  let index = 2;

  while (await fileExistsInFolder(folderHandle, candidate)) {
    candidate = `${safeBase}-${index}${safeExt}`;
    index += 1;
  }

  return candidate;
}

async function titleBasedFolderFileName(folderHandle, title, extension, currentName = "") {
  const safeExt = extension.startsWith(".") ? extension : `.${extension}`;
  const desired = `${folderBaseNameFromTitle(title || "file", safeExt)}${safeExt}`;

  if (currentName === desired) {
    return desired;
  }

  return await uniqueFolderFileName(folderHandle, title || "file", safeExt);
}

async function writeBlobToFolder(folderHandle, fileName, blob) {
  let writable = null;
  try {
    if (!folderHandle) throw new Error("Folder is not connected.");
    const fileHandle = await folderHandle.getFileHandle(fileName, {create: true});
    writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (e) {
    try {
      await writable?.abort?.();
    } catch (abortError) {}
    reportAppError(`Could not write ${fileName || "a file"} to the local folder`, e, {
      code: "WORMHOLES_FOLDER_WRITE",
      userMessage: "Couldn’t save to the folder. Check access and available space.",
    });
    throw e;
  }
}

async function readTextFromFolderFile(folderHandle, fileName) {
  try {
    if (!folderHandle) throw new Error("Folder is not connected.");
    const fileHandle = await folderHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (e) {
    reportAppError(`Could not read ${fileName || "a file"} from the local folder`, e, {
      code: "WORMHOLES_FOLDER_READ",
      userMessage: "Couldn’t read the folder. Reconnect it and try again.",
    });
    throw e;
  }
}

function isIgnorableFolderSyncArtifact(name) {
  const value = String(name || "")
    .trim()
    .toLowerCase();
  return (
    value.endsWith(".crswap") ||
    value.endsWith(".tmp") ||
    value.endsWith(".temp") ||
    value === ".ds_store" ||
    value === "thumbs.db" ||
    value === "desktop.ini"
  );
}

function shouldSkipFolderPruneEntry(name) {
  return name === WORMHOLES_MANAGED_MARKER || isIgnorableFolderSyncArtifact(name);
}

async function removeEntryFromFolder(folderHandle, name, options = {}) {
  if (!folderHandle || !name) return false;
  try {
    await folderHandle.removeEntry(name, {recursive: !!options.recursive});
    return true;
  } catch (e) {
    if (isIgnorableFolderSyncArtifact(name)) {
      return false;
    }
    if (e?.name !== "NotFoundError") {
      reportAppError(`Could not remove ${name} from the local folder`, e, {
        code: "WORMHOLES_FOLDER_SYNC",
        userMessage: "Folder sync is incomplete. Reconnect the folder and try again.",
      });
    }
    return false;
  }
}

async function removeFileFromFolder(folderHandle, fileName) {
  return await removeEntryFromFolder(folderHandle, fileName, {recursive: false});
}

async function removeDirectoryFromFolder(folderHandle, directoryName) {
  return await removeEntryFromFolder(folderHandle, directoryName, {recursive: true});
}

async function ensureWormholesFolderReadyForDestructiveSync() {
  if (!localFoldersEnabled) return false;

  if (
    wormholesParentFolderHandle &&
    wormholesRootFolderHandle &&
    wormholesLiteratureRootHandle &&
    wormholesImagesRootHandle &&
    wormholesCreationsRootHandle
  ) {
    return await requestFolderPermission(wormholesParentFolderHandle);
  }

  const savedHandle =
    wormholesParentFolderHandle ||
    previousWormholesSourceFolderHandle ||
    (await loadWormholesParentFolderHandle());
  if (!savedHandle) return false;

  wormholesParentFolderHandle = savedHandle;
  return await prepareWormholesFolderHandles({requestPermission: true});
}

async function deleteFolderBackedRecordFile(record, folderHandle) {
  if (!record || !record.folderFileName || !folderHandle) return false;
  if (!(await requestFolderPermission(folderHandle))) {
    reportAppError("Local folder permission was not granted", new Error("Permission denied"), {
      code: "WORMHOLES_FOLDER_PERMISSION",
      userMessage: "Reconnect the local folder to finish deleting the file.",
    });
    return false;
  }
  return await removeFileFromFolder(folderHandle, record.folderFileName);
}

function addValidFolderFile(map, universe, records) {
  const folderName = universeFolderName(universe);
  if (!map.has(folderName)) map.set(folderName, new Set());

  const names = map.get(folderName);
  (records || []).forEach((record) => {
    if (record?.folderFileName) {
      names.add(record.folderFileName);
    }
  });
}

function appFolderFileMaps() {
  const creationFolders = new Map();
  const literatureFolders = new Map();
  const imageFolders = new Map();

  universes.forEach((universe) => {
    addValidFolderFile(creationFolders, universe, readArchiveForUniverse(universe.id));
    addValidFolderFile(
      literatureFolders,
      universe,
      (globalThis.controllerServices || globalThis).readLiteratureForUniverse(universe.id),
    );
    addValidFolderFile(
      imageFolders,
      universe,
      (globalThis.controllerServices || globalThis).readVisionBoardForUniverse(universe.id),
    );
  });

  return {creationFolders, literatureFolders, imageFolders};
}

async function pruneFilesInUniverseFolder(folderHandle, validFileNames) {
  if (!folderHandle || !(await requestFolderPermission(folderHandle))) return;
  if (!(await folderHasManagedMarker(folderHandle))) return;

  try {
    for await (const [name, handle] of folderHandle.entries()) {
      if (shouldSkipFolderPruneEntry(name)) continue;
      if (handle.kind !== "file" || !validFileNames.has(name)) {
        await removeEntryFromFolder(folderHandle, name, {recursive: handle.kind === "directory"});
      }
    }
  } catch (e) {
    reportAppError("Could not prune files in a managed universe folder", e);
  }
}

async function pruneCategoryRootToAppState(rootHandle, validFolderMap) {
  if (!rootHandle || !(await requestFolderPermission(rootHandle))) return;

  try {
    for await (const [name, handle] of rootHandle.entries()) {
      if (shouldSkipFolderPruneEntry(name)) continue;

      const isKnownUniverseFolder = handle.kind === "directory" && validFolderMap.has(name);
      if (!isKnownUniverseFolder) {
        await removeEntryFromFolder(rootHandle, name, {recursive: handle.kind === "directory"});
        continue;
      }

      await writeManagedFolderMarker(handle, {kind: "universe-folder"});
      await pruneFilesInUniverseFolder(handle, validFolderMap.get(name));
    }
  } catch (e) {
    reportAppError("Could not prune category folders to match the app", e);
  }
}

async function pruneWormholesRootToManagedCategories() {
  if (!wormholesRootFolderHandle || !(await requestFolderPermission(wormholesRootFolderHandle)))
    return;
  await writeManagedFolderMarker(wormholesRootFolderHandle, {kind: "root"});

  try {
    for await (const [name, handle] of wormholesRootFolderHandle.entries()) {
      if (shouldSkipFolderPruneEntry(name) || WORMHOLES_CATEGORY_NAMES.has(name)) continue;
      await removeEntryFromFolder(wormholesRootFolderHandle, name, {
        recursive: handle.kind === "directory",
      });
    }
  } catch (e) {
    reportAppError("Could not prune the Wormholes folder to match the app", e);
  }
}

async function pruneWormholesFolderToAppState() {
  // Beta 47 safety patch: never let routine folder sync remove files.
  // Backup/restore and reconnect flows must be read-first and non-destructive.
  // Explicit user delete actions still remove their specific target files/folders through
  // deleteFolderBackedRecordFile/deleteUniverseFoldersFromDisk, but startup, restore,
  // import, and target-switch sync can no longer prune a folder to an empty or stale app state.
  return;
}

async function deleteUniverseFoldersFromDisk(universe) {
  if (!universe || !(await ensureWormholesFolderReadyForDestructiveSync())) return;

  const names = Array.from(
    new Set(
      [universeFolderName(universe), (globalThis.controllerServices || globalThis).legacyUniverseFolderName(universe)].filter(
        Boolean,
      ),
    ),
  );
  for (const folderName of names) {
    await removeDirectoryFromFolder(wormholesCreationsRootHandle, folderName);
    await removeDirectoryFromFolder(wormholesLiteratureRootHandle, folderName);
    await removeDirectoryFromFolder(wormholesImagesRootHandle, folderName);
  }
}

function fileTitleFromName(fileName) {
  return sanitizeFileNamePart(String(fileName || "").replace(/\.[^.]+$/, ""), "Untitled");
}

async function listFileNamesInFolder(folderHandle) {
  const names = [];
  if (!folderHandle) return names;

  try {
    for await (const [name, handle] of folderHandle.entries()) {
      if (handle.kind === "file") names.push(name);
    }
  } catch (e) {}

  return names;
}

function stripGeneratedFolderCollisionSuffixes(title) {
  let cleaned = String(title || "").trim();
  const original = cleaned;

  // Folder file names can receive collision suffixes such as -2, -3, etc.
  // Those suffixes belong to the stored file name only; they should never become the visible app title.
  while (/-[2-9]$/.test(cleaned)) {
    cleaned = cleaned.replace(/-[2-9]$/, "").trim();
  }

  return cleaned && cleaned !== original ? cleaned : original;
}

function repairFolderCollisionTitle(record) {
  if (!record || record.storage !== "folder" || !record.folderFileName || !record.title)
    return false;

  const fileTitle = fileTitleFromName(record.folderFileName);
  if (record.title !== fileTitle) return false;

  const repairedTitle = stripGeneratedFolderCollisionSuffixes(record.title);
  if (!repairedTitle || repairedTitle === record.title) return false;

  record.title = repairedTitle;
  return true;
}

function repairFolderCollisionTitlesInList(records) {
  let changed = false;
  (records || []).forEach((record) => {
    if (repairFolderCollisionTitle(record)) changed = true;
  });
  return changed;
}

function repairFolderCollisionTitles() {
  let anyChanged = false;

  (universes || []).forEach((universe) => {
    const archive =
      universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id);
    if (repairFolderCollisionTitlesInList(archive)) {
      anyChanged = true;
      if (universe.id === currentUniverseId) {
        archiveEntries = archive;
        saveArchiveToStorage();
      } else {
        saveArchiveForUniverse(universe.id, archive);
      }
    }

    const docs = (globalThis.controllerServices || globalThis).readLiteratureForUniverse(universe.id);
    if (repairFolderCollisionTitlesInList(docs)) {
      anyChanged = true;
      if (universe.id === currentUniverseId) {
        literatureEntries = docs;
        (globalThis.controllerServices || globalThis).saveLiteratureToStorage();
      } else {
        (globalThis.controllerServices || globalThis).saveLiteratureForUniverse(universe.id, docs);
      }
    }

    const images = (globalThis.controllerServices || globalThis).readVisionBoardForUniverse(universe.id);
    if (repairFolderCollisionTitlesInList(images)) {
      anyChanged = true;
      if (universe.id === currentUniverseId) {
        visionEntries = images;
        (globalThis.controllerServices || globalThis).saveVisionBoardToStorage();
      } else {
        (globalThis.controllerServices || globalThis).saveVisionBoardForUniverse(universe.id, images);
      }
    }
  });

  return anyChanged;
}

async function titleSyncRecordFromFolder(record, folderHandle, extension) {
  // Beta 31: App titles are authoritative. Folder file names may be changed for safe storage
  // or to avoid duplicate file names, but those technical names must never overwrite user titles.
  return false;
}

async function syncFolderBackedTitlesFromFileNames() {
  // Beta 31: intentionally no-op. This used to adopt folder file names as visible titles,
  // which caused names like "man" to become "man-2" or "man-2-2" after reconnecting.
  return;
}

async function renameFolderBackedRecordFile(record, folderHandle, title, extension, blob) {
  if (!record || !folderHandle || !(await requestFolderPermission(folderHandle))) return record;

  const oldName = record.folderFileName || "";
  const nextName = await titleBasedFolderFileName(
    folderHandle,
    title || "file",
    extension,
    oldName,
  );

  await writeBlobToFolder(folderHandle, nextName, blob);

  if (oldName && oldName !== nextName) {
    await removeFileFromFolder(folderHandle, oldName);
  }

  record.folderFileName = nextName;
  record.storage = "folder";
  return record;
}

async function objectUrlFromFolderFile(folderHandle, fileName) {
  const fileHandle = await folderHandle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  const url = URL.createObjectURL(file);
  visionObjectUrls.push(url);
  return url;
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = String(dataUrl || "").split(",");
  const mime = (header.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], {type: mime});
}

async function blobToUint8Array(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

async function imageBlobDimensions(blob) {
  if (!blob || !String(blob.type || "").startsWith("image/")) return null;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth || img.width || 1,
        height: img.naturalHeight || img.height || 1,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

function docxImageExtensionFromBlob(blob, fallback = ".jpg") {
  const type = String(blob?.type || "").toLowerCase();
  if (type.includes("png")) return ".png";
  if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
  return fallback;
}

function docxImageContentType(extension) {
  return extension === ".png" ? "image/png" : "image/jpeg";
}

function docxThumbnailSize(dimensions) {
  const maxEmu = 1500000;
  const width = Math.max(1, dimensions?.width || 1);
  const height = Math.max(1, dimensions?.height || 1);

  if (width >= height) {
    return {cx: maxEmu, cy: Math.max(360000, Math.round((maxEmu * height) / width))};
  }

  return {cx: Math.max(360000, Math.round((maxEmu * width) / height)), cy: maxEmu};
}

async function blobFromVisionItemForDocx(row) {
  const item = row?.item;
  if (!item || item.fileType === "pdf") return null;
  await (globalThis.controllerServices || globalThis).materializeVisionItemLargeData(
    item,
    row?.homeUniverseId || currentUniverseId,
  );

  if (item.thumbnailDataUrl) {
    return dataUrlToBlob(item.thumbnailDataUrl);
  }

  if (item.dataUrl) {
    return dataUrlToBlob(item.dataUrl);
  }

  try {
    const src = await (globalThis.controllerServices || globalThis).visionItemDisplaySrc(item, row.homeUniverseId);
    if (src) {
      const response = await fetch(src);
      const blob = await response.blob();
      if (blob) return blob;
    }
  } catch (e) {}

  if (item.storage === "folder" && item.folderFileName) {
    const homeUniverse = universes.find((universe) => universe.id === row.homeUniverseId);
    let folder = null;

    if (row.homeUniverseId === currentUniverseId && visionFolderHandle) {
      folder = visionFolderHandle;
    }

    if (!folder && homeUniverse && wormholesImagesRootHandle) {
      try {
        const folders = await ensureUniverseFolders(homeUniverse);
        folder = folders?.images || null;
      } catch (e) {}
    }

    if (folder && (await requestFolderPermission(folder))) {
      try {
        const fileHandle = await folder.getFileHandle(item.folderFileName);
        return await fileHandle.getFile();
      } catch (e) {}
    }

    if (homeUniverse) {
      try {
        const sourceFile = await sourceFileFromPreviousFolder(
          "images",
          homeUniverse,
          item.folderFileName,
        );
        if (sourceFile) return sourceFile;
      } catch (e) {}
    }
  }

  return null;
}

function linkedVisionRowsForCreationDocx(entry, universeId) {
  if (!entry || !universeId) return [];

  const rows = [];
  const seen = new Set();

  function addRows(nextRows) {
    (nextRows || []).forEach((row) => {
      const key = `${row.homeUniverseId}:${row.item?.id}`;
      if (!row.item || seen.has(key)) return;
      seen.add(key);
      rows.push(row);
    });
  }

  addRows((globalThis.controllerServices || globalThis).visionItemsForEntryTag(universeId, entry.id));

  if ((globalThis.controllerServices || globalThis).isGroupEntry(entry)) {
    addRows((globalThis.controllerServices || globalThis).visionItemsForGroupChildrenTag(universeId, entry.id));
  }

  return rows;
}

async function docxImagesFromVisionRows(rows) {
  const images = [];
  const unavailable = [];

  for (const row of rows || []) {
    const item = row.item;
    const label = `${item.title || item.sourceName || "Image"}${row.homeUniverseId ? ` (${(globalThis.controllerServices || globalThis).getUniverseTitle(row.homeUniverseId)})` : ""}`;

    if (item.fileType === "pdf") {
      unavailable.push(`${label} — PDF listed, thumbnail not embedded`);
      continue;
    }

    const blob = await blobFromVisionItemForDocx(row);
    if (!blob) {
      unavailable.push(`${label} — thumbnail unavailable`);
      continue;
    }

    const thumbnailBlob = await (globalThis.controllerServices || globalThis).imageBlobToThumbnailBlob(blob);
    if (!thumbnailBlob) {
      unavailable.push(`${label} — thumbnail unavailable`);
      continue;
    }

    const extension = ".jpg";
    const dimensions = await imageBlobDimensions(thumbnailBlob);
    const size = docxThumbnailSize(dimensions);
    const index = images.length + 1;

    images.push({
      relId: `rId${index + 1}`,
      fileName: `linked-image-${index}${extension}`,
      title: label,
      contentType: "image/jpeg",
      data: await blobToUint8Array(thumbnailBlob),
      cx: size.cx,
      cy: size.cy,
    });
  }

  return {images, unavailable};
}

async function getExistingDirectory(parentHandle, name) {
  if (!parentHandle) return null;
  try {
    return await parentHandle.getDirectoryHandle(sanitizeFileNamePart(name, "Folder"), {
      create: false,
    });
  } catch (e) {
    return null;
  }
}

async function folderHasCategoryDirectories(folderHandle) {
  if (!folderHandle) return false;
  try {
    await folderHandle.getDirectoryHandle("Creations", {create: false});
    await folderHandle.getDirectoryHandle("Literature", {create: false});
    await folderHandle.getDirectoryHandle("Images", {create: false});
    return true;
  } catch (e) {
    return false;
  }
}

async function sourceWormholesRootHandle() {
  if (!previousWormholesSourceFolderHandle) return null;
  if (!(await requestFolderPermission(previousWormholesSourceFolderHandle, "read"))) return null;

  if (
    previousWormholesSourceFolderHandle.name === "Wormholes" ||
    (await folderHasCategoryDirectories(previousWormholesSourceFolderHandle))
  ) {
    return previousWormholesSourceFolderHandle;
  }

  return await getExistingDirectory(previousWormholesSourceFolderHandle, "Wormholes");
}

async function sourceUniverseFolderHandle(kind, universe) {
  const root = await sourceWormholesRootHandle();
  if (!root || !universe) return null;

  const sectionName =
    kind === "literature" ? "Literature" : kind === "images" ? "Images" : "Creations";

  const section = await getExistingDirectory(root, sectionName);
  if (!section) return null;

  const preferred = await getExistingDirectory(section, universeFolderName(universe));
  if (preferred) return preferred;

  const legacy = await getExistingDirectory(
    section,
    (globalThis.controllerServices || globalThis).legacyUniverseFolderName(universe),
  );
  if (legacy) return legacy;

  return null;
}

async function sourceFileFromPreviousFolder(kind, universe, fileName) {
  if (!fileName) return null;

  const folder = await sourceUniverseFolderHandle(kind, universe);
  if (!folder) return null;

  try {
    const fileHandle = await folder.getFileHandle(fileName);
    return await fileHandle.getFile();
  } catch (e) {
    return null;
  }
}

async function folderHandlesReferToSameEntry(firstHandle, secondHandle) {
  if (!firstHandle || !secondHandle) return false;
  if (firstHandle === secondHandle) return true;

  try {
    if (typeof firstHandle.isSameEntry === "function") {
      return await firstHandle.isSameEntry(secondHandle);
    }
  } catch (e) {}

  try {
    if (typeof secondHandle.isSameEntry === "function") {
      return await secondHandle.isSameEntry(firstHandle);
    }
  } catch (e) {}

  return false;
}

async function currentTargetMatchesPreviousWormholesFolder() {
  if (!wormholesParentFolderHandle || !previousWormholesSourceFolderHandle) return false;

  if (
    await folderHandlesReferToSameEntry(
      wormholesParentFolderHandle,
      previousWormholesSourceFolderHandle,
    )
  ) {
    return true;
  }

  const targetRoot = wormholesRootFolderHandle || wormholesParentFolderHandle;
  const sourceRoot = await sourceWormholesRootHandle();
  return await folderHandlesReferToSameEntry(targetRoot, sourceRoot);
}

function normalizeFolderMigrationOptions(options = false) {
  if (options && typeof options === "object") {
    return {
      force: !!options.force,
      preserveExistingFolderFileNames: options.preserveExistingFolderFileNames !== false,
    };
  }

  return {
    force: !!options,
    preserveExistingFolderFileNames: true,
  };
}

async function folderMigrationFileName(record, folderHandle, title, extension, migrationOptions) {
  const existingName = record?.folderFileName || "";
  if (
    existingName &&
    migrationOptions?.preserveExistingFolderFileNames &&
    (await fileExistsInFolder(folderHandle, existingName))
  ) {
    return existingName;
  }

  return await titleBasedFolderFileName(
    folderHandle,
    title || "file",
    extension,
    migrationOptions?.force ? "" : existingName,
  );
}

function extensionForStoredFileName(fileName, fallback) {
  const match = String(fileName || "").match(/\.[^.]+$/);
  return match ? match[0] : fallback;
}

async function getOrCreateDirectory(parentHandle, name) {
  return await parentHandle.getDirectoryHandle(sanitizeFileNamePart(name, "Folder"), {
    create: true,
  });
}

/* Storage module: moved storage status helpers to scripts/storage.js. */

function loadLocalFolderEnabled() {
  loadLocalFolderStorageMode();
  try {
    localFoldersEnabled =
      readMigratedLocalStorageValue(
        WORMHOLES_LOCAL_ENABLED_KEY,
        OLD_WORMHOLES_LOCAL_ENABLED_KEY,
      ) === "true";
  } catch (e) {
    localFoldersEnabled = false;
  }

  if (!localFolderApiSupported()) {
    localFoldersEnabled = false;
  }

  updateLocalFolderCheckboxes();
}

function saveLocalFolderEnabled() {
  saveLocalStorageText(
    WORMHOLES_LOCAL_ENABLED_KEY,
    localFoldersEnabled ? "true" : "false",
    "Could not save folder-mode setting",
    "Folder setting could not be saved.",
  );
  removeLocalStorageKey(OLD_WORMHOLES_LOCAL_ENABLED_KEY);
  updateLocalFolderCheckboxes();
}

function updateLocalFolderCheckboxes() {
  const checked = !!localFoldersEnabled;
  const supported = localFolderApiSupported();
  const nativeSupported = localFolderNativeApiSupported();
  const privateSupported = localFolderPrivateStorageSupported();
  const privateMode = !nativeSupported && privateSupported;
  const controls = [document.getElementById("settingsLocalFolderToggle")];

  controls.forEach((control) => {
    if (!control) return;
    control.checked = checked && supported;
    control.disabled = !supported;
    const label = control.closest(".local-folder-toggle");
    if (label) {
      label.title = supported
        ? privateMode
          ? "Uses this browser's private local file store. This works beyond Chromium, but it is not a visible OS folder."
          : ""
        : "Folder access is unavailable. App-only storage still works.";
      label.classList.toggle("unsupported", !supported);
      label.classList.toggle("private-storage-mode", privateMode);
      const span = label.querySelector("span");
      if (span)
        span.textContent = supported
          ? privateMode
            ? "Use browser-local folder"
            : "Use local folder"
          : "Folder mode unavailable";
    }
  });
  requestStorageFootnoteUpdate();
}

async function clearAllStoredFolderHandles() {
  if (!window.indexedDB) return false;
  let cleared = false;
  const failures = [];
  for (const dbName of FOLDER_HANDLE_DATABASES || []) {
    try {
      const db = await openFolderHandlesDb(dbName);
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(FOLDER_HANDLES_STORE, "readwrite");
        const request = transaction.objectStore(FOLDER_HANDLES_STORE).clear();
        request.onerror = () =>
          reject(
            request.error || transaction.error || new Error("Could not clear folder handles."),
          );
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () =>
          reject(transaction.error || new Error("Could not clear folder handles."));
      });
      db.close?.();
      cleared = true;
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) throw failures[0];
  return cleared;
}

window.WormholesFolderHandleRepository = Object.freeze({
  save: saveFolderHandleByKey,
  load: loadFolderHandleByKey,
  remove: removeFolderHandleByKey,
  clearAll: clearAllStoredFolderHandles,
});

function clearWormholesChildFolderHandles() {
  wormholesRootFolderHandle = null;
  wormholesLiteratureRootHandle = null;
  wormholesImagesRootHandle = null;
  wormholesCreationsRootHandle = null;
  literatureFolderHandle = null;
  visionFolderHandle = null;
  creationFolderHandle = null;
}

function clearWormholesFolderHandles() {
  wormholesParentFolderHandle = null;
  clearWormholesChildFolderHandles();
}

/* Public controller surface for served ES-module builds. */
const FOLDER_STORAGE_CONTROLLER_API = Object.freeze({
  localFolderNativeApiSupported,
  localFolderPrivateStorageSupported,
  normalizeLocalFolderStorageMode,
  loadLocalFolderStorageMode,
  saveLocalFolderStorageMode,
  localFolderUsesPrivateStorage,
  openFolderHandlesDb,
  saveFolderHandleByKeyToDb,
  loadFolderHandleByKeyFromDb,
  removeFolderHandleByKeyFromDb,
  saveFolderHandleByKey,
  loadFolderHandleByKey,
  removeFolderHandleByKey,
  saveFolderHandle,
  loadFolderHandle,
  removeFolderHandle,
  saveWormholesParentFolderHandle,
  loadWormholesParentFolderHandle,
  removeWormholesParentFolderHandle,
  hasFolderPermission,
  requestFolderPermission,
  localFolderApiSupported,
  sanitizeFileNamePart,
  fileExistsInFolder,
  folderBaseNameFromTitle,
  uniqueFolderFileName,
  titleBasedFolderFileName,
  writeBlobToFolder,
  readTextFromFolderFile,
  isIgnorableFolderSyncArtifact,
  shouldSkipFolderPruneEntry,
  removeEntryFromFolder,
  removeFileFromFolder,
  removeDirectoryFromFolder,
  ensureWormholesFolderReadyForDestructiveSync,
  deleteFolderBackedRecordFile,
  addValidFolderFile,
  appFolderFileMaps,
  pruneFilesInUniverseFolder,
  pruneCategoryRootToAppState,
  pruneWormholesRootToManagedCategories,
  pruneWormholesFolderToAppState,
  deleteUniverseFoldersFromDisk,
  fileTitleFromName,
  listFileNamesInFolder,
  stripGeneratedFolderCollisionSuffixes,
  repairFolderCollisionTitle,
  repairFolderCollisionTitlesInList,
  repairFolderCollisionTitles,
  titleSyncRecordFromFolder,
  syncFolderBackedTitlesFromFileNames,
  renameFolderBackedRecordFile,
  objectUrlFromFolderFile,
  dataUrlToBlob,
  blobToUint8Array,
  imageBlobDimensions,
  docxImageExtensionFromBlob,
  docxImageContentType,
  docxThumbnailSize,
  blobFromVisionItemForDocx,
  linkedVisionRowsForCreationDocx,
  docxImagesFromVisionRows,
  getExistingDirectory,
  folderHasCategoryDirectories,
  sourceWormholesRootHandle,
  sourceUniverseFolderHandle,
  sourceFileFromPreviousFolder,
  folderHandlesReferToSameEntry,
  currentTargetMatchesPreviousWormholesFolder,
  normalizeFolderMigrationOptions,
  folderMigrationFileName,
  extensionForStoredFileName,
  getOrCreateDirectory,
  loadLocalFolderEnabled,
  saveLocalFolderEnabled,
  updateLocalFolderCheckboxes,
  clearAllStoredFolderHandles,
  clearWormholesChildFolderHandles,
  clearWormholesFolderHandles,
});
(globalThis.registerControllerServices || (() => {}))(FOLDER_STORAGE_CONTROLLER_API);
