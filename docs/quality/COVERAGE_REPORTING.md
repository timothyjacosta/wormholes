# Wormholes coverage reporting

Beta 258 adds diagnostic automated-test coverage reporting for the canonical application source.

## Scope

Coverage includes only:

- `scripts/modules/**/*.mjs` — canonical ES-module application source

Generated classic compatibility files in `scripts/*.js` are intentionally excluded. They are derived from the canonical modules and measuring both copies would duplicate the same code in the report.

## Command

From `tests/`:

```bash
npm run coverage
```

The command runs the complete non-browser unit suite with Node's built-in V8 coverage collection enabled, then writes:

- `tests/coverage/index.html` — browsable file-by-file report
- `tests/coverage/coverage-summary.json` — machine-readable summary
- a concise terminal summary, including the lowest-covered canonical modules

The raw V8 data is written temporarily to `tests/.coverage-v8/`. The standalone performance-timing benchmark remains part of `npm run test:unit`, but is intentionally excluded from the coverage run because instrumentation distorts timing measurements.

## Policy

Coverage is diagnostic. Beta 258 does **not** enforce a minimum percentage threshold and does not fail a build merely because a percentage is low. The report is intended to reveal testing blind spots and guide meaningful future tests rather than encourage tests written only to increase a number.

Line coverage is derived from V8 execution ranges across the canonical source. Function totals are reported for modules that the unit suite actually loads; modules that are never loaded are clearly identified in the report.

The coverage report folders are generated test artifacts and are not part of the runtime application.
