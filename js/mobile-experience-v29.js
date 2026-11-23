/* PIXEL FORGE STUDIO v29 · mobile viewport + interaction motion layer.
   Additive only: no drawing, layer, project, or file-format logic lives here. */
(()=>{
 'use strict';
 const root=document.documentElement,body=document.body;
 const coarse=window.matchMedia?.('(any-pointer:coarse)');
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const setViewport=()=>{
  const vv=window.visualViewport;
  const width=Math.round(vv?.width||window.innerWidth||0);
  const height=Math.round(vv?.height||window.innerHeight||0);
  const top=Math.round(vv?.offsetTop||0),left=Math.round(vv?.offsetLeft||0);
  if(width>0)root.style.setProperty('--pf-live-vw',width+'px');
  if(height>0)root.style.setProperty('--pf-live-vh',height+'px');
  root.style.setProperty('--pf-live-vv-top',top+'px');
  root.style.setProperty('--pf-live-vv-left',left+'px');
  body.classList.toggle('pf-coarse-device',!!coarse?.matches);
  body.classList.toggle('pf-short-viewport',height>0&&height<560);
 };
 setViewport();
 window.addEventListener('resize',setViewport,{passive:true});
 window.addEventListener('orientationchange',()=>requestAnimationFrame(setViewport),{passive:true});
 window.addEventListener('pageshow',setViewport,{passive:true});
 window.visualViewport?.addEventListener('resize',setViewport,{passive:true});
 window.visualViewport?.addEventListener('scroll',setViewport,{passive:true});
 coarse?.addEventListener?.('change',setViewport);
 // One delegated tap animation; never intercept the click or pointer used by tools.
 document.addEventListener('pointerdown',event=>{
  if(reduced?.matches)return;
  const target=event.target?.closest?.('button,.tool,.pf-art-card,.pf-mobile-quick-actions button');
  if(!target||target.disabled||target.getAttribute('aria-disabled')==='true')return;
  target.classList.remove('pf-v29-tap');
  void target.offsetWidth;
  target.classList.add('pf-v29-tap');
 },{capture:true,passive:true});
 document.addEventListener('animationend',event=>{
  if(event.animationName==='pf-v29-tap-pop')event.target.classList.remove('pf-v29-tap');
 },true);
 // Close the settings drawer from its backdrop and support a deliberate right-swipe on the header.
 const closePanel=()=>{
  if(typeof window.PF_EDITOR_ACTIONS?.closePanel==='function')window.PF_EDITOR_ACTIONS.closePanel();
  else document.getElementById('mobilePanelClose')?.click();
 };
 const panelHead=document.querySelector('#rightbar .mobile-panel-head');
 let swipeStart=null;
 panelHead?.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'||event.button!==0)return;
  swipeStart={x:event.clientX,y:event.clientY,id:event.pointerId};
 },{passive:true});
 panelHead?.addEventListener('pointerup',event=>{
  if(!swipeStart||swipeStart.id!==event.pointerId)return;
  const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=null;
  if(dx>58&&Math.abs(dx)>Math.abs(dy)*1.25)closePanel();
 },{passive:true});
 panelHead?.addEventListener('pointercancel',()=>{swipeStart=null},{passive:true});
 // Normalize double-tap zoom on app controls while leaving canvas gestures intact.
 document.addEventListener('click',event=>{
  const control=event.target?.closest?.('.mobile-dock button,.pf-home-mobile-dock button,.pf-mobile-quick-actions button');
  if(control)control.style.webkitTapHighlightColor='transparent';
 },{passive:true});
})();
