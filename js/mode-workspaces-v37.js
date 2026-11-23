/* PIXEL FORGE STUDIO v37 — mode-aware home and editor workspaces.
   This layer only changes presentation and safe startup presets; project data format stays untouched. */
(()=>{
 'use strict';
 const KEY='pf-workspace-mode-v37';
 const $=(id)=>document.getElementById(id);
 const modes={
  beginner:{name:'はじめて',level:'STARTER MODE',title:'シンプルな画面で、まず1枚描こう',description:'よく使う色・ブラシ・消しゴム・レイヤーだけを表示します。難しい設定は必要になったときに、いつでも別モードへ切り替えられます。',meta:'初期キャンバス 1600 × 1000 px · 150 DPI',size:[1600,1000,150],bg:'white',brush:'gpen',brushSize:8,panels:['color','brush','eraser','preset','layers','canvas'],tools:['brush','eraser','line','rect','ellipse','fill','eyedropper','hand','text'],mobileTools:['brush','eraser','eyedropper','fill','hand'],coach:true},
  illustration:{name:'イラスト',level:'ILLUSTRATION MODE',title:'線画・塗り・レイヤーを中心に',description:'Gペンや鉛筆、色、塗り、紙質、レイヤーを使いやすく配置。線画から仕上げまでの作業に向いた構成です。',meta:'初期キャンバス 2048 × 2048 px · 300 DPI',size:[2048,2048,300],bg:'white',brush:'gpen',brushSize:6,panels:['color','brush','eraser','smudge','preset','paper','material','reference','typography','transform','feel','layers','canvas','brushLab'],tools:['brush','eraser','smudge','line','rect','ellipse','triangle','curve','fill','eyedropper','gradient','move','transform','text','hand'],mobileTools:['brush','eraser','smudge','eyedropper','fill','hand'],coach:false},
  painting:{name:'アナログ画材',level:'TRADITIONAL MATERIALS',title:'紙・水分・顔料を細かく調整',description:'水彩・油彩・鉛筆・パステルなどの画材と紙の質感を優先表示。筆先や顔料の物理パラメーターもすぐ開けます。',meta:'初期キャンバス 1600 × 1200 px · 300 DPI',size:[1600,1200,300],bg:'white',brush:'watercolor',brushSize:28,panels:['color','brush','eraser','smudge','preset','paper','material','micro','paperPhysics','feel','layers','canvas','brushLab'],tools:['brush','eraser','smudge','line','fill','eyedropper','hand','move'],mobileTools:['brush','eraser','smudge','eyedropper','fill','hand'],coach:false},
  photo:{name:'写真加工',level:'PHOTO WORKSPACE',title:'画像の読み込み・調整・合成',description:'参照画像、変形、フィルター、カラー、レイヤーを中心に整理。画像を読み込んで加工する作業を始めやすくします。',meta:'初期キャンバス 1920 × 1080 px · 96 DPI',size:[1920,1080,96],bg:'white',brush:'softAirbrush',brushSize:28,panels:['color','brush','eraser','smudge','preset','reference','creative','transform','layers','canvas','device'],tools:['brush','eraser','smudge','fill','eyedropper','gradient','move','transform','text','hand'],mobileTools:['brush','eraser','eyedropper','fill','hand'],coach:false},
  design:{name:'デザイン',level:'GRAPHIC DESIGN',title:'図形・文字・構図をまとめて制作',description:'図形、ベジェ、文字、カラー、変形、レイヤーに集中。バナーやSNS画像、タイトルカードなどを作りやすい構成です。',meta:'初期キャンバス 1920 × 1080 px · 96 DPI',size:[1920,1080,96],bg:'white',brush:'millipen',brushSize:4,panels:['color','brush','preset','typography','creative','transform','layers','canvas','brushLab'],tools:['brush','line','rect','ellipse','triangle','star','roundedRect','polygon','arrow','curve','gradient','move','transform','fill','eyedropper','text','hand'],mobileTools:['brush','eraser','fill','eyedropper','hand'],coach:false},
  pixel:{name:'ピクセルアート',level:'PIXEL ART',title:'ピクセル単位でドット絵を作る',description:'ピクセルペンを初期選択し、小さなキャンバスで始めます。色選び・塗りつぶし・レイヤーを中心に表示します。',meta:'初期キャンバス 64 × 64 px · 72 DPI · 透明背景',size:[64,64,72],bg:'transparent',brush:'pixel',brushSize:1,panels:['color','brush','eraser','preset','creative','transform','layers','canvas'],tools:['brush','eraser','line','rect','ellipse','fill','eyedropper','move','transform','hand'],mobileTools:['brush','eraser','fill','eyedropper','hand'],coach:false},
  animation:{name:'アニメーション',level:'FRAME ANIMATION',title:'フレームを重ねて動きを作る',description:'フレームアニメ、レイヤー、文字、キャンバスを優先表示。前後のコマを複製しながら動きを作れます。',meta:'初期キャンバス 1280 × 720 px · 96 DPI',size:[1280,720,96],bg:'transparent',brush:'gpen',brushSize:8,panels:['color','brush','eraser','smudge','preset','typography','animation','transform','layers','canvas'],tools:['brush','eraser','smudge','line','rect','ellipse','fill','eyedropper','gradient','move','transform','text','hand'],mobileTools:['brush','eraser','smudge','fill','hand'],coach:false},
  pro:{name:'上級者',level:'FULL STUDIO',title:'全機能・全設定を表示',description:'すべてのパネルとツールを表示するフルワークスペース。詳細なブラシ調整、描画エンジン、各種補助機能を自由に使えます。',meta:'初期キャンバス 1600 × 1000 px · 300 DPI · カスタム可能',size:[1600,1000,300],bg:'white',brush:'gpen',brushSize:18,panels:'all',tools:'all',mobileTools:'all',coach:false}
 };
 const panelKeys=['color','brush','eraser','smudge','preset','paper','material','micro','paperPhysics','deviceTouch','reference','typography','animation','creative','transform','feel','device','layers','precision','engine','canvas','brushLab'];
 const coachSteps=[
  ['まずはブラシで描いてみましょう','ブラシを選び、キャンバスをなぞるだけ。色や太さは上のバーから変えられます。'],
  ['色と太さを変えてみましょう','右側のカラーから色を選び、上の「サイズ」で線の太さを調整できます。'],
  ['間違えたら元に戻せます','左側の戻るボタン、または Ctrl + Z で直前の操作を戻せます。'],
  ['作品は保存しておきましょう','上の保存ボタン、または Ctrl + S で作品ライブラリに保存できます。']
 ];
 const allTools=['brush','eraser','smudge','line','rect','ellipse','triangle','star','roundedRect','polygon','arrow','curve','gradient','move','transform','fill','eyedropper','text','hand'];
 let selected='beginner',coachIndex=0;
 try{const stored=localStorage.getItem(KEY);if(stored&&modes[stored])selected=stored}catch(_){}
 function notify(message){const toast=$('toast');if(toast){toast.textContent=message;toast.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('show'),2200)}else console.info(message)}
 function panelMap(){const bar=$('rightbar');if(!bar)return;[...bar.querySelectorAll(':scope > .panel')].forEach((panel,index)=>{const key=panelKeys[index];if(key)panel.dataset.pfModePanel=key;});}
 function updateHomeCards(){document.querySelectorAll('[data-pf-mode-select]').forEach(card=>{const active=card.dataset.pfModeSelect===selected;card.setAttribute('aria-pressed',String(active));card.classList.toggle('is-selected',active)});const cfg=modes[selected];const pill=$('pfModeSelectedPill');if(pill)pill.textContent='選択中：'+cfg.name;const level=$('pfModeDetailLevel'),title=$('pfModeDetailTitle'),desc=$('pfModeDetailText'),meta=$('pfModeDetailMeta');if(level)level.textContent=cfg.level;if(title)title.textContent=cfg.name+'：'+cfg.title;if(desc)desc.textContent=cfg.description;if(meta)meta.textContent=cfg.meta;const start=$('pfModeStart');if(start)start.innerHTML='このモードで新規作成 <span>→</span>';}
 function filterTools(cfg){const allowed=cfg.tools==='all'?new Set(allTools):new Set(cfg.tools||[]);document.querySelectorAll('#leftbar [data-tool]').forEach(button=>{button.classList.toggle('pf-mode-tool-hidden',!allowed.has(button.dataset.tool))});const importAllowed=['photo','illustration','animation','pixel','pro'].includes(selected);$('importBtn')?.classList.toggle('pf-mode-tool-hidden',!importAllowed);$('psdImportBtn')?.classList.toggle('pf-mode-tool-hidden',!['photo','illustration','pro'].includes(selected));const left=$('leftbar');if(left){const nodes=[...left.children];nodes.forEach((node,index)=>{if(!node.classList.contains('toolsep'))return;let prev=index-1,next=index+1;while(prev>=0&&!nodes[prev].classList.contains('tool')&&!nodes[prev].classList.contains('toolsep'))prev--;while(next<nodes.length&&!nodes[next].classList.contains('tool')&&!nodes[next].classList.contains('toolsep'))next++;const prevVisible=prev>=0&&nodes[prev].classList.contains('tool')&&!nodes[prev].classList.contains('pf-mode-tool-hidden');const nextVisible=next<nodes.length&&nodes[next].classList.contains('tool')&&!nodes[next].classList.contains('pf-mode-tool-hidden');node.classList.toggle('pf-mode-tool-hidden',!prevVisible||!nextVisible);});}const mobileAllowed=cfg.mobileTools==='all'?new Set(allTools):new Set(cfg.mobileTools||[]);document.querySelectorAll('#mobileDock [data-mobile-tool]').forEach(button=>button.classList.toggle('pf-mode-tool-hidden',!mobileAllowed.has(button.dataset.mobileTool)));}
 function filterPanels(cfg){panelMap();const allowed=cfg.panels==='all'?null:new Set(cfg.panels||[]);document.querySelectorAll('#rightbar > .panel[data-pf-mode-panel]').forEach(panel=>{panel.classList.toggle('pf-mode-panel-hidden',!!allowed&&!allowed.has(panel.dataset.pfModePanel))});}
 function apply(mode,options={}){
  const next=modes[mode]?mode:'beginner';selected=next;const cfg=modes[next];
  Array.from(document.body.classList).forEach(cls=>{if(cls.startsWith('pf-mode-'))document.body.classList.remove(cls)});
  document.body.classList.add('pf-mode-'+next);document.documentElement.dataset.pfWorkspaceMode=next;
  filterPanels(cfg);filterTools(cfg);
  const permitted=new Set(cfg.tools==='all'?allTools:(cfg.tools||[]));const activeTool=document.querySelector('#leftbar .tool.active[data-tool]');if(activeTool&&!permitted.has(activeTool.dataset.tool))$('leftbar')?.querySelector('.tool[data-tool="brush"]')?.click();
  const select=$('pfEditorModeSelect');if(select&&select.value!==next)select.value=next;
  // Keep the workbench and tool/panel filters in lockstep for Home, desktop, and mobile selectors.
  if(window.PF_MODE_ENGINE?.setMode)window.PF_MODE_ENGINE.setMode(next);
  const coach=$('pfBeginnerCoach');if(coach)coach.hidden=!cfg.coach;
  if(cfg.coach)renderCoach();
  updateHomeCards();
  if(options.persist!==false){try{localStorage.setItem(KEY,next)}catch(_){}}
  if(options.notify)notify(cfg.name+'モードに切り替えました');
  return cfg;
 }
 function prepareNewDialog(){const cfg=modes[selected];if(!cfg)return;const size=cfg.size||[1600,1000,300];if($('newWidth'))$('newWidth').value=String(size[0]);if($('newHeight'))$('newHeight').value=String(size[1]);if($('newDpi'))$('newDpi').value=String(size[2]);if($('newBackground'))$('newBackground').value=cfg.bg||'white';if($('newPreset'))$('newPreset').value='custom';const name=$('newProjectName');if(name&&(!name.value||name.value==='Untitled'))name.value=cfg.name+' - Untitled';applyStarterBrush();}
 function applyStarterBrush(){const cfg=modes[selected];if(!cfg)return;const brush=$('brushPreset');if(brush&&cfg.brush&&[...brush.options].some(option=>option.value===cfg.brush)&&brush.value!==cfg.brush){brush.value=cfg.brush;brush.dispatchEvent(new Event('change',{bubbles:true}));}if(cfg.brushSize){const range=$('sizeRange'),number=$('sizeNumber');if(range)range.value=String(Math.min(250,cfg.brushSize));if(number)number.value=String(cfg.brushSize);range?.dispatchEvent(new Event('input',{bubbles:true}));number?.dispatchEvent(new Event('change',{bubbles:true}));}const first=$('leftbar')?.querySelector('[data-tool="brush"]');if(first&&!first.classList.contains('active'))first.click();}
 function renderCoach(){const step=coachSteps[coachIndex%coachSteps.length];const title=$('pfCoachTitle'),text=$('pfCoachText'),counter=$('pfCoachStep');if(title)title.textContent=step[0];if(text)text.textContent=step[1];if(counter)counter.textContent=(coachIndex+1)+' / '+coachSteps.length;}
 function beginNew(){apply(selected,{persist:true});const runner=window.PF_HOME_ACTIONS&&window.PF_HOME_ACTIONS.run;if(typeof runner==='function'){runner('new');requestAnimationFrame(()=>{prepareNewDialog()});}else{$('homeNew')?.click();requestAnimationFrame(()=>{prepareNewDialog()})}}
 function onModeSelected(mode){if(!modes[mode])return;apply(mode,{persist:true});}
 document.addEventListener('click',event=>{const card=event.target.closest('[data-pf-mode-select]');if(card){event.preventDefault();onModeSelected(card.dataset.pfModeSelect);return;}});
 $('pfModeStart')?.addEventListener('click',beginNew);
 $('pfModeLibraryJump')?.addEventListener('click',()=>{const target=$('librarySection')||$('libraryGrid');target?.scrollIntoView({behavior:'smooth',block:'start'});});
 $('pfEditorModeSelect')?.addEventListener('change',event=>apply(event.target.value,{persist:true,notify:true}));
 $('pfModeBackHome')?.addEventListener('click',()=>{if(window.PF_EDITOR_ACTIONS?.home)window.PF_EDITOR_ACTIONS.home()});
 $('pfCoachNext')?.addEventListener('click',()=>{coachIndex=(coachIndex+1)%coachSteps.length;renderCoach()});
 $('pfCoachPrev')?.addEventListener('click',()=>{coachIndex=(coachIndex+coachSteps.length-1)%coachSteps.length;renderCoach()});
 $('pfCoachOpenGuide')?.addEventListener('click',()=>{const modal=$('brushGuideModal');if(modal)modal.classList.remove('hidden');else $('brushGuideBtn')?.click()});
 // A stable anchor lets the home CTA jump to the existing library without altering its data.
 const library=$('libraryGrid')?.closest('.pf-library-section');if(library)library.id='librarySection';
 // The mode is a presentation preference. It is not written into .pforge project content.
 apply(selected,{persist:false});
 window.PF_MODE_UI=Object.freeze({modes,apply,getSelected:()=>selected,prepareNewDialog,applyStarterBrush,beginNew});
})();
