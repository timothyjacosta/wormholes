const fs = require('node:fs');
const path = require('node:path');
const {test, expect} = require('@playwright/test');

const appRoot = path.resolve(__dirname, '../..');
const shellPath = path.join(appRoot, 'Wormholes_Beta_301.served.html');
const shell = fs.readFileSync(shellPath, 'utf8');
const styles = [
  fs.readFileSync(path.join(appRoot, 'styles/wormholes.css'), 'utf8'),
  fs.readFileSync(path.join(appRoot, 'styles/reskin.css'), 'utf8'),
].join('\n');

function selfContainedShell(){
  return shell
    .replace(/<meta[^>]+http-equiv="Content-Security-Policy"[^>]*>/i, '')
    .replace(/<link href="styles\/wormholes\.css" rel="stylesheet"\/>/, '')
    .replace(/<link href="styles\/reskin\.css" rel="stylesheet"\/>/, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace('</head>', `<style>${styles}</style></head>`);
}

const panes = [null, 'currentTab', 'createTab', 'archiveTab', 'literatureTab', 'visionTab'];

for(const width of [320, 360, 480, 600, 700, 800, 900, 1024, 1180, 1440]){
  test(`desktop shell reflows without horizontal scrolling at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height:900});
    await page.setContent(selfContainedShell(), {waitUntil:'domcontentloaded'});

    for(const pane of panes){
      await page.evaluate((activePane) => {
        const home = document.getElementById('homeScreen');
        const app = document.getElementById('appScreen');
        home?.classList.toggle('active', !activePane);
        app?.classList.toggle('active', Boolean(activePane));
        document.querySelectorAll('.tab-pane').forEach((element) => {
          const active = element.id === activePane;
          element.classList.toggle('active', active);
          element.hidden = !active;
        });
        const universeLabel = document.getElementById('currentUniverseLabel');
        if(universeLabel){
          universeLabel.textContent = 'The Extremely Long Test Universe Name That Must Wrap Comfortably';
        }
      }, pane);

      const layout = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const escaped = [...document.querySelectorAll('body *')].filter((element) => {
          const style = getComputedStyle(element);
          if(style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0){
            return false;
          }
          if(element.closest('#connectionsMapWrap, #wormholesMapWrap, .vision-board-canvas')){
            return false;
          }
          const rect = element.getBoundingClientRect();
          if(rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.top > innerHeight){
            return false;
          }
          return rect.left < -1 || rect.right > viewportWidth + 1;
        });
        const sideScrollers = [...document.querySelectorAll('body *')].filter((element) => {
          const style = getComputedStyle(element);
          if(!['auto', 'scroll'].includes(style.overflowX)) return false;
          if(element.closest('#connectionsMapWrap, #wormholesMapWrap, .vision-board-canvas')) return false;
          return element.scrollWidth > element.clientWidth + 1;
        });
        return {
          bodyScrollWidth:document.body.scrollWidth,
          documentScrollWidth:document.documentElement.scrollWidth,
          viewportWidth,
          escaped:escaped.length,
          sideScrollers:sideScrollers.length,
        };
      });

      expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(layout.escaped).toBe(0);
      expect(layout.sideScrollers).toBe(0);
    }
  });
}
