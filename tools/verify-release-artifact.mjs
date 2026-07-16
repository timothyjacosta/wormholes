#!/usr/bin/env node
import {createHash} from "node:crypto";
import {existsSync, readFileSync, statSync} from "node:fs";
import {basename, resolve} from "node:path";
import {spawnSync} from "node:child_process";

function fail(message) {
  console.error(`Release artifact verification failed: ${message}`);
  process.exit(1);
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : "";
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

const artifactArg = valueAfter("--artifact");
const checksumArg = valueAfter("--checksum");
if (!artifactArg || !checksumArg) fail("--artifact and --checksum are required");

const artifactPath = resolve(artifactArg);
const checksumPath = resolve(checksumArg);
if (!existsSync(artifactPath) || !statSync(artifactPath).isFile()) fail("artifact file is missing");
if (!existsSync(checksumPath) || !statSync(checksumPath).isFile()) fail("checksum file is missing");

const checksumText = readFileSync(checksumPath, "utf8").trim();
const match = /^([a-f0-9]{64})\s+\*?(.+)$/.exec(checksumText);
if (!match) fail("checksum file is not in SHA-256 format");
const [, expectedDigest, expectedName] = match;
if (basename(artifactPath) !== basename(expectedName)) {
  fail(`checksum names ${expectedName}, but artifact is ${basename(artifactPath)}`);
}

const actualDigest = sha256(artifactPath);
if (actualDigest !== expectedDigest) fail("artifact checksum does not match the recorded SHA-256");
const expectedSha = valueAfter("--expected-sha");
if (expectedSha && actualDigest !== expectedSha) fail("artifact checksum changed from the expected value");

const releaseName = basename(artifactPath, ".zip");
if (!/^Wormholes_Beta_\d+$/.test(releaseName)) fail("artifact filename is not a Wormholes beta release");

const list = spawnSync("unzip", ["-Z1", artifactPath], {encoding: "utf8"});
if (list.status !== 0) fail(`could not inspect ZIP contents: ${String(list.stderr || "").trim()}`);
const entries = String(list.stdout || "")
  .split(/\r?\n/)
  .map((entry) => entry.trim())
  .filter(Boolean);
if (!entries.length) fail("artifact ZIP is empty");
if (entries.some((entry) => !entry.startsWith(`${releaseName}/`))) {
  fail("artifact contains files outside its single release directory");
}
for (const forbidden of ["/.git/", "/node_modules/", "/test-results/", "/playwright-report/"]) {
  if (entries.some((entry) => entry.includes(forbidden))) {
    fail(`artifact contains forbidden generated content: ${forbidden}`);
  }
}
if (entries.some((entry) => /(^|\/)node_modules\/?$/.test(entry))) {
  fail("artifact contains a node_modules directory or shortcut");
}
for (const required of [`${releaseName}/${releaseName}.html`, `${releaseName}/${releaseName}.served.html`]) {
  if (!entries.includes(required)) fail(`artifact is missing ${required}`);
}

const candidateRoot = valueAfter("--candidate-root");
if (candidateRoot) {
  const resolvedCandidate = resolve(candidateRoot);
  for (const required of [`${releaseName}.html`, `${releaseName}.served.html`, "tests/package-lock.json"]) {
    if (!existsSync(resolve(resolvedCandidate, required))) {
      fail(`extracted candidate is missing ${required}`);
    }
  }
}

console.log(`Verified ${basename(artifactPath)}: ${actualDigest}`);
