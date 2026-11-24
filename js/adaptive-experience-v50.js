/* PIXEL FORGE STUDIO v50 — adaptive controls for compact PCs and touch layouts. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const root=document.documentElement,body=document.body;
  const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
  const valid=new Set(['auto','compact','comfortable']);
  let density=valid.has(store.get('pf-v50-density'))?store.get('pf-v50-density'):'auto';
  function applyDensity(value){
    density=valid.has(value)?value:'auto';
    root.dataset.pfUiDensity=density;
    body.classList.toggle('pf-force-compact',density==='compact');
    body.classList.toggle('pf-force-comfortable',density==='comfortable');
    store.set('pf-v50-density',density);
    const b=$('#pfDensityToggle');
    if(b){const labels={auto:'表示密度：自動',compact:'表示密度：コンパクト',comfortable:'表示密度：ゆったり'};const icons={auto:'▤',compact:'▥',comfortable:'▣'};b.setAttribute('aria-label',labels[density]);b.title=labels[density]+'（Alt + Shift + C で切替）';const icon=$('.pf-density-icon',b),label=$('.toplabel',b);if(icon)icon.textContent=icons[density];if(label)label.textContent=density==='auto'?'自動':density==='compact'?'小さく':'ゆったり';b.setAttribute('aria-pressed',String(density!=='auto'));}
    window.dispatchEvent(new CustomEvent('pf:layout-density-change',{detail:{density}}));
  }
  function installDensityControl(){
    const panelToggle=$('#panelToggle');if(!panelToggle||$('#pfDensityToggle'))return;
    const b=document.createElement('button');b.type='button';b.id='pfDensityToggle';b.className='topbtn pf-density-toggle';b.innerHTML='<span class="pf-density-icon" aria-hidden="true">▤</span><span class="toplabel">自動</span>';b.addEventListener('click',()=>applyDensity(density==='auto'?'compact':density==='compact'?'comfortable':'auto'));
    panelToggle.insertAdjacentElement('afterend',b);
    const focus=document.createElement('button');focus.type='button';focus.id='pfCanvasFocusToggle';focus.className='topbtn pf-focus-toggle';focus.innerHTML='<span aria-hidden="true">⛶</span><span class="toplabel">集中</span>';focus.setAttribute('aria-label','キャンバス集中モード');focus.title='キャンバス集中モード（Alt + Shift + F）';
    focus.addEventListener('click',()=>setFocus(!body.classList.contains('pf-canvas-focus')));
    b.insertAdjacentElement('afterend',focus);
  }
  function setFocus(enabled){body.classList.toggle('pf-canvas-focus',!!enabled);const b=$('#pfCanvasFocusToggle');if(b){b.setAttribute('aria-pressed',String(!!enabled));b.title=(enabled?'集中モードを終了':'キャンバス集中モード')+'（Alt + Shift + F）';}}
  function updateViewportVars(){
    const vv=window.visualViewport;
    const width=Math.max(1,vv?.width||window.innerWidth||1),height=Math.max(1,vv?.height||window.innerHeight||1);
    root.style.setProperty('--pf-v50-vv-width',width+'px');root.style.setProperty('--pf-v50-vv-height',height+'px');
    root.style.setProperty('--pf-v50-vv-top',Math.max(0,vv?.offsetTop||0)+'px');
  }
  function refreshLayout(){
    const width=window.innerWidth||root.clientWidth,height=window.innerHeight||root.clientHeight;
    const touch=matchMedia('(any-pointer:coarse)').matches||(navigator.maxTouchPoints||0)>0;
    const phone=width<=760||(touch&&width<=900);
    body.classList.toggle('pf-v50-touch-layout',phone);
    body.classList.toggle('pf-v50-small-desktop',!phone&&(width<=1280||height<=720));
    updateViewportVars();
  }
  installDensityControl();applyDensity(density);refreshLayout();
  window.addEventListener('resize',refreshLayout,{passive:true});
  window.addEventListener('orientationchange',refreshLayout,{passive:true});
  window.visualViewport?.addEventListener('resize',updateViewportVars,{passive:true});
  window.visualViewport?.addEventListener('scroll',updateViewportVars,{passive:true});
  document.addEventListener('keydown',event=>{
    if(event.altKey&&event.shiftKey&&event.key.toLowerCase()==='c'&&!event.repeat){event.preventDefault();applyDensity(density==='auto'?'compact':density==='compact'?'comfortable':'auto');}
    if(event.altKey&&event.shiftKey&&event.key.toLowerCase()==='f'&&!event.repeat){event.preventDefault();setFocus(!body.classList.contains('pf-canvas-focus'));}
  },true);
  // An observable audit reports real overflow dimensions without changing the artwork.
  function audit(){
    const selectors=['.topbar','.contextbar','.workspace','.center','.stage','#rightbar','.panel-toolbar'];
    const layout=selectors.map(sel=>{const el=$(sel);if(!el)return{selector:sel,present:false};const r=el.getBoundingClientRect();return{selector:sel,present:true,width:Math.round(r.width),height:Math.round(r.height),scrollWidth:el.scrollWidth,scrollHeight:el.scrollHeight,overflowX:el.scrollWidth>el.clientWidth+2,overflowY:el.scrollHeight>el.clientHeight+2};});
    return{version:'50.0',density,viewport:{width:innerWidth,height:innerHeight},mobile:body.classList.contains('pf-v50-touch-layout'),layout};
  }
  window.PF_ADAPTIVE_UI=Object.freeze({setDensity:applyDensity,getDensity:()=>density,setFocus,getFocus:()=>body.classList.contains('pf-canvas-focus'),audit,refresh:refreshLayout});
})();
