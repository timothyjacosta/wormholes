/* GENERATED from scripts/modules/map-search.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 map-specific search and relationship-isolation controls. */

(function () {
  const MAX_RESULTS = 24;
  const ALLOWED_TYPES = new Set([
    "universe",
    "archive",
    "archive-group",
    "literature",
    "literature-group",
    "vision",
  ]);
  const activeByScope = new Map();
  const openByScope = new Map();

  function uniqueTargets(targets) {
    const universes = [];
    const entries = [];
    const seenUniverses = new Set();
    const seenEntries = new Set();

    (targets?.universes || []).forEach((universeId) => {
      const id = String(universeId || "");
      if (!id || seenUniverses.has(id)) return;
      seenUniverses.add(id);
      universes.push(id);
    });

    (targets?.entries || []).forEach((target) => {
      const universeId = String(target?.universeId || "");
      const entryId = String(target?.entryId || "");
      const key = `${universeId}::${entryId}`;
      if (!universeId || !entryId || seenEntries.has(key)) return;
      seenEntries.add(key);
      entries.push({universeId, entryId});
    });

    return {universes, entries};
  }

  function tagsToTargets(tags) {
    return uniqueTargets({
      universes: Array.isArray(tags?.universes) ? tags.universes : [],
      entries: Array.isArray(tags?.entries) ? tags.entries : [],
    });
  }

  function literatureRecord(record) {
    if (!record?.universeId || !record?.id) return null;
    if (
      typeof currentUniverseId !== "undefined" &&
      record.universeId === currentUniverseId &&
      typeof literatureEntries !== "undefined"
    ) {
      return (
        (Array.isArray(literatureEntries) ? literatureEntries : []).find(
          (item) => item?.id === record.id,
        ) || null
      );
    }
    if (typeof readLiteratureForUniverse === "function") {
      return (
        (readLiteratureForUniverse(record.universeId) || []).find(
          (item) => item?.id === record.id,
        ) || null
      );
    }
    return null;
  }

  function visionRecord(record) {
    if (!record?.universeId || !record?.id) return null;
    if (
      typeof currentUniverseId !== "undefined" &&
      record.universeId === currentUniverseId &&
      typeof visionEntries !== "undefined"
    ) {
      return (
        (Array.isArray(visionEntries) ? visionEntries : []).find(
          (item) => item?.id === record.id,
        ) || null
      );
    }
    if (typeof readVisionBoardForUniverse === "function") {
      return (
        (readVisionBoardForUniverse(record.universeId) || []).find(
          (item) => item?.id === record.id,
        ) || null
      );
    }
    return null;
  }

  function targetsForRecord(record) {
    if (!record) return {universes: [], entries: []};
    if (record.type === "universe") {
      return uniqueTargets({universes: [record.universeId]});
    }
    if (record.type === "archive" || record.type === "archive-group") {
      return uniqueTargets({entries: [{universeId: record.universeId, entryId: record.id}]});
    }
    if (record.type === "literature" || record.type === "literature-group") {
      return tagsToTargets(literatureRecord(record)?.tags);
    }
    if (record.type === "vision") {
      return tagsToTargets(visionRecord(record)?.tags);
    }
    return {universes: [], entries: []};
  }

  function recordKind(record) {
    if (record?.type === "vision") return "Image";
    if (record?.type === "literature" || record?.type === "literature-group") return "Literature";
    if (record?.type === "universe") return "Universe";
    return "Creation";
  }

  function recordLabel(record) {
    return `${recordKind(record)}: ${String(record?.title || "Untitled")}`;
  }

  function getActive(scope) {
    return activeByScope.get(String(scope || "")) || null;
  }

  function setActive(scope, record) {
    const key = String(scope || "");
    if (!key || !record) return null;
    const active = {
      id: String(record.id || ""),
      type: String(record.type || ""),
      typeLabel: String(record.typeLabel || recordKind(record)),
      title: String(record.title || "Untitled"),
      universeId: String(record.universeId || ""),
      universeTitle: String(record.universeTitle || ""),
      destination: record.destination || {},
    };
    activeByScope.set(key, active);
    openByScope.set(key, false);
    return active;
  }

  function clearActive(scope) {
    activeByScope.delete(String(scope || ""));
  }

  function isMediaRecord(record) {
    return (
      !!record &&
      (record.type === "literature" ||
        record.type === "literature-group" ||
        record.type === "vision")
    );
  }

  function controlHtml(scope) {
    const safeScope = String(scope || "map").replace(/[^a-z0-9_-]/gi, "");
    const title = safeScope === "wormholes" ? "Search Manage Bridges" : "Search Connections map";
    return `
      <div class="map-search-control" data-map-search-scope="${safeScope}">
        <button class="map-search-toggle app-button" data-app-button="true" data-map-search-toggle="${safeScope}" type="button" aria-expanded="false" aria-controls="${safeScope}MapSearchPanel" aria-label="${title}" title="${title}">
          <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.25"></circle><path d="m15.25 15.25 4.5 4.5"></path></svg>
        </button>
        <section class="map-search-panel" id="${safeScope}MapSearchPanel" data-map-search-panel="${safeScope}" hidden>
          <div class="map-search-heading">
            <label for="${safeScope}MapSearchInput">Search this map</label>
            <button class="map-search-close app-button" data-app-button="true" data-map-search-close="${safeScope}" type="button" aria-label="Close map search">×</button>
          </div>
          <input autocomplete="off" class="map-search-input" id="${safeScope}MapSearchInput" data-map-search-input="${safeScope}" maxlength="500" placeholder="Creations, literature, images…" type="search">
          <p class="map-search-status" data-map-search-status="${safeScope}" aria-live="polite">Type to find a map-linked item.</p>
          <div class="map-search-results" data-map-search-results="${safeScope}"></div>
        </section>
      </div>
    `;
  }

  function activeBannerHtml(scope) {
    const active = getActive(scope);
    if (!active) return "";
    const label = recordLabel(active);
    const escaped =
      typeof escapeHtml === "function"
        ? escapeHtml(label)
        : label.replace(
            /[&<>"']/g,
            (character) =>
              ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[character],
          );
    return `
      <div class="map-search-isolation" data-map-search-isolation="${scope}">
        <span class="map-search-isolation-label">${escaped}</span>
        <button class="map-search-show-all app-button" data-app-button="true" data-map-search-clear="${scope}" type="button">Show all</button>
      </div>
    `;
  }

  function searchRecords(query) {
    const text = String(query || "").trim();
    if (!text || !window.WormholesSearchIndex?.search) return [];
    return window.WormholesSearchIndex.search(text, "all", {
      currentUniverseId: typeof currentUniverseId === "string" ? currentUniverseId : "",
      maxResults: MAX_RESULTS * 3,
    }).filter((record) => ALLOWED_TYPES.has(record.type));
  }

  function resultMeta(record, descriptor) {
    const context = descriptor?.contextLabel || record.universeTitle || "";
    return [record.typeLabel || recordKind(record), context].filter(Boolean).join(" · ");
  }

  function bind(scope, options = {}) {
    const key = String(scope || "");
    const root = document.querySelector(`[data-map-search-scope="${key}"]`);
    if (!root) return;

    const toggle = root.querySelector(`[data-map-search-toggle="${key}"]`);
    const panel = root.querySelector(`[data-map-search-panel="${key}"]`);
    const close = root.querySelector(`[data-map-search-close="${key}"]`);
    const input = root.querySelector(`[data-map-search-input="${key}"]`);
    const status = root.querySelector(`[data-map-search-status="${key}"]`);
    const results = root.querySelector(`[data-map-search-results="${key}"]`);
    let timer = null;
    let rendered = [];

    function setOpen(open) {
      const next = !!open;
      openByScope.set(key, next);
      if (panel) panel.hidden = !next;
      toggle?.setAttribute("aria-expanded", String(next));
      if (next) {
        window.WormholesSearchIndex?.ensureFresh?.();
        setTimeout(() => input?.focus(), 0);
      }
    }

    function clearResults(message) {
      rendered = [];
      if (results) results.replaceChildren();
      if (status) status.textContent = message;
    }

    function renderResults() {
      if (!input || !results || !status) return;
      const query = input.value.trim();
      if (!query) {
        clearResults("Type to find a map-linked item.");
        return;
      }

      const matches = [];
      searchRecords(query).forEach((record) => {
        const descriptor =
          typeof options.resolve === "function"
            ? options.resolve(record)
            : {targets: targetsForRecord(record)};
        if (!descriptor) return;
        matches.push({record, descriptor});
      });
      rendered = matches.slice(0, MAX_RESULTS);
      results.replaceChildren();
      status.textContent = rendered.length
        ? `${rendered.length}${matches.length > MAX_RESULTS ? "+" : ""} map result${rendered.length === 1 ? "" : "s"}`
        : "No map-linked matches.";

      rendered.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "map-search-result app-button";
        button.dataset.appButton = "true";
        button.dataset.mapSearchResultIndex = String(index);

        const title = document.createElement("span");
        title.className = "map-search-result-title";
        title.textContent = item.record.title || "Untitled";
        const meta = document.createElement("span");
        meta.className = "map-search-result-meta";
        meta.textContent = resultMeta(item.record, item.descriptor);
        button.append(title, meta);
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          if (typeof options.onSelect === "function")
            options.onSelect(item.record, item.descriptor);
        });
        results.appendChild(button);
      });
    }

    toggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(panel?.hidden !== false);
    });
    close?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      toggle?.focus();
    });
    input?.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(renderResults, 110);
    });
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggle?.focus();
      } else if (event.key === "ArrowDown") {
        const first = results?.querySelector("button");
        if (first) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    root.addEventListener("pointerdown", (event) => event.stopPropagation());
    root.addEventListener("click", (event) => event.stopPropagation());

    setOpen(openByScope.get(key) === true);
  }

  function bindActiveClear(scope, callback) {
    document.querySelectorAll(`[data-map-search-clear="${scope}"]`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearActive(scope);
        if (typeof callback === "function") callback();
      });
    });
  }

  window.WormholesMapSearch = Object.freeze({
    MAX_RESULTS,
    targetsForRecord,
    recordLabel,
    recordKind,
    isMediaRecord,
    getActive,
    setActive,
    clearActive,
    controlHtml,
    activeBannerHtml,
    bind,
    bindActiveClear,
  });
})();
