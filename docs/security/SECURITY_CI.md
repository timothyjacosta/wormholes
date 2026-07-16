# Security CI

`Security CI` is the required security check for every Wormholes change.

The stable GitHub check name is:

```text
Security CI / Required security
```

It installs the locked dependencies and Chromium, then runs six separate required steps:

1. **Served Content Security Policy** — verifies the served shell and its trust-boundary policy.
2. **XSS protections** — runs the payload corpus and full-app browser scenarios.
3. **Malicious input paths** — verifies every declared route by which user-controlled text can enter the app.
4. **Rich-text sanitization** — tests safe rendering, imported Literature cleanup, and the sanitizer in a browser.
5. **URL hardening** — rejects unsafe links while preserving valid `http://` and `https://` links with isolated external-link attributes.
6. **Import validation** — rejects malformed or unsafe app-data imports before they are applied.

The workflow runs for pushes, pull requests, merge queues, manual runs, and reusable workflow calls. Every step is mandatory, and none uses `continue-on-error`.

The release workflow depends on this reusable workflow before packaging. It also runs `npm run ci:security` against the exact extracted release artifact, so the source and the distributed ZIP must pass the same security checks.
