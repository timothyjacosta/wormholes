const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const htmlName = fs.readdirSync(root)
  .filter(name => /^Wormholes_Beta_\d+\.html$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}))
  .pop();
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const appCore = fs.readFileSync(path.join(root, 'scripts/modules/app-core.mjs'), 'utf8');
const connections = fs.readFileSync(path.join(root, 'scripts/modules/connections-controller.mjs'), 'utf8');
const connectionsMap = fs.readFileSync(path.join(root, 'scripts/modules/connections-map-controller.mjs'), 'utf8');
const bridges = fs.readFileSync(path.join(root, 'scripts/modules/bridges-controller.mjs'), 'utf8');
const bridgesMap = fs.readFileSync(path.join(root, 'scripts/modules/bridges-map-controller.mjs'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles/wormholes.css'), 'utf8');

assert.match(html, /id="relationshipRemovalConfirmModal"/);
assert.match(html, /id="relationshipRemovalConfirmTitle">Remove Connection\?</);
assert.match(html, /The items will not be deleted\./);
assert.match(html, /id="cancelRelationshipRemovalBtn"[^>]*>Keep Connection</);
assert.match(html, /id="confirmRelationshipRemovalBtn"[^>]*>Remove Connection</);

assert.match(connectionsMap, /renderConnectionsMapStatus\(connectionsSelectionGuide\)/);
assert.match(connectionsMap, /<strong>Selected:<\/strong>/);
assert.match(connectionsMap, /id="connectionsSelectionHelpBtn"/);
assert.match(connectionsMap, /What’s this\?/);
assert.match(connectionsMap, /Hide help/);
assert.match(connectionsMap, />Clear selection<\/button>/);
assert.match(connectionsMap, /Clear selection leaves every link unchanged\./);
assert.match(connectionsMap, /Selecting an existing link will ask before removing it\./);

assert.match(bridgesMap, /renderWormholesMapStatus\(wormholeSelectionGuide\)/);
assert.match(bridgesMap, /<strong>Selected:<\/strong>/);
assert.match(bridgesMap, /id="bridgesSelectionHelpBtn"/);
assert.match(bridgesMap, />Clear selection<\/button>/);
assert.match(bridgesMap, /Select an item in another universe to add or remove a Bridge\./);

assert.match(connections, /openRelationshipRemovalConfirm\("connection"/);
assert.match(connections, /Remove \$\{relationshipName\}\?/);
assert.match(connections, /The items will not be deleted\./);
assert.match(bridges, /requestBridgeRemoval/);
assert.match(bridges, /requestConnectionRemoval/);
assert.match(bridges, /confirmRemoval: true/);

assert.doesNotMatch(connectionsMap, />Unfocus<\/button>/);
assert.doesNotMatch(bridgesMap, />Unfocus<\/button>/);
assert.doesNotMatch(appCore, /Press Enter to focus/);
assert.match(appCore, /Press Enter to select/);

assert.match(css, /\.connections-map-status\.map-selection-footnote\s*\{/);
assert.match(css, /\.map-selection-guide\s*\{[\s\S]*position:\s*static/);
assert.match(css, /\.map-selection-help-toggle/);
assert.match(css, /\.map-selection-help-panel/);

console.log('Map interaction clarity unit tests passed.');
