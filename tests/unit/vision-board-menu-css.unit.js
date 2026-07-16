const assert = require('assert');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.resolve(__dirname, '..', '..', 'styles', 'wormholes.css'), 'utf8');

const ruleIndex = css.lastIndexOf('.vision-pin.menu-active .vision-pin-menu-wrap {');
assert.ok(ruleIndex !== -1, 'Vision Board active menu wrap must have a dedicated override.');

const sharedRuleIndex = css.indexOf('.entry.menu-active .entry-top,');
assert.ok(sharedRuleIndex !== -1, 'Shared menu-active rule should still exist for archive/universe menus.');
assert.ok(ruleIndex > sharedRuleIndex, 'Vision Board menu override must come after the shared menu-active rule.');

const rule = css.slice(ruleIndex, css.indexOf('}', ruleIndex) + 1);
assert.ok(rule.includes('position: absolute !important'), 'Opening a Vision Board menu must not put the overlay back in document flow.');
assert.ok(rule.includes('top: 7px !important'), 'Vision Board menu wrap should keep its pinned top offset.');
assert.ok(rule.includes('right: 7px !important'), 'Vision Board menu wrap should keep its pinned right offset.');

const rightOpenRuleIndex = css.lastIndexOf('.vision-pin-menu-wrap .menu,');
assert.ok(rightOpenRuleIndex !== -1, 'Vision Board menu should have a dedicated right-opening override.');
assert.ok(rightOpenRuleIndex > sharedRuleIndex, 'Vision Board right-opening override must come after shared menu positioning rules.');
const rightOpenRule = css.slice(rightOpenRuleIndex, css.indexOf('}', rightOpenRuleIndex) + 1);
assert.ok(rightOpenRule.includes('left: calc(100% + 8px) !important'), 'Vision Board menu should open to the right of the dots.');
assert.ok(rightOpenRule.includes('right: auto !important'), 'Vision Board menu should not anchor over the image from the right.');
assert.ok(rightOpenRule.includes('top: 0 !important'), 'Vision Board menu should align with the dots instead of dropping over the image.');
assert.ok(rightOpenRule.includes('transform: none !important'), 'Vision Board menu should ignore the shared open-left transform.');

console.log('vision-board-menu-css.unit.js passed');
