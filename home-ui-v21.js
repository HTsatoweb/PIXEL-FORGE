/* PIXEL FORGE STUDIO v21 — resilient mobile/desktop home controller.
   The HTML body class provides first paint; this script enhances the layout. */
(function(){
  'use strict';
  const $ = (selector, root=document) => root.querySelector(selector);
  const home = $('#homeScreen');
  if (!home) return;

  let mobileQuery = null;
  try {
    if (typeof window.matchMedia === 'function') {
      mobileQuery = window.matchMedia('(max-width:760px), (max-width:900px) and (pointer:coarse)');
    }
  } catch (error) { console.warn('Responsive media query unavailable; using viewport width.', error); }

  function isMobileMode(){
    if (mobileQuery) return !!mobileQuery.matches;
    return (window.innerWidth || document.documentElement.clientWidth || 1024) <= 760;
  }
  function syncHomeMode(){
    const mode = isMobileMode() ? 'mobile' : 'desktop';
    document.documentElement.dataset.pfHomeMode = mode;
    home.dataset.layout = mode;
    document.documentElement.classList.toggle('pf-home-mobile-active', mode === 'mobile' && document.body.classList.contains('pf-home-active'));
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
  if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
    window.visualViewport.addEventListener('resize', syncHomeMode, {passive:true});
  }

  const actionMap = {
    new: '#homeNew', import: '#homeImport', settings: '#homeSettings',
    refresh: '#homeRefresh', install: '#homeInstall'
  };
  home.addEventListener('click', event=>{
    const origin = event.target && typeof event.target.closest === 'function' ? event.target : null;
    const trigger = origin ? origin.closest('[data-pf-home-action]') : null;
    if (!trigger || !home.contains(trigger)) return;
    const target = $(actionMap[trigger.dataset.pfHomeAction] || '');
    if (!target || target.disabled) return;
    event.preventDefault();
    target.click();
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
