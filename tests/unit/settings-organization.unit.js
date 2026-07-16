const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const htmlName = fs.readdirSync(root)
  .filter(name => /^Wormholes_Beta_\d+\.html$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, {numeric:true}))
  .pop();
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const css = `${fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8')}\n${fs.readFileSync(path.join(root, 'styles', 'reskin.css'), 'utf8')}`;
const settingsModule = fs.readFileSync(path.join(root, 'scripts', 'modules', 'settings-controller.mjs'), 'utf8');

const groups = [
  ['settingsHelpHeading', 'settingsHelpToggle', 'settingsHelpBody', 'Help &amp; About'],
  ['settingsStorageHeading', 'settingsStorageToggle', 'settingsStorageBody', 'Storage'],
  ['settingsBackupHeading', 'settingsBackupToggle', 'settingsBackupBody', 'Backup &amp; Recovery'],
  ['settingsAdvancedHeading', 'settingsAdvancedToggle', 'settingsAdvancedBody', 'Advanced'],
  ['settingsDangerHeading', 'settingsDangerToggle', 'settingsDangerBody', 'Danger Zone'],
];

for (const [headingId, toggleId, bodyId, label] of groups) {
  const pattern = new RegExp(
    `id="${headingId}"><button[^>]*aria-controls="${bodyId}"[^>]*aria-expanded="false"[^>]*id="${toggleId}"[^>]*><span>${label}</span>`,
  );
  assert.ok(pattern.test(html), `Settings should include a collapsed ${label} heading`);
  assert.ok(new RegExp(`<div class="settings-section-body" hidden id="${bodyId}">`).test(html), `${label} body should start collapsed`);
}

const order = groups.map(([, toggleId]) => html.indexOf(`id="${toggleId}"`));
assert.ok(order.every(index => index >= 0), 'every Settings group should be present');
assert.deepStrictEqual([...order].sort((a, b) => a - b), order, 'Settings groups should follow the intended task order');

const simpleLabels = [
  ['exportAppDataBtn', 'Download Backup'],
  ['importAppDataBtn', 'Restore from Backup'],
  ['recoverySnapshotsBtn', 'Restore Points'],
  ['createBackupBtn', 'Back Up Folder'],
  ['restoreBackupBtn', 'Choose Backup Folder'],
  ['changeTargetStorageBtn', 'Choose Storage Folder'],
  ['activityLogBtn', 'Recent Activity'],
  ['clearAppDataBtn', 'Delete All Wormholes Data'],
];
for (const [id, label] of simpleLabels) {
  assert.ok(new RegExp(`id="${id}"[^>]*>${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/button>`).test(html), `${label} should use the simple label`);
}

const dangerStart = html.indexOf('class="settings-section settings-section--danger"');
const clearStart = html.indexOf('id="clearAppDataBtn"');
assert.ok(dangerStart >= 0 && clearStart > dangerStart, 'destructive data clearing should live inside the Danger Zone');
assert.ok(/\.settings-section-toggle\s*\{/.test(css), 'Settings group headings should be clickable controls');
assert.ok(/\.settings-section-body\[hidden\]\s*\{[^}]*display:\s*none/s.test(css), 'collapsed Settings bodies should not consume space');
assert.ok(/\.settings-section--danger\s*\{/.test(css), 'Danger Zone should have distinct styling');
assert.ok(/\.settings-danger-button\s*\{/.test(css), 'the destructive action should have distinct button styling');
assert.ok(/function toggleSettingsSection\(toggle\)/.test(settingsModule), 'Settings should provide one accordion toggle controller');
assert.ok(/candidate === toggle && shouldExpand/.test(settingsModule), 'opening one Settings group should close the other groups');
assert.ok(/prepareMenuAccessibility\(panel, document\.getElementById\("settingsGearBtn"\)\)/.test(settingsModule), 'accordion changes should refresh keyboard navigation');
assert.ok(/#settingsDock > #settingsPanel\s*\{[\s\S]*rgba\(38, 44, 60, 0\.985\)[\s\S]*rgba\(24, 29, 41, 0\.995\)/.test(css), 'Settings panel should use a substantially more opaque translucent background');
assert.ok(/#settingsDock > #settingsPanel\s*\{[\s\S]*backdrop-filter:\s*blur\(14px\) saturate\(0\.92\)/.test(css), 'Settings panel should blur competing content behind it');
assert.ok(/0 0 0 100vmax rgba\(7, 10, 18, 0\.12\)/.test(css), 'Settings panel should include a subtle surrounding scrim');

console.log('settings-organization.unit.js passed');
