import assert from "node:assert/strict";
import {installTransactionalPersistence} from "../../scripts/modules/transactional-persistence.mjs";

const target = {};
const transactions = installTransactionalPersistence(target);

{
  const writes = [];
  await assert.rejects(
    () =>
      transactions.run({
        operation: "validate before writing",
        validate: [
          () => true,
          () => {
            throw new Error("invalid record");
          },
        ],
        steps: [
          {
            name: "must-not-write",
            phase: "record-metadata",
            execute() {
              writes.push("write");
            },
          },
        ],
      }),
    /invalid record/i,
  );
  assert.deepEqual(writes, [], "all validation must finish before the first write");
}

await assert.rejects(
  () =>
    transactions.run({
      operation: "incorrect write order",
      steps: [
        {name: "metadata", phase: "core-metadata", execute: () => true},
        {name: "large", phase: "large-content", execute: () => true},
      ],
    }),
  /large content must be written before metadata/i,
);

{
  const order = [];
  await transactions.run({
    operation: "ordered save",
    validate: [() => order.push("validated") || true],
    steps: [
      {
        name: "large",
        phase: "large-content",
        execute: () => order.push("large") || true,
      },
      {
        name: "record",
        phase: "record-metadata",
        execute: () => order.push("record") || true,
      },
      {
        name: "collection",
        phase: "collection-metadata",
        execute: () => order.push("collection") || true,
      },
      {
        name: "core",
        phase: "core-metadata",
        execute: () => order.push("core") || true,
      },
    ],
    commitRuntime: () => order.push("runtime"),
  });
  assert.deepEqual(order, ["validated", "large", "record", "collection", "core", "runtime"]);
}

{
  const storage = {large: "old-large", metadata: "old-metadata", core: "old-core"};
  const runtime = {title: "old-title"};
  const events = [];
  target.WormholesPersistenceFailureInjector = ({step}) => step === "core";

  await assert.rejects(
    () =>
      transactions.run({
        operation: "failure injection",
        captureRuntime: () => runtime,
        steps: [
          {
            name: "large",
            phase: "large-content",
            execute() {
              storage.large = "new-large";
              events.push("large-write");
              return true;
            },
            rollback() {
              storage.large = "old-large";
              events.push("large-rollback");
            },
          },
          {
            name: "metadata",
            phase: "collection-metadata",
            execute() {
              storage.metadata = "new-metadata";
              events.push("metadata-write");
              return true;
            },
            rollback() {
              storage.metadata = "old-metadata";
              events.push("metadata-rollback");
            },
          },
          {
            name: "core",
            phase: "core-metadata",
            execute() {
              storage.core = "new-core";
              events.push("core-write");
              return true;
            },
          },
        ],
        commitRuntime() {
          runtime.title = "new-title";
          events.push("runtime-commit");
        },
        rollback() {
          events.push("plan-rollback");
        },
        restoreRuntime(snapshot) {
          runtime.title = snapshot.title;
          events.push("runtime-restore");
        },
        failureMessage: "The save could not be completed. Nothing was changed.",
      }),
    (error) => {
      assert.equal(error.userMessage, "The save could not be completed. Nothing was changed.");
      return true;
    },
  );

  assert.deepEqual(storage, {
    large: "old-large",
    metadata: "old-metadata",
    core: "old-core",
  });
  assert.equal(runtime.title, "old-title");
  assert.deepEqual(events, [
    "large-write",
    "metadata-write",
    "metadata-rollback",
    "large-rollback",
    "plan-rollback",
    "runtime-restore",
  ]);
  delete target.WormholesPersistenceFailureInjector;
}

console.log("transactional-persistence.unit.mjs passed");
