const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {latestDirectHtmlName, latestDirectHtmlPath} = require("../support/release-path");

const root = path.resolve(__dirname, "..", "..");
const htmlPath = latestDirectHtmlPath(root);
const html = fs.readFileSync(htmlPath, "utf8");
const headers = fs.readFileSync(path.join(root, "_headers"), "utf8");
const securityNotes = fs.readFileSync(path.join(root, "docs", "security", "SECURITY_HEADERS.md"), "utf8");

function directiveMap(policy) {
  const map = new Map();
  String(policy || "")
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [name, ...sources] = part.split(/\s+/);
      map.set(name, sources);
    });
  return map;
}

const metaMatch = html.match(
  /<meta\s+content="([^"]+)"\s+http-equiv="Content-Security-Policy"\s*\/>/i,
);
assert.ok(metaMatch, "The HTML build should enforce a baseline Content Security Policy");
const metaPolicy = directiveMap(metaMatch[1]);

assert.deepStrictEqual(
  metaPolicy.get("default-src"),
  ["'none'"],
  "Unlisted resource types should be denied",
);
assert.deepStrictEqual(
  metaPolicy.get("script-src"),
  ["'self'"],
  "Scripts should load only from the build",
);
assert.deepStrictEqual(
  metaPolicy.get("script-src-attr"),
  ["'none'"],
  "Inline event-handler scripts should be blocked",
);
assert.ok(
  !metaMatch[1].includes("'unsafe-eval'"),
  "The policy must not permit eval-like code execution",
);
assert.ok(
  !/script-src[^;]*'unsafe-inline'/.test(metaMatch[1]),
  "The policy must not permit inline scripts",
);
assert.deepStrictEqual(
  metaPolicy.get("style-src-elem"),
  ["'self'"],
  "Stylesheet elements should load only from the build",
);
assert.deepStrictEqual(
  metaPolicy.get("style-src-attr"),
  ["'unsafe-inline'"],
  "Dynamic map/dialog geometry needs style attributes",
);
assert.deepStrictEqual(
  metaPolicy.get("img-src"),
  ["'self'", "data:", "blob:"],
  "Images should be limited to local, embedded, or temporary blob data",
);
assert.deepStrictEqual(
  metaPolicy.get("connect-src"),
  ["blob:"],
  "Network access should be denied except local blob reads",
);
for (const directive of [
  "base-uri",
  "object-src",
  "frame-src",
  "child-src",
  "worker-src",
  "font-src",
  "media-src",
  "manifest-src",
  "form-action",
]) {
  assert.deepStrictEqual(metaPolicy.get(directive), ["'none'"], `${directive} should be denied`);
}

assert.ok(!/\son[a-z]+\s*=/i.test(html), "Static HTML should not contain inline event handlers");
assert.ok(
  !/<script(?![^>]*\bsrc=)[^>]*>/i.test(html),
  "Static HTML should not contain inline script blocks",
);
assert.ok(!/\sstyle\s*=/i.test(html), "Static HTML should not contain inline style attributes");

const scriptSources = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/gi)].map(
  (match) => match[1],
);
assert.ok(scriptSources.length > 0, "The app should declare external script files");
assert.ok(
  scriptSources.every((src) => /^scripts\/[a-z0-9._-]+\.js$/i.test(src)),
  "All app scripts should be local relative files",
);
const stylesheetTags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
const stylesheetSources = stylesheetTags
  .filter((tag) => /\brel="stylesheet"/i.test(tag))
  .map((tag) => (tag.match(/\bhref="([^"]+)"/i) || [])[1])
  .filter(Boolean);
assert.ok(
  stylesheetSources.includes("styles/wormholes.css"),
  "The app should include the canonical local stylesheet",
);
assert.ok(
  stylesheetSources.every((source) => /^styles\/[a-z0-9._-]+\.css$/i.test(source)),
  "All app stylesheets should be local relative files",
);

const headerMatch = headers.match(/Content-Security-Policy:\s*([^\n]+)/i);
assert.ok(headerMatch, "The served-build header file should include Content-Security-Policy");
const headerPolicy = directiveMap(headerMatch[1]);
assert.deepStrictEqual(
  headerPolicy.get("frame-ancestors"),
  ["'none'"],
  "Served builds should not be embedded by another page",
);
for (const [name, sources] of metaPolicy.entries()) {
  assert.deepStrictEqual(
    headerPolicy.get(name),
    sources,
    `Header and HTML policies should match for ${name}`,
  );
}
assert.match(headers, /X-Content-Type-Options:\s*nosniff/i);
assert.match(headers, /Referrer-Policy:\s*no-referrer/i);
assert.match(securityNotes, /frame-ancestors 'none'/);

console.log("Content Security Policy unit tests passed.");
