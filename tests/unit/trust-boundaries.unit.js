const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const htmlName = fs.readdirSync(root)
  .filter(name => /^Wormholes_Beta_\d+\.html$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, {numeric:true}))
  .pop();
assert.ok(htmlName, 'Wormholes beta HTML should exist');

const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const trustPath = path.join(root, 'docs', 'security', 'SECURITY_AND_TRUST.md');
const headersPath = path.join(root, 'docs', 'security', 'SECURITY_HEADERS.md');
assert.ok(fs.existsSync(trustPath), 'release package should include supported trust-boundary documentation');

const trust = fs.readFileSync(trustPath, 'utf8');
const headers = fs.readFileSync(headersPath, 'utf8');

for (const heading of [
  'Supported build and deployment',
  'Data locations',
  'Trusted components',
  'Untrusted input',
  'Network and executable-content boundary',
  'Integrity and recovery boundary',
  'Folder-storage boundary',
  'Confidentiality boundary',
  'Availability boundary',
  'Security-relevant release changes'
]) {
  assert.ok(trust.includes(`## ${heading}`), `trust document should include ${heading}`);
}

for (const phrase of [
  'not encrypted by Wormholes',
  'does not provide',
  'Imported JSON and backup folders',
  'Authored and imported content is displayed as data',
  'Following an external link leaves the Wormholes trust boundary',
  'not independent disaster-recovery backups',
  'A JSON export or backup folder becomes independent protection only when it is stored outside',
  'hostile browser extensions',
  'securely erased'
]) {
  assert.ok(trust.includes(phrase), `trust document should state: ${phrase}`);
}

assert.ok(/id="privacyLocalDataBtn"[^>]*>Data Safety<\/button>/.test(html), 'the gear menu should expose the plain-language Data Safety summary');
assert.ok(/<h2 id="localDataHelpTitle">Data Safety<\/h2>/.test(html), 'the user-facing dialog should use a plain title');
assert.ok(/What Wormholes protects/.test(html), 'the user summary should explain protections');
assert.ok(/What Wormholes relies on/.test(html), 'the user summary should explain trusted components');
assert.ok(/Restore point limits/.test(html), 'the user summary should explain recovery limits');
assert.ok(/Backups and folders/.test(html), 'the user summary should explain backup and folder boundaries');
assert.ok(!/trust boundar|threat model|attack surface/i.test(html), 'the user-facing summary should avoid specialist security terms');

assert.ok(/SECURITY_AND_TRUST\.md/.test(headers), 'served-build header documentation should point reviewers to the trust-boundary document');

console.log('trust-boundaries.unit.js passed');
