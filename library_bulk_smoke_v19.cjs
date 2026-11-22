const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(__dirname + '/app.js', 'utf8');
function lineFunction(name) {
  const prefix = `function ${name}(`;
  const start = source.indexOf(prefix);
  if (start < 0) throw new Error(`Missing ${name}`);
  const end = source.indexOf('\n', start);
  let fn = source.slice(start, end < 0 ? source.length : end);
  if (['deleteLibraryItemsByIds', 'bulkDeleteLibraryProjects'].includes(name)) fn = fn.replace(/^function /, 'async function ');
  return fn;
}
const store = { projects: new Map(), library: new Map() };
let confirmCalls = 0, clearedTimer = false;
function fakeTransaction() {
  return {
    objectStore(name) {
      return {
        delete(key) { store[name].delete(key); },
        get(key) {
          const req = { result: undefined, onsuccess: null, onerror: null };
          setTimeout(() => {
            req.result = store[name].get(key);
            if (typeof req.onsuccess === 'function') req.onsuccess();
          }, 0);
          return req;
        }
      };
    }
  };
}
const context = {
  libraryItems: [
    { id: 'a', title: 'Alpha', createdAt: 1, updatedAt: 3 },
    { id: 'b', title: 'Beta', createdAt: 2, updatedAt: 2 },
    { id: 'c', title: 'Gamma', createdAt: 3, updatedAt: 1 }
  ],
  legacyAutosaveItem: { id: 'legacy-autosave', title: 'Legacy', legacy: true },
  legacyAutosaveData: { layers: [] },
  selectedLibraryIds: new Set(['a', 'c']),
  visibleLibraryIds: ['a', 'b', 'c'],
  libraryBulkDeleting: false,
  state: { projectId: 'a', projectCreatedAt: 10, projectUpdatedAt: 20, dirty: true },
  appSettings: { confirmDelete: true },
  autosaveTimer: 123,
  $: id => ({ value: id === 'librarySearch' ? '' : 'name' }),
  renderLibraryCards() {},
  renderLibrarySelectionUI() {},
  toast() {},
  confirm() { confirmCalls++; return true; },
  clearTimeout() { clearedTimer = true; },
  openDB: async () => ({ transaction: fakeTransaction }),
  idbTransactionDone: async () => new Promise(resolve => setTimeout(resolve, 8)),
  console,
  Intl,
  Set,
  Map,
  Date,
  String,
  Number,
  Math,
  JSON
};
vm.createContext(context);
for (const name of ['getLibraryRows', 'selectVisibleLibraryItems', 'clearLibrarySelection', 'deleteLibraryItemsByIds', 'bulkDeleteLibraryProjects']) {
  vm.runInContext(lineFunction(name), context, { timeout: 1000 });
}
(async () => {
  store.projects.set('a', { id: 'a' });
  store.projects.set('b', { id: 'b' });
  store.projects.set('c', { id: 'c' });
  store.projects.set('autosave', { id: 'autosave', projectId: 'a' });
  for (const id of ['a', 'b', 'c']) store.library.set(id, { id });

  const rows = context.getLibraryRows();
  if (rows.map(x => x.id).join(',') !== 'a,b,c,legacy-autosave') throw new Error('sort/search rows invalid');
  context.selectVisibleLibraryItems();
  if ([...context.selectedLibraryIds].sort().join(',') !== 'a,b,c') throw new Error('select visible failed');
  context.selectVisibleLibraryItems();
  if (context.selectedLibraryIds.size !== 0) throw new Error('toggle visible selection off failed');

  context.selectedLibraryIds.add('a');
  context.selectedLibraryIds.add('c');
  const ok = await context.deleteLibraryItemsByIds([...context.selectedLibraryIds]);
  if (!ok) throw new Error('delete transaction did not complete');
  if (store.library.size !== 1 || !store.library.has('b')) throw new Error('library records not correctly deleted');
  if (store.projects.has('a') || store.projects.has('c')) throw new Error('project records not correctly deleted');
  if (store.projects.has('autosave')) throw new Error('orphan autosave pointer was not cleared');
  if (context.libraryItems.map(x => x.id).join(',') !== 'b') throw new Error('in-memory library not synchronized');
  if (context.state.projectId !== null || context.state.dirty !== false || !clearedTimer) throw new Error('active deleted project autosave state not reset');
  if (confirmCalls !== 1) throw new Error('bulk deletion must ask only once');

  context.selectedLibraryIds.add('legacy-autosave');
  context.libraryItems.push({ id: 'd', title: 'Delta' });
  store.projects.set('autosave', { id: 'autosave', data: { layers: [] } });
  store.library.set('d', { id: 'd' });
  const legacyOk = await context.deleteLibraryItemsByIds(['legacy-autosave']);
  if (!legacyOk || context.legacyAutosaveItem !== null || context.legacyAutosaveData !== null || store.projects.has('autosave')) {
    throw new Error('legacy autosave deletion failed');
  }
  console.log('PASS: visible selection toggle; one-confirm multi-delete; IDB project/library cleanup; autosave pointer cleanup; legacy autosave deletion.');
})().catch(err => { console.error(err); process.exitCode = 1; });
