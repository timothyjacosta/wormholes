/* GENERATED from scripts/modules/app-data-validation.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 250 app-data validation helpers.
   Pure structural validation for imported Wormholes app-data payloads, split
   from the data-portability controller so validation ownership stays isolated. */

function wormholesImportPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.prototype.toString.call(value) === "[object Object]";
}

function malformedWormholesImportError(path, expected, value) {
  const actual = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  const details = {path, expected, actual};
  const appErrors =
    typeof importedAppErrorsApi !== "undefined"
      ? importedAppErrorsApi
      : globalThis.WormholesAppErrors;
  const error = appErrors?.createError
    ? appErrors.createError(
        "WORMHOLES_MALFORMED_IMPORT",
        `Malformed Wormholes backup: expected ${expected} at ${path}, but found ${actual}.`,
        {name: "WormholesMalformedImportError", details},
      )
    : new Error(
        `Malformed Wormholes backup: expected ${expected} at ${path}, but found ${actual}.`,
      );
  error.name = "WormholesMalformedImportError";
  error.code = "WORMHOLES_MALFORMED_IMPORT";
  error.importIssue = details;
  return error;
}

function assertWormholesImportShape(condition, path, expected, value) {
  if (!condition) throw malformedWormholesImportError(path, expected, value);
}

function validateOptionalImportString(record, key, path) {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return;
  assertWormholesImportShape(
    typeof record[key] === "string",
    `${path}.${key}`,
    "string",
    record[key],
  );
}

function validateImportStringArray(value, path) {
  assertWormholesImportShape(Array.isArray(value), path, "array of strings", value);
  value.forEach((entry, index) => {
    assertWormholesImportShape(typeof entry === "string", `${path}[${index}]`, "string", entry);
  });
}

function validateImportBridge(bridge, path) {
  if (typeof bridge === "string") return;
  assertWormholesImportShape(
    wormholesImportPlainObject(bridge),
    path,
    "bridge object or universe ID string",
    bridge,
  );
  assertWormholesImportShape(
    typeof bridge.universeId === "string",
    `${path}.universeId`,
    "string",
    bridge.universeId,
  );
  if (Object.prototype.hasOwnProperty.call(bridge, "creationId") && bridge.creationId !== null) {
    assertWormholesImportShape(
      typeof bridge.creationId === "string",
      `${path}.creationId`,
      "string or null",
      bridge.creationId,
    );
  }
}

function validateImportBridgeList(value, path) {
  assertWormholesImportShape(Array.isArray(value), path, "array", value);
  value.forEach((bridge, index) => validateImportBridge(bridge, `${path}[${index}]`));
}

function validateImportTags(tags, path) {
  assertWormholesImportShape(wormholesImportPlainObject(tags), path, "tag object", tags);
  if (Object.prototype.hasOwnProperty.call(tags, "universes"))
    validateImportStringArray(tags.universes, `${path}.universes`);
  if (Object.prototype.hasOwnProperty.call(tags, "entries")) {
    assertWormholesImportShape(
      Array.isArray(tags.entries),
      `${path}.entries`,
      "array",
      tags.entries,
    );
    tags.entries.forEach((entry, index) => {
      if (typeof entry === "string") return; // Supported by older schema versions.
      assertWormholesImportShape(
        wormholesImportPlainObject(entry),
        `${path}.entries[${index}]`,
        "entry reference object or legacy entry ID string",
        entry,
      );
      assertWormholesImportShape(
        typeof entry.universeId === "string",
        `${path}.entries[${index}].universeId`,
        "string",
        entry.universeId,
      );
      assertWormholesImportShape(
        typeof entry.entryId === "string",
        `${path}.entries[${index}].entryId`,
        "string",
        entry.entryId,
      );
    });
  }
}

function validateImportValueCell(value, path) {
  if (value === null || value === undefined || typeof value === "string") return;
  assertWormholesImportShape(
    wormholesImportPlainObject(value),
    path,
    "value object, string, or null",
    value,
  );
  assertWormholesImportShape(typeof value.val === "string", `${path}.val`, "string", value.val);
}

function validateImportNotes(value, path, options = {}) {
  if ((value === null || value === undefined) && options.allowEmpty) return;
  assertWormholesImportShape(wormholesImportPlainObject(value), path, "object", value);
  Object.entries(value).forEach(([key, note]) => {
    assertWormholesImportShape(typeof note === "string", `${path}.${key}`, "string", note);
  });
}

function validateImportUniverseRecord(universe, path) {
  assertWormholesImportShape(
    wormholesImportPlainObject(universe),
    path,
    "universe object",
    universe,
  );
  assertWormholesImportShape(
    typeof universe.id === "string" && !!universe.id,
    `${path}.id`,
    "non-empty string",
    universe.id,
  );
  ["title", "summary", "createdAt", "diskFolderName"].forEach((key) =>
    validateOptionalImportString(universe, key, path),
  );
  if (Object.prototype.hasOwnProperty.call(universe, "bridges"))
    validateImportBridgeList(universe.bridges, `${path}.bridges`);
}

function validateImportArchiveRecord(entry, path) {
  assertWormholesImportShape(wormholesImportPlainObject(entry), path, "Archive object", entry);
  assertWormholesImportShape(
    typeof entry.id === "string" && !!entry.id,
    `${path}.id`,
    "non-empty string",
    entry.id,
  );
  ["title", "kind", "summary", "storage", "folderFileName", "createdAt"].forEach((key) =>
    validateOptionalImportString(entry, key, path),
  );
  ["connections", "notes", "groupIds", "children"].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(entry, key))
      validateImportStringArray(entry[key], `${path}.${key}`);
  });
  if (Object.prototype.hasOwnProperty.call(entry, "bridges"))
    validateImportBridgeList(entry.bridges, `${path}.bridges`);
  ["what", "attr1", "attr2", "pressure"].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(entry, key))
      validateImportValueCell(entry[key], `${path}.${key}`);
  });
}

function validateImportLiteratureRecord(doc, path) {
  assertWormholesImportShape(wormholesImportPlainObject(doc), path, "Literature object", doc);
  assertWormholesImportShape(
    typeof doc.id === "string" && !!doc.id,
    `${path}.id`,
    "non-empty string",
    doc.id,
  );
  [
    "kind",
    "title",
    "content",
    "sourceName",
    "fileType",
    "mimeType",
    "fileData",
    "convertedFrom",
    "storage",
    "folderFileName",
    "contentStoreKey",
    "contentStored",
    "createdAt",
    "updatedAt",
  ].forEach((key) => validateOptionalImportString(doc, key, path));
  if (Object.prototype.hasOwnProperty.call(doc, "fileSize")) {
    assertWormholesImportShape(
      typeof doc.fileSize === "number" && Number.isFinite(doc.fileSize) && doc.fileSize >= 0,
      `${path}.fileSize`,
      "non-negative number",
      doc.fileSize,
    );
  }
  ["groupIds", "children"].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(doc, key))
      validateImportStringArray(doc[key], `${path}.${key}`);
  });
  if (Object.prototype.hasOwnProperty.call(doc, "tags"))
    validateImportTags(doc.tags, `${path}.tags`);
}

function validateImportVisionRecord(item, path) {
  assertWormholesImportShape(wormholesImportPlainObject(item), path, "Vision Board object", item);
  assertWormholesImportShape(
    typeof item.id === "string" && !!item.id,
    `${path}.id`,
    "non-empty string",
    item.id,
  );
  [
    "title",
    "sourceName",
    "fileType",
    "mimeType",
    "thumbnailDataUrl",
    "dataUrl",
    "storage",
    "folderFileName",
    "dataStoreKey",
    "thumbnailStoreKey",
    "dataStored",
    "thumbnailStored",
    "createdAt",
  ].forEach((key) => validateOptionalImportString(item, key, path));
  if (Object.prototype.hasOwnProperty.call(item, "fileSize")) {
    assertWormholesImportShape(
      typeof item.fileSize === "number" && Number.isFinite(item.fileSize) && item.fileSize >= 0,
      `${path}.fileSize`,
      "non-negative number",
      item.fileSize,
    );
  }
  if (Object.prototype.hasOwnProperty.call(item, "tags"))
    validateImportTags(item.tags, `${path}.tags`);
}

function validateImportThemeDeck(deck, path) {
  assertWormholesImportShape(wormholesImportPlainObject(deck), path, "theme deck object", deck);
  validateOptionalImportString(deck, "id", path);
  assertWormholesImportShape(
    typeof deck.title === "string" && deck.title.trim().length > 0,
    `${path}.title`,
    "non-empty string",
    deck.title,
  );
  validateOptionalImportString(deck, "description", path);
  assertWormholesImportShape(
    wormholesImportPlainObject(deck.cards),
    `${path}.cards`,
    "card collection object",
    deck.cards,
  );
  ["what", "attribute", "story"].forEach((type) => {
    validateImportStringArray(deck.cards[type], `${path}.cards.${type}`);
  });
}

function validateImportThemeState(value, path = "$.themes") {
  assertWormholesImportShape(wormholesImportPlainObject(value), path, "theme state object", value);
  if (Object.prototype.hasOwnProperty.call(value, "version")) {
    assertWormholesImportShape(
      Number.isInteger(value.version) && value.version >= 1,
      `${path}.version`,
      "positive integer",
      value.version,
    );
  }
  assertWormholesImportShape(
    Array.isArray(value.customDecks),
    `${path}.customDecks`,
    "array",
    value.customDecks,
  );
  value.customDecks.forEach((deck, index) =>
    validateImportThemeDeck(deck, `${path}.customDecks[${index}]`),
  );
  validateImportStringArray(value.selectedThemeIds, `${path}.selectedThemeIds`);
}

function validateWormholesAppDataStructure(data) {
  assertWormholesImportShape(wormholesImportPlainObject(data), "$", "object", data);
  if (Object.prototype.hasOwnProperty.call(data, "schemaVersion")) {
    assertWormholesImportShape(
      Number.isInteger(data.schemaVersion) && data.schemaVersion >= 1,
      "$.schemaVersion",
      "positive integer",
      data.schemaVersion,
    );
  }
  if (
    Object.prototype.hasOwnProperty.call(data, "currentUniverseId") &&
    data.currentUniverseId !== null
  ) {
    assertWormholesImportShape(
      typeof data.currentUniverseId === "string",
      "$.currentUniverseId",
      "string or null",
      data.currentUniverseId,
    );
  }
  assertWormholesImportShape(Array.isArray(data.universes), "$.universes", "array", data.universes);
  assertWormholesImportShape(
    wormholesImportPlainObject(data.universeData),
    "$.universeData",
    "object",
    data.universeData,
  );
  validateImportNotes(data.bridgeNotes, "$.bridgeNotes", {allowEmpty: true});
  if (Object.prototype.hasOwnProperty.call(data, "themes")) {
    validateImportThemeState(data.themes, "$.themes");
  }

  const universeIds = new Set();
  data.universes.forEach((universe, index) => {
    const path = `$.universes[${index}]`;
    validateImportUniverseRecord(universe, path);
    universeIds.add(universe.id);
    assertWormholesImportShape(
      Object.prototype.hasOwnProperty.call(data.universeData, universe.id),
      `$.universeData.${universe.id}`,
      "universe details object",
      undefined,
    );
  });

  Object.entries(data.universeData).forEach(([universeId, details]) => {
    const path = `$.universeData.${universeId}`;
    assertWormholesImportShape(
      universeIds.has(universeId),
      path,
      "details for a listed universe",
      details,
    );
    assertWormholesImportShape(
      wormholesImportPlainObject(details),
      path,
      "universe details object",
      details,
    );
    assertWormholesImportShape(
      Array.isArray(details.archive),
      `${path}.archive`,
      "array",
      details.archive,
    );
    assertWormholesImportShape(
      wormholesImportPlainObject(details.connectionNotes),
      `${path}.connectionNotes`,
      "object",
      details.connectionNotes,
    );
    assertWormholesImportShape(
      Array.isArray(details.literature),
      `${path}.literature`,
      "array",
      details.literature,
    );
    assertWormholesImportShape(
      Array.isArray(details.vision),
      `${path}.vision`,
      "array",
      details.vision,
    );
    details.archive.forEach((entry, index) =>
      validateImportArchiveRecord(entry, `${path}.archive[${index}]`),
    );
    validateImportNotes(details.connectionNotes, `${path}.connectionNotes`);
    details.literature.forEach((doc, index) =>
      validateImportLiteratureRecord(doc, `${path}.literature[${index}]`),
    );
    details.vision.forEach((item, index) =>
      validateImportVisionRecord(item, `${path}.vision[${index}]`),
    );
  });
  return true;
}

const APP_DATA_VALIDATION = Object.freeze({
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
});

function installLegacyAppDataValidationBindings(target = globalThis) {
  Object.assign(target, APP_DATA_VALIDATION);
  target.WormholesAppDataValidation = APP_DATA_VALIDATION;
  return APP_DATA_VALIDATION;
}

if (typeof window !== "undefined") installLegacyAppDataValidationBindings(window);
