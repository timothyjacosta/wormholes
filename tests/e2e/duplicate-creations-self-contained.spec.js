const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');

test('creation duplicate warning allows review, cancel, and save anyway', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});

  await page.evaluate(() => {
    const universe = {id:makeId(), title:'Duplicate Test', summary:'', bridges:[], createdAt:new Date().toISOString()};
    universe.diskFolderName = stableUniverseFolderName(universe);
    universes.push(universe);
    saveUniversesToStorage();
    enterUniverse(universe.id);
    archiveEntries = [{
      id:makeId(),
      title:'Grey Harbour',
      what:{val:'A place'},
      attr1:{val:'Fogbound'},
      attr2:{val:'Remote'},
      pressure:{val:'Two or more factions claim ownership of it.'},
      connections:[], bridges:[], createdAt:new Date().toISOString(), source:'manual'
    }];
    saveArchiveToStorage();
    renderArchive();
    switchTab('create');

    const values = {
      manualTitle:'Gray Harbor',
      manualWhatCustom:'A place',
      manualAttr1Custom:'Fogbound',
      manualAttr2Custom:'Remote',
      manualStoryCustom:'Two or more factions claim ownership of it.'
    };
    ['manualWhat', 'manualAttr1', 'manualAttr2', 'manualStory'].forEach(id => {
      document.getElementById(id).value = '__custom__';
      document.getElementById(`${id}Custom`).classList.add('open');
    });
    Object.entries(values).forEach(([id, value]) => {
      document.getElementById(id).value = value;
      document.getElementById(id).dispatchEvent(new Event('input', {bubbles:true}));
    });
    updateManualButtons();
  });

  await page.getByRole('button', {name:/Archive Creation/}).last().click();
  await expect(page.locator('#duplicateCreationModal')).toHaveClass(/open/);
  await expect(page.locator('#duplicateCreationText')).toContainText('Gray Harbor');
  await expect(page.locator('#duplicateCreationText')).toContainText('Grey Harbour');
  expect(await page.evaluate(() => archiveEntries.filter(entry => entry.kind !== 'group').length)).toBe(1);

  await page.getByRole('button', {name:'View Existing'}).click();
  await expect(page.locator('#archiveTab')).toHaveClass(/active/);
  await expect(page.locator('#archiveList .entry.open')).toContainText('Grey Harbour');

  await page.evaluate(() => switchTab('create'));
  await page.getByRole('button', {name:/Archive Creation/}).last().click();
  await page.getByRole('button', {name:'Go Back'}).click();
  expect(await page.evaluate(() => archiveEntries.filter(entry => entry.kind !== 'group').length)).toBe(1);

  await page.getByRole('button', {name:/Archive Creation/}).last().click();
  await page.getByRole('button', {name:'Save Anyway'}).click();
  await expect.poll(() => page.evaluate(() => archiveEntries.filter(entry => entry.kind !== 'group').length)).toBe(2);
  expect(await page.evaluate(() => WormholesActivityLog.state.items.some(item => item.message === 'Possible duplicate saved anyway'))).toBe(true);

  const falsePositiveCount = await page.evaluate(() => WormholesDuplicateCreations.findMatches({
    id:'candidate', title:'The Garden', what:{val:'A person'}, attr1:{val:'Kind'}, attr2:{val:'Young'}, pressure:{val:'It seeks a home'}
  }, [{
    id:'existing', title:'The Gate', what:{val:'A place'}, attr1:{val:'Ancient'}, attr2:{val:'Stone'}, pressure:{val:'It opens at dusk'}
  }]).length);
  expect(falsePositiveCount).toBe(0);
  expect(runtimeErrors).toEqual([]);
});
