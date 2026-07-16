"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require("vm");
const root = path.resolve(__dirname, "..", "..");
const html = fs.readFileSync(latestDirectHtmlPath(root), "utf8");
const css = fs.readFileSync(path.join(root, "styles", "wormholes.css"), "utf8");
const shell = fs.readFileSync(path.join(root, "scripts", "wormholes-shell-interface.js"), "utf8");
const source = fs.readFileSync(path.join(root, "scripts", "wormholes-density.js"), "utf8");

for(const name of ["archive", "literature", "vision"]){
  assert.ok(html.includes(`id="${name}DensitySlider"`), `${name} density slider should exist`);
  assert.ok(html.includes(`id="${name}DensityValue"`), `${name} density value should exist`);
}
assert.ok(html.includes('src="scripts/wormholes-density.js"'), "density module should be loaded");
assert.ok(css.includes('#visionTab[data-density="compact"] .vision-board-grid'), "compact Vision Board layout should exist");
assert.ok(css.includes('#archiveListScreen[data-density="spacious"] .entry'), "spacious Archive layout should exist");
assert.ok(shell.includes('WormholesDensity?.reset?.("archive")'), "Archive tab should reset density on open");
assert.ok(shell.includes('WormholesDensity?.reset?.("literature")'), "Literature tab should reset density on open");
assert.ok(shell.includes('WormholesDensity?.reset?.("vision")'), "Vision tab should reset density on open");

function element(){
  return {
    value:"2",
    textContent:"",
    dataset:{},
    attrs:{},
    listeners:{},
    setAttribute(name, value){ this.attrs[name] = String(value); },
    addEventListener(name, handler){ this.listeners[name] = handler; }
  };
}
const elements = {
  archiveDensitySlider:element(), archiveDensityValue:element(), archiveListScreen:element(),
  literatureDensitySlider:element(), literatureDensityValue:element(), literatureListScreen:element(),
  visionDensitySlider:element(), visionDensityValue:element(), visionTab:element()
};
const context = {window:{}, document:{getElementById:id => elements[id] || null}, console};
context.window.window = context.window;
vm.runInNewContext(source, context, {filename:"wormholes-density.js"});
context.window.WormholesDensity.initialize();
assert.strictEqual(elements.archiveListScreen.dataset.density, "comfortable");
context.window.WormholesDensity.apply("archive", 1);
assert.strictEqual(elements.archiveListScreen.dataset.density, "compact");
assert.strictEqual(elements.archiveDensityValue.textContent, "Compact");
assert.strictEqual(elements.archiveDensitySlider.attrs["aria-valuetext"], "Compact");
context.window.WormholesDensity.reset("archive");
assert.strictEqual(elements.archiveListScreen.dataset.density, "comfortable");
assert.strictEqual(elements.archiveDensitySlider.value, "2");
console.log("collection-density unit test passed");
