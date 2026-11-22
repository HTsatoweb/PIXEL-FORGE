/* PIXEL FORGE STUDIO v30 · cache-zero controls and mobile viewport guard. */
(()=>{
 'use strict';
 const DISABLED_KEY='pf-disable-offline-cache-v1';
 const $=id=>document.getElementById(id);
 const status=$('pfCacheStatus'),clearButton=$('pfClearSiteCache'),enableButton=$('pfEnableOfflineCache');
 const formatBytes=value=>{
  const n=Math.max(0,Number(value)||0);
  if(n<1024)return `${n} B`;
  if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(2)} MB`;
 };
 const cacheDisabled=()=>{
  try{return localStorage.getItem(DISABLED_KEY)==='1'}catch(_){return false}
 };
 async function measureCacheStorage(){
  if(!('caches' in window))return{supported:false,bytes:0,entries:0,names:[]};
  const names=(await caches.keys()).filter(name=>name.startsWith('pixelforge-web-'));let bytes=0,entries=0;
  for(const name of names){
   const cache=await caches.open(name),requests=await cache.keys();
   entries+=requests.length;
   for(const request of requests){
    try{const response=await cache.match(request);if(!response)continue;const declared=Number(response.headers.get('content-length'));if(Number.isFinite(declared)&&declared>0)bytes+=declared;else bytes+=(await response.clone().arrayBuffer()).byteLength;}catch(_){/* A single opaque or expired item must not break the summary. */}
   }
  }
  return{supported:true,bytes,entries,names};
 }
 async function refreshCacheStatus(){
  if(!status)return;
  try{
   const info=await measureCacheStorage();
   if(!info.supported){status.textContent='このブラウザでは未対応';return}
   const disabled=cacheDisabled();
   status.textContent=`${formatBytes(info.bytes)} · ${info.entries} ファイル · ${disabled?'無効':'有効'}`;
   if(clearButton)clearButton.disabled=!info.bytes&&!info.entries&&disabled;
   if(enableButton)enableButton.disabled=!disabled;
  }catch(error){status.textContent='容量を確認できません: '+(error?.message||'unknown')}
 }
 async function clearSiteCacheToZero(){
  if(!('caches' in window)){if(status)status.textContent='Cache Storageは未対応です';return}
  const ok=window.confirm('このサイトのオフライン用キャッシュをすべて削除し、再作成を停止します。\n\n作品ライブラリ（IndexedDB）、ブラシ設定、.pforge ファイルは削除されません。実行しますか？');
  if(!ok)return;
  if(clearButton)clearButton.disabled=true;
  if(enableButton)enableButton.disabled=true;
  document.body.classList.add('pf-cache-clearing');
  if(status)status.textContent='キャッシュとService Workerを削除しています…';
  try{
   // Set the opt-out flag first: app.js will not register the worker on the next launch.
   localStorage.setItem(DISABLED_KEY,'1');
   if('serviceWorker' in navigator){
    const registrations=await navigator.serviceWorker.getRegistrations();
    const pageUrl=new URL(location.href);
    const basePath=pageUrl.pathname.slice(0,pageUrl.pathname.lastIndexOf('/')+1);
    await Promise.all(registrations.filter(reg=>{
     try{const scope=new URL(reg.scope);return scope.origin===pageUrl.origin&&scope.pathname.startsWith(basePath)}catch(_){return false}
    }).map(reg=>reg.unregister()));
   }
   const names=(await caches.keys()).filter(name=>name.startsWith('pixelforge-web-'));
   const deleted=await Promise.all(names.map(name=>caches.delete(name)));
   const remaining=(await caches.keys()).filter(name=>name.startsWith('pixelforge-web-'));
   if(remaining.length)throw new Error('一部のキャッシュが削除できませんでした: '+remaining.join(', '));
   if(status)status.textContent=`0 B · ${deleted.filter(Boolean).length} 個のキャッシュを削除 · オフライン保存 無効`;
   if(enableButton)enableButton.disabled=false;
   if(clearButton)clearButton.disabled=true;
  }catch(error){
   if(status)status.textContent='削除に失敗: '+(error?.message||'unknown');
   if(clearButton)clearButton.disabled=false;
   console.error('PIXEL FORGE cache clear failed',error);
  }finally{document.body.classList.remove('pf-cache-clearing')}
 }
 async function enableOfflineCache(){
  if(!('serviceWorker' in navigator)||!window.isSecureContext||location.protocol==='file:'){
   if(status)status.textContent='HTTPS または localhost で開くと再有効化できます';return;
  }
  if(enableButton)enableButton.disabled=true;
  if(status)status.textContent='オフラインキャッシュを準備しています…';
  try{
   localStorage.removeItem(DISABLED_KEY);
   const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
   if(status)status.textContent='再有効化しました · '+(registration.installing?'ファイルを準備中':'次回更新時に反映');
   setTimeout(()=>refreshCacheStatus(),900);
  }catch(error){
   try{localStorage.setItem(DISABLED_KEY,'1')}catch(_){}
   if(status)status.textContent='再有効化できません: '+(error?.message||'unknown');
   if(enableButton)enableButton.disabled=false;
  }
 }
 clearButton?.addEventListener('click',clearSiteCacheToZero);
 enableButton?.addEventListener('click',enableOfflineCache);
 // Refresh when the app-wide settings dialog is opened, without altering its existing handler.
 document.addEventListener('click',event=>{
  if(event.target?.closest?.('#settingsButton,[data-pf-home-action="settings"]'))setTimeout(refreshCacheStatus,0);
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCacheStatus()});
 window.PF_CACHE_TOOLS={measure:measureCacheStorage,refresh:refreshCacheStatus,clear:clearSiteCacheToZero,enable:enableOfflineCache,isDisabled:cacheDisabled};
 refreshCacheStatus();
})();
