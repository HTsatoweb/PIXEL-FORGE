/* PIXEL FORGE STUDIO v34.0 · single-owner mobile header and fine control layout */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const KEY='pf-ui-layout-v32-';
 const isMobile=()=>matchMedia('(max-width:760px),(max-width:900px) and (any-pointer:coarse),(max-height:520px) and (any-pointer:coarse)').matches;
 const bucket=()=>isMobile()?'mobile':'desktop';
 const key=()=>KEY+bucket();
 const groups=[
  {name:'homePrimaryAction',selector:'.pf-home-hero button, .pf-home-mobile-hero button, .pf-home-actions button, .pf-home-grid button, .pf-library-toolbar button, .pf-library-heading button, .pf-home-recovery-actions button, .pf-home-mobile-dock button, .pf-library-selection-actions button'},
  {name:'homeFormControl',selector:'.pf-home-shell input, .pf-home-shell select, .pf-home-shell textarea, .pf-home-screen input, .pf-home-screen select, .pf-home-screen textarea'},
  {name:'homeRemainingControl',selector:'.pf-home-screen button, .pf-home-screen input:not([type=file]):not([type=hidden]), .pf-home-screen select, .pf-home-screen textarea, .pf-settings-backdrop button, .pf-settings-backdrop input:not([type=file]):not([type=hidden]), .pf-settings-backdrop select, .pf-settings-backdrop textarea'},
  {name:'brushFineControl',selector:'#app .brush-lab-panel button, #app .brush-lab-panel input, #app .brush-lab-panel select, #app .brush-lab-panel textarea'},
  {name:'rainbowControl',selector:'#app #rainbowSettingsPanel button, #app #rainbowSettingsPanel input, #app #rainbowSettingsPanel select'},
  {name:'timelineControl',selector:'#app .timeline button, #app .timeline input, #app .timeline select, #app .timeline .frame, #app #timelineFrames > *'},
  {name:'modalControl',selector:'.pf-settings-backdrop button, .pf-settings-backdrop input, .pf-settings-backdrop select, .pf-settings-backdrop textarea, .modalback button, .modalback input, .modalback select, .modalback textarea'},
  {name:'menuPopupControl',selector:'#app .menuPopup button, #app .menuPopup input, #app .menuPopup select'},
  {name:'homeBrand',selector:'.pf-home-mobile-header>.pf-home-brand'},
  {name:'homeHeaderButton',selector:'.pf-home-mobile-header .pf-home-mobile-head-actions>button'},
  {name:'brand',selector:'#app .topbar>.brand'},
  {name:'headerButton',selector:'#app .topbar>.topbtn'},
  {name:'topMenuButton',selector:'#app .topbar .menu>button'},
  {name:'context',selector:'#app .contextbar>.context-group'},
  {name:'tool',selector:'#app .leftbar>.tool:not(.toolsep)'},
  {name:'leftButton',selector:'#app .leftbar>button[id]'},
  {name:'leftControl',selector:'#app .leftbar button, #app .leftbar input, #app .leftbar select, #app .leftbar textarea'},
  {name:'rightPanel',selector:'#app .rightbar>.panel'},
  {name:'panelHead',selector:'#app .rightbar .panelhead'},
  {name:'field',selector:'#app .rightbar .field'},
  {name:'layer',selector:'#app .rightbar .layer'},
  {name:'layerAction',selector:'#app .rightbar .layeractions>button'},
  {name:'dockButton',selector:'#app .mobile-dock>button'},
  {name:'status',selector:'#app .bottombar>span'},
  {name:'rightControl',selector:'#app .rightbar button, #app .rightbar input, #app .rightbar select, #app .rightbar textarea'},
  {name:'contextControl',selector:'#app .contextbar button, #app .contextbar input, #app .contextbar select'},
  {name:'bottomControl',selector:'#app .bottombar button'},
  {name:'settingsControl',selector:'.pf-settings-modal button, .pf-settings-modal input, .pf-settings-modal select, .pf-settings-modal textarea'},
  {name:'dialogControl',selector:'.pf-command-dialog button, .pf-command-dialog input, .pf-command-dialog select, .pf-modal button, .pf-modal input, .pf-modal select'},
  {name:'bottomAction',selector:'#app .mobile-dock button, #app .bottombar button'},
  {name:'remainingEditorControl',selector:'#app button, #app input:not([type=file]):not([type=hidden]), #app select, #app textarea, #app [role=button]'}
 ];
 let saved={positions:{}},handles=[],toolbar=null,drag=null,active=false,suppressClickUntil=0,handleObserver=null,handleSyncQueued=false;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function nodeKey(group,node,index){return node.id||node.dataset.tool||node.dataset.mobileTool||node.dataset.pfV32Key||group.name+'-'+index;}
 function read(){
  try{const raw=localStorage.getItem(key());if(raw){const parsed=JSON.parse(raw),v=parsed&&typeof parsed==='object'?parsed:{};saved={positions:v.positions&&typeof v.positions==='object'?v.positions:{}};if((Number(v.version)||0)<3){for(const id of Object.keys(saved.positions)){if(id.startsWith('headerButton:')||id.startsWith('brand:')||id.startsWith('homeBrand:')||id.startsWith('homeHeaderButton:'))delete saved.positions[id];}}return;}}
  catch(error){console.info('v32 UI positions unavailable',error)}
  // Keep v31's panel customisation (except the old topbar offset, which caused the
  // editor actions to drift to the right). New fine-control offsets start clean.
  try{const old=JSON.parse(localStorage.getItem('pf-ui-layout-v31-'+bucket())||'null');const positions={};for(const [k,v] of Object.entries(old?.offsets||{})){if(k!=='topbar'&&v&&Number.isFinite(+v.x)&&Number.isFinite(+v.y))positions['panel:'+k]={x:+v.x,y:+v.y};}saved={positions};}
  catch(_){saved={positions:{}}}
 }
 function write(){try{localStorage.setItem(key(),JSON.stringify({version:3,positions:saved.positions,savedAt:Date.now()}));status('配置をこの端末に保存しました');return true}catch(error){status('配置を保存できません: '+(error?.message||'ストレージを確認してください'));return false}}
 function status(message){const el=$('pfUiLayoutStatus');if(el)el.textContent=message;const t=toolbar?.querySelector('[data-status]');if(t)t.textContent=message;}
 function collect(){const rows=[],used=new WeakSet();for(const group of groups){document.querySelectorAll(group.selector).forEach((node,index)=>{if(used.has(node))return;used.add(node);const id=group.name+':'+nodeKey(group,node,index);rows.push({id,node,group:group.name});});}return rows;}
 function clearInline(node,props){if(!node)return;for(const prop of props)node.style.removeProperty(prop)}
 function normalizeMobileHeader(){
  const mobile=isMobile()||innerWidth<=760,top=document.querySelector('#app .topbar'),home=document.querySelector('.pf-home-mobile-header');
  if(!mobile){
   clearInline(top,['display','flex-direction','flex-wrap','justify-content','direction','gap','overflow-x','overflow-y','min-width','width','box-sizing']);
   if(top)for(const node of top.children)clearInline(node,['display','order','flex','width','min-width','max-width','margin-left','margin-right','position','inset']);
   clearInline(home,['display','flex-direction','flex-wrap','justify-content','direction','gap','overflow-x','overflow-y','min-width','width','box-sizing']);
   if(home)for(const node of home.children)clearInline(node,['display','order','flex','width','min-width','max-width','margin-left','margin-right']);
   return;
  }
  if(top){
   for(const [prop,value] of Object.entries({display:'flex','flex-direction':'row','flex-wrap':'nowrap','justify-content':'flex-start',direction:'ltr',gap:innerWidth<=360?'2px':'3px','overflow-x':'auto','overflow-y':'hidden','min-width':'0',width:'100%','box-sizing':'border-box'}))top.style.setProperty(prop,value,'important');
   const brand=top.querySelector(':scope > .brand');
   if(brand){const width=innerWidth<=360?62:Math.max(66,Math.min(82,innerWidth*.21));for(const [prop,value] of Object.entries({display:'flex',order:'0',flex:`0 0 ${width}px`,width:`${width}px`,'min-width':`${width}px`,'max-width':`${width}px`,'margin-left':'0','margin-right':'2px'}))brand.style.setProperty(prop,value,'important');}
   for(const node of top.children){
    if(node.matches('.menu,.topspacer,.docname')){node.style.setProperty('display','none','important');node.style.setProperty('flex','0 0 0px','important');node.style.setProperty('width','0','important');node.style.setProperty('margin','0','important');continue;}
    if(node.classList.contains('topbtn')){const width=innerWidth<=360?31:34;for(const [prop,value] of Object.entries({display:'inline-flex',flex:`0 0 ${width}px`,width:`${width}px`,'min-width':`${width}px`,'max-width':`${width}px`,'margin-left':'0','margin-right':'0',position:'relative',inset:'auto'}))node.style.setProperty(prop,value,'important');}
   }
  }
  if(home){
   for(const [prop,value] of Object.entries({display:'flex','flex-direction':'row','flex-wrap':'nowrap','justify-content':'flex-start',direction:'ltr',gap:'6px','overflow-x':'auto','overflow-y':'hidden','min-width':'0',width:'100%','box-sizing':'border-box'}))home.style.setProperty(prop,value,'important');
   const brand=home.querySelector(':scope > .pf-home-brand'),actions=home.querySelector(':scope > .pf-home-mobile-head-actions');
   if(brand){const width=innerWidth<=360?122:142;for(const [prop,value] of Object.entries({order:'0',flex:`0 0 ${width}px`,width:`${width}px`,'min-width':`${width}px`,'max-width':`${width}px`,margin:'0'}))brand.style.setProperty(prop,value,'important');}
   if(actions){actions.style.setProperty('display','flex','important');actions.style.setProperty('order','1','important');actions.style.setProperty('flex','0 0 auto','important');actions.style.setProperty('justify-content','flex-start','important');actions.style.setProperty('gap','4px','important');actions.style.setProperty('margin','0','important');for(const button of actions.children){const width=innerWidth<=360?32:36;for(const [prop,value] of Object.entries({flex:`0 0 ${width}px`,width:`${width}px`,'min-width':`${width}px`,'max-width':`${width}px`,margin:'0'}))button.style.setProperty(prop,value,'important');}}
  }
 }

 function apply(){
  // The header row remains anchored to the physical left; only tiny per-button offsets are allowed.
  const top=document.querySelector('#app .topbar');if(top){top.classList.remove('pf-ui-positionable');top.style.removeProperty('--pf-ui-offset-x');top.style.removeProperty('--pf-ui-offset-y');}
  for(const row of collect()){
   const n=row.node;n.classList.add('pf-v32-movable');n.dataset.pfV32MoveId=row.id;
   const pos=saved.positions[row.id]||saved.positions['panel:'+row.id.split(':')[1]]||{x:0,y:0};
   // Keep mobile topbar/home header controls physically anchored from the left.
   // Their order is still customisable by the v31 reorder handles; stale offsets
   // from older releases must never shove Home/Save to the far right again.
   const lockMobileX=isMobile()&&['brand','headerButton','topMenuButton','homeBrand','homeHeaderButton'].includes(row.group);
   const x=lockMobileX?0:clamp(Number(pos.x)||0,-Math.max(240,innerWidth),Math.max(240,innerWidth));
   const y=clamp(Number(pos.y)||0,-Math.max(300,innerHeight),Math.max(300,innerHeight));
   n.style.setProperty('--pf-v32-x',x+'px');n.style.setProperty('--pf-v32-y',y+'px');
  }
 }
 function makeToolbar(){
  if(toolbar)return;toolbar=document.createElement('div');toolbar.className='pf-v32-layout-toolbar';
  toolbar.innerHTML='<div class="info"><b>✦ UI DETAIL EDIT · v34</b><small data-status>各ボタン・ツール・設定欄の ⠿ をドラッグして配置</small></div><button type="button" data-act="reset">初期配置</button><button type="button" data-act="finish">完了</button>';
  document.body.appendChild(toolbar);toolbar.addEventListener('click',e=>{const a=e.target.closest('button')?.dataset.act;if(a==='reset')reset();if(a==='finish')finish();});
 }
 function placeHandle(handle,rows){const row=rows.get(handle.dataset.v32Target);if(!row)return;const rect=row.node.getBoundingClientRect();if(!row.node.getClientRects().length||rect.width<1||rect.height<1){handle.style.setProperty('display','none','important');return;}const size=21;handle.style.setProperty('display','block','important');handle.style.setProperty('left',clamp(rect.right-size*.72,2,Math.max(2,innerWidth-size-2))+'px','important');handle.style.setProperty('top',clamp(rect.top-size*.28,2,Math.max(2,innerHeight-size-2))+'px','important');}
 function positionHandles(){const rows=new Map(collect().map(row=>[row.id,row]));for(const handle of handles)placeHandle(handle,rows);}
 function addHandles(){
  const rows=collect(),known=new Set(handles.map(handle=>handle.dataset.v32Target));
  for(const row of rows){if(known.has(row.id))continue;const handle=document.createElement('span');handle.className='pf-ui-drag-handle pf-v32-move-handle pf-v32-floating-handle';handle.dataset.v32Target=row.id;handle.dataset.target='v32-'+row.id;handle.title='このUIをドラッグして移動';handle.setAttribute('role','button');handle.setAttribute('tabindex','0');handle.setAttribute('aria-label','UI要素を移動');document.body.appendChild(handle);handles.push(handle);}
  const map=new Map(rows.map(row=>[row.id,row]));for(const handle of handles)placeHandle(handle,map);
 }
 function removeHandles(){for(const h of handles)h.remove();handles=[];}
 function start(){if(active)return;read();apply();active=true;document.body.classList.add('pf-ui-layout-editing');addHandles();makeToolbar();$('appSettingsModal')?.classList.add('hidden');if(window.MutationObserver){handleObserver=new MutationObserver(records=>{if(!active||records.every(record=>record.target?.classList?.contains('pf-v32-floating-handle')))return;if(handleSyncQueued)return;handleSyncQueued=true;requestAnimationFrame(()=>{handleSyncQueued=false;if(active)addHandles()})});handleObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style','aria-expanded']});}status('各UIの ⠿ をドラッグして移動。隠れた設定欄は開くとハンドルが表示されます。');}
 function finish(){if(!active)return;write();active=false;handleObserver?.disconnect();handleObserver=null;document.body.classList.remove('pf-ui-layout-editing');removeHandles();toolbar?.remove();toolbar=null;drag=null;status('UI配置を保存しました。');}
 function reset(){saved={positions:{}};for(const row of collect()){row.node.style.setProperty('--pf-v32-x','0px');row.node.style.setProperty('--pf-v32-y','0px');}write();status('すべてのUIを初期配置に戻しました。');}
 function begin(e,h){const row=collect().find(x=>x.id===h.dataset.v32Target);if(!row)return;e.preventDefault();e.stopPropagation();const r=row.node.getBoundingClientRect(),p=saved.positions[row.id]||{x:0,y:0};drag={id:e.pointerId,row,handle:h,sx:e.clientX,sy:e.clientY,x:Number(p.x)||0,y:Number(p.y)||0,rect:{left:r.left-(Number(p.x)||0),top:r.top-(Number(p.y)||0),right:r.right-(Number(p.x)||0),bottom:r.bottom-(Number(p.y)||0),width:r.width,height:r.height}};try{h.setPointerCapture(e.pointerId)}catch(_){}row.node.classList.add('pf-v32-moving');}
 function move(e){if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const d=drag;let x=d.x+e.clientX-d.sx,y=d.y+e.clientY-d.sy;const r=d.rect,pad=20;x=clamp(x,pad-r.right,innerWidth-pad-r.left);y=clamp(y,pad-r.bottom,innerHeight-pad-r.top);d.row.node.style.setProperty('--pf-v32-x',Math.round(x)+'px');d.row.node.style.setProperty('--pf-v32-y',Math.round(y)+'px');saved.positions[d.row.id]={x:Math.round(x),y:Math.round(y)};placeHandle(d.handle,new Map([[d.row.id,d.row]]));status(d.row.id+' · '+Math.round(x)+'px / '+Math.round(y)+'px');}
 function end(e){if(!drag||drag.id!==e.pointerId)return;try{drag.handle.releasePointerCapture(e.pointerId)}catch(_){}drag.row.node.classList.remove('pf-v32-moving');drag=null;write();suppressClickUntil=Date.now()+350;}
 document.addEventListener('click',e=>{
  if(e.target.closest('#pfUiCustomizeStart')){e.preventDefault();e.stopImmediatePropagation();start();return;}
  if(e.target.closest('#pfUiLayoutReset')){e.preventDefault();e.stopImmediatePropagation();reset();return;}
  if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();return;}
  if(active&&e.target.closest('#app')&&!e.target.closest('.pf-v32-move-handle')){e.preventDefault();e.stopImmediatePropagation();}
 },true);
 document.addEventListener('keydown',e=>{
  const handle=e.target.closest?.('.pf-v32-move-handle');if(!active||!handle||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();const id=handle.dataset.v32Target,row=collect().find(x=>x.id===id);if(!row)return;
  const pos=saved.positions[id]||{x:0,y:0},step=e.shiftKey?12:3,delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
  const r=row.node.getBoundingClientRect(),x=clamp((Number(pos.x)||0)+delta[0],20-r.width,innerWidth-20),y=clamp((Number(pos.y)||0)+delta[1],20-r.height,innerHeight-20);saved.positions[id]={x,y};row.node.style.setProperty('--pf-v32-x',x+'px');row.node.style.setProperty('--pf-v32-y',y+'px');positionHandles();write();
 },true);
 document.addEventListener('pointerdown',e=>{const h=e.target.closest?.('.pf-v32-move-handle');if(h&&active)begin(e,h);},true);
 document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)finish();});
 window.addEventListener('resize',()=>{normalizeMobileHeader();if(active){apply();addHandles();}},{passive:true});window.addEventListener('scroll',()=>{if(active)positionHandles()},{passive:true,capture:true});window.addEventListener('orientationchange',()=>requestAnimationFrame(normalizeMobileHeader),{passive:true});window.visualViewport?.addEventListener('resize',normalizeMobileHeader,{passive:true});
 function init(){
  read();apply();normalizeMobileHeader();
  // Preserve v31's button reorder; normalize old topbar translation before applying v32.
  const top=document.querySelector('#app .topbar');if(top){top.style.removeProperty('--pf-ui-offset-x');top.style.removeProperty('--pf-ui-offset-y');top.classList.remove('pf-ui-positionable');}
  window.PF_UI_LAYOUT_V32={start,finish,reset,normalizeMobileHeader,getState:()=>JSON.parse(JSON.stringify(saved))};
  document.documentElement.classList.add('pf-v32-ready');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
