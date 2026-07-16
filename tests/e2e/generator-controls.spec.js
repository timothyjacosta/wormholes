const fs = require('node:fs');
const path = require('node:path');
const {test, expect} = require('@playwright/test');

const appRoot = path.resolve(__dirname, '../..');
const shellName = fs.readdirSync(appRoot)
  .filter(file => /^Wormholes_Beta_\d+\.served\.html$/.test(file))
  .sort((a,b) => a.localeCompare(b, undefined, {numeric:true}))
  .pop();
const shell = fs.readFileSync(path.join(appRoot, shellName), 'utf8');
const styles = [
  fs.readFileSync(path.join(appRoot, 'styles/wormholes.css'), 'utf8'),
  fs.readFileSync(path.join(appRoot, 'styles/reskin.css'), 'utf8'),
].join('\n');
const scripts = [
  'scripts/wormholes-controller-services.js',
  'scripts/wormholes-generation-versioning.js',
  'scripts/wormholes-activity-log.js',
  'scripts/wormholes-undo.js',
  'scripts/generation.js',
  'scripts/wormholes-shell-interface.js',
].map(relative => fs.readFileSync(path.join(appRoot, relative), 'utf8'));

function selfContainedShell(){
  return shell
    .replace(/<meta[^>]+http-equiv="Content-Security-Policy"[^>]*>/i, '')
    .replace(/<link href="styles\/wormholes\.css" rel="stylesheet"\/>/, '')
    .replace(/<link href="styles\/reskin\.css" rel="stylesheet"\/>/, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace('</head>', `<style>${styles}</style></head>`);
}

async function currentValues(page){
  return page.locator('.generation-result-copy').evaluateAll(rows =>
    rows.map(row => row.textContent.trim())
  );
}

test('compact generator locks, rerolls, Quick Roll, activity history, and undo work together', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if(message.type() === 'error') errors.push(message.text()); });

  await page.setViewportSize({width:1280, height:900});
  await page.setContent(selfContainedShell(), {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    const store = new Map();
    Object.defineProperty(window, 'localStorage', {
      configurable:true,
      value:{
        getItem(key){ return store.has(key) ? store.get(key) : null; },
        setItem(key, value){ store.set(key, String(value)); },
        removeItem(key){ store.delete(key); },
        clear(){ store.clear(); },
      }
    });
    window.PARTIAL_FOLDER_SAVE_MESSAGE = 'Some files could not be saved.';
    window.readStorageWarningState = () => ({});
    const toastState = {savedToastLastMessage:'', savedToastLastAt:0, savedToastTimer:0};
    window.readToastRuntimeState = () => toastState;
    window.writeToastRuntimeState = changes => Object.assign(toastState, changes || {});
    window.clearRecentStorageFailure = () => {};
    window.clearRecentFolderSaveWarning = () => {};
    window.importedAppErrorsApi = null;
    window.setAppButtonDisabled = (element, disabled) => { if(element) element.disabled = Boolean(disabled); };
    window.syncAllAppButtonStates = () => {};
    window.getCurrentUniverse = () => ({id:'u1', title:'Generator Test'});
    window.currentUniverseId = 'u1';
  });

  for(const content of scripts) await page.addScriptTag({content});

  await page.evaluate(() => {
    document.getElementById('homeScreen')?.classList.remove('active');
    document.getElementById('appScreen')?.classList.add('active');
    document.getElementById('currentTab').hidden = false;
    document.getElementById('currentTab').classList.add('active');
    const skip = document.getElementById('skipRollAnimationToggle');
    skip.checked = true;
    window.handleSkipRollAnimationToggle({target:skip});
    document.getElementById('quickFullRollBtn').addEventListener('click', window.quickFullRoll);
    document.getElementById('newBtn').addEventListener('click', window.newCreation);
    document.getElementById('result').addEventListener('click', event => {
      const button = event.target.closest('[data-generation-action][data-generation-field]');
      if(!button || button.disabled) return;
      const field = button.dataset.generationField;
      if(button.dataset.generationAction === 'reroll') window.rerollGenerationField(field);
      if(button.dataset.generationAction === 'lock') window.toggleGenerationFieldLock(field);
    });
    window.renderCurrent();
  });

  await page.locator('#quickFullRollBtn').click();
  await expect(page.locator('.generation-result-row')).toHaveCount(4);
  await expect(page.locator('.generation-reroll-button')).toHaveCount(4);
  await expect(page.locator('.generation-lock-button')).toHaveCount(4);
  await expect(page.locator('.generation-field-button').first()).toHaveCSS('color', 'rgb(18, 53, 91)');

  const iconStyles = await page.evaluate(() => {
    const reroll = document.querySelector('.generation-reroll-icon');
    const lock = document.querySelector('.generation-lock-icon');
    const lockPath = lock.querySelector('path');
    const lockRect = lock.querySelector('rect');
    const rerollStyle = getComputedStyle(reroll);
    const lockStyle = getComputedStyle(lock);
    const lockPathStyle = getComputedStyle(lockPath);
    const lockRectStyle = getComputedStyle(lockRect);
    return {
      rerollColor: rerollStyle.color,
      lockColor: lockStyle.color,
      lockStroke: lockStyle.stroke,
      lockFill: lockStyle.fill,
      lockPathStroke: lockPathStyle.stroke,
      lockPathFill: lockPathStyle.fill,
      lockRectStroke: lockRectStyle.stroke,
      lockRectFill: lockRectStyle.fill,
      rerollFontSize: Number.parseFloat(rerollStyle.fontSize),
      lockWidth: lock.getBoundingClientRect().width,
      lockHeight: lock.getBoundingClientRect().height,
    };
  });
  expect(iconStyles.rerollColor).toBe('rgb(18, 53, 91)');
  expect(iconStyles.lockColor).toBe(iconStyles.rerollColor);
  expect(iconStyles.lockStroke).toBe(iconStyles.rerollColor);
  expect(iconStyles.lockFill).toBe('none');
  expect(iconStyles.lockPathStroke).toBe(iconStyles.rerollColor);
  expect(iconStyles.lockPathFill).toBe('none');
  expect(iconStyles.lockRectStroke).toBe(iconStyles.rerollColor);
  expect(iconStyles.lockRectFill).toBe(iconStyles.rerollColor);
  expect(iconStyles.rerollFontSize).toBeGreaterThanOrEqual(21);
  expect(iconStyles.lockWidth).toBeGreaterThanOrEqual(19);
  expect(iconStyles.lockHeight).toBeGreaterThanOrEqual(19);

  const controlSizes = await page.locator('.generation-field-button').evaluateAll(buttons =>
    buttons.map(button => {
      const rect = button.getBoundingClientRect();
      return {width:rect.width, height:rect.height};
    })
  );
  for(const size of controlSizes){
    expect(size.width).toBeLessThanOrEqual(32);
    expect(size.height).toBeLessThanOrEqual(32);
  }

  const before = await currentValues(page);
  const whatLock = page.locator('[data-generation-action="lock"][data-generation-field="what"]');
  const attr2Lock = page.locator('[data-generation-action="lock"][data-generation-field="attr2"]');
  await whatLock.focus();
  await page.keyboard.press('Space');
  await attr2Lock.click();
  await expect(whatLock).toHaveAttribute('aria-pressed', 'true');
  await expect(whatLock).toHaveAttribute('aria-label', 'Unlock What');
  await expect(page.locator('[data-generation-action="reroll"][data-generation-field="what"]')).toBeDisabled();
  await expect(page.locator('[data-generation-action="reroll"][data-generation-field="attr2"]')).toBeDisabled();

  await page.locator('#quickFullRollBtn').click();
  const after = await currentValues(page);
  expect(after[0]).toBe(before[0]);
  expect(after[2]).toBe(before[2]);
  expect(after[1]).not.toBe(before[1]);
  expect(after[3]).not.toBe(before[3]);

  const undoToast = page.locator('#savedToast');
  await expect(undoToast).toContainText('Quick Roll changed 2 fields');
  await expect(undoToast.locator('.undo-toast-button')).toBeVisible();

  const activityItems = await page.evaluate(() => JSON.parse(localStorage.getItem('wormholes_activity_log_v1') || '[]'));
  expect(activityItems.some(item => item.message === 'Quick Roll changed 2 fields')).toBe(true);

  await undoToast.locator('.undo-toast-button').click();
  await expect.poll(() => currentValues(page)).toEqual(before);
  await expect(whatLock).toHaveAttribute('aria-pressed', 'true');
  await expect(attr2Lock).toHaveAttribute('aria-pressed', 'true');

  await attr2Lock.click();
  const beforeAttr2 = (await currentValues(page))[2];
  await page.locator('[data-generation-action="reroll"][data-generation-field="attr2"]').click();
  const afterAttr2 = (await currentValues(page))[2];
  expect(afterAttr2).not.toBe(beforeAttr2);
  await expect(undoToast).toContainText('Re-rolled Attribute 2');
  await undoToast.locator('.undo-toast-button').click();
  await expect.poll(async () => (await currentValues(page))[2]).toBe(beforeAttr2);

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
