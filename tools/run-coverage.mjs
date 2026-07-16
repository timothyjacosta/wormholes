#!/usr/bin/env node
/* Generate diagnostic coverage reports for canonical Wormholes ES modules.
   Uses Node's built-in V8 coverage output so coverage reporting adds no runtime
   or developer dependency beyond the Node version already required by tests. */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {spawnSync} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = path.join(root, "tests");
const canonicalDir = path.join(root, "scripts", "modules");
const rawDir = path.join(testsDir, ".coverage-v8");
const reportDir = path.join(testsDir, "coverage");
const filesDir = path.join(reportDir, "files");
const skipTests = process.argv.includes("--report-only");

function walkFiles(directory, extension){
  const files = [];
  for(const entry of fs.readdirSync(directory, {withFileTypes:true})){
    const absolute = path.join(directory, entry.name);
    if(entry.isDirectory()) files.push(...walkFiles(absolute, extension));
    else if(entry.isFile() && entry.name.endsWith(extension)) files.push(absolute);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function cleanDirectory(directory){
  fs.rmSync(directory, {recursive:true, force:true});
  fs.mkdirSync(directory, {recursive:true});
}

function runUnitSuiteWithCoverage(){
  cleanDirectory(rawDir);
  fs.rmSync(reportDir, {recursive:true, force:true});
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["run", "test:unit:core"], {
    cwd:testsDir,
    env:{...process.env, NODE_V8_COVERAGE:rawDir},
    stdio:"inherit"
  });
  if(result.error) throw result.error;
  if(result.status !== 0){
    throw new Error(`Unit suite failed while collecting coverage (exit ${result.status ?? "unknown"}).`);
  }
}

function readRawCoverage(){
  if(!fs.existsSync(rawDir)){
    throw new Error(`No raw V8 coverage found at ${path.relative(root, rawDir)}. Run without --report-only first.`);
  }
  const entries = [];
  for(const filename of fs.readdirSync(rawDir)){
    if(!filename.endsWith(".json")) continue;
    const payload = JSON.parse(fs.readFileSync(path.join(rawDir, filename), "utf8"));
    if(Array.isArray(payload.result)) entries.push(...payload.result);
  }
  return entries;
}

function canonicalPathFromUrl(url){
  if(typeof url !== "string" || !url.startsWith("file:")) return null;
  let filename;
  try{
    filename = path.resolve(fileURLToPath(url));
  } catch{
    return null;
  }
  const relative = path.relative(canonicalDir, filename);
  if(relative.startsWith("..") || path.isAbsolute(relative) || !relative.endsWith(".mjs")) return null;
  return filename;
}

function aggregateCoverage(rawEntries){
  const byFile = new Map();
  for(const script of rawEntries){
    const filename = canonicalPathFromUrl(script.url);
    if(!filename) continue;
    if(!byFile.has(filename)) byFile.set(filename, {ranges:new Map(), functions:new Map(), samples:0});
    const aggregate = byFile.get(filename);
    aggregate.samples += 1;
    for(const fn of script.functions ?? []){
      const rootRange = fn.ranges?.[0];
      if(!rootRange) continue;
      const functionKey = `${rootRange.startOffset}:${rootRange.endOffset}:${fn.functionName ?? ""}`;
      const previousFunction = aggregate.functions.get(functionKey) ?? {
        name:fn.functionName ?? "",
        startOffset:rootRange.startOffset,
        endOffset:rootRange.endOffset,
        count:0
      };
      previousFunction.count += rootRange.count ?? 0;
      aggregate.functions.set(functionKey, previousFunction);
      for(const range of fn.ranges ?? []){
        const rangeKey = `${range.startOffset}:${range.endOffset}`;
        const previous = aggregate.ranges.get(rangeKey) ?? {
          startOffset:range.startOffset,
          endOffset:range.endOffset,
          count:0
        };
        previous.count += range.count ?? 0;
        aggregate.ranges.set(rangeKey, previous);
      }
    }
  }
  return byFile;
}

function lineStarts(source){
  const starts = [0];
  for(let index = 0; index < source.length; index += 1){
    if(source[index] === "\n") starts.push(index + 1);
  }
  return starts;
}

function lineIsCommentOnly(trimmed, inBlockComment){
  let remaining = trimmed;
  let block = inBlockComment;
  while(remaining){
    if(block){
      const end = remaining.indexOf("*/");
      if(end === -1) return {commentOnly:true, inBlockComment:true};
      remaining = remaining.slice(end + 2).trimStart();
      block = false;
      continue;
    }
    if(remaining.startsWith("//")) return {commentOnly:true, inBlockComment:false};
    if(remaining.startsWith("/*")){
      const end = remaining.indexOf("*/", 2);
      if(end === -1) return {commentOnly:true, inBlockComment:true};
      remaining = remaining.slice(end + 2).trimStart();
      continue;
    }
    return {commentOnly:false, inBlockComment:block};
  }
  return {commentOnly:true, inBlockComment:block};
}

function significantLineOffsets(source){
  const lines = source.split("\n");
  const starts = lineStarts(source);
  const result = [];
  let inBlockComment = false;
  for(let index = 0; index < lines.length; index += 1){
    const line = lines[index];
    const trimmed = line.trim();
    if(!trimmed) continue;
    const commentState = lineIsCommentOnly(trimmed, inBlockComment);
    inBlockComment = commentState.inBlockComment;
    if(commentState.commentOnly) continue;
    const firstContent = line.search(/\S/);
    result.push({line:index + 1, offset:starts[index] + Math.max(0, firstContent)});
  }
  return result;
}

function effectiveCountAt(ranges, offset){
  let best = null;
  for(const range of ranges){
    if(range.startOffset > offset || range.endOffset <= offset) continue;
    const width = range.endOffset - range.startOffset;
    if(!best || width < best.width){
      best = {width, count:range.count};
    }
  }
  return best?.count ?? 0;
}

function buildFileReport(filename, aggregate){
  const source = fs.readFileSync(filename, "utf8");
  const lineOffsets = significantLineOffsets(source);
  const ranges = aggregate ? [...aggregate.ranges.values()] : [];
  const lineStates = new Map();
  let coveredLines = 0;
  for(const entry of lineOffsets){
    const covered = effectiveCountAt(ranges, entry.offset) > 0;
    lineStates.set(entry.line, covered);
    if(covered) coveredLines += 1;
  }

  let functions = [];
  if(aggregate){
    functions = [...aggregate.functions.values()].filter(fn => {
      const isWholeScript = fn.startOffset === 0 && fn.endOffset >= source.length - 1 && fn.name === "";
      return !isWholeScript;
    });
  }
  const coveredFunctions = functions.filter(fn => fn.count > 0).length;
  const relative = path.relative(root, filename).split(path.sep).join("/");
  return {
    filename,
    relative,
    source,
    loaded:Boolean(aggregate),
    samples:aggregate?.samples ?? 0,
    lineStates,
    lines:{covered:coveredLines, total:lineOffsets.length},
    functions:{covered:coveredFunctions, total:functions.length}
  };
}

function percentage(covered, total){
  if(total === 0) return null;
  return (covered / total) * 100;
}

function formatPercentage(value){
  return value === null ? "n/a" : `${value.toFixed(1)}%`;
}

function escapeHtml(value){
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function outputFilename(relative){
  return `${relative.replaceAll("/", "__").replace(/[^a-zA-Z0-9_.-]/g, "_")}.html`;
}

function renderFileHtml(report){
  const lines = report.source.split("\n");
  const rows = lines.map((line, index) => {
    const lineNumber = index + 1;
    const state = report.lineStates.has(lineNumber)
      ? report.lineStates.get(lineNumber) ? "covered" : "uncovered"
      : "neutral";
    const marker = state === "covered" ? "✓" : state === "uncovered" ? "×" : "";
    return `<tr class="${state}"><td class="marker">${marker}</td><td class="number">${lineNumber}</td><td><code>${escapeHtml(line)}</code></td></tr>`;
  }).join("\n");
  const linePct = formatPercentage(percentage(report.lines.covered, report.lines.total));
  const functionPct = report.loaded
    ? formatPercentage(percentage(report.functions.covered, report.functions.total))
    : "not loaded";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Coverage — ${escapeHtml(report.relative)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#f7f7f8;color:#18181b}header{position:sticky;top:0;background:white;border-bottom:1px solid #ddd;padding:1rem 1.5rem;z-index:2}h1{font-size:1.1rem;margin:0 0 .4rem}.meta{color:#52525b;font-size:.9rem}.back{display:inline-block;margin-bottom:.5rem}table{border-collapse:collapse;width:100%;background:white}.marker,.number{user-select:none;text-align:right;color:#71717a;border-right:1px solid #e4e4e7}.marker{width:1.2rem;font-weight:700}.number{width:3.5rem;padding-right:.6rem}td{vertical-align:top}code{display:block;white-space:pre;padding:0 .7rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.55}.covered{background:#effaf0}.covered .marker{color:#237a32}.uncovered{background:#fff0f0}.uncovered .marker{color:#b42318}.neutral{background:#fff}</style>
</head><body><header><a class="back" href="../index.html">← Coverage summary</a><h1>${escapeHtml(report.relative)}</h1><div class="meta">Loaded: ${report.loaded ? "yes" : "no"} · Lines: ${report.lines.covered}/${report.lines.total} (${linePct}) · Functions: ${report.functions.covered}/${report.functions.total} (${functionPct})</div></header><table><tbody>${rows}</tbody></table></body></html>`;
}

function renderIndexHtml(reports, summary){
  const rows = reports.map(report => {
    const linePct = percentage(report.lines.covered, report.lines.total);
    const functionPct = report.loaded ? percentage(report.functions.covered, report.functions.total) : null;
    const href = `files/${outputFilename(report.relative)}`;
    return `<tr><td><a href="${href}">${escapeHtml(report.relative)}</a></td><td>${report.loaded ? "loaded" : "not loaded"}</td><td>${report.lines.covered}/${report.lines.total}</td><td>${formatPercentage(linePct)}</td><td>${report.loaded ? `${report.functions.covered}/${report.functions.total}` : "—"}</td><td>${report.loaded ? formatPercentage(functionPct) : "—"}</td></tr>`;
  }).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wormholes coverage report</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;color:#18181b}h1{margin-bottom:.3rem}.note{max-width:70rem;color:#52525b}.cards{display:flex;gap:1rem;flex-wrap:wrap;margin:1.5rem 0}.card{border:1px solid #d4d4d8;border-radius:.6rem;padding:1rem;min-width:12rem}.value{font-size:1.8rem;font-weight:700}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{text-align:left;border-bottom:1px solid #e4e4e7;padding:.55rem}th{position:sticky;top:0;background:white}a{color:#1d4ed8}</style>
</head><body><h1>Wormholes canonical-source coverage</h1><p class="note">Diagnostic report for <code>scripts/modules/**/*.mjs</code>. Generated classic compatibility files are excluded. No percentage threshold is enforced. Line coverage is derived from V8 execution ranges; function totals are available for modules loaded by the unit suite.</p>
<div class="cards"><div class="card"><div class="value">${formatPercentage(summary.lines.percent)}</div><div>source lines covered</div><small>${summary.lines.covered}/${summary.lines.total}</small></div><div class="card"><div class="value">${summary.files.loaded}/${summary.files.total}</div><div>modules loaded</div></div><div class="card"><div class="value">${formatPercentage(summary.functions.percent)}</div><div>discovered functions covered</div><small>${summary.functions.covered}/${summary.functions.total}</small></div></div>
<table><thead><tr><th>Canonical module</th><th>Status</th><th>Lines</th><th>Line %</th><th>Functions</th><th>Function %</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

function writeReports(reports){
  fs.mkdirSync(filesDir, {recursive:true});
  const lineCovered = reports.reduce((sum, report) => sum + report.lines.covered, 0);
  const lineTotal = reports.reduce((sum, report) => sum + report.lines.total, 0);
  const functionCovered = reports.reduce((sum, report) => sum + report.functions.covered, 0);
  const functionTotal = reports.reduce((sum, report) => sum + report.functions.total, 0);
  const loadedFiles = reports.filter(report => report.loaded).length;
  const summary = {
    generatedAt:new Date().toISOString(),
    scope:"scripts/modules/**/*.mjs",
    thresholdsEnforced:false,
    files:{loaded:loadedFiles, total:reports.length},
    lines:{covered:lineCovered, total:lineTotal, percent:percentage(lineCovered, lineTotal)},
    functions:{covered:functionCovered, total:functionTotal, percent:percentage(functionCovered, functionTotal)},
    reports:reports.map(report => ({
      file:report.relative,
      loaded:report.loaded,
      samples:report.samples,
      lines:{...report.lines, percent:percentage(report.lines.covered, report.lines.total)},
      functions:{...report.functions, percent:percentage(report.functions.covered, report.functions.total)}
    }))
  };
  fs.writeFileSync(path.join(reportDir, "coverage-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, "index.html"), renderIndexHtml(reports, summary));
  for(const report of reports){
    fs.writeFileSync(path.join(filesDir, outputFilename(report.relative)), renderFileHtml(report));
  }
  return summary;
}

function printSummary(summary, reports){
  console.log("\nCanonical source coverage (diagnostic; no threshold enforced)");
  console.log(`  Modules loaded:  ${summary.files.loaded}/${summary.files.total}`);
  console.log(`  Source lines:    ${summary.lines.covered}/${summary.lines.total} (${formatPercentage(summary.lines.percent)})`);
  console.log(`  Functions*:      ${summary.functions.covered}/${summary.functions.total} (${formatPercentage(summary.functions.percent)})`);
  console.log("  * Function totals cover modules loaded by the unit suite.\n");

  const lowest = [...reports]
    .sort((a, b) => (percentage(a.lines.covered, a.lines.total) ?? 0) - (percentage(b.lines.covered, b.lines.total) ?? 0))
    .slice(0, 15);
  console.log("Lowest line coverage:");
  for(const report of lowest){
    const pct = formatPercentage(percentage(report.lines.covered, report.lines.total)).padStart(7);
    console.log(`  ${pct}  ${report.relative}${report.loaded ? "" : " (not loaded)"}`);
  }
  console.log(`\nHTML report: ${path.relative(root, path.join(reportDir, "index.html"))}`);
  console.log(`JSON summary: ${path.relative(root, path.join(reportDir, "coverage-summary.json"))}`);
}

if(!skipTests) runUnitSuiteWithCoverage();
const rawEntries = readRawCoverage();
const aggregated = aggregateCoverage(rawEntries);
const reports = walkFiles(canonicalDir, ".mjs").map(filename => buildFileReport(filename, aggregated.get(filename)));
const summary = writeReports(reports);
printSummary(summary, reports);
