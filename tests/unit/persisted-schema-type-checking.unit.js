const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {latestDirectHtmlName, latestDirectHtmlPath} = require("../support/release-path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "..");

function createLocalStorage() {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return Array.from(values.keys())[index] || null;
    },
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    dump() {
      return Object.fromEntries(values.entries());
    },
  };
}

(async () => {
  const localStorage = createLocalStorage();
  const errors = [];
  const largeValues = new Map();
  const context = {
    console,
    localStorage,
    Date,
    JSON,
    Object,
    Number,
    String,
    Boolean,
    Array,
    Map,
    Set,
    Promise,
    Error,
    TypeError,
    CustomEvent: function (type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    },
    dispatchEvent() {},
    reportAppError(label, error, options = {}) {
      errors.push({label, error, options});
    },
    WormholesLargeDataStore: {
      supported: true,
      async put(key, value) {
        largeValues.set(key, value);
        return true;
      },
      async get(key) {
        return largeValues.has(key) ? largeValues.get(key) : "";
      },
      async inspect(key) {
        return largeValues.has(key)
          ? {status: "found", key, value: largeValues.get(key)}
          : {status: "missing", key};
      },
      async del() {
        return true;
      },
      async deletePrefix() {
        return 0;
      },
      async clearAll() {
        return true;
      },
      async estimatePrefixBytes() {
        return 0;
      },
    },
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, "scripts", "wormholes-persisted-schema.js"), "utf8"),
    context,
    {filename: "wormholes-persisted-schema.js"},
  );
  vm.runInContext(
    fs.readFileSync(path.join(root, "scripts", "wormholes-repositories.js"), "utf8"),
    context,
    {filename: "wormholes-repositories.js"},
  );

  const schema = context.WormholesPersistedSchema;
  const repositories = context.WormholesRepositories;
  assert.ok(
    schema && repositories.schema,
    "persisted schema layer should load before and be exposed through repositories",
  );

  const validUniverse = {
    id: "u1",
    title: "Universe",
    summary: "",
    bridges: [],
    createdAt: "2026-07-12T00:00:00.000Z",
    diskFolderName: "Universe-u1",
  };
  assert.strictEqual(schema.validate("universes", [validUniverse], {mode: "write"}).ok, true);
  assert.strictEqual(
    schema.validate("universes", [{...validUniverse, title: 42}], {mode: "write"}).ok,
    false,
  );
  assert.strictEqual(
    schema.validate("archive", [{title: "Legacy title"}], {mode: "read"}).ok,
    true,
    "read mode should allow older records with missing optional fields",
  );
  assert.strictEqual(
    schema.validate("archive", [{title: 42}], {mode: "read"}).ok,
    false,
    "read mode should reject fields with wrong types",
  );
  assert.strictEqual(
    schema.validate("connectionNotes", {"a::b": "note"}, {mode: "write"}).ok,
    true,
  );
  assert.strictEqual(schema.validate("connectionNotes", {"a::b": 17}, {mode: "write"}).ok, false);

  const archive = repositories.datasets.createRepository({
    keyFor: (id) => `archive:${id}`,
    schema: "archive",
    fallback: () => [],
    context: "Archive save failed",
    userMessage: "Archive could not be saved.",
  });
  const validArchive = [
    {
      id: "a1",
      title: "Creation",
      what: {val: "Character"},
      attr1: null,
      attr2: null,
      pressure: null,
      connections: [],
      bridges: [],
      notes: [],
      createdAt: "2026-07-12T00:00:00.000Z",
    },
  ];
  assert.strictEqual(
    archive.save("u1", validArchive).ok,
    true,
    "valid normalized data should save",
  );
  const goodRaw = localStorage.getItem("archive:u1");
  assert.deepStrictEqual(archive.read("u1"), validArchive);

  const invalidArchiveSave = archive.save("u1", [{...validArchive[0], connections: "a2"}]);
  assert.strictEqual(
    invalidArchiveSave.ok,
    false,
    "wrong field types should be rejected before persistence",
  );
  assert.strictEqual(invalidArchiveSave.code, "schema_invalid");
  assert.strictEqual(
    localStorage.getItem("archive:u1"),
    goodRaw,
    "a rejected save must leave the previous stored record unchanged",
  );
  assert.ok(
    errors.some((entry) => entry.error?.code === "WORMHOLES_SCHEMA_INVALID"),
    "schema save failures should be reported with a typed error",
  );

  const malformedEnvelope = {
    format: "Wormholes Persisted Dataset",
    revision: 3,
    updatedAt: "2026-07-12T00:00:00.000Z",
    data: [{id: "a2", title: "Broken", connections: {not: "an array"}, bridges: []}],
  };
  localStorage.setItem("archive:u2", JSON.stringify(malformedEnvelope));
  assert.throws(
    () => archive.read("u2"),
    (error) => error?.code === "WORMHOLES_PERSISTED_SCHEMA",
  );
  assert.strictEqual(
    archive.isBlocked("u2"),
    true,
    "malformed persisted data should be write-protected",
  );
  const damagedRaw = localStorage.getItem("archive:u2");
  const blockedArchiveSave = archive.save("u2", validArchive);
  assert.strictEqual(
    blockedArchiveSave.ok,
    false,
    "write protection should prevent replacing malformed saved data",
  );
  assert.strictEqual(blockedArchiveSave.code, "corrupt_dataset_blocked");
  assert.strictEqual(
    localStorage.getItem("archive:u2"),
    damagedRaw,
    "the malformed raw value should remain preserved",
  );

  const literature = repositories.datasets.createRepository({
    keyFor: (id) => `lit:${id}`,
    schema: "literature",
    fallback: () => [],
  });
  const validDoc = {
    id: "d1",
    kind: "",
    title: "Document",
    content: "<p>Text</p>",
    sourceName: "",
    fileType: "text",
    mimeType: "text/html",
    fileData: "",
    fileSize: 0,
    convertedFrom: "",
    storage: "",
    folderFileName: "",
    contentStoreKey: "literature:u1:d1:content",
    contentStored: "indexedDB",
    tags: {universes: [], entries: []},
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
  };
  assert.strictEqual(literature.save("u1", [validDoc]).ok, true);
  const invalidLiteratureSave = literature.save("u1", [{...validDoc, fileSize: "0"}]);
  assert.strictEqual(invalidLiteratureSave.ok, false, "numeric fields must remain numbers");
  assert.strictEqual(invalidLiteratureSave.code, "schema_invalid");

  await assert.rejects(
    () => repositories.largeData.put("literature:u1:d1", {body: "text"}),
    /must be strings/,
    "large persisted payloads should reject non-string values",
  );
  await assert.rejects(
    () => repositories.largeData.put("", "text"),
    /storage key is required/,
    "large persisted payloads should require a key",
  );
  largeValues.set("broken-payload", {body: "text"});
  await assert.rejects(
    () => repositories.largeData.get("broken-payload"),
    /must be strings/,
    "large-data reads should reject records with the wrong stored type",
  );
  assert.strictEqual(
    (await repositories.largeData.inspect("broken-payload")).status,
    "invalid",
    "large-data inspection should identify wrong payload types",
  );

  const html = fs.readFileSync(latestDirectHtmlPath(root), "utf8");
  assert.ok(
    html.indexOf("scripts/wormholes-persisted-schema.js") <
      html.indexOf("scripts/wormholes-repositories.js"),
    "schema checks should load before repositories",
  );
  const storageSource = fs.readFileSync(path.join(root, "scripts", "storage.js"), "utf8");
  ["universes", "bridgeNotes", "archive", "connectionNotes", "literature", "vision"].forEach(
    (name) => {
      assert.ok(
        new RegExp(`schema\\s*:\\s*"${name}"`).test(storageSource),
        `${name} repository should declare its persisted schema`,
      );
    },
  );
  const recoverySource = fs.readFileSync(
    path.join(root, "scripts", "wormholes-storage-recovery.js"),
    "utf8",
  );
  assert.ok(
    recoverySource.includes("WormholesPersistedSchema"),
    "startup corruption recovery should use the same type schemas",
  );

  console.log("persisted-schema-type-checking.unit.js passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
