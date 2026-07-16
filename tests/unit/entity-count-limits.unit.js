const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const elements = new Map();
function element(id){
  const value = {
    id,
    textContent:'',
    focused:false,
    listeners:{},
    classList:{
      values:new Set(),
      add(name){ this.values.add(name); },
      remove(name){ this.values.delete(name); },
      contains(name){ return this.values.has(name); }
    },
    addEventListener(type, handler){ this.listeners[type] = handler; },
    focus(){ this.focused = true; }
  };
  elements.set(id, value);
  return value;
}
[
  'entityLimitModal',
  'entityLimitTitle',
  'entityLimitText',
  'entityLimitDetail',
  'closeEntityLimitBtn'
].forEach(element);

const context = {
  console,
  Object,
  Number,
  String,
  Math,
  Array,
  Set,
  Map,
  Error,
  Promise,
  setTimeout(handler){ handler(); return 1; },
  clearTimeout(){},
  alertMessage:'',
  alert(message){ context.alertMessage = message; },
  document:{getElementById(id){ return elements.get(id) || null; }}
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-entity-limits.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-entity-limits.js'});

const limits = context.WormholesEntityLimits;
assert.ok(limits, 'entity-limit API should be exposed');
assert.strictEqual(limits.limits.universes.hard, 250, 'multi-book projects should have a generous universe limit');
assert.strictEqual(limits.limits.archive.hard, 5000, 'each universe should support thousands of Archive entities');
assert.strictEqual(limits.limits.literature.hard, 5000, 'each universe should support thousands of Literature entities');
assert.strictEqual(limits.limits.vision.hard, 2500, 'each universe should support an extensive Vision Board');
assert.strictEqual(limits.limits.connectionsPerUniverse.hard, 50000, 'deep relationship networks should remain supported');
assert.strictEqual(limits.limits.bridgesAcrossApp.hard, 50000, 'multi-universe bridge networks should remain supported');

// The user's ten-book example remains well within the supported model.
assert.strictEqual(limits.makeResult('universes', 10, 1).ok, true);
assert.strictEqual(limits.makeResult('archive', 500, 1).ok, true);
assert.strictEqual(limits.makeResult('literature', 800, 1).ok, true);
assert.strictEqual(limits.makeResult('vision', 500, 1).ok, true);
assert.strictEqual(limits.makeResult('bridgesAcrossApp', 1000, 1).ok, true);

assert.strictEqual(limits.makeResult('archive', 4999, 1).ok, true, 'the hard boundary should be inclusive');
const blocked = limits.ensure('archive', 5000, 1, {context:'The Glass City', operation:'archive another creation'});
assert.strictEqual(blocked.ok, false, 'new entities above the hard limit should be blocked');
assert.strictEqual(elements.get('entityLimitModal').classList.contains('open'), true, 'blocked additions should open the integrated dialog');
assert.match(elements.get('entityLimitTitle').textContent, /limit reached/i);
assert.match(elements.get('entityLimitText').textContent, /5,001/);
assert.match(elements.get('entityLimitText').textContent, /5,000/);
assert.match(elements.get('entityLimitText').textContent, /The Glass City/);
assert.match(elements.get('entityLimitDetail').textContent, /Nothing was added/i);
assert.strictEqual(elements.get('closeEntityLimitBtn').focused, true, 'dialog close control should receive focus');
elements.get('closeEntityLimitBtn').listeners.click();
assert.strictEqual(elements.get('entityLimitModal').classList.contains('open'), false);

const archive = [
  {id:'a', title:'A', connections:['b']},
  {id:'b', title:'B', connections:['a','c']},
  {id:'c', title:'C', connections:['b']}
];
assert.strictEqual(limits.uniqueConnectionCount(archive), 2, 'symmetric connection records should count as unique pairs');
const plan = limits.ensureConnectionPlan(archive, 'a', ['b','c'], {showDialog:false});
assert.strictEqual(plan.ok, true);
assert.strictEqual(plan.additions, 1, 'existing connection pairs should not consume capacity twice');

function makeUniverse(index, overrides = {}){
  const id = `u-${index}`;
  return {id, title:`Book ${index}`, bridges:[], ...overrides};
}
const supported = {
  format:'Wormholes App Data Export',
  universes:Array.from({length:10}, (_, index) => makeUniverse(index)),
  universeData:{}
};
supported.universes.forEach(universe => {
  supported.universeData[universe.id] = {
    archive:Array.from({length:500}, (_, index) => ({id:`${universe.id}-a-${index}`, title:`Creation ${index}`, connections:[], bridges:[], notes:[]})),
    literature:Array.from({length:800}, (_, index) => ({id:`${universe.id}-l-${index}`, title:`Page ${index}`})),
    vision:Array.from({length:500}, (_, index) => ({id:`${universe.id}-v-${index}`, title:`Image ${index}`}))
  };
});
assert.strictEqual(limits.validateAppData(supported), true, 'an in-depth ten-universe writing project should validate');

const oversized = {
  format:'Wormholes App Data Export',
  universes:[makeUniverse(1)],
  universeData:{'u-1':{archive:Array.from({length:5001}, (_, i) => ({id:`a-${i}`})), literature:[], vision:[]}}
};
assert.throws(
  () => limits.validateAppData(oversized),
  error => error?.code === 'WORMHOLES_ENTITY_LIMIT_EXCEEDED' && error?.entityLimitResult?.kind === 'archive',
  'oversized imports should fail with a structured entity-limit error'
);
assert.strictEqual(limits.validateAppData(oversized, {allowOverLimit:true}), true, 'internal rollback and recovery data should remain restorable');

const htmlName = fs.readdirSync(root).find(name => /^Wormholes_Beta_\d+\.html$/.test(name));
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
assert.ok(html.includes('id="entityLimitModal"'), 'the integrated entity-limit dialog should exist');
assert.ok(html.indexOf('scripts/wormholes-entity-limits.js') < html.indexOf('scripts/archive.js'), 'entity limits must load before creation consumers');
assert.ok(html.indexOf('scripts/wormholes-entity-limits.js') < html.indexOf('scripts/export-import.js'), 'entity limits must load before import validation');

const importScript = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
const archiveScript = fs.readFileSync(path.join(root, 'scripts', 'archive.js'), 'utf8');
const literatureScript = fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8');
const visionScript = fs.readFileSync(path.join(root, 'scripts', 'vision-board.js'), 'utf8');
const universeScript = fs.readFileSync(path.join(root, 'scripts', 'universes.js'), 'utf8');
const bridgeScript = fs.readFileSync(path.join(root, 'scripts', 'bridges.js'), 'utf8');
assert.match(importScript, /validateAppData\?\.\(migrated/, 'imports should validate entity counts before live data is changed');
assert.match(archiveScript, /ensure\(\s*"archive"/, 'Archive creation and migration paths should enforce capacity');
assert.match(archiveScript, /ensure\(\s*"notes"/, 'Archive notes should have a bounded count');
assert.match(literatureScript, /ensure\(\s*"literature"/, 'Literature creation and uploads should enforce capacity');
assert.match(visionScript, /ensure\(\s*"vision"/, 'Vision Board uploads should enforce capacity');
assert.match(universeScript, /ensure\(\s*"universes"/, 'universe creation should enforce capacity');
assert.match(bridgeScript, /ensure\(\s*"bridgesAcrossApp"/, 'bridge creation should enforce an application-wide cap');

console.log('entity-count-limits.unit.js passed');
