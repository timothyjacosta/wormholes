const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const archiveScript = fs.readFileSync(path.join(root, 'scripts', 'archive.js'), 'utf8');
const smokeSpec = fs.readFileSync(path.join(root, 'tests', 'e2e', 'smoke.spec.js'), 'utf8');
const appSupport = fs.readFileSync(path.join(root, 'tests', 'support', 'app.js'), 'utf8');

assert.ok(
  archiveScript.includes('data-id="${escapeHtml(entry.id)}"'),
  'archive cards should expose their stable unique record id as data-id'
);
assert.ok(
  appSupport.includes('const firstId = await archiveEntryIdByTitle(page, first);'),
  'connection test setup should capture the source record id'
);
assert.ok(
  smokeSpec.includes('page.locator(`#archiveList .entry[data-id="${firstId}"]`)'),
  'connection browser test should target the exact source card by record id'
);
assert.ok(
  !smokeSpec.includes("page.locator('#archiveList .entry', { hasText:first }).first()"),
  'connection browser test should not fall back to first text match'
);

console.log('connection-card-selector.unit.js passed');
