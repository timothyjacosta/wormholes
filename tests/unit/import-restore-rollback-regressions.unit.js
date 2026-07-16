const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const regressionFiles = [
  'json-import-failure-atomic.unit.js',
  'backup-folder-restore-failure-atomic.unit.js'
];

for (const file of regressionFiles) {
  const fullPath = path.join(__dirname, file);
  const result = spawnSync(process.execPath, [fullPath], {
    cwd: __dirname,
    encoding: 'utf8'
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  assert.strictEqual(
    result.status,
    0,
    `${file} must pass as part of the import/restore rollback regression suite`
  );
}

console.log('import-restore-rollback-regressions.unit.js passed');
