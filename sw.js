/* PIXEL FORGE STUDIO v43.0 — compact UI and collision-free layout cache. */
const CACHE_NAME = 'pixel-forge-v43';
const CORE_FILES = [
  "./",
  "./index.html",
  "./help.html",
  "./manifest.webmanifest",
  "./css/home-ui-v21.css",
  "./css/mobile-experience-v29.css",
  "./css/mobile-experience-v30.css",
  "./css/mobile-experience-v31.css",
  "./css/mobile-experience-v32.css",
  "./css/mobile-fix-v19.css",
  "./css/motion-engine-v26.css",
  "./css/style.css",
  "./css/v34-fine-settings.css",
  "./css/precision-motion-v35.css",
  "./css/studio-expansion-v36.css",
  "./css/mode-workspaces-v37.css",
  "./css/mode-engines-v38.css",
  "./css/mobile-studio-v39.css",
  "./css/workbench-personalizer-v40.css",
  "./css/ui-layout-studio-v41.css",
  "./css/ui-compact-v43.css",
  "./js/app.js",
  "./js/compatibility.js",
  "./js/home-ui-v21.js",
  "./js/material-preview.js",
  "./js/mobile-experience-v29.js",
  "./js/mobile-experience-v30.js",
  "./js/mobile-experience-v31.js",
  "./js/mobile-experience-v32.js",
  "./js/motion-engine-v26.js",
  "./js/precision-motion-v35.js",
  "./js/studio-expansion-v36.js",
  "./js/mode-workspaces-v37.js",
  "./js/mode-engines-v38.js",
  "./js/mobile-studio-v39.js",
  "./js/workbench-personalizer-v40.js",
  "./js/ui-layout-studio-v43.js",
  "./js/psd-compat.js",
  "./js/ui-enhance.js",
  "./js/water-worker-v8.js",
  "./assets/images/apple-touch-icon.png",
  "./assets/images/icon-192.png",
  "./assets/images/icon-512.png",
  "./assets/images/icon.svg"
];
const OPTIONAL_FILES = [
  "./docs/CHANGELOG_v43_JA.md",
  "./docs/TEST_RESULTS_v43_JA.md",
  "./docs/CHANGELOG_v42_JA.md",
  "./docs/TEST_RESULTS_v42_JA.md",
  "./docs/CHANGELOG_v41_JA.md",
  "./docs/TEST_RESULTS_v41_JA.md",
  "./docs/CHANGELOG_v40_JA.md",
  "./docs/TEST_RESULTS_v40_JA.md",
  "./docs/CHANGELOG_v38_JA.md",
  "./docs/TEST_RESULTS_v38_JA.md",
  "./docs/CHANGELOG_v25_JA.md",
  "./docs/CHANGELOG_v26_JA.md",
  "./docs/CHANGELOG_v27_JA.md",
  "./docs/CHANGELOG_v28_JA.md",
  "./docs/CHANGELOG_v29_JA.md",
  "./docs/CHANGELOG_v30_JA.md",
  "./docs/CHANGELOG_v31_JA.md",
  "./docs/CHANGELOG_v32_1_JA.md",
  "./docs/CHANGELOG_v32_JA.md",
  "./docs/CHANGELOG_v33_2_JA.md",
  "./docs/CHANGELOG_v34_JA.md",
  "./docs/CHANGELOG_v35_JA.md",
  "./docs/CHANGELOG_v36_JA.md",
  "./docs/IMPROVEMENTS_v36_JA.md",
  "./docs/TEST_RESULTS_v36_JA.md",
  "./docs/IMPROVEMENTS_v35_JA.md",
  "./docs/TEST_RESULTS_v35_JA.md",
  "./docs/IMPROVEMENTS_v34_JA.md",
  "./docs/TEST_RESULTS_v34_JA.md",
  "./docs/V34_REPAIR_CHECKLIST_100_JA.md",
  "./docs/EDGE_CHECKLIST_v25_JA.md",
  "./docs/FEATURES_JA.md",
  "./docs/FEATURES_v25_JA.md",
  "./docs/IMPROVEMENTS_v26_JA.md",
  "./docs/IMPROVEMENTS_v27_JA.md",
  "./docs/IMPROVEMENTS_v28_JA.md",
  "./docs/IMPROVEMENTS_v29_JA.md",
  "./docs/IMPROVEMENTS_v30_JA.md",
  "./docs/IMPROVEMENTS_v31_JA.md",
  "./docs/IMPROVEMENTS_v32_JA.md",
  "./docs/IMPROVEMENTS_v33_2_JA.md",
  "./docs/MOBILE_REPAIR_CHECKLIST_100_JA.md",
  "./docs/README_JA.md",
  "./docs/START_HERE_JA.md",
  "./docs/TEST_RESULTS_v25_JA.md",
  "./docs/TEST_RESULTS_v26_JA.md",
  "./docs/TEST_RESULTS_v27_JA.md",
  "./docs/TEST_RESULTS_v28_JA.md",
  "./docs/TEST_RESULTS_v29_JA.md",
  "./docs/TEST_RESULTS_v30_JA.md",
  "./docs/TEST_RESULTS_v31_JA.md",
  "./docs/TEST_RESULTS_v32_JA.md",
  "./docs/TEST_RESULTS_v33_2_JA.md",
  "./docs/V31_SUPPLEMENTAL_CHECKLIST_10_JA.md",
  "./docs/V32_RECOVERY_CHECKLIST_20_JA.md",
  "./docs/V33_RAINBOW_CHECKLIST_10_JA.md",
  "./docs/V33_REPAIR_CHECKLIST_100_JA.md"
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
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
      } catch (error) { console.info('Optional offline asset skipped:', path, error); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => (key.startsWith('pixelforge-web-') || key.startsWith('pixel-forge-v')) && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  let url; try { url = new URL(request.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)).catch(()=>{}); }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('./index.html')) || Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(()=>{}); }
    return response;
  })));
});
