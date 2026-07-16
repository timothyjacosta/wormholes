/* Wormholes Beta 248 storage/runtime-state ownership boundary.
   Folder handles, local-folder synchronization flags, transient notification
   state, and image object URLs live here rather than in the application shell. */

export let literatureFolderHandle = null;
export let visionFolderHandle = null;
export let wormholesParentFolderHandle = null;
export let previousWormholesSourceFolderHandle = null;
export let wormholesRootFolderHandle = null;
export let wormholesLiteratureRootHandle = null;
export let wormholesImagesRootHandle = null;
export let wormholesCreationsRootHandle = null;
export let creationFolderHandle = null;
export let localFoldersEnabled = false;
export let localFolderPendingSync = false;
export let localFolderRestoreInProgress = false;
export let localFolderSwitchInProgress = false;
export let localFolderStorageMode = "native";
export let savedToastTimer = null;
export let savedToastLastMessage = "";
export let savedToastLastAt = 0;
export let recentStorageFailureMessage = "";
export let recentStorageFailureAt = 0;
export let recentFolderSaveWarningMessage = "";
export let recentFolderSaveWarningAt = 0;
export const PARTIAL_FOLDER_SAVE_MESSAGE = "Saved in Wormholes, but the folder was not updated.";
export let visionObjectUrls = [];
export let archiveVisionObjectUrls = [];
export let visionLinksObjectUrls = [];
export let visionImageViewerObjectUrl = "";

function defineBinding(target, name, getter, setter) {
  const existing = Object.getOwnPropertyDescriptor(target, name);
  if (existing && existing.configurable === false) return false;
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: false,
    get: getter,
    set: setter,
  });
  return true;
}

export function installLegacyStorageStateBindings(target = globalThis) {
  const bind = (name, getter, setter) => defineBinding(target, name, getter, setter);
  bind(
    "literatureFolderHandle",
    () => literatureFolderHandle,
    (value) => {
      literatureFolderHandle = value ?? null;
    },
  );
  bind(
    "visionFolderHandle",
    () => visionFolderHandle,
    (value) => {
      visionFolderHandle = value ?? null;
    },
  );
  bind(
    "wormholesParentFolderHandle",
    () => wormholesParentFolderHandle,
    (value) => {
      wormholesParentFolderHandle = value ?? null;
    },
  );
  bind(
    "previousWormholesSourceFolderHandle",
    () => previousWormholesSourceFolderHandle,
    (value) => {
      previousWormholesSourceFolderHandle = value ?? null;
    },
  );
  bind(
    "wormholesRootFolderHandle",
    () => wormholesRootFolderHandle,
    (value) => {
      wormholesRootFolderHandle = value ?? null;
    },
  );
  bind(
    "wormholesLiteratureRootHandle",
    () => wormholesLiteratureRootHandle,
    (value) => {
      wormholesLiteratureRootHandle = value ?? null;
    },
  );
  bind(
    "wormholesImagesRootHandle",
    () => wormholesImagesRootHandle,
    (value) => {
      wormholesImagesRootHandle = value ?? null;
    },
  );
  bind(
    "wormholesCreationsRootHandle",
    () => wormholesCreationsRootHandle,
    (value) => {
      wormholesCreationsRootHandle = value ?? null;
    },
  );
  bind(
    "creationFolderHandle",
    () => creationFolderHandle,
    (value) => {
      creationFolderHandle = value ?? null;
    },
  );
  bind(
    "localFoldersEnabled",
    () => localFoldersEnabled,
    (value) => {
      localFoldersEnabled = value === true;
    },
  );
  bind(
    "localFolderPendingSync",
    () => localFolderPendingSync,
    (value) => {
      localFolderPendingSync = value === true;
    },
  );
  bind(
    "localFolderRestoreInProgress",
    () => localFolderRestoreInProgress,
    (value) => {
      localFolderRestoreInProgress = value === true;
    },
  );
  bind(
    "localFolderSwitchInProgress",
    () => localFolderSwitchInProgress,
    (value) => {
      localFolderSwitchInProgress = value === true;
    },
  );
  bind(
    "localFolderStorageMode",
    () => localFolderStorageMode,
    (value) => {
      localFolderStorageMode = String(value || "native");
    },
  );
  bind(
    "savedToastTimer",
    () => savedToastTimer,
    (value) => {
      savedToastTimer = value ?? null;
    },
  );
  bind(
    "savedToastLastMessage",
    () => savedToastLastMessage,
    (value) => {
      savedToastLastMessage = String(value || "");
    },
  );
  bind(
    "savedToastLastAt",
    () => savedToastLastAt,
    (value) => {
      savedToastLastAt = Number(value) || 0;
    },
  );
  bind(
    "recentStorageFailureMessage",
    () => recentStorageFailureMessage,
    (value) => {
      recentStorageFailureMessage = String(value || "");
    },
  );
  bind(
    "recentStorageFailureAt",
    () => recentStorageFailureAt,
    (value) => {
      recentStorageFailureAt = Number(value) || 0;
    },
  );
  bind(
    "recentFolderSaveWarningMessage",
    () => recentFolderSaveWarningMessage,
    (value) => {
      recentFolderSaveWarningMessage = String(value || "");
    },
  );
  bind(
    "recentFolderSaveWarningAt",
    () => recentFolderSaveWarningAt,
    (value) => {
      recentFolderSaveWarningAt = Number(value) || 0;
    },
  );
  bind(
    "visionObjectUrls",
    () => visionObjectUrls,
    (value) => {
      visionObjectUrls = Array.isArray(value) ? value : [];
    },
  );
  bind(
    "archiveVisionObjectUrls",
    () => archiveVisionObjectUrls,
    (value) => {
      archiveVisionObjectUrls = Array.isArray(value) ? value : [];
    },
  );
  bind(
    "visionLinksObjectUrls",
    () => visionLinksObjectUrls,
    (value) => {
      visionLinksObjectUrls = Array.isArray(value) ? value : [];
    },
  );
  bind(
    "visionImageViewerObjectUrl",
    () => visionImageViewerObjectUrl,
    (value) => {
      visionImageViewerObjectUrl = String(value || "");
    },
  );
  return target;
}

export function readToastRuntimeState() {
  return {savedToastTimer, savedToastLastMessage, savedToastLastAt};
}

export function writeToastRuntimeState(next = {}) {
  if (Object.prototype.hasOwnProperty.call(next, "savedToastTimer"))
    savedToastTimer = next.savedToastTimer ?? null;
  if (Object.prototype.hasOwnProperty.call(next, "savedToastLastMessage"))
    savedToastLastMessage = String(next.savedToastLastMessage || "");
  if (Object.prototype.hasOwnProperty.call(next, "savedToastLastAt"))
    savedToastLastAt = Number(next.savedToastLastAt) || 0;
  return readToastRuntimeState();
}

export function clearRecentStorageFailure() {
  recentStorageFailureMessage = "";
  recentStorageFailureAt = 0;
}

export function clearRecentFolderSaveWarning() {
  recentFolderSaveWarningMessage = "";
  recentFolderSaveWarningAt = 0;
}

export function readStorageWarningState() {
  return {
    recentStorageFailureMessage,
    recentStorageFailureAt,
    recentFolderSaveWarningMessage,
    recentFolderSaveWarningAt,
  };
}
