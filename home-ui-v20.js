/* PIXEL FORGE STUDIO v20 — responsive home-shell controller.
   It routes mobile actions to the original controls so all original handlers,
   save paths, import flows and settings remain the single source of truth. */
(function(){
  'use strict';
  const $ = (selector, root=document) => root.querySelector(selector);
  const home = $('#homeScreen');
  if (!home) return;

  const mobileQuery = window.matchMedia('(max-width:760px), (max-width:900px) and (pointer:coarse)');
  function syncHomeMode(){
    const mode = mobileQuery.matches ? 'mobile' : 'desktop';
    document.documentElement.dataset.pfHomeMode = mode;
    home.dataset.layout = mode;
    document.documentElement.classList.toggle('pf-home-mobile-active', mode === 'mobile' && document.body.classList.contains('pf-home-active'));
  }
  syncHomeMode();
  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', syncHomeMode);
  else mobileQuery.addListener(syncHomeMode);
  window.addEventListener('resize', syncHomeMode, {passive:true});
  window.addEventListener('orientationchange', ()=>requestAnimationFrame(syncHomeMode), {passive:true});

  const actionMap = {
    new: '#homeNew', import: '#homeImport', settings: '#homeSettings',
    refresh: '#homeRefresh', install: '#homeInstall'
  };
  home.addEventListener('click', event=>{
    const trigger = event.target.closest('[data-pf-home-action]');
    if (!trigger || !home.contains(trigger)) return;
    const target = $(actionMap[trigger.dataset.pfHomeAction] || '');
    if (!target || target.disabled) return;
    event.preventDefault();
    target.click();
  });

  // Keep the phone dashboard count in sync with the existing library renderer.
  const sourceCount = $('#libraryCount');
  const mobileCount = $('#mobileLibraryCount');
  function updateCount(){
    if (!sourceCount || !mobileCount) return;
    const match = sourceCount.textContent.match(/\d[\d,]*/);
    mobileCount.textContent = match ? match[0] : '0';
    mobileCount.setAttribute('aria-label', (match ? match[0] : '0') + '作品を保存中');
  }
  updateCount();
  if (sourceCount && 'MutationObserver' in window) {
    new MutationObserver(updateCount).observe(sourceCount, {childList:true,characterData:true,subtree:true});
  }

  // When navigating back from the editor, return focus to the mobile home start.
  const homeObserver = new MutationObserver(()=>{
    syncHomeMode();
    if (document.body.classList.contains('pf-home-active')) updateCount();
  });
  homeObserver.observe(document.body, {attributes:true,attributeFilter:['class']});
})();
