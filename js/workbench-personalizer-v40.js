/* PIXEL FORGE STUDIO v40 — individually hideable / restorable workbench modules.
   This is presentation-only: it never changes project pixels, layer data, or the save format. */
(()=>{
 'use strict';
 const STORE='pf-workbench-hidden-modules-v40';
 const COACH_STORE='pf-beginner-coach-hidden-v40';
 const COLLAPSE_STORE='pf-workbench-collapsed-v40';
 const $=(s,r=document)=>r.querySelector(s);
 const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
 let host=null,decorating=false,handlerBound=false;
 const volatileStore=new Map();
 function storageGet(key){try{return localStorage.getItem(key)}catch(_){return volatileStore.has(key)?volatileStore.get(key):null}}
 function storageSet(key,value){try{localStorage.setItem(key,String(value))}catch(_){volatileStore.set(key,String(value))}}
 function storageRemove(key){try{localStorage.removeItem(key)}catch(_){volatileStore.delete(key)}}
 const labels={
  'pf-wb-steps':'使い方のステップ',
  'pf-wb-actions':'クイック操作',
  'pf-wb-subrow':'追加ツール・素材',
  'pf-wb-sliders':'画材の調整',
  'pf-wb-note':'ヒント',
  'pf-pixel-toolset':'ピクセルツール',
  'pf-pixel-settings':'ピクセル設定',
  'pf-palette-row':'パレット・色',
  'pf-pixel-meta':'キャンバス情報'
 };
 function mode(){return host?.dataset.mode||document.body.dataset.pfModeEngine||'beginner'}
 function readMap(){try{const value=JSON.parse(storageGet(STORE)||'{}');return value&&typeof value==='object'?value:{}}catch(_){return {}}}
 function writeMap(map){storageSet(STORE,JSON.stringify(map))}
 function hiddenIds(){const map=readMap(),items=map[mode()];return new Set(Array.isArray(items)?items:[])}
 function saveHidden(ids){const map=readMap();map[mode()]=[...ids];writeMap(map)}
 function collapsedModes(){
  const defaults=['beginner','illustration','painting','photo','design','pixel','animation','pro'];
  try{
   const stored=storageGet(COLLAPSE_STORE);
   if(stored===null){const initial=new Set(defaults);storageSet(COLLAPSE_STORE,JSON.stringify([...initial]));return initial;}
   const value=JSON.parse(stored);return new Set(Array.isArray(value)?value:defaults);
  }catch(_){return new Set(defaults)}
 }
 function setCollapsed(value){const set=collapsedModes();if(value)set.add(mode());else set.delete(mode());storageSet(COLLAPSE_STORE,JSON.stringify([...set]))}
 function moduleTitle(node,index){
  for(const cls of Object.keys(labels))if(node.classList.contains(cls)){
   if(cls==='pf-wb-subrow')return node.querySelector(':scope > span')?.textContent?.trim()||'追加ツール';
   return labels[cls];
  }
  const label=node.querySelector(':scope > span')?.textContent?.trim();
  return label||`ツールセット ${index+1}`;
 }
 function moduleKey(node,index,title){
  const base=[...node.classList].find(c=>c.startsWith('pf-'))||'module';
  const label=title.normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,24)||'section';
  return `${base}-${index}-${label}`;
 }
 function ensureModule(node,index,ids){
  if(node.classList.contains('pf-wb-module'))return node;
  const title=moduleTitle(node,index),key=moduleKey(node,index,title),wrap=document.createElement('section');
  wrap.className='pf-wb-module';wrap.dataset.pfWbModule=key;
  const head=document.createElement('div');head.className='pf-wb-module-head';
  const name=document.createElement('span');name.className='pf-wb-module-title';name.textContent=title;
  const hide=document.createElement('button');hide.type='button';hide.className='pf-wb-module-hide';hide.dataset.pfWbHide=key;hide.textContent='×';hide.title=`「${title}」を非表示`;hide.setAttribute('aria-label',`${title}を非表示`);
  head.append(name,hide);
  const body=document.createElement('div');body.className='pf-wb-module-body';
  node.parentNode.insertBefore(wrap,node);body.appendChild(node);wrap.append(head,body);
  if(ids.has(key))wrap.hidden=true;
  return wrap;
 }
 function collectTargets(content){
  const targets=[];
  [...content.children].forEach((child,idx)=>{
   if(child.classList.contains('pf-wb-hidden-tray'))return;
   if(child.classList.contains('pf-pixel-toolbar')){
    [...child.children].forEach((inner,j)=>targets.push({node:inner,index:j}));
   }else if(!child.classList.contains('pf-wb-module'))targets.push({node:child,index:idx});
  });
  return targets;
 }
 function buildTray(content,ids){
  let tray=$('.pf-wb-hidden-tray',content);
  if(!tray){tray=document.createElement('div');tray.className='pf-wb-hidden-tray';tray.setAttribute('aria-label','非表示にした項目');content.appendChild(tray)}
  tray.replaceChildren();
  const hidden=$$('.pf-wb-module[hidden]',content);
  hidden.forEach((module)=>{
   const title=$('.pf-wb-module-title',module)?.textContent||'項目';
   const key=module.dataset.pfWbModule;
   const button=document.createElement('button');button.type='button';button.className='pf-wb-restore';button.dataset.pfWbRestore=key;button.textContent=`＋ ${title}`;button.title=`「${title}」を再表示`;
   tray.appendChild(button);
  });
  if(hidden.length>1){const all=document.createElement('button');all.type='button';all.className='pf-wb-restore pf-wb-restore-all';all.dataset.pfWbRestoreAll='1';all.textContent='すべて表示';all.title='このモードの非表示項目をすべて戻す';tray.appendChild(all)}
  tray.hidden=!hidden.length;
 }
 function applyCollapse(){
  const content=$('.pf-wb-content',host);if(!content)return;
  const isCollapsed=collapsedModes().has(mode());content.hidden=isCollapsed;
  host.classList.toggle('is-collapsed',isCollapsed);host.dataset.collapsed=String(isCollapsed);
  const button=$('[data-pf-wb-collapse]',host);if(button){button.textContent=isCollapsed?'＋':'− まとめる';button.setAttribute('aria-expanded',String(!isCollapsed));button.setAttribute('aria-label',isCollapsed?'ワークベンチを展開':'ワークベンチを折りたたむ');button.title=isCollapsed?'ワークベンチを展開':'ワークベンチをまとめる'}
 }
 function ensureCoachControl(){
  const coach=$('#pfBeginnerCoach');if(!coach)return;
  let close=$('[data-pf-coach-hide]',coach);
  if(!close){close=document.createElement('button');close.type='button';close.className='pf-coach-hide';close.dataset.pfCoachHide='1';close.textContent='×';close.title='初心者ガイドを隠す';close.setAttribute('aria-label','初心者ガイドを隠す');coach.appendChild(close)}
  const hidden=storageGet(COACH_STORE)==='1';coach.hidden=hidden||coach.hidden;
  const actions=$('.pf-wb-head-actions',host);if(actions&&!$('[data-pf-coach-restore]',actions)){
   const restore=document.createElement('button');restore.type='button';restore.className='pf-wb-btn pf-wb-quiet pf-coach-restore';restore.dataset.pfCoachRestore='1';restore.textContent='ガイドを表示';restore.hidden=!hidden;actions.insertBefore(restore,actions.firstChild);
  }else{
   const restore=$('[data-pf-coach-restore]',actions);if(restore)restore.hidden=!hidden;
  }
 }
 function decorate(){
  if(decorating)return;host=$('#pfModeWorkbench');if(!host?.isConnected)return;
  const content=$('.pf-wb-content',host);if(!content)return;
  decorating=true;
  try{
   const ids=hiddenIds();
   collectTargets(content).forEach(({node,index})=>ensureModule(node,index,ids));
   buildTray(content,ids);
   if(!$('.pf-wb-module-hide-all',host)){
    const button=document.createElement('button');button.type='button';button.className='pf-wb-btn pf-wb-quiet pf-wb-module-hide-all';button.dataset.pfWbCollapse='1';button.textContent='− まとめる';button.setAttribute('aria-expanded','true');
    const actions=$('.pf-wb-head-actions',host);if(actions)actions.insertBefore(button,actions.firstChild);
   }
   ensureCoachControl();applyCollapse();
  }finally{decorating=false}
 }
 function refreshTray(){const content=$('.pf-wb-content',host);if(!content)return;buildTray(content,hiddenIds())}
 function hideModule(button){const module=button.closest('.pf-wb-module');if(!module)return;const ids=hiddenIds();ids.add(module.dataset.pfWbModule);saveHidden(ids);module.hidden=true;refreshTray()}
 function restoreModule(button){const key=button.dataset.pfWbRestore,module=$$('[data-pf-wb-module]',host).find(x=>x.dataset.pfWbModule===key);if(!module)return;module.hidden=false;const ids=hiddenIds();ids.delete(key);saveHidden(ids);refreshTray()}
 function handleClick(event){
  const hide=event.target.closest('[data-pf-wb-hide]');if(hide&&host.contains(hide)){event.preventDefault();hideModule(hide);return}
  const restoreAll=event.target.closest('[data-pf-wb-restore-all]');if(restoreAll&&host.contains(restoreAll)){event.preventDefault();const ids=hiddenIds();ids.clear();saveHidden(ids);$$('.pf-wb-module[hidden]',host).forEach(module=>module.hidden=false);refreshTray();return}
  const restore=event.target.closest('[data-pf-wb-restore]');if(restore&&host.contains(restore)){event.preventDefault();restoreModule(restore);return}
  const collapse=event.target.closest('[data-pf-wb-collapse]');if(collapse&&host.contains(collapse)){event.preventDefault();const next=!collapsedModes().has(mode());setCollapsed(next);applyCollapse();return}
  const coachHide=event.target.closest('[data-pf-coach-hide]');if(coachHide){event.preventDefault();storageSet(COACH_STORE,'1');const coach=$('#pfBeginnerCoach');if(coach)coach.hidden=true;const restoreButton=$('[data-pf-coach-restore]',host);if(restoreButton)restoreButton.hidden=false;return}
  const coachRestore=event.target.closest('[data-pf-coach-restore]');if(coachRestore&&host.contains(coachRestore)){event.preventDefault();storageRemove(COACH_STORE);const coach=$('#pfBeginnerCoach');if(coach)coach.hidden=false;coachRestore.hidden=true;return}
 }
 function watch(){
  host=$('#pfModeWorkbench');if(!host)return;
  if(!handlerBound){document.addEventListener('click',handleClick);handlerBound=true;}
  if(host.dataset.pfWheelBound!=='1'){
   host.addEventListener('wheel',event=>{
    const lane=event.target?.closest?.('.pf-wb-actions,.pf-wb-subrow,.pf-pixel-toolset,.pf-pixel-settings,.pf-palette-row,.pf-wb-steps');
    if(!lane||!host.contains(lane))return;
    const max=lane.scrollWidth-lane.clientWidth;if(max<=1)return;
    let delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
    if(event.deltaMode===1)delta*=32;else if(event.deltaMode===2)delta*=Math.max(1,lane.clientWidth);
    if(!delta)return;
    const next=Math.max(0,Math.min(max,lane.scrollLeft+delta));
    if(next!==lane.scrollLeft){event.preventDefault();lane.scrollLeft=next;}
   },{passive:false});
   host.dataset.pfWheelBound='1';
  }
  new MutationObserver(()=>{if(!decorating)decorate()}).observe(host,{childList:true});decorate();
 }
 function init(){watch();const bodyObserver=new MutationObserver(()=>{if(!host?.isConnected){host=$('#pfModeWorkbench');if(host)watch()}});bodyObserver.observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.PF_WORKBENCH_CUSTOMIZER=Object.freeze({refresh:decorate,reset(modeName){const map=readMap();if(modeName)delete map[modeName];else Object.keys(map).forEach(k=>delete map[k]);writeMap(map);decorate()},showAll(){const ids=hiddenIds();ids.clear();saveHidden(ids);$$('.pf-wb-module[hidden]',host).forEach(el=>el.hidden=false);refreshTray()},hideCoach(){storageSet(COACH_STORE,'1');const coach=$('#pfBeginnerCoach');if(coach)coach.hidden=true}});
})();
