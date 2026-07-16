/* Wormholes Beta 250 tagging helpers.
   Owns shared tag-target selection, tag-key encoding, picker draft mutation,
   and tagged-image delegation without direct cross-controller globals. */

import {controllerServices} from "./controller-service-registry.mjs";

function activeTagTarget() {
  return activeVisionTagId
    ? controllerServices.getVisionItem(activeVisionTagId)
    : controllerServices.getLiteratureDoc(activeLiteratureTagId);
}

function activeTagHasUniverseTag(target, universeId) {
  return activeVisionTagId
    ? controllerServices.visionItemHasUniverseTag(target, universeId)
    : controllerServices.literatureDocHasUniverseTag(target, universeId);
}

function activeTagHasEntryTag(target, universeId, entryId) {
  return activeVisionTagId
    ? controllerServices.visionItemHasEntryTag(target, universeId, entryId)
    : controllerServices.literatureDocHasEntryTag(target, universeId, entryId);
}

function cssEscapeValue(value) {
  if (window.CSS && typeof CSS.escape === "function") return CSS.escape(String(value || ""));
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, (match) => `\\${match}`);
}

function handleTaggedImageThumbnailClick(event) {
  const thumb = event.target.closest?.(
    ".archive-vision-thumb, #visionLinksList .vision-link-thumb",
  );
  if (!thumb || thumb.disabled || thumb.getAttribute("aria-disabled") === "true") return;

  const homeUniverseId = thumb.dataset.homeUniverseId || currentUniverseId;
  const visionId = thumb.dataset.visionId || "";
  if (!visionId) return;

  event.preventDefault();
  event.stopPropagation();
  controllerServices.openVisionImageViewer(homeUniverseId, visionId);
}

function tagEntryKey(universeId, entryId) {
  return `${universeId}::${entryId}`;
}

function splitTagEntryKey(key) {
  const [universeId, entryId] = String(key || "").split("::");
  return {universeId, entryId};
}

function initializeTagPickerDraft(target) {
  stagedTagUniverseIds = new Set(target?.tags?.universes || []);
  stagedTagEntryKeys = new Set(
    (target?.tags?.entries || []).map((tag) => tagEntryKey(tag.universeId, tag.entryId)),
  );
  tagPickerHasUnsavedChanges = false;
}

function toggleDraftUniverseTag(universeId) {
  if (stagedTagUniverseIds.has(universeId)) stagedTagUniverseIds.delete(universeId);
  else stagedTagUniverseIds.add(universeId);
  tagPickerHasUnsavedChanges = true;
  controllerServices.renderLiteratureTagList();
}

function toggleDraftEntryTag(universeId, entryId) {
  const key = tagEntryKey(universeId, entryId);
  if (stagedTagEntryKeys.has(key)) stagedTagEntryKeys.delete(key);
  else stagedTagEntryKeys.add(key);
  tagPickerHasUnsavedChanges = true;
  controllerServices.renderLiteratureTagList();
}

const TAGGING_HELPERS = Object.freeze({
  activeTagTarget,
  activeTagHasUniverseTag,
  activeTagHasEntryTag,
  cssEscapeValue,
  handleTaggedImageThumbnailClick,
  tagEntryKey,
  splitTagEntryKey,
  initializeTagPickerDraft,
  toggleDraftUniverseTag,
  toggleDraftEntryTag,
});

export function installLegacyTaggingBindings(target = globalThis) {
  Object.assign(target, TAGGING_HELPERS);
  target.WormholesTaggingHelpers = TAGGING_HELPERS;
  return TAGGING_HELPERS;
}

if (typeof window !== "undefined") installLegacyTaggingBindings(window);

export {
  activeTagTarget,
  activeTagHasUniverseTag,
  activeTagHasEntryTag,
  cssEscapeValue,
  handleTaggedImageThumbnailClick,
  tagEntryKey,
  splitTagEntryKey,
  initializeTagPickerDraft,
  toggleDraftUniverseTag,
  toggleDraftEntryTag,
};
