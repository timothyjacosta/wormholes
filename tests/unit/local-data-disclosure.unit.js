const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const htmlName = fs.readdirSync(root)
  .filter(name => /^Wormholes_Beta_\d+\.html$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, {numeric:true}))
  .pop();
assert.ok(htmlName, 'Wormholes beta HTML should exist');

const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const settings = fs.readFileSync(path.join(root, 'scripts', 'modals-settings.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'scripts', 'bootstrap.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');

assert.ok(!/id="localDataInfoBtn"/.test(html), 'the redundant compact local-data information control should be removed');
assert.ok(/id="privacyLocalDataBtn"[^>]*>Data Safety<\/button>/.test(html), 'gear menu should expose a concise Data Safety action');
assert.ok(/id="localDataHelpModal"/.test(html), 'a detailed local-data help dialog should exist');
assert.ok(/id="recoveryLocalDataHelpBtn"/.test(html), 'recovery snapshots should link contextually to local-data help');
assert.ok(!/id="exportFromLocalDataHelpBtn"/.test(html), 'local-data help should remain informational without an export action');
assert.ok(/id="closeLocalDataHelpBtn"[^>]*>Close<\/button>/.test(html), 'local-data help should provide one clear Close action');
assert.ok(/class="local-data-export-note"/.test(html), 'export completion should briefly explain where to keep the backup');

const requiredCopy = [
  /does not sync them to an account/i,
  /send them to a Wormholes server/i,
  /does not encrypt your browser data/i,
  /Imports are checked before use/i,
  /not executable code/i,
  /block unexpected scripts and network access/i,
  /browser, device, browser profile, extensions, and file permissions/i,
  /cannot protect data after someone gains control/i,
  /Restore points help with recent mistakes/i,
  /clearing site data/i,
  /private browsing/i,
  /App Data exports and backup folders/i,
  /saved outside the browser profile/i,
  /files can be changed outside Wormholes/i
];
requiredCopy.forEach(pattern => assert.ok(pattern.test(html), `local-data dialog should explain ${pattern}`));

assert.ok(/function\s+openLocalDataHelpModal\s*\(/.test(settings), 'local-data dialog should have an explicit opener');
assert.ok(/function\s+closeLocalDataHelpModal\s*\(/.test(settings), 'local-data dialog should have an explicit closer');
assert.ok(!/localDataInfoBtn/.test(settings), 'removed compact information control should have no remaining handler');
assert.ok(/privacyLocalDataBtn[\s\S]*openLocalDataHelpModal/.test(settings), 'gear-menu privacy action should open the same local-data dialog');
assert.ok(/recoveryLocalDataHelpBtn[\s\S]*returnModalId:\s*"recoverySnapshotsModal"/.test(settings), 'recovery help should return users to the recovery dialog');
assert.ok(!/exportFromLocalDataHelp/.test(settings), 'local-data dialog should not retain an export action helper');

assert.ok(!/\.settings-info-button/.test(css), 'removed information control should not leave unused styles');
assert.ok(/\.local-data-help-grid/.test(css), 'detailed content should remain contained in its dialog');
assert.ok(/grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/.test(css), 'Data Safety cards should use a compact two-column desktop layout');

assert.ok(!/Remind Me Later/i.test(html + settings + bootstrap), 'local-data disclosure should not add a recurring reminder prompt');
assert.ok(!/openLocalDataHelpModal\s*\(\s*\)\s*;/.test(bootstrap), 'local-data help should not open automatically at startup');
assert.ok(!/localDataHelp.*localStorage/i.test(settings), 'the disclosure should not track or nag users with a reminder flag');

console.log('local-data-disclosure.unit.js passed');
