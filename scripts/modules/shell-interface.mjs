/* Wormholes Beta 301 shell-level interface orchestration.
   Top-level tab switching, Generate-tab rendering/button state, notifications,
   and app-error routing live behind one exported shell surface. */

import {
  PARTIAL_FOLDER_SAVE_MESSAGE,
  readToastRuntimeState,
  writeToastRuntimeState,
  readStorageWarningState,
  clearRecentStorageFailure,
  clearRecentFolderSaveWarning,
} from "./app-state-storage.mjs";
import importedAppErrorsApi from "./app-errors.mjs";

function runtime() {
  return globalThis;
}

export function displayValue(item) {
  if (!item?.val) return "—";
  const escape = runtime().WormholesSafeRender?.escapeHtml || runtime().escapeHtml;
  return typeof escape === "function" ? escape(item.val) : String(item.val);
}

export function hasCurrentCreation() {
  return runtime().WormholesGenerationRuntime?.snapshot?.().hasCreation === true;
}

export function switchTab(tabName, options = {}) {
  const api = runtime();
  if (
    !options.skipLiteratureEditorClose &&
    typeof api.literatureEditorIsOpen === "function" &&
    api.literatureEditorIsOpen()
  ) {
    api.closeLiteratureEditor?.({destinationTab: tabName});
    return;
  }

  const currentTab = document.getElementById("currentTab");
  const createTab = document.getElementById("createTab");
  const archiveTab = document.getElementById("archiveTab");
  const literatureTab = document.getElementById("literatureTab");
  const visionTab = document.getElementById("visionTab");
  const currentBtn = document.getElementById("currentTabBtn");
  const createBtn = document.getElementById("createTabBtn");
  const archiveBtn = document.getElementById("archiveTabBtn");
  const literatureBtn = document.getElementById("literatureTabBtn");
  const visionBtn = document.getElementById("visionTabBtn");

  [currentTab, createTab, archiveTab, literatureTab, visionTab].forEach((element) =>
    element?.classList.remove("active"),
  );
  [currentBtn, createBtn, archiveBtn, literatureBtn, visionBtn].forEach((element) =>
    element?.classList.remove("active"),
  );

  if (tabName === "archive") {
    window.WormholesDensity?.reset?.("archive");
    archiveTab?.classList.add("active");
    archiveBtn?.classList.add("active");
    api.showArchiveListScreen?.();
  } else if (tabName === "literature") {
    window.WormholesDensity?.reset?.("literature");
    literatureTab?.classList.add("active");
    literatureBtn?.classList.add("active");
    api.showLiteratureListScreen?.();
    api.updateLocalFolderCheckboxes?.();
  } else if (tabName === "vision") {
    window.WormholesDensity?.reset?.("vision");
    visionTab?.classList.add("active");
    visionBtn?.classList.add("active");
    api.renderVisionBoard?.();
    api.updateLocalFolderCheckboxes?.();
  } else if (tabName === "create") {
    createTab?.classList.add("active");
    createBtn?.classList.add("active");
  } else {
    currentTab?.classList.add("active");
    currentBtn?.classList.add("active");
  }
}

export function statusMessage() {
  const snapshot = runtime().WormholesGenerationRuntime?.snapshot?.() || {
    hasCreation: false,
    complete: false,
  };
  if (snapshot.complete)
    return "Creation complete. Lock fields to keep them during Quick Roll, or archive it.";
  if (snapshot.hasCreation) return "Keep rolling, or use Quick Roll to fill the remaining fields.";
  return "Roll to create.";
}

function lockIconMarkup(locked) {
  return locked
    ? `<svg aria-hidden="true" class="generation-lock-icon" viewBox="0 0 16 16"><path d="M4.5 7V5.5a3.5 3.5 0 0 1 7 0V7"/><rect x="3" y="7" width="10" height="7" rx="1.7"/></svg>`
    : `<svg aria-hidden="true" class="generation-lock-icon" viewBox="0 0 16 16"><path d="M5 7V5.5a3.5 3.5 0 0 1 6.4-2"/><rect x="3" y="7" width="10" height="7" rx="1.7"/></svg>`;
}

function generationFieldActionsMarkup(field, label, value, locked, isRolling) {
  if (!value) return "";
  const rerollDisabled = locked || isRolling;
  const lockAction = locked ? "Unlock" : "Lock";
  return `
    <span class="generation-field-actions">
      <button
        aria-label="Reroll ${label}"
        class="generation-field-button generation-reroll-button"
        data-generation-action="reroll"
        data-generation-field="${field}"
        title="Reroll ${label}"
        type="button"
        ${rerollDisabled ? "disabled" : ""}
      ><span aria-hidden="true" class="generation-reroll-icon">↻</span></button>
      <button
        aria-label="${lockAction} ${label}"
        aria-pressed="${locked ? "true" : "false"}"
        class="generation-field-button generation-lock-button${locked ? " is-locked" : ""}"
        data-generation-action="lock"
        data-generation-field="${field}"
        title="${lockAction} ${label}"
        type="button"
        ${isRolling ? "disabled" : ""}
      >${lockIconMarkup(locked)}</button>
    </span>
  `;
}

function generationResultRowMarkup(field, visibleLabel, actionLabel, value, locks, isRolling) {
  return `
    <p class="generation-result-row">
      <span class="generation-result-copy"><span class="roll">${visibleLabel}:</span> ${displayValue(value)}</span>
      ${generationFieldActionsMarkup(field, actionLabel, value, locks?.[field] === true, isRolling)}
    </p>
  `;
}

export function renderCurrent() {
  const result = document.getElementById("result");
  if (!result) return;
  const snapshot = runtime().WormholesGenerationRuntime?.snapshot?.() || {
    current: {},
    hasCreation: false,
  };
  const current = snapshot.current || {};
  const locks = snapshot.locks || {};
  const isRolling = snapshot.isRolling === true;

  if (!snapshot.hasCreation) {
    result.classList.add("blank-state");
    result.innerHTML = `<p class="blank-prompt">Roll to create.</p>`;
    updateButtons();
    return;
  }

  result.classList.remove("blank-state");
  result.innerHTML = `
    ${generationResultRowMarkup("what", "What", "What", current.what, locks, isRolling)}
    ${generationResultRowMarkup("attr1", "Attribute", "Attribute 1", current.attr1, locks, isRolling)}
    ${generationResultRowMarkup("attr2", "Attribute", "Attribute 2", current.attr2, locks, isRolling)}
    ${generationResultRowMarkup("pressure", "Story", "Story", current.pressure, locks, isRolling)}
    <p class="note">${statusMessage()}</p>
  `;
  updateButtons();
}

export function updateButtons() {
  const snapshot = runtime().WormholesGenerationRuntime?.snapshot?.() || {
    current: {},
    isRolling: false,
    hasCreation: false,
    complete: false,
  };
  const current = snapshot.current || {};
  const isRolling = snapshot.isRolling === true;
  const setDisabled =
    runtime().setAppButtonDisabled ||
    ((element, disabled) => {
      if (element) element.disabled = !!disabled;
    });
  const whatBtn = document.getElementById("whatBtn");
  const attrBtn = document.getElementById("attrBtn");
  const storyBtn = document.getElementById("storyBtn");
  const quickFullRollBtn = document.getElementById("quickFullRollBtn");
  const archiveBtn = document.getElementById("archiveBtn");
  const newBtn = document.getElementById("newBtn");

  const availability = snapshot.availability || {what: true, attribute: true, story: true};
  setDisabled(whatBtn, !!current.what || isRolling || !availability.what);
  setDisabled(attrBtn, !!(current.attr1 && current.attr2) || isRolling || !availability.attribute);
  setDisabled(storyBtn, !!current.pressure || isRolling || !availability.story);
  setDisabled(quickFullRollBtn, !snapshot.canQuickRoll || isRolling);
  setDisabled(archiveBtn, !snapshot.hasCreation || isRolling);
  setDisabled(newBtn, isRolling);

  document.querySelectorAll(".generation-field-button").forEach((button) => {
    const field = button.dataset.generationField;
    const locked = snapshot.locks?.[field] === true;
    const isReroll = button.dataset.generationAction === "reroll";
    setDisabled(button, isRolling || (isReroll && locked));
  });

  if (archiveBtn)
    archiveBtn.textContent =
      snapshot.hasCreation && !snapshot.complete ? "Archive Partial Creation" : "Archive Creation";
  if (attrBtn) attrBtn.textContent = "Attributes";
  if (quickFullRollBtn) {
    quickFullRollBtn.title = snapshot.complete
      ? "Reroll every unlocked field."
      : "Fill every remaining field.";
  }

  const attrRollNote = document.getElementById("attrRollNote");
  if (attrRollNote) {
    const remaining = 2 - (current.attr1 ? 1 : 0) - (current.attr2 ? 1 : 0);
    if (remaining === 2) {
      attrRollNote.textContent = "2 rolls remain";
      attrRollNote.classList.remove("empty");
    } else if (remaining === 1) {
      attrRollNote.textContent = "1 roll remains";
      attrRollNote.classList.remove("empty");
    } else {
      attrRollNote.textContent = "";
      attrRollNote.classList.add("empty");
    }
  }

  runtime().syncAllAppButtonStates?.();
}

export function clearSavedToastPosition() {}

export function positionSavedToast() {
  return 0;
}

export function queueSavedToastPosition() {}

export function normalizeToastMessageForDedupe(message = "") {
  return String(message || "")
    .trim()
    .replace(/[.!]+$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function showSavedToast(message = "Saved", options = {}) {
  if (window.WormholesUndo?.hasActive?.()) window.WormholesUndo.commitActive({silent: true});
  const toast = document.getElementById("savedToast");
  if (!toast) return;

  const warnings = readStorageWarningState();
  if (message === "Saved" && runtime().recentStorageFailureStillMatters?.()) {
    message =
      warnings.recentStorageFailureMessage || "Save failed. Download Backup before leaving.";
    clearRecentStorageFailure();
  } else if (message === "Saved" && runtime().recentFolderSaveWarningStillMatters?.()) {
    message = warnings.recentFolderSaveWarningMessage || PARTIAL_FOLDER_SAVE_MESSAGE;
    clearRecentFolderSaveWarning();
  }

  const text = String(message || "Saved").trim() || "Saved";
  const dedupeKey = normalizeToastMessageForDedupe(text);
  const now = Date.now();
  const toastState = readToastRuntimeState();
  if (
    dedupeKey &&
    dedupeKey === toastState.savedToastLastMessage &&
    now - toastState.savedToastLastAt < 900
  )
    return;
  writeToastRuntimeState({savedToastLastMessage: dedupeKey, savedToastLastAt: now});

  const logItem = options.skipLog
    ? null
    : window.WormholesActivityLog?.recordToast?.(text, options);
  const moreInfo = options.moreInfo || options.detail || null;
  toast.classList.remove("undo-toast", "undo-toast-paused", "action-toast");
  toast.replaceChildren();

  if (moreInfo) {
    toast.classList.add("action-toast");
    const messageElement = document.createElement("span");
    messageElement.className = "saved-toast-message";
    messageElement.textContent = text;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "saved-toast-more-button";
    button.textContent = options.moreInfoLabel || "More information";
    button.addEventListener("click", (event) => {
      const currentState = readToastRuntimeState();
      clearTimeout(currentState.savedToastTimer);
      toast.classList.remove("show");
      clearSavedToastPosition(toast);
      window.WormholesActivityLog?.openDetails?.(logItem?.detail || moreInfo, event.currentTarget);
      setTimeout(() => {
        toast.classList.remove("action-toast");
        toast.replaceChildren();
      }, 0);
    });
    toast.append(messageElement, button);
  } else {
    toast.textContent = text;
  }

  toast.classList.add("show");
  clearTimeout(readToastRuntimeState().savedToastTimer);
  const defaultDuration = text === "Saved" ? 1400 : 2600;
  const duration = Math.max(1200, Number(options.durationMs || defaultDuration));
  const timer = setTimeout(() => {
    toast.classList.remove("show", "action-toast");
    clearSavedToastPosition(toast);
    toast.replaceChildren();
    writeToastRuntimeState({savedToastTimer: null});
  }, duration);
  writeToastRuntimeState({savedToastTimer: timer});
}

export function reportAppError(context, error, options = {}) {
  const appErrors =
    typeof importedAppErrorsApi !== "undefined" ? importedAppErrorsApi : window.WormholesAppErrors;
  const normalized = appErrors?.normalizeError
    ? appErrors.normalizeError(error, options)
    : error instanceof Error
      ? error
      : new Error(String(error || "Unknown error"));
  const message = normalized?.message || String(error || "Unknown error");
  console.warn(`[Wormholes] ${context}: ${message}`, normalized || "");
  if (window.WormholesErrorReporter) {
    window.WormholesErrorReporter.report(context, normalized, options);
    return;
  }
  const userMessage =
    options.userMessage || normalized?.userMessage || appErrors?.userMessageFor?.(normalized);
  if (userMessage) showSavedToast(userMessage);
}

const SHELL_EXPORTS = Object.freeze({
  displayValue,
  hasCurrentCreation,
  switchTab,
  statusMessage,
  renderCurrent,
  updateButtons,
  normalizeToastMessageForDedupe,
  clearSavedToastPosition,
  positionSavedToast,
  queueSavedToastPosition,
  showSavedToast,
  reportAppError,
});

export function installLegacyShellBindings(target = globalThis) {
  Object.entries(SHELL_EXPORTS).forEach(([name, value]) => {
    try {
      target[name] = value;
    } catch (error) {}
  });
  target.WormholesShell = SHELL_EXPORTS;
  return SHELL_EXPORTS;
}
