const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'Wormholes_Beta_301.html'), 'utf8');
const sourceFiles = [
  'scripts/modules/accessibility.mjs',
  'scripts/modules/app-core.mjs',
  'scripts/modules/bridges-controller.mjs',
  'scripts/modules/connections-controller.mjs',
  'scripts/modules/data-portability-controller.mjs',
  'scripts/modules/literature-controller.mjs',
  'scripts/modules/literature-persistence-helpers.mjs',
  'scripts/modules/onboarding.mjs',
  'scripts/modules/recovery-snapshots.mjs',
  'scripts/modules/storage-capacity.mjs',
  'scripts/modules/storage-dashboard.mjs',
  'scripts/modules/storage-facade.mjs',
  'scripts/modules/storage-recovery.mjs',
  'scripts/modules/undo.mjs',
  'scripts/modules/vision-board-controller.mjs',
  'scripts/modules/write-ahead-journal.mjs',
];
const source = sourceFiles.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');

for (const expected of [
  'Everything can be connected',
  'Start Over',
  'Name Your Creation',
  'A Similar Creation Already Exists',
  'Remove All Connections',
  'Choose Something to Connect',
  'Add Connections',
  'Connection Details',
  'Save Details',
  'Add Files',
  'New Document',
  'Save Document',
  'Add Literature Files',
  'Text Size',
  'Add Images',
  'Add to Vision Board',
  'Open the Linked Creation?',
  'Download Backup',
  'Restore from Backup',
  'Restore Points',
  'Back Up Folder',
  'Choose Backup Folder',
  'Recent Activity',
  'Delete All Wormholes Data',
  'Replace all current data?',
  'Replace All Data',
]) {
  assert.ok(html.includes(expected), `expected current user-facing phrase: ${expected}`);
}

for (const outdated of [
  'Universe Builder, Archive, & Connector',
  'Clear Draft',
  'Title this creation',
  '>Clear Connections<',
  'Clear map links?',
  'Choose Connection Target',
  '>Create Connections<',
  'Connection Note',
  'Upload literature files',
  '>Save Literature<',
  '>New Literature<',
  '>Upload Literature<',
  'Literature order',
  'Literature text size',
  '>Upload Image<',
  'Upload to Vision Board',
  'Board order',
  'Open Tagged Archive?',
  '>Storage details<',
  'Download App Backup',
  'Restore App Backup',
  'Recovery Points',
  'Back Up Local Folder',
  'Use Backup Folder',
  '>Activity Log<',
  'Clear All Wormholes Data',
  'Replace current app data?',
  '>Replace App Data<',
]) {
  assert.ok(!html.includes(outdated), `outdated HTML phrase remains: ${outdated}`);
}

for (const outdated of [
  'Choose connection target:',
  'Delete Connection Note',
  'Connection note saved',
  'Connection note deleted',
  'Connection note restored',
  'Connections cleared',
  'Upload images for visual reference.',
  'Showing board order while moving images.',
  'Could not save Vision Board order',
  'Could not save Literature',
  'This Literature could not be saved.',
  'Literature uploaded',
  'No recovery snapshots have been created yet.',
  'Recovery snapshots could not be loaded.',
  'Recovery snapshot restored',
  'notification or Log',
]) {
  assert.ok(!source.includes(outdated), `outdated runtime phrase remains: ${outdated}`);
}

for (const expected of [
  'Choose something to connect:',
  'Delete Connection Details',
  'Connection details saved',
  'Connections removed',
  'Add images for visual reference.',
  'Showing Custom Order while moving images.',
  'Could not save image order',
  'Could not save document',
  'Files added',
  'No restore points have been created yet.',
  'Restore point restored',
  'notification or Recent Activity',
]) {
  assert.ok(source.includes(expected), `expected current runtime phrase: ${expected}`);
}

console.log('User-facing language consistency checks passed.');
