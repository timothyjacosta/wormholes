const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const htmlName = fs.readdirSync(root).filter(name => /^Wormholes_Beta_\d+\.html$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, {numeric:true})).pop();
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'scripts', 'wormholes-shell-interface.js'), 'utf8');
const imports = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');

assert.ok(/id="activityLogBtn"[^>]*>Recent Activity<\/button>/.test(html), 'Advanced settings should include an Recent Activity button');
assert.ok(html.indexOf('id="recoverySnapshotsBtn"') < html.indexOf('id="activityLogBtn"'), 'Recent Activity should follow Backup & Recovery');
assert.ok(/id="activityLogModal"[^>]*role="dialog"/.test(html), 'activity log should be a dialog');
assert.ok(/id="activityDetailModal"[^>]*role="dialog"/.test(html), 'report detail should be a dialog');
assert.ok(html.indexOf('scripts/wormholes-activity-log.js') < html.indexOf('scripts/wormholes-app.js'), 'activity log should load before toast calls');
assert.ok(/function showSavedToast\(message = "Saved", options = \{\}\)/.test(shell), 'toasts should accept actionable options');
assert.ok(/moreInfoLabel \|\| "More information"/.test(shell), 'actionable toast should have More information text button');
assert.ok(/durationMs:\s*12000/.test(imports), 'failed import toast should linger for twelve seconds');
assert.ok(/"What to do next"/.test(fs.readFileSync(path.join(root, 'scripts', 'wormholes-activity-log.js'), 'utf8')), 'full report should show action steps');
assert.ok(/\.saved-toast\.action-toast\s*\{/.test(css), 'actionable toast styling should exist');
assert.ok(/\.saved-toast-more-button\s*\{[\s\S]*color:\s*#24201b/.test(css), 'toast action should use dark high-contrast text on the cream toast');
assert.ok(/\.activity-log-text-button\s*\{[\s\S]*color:\s*var\(--cream\) !important/.test(css), 'log text actions should use cream text on the dark modal');
const activityLogSource = fs.readFileSync(path.join(root, 'scripts', 'wormholes-activity-log.js'), 'utf8');
assert.ok(/if\s*\(item\.action && actionAvailable\(item\)\)/.test(activityLogSource), 'the log should render action buttons only while they are genuinely available');
assert.ok(/Undo expired/.test(activityLogSource), 'expired Undo entries should show status text instead of a dead button');
assert.ok(/\.activity-log-action-status\s*\{/.test(css), 'expired Undo status styling should exist');

function luminance(hex){
  const rgb = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
function contrast(a, b){
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
}
assert.ok(contrast('24201b', 'f2e7d0') >= 4.5, 'More information should meet normal-text contrast against the toast');
assert.ok(contrast('f2e7d0', '13171a') >= 4.5, 'Log text actions should meet normal-text contrast against the modal');

console.log('activity-log-ui.unit.js passed');
