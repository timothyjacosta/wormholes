#!/usr/bin/env node
/* Builds/verifies Wormholes runtime shells.
   - Direct file:// HTML keeps ordered generated classic adapters.
   - Served HTML uses one true ES-module entry point. */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const directName = fs.readdirSync(root)
  .filter(name => /^Wormholes_Beta_\d+\.html$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, {numeric:true}))
  .pop();
if(!directName) throw new Error("No Wormholes_Beta_###.html direct-file build found.");

const directPath = path.join(root, directName);
const servedName = directName.replace(/\.html$/, ".served.html");
const servedPath = path.join(root, servedName);
const direct = fs.readFileSync(directPath, "utf8");

for(const required of [
  "scripts/wormholes-canonical-persistence.js",
  "scripts/wormholes-app-state-domain.js",
  "scripts/wormholes-app-state-storage.js",
  "scripts/wormholes-app-state-ui.js",
  "scripts/wormholes-app-state-map.js",
  "scripts/wormholes-controller-services.js",
  "scripts/wormholes-tagging-helpers.js",
  "scripts/wormholes-map-presentation-helpers.js",
  "scripts/wormholes-app-data-validation.js",
  "scripts/wormholes-theme-decks.js",
  "scripts/wormholes-shell-interface.js",
  "scripts/wormholes-document-zip-helpers.js",
  "scripts/wormholes-app-workflow.js",
  "scripts/wormholes-map-inspector.js",
  "scripts/wormholes-app.js"
]){
  if(!direct.includes(`src="${required}"`)) throw new Error(`Direct-file build is missing ${required}`);
}

const scriptBlockPattern = /(?:<script defer="" src="scripts\/[^"]+"><\/script>\s*)+/;
if(!scriptBlockPattern.test(direct)) throw new Error("Could not find the direct-file script block.");
const servedScript = '<script type="module" src="scripts/modules/served-entry.mjs"></script>\n';
const served = direct.replace(scriptBlockPattern, servedScript);

if(checkOnly){
  const existing = fs.existsSync(servedPath) ? fs.readFileSync(servedPath, "utf8") : "";
  if(existing !== served){
    console.error(`Out-of-date served build: ${servedName}`);
    process.exit(1);
  }
  console.log(`Runtime shells are current: ${directName}, ${servedName}`);
} else {
  fs.writeFileSync(servedPath, served);
  console.log(`Generated ${servedName}`);
}
