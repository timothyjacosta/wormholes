const assert = require('assert');
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', '..', 'styles', 'wormholes.css');
const css = fs.readFileSync(cssPath, 'utf8');

const inputBlockMatch = css.match(/\.local-folder-toggle input\s*\{([\s\S]*?)\}/);
assert(inputBlockMatch, 'Use local folder checkbox base CSS block should exist');
const inputBlock = inputBlockMatch[1];
const compactInputBlock = inputBlock.replace(/\s+/g, '');
assert(compactInputBlock.includes('appearance:none'), 'Use local folder checkbox should use controlled styling');
assert(compactInputBlock.includes('-webkit-appearance:none'), 'Use local folder checkbox should use WebKit controlled styling');
assert(compactInputBlock.includes('background:var(--cream-2)'), 'Unchecked Use local folder checkbox should have a cream background');
assert(compactInputBlock.includes('border-radius:3px'), 'Use local folder checkbox should keep the same rounded square shape');

const checkedBlockMatch = css.match(/\.local-folder-toggle input:checked::after\s*\{([\s\S]*?)\}/);
assert(checkedBlockMatch, 'Use local folder checked checkmark CSS block should exist');
const checkedBlock = checkedBlockMatch[1];
const compactCheckedBlock = checkedBlock.replace(/\s+/g, '');
assert(compactCheckedBlock.includes('border-width:03px3px0'), 'Checked Use local folder state should draw a checkmark');
assert(compactCheckedBlock.includes('left:50%'), 'Checked Use local folder checkmark should be horizontally centered');
assert(compactCheckedBlock.includes('top:50%'), 'Checked Use local folder checkmark should be vertically centered');
assert(compactCheckedBlock.includes('transform:translate(-50%,-58%)rotate(45deg)'), 'Checked Use local folder checkmark should be centered and rotated into a check');

console.log('local-folder-checkbox-css.unit.js passed');
