/* PIXEL FORGE STUDIO v31 — resilient app-shell cache. */
const CACHE_NAME = 'pixelforge-web-v31.0';
const CORE_FILES = [
  './', './index.html', './style.css', './mobile-fix-v19.css', './home-ui-v21.css',
  './app.js', './ui-enhance.js', './home-ui-v21.js', './psd-compat.js', './compatibility.js', './material-preview.js',
  './motion-engine-v26.css', './motion-engine-v26.js', './mobile-experience-v29.css', './mobile-experience-v29.js', './mobile-experience-v30.css', './mobile-experience-v30.js', './mobile-experience-v31.css', './mobile-experience-v31.js'
];
const OPTIONAL_FILES = [
  './help.html', './water-worker-v8.js', './manifest.webmanifest', './icon.svg',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './CHANGELOG_v25_JA.md', './CHANGELOG_v26_JA.md', './CHANGELOG_v27_JA.md', './CHANGELOG_v28_JA.md', './CHANGELOG_v29_JA.md', './CHANGELOG_v30_JA.md', './CHANGELOG_v31_JA.md', './FEATURES_v25_JA.md', './TEST_RESULTS_v25_JA.md', './IMPROVEMENTS_v26_JA.md', './IMPROVEMENTS_v27_JA.md', './IMPROVEMENTS_v28_JA.md', './IMPROVEMENTS_v29_JA.md', './TEST_RESULTS_v26_JA.md', './TEST_RESULTS_v27_JA.md', './TEST_RESULTS_v28_JA.md', './TEST_RESULTS_v29_JA.md', './TEST_RESULTS_v30_JA.md', './TEST_RESULTS_v31_JA.md', './MOBILE_REPAIR_CHECKLIST_100_JA.md', './V31_SUPPLEMENTAL_CHECKLIST_10_JA.md',
  './EDGE_CHECKLIST_v25_JA.md', './START_HERE_JA.md', './README_JA.md', './IMPROVEMENTS_v31_JA.md'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache core files individually so one optional missing document cannot abort install.
    const coreResults = await Promise.allSettled(CORE_FILES.map(async path => {
      const response = await fetch(new Request(new URL(path, self.registration.scope), {cache:'reload'}));
      if (!response.ok) throw new Error(path + ' returned HTTP ' + response.status);
      await cache.put(path, response);
    }));
    const failedCore = coreResults.map((result, index) => result.status === 'rejected' ? CORE_FILES[index] : null).filter(Boolean);
    if (failedCore.length) throw new Error('Required app-shell files could not be cached: ' + failedCore.join(', '));
    await Promise.allSettled(OPTIONAL_FILES.map(async path => {
      try {
        const response = await fetch(new Request(new URL(path, self.registration.scope), {cache:'reload'}));
        if (response.ok) await cache.put(path, response);
      } catch (error) {
        console.info('Optional offline asset skipped:', path, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('pixelforge-web-') && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)).catch(()=>{});
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('./index.html')) || Response.error()));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(()=>{});
    }
    return response;
  })));
});
