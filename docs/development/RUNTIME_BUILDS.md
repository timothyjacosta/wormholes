# Wormholes runtime builds

Wormholes Beta 263 ships two HTML entry points from the same canonical ES-module source tree.

## Direct-download build

`Wormholes_Beta_263.html`

Use this file when Wormholes is downloaded and opened directly from a computer. It loads generated classic compatibility adapters in a fixed order so the app continues to work under `file://` browser restrictions.

Every runtime `.js` file in `scripts/` is generated from a canonical `.mjs` source. The classic files are compatibility output, not separately maintained source.

## Served build

`Wormholes_Beta_263.served.html`

Use this file when Wormholes is hosted by a web server. It contains one module script:

`scripts/modules/served-entry.mjs`

The served entry point installs the native model, persistence, rendering, state, shell, and controller-service boundaries, then executes the complete application runtime through native ES-module imports in deterministic order. `app-core.mjs`, all 12 feature controllers, search/action orchestration, startup coordinator, bootstrap, and all shared infrastructure run natively.

**The served runtime has zero transitional classic adapters.** The served entry contains no classic-script loader or script-injection fallback.

The generated classic counterparts remain only for the direct-download build so Wormholes continues to operate when opened from `file://`.

## Build checks

```sh
node tools/build-shared-modules.mjs --check
node tools/build-runtime.mjs --check
```

Both checks must pass before release packaging.
