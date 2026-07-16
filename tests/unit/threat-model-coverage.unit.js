const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {latestDirectHtmlPath} = require("../support/release-path");

const root = path.resolve(__dirname, "..", "..");
const threatPath = path.join(root, "docs", "security", "THREAT_MODEL.md");
const trustPath = path.join(root, "docs", "security", "SECURITY_AND_TRUST.md");
const headersPath = path.join(root, "docs", "security", "SECURITY_HEADERS.md");

assert.ok(fs.existsSync(threatPath), "the release should include an explicit threat model");
const threat = fs.readFileSync(threatPath, "utf8");
const trust = fs.readFileSync(trustPath, "utf8");
const headers = fs.readFileSync(headersPath, "utf8");
const html = fs.readFileSync(latestDirectHtmlPath(root), "utf8");

for (const heading of [
  "Imported-file boundary",
  "Imported-backup boundary",
  "Folder-handle boundary",
  "Browser-storage boundary",
  "IndexedDB boundary",
  "HTML rendering and sanitization boundary",
  "External-URL boundary",
  "Future AI and network-adapter boundary",
  "Threat, control, and test matrix",
]) {
  assert.ok(threat.includes(heading), `threat model should document ${heading}`);
}

for (const phrase of [
  "No input source is trusted merely because Wormholes created it earlier",
  "Visible app state changes only after the full restore transaction succeeds",
  "Folder contents may be changed, moved, replaced, or deleted outside Wormholes",
  "localStorage is not encrypted or tamper resistant",
  "IndexedDB is browser-local storage, not an external backup or encrypted vault",
  "Dynamic inline styles are used by trusted map and dialog geometry",
  "Opening a link leaves the Wormholes data and execution boundary",
  "AI output must be a proposal, not a direct mutation",
  "Core app use must remain available without AI and without network access",
]) {
  assert.ok(threat.includes(phrase), `threat model should state: ${phrase}`);
}

const matrixRows = threat
  .split(/\r?\n/)
  .filter((line) => /^\| (?:FILE|BACKUP|FOLDER|BROWSER|IDB|RENDER|URL|NETWORK|AI)-\d+ \|/.test(line));
assert.ok(matrixRows.length >= 15, "the threat matrix should cover every named boundary");

const ids = matrixRows.map((row) => row.split("|")[1].trim());
assert.equal(new Set(ids).size, ids.length, "threat IDs should be unique");

for (const row of matrixRows) {
  const cells = row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  assert.equal(cells.length, 5, `threat row ${cells[0]} should have five fields`);
  assert.ok(cells[1], `${cells[0]} should describe the threat`);
  assert.ok(cells[2], `${cells[0]} should name a control`);
  assert.ok(cells[3], `${cells[0]} should name a regression test`);
  assert.ok(cells[4], `${cells[0]} should state residual risk`);
  assert.match(cells[3], /tests\//, `${cells[0]} should link to an automated test`);
}

const documentedPaths = [...threat.matchAll(/`((?:scripts|tests)\/[A-Za-z0-9._/-]+)`/g)].map(
  (match) => match[1],
);
assert.ok(documentedPaths.length >= 35, "the matrix should link controls and tests explicitly");
for (const relativePath of new Set(documentedPaths)) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `documented path should exist: ${relativePath}`);
}

assert.match(trust, /THREAT_MODEL\.md/, "the release trust summary should link to the threat model");
assert.match(headers, /THREAT_MODEL\.md/, "security-header guidance should link to the threat model");

const csp = (html.match(/<meta\s+content="([^"]+)"\s+http-equiv="Content-Security-Policy"/i) || [])[1] || "";
assert.match(csp, /connect-src blob:/, "the current build should allow only local blob reads");
assert.ok(!/connect-src[^;]*https?:/i.test(csp), "the current build should not allow remote network endpoints");

assert.match(html, /<h3 id="localDataLinksTitle">Links and online services<\/h3>/);
assert.match(html, /External links open outside Wormholes\./);
assert.match(html, /This build has no AI service or online sync\./);
assert.ok(
  !/threat model|attack surface|exfiltration|prompt injection/i.test(
    (html.match(/<div aria-labelledby="localDataHelpTitle"[\s\S]*?<\/div>\s*<\/div>/) || [""])[0],
  ),
  "the user-facing Data Safety copy should remain non-technical",
);

console.log("threat-model-coverage.unit.js passed");
