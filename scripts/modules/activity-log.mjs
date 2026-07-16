/* Wormholes Beta 252 local activity log and actionable notification details.
   Stores a bounded, privacy-conscious history of user actions and app notices.
   It never stores imported file contents or manually authored creation text. */
const activityLogModuleApi = (function (global) {
  const document = global.document;
  const STORAGE_KEY = "wormholes_activity_log_v1";
  const MAX_ITEMS = 200;
  const MAX_MESSAGE_LENGTH = 500;
  const MAX_DETAIL_TEXT_LENGTH = 4000;
  const state = {items: [], opener: null, detailOpener: null, installed: false};

  function nowIso() {
    return new Date().toISOString();
  }

  function createId(prefix = "log") {
    try {
      return `${prefix}-${crypto.randomUUID()}`;
    } catch (error) {
      return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  function cleanText(value, max = MAX_MESSAGE_LENGTH) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  }

  function cleanMultiline(value, max = MAX_DETAIL_TEXT_LENGTH) {
    return String(value ?? "")
      .replace(/\r\n?/g, "\n")
      .trim()
      .slice(0, max);
  }

  function sanitizeDetail(detail) {
    if (!detail || typeof detail !== "object") return null;
    const steps = Array.isArray(detail.steps)
      ? detail.steps
          .map((step) => cleanText(step, 700))
          .filter(Boolean)
          .slice(0, 8)
      : [];
    const technical =
      detail.technical && typeof detail.technical === "object"
        ? Object.fromEntries(
            Object.entries(detail.technical)
              .slice(0, 12)
              .map(([key, value]) => [cleanText(key, 80), cleanMultiline(value, 1000)]),
          )
        : null;
    const result = {
      title: cleanText(detail.title || "More information", 160),
      summary: cleanMultiline(detail.summary || "", 1800),
      cause: cleanMultiline(detail.cause || "", 1800),
      steps,
      technical,
    };
    return result.summary ||
      result.cause ||
      result.steps.length ||
      (technical && Object.keys(technical).length)
      ? result
      : null;
  }

  function sanitizeAction(action) {
    if (!action || typeof action !== "object") return null;
    const kind = cleanText(action.kind, 40);
    if (!["undo", "recovery", "export"].includes(kind)) return null;
    return {
      kind,
      label: cleanText(
        action.label || (kind === "undo" ? "Undo" : kind === "recovery" ? "Recovery" : "Export"),
        50,
      ),
      token: cleanText(action.token || "", 180),
    };
  }

  function sanitizeItem(item) {
    if (!item || typeof item !== "object") return null;
    const message = cleanText(item.message);
    if (!message) return null;
    const time = Number.isFinite(Date.parse(item.time))
      ? new Date(item.time).toISOString()
      : nowIso();
    return {
      id: cleanText(item.id || createId(), 220),
      time,
      type: ["action", "toast", "error", "undo", "system"].includes(item.type)
        ? item.type
        : "toast",
      message,
      detail: sanitizeDetail(item.detail),
      action: sanitizeAction(item.action),
      actionStatus: cleanText(item.actionStatus || "", 30),
    };
  }

  function readStorage() {
    try {
      const raw = global.localStorage?.getItem?.(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeItem).filter(Boolean).slice(-MAX_ITEMS);
    } catch (error) {
      return [];
    }
  }

  function saveStorage() {
    try {
      global.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(state.items.slice(-MAX_ITEMS)));
      return true;
    } catch (error) {
      return false;
    }
  }

  state.items = readStorage();

  function add(item, options = {}) {
    const normalized = sanitizeItem({
      ...item,
      id: item?.id || createId(item?.type || "log"),
      time: item?.time || nowIso(),
    });
    if (!normalized) return null;
    const last = state.items[state.items.length - 1];
    const dedupeWindow = Number(options.dedupeWindowMs || 0);
    if (
      dedupeWindow > 0 &&
      last &&
      last.type === normalized.type &&
      last.message === normalized.message &&
      Date.now() - Date.parse(last.time) < dedupeWindow
    ) {
      return last;
    }
    state.items.push(normalized);
    if (state.items.length > MAX_ITEMS) state.items.splice(0, state.items.length - MAX_ITEMS);
    saveStorage();
    if (document.getElementById("activityLogModal")?.classList.contains("open")) renderLog();
    return normalized;
  }

  function recordToast(message, options = {}) {
    return add(
      {
        type: options.logType === "error" ? "error" : options.logType || "toast",
        message: options.logMessage || message,
        detail: options.moreInfo || options.detail || null,
        action: options.logAction || null,
      },
      {dedupeWindowMs: options.dedupeWindowMs ?? 900},
    );
  }

  function recordAction(message, options = {}) {
    return add(
      {type: "action", message, detail: options.detail || null, action: options.action || null},
      {dedupeWindowMs: options.dedupeWindowMs ?? 700},
    );
  }

  function update(id, changes = {}) {
    const cleanId = cleanText(id, 220);
    const index = state.items.findIndex((item) => item.id === cleanId);
    if (index < 0) return null;
    const current = state.items[index];
    const normalized = sanitizeItem({...current, ...changes, id: current.id, time: current.time});
    if (!normalized) return null;
    state.items[index] = normalized;
    saveStorage();
    if (document.getElementById("activityLogModal")?.classList.contains("open")) renderLog();
    return normalized;
  }

  function recordUndoOffer(transaction) {
    if (!transaction?.id || !transaction?.message) return null;
    return add({
      id: `undo-${transaction.id}`,
      type: "undo",
      message: transaction.message,
      detail: transaction.detail || null,
      action: {kind: "undo", label: "Undo", token: transaction.id},
      actionStatus: "available",
    });
  }

  function markUndo(token, status) {
    const item = [...state.items]
      .reverse()
      .find((entry) => entry.action?.kind === "undo" && entry.action.token === token);
    if (!item) return false;
    item.actionStatus = cleanText(status || "expired", 30);
    saveStorage();
    if (document.getElementById("activityLogModal")?.classList.contains("open")) renderLog();
    return true;
  }

  function formatTimestamp(value) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(value));
    } catch (error) {
      return String(value || "");
    }
  }

  function clearChildren(element) {
    while (element?.firstChild) element.removeChild(element.firstChild);
  }

  function makeButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function actionAvailable(item) {
    const action = item?.action;
    if (!action) return false;
    if (action.kind === "undo") {
      const active = global.WormholesUndo?.activeTransaction;
      return !!active && active.id === action.token && item.actionStatus === "available";
    }
    if (action.kind === "recovery") return !!global.WormholesSnapshots?.openRecoverySnapshotsModal;
    if (action.kind === "export")
      return (
        typeof global.exportAppDataFromSettings === "function" ||
        !!document.getElementById("exportAppDataBtn")
      );
    return false;
  }

  async function runItemAction(item) {
    if (!actionAvailable(item)) return false;
    if (item.action.kind === "undo") return await global.WormholesUndo.undoActive();
    if (item.action.kind === "recovery") {
      closeLog({returnToSettings: false});
      global.WormholesSnapshots?.openRecoverySnapshotsModal?.();
      return true;
    }
    if (item.action.kind === "export") {
      closeLog({returnToSettings: true});
      setTimeout(() => document.getElementById("exportAppDataBtn")?.click(), 0);
      return true;
    }
    return false;
  }

  function reconcileUndoStatus(item) {
    if (item?.action?.kind !== "undo" || item.actionStatus !== "available") return false;
    if (actionAvailable(item)) return false;
    item.actionStatus = "expired";
    return true;
  }

  function typeLabel(item) {
    const type = item?.type;
    if (type === "error") return "Error";
    if (type === "action") return "Action";
    if (type === "undo") {
      if (item.actionStatus === "undone") return "Undone";
      if (item.actionStatus === "failed") return "Undo failed";
      if (item.actionStatus === "available" && actionAvailable(item)) return "Undo available";
      return "Action";
    }
    if (type === "system") return "System";
    return "Notice";
  }

  function undoStatusText(item) {
    if (item?.action?.kind !== "undo") return "";
    if (item.actionStatus === "undone") return "Undone";
    if (item.actionStatus === "failed") return "Undo failed";
    if (item.actionStatus === "expired") return "Undo expired";
    return "";
  }

  function renderLog() {
    const list = document.getElementById("activityLogList");
    const empty = document.getElementById("activityLogEmpty");
    if (!list) return;
    clearChildren(list);
    const items = state.items.slice().reverse();
    let reconciled = false;
    items.forEach((item) => {
      if (reconcileUndoStatus(item)) reconciled = true;
    });
    if (reconciled) saveStorage();
    if (empty) empty.hidden = items.length > 0;
    items.forEach((item) => {
      const row = document.createElement("article");
      row.className = `activity-log-item activity-log-item--${item.type}`;
      row.dataset.logId = item.id;

      const header = document.createElement("div");
      header.className = "activity-log-item-header";
      const kind = document.createElement("span");
      kind.className = "activity-log-kind";
      kind.textContent = typeLabel(item);
      const time = document.createElement("time");
      time.dateTime = item.time;
      time.textContent = formatTimestamp(item.time);
      header.append(kind, time);

      const message = document.createElement("p");
      message.textContent = item.message;
      row.append(header, message);

      const actions = document.createElement("div");
      actions.className = "activity-log-item-actions";
      if (item.detail) {
        actions.appendChild(
          makeButton("More information", "activity-log-text-button app-button", (event) => {
            openDetails(item.detail, event.currentTarget);
          }),
        );
      }
      if (item.action && actionAvailable(item)) {
        const button = makeButton(
          item.action.label,
          "activity-log-text-button app-button",
          async () => {
            await runItemAction(item);
          },
        );
        actions.appendChild(button);
      }
      const statusText = undoStatusText(item);
      if (statusText) {
        const status = document.createElement("span");
        status.className = "activity-log-action-status";
        status.textContent = statusText;
        actions.appendChild(status);
      }
      if (actions.childElementCount) row.appendChild(actions);
      list.appendChild(row);
    });
  }

  function openLog(event) {
    state.opener =
      event?.currentTarget || document.getElementById("activityLogBtn") || document.activeElement;
    if (typeof global.toggleSettingsMenu === "function") global.toggleSettingsMenu(false);
    const modal = document.getElementById("activityLogModal");
    if (!modal) return;
    renderLog();
    modal.classList.add("open");
    setTimeout(() => document.getElementById("closeActivityLogBtn")?.focus(), 0);
  }

  function closeLog(options = {}) {
    document.getElementById("activityLogModal")?.classList.remove("open");
    const target = state.opener || document.getElementById("activityLogBtn");
    state.opener = null;
    if (options.returnToSettings === false) {
      target?.focus?.();
      return;
    }
    setTimeout(() => {
      if (typeof global.toggleSettingsMenu === "function") global.toggleSettingsMenu(true);
      target?.focus?.();
    }, 0);
  }

  function appendDetailSection(container, titleText, bodyText) {
    if (!bodyText) return;
    const section = document.createElement("section");
    section.className = "activity-detail-section";
    const title = document.createElement("h3");
    title.textContent = titleText;
    const body = document.createElement("p");
    body.textContent = bodyText;
    section.append(title, body);
    container.appendChild(section);
  }

  function renderDetails(detail) {
    const normalized = sanitizeDetail(detail) || {
      title: "More information",
      summary: "No additional information is available.",
      steps: [],
    };
    const title = document.getElementById("activityDetailTitle");
    const body = document.getElementById("activityDetailBody");
    if (title) title.textContent = normalized.title;
    if (!body) return;
    clearChildren(body);
    appendDetailSection(body, "What happened", normalized.summary);
    appendDetailSection(body, "Likely cause", normalized.cause);
    if (normalized.steps?.length) {
      const section = document.createElement("section");
      section.className = "activity-detail-section";
      const heading = document.createElement("h3");
      heading.textContent = "What to do next";
      const list = document.createElement("ol");
      normalized.steps.forEach((step) => {
        const item = document.createElement("li");
        item.textContent = step;
        list.appendChild(item);
      });
      section.append(heading, list);
      body.appendChild(section);
    }
    if (normalized.technical && Object.keys(normalized.technical).length) {
      const details = document.createElement("details");
      details.className = "activity-detail-technical";
      const summary = document.createElement("summary");
      summary.textContent = "Technical details";
      const dl = document.createElement("dl");
      Object.entries(normalized.technical).forEach(([key, value]) => {
        const dt = document.createElement("dt");
        dt.textContent = key;
        const dd = document.createElement("dd");
        dd.textContent = value;
        dl.append(dt, dd);
      });
      details.append(summary, dl);
      body.appendChild(details);
    }
  }

  function openDetails(detail, opener) {
    const requestedOpener = opener || document.activeElement;
    state.detailOpener = requestedOpener?.closest?.("#savedToast")
      ? document.getElementById("settingsGearBtn") || document.getElementById("activityLogBtn")
      : requestedOpener;
    renderDetails(detail);
    const modal = document.getElementById("activityDetailModal");
    if (!modal) return;
    modal.classList.add("open");
    setTimeout(() => document.getElementById("closeActivityDetailBtn")?.focus(), 0);
  }

  function closeDetails() {
    document.getElementById("activityDetailModal")?.classList.remove("open");
    let target = state.detailOpener;
    if (target?.closest?.("#savedToast")) {
      target =
        document.getElementById("settingsGearBtn") || document.getElementById("activityLogBtn");
    }
    state.detailOpener = null;
    setTimeout(() => target?.focus?.(), 0);
  }

  function installUserActionCapture() {
    if (state.installed) return;
    state.installed = true;
    document.addEventListener(
      "click",
      (event) => {
        const control = event.target?.closest?.("button, [role='button']");
        if (!control || control.disabled || control.getAttribute?.("aria-disabled") === "true")
          return;
        if (
          control.closest?.(
            "#activityLogModal, #activityDetailModal, #duplicateCreationModal, #savedToast",
          )
        )
          return;
        const mappedLabels = {
          whatBtn: "Rolled What",
          attrBtn: "Rolled Attributes",
          storyBtn: "Rolled Story",
          quickFullRollBtn: "Quick Roll",
          newBtn: "New Creation",
          archiveBtn: "Opened Archive Creation",
          createUniverseBtn: "Create Universe",
          exportAppDataBtn: "Download Backup",
          importAppDataBtn: "Restore from Backup",
          createBackupBtn: "Back Up Folder",
          restoreBackupBtn: "Choose Backup Folder",
          clearAppDataBtn: "Delete All Wormholes Data",
        };
        const visibleLabel = cleanText(
          control.getAttribute?.("aria-label") || control.textContent || "",
          120,
        );
        const label = mappedLabels[control.id] || visibleLabel;
        if (!label) return;
        if (
          /^(close|cancel|back|return|stay here|see more|more information|undo|log)$/i.test(label)
        )
          return;
        if (
          /Tab$/.test(control.id || "") ||
          /^(current|create|archive|literature|vision)$/i.test(label)
        )
          return;
        if (
          !mappedLabels[control.id] &&
          !/^(save|delete|clear|create|restore|import|export|archive|add|remove|migrate|bridge|connect|rename|upload|new|confirm|apply|generate|roll|choose|change|use app|open archive|yes)/i.test(
            label,
          )
        )
          return;
        recordAction(label);
      },
      true,
    );
  }

  function install() {
    document.getElementById("activityLogBtn")?.addEventListener("click", openLog);
    document.getElementById("closeActivityLogBtn")?.addEventListener("click", closeLog);
    document.getElementById("closeActivityDetailBtn")?.addEventListener("click", closeDetails);
    installUserActionCapture();
  }

  if (document) {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", install, {once: true});
    else install();
  }

  const api = Object.freeze({
    storageKey: STORAGE_KEY,
    maxItems: MAX_ITEMS,
    state,
    add,
    recordToast,
    recordAction,
    update,
    recordUndoOffer,
    markUndo,
    render: renderLog,
    open: openLog,
    close: closeLog,
    openDetails,
    closeDetails,
    actionAvailable,
  });
  global.WormholesActivityLog = api;
  return api;
})(globalThis.window || globalThis);

export {activityLogModuleApi as api};
export default activityLogModuleApi;
