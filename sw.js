const CACHE_NAME='pixelforge-web-v21.0';
// Keep this list in sync with files shipped in the ZIP. A single missing file
// makes cache.addAll reject and would otherwise prevent the whole PWA install.
const APP_FILES = [
  './','./index.html','./help.html','./style.css','./mobile-fix-v19.css','./home-ui-v21.css','./app.js','./ui-enhance.js','./home-ui-v21.js',
  './compatibility.js','./water-worker-v8.js','./water-worker.js','./material-preview.js',
  './psd-compat.js','./manifest.webmanifest','./icon.svg','./CHANGELOG_v21_JA.md',
  './FEATURES_v21_JA.md','./TEST_RESULTS_v21_JA.md','./EDGE_CHECKLIST_v21_JA.md',
  './MIGRATION_v18_JA.md','./START_HERE_JA.md','./README_JA.md'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('pixelforge-web-') && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && response.ok) { const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)); }
    return response;
  }).catch(()=>caches.match('./index.html'))));
});
