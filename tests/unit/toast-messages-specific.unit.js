const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const scriptDir = path.join(root, 'scripts');
const files = fs.readdirSync(scriptDir).filter(name => name.endsWith('.js'));

const genericCalls = [];
for(const file of files){
  const text = fs.readFileSync(path.join(scriptDir, file), 'utf8');
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if(file === 'wormholes-app.js' && trimmed.startsWith('function showSavedToast(')) return;
    if(/showSavedToast\(\s*\)/.test(trimmed)){
      genericCalls.push(`${file}:${index + 1}: ${trimmed}`);
    }
    if(/showSavedToast\(\s*["']Deleted["']\s*\)/.test(trimmed)){
      genericCalls.push(`${file}:${index + 1}: ${trimmed}`);
    }
  });
}

assert.deepStrictEqual(genericCalls, [], 'toast calls should use short action-specific messages instead of generic Saved/Deleted');

console.log('toast-messages-specific.unit.js passed');
