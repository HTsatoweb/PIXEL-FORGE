/* PIXEL FORGE STUDIO v35 · universal motion + 350 real brush micro-adjustments.
   Drawing pixels and the stroke renderer are never modified by the animation layer. */
(() => {
  'use strict';
  if (window.__PF_V35_PRECISION_MOTION__) return;
  window.__PF_V35_PRECISION_MOTION__ = true;

  const reducedQuery = (() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)'); }
    catch (_) { return null; }
  })();
  const motionReduced = () => !!document.body?.classList.contains('pf-reduced-motion') || !!reducedQuery?.matches;
  const byId = id => document.getElementById(id);
  const storageKey = 'pf-v35-precision-tuning-v1';
  const schema = 1;
  const slotCount = 10;
  const slotNames = ['微調整 01','微調整 02','微調整 03','微調整 04','微調整 05','微調整 06','微調整 07','微調整 08','微調整 09','微調整 10'];

  // Each group adjusts an existing, live brush-engine control. Ten independent
  // micro offsets combine into one bounded correction for that real parameter.
  const groups = [
    { category:'線・インク', items:[
      ['sizeRange','筆サイズ','筆の太さの微調整'],['opacityRange','筆の不透明度','線の濃さの微調整'],['hardness','筆先の硬さ','輪郭の硬さの微調整'],['stabilizerRange','手ブレ補正','追従と安定の微調整'],['strokeSmoothing','線の滑らかさ','補間の微調整']
    ]},
    { category:'筆圧・運筆', items:[
      ['pressureCurve','筆圧カーブ','筆圧入力の応答値の微調整'],['pressureWidthGain','筆圧による太さ','筆圧幅の微調整'],['curveBend','曲線の曲がり','曲線補間の微調整'],['velocitySize','速度による太さ','速度応答の微調整'],['velocityOpacity','速度による濃さ','速度に応じた濃度の微調整']
    ]},
    { category:'ブラシ形状・毛', items:[
      ['brushFlow','インク・絵の具の流量','ブラシの流量の微調整'],['brushJitter','筆先の散らばり','スタンプの散らばり量の微調整'],['brushAngle','筆先の角度','筆先角度の微調整'],['brushAspect','筆先の縦横比','先端形状の微調整'],['bristleCount','毛の本数','毛束の密度の微調整']
    ]},
    { category:'顔料・絵の具', items:[
      ['bristleSpread','毛の広がり','毛先の広がりの微調整'],['bristleStiffness','毛の硬さ','毛の反発の微調整'],['paintThickness','絵の具の厚み','塗膜の厚さの微調整'],['pigmentLoad','顔料の含有量','顔料量の微調整'],['pigmentGranulation','顔料の粒状感','粒子表現の微調整']
    ]},
    { category:'水彩・混色', items:[
      ['waterAmount','水分量','水分量の微調整'],['waterSpread','水の広がり','拡散量の微調整'],['waterAbsorption','紙への吸収','吸収量の微調整'],['waterDiffusion','水分の拡散','にじみ速度の微調整'],['smudgeStrength','指先混色','混色強度の微調整']
    ]},
    { category:'紙・質感・粒子', items:[
      ['paperStrength','紙質の強さ','紙の凹凸の微調整'],['paperInteraction','紙との相互作用','筆跡と紙の反応の微調整'],['textureDetail','質感の細かさ','テクスチャ密度の微調整'],['paperSurfaceRelief','紙の表面起伏','表面凹凸の微調整'],['textureContrast','質感コントラスト','粒子の明暗差の微調整']
    ]},
    { category:'色・エッジ', items:[
      ['colorPickup','下色の拾い方','色拾い量の微調整'],['wetMix','濡れた色の混ざり','混色量の微調整'],['wetBleed','水彩のにじみ','にじみ量の微調整'],['edgeRoughness','輪郭のざらつき','輪郭の不規則さの微調整'],['stampSpacingFine','筆跡のスタンプ間隔','筆跡の連続感の微調整']
    ]}
  ];
  const allTargets = groups.flatMap(group => group.items.map(([id,label,description]) => ({id,label,description,category:group.category})));
  const expectedControlCount = allTargets.length * slotCount;
  const values = Object.create(null);
  const baseValues = new Map();
  const targetElements = new Map();
  const applying = new Set();
  const pending = new Set();
  let applyFrame = 0, saveTimer = 0, built = false;

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function readStored() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || data.format !== 'PF35_PRECISION_TUNING' || data.schema !== schema || !data.values || typeof data.values !== 'object') return;
      for (const target of allTargets) {
        const row = data.values[target.id];
        if (!Array.isArray(row)) continue;
        values[target.id] = Array.from({length:slotCount}, (_, i) => clamp(Number(row[i] ?? 50), 0, 100));
      }
    } catch (error) { console.info('v35 fine-tuning storage ignored:', error); }
  }
  function rowValues(id) {
    if (!values[id]) values[id] = Array(slotCount).fill(50);
    return values[id];
  }
  function getOffset(id) {
    const control = targetElements.get(id);
    if (!control) return 0;
    const span = Number(control.max) - Number(control.min);
    if (!Number.isFinite(span) || span <= 0) return 0;
    // Each of the ten sliders can add/subtract up to 1.8% of the target range.
    return rowValues(id).reduce((sum, value) => sum + ((value - 50) / 50) * span * 0.018, 0);
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      try {
        const snapshot = {format:'PF35_PRECISION_TUNING', schema, savedAt:Date.now(), values};
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
        const status = byId('pf35TuneStatus');
        if (status) status.textContent = '350項目をこの端末へ保存済み';
      } catch (error) {
        const status = byId('pf35TuneStatus');
        if (status) status.textContent = '保存できません：ブラウザ容量を確認してください';
        console.warn('v35 fine-tuning save failed:', error);
      }
    }, 320);
  }
  function applyTarget(id) {
    const control = targetElements.get(id);
    if (!control) return;
    const min = Number(control.min || 0), max = Number(control.max || 100);
    const base = Number(baseValues.get(id) ?? control.value);
    const next = Math.round(clamp(base + getOffset(id), min, max));
    if (String(next) === control.value) return;
    applying.add(id);
    control.value = String(next);
    control.dispatchEvent(new Event('input', {bubbles:true}));
    applying.delete(id);
  }
  function scheduleApply(id) {
    pending.add(id);
    if (applyFrame) return;
    applyFrame = requestAnimationFrame(() => {
      applyFrame = 0;
      for (const targetId of pending) applyTarget(targetId);
      pending.clear();
    });
  }
  function installTargets() {
    for (const target of allTargets) {
      const control = byId(target.id);
      if (!control || control.type !== 'range') continue;
      targetElements.set(target.id, control);
      baseValues.set(target.id, Number(control.value));
      control.addEventListener('input', () => {
        if (applying.has(target.id)) return;
        // Keep manual edits as the new base, without discarding the ten offsets.
        baseValues.set(target.id, Number(control.value) - getOffset(target.id));
      });
    }
  }

  function makeSlider(target, index) {
    const id = `pf35-tune-${target.id}-${index + 1}`;
    const label = document.createElement('label');
    label.className = 'pf35-micro-control';
    label.htmlFor = id;
    const head = document.createElement('span');
    head.className = 'pf35-micro-label';
    head.textContent = slotNames[index];
    const range = document.createElement('input');
    range.type = 'range'; range.id = id; range.min = '0'; range.max = '100'; range.step = '1'; range.value = String(rowValues(target.id)[index]);
    range.dataset.pf35Target = target.id; range.dataset.pf35Slot = String(index);
    range.setAttribute('aria-label', `${target.label} ${slotNames[index]}。50が補正なし`);
    const output = document.createElement('output');
    output.htmlFor = id; output.value = range.value; output.textContent = range.value;
    range.addEventListener('input', () => {
      const n = clamp(Number(range.value), 0, 100);
      rowValues(target.id)[index] = n;
      output.value = String(n); output.textContent = String(n);
      scheduleApply(target.id); scheduleSave();
      const base = baseValues.get(target.id) ?? 0;
      const actual = targetElements.get(target.id)?.value;
      const readout = label.closest('details')?.querySelector('.pf35-target-value');
      if (readout && actual !== undefined) readout.textContent = `反映値 ${actual} · 基準 ${Math.round(base)}`;
    });
    const note = document.createElement('small');
    note.textContent = '50 = 補正なし';
    label.append(head, range, output, note);
    return label;
  }

  function buildControls() {
    if (built) return;
    const host = byId('pf35TuneCategories');
    if (!host) return;
    const fragment = document.createDocumentFragment();
    groups.forEach((group, groupIndex) => {
      const category = document.createElement('details');
      category.className = 'pf35-category';
      const summary = document.createElement('summary');
      summary.innerHTML = `<span>${group.category}</span><small>${group.items.length * slotCount} 調整</small>`;
      category.appendChild(summary);
      const targetList = document.createElement('div');
      targetList.className = 'pf35-target-list';
      group.items.forEach(([id,label,description]) => {
        const target = {id,label,description,category:group.category};
        const detail = document.createElement('details');
        detail.className = 'pf35-target';
        detail.dataset.pf35Search = `${group.category} ${label} ${description}`.toLocaleLowerCase('ja');
        const targetSummary = document.createElement('summary');
        const title = document.createElement('span'); title.textContent = label;
        const readout = document.createElement('small'); readout.className = 'pf35-target-value';
        readout.textContent = `現在値 ${targetElements.get(id)?.value ?? '—'}`;
        targetSummary.append(title, readout);
        detail.appendChild(targetSummary);
        const hint = document.createElement('p'); hint.className = 'pf35-target-hint'; hint.textContent = description + '。各スライダーは単独で加算され、50にするとその項目の補正は0になります。';
        detail.appendChild(hint);
        const controls = document.createElement('div'); controls.className = 'pf35-micro-grid';
        for (let i=0;i<slotCount;i++) controls.appendChild(makeSlider(target,i));
        detail.appendChild(controls);
        targetList.appendChild(detail);
      });
      category.appendChild(targetList);
      fragment.appendChild(category);
    });
    host.replaceChildren(fragment);
    built = true;
    scheduleApplyAll();
  }
  function scheduleApplyAll() { for (const target of allTargets) scheduleApply(target.id); }
  function filterControls(query) {
    const q = String(query || '').trim().toLocaleLowerCase('ja');
    document.querySelectorAll('#pf35TuneCategories .pf35-target').forEach(detail => {
      const match = !q || detail.dataset.pf35Search.includes(q);
      detail.hidden = !match;
      if (q && match) {
        detail.open = true;
        const category = detail.closest('.pf35-category'); if (category) category.open = true;
      }
    });
    document.querySelectorAll('#pf35TuneCategories .pf35-category').forEach(category => {
      category.hidden = !category.querySelector('.pf35-target:not([hidden])');
    });
  }
  function resetAll() {
    allTargets.forEach(target => { values[target.id] = Array(slotCount).fill(50); });
    document.querySelectorAll('#pf35TuneCategories input[type="range"]').forEach(input => {
      input.value = '50'; const output = input.parentElement?.querySelector('output'); if (output) { output.value='50'; output.textContent='50'; }
    });
    scheduleApplyAll(); scheduleSave();
    const status = byId('pf35TuneStatus'); if (status) status.textContent = '350項目を中立値へ戻しました';
  }
  function exportSettings() {
    const data = {format:'PF35_PRECISION_TUNING',schema,savedAt:Date.now(),values};
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href=url; a.download=`PIXEL-FORGE-v35-precision-${new Date().toISOString().slice(0,10)}.pf35tune`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  async function importSettings(file) {
    if (!file) return;
    try {
      if (file.size > 2*1024*1024) throw new Error('ファイルが大きすぎます');
      const data = JSON.parse(await file.text());
      if (!data || data.format !== 'PF35_PRECISION_TUNING' || data.schema !== schema || !data.values || typeof data.values !== 'object') throw new Error('PIXEL FORGE v35 の調整ファイルではありません');
      const next = Object.create(null);
      for (const target of allTargets) {
        const row = data.values[target.id];
        if (!Array.isArray(row) || row.length !== slotCount) throw new Error(`${target.label} の設定数が不正です`);
        next[target.id] = row.map(v => { const n=Number(v); if(!Number.isFinite(n)) throw new Error('数値設定が不正です'); return clamp(n,0,100); });
      }
      for (const target of allTargets) values[target.id] = next[target.id];
      if (built) {
        document.querySelectorAll('#pf35TuneCategories input[type="range"]').forEach(input => {
          const id=input.dataset.pf35Target, slot=Number(input.dataset.pf35Slot); input.value=String(values[id][slot]);
          const output=input.parentElement?.querySelector('output'); if(output){output.value=input.value;output.textContent=input.value;}
        });
      }
      scheduleApplyAll(); scheduleSave();
      const status=byId('pf35TuneStatus'); if(status)status.textContent='調整セットを読み込みました';
    } catch (error) {
      const status=byId('pf35TuneStatus'); if(status)status.textContent='読み込み失敗：'+(error.message||'形式を確認してください');
    }
  }

  // --- Universal button and window motion layer (decorative only). ---
  const activePointers = new Map();
  const buttonTimers = new WeakMap();
  function pulseButton(button) {
    if (!button || motionReduced() || !button.isConnected) return;
    const old = buttonTimers.get(button); if (old) clearTimeout(old);
    button.classList.remove('pf35-click-wave'); void button.offsetWidth; button.classList.add('pf35-click-wave');
    const timer = setTimeout(() => { button.classList.remove('pf35-click-wave'); buttonTimers.delete(button); }, 360);
    buttonTimers.set(button,timer);
  }
  const trackedSelector = [
    '#app .topbar','#app .contextbar','#app .leftbar','#app .rightbar','#app .mobile-dock',
    '.pf-home-header','.pf-home-mobile-header','.pf-home-mobile-dock','.pf-home-hero',
    '.pf-settings-modal','.modal','.pf-command-dialog','.pf-v32-layout-toolbar',
    '.pf-v32-movable:not(button):not(input):not(select):not(textarea)',
    '.pf-v32-movable button','.pf-v32-movable input','.pf-v32-movable select'
  ].join(',');
  let previousRects = new Map(), motionRaf = 0, suppressMotionUntil = 0, initializedRects = false;
  function collectRects() {
    const list = [...document.querySelectorAll(trackedSelector)].slice(0,190);
    const next = new Map();
    for (const element of list) {
      if (!element.isConnected || element.closest('.pf-v32-floating-handle') || element.matches('.pf-v32-moving')) {
        if (element.matches?.('.pf-v32-moving') && previousRects.has(element)) next.set(element, previousRects.get(element));
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      next.set(element,{left:rect.left,top:rect.top,width:rect.width,height:rect.height});
    }
    return next;
  }
  function animateFlip(element, oldRect, rect) {
    if (motionReduced() || !element.animate || performance.now() < suppressMotionUntil) return;
    const dx=oldRect.left-rect.left, dy=oldRect.top-rect.top;
    if (Math.abs(dx)<2 && Math.abs(dy)<2) return;
    if (Math.abs(dx)>900 || Math.abs(dy)>900) return;
    try {
      // Additive transform preserves existing transforms and v32 translate positioning.
      element.animate([
        {transform:`translate3d(${dx}px,${dy}px,0)`},
        {transform:'translate3d(0,0,0)'}
      ],{duration:260,easing:'cubic-bezier(.18,.82,.22,1)',composite:'add'});
    } catch (_) { /* No animation support: keep the final layout unchanged. */ }
  }
  function syncMotionRects() {
    motionRaf=0;
    const next=collectRects();
    if (initializedRects) {
      for (const [element,rect] of next) {
        const old=previousRects.get(element);
        if (old && (Math.abs(old.left-rect.left)>1.5 || Math.abs(old.top-rect.top)>1.5)) animateFlip(element,old,rect);
      }
    }
    previousRects=next; initializedRects=true;
  }
  function scheduleMotionSync() { if (motionRaf) return; motionRaf=requestAnimationFrame(syncMotionRects); }
  document.addEventListener('pointerdown', event => {
    if (motionReduced() || event.button > 0) return;
    const button=event.target?.closest?.('button:not(:disabled),[role="button"]');
    if (!button || button.matches('[data-pf-motion-static]')) return;
    button.classList.add('pf35-pressed');
    activePointers.set(Number.isFinite(event.pointerId)?event.pointerId:0,button);
  },{capture:true,passive:true});
  function releasePointer(event) {
    const id=Number.isFinite(event?.pointerId)?event.pointerId:0;
    const button=activePointers.get(id); activePointers.delete(id);
    if (button && ![...activePointers.values()].includes(button)) button.classList.remove('pf35-pressed');
  }
  document.addEventListener('pointerup',releasePointer,{capture:true,passive:true});
  document.addEventListener('pointercancel',releasePointer,{capture:true,passive:true});
  window.addEventListener('blur',()=>{for(const button of activePointers.values())button.classList.remove('pf35-pressed');activePointers.clear();},{passive:true});
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('button:not(:disabled),[role="button"]');
    if (button && !button.matches('[data-pf-motion-static]')) pulseButton(button);
    const head=event.target?.closest?.('.panelhead');
    const panel=head?.closest('.panel');
    if(panel) requestAnimationFrame(()=>{if(!panel.classList.contains('folded')){panel.classList.remove('pf35-panel-reveal');void panel.offsetWidth;panel.classList.add('pf35-panel-reveal');setTimeout(()=>panel.classList.remove('pf35-panel-reveal'),320);}});
  },{capture:false,passive:true});
  document.addEventListener('keydown',event=>{
    if(event.repeat || (event.key!=='Enter'&&event.key!==' '))return;
    const target=event.target?.closest?.('button,[role="button"]'); if(target)target.classList.add('pf35-key-press');
  },true);
  document.addEventListener('keyup',event=>{document.querySelectorAll('.pf35-key-press').forEach(el=>el.classList.remove('pf35-key-press'));},{capture:true,passive:true});
  window.addEventListener('blur',()=>document.querySelectorAll('.pf35-key-press').forEach(el=>el.classList.remove('pf35-key-press')),{passive:true});

  if (typeof MutationObserver === 'function') {
    const observer=new MutationObserver(records=>{
      const relevant=records.some(record=>{
        const target=record.target instanceof Element?record.target:null;
        if(!target || target.closest('.pf-v32-moving,.pf-v32-floating-handle,.stage,.layers,#layersList,.pf35-precision-panel'))return false;
        if(record.type==='attributes')return target.matches('.panel,.panelhead,.rightbar,.leftbar,.modalback,.pf-settings-backdrop,.pf-command-backdrop,.pf-settings-modal,.modal,#app,body,.pf-v32-movable');
        return !!target.closest('#app,.pf-home-screen,.pf-settings-backdrop,.modalback');
      });
      if(relevant)scheduleMotionSync();
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','aria-expanded']});
  }
  window.addEventListener('resize',()=>{suppressMotionUntil=performance.now()+320;scheduleMotionSync();},{passive:true});
  window.addEventListener('orientationchange',()=>{suppressMotionUntil=performance.now()+420;scheduleMotionSync();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){activePointers.clear();document.querySelectorAll('.pf35-pressed,.pf35-key-press').forEach(el=>el.classList.remove('pf35-pressed','pf35-key-press'));}else scheduleMotionSync();},{passive:true});
  requestAnimationFrame(syncMotionRects);

  // Attach the lazily-created tuning interface to the existing right-hand panel.
  const panel=byId('pf35PrecisionPanel');
  if(panel){
    const head=byId('pf35PrecisionHead');
    // app.js already owns the shared .panelhead click/keyboard toggle.
    // Observe its resulting state here instead of registering a second toggle.
    head?.setAttribute('aria-expanded',String(!panel.classList.contains('folded')));
    head?.addEventListener('click',()=>{
      head.setAttribute('aria-expanded',String(!panel.classList.contains('folded')));
      if(!panel.classList.contains('folded'))buildControls();
    });
    byId('pf35TuneSearch')?.addEventListener('input',event=>{buildControls();filterControls(event.target.value);});
    byId('pf35TuneReset')?.addEventListener('click',resetAll);
    byId('pf35TuneExport')?.addEventListener('click',exportSettings);
    byId('pf35TuneImport')?.addEventListener('click',()=>byId('pf35TuneImportFile')?.click());
    byId('pf35TuneImportFile')?.addEventListener('change',event=>{importSettings(event.target.files?.[0]);event.target.value='';});
    byId('pf35TuneExpand')?.addEventListener('click',()=>{buildControls();document.querySelectorAll('#pf35TuneCategories .pf35-category,#pf35TuneCategories .pf35-target').forEach(el=>el.open=true);});
    byId('pf35TuneCollapse')?.addEventListener('click',()=>document.querySelectorAll('#pf35TuneCategories .pf35-category,#pf35TuneCategories .pf35-target').forEach(el=>el.open=false));
  }

  readStored(); installTargets(); scheduleApplyAll();
  window.PF_V35 = Object.freeze({
    version:'35.0.0', microAdjustmentCount:expectedControlCount, targetCount:allTargets.length,
    get built(){return built;}, get savedValues(){return Object.keys(values).length;},
    reset:resetAll, export:exportSettings, build:buildControls,
    audit(){return {version:'35.0.0',microAdjustmentCount:expectedControlCount,targetCount:allTargets.length,targetsPresent:allTargets.filter(t=>targetElements.has(t.id)).length,allSlidersBuilt:document.querySelectorAll('#pf35TuneCategories input[type="range"]').length,motionReduced:motionReduced(),waapi:typeof Element.prototype.animate==='function'};}
  });
})();
