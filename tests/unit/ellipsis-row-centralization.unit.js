'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..', '..');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
const universes = fs.readFileSync(path.join(root, 'scripts', 'universes.js'), 'utf8');
const archive = fs.readFileSync(path.join(root, 'scripts', 'archive.js'), 'utf8');
const literature = fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8');

assert.match(css, /Wormholes Beta 248: centralized split-row treatment/,
  'Beta 247 should document the centralized ellipsis row component');
assert.match(css, /--ellipsis-row-action:\s*#A59079/i,
  'The shared action segment should preserve the approved #A59079 color');
assert.match(css, /\.ellipsis-row[\s\S]*?#universeArchiveModal \.universe-entry[\s\S]*?#archiveListScreen \.entry-top[\s\S]*?#literatureListScreen \.entry-top/,
  'Universe, Archive, and Literature rows should share one centralized style block');
assert.match(css, /border-radius:\s*0\s+calc\(var\(--ellipsis-row-local-radius\) - 1px\)\s+calc\(var\(--ellipsis-row-local-radius\) - 1px\)\s+0 !important/,
  'The action segment should form the shared row’s rounded right edge');
assert.match(css, /border-left:\s*2px solid var\(--ellipsis-row-divider\) !important/,
  'The action segment should use a single shared divider');
assert.match(css, /overflow:\s*visible !important/,
  'The row must not clip an opened ellipsis menu');

for(const [name, source] of [['universe', universes], ['archive', archive], ['literature', literature]]){
  assert.match(source, /ellipsis-row/, `${name} markup should use the shared ellipsis-row component`);
  assert.match(source, /ellipsis-row-main/, `${name} markup should use the shared main segment class`);
  assert.match(source, /ellipsis-row-actions/, `${name} markup should use the shared actions segment class`);
}

console.log('ellipsis-row centralization unit checks passed');
