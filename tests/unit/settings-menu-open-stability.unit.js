const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
const settingsJs = fs.readFileSync(path.join(root, 'scripts', 'modals-settings.js'), 'utf8');
const storageJs = fs.readFileSync(path.join(root, 'scripts', 'storage.js'), 'utf8');
const startupJs = fs.readFileSync(path.join(root, 'scripts', 'wormholes-startup.js'), 'utf8');

assert.match(
  css,
  /\.settings-dock\s*\{[^}]*width\s*:\s*48px\s*!important[^}]*height\s*:\s*48px\s*!important[^}]*display\s*:\s*block\s*!important/s,
  'settings dock should retain a fixed launcher-sized layout when the menu opens'
);
assert.match(
  css,
  /\.settings-panel\s*\{[^}]*position\s*:\s*absolute\s*!important[^}]*left\s*:\s*58px\s*!important[^}]*bottom\s*:\s*0\s*!important[^}]*transition\s*:\s*none\s*!important/s,
  'settings panel should open independently of the launcher layout without motion transitions'
);
assert.match(
  css,
  /\.settings-gear,\s*\.settings-gear:hover[^\{]*,\s*\.settings-gear:active[^\{]*\{[^}]*transform\s*:\s*none\s*!important[^}]*filter\s*:\s*none\s*!important/s,
  'settings gear should remain visually unchanged through hover and pointer activation'
);
assert.match(
  css,
  /\.settings-storage-summary\s*\{[^}]*min-height\s*:\s*34px/s,
  'settings storage summary should reserve enough height to avoid menu reflow'
);

const toggleBody = settingsJs.match(/function toggleSettingsMenu\(forceOpen\)\{([\s\S]*?)\n\}/)?.[1] || '';
assert(!toggleBody.includes('requestStorageFootnoteUpdate'), 'opening the menu should not restart the storage calculation');
assert(startupJs.includes('showHomeScreen();\n    requestStorageFootnoteUpdate();'), 'storage measurement should begin during app startup instead');
assert((/if\s*\(\s*!settingsFootnote\?\.dataset\.storageMeasured\s*\)/).test(storageJs), 'refreshes should retain the last measured storage text while recalculating');

console.log('Settings menu open stability unit test passed.');
