# Cross-browser validation

The dedicated matrix is defined in `tests/playwright.cross-browser.config.js` and runs `tests/e2e/cross-browser.spec.js` in:

- Chromium desktop
- Firefox desktop
- WebKit desktop, as the browser-engine proxy for desktop Safari

The cross-browser smoke suite covers startup, universe creation, Quick Roll archiving and persistence after reload, Global Search navigation, Literature and Vision Board uploads, creation-to-creation connections, Connections map rendering, and the map text alternative.

Run it locally from `tests/` with:

```bash
npm run test:cross-browser
```

The immutable release workflow also runs the Literature and Vision Board upload scenario against the exact extracted release artifact in all three desktop browser projects. A final browser failure blocks publication.
