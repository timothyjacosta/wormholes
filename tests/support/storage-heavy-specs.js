"use strict";

const STORAGE_HEAVY_SPEC_NAMES = Object.freeze([
  "activity-log-import-report.spec.js",
  "backup-recency-status.spec.js",
  "corrupted-storage-startup.spec.js",
  "folder-sync.spec.js",
  "group-bulk-operations.spec.js",
  "literature-autosave.spec.js",
  "literature-lifecycle.spec.js",
  "literature-indexeddb-fallback.spec.js",
  "malformed-import.spec.js",
  "malicious-input-paths.spec.js",
  "private-browser-and-clearing.spec.js",
  "manual-creation-drafts.spec.js",
  "schema-version-migrations.spec.js",
  "storage-usage-dashboard.spec.js",
  "universe-lifecycle.spec.js",
  "vision-board-lifecycle.spec.js",
  "write-ahead-journal.spec.js",
  "xss-regression.spec.js",
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STORAGE_HEAVY_TEST_MATCH = Object.freeze(
  STORAGE_HEAVY_SPEC_NAMES.map((name) => new RegExp(`(?:^|[\\\\/])${escapeRegExp(name)}$`)),
);

module.exports = {
  STORAGE_HEAVY_SPEC_NAMES,
  STORAGE_HEAVY_TEST_MATCH,
};
