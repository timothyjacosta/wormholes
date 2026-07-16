const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const root = path.resolve(__dirname, '..', '..');
function read(file){ return fs.readFileSync(path.join(root, file), 'utf8'); }

const undo = read('scripts/wormholes-undo.js');
const html = read(latestDirectHtmlName(root));
const css = read('styles/wormholes.css');
const files = ['archive.js','literature.js','vision-board.js','connections.js','bridges.js','universes.js','export-import.js','generation.js']
  .map(name => read(`scripts/${name}`)).join('\n');

assert.ok(undo.includes('const UNDO_DURATION_MS = 8000'));
assert.ok(undo.includes('Ctrl') || undo.includes('event.ctrlKey'));
assert.ok(undo.includes('mouseenter') && undo.includes('focus'));
assert.ok(css.includes('.saved-toast.undo-toast') && css.includes('.undo-toast-progress'));
assert.ok(html.includes('scripts/wormholes-undo.js'));

[
  'Creation deleted','Document deleted','Image deleted','Universe deleted','Summary deleted',
  'Connection details deleted','Bridge note deleted','Connections removed','Bridges cleared',
  'App data cleared','Manual creation cleared','Backup folder restored','App data imported'
].forEach(message => assert.ok(files.includes(message), `missing Undo coverage for ${message}`));

assert.ok(files.includes('finalize:async') || files.includes('const finalize = async'), 'destructive cleanup should be delayable');
assert.ok(read('scripts/storage.js').includes('WormholesUndo?.notePersistedMutation'), 'later saves should finalize the active Undo');
assert.ok(!html.includes('This action cannot be undone'));
assert.ok(!files.includes('permanently delete'));

console.log('destructive-undo-coverage.unit.js passed');
