const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-backup-status.js'), 'utf8');
const exportImport = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
const modalSettings = fs.readFileSync(path.join(root, 'scripts', 'modals-settings.js'), 'utf8');

assert.match(html, /id="settingsBackupStatus"[^>]*>Backup: none<\/p>/, 'Settings should expose a concise visible backup status');
assert.match(html, /scripts\/wormholes-backup-status\.js/, 'backup-status script should be linked');
assert.match(css, /\.settings-backup-status\s*\{[^}]*background:\s*rgba\(8,\s*13,\s*16,\s*0?\.38\);[^}]*color:\s*var\(--cream\);/s, 'backup status should use a dark backing with cream text');
assert.match(css, /\.settings-backup-status\[data-state="stale"\][\s\S]*color:\s*#ffd3cb;/, 'stale and failed states should remain light enough to read');
assert.match(exportImport, /WormholesBackupStatus\?\.recordSuccess\?\.\("json"\)/, 'JSON exports should record a successful backup');
assert.match(exportImport, /WormholesBackupStatus\?\.recordSuccess\?\.\("folder"\)/, 'folder backups should record a successful backup');
assert.match(exportImport, /preservedKeys\.add\(backupStatusKey\)/, 'Clear All Wormholes Data should preserve external-backup recency metadata');
assert.match(modalSettings, /WormholesBackupStatus\?\.render\?\.\(\)/, 'opening Settings should refresh backup age');

function luminance(hex){
  const channels = hex.match(/[a-f\d]{2}/gi).map(part => parseInt(part, 16) / 255).map(value =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a, b){
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
['f2e7d0', 'ffe3a8', 'ffd3cb'].forEach(color => {
  assert.ok(contrast(color, '131b20') >= 4.5, `${color} should meet normal-text contrast on the status backing`);
});

const entries = new Map();
const statusElement = {
  textContent:'',
  title:'',
  dataset:{},
  attributes:{},
  setAttribute(name, value){ this.attributes[name] = value; }
};
const document = {
  getElementById(id){ return id === 'settingsBackupStatus' ? statusElement : null; },
  addEventListener(){}
};
const localStorage = {
  getItem(key){ return entries.has(key) ? entries.get(key) : null; },
  setItem(key, value){ entries.set(key, String(value)); }
};
const context = {
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Object,
  localStorage,
  document,
  addEventListener(){},
  window:null
};
context.window = context;
vm.runInNewContext(source, context, {filename:'wormholes-backup-status.js'});

const api = context.WormholesBackupStatus;
assert.ok(api, 'backup-status API should be published');
assert.strictEqual(api.render(new Date('2026-07-12T18:00:00-05:00')).visibleText, 'Backup: none');

api.recordSuccess('json', new Date('2026-07-12T16:00:00-05:00'));
let record = api.read();
assert.strictEqual(record.lastSuccessKind, 'json');
let status = api.render(new Date('2026-07-12T18:00:00-05:00'));
assert.strictEqual(status.visibleText, 'Backup: Today');
assert.strictEqual(status.state, 'recent');
assert.strictEqual(statusElement.dataset.state, 'recent');

status = api.statusFromRecord(record, new Date('2026-07-22T18:00:00-05:00'));
assert.strictEqual(status.visibleText, 'Backup: 10d ago');
assert.strictEqual(status.state, 'due');

status = api.statusFromRecord(record, new Date('2026-08-22T18:00:00-05:00'));
assert.strictEqual(status.state, 'stale');

api.recordFailure('folder', new Date('2026-08-23T18:00:00-05:00'));
status = api.render(new Date('2026-08-23T18:01:00-05:00'));
assert.strictEqual(status.visibleText, 'Backup: failed');
assert.strictEqual(status.state, 'failed');
assert.match(status.accessibleText, /Last successful JSON backup/);

console.log('backup-recency-status.unit.js passed');
