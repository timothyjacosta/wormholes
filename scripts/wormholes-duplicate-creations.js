/* GENERATED from scripts/modules/duplicate-creations.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 252 conservative exact and near-duplicate creation checks.
   Warnings are advisory only: Wormholes never deletes, merges, renames, or blocks
   a creation automatically. */

const duplicateCreationsModuleApi = (function (global) {
  const activityLogApi =
    typeof importedActivityLogApi !== "undefined"
      ? importedActivityLogApi
      : global.WormholesActivityLog;
  const state = {pending: null, opener: null};
  const COMMON_VARIANTS = new Map([
    ["grey", "gray"],
    ["harbour", "harbor"],
    ["centre", "center"],
    ["theatre", "theater"],
    ["traveller", "traveler"],
    ["catalogue", "catalog"],
    ["colour", "color"],
    ["honour", "honor"],
    ["favour", "favor"],
  ]);

  function rawField(entry, key) {
    const value = entry?.[key];
    if (value && typeof value === "object" && !Array.isArray(value)) return String(value.val ?? "");
    return String(value ?? "");
  }

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function canonicalTitle(value) {
    return normalizeText(value)
      .split(" ")
      .map((word) => COMMON_VARIANTS.get(word) || word)
      .join(" ");
  }

  function creationCore(entry) {
    const attributes = [
      normalizeText(rawField(entry, "attr1")),
      normalizeText(rawField(entry, "attr2")),
    ]
      .filter(Boolean)
      .sort();
    return [
      normalizeText(rawField(entry, "what")),
      attributes[0] || "",
      attributes[1] || "",
      normalizeText(rawField(entry, "pressure")),
    ];
  }

  function coreSignature(entry) {
    const core = creationCore(entry);
    return core.filter(Boolean).length >= 2 ? core.join("\u241f") : "";
  }

  function generationSeed(entry) {
    const seed = entry?._generation?.seed;
    return typeof seed === "string" && /^[0-9a-f]{8}$/i.test(seed.trim())
      ? seed.trim().toLowerCase()
      : "";
  }

  function isCreation(entry) {
    return (
      !!entry &&
      typeof entry === "object" &&
      entry.kind !== "group" &&
      !Array.isArray(entry.entryIds) &&
      !!normalizeText(entry.title)
    );
  }

  function levenshteinDistance(a, b) {
    const left = String(a || "");
    const right = String(b || "");
    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;
    const previous = Array.from({length: right.length + 1}, (_, index) => index);
    const current = new Array(right.length + 1);
    for (let i = 1; i <= left.length; i += 1) {
      current[0] = i;
      for (let j = 1; j <= right.length; j += 1) {
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      }
      for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
    }
    return previous[right.length];
  }

  function titleSimilarity(a, b) {
    const left = canonicalTitle(a);
    const right = canonicalTitle(b);
    if (!left || !right) return 0;
    if (left === right) return 1;
    const longest = Math.max(left.length, right.length);
    return longest ? 1 - levenshteinDistance(left, right) / longest : 0;
  }

  function compare(candidate, existing) {
    if (!isCreation(candidate) || !isCreation(existing)) return null;
    const candidateTitle = normalizeText(candidate.title);
    const existingTitle = normalizeText(existing.title);
    const canonicalCandidateTitle = canonicalTitle(candidate.title);
    const canonicalExistingTitle = canonicalTitle(existing.title);
    const candidateCore = creationCore(candidate);
    const existingCore = creationCore(existing);
    const nonEmptyCandidateCore = candidateCore.filter(Boolean).length;
    const allCoreEqual =
      nonEmptyCandidateCore > 0 &&
      candidateCore.every((value, index) => value === existingCore[index]);
    const exactCoreMatches = candidateCore.reduce(
      (count, value, index) => count + (value && value === existingCore[index] ? 1 : 0),
      0,
    );
    const sameWhat = !!candidateCore[0] && candidateCore[0] === existingCore[0];
    const sameSeed =
      !!generationSeed(candidate) && generationSeed(candidate) === generationSeed(existing);

    if (sameSeed || (candidateTitle === existingTitle && allCoreEqual)) {
      return {
        kind: "exact",
        score: 1,
        reason: sameSeed ? "same generated result" : "same title and details",
        existing,
      };
    }

    if (candidateTitle === existingTitle) {
      return {kind: "near", score: 0.97, reason: "same title", existing};
    }
    if (canonicalCandidateTitle === canonicalExistingTitle && (sameWhat || exactCoreMatches >= 1)) {
      return {
        kind: "near",
        score: 0.96,
        reason: "equivalent title and related details",
        existing,
      };
    }

    const similarity = titleSimilarity(candidate.title, existing.title);
    const shortestTitleLength = Math.min(
      canonicalCandidateTitle.length,
      canonicalExistingTitle.length,
    );
    const requiredSimilarity = shortestTitleLength < 8 ? 1 : shortestTitleLength < 13 ? 0.9 : 0.84;
    if (similarity >= requiredSimilarity && (sameWhat || exactCoreMatches >= 2)) {
      return {
        kind: "near",
        score: Math.min(0.96, similarity + exactCoreMatches * 0.015),
        reason: "very similar title and details",
        existing,
      };
    }

    const candidateSignature = coreSignature(candidate);
    if (
      candidateSignature &&
      candidateSignature === coreSignature(existing) &&
      similarity >= 0.45
    ) {
      return {kind: "near", score: 0.88, reason: "same creation details", existing};
    }

    return null;
  }

  function findMatches(candidate, entries = [], options = {}) {
    const ignored = new Set((options.ignoreIds || []).filter(Boolean));
    return (Array.isArray(entries) ? entries : [])
      .filter((entry) => isCreation(entry) && !ignored.has(entry.id))
      .map((entry) => compare(candidate, entry))
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.score - a.score ||
          String(a.existing?.title || "").localeCompare(String(b.existing?.title || "")),
      );
  }

  function findBatchMatch(candidates = [], entries = [], options = {}) {
    for (const candidate of Array.isArray(candidates) ? candidates : []) {
      if (!isCreation(candidate)) continue;
      const matches = findMatches(candidate, entries, options);
      if (matches.length) return {candidate, match: matches[0], matches};
    }
    return null;
  }

  function scanEntries(entries = [], options = {}) {
    const rows = (Array.isArray(entries) ? entries : []).filter(isCreation);
    const maxMatches = Math.max(1, Math.min(250, Number(options.maxMatches) || 50));
    const exactKeyIndex = new Map();
    const titleIndex = new Map();
    const coreIndex = new Map();
    const seedIndex = new Map();
    const titleBuckets = new Map();
    const matches = [];
    const seenPairs = new Set();

    function addMatch(candidate, existing, result) {
      if (!result || matches.length >= maxMatches) return;
      const pair = [
        String(candidate.id || rows.indexOf(candidate)),
        String(existing.id || rows.indexOf(existing)),
      ]
        .sort()
        .join("::");
      if (seenPairs.has(pair)) return;
      seenPairs.add(pair);
      matches.push({
        candidate,
        existing,
        kind: result.kind,
        reason: result.reason,
        score: result.score,
      });
    }

    rows.forEach((candidate, index) => {
      const rawTitle = normalizeText(candidate.title);
      const canonical = canonicalTitle(candidate.title);
      const signature = coreSignature(candidate);
      const seed = generationSeed(candidate);
      const exactKey = `${rawTitle}\u241e${creationCore(candidate).join("\u241f")}`;
      const possible = new Set();
      [
        exactKeyIndex.get(exactKey),
        ...(titleIndex.get(canonical) || []),
        ...(signature ? coreIndex.get(signature) || [] : []),
        ...(seed ? seedIndex.get(seed) || [] : []),
      ]
        .filter(Boolean)
        .forEach((entry) => possible.add(entry));

      if (canonical.length >= 8) {
        const bucketKey = canonical.charAt(0);
        const bucket = titleBuckets.get(bucketKey) || [];
        bucket.slice(-300).forEach((entry) => {
          const otherLength = canonicalTitle(entry.title).length;
          if (
            Math.abs(otherLength - canonical.length) <=
            Math.max(3, Math.ceil(canonical.length * 0.16))
          )
            possible.add(entry);
        });
      }

      possible.forEach((existing) => addMatch(candidate, existing, compare(candidate, existing)));
      if (matches.length < maxMatches || options.continueAfterLimit) {
        exactKeyIndex.set(exactKey, candidate);
        if (!titleIndex.has(canonical)) titleIndex.set(canonical, []);
        titleIndex.get(canonical).push(candidate);
        if (signature) {
          if (!coreIndex.has(signature)) coreIndex.set(signature, []);
          coreIndex.get(signature).push(candidate);
        }
        if (seed) {
          if (!seedIndex.has(seed)) seedIndex.set(seed, []);
          seedIndex.get(seed).push(candidate);
        }
        const bucketKey = canonical.charAt(0);
        if (!titleBuckets.has(bucketKey)) titleBuckets.set(bucketKey, []);
        titleBuckets.get(bucketKey).push(candidate);
      }
    });

    return {
      count: matches.length,
      exactCount: matches.filter((match) => match.kind === "exact").length,
      nearCount: matches.filter((match) => match.kind === "near").length,
      matches,
      limited: matches.length >= maxMatches,
    };
  }

  function scanAppData(importData, options = {}) {
    const allMatches = [];
    const universeData =
      importData?.universeData && typeof importData.universeData === "object"
        ? importData.universeData
        : {};
    const titleById = new Map(
      (Array.isArray(importData?.universes) ? importData.universes : []).map((universe) => [
        universe.id,
        universe.title || "Universe",
      ]),
    );
    let exactCount = 0;
    let nearCount = 0;
    let limited = false;
    const maxMatches = Math.max(1, Math.min(250, Number(options.maxMatches) || 50));
    Object.entries(universeData).some(([universeId, details]) => {
      const result = scanEntries(details?.archive || [], {
        maxMatches: Math.max(1, maxMatches - allMatches.length),
      });
      result.matches.forEach((match) =>
        allMatches.push({
          ...match,
          universeId,
          universeTitle: titleById.get(universeId) || "Universe",
        }),
      );
      exactCount += result.exactCount;
      nearCount += result.nearCount;
      limited = limited || result.limited;
      return allMatches.length >= maxMatches;
    });
    return {count: allMatches.length, exactCount, nearCount, matches: allMatches, limited};
  }

  function logDecision(decision) {
    const messages = {
      proceed: "Possible duplicate saved anyway",
      move: "Possible duplicate moved anyway",
      view: "Possible duplicate reviewed",
      cancel: "Possible duplicate action canceled",
    };
    const message = messages[decision] || messages.cancel;
    activityLogApi?.recordAction?.(message, {
      detail: {
        title: "Possible duplicate",
        summary:
          decision === "view"
            ? "A saved creation was opened for comparison."
            : decision === "proceed" || decision === "move"
              ? "Wormholes found a similar creation, and the requested action continued."
              : "Wormholes found a similar creation, and no new copy was saved.",
      },
    });
  }

  function closeModal() {
    document.getElementById("duplicateCreationModal")?.classList.remove("open");
  }

  function resolvePending(decision) {
    const pending = state.pending;
    if (!pending) return;
    state.pending = null;
    closeModal();
    const result = {
      decision,
      candidate: pending.candidate,
      match: pending.match,
      matches: pending.matches,
    };
    logDecision(decision === "proceed" && pending.actionKind === "move" ? "move" : decision);
    pending.resolve(result);
    if (decision === "cancel") setTimeout(() => state.opener?.focus?.(), 0);
    state.opener = null;
  }

  function openReview(candidate, entries, options = {}) {
    const matches = findMatches(candidate, entries, options);
    if (!matches.length)
      return Promise.resolve({decision: "proceed", candidate, match: null, matches: []});
    return openReviewFromResult({candidate, match: matches[0], matches}, options);
  }

  function openBatchReview(candidates, entries, options = {}) {
    const result = findBatchMatch(candidates, entries, options);
    if (!result)
      return Promise.resolve({decision: "proceed", candidate: null, match: null, matches: []});
    return openReviewFromResult(result, options);
  }

  function openReviewFromResult(result, options = {}) {
    const modal = document.getElementById("duplicateCreationModal");
    if (!modal) return Promise.resolve({decision: "proceed", ...result});
    if (state.pending)
      state.pending.resolve({
        decision: "cancel",
        candidate: state.pending.candidate,
        match: state.pending.match,
        matches: state.pending.matches,
      });

    state.opener = options.opener || document.activeElement;
    const match = result.match;
    const candidateTitle =
      String(result.candidate?.title || "This creation").trim() || "This creation";
    const existingTitle =
      String(match?.existing?.title || "a saved creation").trim() || "a saved creation";
    const title = document.getElementById("duplicateCreationTitle");
    const text = document.getElementById("duplicateCreationText");
    const detail = document.getElementById("duplicateCreationDetail");
    const proceed = document.getElementById("saveDuplicateCreationBtn");
    if (title)
      title.textContent =
        match?.kind === "exact" ? "This may already exist" : "A Similar Creation Already Exists";
    if (text)
      text.textContent =
        match?.kind === "exact"
          ? `“${candidateTitle}” matches “${existingTitle}”.`
          : `“${candidateTitle}” is similar to “${existingTitle}”.`;
    if (detail)
      detail.textContent =
        result.matches.length > 1
          ? `${result.matches.length} possible matches found. Review one or continue anyway.`
          : "Review the saved creation or continue anyway.";
    if (proceed) proceed.textContent = options.actionLabel || "Save Anyway";

    return new Promise((resolve) => {
      state.pending = {
        resolve,
        candidate: result.candidate,
        match: result.match,
        matches: result.matches,
        actionKind: options.actionKind || "save",
      };
      modal.classList.add("open");
      setTimeout(() => document.getElementById("cancelDuplicateCreationBtn")?.focus(), 0);
    });
  }

  function install() {
    document
      .getElementById("cancelDuplicateCreationBtn")
      ?.addEventListener("click", () => resolvePending("cancel"));
    document
      .getElementById("viewDuplicateCreationBtn")
      ?.addEventListener("click", () => resolvePending("view"));
    document
      .getElementById("saveDuplicateCreationBtn")
      ?.addEventListener("click", () => resolvePending("proceed"));
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", install, {once: true});
  else install();

  global.WormholesDuplicateCreations = Object.freeze({
    normalizeText,
    canonicalTitle,
    creationCore,
    compare,
    findMatches,
    findBatchMatch,
    scanEntries,
    scanAppData,
    review: openReview,
    reviewBatch: openBatchReview,
    cancel() {
      resolvePending("cancel");
    },
    state,
  });
  return global.WormholesDuplicateCreations;
})(window);

const api = duplicateCreationsModuleApi;
