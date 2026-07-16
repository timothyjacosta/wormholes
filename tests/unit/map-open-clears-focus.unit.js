const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const connections = fs.readFileSync(path.join(root, 'scripts', 'connections.js'), 'utf8');
const bridges = fs.readFileSync(path.join(root, 'scripts', 'bridges.js'), 'utf8');

const showConnectionsMatch = connections.match(/function\s+showConnectionsScreen\s*\(\)\s*{([\s\S]*?)\n}/);
assert.ok(showConnectionsMatch, 'showConnectionsScreen should exist in connections.js');
const showConnectionsBody = showConnectionsMatch[1];
assert.ok(/selectedMapNodeId\s*=\s*null\s*;/.test(showConnectionsBody), 'Connections should clear any focused entity when opened');
assert.ok(/connectionsMapIsolatedSubgraph\s*=\s*false\s*;/.test(showConnectionsBody), 'Connections should clear isolated-subgraph mode when opened');
assert.ok(showConnectionsBody.indexOf('selectedMapNodeId = null') < showConnectionsBody.indexOf('renderConnectionsMap()'), 'Connections focus should clear before first map render');

const openWormholesMatch = bridges.match(/function\s+openWormholesModal\s*\(\)\s*{([\s\S]*?)\n}/);
assert.ok(openWormholesMatch, 'openWormholesModal should exist in bridges.js');
const openWormholesBody = openWormholesMatch[1];
assert.ok(/selectedWormholeCreation\s*=\s*null\s*;/.test(openWormholesBody), 'Manage Bridges should clear selected creation when opened');
assert.ok(/wormholeFocusUniverseId\s*=\s*null\s*;/.test(openWormholesBody), 'Manage Bridges should clear focused universe when opened');
assert.ok(/wormholesMapIsolatedSubgraph\s*=\s*false\s*;/.test(openWormholesBody), 'Manage Bridges should clear isolated-subgraph mode when opened');
assert.ok(openWormholesBody.indexOf('selectedWormholeCreation = null') < openWormholesBody.indexOf('renderWormholesMap()'), 'Manage Bridges focus should clear before first map render');
assert.ok(openWormholesBody.indexOf('wormholeFocusUniverseId = null') < openWormholesBody.indexOf('renderWormholesMap()'), 'Manage Bridges universe focus should clear before first map render');

console.log('map-open-clears-focus.unit.js passed');
