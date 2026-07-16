const assert = require('assert');
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', '..', 'styles', 'wormholes.css');
const appPath = path.join(__dirname, '..', '..', 'scripts', 'wormholes-app.js');
const universesPath = path.join(__dirname, '..', '..', 'scripts', 'universes.js');
const css = fs.readFileSync(cssPath, 'utf8');
const appJs = fs.readFileSync(appPath, 'utf8');
const universesJs = fs.readFileSync(universesPath, 'utf8');
const appUiJs = `${appJs}
${universesJs}`;

assert(css.includes('body.home-mode main'), 'Home mode should have its own main sizing rule');
assert(css.includes('body:has(#homeScreen.active) main'), 'Initial active home screen should receive the home sizing rule before JS runs');
assert(/min-height:\s*min\(760px, calc\(100vh - 56px\)\)/.test(css), 'Home screen bounding box should be only slightly taller to fit the settings panel');
assert(!/min-height:\s*min\(960px, calc\(100vh - 24px\)\)/.test(css), 'Home screen should not use the oversized Beta 125 height');
assert(appUiJs.includes('document.body?.classList.add("home-mode")'), 'showHomeScreen should mark body as home-mode');
assert(appUiJs.includes('document.body?.classList.remove("home-mode")'), 'showAppScreen should remove home-mode');

console.log('home-settings-menu-css.unit.js passed');
