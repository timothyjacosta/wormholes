const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { createUniverse, archiveQuickRollCreation } = require('../support/app');
const { openSelfContainedApp } = require('../support/self-contained-app');

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoAccessibilityViolations(page, label){
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  const violations = results.violations.map(violation => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.slice(0, 5).map(node => ({
      target: node.target,
      summary: node.failureSummary
    }))
  }));

  expect(violations, `${label} accessibility violations`).toEqual([]);
}

test.describe('automated accessibility scans', () => {
  test('home and primary universe tabs meet automated WCAG checks', async ({ page }) => {
    await openSelfContainedApp(page, {inlineStyles:true});
    await expectNoAccessibilityViolations(page, 'Home');

    await createUniverse(page, 'Accessibility Universe');
    await expectNoAccessibilityViolations(page, 'Create tab');

    for(const [buttonId, label] of [
      ['archiveTabBtn', 'Archive'],
      ['literatureTabBtn', 'Literature'],
      ['visionTabBtn', 'Vision Board']
    ]){
      await page.locator(`#${buttonId}`).click();
      await expectNoAccessibilityViolations(page, label);
    }
  });

  test('global search, settings, and Literature editor meet automated WCAG checks', async ({ page }) => {
    await openSelfContainedApp(page, {inlineStyles:true});
    await createUniverse(page, 'Dialog Accessibility Universe');

    await page.locator('#globalSearchBtn').click();
    await expect(page.locator('#globalSearchModal')).toHaveClass(/open/);
    await expectNoAccessibilityViolations(page, 'Global Search');
    await page.keyboard.press('Escape');

    await page.locator('#settingsGearBtn').click();
    await expect(page.locator('#settingsPanel')).toBeVisible();
    await expectNoAccessibilityViolations(page, 'Settings');

    await page.locator('#settingsStorageToggle').click();
    await expectNoAccessibilityViolations(page, 'Expanded Storage settings');
    await page.locator('#storageUsageDetailsBtn').click();
    await expect(page.locator('#storageUsageDashboardModal')).toHaveClass(/open/);
    await expect(page.locator('#storageUsageDashboardStatus')).toHaveText('Storage usage updated.');
    await expectNoAccessibilityViolations(page, 'Storage Usage dashboard');
    await page.locator('#closeStorageUsageDashboardBtn').click();
    await expect(page.locator('#settingsPanel')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.locator('#literatureTabBtn').click();
    await page.locator('#createLiteratureBtn').click();
    await expect(page.locator('#literatureEditor')).toBeVisible();
    await expectNoAccessibilityViolations(page, 'Literature editor');
  });

  test('Connections, Manage Bridges, and Map List View meet automated WCAG checks', async ({ page }) => {
    await openSelfContainedApp(page, {inlineStyles:true});
    await createUniverse(page, 'Map Accessibility Universe');
    await archiveQuickRollCreation(page, 'Accessible Map Item');

    await page.locator('#connectionsBtn').click();
    await expect(page.locator('#connectionsScreen')).toBeVisible();
    await expectNoAccessibilityViolations(page, 'Connections map');

    await page.locator('[data-map-list-scope="connections"]').click();
    await expect(page.locator('#mapListViewModal')).toHaveClass(/open/);
    await expectNoAccessibilityViolations(page, 'Connections Map List View');
    await page.keyboard.press('Escape');
    await expect(page.locator('#mapListViewModal')).not.toHaveClass(/open/);

    await page.locator('#homeBtn').click();
    await page.locator('#manageWormholesBtn').click();
    await expect(page.locator('#wormholesModal')).toHaveClass(/open/);
    await expectNoAccessibilityViolations(page, 'Manage Bridges');

    await page.locator('[data-map-list-scope="wormholes"]').click();
    await expect(page.locator('#mapListViewModal')).toHaveClass(/open/);
    await expectNoAccessibilityViolations(page, 'Bridge Map List View');
    await page.keyboard.press('Escape');
    await expect(page.locator('#mapListViewModal')).not.toHaveClass(/open/);
  });
});
