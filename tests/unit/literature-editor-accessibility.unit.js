const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');

const root = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
const editorMatch = html.match(/<div\b[^>]*\bid="literatureEditor"[^>]*>/i);

assert.ok(editorMatch, 'Literature editor should exist');
const editor = editorMatch[0];
assert.ok(/\bcontenteditable="true"/i.test(editor), 'Literature editor should remain editable');
assert.ok(/\brole="textbox"/i.test(editor), 'Literature editor should expose textbox semantics');
assert.ok(/\baria-multiline="true"/i.test(editor), 'Literature editor should expose multiline semantics');
assert.ok(/\baria-label="Literature content editor"/i.test(editor), 'Literature editor should have a concise accessible name');

console.log('literature-editor-accessibility.unit.js passed');
