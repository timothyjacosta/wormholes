const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const moduleSource = fs.readFileSync(
  path.join(root, "scripts/modules/onboarding.mjs"),
  "utf8",
);
const manifest = fs.readFileSync(path.join(root, "scripts/modules/runtime-manifest.mjs"), "utf8");
const css = fs.readFileSync(path.join(root, "styles/wormholes.css"), "utf8");
const connectionsMap = fs.readFileSync(
  path.join(root, "scripts/modules/connections-map-controller.mjs"),
  "utf8",
);
const bridgesMap = fs.readFileSync(
  path.join(root, "scripts/modules/bridges-map-controller.mjs"),
  "utf8",
);
const directHtmlName = fs
  .readdirSync(root)
  .filter((name) => /^Wormholes_Beta_\d+\.html$/.test(name))
  .sort((left, right) => left.localeCompare(right, undefined, {numeric: true}))
  .pop();
const html = fs.readFileSync(path.join(root, directHtmlName), "utf8");

assert.match(moduleSource, /wormholesOnboardingSeen:/);
assert.match(moduleSource, /wormholesOnboardingTipsDisabled/);
assert.match(moduleSource, /screen:home/);
assert.match(moduleSource, /screen:generate/);
assert.match(moduleSource, /screen:archive/);
assert.match(moduleSource, /screen:literature/);
assert.match(moduleSource, /screen:vision/);
assert.match(moduleSource, /screen:connections/);
assert.match(moduleSource, /screen:bridges/);
assert.match(moduleSource, /Don’t show any more tips/);
assert.match(moduleSource, />Hide help</);
assert.match(moduleSource, /contextualHelpBtn/);
assert.match(moduleSource, /MutationObserver/);
assert.match(moduleSource, /topicWasSeen\(topic\.key\)/);
assert.match(moduleSource, /TERMINOLOGY_TOOLTIPS/);

assert.match(manifest, /onboarding\.mjs/);
assert.match(html, /scripts\/onboarding\.js/);
assert.match(html, /<p class="home-hint">Choose where to begin\.<\/p>/);
assert.match(html, /<p class="create-intro">Choose or write each part\.<\/p>/);
assert.match(css, /\.contextual-onboarding-footer/);
assert.match(css, /\.contextual-help-button/);
assert.match(css, /\.map-selection-help-actions/);

for (const source of [connectionsMap, bridgesMap]) {
  assert.match(source, /Don’t show any more tips/);
  assert.match(source, /map-selection-help-hide/);
  assert.match(source, /wormholesOnboardingTipsDisabled/);
}

console.log("contextual-onboarding.unit.js passed");
