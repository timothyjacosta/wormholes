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
  const largeValues = new Map();
  const events = [];
  const errors = [];
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
    CustomEvent: function (type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    },
    reportAppError(label, error, options = {}) {
      errors.push({label, error, options});
    },
    dispatchEvent(event) {
      events.push(event);
    },
    WormholesLargeDataStore: {
      supported: true,
      ready: async () => true,
      status: () => ({supported: true, reason: ""}),
      async put(key, value) {
        largeValues.set(key, value);
        return true;
      },
      async get(key) {
        return largeValues.get(key) || "";
      },
      async inspect(key) {
        return largeValues.has(key)
          ? {status: "found", key, value: largeValues.get(key)}
          : {status: "missing", key};
      },
      async del(key) {
        return largeValues.delete(key);
      },
      async deletePrefix(prefix) {
        let count = 0;
        for (const key of Array.from(largeValues.keys()))
          if (key.startsWith(prefix)) {
            largeValues.delete(key);
            count += 1;
          }
        return count;
      },
      async clearAll() {
        largeValues.clear();
        return true;
      },
      async estimatePrefixBytes(prefixes) {
        const list = Array.isArray(prefixes) ? prefixes : [prefixes];
        let total = 0;
        for (const [key, value] of largeValues)
          if (list.some((prefix) => key.startsWith(prefix))) total += String(value).length;
        return total;
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

  const repositories = context.WormholesRepositories;
  assert.ok(repositories, "repository layer should be exported");
  assert.ok(repositories.schema, "repository layer should expose persisted-schema checks");
  assert.strictEqual(repositories.preferences.writeJson("pref", {enabled: true}).ok, true);
  assert.deepStrictEqual(repositories.preferences.readJson("pref", {}), {enabled: true});

  const archive = repositories.datasets.createRepository({
    keyFor: (id) => `archive:${id}`,
    legacyKeyFor: (id) => `legacy:${id}`,
    fallback: () => [],
    context: "Archive save failed",
    userMessage: "Archive could not be saved.",
  });
  repositories.register("archive", archive);
  assert.strictEqual(repositories.get("archive"), archive);

  const firstSave = archive.save("u1", [{id: "a"}]);
  assert.strictEqual(firstSave.ok, true);
  assert.strictEqual(firstSave.code, "ok");
  let envelope = JSON.parse(localStorage.getItem("archive:u1"));
  assert.strictEqual(envelope.revision, 1);
  assert.deepStrictEqual(envelope.data, [{id: "a"}]);
  const secondSave = archive.save("u1", [{id: "b"}]);
  assert.strictEqual(secondSave.ok, true);
  assert.strictEqual(secondSave.code, "ok");
  envelope = JSON.parse(localStorage.getItem("archive:u1"));
  assert.strictEqual(envelope.revision, 2);
  assert.deepStrictEqual(archive.read("u1"), [{id: "b"}]);
  assert.ok(events.some((event) => event.type === "wormholes-dataset-saved"));

  localStorage.setItem("legacy:u2", JSON.stringify([{id: "legacy"}]));
  assert.deepStrictEqual(archive.read("u2"), [{id: "legacy"}]);
  assert.strictEqual(
    localStorage.getItem("legacy:u2"),
    null,
    "legacy keys should migrate through the repository",
  );
  assert.ok(localStorage.getItem("archive:u2"));

  archive.block("u1", "damaged");
  const blockedSave = archive.save("u1", []);
  assert.strictEqual(blockedSave.ok, false, "blocked datasets should remain protected");
  assert.strictEqual(blockedSave.code, "corrupt_dataset_blocked");
  assert.match(blockedSave.userMessage, /Saving is paused/i);
  assert.strictEqual(JSON.parse(localStorage.getItem("archive:u1")).revision, 2);
  archive.unblock("u1");
  const unblockedSave = archive.save("u1", []);
  assert.strictEqual(unblockedSave.ok, true);
  assert.strictEqual(unblockedSave.code, "ok");

  await repositories.largeData.put("literature:u1:d1", "body");
  assert.strictEqual(await repositories.largeData.get("literature:u1:d1"), "body");
  assert.strictEqual(await repositories.largeData.estimatePrefixBytes("literature:u1:"), 4);
  assert.strictEqual(await repositories.largeData.deletePrefix("literature:u1:"), 1);

  const html = fs.readFileSync(latestDirectHtmlPath(root), "utf8");
  const schemaIndex = html.indexOf("scripts/wormholes-persisted-schema.js");
  const repoIndex = html.indexOf("scripts/wormholes-repositories.js");
  const storageIndex = html.indexOf("scripts/storage.js");
  const featureIndex = html.indexOf("scripts/archive.js");
  assert.ok(
    schemaIndex > 0 &&
      schemaIndex < repoIndex &&
      repoIndex < storageIndex &&
      storageIndex < featureIndex,
    "persisted schemas and repositories should load before the storage facade and feature scripts",
  );

  const storageSource = fs.readFileSync(path.join(root, "scripts", "storage.js"), "utf8");
  [
    "universes",
    "bridgeNotes",
    "archive",
    "connectionNotes",
    "literature",
    "vision",
    "appData",
  ].forEach((name) => {
    assert.ok(
      new RegExp(`layer\\.register\\(\\s*"${name}"`).test(storageSource),
      `${name} repository should be registered`,
    );
  });

  const featureFiles = [
    "archive.js",
    "literature.js",
    "vision-board.js",
    "connections.js",
    "bridges.js",
    "universes.js",
    "generation.js",
    "wormholes-app.js",
    "export-import.js",
    "global-search.js",
  ];
  for (const file of featureFiles) {
    const source = fs.readFileSync(path.join(root, "scripts", file), "utf8");
    assert.ok(
      !/localStorage\.(?:getItem|setItem|removeItem)/.test(source),
      `${file} should not access localStorage directly`,
    );
    assert.ok(
      !/window\.WormholesLargeDataStore/.test(source),
      `${file} should not access the IndexedDB backend directly`,
    );
    assert.ok(!/indexedDB\.open\s*\(/.test(source), `${file} should not open IndexedDB directly`);
  }

  assert.ok(
    fs
      .readFileSync(path.join(root, "scripts", "literature.js"), "utf8")
      .includes('wormholesRepository("literature")'),
  );
  assert.ok(
    fs
      .readFileSync(path.join(root, "scripts", "vision-board.js"), "utf8")
      .includes('wormholesRepository("vision")'),
  );
  assert.ok(
    fs
      .readFileSync(path.join(root, "scripts", "export-import.js"), "utf8")
      .includes('wormholesRepository("appData")'),
  );
  assert.strictEqual(
    errors.length,
    1,
    "only the intentional blocked-write test should report an error",
  );

  console.log("persistence-repositories.unit.js passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
