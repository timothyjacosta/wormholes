const assert = require('assert');
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', '..', 'styles', 'wormholes.css');
const css = fs.readFileSync(cssPath, 'utf8');

const forcedMapBlockMatch = css.match(/\.map-filter-panel \.map-filter-toggle input\[type="checkbox"\][\s\S]*?\{([\s\S]*?)\}/);
assert(forcedMapBlockMatch, 'Map filter checkbox forced CSS block should exist');
const forcedMapBlock = forcedMapBlockMatch[1];
const compactForcedMapBlock = forcedMapBlock.replace(/\s+/g, '');
assert(compactForcedMapBlock.includes('appearance:none!important'), 'Map filter checkboxes should not use native dark checkbox styling');
assert(compactForcedMapBlock.includes('-webkit-appearance:none!important'), 'Map filter checkboxes should not use WebKit native dark checkbox styling');
assert(compactForcedMapBlock.includes('background:var(--cream-2)!important'), 'Unchecked map filter checkboxes should be cream');
assert(compactForcedMapBlock.includes('border-radius:3px!important'), 'Map filter checkboxes should use the same rounded-square shape');
assert(compactForcedMapBlock.includes('width:13px!important'), 'Map filter checkbox size should stay compact like the Connections map');
assert(compactForcedMapBlock.includes('padding:0!important'), 'Manage Bridges modal inputs should not inherit modal text-input padding');
assert(compactForcedMapBlock.includes('margin-bottom:0!important'), 'Manage Bridges modal inputs should not inherit modal text-input bottom margin');
assert(compactForcedMapBlock.includes('flex:0013px!important'), 'Map filter checkbox sizing should be identical in Connections and Manage Bridges');

const forcedCheckedMatch = css.match(/\.map-filter-panel \.map-filter-toggle input\[type="checkbox"\]:checked::after[\s\S]*?\{([\s\S]*?)\}/);
assert(forcedCheckedMatch, 'Map filter checked checkmark CSS block should exist');
const forcedChecked = forcedCheckedMatch[1];
const compactForcedChecked = forcedChecked.replace(/\s+/g, '');
assert(compactForcedChecked.includes('border-width:02px2px0!important'), 'Map filter checked state should draw a compact checkmark');
assert(compactForcedChecked.includes('transform:translate(-50%,-58%)rotate(45deg)!important'), 'Map filter checkmark should stay centered');

console.log('map-filter-checkbox-css.unit.js passed');
