const path = require("node:path");
const {test, expect} = require("@playwright/test");

const appRoot = path.resolve(__dirname, "../..");

function pickerHarness() {
  return `<!doctype html><html><body>
    <main id="appScreen" class="app-screen active">
      <section id="currentTab" class="tab-pane" hidden>
        <div class="theme-bar" data-theme-context="generate">
          <button data-open-theme-picker id="generateThemeButton" type="button">Choose Themes</button>
        </div>
      </section>
      <section id="createTab" class="tab-pane active">
        <div class="create-panel">
          <h2>Create Manually</h2>
          <div class="theme-bar" data-theme-context="create">
            <button data-open-theme-picker id="createThemeButton" type="button">Choose Themes</button>
          </div>
          <div class="create-grid">
            <select id="manualWhat"></select>
            <select id="manualAttr1"></select>
            <select id="manualAttr2"></select>
            <select id="manualStory"></select>
          </div>
        </div>
      </section>
    </main>
    <div data-theme-chip-list hidden></div><span data-theme-active-count hidden></span>
    <div id="themePickerModal" class="modal-backdrop theme-picker-backdrop" role="dialog">
      <div class="modal theme-picker-modal">
        <h2>Choose Themes</h2>
        <p>Select themes.</p>
        <div id="themePickerList" class="theme-picker-list"></div>
        <div class="theme-picker-custom-actions">
          <button id="addCustomThemeBtn" type="button">Add Custom Theme</button>
          <button id="manageCustomThemesBtn" type="button">Manage Custom Themes</button>
        </div>
        <div class="modal-actions"><button id="closeThemePickerBtn" type="button">Done</button></div>
      </div>
    </div>
    <div id="themeManagerModal">
      <button id="closeThemeManagerBtn"></button><select id="themeManagerDeckSelect"></select>
      <button id="newCustomThemeBtn"></button><button id="importThemeBtn"></button>
      <input id="themeImportInput"><input id="themeManagerTitle"><textarea id="themeManagerDescription"></textarea>
      <div id="themeManagerCounts"></div><select id="newThemeCardType"></select><input id="newThemeCardText">
      <button id="addThemeCardBtn"></button><select id="themeBulkType"></select><textarea id="themeBulkCards"></textarea>
      <button id="addThemeBulkBtn"></button><select id="themeManagerFilter"><option value="all">All</option></select>
      <input id="themeManagerSearch"><div id="themeManagerCardList"></div><div id="themeManagerStatus"></div>
      <button id="deleteThemeBtn"></button><button id="duplicateThemeBtn"></button>
      <button id="exportThemeBtn"></button><button id="saveThemeBtn"></button>
    </div>
    <div id="themeDeleteConfirmModal"><div id="themeDeleteConfirmText"></div>
      <button id="cancelThemeDeleteBtn"></button><button id="confirmThemeDeleteBtn"></button>
    </div>
  </body></html>`;
}

async function loadPicker(page) {
  await page.setContent(pickerHarness());
  await page.evaluate(() => {
    const store = new Map();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
        setItem: (key, value) => store.set(String(key), String(value)),
        removeItem: (key) => store.delete(String(key)),
        clear: () => store.clear(),
      },
    });
  });
  await page.addStyleTag({path: path.join(appRoot, "styles/wormholes.css")});
  await page.addStyleTag({path: path.join(appRoot, "styles/reskin.css")});
  await page.addScriptTag({path: path.join(appRoot, "scripts/wormholes-theme-decks.js")});
  await page.evaluate(() => {
    const api = window.WormholesThemeDecks;
    api.initializeUi();
    api.populateSelect("manualWhat", "what");
    api.populateSelect("manualAttr1", "attribute");
    api.populateSelect("manualAttr2", "attribute");
    api.populateSelect("manualStory", "story");
  });
}

test("Create Theme picker isolates its scroll layer from the large Create menus", async ({
  page,
}) => {
  await loadPicker(page);
  await page.getByRole("button", {name: "Choose Themes"}).last().click();

  const state = await page.evaluate(() => ({
    rootClass: document.documentElement.className,
    bodyClass: document.body.className,
    listOverflow: getComputedStyle(document.getElementById("themePickerList")).overflowY,
    modalOverflow: getComputedStyle(document.querySelector(".theme-picker-modal")).overflowY,
    backdropFilter: getComputedStyle(document.getElementById("themePickerModal")).backdropFilter,
    createVisibility: getComputedStyle(document.querySelector(".create-grid")).contentVisibility,
    optionCounts: [...document.querySelectorAll(".create-grid select")].map(
      (select) => select.options.length,
    ),
  }));

  expect(state.rootClass).toContain("theme-picker-from-create");
  expect(state.bodyClass).toContain("theme-picker-from-create");
  expect(state.listOverflow).toBe("auto");
  expect(state.modalOverflow).toBe("hidden");
  expect(state.backdropFilter).toBe("none");
  expect(state.createVisibility).toBe("hidden");
  expect(state.optionCounts).toEqual([262, 522, 522, 262]);

  const list = page.locator("#themePickerList");
  await list.hover();
  await page.mouse.wheel(0, 240);
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator(".theme-picker-modal").evaluate((element) => element.scrollTop)).toBe(
    0,
  );
  expect(await page.evaluate(() => document.scrollingElement.scrollTop)).toBe(0);

  await page.getByRole("button", {name: "Done"}).click();
  await expect(page.locator("#themePickerModal")).not.toHaveClass(/open/);
  expect(await page.evaluate(() => document.documentElement.className)).not.toContain(
    "theme-picker-open",
  );
  expect(
    await page
      .locator(".create-grid")
      .evaluate((element) => getComputedStyle(element).contentVisibility),
  ).toBe("visible");
});

test("Generate Theme picker uses the same isolated list without suspending Create", async ({
  page,
}) => {
  await loadPicker(page);
  await page.evaluate(() => {
    const current = document.getElementById("currentTab");
    const create = document.getElementById("createTab");
    current.hidden = false;
    current.classList.add("active");
    create.hidden = true;
    create.classList.remove("active");
  });
  await page.locator("#generateThemeButton").click();

  expect(await page.evaluate(() => document.documentElement.className)).toContain(
    "theme-picker-open",
  );
  expect(await page.evaluate(() => document.documentElement.className)).not.toContain(
    "theme-picker-from-create",
  );

  const list = page.locator("#themePickerList");
  await list.hover();
  await page.mouse.wheel(0, 240);
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator(".theme-picker-modal").evaluate((element) => element.scrollTop)).toBe(
    0,
  );
});
