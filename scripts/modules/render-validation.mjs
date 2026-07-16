/* Wormholes Beta 248 normalized-data rendering safeguards.
   Performs a final, non-destructive shape check after migration/normalization and before
   app data is handed to cards, lists, images, or maps. Unsafe records are hidden for the
   current session and the affected persisted dataset is write-protected so preserved raw
   data cannot be overwritten by the filtered view. */
/* Canonical ES-module source. The direct-file build uses a generated classic adapter. */

export function install(root = globalThis) {
  const global = root.window || root;
  const window = global;
  const document = root.document || global.document;

  const reportedIssues = new Set();
  const renderBlockedKeys = new Set();

  function isPlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf ? Object.getPrototypeOf(value) : Object.prototype;
    return prototype === Object.prototype || prototype === null;
  }

  function isString(value) {
    return typeof value === "string";
  }
  function isNonEmptyString(value) {
    return isString(value) && value.trim().length > 0;
  }
  function isFiniteNonNegative(value) {
    return Number.isFinite(Number(value)) && Number(value) >= 0;
  }
  function isStringArray(value) {
    return Array.isArray(value) && value.every(isNonEmptyString);
  }

  function validValueCell(value) {
    return value === null || value === undefined || (isPlainObject(value) && isString(value.val));
  }

  function validBridge(value) {
    return (
      isPlainObject(value) &&
      isNonEmptyString(value.universeId) &&
      (value.creationId === null ||
        value.creationId === undefined ||
        isNonEmptyString(value.creationId))
    );
  }

  function validBridges(value) {
    return Array.isArray(value) && value.every(validBridge);
  }

  function validTags(value) {
    if (!isPlainObject(value) || !isStringArray(value.universes)) return false;
    if (!Array.isArray(value.entries)) return false;
    return value.entries.every(
      (tag) =>
        isPlainObject(tag) && isNonEmptyString(tag.universeId) && isNonEmptyString(tag.entryId),
    );
  }

  function validUniverse(universe) {
    return (
      isPlainObject(universe) &&
      isNonEmptyString(universe.id) &&
      isString(universe.title) &&
      isString(universe.summary) &&
      validBridges(universe.bridges) &&
      isString(universe.createdAt) &&
      isString(universe.diskFolderName)
    );
  }

  function validArchiveEntry(entry) {
    if (
      !isPlainObject(entry) ||
      !isNonEmptyString(entry.id) ||
      !isString(entry.title) ||
      !isStringArray(entry.connections) ||
      !validBridges(entry.bridges) ||
      (entry.storage !== undefined && !isString(entry.storage)) ||
      (entry.folderFileName !== undefined && !isString(entry.folderFileName))
    )
      return false;
    if (entry.summary !== undefined && !isString(entry.summary)) return false;
    if (entry.notes !== undefined && (!Array.isArray(entry.notes) || !entry.notes.every(isString)))
      return false;

    if (entry.kind === "group") {
      return isStringArray(entry.groupIds) && entry.groupIds.length >= 2;
    }

    return (
      (entry.kind === undefined || entry.kind === "") &&
      validValueCell(entry.what) &&
      validValueCell(entry.attr1) &&
      validValueCell(entry.attr2) &&
      validValueCell(entry.pressure)
    );
  }

  function validLiteratureEntry(doc) {
    if (
      !isPlainObject(doc) ||
      !isNonEmptyString(doc.id) ||
      !isString(doc.title) ||
      !isString(doc.content) ||
      !isString(doc.sourceName) ||
      !isString(doc.fileType) ||
      !isString(doc.mimeType) ||
      !isString(doc.fileData) ||
      !isFiniteNonNegative(doc.fileSize) ||
      !isString(doc.convertedFrom) ||
      !isString(doc.storage) ||
      !isString(doc.folderFileName) ||
      !isString(doc.contentStoreKey) ||
      !isString(doc.contentStored) ||
      !validTags(doc.tags) ||
      !isString(doc.createdAt) ||
      !isString(doc.updatedAt)
    )
      return false;

    const isGroup = doc.kind === "literatureGroup" || doc.fileType === "group";
    if (isGroup) {
      return (
        doc.kind === "literatureGroup" &&
        doc.fileType === "group" &&
        isStringArray(doc.groupIds) &&
        doc.groupIds.length >= 2
      );
    }
    return doc.kind === "" || doc.kind === undefined;
  }

  function validVisionEntry(item) {
    return (
      isPlainObject(item) &&
      isNonEmptyString(item.id) &&
      isString(item.title) &&
      isString(item.sourceName) &&
      isString(item.fileType) &&
      isString(item.mimeType) &&
      isString(item.thumbnailDataUrl) &&
      isString(item.dataUrl) &&
      isString(item.storage) &&
      isString(item.folderFileName) &&
      isString(item.dataStoreKey) &&
      isString(item.thumbnailStoreKey) &&
      isString(item.dataStored) &&
      isString(item.thumbnailStored) &&
      isFiniteNonNegative(item.fileSize) &&
      validTags(item.tags) &&
      isString(item.createdAt)
    );
  }

  function validNotesObject(value) {
    return isPlainObject(value) && Object.values(value).every(isString);
  }

  function labelFor(kind) {
    return (
      {
        universes: "universe",
        archive: "Archive",
        literature: "Literature",
        vision: "Vision Board",
        connectionNotes: "connection details",
        bridgeNotes: "bridge note",
      }[kind] || "stored"
    );
  }

  function datasetIssue(kind, options = {}) {
    return {
      ok: false,
      kind,
      label: labelFor(kind),
      storageKey: String(options.storageKey || ""),
      universeId: String(options.universeId || ""),
      invalidCount: Number(options.invalidCount || 1),
      totalCount: Number(options.totalCount || 0),
      reason: String(options.reason || "invalid normalized data"),
    };
  }

  function protectDataset(result) {
    if (!result?.storageKey || typeof blockPersistedDatasetWrites !== "function") return;
    blockPersistedDatasetWrites(
      result.storageKey,
      `${result.label} data contains an item that could not be safely displayed.`,
    );
    renderBlockedKeys.add(result.storageKey);
  }

  function releaseOwnedProtection(storageKey) {
    const key = String(storageKey || "");
    if (!key || !renderBlockedKeys.has(key)) return;
    renderBlockedKeys.delete(key);
    if (typeof unblockPersistedDatasetWrites === "function") unblockPersistedDatasetWrites(key);
  }

  function reportIssue(result) {
    if (!result || result.ok) return;
    const key = `${result.storageKey || result.kind}:${result.invalidCount}:${result.reason}`;
    if (reportedIssues.has(key)) return;
    reportedIssues.add(key);
    const noun = result.invalidCount === 1 ? "item" : "items";
    const error = new Error(
      `${result.invalidCount} ${result.label} ${noun} did not match the app-ready data shape.`,
    );
    if (typeof reportAppError === "function") {
      reportAppError("Stored data display check", error, {
        code: "WORMHOLES_LOAD_FAILED",
        userMessage: `Some saved ${result.label} data could not be displayed. Your data was preserved.`,
      });
    }
  }

  function validateRecordArray(kind, value, validator, options = {}) {
    const storageKey = String(options.storageKey || "");
    if (!Array.isArray(value)) {
      const issue = datasetIssue(kind, {
        storageKey,
        universeId: options.universeId,
        invalidCount: 1,
        reason: "not-an-array",
      });
      protectDataset(issue);
      if (options.report !== false) reportIssue(issue);
      return {value: [], issues: [issue], ok: false};
    }

    const seenIds = new Set();
    const valid = [];
    let invalidCount = 0;
    for (const record of value) {
      const id = isPlainObject(record) ? String(record.id || "") : "";
      const duplicate = !!id && seenIds.has(id);
      if (!validator(record) || duplicate) {
        invalidCount += 1;
        continue;
      }
      seenIds.add(id);
      valid.push(record);
    }

    if (invalidCount) {
      const issue = datasetIssue(kind, {
        storageKey,
        universeId: options.universeId,
        invalidCount,
        totalCount: value.length,
        reason: "invalid-record",
      });
      protectDataset(issue);
      if (options.report !== false) reportIssue(issue);
      return {value: valid, issues: [issue], ok: false};
    }

    if (options.releaseProtection === true) releaseOwnedProtection(storageKey);
    return {value: valid, issues: [], ok: true};
  }

  function validateObject(kind, value, validator, options = {}) {
    const storageKey = String(options.storageKey || "");
    if (validator(value)) {
      if (options.releaseProtection === true) releaseOwnedProtection(storageKey);
      return {value, issues: [], ok: true};
    }
    const issue = datasetIssue(kind, {
      storageKey,
      universeId: options.universeId,
      invalidCount: 1,
      reason: "invalid-object",
    });
    protectDataset(issue);
    if (options.report !== false) reportIssue(issue);
    return {value: {}, issues: [issue], ok: false};
  }

  function validateUniverses(value, options = {}) {
    return validateRecordArray("universes", value, validUniverse, options);
  }

  function validateArchive(value, options = {}) {
    return validateRecordArray("archive", value, validArchiveEntry, options);
  }

  function validateLiterature(value, options = {}) {
    return validateRecordArray("literature", value, validLiteratureEntry, options);
  }

  function validateVision(value, options = {}) {
    return validateRecordArray("vision", value, validVisionEntry, options);
  }

  function validateConnectionNotes(value, options = {}) {
    return validateObject("connectionNotes", value, validNotesObject, options);
  }

  function validateBridgeNotes(value, options = {}) {
    return validateObject("bridgeNotes", value, validNotesObject, options);
  }

  window.WormholesRenderValidation = {
    validateUniverses,
    validateArchive,
    validateLiterature,
    validateVision,
    validateConnectionNotes,
    validateBridgeNotes,
    validUniverse,
    validArchiveEntry,
    validLiteratureEntry,
    validVisionEntry,
    validNotesObject,
    reportedIssues,
    renderBlockedKeys,
  };
  return window.WormholesRenderValidation;
}

export const api = install(globalThis);
export default api;
