/* GENERATED from scripts/modules/app-state-storage.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 storage/runtime-state ownership boundary.
   Folder handles, local-folder synchronization flags, transient notification
   state, and image object URLs live here rather than in the application shell. */

let literatureFolderHandle = null;
let visionFolderHandle = null;
let wormholesParentFolderHandle = null;
let previousWormholesSourceFolderHandle = null;
let wormholesRootFolderHandle = null;
let wormholesLiteratureRootHandle = null;
let wormholesImagesRootHandle = null;
let wormholesCreationsRootHandle = null;
let creationFolderHandle = null;
let localFoldersEnabled = false;
let localFolderPendingSync = false;
let localFolderRestoreInProgress = false;
let localFolderSwitchInProgress = false;
let localFolderStorageMode = "native";
let savedToastTimer = null;
let savedToastLastMessage = "";
let savedToastLastAt = 0;
let recentStorageFailureMessage = "";
let recentStorageFailureAt = 0;
let recentFolderSaveWarningMessage = "";
let recentFolderSaveWarningAt = 0;
const PARTIAL_FOLDER_SAVE_MESSAGE = "Saved in Wormholes, but the folder was not updated.";
let visionObjectUrls = [];
let archiveVisionObjectUrls = [];
let visionLinksObjectUrls = [];
let visionImageViewerObjectUrl = "";

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

function installLegacyStorageStateBindings(target = globalThis) {
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

function readToastRuntimeState() {
  return {savedToastTimer, savedToastLastMessage, savedToastLastAt};
}

function writeToastRuntimeState(next = {}) {
  if (Object.prototype.hasOwnProperty.call(next, "savedToastTimer"))
    savedToastTimer = next.savedToastTimer ?? null;
  if (Object.prototype.hasOwnProperty.call(next, "savedToastLastMessage"))
    savedToastLastMessage = String(next.savedToastLastMessage || "");
  if (Object.prototype.hasOwnProperty.call(next, "savedToastLastAt"))
    savedToastLastAt = Number(next.savedToastLastAt) || 0;
  return readToastRuntimeState();
}

function clearRecentStorageFailure() {
  recentStorageFailureMessage = "";
  recentStorageFailureAt = 0;
}

function clearRecentFolderSaveWarning() {
  recentFolderSaveWarningMessage = "";
  recentFolderSaveWarningAt = 0;
}

function readStorageWarningState() {
  return {
    recentStorageFailureMessage,
    recentStorageFailureAt,
    recentFolderSaveWarningMessage,
    recentFolderSaveWarningAt,
  };
}
