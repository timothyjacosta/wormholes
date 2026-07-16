/* GENERATED from scripts/modules/error-reporting.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 262: standardized, visible error reporting with concise recovery guidance. */



const safeRenderApi =
  typeof importedSafeRenderApi !== "undefined"
    ? importedSafeRenderApi
    : globalThis.WormholesSafeRender;
const activityLogApi =
  typeof importedActivityLogApi !== "undefined"
    ? importedActivityLogApi
    : globalThis.WormholesActivityLog;
const appErrorsApi =
  typeof importedAppErrorsApi !== "undefined"
    ? importedAppErrorsApi
    : globalThis.WormholesAppErrors;

(function () {
  const state = {items: []};

  function errorsApi() {
    return appErrorsApi || window.WormholesAppErrors || null;
  }

  function ensurePanel() {
    let panel = document.getElementById("appErrorPanel");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "appErrorPanel";
    panel.className = "app-error-panel";
    panel.setAttribute("role", "alert");
    panel.setAttribute("aria-live", "assertive");
    panel.innerHTML = `
      <div class="app-error-header">
        <span>Needs Attention</span>
        <button type="button" class="app-button app-error-close" id="appErrorDismissBtn">Dismiss</button>
      </div>
      <p id="appErrorMessage">Something went wrong. Try again.</p>
      <ul class="app-error-details" id="appErrorDetails"></ul>
    `;
    document.body.appendChild(panel);
    panel.querySelector("#appErrorDismissBtn")?.addEventListener("click", () => {
      panel.classList.remove("open");
    });
    return panel;
  }

  function render() {
    const panel = ensurePanel();
    const message = panel.querySelector("#appErrorMessage");
    const details = panel.querySelector("#appErrorDetails");
    const recent = state.items.slice(-5).reverse();
    if (message) {
      message.textContent = recent[0]?.userMessage || "Something went wrong. Try again.";
    }
    if (details) {
      const safeRender = safeRenderApi || window.WormholesSafeRender;
      safeRender?.clear(details);
      recent.forEach((item) => {
        const row = safeRender?.createElement("li") || document.createElement("li");
        const text = item.action || item.userMessage || "Try the action again.";
        row.textContent = String(text);
        details.appendChild(row);
      });
    }
    panel.classList.add("open");
  }

  function report(context, error, options = {}) {
    const normalized = errorsApi()?.normalizeError
      ? errorsApi().normalizeError(error, {
          code: options.code,
          userMessage: options.userMessage,
          action: options.action,
          recoverable: options.recoverable,
        })
      : error instanceof Error
        ? error
        : new Error(String(error || "Wormholes could not complete the action."));
    const message = normalized?.message || String(error || "");
    const code = String(normalized?.code || options.code || "WORMHOLES_ERROR");
    const userMessage = String(
      options.userMessage ||
        normalized?.userMessage ||
        errorsApi()?.userMessageFor?.(code) ||
        "Something went wrong. Try again.",
    );
    const action = String(
      options.action ||
        normalized?.action ||
        errorsApi()?.actionFor?.(code) ||
        "Retry the action once.",
    );

    if (window.__wormholesClearingAppData) {
      try {
        console.warn(context || "Wormholes clear-data notice", message);
      } catch (e) {}
      return;
    }

    state.items.push({
      context: context || "Wormholes error",
      code,
      message,
      userMessage,
      action,
      recoverable: normalized?.recoverable !== false,
      time: new Date().toISOString(),
    });
    if (state.items.length > 20) state.items.shift();
    render();

    try {
      const detail = {
        title: options.detailTitle || "Error report",
        summary: userMessage,
        cause: options.cause || "Wormholes could not complete the action.",
        steps:
          Array.isArray(options.steps) && options.steps.length
            ? options.steps
            : [
                action,
                "If it fails again, keep Wormholes open and export App Data when possible.",
                "Check Restore Points before clearing browser data.",
              ],
        technical: {
          Code: code,
          Context: context || "Wormholes error",
          Message: message || "No message",
          Time: new Date().toISOString(),
        },
      };
      if (typeof window.showSavedToast === "function") {
        window.showSavedToast(userMessage, {
          durationMs: 10000,
          moreInfo: detail,
          moreInfoLabel: "More information",
          logType: "error",
          logMessage: userMessage,
          logAction: options.recoverySuggested ? {kind: "recovery", label: "Recovery"} : null,
        });
      } else {
        (activityLogApi || window.WormholesActivityLog)?.add?.({
          type: "error",
          message: userMessage,
          detail,
        });
      }
    } catch (e) {}
  }

  function guardAsync(label, fn, options = {}) {
    return async function guardedAsync(...args) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        report(label, error, options);
        throw error;
      }
    };
  }

  window.addEventListener("error", (event) => {
    report("Unexpected app error", event.error || event.message, {
      code: "WORMHOLES_UNEXPECTED",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    report("Unexpected async error", event.reason || "Unhandled promise rejection", {
      code: "WORMHOLES_ASYNC_ERROR",
    });
  });

  window.WormholesErrorReporter = {report, guardAsync, state};
  document.addEventListener("DOMContentLoaded", ensurePanel);
})();
