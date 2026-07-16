const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { openCleanApp } = require('../support/app');

const fixtureDirectory = path.join(__dirname, '..', 'fixtures', 'schema-versions');
const fixtures = fs.readdirSync(fixtureDirectory)
  .filter(name => /^schema-v\d+\.json$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
  .map(fileName => JSON.parse(fs.readFileSync(path.join(fixtureDirectory, fileName), 'utf8')));

function expectCurrentShape(migrated, currentVersion){
  expect(migrated.schemaVersion).toBe(currentVersion);
  expect(Array.isArray(migrated.universes)).toBe(true);
  expect(migrated.universes.length).toBeGreaterThan(0);
  expect(migrated.bridgeNotes && typeof migrated.bridgeNotes).toBe('object');

  for(const universe of migrated.universes){
    expect(typeof universe.id).toBe('string');
    expect(universe.id.length).toBeGreaterThan(0);
    expect(typeof universe.title).toBe('string');
    expect(typeof universe.summary).toBe('string');
    expect(Array.isArray(universe.bridges)).toBe(true);
    expect(typeof universe.createdAt).toBe('string');
    expect(typeof universe.diskFolderName).toBe('string');

    const data = migrated.universeData[universe.id];
    expect(data && typeof data).toBe('object');
    expect(Array.isArray(data.archive)).toBe(true);
    expect(data.connectionNotes && typeof data.connectionNotes).toBe('object');
    expect(Array.isArray(data.literature)).toBe(true);
    expect(Array.isArray(data.vision)).toBe(true);

    for(const entry of data.archive){
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.title).toBe('string');
      expect(Array.isArray(entry.connections)).toBe(true);
      expect(Array.isArray(entry.bridges)).toBe(true);
      expect(typeof entry.createdAt).toBe('string');
      if(entry.kind === 'group'){
        expect(Array.isArray(entry.groupIds)).toBe(true);
        expect(Object.prototype.hasOwnProperty.call(entry, 'children')).toBe(false);
      }
    }

    for(const doc of data.literature){
      expect(typeof doc.id).toBe('string');
      expect(typeof doc.title).toBe('string');
      expect(doc.tags && Array.isArray(doc.tags.universes)).toBe(true);
      expect(Array.isArray(doc.tags.entries)).toBe(true);
      expect(typeof doc.createdAt).toBe('string');
      expect(typeof doc.updatedAt).toBe('string');
      if(doc.kind === 'literatureGroup'){
        expect(doc.fileType).toBe('group');
        expect(Array.isArray(doc.groupIds)).toBe(true);
      }
    }

    for(const item of data.vision){
      expect(typeof item.id).toBe('string');
      expect(typeof item.title).toBe('string');
      expect(item.tags && Array.isArray(item.tags.universes)).toBe(true);
      expect(Array.isArray(item.tags.entries)).toBe(true);
      expect(typeof item.dataStoreKey).toBe('string');
      expect(typeof item.createdAt).toBe('string');
    }
  }
}

test.describe('supported schema migration fixtures', () => {
  test('migrates every supported schema version through the production migration path', async ({ page }) => {
    const runtimeErrors = await openCleanApp(page);
    expect(runtimeErrors).toEqual([]);

    const manifest = await page.evaluate(() => ({
      current:window.WormholesSchemaVersions.current,
      supported:Array.from(window.WormholesSchemaVersions.supported)
    }));
    expect(fixtures.map(fixture => fixture.schemaVersion)).toEqual(manifest.supported);

    for(const fixture of fixtures){
      const migrated = await page.evaluate(source => {
        const detached = JSON.parse(JSON.stringify(source));
        return migrateWormholesAppDataImport(detached);
      }, fixture);
      expectCurrentShape(migrated, manifest.current);
      expect(migrated.universes.some(universe => universe.title === `Version ${['Zero','One','Two','Three','Four'][fixture.schemaVersion]} Realm`)).toBe(true);
    }

    const futureFailure = await page.evaluate(current => {
      try{
        migrateWormholesAppDataImport({
          format:'Wormholes App Data Export',
          schemaVersion:current + 1,
          universes:[],
          universeData:{}
        });
        return '';
      } catch(error){
        return error?.message || String(error);
      }
    }, manifest.current);
    expect(futureFailure).toMatch(/newer Wormholes version/);
  });
});
