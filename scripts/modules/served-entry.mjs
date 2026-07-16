/* Wormholes Beta 256 served-build ES-module entry point.
   The served runtime executes entirely through native ES modules. Generated
   classic scripts are reserved for the downloadable direct-file build. */

import {installAppModel} from "./app-model.mjs";
import {installRenderCoordinator} from "./render-coordinator.mjs";
import {installCanonicalPersistence} from "./canonical-persistence.mjs";
import {installPersistenceRepositories} from "./persistence-repositories.mjs";
import {installLegacyDomainStateBindings} from "./app-state-domain.mjs";
import {installLegacyStorageStateBindings} from "./app-state-storage.mjs";
import {installLegacyUiStateBindings} from "./app-state-ui.mjs";
import {installLegacyMapStateBindings} from "./app-state-map.mjs";
import {installLegacyShellBindings} from "./shell-interface.mjs";
import {installLegacyControllerServiceBindings} from "./controller-service-registry.mjs";
import {
  servedRuntimeStepsBeforeAppCore,
  servedClassicScripts,
  servedNativeControllerModulesBeforeAppCore,
  servedRuntimeStepsAfterAppCore,
  servedNativeModules,
} from "./runtime-manifest.mjs";

const target = window;
target.__WORMHOLES_ESM_SERVED__ = true;

installAppModel(target);
installRenderCoordinator(target);
installCanonicalPersistence(target);
installPersistenceRepositories(target);
installLegacyDomainStateBindings(target);
installLegacyStorageStateBindings(target);
installLegacyUiStateBindings(target);
installLegacyMapStateBindings(target);
installLegacyShellBindings(target);
installLegacyControllerServiceBindings(target);

async function runNativeStep(step) {
  if (step?.kind !== "module")
    throw new Error(`Served runtime requires a native module step: ${step?.src || "unknown"}`);
  return import(step.src);
}

try {
  for (const step of servedRuntimeStepsBeforeAppCore) {
    await runNativeStep(step);
  }
  await import("./app-core.mjs");
  for (const step of servedRuntimeStepsAfterAppCore) {
    await runNativeStep(step);
  }
  target.WormholesServedRuntime = Object.freeze({
    mode: "esm-entry",
    nativeBoundaries: Object.freeze([
      "model",
      "persistence",
      "canonical-persistence",
      "rendering",
      "domain-state",
      "storage-state",
      "ui-state",
      "map-state",
      "shell-interface",
      "controller-services",
      "tagging-helpers",
      "map-presentation-helpers",
      "document-zip-helpers",
      "feature-controllers",
      "foundation-utilities",
      "dialog-and-focus-infrastructure",
      "observability-and-history",
      "persistence-and-recovery",
      "search-and-action",
      "startup-and-bootstrap",
      "app-workflow-orchestration",
      "map-inspector-orchestration",
      "app-core",
    ]),
    nativeControllerCount: servedNativeControllerModulesBeforeAppCore.length,
    nativeRuntimeModuleCount: servedNativeModules.length + 1,
    transitionalAdapterCount: servedClassicScripts.length,
  });
  target.dispatchEvent(
    new CustomEvent("wormholes:served-runtime-ready", {detail: target.WormholesServedRuntime}),
  );
} catch (error) {
  console.error("[Wormholes] Served runtime startup failed", error);
  document.documentElement.dataset.wormholesStartupFailed = "true";
  throw error;
}
