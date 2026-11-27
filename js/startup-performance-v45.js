/* PIXEL FORGE STUDIO v46 — lightweight startup and long-task telemetry. */
(() => {
  'use strict';
  const state = { startedAt: performance.timeOrigin || Date.now(), longTasks: 0, longTaskMs: 0, largestLongTaskMs: 0, layoutShifts: 0, scriptLoads: 0, observerSupport: { longtask: false, layoutShift: false } };
  const observers = [];
  function observe(type, handler) {
    if (typeof PerformanceObserver !== 'function') return;
    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) handler(entry);
      });
      observer.observe({ type, buffered: true });
      observers.push(observer);
      state.observerSupport[type === 'longtask' ? 'longtask' : 'layoutShift'] = true;
    } catch (_) { /* This browser does not expose the entry type. */ }
  }
  observe('longtask', entry => {
    state.longTasks += 1;
    state.longTaskMs += Number(entry.duration) || 0;
    state.largestLongTaskMs = Math.max(state.largestLongTaskMs, Number(entry.duration) || 0);
  });
  observe('layout-shift', entry => { if (!entry.hadRecentInput) state.layoutShifts += Number(entry.value) || 0; });
  const perf = window.performance;
  function snapshot() {
    const nav = perf.getEntriesByType?.('navigation')?.[0];
    const resources = perf.getEntriesByType?.('resource') || [];
    const scripts = resources.filter(item => /\.js(?:\?|$)/i.test(item.name));
    const styles = resources.filter(item => /\.css(?:\?|$)/i.test(item.name));
    const bytes = resources.reduce((sum, item) => sum + (Number(item.transferSize) || 0), 0);
    return {
      release: '46.0.0',
      elapsedMs: Math.round(perf.now()),
      domContentLoadedMs: nav?.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
      loadEventMs: nav?.loadEventEnd ? Math.round(nav.loadEventEnd - nav.startTime) : null,
      scriptResourceCount: scripts.length,
      styleResourceCount: styles.length,
      resourceCount: resources.length,
      transferredBytes: bytes || null,
      longTasks: state.longTasks,
      totalLongTaskMs: Math.round(state.longTaskMs),
      largestLongTaskMs: Math.round(state.largestLongTaskMs),
      cumulativeLayoutShift: Number(state.layoutShifts.toFixed(4)),
      observerSupport: { ...state.observerSupport },
      deviceMemoryGb: navigator.deviceMemory || null,
      logicalCores: navigator.hardwareConcurrency || null,
      effectiveConnection: navigator.connection?.effectiveType || null
    };
  }
  window.PF_PERFORMANCE = Object.freeze({ snapshot, destroy: () => observers.forEach(observer => observer.disconnect()) });
})();
