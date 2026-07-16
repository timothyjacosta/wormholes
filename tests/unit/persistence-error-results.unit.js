const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "..");

function loadRepositories({setError = null, canWrite = true} = {}) {
  const values = new Map();
  const reports = [];
  const localStorage = {
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
      if (setError) throw setError;
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
  };
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
      reports.push({label, error, options});
    },
    WormholesSingleTab: {
      canWrite() {
        return canWrite;
      },
    },
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, "scripts", "wormholes-app-errors.js"), "utf8"),
    context,
    {filename: "wormholes-app-errors.js"},
  );
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
  return {context, repositories: context.WormholesRepositories, reports, values};
}

function namedError(name, message) {
  const error = new Error(message);
  error.name = name;
  return error;
}

{
  const {repositories, reports} = loadRepositories();
  const repo = repositories.datasets.createRepository({
    key: "literature-test",
    schema: "literature",
    fallback: () => [],
    context: "Could not save Literature",
  });
  const result = repo.save(null, [{id: "incomplete"}]);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.code, "schema_invalid");
  assert.strictEqual(result.error.code, "WORMHOLES_SCHEMA_INVALID");
  assert.match(result.userMessage, /incomplete or invalid/i);
  assert.doesNotMatch(result.userMessage, /storage is full/i);
  assert.strictEqual(reports.length, 1, "schema failure should produce one report");
  assert.strictEqual(reports[0].options.code, "WORMHOLES_SCHEMA_INVALID");
}

{
  const {repositories, reports} = loadRepositories({
    setError: namedError("QuotaExceededError", "Quota exceeded"),
  });
  const result = repositories.local.set("key", "value");
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.code, "quota_exceeded");
  assert.strictEqual(result.error.code, "WORMHOLES_QUOTA_EXCEEDED");
  assert.match(result.userMessage, /Storage is full/i);
  assert.strictEqual(reports.length, 1, "quota failure should produce one report");
}

{
  const {repositories, reports} = loadRepositories({
    setError: namedError("InvalidStateError", "Storage backend is unavailable"),
  });
  const result = repositories.local.set("key", "value");
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.code, "storage_unavailable");
  assert.strictEqual(result.error.code, "WORMHOLES_STORAGE_UNAVAILABLE");
  assert.match(result.userMessage, /Browser storage is not available/i);
  assert.doesNotMatch(result.userMessage, /Storage is full/i);
  assert.strictEqual(reports.length, 1, "storage failure should produce one report");
}

{
  const {repositories, reports} = loadRepositories({
    setError: namedError("NotAllowedError", "Permission denied"),
  });
  const result = repositories.local.set("key", "value");
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.code, "permission_denied");
  assert.strictEqual(result.error.code, "WORMHOLES_PERMISSION_DENIED");
  assert.match(result.userMessage, /permission/i);
  assert.strictEqual(reports.length, 1, "permission failure should produce one report");
}

{
  const {repositories} = loadRepositories();
  const permission = repositories.results.fromError(
    namedError("NotAllowedError", "Permission denied"),
    {kind: "folder"},
  );
  assert.strictEqual(permission.code, "permission_denied");
  assert.strictEqual(permission.error.code, "WORMHOLES_PERMISSION_DENIED");
  const sync = repositories.results.fromError(namedError("UnknownError", "Write failed"), {
    kind: "folder",
  });
  assert.strictEqual(sync.code, "folder_sync_failed");
  assert.strictEqual(sync.error.code, "WORMHOLES_FOLDER_SYNC_FAILED");
  assert.match(sync.userMessage, /folder could not be updated/i);
}

{
  const {repositories, reports} = loadRepositories();
  const repo = repositories.datasets.createRepository({key: "blocked-test", fallback: () => []});
  repo.block(null, "Damaged data");
  const result = repo.save(null, []);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.code, "corrupt_dataset_blocked");
  assert.strictEqual(result.error.code, "WORMHOLES_CORRUPT_DATASET_BLOCKED");
  assert.match(result.userMessage, /Saving is paused/i);
  assert.strictEqual(reports.length, 1, "blocked save should produce one report");
}

{
  const {repositories, reports} = loadRepositories({canWrite: false});
  const result = repositories.local.set("key", "value");
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.code, "storage_unavailable");
  assert.match(result.userMessage, /active Wormholes tab/i);
  assert.strictEqual(reports.length, 1, "read-only save should produce one report");
}

console.log("persistence-error-results.unit.js passed");
