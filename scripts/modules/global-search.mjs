/* Wormholes Beta 248 global search interface. */
import "./search-index.mjs";
import "./safe-render.mjs";

(function () {
  const MAX_RESULTS = 60;
  let searchTimer = null;
  let searchRequestVersion = 0;

  function indexApi() {
    return window.WormholesSearchIndex || null;
  }

  function normalizeSearchText(value) {
    const api = indexApi();
    if (api?.normalizeSearchText) return api.normalizeSearchText(value);
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactSearchText(value) {
    const api = indexApi();
    if (api?.compactSearchText) return api.compactSearchText(value);
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildGlobalSearchIndex() {
    return indexApi()?.buildRecords?.() || [];
  }

  function globalSearchResults(query, scope = "all", index = null) {
    const api = indexApi();
    if (!api) return [];
    if (index)
      return api.searchIndex(index, query, scope, {currentUniverseId, maxResults: MAX_RESULTS});
    return api.search(query, scope, {currentUniverseId, maxResults: MAX_RESULTS});
  }

  function excerptForResult(record, query, maxLength = 150) {
    const source = compactSearchText(record?.preview || record?.text || "");
    if (!source) return "";
    const normalizedSource = normalizeSearchText(source);
    const token =
      normalizeSearchText(query)
        .split(" ")
        .find((part) => normalizedSource.includes(part)) || "";
    let start = token ? normalizedSource.indexOf(token) : 0;
    start = Math.max(0, start - Math.floor(maxLength * 0.3));
    let excerpt = source.slice(start, start + maxLength).trim();
    if (start > 0) excerpt = `…${excerpt}`;
    if (start + maxLength < source.length) excerpt = `${excerpt}…`;
    return excerpt;
  }

  function searchIndexSize() {
    return indexApi()?.stats?.().recordCount || 0;
  }

  function renderGlobalSearchResults() {
    const input = document.getElementById("globalSearchInput");
    const scope = document.getElementById("globalSearchScope")?.value || "all";
    const list = document.getElementById("globalSearchResults");
    const status = document.getElementById("globalSearchStatus");
    if (!input || !list || !status) return;

    const query = input.value.trim();
    if (!query) {
      list.innerHTML = "";
      status.textContent = searchIndexSize()
        ? "Search across your universes."
        : "Nothing to search yet.";
      return;
    }

    const results = globalSearchResults(query, scope);
    status.textContent = results.length
      ? `${results.length}${results.length === MAX_RESULTS ? "+" : ""} result${results.length === 1 ? "" : "s"}`
      : "No matching items found.";
    const safeRender = window.WormholesSafeRender;
    safeRender?.clear(list);
    results.forEach((record, index) => {
      const excerpt = excerptForResult(record, query);
      const button =
        safeRender?.createElement("button", {
          className: "global-search-result app-button",
          attributes: {type: "button", "data-app-button": "true", "data-result-index": index},
        }) || document.createElement("button");
      if (!safeRender) {
        button.type = "button";
        button.className = "global-search-result app-button";
        button.dataset.appButton = "true";
        button.dataset.resultIndex = String(index);
      }
      const title =
        safeRender?.createElement("span", {
          className: "global-search-result-title",
          text: record.title,
        }) || document.createElement("span");
      const meta =
        safeRender?.createElement("span", {
          className: "global-search-result-meta",
          text: `${record.typeLabel} · ${record.universeTitle}`,
        }) || document.createElement("span");
      if (!safeRender) {
        title.className = "global-search-result-title";
        title.textContent = String(record.title || "");
        meta.className = "global-search-result-meta";
        meta.textContent = `${record.typeLabel || ""} · ${record.universeTitle || ""}`;
      }
      button.append(title, meta);
      if (excerpt) {
        const excerptElement =
          safeRender?.createElement("span", {
            className: "global-search-result-excerpt",
            text: excerpt,
          }) || document.createElement("span");
        if (!safeRender) {
          excerptElement.className = "global-search-result-excerpt";
          excerptElement.textContent = excerpt;
        }
        button.appendChild(excerptElement);
      }
      button.addEventListener("click", () => navigateToGlobalSearchResult(results[index]));
      list.appendChild(button);
    });
  }

  function queueGlobalSearchRender() {
    clearTimeout(searchTimer);
    const version = ++searchRequestVersion;
    searchTimer = setTimeout(() => {
      if (version !== searchRequestVersion) return;
      renderGlobalSearchResults();
    }, 120);
  }

  function closeGlobalSearch() {
    clearTimeout(searchTimer);
    searchRequestVersion += 1;
    document.getElementById("globalSearchModal")?.classList.remove("open");
  }

  function openGlobalSearch() {
    const otherModal = document.querySelector?.(".modal-backdrop.open:not(#globalSearchModal)");
    if (otherModal) return;
    const modal = document.getElementById("globalSearchModal");
    const input = document.getElementById("globalSearchInput");
    const scope = document.getElementById("globalSearchScope");
    if (!modal || !input) return;

    if (typeof closeMenus === "function") closeMenus();
    indexApi()?.ensureFresh?.();
    input.value = "";
    if (scope) {
      const currentOption = scope.querySelector('option[value="current"]');
      if (currentOption) currentOption.disabled = !currentUniverseId;
      if (scope.value === "current" && !currentUniverseId) scope.value = "all";
    }
    modal.classList.add("open");
    renderGlobalSearchResults();
    setTimeout(() => input.focus(), 40);
  }

  async function prepareGlobalSearchNavigation() {
    if (typeof literatureEditorIsOpen === "function" && literatureEditorIsOpen()) {
      const closed = await closeLiteratureEditor();
      if (!closed) return false;
    }
    closeGlobalSearch();
    return true;
  }

  async function navigateToGlobalSearchResult(record) {
    if (!record || !(await prepareGlobalSearchNavigation())) return;
    const destination = record.destination || {};
    if (record.universeId && currentUniverseId !== record.universeId) {
      if (typeof enterUniverse === "function") enterUniverse(record.universeId);
    } else if (typeof showAppScreen === "function") {
      showAppScreen();
    }

    if (destination.kind === "universe") return;
    if (destination.kind === "archive") {
      if (typeof switchTab === "function") switchTab("archive", {skipLiteratureEditorClose: true});
      if (typeof revealArchiveEntryForTag === "function")
        revealArchiveEntryForTag(destination.entryId);
      return;
    }
    if (destination.kind === "literature") {
      if (typeof switchTab === "function")
        switchTab("literature", {skipLiteratureEditorClose: true});
      if (typeof openLiteratureViewer === "function")
        await openLiteratureViewer(destination.docId, record.universeId);
      return;
    }
    if (destination.kind === "vision") {
      if (typeof switchTab === "function") switchTab("vision", {skipLiteratureEditorClose: true});
      if (typeof openVisionImageViewer === "function")
        await openVisionImageViewer(record.universeId, destination.visionId);
    }
  }

  function handleGlobalSearchKeydown(event) {
    if ((event.metaKey || event.ctrlKey) && String(event.key || "").toLowerCase() === "k") {
      event.preventDefault();
      if (document.getElementById("globalSearchModal")?.classList.contains("open")) {
        document.getElementById("globalSearchInput")?.focus();
      } else if (!document.querySelector?.(".modal-backdrop.open:not(#globalSearchModal)")) {
        openGlobalSearch();
      }
    }
  }

  function handleIndexRebuilt() {
    if (document.getElementById("globalSearchModal")?.classList.contains("open"))
      renderGlobalSearchResults();
  }

  function installGlobalSearch() {
    document.getElementById("globalSearchBtn")?.addEventListener("click", openGlobalSearch);
    document.getElementById("closeGlobalSearchBtn")?.addEventListener("click", closeGlobalSearch);
    document
      .getElementById("globalSearchInput")
      ?.addEventListener("input", queueGlobalSearchRender);
    document
      .getElementById("globalSearchScope")
      ?.addEventListener("change", renderGlobalSearchResults);
    document.addEventListener("keydown", handleGlobalSearchKeydown, true);
    window.addEventListener?.("wormholes-search-index-rebuilt", handleIndexRebuilt);
  }

  window.WormholesGlobalSearch = Object.freeze({
    normalizeSearchText,
    buildGlobalSearchIndex,
    globalSearchResults,
    excerptForResult,
    open: openGlobalSearch,
    close: closeGlobalSearch,
    navigate: navigateToGlobalSearchResult,
    install: installGlobalSearch,
  });

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", installGlobalSearch, {once: true});
  else installGlobalSearch();
})();

/* ES-module source marker; runtime API remains the existing window namespace. */
export {};
