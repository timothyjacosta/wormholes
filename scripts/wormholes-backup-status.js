/* GENERATED from scripts/modules/backup-status.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 visible backup recency and status. */
(function installWormholesBackupStatus(global) {
  "use strict";

  const STORAGE_KEY = "wormholesBackupStatus";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RECENT_DAYS = 7;
  const STALE_DAYS = 30;

  function safeDate(value) {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }

  function normalizeKind(kind) {
    return kind === "folder" ? "folder" : "json";
  }

  function emptyRecord() {
    return {
      version: 1,
      lastSuccessAt: "",
      lastSuccessKind: "",
      lastAttemptAt: "",
      lastAttemptKind: "",
      lastAttemptStatus: "",
    };
  }

  function normalizeRecord(value) {
    const record = value && typeof value === "object" ? value : {};
    return {
      version: 1,
      lastSuccessAt: safeDate(record.lastSuccessAt)?.toISOString() || "",
      lastSuccessKind:
        record.lastSuccessKind === "folder" || record.lastSuccessKind === "json"
          ? record.lastSuccessKind
          : "",
      lastAttemptAt: safeDate(record.lastAttemptAt)?.toISOString() || "",
      lastAttemptKind:
        record.lastAttemptKind === "folder" || record.lastAttemptKind === "json"
          ? record.lastAttemptKind
          : "",
      lastAttemptStatus:
        record.lastAttemptStatus === "success" || record.lastAttemptStatus === "failed"
          ? record.lastAttemptStatus
          : "",
    };
  }

  function read() {
    try {
      const raw = global.localStorage?.getItem?.(STORAGE_KEY);
      if (!raw) return emptyRecord();
      return normalizeRecord(JSON.parse(raw));
    } catch (error) {
      return emptyRecord();
    }
  }

  function write(record) {
    const normalized = normalizeRecord(record);
    try {
      global.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(normalized));
      return true;
    } catch (error) {
      return false;
    }
  }

  function sameLocalDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function relativeAgeLabel(date, now = new Date()) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return "none";
    if (sameLocalDay(date, now)) return "Today";

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (sameLocalDay(date, yesterday)) return "Yesterday";

    const elapsed = Math.max(0, now.getTime() - date.getTime());
    const days = Math.max(1, Math.floor(elapsed / DAY_MS));
    if (days < 60) return `${days}d ago`;
    const months = Math.max(2, Math.floor(days / 30));
    if (months < 24) return `${months}mo ago`;
    return `${Math.max(2, Math.floor(months / 12))}y ago`;
  }

  function statusFromRecord(record, now = new Date()) {
    const normalized = normalizeRecord(record);
    const successDate = safeDate(normalized.lastSuccessAt);
    const attemptDate = safeDate(normalized.lastAttemptAt);
    const failedAfterSuccess =
      normalized.lastAttemptStatus === "failed" &&
      attemptDate &&
      (!successDate || attemptDate.getTime() >= successDate.getTime());

    if (failedAfterSuccess) {
      return {
        state: "failed",
        visibleText: "Backup: failed",
        accessibleText: successDate
          ? `Latest backup attempt failed. Last successful ${normalized.lastSuccessKind === "folder" ? "folder" : "JSON"} backup was ${successDate.toLocaleString()}.`
          : "Latest backup attempt failed. No successful external backup is recorded.",
      };
    }

    if (!successDate) {
      return {
        state: "none",
        visibleText: "Backup: none",
        accessibleText: "No successful external backup is recorded.",
      };
    }

    const ageDays = Math.max(0, Math.floor((now.getTime() - successDate.getTime()) / DAY_MS));
    const state = ageDays < RECENT_DAYS ? "recent" : ageDays < STALE_DAYS ? "due" : "stale";
    const kindLabel = normalized.lastSuccessKind === "folder" ? "folder" : "JSON";
    const statusLabel = state === "recent" ? "Recent" : state === "due" ? "Getting old" : "Old";
    return {
      state,
      visibleText: `Backup: ${relativeAgeLabel(successDate, now)}`,
      accessibleText: `Last successful ${kindLabel} backup: ${successDate.toLocaleString()}. ${statusLabel}.`,
    };
  }

  function render(now = new Date()) {
    const element = global.document?.getElementById?.("settingsBackupStatus");
    if (!element) return statusFromRecord(read(), now);
    const status = statusFromRecord(read(), now);
    element.textContent = status.visibleText;
    element.dataset.state = status.state;
    element.setAttribute("aria-label", status.accessibleText);
    element.title = status.accessibleText;
    return status;
  }

  function recordSuccess(kind, when = new Date()) {
    const date = safeDate(when) || new Date();
    const normalizedKind = normalizeKind(kind);
    const record = read();
    record.lastSuccessAt = date.toISOString();
    record.lastSuccessKind = normalizedKind;
    record.lastAttemptAt = date.toISOString();
    record.lastAttemptKind = normalizedKind;
    record.lastAttemptStatus = "success";
    write(record);
    return render(date);
  }

  function recordFailure(kind, when = new Date()) {
    const date = safeDate(when) || new Date();
    const record = read();
    record.lastAttemptAt = date.toISOString();
    record.lastAttemptKind = normalizeKind(kind);
    record.lastAttemptStatus = "failed";
    write(record);
    return render(date);
  }

  global.WormholesBackupStatus = Object.freeze({
    storageKey: STORAGE_KEY,
    read,
    render,
    recordSuccess,
    recordFailure,
    relativeAgeLabel,
    statusFromRecord,
  });

  global.addEventListener?.("storage", (event) => {
    if (event?.key === STORAGE_KEY) render();
  });
  global.document?.addEventListener?.("DOMContentLoaded", () => render(), {once: true});
})(typeof window !== "undefined" ? window : globalThis);
