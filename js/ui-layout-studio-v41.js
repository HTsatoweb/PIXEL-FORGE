/* PIXEL FORGE STUDIO v41 — device-specific whole-app UI layout studio.
   UI-only preferences. Project pixels, layers, undo history, and .pforge data are untouched. */
(()=>{
 'use strict';
 const KEY='pf-ui-layout-studio-v41';
 const $=(s,r=document)=>r.querySelector(s);
 const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
 const MODES=['beginner','illustration','painting','photo','design','pixel','animation','pro'];
 const MODE_NAMES={beginner:'はじめて',illustration:'イラスト',painting:'アナログ画材',photo:'写真加工',design:'デザイン',pixel:'ピクセルアート',animation:'アニメーション',pro:'上級者'};
 const DEFAULT_PREFS={density:'standard',scale:100,panelWidth:300,toolSize:42,gap:8,homeColumns:'auto',radius:14,motion:true,tooltips:true,labels:true,panelSide:'right',compactContext:false};
 let data=readData(),selectedDevice=actualDevice(),selectedContext='home',selectedMode=currentMode(),editing=false,activeElement=null,activeKey=null,drawer=null,fab=null,floating=null,searchTerm='';
 let refreshQueued=false,lastContext='',showHiddenOnly=false;
 const registry=new Map();
 function safeParse(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch(_){return fallback}}
 function readData(){try{return safeParse(localStorage.getItem(KEY),{})||{}}catch(_){return {}}}
 function writeData(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(_){announce('UI設定を保存できませんでした。プライベートブラウズや保存容量を確認してください。');}}
 function mobileQuery(){try{return matchMedia('(max-width:760px), (max-width:900px) and (any-pointer:coarse), (max-height:520px) and (any-pointer:coarse)').matches}catch(_){return innerWidth<=760}}
 function actualDevice(){return mobileQuery()?'mobile':'pc'}
 function currentMode(){const v=$('#pfEditorModeSelect')?.value||document.documentElement.dataset.pfWorkspaceMode||'beginner';return MODE_NAMES[v]?v:'beginner'}
 function profileToken(context,mode){return context==='home'?'home':`editor:${mode||currentMode()}`}
 function profile(device,context,mode,create=true){
  const d=data[device]||(create?(data[device]={}):null);if(!d)return null;
  const token=profileToken(context,mode);let p=d[token];
  if(!p&&create)p=d[token]={hidden:[],order:{},prefs:{...DEFAULT_PREFS}};
  if(p){if(!Array.isArray(p.hidden))p.hidden=[];if(!p.order||typeof p.order!=='object')p.order={};p.prefs={...DEFAULT_PREFS,...(p.prefs||{})};}
  return p||null;
 }
 function label(el,fallback){
  const panel=el.querySelector?.(':scope > .panelhead')||el.querySelector?.(':scope > .panelhead, :scope > .pf-wb-module-title');
  const raw=(el.getAttribute?.('aria-label')||el.getAttribute?.('title')||panel?.innerText||el.querySelector?.(':scope > strong')?.innerText||el.innerText||fallback||'UIパーツ').replace(/\s+/g,' ').trim();
  return raw.slice(0,58)||fallback||'UIパーツ';
 }
 function slug(s){return String(s||'item').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,38)||'item'}
 function add(context,el,key,title,group,devices=['pc','mobile']){
  if(!el||!el.isConnected)return;
  const full=`${context}:${key}`;if(registry.has(full))return;
  el.dataset.pfUiKey=full;el.dataset.pfUiContext=context;el.dataset.pfUiDevices=devices.join(',');
  registry.set(full,{key:full,context,el,title:title||label(el,key),group:group||'その他',devices,parent:el.parentElement});
 }
 function addMany(context,selector,keyFn,titleFn,group,devices){
  $$(selector).forEach((el,i)=>add(context,el,keyFn(el,i),titleFn?titleFn(el,i):label(el,`${group} ${i+1}`),group,devices));
 }
 function collect(){
  registry.clear();
  // HOME — desktop and phone shells are separate profiles.
  add('home',$('#homeScreen .pf-home-header'),'home-header-pc','PC：ホームヘッダー','ホーム', ['pc']);
  add('home',$('#homeScreen .pf-home-mobile-header'),'home-header-mobile','スマホ：ホームヘッダー','ホーム', ['mobile']);
  add('home',$('#homeScreen .pf-home-hero'),'home-hero-pc','PC：ホーム紹介','ホーム', ['pc']);
  add('home',$('#homeScreen .pf-home-mobile-hero'),'home-hero-mobile','スマホ：ホーム紹介カード','ホーム', ['mobile']);
  add('home',$('#pfModePicker'),'home-mode-picker','制作モード選択エリア','ホーム');
  addMany('home','#pfModeGrid .pf-mode-card',el=>`home-mode-${el.dataset.pfModeSelect}`,el=>`モードカード：${el.querySelector('strong')?.textContent||el.dataset.pfModeSelect}`,'モードカード');
  add('home',$('#librarySection .pf-library-heading'),'home-library-heading','作品ライブラリ見出し','作品ライブラリ');
  add('home',$('#librarySection .pf-library-controls'),'home-library-search','作品検索・並べ替え','作品ライブラリ');
  add('home',$('#librarySection .pf-home-recovery'),'home-library-recovery','作品の引き継ぎ・バックアップ','作品ライブラリ');
  add('home',$('#libraryBulkBar'),'home-library-bulk','作品の一括操作','作品ライブラリ');
  add('home',$('#libraryGrid'),'home-library-grid','作品カード一覧','作品ライブラリ');
  add('home',$('#libraryEmpty'),'home-library-empty','作品がないときの案内','作品ライブラリ');
  add('home',$('#libraryStatus'),'home-library-status','ライブラリ読み込み状態','作品ライブラリ');
  add('home',$('#homeScreen .pf-home-mobile-dock'),'home-mobile-dock','スマホ：ホーム下部ナビ','ホーム', ['mobile']);
  add('home',$('#homeScreen .pf-home-footer'),'home-footer','ホームのフッター','ホーム');
  addMany('home','#homeScreen .pf-home-actions > button',el=>`home-action-pc-${el.dataset.pfHomeAction||el.id}`,el=>`PC：${label(el)}`,'ホーム操作',['pc']);
  addMany('home','#homeScreen .pf-home-mobile-head-actions > button',el=>`home-action-mobile-${el.dataset.pfHomeAction||el.id}`,el=>`スマホ：${label(el)}`,'ホーム操作',['mobile']);
  addMany('home','#homeScreen .pf-mobile-quick-actions > button',el=>`home-quick-mobile-${el.dataset.pfHomeAction||el.id||slug(el.innerText)}`,el=>`スマホ：${label(el)}`,'ホーム操作',['mobile']);
  addMany('home','#homeScreen .pf-home-mobile-dock > button',el=>`home-dock-${el.dataset.pfHomeAction||slug(el.innerText)}`,el=>`ホーム下部：${label(el)}`,'ホーム操作',['mobile']);
  // EDITOR — tool, context, navigation and every right-side panel are individually configurable.
  add('editor',$('#app .topbar .brand'),'editor-brand','PIXEL FORGE ロゴ','上部バー');
  add('editor',$('#app .topbar .menu'),'editor-menu','ファイル・編集などのメニュー','上部バー',['pc']);
  add('editor',$('#app .topbar .docname'),'editor-docname','作品名表示','上部バー');
  const topActions=[['commandPaletteButton','コマンド検索'],['homeButton','ホームへ戻る'],['settingsButton','全体設定'],['helpSiteButton','ヘルプ'],['panelToggle','パネル切替'],['newBtn','新規作成'],['saveBtn','保存']];
  topActions.forEach(([id,title])=>add('editor',$('#'+id),`editor-top-${id}`,title,'上部バー'));
  add('editor',$('#updateNotice'),'editor-update-notice','アップデートのお知らせ','上部バー');
  addMany('editor','#leftbar > .tool',el=>`editor-tool-${el.dataset.tool||el.id||slug(el.getAttribute('aria-label'))}`,el=>`ツール：${label(el)}`,'左ツールバー');
  add('editor',$('#app .contextbar .pf-editor-mode-control'),'editor-context-mode','制作モード切替','上部オプション');
  addMany('editor','#app .contextbar > .context-group',el=>`editor-context-${slug(el.querySelector('label')?.textContent||el.innerText)}`,el=>`上部オプション：${label(el)}`,'上部オプション');
  add('editor',$('#pfBeginnerCoach'),'editor-beginner-coach','初心者ガイド','ガイド・状態');
  add('editor',$('#app .stage .mobile-dock'),'editor-mobile-dock','スマホ：キャンバスクイック操作','スマホ操作',['mobile']);
  addMany('editor','#app .stage .mobile-dock > button',el=>`editor-mobile-action-${el.id||el.dataset.mobileTool||slug(el.getAttribute('aria-label')||el.innerText)}`,el=>`スマホ操作：${label(el)}`,'スマホ操作',['mobile']);
  add('editor',$('#rightbar .mobile-panel-head'),'editor-mobile-panel-head','スマホ：設定パネル見出し','スマホ操作',['mobile']);
  addMany('editor','#rightbar > .panel',el=>`editor-panel-${el.id||slug(el.querySelector('.panelhead')?.innerText||el.innerText)}`,el=>`設定パネル：${label(el)}`,'設定パネル');
  addMany('editor','#app .bottombar > span',el=>`editor-status-${el.id||slug(el.innerText)}`,el=>`ステータス：${label(el)}`,'ステータス');
  // V40 workbench modules keep their own X/restore tray; expose one whole group switch in this manager.
  add('editor',$('#pfModeWorkbench'),'editor-mode-workbench','モード別 START HERE / WORKBENCH','モード別ガイド');
 }
 function contextNow(){return document.body.classList.contains('pf-home-active')?'home':'editor'}
 function getApplicable(context,device,mode){collect();return [...registry.values()].filter(x=>x.context===context&&x.devices.includes(device))}
 function actualProfileFor(context){return profile(actualDevice(),context,currentMode(),true)}
 function setAttrs(){
  const dev=actualDevice();document.body.dataset.pfUiDevice=dev;
  for(const context of ['home','editor']){
   const p=profile(dev,context,currentMode(),true),hidden=new Set(p.hidden);
   getApplicable(context,dev,currentMode()).forEach(m=>{
    const isHidden=hidden.has(m.key);m.el.dataset.pfUiHidden=isHidden?'1':'0';m.el.setAttribute('aria-hidden',isHidden?'true':'false');
   });
  }
  applyPrefs(contextNow(),dev);
 }
 function applyPrefs(context,device){
  const p=profile(device,context,currentMode(),true),v=p.prefs||DEFAULT_PREFS,body=document.body,root=document.documentElement;
  body.dataset.pfUiDensity=v.density;body.dataset.pfUiPanelSide=v.panelSide;body.dataset.pfUiMotion=v.motion?'on':'off';body.dataset.pfUiLabels=v.labels?'on':'off';body.dataset.pfUiTooltips=v.tooltips?'on':'off';body.dataset.pfUiCompactContext=v.compactContext?'on':'off';
  root.style.setProperty('--pf-user-ui-scale',(Number(v.scale)||100)/100);
  root.style.setProperty('--pf-user-panel-width',`${Number(v.panelWidth)||300}px`);
  root.style.setProperty('--pf-user-tool-size',`${Number(v.toolSize)||42}px`);
  root.style.setProperty('--pf-user-ui-gap',`${Number(v.gap)||8}px`);
  root.style.setProperty('--pf-user-ui-radius',`${Number(v.radius)||14}px`);
  root.style.setProperty('--pf-user-home-columns',v.homeColumns==='auto'?'auto-fit':(v.homeColumns||'auto-fit'));body.dataset.pfUiHomeColumns=v.homeColumns||'auto';
 }
 function announce(message){const toast=$('#toast');if(toast){toast.textContent=message;toast.classList.add('show');clearTimeout(announce.timer);announce.timer=setTimeout(()=>toast.classList.remove('show'),2400)}else console.info('[PIXEL FORGE]',message)}
 function openManager(context){
  selectedContext=context||contextNow();selectedDevice=actualDevice();selectedMode=currentMode();editing=false;activeElement=null;activeKey=null;
  drawer.hidden=false;drawer.classList.add('is-open');document.body.classList.add('pf-ui-manager-open');renderManager();
 }
 function closeManager(){drawer.classList.remove('is-open');drawer.hidden=true;document.body.classList.remove('pf-ui-manager-open');setEditing(false)}
 function selectedProfile(){return profile(selectedDevice,selectedContext,selectedMode,true)}
 function itemOrderKey(item){const parent=item.el.parentElement;return parent?(parent.id||[...parent.classList].find(c=>c.startsWith('pf-')||c==='rightbar'||c==='leftbar'||c==='contextbar')||parent.tagName.toLowerCase()):'root'}
 function isOrderable(item){if(!item?.el?.parentElement)return false;const display=getComputedStyle(item.el.parentElement).display;return display==='flex'||display==='inline-flex'||display==='grid'||display==='inline-grid'}
 function applyOrders(context=selectedContext,device=selectedDevice,mode=selectedMode){
  const groups=new Map();for(const item of getApplicable(context,device,mode)){const key=itemOrderKey(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item)}
  const p=profile(device,context,mode,true);for(const [parentKey,items] of groups){const saved=p.order[parentKey];const ordered=saved? [...items].sort((a,b)=>{const ai=saved.indexOf(a.key),bi=saved.indexOf(b.key);return (ai<0?9999:ai)-(bi<0?9999:bi)}):items;ordered.forEach((item,index)=>{item.el.style.order=String(index*10)});}
 }
 function moveItem(key,direction){const p=selectedProfile(),items=getApplicable(selectedContext,selectedDevice,selectedMode).filter(x=>isOrderable(x));const item=items.find(x=>x.key===key);if(!item)return;const parentKey=itemOrderKey(item),siblings=items.filter(x=>itemOrderKey(x)===parentKey);const saved=p.order[parentKey]||siblings.map(x=>x.key);const normalized=siblings.map(x=>x.key).sort((a,b)=>{const ai=saved.indexOf(a),bi=saved.indexOf(b);return (ai<0?9999:ai)-(bi<0?9999:bi)});const index=normalized.indexOf(key),next=index+direction;if(index<0||next<0||next>=normalized.length)return;[normalized[index],normalized[next]]=[normalized[next],normalized[index]];p.order[parentKey]=normalized;writeData();applyOrders();renderItems();}
 function setHidden(key,hidden){const p=selectedProfile();const set=new Set(p.hidden);if(hidden)set.add(key);else set.delete(key);p.hidden=[...set];writeData();if(selectedDevice===actualDevice())setAttrs();renderItems();}
 function resetProfile(){const p=selectedProfile();p.hidden=[];p.order={};p.prefs={...DEFAULT_PREFS};writeData();if(selectedDevice===actualDevice())setAttrs();applyOrders(selectedContext,selectedDevice,selectedMode);renderManager();if(selectedContext==='editor'&&window.PF_WORKBENCH_CUSTOMIZER?.showAll)window.PF_WORKBENCH_CUSTOMIZER.showAll();announce('この端末・モードのUIを標準状態に戻しました');}
 function preset(kind){
  const p=selectedProfile();
  if(kind==='standard'){p.hidden=[];p.order={};p.prefs={...DEFAULT_PREFS};}
  else{
   const items=getApplicable(selectedContext,selectedDevice,selectedMode);
   const shouldHide=item=>{
    if(kind==='clean'){
     if(selectedContext==='home')return ['home-library-recovery','home-library-bulk','home-library-status','home-footer'].some(x=>item.key.endsWith(x));
     return ['editor-update-notice','editor-top-helpSiteButton','editor-status-coordsText','editor-status-docSizeText'].some(x=>item.key.endsWith(x)) || /微細|PAPER MICROSTRUCTURE|ENGINE STATUS/.test(item.title);
    }
    if(selectedContext==='home')return ['home-hero-pc','home-hero-mobile','home-library-recovery','home-library-bulk','home-footer'].some(x=>item.key.endsWith(x));
    return ['editor-update-notice','editor-menu','editor-docname','editor-top-helpSiteButton','editor-status-coordsText','editor-status-docSizeText'].some(x=>item.key.endsWith(x)) || /ULTRA MICRO|PAPER MICROSTRUCTURE|ENGINE STATUS/.test(item.title);
   };
   p.hidden=items.filter(shouldHide).map(x=>x.key);
   p.prefs={...DEFAULT_PREFS,density:'compact',scale:96,toolSize:selectedDevice==='mobile'?44:38,gap:5,labels:selectedDevice==='pc',compactContext:true};
  }
  writeData();if(selectedDevice===actualDevice())setAttrs();applyOrders(selectedContext,selectedDevice,selectedMode);renderManager();announce(kind==='standard'?'標準レイアウトに戻しました':kind==='focus'?'集中レイアウトを適用しました':'すっきりレイアウトを適用しました');
 }
 function setEditing(value){editing=!!value;document.body.classList.toggle('pf-ui-editing',editing);if(!editing){activeElement=null;activeKey=null;floating.hidden=true;}else announce('隠したいUIに触れると、その場所に×が表示されます');const btn=$('[data-pf-ui-edit-toggle]',drawer);if(btn){btn.setAttribute('aria-pressed',String(editing));btn.textContent=editing?'× 直接整理を終了':'× 画面上で直接整理';}}
 function setActive(item){if(!editing||!item||selectedDevice!==actualDevice()||item.context!==contextNow())return;activeElement=item.el;activeKey=item.key;positionFloating();floating.hidden=false;}
 function positionFloating(){if(!activeElement||!activeElement.isConnected){floating.hidden=true;return}const r=activeElement.getBoundingClientRect();if(!r.width||!r.height){floating.hidden=true;return;}const top=Math.max(5,Math.min(innerHeight-44,r.top+4));const left=Math.max(5,Math.min(innerWidth-42,r.right-34));floating.style.top=`${top}px`;floating.style.left=`${left}px`;}
 function hideActive(){if(!activeKey)return;const key=activeKey;setHidden(key,true);setEditing(false);announce('UIを非表示にしました。UI整理メニューからいつでも戻せます');}
 function rowFor(item,p,search){
  const hidden=p.hidden.includes(item.key),row=document.createElement('div');row.className='pf-ui-item-row';row.dataset.pfUiRow=item.key;
  const labelEl=document.createElement('label');labelEl.className='pf-ui-item-label';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=!hidden;checkbox.dataset.pfUiVisible=item.key;
  const title=document.createElement('span');title.textContent=item.title;
  labelEl.append(checkbox,title);row.append(labelEl);
  if(isOrderable(item)){const up=document.createElement('button');up.type='button';up.className='pf-ui-row-move';up.dataset.pfUiMove='-1';up.dataset.key=item.key;up.textContent='↑';up.title='上へ移動';const down=document.createElement('button');down.type='button';down.className='pf-ui-row-move';down.dataset.pfUiMove='1';down.dataset.key=item.key;down.textContent='↓';down.title='下へ移動';row.append(up,down)}
  if(hidden){const restore=document.createElement('button');restore.type='button';restore.className='pf-ui-row-restore';restore.dataset.pfUiRestore=item.key;restore.textContent='戻す';row.append(restore)}
  row.dataset.hidden=String(hidden);row.hidden=(!!search&&!`${item.title} ${item.group}`.toLowerCase().includes(search.toLowerCase()))||(showHiddenOnly&&!hidden);return row;
 }
 function renderItems(){
  const list=$('#pfUiItemList',drawer),counter=$('#pfUiItemCount',drawer);if(!list)return;list.replaceChildren();const p=selectedProfile(),items=getApplicable(selectedContext,selectedDevice,selectedMode);const groups=new Map();items.forEach(item=>{if(!groups.has(item.group))groups.set(item.group,[]);groups.get(item.group).push(item)});
  for(const [name,groupItems] of groups){const section=document.createElement('section');section.className='pf-ui-list-group';const heading=document.createElement('h3');const groupName=document.createElement('span');groupName.textContent=name;const tools=document.createElement('div');tools.className='pf-ui-group-tools';const count=document.createElement('small');const hiddenCount=groupItems.filter(x=>p.hidden.includes(x.key)).length;count.textContent=`${groupItems.length-hiddenCount}/${groupItems.length}`;const toggle=document.createElement('button');toggle.type='button';toggle.className='pf-ui-group-toggle';toggle.dataset.pfUiGroupToggle=name;toggle.textContent=hiddenCount===groupItems.length?'すべて表示':'すべて隠す';toggle.title=`${name}のUIをまとめて${hiddenCount===groupItems.length?'表示':'非表示'}`;tools.append(count,toggle);heading.append(groupName,tools);section.appendChild(heading);groupItems.forEach(item=>section.appendChild(rowFor(item,p,searchTerm)));list.appendChild(section)}
  const visible=items.filter(x=>!p.hidden.includes(x.key)).length;counter.textContent=`${items.length} 個のUIパーツ · ${visible} 個表示中 · ${items.length-visible} 個非表示`;
  const capacity=$('#pfUiCapacity',drawer);if(capacity)capacity.textContent=`PC／スマホ別・8モード別の独立した表示設定：${visibilitySlotCount().toLocaleString('ja-JP')} スロット`;const hiddenFilter=$('#pfUiShowHiddenOnly',drawer);if(hiddenFilter){hiddenFilter.setAttribute('aria-pressed',String(showHiddenOnly));hiddenFilter.textContent=showHiddenOnly?'すべての項目を見る':'非表示だけを見る';}
  $('#pfUiOtherDeviceNote',drawer).hidden=selectedDevice===actualDevice();$('#pfUiEditToggle',drawer).disabled=selectedDevice!==actualDevice()||selectedContext!==contextNow();if($('#pfUiEditToggle',drawer).disabled&&editing)setEditing(false);
  renderPrefs();
 }
 function visibilitySlotCount(){
  collect();let total=0;
  for(const item of registry.values()){
   if(item.context==='editor')total+=item.devices.length*MODES.length;
   else total+=item.devices.length;
  }
  return total;
 }
 function prefControl(labelText,key,type,options,min,max,step,suffix){
  const wrap=document.createElement('label');wrap.className='pf-ui-pref';const top=document.createElement('span');top.className='pf-ui-pref-label';top.textContent=labelText;const current=selectedProfile().prefs[key];let control;
  if(type==='select'){control=document.createElement('select');options.forEach(([v,t])=>{const opt=document.createElement('option');opt.value=v;opt.textContent=t;control.appendChild(opt)});control.value=String(current)}
  else{control=document.createElement('input');control.type='range';control.min=min;control.max=max;control.step=step;control.value=String(current)}
  control.dataset.pfUiPref=key;const value=document.createElement('output');value.textContent=type==='range'?`${current}${suffix||''}`:'';wrap.append(top,control,value);return wrap;
 }
 function renderPrefs(){
  const box=$('#pfUiPrefs',drawer);if(!box)return;box.replaceChildren();const p=selectedProfile(),v=p.prefs;
  const controls=[
   prefControl('UIの密度','density','select',[['compact','コンパクト'],['standard','標準'],['spacious','ゆったり']]),
   prefControl('全体の大きさ','scale','range',null,85,120,1,'%'),
   prefControl('設定パネルの幅（PC）','panelWidth','range',null,240,430,5,'px'),
   prefControl('左ツールの大きさ','toolSize','range',null,34,54,1,'px'),
   prefControl('パネル間の余白','gap','range',null,0,18,1,'px'),
   prefControl('角丸の大きさ','radius','range',null,4,24,1,'px'),
   prefControl('ホームのカード列数（PC）','homeColumns','select',[['auto','自動'],['1','1列'],['2','2列'],['3','3列'],['4','4列']]),
   prefControl('設定パネルの位置','panelSide','select',[['right','右側'],['left','左側']])
  ];controls.forEach(x=>box.appendChild(x));
  const toggles=[['アニメーションを使用','motion'],['ツールのヒントを表示','tooltips'],['上部ボタンの文字を表示','labels'],['上部オプションをコンパクト表示','compactContext']];
  const toggleWrap=document.createElement('div');toggleWrap.className='pf-ui-pref-toggles';toggles.forEach(([text,key])=>{const l=document.createElement('label');const c=document.createElement('input');c.type='checkbox';c.checked=!!v[key];c.dataset.pfUiPref=key;const s=document.createElement('span');s.textContent=text;l.append(c,s);toggleWrap.appendChild(l)});box.appendChild(toggleWrap);
 }
 function renderManager(){
  $('#pfUiContextHome',drawer).setAttribute('aria-pressed',String(selectedContext==='home'));$('#pfUiContextEditor',drawer).setAttribute('aria-pressed',String(selectedContext==='editor'));
  $('#pfUiDevicePc',drawer).setAttribute('aria-pressed',String(selectedDevice==='pc'));$('#pfUiDeviceMobile',drawer).setAttribute('aria-pressed',String(selectedDevice==='mobile'));
  $('#pfUiModeWrap',drawer).hidden=selectedContext!=='editor';$('#pfUiModeSelect',drawer).value=selectedMode;$('#pfUiSearch',drawer).value=searchTerm;
  renderItems();
 }
 function applyPresetOrPrefs(key,value){const p=selectedProfile();if(key==='motion'||key==='tooltips'||key==='labels'||key==='compactContext')p.prefs[key]=!!value;else if(key==='scale'||key==='panelWidth'||key==='toolSize'||key==='gap'||key==='radius')p.prefs[key]=Number(value);else p.prefs[key]=value;writeData();if(selectedDevice===actualDevice()&&selectedContext===contextNow())applyPrefs(selectedContext,selectedDevice);const output=$(`[data-pf-ui-pref="${key}"]`,drawer)?.parentElement?.querySelector('output');if(output&&['scale','panelWidth','toolSize','gap','radius'].includes(key))output.textContent=key==='scale'?`${value}%`:key==='panelWidth'||key==='toolSize'||key==='gap'?`${value}px`:`${value}px`;}
 function createUI(){
  fab=document.createElement('button');fab.type='button';fab.id='pfUiFab';fab.className='pf-ui-fab';fab.textContent='☷ UI整理';fab.setAttribute('aria-label','UIの表示と配置を整理');fab.title='PC版・スマホ版のUIを個別に整理';
  drawer=document.createElement('div');drawer.id='pfUiManager';drawer.className='pf-ui-manager';drawer.hidden=true;drawer.setAttribute('aria-hidden','true');
  drawer.innerHTML=`<div class="pf-ui-backdrop" data-pf-ui-close></div><section class="pf-ui-dialog" role="dialog" aria-modal="true" aria-labelledby="pfUiTitle"><header class="pf-ui-dialog-head"><div><span>PIXEL FORGE · LAYOUT STUDIO</span><h2 id="pfUiTitle">画面を自分好みに整理</h2><p>隠しても機能や作品は削除されません。いつでも元に戻せます。</p></div><button type="button" class="pf-ui-dialog-close" data-pf-ui-close aria-label="閉じる">×</button></header><div class="pf-ui-context-tabs"><button type="button" id="pfUiContextHome" aria-pressed="true">ホーム</button><button type="button" id="pfUiContextEditor" aria-pressed="false">エディター</button></div><div class="pf-ui-device-row"><span>設定する画面</span><div><button type="button" id="pfUiDevicePc" aria-pressed="true">PC</button><button type="button" id="pfUiDeviceMobile" aria-pressed="false">スマホ</button></div></div><p id="pfUiOtherDeviceNote" class="pf-ui-other-note" hidden>現在使用中とは別の端末レイアウトを編集しています。設定はその画面幅で適用されます。</p><div class="pf-ui-mode-row" id="pfUiModeWrap"><label for="pfUiModeSelect">制作モード</label><select id="pfUiModeSelect"><option value="beginner">はじめて</option><option value="illustration">イラスト</option><option value="painting">アナログ画材</option><option value="photo">写真加工</option><option value="design">デザイン</option><option value="pixel">ピクセルアート</option><option value="animation">アニメーション</option><option value="pro">上級者</option></select></div><div class="pf-ui-actions"><button type="button" id="pfUiEditToggle" data-pf-ui-edit-toggle>× 画面上で直接整理</button><button type="button" data-pf-ui-preset="clean">すっきり</button><button type="button" data-pf-ui-preset="focus">集中</button><button type="button" data-pf-ui-preset="standard">標準</button></div><label class="pf-ui-search"><span>⌕</span><input type="search" id="pfUiSearch" placeholder="UIの名前を検索…" autocomplete="off"></label><button type="button" class="pf-ui-hidden-filter" id="pfUiShowHiddenOnly" aria-pressed="false">非表示だけを見る</button><div class="pf-ui-item-count" id="pfUiItemCount"></div><div class="pf-ui-capacity" id="pfUiCapacity"></div><div class="pf-ui-item-list" id="pfUiItemList"></div><details class="pf-ui-advanced"><summary>見た目・操作感の細かい設定</summary><div class="pf-ui-prefs" id="pfUiPrefs"></div></details><footer class="pf-ui-dialog-foot"><button type="button" id="pfUiReset">このレイアウトを初期化</button><button type="button" id="pfUiRestoreAll">隠したUIをすべて表示</button></footer></section>`;
  floating=document.createElement('button');floating.type='button';floating.id='pfUiFloatingHide';floating.className='pf-ui-floating-hide';floating.textContent='×';floating.title='このUIを隠す';floating.setAttribute('aria-label','選択したUIを隠す');floating.hidden=true;
  document.body.append(fab,drawer,floating);
  fab.addEventListener('click',()=>openManager());
  drawer.addEventListener('click',onManagerClick);drawer.addEventListener('change',onManagerChange);drawer.addEventListener('input',onManagerInput);
  floating.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();hideActive()});
  document.addEventListener('pointerover',onPointerOver,true);document.addEventListener('pointerdown',onPointerDown,true);document.addEventListener('click',onDocumentClick,true);
  window.addEventListener('resize',()=>{syncDevice();positionFloating()},{passive:true});window.addEventListener('scroll',positionFloating,true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!drawer.hidden)closeManager();else if(editing)setEditing(false)}});
 }
 function onManagerClick(event){
  const close=event.target.closest('[data-pf-ui-close]');if(close){closeManager();return}
  if(event.target.closest('#pfUiEditToggle')){setEditing(!editing);if(editing){drawer.classList.remove('is-open');drawer.hidden=true;drawer.setAttribute('aria-hidden','true');document.body.classList.remove('pf-ui-manager-open');}return;}
  const context=event.target.closest('[id="pfUiContextHome"],[id="pfUiContextEditor"]');if(context){selectedContext=context.id==='pfUiContextHome'?'home':'editor';selectedMode=currentMode();searchTerm='';showHiddenOnly=false;renderManager();return}
  const device=event.target.closest('[id="pfUiDevicePc"],[id="pfUiDeviceMobile"]');if(device){selectedDevice=device.id==='pfUiDevicePc'?'pc':'mobile';renderManager();return}
  const presetBtn=event.target.closest('[data-pf-ui-preset]');if(presetBtn){preset(presetBtn.dataset.pfUiPreset);return}
  if(event.target.closest('#pfUiShowHiddenOnly')){showHiddenOnly=!showHiddenOnly;renderItems();return}
  const groupToggle=event.target.closest('[data-pf-ui-group-toggle]');if(groupToggle){const group=groupToggle.dataset.pfUiGroupToggle,items=getApplicable(selectedContext,selectedDevice,selectedMode).filter(x=>x.group===group),p=selectedProfile(),hidden=new Set(p.hidden),hide=items.some(x=>!hidden.has(x.key));items.forEach(x=>hide?hidden.add(x.key):hidden.delete(x.key));p.hidden=[...hidden];writeData();if(selectedDevice===actualDevice())setAttrs();renderItems();announce(`${group}を${hide?'まとめて非表示':'まとめて表示'}しました`);return}
  const restore=event.target.closest('[data-pf-ui-restore]');if(restore){setHidden(restore.dataset.pfUiRestore,false);return}
  const move=event.target.closest('[data-pf-ui-move]');if(move){moveItem(move.dataset.key,Number(move.dataset.pfUiMove));return}
  if(event.target.id==='pfUiReset'){resetProfile();return}
  if(event.target.id==='pfUiRestoreAll'){const p=selectedProfile();p.hidden=[];writeData();if(selectedDevice===actualDevice())setAttrs();renderManager();if(selectedContext==='editor')window.PF_WORKBENCH_CUSTOMIZER?.showAll?.();announce('非表示にしたUIをすべて表示しました');}
 }
 function onManagerChange(event){
  const checkbox=event.target.closest('[data-pf-ui-visible]');if(checkbox){setHidden(checkbox.dataset.pfUiVisible,!checkbox.checked);return}
  const pref=event.target.closest('[data-pf-ui-pref]');if(pref){applyPresetOrPrefs(pref.dataset.pfUiPref,pref.type==='checkbox'?pref.checked:pref.value);}
  if(event.target.id==='pfUiModeSelect'){selectedMode=event.target.value;searchTerm='';showHiddenOnly=false;renderManager();}
 }
 function onManagerInput(event){if(event.target.id==='pfUiSearch'){searchTerm=event.target.value;const list=$('#pfUiItemList',drawer);$$('.pf-ui-item-row',list).forEach(row=>{const t=row.querySelector('.pf-ui-item-label span')?.textContent||'',g=row.closest('.pf-ui-list-group')?.querySelector('h3 > span')?.textContent||'';row.hidden=(!!searchTerm&&!`${t} ${g}`.toLowerCase().includes(searchTerm.toLowerCase()))||(showHiddenOnly&&row.dataset.hidden!=='true')});return;}const pref=event.target.closest('[data-pf-ui-pref]');if(pref&&pref.type==='range'){applyPresetOrPrefs(pref.dataset.pfUiPref,pref.value);}}
 function findItemFromEvent(event){const el=event.target?.closest?.('[data-pf-ui-key]');if(!el||el.closest('#pfUiManager,#pfUiFab,#pfUiFloatingHide'))return null;return registry.get(el.dataset.pfUiKey)||null}
 function onPointerOver(event){if(!editing)return;const item=findItemFromEvent(event);if(item)setActive(item);else if(!event.target.closest('#pfUiFloatingHide'))floating.hidden=true;}
 function onPointerDown(event){if(!editing||event.pointerType==='mouse')return;const item=findItemFromEvent(event);if(item)setActive(item);}
 function onDocumentClick(event){
  if(event.target.closest('#pfUiManager,#pfUiFab,#pfUiFloatingHide'))return;
  if(editing){const item=findItemFromEvent(event);if(item){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();setActive(item);return;}}
 }
 function syncDevice(){const now=actualDevice();if(document.body.dataset.pfUiDevice!==now){document.body.dataset.pfUiDevice=now;setAttrs();if(!drawer.hidden){selectedDevice=now;renderManager();}}}
 function refresh(){collect();setAttrs();applyOrders('home',actualDevice(),'beginner');applyOrders('editor',actualDevice(),currentMode());if(!drawer.hidden)renderManager();}
 function queueRefresh(){if(refreshQueued)return;refreshQueued=true;requestAnimationFrame(()=>{refreshQueued=false;refresh()})}
 function init(){createUI();refresh();const observer=new MutationObserver(records=>{const relevant=records.some(r=>{if(r.type==='attributes')return r.target===document.body&&r.attributeName==='class';if(r.target?.closest?.('#pfUiManager,#pfUiFab,#pfUiFloatingHide'))return false;return r.addedNodes.length||r.removedNodes.length});if(relevant)queueRefresh()});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});$('#pfEditorModeSelect')?.addEventListener('change',()=>{selectedMode=currentMode();queueRefresh();});document.body.addEventListener('click',event=>{if(event.target.closest('#homeButton,#mobileHomeButton'))setTimeout(()=>{selectedContext='home';queueRefresh()},80);});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.PF_UI_LAYOUT_STUDIO=Object.freeze({refresh,open:openManager,showAll(context,device,mode){const p=profile(device||actualDevice(),context||contextNow(),mode||currentMode(),true);p.hidden=[];writeData();refresh();},getIndependentVisibilitySettings(){collect();let total=0;for(const item of registry.values()){const devices=item.devices.length;total+=devices*(item.context==='editor'?MODES.length:1)}return total;}});
})();
