const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');

const root = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read(latestDirectHtmlName(root));
const archive = read('scripts/archive.js');
const literature = read('scripts/literature.js');
const universes = read('scripts/universes.js');
const vision = read('scripts/vision-board.js');
const connections = read('scripts/connections.js');
const bridges = read('scripts/bridges.js');
const app = read('scripts/wormholes-app.js');
const importExport = read('scripts/export-import.js');
const bootstrap = read('scripts/bootstrap.js');

[
  'Keep Current Data', 'Replace All Data', 'Keep Data', 'Delete Creation',
  'Keep Document', 'Delete Document', 'Keep Universe', 'Delete Universe',
  'Keep Image', 'Delete Image'
].forEach(label => assert.ok(html.includes(`>${label}</button>`), `missing precise destructive-action label: ${label}`));

assert.ok(html.includes('id="literatureDeleteConfirmModal"'), 'Literature deletion should require a clear confirmation');
assert.ok(literature.includes('openLiteratureDeleteConfirm'), 'Literature menu deletion should open the confirmation');
assert.ok(bootstrap.includes('confirmLiteratureDeleteBtn'), 'Literature confirmation should be wired');
assert.ok(literature.includes('The documents will stay in Literature.'), 'Deleting a Literature group should say documents are kept');
assert.ok(archive.includes('The grouped creations will stay in the Archive.'), 'Deleting an Archive group should say creations are kept');
assert.ok(archive.includes('Ungroup Creations') && archive.includes('Delete Group'), 'Archive group actions should be distinct');
assert.ok(literature.includes('Ungroup Documents') && literature.includes('Delete Group'), 'Literature group actions should be distinct');
assert.ok(universes.includes('its creations, Literature, images, connections, and bridges'), 'Universe deletion should list affected content');
assert.ok(vision.includes('This removes the image and its tags.'), 'Image deletion should describe its effect');
assert.ok(vision.includes('>Delete Image</button>'), 'Vision Board menus should name the deleted item');
assert.ok(universes.includes('>Delete Universe</button>'), 'Universe menus should name the deleted item');
assert.ok(connections.includes('Delete Connection Details') && bridges.includes('Delete Bridge Note'), 'note deletion labels should name the affected note');
assert.ok(app.includes('Connections will stay.') && app.includes('Bridges will stay.'), 'Map clearing should distinguish connections from bridges');
assert.ok(importExport.includes('A restore point will be saved first. The data will not be merged.'), 'Import replacement should explain recovery and non-merge behavior');
assert.ok(importExport.includes('notification or Recent Activity for two minutes'), 'Clear Data should explain the real recovery window without developer terms');

const userFacingCopy = [
  html.match(/<div aria-labelledby="deleteEntryConfirmTitle"[\s\S]*?<\/div>\n<\/div>/)?.[0] || '',
  html.match(/<div aria-labelledby="literatureDeleteConfirmTitle"[\s\S]*?<\/div>\n<\/div>/)?.[0] || '',
  html.match(/<div aria-labelledby="clearMapConfirmTitle"[\s\S]*?<\/div>\n<\/div>/)?.[0] || '',
  html.match(/<div aria-labelledby="deleteUniverseTitle"[\s\S]*?<\/div>\n<\/div>/)?.[0] || '',
  html.match(/<div aria-labelledby="visionDeleteConfirmTitle"[\s\S]*?<\/div>\n<\/div>/)?.[0] || ''
].join('\n');
assert.ok(!/Are you sure/i.test(userFacingCopy), 'destructive confirmations should avoid vague Are you sure wording');
assert.ok(!/>Yes</i.test(userFacingCopy) && !/>OK</i.test(userFacingCopy), 'final buttons should name the action');
assert.ok(!/>Cancel</i.test(userFacingCopy), 'destructive confirmations should use protective cancel labels');
assert.ok(!/\btoast\b/i.test(userFacingCopy), 'user-facing destructive copy should not use developer-facing toast terminology');

console.log('destructive-action-language.unit.js passed');
