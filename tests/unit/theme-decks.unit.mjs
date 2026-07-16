import assert from "node:assert/strict";
import fs from "node:fs";

const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  get length() {
    return store.size;
  },
  key(index) {
    return [...store.keys()][index] ?? null;
  },
  getItem(key) {
    return store.has(String(key)) ? store.get(String(key)) : null;
  },
  setItem(key, value) {
    store.set(String(key), String(value));
  },
  removeItem(key) {
    store.delete(String(key));
  },
  clear() {
    store.clear();
  },
};

const moduleUrl = new URL("../../scripts/modules/theme-decks.mjs", import.meta.url);
moduleUrl.searchParams.set("test", String(Date.now()));
const themeModule = await import(moduleUrl.href);
const api = globalThis.WormholesThemeDecks;

assert.ok(api, "Theme Deck API should install globally");
assert.equal(themeModule.BUILTIN_THEME_DECKS.length, 13, "there should be 13 built-in themes");

const titles = [];
for (const deck of themeModule.BUILTIN_THEME_DECKS) {
  assert.equal(deck.cards.what.length, 20, `${deck.title} should have 20 What cards`);
  assert.equal(deck.cards.attribute.length, 40, `${deck.title} should have 40 Attribute cards`);
  assert.equal(deck.cards.story.length, 20, `${deck.title} should have 20 Story cards`);
  titles.push(...deck.cards.what, ...deck.cards.attribute, ...deck.cards.story);
}
assert.equal(titles.length, 1040, "built-in themes should contain 1,040 cards");
assert.equal(new Set(titles).size, 1040, "every built-in card title should be unique");
assert.equal(api.activeIds().length, 13, "all built-in themes should be active by default");

assert.equal(api.setActiveIds(["builtin-far-realms"]), true);
const farDeck = api.deckById("builtin-far-realms");
for (const type of ["what", "attribute", "story"]) {
  const allowed = new Set(farDeck.cards[type]);
  for (let index = 0; index < 100; index += 1) {
    const result = api.chooseCard(type);
    assert.equal(result.themeId, "builtin-far-realms", "unchosen themes must never be queried");
    assert.ok(allowed.has(result.val), `result must come from the selected ${type} deck`);
  }
}

assert.equal(api.setActiveIds(["builtin-everyday-life", "builtin-folklore-fable"]), true);
let call = 0;
const selectedSecondTheme = api.chooseCard("what", {
  randomInt(maximum) {
    call += 1;
    return call === 1 ? maximum : 1;
  },
});
assert.equal(
  selectedSecondTheme.themeId,
  "builtin-folklore-fable",
  "theme selection should occur before card selection",
);

const prepared = api.prepareImportedState({
  version: 1,
  customDecks: [
    {
      id: "custom-test-theme",
      title: "Test Theme",
      description: "A test-only theme.",
      cards: {
        what: ["A test subject"],
        attribute: ["Carefully isolated"],
        story: ["A controlled test produces an uncontrolled result."],
      },
    },
  ],
  selectedThemeIds: ["custom-test-theme"],
});
assert.equal(api.writePreparedCustomDecks(prepared), true);
assert.equal(api.writePreparedSelection(prepared), true);
assert.equal(api.applyPreparedState(prepared, {notify: false}), true);
assert.deepEqual(api.activeIds(), ["custom-test-theme"]);
assert.equal(api.chooseCard("what").val, "A test subject");
assert.equal(api.chooseCard("attribute").val, "Carefully isolated");
assert.equal(api.chooseCard("story").val, "A controlled test produces an uncontrolled result.");

const exported = api.exportState();
assert.equal(exported.customDecks.length, 1);
assert.deepEqual(exported.selectedThemeIds, ["custom-test-theme"]);
assert.match(store.get(api.storageKeys.customDecks), /Test Theme/);
assert.match(store.get(api.storageKeys.selectedThemeIds), /custom-test-theme/);

assert.throws(
  () => api.prepareImportedState({customDecks: "bad", selectedThemeIds: []}),
  /missing customDecks or selectedThemeIds/i,
  "malformed theme backup data should be rejected",
);

const themeSource = fs.readFileSync(
  new URL("../../scripts/modules/theme-decks.mjs", import.meta.url),
  "utf8",
);
const generationSource = fs.readFileSync(
  new URL("../../scripts/modules/generation-controller.mjs", import.meta.url),
  "utf8",
);
assert.match(
  themeSource,
  /const themeSelectMarkupCache = new Map\(\)/,
  "Create suggestions should reuse cached option markup",
);
assert.match(
  themeSource,
  /let themePickerDraftIds = null/,
  "Theme picker choices should use a lightweight draft while the dialog is open",
);
assert.match(
  themeSource,
  /stageThemePickerSelection\([\s\S]*?themePickerDraftIds = next[\s\S]*?sameThemeSelection/,
  "Theme picker changes should stay in memory until the dialog closes",
);
assert.doesNotMatch(
  themeSource.match(/getElementById\("themePickerList"\)[\s\S]*?closeThemePickerBtn/)?.[0] || "",
  /renderThemeChips\(\)|toggleActiveTheme\(/,
  "Theme picker checkbox changes should not redraw the visible Create tab or write preferences",
);
assert.match(
  themeSource,
  /setActiveThemeIds\(draftIds, \{notify: false\}\)[\s\S]*?notifyThemeDecksChanged\("selection"/,
  "Theme picker choices should commit once when the dialog closes",
);
assert.match(
  themeSource,
  /select\.innerHTML = themeSelectMarkup\(normalized\)/,
  "Theme suggestion selects should be populated in one DOM update",
);
const initializeBody =
  themeSource.match(/function initializeThemeDeckUi\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
assert.doesNotMatch(
  initializeBody,
  /renderThemePicker\(\)/,
  "The hidden Theme picker should render only when opened",
);
assert.match(
  generationSource,
  /requestAnimationFrame\(refresh\)/,
  "Create suggestion rebuilding should wait until the picker has closed",
);

const themeCss = fs.readFileSync(new URL("../../styles/reskin.css", import.meta.url), "utf8");
assert.match(
  themeSource,
  /function themePickerContext\(trigger\)[\s\S]*?data-theme-context[\s\S]*?create[\s\S]*?generate/,
  "The Theme picker should remember whether it was opened from Generate or Create",
);
assert.match(
  themeSource,
  /setThemePickerDocumentState\(true, themePickerContext\(trigger\)\)/,
  "Opening the Theme picker should enable scroll isolation before the modal is shown",
);
assert.match(
  themeSource,
  /setThemePickerDocumentState\(false\)/,
  "Closing the Theme picker should restore the normal document rendering state",
);
assert.match(
  themeCss,
  /\.theme-picker-backdrop\s*\{[\s\S]*?backdrop-filter:\s*none\s*!important/,
  "The Theme picker should not continuously blur the heavy Create form while scrolling",
);
assert.match(
  themeCss,
  /\.theme-picker-modal\s*\{[\s\S]*?overflow:\s*hidden[\s\S]*?contain:\s*layout paint style/,
  "The styled modal shell should remain fixed while only its Theme list scrolls",
);
assert.match(
  themeCss,
  /\.theme-picker-list\s*\{[\s\S]*?overflow-y:\s*auto[\s\S]*?overscroll-behavior:\s*contain[\s\S]*?will-change:\s*scroll-position/,
  "The Theme list should have an isolated compositor-friendly scroll layer",
);
assert.match(
  themeCss,
  /html\.theme-picker-from-create #createTab \.create-grid\s*\{[\s\S]*?content-visibility:\s*hidden/,
  "Large Create suggestion controls should not be painted behind the open Theme picker",
);

console.log(
  "Theme Deck selection, isolation, custom persistence, archive coverage, and picker interaction and scroll-performance safeguards passed.",
);
