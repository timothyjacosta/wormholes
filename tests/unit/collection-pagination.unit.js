const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const context = {console, Math, Number, Array, Object, Set, Map, Symbol, String, TypeError, URL, location:{href:'https://wormholes.example/'}, window:null};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const root = path.resolve(__dirname, '..', '..');
vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'wormholes-safe-render.js'), 'utf8'), context, {filename:'scripts/wormholes-safe-render.js'});
vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'wormholes-pagination.js'), 'utf8'), context, {filename:'scripts/wormholes-pagination.js'});
const pagination = context.WormholesPagination;

const fifty = Array.from({length:50}, (_, index) => ({id:`r${index + 1}`}));
const fiftyOne = Array.from({length:51}, (_, index) => ({id:`r${index + 1}`}));
let result = pagination.paginateRows(fifty, 50, 1);
assert.strictEqual(result.totalPages, 1, 'exactly one page of Archive-size data should not create a second page');
assert.strictEqual(result.rows.length, 50);
result = pagination.paginateRows(fiftyOne, 50, 2);
assert.strictEqual(result.totalPages, 2, 'the first extra item should create a second page');
assert.strictEqual(result.page, 2);
assert.strictEqual(result.rows.length, 1);
assert.strictEqual(result.rows[0].id, 'r51');

const flatPlan = Array.from({length:121}, (_, index) => ({entry:{id:`a${index + 1}`}, childEntries:[]}));
const archivePages = pagination.paginateGroupedPlan(flatPlan, 50, () => false);
assert.strictEqual(archivePages.length, 3, 'generated Archive data should paginate into three pages');
assert.strictEqual(archivePages[0].length, 50);
assert.strictEqual(archivePages[1].length, 50);
assert.strictEqual(archivePages[2].length, 21);
assert.strictEqual(pagination.pageContainingEntry(archivePages, 'a111'), 3);

const children = Array.from({length:120}, (_, index) => ({id:`child-${index + 1}`}));
const groupedPages = pagination.paginateGroupedPlan([
  {entry:{id:'group-1', kind:'group'}, childEntries:children},
  {entry:{id:'standalone'}, childEntries:[]}
], 50, entry => entry.kind === 'group');
assert.ok(groupedPages.length >= 3, 'a group larger than one page should be safely divided');
const renderedChildren = groupedPages.flatMap(page => page.flatMap(row => row.childEntries || []).map(child => child.id));
assert.strictEqual(renderedChildren.length, children.length, 'all generated grouped children should remain visible across pages');
assert.strictEqual(new Set(renderedChildren).size, children.length, 'grouped children should not be duplicated across pages');
assert.strictEqual(pagination.pageContainingEntry(groupedPages, 'child-115'), 3);

assert.deepStrictEqual(Array.from(pagination.pageButtonSequence(1, 3)), [1,2,3]);
assert.deepStrictEqual(Array.from(pagination.pageButtonSequence(6, 12)), [1,null,5,6,7,null,12]);

function makeContainer(){
  const container = {
    hidden:true,
    _html:'',
    buttons:[],
    set innerHTML(value){
      this._html = String(value || '');
      this.buttons = Array.from(this._html.matchAll(/<button[^>]*data-page="(\d+)"([^>]*)>/g), match => {
        const button = {
          dataset:{page:match[1]},
          disabled:/\bdisabled\b/.test(match[2]),
          listeners:{},
          addEventListener(type, handler){ this.listeners[type] = handler; },
          click(){ this.listeners.click?.(); }
        };
        return button;
      });
    },
    get innerHTML(){ return this._html; },
    querySelectorAll(){ return this.buttons; }
  };
  return container;
}

const onePageContainer = makeContainer();
pagination.renderControls(onePageContainer, {label:'Archive', page:1, totalPages:1});
assert.strictEqual(onePageContainer.hidden, true, 'pagination controls should stay hidden for one page');
assert.strictEqual(onePageContainer.innerHTML, '');

let chosenPage = 0;
const multiPageContainer = makeContainer();
pagination.renderControls(multiPageContainer, {label:'Archive', page:1, totalPages:3, onPageChange(page){ chosenPage = page; }});
assert.strictEqual(multiPageContainer.hidden, false, 'pagination controls should appear only when a second page exists');
assert.match(multiPageContainer.innerHTML, /Page 1 of 3/);
assert.match(multiPageContainer.innerHTML, /aria-current="page"/);
const nextButton = multiPageContainer.buttons.find(button => button.dataset.page === '2' && !button.disabled);
assert.ok(nextButton, 'a usable next-page button should be rendered');
nextButton.click();
assert.strictEqual(chosenPage, 2, 'page controls should request the selected page');

const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
const archive = fs.readFileSync(path.join(root, 'scripts', 'archive.js'), 'utf8');
const literature = fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8');
const vision = fs.readFileSync(path.join(root, 'scripts', 'vision-board.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
assert.ok(html.includes('id="archivePagination"'));
assert.ok(html.includes('id="literaturePagination"'));
assert.ok(html.includes('id="visionPagination"'));
assert.ok(html.includes('scripts/wormholes-pagination.js'));
assert.match(archive, /ARCHIVE_PAGE_SIZE\s*=\s*50/);
assert.match(literature, /LITERATURE_PAGE_SIZE\s*=\s*40/);
assert.match(vision, /VISION_PAGE_SIZE\s*=\s*48/);
assert.match(vision, /visionMoveMode\s*\?\s*\{\s*page:\s*1,\s*totalPages:\s*1/);
assert.match(css, /\.collection-pagination\s*\{/);
assert.match(css, /\.pagination-button\.is-current\s*\{/);

console.log('collection-pagination.unit.js passed');
