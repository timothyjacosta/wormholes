/* Wormholes Beta 248 dedicated Global Search index.
   Builds a reusable in-memory index, keeps it synchronized with persisted
   datasets, and narrows each query to likely matches before final ranking. */
(function () {
  const INDEX_VERSION = 1;
  const DEFAULT_MAX_RESULTS = 60;
  const REBUILD_DELAY_MS = 260;
  const SEARCHABLE_STORAGE_KEYS = Object.freeze(["wormholesUniverses", "wormholesBridgeNotes"]);
  const SEARCHABLE_STORAGE_PREFIXES = Object.freeze([
    "wormholesUniverseArchive:",
    "wormholesUniverseConnectionNotes:",
    "wormholesUniverseLiterature:",
    "wormholesUniverseVisionBoard:",
  ]);

  let currentIndex = emptyIndex();
  let dirty = true;
  let rebuildTimer = null;
  let idleHandle = null;
  let buildCount = 0;
  let lastDirtyReason = "startup";

  function normalizeSearchText(value) {
    const source = String(value || "");
    const normalized = typeof source.normalize === "function" ? source.normalize("NFKD") : source;
    return normalized
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactSearchText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function plainLiteratureText(value) {
    if (typeof literaturePlainPreview === "function") return literaturePlainPreview(value || "");
    return String(value || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function searchableValue(value, depth = 0) {
    if (value == null || depth > 3) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      return String(value);
    if (Array.isArray(value))
      return value.map((item) => searchableValue(item, depth + 1)).join(" ");
    if (typeof value === "object") {
      return ["title", "name", "label", "value", "custom", "text"]
        .map((key) => searchableValue(value[key], depth + 1))
        .filter(Boolean)
        .join(" ");
    }
    return "";
  }

  function activeUniverseId() {
    return typeof currentUniverseId === "string" ? currentUniverseId : "";
  }

  function safeUniverses() {
    return typeof universes !== "undefined" && Array.isArray(universes) ? universes : [];
  }

  function currentArchiveForSearch(universeId) {
    if (universeId === activeUniverseId() && typeof archiveEntries !== "undefined")
      return Array.isArray(archiveEntries) ? archiveEntries : [];
    return typeof readArchiveForUniverse === "function" ? readArchiveForUniverse(universeId) : [];
  }

  function currentLiteratureForSearch(universeId) {
    if (universeId === activeUniverseId() && typeof literatureEntries !== "undefined")
      return Array.isArray(literatureEntries) ? literatureEntries : [];
    return typeof readLiteratureForUniverse === "function"
      ? readLiteratureForUniverse(universeId)
      : [];
  }

  function currentVisionForSearch(universeId) {
    if (universeId === activeUniverseId() && typeof visionEntries !== "undefined")
      return Array.isArray(visionEntries) ? visionEntries : [];
    return typeof readVisionBoardForUniverse === "function"
      ? readVisionBoardForUniverse(universeId)
      : [];
  }

  function connectionNotesForSearch(universeId) {
    if (universeId === activeUniverseId() && typeof connectionNotes !== "undefined") {
      return connectionNotes && typeof connectionNotes === "object" ? connectionNotes : {};
    }
    return typeof readConnectionNotesForUniverse === "function"
      ? readConnectionNotesForUniverse(universeId)
      : {};
  }

  function normalizedBridgesForSearch(value) {
    if (typeof normalizeBridges === "function") return normalizeBridges(value);
    return Array.isArray(value) ? value : [];
  }

  function currentBridgeNotes() {
    return typeof bridgeNotes !== "undefined" && bridgeNotes && typeof bridgeNotes === "object"
      ? bridgeNotes
      : {};
  }

  function indexBridgeNotes() {
    const byUniverse = new Map();
    const byCreation = new Map();
    Object.entries(currentBridgeNotes()).forEach(([key, text]) => {
      String(key || "")
        .split("||")
        .forEach((endpoint) => {
          const parts = endpoint.split(":");
          if (parts[0] === "U" && parts[1]) {
            const values = byUniverse.get(parts[1]) || [];
            values.push(text);
            byUniverse.set(parts[1], values);
          } else if (parts[0] === "C" && parts[1] && parts[2]) {
            const mapKey = `${parts[1]}::${parts.slice(2).join(":")}`;
            const values = byCreation.get(mapKey) || [];
            values.push(text);
            byCreation.set(mapKey, values);
          }
        });
    });
    return {byUniverse, byCreation};
  }

  function tagText(tags, archiveByUniverse, universeTitleById) {
    const universeTags = Array.isArray(tags?.universes) ? tags.universes : [];
    const entryTags = Array.isArray(tags?.entries) ? tags.entries : [];
    const parts = universeTags.map((id) => universeTitleById.get(id) || "");
    entryTags.forEach((tag) => {
      const universeId = tag?.universeId || "";
      const entryId = tag?.entryId || "";
      const title =
        archiveByUniverse.get(universeId)?.find((entry) => entry.id === entryId)?.title || "";
      parts.push(title, universeTitleById.get(universeId) || "");
    });
    return parts.filter(Boolean).join(" ");
  }

  function makeSearchRecord({
    id,
    type,
    typeLabel,
    universeId,
    universeTitle,
    title,
    text,
    preview,
    destination,
  }) {
    const cleanTitle = compactSearchText(title) || "Untitled";
    const cleanText = compactSearchText(text);
    return {
      id: String(id || ""),
      type: String(type || ""),
      typeLabel: String(typeLabel || "Item"),
      universeId: String(universeId || ""),
      universeTitle: compactSearchText(universeTitle),
      title: cleanTitle,
      text: cleanText,
      normalizedTitle: normalizeSearchText(cleanTitle),
      normalizedText: normalizeSearchText(`${cleanTitle} ${universeTitle || ""} ${cleanText}`),
      preview: compactSearchText(preview || cleanText),
      destination: destination || {},
    };
  }

  function buildRecords() {
    const rows = [];
    const allUniverses = safeUniverses();
    const universeTitleById = new Map(
      allUniverses.map((universe) => [universe.id, universe.title || "Untitled Universe"]),
    );
    const archiveByUniverse = new Map();
    const literatureByUniverse = new Map();
    const visionByUniverse = new Map();
    const bridgeNoteIndex = indexBridgeNotes();

    allUniverses.forEach((universe) => {
      archiveByUniverse.set(universe.id, currentArchiveForSearch(universe.id));
      literatureByUniverse.set(universe.id, currentLiteratureForSearch(universe.id));
      visionByUniverse.set(universe.id, currentVisionForSearch(universe.id));
    });

    allUniverses.forEach((universe) => {
      const universeTitle = universe.title || "Untitled Universe";
      const archive = archiveByUniverse.get(universe.id) || [];
      const entryById = new Map(archive.map((entry) => [entry.id, entry]));
      const notesByEntry = new Map();
      Object.entries(connectionNotesForSearch(universe.id)).forEach(([key, text]) => {
        String(key || "")
          .split("::")
          .forEach((entryId) => {
            if (!entryId) return;
            const values = notesByEntry.get(entryId) || [];
            values.push(text);
            notesByEntry.set(entryId, values);
          });
      });

      rows.push(
        makeSearchRecord({
          id: universe.id,
          type: "universe",
          typeLabel: "Universe",
          universeId: universe.id,
          universeTitle,
          title: universeTitle,
          text: [universe.summary, bridgeNoteIndex.byUniverse.get(universe.id)]
            .flat()
            .filter(Boolean)
            .join(" "),
          preview: universe.summary || "Open this universe",
          destination: {kind: "universe"},
        }),
      );

      archive.forEach((entry) => {
        const isGroup = typeof isGroupEntry === "function" ? isGroupEntry(entry) : !!entry?.isGroup;
        const connectedTitles = (Array.isArray(entry.connections) ? entry.connections : [])
          .map((id) => entryById.get(id)?.title || "")
          .filter(Boolean);
        const bridgeTitles = normalizedBridgesForSearch(entry.bridges)
          .flatMap((bridge) => {
            const targetUniverseTitle = universeTitleById.get(bridge?.universeId) || "";
            const targetTitle =
              archiveByUniverse
                .get(bridge?.universeId)
                ?.find((item) => item.id === bridge?.creationId)?.title || "";
            return [targetUniverseTitle, targetTitle];
          })
          .filter(Boolean);
        const bridgeNoteText = bridgeNoteIndex.byCreation.get(`${universe.id}::${entry.id}`) || [];
        const memberTitles = isGroup
          ? (Array.isArray(entry.groupIds)
              ? entry.groupIds
              : Array.isArray(entry.children)
                ? entry.children
                : []
            )
              .map((id) => entryById.get(id)?.title || "")
              .filter(Boolean)
          : [];
        const body = [
          searchableValue(entry.what),
          searchableValue(entry.attr1),
          searchableValue(entry.attr2),
          searchableValue(entry.pressure),
          entry.summary,
          Array.isArray(entry.notes) ? entry.notes.join(" ") : "",
          connectedTitles.join(" "),
          notesByEntry.get(entry.id)?.join(" ") || "",
          bridgeTitles.join(" "),
          bridgeNoteText.join(" "),
          memberTitles.join(" "),
        ]
          .filter(Boolean)
          .join(" ");
        const preview =
          entry.summary ||
          (Array.isArray(entry.notes) ? entry.notes[0] : "") ||
          [searchableValue(entry.what), searchableValue(entry.attr1)].filter(Boolean).join(" · ");
        rows.push(
          makeSearchRecord({
            id: entry.id,
            type: isGroup ? "archive-group" : "archive",
            typeLabel: isGroup ? "Creation Group" : "Creation",
            universeId: universe.id,
            universeTitle,
            title: entry.title,
            text: body,
            preview,
            destination: {kind: "archive", entryId: entry.id},
          }),
        );
      });

      const literature = literatureByUniverse.get(universe.id) || [];
      literature.forEach((doc) => {
        const isGroup =
          typeof isLiteratureGroup === "function"
            ? isLiteratureGroup(doc)
            : doc?.kind === "literatureGroup" || !!doc?.isGroup;
        const contentText = isGroup ? "" : plainLiteratureText(doc.content || "");
        const groupTitles = isGroup
          ? (Array.isArray(doc.groupIds)
              ? doc.groupIds
              : Array.isArray(doc.children)
                ? doc.children
                : []
            )
              .map((id) => literature.find((item) => item.id === id)?.title || "")
              .filter(Boolean)
              .join(" ")
          : "";
        const tags = tagText(doc.tags, archiveByUniverse, universeTitleById);
        rows.push(
          makeSearchRecord({
            id: doc.id,
            type: isGroup ? "literature-group" : "literature",
            typeLabel: isGroup ? "Literature Group" : "Literature",
            universeId: universe.id,
            universeTitle,
            title: doc.title,
            text: [contentText, groupTitles, tags, doc.sourceName, doc.convertedFrom]
              .filter(Boolean)
              .join(" "),
            preview: contentText || groupTitles || tags,
            destination: {kind: "literature", docId: doc.id},
          }),
        );
      });

      (visionByUniverse.get(universe.id) || []).forEach((item) => {
        const tags = tagText(item.tags, archiveByUniverse, universeTitleById);
        rows.push(
          makeSearchRecord({
            id: item.id,
            type: "vision",
            typeLabel: "Vision Board",
            universeId: universe.id,
            universeTitle,
            title: item.title || item.sourceName || "Untitled Vision",
            text: [item.sourceName, tags].filter(Boolean).join(" "),
            preview: tags || item.sourceName || "Open image",
            destination: {kind: "vision", visionId: item.id},
          }),
        );
      });
    });

    return rows;
  }

  function wordTrigrams(text) {
    const keys = new Set();
    normalizeSearchText(text)
      .split(/[^\p{L}\p{N}_-]+/u)
      .filter(Boolean)
      .forEach((word) => {
        if (word.length < 3) return;
        for (let index = 0; index <= word.length - 3; index += 1)
          keys.add(word.slice(index, index + 3));
      });
    return keys;
  }

  function emptyIndex() {
    return {
      format: "Wormholes Search Index",
      version: INDEX_VERSION,
      records: [],
      trigrams: new Map(),
      universes: new Map(),
      builtAt: "",
      reason: "empty",
    };
  }

  function addPosting(map, key, recordIndex) {
    let posting = map.get(key);
    if (!posting) {
      posting = new Set();
      map.set(key, posting);
    }
    posting.add(recordIndex);
  }

  function createIndex(records, reason = "manual") {
    const safeRecords = Array.isArray(records) ? records : [];
    const index = {
      format: "Wormholes Search Index",
      version: INDEX_VERSION,
      records: safeRecords,
      trigrams: new Map(),
      universes: new Map(),
      builtAt: new Date().toISOString(),
      reason: String(reason || "manual"),
    };
    safeRecords.forEach((record, recordIndex) => {
      addPosting(index.universes, record.universeId || "", recordIndex);
      wordTrigrams(record.normalizedText || "").forEach((gram) =>
        addPosting(index.trigrams, gram, recordIndex),
      );
    });
    return index;
  }

  function isIndex(value) {
    return (
      !!value &&
      value.format === "Wormholes Search Index" &&
      value.version === INDEX_VERSION &&
      Array.isArray(value.records)
    );
  }

  function intersectSets(left, right) {
    if (!left) return right ? new Set(right) : new Set();
    if (!right) return new Set();
    const smaller = left.size <= right.size ? left : right;
    const larger = smaller === left ? right : left;
    const result = new Set();
    smaller.forEach((value) => {
      if (larger.has(value)) result.add(value);
    });
    return result;
  }

  function candidateIndexes(index, normalizedQuery, scope, universeId) {
    let candidates = null;
    if (scope === "current") candidates = new Set(index.universes.get(universeId || "") || []);
    const tokens = normalizedQuery.split(" ").filter(Boolean);
    tokens.forEach((token) => {
      if (token.length < 3) return;
      const grams = [];
      for (let position = 0; position <= token.length - 3; position += 1)
        grams.push(token.slice(position, position + 3));
      grams.forEach((gram) => {
        candidates = intersectSets(candidates, index.trigrams.get(gram));
      });
    });
    if (candidates) return candidates;
    return new Set(index.records.map((_, recordIndex) => recordIndex));
  }

  function scoreRecord(record, normalizedQuery, tokens) {
    if (!record || !normalizedQuery) return -1;
    if (!tokens.every((token) => record.normalizedText.includes(token))) return -1;
    let score = 0;
    if (record.normalizedTitle === normalizedQuery) score += 140;
    else if (record.normalizedTitle.startsWith(normalizedQuery)) score += 105;
    else if (record.normalizedTitle.includes(normalizedQuery)) score += 80;
    if (record.normalizedText.includes(normalizedQuery)) score += 35;
    tokens.forEach((token) => {
      if (record.normalizedTitle.startsWith(token)) score += 18;
      else if (record.normalizedTitle.includes(token)) score += 12;
      else score += 4;
    });
    if (record.type === "universe") score += 4;
    return score;
  }

  function searchIndex(index, query, scope = "all", options = {}) {
    const safeIndex = isIndex(index)
      ? index
      : createIndex(Array.isArray(index) ? index : [], "compatibility");
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];
    const tokens = normalizedQuery.split(" ").filter(Boolean);
    const universeId =
      options.currentUniverseId !== undefined ? options.currentUniverseId : activeUniverseId();
    const maxResults =
      Number.isInteger(options.maxResults) && options.maxResults > 0
        ? options.maxResults
        : DEFAULT_MAX_RESULTS;
    const candidates = candidateIndexes(safeIndex, normalizedQuery, scope, universeId);
    return Array.from(candidates)
      .map((recordIndex) => safeIndex.records[recordIndex])
      .filter((record) => scope !== "current" || record.universeId === universeId)
      .map((record) => ({record, score: scoreRecord(record, normalizedQuery, tokens)}))
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title))
      .slice(0, maxResults)
      .map((item) => item.record);
  }

  function dispatchIndexEvent(name, detail) {
    try {
      if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
      if (typeof CustomEvent === "function") window.dispatchEvent(new CustomEvent(name, {detail}));
    } catch (error) {}
  }

  function rebuild(reason = lastDirtyReason || "manual") {
    cancelScheduledRebuild();
    currentIndex = createIndex(buildRecords(), reason);
    dirty = false;
    buildCount += 1;
    dispatchIndexEvent("wormholes-search-index-rebuilt", {
      index: currentIndex,
      reason,
      buildCount,
    });
    return currentIndex;
  }

  function ensureFresh() {
    return dirty || !isIndex(currentIndex) ? rebuild(lastDirtyReason || "query") : currentIndex;
  }

  function cancelScheduledRebuild() {
    if (rebuildTimer !== null && typeof clearTimeout === "function") clearTimeout(rebuildTimer);
    rebuildTimer = null;
    if (idleHandle !== null && typeof cancelIdleCallback === "function")
      cancelIdleCallback(idleHandle);
    idleHandle = null;
  }

  function runScheduledRebuild() {
    rebuildTimer = null;
    idleHandle = null;
    if (dirty) rebuild(lastDirtyReason || "background");
  }

  function scheduleRebuild(reason = "saved data", delay = REBUILD_DELAY_MS) {
    dirty = true;
    lastDirtyReason = String(reason || "saved data");
    cancelScheduledRebuild();
    rebuildTimer =
      typeof setTimeout === "function"
        ? setTimeout(
            () => {
              rebuildTimer = null;
              if (typeof requestIdleCallback === "function") {
                idleHandle = requestIdleCallback(runScheduledRebuild, {timeout: 1200});
              } else runScheduledRebuild();
            },
            Math.max(0, Number(delay) || 0),
          )
        : null;
  }

  function markDirty(reason = "saved data", options = {}) {
    dirty = true;
    lastDirtyReason = String(reason || "saved data");
    if (options.schedule !== false) scheduleRebuild(lastDirtyReason, options.delay);
  }

  function relevantStorageKey(key) {
    const value = String(key || "");
    return (
      SEARCHABLE_STORAGE_KEYS.includes(value) ||
      SEARCHABLE_STORAGE_PREFIXES.some((prefix) => value.startsWith(prefix))
    );
  }

  function handlePersistedChange(event) {
    const key = event?.detail?.key || "";
    if (!relevantStorageKey(key)) return;
    scheduleRebuild(`${event.type || "storage change"}: ${key}`);
  }

  function install() {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    window.addEventListener("wormholes-dataset-saved", handlePersistedChange);
    window.addEventListener("wormholes-dataset-removed", handlePersistedChange);
    window.addEventListener("wormholes-search-index-invalidate", (event) =>
      markDirty(event?.detail?.reason || "explicit invalidation"),
    );
    window.addEventListener("load", () => scheduleRebuild("startup", 450), {once: true});
  }

  function search(query, scope = "all", options = {}) {
    return searchIndex(ensureFresh(), query, scope, options);
  }

  function records() {
    return ensureFresh().records;
  }

  function stats(index = currentIndex) {
    const safeIndex = isIndex(index) ? index : emptyIndex();
    return {
      version: safeIndex.version,
      recordCount: safeIndex.records.length,
      trigramCount: safeIndex.trigrams.size,
      universeCount: safeIndex.universes.size,
      builtAt: safeIndex.builtAt,
      buildCount,
      dirty,
      reason: safeIndex.reason,
      lastDirtyReason,
    };
  }

  window.WormholesSearchIndex = Object.freeze({
    INDEX_VERSION,
    normalizeSearchText,
    compactSearchText,
    buildRecords,
    createIndex,
    searchIndex,
    search,
    records,
    ensureFresh,
    rebuild,
    markDirty,
    scheduleRebuild,
    relevantStorageKey,
    stats,
    install,
  });

  install();
})();

/* ES-module source marker; runtime API remains the existing window namespace. */
export {};
