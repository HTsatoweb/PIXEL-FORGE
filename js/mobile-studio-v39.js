/* PIXEL FORGE STUDIO v39 — mobile-first editor shell + pixel mode recovery. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const api=()=>window.PF_STUDIO_API;
 const MODE_LABELS={beginner:'はじめて',illustration:'イラスト',painting:'アナログ画材',photo:'写真加工',design:'デザイン',pixel:'ピクセルアート',animation:'アニメーション',pro:'上級者'};
 const TOOL_LIST=[
  ['brush','✎','ブラシ','B'],['eraser','⌫','消しゴム','E'],['smudge','◌','指先・混色','S'],
  ['line','／','直線','L'],['rect','□','四角形','R'],['ellipse','○','楕円','O'],
  ['triangle','△','三角形',''],['star','☆','星形',''],['roundedRect','▢','角丸長方形',''],
  ['polygon','⬡','多角形',''],['arrow','➜','矢印',''],['curve','⌁','ベジェ曲線','U'],
  ['gradient','◩','グラデーション','D'],['move','✥','レイヤー移動','M'],['transform','⤢','変形','V'],
  ['fill','▧','塗りつぶし','G'],['eyedropper','◉','スポイト','I'],['text','T','文字','T'],['hand','✋','手のひら','H']
 ];
 const TAB_LABELS={tools:'ツール',color:'色',brush:'ブラシ',layers:'レイヤー',more:'その他'};
 let activeTab='tools',isInstalled=false,modeObserver=null;
 function isMobile(){return matchMedia('(max-width:760px), (max-width:900px) and (any-pointer:coarse), (max-height:520px) and (any-pointer:coarse)').matches;}
 function getMode(){return window.PF_MODE_UI?.getSelected?.()||document.documentElement.dataset.pfWorkspaceMode||'beginner';}
 function openSettings(){document.body.classList.add('mobile-panel-open');$('rightbar')?.classList.remove('collapsed');$('rightbar')?.setAttribute('aria-hidden','false');$('panelToggle')?.setAttribute('aria-expanded','true');}
 function closeSettings(){
  try{window.PF_EDITOR_ACTIONS?.closePanel?.()}catch(error){console.warn('Mobile settings close failed:',error)}
  document.body.classList.remove('mobile-panel-open');
  $('rightbar')?.classList.add('collapsed');
  $('rightbar')?.setAttribute('aria-hidden','true');
  $('panelToggle')?.setAttribute('aria-expanded','false');
 }
 function panelTabs(){return `<nav class="pf-mobile-panel-nav" id="pfMobilePanelNav" aria-label="設定カテゴリ">${Object.entries(TAB_LABELS).map(([k,v])=>`<button type="button" data-pf-mobile-tab="${k}" aria-pressed="${k==='tools'}">${v}</button>`).join('')}</nav>`;}
 function actionMarkup(){const items=[['save','↓','保存'],['undo','↶','戻す'],['redo','↷','やり直す'],['fit','⛶','全体表示'],['home','⌂','ホーム'],['new','＋','新規作成'],['export','⇧','PNG出力'],['guide','?','使い方'],['search','⌕','コマンド']];return `<div id="pfMobileActions" class="pf-mobile-actions-grid">${items.map(([id,ico,label])=>`<button type="button" data-pf-mobile-action="${id}"><span>${ico}</span>${label}</button>`).join('')}</div>`;}
 function ensureMarkup(){
  const center=document.querySelector('.center'),stage=$('stage'),right=$('rightbar');if(!center||!stage||!right)return false;
  if(!$('pfMobileStudioTop')){
   const top=document.createElement('section');top.id='pfMobileStudioTop';top.className='pf-mobile-studio-top';top.setAttribute('aria-label','スマホ用クイック設定');
   top.innerHTML=`<div class="pf-mobile-top-row"><label for="pfMobileMode">モード</label><select id="pfMobileMode" aria-label="制作モード">${Object.entries(MODE_LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><span id="pfMobileProjectLabel">PIXEL FORGE</span><button type="button" id="pfMobileSaveQuick" aria-label="保存">保存</button></div><div class="pf-mobile-control-row"><label for="pfMobileSize">サイズ <output id="pfMobileSizeValue">18</output></label><input id="pfMobileSize" type="range" min="1" max="250" value="18"><label for="pfMobileOpacity">濃さ <output id="pfMobileOpacityValue">100%</output></label><input id="pfMobileOpacity" type="range" min="1" max="100" value="100"></div>`;
   const anchor=$('pfBeginnerCoach')||$('pfModeWorkbench')||center.querySelector('.contextbar');(anchor||center.firstElementChild)?.insertAdjacentElement('afterend',top);
  }
  if(!$('pfMobileStudioBottom')){
   const bottom=document.createElement('nav');bottom.id='pfMobileStudioBottom';bottom.className='pf-mobile-studio-bottom';bottom.setAttribute('aria-label','スマホ用メインナビゲーション');
   bottom.innerHTML=`<button type="button" data-pf-mobile-open="tools" aria-pressed="false"><span>✎</span>ツール</button><button type="button" data-pf-mobile-open="brush" aria-pressed="false"><span>◉</span>ブラシ</button><button type="button" data-pf-mobile-open="color" aria-pressed="false"><span>●</span>カラー</button><button type="button" data-pf-mobile-open="layers" aria-pressed="false"><span>▤</span>レイヤー</button><button type="button" data-pf-mobile-open="more" aria-pressed="false"><span>⋯</span>操作</button>`;
   stage.insertAdjacentElement('afterend',bottom);
  }
  if(!$('pfMobilePanelNav')){
   const head=right.querySelector('.mobile-panel-head');if(head){head.insertAdjacentHTML('afterend',panelTabs()+`<div id="pfMobileToolsGrid" class="pf-mobile-tools-grid" aria-label="ツール一覧"></div>${actionMarkup()}`);}
  }
  // Keep the search / bulk-action toolbar directly below the fixed drawer
  // heading. Earlier insertions placed the sticky category nav before it;
  // both used nearly the same sticky offset and could overlap the close row.
  const toolbar=right.querySelector('.panel-toolbar');
  const nav=right.querySelector('#pfMobilePanelNav');
  const tools=right.querySelector('#pfMobileToolsGrid');
  const actions=right.querySelector('#pfMobileActions');
  if(toolbar&&nav){
   toolbar.after(nav);
   if(tools)nav.after(tools);
   if(actions)(tools||nav).after(actions);
  }
  right.classList.add('pf-mobile-v39');
  return true;
 }
 function allowedTools(){const cfg=window.PF_MODE_UI?.modes?.[getMode()];if(!cfg||cfg.tools==='all')return new Set(TOOL_LIST.map(x=>x[0]));return new Set(cfg.tools||[]);}
 function renderTools(){const grid=$('pfMobileToolsGrid');if(!grid)return;const allowed=allowedTools();grid.innerHTML='';for(const [id,ico,label,key] of TOOL_LIST){if(!allowed.has(id))continue;const b=document.createElement('button');b.type='button';b.dataset.pfMobileTool=id;b.setAttribute('aria-pressed',String(api()?.getTool?.()===id));b.innerHTML=`<span class="pf-mobile-tool-icon">${ico}</span><span>${label}</span>${key?`<small>${key}</small>`:''}`;grid.append(b);}if(getMode()==='pixel'){
   const fill=document.createElement('label');fill.className='pf-mobile-shape-fill';fill.innerHTML=`<input type="checkbox" id="pfMobilePixelFill"> 図形を塗りつぶす`;grid.append(fill);
  }syncPixelFill();}
 function syncPixelFill(){const a=$('pfMobilePixelFill'),b=$('shapeFill');if(!a||!b)return;a.checked=b.checked;a.addEventListener('change',()=>{b.checked=a.checked;b.dispatchEvent(new Event('change',{bubbles:true}));});}
 function activateTab(tab){if(!TAB_LABELS[tab])tab='tools';activeTab=tab;const right=$('rightbar');if(!right)return;right.dataset.pfMobileTab=tab;document.querySelectorAll('[data-pf-mobile-tab]').forEach(b=>{const on=b.dataset.pfMobileTab===tab;b.setAttribute('aria-pressed',String(on));b.classList.toggle('active',on)});document.querySelectorAll('[data-pf-mobile-open]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pfMobileOpen===tab)));openSettings();}
 function setModeSelect(value){const main=$('pfEditorModeSelect');if(!main)return;main.value=value;main.dispatchEvent(new Event('change',{bubbles:true}));syncTopbar();renderTools();}
 function syncTopbar(){const selector=$('pfMobileMode');if(selector)selector.value=getMode();const size=$('sizeNumber'),opacity=$('opacityRange'),mobileSize=$('pfMobileSize'),pixel=getMode()==='pixel';if(mobileSize){mobileSize.max=pixel?'32':'250';}if(size){const n=Math.min(pixel?32:250,Math.max(1,Number(size.value)||1));if(mobileSize)mobileSize.value=String(n);$('pfMobileSizeValue').textContent=String(n);}if(opacity){$('pfMobileOpacity').value=String(opacity.value);$('pfMobileOpacityValue').textContent=opacity.value+'%';}const name=$('docName')||$('projectName')||$('docTitle');if(name&&$('pfMobileProjectLabel'))$('pfMobileProjectLabel').textContent=(name.value||name.textContent||'PIXEL FORGE').slice(0,20);}
 function syncToolButtons(){const selected=api()?.getTool?.();document.querySelectorAll('[data-pf-mobile-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pfMobileTool===selected)));}
 function setPixelWorkspace(recenter=false){if(getMode()!=='pixel')return;const a=api();if(!a)return;
  // Force the actual brush tool; selecting a mode from Home must not inherit Fill/Move/Transform.
  if(a.getTool?.()!=='brush')a.setTool('brush');
  a.setBrushPreset?.('pixel');a.setControl?.('sizeNumber',Math.max(1,Math.round(Number($('pfPixelSize')?.value||1))));
  document.documentElement.dataset.pfPixelGrid=$('pfPixelGridToggle')?.checked===false?'0':'1';
  const display=$('display'),overlay=$('overlay');if(display)display.style.imageRendering='pixelated';if(overlay)overlay.style.imageRendering='pixelated';
  const zoom=$('pfPixelZoom');if(zoom&&recenter){zoom.value='5';window.PF_MODE_ENGINE?.centerZoom?.('5');}
  if($('sizeRange'))$('sizeRange').value=String(Math.max(1,Number($('pfPixelSize')?.value||1)));
  a.refresh?.();syncToolButtons();
 }
 function onModeChange(){syncTopbar();renderTools();syncToolButtons();if(getMode()==='pixel')setTimeout(()=>setPixelWorkspace(false),0);}
 function handleActions(e){const toolBtn=e.target.closest('[data-pf-mobile-tool]');if(toolBtn){api()?.setTool?.(toolBtn.dataset.pfMobileTool);syncToolButtons();closeSettings();return;}
  const tab=e.target.closest('[data-pf-mobile-open],[data-pf-mobile-tab]');if(tab){activateTab(tab.dataset.pfMobileOpen||tab.dataset.pfMobileTab);return;}
  const action=e.target.closest('[data-pf-mobile-action]')?.dataset.pfMobileAction;if(action){const map={save:'#saveBtn',undo:'#undoBtn',redo:'#redoBtn',fit:'#fitBtn',home:'#homeButton',new:'#newBtn',export:'#exportPng',guide:'#brushGuideBtn',search:'#commandPaletteButton'};const el=document.querySelector(map[action]);if(el)el.click();if(action==='home')closeSettings();return;}
  if(e.target.closest('#pfMobilePanelClose,#mobilePanelClose,#mobilePanelScrim')){closeSettings();return;}
  if(e.target.closest('#pfMobileSaveQuick')){$('saveBtn')?.click();return;}
 }
 function attach(){if(isInstalled||!ensureMarkup())return;isInstalled=true;renderTools();syncTopbar();
  document.addEventListener('click',handleActions);
  $('pfMobileMode')?.addEventListener('change',e=>setModeSelect(e.target.value));
  $('pfMobileSize')?.addEventListener('input',e=>{const v=Math.max(1,Math.round(Number(e.target.value)||1));$('pfMobileSizeValue').textContent=String(v);if($('sizeNumber')){$('sizeNumber').value=String(v);$('sizeNumber').dispatchEvent(new Event('change',{bubbles:true}));}if(getMode()==='pixel'&&$('pfPixelSize')){$('pfPixelSize').value=String(Math.min(32,v));$('pfPixelSize').dispatchEvent(new Event('input',{bubbles:true}));}});
  $('pfMobileOpacity')?.addEventListener('input',e=>{const v=Math.max(1,Math.min(100,Number(e.target.value)||100));$('pfMobileOpacityValue').textContent=v+'%';if($('opacityRange')){$('opacityRange').value=String(v);$('opacityRange').dispatchEvent(new Event('input',{bubbles:true}));}});
  $('sizeNumber')?.addEventListener('change',syncTopbar);$('opacityRange')?.addEventListener('input',syncTopbar);
  $('pfEditorModeSelect')?.addEventListener('change',onModeChange);
  window.addEventListener('pf:document-created',e=>{syncTopbar();if(getMode()==='pixel')setTimeout(()=>setPixelWorkspace(true),40);});
  window.addEventListener('pf:document-loaded',()=>{syncTopbar();if(getMode()==='pixel')setTimeout(()=>setPixelWorkspace(true),40);});
  $('pfPixelGridToggle')?.addEventListener('change',()=>{document.documentElement.dataset.pfPixelGrid=$('pfPixelGridToggle').checked?'1':'0';api()?.refresh?.();});
  $('pfPixelSize')?.addEventListener('change',()=>syncTopbar());
  $('mobilePanelScrim')?.addEventListener('click',closeSettings);
  window.addEventListener('resize',()=>{if(!isMobile())closeSettings();syncTopbar();},{passive:true});
  modeObserver=new MutationObserver(onModeChange);modeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-pf-workspace-mode']});
  onModeChange();if(getMode()==='pixel')setTimeout(()=>setPixelWorkspace(true),100);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
 window.PF_MOBILE_STUDIO_V39=Object.freeze({attach,activateTab,setPixelWorkspace,getMode,refresh:()=>{renderTools();syncTopbar();}});
})();
