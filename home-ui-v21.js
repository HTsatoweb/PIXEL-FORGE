/* PIXEL FORGE STUDIO v22 — resilient home controller and viewport bridge.
   Mobile actions are sent directly to the app controller so iOS file pickers keep
   the original user-activation context instead of relying on nested button.click(). */
(function(){
  'use strict';
  const $ = (selector, root=document) => root.querySelector(selector);
  const home = $('#homeScreen');
  if (!home) return;

  const mobileQueryText = '(max-width:760px), (max-width:900px) and (any-pointer:coarse), (max-height:520px) and (any-pointer:coarse)';
  let mobileQuery = null;
  try {
    if (typeof window.matchMedia === 'function') mobileQuery = window.matchMedia(mobileQueryText);
  } catch (error) {
    console.warn('Responsive media query unavailable; using viewport fallback.', error);
  }

  function fallbackMobileMode(){
    const width = window.innerWidth || document.documentElement.clientWidth || 1024;
    const height = window.innerHeight || document.documentElement.clientHeight || 768;
    const touch = Number(navigator.maxTouchPoints || 0) > 0;
    return width <= 760 || (width <= 900 && touch) || (height <= 520 && touch);
  }
  function isMobileMode(){ return !!(mobileQuery && mobileQuery.matches) || fallbackMobileMode(); }

  function syncViewportMetrics(){
    const vv = window.visualViewport;
    const width = vv && Number.isFinite(vv.width) ? vv.width : (window.innerWidth || document.documentElement.clientWidth || 1);
    const height = vv && Number.isFinite(vv.height) ? vv.height : (window.innerHeight || document.documentElement.clientHeight || 1);
    const top = vv && Number.isFinite(vv.offsetTop) ? vv.offsetTop : 0;
    const left = vv && Number.isFinite(vv.offsetLeft) ? vv.offsetLeft : 0;
    const style = document.documentElement.style;
    style.setProperty('--pf-visual-viewport-width', Math.max(1, Math.round(width)) + 'px');
    style.setProperty('--pf-visual-viewport-height', Math.max(1, Math.round(height)) + 'px');
    style.setProperty('--pf-visual-viewport-top', Math.round(top) + 'px');
    style.setProperty('--pf-visual-viewport-left', Math.round(left) + 'px');
  }

  function syncHomeMode(){
    const mode = isMobileMode() ? 'mobile' : 'desktop';
    document.documentElement.dataset.pfHomeMode = mode;
    home.dataset.layout = mode;
    document.documentElement.classList.toggle('pf-home-mobile-active', mode === 'mobile' && document.body.classList.contains('pf-home-active'));
    syncViewportMetrics();
  }
  syncHomeMode();

  if (mobileQuery) {
    if (typeof mobileQuery.addEventListener === 'function') mobileQuery.addEventListener('change', syncHomeMode);
    else if (typeof mobileQuery.addListener === 'function') mobileQuery.addListener(syncHomeMode);
  }
  window.addEventListener('resize', syncHomeMode, {passive:true});
  window.addEventListener('orientationchange', ()=>{
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(syncHomeMode);
    else syncHomeMode();
  }, {passive:true});
  window.addEventListener('pageshow', syncHomeMode, {passive:true});
  if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
    window.visualViewport.addEventListener('resize', syncHomeMode, {passive:true});
    window.visualViewport.addEventListener('scroll', syncViewportMetrics, {passive:true});
  }

  const actionMap = {
    new: '#homeNew', import: '#homeImport', settings: '#homeSettings',
    refresh: '#homeRefresh', install: '#homeInstall', diagnostics: '#homeDiagnostics'
  };
  home.addEventListener('click', event=>{
    const origin = event.target && typeof event.target.closest === 'function' ? event.target : null;
    const trigger = origin ? origin.closest('[data-pf-home-action]') : null;
    if (!trigger || !home.contains(trigger) || trigger.disabled) return;
    event.preventDefault();
    const action = trigger.dataset.pfHomeAction;
    // Direct handler preserves iOS Safari's trusted activation for file/color pickers.
    const directRunner = window.PF_HOME_ACTIONS && window.PF_HOME_ACTIONS.run;
    if (typeof directRunner === 'function') {
      try { directRunner(action, trigger); }
      catch (error) { console.error('Home action failed:', action, error); }
      return;
    }
    // Keep a no-app-JS fallback: home buttons remain navigable where possible.
    const target = $(actionMap[action] || '');
    if (target && !target.disabled) target.click();
  });

  const sourceCount = $('#libraryCount');
  const mobileCount = $('#mobileLibraryCount');
  function updateCount(){
    if (!sourceCount || !mobileCount) return;
    const match = sourceCount.textContent.match(/\d[\d,]*/);
    mobileCount.textContent = match ? match[0] : '0';
    mobileCount.setAttribute('aria-label', (match ? match[0] : '0') + '作品を保存中');
  }
  updateCount();
  if (sourceCount && typeof MutationObserver === 'function') {
    new MutationObserver(updateCount).observe(sourceCount, {childList:true,characterData:true,subtree:true});
  }

  if (typeof MutationObserver === 'function') {
    const homeObserver = new MutationObserver(()=>{
      syncHomeMode();
      if (document.body.classList.contains('pf-home-active')) updateCount();
    });
    homeObserver.observe(document.body, {attributes:true,attributeFilter:['class']});
  }
})();
