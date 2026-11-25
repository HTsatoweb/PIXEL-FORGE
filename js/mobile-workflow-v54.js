/* PIXEL FORGE STUDIO v54 — direct mobile routing, undo/redo dock, drawer history and tap safety. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const mobileQuery='(max-width:760px), (max-width:900px) and (any-pointer:coarse), (max-height:520px) and (any-pointer:coarse)';
 const media=window.matchMedia?window.matchMedia(mobileQuery):{matches:innerWidth<=760};
 const STATE_KEY='__pixelForgeMobileDrawerV54';
 let installed=false,returnFocus=null,lastTab='tools',swipe=null,hold=null,suppressHistoryClickUntil=0;
 const isMobile=()=>!!(window.PF_EDITOR_ACTIONS?.isMobileLayout?.() ?? media.matches);
 const isDrawerOpen=()=>document.body.classList.contains('mobile-panel-open');
 const editor=()=>window.PF_EDITOR_ACTIONS||{};
 const mobileStudio=()=>window.PF_MOBILE_STUDIO_V39;
 const studio=()=>window.PF_STUDIO_API;
 function historyEntry(){return !!(history.state&&history.state[STATE_KEY]===true)}
 function pushDrawerEntry(){if(!isMobile()||historyEntry())return;try{history.pushState({...((history.state&&typeof history.state==='object')?history.state:{}),[STATE_KEY]:true},'',location.href)}catch(_){}}
 function removeDrawerEntry(){if(historyEntry()){try{history.back()}catch(_){}}}
 function setPanel(open,{fromPop=false,focus=true}={}){
  if(!isMobile())return;
  const next=!!open;
  if(next){
   if(!isDrawerOpen())returnFocus=document.activeElement;
   if(!fromPop)pushDrawerEntry();
   editor().panel?.(true);
   document.querySelector('#rightbar')?.setAttribute('data-pf-v54-open','1');
   if(focus)requestAnimationFrame(()=>$('#mobilePanelClose')?.focus({preventScroll:true}));
  }else{
   editor().closePanel?.();
   document.querySelector('#rightbar')?.removeAttribute('data-pf-v54-open');
   if(!fromPop)removeDrawerEntry();
   if(focus&&returnFocus?.isConnected)requestAnimationFrame(()=>returnFocus.focus({preventScroll:true}));
  }
 }
 function openTab(tab){lastTab=tab||'tools';if(!isDrawerOpen())returnFocus=document.activeElement;pushDrawerEntry();if(mobileStudio()?.activateTab)mobileStudio().activateTab(lastTab);else setPanel(true);}
 function closePanel(){setPanel(false)}
 function buildDock(){
  const nav=$('pfMobileStudioBottom');if(!nav)return false;
  const items=[
   `<button type="button" class="pf-v54-history" data-pf-history-action="undo" aria-label="元に戻す" title="元に戻す"><span aria-hidden="true">↶</span><small>戻す</small></button>`,
   `<button type="button" class="pf-v54-history" data-pf-history-action="redo" aria-label="やり直す" title="やり直す"><span aria-hidden="true">↷</span><small>やり直し</small></button>`,
   `<button type="button" data-pf-mobile-open="tools" aria-pressed="false" aria-label="ツールを選ぶ"><span>✎</span><small>ツール</small></button>`,
   `<button type="button" data-pf-mobile-open="brush" aria-pressed="false" aria-label="ブラシと画材"><span>◉</span><small>ブラシ</small></button>`,
   `<button type="button" data-pf-mobile-open="color" aria-pressed="false" aria-label="色を選ぶ"><span>●</span><small>カラー</small></button>`,
   `<button type="button" data-pf-mobile-open="layers" aria-pressed="false" aria-label="レイヤーを管理"><span>▤</span><small>レイヤー</small></button>`,
   `<button type="button" data-pf-mobile-open="more" aria-pressed="false" aria-label="その他の操作"><span>⋯</span><small>その他</small></button>`
  ];
  nav.innerHTML=items.join('');nav.setAttribute('data-pf-v54-ready','true');nav.setAttribute('role','navigation');
  const navTabs=nav.querySelectorAll('[data-pf-mobile-open]');navTabs.forEach(b=>{b.setAttribute('aria-controls','rightbar')});
  return true;
 }
 function addManagerShortcuts(){
  const homeActions=document.querySelector('.pf-home-mobile-head-actions');
  if(homeActions&&!homeActions.querySelector('[data-pf-v54-layout]')){
   const b=document.createElement('button');b.type='button';b.className='pf-mobile-icon-btn';b.dataset.pfV54Layout='home';b.textContent='☷';b.setAttribute('aria-label','UI整理を開く');b.title='UI整理';homeActions.appendChild(b);
  }
  const actions=$('pfMobileActions');
  if(actions&&!actions.querySelector('[data-pf-v54-layout]')){
   const b=document.createElement('button');b.type='button';b.className='pf-v54-layout-action';b.dataset.pfV54Layout='editor';b.innerHTML='<span aria-hidden="true">☷</span>UI整理';b.setAttribute('aria-label','UI整理を開く');actions.appendChild(b);
  }
 }
 function syncHistory(detail){
  let state=detail;
  if(!state)try{state=editor().historyState?.()}catch(_){}
  if(!state){const m=studio()?.getMetrics?.()||{};state={undo:Number(m.historyCount)>0,redo:Number(m.redoCount)>0,undoCount:m.historyCount||0,redoCount:m.redoCount||0}}
  document.querySelectorAll('[data-pf-history-action="undo"]').forEach(b=>{b.disabled=!state.undo;b.setAttribute('aria-disabled',String(!state.undo));b.title=state.undo?`元に戻す · ${state.undoCount||0}件`:'戻せる操作はありません'});
  document.querySelectorAll('[data-pf-history-action="redo"]').forEach(b=>{b.disabled=!state.redo;b.setAttribute('aria-disabled',String(!state.redo));b.title=state.redo?`やり直す · ${state.redoCount||0}件`:'やり直せる操作はありません'});
 }
 function performHistory(kind){const fn=kind==='undo'?editor().undo:editor().redo;if(typeof fn==='function')fn();else document.querySelector(kind==='undo'?'#undoBtn':'#redoBtn')?.click();syncHistory();}
 function clickTarget(selector){const el=document.querySelector(selector);if(el&&typeof el.click==='function')el.click();}
 function performAction(action){
  const map={
   save:()=>editor().save?.(),undo:()=>performHistory('undo'),redo:()=>performHistory('redo'),
   fit:()=>editor().fit?.(),home:()=>editor().home?.(),new:()=>clickTarget('#newBtn'),
   export:()=>clickTarget('#exportPng'),guide:()=>clickTarget('#brushGuideBtn'),
   help:()=>clickTarget('#helpSiteButton'),search:()=>clickTarget('#commandPaletteButton'),
   density:()=>clickTarget('#pfDensityToggle'),focus:()=>clickTarget('#pfCanvasFocusToggle'),
   studio:()=>clickTarget('#pfV36Open'),enhance:()=>clickTarget('.pf-enh-editor-trigger'),
   layout:()=>{if(typeof window.PF_UI_LAYOUT_STUDIO?.open==='function')window.PF_UI_LAYOUT_STUDIO.open();else clickTarget('#pfUiFab')}
  };
  try{map[action]?.()}catch(error){console.warn('Mobile action failed:',action,error)}
 }
 function handleTap(event){
  if(!isMobile())return;
  const scrim=event.target?.closest?.('#mobilePanelScrim,#pfMobilePanelScrim');if(scrim){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();closePanel();return;}
  const target=event.target?.closest?.('button,[role="button"],a');if(!target)return;
  if(target.matches('[data-pf-history-action]')){
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   if(Date.now()<suppressHistoryClickUntil)return;
   performHistory(target.dataset.pfHistoryAction);return;
  }
  if(target.matches('[data-pf-mobile-open],[data-pf-mobile-tab]')){
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openTab(target.dataset.pfMobileOpen||target.dataset.pfMobileTab);return;
  }
  const mobileTool=target.closest('[data-pf-mobile-tool]');if(mobileTool){
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   studio()?.setTool?.(mobileTool.dataset.pfMobileTool);mobileStudio()?.refresh?.();closePanel();return;
  }
  if(target.matches('[data-pf-mobile-action]')){
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();performAction(target.dataset.pfMobileAction);if(target.dataset.pfMobileAction==='home')closePanel();return;
  }
  if(target.matches('[data-pf-v54-layout]')){
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   performAction('layout');return;
  }
  if(target.matches('#pfMobilePanelClose,#mobilePanelClose,#mobilePanelScrim,#pfMobilePanelScrim')){
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();closePanel();return;
  }
  if(target.matches('#pfMobileSaveQuick')){
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();performAction('save');return;
  }
  if(target.matches('#mobilePanelToggle,#panelToggle')&&isMobile()){
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   if(isDrawerOpen())closePanel();else openTab(lastTab);return;
  }
 }
 function startHistoryHold(event){
  const button=event.target?.closest?.('[data-pf-history-action]');if(!button||!isMobile()||!['touch','pen'].includes(event.pointerType))return;
  clearHistoryHold();hold={button,pointerId:event.pointerId,kind:button.dataset.pfHistoryAction,repeating:false,timer:0,interval:0};
  hold.timer=setTimeout(()=>{
   if(!hold)return;hold.repeating=true;performHistory(hold.kind);
   hold.interval=setInterval(()=>{if(hold)performHistory(hold.kind)},165);
  },520);
 }
 function clearHistoryHold(event){
  if(!hold)return;if(event&&hold.pointerId!==event.pointerId)return;
  clearTimeout(hold.timer);clearInterval(hold.interval);
  if(hold.repeating)suppressHistoryClickUntil=Date.now()+220;
  hold=null;
 }
 function handleDrawerSwipeStart(event){
  if(!isMobile()||!isDrawerOpen()||event.pointerType==='mouse')return;
  if(!event.target.closest('#rightbar .mobile-panel-head'))return;
  swipe={id:event.pointerId,x:event.clientX,y:event.clientY};
 }
 function handleDrawerSwipeEnd(event){
  if(!swipe||swipe.id!==event.pointerId)return;
  const dx=event.clientX-swipe.x,dy=event.clientY-swipe.y;swipe=null;
  if(dx>72&&Math.abs(dy)<55)closePanel();
 }
 function syncResponsive(){
  const mobile=isMobile();document.documentElement.dataset.pfV54Layout=mobile?'mobile':'desktop';
  if(!mobile){if(isDrawerOpen()){editor().closePanel?.();document.querySelector('#rightbar')?.removeAttribute('data-pf-v54-open');}if(historyEntry())removeDrawerEntry();return}
  syncHistory();
 }
 function install(){
  if(installed)return;installed=true;
  buildDock();addManagerShortcuts();
  // The mobile dock no longer depends on the old bubble-phase action router.
  document.addEventListener('click',handleTap,true);
  document.addEventListener('pointerdown',startHistoryHold,true);
  document.addEventListener('pointerup',clearHistoryHold,true);
  document.addEventListener('pointercancel',clearHistoryHold,true);
  document.addEventListener('pointerdown',handleDrawerSwipeStart,true);
  document.addEventListener('pointerup',handleDrawerSwipeEnd,true);
  document.addEventListener('pointercancel',()=>{swipe=null},true);
  window.addEventListener('pf:history-state',e=>syncHistory(e.detail));
  window.addEventListener('resize',syncResponsive,{passive:true});
  window.addEventListener('orientationchange',()=>requestAnimationFrame(syncResponsive),{passive:true});
  window.addEventListener('popstate',()=>{
   if(!isMobile())return;
   if(historyEntry()){if(!isDrawerOpen())setPanel(true,{fromPop:true,focus:false});}
   else if(isDrawerOpen())setPanel(false,{fromPop:true,focus:true});
  });
  window.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&isMobile()&&isDrawerOpen()){
    event.preventDefault();event.stopPropagation();closePanel();
   }
  },true);
  const fabObserver=new MutationObserver(()=>{addManagerShortcuts()});
  fabObserver.observe(document.body,{childList:true,subtree:true});
  if($('pfMobileActions'))addManagerShortcuts();
  syncResponsive();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else if(document.readyState==='interactive')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
 if(media.addEventListener)media.addEventListener('change',syncResponsive);else media.addListener?.(syncResponsive);
 window.PF_MOBILE_WORKFLOW_V54=Object.freeze({install,openTab,closePanel,performAction,syncHistory,isMobile,inspect:()=>({mobile:isMobile(),drawerOpen:isDrawerOpen(),bottomNav:!!$('pfMobileStudioBottom')?.hasAttribute('data-pf-v54-ready'),historyState:editor().historyState?.()||null,layoutButton:!!document.querySelector('[data-pf-v54-layout]')})});
})();
