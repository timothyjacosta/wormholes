const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-duplicate-creations.js'), 'utf8');
const listeners = {};
const document = {
  readyState:'loading',
  activeElement:null,
  addEventListener(type, handler){ listeners[type] = handler; },
  getElementById(){ return null; }
};
const window = {document};
const context = vm.createContext({window, document, console, setTimeout, clearTimeout, Map, Set, Intl, Date, Math, String, Number, Array, Object, JSON, RegExp});
vm.runInContext(source, context, {filename:'wormholes-duplicate-creations.js'});
const api = window.WormholesDuplicateCreations;
assert.ok(api, 'duplicate creation helper should be exported');

function entry(id, title, what, attr1, attr2, pressure, extra = {}){
  return {id, title, what:{val:what}, attr1:{val:attr1}, attr2:{val:attr2}, pressure:{val:pressure}, ...extra};
}

const original = entry('one', 'The Glass Orchard', 'A place', 'Hidden', 'Ancient', 'It is failing');
const exact = entry('two', 'The Glass Orchard', 'A place', 'Ancient', 'Hidden', 'It is failing');
let matches = api.findMatches(exact, [original]);
assert.strictEqual(matches.length, 1, 'swapped attributes should still be treated as the same details');
assert.strictEqual(matches[0].kind, 'exact', 'same normalized title and details should be exact');

const british = entry('three', 'Grey Harbour', 'A place', 'Fogbound', 'Remote', 'Two factions claim it');
const american = entry('four', 'Gray Harbor', 'A place', 'Fogbound', 'Remote', 'Two factions claim it');
matches = api.findMatches(american, [british]);
assert.strictEqual(matches.length, 1, 'common spelling variants with related details should be detected');
assert.strictEqual(matches[0].kind, 'near', 'spelling variants should be advisory near matches');

const typo = entry('five', 'The Ashen Cartografer', 'A person', 'Patient', 'Secretive', 'It is being hunted');
const typed = entry('six', 'The Ashen Cartographer', 'A person', 'Patient', 'Secretive', 'It is being hunted');
matches = api.findMatches(typo, [typed]);
assert.strictEqual(matches.length, 1, 'small spelling errors in longer names should be detected');

const falsePositiveA = entry('seven', 'The Gate', 'A place', 'Ancient', 'Stone', 'It opens at dusk');
const falsePositiveB = entry('eight', 'The Garden', 'A person', 'Kind', 'Young', 'It seeks a home');
assert.strictEqual(api.findMatches(falsePositiveB, [falsePositiveA]).length, 0, 'short, merely similar names with unrelated details should not warn');

const seededA = entry('nine', 'First Name', 'A thing', 'Bright', 'Small', 'It is lost', {_generation:{seed:'deadbeef'}});
const seededB = entry('ten', 'Second Name', 'A thing', 'Bright', 'Small', 'It is lost', {_generation:{seed:'deadbeef'}});
matches = api.findMatches(seededB, [seededA]);
assert.strictEqual(matches[0].kind, 'exact', 'the same hidden generation result should be detected even after renaming');

const scan = api.scanEntries([original, exact, british, american, falsePositiveA, falsePositiveB]);
assert.strictEqual(scan.count, 2, 'entry scan should find the exact and near pair without the false positive');
assert.strictEqual(scan.exactCount, 1);
assert.strictEqual(scan.nearCount, 1);

const appDataScan = api.scanAppData({
  universes:[{id:'u1', title:'One'}],
  universeData:{u1:{archive:[original, exact, falsePositiveA, falsePositiveB]}}
});
assert.strictEqual(appDataScan.count, 1, 'import scan should report possible duplicate creations inside a universe');

const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
assert.ok(html.includes('id="duplicateCreationModal"'), 'release should include the advisory modal');
assert.ok(html.includes('View Existing'), 'modal should let users inspect the saved creation');
assert.ok(html.includes('Save Anyway'), 'modal should never block an intentional duplicate');

for(const file of ['scripts/generation.js', 'scripts/archive.js', 'scripts/universes.js']){
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(text, /WormholesDuplicateCreations\.(?:review|reviewBatch)/, `${file} should run duplicate checks at its creation-moving boundary`);
}
const workflowSource = fs.readFileSync(path.join(root, 'scripts', 'wormholes-app-workflow.js'), 'utf8');
assert.match(workflowSource, /workflowDuplicateCreationsApi\?*\.(?:review|reviewBatch)/, 'workflow adapter should run duplicate checks through its explicit module API binding');
const importSource = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
assert.match(importSource, /possible duplicate creation/, 'import review should disclose possible duplicate creations');

console.log('duplicate creation unit checks passed');
