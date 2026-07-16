const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');

const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles/wormholes.css'), 'utf8');

assert.ok(html.includes('class="archive-header archive-list-header"'), 'Archive list should use the dedicated action-hierarchy header');
assert.ok(html.includes('class="archive-heading-stack"'), 'Archive heading and utility controls should share a stack');
assert.ok(html.includes('class="archive-utility-actions"'), 'Filter and Sort should live in the secondary control row');
assert.ok(html.includes('id="archiveFilterBtn"'), 'Filter control should remain available');
assert.ok(html.includes('id="archiveSortBtn"'), 'Sort control should remain available');
assert.ok(html.includes('class="archive-connections-button app-button"'), 'Connections should use the primary Archive action style');

const utilityRule = css.match(/#archiveListScreen \.archive-utility-button\s*\{([\s\S]*?)\n\}/);
assert.ok(utilityRule, 'Archive utility button styling should exist');
assert.ok(/font-size:\s*0?\.72rem/.test(utilityRule[1]), 'Filter and Sort should use compact text');
assert.ok(/min-height:\s*29px/.test(utilityRule[1]), 'Filter and Sort should use compact button height');

const connectionsRule = css.match(/#archiveListScreen \.archive-connections-button\s*\{([\s\S]*?)\n\}/);
assert.ok(connectionsRule, 'Primary Connections button styling should exist');
assert.ok(/min-width:\s*150px/.test(connectionsRule[1]), 'Connections should be wider than utility controls');
assert.ok(/min-height:\s*46px/.test(connectionsRule[1]), 'Connections should be taller than utility controls');
assert.ok(/font-size:\s*1rem/.test(connectionsRule[1]), 'Connections should use stronger label sizing');

console.log('archive-action-hierarchy.unit.js: all checks passed');
