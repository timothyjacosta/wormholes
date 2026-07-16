'use strict';

const {test, expect} = require('@playwright/test');
const {openSelfContainedApp} = require('../support/self-contained-app');

test('a copied creation can be deleted from its target universe without a schema warning', async ({page}) => {
  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});

  const result = await page.evaluate(async () => {
    const createdAt = new Date().toISOString();
    universes = [
      {id:'source-universe', title:'Source', summary:'', bridges:[], createdAt, diskFolderName:'source'},
      {id:'target-universe', title:'Target', summary:'', bridges:[], createdAt, diskFolderName:'target'}
    ];
    if(!saveUniversesToStorage()) throw new Error('Could not save universe fixture.');
    if(!saveArchiveForUniverse('source-universe', [{
      id:'source-creation',
      title:'Source Creation',
      connections:[],
      bridges:[],
      createdAt
    }])) throw new Error('Could not save source fixture.');
    if(!saveArchiveForUniverse('target-universe', [{
      id:'existing-target-creation',
      title:'Existing Target Creation',
      connections:[],
      bridges:[],
      createdAt
    }])) throw new Error('Could not save target fixture.');

    enterUniverse('source-universe');
    const copied = await copyArchiveItemToUniverse('source-creation', 'target-universe');
    if(!copied) throw new Error('Copy did not complete.');
    const targetAfterCopy = readArchiveForUniverse('target-universe');
    const copiedRecord = targetAfterCopy.find(item => item.copiedFromUniverseId === 'source-universe');
    if(!copiedRecord) throw new Error('Copied record was not found.');

    enterUniverse('target-universe');
    await deleteEntry(copiedRecord.id);

    return {
      sourceIds:readArchiveForUniverse('source-universe').map(item => item.id),
      targetIds:readArchiveForUniverse('target-universe').map(item => item.id),
      errorOpen:document.getElementById('appErrorPanel')?.classList.contains('open') || false,
      copiedHadGroupIds:Object.prototype.hasOwnProperty.call(copiedRecord, 'groupIds')
    };
  });

  expect(result.sourceIds).toEqual(['source-creation']);
  expect(result.targetIds).toEqual(['existing-target-creation']);
  expect(result.errorOpen).toBe(false);
  expect(result.copiedHadGroupIds).toBe(false);
  expect(runtimeErrors).toEqual([]);
});
