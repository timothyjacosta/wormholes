const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const htmlName = fs.readdirSync(root)
  .filter(name => /^Wormholes_Beta_\d+\.html$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}))
  .pop();
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'scripts/modules/bootstrap.mjs'), 'utf8');
const connections = fs.readFileSync(path.join(root, 'scripts/modules/connections-controller.mjs'), 'utf8');
const bridges = fs.readFileSync(path.join(root, 'scripts/modules/bridges-controller.mjs'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles/reskin.css'), 'utf8');

assert.match(html, /<strong>Connections<\/strong> link items in this universe\./);
assert.match(html, /<strong>Bridges<\/strong> link items across universes\./);
assert.match(html, /id="connectionsHelpBtn"[^>]*aria-controls="connectionsHelpPanel"|aria-controls="connectionsHelpPanel"[^>]*id="connectionsHelpBtn"/);
assert.match(html, /id="bridgesHelpBtn"[^>]*aria-controls="bridgesHelpPanel"|aria-controls="bridgesHelpPanel"[^>]*id="bridgesHelpBtn"/);
assert.match(html, /id="connectionsHelpPanel" hidden/);
assert.match(html, /id="bridgesHelpPanel" hidden/);
assert.match(html, /To link an item in another universe, use a Bridge\./);
assert.match(html, /To link items inside one universe, use a Connection\./);
assert.match(html, /id="bridgeModalTitle">Create Bridge</);
assert.match(html, /Choose a universe, group, or creation outside this universe\./);
assert.match(html, /id="connectPickerTitle">Add Connections</);
assert.doesNotMatch(html, /Click an item to focus it/);
assert.doesNotMatch(html, /Focus a universe, group, or creation/);
assert.doesNotMatch(html, /Bridge Creation/);

assert.match(bootstrap, /wormholesConnectionsHelpSeen/);
assert.match(bootstrap, /wormholesBridgesHelpSeen/);
assert.match(bootstrap, /button\.setAttribute\("aria-expanded"/);
assert.match(bootstrap, /panel\.hidden = !open/);
assert.match(bootstrap, /What’s this\?/);
assert.match(bootstrap, /Hide help/);
assert.match(bootstrap, /initializeRelationshipGuides\(\)/);

assert.match(connections, /Item: \$\{entry\.title\}\. Select groups or creations in this universe\. Save when done\./);
assert.match(connections, /Current item — cannot connect to itself/);
assert.match(bridges, /Select items in other universes\. Save when done\./);
assert.match(bridges, /const meta = alreadyBridged \? "Bridged" : "Not bridged"/);
assert.doesNotMatch(bridges, /Choose universe titles, groups, or creations to bridge/);

assert.match(css, /\.relationship-guide\s*\{/);
assert.match(css, /\.relationship-help-toggle/);
assert.match(css, /\.relationship-help-panel/);

console.log('Connections and Bridges terminology unit tests passed.');
