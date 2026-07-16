'use strict';

const marker = 'window.__wormholesXssExecutions=(window.__wormholesXssExecutions||0)+1';

const htmlPayloads = Object.freeze([
  `<script>${marker}</script>`,
  `<img src=x onerror="${marker}">`,
  `<svg onload="${marker}"><circle></circle></svg>`,
  `<math><mtext><img src=x onerror="${marker}"></mtext></math>`,
  `<iframe srcdoc="<script>${marker}<\/script>"></iframe>`,
  `</textarea><script>${marker}</script>`,
  `<details open ontoggle="${marker}">toggle</details>`,
  `<input autofocus onfocus="${marker}">`,
  `<video><source onerror="${marker}"></video>`,
  `<object data="javascript:${marker}"></object>`,
  `<a href="javascript:${marker}">open</a>`,
  `<form action="javascript:${marker}"><button>go</button></form>`,
  `<style>@import 'javascript:${marker}';</style>`,
  `<div style="background-image:url(javascript:${marker})">styled</div>`,
  `<!--><img src=x onerror='${marker}'>`,
  `<ScRiPt>${marker}</ScRiPt>`,
  `<img/src=x/onerror=${marker}>`,
  `<body onpageshow="${marker}">body</body>`,
  `<marquee onstart="${marker}">move</marquee>`,
  `"><img src=x onerror="${marker}">`,
  `' autofocus onfocus='${marker}' x='`,
  `&lt;img src=x onerror=&quot;${marker}&quot;&gt;`,
  `{{constructor.constructor('${marker}')()}}`,
  `${String.fromCharCode(0)}<script>${marker}</script>`,
  `<a id="__proto__" name="constructor">clobber</a>`
]);

const dangerousUrls = Object.freeze([
  `javascript:${marker}`,
  `JaVaScRiPt:${marker}`,
  ` javaScript:${marker}`,
  `java\nscript:${marker}`,
  `java\tscript:${marker}`,
  `vbscript:${marker}`,
  `data:text/html,<script>${marker}</script>`,
  `data:text/html;base64,PHNjcmlwdD53aW5kb3cuX193b3JtaG9sZXNYc3NFeGVjdXRpb25zKys8L3NjcmlwdD4=`,
  `data:image/svg+xml,<svg onload="${marker}"></svg>`,
  `data:text/javascript,${marker}`,
  `file:///tmp/wormholes-xss.html`,
  `//evil.example/path`,
  `https:\\evil.example/path`,
  `https://user:password@example.com/private`,
  `mailto:test@example.com`,
  `https://example.com/\u202Ehidden`
]);

const dangerousAttributes = Object.freeze([
  'onclick', 'onerror', 'onload', 'onfocus', 'onpointerenter', 'style', 'srcdoc'
]);

const dangerousElements = Object.freeze([
  'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'svg', 'math'
]);

module.exports = {
  marker,
  htmlPayloads,
  dangerousUrls,
  dangerousAttributes,
  dangerousElements
};
