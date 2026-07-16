/* GENERATED from scripts/modules/app-errors.mjs. Do not edit this compatibility adapter directly. */
(function(){
  "use strict";
  const DEFAULT_CODE = "WORMHOLES_ERROR";
  
  const DEFINITIONS = Object.freeze({
    WORMHOLES_ERROR: Object.freeze({
      userMessage: "Something went wrong. Try again.",
      action: "Retry the action once.",
      recoverable: true,
    }),
    WORMHOLES_UNEXPECTED: Object.freeze({
      userMessage: "Something went wrong. Try again.",
      action: "Retry the action once. If it fails again, keep the app open and make a backup.",
      recoverable: true,
    }),
    WORMHOLES_ASYNC_ERROR: Object.freeze({
      userMessage: "Something went wrong while saving. Try again.",
      action: "Retry once. If it fails again, keep the app open and make a backup.",
      recoverable: true,
    }),
    WORMHOLES_SAVE_FAILED: Object.freeze({
      userMessage: "Couldn’t save your changes. Try again.",
      action: "Retry once. If saving still fails, export App Data before leaving.",
      recoverable: true,
    }),
    WORMHOLES_SCHEMA_INVALID: Object.freeze({
      userMessage: "This data could not be saved because its format is not valid.",
      action: "Use Recovery or restore a recent backup, then try again.",
      recoverable: true,
    }),
    WORMHOLES_QUOTA_EXCEEDED: Object.freeze({
      userMessage: "Storage is full. Free some space, then try again.",
      action: "Make a backup, then remove unneeded large files or free browser storage.",
      recoverable: true,
    }),
    WORMHOLES_CORRUPT_DATASET_BLOCKED: Object.freeze({
      userMessage: "Saving is paused because saved data may be damaged.",
      action: "Use Recovery or restore a recent backup before making more changes.",
      recoverable: true,
    }),
    WORMHOLES_STORAGE_UNAVAILABLE: Object.freeze({
      userMessage: "Browser storage is not available. Check browser settings, then try again.",
      action: "Allow site storage, use the active Wormholes tab, then try again.",
      recoverable: true,
    }),
    WORMHOLES_PERMISSION_DENIED: Object.freeze({
      userMessage: "Wormholes does not have permission to save there.",
      action: "Reconnect the folder, allow access, then try again.",
      recoverable: true,
    }),
    WORMHOLES_FOLDER_SYNC_FAILED: Object.freeze({
      userMessage: "Saved in Wormholes, but the folder could not be updated.",
      action: "Reconnect the folder, then try the folder sync again.",
      recoverable: true,
    }),
    WORMHOLES_LOAD_FAILED: Object.freeze({
      userMessage: "Some saved data couldn’t load. Reload the app.",
      action: "Reload once. If the problem remains, use Restore Points or a recent backup.",
      recoverable: true,
    }),
    WORMHOLES_STORAGE_CAPACITY: Object.freeze({
      userMessage: "Storage is full. Free space, then try again.",
      action: "Free browser storage or remove large Wormholes files after making a backup.",
      recoverable: true,
    }),
    WORMHOLES_FOLDER_PERMISSION: Object.freeze({
      userMessage: "Folder access was denied. Reconnect the folder.",
      action: "Reconnect the local folder and allow access.",
      recoverable: true,
    }),
    WORMHOLES_FOLDER_READ: Object.freeze({
      userMessage: "Couldn’t read the folder. Reconnect it and try again.",
      action: "Reconnect the local folder, then retry the action.",
      recoverable: true,
    }),
    WORMHOLES_FOLDER_WRITE: Object.freeze({
      userMessage: "Couldn’t save to the folder. Check access and available space.",
      action: "Reconnect the folder and confirm it has available space.",
      recoverable: true,
    }),
    WORMHOLES_FOLDER_SYNC: Object.freeze({
      userMessage: "Folder sync is incomplete. Reconnect the folder and try again.",
      action: "Reconnect the local folder, then retry the sync.",
      recoverable: true,
    }),
    WORMHOLES_FOLDER_UNAVAILABLE: Object.freeze({
      userMessage: "Folder access isn’t supported in this browser.",
      action: "Use a browser that supports local folder access, or keep data in browser storage.",
      recoverable: false,
    }),
    WORMHOLES_BACKUP_TARGET: Object.freeze({
      userMessage: "Choose a different folder for the backup.",
      action: "Select a folder that is different from the active Wormholes folder.",
      recoverable: true,
    }),
    WORMHOLES_FILE_TOO_LARGE: Object.freeze({
      userMessage: "This file is too large. Choose a smaller file.",
      action: "Choose a smaller file or reduce its size, then try again.",
      recoverable: true,
    }),
    WORMHOLES_INVALID_JSON: Object.freeze({
      userMessage: "This file is damaged or unreadable. Choose another backup.",
      action: "Export a fresh App Data backup or choose another recent backup.",
      recoverable: true,
    }),
    WORMHOLES_NOT_APP_DATA: Object.freeze({
      userMessage: "This isn’t a Wormholes App Data backup. Choose an exported backup.",
      action: "Choose a file created with Download Backup.",
      recoverable: true,
    }),
    WORMHOLES_NEWER_VERSION: Object.freeze({
      userMessage: "This backup needs a newer Wormholes version.",
      action: "Open the backup with the same or a newer Wormholes version.",
      recoverable: true,
    }),
    WORMHOLES_UNSUPPORTED_VERSION: Object.freeze({
      userMessage: "This backup uses an unsupported older format. Try a newer backup.",
      action:
        "Use a newer backup, or open the old backup in an intermediate Wormholes version first.",
      recoverable: true,
    }),
    WORMHOLES_MALFORMED_IMPORT: Object.freeze({
      userMessage: "This backup is incomplete or damaged. Try another backup.",
      action: "Export a fresh backup from the source app or choose another recent backup.",
      recoverable: true,
    }),
    WORMHOLES_DUPLICATE_ID: Object.freeze({
      userMessage: "This backup has duplicate records. Export a fresh backup and try again.",
      action: "Download Backup again from the source app, then retry the import.",
      recoverable: true,
    }),
    WORMHOLES_BROKEN_REFERENCE: Object.freeze({
      userMessage: "This backup has missing links. Export a fresh backup and try again.",
      action: "Download Backup again from the source app, then retry the import.",
      recoverable: true,
    }),
    WORMHOLES_ENTITY_LIMIT_EXCEEDED: Object.freeze({
      userMessage: "This backup has too much content. Reduce it and try again.",
      action: "Reduce the reported content in the source app, export again, and retry.",
      recoverable: true,
    }),
    WORMHOLES_STRING_TOO_LONG: Object.freeze({
      userMessage: "Some text is too long. Shorten it and try again.",
      action: "Shorten the reported field in the source app, export again, and retry.",
      recoverable: true,
    }),
    WORMHOLES_NESTING_TOO_DEEP: Object.freeze({
      userMessage: "This backup is too complex to import. Try a fresh export.",
      action: "Create a fresh App Data export and retry.",
      recoverable: true,
    }),
    WORMHOLES_EMBEDDED_MEDIA_TOO_LARGE: Object.freeze({
      userMessage: "An embedded file is too large. Shrink it and try again.",
      action: "Reduce or remove the reported file, export again, and retry.",
      recoverable: true,
    }),
    WORMHOLES_EMBEDDED_MEDIA_INVALID: Object.freeze({
      userMessage: "An embedded file is damaged or unsupported. Replace it and try again.",
      action: "Replace or remove the reported file, export again, and retry.",
      recoverable: true,
    }),
    WORMHOLES_UNSAFE_URL: Object.freeze({
      userMessage: "A link uses an unsupported address. Fix the link and try again.",
      action: "Replace the reported link with a supported web address, then retry.",
      recoverable: true,
    }),
    WORMHOLES_IMPORT_SAFETY: Object.freeze({
      userMessage: "Import couldn’t start safely. Check storage, then try again.",
      action: "Check browser storage, close other Wormholes tabs, and retry.",
      recoverable: true,
    }),
    WORMHOLES_IMPORT_FAILED: Object.freeze({
      userMessage: "Import failed. Your existing data was kept.",
      action: "Try another recent backup. Keep this tab open if recovery is needed.",
      recoverable: true,
    }),
    WORMHOLES_EXPORT_FAILED: Object.freeze({
      userMessage: "Export failed. Try again.",
      action: "Retry the export. If it still fails, check browser storage and available space.",
      recoverable: true,
    }),
    WORMHOLES_RECOVERY_FAILED: Object.freeze({
      userMessage: "Recovery failed. Try another snapshot or backup.",
      action: "Keep the app open and try another recent restore point or backup.",
      recoverable: true,
    }),
    WORMHOLES_RESTORE_FAILED: Object.freeze({
      userMessage: "Restore failed. Your previous data was kept.",
      action: "Try another recent backup. Keep this tab open if recovery is needed.",
      recoverable: true,
    }),
    WORMHOLES_RECOVERY_INCOMPLETE: Object.freeze({
      userMessage: "Restore failed, and recovery was incomplete. Keep this tab open.",
      action: "Use Restore Points or your latest App Data backup before making more changes.",
      recoverable: true,
    }),
    WORMHOLES_PERSISTED_SCHEMA: Object.freeze({
      userMessage: "Some saved data is damaged. Use recovery or a recent backup.",
      action: "Open Restore Points or restore a recent App Data backup.",
      recoverable: true,
    }),
  });
  
  function normalizeCode(code) {
    const value = String(code || "").trim();
    return value.startsWith("WORMHOLES_") ? value : DEFAULT_CODE;
  }
  
  function definitionFor(code) {
    return DEFINITIONS[normalizeCode(code)] || DEFINITIONS[DEFAULT_CODE];
  }
  
  class WormholesError extends Error {
    constructor(message, options = {}) {
      const code = normalizeCode(options.code);
      const definition = definitionFor(code);
      super(String(message || "Wormholes could not complete the action."));
      this.name = String(options.name || "WormholesError");
      this.code = code;
      this.userMessage = String(options.userMessage || definition.userMessage);
      this.action = String(options.action || definition.action);
      this.recoverable =
        options.recoverable === undefined ? definition.recoverable !== false : !!options.recoverable;
      if (options.details !== undefined) this.details = options.details;
      if (options.cause !== undefined) this.cause = options.cause;
    }
  }
  
  function createError(code, message, options = {}) {
    return new WormholesError(message, {...options, code});
  }
  
  function normalizeError(error, options = {}) {
    if (!(error instanceof Error)) {
      return createError(
        options.code || DEFAULT_CODE,
        options.message || String(error || "Wormholes could not complete the action."),
        {...options, cause: error || options.cause},
      );
    }
  
    const code = normalizeCode(options.code || error.code);
    const definition = definitionFor(code);
    const values = {
      code,
      userMessage: String(options.userMessage || error.userMessage || definition.userMessage),
      action: String(options.action || error.action || definition.action),
      recoverable:
        options.recoverable === undefined
          ? error.recoverable === undefined
            ? definition.recoverable !== false
            : error.recoverable !== false
          : !!options.recoverable,
    };
  
    try {
      if (!error.code) error.code = values.code;
      if (!error.userMessage) error.userMessage = values.userMessage;
      if (!error.action) error.action = values.action;
      if (error.recoverable === undefined) error.recoverable = values.recoverable;
      if (options.details !== undefined && error.details === undefined)
        error.details = options.details;
      if (options.cause !== undefined && error.cause === undefined) error.cause = options.cause;
      return error;
    } catch (assignmentError) {
      return createError(code, options.message || error.message, {
        name: error.name,
        userMessage: values.userMessage,
        action: values.action,
        recoverable: values.recoverable,
        details: options.details,
        cause: options.cause === undefined ? error : options.cause,
      });
    }
  }
  
  function userMessageFor(errorOrCode, fallback = "") {
    if (errorOrCode && typeof errorOrCode === "object" && errorOrCode.userMessage) {
      return String(errorOrCode.userMessage);
    }
    const code =
      errorOrCode && typeof errorOrCode === "object" ? errorOrCode.code : String(errorOrCode || "");
    const definition = definitionFor(code);
    return String(definition?.userMessage || fallback || DEFINITIONS[DEFAULT_CODE].userMessage);
  }
  
  function actionFor(errorOrCode, fallback = "") {
    if (errorOrCode && typeof errorOrCode === "object" && errorOrCode.action) {
      return String(errorOrCode.action);
    }
    const code =
      errorOrCode && typeof errorOrCode === "object" ? errorOrCode.code : String(errorOrCode || "");
    const definition = definitionFor(code);
    return String(definition?.action || fallback || DEFINITIONS[DEFAULT_CODE].action);
  }
  
  function toErrorRecord(error, options = {}) {
    const normalized = normalizeError(error, options);
    return Object.freeze({
      name: String(normalized.name || "Error"),
      code: normalizeCode(normalized.code),
      message: String(normalized.message || ""),
      userMessage: userMessageFor(normalized),
      action: actionFor(normalized),
      recoverable: normalized.recoverable !== false,
    });
  }
  
  const ERROR_DEFINITIONS = DEFINITIONS;
  const ERROR_CODES = Object.freeze(
    Object.keys(DEFINITIONS).reduce((codes, code) => {
      codes[code.replace(/^WORMHOLES_/, "")] = code;
      return codes;
    }, {}),
  );
  
  function install(root = globalThis) {
    const target = root.window || root;
    const api = Object.freeze({
      WormholesError,
      ERROR_CODES,
      ERROR_DEFINITIONS,
      createError,
      normalizeError,
      userMessageFor,
      actionFor,
      toErrorRecord,
    });
    target.WormholesAppErrors = api;
    return api;
  }
  
  const api = install(globalThis);
})();
