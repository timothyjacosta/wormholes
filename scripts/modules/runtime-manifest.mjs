/* Wormholes Beta 256 served-runtime manifest.
   The served build preserves deterministic runtime order using native ES-module
   imports only. Classic scripts remain generated outputs for the direct-file build. */

const moduleStep = (src) => Object.freeze({kind: "module", src});

export const servedRuntimeStepsBeforeAppCore = Object.freeze([
  moduleStep("./single-tab.mjs"),
  moduleStep("./app-errors.mjs"),
  moduleStep("./schema-versions.mjs"),
  moduleStep("./safe-render.mjs"),
  moduleStep("./url-safety.mjs"),
  moduleStep("./large-data-store.mjs"),
  moduleStep("./activity-log.mjs"),
  moduleStep("./error-reporting.mjs"),
  moduleStep("./generation-versioning.mjs"),
  moduleStep("./recent-roll-history.mjs"),
  moduleStep("./canonical-persistence.mjs"),
  moduleStep("./persisted-schema.mjs"),
  moduleStep("./storage-facade.mjs"),
  moduleStep("./transactional-persistence.mjs"),
  moduleStep("./storage-capacity.mjs"),
  moduleStep("./file-limits.mjs"),
  moduleStep("./media-limits.mjs"),
  moduleStep("./content-limits.mjs"),
  moduleStep("./entity-limits.mjs"),
  moduleStep("./duplicate-creations.mjs"),
  moduleStep("./id-integrity.mjs"),
  moduleStep("./reference-integrity.mjs"),
  moduleStep("./render-validation.mjs"),
  moduleStep("./tagging-helpers.mjs"),
  moduleStep("./map-presentation-helpers.mjs"),
  moduleStep("./folder-storage-controller.mjs"),
  moduleStep("./backup-status.mjs"),
  moduleStep("./pagination.mjs"),
  moduleStep("./density.mjs"),
  moduleStep("./document-zip-helpers.mjs"),
  moduleStep("./archive-controller.mjs"),
  moduleStep("./literature-controller.mjs"),
  moduleStep("./vision-board-controller.mjs"),
  moduleStep("./connections-controller.mjs"),
  moduleStep("./bridges-controller.mjs"),
  moduleStep("./universe-controller.mjs"),
  moduleStep("./map-clustering.mjs"),
  moduleStep("./map-dom-budget.mjs"),
  moduleStep("./map-lazy-render.mjs"),
  moduleStep("./onboarding.mjs"),
  moduleStep("./connections-map-controller.mjs"),
  moduleStep("./bridges-map-controller.mjs"),
  moduleStep("./settings-controller.mjs"),
  moduleStep("./support-bundle.mjs"),
  moduleStep("./data-portability-controller.mjs"),
  moduleStep("./recovery-snapshots.mjs"),
  moduleStep("./storage-dashboard.mjs"),
  moduleStep("./write-ahead-journal.mjs"),
  moduleStep("./manual-drafts.mjs"),
  moduleStep("./storage-recovery.mjs"),
  moduleStep("./indexeddb-recovery.mjs"),
  moduleStep("./theme-decks.mjs"),
  moduleStep("./generation-controller.mjs"),
  moduleStep("./app-workflow-orchestration.mjs"),
  moduleStep("./map-inspector-orchestration.mjs"),
]);

export const servedClassicScriptsBeforeAppCore = Object.freeze([]);

export const servedNativeControllerModulesBeforeAppCore = Object.freeze(
  servedRuntimeStepsBeforeAppCore
    .filter((step) => step.kind === "module" && step.src.endsWith("-controller.mjs"))
    .map((step) => step.src),
);

export const servedRuntimeStepsAfterAppCore = Object.freeze([
  moduleStep("./copy-to-universe.mjs"),
  moduleStep("./search-index.mjs"),
  moduleStep("./global-search.mjs"),
  moduleStep("./map-search.mjs"),
  moduleStep("./undo.mjs"),
  moduleStep("./escape-policy.mjs"),
  moduleStep("./dialogs.mjs"),
  moduleStep("./dialog-keyboard.mjs"),
  moduleStep("./focus.mjs"),
  moduleStep("./startup-coordinator.mjs"),
  moduleStep("./bootstrap.mjs"),
  moduleStep("./accessibility.mjs"),
]);

export const servedClassicScriptsAfterAppCore = Object.freeze([]);

export const servedNativeModules = Object.freeze(
  [...servedRuntimeStepsBeforeAppCore, ...servedRuntimeStepsAfterAppCore]
    .filter((step) => step.kind === "module")
    .map((step) => step.src),
);

export const servedClassicScripts = Object.freeze([
  ...servedClassicScriptsBeforeAppCore,
  ...servedClassicScriptsAfterAppCore,
]);
