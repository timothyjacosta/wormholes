const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const app = fs.readFileSync(path.join(root, 'scripts', 'wormholes-map-inspector.js'), 'utf8');
const bridgesMap = fs.readFileSync(path.join(root, 'scripts', 'bridges-map.js'), 'utf8');

assert.ok(app.includes('modal.dataset.escapeDismiss = "closeMapListViewBtn"'), 'Map List View should declare a centralized Escape close control');
assert.ok(app.includes('modal.dataset.backdropDismiss = "same"'), 'Map List View backdrop dismissal should follow its Escape policy');
assert.ok(app.includes('modal.dataset.dialogKind = "viewer"'), 'Map List View should identify itself as a viewer dialog');
assert.ok(!app.includes('if(event.target === modal) closeMapListView();'), 'Map List View should not bypass the centralized dialog manager');

assert.ok(bridgesMap.includes('map-list-count-buttons-below-summary'), 'Bridge Map List View count controls should be outside the native details summary');
assert.ok(bridgesMap.includes('</summary>\n        <div class="map-list-count-buttons map-list-count-buttons-below-summary"'), 'Interactive count buttons must follow, rather than sit inside, the native summary control');

console.log('Map List View accessibility unit tests passed.');
