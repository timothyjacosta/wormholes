import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
import canonical from "../../scripts/modules/canonical-persistence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const now = () => "2026-07-16T00:00:00.000Z";
let idNumber = 0;
const idFactory = () => `generated-${++idNumber}`;

const universe = canonical.builders.universe(
  {title: "  Example  ", extraViewState: true, bridges: ["u2", {universeId: "u2"}]},
  {idFactory, now, folderNameFor: (record) => `folder-${record.id}`},
);
assert.deepEqual(universe, {
  id: "generated-1",
  title: "Example",
  summary: "",
  bridges: [{universeId: "u2", creationId: null}],
  createdAt: "2026-07-16T00:00:00.000Z",
  diskFolderName: "folder-generated-1",
});
assert.equal("extraViewState" in universe, false, "view state must not enter canonical records");

assert.throws(
  () => canonical.builders.universe({title: 42}, {idFactory, now}),
  (error) => error?.code === "WORMHOLES_DRAFT_INVALID" && /incomplete or invalid/i.test(error.userMessage),
  "a supplied wrong type should fail in the draft builder before persistence validation",
);

const migratedArchive = canonical.migrations.migrateDataset(
  "archive",
  [
    {
      id: "g1",
      title: "Legacy Group",
      kind: "group",
      children: ["a", "a", "b"],
      connections: [],
      bridges: ["u2"],
      createdAt: "2020-01-01T00:00:00.000Z",
      selectedInUi: true,
    },
  ],
  {fromVersion: 1, scope: "u1", now, idFactory},
);
assert.deepEqual(migratedArchive[0].groupIds, ["a", "b"]);
assert.deepEqual(migratedArchive[0].bridges, [{universeId: "u2", creationId: null}]);
assert.equal("children" in migratedArchive[0], false);
assert.equal("selectedInUi" in migratedArchive[0], false);

const migratedLiterature = canonical.migrations.migrateDataset(
  "literature",
  [
    {
      id: "d1",
      title: "Legacy",
      content: "text",
      tags: {universes: ["u1"], entries: ["a1"]},
      createdAt: "2020-01-01T00:00:00.000Z",
    },
  ],
  {fromVersion: 1, scope: "u1", now, idFactory},
);
assert.deepEqual(migratedLiterature[0].tags.entries, [{universeId: "u1", entryId: "a1"}]);
assert.equal(migratedLiterature[0].contentStoreKey, "literature:u1:d1:content");
assert.equal(canonical.validate("literature", migratedLiterature, {mode: "write"}).ok, true);

const invalidExtra = {...migratedLiterature[0], editorSelection: {start: 1}};
const validation = canonical.validate("literature", [invalidExtra], {mode: "write"});
assert.equal(validation.ok, false);
assert.ok(validation.issues.some((issue) => issue.path.endsWith(".editorSelection")));

assert.deepEqual(canonical.viewModels.archiveCard({id: "a", title: "A", what: {val: "Place"}}), {
  id: "a",
  title: "A",
  type: "Place",
  summary: "",
  isGroup: false,
});

function createLocalStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return Array.from(values.keys())[index] || null; },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
  };
}

const localStorage = createLocalStorage();
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
  Math,
  CustomEvent: function (type, init = {}) { this.type = type; this.detail = init.detail; },
  dispatchEvent() {},
  reportAppError() {},
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
for (const file of [
  "scripts/wormholes-canonical-persistence.js",
  "scripts/wormholes-persisted-schema.js",
  "scripts/wormholes-repositories.js",
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, {filename: file});
}
const repo = context.WormholesRepositories.datasets.createRepository({
  keyFor: (scope) => `archive:${scope}`,
  schema: "archive",
  fallback: () => [],
});
const saved = repo.save("u1", [{title: "Draft creation", connections: [], bridges: []}]);
assert.equal(saved.ok, true);
const envelope = JSON.parse(localStorage.getItem("archive:u1"));
assert.equal(envelope.schemaVersion, canonical.version);
assert.ok(envelope.data[0].id, "the builder should complete the draft before schema validation");
assert.equal(envelope.data[0].title, "Draft creation");
assert.equal(context.WormholesPersistedSchema.validate("archive", envelope.data, {mode: "write"}).ok, true);

const badSave = repo.save("u2", [{title: 99, connections: [], bridges: []}]);
assert.equal(badSave.ok, false);
assert.equal(badSave.code, "schema_invalid");
assert.match(badSave.userMessage, /incomplete or invalid/i);
assert.equal(localStorage.getItem("archive:u2"), null);

localStorage.setItem(
  "archive:u3",
  JSON.stringify({
    format: "Wormholes Persisted Dataset",
    revision: 1,
    updatedAt: "2020-01-01T00:00:00.000Z",
    data: [{id: "g3", title: "Old", kind: "group", children: ["x"], connections: [], bridges: []}],
  }),
);
const oldEnvelope = repo.readEnvelope("u3");
assert.equal(oldEnvelope.schemaVersion, canonical.version);
assert.deepEqual(Array.from(oldEnvelope.data[0].groupIds), ["x"]);
assert.equal("children" in oldEnvelope.data[0], false);

const html = fs.readFileSync(path.join(root, "Wormholes_Beta_301.html"), "utf8");
assert.ok(
  html.indexOf("scripts/wormholes-canonical-persistence.js") <
    html.indexOf("scripts/wormholes-persisted-schema.js"),
  "canonical builders must load before persisted validation",
);

console.log("canonical-persistence-architecture.unit.mjs passed");
