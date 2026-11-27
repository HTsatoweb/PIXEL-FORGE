/* PIXEL FORGE STUDIO v51.0 — mobile panel state repair and responsive safety net. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const query = window.matchMedia?.('(max-width: 760px), (max-width: 900px) and (any-pointer: coarse), (max-height: 520px) and (any-pointer: coarse)');
  const isMobile = () => typeof window.PF_EDITOR_ACTIONS?.isMobileLayout === 'function'
    ? !!window.PF_EDITOR_ACTIONS.isMobileLayout()
    : !!query?.matches;
  let frame = 0;

  function syncPanelState() {
    frame = 0;
    const panel = $('rightbar');
    const scrim = $('mobilePanelScrim');
    const toggle = $('panelToggle');
    if (!panel) return;
    if (isMobile()) {
      // The body flag and .collapsed are one state pair. A half-open pair is
      // normalised to closed to avoid a one-frame flash while layout changes.
      const open = document.body.classList.contains('mobile-panel-open') && !panel.classList.contains('collapsed');
      document.body.classList.toggle('mobile-panel-open', open);
      panel.classList.toggle('collapsed', !open);
      panel.inert = !open;
      panel.setAttribute('aria-hidden', String(!open));
      panel.setAttribute('role', open ? 'dialog' : 'complementary');
      panel.setAttribute('aria-modal', String(open));
      scrim?.setAttribute('aria-hidden', String(!open));
      toggle?.setAttribute('aria-expanded', String(open));
    } else {
      // Desktop keeps the existing user-selected inspector visibility.
      document.body.classList.remove('mobile-panel-open');
      panel.inert = false;
      panel.setAttribute('aria-hidden', String(panel.classList.contains('collapsed')));
      panel.setAttribute('role', 'complementary');
      panel.setAttribute('aria-modal', 'false');
      scrim?.setAttribute('aria-hidden', 'true');
      toggle?.setAttribute('aria-expanded', String(!panel.classList.contains('collapsed')));
    }
  }
  function scheduleSync() {
    if (frame) return;
    frame = requestAnimationFrame(syncPanelState);
  }

  // Keep normal viewport/orientation changes in sync, but never interpret a
  // visualViewport-only keyboard/browser-chrome resize as a close request.
  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('orientationchange', scheduleSync, { passive: true });
  window.addEventListener('pageshow', scheduleSync, { passive: true });
  query?.addEventListener?.('change', scheduleSync);
  document.addEventListener('DOMContentLoaded', scheduleSync, { once: true });
  if (document.readyState !== 'loading') scheduleSync();

  window.PF_PANEL_REPAIR_V51 = Object.freeze({ sync: syncPanelState, isMobile });
})();
