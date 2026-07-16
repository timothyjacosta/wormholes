const { test, expect } = require('@playwright/test');
const { openCleanApp } = require('../support/app');

function fakeFolderHandle(existingNames = []){
  const files = new Set(existingNames);
  return {
    async getFileHandle(name, options = {}){
      if(files.has(name) || options.create){
        files.add(name);
        return { name, kind:'file' };
      }
      const error = new Error(`File not found: ${name}`);
      error.name = 'NotFoundError';
      throw error;
    }
  };
}

test.describe('folder sync helper behavior', () => {
  test('reuses an existing folder-backed filename instead of creating a duplicate on reconnect', async ({ page }) => {
    await openCleanApp(page);

    const fileName = await page.evaluate(async ({ existingName }) => {
      const files = new Set([existingName]);
      const folder = {
        async getFileHandle(name, options = {}){
          if(files.has(name) || options.create){
            files.add(name);
            return { name, kind:'file' };
          }
          const error = new Error(`File not found: ${name}`);
          error.name = 'NotFoundError';
          throw error;
        }
      };

      return await folderMigrationFileName(
        { title:'Existing Creation', folderFileName: existingName, storage:'folder' },
        folder,
        'Existing Creation',
        '.docx',
        { force:true, preserveExistingFolderFileNames:true }
      );
    }, { existingName:'Existing Creation.docx' });

    expect(fileName).toBe('Existing Creation.docx');
  });

  test('generates a collision filename only when the stored folder filename is missing', async ({ page }) => {
    await openCleanApp(page);

    const fileName = await page.evaluate(async () => {
      const files = new Set(['Existing Creation.docx']);
      const folder = {
        async getFileHandle(name, options = {}){
          if(files.has(name) || options.create){
            files.add(name);
            return { name, kind:'file' };
          }
          const error = new Error(`File not found: ${name}`);
          error.name = 'NotFoundError';
          throw error;
        }
      };

      return await folderMigrationFileName(
        { title:'Existing Creation', folderFileName:'Missing Old Name.docx', storage:'folder' },
        folder,
        'Existing Creation',
        '.docx',
        { force:true, preserveExistingFolderFileNames:true }
      );
    });

    expect(fileName).toMatch(/^Existing Creation-\d+\.docx$/);
  });

  test('normalizes folder-migration options with duplicate-prevention enabled by default', async ({ page }) => {
    await openCleanApp(page);

    const normalized = await page.evaluate(() => ({
      fromBoolean: normalizeFolderMigrationOptions(true),
      fromObject: normalizeFolderMigrationOptions({ force:false })
    }));

    expect(normalized.fromBoolean).toEqual({ force:true, preserveExistingFolderFileNames:true });
    expect(normalized.fromObject).toEqual({ force:false, preserveExistingFolderFileNames:true });
  });
});
