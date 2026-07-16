'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const profileSource = fs.readFileSync(path.join(root, 'scripts', 'wormholes-map-dom-budget.js'), 'utf8');
const lazySource = fs.readFileSync(path.join(root, 'scripts', 'wormholes-map-lazy-render.js'), 'utf8');
const context = {console, setTimeout, clearTimeout};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(profileSource, context);
vm.runInContext(lazySource, context);

assert.strictEqual(typeof context.createMapDomProfile, 'function');
assert.strictEqual(typeof context.mapDomProfileAttributes, 'function');

const small = context.createMapDomProfile({nodes:12, edges:14, details:4});
assert.strictEqual(small.compact, false, 'ordinary maps should retain the full visual treatment');
const large = context.createMapDomProfile({nodes:72, edges:130, details:18});
assert.strictEqual(large.compact, true, 'large maps should activate the adaptive DOM budget');
assert.match(context.mapDomProfileAttributes(large), /data-map-dom-compact="true"/);

function classList(){
  const values = new Set();
  return {
    toggle(name, active){ if(active) values.add(name); else values.delete(name); },
    remove(...names){ names.forEach(name => values.delete(name)); },
    contains(name){ return values.has(name); }
  };
}

const parent = {
  current:null,
  replaceChild(next, previous){
    assert.strictEqual(this.current, previous);
    previous.parentNode = null;
    next.parentNode = this;
    this.current = next;
    return previous;
  }
};
const documentRef = {
  createComment(text){ return {nodeType:8, text, parentNode:null}; }
};
const detail = {
  dataset:{},
  classList:classList(),
  ownerDocument:documentRef,
  parentNode:parent,
  matches(){ return false; },
  closest(){ return null; }
};
parent.current = detail;
const candidate = {
  element:detail,
  ownerElement:detail,
  mode:'detail',
  bounds:{x:500, y:500, width:10, height:10},
  visible:true,
  parts:[{node:detail, placeholder:null, detached:false}]
};

let counts = context.applyMapLazyCandidates(
  [candidate],
  {x:0, y:0, width:100, height:100},
  {x:0, y:0, width:100, height:100},
  {compactDom:true}
);
assert.deepStrictEqual(JSON.parse(JSON.stringify(counts)), {rendered:0, deferred:1, detached:1});
assert.strictEqual(detail.parentNode, null, 'off-screen detail should leave the live SVG DOM');
assert.strictEqual(parent.current.nodeType, 8, 'a lightweight placeholder should preserve insertion order');

counts = context.applyMapLazyCandidates(
  [candidate],
  {x:450, y:450, width:100, height:100},
  {x:450, y:450, width:100, height:100},
  {compactDom:true}
);
assert.deepStrictEqual(JSON.parse(JSON.stringify(counts)), {rendered:1, deferred:0, detached:0});
assert.strictEqual(parent.current, detail, 'detail should be restored before it reaches the viewport');

const connections = fs.readFileSync(path.join(root, 'scripts', 'connections-map.js'), 'utf8');
const bridges = fs.readFileSync(path.join(root, 'scripts', 'bridges-map.js'), 'utf8');
const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
assert.match(connections, /connectionMapDomProfile/);
assert.match(connections, /showDecorations/);
assert.match(bridges, /wormholeMapDomProfile/);
assert.match(bridges, /showBridgeDecorations/);
assert.match(html, /wormholes-map-dom-budget\.js/);

console.log('map DOM size unit tests passed');
