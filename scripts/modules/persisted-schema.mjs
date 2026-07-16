/* Wormholes Beta 248 persisted-schema type checking.
   Validates the type shape of saved datasets at repository boundaries without
   silently coercing malformed stored values. Read mode permits older records
   with missing optional fields; write mode requires the normalized app shape. */

import importedAppErrorsApi from "./app-errors.mjs";
(function () {
  const MAX_ISSUES = 24;

  function isPlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf ? Object.getPrototypeOf(value) : Object.prototype;
    return prototype === Object.prototype || prototype === null;
  }
  function isString(value) {
    return typeof value === "string";
  }
  function isNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }
  function isNonNegativeNumber(value) {
    return isNumber(value) && value >= 0;
  }
  function isStringArray(value) {
    return Array.isArray(value) && value.every(isString);
  }
  function typeName(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    if (Number.isNaN(value)) return "NaN";
    return typeof value;
  }

  function addIssue(issues, path, expected, value) {
    if (issues.length >= MAX_ISSUES) return;
    issues.push({path, expected, actual: typeName(value)});
  }

  function checkField(record, key, validator, expected, issues, path, required) {
    const has = Object.prototype.hasOwnProperty.call(record, key);
    if (!has) {
      if (required) addIssue(issues, `${path}.${key}`, expected, undefined);
      return;
    }
    if (!validator(record[key])) addIssue(issues, `${path}.${key}`, expected, record[key]);
  }

  function checkStringFields(record, keys, issues, path, required) {
    keys.forEach((key) => checkField(record, key, isString, "string", issues, path, required));
  }

  function validateBridge(value, issues, path, mode) {
    if (mode === "read" && isString(value)) return;
    if (!isPlainObject(value)) {
      addIssue(issues, path, "bridge object", value);
      return;
    }
    checkField(value, "universeId", isString, "string", issues, path, true);
    if (
      Object.prototype.hasOwnProperty.call(value, "creationId") &&
      value.creationId !== null &&
      value.creationId !== undefined &&
      !isString(value.creationId)
    ) {
      addIssue(issues, `${path}.creationId`, "string or null", value.creationId);
    }
  }

  function validateBridgeArray(value, issues, path, required, mode) {
    if (value === undefined && !required) return;
    if (!Array.isArray(value)) {
      addIssue(issues, path, "array", value);
      return;
    }
    value.forEach((bridge, index) => validateBridge(bridge, issues, `${path}[${index}]`, mode));
  }

  function validateValueCell(value, issues, path, mode) {
    if (value === null || value === undefined) return;
    if (mode === "read" && isString(value)) return;
    if (!isPlainObject(value) || !isString(value.val))
      addIssue(issues, path, "object with string val", value);
  }

  function validateTags(value, issues, path, required) {
    if (value === undefined && !required) return;
    if (!isPlainObject(value)) {
      addIssue(issues, path, "tag object", value);
      return;
    }
    checkField(value, "universes", isStringArray, "array of strings", issues, path, required);
    const hasEntries = Object.prototype.hasOwnProperty.call(value, "entries");
    if (!hasEntries) {
      if (required) addIssue(issues, `${path}.entries`, "array", undefined);
      return;
    }
    if (!Array.isArray(value.entries)) {
      addIssue(issues, `${path}.entries`, "array", value.entries);
      return;
    }
    value.entries.forEach((tag, index) => {
      const tagPath = `${path}.entries[${index}]`;
      if (!isPlainObject(tag)) {
        addIssue(issues, tagPath, "tag reference object", tag);
        return;
      }
      checkField(tag, "universeId", isString, "string", issues, tagPath, true);
      checkField(tag, "entryId", isString, "string", issues, tagPath, true);
    });
  }

  function validateUniverseRecord(record, issues, path, mode) {
    if (!isPlainObject(record)) {
      addIssue(issues, path, "universe object", record);
      return;
    }
    const required = mode === "write";
    checkStringFields(
      record,
      ["id", "title", "summary", "createdAt", "diskFolderName"],
      issues,
      path,
      required,
    );
    validateBridgeArray(record.bridges, issues, `${path}.bridges`, required, mode);
  }

  function validateArchiveRecord(record, issues, path, mode) {
    if (!isPlainObject(record)) {
      addIssue(issues, path, "Archive object", record);
      return;
    }
    const required = mode === "write";
    checkStringFields(record, ["id", "title"], issues, path, required);
    checkStringFields(
      record,
      ["kind", "summary", "storage", "folderFileName", "createdAt"],
      issues,
      path,
      false,
    );
    checkField(record, "connections", isStringArray, "array of strings", issues, path, required);
    validateBridgeArray(record.bridges, issues, `${path}.bridges`, required, mode);
    if (
      Object.prototype.hasOwnProperty.call(record, "notes") &&
      (!Array.isArray(record.notes) || !record.notes.every(isString))
    ) {
      addIssue(issues, `${path}.notes`, "array of strings", record.notes);
    }
    if (Object.prototype.hasOwnProperty.call(record, "groupIds") && !isStringArray(record.groupIds))
      addIssue(issues, `${path}.groupIds`, "array of strings", record.groupIds);
    if (Object.prototype.hasOwnProperty.call(record, "children") && !isStringArray(record.children))
      addIssue(issues, `${path}.children`, "array of strings", record.children);
    ["what", "attr1", "attr2", "pressure"].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(record, key))
        validateValueCell(record[key], issues, `${path}.${key}`, mode);
    });
    if (mode === "write" && record.kind === "group") {
      checkField(record, "groupIds", isStringArray, "array of strings", issues, path, true);
    }
  }

  const LITERATURE_STRINGS = [
    "id",
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
  ];
  function validateLiteratureRecord(record, issues, path, mode) {
    if (!isPlainObject(record)) {
      addIssue(issues, path, "Literature object", record);
      return;
    }
    const required = mode === "write";
    checkStringFields(record, LITERATURE_STRINGS, issues, path, required);
    checkField(
      record,
      "fileSize",
      isNonNegativeNumber,
      "non-negative number",
      issues,
      path,
      required,
    );
    validateTags(record.tags, issues, `${path}.tags`, required);
    if (Object.prototype.hasOwnProperty.call(record, "groupIds") && !isStringArray(record.groupIds))
      addIssue(issues, `${path}.groupIds`, "array of strings", record.groupIds);
    if (Object.prototype.hasOwnProperty.call(record, "children") && !isStringArray(record.children))
      addIssue(issues, `${path}.children`, "array of strings", record.children);
    if (mode === "write" && (record.kind === "literatureGroup" || record.fileType === "group")) {
      checkField(record, "groupIds", isStringArray, "array of strings", issues, path, true);
    }
  }

  const VISION_STRINGS = [
    "id",
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
  ];
  function validateVisionRecord(record, issues, path, mode) {
    if (!isPlainObject(record)) {
      addIssue(issues, path, "Vision Board object", record);
      return;
    }
    const required = mode === "write";
    checkStringFields(record, VISION_STRINGS, issues, path, required);
    checkField(
      record,
      "fileSize",
      isNonNegativeNumber,
      "non-negative number",
      issues,
      path,
      required,
    );
    validateTags(record.tags, issues, `${path}.tags`, required);
  }

  function validateRecordArray(value, recordValidator, issues, path, mode) {
    if (!Array.isArray(value)) {
      addIssue(issues, path, "array", value);
      return;
    }
    value.forEach((record, index) => recordValidator(record, issues, `${path}[${index}]`, mode));
  }

  function validateNotes(value, issues, path) {
    if (!isPlainObject(value)) {
      addIssue(issues, path, "object", value);
      return;
    }
    Object.entries(value).forEach(([key, note]) => {
      if (!isString(note)) addIssue(issues, `${path}.${key}`, "string", note);
    });
  }

  const validators = Object.freeze({
    universes: (value, issues, mode) =>
      validateRecordArray(value, validateUniverseRecord, issues, "$", mode),
    archive: (value, issues, mode) =>
      validateRecordArray(value, validateArchiveRecord, issues, "$", mode),
    literature: (value, issues, mode) =>
      validateRecordArray(value, validateLiteratureRecord, issues, "$", mode),
    vision: (value, issues, mode) =>
      validateRecordArray(value, validateVisionRecord, issues, "$", mode),
    connectionNotes: (value, issues) => validateNotes(value, issues, "$"),
    bridgeNotes: (value, issues) => validateNotes(value, issues, "$"),
  });

  function validate(schemaName, value, options = {}) {
    const name = String(schemaName || "");
    const canonical = window.WormholesCanonicalPersistence;
    if (canonical?.validate && canonical?.persistedSchemas?.[name]) {
      return canonical.validate(name, value, options);
    }
    const validator = validators[name];
    if (!validator)
      return {
        ok: true,
        schema: name,
        mode: options.mode === "write" ? "write" : "read",
        issues: [],
      };
    const issues = [];
    const mode = options.mode === "write" ? "write" : "read";
    validator(value, issues, mode);
    return {ok: issues.length === 0, schema: name, mode, issues};
  }

  function summary(result) {
    if (!result || result.ok) return "";
    const first = result.issues?.[0];
    if (!first) return `Persisted ${result.schema || "data"} did not match its expected schema.`;
    return `Persisted ${result.schema || "data"} expected ${first.expected} at ${first.path}, but found ${first.actual}.`;
  }

  function errorFor(result) {
    const appErrors =
      typeof importedAppErrorsApi !== "undefined"
        ? importedAppErrorsApi
        : window.WormholesAppErrors;
    const error = appErrors?.createError
      ? appErrors.createError("WORMHOLES_PERSISTED_SCHEMA", summary(result), {
          name: "WormholesPersistedSchemaError",
          details: result,
        })
      : new Error(summary(result));
    error.name = "WormholesPersistedSchemaError";
    error.code = "WORMHOLES_PERSISTED_SCHEMA";
    error.schemaResult = result;
    return error;
  }

  function assert(schemaName, value, options = {}) {
    const result = validate(schemaName, value, options);
    if (!result.ok) throw errorFor(result);
    return value;
  }

  window.WormholesPersistedSchema = Object.freeze({
    validate,
    assert,
    errorFor,
    summary,
    validators,
    schemas: window.WormholesCanonicalPersistence?.persistedSchemas || Object.freeze({}),
    isPlainObject,
    isStringArray,
  });
})();

/* ES-module source marker; runtime API remains the existing window namespace. */
export {};
