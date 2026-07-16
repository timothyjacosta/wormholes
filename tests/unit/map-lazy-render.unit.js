'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-map-lazy-render.js'), 'utf8');
const context = {console, setTimeout, clearTimeout};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context);

assert.strictEqual(typeof context.mapLazyRectIntersects, 'function');
assert.strictEqual(typeof context.applyMapLazyCandidates, 'function');
assert.strictEqual(typeof context.prepareMapLazyRender, 'function');
assert.strictEqual(typeof context.scheduleMapLazyRender, 'function');

assert.strictEqual(
  context.mapLazyRectIntersects({x:0, y:0, width:20, height:20}, {x:10, y:10, width:20, height:20}),
  true,
  'overlapping rectangles should render'
);
assert.strictEqual(
  context.mapLazyRectIntersects({x:0, y:0, width:20, height:20}, {x:40, y:40, width:20, height:20}),
  false,
  'off-screen rectangles should be deferred'
);

function mockElement(){
  const classes = new Set();
  return {
    dataset:{},
    classList:{
      toggle(name, active){ if(active) classes.add(name); else classes.delete(name); },
      remove(...names){ names.forEach(name => classes.delete(name)); }
    },
    hasClass(name){ return classes.has(name); }
  };
}

const visibleLabel = {element:mockElement(), mode:'labels', bounds:{x:20, y:20, width:30, height:20}, visible:true};
const hiddenLabel = {element:mockElement(), mode:'labels', bounds:{x:400, y:400, width:30, height:20}, visible:true};
const visibleDetail = {element:mockElement(), mode:'detail', bounds:{x:85, y:85, width:8, height:8}, visible:true};
const hiddenDetail = {element:mockElement(), mode:'detail', bounds:{x:180, y:180, width:8, height:8}, visible:true};

const counts = context.applyMapLazyCandidates(
  [visibleLabel, hiddenLabel, visibleDetail, hiddenDetail],
  {x:0, y:0, width:120, height:120},
  {x:10, y:10, width:90, height:90}
);
assert.deepStrictEqual(JSON.parse(JSON.stringify(counts)), {rendered:2, deferred:2, detached:0});
assert.strictEqual(visibleLabel.element.hasClass('map-lazy-labels-offscreen'), false);
assert.strictEqual(hiddenLabel.element.hasClass('map-lazy-labels-offscreen'), true);
assert.strictEqual(visibleDetail.element.hasClass('map-lazy-detail-offscreen'), false);
assert.strictEqual(hiddenDetail.element.hasClass('map-lazy-detail-offscreen'), true);
assert.strictEqual(hiddenLabel.element.dataset.mapLazyVisible, 'false');
assert.strictEqual(visibleDetail.element.dataset.mapLazyVisible, 'true');

const connections = fs.readFileSync(path.join(root, 'scripts', 'connections-map.js'), 'utf8');
const bridges = fs.readFileSync(path.join(root, 'scripts', 'bridges-map.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
assert.match(connections, /scheduleMapLazyRender\(stage/);
assert.match(connections, /prepareMapLazyRender/);
assert.match(bridges, /scheduleMapLazyRender\(stage/);
assert.match(bridges, /prepareMapLazyRender/);
assert.match(css, /map-lazy-labels-offscreen/);
assert.match(css, /map-lazy-detail-offscreen/);
assert.match(html, /wormholes-map-lazy-render\.js/);

console.log('map lazy render unit tests passed');
