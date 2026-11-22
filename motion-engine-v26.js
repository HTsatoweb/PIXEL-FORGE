/* PIXEL FORGE STUDIO v26 · delegated, low-overhead interaction feedback.
   No drawing state, canvas pixels, pointer coordinates for painting, or app actions are modified. */
(() => {
  'use strict';
  if (window.__PF_MOTION_ENGINE_V26__) return;
  window.__PF_MOTION_ENGINE_V26__ = true;

  const reducedQuery = (() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)'); }
    catch (_) { return null; }
  })();
  const reduced = () => !!document.body?.classList.contains('pf-reduced-motion') || !!reducedQuery?.matches;
  const timers = new WeakMap();
  const pressed = new Map();
  const $ = (selector, root = document) => root.querySelector(selector);

  function pulse(element, className, duration = 420) {
    if (!element || reduced() || !element.isConnected) return;
    const previous = timers.get(element);
    if (previous) clearTimeout(previous);
    element.classList.remove(className);
    // Force only the interacted element to restart its short CSS animation.
    void element.offsetWidth;
    element.classList.add(className);
    const timer = window.setTimeout(() => {
      element.classList.remove(className);
      timers.delete(element);
    }, duration);
    timers.set(element, timer);
  }

  function release(element) {
    if (!element) return;
    const stillHeld = [...pressed.values()].some(item => item === element);
    if (!stillHeld) element.classList.remove('pf-pointer-pressed', 'pf-range-active');
  }
  function releasePointer(event) {
    const pointerId = Number.isFinite(event?.pointerId) ? event.pointerId : 0;
    const element = pressed.get(pointerId);
    pressed.delete(pointerId);
    release(element);
  }
  function releaseAll() {
    const elements = new Set(pressed.values());
    pressed.clear();
    elements.forEach(element => release(element));
  }

  // Pointer feedback follows the pointer lifecycle; it never captures the pointer.
  document.addEventListener('pointerdown', event => {
    if (reduced() || event.button > 0) return;
    const target = event.target?.closest?.(
      'button:not(:disabled), .tool, .swatch, .framechip, .pf-art-card, .pf-command-item, input[type="range"]'
    );
    if (!target) return;
    target.classList.add(target.matches('input[type="range"]') ? 'pf-range-active' : 'pf-pointer-pressed');
    pressed.set(Number.isFinite(event.pointerId) ? event.pointerId : 0, target);
  }, { capture: true, passive: true });

  document.addEventListener('pointerup', releasePointer, { capture: true, passive: true });
  document.addEventListener('pointercancel', releasePointer, { capture: true, passive: true });
  window.addEventListener('blur', releaseAll, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); }, { passive: true });

  // Distinct feedback for different interaction families. Existing click listeners remain untouched.
  document.addEventListener('click', event => {
    const target = event.target?.closest?.('.tool, .swatch, .framechip, .layer, .pf-art-card');
    if (!target) return;
    if (target.matches('.tool')) pulse(target, 'pf-tool-pulse', 390);
    else if (target.matches('.swatch')) pulse(target, 'pf-swatch-pulse', 420);
    else if (target.matches('.framechip')) pulse(target, 'pf-frame-pulse', 350);
    else if (target.matches('.layer') && !event.target.closest('button, input, select, a')) pulse(target, 'pf-layer-select-pulse', 360);
  }, { passive: true });

  // Confirm a changed value visually, without changing it or dispatching additional events.
  document.addEventListener('change', event => {
    const control = event.target;
    if (!(control instanceof HTMLElement) || !control.matches('input, select, textarea')) return;
    if (control.matches('[type="file"], [type="hidden"]')) return;
    pulse(control, 'pf-setting-changed', 560);
  }, { passive: true });

  // Keep animated detail disclosures in sync when opened by mouse, touch, or keyboard.
  document.addEventListener('toggle', event => {
    const detail = event.target;
    if (typeof HTMLDetailsElement === 'function' && detail instanceof HTMLDetailsElement && detail.open) pulse(detail, 'pf-setting-changed', 440);
  }, true);

  // Layer selection may also be changed by keyboard or app commands; watch only the layer list.
  const layerHost = $('#layersList');
  if (layerHost && typeof MutationObserver === 'function') {
    const layerStateObserver = new MutationObserver(records => {
      for (const record of records) {
        if (record.type !== 'attributes' || record.attributeName !== 'class') continue;
        const row = record.target;
        if (!row.matches?.('.layer')) continue;
        const before = (record.oldValue || '').split(/\s+/).includes('active');
        const after = row.classList.contains('active');
        if (after && !before) pulse(row, 'pf-layer-select-pulse', 360);
      }
    });
    layerStateObserver.observe(layerHost, { attributes: true, attributeOldValue: true, attributeFilter: ['class'], subtree: true });
  }

  // New project cards enter once; the canvas and its thumbnails are not animated.
  const libraryGrid = $('#libraryGrid');
  if (libraryGrid && typeof MutationObserver === 'function') {
    const cardObserver = new MutationObserver(records => {
      if (reduced()) return;
      for (const record of records) {
        for (const node of record.addedNodes || []) {
          if (!(node instanceof HTMLElement)) continue;
          const cards = node.matches?.('.pf-art-card') ? [node] : [...(node.querySelectorAll?.('.pf-art-card') || [])];
          cards.forEach(card => pulse(card, 'pf-card-enter', 420));
        }
      }
    });
    cardObserver.observe(libraryGrid, { childList: true, subtree: true });
  }

  // Clear transient classes if the OS changes its motion preference mid-session.
  const onMotionPreferenceChange = () => { if (reduced()) releaseAll(); };
  if (reducedQuery?.addEventListener) reducedQuery.addEventListener('change', onMotionPreferenceChange);
  else if (reducedQuery?.addListener) reducedQuery.addListener(onMotionPreferenceChange);

  // A tiny public status object makes the motion layer easy to diagnose.
  window.PF_MOTION_DIAGNOSTICS = Object.freeze({
    version: '26.0.0',
    get reducedMotion() { return reduced(); },
    get activePresses() { return pressed.size; },
    get available() { return typeof window.requestAnimationFrame === 'function' && typeof MutationObserver === 'function'; }
  });
})();
