/* Wormholes Beta 248 single-active-tab guard.
   Only the tab holding the browser lock may initialize or persist app data. */

(function installWormholesSingleTabGuard() {
  const LOCK_NAME = "wormholes-single-active-tab";
  const CHANNEL_NAME = "wormholes-single-tab-events";
  const FALLBACK_LEASE_KEY = "wormholesSingleTabLease";
  const FALLBACK_LEASE_MS = 8000;
  const FALLBACK_HEARTBEAT_MS = 2000;
  const FALLBACK_SETTLE_MS = 180;
    const TAB_ID_KEY = "wormholesSingleTabId";
  const BROWSER_LOCK_RETRY_MS = 100;
  const BROWSER_LOCK_RETRY_LIMIT = 20;
  const DUPLICATE_MESSAGE =
    "Wormholes is already open in another tab. To prevent lost work, return to the existing Wormholes tab.";
  function createTabId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function getOrCreateTabId() {
    try {
      const existing = sessionStorage.getItem(TAB_ID_KEY);
      if (existing) return existing;
      const created = createTabId();
      sessionStorage.setItem(TAB_ID_KEY, created);
      return created;
    } catch (error) {
      return createTabId();
    }
  }

  const tabId = getOrCreateTabId();

  let state = "checking";
  let releaseBrowserLock = null;
  let fallbackHeartbeat = null;
  let fallbackStorageListenerInstalled = false;
  let channel = null;
  let resolveReady;

  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  const api = {
    ready,
    tabId,
    message: DUPLICATE_MESSAGE,
    storageKey: FALLBACK_LEASE_KEY,
    getState: () => state,
    canWrite: () => state === "active",
    isDuplicate: () => state === "duplicate",
  };
  window.WormholesSingleTab = api;

  document.documentElement.classList.add("wormholes-single-tab-checking");

  function createChannel() {
    if (channel || typeof BroadcastChannel !== "function") return channel;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch (error) {
      channel = null;
    }
    return channel;
  }

  function announceDuplicateOpen() {
    try {
      createChannel()?.postMessage({
        type: "duplicate-opened",
        sourceTabId: tabId,
        at: Date.now(),
      });
    } catch (error) {}
  }

  function showActiveTabNotice() {
    let notice = document.getElementById("wormholesSingleTabNotice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "wormholesSingleTabNotice";
      notice.className = "wormholes-single-tab-notice";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      document.body.appendChild(notice);
    }
    notice.textContent = "Another Wormholes tab was opened. This tab remains active.";
    notice.classList.add("show");
    clearTimeout(showActiveTabNotice.hideTimer);
    showActiveTabNotice.hideTimer = setTimeout(() => notice.classList.remove("show"), 5000);
  }

  function installActiveChannelListener() {
    const activeChannel = createChannel();
    if (!activeChannel) return;
    activeChannel.onmessage = (event) => {
      if (state !== "active" || event?.data?.type !== "duplicate-opened") return;
      showActiveTabNotice();
    };
  }

  function showDuplicateScreen() {
    document.documentElement.classList.remove("wormholes-single-tab-checking");
    document.documentElement.classList.add("wormholes-duplicate-tab");

    const main = document.querySelector("main");
    if (main) {
      main.setAttribute("aria-hidden", "true");
      main.inert = true;
    }

    let blocker = document.getElementById("wormholesDuplicateTabBlocker");
    if (!blocker) {
      blocker = document.createElement("div");
      blocker.id = "wormholesDuplicateTabBlocker";
      blocker.className = "wormholes-duplicate-tab-blocker";
      blocker.setAttribute("role", "alertdialog");
      blocker.setAttribute("tabindex", "-1");
      blocker.setAttribute("aria-modal", "true");
      blocker.setAttribute("aria-labelledby", "wormholesDuplicateTabTitle");
      blocker.setAttribute("aria-describedby", "wormholesDuplicateTabMessage");
      blocker.innerHTML = `
        <section class="wormholes-duplicate-tab-card">
          <div class="wormholes-duplicate-tab-mark" aria-hidden="true">✦</div>
          <h1 id="wormholesDuplicateTabTitle">WORMHOLES</h1>
          <p id="wormholesDuplicateTabMessage">${DUPLICATE_MESSAGE}</p>
        </section>
      `;
      document.body.appendChild(blocker);
    }

    try {
      blocker.focus({preventScroll: true});
    } catch (error) {}
  }

  function becomeDuplicate() {
    if (state === "duplicate") return;
    state = "duplicate";
    try {
      releaseBrowserLock?.();
    } catch (error) {}
    releaseBrowserLock = null;
    stopFallbackHeartbeat(false);
    showDuplicateScreen();
    announceDuplicateOpen();
    resolveReady(false);
  }

  function becomeActive() {
    if (state !== "checking") return;
    state = "active";
    document.documentElement.classList.remove("wormholes-single-tab-checking");
    document.documentElement.classList.add("wormholes-active-tab");
    installActiveChannelListener();
    resolveReady(true);
  }

  function readFallbackLease() {
    try {
      const value = localStorage.getItem(FALLBACK_LEASE_KEY);
      if (!value) return null;
      const lease = JSON.parse(value);
      if (!lease || typeof lease !== "object") return null;
      return lease;
    } catch (error) {
      return null;
    }
  }

  function writeFallbackLease() {
    const lease = {
      tabId,
      refreshedAt: Date.now(),
      expiresAt: Date.now() + FALLBACK_LEASE_MS,
    };
    localStorage.setItem(FALLBACK_LEASE_KEY, JSON.stringify(lease));
    return lease;
  }

  function stopFallbackHeartbeat(removeOwnedLease = true) {
    if (fallbackHeartbeat) {
      clearInterval(fallbackHeartbeat);
      fallbackHeartbeat = null;
    }
    if (!removeOwnedLease) return;
    try {
      const lease = readFallbackLease();
      if (lease?.tabId === tabId) localStorage.removeItem(FALLBACK_LEASE_KEY);
    } catch (error) {}
  }

  function installFallbackStorageListener() {
    if (fallbackStorageListenerInstalled) return;
    fallbackStorageListenerInstalled = true;
    window.addEventListener("storage", (event) => {
      if (event.key !== FALLBACK_LEASE_KEY || state !== "active") return;
      const lease = readFallbackLease();
      if (lease && lease.tabId !== tabId && lease.expiresAt > Date.now()) becomeDuplicate();
    });
  }

  function startFallbackHeartbeat() {
    installFallbackStorageListener();
    fallbackHeartbeat = setInterval(() => {
      if (state !== "active") return;
      try {
        const lease = readFallbackLease();
        if (lease && lease.tabId !== tabId && lease.expiresAt > Date.now()) {
          becomeDuplicate();
          return;
        }
        writeFallbackLease();
      } catch (error) {}
    }, FALLBACK_HEARTBEAT_MS);
  }

  function acquireFallbackLease() {
    let existing;
    try {
      existing = readFallbackLease();
      if (existing && existing.tabId !== tabId && existing.expiresAt > Date.now()) {
        becomeDuplicate();
        return;
      }
      writeFallbackLease();
    } catch (error) {
      // Storage may be unavailable in a hardened/private context. The duplicate
      // screen is safer than permitting an uncoordinated second writer.
      becomeDuplicate();
      return;
    }

    setTimeout(() => {
      if (state !== "checking") return;
      const settledLease = readFallbackLease();
      if (!settledLease || settledLease.tabId !== tabId || settledLease.expiresAt <= Date.now()) {
        becomeDuplicate();
        return;
      }
      startFallbackHeartbeat();
      becomeActive();
    }, FALLBACK_SETTLE_MS);
  }

  function acquireBrowserLock(attempt = 0) {
    navigator.locks
      .request(LOCK_NAME, {mode: "exclusive", ifAvailable: true}, async (lock) => {
        if (!lock) {
          const lease = readFallbackLease();
          const liveOtherTab = lease && lease.tabId !== tabId && lease.expiresAt > Date.now();

          if (!liveOtherTab && attempt < BROWSER_LOCK_RETRY_LIMIT) {
            setTimeout(() => acquireBrowserLock(attempt + 1), BROWSER_LOCK_RETRY_MS);
            return;
          }

          becomeDuplicate();
          return;
        }

        let release;
        const held = new Promise((resolve) => {
          release = resolve;
        });
        releaseBrowserLock = release;

        // Require the storage lease as a second, independent check. This matters
        // for local-file builds, where browser origin handling can vary.
        acquireFallbackLease();
        await held;
      })
      .catch(() => {
        if (state === "checking") acquireFallbackLease();
      });
  }

  window.addEventListener("pagehide", () => {
    try {
      releaseBrowserLock?.();
    } catch (error) {}
    stopFallbackHeartbeat(true);
    try {
      channel?.close();
    } catch (error) {}
  });

  if (navigator.locks?.request) {
    acquireBrowserLock();
  } else {
    acquireFallbackLease();
  }
})();

/* ES-module source marker; runtime API remains the existing window namespace. */
export {};
