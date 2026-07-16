const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Deterministic pseudo-random source so the property suite is repeatable.
function makeSeededRandom(seed){
  let state = seed >>> 0;
  return function random(){
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const random = makeSeededRandom(0x574f524d); // "WORM"
const seededMath = Object.create(Math);
seededMath.random = random;

const context = {
  console,
  Date,
  JSON,
  Object,
  Number,
  String,
  Map,
  Set,
  Array,
  Promise,
  Math: seededMath,
  window: {
    matchMedia(){ return {matches:false}; },
    addEventListener(){}
  },
  document: {
    getElementById(){ return null; },
    querySelector(){ return null; },
    querySelectorAll(){ return []; }
  },
  localStorage: {
    getItem(){ return null; },
    setItem(){}
  },
  requestAnimationFrame(fn){ fn(Date.now()); },
  ResizeObserver: undefined,
  renderCurrent(){},
  updateButtons(){},
  currentUniverseId:'u1',
  archiveEntries:[],
  makeId(){ return 'property-test-id'; },
  entryHasArchivableCreationData(){ return true; },
  saveArchiveToStorage(){ return true; },
  writeArchiveEntryToFolderIfNeeded(){ return Promise.resolve(); },
  renderArchive(){},
  showSavedToast(){},
  setAppButtonDisabled(){},
  syncAllAppButtonStates(){}
};
context.globalThis = context;
context.window.window = context.window;

vm.createContext(context);
const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'generation.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/generation.js'});

const tables = vm.runInContext('({what:Array.from(what), attr:Array.from(attr), pressure:Array.from(pressure)})', context);
const d20TableList = [tables.what, tables.pressure];
const originalTables = JSON.parse(JSON.stringify(tables));

// Property: authored generator tables contain only non-empty, unique strings.
for(const [name, table] of Object.entries(tables)){
  assert.ok(table.length > 0, `${name} table should not be empty`);
  assert.ok(table.every(value => typeof value === 'string' && value.trim()), `${name} entries should be non-empty strings`);
  const normalized = table.map(value => context.normalizedAttributeValue(value));
  assert.strictEqual(new Set(normalized).size, normalized.length, `${name} entries should be unique after normalization`);
}

// Property: What and Story remain D20-based. For thousands of integer inputs,
// resultFromRoll always returns a member of those tables and clamps to 1..20.
for(let trial = 0; trial < 10000; trial += 1){
  const table = d20TableList[Math.floor(random() * d20TableList.length)];
  const rawRoll = Math.floor(random() * 2041) - 1020;
  const result = context.resultFromRoll(table, rawRoll);
  assert.ok(table.includes(result.val), `trial ${trial}: roll result must come from its source table`);
  assert.ok(result.roll >= 1 && result.roll <= 20, `trial ${trial}: reported roll must stay within D20 bounds`);
  const expectedRoll = Math.max(1, Math.min(20, rawRoll || 1));
  assert.strictEqual(result.roll, expectedRoll, `trial ${trial}: roll should clamp consistently`);
  assert.deepStrictEqual(
    context.resultFromRoll(table, rawRoll),
    result,
    `trial ${trial}: the same table and roll should map deterministically`
  );
}

// Property: the internal 1..40 attribute roll reaches every authored attribute exactly.
assert.strictEqual(tables.attr.length, 40, 'attribute table should contain the 40 authored attributes');
const mappedAttributes = new Set();
for(let roll = 1; roll <= 40; roll += 1){
  const result = context.resultFromAttributeRoll(roll);
  assert.strictEqual(result.val, tables.attr[roll - 1], `attribute roll ${roll} should map directly to table entry ${roll}`);
  assert.strictEqual(result.roll, roll, `attribute roll ${roll} should retain its internal 1..40 metadata`);
  mappedAttributes.add(result.val);
}
assert.strictEqual(mappedAttributes.size, 40, 'all 40 attributes should be reachable by the internal attribute roll');

// Property: excluding a just-rolled attribute produces a different attribute whenever
// the authored attribute table has another rollable choice.
for(let trial = 0; trial < 3000; trial += 1){
  const roll = Math.floor(random() * 40) + 1;
  const first = context.resultFromAttributeRoll(roll);
  const second = context.resultFromAttributeRollExcluding(roll, [first.val]);
  assert.ok(tables.attr.includes(second.val), `trial ${trial}: excluded result must remain in the attribute table`);
  assert.notStrictEqual(
    context.normalizedAttributeValue(second.val),
    context.normalizedAttributeValue(first.val),
    `trial ${trial}: duplicate attributes should be avoided when alternatives exist`
  );
  assert.ok(second.roll >= 1 && second.roll <= 40, `trial ${trial}: rerolled attribute should retain a valid internal 1..40 roll`);
}

// Property: the Roll Attributes button path uses the internal 1..40 generator and can
// reach all 40 authored attributes while the visible D20 animation remains separate.
vm.runInContext('skipRollAnimation = true;', context);
const rollAttributesCoverage = new Set();
for(let trial = 0; trial < 2500; trial += 1){
  vm.runInContext('current = {what:null, attr1:null, attr2:null, pressure:null}; isRolling = false;', context);
  context.rollAttr();
  const rolledAttribute = vm.runInContext('current.attr1 && JSON.parse(JSON.stringify(current.attr1))', context);
  assert.ok(rolledAttribute, `trial ${trial}: Roll Attributes should produce an attribute`);
  assert.ok(rolledAttribute.roll >= 1 && rolledAttribute.roll <= 40, `trial ${trial}: Roll Attributes should use internal 1..40 metadata`);
  rollAttributesCoverage.add(rolledAttribute.val);
}
assert.strictEqual(rollAttributesCoverage.size, 40, 'Roll Attributes should be able to reach all 40 authored attributes');

// Property: repeated Quick Full Rolls always produce a complete, valid creation with
// two distinct attributes; What and Story remain D20 while attributes use 1..40.
const quickRollAttributeCoverage = new Set();
for(let trial = 0; trial < 2500; trial += 1){
  vm.runInContext('current = {what:null, attr1:null, attr2:null, pressure:null}; isRolling = false;', context);
  context.quickFullRoll();
  const creation = vm.runInContext('JSON.parse(JSON.stringify(current))', context);

  assert.ok(creation.what && creation.attr1 && creation.attr2 && creation.pressure, `trial ${trial}: quick roll should be complete`);
  assert.ok(tables.what.includes(creation.what.val), `trial ${trial}: what result should come from the authored table`);
  assert.ok(tables.attr.includes(creation.attr1.val), `trial ${trial}: first attribute should come from the authored table`);
  assert.ok(tables.attr.includes(creation.attr2.val), `trial ${trial}: second attribute should come from the authored table`);
  assert.ok(tables.pressure.includes(creation.pressure.val), `trial ${trial}: story pressure should come from the authored table`);
  assert.notStrictEqual(
    context.normalizedAttributeValue(creation.attr1.val),
    context.normalizedAttributeValue(creation.attr2.val),
    `trial ${trial}: quick roll attributes should not duplicate each other`
  );

  assert.ok(creation.what.roll >= 1 && creation.what.roll <= 20, `trial ${trial}: What should retain D20 metadata`);
  assert.ok(creation.pressure.roll >= 1 && creation.pressure.roll <= 20, `trial ${trial}: Story should retain D20 metadata`);
  assert.ok(creation.attr1.roll >= 1 && creation.attr1.roll <= 40, `trial ${trial}: first attribute should use internal 1..40 metadata`);
  assert.ok(creation.attr2.roll >= 1 && creation.attr2.roll <= 40, `trial ${trial}: second attribute should use internal 1..40 metadata`);
  quickRollAttributeCoverage.add(creation.attr1.val);
  quickRollAttributeCoverage.add(creation.attr2.val);
}
assert.strictEqual(quickRollAttributeCoverage.size, 40, 'Quick Full Roll should be able to reach all 40 authored attributes');

// Property: generation must never mutate the authored source tables.
const tablesAfterTrials = vm.runInContext('({what:Array.from(what), attr:Array.from(attr), pressure:Array.from(pressure)})', context);
assert.strictEqual(JSON.stringify(tablesAfterTrials), JSON.stringify(originalTables), 'generator runs should not mutate authored tables');

console.log('generator-properties.unit.js passed (18,040 generated property cases)');
