/* PIXEL FORGE STUDIO v53 — final responsive topbar consolidation. */
(()=>{
  'use strict';
  const QUERY='(max-width:760px), (max-width:900px) and (any-pointer:coarse), (max-height:520px) and (any-pointer:coarse)';
  const media=window.matchMedia(QUERY);
  const HIDE_SELECTORS=[
    '#pfV36Open', '#helpSiteButton', '#panelToggle',
    '#pfDensityToggle', '#pfCanvasFocusToggle', '.pf-enh-editor-trigger'
  ];
  const originalDisplay=new WeakMap();
  let observer=null, scheduled=false;
  const mobile=()=>{
    try {
      if(typeof window.PF_EDITOR_ACTIONS?.isMobileLayout==='function')
        return !!window.PF_EDITOR_ACTIONS.isMobileLayout();
    } catch(_) {}
    return media.matches;
  };
  function collect(top){
    const out=new Set();
    for(const selector of HIDE_SELECTORS){
      try { top.querySelectorAll(selector).forEach(node=>out.add(node)); }
      catch(_) {}
    }
    return [...out];
  }
  function hide(node){
    if(!originalDisplay.has(node)){
      originalDisplay.set(node,{
        value:node.style.getPropertyValue('display'),
        priority:node.style.getPropertyPriority('display')
      });
    }
    if(node.style.getPropertyValue('display')!=='none' || node.style.getPropertyPriority('display')!=='important')
      node.style.setProperty('display','none','important');
    node.dataset.pfV53CompactHidden='';
  }
  function restore(node){
    if(!node.hasAttribute('data-pf-v53-compact-hidden'))return;
    const old=originalDisplay.get(node);
    if(old?.value)node.style.setProperty('display',old.value,old.priority);
    else node.style.removeProperty('display');
    delete node.dataset.pfV53CompactHidden;
  }
  function apply(){
    scheduled=false;
    const top=document.querySelector('#app .topbar, .topbar');
    if(!top)return;
    const isSmall=mobile();
    for(const node of collect(top)){
      if(isSmall)hide(node); else restore(node);
    }
    top.dataset.pfV53Responsive='ready';
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(apply);
    else apply();
  }
  function install(){
    const top=document.querySelector('#app .topbar, .topbar');
    if(!top)return false;
    apply();
    if(!observer){
      observer=new MutationObserver(schedule);
      observer.observe(top,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});
    }
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  if(media.addEventListener)media.addEventListener('change',schedule);
  else if(media.addListener)media.addListener(schedule);
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  window.PF_V53_UI_LAYOUT=Object.freeze({
    refresh:()=>{install();schedule();},
    audit:()=>({mobile:mobile(),hidden:[...document.querySelectorAll('[data-pf-v53-compact-hidden]')].map(node=>node.id||node.className),topbarReady:!!document.querySelector('.topbar[data-pf-v53-responsive="ready"]')})
  });
})();
