/* GENERATED from scripts/modules/undo.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 layered Undo manager.
   Shows an eight-second toast while retaining the same transaction briefly in the
   Activity Log. Delayed cleanup runs only after the longer Log window expires. */

(function () {
  const UNDO_DURATION_MS = 8000;
  const LOG_UNDO_DURATION_MS = 120000;
  let active = null;
  let suppressMutationNotice = 0;
  let progressFrame = 0;
  let expiryTimer = 0;

  function clone(value) {
    if (value === undefined) return undefined;
    if (globalThis.structuredClone) {
      try {
        return globalThis.structuredClone(value);
      } catch (error) {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function currentUniverseIds() {
    const ids = new Set();
    if (typeof universes !== "undefined" && Array.isArray(universes))
      universes.forEach((universe) => universe?.id && ids.add(universe.id));
    if (typeof currentUniverseId !== "undefined" && currentUniverseId) ids.add(currentUniverseId);
    return ids;
  }

  function captureState() {
    const universeList = clone(
      typeof universes !== "undefined" && Array.isArray(universes) ? universes : [],
    );
    const ids = new Set(universeList.map((universe) => universe?.id).filter(Boolean));
    if (typeof currentUniverseId !== "undefined" && currentUniverseId) ids.add(currentUniverseId);
    const universeData = {};

    ids.forEach((universeId) => {
      const isCurrent =
        typeof currentUniverseId !== "undefined" && universeId === currentUniverseId;
      universeData[universeId] = {
        archive: clone(
          isCurrent
            ? typeof archiveEntries !== "undefined"
              ? archiveEntries
              : []
            : typeof readArchiveForUniverse === "function"
              ? readArchiveForUniverse(universeId)
              : [],
        ),
        connectionNotes: clone(
          isCurrent
            ? typeof connectionNotes !== "undefined"
              ? connectionNotes
              : {}
            : typeof readConnectionNotesForUniverse === "function"
              ? readConnectionNotesForUniverse(universeId)
              : {},
        ),
        literature: clone(
          isCurrent
            ? typeof literatureEntries !== "undefined"
              ? literatureEntries
              : []
            : typeof readLiteratureForUniverse === "function"
              ? readLiteratureForUniverse(universeId)
              : [],
        ),
        vision: clone(
          isCurrent
            ? typeof visionEntries !== "undefined"
              ? visionEntries
              : []
            : typeof readVisionBoardForUniverse === "function"
              ? readVisionBoardForUniverse(universeId)
              : [],
        ),
      };
    });

    return {
      universes: universeList,
      currentUniverseId: typeof currentUniverseId !== "undefined" ? currentUniverseId || "" : "",
      bridgeNotes: clone(typeof bridgeNotes !== "undefined" ? bridgeNotes : {}),
      universeData,
    };
  }

  async function renderRestoredState() {
    try {
      if (typeof renderCurrent === "function") renderCurrent();
    } catch (error) {}
    try {
      if (typeof renderArchive === "function") renderArchive();
    } catch (error) {}
    try {
      if (typeof renderLiteratureList === "function") renderLiteratureList();
    } catch (error) {}
    try {
      if (typeof renderVisionBoard === "function") await renderVisionBoard();
    } catch (error) {}
    try {
      if (typeof renderUniverseArchiveList === "function") renderUniverseArchiveList();
    } catch (error) {}
    try {
      if (typeof renderWormholesUniverseList === "function") renderWormholesUniverseList();
    } catch (error) {}
    try {
      if (
        document.getElementById("connectionsScreen")?.classList.contains("active") &&
        typeof renderConnectionsMap === "function"
      )
        renderConnectionsMap();
    } catch (error) {}
    try {
      if (
        document.getElementById("wormholesModal")?.classList.contains("open") &&
        typeof renderWormholesMap === "function"
      )
        renderWormholesMap();
    } catch (error) {}
    try {
      if (typeof updateDestructiveClearButtons === "function") updateDestructiveClearButtons();
    } catch (error) {}
    try {
      if (typeof requestStorageFootnoteUpdate === "function") requestStorageFootnoteUpdate();
    } catch (error) {}
  }

  async function restoreState(state) {
    if (!state) return false;
    suppressMutationNotice += 1;
    try {
      const capturedIds = new Set(Object.keys(state.universeData || {}));
      const idsToRemove = currentUniverseIds();
      idsToRemove.forEach((universeId) => {
        if (capturedIds.has(universeId)) return;
        try {
          removeMigratedLocalStorageValue(
            archiveStorageKey(universeId),
            oldArchiveStorageKey(universeId),
          );
        } catch (error) {}
        try {
          removeMigratedLocalStorageValue(
            connectionNotesStorageKey(universeId),
            oldConnectionNotesStorageKey(universeId),
          );
        } catch (error) {}
        try {
          removeMigratedLocalStorageValue(
            literatureStorageKey(universeId),
            oldLiteratureStorageKey(universeId),
          );
        } catch (error) {}
        try {
          removeMigratedLocalStorageValue(
            visionStorageKey(universeId),
            oldVisionStorageKey(universeId),
          );
        } catch (error) {}
      });

      universes = clone(state.universes || []);
      bridgeNotes = clone(state.bridgeNotes || {});
      currentUniverseId =
        state.currentUniverseId &&
        universes.some((universe) => universe.id === state.currentUniverseId)
          ? state.currentUniverseId
          : universes[0]?.id || null;

      if (typeof saveUniversesToStorage === "function" && !saveUniversesToStorage())
        throw new Error("Could not restore universes.");
      if (typeof saveBridgeNotesToStorage === "function" && !saveBridgeNotesToStorage())
        throw new Error("Could not restore bridge notes.");

      for (const universe of universes) {
        const data = state.universeData?.[universe.id] || {};
        if (
          typeof saveArchiveForUniverse === "function" &&
          !saveArchiveForUniverse(universe.id, clone(data.archive || []))
        )
          throw new Error("Could not restore an Archive.");
        if (
          typeof saveConnectionNotesForUniverse === "function" &&
          !saveConnectionNotesForUniverse(universe.id, clone(data.connectionNotes || {}))
        )
          throw new Error("Could not restore connection details.");
        if (typeof writeLiteratureMetadataOnly === "function") {
          if (!writeLiteratureMetadataOnly(universe.id, clone(data.literature || [])))
            throw new Error("Could not restore document details.");
        } else if (typeof saveLocalStorageJson === "function") {
          if (
            !saveLocalStorageJson(literatureStorageKey(universe.id), clone(data.literature || []))
          )
            throw new Error("Could not restore document details.");
        }
        if (typeof writeVisionMetadataOnly === "function") {
          if (!writeVisionMetadataOnly(universe.id, clone(data.vision || [])))
            throw new Error("Could not restore Vision Board metadata.");
        } else if (typeof saveLocalStorageJson === "function") {
          if (!saveLocalStorageJson(visionStorageKey(universe.id), clone(data.vision || [])))
            throw new Error("Could not restore Vision Board metadata.");
        }
      }

      if (currentUniverseId) {
        if (typeof loadArchiveFromStorage === "function") loadArchiveFromStorage();
        if (typeof loadConnectionNotesFromStorage === "function") loadConnectionNotesFromStorage();
        if (typeof loadLiteratureFromStorage === "function") loadLiteratureFromStorage();
        if (typeof loadVisionBoardFromStorage === "function") loadVisionBoardFromStorage();
      } else {
        archiveEntries = [];
        connectionNotes = {};
        literatureEntries = [];
        visionEntries = [];
      }

      await renderRestoredState();
      return true;
    } finally {
      suppressMutationNotice = Math.max(0, suppressMutationNotice - 1);
    }
  }

  function toastElement() {
    return document.getElementById("savedToast");
  }

  function stopProgress() {
    if (progressFrame) cancelAnimationFrame(progressFrame);
    progressFrame = 0;
  }

  function clearExpiryTimer() {
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = 0;
  }

  function scheduleExpiry(transaction = active) {
    clearExpiryTimer();
    if (!transaction || !active || active.id !== transaction.id || transaction.paused) return;
    const remaining = Math.max(0, transaction.undoExpiresAt - Date.now());
    transaction.undoRemainingMs = remaining;
    if (remaining <= 0) {
      Promise.resolve().then(() => {
        if (active?.id === transaction.id) commitActive();
      });
      return;
    }
    expiryTimer = setTimeout(() => {
      expiryTimer = 0;
      if (active?.id === transaction.id) commitActive();
    }, remaining);
  }

  function hideToast(transaction = active) {
    const toast = toastElement();
    if (!toast) return;
    if (transaction && toast.dataset?.undoTransactionId !== transaction.id) return;
    toast.classList.remove("show", "undo-toast", "undo-toast-paused");
    globalThis.clearSavedToastPosition?.(toast);
    toast.style.removeProperty("--undo-progress");
    if (toast.dataset) delete toast.dataset.undoTransactionId;
    setTimeout(() => {
      if (!toast.classList.contains("show") && !toast.classList.contains("undo-toast"))
        toast.replaceChildren();
    }, 190);
  }

  function startProgress(transaction = active) {
    stopProgress();
    if (!transaction) return;
    const update = () => {
      if (!active || active.id !== transaction.id || transaction.toastExpired) return;
      const toast = toastElement();
      if (!toast || toast.dataset?.undoTransactionId !== transaction.id) return;
      if (!transaction.paused) {
        const remaining = Math.max(0, transaction.toastExpiresAt - Date.now());
        transaction.toastRemainingMs = remaining;
        toast.style.setProperty("--undo-progress", `${(remaining / UNDO_DURATION_MS) * 100}%`);
        if (remaining <= 0) {
          transaction.toastExpired = true;
          stopProgress();
          hideToast(transaction);
          if (document.getElementById("activityLogModal")?.classList.contains("open")) {
            window.WormholesActivityLog?.render?.();
          }
          return;
        }
      }
      progressFrame = requestAnimationFrame(update);
    };
    progressFrame = requestAnimationFrame(update);
  }

  function pause() {
    if (!active || active.paused) return;
    const now = Date.now();
    active.toastRemainingMs = Math.max(0, active.toastExpiresAt - now);
    active.undoRemainingMs = Math.max(0, active.undoExpiresAt - now);
    active.paused = true;
    clearExpiryTimer();
    const toast = toastElement();
    if (toast?.dataset?.undoTransactionId === active.id) toast.classList.add("undo-toast-paused");
  }

  function resume() {
    if (!active || !active.paused) return;
    const transaction = active;
    const now = Date.now();
    transaction.paused = false;
    transaction.undoExpiresAt = now + Math.max(250, transaction.undoRemainingMs || 0);
    if (!transaction.toastExpired) {
      transaction.toastExpiresAt = now + Math.max(250, transaction.toastRemainingMs || 0);
      startProgress(transaction);
    }
    const toast = toastElement();
    if (toast?.dataset?.undoTransactionId === transaction.id)
      toast.classList.remove("undo-toast-paused");
    scheduleExpiry(transaction);
  }

  async function commitTransaction(transaction) {
    if (!transaction || transaction.committed || transaction.undone) return;
    transaction.committed = true;
    try {
      await transaction.finalize?.();
    } catch (error) {
      console.error("Could not finish destructive-action cleanup", error);
      if (typeof reportAppError === "function")
        reportAppError("Could not finish destructive-action cleanup", error, {
          userMessage: "Some deleted local-folder data may need to be removed manually.",
        });
    }
  }

  async function commitActive(options = {}) {
    const transaction = active;
    if (!transaction) return false;
    active = null;
    stopProgress();
    clearExpiryTimer();
    hideToast(transaction);
    window.WormholesActivityLog?.markUndo?.(transaction.id, "expired");
    await commitTransaction(transaction);
    if (!options.silent && options.message && typeof showSavedToast === "function")
      showSavedToast(options.message);
    return true;
  }

  async function undoActive() {
    const transaction = active;
    if (!transaction || transaction.undone || transaction.committed) return false;
    transaction.undone = true;
    active = null;
    stopProgress();
    clearExpiryTimer();
    const toast = toastElement();
    if (toast?.dataset?.undoTransactionId === transaction.id) {
      toast.querySelector(".undo-toast-button")?.setAttribute("disabled", "");
    }
    try {
      const restored = transaction.undo
        ? await transaction.undo()
        : await restoreState(transaction.state);
      hideToast(transaction);
      if (!restored) throw new Error("The deleted data could not be restored.");
      window.WormholesActivityLog?.markUndo?.(transaction.id, "undone");
      window.WormholesActivityLog?.recordAction?.(`Undid: ${transaction.message}`);
      if (typeof showSavedToast === "function")
        showSavedToast(transaction.restoredMessage || "Action undone");
      return true;
    } catch (error) {
      console.error("Undo failed", error);
      hideToast(transaction);
      window.WormholesActivityLog?.markUndo?.(transaction.id, "failed");
      if (typeof reportAppError === "function")
        reportAppError("Undo failed", error, {
          userMessage: "Undo failed. A restore point may still be available in Settings.",
        });
      else if (typeof showSavedToast === "function") showSavedToast("Undo failed");
      return false;
    }
  }

  function renderUndoToast(transaction) {
    const toast = toastElement();
    if (!toast) return;
    try {
      if (typeof savedToastTimer !== "undefined" && savedToastTimer) clearTimeout(savedToastTimer);
    } catch (error) {}
    toast.replaceChildren();
    toast.classList.add("undo-toast");
    if (toast.dataset) toast.dataset.undoTransactionId = transaction.id;

    const message = document.createElement("span");
    message.className = "undo-toast-message";
    message.textContent = transaction.message;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "undo-toast-button";
    button.textContent = "Undo";
    button.setAttribute("aria-label", `Undo: ${transaction.message}`);
    button.addEventListener("click", undoActive);
    button.addEventListener("focus", pause);
    button.addEventListener("blur", resume);

    const progress = document.createElement("span");
    progress.className = "undo-toast-progress";
    progress.setAttribute("aria-hidden", "true");

    toast.append(message, button, progress);
    toast.addEventListener("mouseenter", pause, {once: false});
    toast.addEventListener("mouseleave", resume, {once: false});
    globalThis.positionSavedToast?.(toast);
    toast.classList.add("show");
    globalThis.queueSavedToastPosition?.(toast);
    toast.style.setProperty("--undo-progress", "100%");
  }

  async function offer(options = {}) {
    if (!options.message) return false;
    if (active) await commitActive({silent: true});
    const transaction = {
      id: String(options.id || `undo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
      message: String(options.message),
      restoredMessage: String(options.restoredMessage || "Action undone"),
      state: options.state || null,
      undo: typeof options.undo === "function" ? options.undo : null,
      finalize: typeof options.finalize === "function" ? options.finalize : null,
      detail: options.detail || null,
      toastRemainingMs: UNDO_DURATION_MS,
      undoRemainingMs: LOG_UNDO_DURATION_MS,
      toastExpiresAt: Date.now() + UNDO_DURATION_MS,
      undoExpiresAt: Date.now() + LOG_UNDO_DURATION_MS,
      toastExpired: false,
      paused: false,
      committed: false,
      undone: false,
    };
    active = transaction;
    window.WormholesActivityLog?.recordUndoOffer?.(transaction);
    renderUndoToast(transaction);
    startProgress(transaction);
    scheduleExpiry(transaction);
    return true;
  }

  function notePersistedMutation() {
    if (suppressMutationNotice || !active) return;
    commitActive({silent: true});
  }

  function hasActive() {
    return !!active;
  }

  function handleKeydown(event) {
    if (
      !active ||
      !(event.ctrlKey || event.metaKey) ||
      event.altKey ||
      String(event.key).toLowerCase() !== "z"
    )
      return;
    const target = event.target;
    if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || ""))
      return;
    event.preventDefault();
    undoActive();
  }

  window.addEventListener("keydown", handleKeydown, true);
  window.addEventListener("pagehide", () => {
    if (active) commitActive({silent: true});
  });

  window.WormholesUndo = {
    durationMs: UNDO_DURATION_MS,
    logDurationMs: LOG_UNDO_DURATION_MS,
    captureState,
    restoreState,
    offer,
    undoActive,
    commitActive,
    notePersistedMutation,
    hasActive,
    pause,
    resume,
    get activeTransaction() {
      return active;
    },
  };
})();
