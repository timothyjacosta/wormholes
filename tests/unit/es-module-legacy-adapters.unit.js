'use strict';
const assert = require('assert');
const path = require('path');
const {spawnSync} = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const result = spawnSync(process.execPath, ['tools/build-shared-modules.mjs', '--check'], {
  cwd:root,
  encoding:'utf8'
});
assert.strictEqual(result.status, 0, `${result.stdout || ''}${result.stderr || ''}`);
console.log('Generated classic adapter sync test passed.');
