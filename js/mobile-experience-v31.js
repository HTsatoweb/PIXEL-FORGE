/* PIXEL FORGE STUDIO v31 compatibility layer · v32 owns fine-grained positioning. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const ROOT_KEY='pf-ui-layout-v31-';
 const EDITORS=[
  {key:'topbar',selector:'#app .topbar',label:'上部操作バー'},
  {key:'contextbar',selector:'#app .contextbar',label:'サイズ・ズームバー'},
  {key:'leftbar',selector:'#app .leftbar',label:'左ツールバー'},
  {key:'rightbar',selector:'#app .rightbar',label:'設定パネル'},
  {key:'mobileDock',selector:'#app .mobile-dock',label:'下部クイックツール'}
 ];
 const ORDER_CONTAINERS=[
  {key:'topbar',selector:'#app .topbar',children:'.topbtn'},
  {key:'mobileDock',selector:'#app .mobile-dock',children:'button'}
 ];
 const mqMobile=()=>matchMedia('(max-width:760px), (max-width:900px) and (any-pointer:coarse), (max-height:520px) and (any-pointer:coarse)').matches;
 const bucket=()=>mqMobile()?'mobile':'desktop';
 const storageKey=()=>ROOT_KEY+bucket();
 let saved={offsets:{},orders:{}};
 let handles=[];
 let moveState=null;
 let reorderState=null;
 let customizeBar=null;
 let suppressClickUntil=0;
 let initialOrders={};

 function getNodeKey(node){
  if(node.id)return node.id;
  if(node.dataset.mobileTool)return 'tool:'+node.dataset.mobileTool;
  return node.dataset.pfOrderKey||'';
 }
 function readSaved(){
  try{const raw=localStorage.getItem(storageKey());if(raw){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object')saved={offsets:parsed.offsets&&typeof parsed.offsets==='object'?parsed.offsets:{},orders:parsed.orders&&typeof parsed.orders==='object'?parsed.orders:{}};}}
  catch(error){console.info('PIXEL FORGE UI layout could not be read',error);saved={offsets:{},orders:{}};}
 }
 function writeSaved(){
  try{localStorage.setItem(storageKey(),JSON.stringify({...saved,savedAt:Date.now(),version:1}));setStatus('この画面サイズのUI配置を保存しました。');return true;}
  catch(error){setStatus('配置を保存できません: '+(error?.message||'ストレージを確認してください'));return false;}
 }
 function setStatus(message){const el=$('pfUiLayoutStatus');if(el)el.textContent=message;const bar=customizeBar?.querySelector('[data-status]');if(bar)bar.textContent=message;}
 function rememberInitialOrders(){
  for(const config of ORDER_CONTAINERS){const parent=document.querySelector(config.selector);if(parent)initialOrders[config.key]=[...parent.querySelectorAll(':scope > '+config.children)].map(getNodeKey).filter(Boolean);}
 }
 function applyOrder(config,keys){
  const parent=document.querySelector(config.selector);if(!parent||!Array.isArray(keys)||!keys.length)return;
  const nodes=[...parent.querySelectorAll(':scope > '+config.children)];
  const byKey=new Map(nodes.map(node=>[getNodeKey(node),node]).filter(([key])=>key));
  const ordered=[];for(const key of keys){const node=byKey.get(key);if(node&&!ordered.includes(node))ordered.push(node);}
  for(const node of nodes)if(!ordered.includes(node))ordered.push(node);
  for(const node of ordered)parent.appendChild(node);
 }
 function applySavedOrders(){for(const config of ORDER_CONTAINERS)applyOrder(config,saved.orders?.[config.key]);}
 function applyOffsets(){
  for(const config of EDITORS){if(config.key==='topbar')continue;const el=document.querySelector(config.selector);if(!el)continue;el.classList.add('pf-ui-positionable');const pos=saved.offsets?.[config.key]||{x:0,y:0};el.style.setProperty('--pf-ui-offset-x',(Number(pos.x)||0)+'px');el.style.setProperty('--pf-ui-offset-y',(Number(pos.y)||0)+'px');}
 }
 function insertDragHandles(){
  for(const config of EDITORS){
   const target=document.querySelector(config.selector);if(!target||target.querySelector(':scope > .pf-ui-drag-handle'))continue;
   const handle=document.createElement('button');handle.type='button';handle.className='pf-ui-drag-handle';handle.dataset.target=config.key;handle.title=config.label+'をドラッグして移動';handle.setAttribute('aria-label',config.label+'を移動');handle.textContent='⠿';
   target.appendChild(handle);handles.push(handle);
  }
 }
 function removeDragHandles(){for(const handle of handles)handle.remove();handles=[];}
 function createCustomizeBar(){
  if(customizeBar)return;
  customizeBar=document.createElement('div');customizeBar.className='pf-ui-customize-toolbar';customizeBar.innerHTML='<div class="pf-ui-customize-label"><b>✦ UI配置編集モード</b><small data-status>⠿でパネル移動・ボタンをドラッグして順番変更</small></div><button type="button" data-action="reset">初期配置</button><button type="button" data-action="done">完了</button>';
  document.body.appendChild(customizeBar);
  customizeBar.addEventListener('click',event=>{
   const action=event.target.closest('button')?.dataset.action;
   if(action==='reset')resetLayout({keepEditing:true});
   if(action==='done')finishCustomizeMode();
  });
 }
 function startCustomizeMode(){
  if(document.body.classList.contains('pf-ui-layout-editing'))return;
  readSaved();applyOffsets();applySavedOrders();insertDragHandles();createCustomizeBar();
  document.body.classList.add('pf-ui-layout-editing');
  const modal=$('appSettingsModal');modal?.classList.add('hidden');
  setStatus('⠿ ハンドルをドラッグしてパネルを移動。上部・下部ボタンを直接ドラッグして順番を変更できます。');
 }
 function finishCustomizeMode(){
  writeSaved();document.body.classList.remove('pf-ui-layout-editing');removeDragHandles();customizeBar?.remove();customizeBar=null;moveState=null;reorderState=null;
  setStatus('UI配置を保存しました。');
 }
 function resetLayout({keepEditing=false}={}){
  saved={offsets:{},orders:{}};
  for(const config of EDITORS){const el=document.querySelector(config.selector);if(el){el.style.removeProperty('--pf-ui-offset-x');el.style.removeProperty('--pf-ui-offset-y');}}
  for(const config of ORDER_CONTAINERS)applyOrder(config,initialOrders[config.key]);
  writeSaved();
  if(keepEditing){setStatus('配置を初期状態に戻しました。続けて移動できます。');}
  else setStatus('配置を初期状態に戻しました。');
 }
 function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
 function beginPanelMove(event,handle){
  const config=EDITORS.find(item=>item.key===handle.dataset.target),el=config&&document.querySelector(config.selector);if(!el)return;
  event.preventDefault();event.stopPropagation();
  const rect=el.getBoundingClientRect(),current=saved.offsets?.[config.key]||{x:0,y:0};
  moveState={id:event.pointerId,key:config.key,el,handle,startX:event.clientX,startY:event.clientY,x:Number(current.x)||0,y:Number(current.y)||0,baseRect:{left:rect.left-(Number(current.x)||0),right:rect.right-(Number(current.x)||0),top:rect.top-(Number(current.y)||0),bottom:rect.bottom-(Number(current.y)||0),width:rect.width,height:rect.height}};
  try{handle.setPointerCapture(event.pointerId)}catch(_){}
 }
 function updatePanelMove(event){
  if(!moveState||moveState.id!==event.pointerId)return;
  event.preventDefault();const m=moveState;
  let x=m.x+(event.clientX-m.startX),y=m.y+(event.clientY-m.startY);
  const r=m.baseRect,visible=32;
  x=clamp(x,visible-r.right,window.innerWidth-visible-r.left);
  y=clamp(y,visible-r.bottom,window.innerHeight-visible-r.top);
  m.el.style.setProperty('--pf-ui-offset-x',x+'px');m.el.style.setProperty('--pf-ui-offset-y',y+'px');
  saved.offsets[m.key]={x:Math.round(x),y:Math.round(y)};
  setStatus(EDITORS.find(v=>v.key===m.key)?.label+'を移動中 · '+Math.round(x)+' / '+Math.round(y));
 }
 function endPanelMove(event){if(!moveState||moveState.id!==event.pointerId)return;try{moveState.handle.releasePointerCapture(event.pointerId)}catch(_){}moveState=null;writeSaved();}
 function reorderableButton(node){return node?.matches?.('#app .topbar>.topbtn,#app .mobile-dock>button');}
 function beginButtonReorder(event,button){
  if(event.button!==undefined&&event.button!==0)return;
  event.preventDefault();event.stopPropagation();
  reorderState={id:event.pointerId,button,parent:button.parentElement,startX:event.clientX,startY:event.clientY,dragging:false};
  try{button.setPointerCapture(event.pointerId)}catch(_){}
 }
 function updateButtonReorder(event){
  if(!reorderState||reorderState.id!==event.pointerId)return;
  const s=reorderState,dx=event.clientX-s.startX,dy=event.clientY-s.startY;
  if(!s.dragging&&Math.hypot(dx,dy)>6){s.dragging=true;s.button.classList.add('pf-ui-reorder-dragging');}
  if(!s.dragging)return;
  event.preventDefault();
  const hit=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('button');
  if(!hit||hit===s.button||hit.parentElement!==s.parent||!reorderableButton(hit))return;
  const rect=hit.getBoundingClientRect(),horizontal=s.parent.matches('.topbar');
  const after=horizontal?event.clientX>rect.left+rect.width/2:event.clientY>rect.top+rect.height/2;
  if(after){if(hit.nextSibling!==s.button)s.parent.insertBefore(s.button,hit.nextSibling);}
  else if(hit!==s.button.nextSibling)s.parent.insertBefore(s.button,hit);
 }
 function endButtonReorder(event){
  if(!reorderState||reorderState.id!==event.pointerId)return;
  const s=reorderState;s.button.classList.remove('pf-ui-reorder-dragging');
  if(s.dragging){const config=ORDER_CONTAINERS.find(c=>c.selector==='#app .topbar'&&s.parent.matches('.topbar')||c.selector==='#app .mobile-dock'&&s.parent.matches('.mobile-dock'));if(config){saved.orders[config.key]=[...s.parent.querySelectorAll(':scope > '+config.children)].map(getNodeKey).filter(Boolean);writeSaved();}suppressClickUntil=Date.now()+450;}
  try{s.button.releasePointerCapture(event.pointerId)}catch(_){}reorderState=null;
 }
 document.addEventListener('pointerdown',event=>{
  if(!document.body.classList.contains('pf-ui-layout-editing'))return;
  const handle=event.target.closest?.('.pf-ui-drag-handle');if(handle){beginPanelMove(event,handle);return;}
  const button=event.target.closest?.('button');if(reorderableButton(button)){beginButtonReorder(event,button);return;}
 },true);
 document.addEventListener('pointermove',event=>{if(moveState)updatePanelMove(event);else if(reorderState)updateButtonReorder(event);},{passive:false});
 document.addEventListener('pointerup',event=>{if(moveState)endPanelMove(event);if(reorderState)endButtonReorder(event);},true);
 document.addEventListener('pointercancel',event=>{if(moveState)endPanelMove(event);if(reorderState)endButtonReorder(event);},true);
 document.addEventListener('click',event=>{
  if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();return;}
  if(document.body.classList.contains('pf-ui-layout-editing')&&event.target.closest?.('#app')&&!event.target.closest?.('.pf-ui-drag-handle')){
   event.preventDefault();event.stopImmediatePropagation();
  }
 },true);
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('pf-ui-layout-editing'))finishCustomizeMode();});

 function init(){
  rememberInitialOrders();readSaved();applySavedOrders();applyOffsets();
  // v32 is the single owner of the detailed customization mode and its controls.
  // Header position and responsive order are owned by v32's normalizer.
  document.documentElement.classList.add('pf-v31-ready');
  const brushSelect=$('brushPreset');if(brushSelect){const syncRainbow=()=>document.body.classList.toggle('pf-rainbow-brush-active',brushSelect.value==='rainbow');brushSelect.addEventListener('change',syncRainbow);syncRainbow();}
  window.PF_UI_LAYOUT={start:startCustomizeMode,finish:finishCustomizeMode,reset:resetLayout,getState:()=>JSON.parse(JSON.stringify(saved))};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
