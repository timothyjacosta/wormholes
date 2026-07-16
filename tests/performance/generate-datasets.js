#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  SCENARIOS,
  generateDataset,
  plannedSummary,
  datasetHash
} = require('./representative-datasets');

function usage(){
  console.log(`Wormholes representative performance datasets\n\n` +
    `Usage:\n` +
    `  node performance/generate-datasets.js --list\n` +
    `  node performance/generate-datasets.js --summary --all\n` +
    `  node performance/generate-datasets.js --scenario medium --output ./generated\n` +
    `  node performance/generate-datasets.js --all --output ./generated\n\n` +
    `Options:\n` +
    `  --scenario NAME          Generate one named scenario\n` +
    `  --all                    Generate every scenario\n` +
    `  --output DIRECTORY       Destination directory (default: performance/generated)\n` +
    `  --summary                Print plans without building JSON files\n` +
    `  --include-media          Embed tiny valid image placeholders\n` +
    `  --pretty                 Pretty-print JSON (larger files)\n` +
    `  --list                   List scenarios\n`);
}

function parseArgs(argv){
  const args = {scenarios:[], all:false, summary:false, includeMedia:false, pretty:false, list:false, output:''};
  for(let index = 0; index < argv.length; index += 1){
    const arg = argv[index];
    if(arg === '--scenario') args.scenarios.push(argv[++index]);
    else if(arg === '--all') args.all = true;
    else if(arg === '--summary') args.summary = true;
    else if(arg === '--include-media') args.includeMedia = true;
    else if(arg === '--pretty') args.pretty = true;
    else if(arg === '--list') args.list = true;
    else if(arg === '--output') args.output = argv[++index];
    else if(arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return args;
}

function listScenarios(){
  Object.entries(SCENARIOS).forEach(([name, definition]) => {
    const summary = plannedSummary(name);
    console.log(`${name.padEnd(13)} ${definition.label}`);
    console.log(`  ${definition.purpose}`);
    console.log(`  ${summary.universes} universes · ${summary.archiveEntries + summary.groups} Archive items · ${summary.literatureDocuments + summary.literatureGroups} Literature items · ${summary.visionItems} images · ${summary.connections} connections · ${summary.bridges} bridges`);
  });
}

function main(){
  const args = parseArgs(process.argv.slice(2));
  if(args.help){ usage(); return; }
  if(args.list){ listScenarios(); return; }
  const names = args.all ? Object.keys(SCENARIOS) : args.scenarios.filter(Boolean);
  if(!names.length){ usage(); process.exitCode = 1; return; }
  names.forEach(name => {
    if(!SCENARIOS[name]) throw new Error(`Unknown scenario: ${name}`);
  });
  if(args.summary){
    console.log(JSON.stringify(names.map(name => plannedSummary(name)), null, 2));
    return;
  }

  const outputDirectory = path.resolve(process.cwd(), args.output || path.join('performance', 'generated'));
  fs.mkdirSync(outputDirectory, {recursive:true});
  const manifest = [];
  names.forEach(name => {
    const started = Date.now();
    const dataset = generateDataset(name, {includeMediaPayloads:args.includeMedia});
    const json = JSON.stringify(dataset, null, args.pretty ? 2 : 0);
    const fileName = `wormholes-performance-${name}.json`;
    fs.writeFileSync(path.join(outputDirectory, fileName), json);
    const record = {
      scenario:name,
      file:fileName,
      bytes:Buffer.byteLength(json),
      sha256:datasetHash(dataset),
      generatedMs:Date.now() - started,
      summary:dataset.exportSummary
    };
    manifest.push(record);
    console.log(`${name}: ${record.bytes.toLocaleString()} bytes, ${record.generatedMs} ms, ${record.sha256.slice(0, 12)}`);
  });
  fs.writeFileSync(path.join(outputDirectory, 'manifest.json'), JSON.stringify({generatedAt:new Date().toISOString(), datasets:manifest}, null, 2));
  console.log(`Wrote ${manifest.length} dataset${manifest.length === 1 ? '' : 's'} to ${outputDirectory}`);
}

try{ main(); }
catch(error){
  console.error(error?.stack || error);
  process.exitCode = 1;
}
