const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let estimate = {quota:100 * 1024 * 1024, usage:20 * 1024 * 1024};
let confirmResult = true;
let confirmCalls = 0;
let toastMessage = '';

const context = {
  console,
  JSON,
  Object,
  Number,
  String,
  Math,
  Array,
  Promise,
  Blob,
  TextEncoder,
  setTimeout,
  clearTimeout,
  encodeURIComponent,
  unescape,
  navigator:{storage:{async estimate(){ return estimate; }}},
  document:{getElementById(){ return null; }},
  confirm(){ confirmCalls += 1; return confirmResult; },
  alert(){},
  showSavedToast(message){ toastMessage = message; }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const root = path.resolve(__dirname, '..', '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'wormholes-storage-capacity.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/wormholes-storage-capacity.js'});

(async () => {
  const capacity = context.WormholesStorageCapacity;
  assert.ok(capacity, 'capacity preflight API should be exposed');
  assert.strictEqual(capacity.largeLiteratureThresholdBytes, 512 * 1024, 'large Literature checks should avoid ordinary small edits');

  const safe = capacity.classifyEstimate(estimate, 10 * 1024 * 1024);
  assert.strictEqual(safe.status, 'safe', 'comfortable capacity should be safe');

  const warning = capacity.classifyEstimate({quota:100 * 1024 * 1024, usage:80 * 1024 * 1024}, 12 * 1024 * 1024);
  assert.strictEqual(warning.status, 'warn', 'operations that consume the safety reserve should warn');

  const blocked = capacity.classifyEstimate({quota:100 * 1024 * 1024, usage:80 * 1024 * 1024}, 25 * 1024 * 1024);
  assert.strictEqual(blocked.status, 'block', 'operations larger than available capacity should block');

  estimate = {quota:100 * 1024 * 1024, usage:80 * 1024 * 1024};
  confirmResult = true;
  const approvedWarning = await capacity.preflight({operationLabel:'testing a warning', requiredBytes:12 * 1024 * 1024});
  assert.strictEqual(approvedWarning.approved, true, 'users may continue through a low-margin warning');
  assert.strictEqual(confirmCalls, 1, 'warning fallback should ask once when the app modal is unavailable');

  confirmResult = false;
  const canceledWarning = await capacity.preflight({operationLabel:'testing cancel', requiredBytes:12 * 1024 * 1024});
  assert.strictEqual(canceledWarning.approved, false, 'warning cancellation should prevent the operation');

  const blockedResult = await capacity.preflight({operationLabel:'testing block', requiredBytes:25 * 1024 * 1024});
  assert.strictEqual(blockedResult.approved, false, 'clearly insufficient capacity must not be overridable');

  toastMessage = '';
  const skipped = await capacity.preflight({operationLabel:'automatic snapshot', requiredBytes:12 * 1024 * 1024, mode:'silent-skip', notifyOnSkip:true});
  assert.strictEqual(skipped.approved, false, 'automatic low-capacity snapshots should skip silently');
  assert.match(toastMessage, /restore point skipped/i, 'the first skipped automatic snapshot should provide a concise notice');

  context.navigator.storage = {};
  const unknown = await capacity.preflight({operationLabel:'unknown estimate', requiredBytes:50 * 1024 * 1024});
  assert.strictEqual(unknown.status, 'unknown', 'unsupported estimates should be reported as unknown');
  assert.strictEqual(unknown.approved, true, 'unsupported estimates should not block existing workflows');

  const importEstimate = capacity.estimateAppDataOperationBytes({vision:[{data:'x'.repeat(10000)}]}, {archive:[{title:'old'}]});
  assert.ok(importEstimate > 2 * 1024 * 1024, 'app-data operations should include rollback and staging overhead');
  assert.ok(capacity.estimateFileBatchBytes([{size:10 * 1024 * 1024}], {kind:'vision', folderBacked:false}) > 10 * 1024 * 1024, 'app-only images should account for encoded image and thumbnail overhead');
  assert.ok(capacity.estimateFileBatchBytes([{size:10 * 1024 * 1024}], {kind:'vision', folderBacked:true}) < 10 * 1024 * 1024, 'folder-backed images should estimate only browser-resident metadata and thumbnails');

  const htmlName = fs.readdirSync(root).find(name => /^Wormholes_Beta_\d+\.html$/.test(name));
  const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
  assert.ok(html.includes('id="storageCapacityPreflightModal"'), 'the integrated low-storage warning modal should exist');
  assert.ok(html.indexOf('scripts/wormholes-storage-capacity.js') < html.indexOf('scripts/literature.js'), 'capacity module should load before save consumers');

  const importScript = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
  const literatureScript = fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8');
  const visionScript = fs.readFileSync(path.join(root, 'scripts', 'vision-board.js'), 'utf8');
  const snapshotScript = fs.readFileSync(path.join(root, 'scripts', 'wormholes-snapshots.js'), 'utf8');
  assert.match(importScript, /preflightAppDataStorageCapacity/, 'imports and restores should use capacity preflight');
  assert.match(literatureScript, /estimateLiteratureSaveBytes/, 'large Literature editor saves should use capacity preflight');
  assert.match(literatureScript, /estimateFileBatchBytes\(fileList,\s*\{\s*kind:\s*"literature",?\s*\}\)/, 'Literature upload batches should be preflighted');
  assert.match(visionScript, /kind:\s*"vision"/, 'image upload batches should be preflighted');
  assert.match(snapshotScript, /estimateSnapshotBytes/, 'recovery snapshots should be preflighted');

  console.log('storage-capacity-preflight.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
