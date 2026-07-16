const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "Wormholes_Beta_301.served.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles/reskin.css"), "utf8");

assert.match(html, /content="Desktop only — fluid window"/);
assert.match(html, /content="width=device-width, initial-scale=1" name="viewport"/);
assert.match(css, /Wormholes Beta 301: fluid desktop-window layout contract/);
assert.match(css, /html,\s*body\s*\{[^}]*min-width:\s*0[^}]*overflow-x:\s*hidden/s);
assert.match(css, /main\s*\{[^}]*width:\s*min\(960px, calc\(100% - 32px\)\)[^}]*min-width:\s*0/s);
assert.match(css, /\.tabs \.tab-button\s*\{[^}]*flex:\s*1 1 150px[^}]*white-space:\s*normal/s);
assert.doesNotMatch(css, /min-width:\s*1180px/);
assert.doesNotMatch(css, /min-width:\s*1100px/);
assert.doesNotMatch(html, /width=1180/);
assert.doesNotMatch(html, /mobile/i);

console.log("desktop-only-shell.unit.js passed");
