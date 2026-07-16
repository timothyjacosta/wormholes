/* GENERATED from scripts/modules/storage-facade.mjs. Do not edit this direct-file compatibility adapter. */

/* Wormholes Beta 252 storage module.
   Contains localStorage keys, save/load helpers, storage status calculations, and core app persistence functions split from wormholes-app.js. */

function repositoryLayer() {
  return window.WormholesRepositories || null;
}

function wormholesRepository(name) {
  return repositoryLayer()?.get?.(name) || repositoryLayer()?.app?.[name] || null;
}

function persistenceResultOk(result) {
  return result === true || result?.ok === true;
}

function persistenceResultFromBoolean(ok, options = {}) {
  if (ok) return {ok: true, code: "ok"};
  return {
    ok: false,
    code: String(options.code || "storage_unavailable"),
    error:
      options.error instanceof Error
        ? options.error
        : new Error(String(options.error || "Save failed")),
    userMessage: String(options.userMessage || "Could not save your changes. Try again."),
    recoverable: options.recoverable !== false,
    context: String(options.context || "Could not save app data"),
  };
}

function persistenceResultFor(error, options = {}) {
  const results = repositoryLayer()?.results;
  if (results?.fromError) return results.fromError(error, options);
  return persistenceResultFromBoolean(false, {
    ...options,
    error,
    code: options.kind === "folder" ? "folder_sync_failed" : "storage_unavailable",
  });
}

function appModelLayer() {
  return window.WormholesAppModel || null;
}

function commitAppModelDomain(domain, value, reason = "") {
  const model = appModelLayer();
  if (model?.replace) model.replace(domain, value, {source: "persistence", reason});
  return value;
}

/* --- map filter preferences --- */

const MAP_FILTERS_STORAGE_KEY = "wormholesMapFilterPreferences";
const DEFAULT_MAP_FILTERS = Object.freeze({
  bridges: true,
  connections: true,
  literature: true,
  images: true,
  relationships: true,
});

function sanitizeMapFilters(filters) {
  const clean = {...DEFAULT_MAP_FILTERS};
  if (filters && typeof filters === "object") {
    Object.keys(clean).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(filters, key)) clean[key] = filters[key] !== false;
    });
  }
  return clean;
}

function readMapFilterPreferences() {
  const repository = repositoryLayer()?.preferences;
  if (repository) return repository.readJson(MAP_FILTERS_STORAGE_KEY, {}) || {};
  try {
    const saved = localStorage.getItem(MAP_FILTERS_STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

function loadMapFilters(scope) {
  const saved = readMapFilterPreferences();
  return sanitizeMapFilters(saved[scope]);
}

function saveMapFilters(scope, filters) {
  const saved = readMapFilterPreferences();
  saved[scope] = sanitizeMapFilters(filters);
  const repository = repositoryLayer()?.preferences;
  if (repository) {
    repository.writeJson(MAP_FILTERS_STORAGE_KEY, saved, {
      context: "Could not save map filter preferences",
      userMessage: "Map filter preferences could not be saved.",
    });
    return;
  }
  try {
    localStorage.setItem(MAP_FILTERS_STORAGE_KEY, JSON.stringify(saved));
  } catch (e) {
    if (typeof reportAppError === "function")
      reportAppError("Could not save map filter preferences", e, {
        userMessage: "Map filter preferences could not be saved.",
      });
  }
}

/* --- localStorage safety helpers --- */

function rememberStorageFailure(
  context,
  error,
  userMessage = "Could not save your changes. Try again.",
) {
  const appCodeToFailureCode = {
    WORMHOLES_SCHEMA_INVALID: "schema_invalid",
    WORMHOLES_QUOTA_EXCEEDED: "quota_exceeded",
    WORMHOLES_CORRUPT_DATASET_BLOCKED: "corrupt_dataset_blocked",
    WORMHOLES_STORAGE_UNAVAILABLE: "storage_unavailable",
    WORMHOLES_PERMISSION_DENIED: "permission_denied",
    WORMHOLES_FOLDER_SYNC_FAILED: "folder_sync_failed",
  };
  const result =
    error?.code && appCodeToFailureCode[String(error.code)]
      ? {
          ok: false,
          code: appCodeToFailureCode[String(error.code)],
          error,
          userMessage: String(
            error.userMessage || userMessage || "Could not save your changes. Try again.",
          ),
          recoverable: error.recoverable !== false,
          context: String(context || "Could not save app data"),
        }
      : persistenceResultFor(error, {context, userMessage});
  recentStorageFailureMessage = result.userMessage;
  recentStorageFailureAt = Date.now();
  reportAppError(result.context, result.error, {
    code: result.error?.code || "WORMHOLES_SAVE_FAILED",
    userMessage: result.userMessage,
  });
  return result;
}

function recentStorageFailureStillMatters() {
  return (
    recentStorageFailureMessage &&
    recentStorageFailureAt &&
    Date.now() - recentStorageFailureAt < 6000
  );
}

function rememberFolderSaveFailure(context, error) {
  const result = persistenceResultFor(error, {kind: "folder", context});
  recentFolderSaveWarningMessage = result.userMessage;
  recentFolderSaveWarningAt = Date.now();
  reportAppError(result.context, result.error, {
    code:
      result.error?.code ||
      (result.code === "permission_denied"
        ? "WORMHOLES_PERMISSION_DENIED"
        : "WORMHOLES_FOLDER_SYNC_FAILED"),
    userMessage: result.userMessage,
  });
  return result;
}

function recentFolderSaveWarningStillMatters() {
  return (
    recentFolderSaveWarningMessage &&
    recentFolderSaveWarningAt &&
    Date.now() - recentFolderSaveWarningAt < 6000
  );
}

function dispatchPersistedDatasetChange(type, detail = {}) {
  try {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    if (typeof CustomEvent === "function") window.dispatchEvent(new CustomEvent(type, {detail}));
  } catch (e) {}
}

function saveLocalStorageText(
  key,
  value,
  context = "Could not save app data",
  userMessage = "Save failed. Download Backup before leaving.",
) {
  const repository = repositoryLayer()?.local;
  if (repository) return persistenceResultOk(repository.set(key, value, {context, userMessage}));
  if (window.WormholesSingleTab && !window.WormholesSingleTab.canWrite()) return false;
  try {
    window.WormholesUndo?.notePersistedMutation?.(key);
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    rememberStorageFailure(context, e, userMessage);
    return false;
  }
}

const WORMHOLES_PERSISTED_DATASET_FORMAT =
  repositoryLayer()?.datasets?.format || "Wormholes Persisted Dataset";
const wormholesBlockedPersistedDatasetKeys = new Map();

function blockPersistedDatasetWrites(
  key,
  reason = "Stored data is damaged and could not be recovered.",
) {
  const repository = repositoryLayer()?.datasets;
  if (repository) {
    repository.block(key, reason);
    return;
  }
  if (!key) return;
  wormholesBlockedPersistedDatasetKeys.set(
    String(key),
    String(reason || "Stored data is damaged and could not be recovered."),
  );
}

function unblockPersistedDatasetWrites(key) {
  const repository = repositoryLayer()?.datasets;
  if (repository) {
    repository.unblock(key);
    return;
  }
  if (!key) return;
  wormholesBlockedPersistedDatasetKeys.delete(String(key));
}

function persistedDatasetWriteBlocked(key) {
  const repository = repositoryLayer()?.datasets;
  return repository
    ? repository.isBlocked(key)
    : wormholesBlockedPersistedDatasetKeys.has(String(key || ""));
}

function persistedDatasetWriteBlockReason(key) {
  const repository = repositoryLayer()?.datasets;
  return repository
    ? repository.blockReason(key)
    : wormholesBlockedPersistedDatasetKeys.get(String(key || "")) || "";
}

function parsePersistedDatasetText(text, fallbackValue = null) {
  const repository = repositoryLayer()?.datasets;
  if (repository) return repository.parseText(text, fallbackValue);

  if (!text) return {data: fallbackValue, revision: 0, updatedAt: "", isRevisioned: false};
  const parsed = JSON.parse(text);
  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    parsed.format === WORMHOLES_PERSISTED_DATASET_FORMAT
  ) {
    if (!Number.isInteger(parsed.revision) || parsed.revision < 1) {
      throw new Error("Persisted dataset revision metadata is invalid.");
    }
    if (!Object.prototype.hasOwnProperty.call(parsed, "data")) {
      throw new Error("Persisted dataset is missing its data field.");
    }
    if (parsed.updatedAt !== undefined && typeof parsed.updatedAt !== "string") {
      throw new Error("Persisted dataset update metadata is invalid.");
    }
    return {
      data: parsed.data,
      revision: parsed.revision,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      isRevisioned: true,
    };
  }
  return {data: parsed, revision: 0, updatedAt: "", isRevisioned: false};
}

function readPersistedDataset(primaryKey, oldKey, fallbackValue = null) {
  const repository = repositoryLayer()?.datasets;
  if (repository) return repository.read(primaryKey, oldKey, fallbackValue);
  const saved = readMigratedLocalStorageValue(primaryKey, oldKey);
  return saved
    ? parsePersistedDatasetText(saved, fallbackValue)
    : {data: fallbackValue, revision: 0, updatedAt: "", isRevisioned: false};
}

function readPersistedDatasetData(primaryKey, oldKey, fallbackValue = null) {
  return readPersistedDataset(primaryKey, oldKey, fallbackValue).data;
}

function saveLocalStorageJson(
  key,
  value,
  context = "Could not save app data",
  userMessage = "Save failed. Download Backup before leaving.",
) {
  const repository = repositoryLayer()?.datasets;
  if (repository) return persistenceResultOk(repository.write(key, value, {context, userMessage}));
  if (persistedDatasetWriteBlocked(key)) {
    const reason =
      persistedDatasetWriteBlockReason(key) || "Stored data is damaged and could not be recovered.";
    rememberStorageFailure(
      context,
      new Error(reason),
      "Save blocked to protect damaged stored data. Use Restore Points or a backup before continuing.",
    );
    return false;
  }

  let previousRevision = 0;
  try {
    const existing = localStorage.getItem(key);
    if (existing) previousRevision = parsePersistedDatasetText(existing, null).revision;
  } catch (e) {}

  const envelope = {
    format: WORMHOLES_PERSISTED_DATASET_FORMAT,
    revision: previousRevision + 1,
    updatedAt: new Date().toISOString(),
    data: value,
  };
  const saved = saveLocalStorageText(key, JSON.stringify(envelope), context, userMessage);
  if (saved && window.WormholesSnapshots?.noteMeaningfulChange) {
    window.WormholesSnapshots.noteMeaningfulChange(key, envelope.revision);
  }
  if (saved) {
    dispatchPersistedDatasetChange("wormholes-dataset-saved", {
      key: String(key || ""),
      revision: envelope.revision,
      updatedAt: envelope.updatedAt,
    });
  }
  return saved;
}

function removeLocalStorageKey(key) {
  const repository = repositoryLayer()?.local;
  if (repository) return repository.remove(key);
  if (window.WormholesSingleTab && !window.WormholesSingleTab.canWrite()) return false;
  try {
    window.WormholesUndo?.notePersistedMutation?.(key);
    localStorage.removeItem(key);
    dispatchPersistedDatasetChange("wormholes-dataset-removed", {key: String(key || "")});
    return true;
  } catch (e) {
    return false;
  }
}

/* --- storage key constants and migration helpers --- */

const UNIVERSES_KEY = "wormholesUniverses";
const OLD_UNIVERSES_KEY = "worldBuilderUniverses";
const LEGACY_ARCHIVE_KEY = "worldBuilderGeneratorArchive";
const LEGACY_CONNECTION_NOTES_KEY = "worldBuilderConnectionNotes";
const WORMHOLE_BRIDGE_NOTES_KEY = "wormholesBridgeNotes";
const OLD_WORMHOLE_BRIDGE_NOTES_KEY = "worldBuilderWormholeBridgeNotes";

function readMigratedLocalStorageValue(primaryKey, oldKey) {
  const repository = repositoryLayer()?.datasets;
  if (repository) return repository.readMigratedText(primaryKey, oldKey);
  let value = null;
  try {
    value = localStorage.getItem(primaryKey);
    if (value !== null || !oldKey) return value;
    if (persistedDatasetWriteBlocked(primaryKey)) return null;
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue === null) return null;
    if (
      saveLocalStorageText(
        primaryKey,
        oldValue,
        "Could not migrate stored app data",
        "Stored app data could not be migrated.",
      )
    ) {
      removeLocalStorageKey(oldKey);
    }
    return oldValue;
  } catch (e) {
    return value;
  }
}

function removeMigratedLocalStorageValue(primaryKey, oldKey) {
  const repository = repositoryLayer()?.datasets;
  if (repository) {
    repository.remove(primaryKey, oldKey);
    return;
  }
  removeLocalStorageKey(primaryKey);
  if (oldKey) removeLocalStorageKey(oldKey);
}

function archiveStorageKey(id = currentUniverseId) {
  return `wormholesUniverseArchive:${id}`;
}
function oldArchiveStorageKey(id = currentUniverseId) {
  return `worldBuilderUniverseArchive:${id}`;
}

function connectionNotesStorageKey(id = currentUniverseId) {
  return `wormholesUniverseConnectionNotes:${id}`;
}
function oldConnectionNotesStorageKey(id = currentUniverseId) {
  return `worldBuilderUniverseConnectionNotes:${id}`;
}

function literatureStorageKey(id = currentUniverseId) {
  return `wormholesUniverseLiterature:${id}`;
}
function oldLiteratureStorageKey(id = currentUniverseId) {
  return `worldBuilderUniverseLiterature:${id}`;
}

function visionStorageKey(id = currentUniverseId) {
  return `wormholesUniverseVisionBoard:${id}`;
}
function oldVisionStorageKey(id = currentUniverseId) {
  return `worldBuilderUniverseVisionBoard:${id}`;
}

function registerWormholesAppRepositories() {
  const layer = repositoryLayer();
  if (!layer?.datasets?.createRepository || !layer?.register) return;
  layer.register(
    "universes",
    layer.datasets.createRepository({
      key: UNIVERSES_KEY,
      legacyKey: OLD_UNIVERSES_KEY,
      schema: "universes",
      fallback: () => [],
      context: "Universes could not be saved to app storage",
      userMessage: "Universes could not be saved.",
    }),
  );
  layer.register(
    "bridgeNotes",
    layer.datasets.createRepository({
      key: WORMHOLE_BRIDGE_NOTES_KEY,
      legacyKey: OLD_WORMHOLE_BRIDGE_NOTES_KEY,
      schema: "bridgeNotes",
      fallback: () => ({}),
      context: "Wormhole bridge notes could not be saved",
      userMessage: "Bridge notes could not be saved.",
    }),
  );
  layer.register(
    "archive",
    layer.datasets.createRepository({
      keyFor: archiveStorageKey,
      legacyKeyFor: oldArchiveStorageKey,
      schema: "archive",
      fallback: () => [],
      context: "Archive could not be saved to app storage",
      userMessage: "Archive could not be saved.",
      onSaved: (scope) => {
        if (scope === currentUniverseId) requestStorageFootnoteUpdate();
      },
    }),
  );
  layer.register(
    "connectionNotes",
    layer.datasets.createRepository({
      keyFor: connectionNotesStorageKey,
      legacyKeyFor: oldConnectionNotesStorageKey,
      schema: "connectionNotes",
      fallback: () => ({}),
      context: "Connection details could not be saved to app storage",
      userMessage: "Connection details could not be saved.",
    }),
  );
  layer.register(
    "literature",
    layer.datasets.createRepository({
      keyFor: literatureStorageKey,
      legacyKeyFor: oldLiteratureStorageKey,
      schema: "literature",
      fallback: () => [],
      context: "Could not save document details to app storage",
      userMessage: "Document details could not be saved.",
      onSaved: (scope) => {
        if (scope === currentUniverseId) requestStorageFootnoteUpdate();
      },
    }),
  );
  layer.register(
    "vision",
    layer.datasets.createRepository({
      keyFor: visionStorageKey,
      legacyKeyFor: oldVisionStorageKey,
      schema: "vision",
      fallback: () => [],
      context: "Could not save vision metadata to app storage",
      userMessage: "Vision metadata could not be saved.",
      onSaved: (scope) => {
        if (scope === currentUniverseId) requestStorageFootnoteUpdate();
      },
    }),
  );
  layer.register(
    "appData",
    Object.freeze({
      removeUniverse(universeId) {
        ["archive", "connectionNotes", "literature", "vision"].forEach((name) =>
          layer.get(name)?.remove(universeId),
        );
      },
      removeCore() {
        layer.get("universes")?.remove(null);
        layer.get("bridgeNotes")?.remove(null);
      },
      clearLocalMatching(predicate, options = {}) {
        return layer.local.clearMatching(predicate, options);
      },
      clearLargeData() {
        return layer.largeData.clearAll();
      },
    }),
  );
}

registerWormholesAppRepositories();

// Keep the original IndexedDB database as the primary folder-handle store.
// Browser folder handles are sensitive, and keeping this name preserves reconnects across Beta updates.

/* --- folder storage key constants --- */

const FOLDER_HANDLES_DB = "worldBuilderLocalFolders";
const WORMHOLES_FOLDER_HANDLES_DB = "wormholesLocalFolders";
const FOLDER_HANDLES_STORE = "handles";
const FOLDER_HANDLE_DATABASES = [FOLDER_HANDLES_DB, WORMHOLES_FOLDER_HANDLES_DB];

function folderHandleKey(kind, universeId = currentUniverseId) {
  return `${kind}:${universeId || "none"}`;
}

const WORMHOLES_PARENT_HANDLE_KEY = "wormholes-parent-folder";
const WORMHOLES_LOCAL_ENABLED_KEY = "wormholesLocalFoldersEnabled";
const OLD_WORMHOLES_LOCAL_ENABLED_KEY = "worldBuilderWormholesLocalFoldersEnabled";

const WORMHOLES_LOCAL_MODE_KEY = "wormholesLocalFolderMode";
const OLD_WORMHOLES_LOCAL_MODE_KEY = "worldBuilderWormholesLocalFolderMode";
const WORMHOLES_BROWSER_STORAGE_UPLOAD_PROMPT_DISMISSED_KEY =
  "wormholesBrowserStorageUploadPromptDismissed";

/* --- storage status helpers --- */

const STORAGE_FOOTNOTE_IDS = {
  archive: "archiveStorageFootnote",
  literature: "literatureStorageFootnote",
  vision: "visionStorageFootnote",
};
const SETTINGS_STORAGE_FOOTNOTE_ID = "settingsStorageFootnote";
let storageFootnoteUpdateTimer = null;
let storageFootnoteUpdateToken = 0;

function storageByteSize(value) {
  try {
    return new Blob([String(value ?? "")]).size;
  } catch (e) {
    return String(value ?? "").length;
  }
}

function formatStorageBytes(bytes) {
  const safeBytes = Math.max(0, Number(bytes) || 0);
  if (safeBytes < 1024) return `${safeBytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = safeBytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const decimals = size < 10 ? 1 : 0;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

function migratedLocalStorageKeyBytes(primaryKey, oldKey) {
  const repository = repositoryLayer()?.local;
  try {
    const primaryValue = repository ? repository.get(primaryKey) : localStorage.getItem(primaryKey);
    if (primaryValue !== null) return storageByteSize(primaryKey) + storageByteSize(primaryValue);
    if (oldKey) {
      const oldValue = repository ? repository.get(oldKey) : localStorage.getItem(oldKey);
      if (oldValue !== null) return storageByteSize(oldKey) + storageByteSize(oldValue);
    }
  } catch (e) {}
  return 0;
}

function sectionLocalStorageBytes(section) {
  if (!currentUniverseId) return 0;
  if (section === "archive") {
    return (
      migratedLocalStorageKeyBytes(archiveStorageKey(), oldArchiveStorageKey()) +
      migratedLocalStorageKeyBytes(connectionNotesStorageKey(), oldConnectionNotesStorageKey())
    );
  }
  if (section === "literature") {
    return migratedLocalStorageKeyBytes(literatureStorageKey(), oldLiteratureStorageKey());
  }
  if (section === "vision") {
    return migratedLocalStorageKeyBytes(visionStorageKey(), oldVisionStorageKey());
  }
  return 0;
}

function appLocalStorageBytes() {
  let bytes = 0;
  const repository = repositoryLayer()?.local;
  try {
    const keys =
      repository?.keys?.() ||
      Array.from({length: localStorage.length}, (_, index) => localStorage.key(index)).filter(
        Boolean,
      );
    for (const key of keys) {
      if (key.startsWith("wormholes") || key.startsWith("worldBuilder")) {
        const value = repository ? repository.get(key) : localStorage.getItem(key);
        bytes += storageByteSize(key) + storageByteSize(value || "");
      }
    }
  } catch (e) {}
  return bytes;
}

async function appLargeDataBytes() {
  const store = repositoryLayer()?.largeData || largeDataStore();
  if (!store?.estimatePrefixBytes) return 0;
  const prefixes = [];
  for (const universe of universes || []) {
    if (!universe?.id) continue;
    prefixes.push(`literature:${universe.id}:`, `vision:${universe.id}:`);
  }
  if (currentUniverseId && !prefixes.some((prefix) => prefix.includes(currentUniverseId))) {
    prefixes.push(`literature:${currentUniverseId}:`, `vision:${currentUniverseId}:`);
  }
  try {
    return await store.estimatePrefixBytes(prefixes);
  } catch (e) {
    return 0;
  }
}

async function appBrowserStorageBytes() {
  return appLocalStorageBytes() + (await appLargeDataBytes());
}

async function appLocalFolderBytes() {
  if (!localFoldersEnabled) return 0;
  if (!wormholesRootFolderHandle) {
    const restored = await restoreFolderHandlesForCurrentUniverse({
      showPrompt: false,
      skipRender: true,
    });
    if (!restored || !wormholesRootFolderHandle) return null;
  }
  if (!(await hasFolderPermission(wormholesRootFolderHandle, "read"))) return null;
  return await directoryStorageBytes(wormholesRootFolderHandle);
}

function setSettingsStorageFootnote(text) {
  const element = document.getElementById(SETTINGS_STORAGE_FOOTNOTE_ID);
  if (element) element.textContent = text;
}

function sectionLargeDataPrefixes(section) {
  if (!currentUniverseId) return [];
  if (section === "literature") return [`literature:${currentUniverseId}:`];
  if (section === "vision") return [`vision:${currentUniverseId}:`];
  return [];
}

async function sectionLargeDataBytes(section) {
  const prefixes = sectionLargeDataPrefixes(section);
  const store = repositoryLayer()?.largeData || largeDataStore();
  if (!prefixes.length || !store?.estimatePrefixBytes) return 0;
  try {
    return await store.estimatePrefixBytes(prefixes);
  } catch (e) {
    return 0;
  }
}

async function sectionBrowserStorageBytes(section) {
  return sectionLocalStorageBytes(section) + (await sectionLargeDataBytes(section));
}

async function getCurrentSectionFolderHandle(section) {
  if (!localFoldersEnabled || !currentUniverseId) return null;
  const universe = getCurrentUniverse();
  if (!universe) return null;

  if (section === "archive") {
    if (creationFolderHandle) return creationFolderHandle;
    if (wormholesCreationsRootHandle)
      return await getExistingDirectory(wormholesCreationsRootHandle, universeFolderName(universe));
  }
  if (section === "literature") {
    if (literatureFolderHandle) return literatureFolderHandle;
    if (wormholesLiteratureRootHandle)
      return await getExistingDirectory(
        wormholesLiteratureRootHandle,
        universeFolderName(universe),
      );
  }
  if (section === "vision") {
    if (visionFolderHandle) return visionFolderHandle;
    if (wormholesImagesRootHandle)
      return await getExistingDirectory(wormholesImagesRootHandle, universeFolderName(universe));
  }
  return null;
}

async function directoryStorageBytes(folderHandle, depth = 0) {
  if (!folderHandle || depth > 4) return 0;
  let bytes = 0;
  try {
    for await (const [name, handle] of folderHandle.entries()) {
      if (shouldSkipFolderPruneEntry(name)) continue;
      if (handle.kind === "file") {
        const file = await handle.getFile();
        bytes += file.size || 0;
      } else if (handle.kind === "directory") {
        bytes += await directoryStorageBytes(handle, depth + 1);
      }
    }
  } catch (e) {
    return null;
  }
  return bytes;
}

async function sectionLocalFolderBytes(section) {
  if (!localFoldersEnabled) return 0;
  const handle = await getCurrentSectionFolderHandle(section);
  if (!handle) return null;
  if (!(await hasFolderPermission(handle, "read"))) return null;
  return await directoryStorageBytes(handle);
}

function setSectionStorageFootnote(section, text) {
  const element = document.getElementById(STORAGE_FOOTNOTE_IDS[section]);
  if (!element) return;
  element.textContent = text;
  element.dataset.localFolderStatus = localFolderStatusSlug(text);
}

function localFolderStatusSlug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sectionHasActiveLocalFolderHandle(section) {
  if (localFolderUsesPrivateStorage()) return !!wormholesParentFolderHandle;
  if (section === "archive") return !!(creationFolderHandle || wormholesCreationsRootHandle);
  if (section === "literature") return !!(literatureFolderHandle || wormholesLiteratureRootHandle);
  if (section === "vision") return !!(visionFolderHandle || wormholesImagesRootHandle);
  return !!wormholesParentFolderHandle;
}

function sectionLocalFolderStatusText(section) {
  if (!localFolderApiSupported()) return "Local folder unavailable";
  if (!localFoldersEnabled) return "Local folder not connected";
  if (localFolderRestoreInProgress || localFolderSwitchInProgress) return "Reconnect local folder";
  if (sectionHasActiveLocalFolderHandle(section)) return "Using local folder";
  return "Reconnect local folder";
}

function updateSectionLocalFolderStatuses() {
  Object.keys(STORAGE_FOOTNOTE_IDS).forEach((section) => {
    setSectionStorageFootnote(section, sectionLocalFolderStatusText(section));
  });
}

async function updateStorageFootnotes() {
  const token = ++storageFootnoteUpdateToken;
  updateSectionLocalFolderStatuses();
  const settingsFootnote = document.getElementById(SETTINGS_STORAGE_FOOTNOTE_ID);
  if (!settingsFootnote?.dataset.storageMeasured) {
    setSettingsStorageFootnote("Total: calculating…");
  }

  const appBrowserBytes = await appBrowserStorageBytes();
  if (token !== storageFootnoteUpdateToken) return;
  const appFolderBytes = await appLocalFolderBytes();
  if (token !== storageFootnoteUpdateToken) return;
  const knownFolderBytes = appFolderBytes === null ? 0 : appFolderBytes;
  let totalText = `Total: ${formatStorageBytes(appBrowserBytes + knownFolderBytes)}. Browser: ${formatStorageBytes(appBrowserBytes)}.`;
  if (localFoldersEnabled) {
    totalText +=
      appFolderBytes === null
        ? " Local folder: reconnect to measure."
        : ` Local folder: ${formatStorageBytes(appFolderBytes)}.`;
  } else {
    totalText += " Local folder: 0 KB.";
  }
  setSettingsStorageFootnote(totalText);
  const measuredFootnote = document.getElementById(SETTINGS_STORAGE_FOOTNOTE_ID);
  if (measuredFootnote) measuredFootnote.dataset.storageMeasured = "true";
}

function requestStorageFootnoteUpdate() {
  if (storageFootnoteUpdateTimer) clearTimeout(storageFootnoteUpdateTimer);
  storageFootnoteUpdateTimer = setTimeout(() => {
    storageFootnoteUpdateTimer = null;
    updateStorageFootnotes();
  }, 80);
}

/* --- schema storage key --- */

const WORMHOLES_SCHEMA_KEY = "wormholesSchemaVersion";

/* --- readStoredSchemaVersion --- */

function readStoredSchemaVersion() {
  const repository = repositoryLayer()?.preferences;
  if (repository) return Number(repository.readText(WORMHOLES_SCHEMA_KEY, "0") || 0) || 0;
  try {
    return Number(localStorage.getItem(WORMHOLES_SCHEMA_KEY) || 0) || 0;
  } catch (e) {
    return 0;
  }
}

/* --- saveStoredSchemaVersion --- */

function saveStoredSchemaVersion() {
  saveLocalStorageText(
    WORMHOLES_SCHEMA_KEY,
    String(WORMHOLES_APP_SCHEMA_VERSION),
    "Could not save schema version",
    "Schema version could not be saved.",
  );
}

/* --- loadBridgeNotesFromStorage --- */

function loadBridgeNotesFromStorage() {
  try {
    bridgeNotes =
      wormholesRepository("bridgeNotes")?.read(null, {}) ??
      readPersistedDatasetData(WORMHOLE_BRIDGE_NOTES_KEY, OLD_WORMHOLE_BRIDGE_NOTES_KEY, {});
  } catch (e) {
    bridgeNotes = {};
  }
  bridgeNotes =
    window.WormholesRenderValidation?.validateBridgeNotes?.(bridgeNotes, {
      storageKey: WORMHOLE_BRIDGE_NOTES_KEY,
      releaseProtection: true,
    })?.value || bridgeNotes;
  commitAppModelDomain("bridgeNotes", bridgeNotes, "load bridge notes");
}

/* --- saveBridgeNotesToStorage --- */

function saveBridgeNotesToStorage() {
  commitAppModelDomain("bridgeNotes", bridgeNotes, "save bridge notes");
  const repository = wormholesRepository("bridgeNotes");
  const ok = repository
    ? persistenceResultOk(repository.save(null, bridgeNotes))
    : saveLocalStorageJson(
        WORMHOLE_BRIDGE_NOTES_KEY,
        bridgeNotes,
        "Wormhole bridge notes could not be saved",
        "Bridge notes could not be saved.",
      );
  if (ok && !repository) removeLocalStorageKey(OLD_WORMHOLE_BRIDGE_NOTES_KEY);
  return ok;
}

/* --- saveUniversesToStorage --- */

function saveUniversesToStorage() {
  commitAppModelDomain("universes", universes, "save universes");
  const repository = wormholesRepository("universes");
  const ok = repository
    ? persistenceResultOk(repository.save(null, universes))
    : saveLocalStorageJson(
        UNIVERSES_KEY,
        universes,
        "Universes could not be saved to app storage",
        "Universes could not be saved.",
      );
  if (ok && !repository) removeLocalStorageKey(OLD_UNIVERSES_KEY);
  return ok;
}

/* --- loadUniversesFromStorage --- */

function loadUniversesFromStorage() {
  try {
    universes =
      wormholesRepository("universes")?.read(null, []) ??
      readPersistedDatasetData(UNIVERSES_KEY, OLD_UNIVERSES_KEY, []);
  } catch (e) {
    universes = [];
  }

  let changed = false;
  universes = universes.map((universe) => {
    const normalized = {
      ...universe,
      id: universe.id || makeId(),
      title: universe.title || "Untitled Universe",
      summary: universe.summary || "",
      bridges: Array.isArray(universe.bridges) ? universe.bridges : [],
      createdAt: universe.createdAt || new Date().toISOString(),
    };
    if (!normalized.diskFolderName) {
      normalized.diskFolderName = stableUniverseFolderName(normalized);
      changed = true;
    }
    return normalized;
  });

  commitAppModelDomain("universes", universes, "load universes");
  if (changed) saveUniversesToStorage();
}

/* --- migrateLegacyArchiveIfNeeded --- */

function migrateLegacyArchiveIfNeeded() {
  if (universes.length > 0) return;

  const legacyArchive =
    repositoryLayer()?.local?.get(LEGACY_ARCHIVE_KEY) ?? localStorage.getItem(LEGACY_ARCHIVE_KEY);
  const legacyNotes =
    repositoryLayer()?.local?.get(LEGACY_CONNECTION_NOTES_KEY) ??
    localStorage.getItem(LEGACY_CONNECTION_NOTES_KEY);

  if (!legacyArchive && !legacyNotes) return;

  const legacyUniverse = {
    id: makeId(),
    title: "Original Universe",
    summary: "",
    bridges: [],
    createdAt: new Date().toISOString(),
  };
  legacyUniverse.diskFolderName = stableUniverseFolderName(legacyUniverse);

  universes.unshift(legacyUniverse);

  if (
    legacyArchive &&
    saveLocalStorageText(
      archiveStorageKey(legacyUniverse.id),
      legacyArchive,
      "Could not migrate legacy archive",
      "Legacy archive could not be migrated.",
    )
  ) {
    removeLocalStorageKey(LEGACY_ARCHIVE_KEY);
  }

  if (
    legacyNotes &&
    saveLocalStorageText(
      connectionNotesStorageKey(legacyUniverse.id),
      legacyNotes,
      "Could not migrate earlier connection details",
      "Earlier connection details could not be migrated.",
    )
  ) {
    removeLocalStorageKey(LEGACY_CONNECTION_NOTES_KEY);
  }
  saveUniversesToStorage();
}

/* --- saveArchiveToStorage --- */

function saveArchiveToStorage() {
  if (!currentUniverseId) return true;

  commitAppModelDomain("archive", archiveEntries, "save archive");
  const repository = wormholesRepository("archive");
  const ok = repository
    ? persistenceResultOk(repository.save(currentUniverseId, archiveEntries))
    : saveLocalStorageJson(
        archiveStorageKey(),
        archiveEntries,
        "Archive could not be saved to app storage",
        "Archive could not be saved.",
      );
  if (ok && !repository) requestStorageFootnoteUpdate();
  return ok;
}

/* --- saveConnectionNotesToStorage --- */

function saveConnectionNotesToStorage() {
  if (!currentUniverseId) return true;

  commitAppModelDomain("connectionNotes", connectionNotes, "save connection notes");
  const repository = wormholesRepository("connectionNotes");
  return repository
    ? persistenceResultOk(repository.save(currentUniverseId, connectionNotes))
    : saveLocalStorageJson(
        connectionNotesStorageKey(),
        connectionNotes,
        "Connection details could not be saved to app storage",
        "Connection details could not be saved.",
      );
}

/* --- loadConnectionNotesFromStorage --- */

function loadConnectionNotesFromStorage() {
  if (!currentUniverseId) {
    connectionNotes = {};
    commitAppModelDomain("connectionNotes", connectionNotes, "clear connection notes");
    return;
  }

  try {
    connectionNotes =
      wormholesRepository("connectionNotes")?.read(currentUniverseId, {}) ??
      readPersistedDatasetData(connectionNotesStorageKey(), oldConnectionNotesStorageKey(), {});
  } catch (e) {
    connectionNotes = {};
  }
  connectionNotes =
    window.WormholesRenderValidation?.validateConnectionNotes?.(connectionNotes, {
      storageKey: connectionNotesStorageKey(),
      universeId: currentUniverseId,
      releaseProtection: true,
    })?.value || connectionNotes;
  commitAppModelDomain("connectionNotes", connectionNotes, "load connection notes");
}

/* --- loadArchiveFromStorage --- */

function loadArchiveFromStorage() {
  if (!currentUniverseId) {
    archiveEntries = [];
    commitAppModelDomain("archive", archiveEntries, "clear archive");
    return;
  }

  try {
    archiveEntries =
      wormholesRepository("archive")?.read(currentUniverseId, []) ??
      readPersistedDatasetData(archiveStorageKey(), oldArchiveStorageKey(), []);
  } catch (e) {
    archiveEntries = [];
  }

  let changed = false;
  archiveEntries = archiveEntries.map((entry) => {
    if (!entry.id) {
      changed = true;
      return {
        ...entry,
        id: makeId(),
        connections: entry.connections || [],
        bridges: normalizeBridges(entry.bridges),
        storage: entry.storage || "",
        folderFileName: entry.folderFileName || "",
      };
    }
    return {
      ...entry,
      connections: entry.connections || [],
      bridges: normalizeBridges(entry.bridges),
      storage: entry.storage || "",
      folderFileName: entry.folderFileName || "",
    };
  });

  archiveEntries =
    window.WormholesRenderValidation?.validateArchive?.(archiveEntries, {
      storageKey: archiveStorageKey(),
      universeId: currentUniverseId,
      releaseProtection: true,
    })?.value || archiveEntries;
  normalizeArchiveGroups();
  archiveEntries =
    window.WormholesRenderValidation?.validateArchive?.(archiveEntries, {
      storageKey: archiveStorageKey(),
      universeId: currentUniverseId,
      report: false,
    })?.value || archiveEntries;
  commitAppModelDomain("archive", archiveEntries, "load archive");
  if (changed) saveArchiveToStorage();
}

/* --- readArchiveForUniverse --- */

function readArchiveForUniverse(universeId) {
  try {
    const entries =
      wormholesRepository("archive")?.read(universeId, []) ??
      readPersistedDatasetData(archiveStorageKey(universeId), oldArchiveStorageKey(universeId), []);
    return (
      window.WormholesRenderValidation?.validateArchive?.(entries, {
        storageKey: archiveStorageKey(universeId),
        universeId,
        report: false,
        releaseProtection: true,
      })?.value || entries
    );
  } catch (e) {
    return [];
  }
}

/* --- saveArchiveForUniverse --- */

function saveArchiveForUniverse(universeId, entries) {
  const repository = wormholesRepository("archive");
  const ok = repository
    ? persistenceResultOk(
        repository.save(universeId, entries, {
          context: "Target universe archive could not be saved",
        }),
      )
    : saveLocalStorageJson(
        archiveStorageKey(universeId),
        entries,
        "Target universe archive could not be saved",
        "Archive could not be saved.",
      );
  if (ok && universeId === currentUniverseId && !repository) requestStorageFootnoteUpdate();
  return ok;
}

/* --- readConnectionNotesForUniverse --- */

function readConnectionNotesForUniverse(universeId) {
  try {
    return (
      wormholesRepository("connectionNotes")?.read(universeId, {}) ??
      readPersistedDatasetData(
        connectionNotesStorageKey(universeId),
        oldConnectionNotesStorageKey(universeId),
        {},
      )
    );
  } catch (e) {
    return {};
  }
}

/* --- saveConnectionNotesForUniverse --- */

function saveConnectionNotesForUniverse(universeId, notes) {
  const repository = wormholesRepository("connectionNotes");
  return repository
    ? persistenceResultOk(
        repository.save(universeId, notes, {
          context: "Target universe connection details could not be saved",
        }),
      )
    : saveLocalStorageJson(
        connectionNotesStorageKey(universeId),
        notes,
        "Target universe connection details could not be saved",
        "Connection details could not be saved.",
      );
}

/* Public persistence surface for served ES-module builds. */
const STORAGE_FACADE_API = Object.freeze({
  repositoryLayer,
  wormholesRepository,
  persistenceResultOk,
  persistenceResultFromBoolean,
  persistenceResultFor,
  appModelLayer,
  commitAppModelDomain,
  sanitizeMapFilters,
  readMapFilterPreferences,
  loadMapFilters,
  saveMapFilters,
  rememberStorageFailure,
  recentStorageFailureStillMatters,
  rememberFolderSaveFailure,
  recentFolderSaveWarningStillMatters,
  dispatchPersistedDatasetChange,
  saveLocalStorageText,
  blockPersistedDatasetWrites,
  unblockPersistedDatasetWrites,
  persistedDatasetWriteBlocked,
  persistedDatasetWriteBlockReason,
  parsePersistedDatasetText,
  readPersistedDataset,
  readPersistedDatasetData,
  saveLocalStorageJson,
  removeLocalStorageKey,
  UNIVERSES_KEY,
  OLD_UNIVERSES_KEY,
  WORMHOLE_BRIDGE_NOTES_KEY,
  OLD_WORMHOLE_BRIDGE_NOTES_KEY,
  WORMHOLES_BROWSER_STORAGE_UPLOAD_PROMPT_DISMISSED_KEY,
  readMigratedLocalStorageValue,
  removeMigratedLocalStorageValue,
  archiveStorageKey,
  oldArchiveStorageKey,
  connectionNotesStorageKey,
  oldConnectionNotesStorageKey,
  literatureStorageKey,
  oldLiteratureStorageKey,
  visionStorageKey,
  oldVisionStorageKey,
  registerWormholesAppRepositories,
  folderHandleKey,
  storageByteSize,
  formatStorageBytes,
  migratedLocalStorageKeyBytes,
  sectionLocalStorageBytes,
  appLocalStorageBytes,
  appLargeDataBytes,
  appBrowserStorageBytes,
  appLocalFolderBytes,
  setSettingsStorageFootnote,
  sectionLargeDataPrefixes,
  sectionLargeDataBytes,
  sectionBrowserStorageBytes,
  getCurrentSectionFolderHandle,
  directoryStorageBytes,
  sectionLocalFolderBytes,
  setSectionStorageFootnote,
  localFolderStatusSlug,
  sectionHasActiveLocalFolderHandle,
  sectionLocalFolderStatusText,
  updateSectionLocalFolderStatuses,
  updateStorageFootnotes,
  requestStorageFootnoteUpdate,
  readStoredSchemaVersion,
  saveStoredSchemaVersion,
  loadBridgeNotesFromStorage,
  saveBridgeNotesToStorage,
  saveUniversesToStorage,
  loadUniversesFromStorage,
  migrateLegacyArchiveIfNeeded,
  saveArchiveToStorage,
  saveConnectionNotesToStorage,
  loadConnectionNotesFromStorage,
  loadArchiveFromStorage,
  readArchiveForUniverse,
  saveArchiveForUniverse,
  readConnectionNotesForUniverse,
  saveConnectionNotesForUniverse,
});

const registerStorageFacadeServices =
  typeof importedRegisterControllerServices !== "undefined"
    ? importedRegisterControllerServices
    : globalThis.registerControllerServices ||
      ((services) => {
        Object.assign(globalThis, services);
        return services;
      });
registerStorageFacadeServices(STORAGE_FACADE_API);
globalThis.WormholesStorageFacade = STORAGE_FACADE_API;
