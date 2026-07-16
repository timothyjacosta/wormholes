const assert = require('assert');
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', '..', 'styles', 'wormholes.css');
const css = fs.readFileSync(cssPath, 'utf8');

const globalBlockMatch = css.match(/input\[type="checkbox"\]\s*\{([\s\S]*?)\}/);
assert(globalBlockMatch, 'App-wide checkbox base CSS block should exist');
const globalBlock = globalBlockMatch[1];
const compactGlobalBlock = globalBlock.replace(/\s+/g, '');
assert(compactGlobalBlock.includes('appearance:none'), 'All app checkboxes should use controlled styling');
assert(compactGlobalBlock.includes('-webkit-appearance:none'), 'All app checkboxes should use WebKit controlled styling');
assert(compactGlobalBlock.includes('background:var(--cream-2)'), 'Unchecked app checkboxes should be cream');
assert(compactGlobalBlock.includes('border-radius:3px'), 'App checkboxes should keep rounded square shape');

const checkedBlockMatch = css.match(/input\[type="checkbox"\]:checked::after\s*\{([\s\S]*?)\}/);
assert(checkedBlockMatch, 'App-wide checked checkbox checkmark block should exist');
const checkedBlock = checkedBlockMatch[1];
const compactCheckedBlock = checkedBlock.replace(/\s+/g, '');
assert(compactCheckedBlock.includes('border-width:03px3px0'), 'Checked app checkboxes should draw a checkmark');
assert(compactCheckedBlock.includes('transform:translate(-50%,-58%)rotate(45deg)'), 'Checked app checkboxes should center and rotate the checkmark');

const mapBlockMatch = css.match(/\.map-filter-toggle input\s*\{([\s\S]*?)\}/);
assert(mapBlockMatch, 'Map filter checkbox CSS block should exist');
assert(!mapBlockMatch[1].includes('accent-color'), 'Map filter checkboxes should not rely on native accent-color unchecked styling');

console.log('app-checkbox-css.unit.js passed');
