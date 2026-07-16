/* Wormholes Beta 301 canonical persistence architecture.
   Drafts are accepted only by builders. Builders return canonical domain records.
   Repositories persist only the exact schemas declared here. */

const ENTITY_SCHEMA_VERSION = 2;
const DATASET_SCHEMAS = Object.freeze([
  "universes",
  "archive",
  "literature",
  "vision",
  "connectionNotes",
  "bridgeNotes",
]);

/** @typedef {{universeId?: unknown, creationId?: unknown}|string} BridgeDraft */
/** @typedef {{universeId:string, creationId:string|null}} CanonicalBridge */
/** @typedef {{id?:unknown,title?:unknown,summary?:unknown,bridges?:unknown,createdAt?:unknown,diskFolderName?:unknown}} UniverseDraft */
/** @typedef {{id:string,title:string,summary:string,bridges:CanonicalBridge[],createdAt:string,diskFolderName:string}} CanonicalUniverse */
/** @typedef {CanonicalUniverse} PersistedUniverseRecord */
/** @typedef {{id?:unknown,title?:unknown,kind?:unknown,summary?:unknown,what?:unknown,attr1?:unknown,attr2?:unknown,pressure?:unknown,connections?:unknown,bridges?:unknown,notes?:unknown,groupIds?:unknown,children?:unknown,storage?:unknown,folderFileName?:unknown,createdAt?:unknown}} ArchiveDraft */
/** @typedef {object} CanonicalArchiveRecord */
/** @typedef {CanonicalArchiveRecord} PersistedArchiveRecord */
/** @typedef {{id?:unknown,kind?:unknown,title?:unknown,content?:unknown,sourceName?:unknown,fileType?:unknown,mimeType?:unknown,fileData?:unknown,fileSize?:unknown,convertedFrom?:unknown,storage?:unknown,folderFileName?:unknown,contentStoreKey?:unknown,contentStored?:unknown,groupIds?:unknown,children?:unknown,tags?:unknown,createdAt?:unknown,updatedAt?:unknown}} LiteratureDraft */
/** @typedef {object} CanonicalLiteratureRecord */
/** @typedef {CanonicalLiteratureRecord} PersistedLiteratureRecord */
/** @typedef {{id?:unknown,title?:unknown,sourceName?:unknown,fileType?:unknown,mimeType?:unknown,thumbnailDataUrl?:unknown,dataUrl?:unknown,storage?:unknown,folderFileName?:unknown,dataStoreKey?:unknown,thumbnailStoreKey?:unknown,dataStored?:unknown,thumbnailStored?:unknown,fileSize?:unknown,tags?:unknown,createdAt?:unknown}} VisionDraft */
/** @typedef {object} CanonicalVisionRecord */
/** @typedef {CanonicalVisionRecord} PersistedVisionRecord */

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isPlainObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.prototype.toString.call(value) === "[object Object]";
};
const isString = (value) => typeof value === "string";
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isNonNegativeNumber = (value) => isFiniteNumber(value) && value >= 0;
const isStringArray = (value) => Array.isArray(value) && value.every(isString);
const cloneJson = (value) => {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return null;
  }
};
const defaultNow = () => new Date().toISOString();
const defaultId = () => `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function draftError(entity, path, message) {
  const error = new TypeError(`${entity} draft ${path} ${message}.`);
  error.name = "WormholesDraftError";
  error.code = "WORMHOLES_DRAFT_INVALID";
  error.entity = entity;
  error.path = path;
  error.userMessage = "Some information is incomplete or invalid. Review it and try again.";
  return error;
}

function requireDraftObject(entity, value) {
  if (!isPlainObject(value)) throw draftError(entity, "$", "must be an object");
  return value;
}

function optionalString(entity, source, key, fallback = "") {
  if (!own(source, key) || source[key] === undefined || source[key] === null) return fallback;
  if (!isString(source[key])) throw draftError(entity, `.${key}`, "must be text");
  return source[key];
}

function optionalNumber(entity, source, key, fallback = 0) {
  if (!own(source, key) || source[key] === undefined || source[key] === null) return fallback;
  if (!isNonNegativeNumber(source[key]))
    throw draftError(entity, `.${key}`, "must be a non-negative number");
  return source[key];
}

function optionalStringList(entity, source, key, fallback = []) {
  if (!own(source, key) || source[key] === undefined || source[key] === null) return [...fallback];
  if (!Array.isArray(source[key])) throw draftError(entity, `.${key}`, "must be a list");
  const values = [];
  const seen = new Set();
  source[key].forEach((value, index) => {
    if (!isString(value)) throw draftError(entity, `.${key}[${index}]`, "must be text");
    const clean = value.trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      values.push(clean);
    }
  });
  return values;
}

function buildBridge(draft, options = {}) {
  const source =
    typeof draft === "string" ? {universeId: draft} : requireDraftObject("Bridge", draft);
  const universeId = optionalString("Bridge", source, "universeId", "").trim();
  if (!universeId) throw draftError("Bridge", ".universeId", "is required");
  const creationIdRaw = optionalString("Bridge", source, "creationId", "").trim();
  const bridge = {universeId, creationId: creationIdRaw || null};
  if (options.sourceUniverseId && universeId === options.sourceUniverseId && !bridge.creationId)
    throw draftError("Bridge", ".universeId", "cannot point to the same universe");
  return bridge;
}

function buildBridgeList(value, options = {}) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw draftError("Bridge", "$", "must be a list");
  const seen = new Set();
  const validIds = options.validUniverseIds instanceof Set ? options.validUniverseIds : null;
  const result = [];
  value.forEach((draft) => {
    let bridge;
    try {
      bridge = buildBridge(draft, options);
    } catch (error) {
      if (options.dropInvalid === true) return;
      throw error;
    }
    if (validIds && !validIds.has(bridge.universeId)) return;
    const key = `${bridge.universeId}::${bridge.creationId || ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(bridge);
    }
  });
  return result;
}

function buildValueCell(entity, value, key) {
  if (value === undefined || value === null || value === "") return null;
  if (isString(value)) return {val: value};
  if (!isPlainObject(value) || !isString(value.val))
    throw draftError(entity, `.${key}`, "must contain text");
  return {val: value.val};
}

function buildTags(value, options = {}) {
  const source = value === undefined || value === null ? {} : requireDraftObject("Tags", value);
  const universes = optionalStringList("Tags", source, "universes", []);
  const entriesValue = own(source, "entries") ? source.entries : [];
  if (!Array.isArray(entriesValue)) throw draftError("Tags", ".entries", "must be a list");
  const entries = [];
  const seen = new Set();
  entriesValue.forEach((entry, index) => {
    let universeId = "";
    let entryId = "";
    if (typeof entry === "string") {
      universeId = String(options.scope || "");
      entryId = entry;
    } else {
      const record = requireDraftObject("Tags", entry);
      universeId = optionalString("Tags", record, "universeId", String(options.scope || ""));
      entryId = optionalString("Tags", record, "entryId", "");
    }
    universeId = universeId.trim();
    entryId = entryId.trim();
    if (!universeId || !entryId) {
      if (options.dropInvalid === true) return;
      throw draftError("Tags", `.entries[${index}]`, "needs a universe and item");
    }
    const key = `${universeId}::${entryId}`;
    if (!seen.has(key)) {
      seen.add(key);
      entries.push({universeId, entryId});
    }
  });
  return {universes, entries};
}

function buildUniverse(draft, options = {}) {
  const source = requireDraftObject("Universe", draft);
  const now = typeof options.now === "function" ? options.now : defaultNow;
  const idFactory = typeof options.idFactory === "function" ? options.idFactory : defaultId;
  const id = optionalString("Universe", source, "id", "").trim() || idFactory();
  const title = optionalString("Universe", source, "title", "").trim() || "Untitled Universe";
  const base = {
    id,
    title,
    summary: optionalString("Universe", source, "summary", ""),
    bridges: buildBridgeList(source.bridges, {
      sourceUniverseId: id,
      validUniverseIds: options.validUniverseIds,
      dropInvalid: options.dropInvalidReferences === true,
    }),
    createdAt: optionalString("Universe", source, "createdAt", "") || now(),
    diskFolderName: optionalString("Universe", source, "diskFolderName", ""),
  };
  if (!base.diskFolderName) {
    base.diskFolderName =
      typeof options.folderNameFor === "function"
        ? String(options.folderNameFor(base) || "")
        : `${title}-${id}`;
  }
  return base;
}

function buildArchive(draft, options = {}) {
  const source = requireDraftObject("Archive item", draft);
  const now = typeof options.now === "function" ? options.now : defaultNow;
  const idFactory = typeof options.idFactory === "function" ? options.idFactory : defaultId;
  const isGroup =
    source.kind === "group" || Array.isArray(source.groupIds) || Array.isArray(source.children);
  const id = optionalString("Archive item", source, "id", "").trim() || idFactory();
  const result = {
    id,
    title:
      optionalString("Archive item", source, "title", "").trim() ||
      (isGroup ? "Untitled Group" : "Untitled Creation"),
    kind: isGroup ? "group" : optionalString("Archive item", source, "kind", ""),
    summary: optionalString("Archive item", source, "summary", ""),
    what: buildValueCell("Archive item", source.what, "what"),
    attr1: buildValueCell("Archive item", source.attr1, "attr1"),
    attr2: buildValueCell("Archive item", source.attr2, "attr2"),
    pressure: buildValueCell("Archive item", source.pressure, "pressure"),
    connections: optionalStringList("Archive item", source, "connections", []),
    bridges: buildBridgeList(source.bridges, {
      validUniverseIds: options.validUniverseIds,
      dropInvalid: options.dropInvalidReferences === true,
    }),
    notes: optionalStringList("Archive item", source, "notes", []),
    groupIds: isGroup
      ? optionalStringList(
          "Archive item",
          {groupIds: Array.isArray(source.groupIds) ? source.groupIds : source.children || []},
          "groupIds",
          [],
        )
      : [],
    storage: optionalString("Archive item", source, "storage", ""),
    folderFileName: optionalString("Archive item", source, "folderFileName", ""),
    createdAt: optionalString("Archive item", source, "createdAt", "") || now(),
  };
  if (isGroup && !result.what) result.what = {val: "Group"};
  for (const key of [
    "copiedAt",
    "copiedFromUniverse",
    "copiedFromUniverseId",
    "migratedAt",
    "migratedFromUniverse",
  ]) {
    const value = optionalString("Archive item", source, key, "");
    if (value) result[key] = value;
  }
  if (
    own(source, "_generation") &&
    source._generation !== undefined &&
    source._generation !== null
  ) {
    if (!isPlainObject(source._generation))
      throw draftError("Archive item", "._generation", "must be an object");
    const normalized =
      typeof options.normalizeGeneration === "function"
        ? options.normalizeGeneration(source._generation)
        : cloneJson(source._generation);
    if (normalized && isPlainObject(normalized)) result._generation = normalized;
  }
  if (!result.notes.length) delete result.notes;
  if (!isGroup) delete result.groupIds;
  if (!result.kind) delete result.kind;
  if (!result.summary) delete result.summary;
  if (!result.storage) delete result.storage;
  if (!result.folderFileName) delete result.folderFileName;
  for (const key of ["what", "attr1", "attr2", "pressure"]) if (!result[key]) delete result[key];
  return result;
}

function buildLiterature(draft, options = {}) {
  const source = requireDraftObject("Literature item", draft);
  const now = typeof options.now === "function" ? options.now : defaultNow;
  const idFactory = typeof options.idFactory === "function" ? options.idFactory : defaultId;
  const id = optionalString("Literature item", source, "id", "").trim() || idFactory();
  const isGroup =
    source.kind === "literatureGroup" ||
    source.fileType === "group" ||
    Array.isArray(source.groupIds) ||
    Array.isArray(source.children);
  const createdAt = optionalString("Literature item", source, "createdAt", "") || now();
  const rawContent = isGroup ? "" : optionalString("Literature item", source, "content", "");
  const content =
    typeof options.sanitizeHtml === "function" ? options.sanitizeHtml(rawContent) : rawContent;
  const result = {
    id,
    kind: isGroup ? "literatureGroup" : "",
    title:
      optionalString("Literature item", source, "title", "").trim() ||
      optionalString("Literature item", source, "sourceName", "").trim() ||
      (isGroup ? "Untitled Literature Group" : "Untitled Literature"),
    content,
    sourceName: isGroup ? "" : optionalString("Literature item", source, "sourceName", ""),
    fileType: isGroup ? "group" : optionalString("Literature item", source, "fileType", "text"),
    mimeType: isGroup ? "" : optionalString("Literature item", source, "mimeType", ""),
    fileData: isGroup ? "" : optionalString("Literature item", source, "fileData", ""),
    fileSize: isGroup ? 0 : optionalNumber("Literature item", source, "fileSize", 0),
    convertedFrom: isGroup ? "" : optionalString("Literature item", source, "convertedFrom", ""),
    storage: isGroup ? "" : optionalString("Literature item", source, "storage", ""),
    folderFileName: isGroup ? "" : optionalString("Literature item", source, "folderFileName", ""),
    contentStoreKey: isGroup
      ? ""
      : optionalString("Literature item", source, "contentStoreKey", "") ||
        (typeof options.contentStoreKeyFor === "function"
          ? String(options.contentStoreKeyFor(options.scope, id) || "")
          : `literature:${options.scope || "none"}:${id}:content`),
    contentStored: isGroup ? "" : optionalString("Literature item", source, "contentStored", ""),
    tags:
      typeof options.normalizeTags === "function"
        ? options.normalizeTags(source.tags)
        : buildTags(source.tags, {
            scope: options.scope,
            dropInvalid: options.dropInvalidReferences,
          }),
    createdAt,
    updatedAt: optionalString("Literature item", source, "updatedAt", "") || createdAt,
  };
  if (isGroup) {
    result.groupIds = optionalStringList(
      "Literature item",
      {groupIds: Array.isArray(source.groupIds) ? source.groupIds : source.children || []},
      "groupIds",
      [],
    );
  }
  return result;
}

function buildVision(draft, options = {}) {
  const source = requireDraftObject("Vision item", draft);
  const now = typeof options.now === "function" ? options.now : defaultNow;
  const idFactory = typeof options.idFactory === "function" ? options.idFactory : defaultId;
  const id = optionalString("Vision item", source, "id", "").trim() || idFactory();
  const dataUrl = optionalString("Vision item", source, "dataUrl", "");
  const thumbnailDataUrl = optionalString("Vision item", source, "thumbnailDataUrl", "");
  const safeDataUrl =
    typeof options.sanitizeDataUrl === "function"
      ? options.sanitizeDataUrl(dataUrl, "visionImage")
      : dataUrl;
  const safeThumbnail =
    typeof options.sanitizeDataUrl === "function"
      ? options.sanitizeDataUrl(thumbnailDataUrl, "visionThumbnail")
      : thumbnailDataUrl;
  const result = {
    id,
    title:
      optionalString("Vision item", source, "title", "").trim() ||
      optionalString("Vision item", source, "sourceName", "").trim() ||
      "Untitled Vision",
    sourceName:
      optionalString("Vision item", source, "sourceName", "") ||
      optionalString("Vision item", source, "title", ""),
    fileType: optionalString("Vision item", source, "fileType", "image"),
    mimeType:
      typeof options.normalizeMimeType === "function"
        ? String(options.normalizeMimeType(source, safeDataUrl, safeThumbnail) || "")
        : optionalString("Vision item", source, "mimeType", ""),
    thumbnailDataUrl: safeThumbnail,
    dataUrl: safeDataUrl,
    storage: optionalString("Vision item", source, "storage", ""),
    folderFileName: optionalString("Vision item", source, "folderFileName", ""),
    dataStoreKey:
      optionalString("Vision item", source, "dataStoreKey", "") ||
      (typeof options.dataStoreKeyFor === "function"
        ? String(options.dataStoreKeyFor(options.scope, id) || "")
        : `vision:${options.scope || "none"}:${id}:dataUrl`),
    thumbnailStoreKey:
      optionalString("Vision item", source, "thumbnailStoreKey", "") ||
      (safeThumbnail && typeof options.thumbnailStoreKeyFor === "function"
        ? String(options.thumbnailStoreKeyFor(options.scope, id) || "")
        : safeThumbnail
          ? `vision:${options.scope || "none"}:${id}:thumbnailDataUrl`
          : ""),
    dataStored: safeDataUrl ? optionalString("Vision item", source, "dataStored", "") : "",
    thumbnailStored: safeThumbnail
      ? optionalString("Vision item", source, "thumbnailStored", "")
      : "",
    fileSize: optionalNumber("Vision item", source, "fileSize", 0),
    tags:
      typeof options.normalizeTags === "function"
        ? options.normalizeTags(source.tags)
        : buildTags(source.tags, {
            scope: options.scope,
            dropInvalid: options.dropInvalidReferences,
          }),
    createdAt: optionalString("Vision item", source, "createdAt", "") || now(),
  };
  return result;
}

function buildNotes(value) {
  const source = value === undefined || value === null ? {} : requireDraftObject("Notes", value);
  const result = {};
  Object.entries(source).forEach(([key, note]) => {
    if (!isString(note)) throw draftError("Notes", `.${key}`, "must be text");
    result[String(key)] = note;
  });
  return result;
}

const field = (type, required = false) => Object.freeze({type, required});
const persistedSchemas = Object.freeze({
  universes: Object.freeze({
    version: ENTITY_SCHEMA_VERSION,
    additionalProperties: false,
    record: Object.freeze({
      id: field("nonEmptyString", true),
      title: field("string", true),
      summary: field("string", true),
      bridges: field("bridgeArray", true),
      createdAt: field("string", true),
      diskFolderName: field("string", true),
    }),
  }),
  archive: Object.freeze({
    version: ENTITY_SCHEMA_VERSION,
    additionalProperties: false,
    record: Object.freeze({
      id: field("nonEmptyString", true),
      title: field("string", true),
      kind: field("string"),
      summary: field("string"),
      what: field("valueCell"),
      attr1: field("valueCell"),
      attr2: field("valueCell"),
      pressure: field("valueCell"),
      connections: field("stringArray", true),
      bridges: field("bridgeArray", true),
      notes: field("stringArray"),
      groupIds: field("stringArray"),
      storage: field("string"),
      folderFileName: field("string"),
      createdAt: field("string", true),
      copiedAt: field("string"),
      copiedFromUniverse: field("string"),
      copiedFromUniverseId: field("string"),
      migratedAt: field("string"),
      migratedFromUniverse: field("string"),
      _generation: field("plainObject"),
    }),
  }),
  literature: Object.freeze({
    version: ENTITY_SCHEMA_VERSION,
    additionalProperties: false,
    record: Object.freeze({
      id: field("nonEmptyString", true),
      kind: field("string", true),
      title: field("string", true),
      content: field("string", true),
      sourceName: field("string", true),
      fileType: field("string", true),
      mimeType: field("string", true),
      fileData: field("string", true),
      fileSize: field("nonNegativeNumber", true),
      convertedFrom: field("string", true),
      storage: field("string", true),
      folderFileName: field("string", true),
      contentStoreKey: field("string", true),
      contentStored: field("string", true),
      groupIds: field("stringArray"),
      tags: field("tags", true),
      createdAt: field("string", true),
      updatedAt: field("string", true),
    }),
  }),
  vision: Object.freeze({
    version: ENTITY_SCHEMA_VERSION,
    additionalProperties: false,
    record: Object.freeze({
      id: field("nonEmptyString", true),
      title: field("string", true),
      sourceName: field("string", true),
      fileType: field("string", true),
      mimeType: field("string", true),
      thumbnailDataUrl: field("string", true),
      dataUrl: field("string", true),
      storage: field("string", true),
      folderFileName: field("string", true),
      dataStoreKey: field("string", true),
      thumbnailStoreKey: field("string", true),
      dataStored: field("string", true),
      thumbnailStored: field("string", true),
      fileSize: field("nonNegativeNumber", true),
      tags: field("tags", true),
      createdAt: field("string", true),
    }),
  }),
  connectionNotes: Object.freeze({version: ENTITY_SCHEMA_VERSION, kind: "notes"}),
  bridgeNotes: Object.freeze({version: ENTITY_SCHEMA_VERSION, kind: "notes"}),
});

const typeValidators = Object.freeze({
  string: isString,
  nonEmptyString: (value) => isString(value) && value.trim().length > 0,
  nonNegativeNumber: isNonNegativeNumber,
  stringArray: isStringArray,
  plainObject: isPlainObject,
  valueCell: (value) => value === null || (isPlainObject(value) && isString(value.val)),
  bridgeArray: (value) =>
    Array.isArray(value) &&
    value.every(
      (bridge) =>
        isPlainObject(bridge) &&
        isString(bridge.universeId) &&
        bridge.universeId.trim() &&
        (bridge.creationId === null || isString(bridge.creationId)),
    ),
  tags: (value) =>
    isPlainObject(value) &&
    isStringArray(value.universes) &&
    Array.isArray(value.entries) &&
    value.entries.every(
      (entry) => isPlainObject(entry) && isString(entry.universeId) && isString(entry.entryId),
    ),
});

function validateRecord(schemaName, value, issues, path, mode) {
  const schema = persistedSchemas[schemaName];
  if (!isPlainObject(value)) {
    issues.push({
      path,
      expected: `${schemaName} object`,
      actual: Array.isArray(value) ? "array" : typeof value,
    });
    return;
  }
  const recordSchema = schema.record;
  Object.entries(recordSchema).forEach(([key, rule]) => {
    const has = own(value, key);
    if (!has) {
      if (mode === "write" && rule.required)
        issues.push({path: `${path}.${key}`, expected: rule.type, actual: "undefined"});
      return;
    }
    const validator = typeValidators[rule.type];
    if (!validator?.(value[key]))
      issues.push({
        path: `${path}.${key}`,
        expected: rule.type,
        actual:
          value[key] === null ? "null" : Array.isArray(value[key]) ? "array" : typeof value[key],
      });
  });
  if (mode === "write" && schema.additionalProperties === false) {
    Object.keys(value).forEach((key) => {
      if (!own(recordSchema, key))
        issues.push({
          path: `${path}.${key}`,
          expected: "known persisted field",
          actual: "extra field",
        });
    });
  }
}

function validateDataset(schemaName, value, options = {}) {
  const mode = options.mode === "write" ? "write" : "read";
  const schema = persistedSchemas[schemaName];
  const issues = [];
  if (!schema) return {ok: true, schema: schemaName, mode, issues};
  if (schema.kind === "notes") {
    if (!isPlainObject(value))
      issues.push({path: "$", expected: "notes object", actual: typeof value});
    else
      Object.entries(value).forEach(([key, note]) => {
        if (!isString(note))
          issues.push({path: `$.${key}`, expected: "string", actual: typeof note});
      });
  } else if (!Array.isArray(value)) {
    issues.push({path: "$", expected: "array", actual: typeof value});
  } else {
    value.forEach((record, index) =>
      validateRecord(schemaName, record, issues, `$[${index}]`, mode),
    );
  }
  return {ok: issues.length === 0, schema: schemaName, mode, issues: issues.slice(0, 24)};
}

function buildDataset(schemaName, value, options = {}) {
  if (!persistedSchemas[schemaName]) return value;
  if (schemaName === "connectionNotes" || schemaName === "bridgeNotes") return buildNotes(value);
  if (!Array.isArray(value)) throw draftError(schemaName, "$", "must be a list");
  const builders = {
    universes: buildUniverse,
    archive: buildArchive,
    literature: buildLiterature,
    vision: buildVision,
  };
  const builder = builders[schemaName];
  return value.map((record) => builder(record, options));
}

const migrationSteps = Object.freeze({
  1: Object.freeze({
    universes(value, options) {
      return buildDataset("universes", value, {...options, dropInvalidReferences: true});
    },
    archive(value, options) {
      return buildDataset("archive", value, {...options, dropInvalidReferences: true});
    },
    literature(value, options) {
      return buildDataset("literature", value, {...options, dropInvalidReferences: true});
    },
    vision(value, options) {
      return buildDataset("vision", value, {...options, dropInvalidReferences: true});
    },
    connectionNotes: buildNotes,
    bridgeNotes: buildNotes,
  }),
});

function sourceVersion(value) {
  const number = Number(value || 1);
  return Number.isInteger(number) && number >= 1 ? number : 1;
}

function currentVersion(schemaName) {
  return persistedSchemas[schemaName]?.version || 1;
}

function migrateDataset(schemaName, value, options = {}) {
  let version = sourceVersion(options.fromVersion);
  const target = currentVersion(schemaName);
  if (version > target) {
    const error = new Error("This saved data was made by a newer Wormholes version.");
    error.code = "WORMHOLES_NEWER_ENTITY_SCHEMA";
    error.userMessage = "This saved data needs a newer version of Wormholes.";
    throw error;
  }
  let result = value;
  while (version < target) {
    const step = migrationSteps[version]?.[schemaName];
    result = typeof step === "function" ? step(result, options) : result;
    version += 1;
  }
  return buildDataset(schemaName, result, options);
}

const viewModels = Object.freeze({
  universe(record) {
    return Object.freeze({
      id: record?.id || "",
      title: record?.title || "Untitled Universe",
      summary: record?.summary || "",
    });
  },
  archiveCard(record) {
    return Object.freeze({
      id: record?.id || "",
      title: record?.title || "Untitled Creation",
      type: record?.what?.val || (record?.kind === "group" ? "Group" : "Creation"),
      summary: record?.summary || record?.pressure?.val || "",
      isGroup: record?.kind === "group",
    });
  },
  literatureRow(record) {
    return Object.freeze({
      id: record?.id || "",
      title: record?.title || "Untitled Literature",
      isGroup: record?.kind === "literatureGroup",
      updatedAt: record?.updatedAt || "",
    });
  },
  visionTile(record) {
    return Object.freeze({
      id: record?.id || "",
      title: record?.title || "Untitled Vision",
      thumbnailDataUrl: record?.thumbnailDataUrl || "",
      mimeType: record?.mimeType || "",
    });
  },
});

const api = Object.freeze({
  version: ENTITY_SCHEMA_VERSION,
  datasetSchemas: DATASET_SCHEMAS,
  persistedSchemas,
  migrationSteps,
  builders: Object.freeze({
    bridge: buildBridge,
    bridges: buildBridgeList,
    tags: buildTags,
    universe: buildUniverse,
    archive: buildArchive,
    literature: buildLiterature,
    vision: buildVision,
    notes: buildNotes,
    dataset: buildDataset,
  }),
  migrations: Object.freeze({sourceVersion, currentVersion, migrateDataset}),
  validate: validateDataset,
  viewModels,
  isPlainObject,
  isStringArray,
});

export function installCanonicalPersistence(target = globalThis) {
  if (target.WormholesCanonicalPersistence) return target.WormholesCanonicalPersistence;
  target.WormholesCanonicalPersistence = api;
  return api;
}

if (typeof window !== "undefined") installCanonicalPersistence(window);
export default api;
