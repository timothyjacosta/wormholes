"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.resolve(__dirname, "..", "..", "styles", "wormholes.css"), "utf8");
const marker = "/* Wormholes Beta 248: centralized split-row treatment for entity controls with ellipsis menus.";
const index = css.lastIndexOf(marker);
assert.ok(index !== -1, "Centralized Archive/Literature header styling must exist.");
const rules = css.slice(index);
assert.ok(rules.includes("#archiveListScreen .entry-top,"), "Archive entity headers must be targeted.");
assert.ok(/#literatureListScreen \.entry-top\s*\{/.test(rules), "Literature entity headers must be targeted.");
assert.ok(/border-radius:\s*var\(--ellipsis-row-local-radius\) !important/.test(rules), "Entity headers must round all four corners through the shared row radius.");
assert.ok(/overflow:\s*visible !important/.test(rules), "Rounded headers must allow their action menus to open outside the row.");
assert.ok(/border-radius:\s*0\s+calc\(var\(--ellipsis-row-local-radius\) - 1px\)\s+calc\(var\(--ellipsis-row-local-radius\) - 1px\)\s+0 !important/.test(rules), "The action segment must complete the rounded right edge.");
console.log("entity-header-rounding.unit.js passed");
