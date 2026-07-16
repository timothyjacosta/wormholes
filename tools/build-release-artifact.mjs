#!/usr/bin/env node
import {createHash} from "node:crypto";
import {chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from "node:fs";
import {basename, dirname, isAbsolute, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(SCRIPT_DIR, "..");

function fail(message) {
  console.error(`Release artifact build failed: ${message}`);
  process.exit(1);
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : "";
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: APP_ROOT,
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe",
  });
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    fail(`git ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }
  return String(result.stdout || "").trim();
}

function latestReleaseVersion() {
  const versions = readdirSync(APP_ROOT)
    .map((name) => /^Wormholes_Beta_(\d+)\.html$/.exec(name))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b);
  if (!versions.length) fail("no Wormholes_Beta_###.html entry was found");
  return versions.at(-1);
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

const requestedVersion = valueAfter("--version");
const version = requestedVersion ? Number(requestedVersion) : latestReleaseVersion();
if (!Number.isInteger(version) || version < 1) fail("--version must be a positive integer");

const releaseName = `Wormholes_Beta_${version}`;
for (const required of [`${releaseName}.html`, `${releaseName}.served.html`]) {
  if (!existsSync(join(APP_ROOT, required))) fail(`required release entry is missing: ${required}`);
}

const expectedCommit = valueAfter("--commit") || process.env.GITHUB_SHA || "";
const headCommit = runGit(["rev-parse", "HEAD"]);
if (expectedCommit && headCommit !== expectedCommit) {
  fail(`HEAD ${headCommit} does not match requested commit ${expectedCommit}`);
}

const trackedDiff = spawnSync("git", ["diff", "--quiet", "HEAD", "--"], {cwd: APP_ROOT});
if (trackedDiff.status !== 0) fail("tracked files differ from HEAD; commit the release source first");
const stagedDiff = spawnSync("git", ["diff", "--cached", "--quiet", "HEAD", "--"], {
  cwd: APP_ROOT,
});
if (stagedDiff.status !== 0) fail("staged files differ from HEAD; commit the release source first");

const outputDirArg = valueAfter("--output-dir") || "dist";
const outputDir = isAbsolute(outputDirArg) ? outputDirArg : resolve(APP_ROOT, outputDirArg);
const artifactPath = join(outputDir, `${releaseName}.zip`);
const checksumPath = join(outputDir, `${releaseName}.sha256`);
if (existsSync(artifactPath) || existsSync(checksumPath)) {
  fail("release output already exists; refusing to overwrite or repackage a prior artifact");
}
mkdirSync(outputDir, {recursive: true});

const archive = spawnSync(
  "git",
  [
    "archive",
    "--format=zip",
    `--prefix=${releaseName}/`,
    `--output=${artifactPath}`,
    headCommit,
  ],
  {cwd: APP_ROOT, encoding: "utf8"},
);
if (archive.status !== 0) {
  const detail = String(archive.stderr || archive.stdout || "").trim();
  fail(`git archive failed${detail ? `: ${detail}` : ""}`);
}

const digest = sha256(artifactPath);
writeFileSync(checksumPath, `${digest}  ${basename(artifactPath)}\n`, "utf8");
chmodSync(artifactPath, 0o444);
chmodSync(checksumPath, 0o444);

const githubOutputPath = valueAfter("--github-output");
if (githubOutputPath) {
  const lines = [
    `version=${version}`,
    `release_name=${releaseName}`,
    `artifact=${artifactPath}`,
    `checksum=${checksumPath}`,
    `commit=${headCommit}`,
    `sha256=${digest}`,
  ];
  writeFileSync(githubOutputPath, `${lines.join("\n")}\n`, {encoding: "utf8", flag: "a"});
}

console.log(
  JSON.stringify(
    {
      version,
      releaseName,
      artifact: artifactPath,
      checksum: checksumPath,
      commit: headCommit,
      sha256: digest,
    },
    null,
    2,
  ),
);
