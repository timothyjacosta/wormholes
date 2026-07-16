'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-map-clustering.js'), 'utf8');
const context = { console };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context);

assert.strictEqual(typeof context.buildMapClusters, 'function', 'cluster builder should be globally available');
assert.strictEqual(typeof context.updateMapClusteringState, 'function', 'zoom state helper should be globally available');
assert.strictEqual(typeof context.mapPanForSvgPoint, 'function', 'cluster centering helper should be globally available');

const items = Array.from({length:20}, (_, index) => ({
  id:`node-${index}`,
  x:Math.cos(index / 20 * Math.PI * 2) * 400,
  y:Math.sin(index / 20 * Math.PI * 2) * 280,
  weight:1,
  groupKey:'current',
  groupLabel:'Current universe'
}));
const clusters = context.buildMapClusters(items, {
  minimumItems:8,
  minimumWeight:20,
  targetSize:4,
  minimumClusterSize:3
});
assert.ok(clusters.length >= 4, 'a crowded map should form several visual clusters');
assert.strictEqual(clusters.reduce((sum, cluster) => sum + cluster.memberIds.length, 0), 20,
  'every clustered item should appear exactly once');
assert.strictEqual(new Set(clusters.flatMap(cluster => cluster.memberIds)).size, 20,
  'clusters should not duplicate stored entity IDs');

assert.strictEqual(context.buildMapClusters(items.slice(0, 7), {
  minimumItems:8,
  minimumWeight:20
}).length, 0, 'small maps should not cluster');

const classes = new Set();
const controls = [{attributes:{}, setAttribute(name, value){ this.attributes[name] = value; }}];
const stage = {
  dataset:{mapClusterEligible:'true', mapClusterBlocked:'false', mapClusterThreshold:'0.42'},
  classList:{toggle(name, active){ if(active) classes.add(name); else classes.delete(name); }},
  querySelectorAll(){ return controls; }
};
assert.strictEqual(context.updateMapClusteringState(stage, 0.3), true, 'far zoom should enable clustering');
assert.ok(classes.has('map-clusters-active'));
assert.strictEqual(controls[0].attributes.tabindex, '0');
assert.strictEqual(context.updateMapClusteringState(stage, 0.8), false, 'close zoom should restore individual nodes');
assert.ok(!classes.has('map-clusters-active'));
assert.strictEqual(controls[0].attributes.tabindex, '-1');
stage.dataset.mapClusterBlocked = 'true';
assert.strictEqual(context.updateMapClusteringState(stage, 0.2), false, 'focused map operations should block clustering');

const pan = context.mapPanForSvgPoint(
  {clientWidth:800, clientHeight:600},
  {viewBox:{baseVal:{x:-100, y:-50, width:1000, height:800}}, width:{baseVal:{value:1000}}, height:{baseVal:{value:800}}},
  400,
  350,
  0.8
);
assert.strictEqual(pan.panX, 0, 'cluster activation should center the selected SVG point horizontally');
assert.strictEqual(pan.panY, -20, 'cluster activation should center the selected SVG point vertically');

const connections = fs.readFileSync(path.join(root, 'scripts', 'connections-map.js'), 'utf8');
const bridges = fs.readFileSync(path.join(root, 'scripts', 'bridges-map.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
assert.match(connections, /data-map-cluster-eligible/);
assert.match(connections, /connectionMapClusters/);
assert.match(bridges, /wormholeMapClusterEligible/);
assert.match(bridges, /zoomToWormholeAggregateCluster/);
assert.match(css, /map-clusters-active \.map-cluster-member/);
assert.match(css, /Stored universes, creations, connections, and bridges remain unchanged/);

console.log('map clustering unit tests passed');
