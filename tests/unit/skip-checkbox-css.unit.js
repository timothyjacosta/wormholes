const assert = require('assert');
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', '..', 'styles', 'wormholes.css');
const css = fs.readFileSync(cssPath, 'utf8');

const inputBlockMatch = css.match(/\.skip-roll-toggle input\s*\{([\s\S]*?)\}/);
assert(inputBlockMatch, 'Skip animation checkbox base CSS block should exist');
const inputBlock = inputBlockMatch[1];
const compactInputBlock = inputBlock.replace(/\s+/g, '');
assert(compactInputBlock.includes('appearance:none'), 'Skip animation checkbox should use controlled styling');
assert(compactInputBlock.includes('-webkit-appearance:none'), 'Skip animation checkbox should use WebKit controlled styling');
assert(compactInputBlock.includes('background:var(--cream-2)'), 'Unchecked Skip animation checkbox should have a cream background');

const checkedBlockMatch = css.match(/\.skip-roll-toggle input:checked::after\s*\{([\s\S]*?)\}/);
assert(checkedBlockMatch, 'Skip animation checked checkmark CSS block should exist');
const checkedBlock = checkedBlockMatch[1];
const compactCheckedBlock = checkedBlock.replace(/\s+/g, '');
assert(compactCheckedBlock.includes('border-width:03px3px0'), 'Checked Skip animation state should draw a checkmark');
assert(compactCheckedBlock.includes('left:50%'), 'Checked Skip animation checkmark should be horizontally centered');
assert(compactCheckedBlock.includes('top:50%'), 'Checked Skip animation checkmark should be vertically centered');
assert(compactCheckedBlock.includes('transform:translate(-50%,-58%)rotate(45deg)'), 'Checked Skip animation checkmark should be centered and rotated into a check');
assert(compactCheckedBlock.includes('transform-origin:center'), 'Checked Skip animation checkmark should rotate around its center');

console.log('skip-checkbox-css.unit.js passed');
