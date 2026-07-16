/* Wormholes Beta 248 startup coordinator.
   Keeps recovery ordering and startup failure behavior in one testable module. */
import "./single-tab.mjs";
import "./write-ahead-journal.mjs";
import "./storage-recovery.mjs";
import "./manual-drafts.mjs";
import "./render-validation.mjs";
import "./indexeddb-recovery.mjs";

(function () {
  async function initializeWormholesApp() {
    loadLocalFolderEnabled();
    if (window.WormholesWriteAheadJournal?.recoverPendingOperations) {
      await window.WormholesWriteAheadJournal.recoverPendingOperations();
    }
    if (window.WormholesStorageRecovery?.recoverCorruptedLocalStorageRecords) {
      await window.WormholesStorageRecovery.recoverCorruptedLocalStorageRecords();
    }
    loadUniversesFromStorage();
    window.WormholesManualDrafts?.prune?.(
      (universes || []).map((universe) => universe?.id).filter(Boolean),
    );
    loadBridgeNotesFromStorage();
    runAppSchemaMigrations();
    if (typeof universes !== "undefined") {
      universes =
        window.WormholesRenderValidation?.validateUniverses?.(universes, {
          storageKey: typeof UNIVERSES_KEY !== "undefined" ? UNIVERSES_KEY : "wormholesUniverses",
          releaseProtection: true,
        })?.value || universes;
    }
    if (typeof bridgeNotes !== "undefined") {
      bridgeNotes =
        window.WormholesRenderValidation?.validateBridgeNotes?.(bridgeNotes, {
          storageKey:
            typeof WORMHOLE_BRIDGE_NOTES_KEY !== "undefined"
              ? WORMHOLE_BRIDGE_NOTES_KEY
              : "wormholesBridgeNotes",
          releaseProtection: true,
        })?.value || bridgeNotes;
    }
    if (
      typeof currentUniverseId !== "undefined" &&
      currentUniverseId &&
      typeof universes !== "undefined" &&
      !universes.some((universe) => universe.id === currentUniverseId)
    )
      currentUniverseId = null;
    if (window.WormholesIndexedDbRecovery?.recoverMissingOrPartialIndexedDbRecords) {
      await window.WormholesIndexedDbRecovery.recoverMissingOrPartialIndexedDbRecords();
    }
    repairFolderCollisionTitles();
    autoSyncLocalFolderOnStartup();
    installUiProtectionGuards();
    installPrimarySafeControls();
    disableNativeDownloadBehaviors();
    protectAllControls();
    populateManualSelects();
    populateEditSelects();
    updateManualButtons();
    loadSkipRollAnimation();
    installSkipRollLayoutWatcher();
    renderCurrent();
    renderArchive();
    showHomeScreen();
    requestStorageFootnoteUpdate();
    const journalRecoveryNotice = window.WormholesWriteAheadJournal?.consumeRecoveryNotice?.();
    if (journalRecoveryNotice && typeof showSavedToast === "function")
      showSavedToast(journalRecoveryNotice);
  }

  function reportStartupFailure(error) {
    if (typeof reportAppError === "function") {
      reportAppError("Wormholes startup failed", error, {
        code: "WORMHOLES_LOAD_FAILED",
        userMessage: "Some saved data couldn’t load. Reload the app.",
      });
    }
  }

  function startWormholesApp() {
    const guardReady = window.WormholesSingleTab?.ready;
    if (!guardReady) {
      initializeWormholesApp().catch(reportStartupFailure);
      return;
    }

    guardReady
      .then((activeTab) => {
        if (activeTab) return initializeWormholesApp();
        return undefined;
      })
      .catch((error) => {
        if (typeof reportAppError === "function") {
          reportAppError("Single-tab startup check failed", error, {
            userMessage: "Wormholes could not verify that this is the active tab.",
          });
        }
      });
  }

  window.WormholesStartup = Object.freeze({
    initializeWormholesApp,
    reportStartupFailure,
    startWormholesApp,
  });
})();

/* ES-module source marker; runtime API remains the existing window namespace. */
export {};
