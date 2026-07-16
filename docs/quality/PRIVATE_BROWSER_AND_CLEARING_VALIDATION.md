# Private browser and browser clearing validation

Wormholes keeps a permanent automated storage-isolation gate for two related release risks: private/incognito-style browsing contexts and browser site-data clearing.

The dedicated Playwright suite is `tests/e2e/private-browser-and-clearing.spec.js`. It verifies that:

- a separate non-persistent browser context cannot see data created in another context;
- data created in a private-style context disappears when that context is closed and a new private-style context is opened;
- clearing local storage, session storage, IndexedDB, and Cache Storage returns Wormholes to a clean, usable state;
- clearing local storage while IndexedDB remains does not resurrect orphaned Wormholes content;
- clearing IndexedDB while local metadata remains lets Wormholes recover portable Literature content without crashing or losing the saved universe.

The full-clear scenario closes the application page before deleting IndexedDB databases, then performs the clear from a blank same-origin fixture. That models browser site-data removal without leaving live application database connections that could block deletion.

Run the dedicated gate from `tests/` with:

```bash
npm run test:private-browser-storage
```

The CI gate is:

```bash
npm run ci:private-browser-storage
```

`.github/workflows/private-browser-storage.yml` runs the gate on pushes, pull requests, and manual workflow runs, installs the locked Chromium version, and preserves the Playwright report after success or failure.

Playwright browser contexts are the repeatable automation proxy for private/incognito isolation. They do not reproduce the branded Chrome Incognito, Firefox Private Browsing, or Safari Private Browsing user interface. A final manual browser sanity check can still be useful, but the storage isolation and clearing behavior is permanently regression-tested here.
