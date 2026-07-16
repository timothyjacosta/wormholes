const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const mapState = fs.readFileSync(path.join(root, 'scripts', 'wormholes-app-state-map.js'), 'utf8');
const connections = fs.readFileSync(path.join(root, 'scripts', 'connections.js'), 'utf8');
const connectionsMap = fs.readFileSync(path.join(root, 'scripts', 'connections-map.js'), 'utf8');
const bridges = fs.readFileSync(path.join(root, 'scripts', 'bridges.js'), 'utf8');
const bridgesMap = fs.readFileSync(path.join(root, 'scripts', 'bridges-map.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');

assert.ok(/let\s+connectionsMapIsolatedSubgraph\s*=\s*false/.test(mapState), 'Connections map should keep explicit isolated-subgraph state');
assert.ok(/let\s+wormholesMapIsolatedSubgraph\s*=\s*false/.test(mapState), 'Manage Bridges map should keep explicit isolated-subgraph state');

assert.ok(/>Isolate<\//.test(connectionsMap), 'Connections map should offer Isolate');
assert.ok(/>Back to item<\//.test(connectionsMap), 'Connections isolated view should offer Back to item');
assert.ok(!/Isolated Subgraph/.test(connectionsMap), 'Connections isolation should use buttons without a text label');
assert.ok(/connectionNodeVisibleInCurrentView/.test(connectionsMap), 'Connections map should calculate isolated node visibility');
assert.ok(/!connectionNodeVisibleInCurrentView\(sourceId\).*targetId/s.test(connectionsMap), 'Connections should hide unrelated internal edges');
assert.ok(/connectionsMapIsolatedSubgraph\s*=\s*true/.test(connectionsMap), 'Connections Isolate should enter isolated mode');
assert.ok(/connectionsMapIsolatedSubgraph\s*=\s*false/.test(connectionsMap), 'Connections Back should exit isolated mode while preserving focus');
assert.ok(/if\s*\(\s*connectionsIsolationActive\s*\)\s*return;/.test(connectionsMap), 'Connections isolated nodes should not edit relationships');

assert.ok(/>Isolate<\//.test(bridgesMap), 'Manage Bridges should offer Isolate');
assert.ok(/>Back to item<\//.test(bridgesMap), 'Manage Bridges isolated view should offer Back to item');
assert.ok(!/Isolated Subgraph/.test(bridgesMap), 'Manage Bridges isolation should use buttons without a text label');
assert.ok(/wormholeCreationVisibleInCurrentView/.test(bridgesMap), 'Manage Bridges should calculate isolated creation visibility');
assert.ok(/wormholeUniverseVisibleInCurrentView/.test(bridgesMap), 'Manage Bridges should calculate isolated universe visibility');
assert.ok(/wormholeNodeDescriptorVisible/.test(bridgesMap), 'Manage Bridges should filter relationship endpoints');
assert.ok(/wormholesMapIsolatedSubgraph\s*=\s*true/.test(bridgesMap), 'Manage Bridges Isolate should enter isolated mode');
assert.ok(/wormholesMapIsolatedSubgraph\s*=\s*false/.test(bridgesMap), 'Manage Bridges Back should exit isolated mode while preserving focus');
assert.ok(/if\s*\(\s*wormholeIsolationActive\s*\)/.test(bridgesMap), 'Manage Bridges should guard node editing in isolated mode');

assert.ok(/connectionsMapIsolatedSubgraph\s*=\s*false/.test(connections), 'Opening or unfocusing Connections should clear isolated state');
assert.ok(/wormholesMapIsolatedSubgraph\s*=\s*false/.test(bridges), 'Opening, closing, or unfocusing Manage Bridges should clear isolated state');
assert.ok(/\.isolated-subgraph-hidden\s*\{[\s\S]*display:\s*none\s*!important/.test(css), 'Unrelated isolated-subgraph nodes should be fully hidden');
assert.ok(!/\.map-isolation-label/.test(css), 'Unused isolated-subgraph label styling should be removed');
assert.ok(/const currentOrbitGuideSvg = Array\.from/.test(connectionsMap), 'Connections orbit guides should remain in isolation');
assert.ok(!/!connectionsIsolationActive && externalNodes\.length/.test(connectionsMap), 'Connections outer orbit should remain in isolation');
assert.ok(/orbitCapsuleRectSvg\(system\.cx, system\.cy, system\.orbitX/.test(bridgesMap), 'Manage Bridges orbit graphics should remain in isolation');
assert.ok(!/wormholeIsolationActive \? "" : orbitCapsuleRectSvg/.test(bridgesMap), 'Manage Bridges should not suppress orbit graphics while isolated');
assert.ok(!/Focus on this item/.test(connectionsMap + bridgesMap), 'User-facing action should be Isolate, not Focus on this item');

console.log('isolated-subgraph.unit.js passed');
