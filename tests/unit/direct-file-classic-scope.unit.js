'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const directName = fs.readdirSync(root)
  .filter(name => /^Wormholes_Beta_\d+\.html$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, {numeric:true}))
  .pop();
assert.ok(directName, 'Expected a direct-file Wormholes beta HTML entry.');

const html = fs.readFileSync(path.join(root, directName), 'utf8');
const scriptPaths = [...html.matchAll(/<script\s+defer=""\s+src="([^"]+)"/g)].map(match => match[1]);
assert.ok(scriptPaths.length > 0, 'Expected the direct-file build to contain classic deferred scripts.');

const combinedSource = scriptPaths.map(scriptPath => {
  const fullPath = path.join(root, scriptPath);
  assert.ok(fs.existsSync(fullPath), `Missing direct-file script: ${scriptPath}`);
  return `\n/* ===== ${scriptPath} ===== */\n${fs.readFileSync(fullPath, 'utf8')}\n`;
}).join('');

assert.doesNotThrow(
  () => new vm.Script(combinedSource, {filename:`${directName} classic script chain`}),
  'The complete direct-file classic script chain must parse in one shared global lexical scope. Duplicate top-level const/let/class declarations break browsers even when each generated script parses by itself.'
);

console.log(`Direct-file classic shared-scope parse test passed (${scriptPaths.length} scripts).`);
