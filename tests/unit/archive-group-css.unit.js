const assert = require('assert');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.resolve(__dirname, '..', '..', 'styles', 'wormholes.css'), 'utf8');

assert.ok(/\.entry\.open\s*>\s*\.entry-details\s*\{\s*display:\s*block;?\s*\}/.test(css), 'Entry details must only open for the clicked entry, not nested child entries.');
assert.ok(!/\.entry\.open\s+\.entry-details\s*\{\s*display:\s*block;?\s*\}/.test(css), 'Nested archive child details should not be forced open by an expanded group.');

console.log('archive-group-css.unit.js passed');
