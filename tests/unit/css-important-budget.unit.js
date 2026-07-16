'use strict';

const fs = require('fs');
const path = require('path');

const stylesheetPath = path.resolve(__dirname, '..', '..', 'styles', 'wormholes.css');
const stylesheet = fs.readFileSync(stylesheetPath, 'utf8');
const importantCount = (stylesheet.match(/!important\b/g) || []).length;
const IMPORTANT_BUDGET = 874;

if(importantCount > IMPORTANT_BUDGET){
  throw new Error(
    `CSS !important budget exceeded: found ${importantCount}, expected at most ${IMPORTANT_BUDGET}. ` +
    'Avoid adding new priority overrides unless an existing one is removed or the budget is deliberately reviewed.'
  );
}

console.log(`CSS !important budget passed (${importantCount}/${IMPORTANT_BUDGET}).`);
