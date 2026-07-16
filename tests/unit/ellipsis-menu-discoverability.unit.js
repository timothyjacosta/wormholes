const assert = require('assert');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.resolve(__dirname, '..', '..', 'styles', 'wormholes.css'), 'utf8');
const marker = '/* Wormholes Beta 248: keep ellipsis actions visible with a warm dark-cream treatment. */';
const markerIndex = css.lastIndexOf(marker);
assert.ok(markerIndex !== -1, 'Ellipsis discoverability override must exist.');

const rules = css.slice(markerIndex);
const compactRules = rules.replace(/\s+/g, '').toLowerCase();
assert.ok(compactRules.includes('body.menu-wrap>.menu-button,'), 'Shared menu buttons must receive the discoverability override with enough specificity.');
assert.ok(compactRules.includes('body.vision-pin-menu-wrap>.vision-pin-menu-button{'), 'Vision Board menu buttons must receive the discoverability override.');
assert.ok(compactRules.includes('display:inline-flex!important'), 'Ellipsis buttons must remain rendered.');
assert.ok(compactRules.includes('opacity:1!important'), 'Ellipsis buttons must not fade at rest.');
assert.ok(compactRules.includes('visibility:visible!important'), 'Ellipsis buttons must remain visible at rest.');
assert.ok(compactRules.includes('color:#2b241c!important'), 'Ellipsis glyphs must use a dark high-contrast color.');
assert.ok(compactRules.includes('background-color:#a59079!important'), 'Ellipsis buttons must use the requested #A59079 backing.');
assert.ok(compactRules.includes('border-color:rgba(58,44,30,0.72)!important'), 'Ellipsis buttons must have a visible warm dark border.');
assert.ok(compactRules.includes('body.menu-wrap>.menu-button:hover,'), 'Ellipsis buttons must have an obvious hover treatment.');
assert.ok(compactRules.includes('body.menu-wrap>.menu-button:focus-visible,'), 'Ellipsis buttons must have an obvious keyboard focus treatment.');
assert.ok(compactRules.includes('outline:3pxsolidvar(--sky)!important'), 'Keyboard focus must use a strong visible outline.');
assert.ok(compactRules.includes('body.menu-wrap>.menu-button[aria-expanded="true"],'), 'Open menus must expose a distinct active state.');

console.log('ellipsis-menu-discoverability.unit.js passed');
