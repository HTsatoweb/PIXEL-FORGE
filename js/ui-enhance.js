/* PIXEL FORGE v6 UI enhancement layer — no drawing functions are replaced. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const safeStore={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
  const right=$('#rightbar'),workspace=$('.workspace');
  if(!right||!workspace)return;

  // Keep the existing panels and controls intact; add navigation around them.
  const toolbar=document.createElement('div');
  toolbar.className='panel-toolbar';
  toolbar.innerHTML=`
    <div class="panel-search-wrap">
      <span class="panel-search-icon" aria-hidden="true">⌕</span>
      <input class="panel-search" id="panelSearch" type="search" autocomplete="off" placeholder="設定・機能を検索…  Ctrl + Alt + K" aria-label="設定と機能を検索">
      <button type="button" class="panel-search-clear" id="panelSearchClear" title="検索文字だけを消去（設定パネルは閉じません）" aria-label="検索文字を消去">×</button>
    </div>
    <div class="panel-search-results" id="panelSearchResults" role="listbox" aria-label="検索結果"></div>
    <div class="panel-toolbar-actions">
      <button type="button" class="smallbtn" id="expandAllPanels" title="すべての設定パネルを開く">全て開く</button>
      <button type="button" class="smallbtn" id="collapseAllPanels" title="すべての設定パネルを閉じる">全て閉じる</button>
      <button type="button" class="smallbtn panel-close-mobile" id="closeSettingsPanel" data-pf-settings-close aria-label="設定パネルを閉じる" aria-controls="rightbar" title="設定パネルを閉じる">閉じる ×</button>
    </div>`;
  const drawerHead=$('.mobile-panel-head',right);
  if(drawerHead)drawerHead.after(toolbar);else right.prepend(toolbar);

  // Add restrained category glyphs to the existing headings.
  const glyphs=[
    [/COLOR|カラー/i,'◉'],[/BRUSH|ブラシ/i,'✎'],[/ANALOG|画材|PEN/i,'✒'],[/PAPER|紙/i,'▤'],[/TRACE|REFERENCE|下敷/i,'▧'],[/TYPOGRAPHY|文字/i,'T'],[/ANIMATION|アニメ/i,'▶'],[/CREATIVE|編集ツール/i,'✧'],[/TRANSFORM|変形/i,'◇'],[/FEEL|描き心地/i,'⌁'],[/DEVICE|PERFORMANCE|外部機器/i,'⌘'],[/LAYERS|レイヤー/i,'▱'],[/CANVAS|キャンバス/i,'▦']
  ];
  $$('.panelhead',right).forEach((head,i)=>{
    if(!$('.pf-panel-icon',head)){
      const text=head.textContent||'';
      const found=glyphs.find(([re])=>re.test(text));
      const icon=document.createElement('span');icon.className='pf-panel-icon';icon.setAttribute('aria-hidden','true');icon.textContent=found?found[1]:'·';
      head.prepend(icon);
    }
    const panel=head.closest('.panel');
    if(panel){
      const key=panel.id||`panel-${i}`;
      const saved=safeStore.get(`pf-v6-panel:${key}`);
      if(saved==='open')panel.classList.remove('folded');
      if(saved==='closed')panel.classList.add('folded');
    }
  });

  // Persist folds while preserving the original click/keyboard handlers.
  const panelObserver=new MutationObserver(records=>{
    for(const rec of records){
      if(rec.type!=='attributes'||rec.attributeName!=='class')continue;
      const panel=rec.target;
      if(!panel.classList.contains('panel'))continue;
      const head=$('.panelhead',panel);
      if(head)head.setAttribute('aria-expanded',String(!panel.classList.contains('folded')));
      const key=panel.id||`panel-${$$('.panel',right).indexOf(panel)}`;
      safeStore.set(`pf-v6-panel:${key}`,panel.classList.contains('folded')?'closed':'open');
    }
  });
  $$('.panel',right).forEach(p=>panelObserver.observe(p,{attributes:true,attributeFilter:['class']}));

  $('#expandAllPanels')?.addEventListener('click',()=>$$('.panel',right).forEach(p=>{p.classList.remove('folded');$('.panelhead',p)?.setAttribute('aria-expanded','true')}));
  $('#collapseAllPanels')?.addEventListener('click',()=>$$('.panel',right).forEach(p=>{p.classList.add('folded');$('.panelhead',p)?.setAttribute('aria-expanded','false')}));

  // Search locates a setting; it never removes or disables controls.
  const search=$('#panelSearch'),results=$('#panelSearchResults');
  const normalize=s=>(s||'').toLocaleLowerCase('ja').replace(/[\s　・:：()（）]/g,'');
  function labelFor(el){
    if(el.id){const l=$(`label[for="${CSS.escape(el.id)}"]`,right);if(l)return l.textContent.trim()}
    const wrap=el.closest('.field,.fieldrow,.context-group');
    const l=wrap?$('label',wrap):null;
    return (l?.textContent||el.getAttribute('aria-label')||el.title||el.textContent||el.id||'設定').trim().replace(/\s+/g,' ').slice(0,70);
  }
  function panelName(panel){const h=$('.panelhead',panel);return (h?.textContent||'設定パネル').replace(/\s+/g,' ').trim()}
  function searchableTargets(){
    const seen=new Set(),out=[];
    const add=(el,name)=>{if(!el||seen.has(el)||!name)return;seen.add(el);out.push({el,name,panel:el.closest('.panel')})};
    $$('label[for]',right).forEach(l=>add($('#'+CSS.escape(l.htmlFor),right),l.textContent.trim()));
    $$('button',right).filter(b=>!b.closest('.panel-toolbar')).forEach(b=>add(b,(b.getAttribute('aria-label')||b.title||b.textContent||'').trim()));
    $$('select:not(.pf-native-select-proxy),input:not([type="hidden"]),textarea',right).forEach(el=>add(el,labelFor(el)));
    return out;
  }
  let targets=searchableTargets();
  function closeResults(){results?.classList.remove('open');if(results)results.replaceChildren()}
  function focusTarget(item){
    if(!item?.el)return;
    const panel=item.panel;
    if(panel){panel.classList.remove('folded');$('.panelhead',panel)?.setAttribute('aria-expanded','true');panel.classList.add('search-match');setTimeout(()=>panel.classList.remove('search-match'),1400)}
    item.el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center',inline:'nearest'});
    item.el.classList.remove('pf-search-flash');void item.el.offsetWidth;item.el.classList.add('pf-search-flash');
    if(item.el.matches('input,select,textarea,button')){try{item.el.focus({preventScroll:true})}catch{}}
    closeResults();
  }
  function renderResults(){
    if(!search||!results)return;
    const q=normalize(search.value);
    if(!q){closeResults();$$('.panel.search-match',right).forEach(p=>p.classList.remove('search-match'));return}
    targets=searchableTargets();
    const matches=targets.map(item=>({...item,score:normalize(item.name).includes(q)?0:normalize(panelName(item.panel||right)).includes(q)?1:2}))
      .filter(x=>x.score<2||normalize(x.name).includes(q)).sort((a,b)=>a.score-b.score).slice(0,12);
    results.replaceChildren();
    if(!matches.length){const empty=document.createElement('div');empty.className='panel-search-result';empty.textContent='一致する設定はありません';results.appendChild(empty)}
    else matches.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='panel-search-result';b.setAttribute('role','option');b.innerHTML=`<span>⌕</span><span class="pf-result-name"></span><small></small>`;$('.pf-result-name',b).textContent=item.name; b.querySelector('small').textContent=panelName(item.panel||right);b.addEventListener('click',()=>focusTarget(item));results.appendChild(b)});
    results.classList.add('open');
  }
  search?.addEventListener('input',renderResults);
  search?.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=$('.panel-search-result[role="option"]',results);if(first){e.preventDefault();first.click()}}if(e.key==='Escape'){search.value='';renderResults();search.blur()}});
  $('#panelSearchClear')?.addEventListener('click',()=>{search.value='';renderResults();search.focus()});
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.panel-search-wrap')&&!e.target.closest('.panel-search-results'))closeResults()});
  // Ctrl/⌘+K belongs exclusively to the app command palette (app.js).
  // The settings search uses Ctrl/⌘+Alt+K so the two shortcut chords never race.
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='k'){
      const target=e.target;
      if(target?.matches?.('input,textarea,select,[contenteditable="true"]')) return;
      e.preventDefault();
      if(innerWidth<=900){
        if(right.classList.contains('collapsed')) $('#mobilePanelToggle')?.click();
      }else if(right.classList.contains('collapsed')) right.classList.remove('collapsed');
      search?.focus();search?.select();
    }
  });

  // Desktop-only draggable splitter; touch layouts remain a slide-in panel.
  const splitter=document.createElement('div');splitter.className='panel-resizer';splitter.setAttribute('role','separator');splitter.setAttribute('aria-orientation','vertical');splitter.setAttribute('aria-label','設定パネル幅を調整');splitter.tabIndex=0;
  right.before(splitter);
  const widthKey='pf-v6-rightbar-width';
  const savedWidth=Number(safeStore.get(widthKey));
  if(savedWidth>=250&&savedWidth<=520)right.style.flexBasis=savedWidth+'px';
  let resizing=false;
  splitter.addEventListener('pointerdown',e=>{
    if(innerWidth<=900||right.classList.contains('collapsed'))return;
    resizing=true;splitter.classList.add('dragging');splitter.setPointerCapture?.(e.pointerId);e.preventDefault();document.body.classList.add('pf-resizing');
  });
  splitter.addEventListener('pointermove',e=>{
    if(!resizing)return;
    const width=Math.max(250,Math.min(520,innerWidth-e.clientX));right.style.flexBasis=width+'px';right.style.width=width+'px';
  });
  function stopResize(){if(!resizing)return;resizing=false;splitter.classList.remove('dragging');document.body.classList.remove('pf-resizing');const w=Math.round(right.getBoundingClientRect().width);safeStore.set(widthKey,String(w));}
  splitter.addEventListener('pointerup',stopResize);splitter.addEventListener('pointercancel',stopResize);
  splitter.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();const delta=e.key==='ArrowLeft'?16:-16;const w=Math.max(250,Math.min(520,right.getBoundingClientRect().width+delta));right.style.flexBasis=w+'px';right.style.width=w+'px';safeStore.set(widthKey,String(w))});

  // One canonical mobile drawer state. Reuse the existing #mobilePanelScrim;
  // a second injected scrim and competing Escape handlers caused the drawer to pulse.
  const mobileScrim=$('#mobilePanelScrim');
  const drawerQuery=window.matchMedia('(max-width:760px), (max-width:900px) and (any-pointer:coarse), (max-height:520px) and (any-pointer:coarse)');
  function isTouchDrawer(){const predicate=window.PF_EDITOR_ACTIONS?.isMobileLayout;return typeof predicate==='function'?!!predicate():!!drawerQuery.matches;}
  function syncDrawer(){
    const mobile=isTouchDrawer();
    const open=document.body.classList.contains('mobile-panel-open')&&!right.classList.contains('collapsed');
    workspace.classList.toggle('panel-open',mobile&&open);
    workspace.classList.toggle('panel-closed',right.classList.contains('collapsed'));
    if(mobileScrim)mobileScrim.setAttribute('aria-hidden',String(!open));
    splitter.setAttribute('aria-disabled',String(mobile||right.classList.contains('collapsed')));
  }
  const classObserver=new MutationObserver(syncDrawer);
  classObserver.observe(right,{attributes:true,attributeFilter:['class']});
  $('#panelToggle')?.addEventListener('click',()=>requestAnimationFrame(syncDrawer));
  function closeSettingsDrawer(){
    const wasOpen=document.body.classList.contains('mobile-panel-open')||!right.classList.contains('collapsed');
    if(!wasOpen)return false;
    const closeAction=window.PF_EDITOR_ACTIONS?.closePanel;
    if(typeof closeAction==='function'){
      try{closeAction();}catch(error){console.warn('Settings panel close failed:',error);}
    }else{
      right.classList.add('collapsed');right.setAttribute('aria-hidden','true');
      document.body.classList.remove('mobile-panel-open');
      $('#panelToggle')?.setAttribute('aria-expanded','false');
    }
    // The action above owns the state mutation. Only repair it if an older
    // extension failed to update both halves of the state.
    if(!right.classList.contains('collapsed')||document.body.classList.contains('mobile-panel-open')){
      right.classList.add('collapsed');document.body.classList.remove('mobile-panel-open');
      right.setAttribute('aria-hidden','true');$('#panelToggle')?.setAttribute('aria-expanded','false');
    }
    safeStore.set('pf-v6-mobile-panel','closed');
    syncDrawer();
    window.dispatchEvent(new CustomEvent('pf:settings-panel-closed',{detail:{wasOpen,source:'ui-enhance'}}));
    return true;
  }
  $('#closeSettingsPanel')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();closeSettingsDrawer()});
  window.addEventListener('resize',syncDrawer,{passive:true});
  drawerQuery.addEventListener?.('change',syncDrawer);
  // Honour the saved mobile preference once, without running a toggle during resize.
  const drawerPref=safeStore.get('pf-v6-mobile-panel');
  if(isTouchDrawer()&&drawerPref!=='open'){
    right.classList.add('collapsed');document.body.classList.remove('mobile-panel-open');
    right.setAttribute('aria-hidden','true');$('#panelToggle')?.setAttribute('aria-expanded','false');
  }else if(isTouchDrawer()&&drawerPref==='open'){
    const openAction=window.PF_EDITOR_ACTIONS?.panel;
    if(typeof openAction==='function')openAction(true);
    else{right.classList.remove('collapsed');document.body.classList.add('mobile-panel-open');right.setAttribute('aria-hidden','false');}
  }
  $('#panelToggle')?.addEventListener('click',()=>safeStore.set('pf-v6-mobile-panel',right.classList.contains('collapsed')?'closed':'open'));
  syncDrawer();

  // Give the existing compact control bar better affordances without changing values.
  $$('.contextbar input,.contextbar select,.contextbar button').forEach(el=>{
    if(!el.title){const label=el.closest('.context-group')?.querySelector('label')?.textContent?.trim();if(label)el.title=label}
  });
  // Motion feedback is visual-only: it never delays the original click handler.
  // Both OS-level and in-app reduced-motion preferences are respected.
  const reduceMotionQuery = (()=>{try{return window.matchMedia('(prefers-reduced-motion: reduce)')}catch{return null}})();
  function motionIsReduced(){return !!document.body.classList.contains('pf-reduced-motion') || !!reduceMotionQuery?.matches;}
  document.addEventListener('click', event=>{
    if(motionIsReduced()) return;
    const button=event.target?.closest?.('button:not(:disabled)');
    if(button){
      button.classList.remove('pf-motion-click');
      void button.offsetWidth;
      button.classList.add('pf-motion-click');
      window.setTimeout(()=>button.classList.remove('pf-motion-click'),280);
    }

    const head=event.target?.closest?.('.panelhead');
    const panel=head?.closest('.panel');
    if(panel){
      requestAnimationFrame(()=>{
        if(panel.classList.contains('folded')) return;
        panel.classList.remove('pf-panel-open-motion');
        void panel.offsetWidth;
        panel.classList.add('pf-panel-open-motion');
        window.setTimeout(()=>panel.classList.remove('pf-panel-open-motion'),340);
      });
    }
  }, true);

  // FLIP animation for layer reorder: rows animate from their previous screen
  // position to the new one. New layers receive a short entrance, not a layout jump.
  const layerHost=$('#layersList');
  if(layerHost && typeof MutationObserver==='function'){
    let lastLayerRects=new Map();
    const animateLayerMovement=()=>{
      const rows=$$('.layer',layerHost);
      const nextRects=new Map();
      const canAnimate=!motionIsReduced() && typeof Element.prototype.animate==='function';
      rows.forEach((row,index)=>{
        const id=row.dataset.layerId || row.querySelector('.layername')?.textContent || `row-${index}`;
        const rect=row.getBoundingClientRect();
        const previous=lastLayerRects.get(id);
        if(canAnimate && previous && Math.abs(previous.top-rect.top)>1){
          const delta=previous.top-rect.top;
          row.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0px)'}],{duration:220,easing:'cubic-bezier(.2,.75,.25,1)'});
        }else if(canAnimate && !previous && lastLayerRects.size){
          row.classList.remove('pf-layer-enter');
          void row.offsetWidth;
          row.classList.add('pf-layer-enter');
          window.setTimeout(()=>row.classList.remove('pf-layer-enter'),280);
        }
        nextRects.set(id,{top:rect.top});
      });
      lastLayerRects=nextRects;
    };
    const layerObserver=new MutationObserver(()=>requestAnimationFrame(animateLayerMovement));
    layerObserver.observe(layerHost,{childList:true});
    requestAnimationFrame(animateLayerMovement);
  }

  // Expose total available panels for assistive technology and the status line.
  right.setAttribute('aria-label','設定・画材・レイヤーパネル');
  right.dataset.panelCount=String($$('.panel',right).length);
})();
