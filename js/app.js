(() => {
'use strict';
const $ = id => document.getElementById(id);
const PF_APP_RELEASE='38.0.0';
window.PF_APP_RELEASE=PF_APP_RELEASE;
const PF_OFFLINE_CACHE_DISABLED_KEY='pf-disable-offline-cache-v1';
function isOfflineCacheDisabled(){try{return localStorage.getItem(PF_OFFLINE_CACHE_DISABLED_KEY)==='1'}catch(_){return false}}
const stage = $('stage'), display = $('display'), overlay = $('overlay');
const dctx = display.getContext('2d', {alpha:true});
const octx = overlay.getContext('2d', {alpha:true});
const state = {
  width:1600,height:1000,bg:'white',layers:[],activeId:null,tool:'brush',color:'#222b3a',size:18,opacity:1,hardness:.85,eraserOpacity:1,eraserHardness:1,eraserMode:'hard',eraserPressureOpacity:false,stabilizer:.20,
  symmetry:'none',zoom:1,panX:0,panY:0,grid:true,space:false,panning:false,pointerDown:false,lastPoint:null,filteredPoint:null,startPoint:null,moveSnapshot:null,moveBefore:null,waterSpread:.45,edgeDarkening:.30,fillTolerance:24,gradientColor:'#83b7ff',gradientType:'linear',dpi:300,exportScale:1,exportQuality:.92,exportMatte:'#ffffff',
  history:[],redo:[],historyLimit:320,historyBytes:0,strokeTiles:null,strokeLayerId:null,strokeTool:null,pointerTool:null,strokeCurvePrev:null,strokeCurveMid:null,strokePrevPressure:1,strokeLastSample:null,strokePath:[],strokeIsSmooth:false,strokeIsPixel:false,pixelLastCell:null,strokeLastTime:0,strokePreviewCanvas:null,strokePreviewBounds:null,strokePreviewFallback:false,strokeStability:.18,strokePressureSmoothing:.62,pressureFloor:.02,pressureCeiling:1,strokeSampleDensity:1,strokeResampleQuality:.8,strokePreviewMode:'accurate',operationLocked:false,smudgeStrength:.58,smudgeSampleMerged:false,rainbowDirection:'along',rainbowCycles:2.5,rainbowMix:.28,rainbowColorPickup:true,rainbowPhase:0,rainbowReverse:false,fillContiguous:true,fillMerged:false,fillOpacity:1,fillFeather:0,waterAbsorption:.48,waterDiffusion:.56,waterGranulation:.24,waterDrying:.38,waterPreset:'wet',transformBounds:null,transforming:false,transformMode:null,transformBase:null,transformSource:null,transformBefore:null,gesturePointers:new Map(),gesturePinch:null,activePointerId:null,activePointerType:null,suppressMouseUntil:0,pendingDisplayResize:false,lowMemory:false,renderQuality:'balanced',strokeSmoothing:.42,strokeTaper:.14,paperInteraction:.78,textureDetail:.62,pressureProfile:'natural',velocitySize:.12,velocityOpacity:.06,taperStart:.055,taperEnd:.085,wetEdge:.16,textureScale:1,edgeSoftness:.06,nibTiltSensitivity:.55,strokeCorrection:'balanced',feelFriction:.25,feelSmoothing:.35,pressureCurve:1,tiltEnabled:true,brushFlow:1,brushJitter:0,brushAngle:0,pressureOpacity:false,curveBend:.35,polygonSides:6,projectName:'Untitled',projectId:null,projectCreatedAt:0,projectUpdatedAt:0,dirty:false,lastAutosave:0,brushPreset:'gpen',brushProfiles:{},brushProfileAuto:true,waterAmount:.55,pigment:.35,paperTexture:'none',paperStrength:.35,paperFiberDirection:0,paperGrainScale:1,paperSurfaceRelief:.55,touchPalmRejection:true,strokeSessionId:0,strokePathRevision:0,strokePreviewCacheKey:null,strokePreviewCacheResult:null,strokePreviewStickyFallback:false,mobilePreviewFps:45,touchDrawMode:'draw',touchSmoothing:.45,touchMinDistance:.20,palmRejectionRadius:24,lastPenClientPoint:null,lastPenAt:0,leftHandedUI:false,mobileToolbarScale:1,mobileDockOpacity:.92,mobileCompactUI:true,showPressureHUD:true,tapDotMode:true,brushTipShape:'round',paintBlendMode:'auto',brushAspect:1,bristleCount:9,bristleSpread:.45,bristleStiffness:.60,paintThickness:.45,pigmentLoad:1,pigmentGranulation:.35,edgeRoughness:.20,tipRotationJitter:0,stampSpacingFine:.5,textureContrast:.55,colorPickup:.28,wetMix:.42,wetBleed:.24,edgePooling:.28,strokeWetness:.55,paperTooth:.50,paperFiberDensity:.50,paperFiberLength:.55,paperWarp:.28,paperNoise:.24,paperTemperature:8,paperBrightness:1,paperPorosity:.50,canvasWeave:.55,paperBleed:.10,pressureWidthGain:1,tiltWidthGain:.42,nibFollow:.65,nibAngleMode:'follow',strokeWidthNoise:.035,strokeWidthWave:.08,strokeTaperPower:1.35,bristleSplay:.55,bristleLengthVariation:.28,bristleClumping:.30,bristleCurl:.24,bristleLag:.22,bristleWaviness:.12,bristleWidthVariation:.24,bristleOpacityVariation:.22,bristleDensity:1,bristleWetness:.58,bristleColorVariation:.18,paintDrag:.32,pigmentReservoir:.78,pigmentDepletion:.25,strokeDrying:.32,wetEdgeSpread:.42,colorPickupRadius:4,edgeBreakup:.18,reference:null,animationFrames:[],frameIndex:0,onionSkin:false,onionGhost:[],frameTimer:null,animationPlaying:false,frameRaf:0,frameLoadToken:0,animationDirection:1,playbackNextAt:0,onionGhostToken:0
};
let nextLayerId=1, toastTimer=null, autosaveTimer=null, renderQueued=false;
// Decoded frame images and miniatures are cached per frame-layer object. The cache is
// deliberately weak/bounded: deleting frames releases their decoded image references.
let frameImageCache=new WeakMap(), frameThumbCache=new WeakMap(), timelineRenderToken=0;
const defaultSwatches=['#171923','#222B3A','#64748B','#E5E7EB','#FFFFFF','#FF5D73','#FF9D4D','#FFD166','#8BD450','#31C9A7','#42B8F3','#557BFF','#9A70F5','#D66AE8','#A66C4F','#6B4A36'];

function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2100)}
function setStatus(msg){$('statusText').textContent=msg}
let renderLastAt=0,renderDelayTimer=0;
function requestRender(){if(renderQueued)return;renderQueued=true;const target=isMobileLayout()?Math.max(24,Math.min(60,Number(state.mobilePreviewFps)||45)):60;const wait=Math.max(0,1000/target-(performance.now()-renderLastAt));const schedule=()=>requestAnimationFrame(()=>{renderQueued=false;renderLastAt=performance.now();renderLayers()});if(wait>4)renderDelayTimer=setTimeout(schedule,wait);else schedule()}
function updateHistoryLimit(){state.historyLimit=320;trimHistory()}
const HISTORY_BUDGET=160*1024*1024;
function entryBytes(e){if(!e)return 0;if(e.type==='tiles')return [...(e.before||[]),...(e.after||[])].reduce((n,t)=>n+(t.image?.data?.byteLength||0),0);if(e.type==='pixels'||e.type==='pixelsRegion')return (e.before?.data?.byteLength||0)+(e.after?.data?.byteLength||0);if(e.type==='layers')return [...(e.before?.layers||[]),...(e.after?.layers||[])].reduce((n,l)=>n+(l.image?.data?.byteLength||0),0);return 0}
function trimHistory(){let total=[...state.history,...state.redo].reduce((n,e)=>n+entryBytes(e),0);while((state.history.length+state.redo.length)>state.historyLimit||total>HISTORY_BUDGET){const old=state.history.length?state.history.shift():state.redo.shift();if(!old)break;total-=entryBytes(old)}state.historyBytes=total}
function markDirty(){if(!state.projectId){state.projectId=createProjectId();state.projectCreatedAt=Date.now();}state.projectUpdatedAt=Date.now();state.dirty=true;$('autosaveStatus').textContent='未保存';scheduleAutosave()}
function activeLayer(){return state.layers.find(l=>l.id===state.activeId)||state.layers[state.layers.length-1]}
const TILE_SIZE=128, MAX_STROKE_TILES=1200;
function rememberStrokeTiles(a,b,control=null){const layer=state.layers.find(l=>l.id===state.strokeLayerId)||activeLayer(),map=state.strokeTiles;if(!layer||!map||layer.id!==state.strokeLayerId)return;const pad=Math.max(4,state.size*(['spray','glitter'].includes(state.brushPreset)?3:2));const aa=symmetryPoints(a),bb=symmetryPoints(b),cc=control?symmetryPoints(control):aa,ctx=layer.canvas.getContext('2d');for(let i=0;i<Math.min(aa.length,bb.length,cc.length);i++){const p=aa[i],q=bb[i],c=cc[i],x0=Math.max(0,Math.floor((Math.min(p.x,q.x,c.x)-pad)/TILE_SIZE)),y0=Math.max(0,Math.floor((Math.min(p.y,q.y,c.y)-pad)/TILE_SIZE)),x1=Math.min(Math.ceil(state.width/TILE_SIZE)-1,Math.floor((Math.max(p.x,q.x,c.x)+pad)/TILE_SIZE)),y1=Math.min(Math.ceil(state.height/TILE_SIZE)-1,Math.floor((Math.max(p.y,q.y,c.y)+pad)/TILE_SIZE));for(let ty=y0;ty<=y1;ty++)for(let tx= x0;tx<=x1;tx++){const key=tx+','+ty;if(map.has(key))continue;if(map.size>=MAX_STROKE_TILES){state.strokeTileLimitHit=true;continue;}const x=tx*TILE_SIZE,y=ty*TILE_SIZE,w=Math.min(TILE_SIZE,state.width-x),h=Math.min(TILE_SIZE,state.height-y);map.set(key,{x,y,before:ctx.getImageData(x,y,w,h)});}}}
function getStrokeTileAfter(layer){const ctx=layer.canvas.getContext('2d'),before=[],after=[];for(const tile of (state.strokeTiles||new Map()).values()){before.push({x:tile.x,y:tile.y,image:tile.before});after.push({x:tile.x,y:tile.y,image:ctx.getImageData(tile.x,tile.y,tile.before.width,tile.before.height)});}return{before,after};}
function applyTileHistory(layer,tiles){const ctx=layer.canvas.getContext('2d');for(const tile of tiles||[])ctx.putImageData(tile.image,tile.x,tile.y);}

function makeCanvas(){const c=document.createElement('canvas');c.width=state.width;c.height=state.height;return c}
function newLayer(name='Layer'){const c=makeCanvas();return {id:nextLayerId++,name,canvas:c,visible:true,opacity:1,blend:'source-over',textData:null}}
function initDocument(){stopAnimationPlayback({save:false,quiet:true});state.layers=[newLayer('Layer 1')];state.activeId=state.layers[0].id;state.bg='white';state.projectName='Untitled';state.projectId=null;state.projectCreatedAt=0;state.projectUpdatedAt=0;state.history=[];state.redo=[];state.dirty=false;state.reference=null;state.paperTexture='none';state.animationFrames=[];state.frameIndex=0;setViewCenter();renderLayers();updateUI();ensureInitialFrame();}
function setViewCenter(){const r=stage.getBoundingClientRect();state.zoom=Math.min((r.width-90)/state.width,(r.height-90)/state.height,1);state.zoom=Math.max(.05,state.zoom);state.panX=(r.width-state.width*state.zoom)/2;state.panY=(r.height-state.height*state.zoom)/2;updateZoom()}
function displayDpr(){const native=window.devicePixelRatio||1;if(state.lowMemory||state.renderQuality==='performance')return 1;if(state.renderQuality==='fidelity')return Math.min(native,isMobileLayout()?1.5:2);return Math.min(native,isMobileLayout()?1.25:1.5)}
let lastStageSize={width:0,height:0};
function resizeDisplay(force=false){
 if(!force&&(state.pointerDown||state.gesturePointers.size>0)){state.pendingDisplayResize=true;return;}
 const r=stage.getBoundingClientRect(),dpr=displayDpr();if(!r.width||!r.height)return;
 // Keep the same document point beneath the centre when mobile browser chrome or
 // orientation changes alter the viewport. Never refit/reset the artwork on resize.
 if(lastStageSize.width&&lastStageSize.height){state.panX+=(r.width-lastStageSize.width)/2;state.panY+=(r.height-lastStageSize.height)/2;}
 lastStageSize={width:r.width,height:r.height};
 for(const c of [display,overlay]){const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;c.style.width=r.width+'px';c.style.height=r.height+'px'}
 renderLayers();
}
let displayResizeRaf=0;
function scheduleDisplayResize(){if(displayResizeRaf)return;displayResizeRaf=requestAnimationFrame(()=>{displayResizeRaf=0;syncResponsiveLayout();if(state.pointerDown||state.gesturePointers.size>0){state.pendingDisplayResize=true;return;}resizeDisplay(true);});}
function flushPendingDisplayResize(){if(!state.pendingDisplayResize||state.pointerDown||state.gesturePointers.size>0)return;state.pendingDisplayResize=false;scheduleDisplayResize();}
function isMobileLayout(){const width=window.matchMedia?.('(max-width: 760px)').matches||false;const touch=!!(window.matchMedia?.('(pointer: coarse)').matches||(navigator.maxTouchPoints||0)>0);const shortLandscape=touch&&window.matchMedia?.('(max-height: 520px)').matches;const compactTouch=touch&&window.matchMedia?.('(max-width: 900px)').matches;return !!(width||shortLandscape||compactTouch);}
function syncResponsiveLayout(){const mobile=isMobileLayout();document.body.classList.toggle('mobile-layout',mobile);if(mobile&&!document.body.classList.contains('mobile-panel-open'))$('rightbar')?.classList.add('collapsed');if(!mobile){$('rightbar')?.classList.remove('collapsed');document.body.classList.remove('mobile-panel-open');}const t=$('panelToggle');if(t)t.setAttribute('aria-expanded',String(document.body.classList.contains('mobile-panel-open')||!$('rightbar')?.classList.contains('collapsed')));}
function setSettingsPanelOpen(open){const panel=$('rightbar');if(!panel)return;if(isMobileLayout()){document.body.classList.toggle('mobile-panel-open',!!open);panel.classList.toggle('collapsed',!open);}else{panel.classList.toggle('collapsed',!open);}const t=$('panelToggle');if(t)t.setAttribute('aria-expanded',String(!!open));}
function transformContext(ctx){const dpr=displayDpr();ctx.setTransform(dpr*state.zoom,0,0,dpr*state.zoom,dpr*state.panX,dpr*state.panY)}
let paperTileCache={};
function paperBaseColor(){return ({smooth:'#f8f7f2',coldpress:'#f4f0e5',rough:'#eee8d9',cotton:'#f8f4e9',rice:'#f5f0df',canvas:'#e8e1d3',vellum:'#e8d4a9',recycled:'#e8e7dc',newsprint:'#e2dfd4',laid:'#f3eddf',handmade:'#f2ead7',hotpress:'#f7f2e8',parchment:'#ddc79d',kraft:'#c9a477',pastel:'#ece5dc',manga:'#ffffff',linen:'#e9e2d5',kozo:'#f2eddc',mulberry:'#eee5d1',bamboo:'#f0e8d4',bristol:'#fafafa',charcoal:'#e4e0d8',pastelSand:'#e9dfd0',canvasFine:'#eee8da',canvasHeavy:'#dcd2c1',graphite:'#f1eee5',riceThin:'#f7f2e4',ledger:'#f4efdf',blueprint:'#f7f8fb',cottonHot:'#f8f5ec',cottonCold:'#eee9dc',vellumSmooth:'#f0e6cd',vellumRough:'#e8ddc2',mineral:'#eeeae1',fiberLong:'#f1ead9',fiberShort:'#f8f4e9',tracing:'#f3f4f0',charcoalGray:'#c8c6c1',pastelVelour:'#e5dfd7',canvasLinen:'#e7dfd0',recycledCard:'#ddd5c5'})[state.paperTexture]||'#fff'}

const PAPER_RESPONSE={
 none:{tooth:0,absorb:.02,fiber:0},smooth:{tooth:.06,absorb:.08,fiber:.02},coldpress:{tooth:.68,absorb:.62,fiber:.48},rough:{tooth:.96,absorb:.78,fiber:.82},cotton:{tooth:.48,absorb:.58,fiber:.35},rice:{tooth:.54,absorb:.52,fiber:.88},canvas:{tooth:.82,absorb:.46,fiber:.76},vellum:{tooth:.14,absorb:.18,fiber:.12},recycled:{tooth:.52,absorb:.54,fiber:.60},newsprint:{tooth:.38,absorb:.82,fiber:.24},laid:{tooth:.30,absorb:.43,fiber:.62},handmade:{tooth:.78,absorb:.66,fiber:.96},hotpress:{tooth:.20,absorb:.26,fiber:.12},parchment:{tooth:.42,absorb:.38,fiber:.70},kraft:{tooth:.48,absorb:.50,fiber:.58},pastel:{tooth:.92,absorb:.18,fiber:.96},manga:{tooth:.10,absorb:.10,fiber:.04},linen:{tooth:.72,absorb:.34,fiber:.72},kozo:{tooth:.62,absorb:.60,fiber:.98},mulberry:{tooth:.76,absorb:.58,fiber:.98},bamboo:{tooth:.64,absorb:.64,fiber:.86},bristol:{tooth:.04,absorb:.07,fiber:.01},charcoal:{tooth:.94,absorb:.20,fiber:.90},pastelSand:{tooth:1,absorb:.14,fiber:.95},canvasFine:{tooth:.64,absorb:.42,fiber:.68},canvasHeavy:{tooth:.96,absorb:.50,fiber:.82},graphite:{tooth:.36,absorb:.12,fiber:.42},riceThin:{tooth:.44,absorb:.48,fiber:.92},ledger:{tooth:.26,absorb:.35,fiber:.58},blueprint:{tooth:.08,absorb:.12,fiber:.06},cottonHot:{tooth:.22,absorb:.42,fiber:.32},cottonCold:{tooth:.72,absorb:.68,fiber:.55},vellumSmooth:{tooth:.12,absorb:.16,fiber:.10},vellumRough:{tooth:.60,absorb:.24,fiber:.38},mineral:{tooth:.70,absorb:.18,fiber:.28},fiberLong:{tooth:.72,absorb:.60,fiber:.98},fiberShort:{tooth:.32,absorb:.44,fiber:.54},tracing:{tooth:.04,absorb:.03,fiber:.01},charcoalGray:{tooth:.92,absorb:.18,fiber:.88},pastelVelour:{tooth:.98,absorb:.12,fiber:.72},canvasLinen:{tooth:.82,absorb:.42,fiber:.90},recycledCard:{tooth:.58,absorb:.56,fiber:.72}
};
function getPaperResponse(){const base=PAPER_RESPONSE[state.paperTexture]||PAPER_RESPONSE.none;if(state.paperTexture==='none')return{tooth:0,absorb:.02,fiber:0};const tooth=Math.max(0,Math.min(1,base.tooth*.58+(state.paperTooth??.5)*.42));return{tooth,absorb:Math.max(0,Math.min(1,base.absorb*.58+(state.paperPorosity??.5)*.42+(state.paperBleed??.1)*.12)),fiber:Math.max(0,Math.min(1,base.fiber*.62+(state.paperFiberDensity??.5)*.38))}}
function getPaperTile(){const cacheKey=[state.paperTexture,state.paperFiberDirection||0,state.paperGrainScale||1,state.paperSurfaceRelief??.55,state.paperFiberDensity??.5,state.paperFiberLength??.55,state.paperWarp??.28,state.paperNoise??.24,state.canvasWeave??.55].join(':');if(paperTileCache[cacheKey])return paperTileCache[cacheKey];const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d'),im=x.createImageData(c.width,c.height);let seed=state.paperTexture.split('').reduce((a,b)=>a+b.charCodeAt(0),17);for(let i=0;i<im.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=((seed>>>24)-128)*(0.35+(state.paperNoise??.24)*1.3);im.data[i]=120+n;im.data[i+1]=115+n;im.data[i+2]=105+n;im.data[i+3]=Math.max(0,Math.min(255,Math.abs(n)*1.5))}x.putImageData(im,0,0);
 if(['canvas','linen','canvasFine','canvasHeavy','canvasLinen'].includes(state.paperTexture)){x.save();x.globalAlpha=.18*(state.canvasWeave??.55)*1.8;x.strokeStyle='#665f52';x.lineWidth=1;for(let i=0;i<=128;i+=4){x.beginPath();x.moveTo(i,0);x.lineTo(i,128);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(128,i);x.stroke()}x.restore()}
 if(['laid','rice','handmade','vellum','parchment','kraft','kozo','mulberry','bamboo','riceThin','ledger','fiberLong','fiberShort','vellumSmooth','vellumRough','cottonHot','cottonCold','tracing','canvasLinen','recycledCard'].includes(state.paperTexture)){x.save();x.globalAlpha=state.paperTexture==='parchment'?.15:.10;x.strokeStyle='#766b55';for(let i=0;i<22;i++){const yy=(i*37)%128;x.beginPath();x.moveTo(0,yy);x.bezierCurveTo(35,yy-2,75,yy+2,128,yy+(i%3)-1);x.stroke()}x.restore()}
 if(['coldpress','rough','pastel','hotpress','charcoal','pastelSand','graphite','canvasHeavy','cottonCold','cottonHot','mineral','charcoalGray','pastelVelour','recycledCard','vellumRough','fiberShort'].includes(state.paperTexture)){x.save();x.globalAlpha=state.paperTexture==='rough'?.12:.07;x.fillStyle='#786f60';for(let i=0;i<420;i++){const xx=(i*73)%128,yy=(i*41)%128,r=state.paperTexture==='rough'?1.25:.65;x.beginPath();x.arc(xx,yy,r,0,Math.PI*2);x.fill()}x.restore()}
 if(['newsprint','blueprint','tracing'].includes(state.paperTexture)){x.save();x.globalAlpha=.12;x.fillStyle='#6c6252';for(let yy=2;yy<128;yy+=5)for(let xx=2;xx<128;xx+=5){x.beginPath();x.arc(xx,yy,.65,0,Math.PI*2);x.fill()}x.restore()}
 if(state.paperTexture==='manga'){x.save();x.globalAlpha=.06;x.strokeStyle='#64748b';x.lineWidth=.5;x.strokeRect(6,6,116,116);x.beginPath();x.moveTo(10,10);x.lineTo(118,10);x.moveTo(10,118);x.lineTo(118,118);x.stroke();x.restore()}
 // Directional cellulose fibres. Their angle and scale are user-adjustable and deterministic.
 if(getPaperResponse().fiber>.15){x.save();x.translate(64,64);x.rotate((Number(state.paperFiberDirection)||0)*Math.PI/180);x.translate(-64,-64);x.globalAlpha=Math.max(.015,Math.min(.22,getPaperResponse().fiber*(state.paperSurfaceRelief??.55)*.16));x.strokeStyle=state.paperTexture==='blueprint'?'#9ab2d8':'#766f60';x.lineWidth=Math.max(.25,.55*(state.paperGrainScale||1));const lines=Math.max(4,Math.round((state.paperTexture==='mulberry'||state.paperTexture==='kozo'||state.paperTexture==='fiberLong'?38:22)*(0.4+(state.paperFiberDensity??.5)*1.2)));const fiberLength=0.35+(state.paperFiberLength??.55)*.95,warp=state.paperWarp??.28;for(let i=0;i<lines;i++){const yy=(i*53+seed%31)%128,shift=(i%5-2)*2;x.beginPath();x.moveTo(0,yy);x.bezierCurveTo(30*fiberLength,yy+shift*warp*2,75*fiberLength,yy-shift*warp*2,128*fiberLength,yy+(i%3-1)*warp*3);x.stroke()}x.restore();}
 paperTileCache[cacheKey]=c;return c}
function drawDocumentBase(ctx,includeReference=true){if(state.paperTexture!=='none'){ctx.fillStyle=paperBaseColor();ctx.fillRect(0,0,state.width,state.height);if((state.paperBrightness??1)!==1){ctx.save();ctx.globalAlpha=Math.min(.22,Math.abs((state.paperBrightness??1)-1)*.34);ctx.fillStyle=(state.paperBrightness??1)>1?'#ffffff':'#30291f';ctx.fillRect(0,0,state.width,state.height);ctx.restore()}if(Math.abs(state.paperTemperature||0)>1){ctx.save();ctx.globalAlpha=Math.min(.12,Math.abs(state.paperTemperature)/380);ctx.fillStyle=(state.paperTemperature||0)>0?'#d99452':'#668fc2';ctx.fillRect(0,0,state.width,state.height);ctx.restore()}const tile=ctx.createPattern(getPaperTile(),'repeat');const grainScale=Math.max(.5,Math.min(2.5,Number(state.paperGrainScale)||1));if(tile?.setTransform&&typeof DOMMatrix!=='undefined')tile.setTransform(new DOMMatrix().scale(grainScale,grainScale));ctx.save();ctx.globalAlpha=state.paperStrength*(state.paperTexture==='smooth'?.10:.26)*(.45+(state.paperSurfaceRelief??.55)*.85);ctx.globalCompositeOperation='multiply';ctx.fillStyle=tile;ctx.fillRect(0,0,state.width,state.height);ctx.restore()}else if(state.bg==='white'){ctx.fillStyle='#fff';ctx.fillRect(0,0,state.width,state.height)}else if(state.bg==='dark'){ctx.fillStyle='#444';ctx.fillRect(0,0,state.width,state.height)}
 if(includeReference&&state.reference&&state.reference.visible&&state.reference.image){ctx.save();ctx.globalAlpha=state.reference.opacity;const img=state.reference.image;const baseScale=Math.min(state.width/img.width,state.height/img.height);const scale=baseScale*(state.reference.scale||1);const w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(state.width-w)/2+(state.reference.x||0),(state.height-h)/2+(state.reference.y||0),w,h);ctx.restore()}}
let perfFrames=0,perfWindowStart=performance.now(),perfLastRender=0;
function recordRenderPerformance(start){const now=performance.now();perfFrames++;if(now-perfWindowStart>=800){const fps=Math.round(perfFrames*1000/(now-perfWindowStart));const el=$('perfFps');if(el)el.textContent=fps+' FPS';const ms=$('perfRender');if(ms)ms.textContent=Math.max(0,Math.round(perfLastRender))+' ms';perfFrames=0;perfWindowStart=now;}perfLastRender=now-start;}
let renderFrameBuffer=null,renderFrameContext=null,renderFrameFailed=false;
function ensureRenderFrameBuffer(){
 try{
  if(!renderFrameBuffer)renderFrameBuffer=document.createElement('canvas');
  if(renderFrameBuffer.width!==display.width)renderFrameBuffer.width=display.width;
  if(renderFrameBuffer.height!==display.height)renderFrameBuffer.height=display.height;
  renderFrameContext=renderFrameBuffer.getContext('2d',{alpha:true});
  return renderFrameContext;
 }catch(_){renderFrameContext=null;renderFrameFailed=true;return null;}
}
function renderLayers(){
 if(!display.width)return;
 const renderStart=performance.now(),dpr=displayDpr();
 const buffer=ensureRenderFrameBuffer(),ctx=buffer||dctx;
 ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,display.width,display.height);
 transformContext(ctx);ctx.imageSmoothingEnabled=!isPixelWorkspace();ctx.imageSmoothingQuality=state.renderQuality==='fidelity'?'high':'medium';drawDocumentBase(ctx,true);
 if(state.onionSkin&&!state.animationPlaying&&state.onionGhost?.length){
  for(const ghost of state.onionGhost){
   if(!ghost?.layers?.length)continue;
   ctx.save();ctx.globalAlpha=ghost.alpha??.14;
   for(const item of ghost.layers){if(!item.visible||!item.image)continue;ctx.save();ctx.globalAlpha=(ghost.alpha??.14)*(item.opacity??1);ctx.globalCompositeOperation=item.blend||'source-over';ctx.drawImage(item.image,0,0,state.width,state.height);ctx.restore()}
   ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=(ghost.alpha??.14)*.46;ctx.fillStyle=ghost.tint||'#65aaff';ctx.fillRect(0,0,state.width,state.height);ctx.restore();
  }
 }
 for(const l of state.layers){if(!l.visible)continue;ctx.save();ctx.globalAlpha=l.opacity;ctx.globalCompositeOperation=l.blend||'source-over';if(state.pointerDown&&state.strokeIsSmooth&&l.id===state.strokeLayerId)drawLayerWithStrokePreview(ctx,l);else ctx.drawImage(l.canvas,0,0);ctx.restore()}
 drawOverlay();drawTransformOverlay(octx);
 // Present only a fully composed frame. A failed buffer allocation safely falls
 // back to the original visible canvas compositor rather than blanking the artwork.
 if(buffer){
  dctx.setTransform(1,0,0,1,0,0);dctx.globalAlpha=1;dctx.globalCompositeOperation='source-over';dctx.clearRect(0,0,display.width,display.height);dctx.drawImage(renderFrameBuffer,0,0);
 }else if(renderFrameFailed){
  // The direct path above was selected as ctx=dctx.
 }
 recordRenderPerformance(renderStart);
}
function clearOverlay(){const dpr=displayDpr();octx.setTransform(1,0,0,1,0,0);octx.clearRect(0,0,overlay.width,overlay.height);transformContext(octx)}
function symmetryPoints(p){const cx=state.width/2,cy=state.height/2;const mode=state.symmetry;let pts=[p];if(mode==='vertical'||mode==='quad')pts.push({x:2*cx-p.x,y:p.y});if(mode==='horizontal'||mode==='quad')pts.push({x:p.x,y:2*cy-p.y});if(mode==='quad')pts.push({x:2*cx-p.x,y:2*cy-p.y});if(mode==='radial'){pts=[];for(let i=0;i<8;i++){const a=i*Math.PI/4,dx=p.x-cx,dy=p.y-cy;pts.push({x:cx+dx*Math.cos(a)-dy*Math.sin(a),y:cy+dx*Math.sin(a)+dy*Math.cos(a)})}}return pts}
function drawSymmetryGuides(ctx){if(state.symmetry==='none')return;ctx.save();ctx.strokeStyle='#6c9fd3aa';ctx.lineWidth=1/state.zoom;ctx.setLineDash([5/state.zoom,5/state.zoom]);const cx=state.width/2,cy=state.height/2;if(['vertical','quad','radial'].includes(state.symmetry)){ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,state.height);ctx.stroke()}if(['horizontal','quad'].includes(state.symmetry)){ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(state.width,cy);ctx.stroke()}if(state.symmetry==='radial'){for(let i=1;i<4;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(cx-Math.cos(a)*Math.max(state.width,state.height),cy-Math.sin(a)*Math.max(state.width,state.height));ctx.lineTo(cx+Math.cos(a)*Math.max(state.width,state.height),cy+Math.sin(a)*Math.max(state.width,state.height));ctx.stroke()}}ctx.restore()}
const SHAPE_TOOLS=['line','rect','ellipse','triangle','star','roundedRect','arrow','polygon','curve'];
function isShapeTool(tool){return SHAPE_TOOLS.includes(tool)}
function drawShapePath(ctx,tool,a,b,fill=false){
 const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;ctx.beginPath();
 if(tool==='line'){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}
 else if(tool==='rect'){ctx.rect(x,y,w,h)}
 else if(tool==='roundedRect'){const r=Math.min(30,w*.18,h*.18);if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h)}
 else if(tool==='ellipse'){ctx.ellipse(cx,cy,Math.max(.5,w/2),Math.max(.5,h/2),0,0,Math.PI*2)}
 else if(tool==='triangle'){ctx.moveTo(cx,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath()}
 else if(tool==='polygon'||tool==='star'){const n=tool==='star'?10:Math.max(3,Math.min(16,state.polygonSides||6)),rx=w/2,ry=h/2;for(let i=0;i<n;i++){const radius=tool==='star'&&i%2===1?.42:1,ang=-Math.PI/2+i*Math.PI*2/n,px=cx+Math.cos(ang)*rx*radius,py=cy+Math.sin(ang)*ry*radius;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}ctx.closePath()}
 else if(tool==='arrow'){const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len,nx=-uy,ny=ux,head=Math.min(len*.38,Math.max(state.size*3,16)),shaft=Math.max(state.size*1.1,2),hx=b.x-ux*head,hy=b.y-uy*head;ctx.moveTo(a.x+nx*shaft/2,a.y+ny*shaft/2);ctx.lineTo(hx+nx*shaft/2,hy+ny*shaft/2);ctx.lineTo(hx+nx*head*.48,hy+ny*head*.48);ctx.lineTo(b.x,b.y);ctx.lineTo(hx-nx*head*.48,hy-ny*head*.48);ctx.lineTo(hx-nx*shaft/2,hy-ny*shaft/2);ctx.lineTo(a.x-nx*shaft/2,a.y-ny*shaft/2);ctx.closePath()}
 else if(tool==='curve'){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=len? -dy/len:0,ny=len?dx/len:0,off=len*(state.curveBend||.35);ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(cx+nx*off,cy+ny*off,b.x,b.y)}
 if(fill&& !['line','curve'].includes(tool))ctx.fill();else ctx.stroke();
}
function drawLiveStrokePreview(ctx,points){
 if(!points?.length)return;const preset=state.brushPreset,eraser=state.tool==='eraser';
 // Keep preview cost bounded on high-polling styluses without dropping committed samples.
 let previewPoints=points;
 if(points.length>1400){const stride=Math.ceil(points.length/1400);previewPoints=points.filter((_,i)=>i%stride===0||i===points.length-1)}
 const avgP=previewPoints.reduce((n,p)=>n+(p.p??1),0)/previewPoints.length;
 const pressureOn=$('pressureSize')?.checked&&state.lastPointerType==='pen';
 const pressure=pressureOn?pressureResponse(avgP):1;
 let width=Math.max(.35,state.size*pressure);
 const mediaWidth={maru:.46,millipen:.74,marker:1.35,watercolor:1.42,airbrush:1.72,softAirbrush:1.95,highlighter:1.9,oil:1.42,bristleOil:1.5,calligraphy:1.18,pencilHB:.78,pencilB:.88,pencil2B:1,pencil4B:1.12}[preset]||1;
 width*=mediaWidth;
 const color=preset==='neonPink'?'#ff38c8':preset==='neonCyan'?'#30eaff':preset==='neonLime'?'#a8ff36':state.color;
 ctx.save();ctx.globalCompositeOperation=eraser?'source-over':'source-over';ctx.globalAlpha=eraser?.36:Math.max(.08,Math.min(1,state.opacity*state.brushFlow*brushAlphaScale(preset)));
 ctx.strokeStyle=eraser?'#f08b8b':color;ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';
 if(['neon','neonPink','neonCyan','neonLime'].includes(preset)){ctx.shadowColor=color;ctx.shadowBlur=width*.9;}
 else if(['watercolor','airbrush','softAirbrush','pastel','chalk'].includes(preset)){ctx.shadowColor=color;ctx.shadowBlur=width*(.08+(state.edgeSoftness||0)*.12);}
 ctx.beginPath();ctx.moveTo(previewPoints[0].x,previewPoints[0].y);
 if(previewPoints.length===1){ctx.lineTo(previewPoints[0].x+.01,previewPoints[0].y);ctx.stroke();ctx.restore();return;}
 for(let i=1;i<previewPoints.length-1;i++){const a=previewPoints[i],b=previewPoints[i+1];ctx.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);}
 const last=previewPoints[previewPoints.length-1];ctx.lineTo(last.x,last.y);ctx.stroke();ctx.restore();
}
function drawEraserFallbackGuide(ctx,points){if(!ctx||!points?.length)return;const paths=symmetryStrokePaths(points);ctx.save();ctx.strokeStyle='#ff8585';ctx.fillStyle='rgba(255,133,133,.10)';ctx.globalAlpha=.72;ctx.lineWidth=Math.max(1,state.size);ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([5/Math.max(.4,state.zoom),4/Math.max(.4,state.zoom)]);for(const path of paths){if(!path.length)continue;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);ctx.stroke();const p=path[path.length-1];ctx.beginPath();ctx.arc(p.x,p.y,Math.max(2,state.size/2),0,Math.PI*2);ctx.stroke()}ctx.restore()}
function drawOverlay(){clearOverlay();if(!octx)return;drawSymmetryGuides(octx);if(isPixelWorkspace())drawPixelGridOverlay(octx);if(state.pointerDown&&state.strokeIsSmooth&&state.strokePath?.length&&(state.strokePreviewFallback||state.strokePreviewStickyFallback)){if(state.tool==='eraser')drawEraserFallbackGuide(octx,strokePreviewSamplePath(state.strokePath));else drawSmoothStroke(octx,strokePreviewSamplePath(state.strokePath),true);}if(state.pointerDown&&state.startPoint&&isShapeTool(state.tool)){const starts=symmetryPoints(state.startPoint),ends=symmetryPoints(state.lastPoint||state.startPoint);octx.save();octx.strokeStyle=state.color;octx.fillStyle=state.color;octx.globalAlpha=state.opacity;octx.lineWidth=isPixelWorkspace()?1:state.size;octx.lineCap=isPixelWorkspace()?'butt':'round';octx.lineJoin='round';for(let i=0;i<Math.min(starts.length,ends.length);i++){if(isPixelWorkspace()&&['line','rect','ellipse'].includes(state.tool))drawPixelShape(octx,state.tool,starts[i],ends[i],$('shapeFill').checked);else drawShapePath(octx,state.tool,starts[i],ends[i],$('shapeFill').checked)}octx.restore()}if(state.pointerDown&&state.tool==='gradient'&&state.startPoint&&state.lastPoint){const a=state.startPoint,b=state.lastPoint;octx.save();const grad=state.gradientType==='radial'?octx.createRadialGradient(a.x,a.y,0,b.x,b.y,Math.max(1,Math.hypot(b.x-a.x,b.y-a.y))):octx.createLinearGradient(a.x,a.y,b.x,b.y);grad.addColorStop(0,state.color);grad.addColorStop(1,state.gradientColor);octx.globalAlpha=.35;octx.fillStyle=grad;octx.fillRect(0,0,state.width,state.height);octx.restore()}}
function drawTransformOverlay(ctx){if(!['transform','move'].includes(state.tool)||!state.transformBounds||!ctx)return;const b=state.transformBounds;ctx.save();ctx.strokeStyle='#91c8ff';ctx.fillStyle='#d9edff';ctx.lineWidth=1.4/state.zoom;ctx.setLineDash([6/state.zoom,4/state.zoom]);ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.setLineDash([]);const handles=[{x:b.x+b.w/2,y:b.y-28/state.zoom,r:5/state.zoom},...[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]].map(([x,y])=>({x,y,r:5/state.zoom}))];ctx.beginPath();ctx.moveTo(b.x+b.w/2,b.y);ctx.lineTo(b.x+b.w/2,b.y-28/state.zoom);ctx.stroke();for(const h of handles){ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.fill();ctx.stroke()}ctx.restore()}
function findAlphaBounds(layer){if(!layer)return{x:0,y:0,w:state.width,h:state.height};const d=layer.canvas.getContext('2d').getImageData(0,0,state.width,state.height).data;let minX=state.width,minY=state.height,maxX=-1,maxY=-1;for(let y=0;y<state.height;y++){let row=y*state.width*4;for(let x=0;x<state.width;x++){if(d[row+x*4+3]>4){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}}}return maxX<0?{x:0,y:0,w:state.width,h:state.height}:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}}
function cloneLayerCanvas(layer){const c=makeCanvas();c.getContext('2d').drawImage(layer.canvas,0,0);return c}
function renderLayerTransform(layer,src,base,dx,dy,angle,scaleX,scaleY=scaleX){const ctx=layer.canvas.getContext('2d');ctx.clearRect(0,0,state.width,state.height);ctx.save();ctx.translate(base.cx+dx,base.cy+dy);ctx.rotate(angle);ctx.scale(scaleX,scaleY);ctx.drawImage(src,-base.cx,-base.cy);ctx.restore();}
function applyObjectTransform(angle,scale,dx,dy,flipX=false){const layer=activeLayer();if(!layer)return;const before=captureLayerImage(layer),src=cloneLayerCanvas(layer),bounds=state.transformBounds||findAlphaBounds(layer),base={cx:bounds.x+bounds.w/2,cy:bounds.y+bounds.h/2};renderLayerTransform(layer,src,base,dx,dy,angle,scale*(flipX?-1:1));const after=captureLayerImage(layer);pushHistory({type:'pixels',layerId:layer.id,before,after});state.transformBounds=findAlphaBounds(layer);renderLayers();markDirty();}
function hitTransformHandle(p,b){const r=13/state.zoom,rot={x:b.x+b.w/2,y:b.y-28/state.zoom};if(Math.hypot(p.x-rot.x,p.y-rot.y)<r)return'rotate';const hs=[['scale-nw',b.x,b.y],['scale-ne',b.x+b.w,b.y],['scale-sw',b.x,b.y+b.h],['scale-se',b.x+b.w,b.y+b.h]];for(const [id,x,y] of hs)if(Math.hypot(p.x-x,p.y-y)<r)return id;if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return'move';return null;}
function findLayerAtPoint(p){const x=Math.max(0,Math.min(state.width-1,Math.floor(p.x))),y=Math.max(0,Math.min(state.height-1,Math.floor(p.y)));for(let i=state.layers.length-1;i>=0;i--){const l=state.layers[i];if(!l.visible||l.opacity<=0)continue;try{if(l.canvas.getContext('2d').getImageData(x,y,1,1).data[3]>12)return l}catch(_){}}return null;}
function isPixelWorkspace(){return document.documentElement.dataset.pfWorkspaceMode==='pixel'}
function isPixelDrawing(){return isPixelWorkspace()||state.brushPreset==='pixel'}
function docPoint(e){const r=stage.getBoundingClientRect(),x=(e.clientX-r.left-state.panX)/state.zoom,y=(e.clientY-r.top-state.panY)/state.zoom;return isPixelDrawing()?{x:Math.floor(x),y:Math.floor(y)}:{x,y}}
function insideDoc(p){return p.x>=0&&p.y>=0&&p.x<state.width&&p.y<state.height}
function colorRgb(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]}
function curvePoint(a,control,b,t){const u=1-t;return{x:u*u*a.x+2*u*t*control.x+t*t*b.x,y:u*u*a.y+2*u*t*control.y+t*t*b.y}}
function stableRandom(seed){let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}}
function traceBrushPath(ctx,a,b,control){ctx.beginPath();ctx.moveTo(a.x,a.y);if(control)ctx.quadraticCurveTo(control.x,control.y,b.x,b.y);else ctx.lineTo(b.x,b.y);ctx.stroke()}
const SMOOTH_INK_PRESETS=new Set(['rainbow','gpen','maru','millipen','pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','watercolor','acrylic','glass','fountain','marker','airbrush','chalk','crayon','brushPen','sumi','dip','dryBrush','oil','pastel','highlighter','neon','metalGold','metalSilver','metalCopper','chrome','neonPink','neonCyan','neonLime','calligraphy','bristleOil','granulating','softAirbrush','mappingPen','liner','saji','fude','drySumi','mechanicalPencil','softPencil','charcoal','conte','oilPastel','roundWatercolor','flatWatercolor','gouache','textureBrush','watercolorBloom','dryGouache','sableRound','flatSable','fanBrush','paletteKnife','stippling','splatter','inkWash','softGraphite','hardGraphite','chalkDust','textureMottler','grainMarker','dryMarker','wetMarker']);
function useSmoothStroke(){return state.tool==='eraser'||(state.tool==='brush'&&SMOOTH_INK_PRESETS.has(state.brushPreset));}
function resampleStroke(points){
 if(!points||!points.length)return[];
 if(points.length===1)return[{...points[0]}];
 const out=[{...points[0]}];
 const baseStep=(state.renderQuality==='fidelity'?.38:(state.lowMemory||state.renderQuality==='performance'?.92:.58))*(1.4-Math.max(.25,Math.min(1,state.strokeResampleQuality??.8))*.5);
 const fine=Math.max(0,Math.min(1,state.stampSpacingFine??.5));const step=Math.max(.24,Math.min(1.8,Math.max(baseStep*(1.2-fine*.45),state.size*(.018+(.014*(1-fine))))));
 const dist=(a,b)=>Math.hypot((b.x||0)-(a.x||0),(b.y||0)-(a.y||0));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const lerpSample=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),p:lerp(a.p??1,b.p??1,t),v:lerp(a.v??0,b.v??0,t),tiltX:lerp(a.tiltX??0,b.tiltX??0,t),tiltY:lerp(a.tiltY??0,b.tiltY??0,t),time:lerp(a.time??0,b.time??0,t)});
 if(points.length===2){
  const a=points[0],b=points[1],n=Math.max(2,Math.min(720,Math.ceil(dist(a,b)/step)));
  for(let k=1;k<=n;k++)out.push(lerpSample(a,b,k/n));
  return out;
 }
 // Centripetal Catmull–Rom. The previous build had reversed interpolation factors
 // in the knot blends; that can fold short curves and create visible kinks.
 for(let i=0;i<points.length-1;i++){
  const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
  const d01=Math.max(.0001,Math.sqrt(dist(p0,p1))),d12=Math.max(.0001,Math.sqrt(dist(p1,p2))),d23=Math.max(.0001,Math.sqrt(dist(p2,p3)));
  const t0=0,t1=d01,t2=t1+d12,t3=t2+d23;
  const n=Math.max(2,Math.min(720,Math.ceil(dist(p1,p2)/step)));
  const mixPoint=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});
  for(let k=1;k<=n;k++){
   const f=k/n,tt=t1+(t2-t1)*f;
   const A1=mixPoint(p0,p1,(tt-t0)/(t1-t0));
   const A2=mixPoint(p1,p2,(tt-t1)/(t2-t1));
   const A3=mixPoint(p2,p3,(tt-t2)/(t3-t2));
   const B1=mixPoint(A1,A2,(tt-t0)/(t2-t0));
   const B2=mixPoint(A2,A3,(tt-t1)/(t3-t1));
   const C=mixPoint(B1,B2,(tt-t1)/(t2-t1));
   const attrs=lerpSample(p1,p2,f);
   // Keep the spline inside a small envelope around the segment to prevent cusps.
   const pad=Math.max(.15,Math.sqrt(dist(p1,p2))*.08);
   attrs.x=Math.max(Math.min(p1.x,p2.x)-pad,Math.min(Math.max(p1.x,p2.x)+pad,C.x));
   attrs.y=Math.max(Math.min(p1.y,p2.y)-pad,Math.min(Math.max(p1.y,p2.y)+pad,C.y));
   out.push(attrs);
  }
 }
 return out;
}
function pressureResponse(value){
 const p=Math.max(.015,Math.min(1,Number(value)||.5)),profile=state.pressureProfile||'natural';
 const curve=Math.max(.45,Math.min(2.2,state.pressureCurve||1));
 if(profile==='soft')return Math.pow(p,Math.min(2.3,curve*1.32));
 if(profile==='firm')return Math.pow(p,Math.max(.42,curve*.72));
 if(profile==='ink')return Math.pow(p,Math.max(.55,curve*1.08));
 return Math.pow(p,curve);
}
function smooth01(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
function ribbonPolygon(points,width){
 const pts=resampleStroke(points);if(!pts.length)return null;
 if(pts.length===1)return{points:pts,left:[],right:[],single:true,radius:Math.max(.25,width/2)};
 const left=[],right=[],cum=[0];let total=0;
 for(let i=1;i<pts.length;i++){total+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);cum.push(total)}
 const preset=state.brushPreset;
 const presetWidth={gpen:1,maru:.46,millipen:.74,mappingPen:.76,liner:.50,mechanicalPencil:.68,softPencil:.92,saji:1.12,fude:1.52,drySumi:1.42,flatWatercolor:1.7,roundWatercolor:1.55,gouache:1.32,charcoal:1.35,conte:1.2,oilPastel:1.48,textureBrush:1.45,watercolorBloom:1.58,dryGouache:1.30,sableRound:1.34,flatSable:1.68,fanBrush:1.76,paletteKnife:1.92,stippling:1.18,splatter:1.36,inkWash:1.48,softGraphite:.94,hardGraphite:.72,chalkDust:1.25,textureMottler:1.64,grainMarker:1.32,dryMarker:1.22,wetMarker:1.42,glass:.68,fountain:.88,marker:1.35,airbrush:1.72,brushPen:1.24,sumi:1.12,dip:.78,highlighter:1.9,neon:.9,metalGold:1,metalSilver:1,metalCopper:1,chrome:1,neonPink:.9,neonCyan:.9,neonLime:.9,calligraphy:1.18,softAirbrush:1.95,pencilHB:.78,pencilB:.88,pencil2B:1,pencil4B:1.12,coloredPencil:.98,watercolor:1.42,oil:1.42,bristleOil:1.5,filbertBrush:1.48,hakeBrush:2.25,mopBrush:2.05,rakeBrush:1.72,daggerBrush:1.35,blenderBrush:1.65,fanDryBrush:1.8,softCarbon:1.06,waxCrayon:1.38,graphitePowder:1.55,sumiWide:1.72,acrylic:1.25,pastel:1.25,granulating:1.38}[preset]||1;
 const pressureOn=$('pressureSize')?.checked&&state.lastPointerType==='pen';
 const velocitySize=Math.max(0,Math.min(.8,state.velocitySize||0));
 for(let i=0;i<pts.length;i++){
  const prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  const pp=(Math.max(0,i-1)+Math.min(pts.length-1,i+1));
  let pressure=pressureOn?pressureResponse(pts[i].p??1):1;
  // Pressure smoothing is configurable and shared by every pen, not only the G-pen.
  if(pressureOn&&pts.length>2){const pa=pressureResponse(pts[Math.max(0,i-1)].p??1),pb=pressureResponse(pts[Math.min(pts.length-1,i+1)].p??1),smooth=Math.max(0,Math.min(1,state.strokePressureSmoothing??.62));pressure=pressure*(1-smooth*.46)+(pa+pb)*smooth*.23;}
  pressure=1+(pressure-1)*Math.max(0,Math.min(1.8,state.pressureWidthGain??1));
  const velocity=Math.max(0,Math.min(1,pts[i].v??0));
  let w=width*presetWidth*pressure*(1-velocity*velocitySize*.55);
  const aspect=Math.max(.25,Math.min(1.75,state.brushAspect??1));w*=Math.sqrt(aspect);
  const direction=Math.atan2(dy,dx),tiltActive=!!state.tiltEnabled&&state.lastPointerType==='pen',tiltMagnitude=tiltActive?Math.min(1,Math.hypot(pts[i].tiltX||0,pts[i].tiltY||0)/90):0,tiltAngle=Math.atan2(pts[i].tiltY||0,pts[i].tiltX||0),nibBase=(state.brushAngle||0)*Math.PI/180;
  const angleMode=state.nibAngleMode||'follow',follow=Math.max(0,Math.min(1,state.nibFollow??.65));
  let nibAngle=nibBase;if(angleMode==='follow'||angleMode==='combined')nibAngle+=direction*follow;if((angleMode==='tilt'||angleMode==='combined')&&tiltActive)nibAngle+=tiltAngle*(state.nibTiltSensitivity||0);
  if(['flat','chisel','knife','fan'].includes(state.brushTipShape)||['calligraphy','paletteKnife','flatSable','flatWatercolor','hakeBrush','daggerBrush'].includes(preset))w*=.72+.28*Math.abs(Math.sin(direction-nibAngle));
  w*=1+tiltMagnitude*Math.max(0,Math.min(1,state.tiltWidthGain??.42))*.48;
  if(state.tipRotationJitter>.001){const seed=Math.sin((pts[i].x*12.9898+pts[i].y*78.233+i*37.719+state.strokeSessionId*3.1))*43758.5453;w*=1+(seed-Math.floor(seed))*(state.tipRotationJitter||0)*.18;}
  const progress=total>0?cum[i]/total:i/(pts.length-1);
  const widthNoise=Math.max(0,Math.min(.3,state.strokeWidthNoise??.035)),wave=Math.max(0,Math.min(.35,state.strokeWidthWave??.08));
  const deterministic=Math.sin((pts[i].x*.071+pts[i].y*.037+state.strokeSessionId*.71))*Math.cos((progress*17+state.brushAngle*.013));
  w*=Math.max(.55,1+deterministic*widthNoise+Math.sin(progress*Math.PI*2*3+state.strokeSessionId)*wave*.22);
  const ts=Math.max(.001,state.taperStart||.001),te=Math.max(.001,state.taperEnd||.001);
  const startFactor=smooth01(Math.min(1,progress/ts));
  const endFactor=smooth01(Math.min(1,(1-progress)/te));
  const taperExponent=Math.max(.5,Math.min(2.5,state.strokeTaperPower??1.35));
  const tipFactor=Math.pow(Math.min(startFactor,endFactor),taperExponent);
  w*=1-(Math.max(0,Math.min(.8,state.strokeTaper||0))*(1-tipFactor));
  w*=.12+.88*tipFactor;
  if(preset==='fountain'||preset==='glass')w*=.92+.08*pressure;
  if(preset==='millipen'||preset==='maru')w=width*presetWidth*(pressureOn?(.9+pressure*.1):1);
  if(preset==='calligraphy'){
   const angle=Math.atan2(dy,dx),tiltAngle=Math.atan2(pts[i].tiltY||0,pts[i].tiltX||0),nib=nibAngle;
   const effectiveNib=nib;
   w*=.16+1.58*Math.abs(Math.sin(angle-effectiveNib));
  }
    const r=Math.max(.12,w/2);left.push({x:pts[i].x+nx*r,y:pts[i].y+ny*r});right.push({x:pts[i].x-nx*r,y:pts[i].y-ny*r});
 }
 return{points:pts,left,right,single:false,rStart:Math.hypot(left[0].x-pts[0].x,left[0].y-pts[0].y),rEnd:Math.hypot(left.at(-1).x-pts.at(-1).x,left.at(-1).y-pts.at(-1).y),startAngle:Math.atan2(pts[1].y-pts[0].y,pts[1].x-pts[0].x),endAngle:Math.atan2(pts.at(-1).y-pts.at(-2).y,pts.at(-1).x-pts.at(-2).x)};
}
function traceSmoothEdge(ctx,edge){
 if(!edge?.length)return;ctx.moveTo(edge[0].x,edge[0].y);
 if(edge.length===2){ctx.lineTo(edge[1].x,edge[1].y);return;}
 for(let i=1;i<edge.length-1;i++){const p=edge[i],n=edge[i+1],mx=(p.x+n.x)/2,my=(p.y+n.y)/2;ctx.quadraticCurveTo(p.x,p.y,mx,my);}
 const last=edge[edge.length-1];ctx.lineTo(last.x,last.y);
}
function buildRibbonPath(ctx,ribbon){
 if(!ribbon)return; if(ribbon.single){ctx.beginPath();ctx.arc(ribbon.points[0].x,ribbon.points[0].y,ribbon.radius,0,Math.PI*2);return;}
 const {left,right,points,rStart,rEnd,startAngle,endAngle}=ribbon;if(left.length<2||right.length<2)return;
 ctx.beginPath();traceSmoothEdge(ctx,left);
 const end=points[points.length-1];ctx.arc(end.x,end.y,rEnd,endAngle+Math.PI/2,endAngle-Math.PI/2,true);
 traceSmoothEdge(ctx,right.slice().reverse());
 const start=points[0];ctx.arc(start.x,start.y,rStart,startAngle-Math.PI/2,startAngle+Math.PI/2,true);
 ctx.closePath();
}
function traceSmoothCenterline(ctx,points,offsetX=0,offsetY=0){
 const pts=resampleStroke(points);if(!pts.length)return;const at=p=>({x:p.x+offsetX,y:p.y+offsetY});
 ctx.beginPath();ctx.moveTo(pts[0].x+offsetX,pts[0].y+offsetY);
 if(pts.length===1){ctx.lineTo(pts[0].x+offsetX+.001,pts[0].y+offsetY);return;}
 if(pts.length===2){ctx.lineTo(pts[1].x+offsetX,pts[1].y+offsetY);return;}
 for(let i=1;i<pts.length-1;i++){const p=pts[i],n=pts[i+1];ctx.quadraticCurveTo(p.x+offsetX,p.y+offsetY,(p.x+n.x)/2+offsetX,(p.y+n.y)/2+offsetY);}
 const last=pts[pts.length-1];ctx.lineTo(last.x+offsetX,last.y+offsetY);
}
const brushTextureTiles=new Map();
function getBrushTextureTile(kind){
 if(brushTextureTiles.has(kind))return brushTextureTiles.get(kind);
 const c=document.createElement('canvas');c.width=c.height=128;const t=c.getContext('2d'),im=t.createImageData(128,128);
 // Smooth, tileable value-noise lattice. It creates continuous pigment/graphite variation,
 // never a field of little square or circular stamps.
 let seed=kind.split('').reduce((a,ch)=>Math.imul(a^ch.charCodeAt(0),16777619)>>>0,2166136261);
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const N=8,grid=Array.from({length:N*N},()=>rand()*2-1),fade=t=>t*t*(3-2*t);
 const at=(x,y)=>grid[((y%N+N)%N)*N+((x%N+N)%N)];
 const noise=(u,v)=>{const x=u*N,y=v*N,ix=Math.floor(x),iy=Math.floor(y),fx=fade(x-ix),fy=fade(y-iy);const a=at(ix,iy)*(1-fx)+at(ix+1,iy)*fx,b=at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx;return a*(1-fy)+b*fy;};
 const isFiber=['pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','dryBrush','bristleOil','mechanicalPencil','softPencil','charcoal','conte','oilPastel','fude','drySumi','textureBrush','softGraphite','hardGraphite','chalkDust','softCarbon','waxCrayon','graphitePowder','fanDryBrush','rakeBrush'].includes(kind);
 const isWash=['watercolor','watercolorBloom','granulating','roundWatercolor','flatWatercolor','inkWash','hakeBrush','mopBrush','blenderBrush'].includes(kind);
 const isPaint=['oil','bristleOil','acrylic','gouache','oilPastel','dryGouache','sableRound','flatSable','fanBrush','paletteKnife','textureMottler','filbertBrush','rakeBrush','daggerBrush','fanDryBrush','sumiWide'].includes(kind);
 const fiberPhase=rand()*Math.PI*2;
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const u=x/128,v=y/128,n0=noise(u,v),n1=noise((u+.173)%1,(v+.317)%1),n2=noise((u+.391)%1,(v+.071)%1);
  let n=.50+n0*.19+n1*.075+n2*.035;
  if(isFiber)n+=Math.sin(v*Math.PI*2*5+Math.sin(u*Math.PI*2*2+fiberPhase)*.6)*.055;
  if(isWash)n+=Math.sin(u*Math.PI*2*2+fiberPhase)*Math.cos(v*Math.PI*2*3-fiberPhase*.45)*.075;
  if(isPaint)n+=Math.sin(v*Math.PI*2*7+Math.sin(u*Math.PI*2)*.35)*.035;
  n=Math.max(0,Math.min(1,n));const i=(y*128+x)*4,shade=Math.round(214+n*38);
  im.data[i]=shade;im.data[i+1]=shade;im.data[i+2]=shade;im.data[i+3]=Math.round(170+n*70);
 }
 t.putImageData(im,0,0);brushTextureTiles.set(kind,c);return c;
}
function traceOffsetCenterline(ctx,points,offset){
 const pts=resampleStroke(points);if(!pts.length)return;
 const q=pts.map((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;return{x:p.x-dy/len*offset,y:p.y+dx/len*offset};});
 ctx.beginPath();ctx.moveTo(q[0].x,q[0].y);
 if(q.length===1){ctx.lineTo(q[0].x+.01,q[0].y);ctx.stroke();return;}
 for(let i=1;i<q.length-1;i++){const a=q[i],b=q[i+1];ctx.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);}
 ctx.lineTo(q[q.length-1].x,q[q.length-1].y);ctx.stroke();
}
function deterministicUnit(seed){const v=Math.sin(seed*12.9898+78.233)*43758.5453;return v-Math.floor(v)}
function traceBristleMicroPath(ctx,points,index,count,opts={}){
 // ribbonPolygon already resamples points. Reusing them avoids multiplying resampling work by hair count.
 const pts=Array.isArray(points)?points:[];if(!pts.length)return null;
 const spread=Math.max(0,Math.min(1,state.bristleSpread??.45)),splay=Math.max(0,Math.min(1,state.bristleSplay??.55)),clump=Math.max(0,Math.min(1,state.bristleClumping??.30)),curl=Math.max(0,Math.min(1,state.bristleCurl??.24)),lag=Math.max(0,Math.min(1,state.bristleLag??.22)),wave=Math.max(0,Math.min(1,state.bristleWaviness??.12)),lengthVar=Math.max(0,Math.min(1,state.bristleLengthVariation??.28)),drag=Math.max(0,Math.min(1,state.paintDrag??.32)),wet=Math.max(0,Math.min(1,state.bristleWetness??.58));
 const centre=count<=1?0:(index/(count-1)-.5)*2,seed=state.strokeSessionId*97.13+index*31.71,variation=(deterministicUnit(seed)-.5)*2,clusterId=Math.floor(index/3),cluster=(deterministicUnit(seed+clusterId*7.7)-.5)*2;
 const baseGap=state.size*(.018+spread*.205)*(opts.fan?1.45:1),lengthFactor=Math.max(.72,1+variation*lengthVar*.42),endIndex=Math.max(2,Math.min(pts.length,Math.round(pts.length*(.84+lengthFactor*.16)))),pointsOut=[];let arc=0;
 for(let i=0;i<endIndex;i++){
  const p=pts[i],prev=pts[Math.max(0,i-1)],next=pts[Math.min(endIndex-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,tx=dx/len,ty=dy/len,nx=-ty,ny=tx;
  if(i)arc+=Math.hypot(p.x-pts[i-1].x,p.y-pts[i-1].y);
  const pressure=(state.lastPointerType==='pen'&&$('pressureSize')?.checked)?pressureResponse(p.p??.65):.65,speed=Math.max(0,Math.min(1,p.v??0)),curvature=Math.abs((next.x-p.x)*(p.y-prev.y)-(next.y-p.y)*(p.x-prev.x))/(len*len+1e-5);
  // Higher pressure flattens/splays a real brush; moisture makes adjacent hairs cling together.
  const localSplay=1+pressure*splay*.65+speed*drag*.24+curvature*curl*.8;
  const wetClump=clump*(.55+wet*.9),grouped=centre*baseGap*localSplay+cluster*wetClump*baseGap*.16;
  const lagDist=lag*speed*state.size*.075+drag*speed*state.size*.035;
  const curlOffset=Math.sign(centre||1)*curvature*curl*state.size*.10;
  const wobble=Math.sin(arc/Math.max(2,state.size*.42)+seed*.31)*wave*state.size*.022*(1-wet*.22);
  const endFade=Math.min(1,(i+1)/Math.max(2,endIndex*.09),(endIndex-i)/Math.max(2,endIndex*.09));
  const off=grouped+curlOffset+wobble;
  const px=p.x+nx*off+tx*(-lagDist+centre*(lengthFactor-1)*state.size*.20);
  const py=p.y+ny*off+ty*(-lagDist+centre*(lengthFactor-1)*state.size*.20);
  pointsOut.push({x:px,y:py,fade:.28+.72*endFade,pressure,speed});
 }
 if(!pointsOut.length)return null;ctx.beginPath();ctx.moveTo(pointsOut[0].x,pointsOut[0].y);
 if(pointsOut.length===1)ctx.lineTo(pointsOut[0].x+.01,pointsOut[0].y);
 else for(let i=1;i<pointsOut.length-1;i++){const a=pointsOut[i],b=pointsOut[i+1];ctx.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2)}
 const last=pointsOut[pointsOut.length-1];ctx.lineTo(last.x,last.y);
 // Deliberately do not call stroke() here: caller applies per-hair color/width/alpha once.
 return{variation,centre,lengthFactor,points:pointsOut};
}
function varyBrushColor(hex,amount,index,count){if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;const t=(count<=1?0:index/(count-1)-.5)*amount,rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return'#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v+(t>=0?(255-v)*t*2:v*t*2)))).toString(16).padStart(2,'0')).join('')}
function rainbowRgb(hue){const h=((Number(hue)||0)%360+360)%360,s=1,l=.58,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return rgb.map(v=>Math.round((v+m)*255));}
function rgbCss(rgb){return`rgb(${rgb.map(v=>Math.max(0,Math.min(255,Math.round(v)))).join(' ')})`}
function sampleUnderpaintPalette(ctx,points,mode='along',sampleCount=11){
 try{
  if(!points?.length)return[];
  const matrix=ctx.getTransform?.(),direct=state.layers.some(layer=>layer.canvas===ctx.canvas),strokeLayer=state.layers.find(layer=>layer.id===state.strokeLayerId);
  const useVisibleStack=direct||!!strokeLayer;
  const visible=useVisibleStack?state.layers.filter(layer=>layer.visible&&layer.opacity>0):[];
  const scratch=visible.length?document.createElement('canvas'):null;
  if(scratch){scratch.width=1;scratch.height=1;}
  const scratchCtx=scratch?.getContext('2d',{willReadFrequently:true});
  const pointAt=(t)=>{
   if(mode==='horizontal'||mode==='vertical'){
    const key=mode==='horizontal'?'x':'y',values=points.map(p=>p[key]),target=Math.min(...values)+(Math.max(...values)-Math.min(...values))*t;
    let best=points[0],dist=Infinity;for(const q of points){const d=Math.abs(q[key]-target);if(d<dist){dist=d;best=q}}return best;
   }
   if(points.length===1)return points[0];
   const lengths=[];let total=0;for(let i=1;i<points.length;i++){const d=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);lengths.push(d);total+=d;}
   if(total<.001)return points[0];let remaining=total*t;for(let i=0;i<lengths.length;i++){const d=lengths[i];if(remaining<=d||i===lengths.length-1){const f=d>0?Math.max(0,Math.min(1,remaining/d)):0,a=points[i],b=points[i+1];return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}}remaining-=d;}return points[points.length-1];
  };
  const sampleComposite=(x,y)=>{
   if(!visible.length||!scratchCtx)return null;
   const sx=Math.max(0,Math.min(state.width-1,Math.floor(x))),sy=Math.max(0,Math.min(state.height-1,Math.floor(y)));
   scratchCtx.setTransform(1,0,0,1,0,0);scratchCtx.clearRect(0,0,1,1);
   if(state.paperTexture!=='none'){scratchCtx.fillStyle=paperBaseColor();scratchCtx.fillRect(0,0,1,1)}else if(state.bg==='white'){scratchCtx.fillStyle='#fff';scratchCtx.fillRect(0,0,1,1)}else if(state.bg==='dark'){scratchCtx.fillStyle='#444';scratchCtx.fillRect(0,0,1,1)}
   for(const layer of visible){const pixel=layer.canvas.getContext('2d',{willReadFrequently:true}).getImageData(sx,sy,1,1).data;if(pixel[3]===0)continue;scratchCtx.save();scratchCtx.globalAlpha=Math.max(0,Math.min(1,layer.opacity??1));scratchCtx.globalCompositeOperation=layer.blend||'source-over';scratchCtx.fillStyle=`rgba(${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3]/255})`;scratchCtx.fillRect(0,0,1,1);scratchCtx.restore();}
   const d=scratchCtx.getImageData(0,0,1,1).data;return d[3]>16?[d[0],d[1],d[2]]:null;
  };
  const rows=[],count=Math.max(3,Math.min(15,Math.round(sampleCount)));
  for(let i=0;i<count;i++){
   const t=i/(count-1),q=pointAt(t);let pixel=null;
   if(useVisibleStack&&visible.length)pixel=sampleComposite(q.x,q.y);
   if(!pixel){const sx=Math.round((matrix?.a??1)*q.x+(matrix?.c??0)*q.y+(matrix?.e??0)),sy=Math.round((matrix?.b??0)*q.x+(matrix?.d??1)*q.y+(matrix?.f??0));if(sx<0||sy<0||sx>=ctx.canvas.width||sy>=ctx.canvas.height)continue;const d=ctx.getImageData(sx,sy,1,1).data;if(d[3]>32)pixel=[d[0],d[1],d[2]];}
   if(pixel)rows.push({t,rgb:pixel});
  }
  return rows;
 }catch(_){return[]}
}
function sampleUnderpaintRgb(ctx,points,mode='along'){
 const palette=sampleUnderpaintPalette(ctx,points,mode,Math.min(11,Math.max(3,points.length)));
 if(!palette.length)return null;return[0,1,2].map(k=>palette.reduce((sum,row)=>sum+row.rgb[k],0)/palette.length);
}
function interpolateRainbowPickup(palette,t){
 if(!palette?.length)return null;if(palette.length===1)return palette[0].rgb;
 let right=palette.findIndex(row=>row.t>=t);if(right<0)return palette[palette.length-1].rgb;if(right===0)return palette[0].rgb;
 const a=palette[right-1],b=palette[right],f=(t-a.t)/Math.max(.0001,b.t-a.t);return[0,1,2].map(k=>a.rgb[k]+(b.rgb[k]-a.rgb[k])*f);
}
function rainbowStopColor(hue,pickupRgb=null,mix=0){const rgb=rainbowRgb(hue);if(pickupRgb&&mix>0)return rgbCss(rgb.map((v,i)=>v*(1-mix)+pickupRgb[i]*mix));return rgbCss(rgb)}
// Curved rainbow rendering: colour is interpolated by travelled stroke distance,
// not by the straight line joining the first and last pointer samples.
function paintRainbowAlongRibbon(ctx,ribbon,phase,cycles,palette,mix,reversePickup=false){
 const pts=ribbon?.points||[],left=ribbon?.left||[],right=ribbon?.right||[],last=pts.length-1;
 if(last<1||left.length!==pts.length||right.length!==pts.length)return false;
 const arc=new Float64Array(pts.length);let total=0;
 for(let i=1;i<pts.length;i++){total+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);arc[i]=total;}
 if(total<.25)return false;
 const colorAt=t=>{const f=Math.max(0,Math.min(1,t)),pickupT=reversePickup?1-f:f;return rainbowStopColor((phase+360*cycles*f)%360,palette?.length?interpolateRainbowPickup(palette,pickupT):null,mix)};
 ctx.save();buildRibbonPath(ctx,ribbon);ctx.clip();ctx.shadowBlur=0;
 // Base fill closes sub-pixel gaps; full-width segment strokes paint the moving spectrum.
 buildRibbonPath(ctx,ribbon);ctx.fillStyle=colorAt(.5);ctx.fill();
 ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=0;
 const stride=Math.max(1,Math.ceil(last/1200));
 for(let i=0;i<last;i+=stride){
  const j=Math.min(last,i+stride),a=pts[i],b=pts[j],length=Math.hypot(b.x-a.x,b.y-a.y);if(length<.08)continue;
  const gradient=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
  gradient.addColorStop(0,colorAt(arc[i]/total));gradient.addColorStop(1,colorAt(arc[j]/total));
  const wa=Math.hypot(left[i].x-right[i].x,left[i].y-right[i].y),wb=Math.hypot(left[j].x-right[j].x,left[j].y-right[j].y);
  ctx.strokeStyle=gradient;ctx.lineWidth=Math.max(.8,(wa+wb)*.54+1.1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 ctx.restore();return true;
}
function brushAlphaScale(preset){return({maru:.98,glass:.78,fountain:.86,mappingPen:1,liner:1,mechanicalPencil:.40,softPencil:.46,marker:.36,saji:.9,fude:.74,drySumi:.67,airbrush:.22,softAirbrush:.19,highlighter:.26,metalGold:.98,metalSilver:.98,metalCopper:.98,chrome:.98,sumi:.88,pencilHB:.36,pencilB:.43,pencil2B:.50,pencil4B:.59,coloredPencil:.58,mechanicalPencil:.32,softPencil:.42,charcoal:.55,conte:.58,oilPastel:.62,watercolor:.50,roundWatercolor:.48,flatWatercolor:.46,gouache:.84,fude:.72,drySumi:.66,textureBrush:.55,watercolorBloom:.44,dryGouache:.78,sableRound:.72,flatSable:.72,fanBrush:.66,paletteKnife:.88,stippling:.58,splatter:.56,inkWash:.38,softGraphite:.40,hardGraphite:.50,chalkDust:.58,textureMottler:.62,grainMarker:.40,dryMarker:.42,wetMarker:.34,granulating:.54,acrylic:.82,oil:.78,bristleOil:.72,filbertBrush:.72,hakeBrush:.42,mopBrush:.38,rakeBrush:.58,daggerBrush:.72,blenderBrush:.38,fanDryBrush:.52,softCarbon:.42,waxCrayon:.62,graphitePowder:.38,sumiWide:.68,chalk:.62,crayon:.66,dryBrush:.58,pastel:.54,gpen:1,millipen:1,neon:1,neonPink:1,neonCyan:1,neonLime:1,rainbow:1})[preset]??1;}
function drawSmoothStroke(ctx,points,preview=false){
 if(!points?.length)return;const preset=state.brushPreset,eraser=state.tool==='eraser';
 const originalColor=eraser?'#ffffff':state.color;
 const isRainbow=preset==='rainbow'&&!eraser;
 const rainbowMode=['along','horizontal','vertical'].includes(state.rainbowDirection)?state.rainbowDirection:'along';
 const rainbowCycles=Math.max(.5,Math.min(10,Number(state.rainbowCycles)||2.5));
 const rainbowMix=Math.max(0,Math.min(.85,Number(state.rainbowMix)||0));
 const rainbowPhase=((Number(state.rainbowPhase)||0)%360+360)%360;
 const rainbowReverse=!!state.rainbowReverse;
 const rainbowSignedCycles=rainbowCycles*(rainbowReverse?-1:1);
 const rainbowPalette=isRainbow&&state.rainbowColorPickup!==false&&rainbowMix>.001?sampleUnderpaintPalette(ctx,points,rainbowMode,11):[];
 const rainbowPickup=rainbowPalette.length?interpolateRainbowPickup(rainbowPalette,.5):null;
 const rainbowPickupAt=t=>rainbowPalette.length?interpolateRainbowPickup(rainbowPalette,rainbowReverse?1-t:t):rainbowPickup;
 let color=preset==='neonPink'?'#ff38c8':preset==='neonCyan'?'#30eaff':preset==='neonLime'?'#a8ff36':originalColor;
 if(isRainbow){const first=points[0],hue=rainbowMode==='horizontal'?(first.x/Math.max(1,state.width))*360*rainbowSignedCycles+rainbowPhase:rainbowMode==='vertical'?(first.y/Math.max(1,state.height))*360*rainbowSignedCycles+rainbowPhase:((first.x*.19+first.y*.11+rainbowPhase)%360+360)%360;color=rainbowStopColor(hue,rainbowPickup,rainbowMix);}
 // Sample the pre-stroke underpainting for traditional paint media. The rainbow
 // brush uses the same safe sampler above, but blends the sample into every hue stop
 // so its gradient remains visible instead of collapsing to one picked colour.
 if(!eraser&&!isRainbow&&state.colorPickup>.01&&['oil','bristleOil','acrylic','gouache','dryGouache','oilPastel','paletteKnife'].includes(preset)){
  try{const picked=sampleUnderpaintRgb(ctx,points,'along');if(picked&&/^#[0-9a-f]{6}$/i.test(color)){const base=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),amount=Math.max(0,Math.min(.72,state.colorPickup*.72)),mixed=base.map((v,k)=>Math.round(v*(1-amount)+picked[k]*amount));color='#'+mixed.map(v=>v.toString(16).padStart(2,'0')).join('')}}catch(_){/* Cross-origin/tainted canvases safely fall back to the selected color. */}
 }
 const ribbon=ribbonPolygon(points,state.size);if(!ribbon)return;
 if(ribbon.single){const q=ribbon.points[0],pressure=$('pressureSize')?.checked&&state.lastPointerType==='pen'?pressureResponse(q.p??1):1,rr=Math.max(.12,state.size*pressure/2);ctx.save();ctx.globalCompositeOperation=eraser?'destination-out':(['marker','highlighter','sumi','pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','watercolor','granulating','chalk','crayon','pastel','charcoal','conte','oilPastel','roundWatercolor','flatWatercolor'].includes(preset)?'multiply':'source-over');ctx.globalAlpha=eraser?Math.max(0,Math.min(1,state.eraserOpacity??1))*(state.eraserPressureOpacity&&state.lastPointerType==='pen'?pressure:1):state.opacity*state.brushFlow*brushAlphaScale(preset);ctx.fillStyle=eraser?'#000000':color;ctx.shadowBlur=eraser&&state.eraserMode==='soft'?Math.max(0,state.size*(1-(state.eraserHardness??1))*.20):(preset==='rainbow'?Math.max(1,state.size*.22):0);ctx.shadowColor=preset==='rainbow'?'#ff62d8':'#000000';ctx.beginPath();ctx.arc(q.x,q.y,rr,0,Math.PI*2);ctx.fill();ctx.restore();return;}
 const all=[...ribbon.left,...ribbon.right];let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const q of all){minX=Math.min(minX,q.x);minY=Math.min(minY,q.y);maxX=Math.max(maxX,q.x);maxY=Math.max(maxY,q.y);}
 const texture=['pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','watercolor','granulating','chalk','crayon','dryBrush','oil','bristleOil','pastel','acrylic','sumi','mechanicalPencil','softPencil','charcoal','conte','oilPastel','roundWatercolor','flatWatercolor','gouache','fude','drySumi','textureBrush','dryGouache','sableRound','flatSable','fanBrush','paletteKnife','stippling','splatter','inkWash','softGraphite','hardGraphite','chalkDust','textureMottler','grainMarker','dryMarker','wetMarker','watercolorBloom','filbertBrush','hakeBrush','mopBrush','rakeBrush','daggerBrush','blenderBrush','fanDryBrush','softCarbon','waxCrayon','graphitePowder','sumiWide'].includes(preset);
 const meanVelocity=ribbon.points.reduce((n,p)=>n+(p.v||0),0)/ribbon.points.length;
 let alpha=eraser?Math.max(0,Math.min(1,state.eraserOpacity??1)):state.opacity*state.brushFlow*brushAlphaScale(preset)*(1-meanVelocity*(state.velocityOpacity||0)*.32);
 if(!eraser){alpha*=.62+.38*Math.max(0,Math.min(1,state.pigmentLoad??1));
  const reservoir=Math.max(0,Math.min(1,state.pigmentReservoir??.78)),depletion=Math.max(0,Math.min(1,state.pigmentDepletion??.25));alpha*=Math.max(.38,1-depletion*(1-reservoir)*.72);alpha*=1-(Math.max(0,Math.min(1,state.strokeDrying??.32))*.08);
  const wetMedia=['watercolor','watercolorBloom','granulating','roundWatercolor','flatWatercolor','inkWash','wetMarker'].includes(preset);
  const oilMedia=['oil','bristleOil','acrylic','gouache','dryGouache','oilPastel','paletteKnife'].includes(preset);
  if(wetMedia)alpha*=.70+.30*Math.max(0,Math.min(1,state.wetMix??.42));
  if(oilMedia)alpha*=.82+.18*Math.max(0,Math.min(1,state.colorPickup??.28));
  if(state.pressureOpacity&&state.lastPointerType==='pen'){const avg=ribbon.points.reduce((n,q)=>n+pressureResponse(q.p??1),0)/ribbon.points.length;alpha*=Math.max(.08,Math.pow(avg,.75));}
 } else if(state.eraserPressureOpacity&&state.lastPointerType==='pen'){const avg=ribbon.points.reduce((n,q)=>n+pressureResponse(q.p??1),0)/ribbon.points.length;alpha*=Math.max(.02,avg);}
 const autoComp=(state.paintBlendMode&&state.paintBlendMode!=='auto')?state.paintBlendMode:(['marker','highlighter','sumi','inkWash','pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','watercolor','watercolorBloom','granulating','chalk','chalkDust','crayon','pastel','charcoal','conte','oilPastel','roundWatercolor','flatWatercolor','grainMarker','wetMarker'].includes(preset)?'multiply':'source-over');
 const comp=eraser?'destination-out':autoComp;ctx.save();ctx.globalCompositeOperation=comp;ctx.globalAlpha=Math.max(0,Math.min(1,alpha));ctx.lineJoin='round';ctx.lineCap='round';
 const g=ctx.createLinearGradient(minX,minY,maxX||minX+1,maxY||minY+1);
 if(preset==='metalGold'){['#432507','#96600c','#f0c95d','#fff5cf','#d89a25','#734406'].forEach((c,i)=>g.addColorStop(i/5,c));ctx.fillStyle=g;}
 else if(preset==='metalSilver'||preset==='chrome'){['#273341','#8190a1','#ffffff','#c7d2dc','#647487','#263340'].forEach((c,i)=>g.addColorStop(i/5,c));ctx.fillStyle=g;}
 else if(preset==='metalCopper'){['#482013','#a34e2d','#ffd0a0','#d77b4f','#6e2d1a'].forEach((c,i)=>g.addColorStop(i/4,c));ctx.fillStyle=g;}
 else if(isRainbow&&rainbowMode!=='along'){
  let x1,y1,x2,y2;
  if(rainbowMode==='horizontal'){x1=minX-state.size*.08;x2=Math.max(x1+1,maxX+state.size*.08);y1=y2=(minY+maxY)/2;}
  else{y1=minY-state.size*.08;y2=Math.max(y1+1,maxY+state.size*.08);x1=x2=(minX+maxX)/2;}
  const rg=ctx.createLinearGradient(x1,y1,x2,y2),steps=Math.max(36,Math.min(240,Math.ceil(rainbowCycles*48)));
   for(let i=0;i<=steps;i++){const t=i/steps,hue=rainbowPhase+360*rainbowSignedCycles*t,pickup=rainbowPickupAt(t);rg.addColorStop(t,rainbowStopColor(hue,pickup,rainbowMix));}
  ctx.fillStyle=rg;
 }
 else {ctx.fillStyle=color;}
 if(eraser){ctx.fillStyle='#000000';ctx.shadowColor='#000000';ctx.shadowBlur=state.eraserMode==='soft'?Math.max(0,state.size*(1-(state.eraserHardness??1))*.20):0;}
 if(!eraser&&['watercolor','watercolorBloom','roundWatercolor','flatWatercolor','inkWash','airbrush','softAirbrush','pastel','chalk','oil'].includes(preset)){ctx.shadowColor=color;const baseBlur=preset==='airbrush'?.72:preset==='softAirbrush'?.92:(['watercolor','watercolorBloom','roundWatercolor','flatWatercolor','inkWash'].includes(preset))?.08+(state.wetEdge||0)*.12+(state.wetBleed??.24)*.22+(state.strokeWetness??.55)*.08+(state.wetMix??.42)*.045+(state.wetEdgeSpread??.42)*.07-(state.strokeDrying??.32)*.045:preset==='oil'?.025:.055;ctx.shadowBlur=Math.max(.15,state.size*(baseBlur+(state.edgeSoftness||0)*.16));}
 if(!eraser&&['neon','neonPink','neonCyan','neonLime'].includes(preset)){ctx.shadowColor=color;ctx.shadowBlur=Math.max(1,state.size*1.15);}
 if(!eraser&&preset==='rainbow'){ctx.shadowColor='#ed58e6';ctx.shadowBlur=Math.max(1,state.size*.32);}
 let rainbowAlongPainted=false;
 if(isRainbow&&rainbowMode==='along'){
   const first=points[0],phase=((first.x*.19+first.y*.11+rainbowPhase)%360+360)%360;
   rainbowAlongPainted=paintRainbowAlongRibbon(ctx,ribbon,phase,rainbowSignedCycles,rainbowPalette,rainbowMix,rainbowReverse);
 }
 if(!rainbowAlongPainted){buildRibbonPath(ctx,ribbon);ctx.fill();}
 ctx.shadowBlur=0;
 // Continuous material texture is clipped to one ribbon. No point or square stamps.
 if(texture&&!eraser&&state.textureDetail>.005){
  ctx.save();buildRibbonPath(ctx,ribbon);ctx.clip();const tile=getBrushTextureTile(preset),pattern=ctx.createPattern(tile,'repeat');
  if(pattern?.setTransform&&window.DOMMatrix){const scale=Math.max(.35,Math.min(3,state.textureScale||1));pattern.setTransform(new DOMMatrix().scale(scale));}
  ctx.globalCompositeOperation='multiply';const paperFactor=.25+.75*(state.paperInteraction||0),strength=({pencilHB:.22,pencilB:.25,pencil2B:.29,pencil4B:.32,coloredPencil:.34,watercolor:.30,granulating:.34,chalk:.24,crayon:.22,dryBrush:.30,oil:.20,bristleOil:.24,pastel:.25,acrylic:.16,sumi:.15})[preset]||.18;
  ctx.globalAlpha=Math.min(.32,state.textureDetail*strength*paperFactor*(.35+.65*(state.paperStrength||0))*(.5+(state.textureContrast??.55))*(.45+(state.pigmentGranulation??.35)*.8)*(1+(state.edgeRoughness??.2)*.45)*(1+(state.edgeBreakup??.18)*.7));ctx.fillStyle=pattern||'#f3f0e8';ctx.fillRect(minX-4,minY-4,Math.max(1,maxX-minX+8),Math.max(1,maxY-minY+8));
  // Fine, continuous graphite/fibre ridges give pencils and dry brushes a directional tooth.
  if(['pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','dryBrush'].includes(preset)){
   const count=preset==='coloredPencil'?4:3;ctx.globalCompositeOperation='multiply';ctx.strokeStyle=preset==='coloredPencil'?color:'#403c36';ctx.lineCap='round';
   for(let k=0;k<count;k++){const off=(k-(count-1)/2)*state.size*.16;ctx.globalAlpha=state.textureDetail*paperFactor*(preset==='coloredPencil'?.075:.052);ctx.lineWidth=Math.max(.18,state.size*.014);traceOffsetCenterline(ctx,ribbon.points,off);}
  }
  ctx.restore();
 }
 // New natural-media tips: directional bristle/fibre marks remain clipped to the same
 // stroke body, so their texture does not flicker or spill outside the painted silhouette.
 if(['fude','drySumi','textureBrush','flatWatercolor','gouache','oilPastel','charcoal','conte','sableRound','flatSable','fanBrush','paletteKnife','dryGouache','textureMottler','filbertBrush','hakeBrush','mopBrush','rakeBrush','daggerBrush','blenderBrush','fanDryBrush','softCarbon','waxCrayon','graphitePowder','sumiWide'].includes(preset)&&!eraser){
  ctx.save();buildRibbonPath(ctx,ribbon);ctx.clip();
  const baseCount=Math.max(1,Math.min(30,Math.round(state.bristleCount??9))),density=Math.max(.35,Math.min(1.8,state.bristleDensity??1)),count=Math.max(1,Math.min(42,Math.round(baseCount*density))),stiff=Math.max(0,Math.min(1,state.bristleStiffness??.6)),thickness=Math.max(0,Math.min(1,state.paintThickness??.45)),wetness=Math.max(0,Math.min(1,state.bristleWetness??.58)),opacityVar=Math.max(0,Math.min(1,state.bristleOpacityVariation??.22)),widthVar=Math.max(0,Math.min(1,state.bristleWidthVariation??.24)),isDry=['charcoal','conte','softCarbon','waxCrayon','graphitePowder','fanDryBrush'].includes(preset),isFan=['fanBrush','fanDryBrush','rakeBrush'].includes(preset);
  for(let k=0;k<count;k++){
   traceBristleMicroPath(ctx,ribbon.points,k,count,{fan:isFan});
   const hairNoise=deterministicUnit(state.strokeSessionId*13+k*5.7),hairWidth=Math.max(.18,state.size*(preset==='textureBrush'?.025:.012+.014*stiff)*(1+(hairNoise-.5)*widthVar*.8));
   ctx.globalCompositeOperation=isDry?'multiply':'source-over';ctx.globalAlpha=Math.min(.24,alpha*(.018+thickness*.052)*(0.50+stiff*.62)*(0.52+wetness*.48)*(1+(hairNoise-.5)*opacityVar*.7));
   ctx.strokeStyle=isDry?(preset==='charcoal'||preset==='graphitePowder'?'#292725':preset==='conte'?'#54463b':color):varyBrushColor(color,Math.max(0,Math.min(.7,state.bristleColorVariation??.18)),k,count);
   ctx.lineWidth=hairWidth;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  }
  ctx.restore();
 }
 // Marker nibs leave a subtle continuous darker edge band, like overlapped alcohol ink.
 if(preset==='marker'&&!eraser){ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=Math.min(.12,alpha*.20);ctx.strokeStyle=color;ctx.lineWidth=Math.max(.3,state.size*.035);buildRibbonPath(ctx,ribbon);ctx.stroke();ctx.restore();}
 // Wet edge is an outline bloom, not a dotted pigment stamp.
 if(['watercolor','watercolorBloom','granulating','roundWatercolor','flatWatercolor','inkWash'].includes(preset)&&!eraser&&(state.wetEdge||0)>.01){
  ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=Math.min(.28,(state.wetEdge||0)*alpha*(.20+(state.edgePooling??.28)*.42));ctx.strokeStyle=color;ctx.lineWidth=Math.max(.35,state.size*(.055+(state.wetEdgeSpread??.42)*.055));ctx.shadowColor=color;ctx.shadowBlur=state.size*(.025+(state.wetEdgeSpread??.42)*.055);buildRibbonPath(ctx,ribbon);ctx.stroke();ctx.restore();
 }
 // Continuous neon core follows one smoothed centerline.
 if(['neon','neonPink','neonCyan','neonLime'].includes(preset)&&!eraser){ctx.save();traceSmoothCenterline(ctx,ribbon.points);ctx.globalCompositeOperation='source-over';ctx.strokeStyle='#fff';ctx.globalAlpha=Math.min(.95,alpha*.72);ctx.lineWidth=Math.max(.45,state.size*.12);ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#fff';ctx.shadowBlur=state.size*.12;ctx.stroke();ctx.restore();}
 // Metallic inks receive a single continuous specular ribbon, not separate short segments.
 if(['metalGold','metalSilver','metalCopper','chrome'].includes(preset)&&!eraser){ctx.save();traceSmoothCenterline(ctx,ribbon.points,-state.size*.11,-state.size*.1);ctx.globalAlpha=Math.min(.5,alpha*.33);ctx.strokeStyle='#fffdf1';ctx.lineWidth=Math.max(.45,state.size*.065);ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#fff';ctx.shadowBlur=state.size*.04;ctx.stroke();ctx.restore();}
 // Bristle media use a few long continuous hair ridges clipped to the paint body.
 if(['acrylic','oil','bristleOil'].includes(preset)&&!eraser){ctx.save();buildRibbonPath(ctx,ribbon);ctx.clip();const pts=ribbon.points;ctx.globalCompositeOperation='screen';for(let k=-2;k<=2;k++){const off=k*state.size*(.055+(state.paintDrag??.32)*.05);traceSmoothCenterline(ctx,pts,-off*.22,off);ctx.globalAlpha=Math.min(.14,alpha*.16);ctx.strokeStyle=k===0?'#fff4d6':'#ffffff';ctx.lineWidth=Math.max(.25,state.size*.018);ctx.lineCap='round';ctx.stroke();}ctx.restore();}
 // Glass and fountain inks have a restrained continuous highlight.
 if(['glass','fountain'].includes(preset)&&!eraser){ctx.save();traceSmoothCenterline(ctx,ribbon.points,-state.size*.09,-state.size*.07);ctx.globalAlpha=Math.min(.28,alpha*.22);ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(.25,state.size*.035);ctx.lineCap='round';ctx.shadowBlur=0;ctx.stroke();ctx.restore();}
 ctx.restore();
}
function symmetryStrokePaths(points){
 if(!points?.length)return[];
 if(state.symmetry==='none')return[points];
 const transforms=symmetryPoints(points[0]);
 return transforms.map((_,i)=>points.map(p=>{
  if(state.symmetry==='vertical')return{x:state.width-p.x,y:p.y,p:p.p,v:p.v,tiltX:-(p.tiltX||0),tiltY:p.tiltY,time:p.time};
  if(state.symmetry==='horizontal')return{x:p.x,y:state.height-p.y,p:p.p,v:p.v,tiltX:p.tiltX,tiltY:-(p.tiltY||0),time:p.time};
  if(state.symmetry==='quad')return i===0?{...p}:i===1?{x:state.width-p.x,y:p.y,p:p.p,v:p.v,tiltX:-(p.tiltX||0),tiltY:p.tiltY,time:p.time}:i===2?{x:p.x,y:state.height-p.y,p:p.p,v:p.v,tiltX:p.tiltX,tiltY:-(p.tiltY||0),time:p.time}:{x:state.width-p.x,y:state.height-p.y,p:p.p,v:p.v,tiltX:-(p.tiltX||0),tiltY:-(p.tiltY||0),time:p.time};
  if(state.symmetry==='radial'){const a=i*Math.PI/4,cx=state.width/2,cy=state.height/2,rx=p.x-cx,ry=p.y-cy;return{x:cx+rx*Math.cos(a)-ry*Math.sin(a),y:cy+rx*Math.sin(a)+ry*Math.cos(a),p:p.p,v:p.v,tiltX:p.tiltX,tiltY:p.tiltY,time:p.time};}
  return {...p};
 }));
}
function commitSmoothStroke(layer,points=state.strokePath){
 if(!layer||!points?.length)return;const ctx=layer.canvas.getContext('2d');
 // Preview and committed pixels must use the exact same decimated sample sequence.
 // Raw pressure/timing samples remain available in state.strokePath until commit.
 const renderPoints=points===state.strokePath?strokePreviewSamplePath(points):points;
 for(const path of symmetryStrokePaths(renderPoints))drawSmoothStroke(ctx,path,false);
}
function strokePreviewSamplePath(points){
 // Preview and commit share the same bounded resampling so the visible path does not
 // jump at pointer-up. The original raw samples remain available for editing/undo state.
 const mobile=isMobileLayout(),memory=Number(navigator.deviceMemory||4);
 const max=state.lowMemory?220:(mobile?(state.renderQuality==='fidelity'?780:memory<=3?300:430):(state.renderQuality==='fidelity'?2200:(state.renderQuality==='performance'?900:1600)));
 if(!points||points.length<=max)return points||[];
 const stride=Math.ceil((points.length-1)/(max-1)),out=[];
 for(let i=0;i<points.length;i+=stride)out.push(points[i]);
 if(out[out.length-1]!==points[points.length-1])out.push(points[points.length-1]);
 return out;
}
function buildViewportStrokePreview(layer,points){
 // Bounded to the visible display bitmap rather than the full document bounds.
 // This avoids huge off-screen preview canvases on phones while keeping erasing,
 // opacity, pigment texture and the final stroke on the same raster path.
 if(!display.width||!display.height||display.width*display.height>12000000)return null;
 const canvas=state.strokePreviewCanvas||(state.strokePreviewCanvas=document.createElement('canvas'));
 if(canvas.width!==display.width)canvas.width=display.width;
 if(canvas.height!==display.height)canvas.height=display.height;
 const ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)return null;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
 const dpr=displayDpr();ctx.setTransform(dpr*state.zoom,0,0,dpr*state.zoom,dpr*state.panX,dpr*state.panY);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality=state.renderQuality==='fidelity'?'high':'medium';
 ctx.drawImage(layer.canvas,0,0);
 commitSmoothStroke({canvas},points);
 state.strokePreviewFallback=false;
 return{canvas,bounds:{x:0,y:0,w:state.width,h:state.height},screenSpace:true};
}
function buildStrokePreviewPatch(layer){
 if(!layer||!state.pointerDown||!state.strokeIsSmooth||!state.strokePath?.length)return null;
 if(state.strokePreviewStickyFallback)return null;
 const last=state.strokePath[state.strokePath.length-1],cacheKey=[state.strokeSessionId,state.strokePathRevision,layer.id,display.width,display.height,state.zoom,state.panX,state.panY,state.size,state.opacity,state.hardness,state.color,state.brushPreset,state.brushTipShape,state.brushAspect,state.brushAngle,state.brushFlow,state.bristleCount,state.bristleSpread,state.bristleStiffness,state.paintThickness,state.pigment,state.pigmentLoad,state.pigmentGranulation,state.edgeRoughness,state.tipRotationJitter,state.stampSpacingFine,state.textureContrast,state.colorPickup,state.rainbowDirection,state.rainbowCycles,state.rainbowMix,state.rainbowColorPickup,state.rainbowPhase,state.rainbowReverse,state.wetMix,state.paperTexture,state.paperStrength,state.paperInteraction,state.textureDetail,state.textureScale,state.edgeSoftness,state.velocitySize,state.velocityOpacity,state.pressureOpacity,state.strokeTaper,state.taperStart,state.taperEnd,state.wetEdge,state.paperFiberDirection,state.paperGrainScale,state.paperSurfaceRelief,state.paperTooth,state.paperFiberDensity,state.paperFiberLength,state.paperWarp,state.paperNoise,state.paperTemperature,state.paperBrightness,state.paperPorosity,state.canvasWeave,state.paperBleed,state.paintBlendMode,state.wetBleed,state.edgePooling,state.strokeWetness,state.pressureWidthGain,state.tiltWidthGain,state.nibFollow,state.nibAngleMode,state.strokeWidthNoise,state.strokeWidthWave,state.strokeTaperPower,state.bristleSplay,state.bristleLengthVariation,state.bristleClumping,state.bristleCurl,state.bristleLag,state.bristleWaviness,state.bristleWidthVariation,state.bristleOpacityVariation,state.bristleDensity,state.bristleWetness,state.bristleColorVariation,state.paintDrag,state.pigmentReservoir,state.pigmentDepletion,state.strokeDrying,state.wetEdgeSpread,state.colorPickupRadius,state.edgeBreakup,state.eraserOpacity,state.eraserHardness,state.eraserMode,state.eraserPressureOpacity,state.symmetry,state.renderQuality,state.lowMemory,last?.x,last?.y,last?.p].join('|');
 if(cacheKey===state.strokePreviewCacheKey)return state.strokePreviewCacheResult;
 if(state.strokePreviewMode!=='accurate'&&state.tool!=='eraser'){state.strokePreviewFallback=true;state.strokePreviewStickyFallback=true;state.strokePreviewCacheKey=cacheKey;state.strokePreviewCacheResult=null;return null;}
 try{
  const previewPoints=strokePreviewSamplePath(state.strokePath);
  // Most strokes use a document-resolution patch. Oversized strokes on any device
  // use a screen-bounded compositor so live preview memory follows the viewport,
  // not the entire document dimensions.
  const paths=symmetryStrokePaths(previewPoints);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const path of paths)for(const p of path){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)}
  const glowBrush=['rainbow','neon','neonPink','neonCyan','neonLime','airbrush','softAirbrush','watercolor','oil','pastel','chalk'].includes(state.brushPreset);
  const pad=Math.max(16,state.size*(glowBrush?4.6:3.0));
  const x0=Math.max(0,Math.floor((minX-pad)/TILE_SIZE)*TILE_SIZE),y0=Math.max(0,Math.floor((minY-pad)/TILE_SIZE)*TILE_SIZE);
  const x1=Math.min(state.width,Math.ceil((maxX+pad)/TILE_SIZE)*TILE_SIZE),y1=Math.min(state.height,Math.ceil((maxY+pad)/TILE_SIZE)*TILE_SIZE);
  const w=Math.max(1,x1-x0),h=Math.max(1,y1-y0),area=w*h;
  // Keep the accurate live compositor bounded on very long strokes and small-memory devices.
  const memory=Number(navigator.deviceMemory||4),previewBudget=state.lowMemory?650000:(memory<=3?1050000:(isMobileLayout()?1650000:2500000));if(area>previewBudget||w>4096||h>4096){
  const viewportPreview=buildViewportStrokePreview(layer,previewPoints);
  if(viewportPreview){state.strokePreviewCacheKey=cacheKey;state.strokePreviewCacheResult=viewportPreview;return viewportPreview;}
  state.strokePreviewFallback=true;state.strokePreviewStickyFallback=true;state.strokePreviewCacheKey=cacheKey;state.strokePreviewCacheResult=null;return null;
 }
  const canvas=state.strokePreviewCanvas||(state.strokePreviewCanvas=document.createElement('canvas'));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;state.strokePreviewBounds={x:x0,y:y0,w,h};}
  else state.strokePreviewBounds={x:x0,y:y0,w,h};
  const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.clearRect(0,0,w,h);
  ctx.drawImage(layer.canvas,x0,y0,w,h,0,0,w,h);
  ctx.save();ctx.translate(-x0,-y0);commitSmoothStroke({canvas},previewPoints);ctx.restore();
  state.strokePreviewFallback=false;const result={canvas,bounds:state.strokePreviewBounds};state.strokePreviewCacheKey=cacheKey;state.strokePreviewCacheResult=result;return result;
 }catch(err){state.strokePreviewFallback=true;state.strokePreviewStickyFallback=true;state.strokePreviewCacheKey=cacheKey;state.strokePreviewCacheResult=null;return null;}
}
function drawLayerWithStrokePreview(ctx,layer){
 const preview=buildStrokePreviewPatch(layer);if(!preview){ctx.drawImage(layer.canvas,0,0);return false;}
 if(preview.screenSpace){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(preview.canvas,0,0);ctx.restore();return true;}
 const b=preview.bounds,right=b.x+b.w,bottom=b.y+b.h;
 // Draw the original layer outside the live preview rectangle, then replace only that
 // rectangle with a fully composited copy. This keeps the preview at the correct layer
 // position and makes it pixel-identical to the committed stroke when the pointer lifts.
 ctx.save();ctx.beginPath();
 if(b.y>0)ctx.rect(0,0,state.width,b.y);
 if(bottom<state.height)ctx.rect(0,bottom,state.width,state.height-bottom);
 if(b.x>0&&b.h>0)ctx.rect(0,b.y,b.x,b.h);
 if(right<state.width&&b.h>0)ctx.rect(right,b.y,state.width-right,b.h);
 ctx.clip();ctx.drawImage(layer.canvas,0,0);ctx.restore();
 ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.w,b.h);ctx.clip();ctx.drawImage(preview.canvas,b.x,b.y);ctx.restore();
 return true;
}
function drawBrushSegment(a,b,pressure=1,tiltX=0,tiltY=0,control=null,pressureStart=pressure){
 const l=activeLayer();if(!l)return;rememberStrokeTiles(a,b,control);const ctx=l.canvas.getContext('2d'),preset=state.brushPreset;
 const isPen=state.lastPointerType==='pen',p0=Math.max(.02,Math.min(1,pressureStart||1)),p1=Math.max(.02,Math.min(1,pressure||1)),pAvg=(p0+p1)*.5;
 const hasPressure=$('pressureSize').checked&&isPen;const curvedPressure=hasPressure?Math.pow(pAvg,state.pressureCurve):1;const tilt=Math.min(1,Math.hypot(tiltX,tiltY)/90);const paper=getPaperResponse(),paperMix=Math.max(0,Math.min(1,state.paperInteraction*state.paperStrength)),computeQuality=(state.lowMemory||state.renderQuality==='performance')?.48:(state.renderQuality==='fidelity'?1:.82);
 let width=state.size*(hasPressure?Math.max(.035,curvedPressure):1),alpha=state.opacity*state.brushFlow,blur=0,composite='source-over';
 if(['pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','chalk','crayon','dryBrush','pastel','bristleOil','mechanicalPencil','softPencil','charcoal','conte','oilPastel','fude','drySumi','textureBrush'].includes(preset)){width*=1+paper.tooth*paperMix*.055;alpha*=1-paper.tooth*paperMix*.045;}
 if(['watercolor','granulating','roundWatercolor','flatWatercolor','oil','bristleOil','acrylic','gouache','oilPastel'].includes(preset)){alpha*=1+paper.absorb*paperMix*.075;blur+=width*paper.absorb*paperMix*.028;}
 if(['marker','highlighter','fountain','dip','sumi','mappingPen','liner','saji','fude'].includes(preset)){width*=1+paper.absorb*paperMix*.025;blur+=width*paper.absorb*paperMix*.012;}
 if(state.tiltEnabled&&isPen&&['pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','dryBrush','pastel','chalk','calligraphy','bristleOil'].includes(preset))width*=1+tilt*.55;
 alpha*=1-state.feelFriction*.05;
 if(state.pressureOpacity&&isPen)alpha*=Math.max(.08,Math.pow(pAvg,.75));
 const widths={maru:.42,millipen:.72,mappingPen:.78,liner:.5,mechanicalPencil:.68,softPencil:.92,saji:1.1,fude:1.48,drySumi:1.38,flatWatercolor:1.65,roundWatercolor:1.52,gouache:1.3,charcoal:1.34,conte:1.2,oilPastel:1.44,textureBrush:1.42,pencilHB:.72,pencilB:.9,pencil2B:1.05,pencil4B:1.25,coloredPencil:.9,watercolor:1.55,acrylic:1.22,glass:.62,marker:1.45,airbrush:1.75,pixel:1,chalk:1.15,crayon:1.1,brushPen:1.25,sumi:1.15,dip:.78,dryBrush:1.4,oil:1.6,pastel:1.35,highlighter:2.1,spray:2.2,neon:.85,rainbow:1.0,metalGold:1.0,metalSilver:1.0,metalCopper:1.0,chrome:1.0,neonPink:.9,neonCyan:.9,neonLime:.9,glitter:1.15,calligraphy:1.2,bristleOil:1.7,granulating:1.45,softAirbrush:2.0};width*=widths[preset]||1;
 if(['maru'].includes(preset))alpha*=.98;if(preset==='millipen')alpha=state.opacity*state.brushFlow;
 if(preset==='pencilHB')alpha*=.48;if(preset==='pencilB')alpha*=.58;if(preset==='pencil2B')alpha*=.68;if(preset==='pencil4B')alpha*=.78;if(preset==='coloredPencil')alpha*=.62;
 if(preset==='watercolor'){alpha*=.12+state.waterAmount*.25;blur=width*(.06+state.waterSpread*.42);composite='multiply'}
 if(preset==='acrylic')alpha*=.92;if(preset==='glass')alpha*=.72;
 if(preset==='fountain')width*=hasPressure?(.48+pAvg*1.15):.92;
 if(preset==='marker'){alpha*=.30;composite='multiply'}if(preset==='airbrush'||preset==='softAirbrush'){alpha*=preset==='airbrush'?.09+state.opacity*.10:.08+state.opacity*.08;blur=width*(preset==='airbrush'?.6:.78)}
 if(preset==='pixel')width=Math.max(1,Math.round(width));if(preset==='chalk')alpha*=.8;if(preset==='crayon')alpha*=.72;
 if(preset==='brushPen')width*=hasPressure?(.35+pAvg*1.55):1;if(preset==='sumi'){width*=hasPressure?(.55+pAvg*1.2):1;alpha*=.86;blur=width*.1;composite='multiply'}
 if(preset==='dip')width*=hasPressure?(.25+pAvg*1.75):1;if(preset==='dryBrush')alpha*=.56;if(preset==='oil'||preset==='bristleOil'){alpha*=.88;blur=width*.035}if(preset==='pastel')alpha*=.55;if(preset==='highlighter'){alpha*=.22;composite='multiply'}
 if(preset==='spray'){alpha*=.35;blur=width*.22}if(preset==='neon'||preset.startsWith('neon'))blur=width*.55;
 if(['metalGold','metalSilver','metalCopper','chrome'].includes(preset))alpha*=.98;if(preset==='calligraphy'){const strokeAngle=Math.atan2(b.y-a.y,b.x-a.x),nibAngle=state.brushAngle*Math.PI/180;width*=.18+1.55*Math.abs(Math.sin(strokeAngle-nibAngle));}
 if(state.brushJitter>0){const seed=Math.floor((a.x*73856093+a.y*19349663+b.x*83492791)>>>0),rand=stableRandom(seed),j=state.brushJitter*width*.22; a={x:a.x+(rand()-.5)*j,y:a.y+(rand()-.5)*j};b={x:b.x+(rand()-.5)*j,y:b.y+(rand()-.5)*j};if(control)control={x:control.x+(rand()-.5)*j,y:control.y+(rand()-.5)*j};}
 const pointsA=symmetryPoints(a),pointsB=symmetryPoints(b),pointsC=control?symmetryPoints(control):pointsA;
 ctx.save();ctx.globalCompositeOperation=state.tool==='eraser'?'destination-out':composite;ctx.globalAlpha=state.tool==='eraser'?Math.max(0,Math.min(1,state.eraserOpacity??1)):Math.max(0,Math.min(1,alpha));ctx.strokeStyle=state.tool==='eraser'?'#000000':state.color;ctx.fillStyle=state.tool==='eraser'?'#000000':state.color;ctx.lineCap=preset==='pixel'?'butt':preset==='calligraphy'?'square':'round';ctx.lineJoin='round';ctx.lineWidth=width;
 if(state.tool==='eraser'){ctx.shadowBlur=0}
 else if(['watercolor','airbrush','softAirbrush','spray'].includes(preset)){ctx.shadowColor=state.color;ctx.shadowBlur=blur}
 else if(!['pixel','millipen'].includes(preset)&&!['metalGold','metalSilver','metalCopper','chrome','neon','neonPink','neonCyan','neonLime','glitter'].includes(preset)){ctx.shadowColor=state.color;ctx.shadowBlur=(1-state.hardness)*width*.08+blur}
 for(let i=0;i<Math.min(pointsA.length,pointsB.length);i++){
  const p=pointsA[i],q=pointsB[i],c=pointsC[i]||p,len=Math.hypot(q.x-p.x,q.y-p.y),mid=control?curvePoint(p,c,q,.5):{x:(p.x+q.x)/2,y:(p.y+q.y)/2};
  if(['metalGold','metalSilver','metalCopper','chrome'].includes(preset)&&state.tool!=='eraser'){
   const ang=Math.atan2(q.y-p.y,q.x-p.x),nx=Math.cos(ang+Math.PI/2),ny=Math.sin(ang+Math.PI/2),g=ctx.createLinearGradient(mid.x-nx*width*.55,mid.y-ny*width*.55,mid.x+nx*width*.55,mid.y+ny*width*.55);
   const stops=preset==='metalGold'?['#4b2b08','#9f6410','#f5d36a','#fff5c5','#d89b25','#7b4a08','#3b2408']:preset==='metalSilver'?['#303945','#8e9aa8','#ffffff','#bcc8d4','#596879','#26313c']:preset==='metalCopper'?['#482013','#a34e2d','#ffd0a0','#d77b4f','#6e2d1a']:['#17212c','#74899c','#ffffff','#c5e5f7','#61798d','#101b29'];
   stops.forEach((c,j)=>g.addColorStop(j/(stops.length-1),c));ctx.strokeStyle=g;ctx.lineWidth=width;ctx.shadowColor=stops[Math.floor(stops.length/2)];ctx.shadowBlur=width*.045;traceBrushPath(ctx,p,q,control);
   ctx.save();ctx.globalAlpha*=.32;ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(.55,width*.10);ctx.shadowBlur=0;traceBrushPath(ctx,{x:p.x-nx*width*.18,y:p.y-ny*width*.18},{x:q.x-nx*width*.18,y:q.y-ny*width*.18},control?{x:c.x-nx*width*.18,y:c.y-ny*width*.18}:null);ctx.restore();
  }else if(['neon','neonPink','neonCyan','neonLime'].includes(preset)&&state.tool!=='eraser'){
   const neonColor=preset==='neonPink'?'#ff38c8':preset==='neonCyan'?'#30eaff':preset==='neonLime'?'#a8ff36':state.color;ctx.strokeStyle=neonColor;ctx.globalAlpha=Math.min(1,alpha*.72);ctx.lineWidth=width*1.8;ctx.shadowColor=neonColor;ctx.shadowBlur=width*1.9;traceBrushPath(ctx,p,q,control);ctx.globalAlpha=Math.min(1,alpha);ctx.lineWidth=width*.62;ctx.shadowBlur=width*.55;traceBrushPath(ctx,p,q,control);ctx.strokeStyle='#ffffff';ctx.globalAlpha=Math.min(.92,alpha*.78);ctx.lineWidth=Math.max(.55,width*.13);ctx.shadowBlur=0;traceBrushPath(ctx,p,q,control);
  }else{
   if(['metalGold','metalSilver','metalCopper','chrome','neon','neonPink','neonCyan','neonLime','glitter'].includes(preset))ctx.strokeStyle=state.color;
   traceBrushPath(ctx,p,q,control);
   if(['pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','chalk','crayon','dryBrush','pastel','oil','watercolor','granulating'].includes(preset)&&state.pigment>.04){
    const paper=getPaperResponse(),paperMix=state.paperStrength*state.paperInteraction,grain=Math.max(.02,Math.min(1,state.pigment*(['watercolor','granulating'].includes(preset)?.46:.58)+(paper.tooth*.72+paper.fiber*.28)*paperMix*state.textureDetail*.72)),spacing=Math.max(1.25,width*(Number($('spacing').value||20)/100)),n=Math.min(96,Math.floor(len/spacing*(.55+grain*1.4)*computeQuality));const seed=Math.floor((p.x*73856093+p.y*19349663+q.x*83492791)>>>0),rand=stableRandom(seed);ctx.save();ctx.globalAlpha=alpha*grain*(preset==='watercolor'||preset==='granulating'?.44:.28);ctx.fillStyle=preset==='chalk'?'#e8e2d4':state.color;
    for(let j=0;j<n;j++){const t=Math.max(0,Math.min(1,(j+.5+(rand()-.5)*.34)/n)),pos=control?curvePoint(p,c,q,t):{x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t},r=Math.max(.22,width*(.006+grain*.012+rand()*.006)),jitter=width*(.006+grain*.052),jx=(rand()-.5)*jitter,jy=(rand()-.5)*jitter,ang=state.brushAngle*Math.PI/180;ctx.fillRect(pos.x+jx*Math.cos(ang)-jy*Math.sin(ang),pos.y+jx*Math.sin(ang)+jy*Math.cos(ang),r,r)}ctx.restore();
   }
   if(['acrylic','oil','bristleOil'].includes(preset)){ctx.save();ctx.globalAlpha=alpha*(preset==='oil'||preset==='bristleOil'?.24:.18);ctx.lineWidth=Math.max(.5,width*.07);for(let z=0;z<5;z++){const off=(z-2)*width*.12,ang=Math.atan2(q.y-p.y,q.x-p.x)+Math.PI/2,ox=Math.cos(ang)*off,oy=Math.sin(ang)*off;traceBrushPath(ctx,{x:p.x+ox,y:p.y+oy},{x:q.x+ox,y:q.y+oy},control?{x:c.x+ox,y:c.y+oy}:null)}ctx.restore()}
   if(preset==='glass'||preset==='fountain'){ctx.save();ctx.globalAlpha=alpha*.24;ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(.5,width*.16);ctx.shadowBlur=0;traceBrushPath(ctx,{x:p.x-width*.08,y:p.y-width*.08},{x:q.x-width*.08,y:q.y-width*.08},control?{x:c.x-width*.08,y:c.y-width*.08}:null);ctx.restore()}
   if(preset==='watercolor'&&state.edgeDarkening>.01){ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=state.edgeDarkening*.16;ctx.strokeStyle=state.color;ctx.lineWidth=Math.max(.6,width*.14);ctx.shadowBlur=width*.08;traceBrushPath(ctx,p,q,control);ctx.restore()}
   if(preset==='spray'||preset==='glitter'){ctx.save();const rand=stableRandom(Math.floor((p.x*73856093+p.y*19349663+q.x*83492791)>>>0)),count=Math.min(80,Math.ceil((len/2+10)*computeQuality));ctx.globalAlpha=alpha*(preset==='glitter'?.8:.5);ctx.fillStyle=preset==='glitter'?'#fff2a8':state.color;for(let j=0;j<count;j++){const t=rand(),pos=control?curvePoint(p,c,q,t):{x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t},ang=rand()*Math.PI*2+state.brushAngle*Math.PI/180,rad=rand()*width*(preset==='glitter'?.85:.65),r=preset==='glitter'?.6+rand()*1.8:Math.max(.5,width*.018);ctx.fillRect(pos.x+Math.cos(ang)*rad,pos.y+Math.sin(ang)*rad,r,r)}ctx.restore()}
  }
  if(len<.01&&!control){ctx.beginPath();ctx.arc(p.x,p.y,width/2,0,Math.PI*2);ctx.fill()}
 }
 ctx.restore();
}
function captureLayerImage(layer){return layer.canvas.getContext('2d').getImageData(0,0,state.width,state.height)}
function pushHistory(entry){state.history.push(entry);state.redo=[];trimHistory();updateUndoButtons();markDirty()}
function doUndo(){const h=state.history.pop();if(!h)return;if(h.type==='pixels'){const l=state.layers.find(x=>x.id===h.layerId);if(l)l.canvas.getContext('2d').putImageData(h.before,0,0)}else if(h.type==='pixelsRegion'){const l=state.layers.find(x=>x.id===h.layerId);if(l)l.canvas.getContext('2d').putImageData(h.before,h.x,h.y)}else if(h.type==='tiles'){const l=state.layers.find(x=>x.id===h.layerId);if(l)applyTileHistory(l,h.before)}else if(h.type==='layers'){restoreLayerSnapshot(h.before)}state.redo.push(h);trimHistory();renderLayers();updateUI();markDirty();updateUndoButtons();setStatus('元に戻しました')}
function doRedo(){const h=state.redo.pop();if(!h)return;if(h.type==='pixels'){const l=state.layers.find(x=>x.id===h.layerId);if(l)l.canvas.getContext('2d').putImageData(h.after,0,0)}else if(h.type==='pixelsRegion'){const l=state.layers.find(x=>x.id===h.layerId);if(l)l.canvas.getContext('2d').putImageData(h.after,h.x,h.y)}else if(h.type==='tiles'){const l=state.layers.find(x=>x.id===h.layerId);if(l)applyTileHistory(l,h.after)}else if(h.type==='layers'){restoreLayerSnapshot(h.after)}state.history.push(h);trimHistory();renderLayers();updateUI();markDirty();updateUndoButtons();setStatus('やり直しました')}
function layerSnapshot(){return{activeId:state.activeId,layers:state.layers.map(l=>({id:l.id,name:l.name,visible:l.visible,opacity:l.opacity,blend:l.blend,image:l.canvas.getContext('2d').getImageData(0,0,state.width,state.height),textData:l.textData?{...l.textData}:null}))}}
function restoreLayerSnapshot(s){state.layers=s.layers.map(x=>{const l=newLayer(x.name);l.id=x.id;l.visible=x.visible;l.opacity=x.opacity;l.blend=x.blend;l.textData=x.textData?{...x.textData}:null;l.canvas.getContext('2d').putImageData(x.image,0,0);return l});state.activeId=s.activeId;nextLayerId=Math.max(nextLayerId,1,...state.layers.map(x=>x.id+1))}
function layerAction(fn){const before=layerSnapshot();fn();const after=layerSnapshot();pushHistory({type:'layers',before,after});renderLayers();updateUI();markDirty()}
function updateUndoButtons(){$('undoBtn').disabled=!state.history.length;$('redoBtn').disabled=!state.redo.length}
function updateZoom(){$('zoomText').textContent=Math.round(state.zoom*100)+'%'}
function updateUI(){const rainbowPanel=$('rainbowSettingsPanel');if(rainbowPanel)rainbowPanel.hidden=state.brushPreset!=='rainbow';const l=activeLayer();$('layerCount').textContent=state.layers.length+' layer'+(state.layers.length===1?'':'s');$('layersList').innerHTML='';[...state.layers].reverse().forEach(layer=>{const item=document.createElement('div');item.className='layer'+(layer.id===state.activeId?' active':'');item.dataset.layerId=String(layer.id);const eye=document.createElement('button');eye.className='eye';eye.textContent=layer.visible?'◉':'○';eye.title='表示/非表示';eye.onclick=e=>{e.stopPropagation();layerAction(()=>{if(e.altKey){const alreadySolo=layer.visible&&state.layers.every(x=>x===layer||!x.visible);state.layers.forEach(x=>x.visible=alreadySolo?true:x===layer)}else layer.visible=!layer.visible})};const thumb=document.createElement('div');thumb.className='thumb';const tc=document.createElement('canvas');tc.width=70;tc.height=54;tc.getContext('2d').drawImage(layer.canvas,0,0,70,54);thumb.appendChild(tc);const name=document.createElement('div');name.className='layername';name.textContent=layer.name;name.title='ダブルクリックで名前変更';name.ondblclick=()=>{const n=prompt('レイヤー名',layer.name);if(n){layerAction(()=>layer.name=n)}};const quick=document.createElement('button');quick.className='eye';quick.textContent='⧉';quick.title='レイヤー複製 · Ctrl+J';quick.onclick=e=>{e.stopPropagation();state.activeId=layer.id;duplicateLayer()};const rename=document.createElement('button');rename.className='eye';rename.textContent='✎';rename.title='レイヤー名を変更';rename.onclick=e=>{e.stopPropagation();const n=prompt('レイヤー名',layer.name);if(n)layerAction(()=>layer.name=n)};item.append(eye,thumb,name,quick,rename);item.onclick=()=>{state.activeId=layer.id;if(state.tool==='transform'||state.tool==='move')state.transformBounds=findAlphaBounds(layer);updateUI();renderLayers()};item.oncontextmenu=e=>{e.preventDefault();state.activeId=layer.id;updateUI();const choice=prompt('レイヤー操作: 1=複製 2=名前変更 3=削除 4=上へ 5=下へ');if(choice==='1')duplicateLayer();else if(choice==='2'){const n=prompt('レイヤー名',layer.name);if(n)layerAction(()=>layer.name=n)}else if(choice==='3')deleteLayer();else if(choice==='4')moveLayer(1);else if(choice==='5')moveLayer(-1)};$('layersList').appendChild(item)});
  if(l){$('layerOpacity').value=Math.round(l.opacity*100);$('layerOpacityValue').textContent=Math.round(l.opacity*100)+'%';$('blendMode').value=l.blend}
  $('docName').textContent=state.projectName+' · '+state.width+' × '+state.height;$('docSizeText').textContent=state.width+' × '+state.height+' px';$('gridToggle').checked=state.grid;stage.style.backgroundImage=state.grid?'radial-gradient(#293342 0.7px,transparent .7px)':'none';$('backgroundMode').value=state.bg;if($('paperTexture'))$('paperTexture').value=state.paperTexture;if($('paperStrength')){$('paperStrength').value=Math.round(state.paperStrength*100);$('paperStrengthValue').textContent=Math.round(state.paperStrength*100)+'%'}if($('paperFiberDirection')){$('paperFiberDirection').value=state.paperFiberDirection||0;$('paperFiberDirectionValue').textContent=(state.paperFiberDirection||0)+'°'}if($('paperGrainScale')){$('paperGrainScale').value=Math.round((state.paperGrainScale||1)*100);$('paperGrainScaleValue').textContent=(state.paperGrainScale||1).toFixed(2)+'×'}if($('paperSurfaceRelief')){$('paperSurfaceRelief').value=Math.round((state.paperSurfaceRelief??.55)*100);$('paperSurfaceReliefValue').textContent=Math.round((state.paperSurfaceRelief??.55)*100)+'%'}if($('touchPalmRejection'))$('touchPalmRejection').checked=state.touchPalmRejection!==false;if($('brushPreset'))$('brushPreset').value=state.brushPreset;if($('traceVisible'))$('traceVisible').checked=!state.reference||state.reference.visible;if($('traceOpacity')&&state.reference){$('traceOpacity').value=Math.round(state.reference.opacity*100);$('traceOpacityValue').textContent=Math.round(state.reference.opacity*100)+'%';$('traceScale').value=Math.round((state.reference.scale||1)*100);$('traceScaleValue').textContent=Math.round((state.reference.scale||1)*100)+'%';$('traceX').value=state.reference.x||0;$('traceXValue').textContent=state.reference.x||0;$('traceY').value=state.reference.y||0;$('traceYValue').textContent=state.reference.y||0}if($('documentDpi'))$('documentDpi').value=state.dpi||300;syncEraserSettingsUI();updateUndoButtons();}
function setColor(v){if(!/^#[0-9a-f]{6}$/i.test(v))return;state.color=v.toLowerCase();$('colorPicker').value=state.color;$('hexColor').value=state.color.toUpperCase();const chip=$('mobileColor');if(chip){chip.style.setProperty('--pf-current-color',state.color);chip.title='現在色 '+state.color.toUpperCase();chip.setAttribute('aria-label','現在色 '+state.color.toUpperCase())}schedulePersistentEditorPreferenceSave?.()}
function finishActiveBrushStroke(render=true){
 const layer=state.layers.find(x=>x.id===state.strokeLayerId)||activeLayer(),tool=state.strokeTool||state.pointerTool||state.tool;
 if(layer&&['brush','eraser','smudge'].includes(tool)){
  if(state.strokeIsSmooth)commitSmoothStroke(layer);else if(tool!=='smudge'&&!state.strokeIsPixel)flushBrushCurve();
  if(state.strokeTiles?.size){const entry=getStrokeTileAfter(layer);if(entry.before.length)pushHistory({type:'tiles',layerId:layer.id,before:entry.before,after:entry.after});}
 }
 state.strokeTiles=null;state.strokeLayerId=null;state.strokeTool=null;state.strokeLastSample=null;state.strokePath=[];state.strokeIsSmooth=false;state.strokeIsPixel=false;state.pixelLastCell=null;state.strokePreviewBounds=null;state.strokePreviewFallback=false;state.strokePreviewStickyFallback=false;state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;state.pointerDown=false;state.pointerTool=null;state.activePointerId=null;state.activePointerType=null;state.prevPoint=null;state.strokeCurvePrev=null;state.strokeCurveMid=null;state.filteredPoint=null;state.startPoint=null;state.lastPoint=null;
 if(render){renderLayers();ensureInitialFrame();markDirty();flushPendingDisplayResize();}
}
function syncEraserSettingsUI(){const values={eraserOpacity:Math.round((state.eraserOpacity??1)*100),eraserHardness:Math.round((state.eraserHardness??1)*100)};for(const [id,value] of Object.entries(values)){const el=$(id),out=$(id+'Value');if(el)el.value=String(value);if(out)out.textContent=value+'%'}const mode=$('eraserMode');if(mode)mode.value=state.eraserMode||'hard';const pressure=$('eraserPressureOpacity');if(pressure)pressure.checked=!!state.eraserPressureOpacity;}
function setEraserSettingsPanelOpen(){setTool('eraser');setSettingsPanelOpen(true);const panel=$('eraserSettingsPanel');if(panel){panel.classList.remove('folded');panel.querySelector('.panelhead')?.setAttribute('aria-expanded','true');requestAnimationFrame(()=>panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));}}
function applyEraserPreset(name){const presets={hard:{eraserOpacity:1,eraserHardness:1,eraserMode:'hard',eraserPressureOpacity:false},soft:{eraserOpacity:1,eraserHardness:.18,eraserMode:'soft',eraserPressureOpacity:false},pencil:{eraserOpacity:.72,eraserHardness:.62,eraserMode:'soft',eraserPressureOpacity:true},cleanup:{eraserOpacity:1,eraserHardness:.92,eraserMode:'hard',eraserPressureOpacity:false},detail:{eraserOpacity:1,eraserHardness:1,eraserMode:'hard',eraserPressureOpacity:true},gentle:{eraserOpacity:.35,eraserHardness:.35,eraserMode:'soft',eraserPressureOpacity:true},broad:{eraserOpacity:1,eraserHardness:.42,eraserMode:'soft',eraserPressureOpacity:false}};const preset=presets[name];if(!preset)return;Object.assign(state,preset);syncEraserSettingsUI();state.strokePreviewCacheKey=null;state.strokePreviewStickyFallback=false;markDirty();requestRender();schedulePersistentEditorPreferenceSave?.();toast('消しゴム設定: '+({hard:'完全消去',soft:'ソフト',pencil:'鉛筆ラフ',cleanup:'仕上げ',detail:'細部',gentle:'やさしく',broad:'広範囲'}[name]||name));}
function clearActiveLayer(){const layer=activeLayer();if(!layer)return;const ctx=layer.canvas.getContext('2d'),tileSize=128,before=[],after=[];let bytes=0;for(let y=0;y<state.height;y+=tileSize){for(let x=0;x<state.width;x+=tileSize){const w=Math.min(tileSize,state.width-x),h=Math.min(tileSize,state.height-y),image=ctx.getImageData(x,y,w,h);let hasPixels=false;for(let i=3;i<image.data.length;i+=4){if(image.data[i]>0){hasPixels=true;break;}}if(!hasPixels)continue;const blank=ctx.createImageData(w,h);bytes+=image.data.byteLength+blank.data.byteLength;if(bytes>HISTORY_BUDGET*.82){toast('このレイヤーは大きいため、一括透明化の履歴を安全に保存できません。小さい範囲に分けて消去してください');return;}before.push({x,y,image});after.push({x,y,image:blank});}}if(!before.length){toast('このレイヤーはすでに空です');return;}for(const tile of after)ctx.putImageData(tile.image,tile.x,tile.y);pushHistory({type:'tiles',layerId:layer.id,before,after});renderLayers();updateUI();toast('選択レイヤーの画素を透明化しました · Ctrl+Zで復元できます');}
function setTool(tool){if(state.pointerDown){if(['brush','eraser','smudge'].includes(state.strokeTool||state.pointerTool||state.tool))finishActiveBrushStroke();else stagePointerUp({});}state.tool=tool;document.querySelectorAll('.tool[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));document.querySelectorAll('[data-mobile-tool]').forEach(b=>{const active=b.dataset.mobileTool===tool;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});setStatus((({brush:'ブラシ',eraser:'消しゴム',smudge:'指先・混色',line:'直線',rect:'四角形',ellipse:'楕円',triangle:'三角形',star:'星形',roundedRect:'角丸長方形',arrow:'矢印',polygon:'多角形',curve:'ベジェ曲線',fill:'塗りつぶし',eyedropper:'スポイト',hand:'手のひら',text:'テキスト配置',gradient:'グラデーション',move:'レイヤー移動',transform:'オブジェクト変形'})[tool]||'ツール')+' ツール');if(tool==='transform'||tool==='move'){state.transformBounds=findAlphaBounds(activeLayer());drawTransformOverlay(octx)}schedulePersistentEditorPreferenceSave?.()}
function mergeComposite(){const c=makeCanvas(),ctx=c.getContext('2d');drawDocumentBase(ctx,true);for(const l of state.layers){if(!l.visible)continue;ctx.save();ctx.globalAlpha=l.opacity;ctx.globalCompositeOperation=l.blend;ctx.drawImage(l.canvas,0,0);ctx.restore()}return c}
function pickColor(p){try{const c=mergeComposite(),x=Math.max(0,Math.min(state.width-1,Math.floor(p.x))),y=Math.max(0,Math.min(state.height-1,Math.floor(p.y))),d=c.getContext('2d',{willReadFrequently:true}).getImageData(x,y,1,1).data;setColor('#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join(''));setStatus('スポイト: '+state.color.toUpperCase());toast('色を取得しました · '+state.color.toUpperCase());}catch(err){console.warn('Eyedropper failed',err);toast('色を取得できませんでした。キャンバス内をタップしてください')}}
function hexToRgba(hex){return[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255]}
function drawSmudgeSegment(a,b,pressure=1){
 const layer=state.layers.find(l=>l.id===state.strokeLayerId)||activeLayer();if(!layer)return;
 rememberStrokeTiles(a,b);const ctx=layer.canvas.getContext('2d',{willReadFrequently:true});
 const radius=Math.max(2,state.size*.5),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<.35)return;
 const steps=Math.max(1,Math.min(16,Math.ceil(len/Math.max(2,radius*.42)))),strength=Math.max(.02,Math.min(.95,state.smudgeStrength*(state.lastPointerType==='pen'?Math.max(.1,pressure):1)));
 const useMerged=!!state.smudgeSampleMerged;
 try{
  for(let step=1;step<=steps;step++){
   const t=step/steps,cx=a.x+dx*t,cy=a.y+dy*t,rx=Math.ceil(radius+Math.abs(dx/len)*radius),ry=Math.ceil(radius+Math.abs(dy/len)*radius),x=Math.max(0,Math.floor(cx-rx)),y=Math.max(0,Math.floor(cy-ry)),w=Math.min(state.width-x,Math.ceil(2*rx)),h=Math.min(state.height-y,Math.ceil(2*ry));if(w<1||h<1)continue;
   const image=ctx.getImageData(x,y,w,h);let sourceData=image.data;
   if(useMerged){
    const scratch=document.createElement('canvas');scratch.width=w;scratch.height=h;const sourceCtx=scratch.getContext('2d',{willReadFrequently:true});
    sourceCtx.save();sourceCtx.translate(-x,-y);drawDocumentBase(sourceCtx,true);
    for(const visible of state.layers){if(!visible.visible||visible.opacity<=0)continue;sourceCtx.save();sourceCtx.globalAlpha=Math.max(0,Math.min(1,visible.opacity??1));sourceCtx.globalCompositeOperation=visible.blend||'source-over';sourceCtx.drawImage(visible.canvas,0,0);sourceCtx.restore();}
    sourceCtx.restore();sourceData=sourceCtx.getImageData(0,0,w,h).data;
   }
   const src=new Uint8ClampedArray(sourceData),shiftX=-(dx/len)*radius*.72,shiftY=-(dy/len)*radius*.72;
   for(let py=0;py<h;py++)for(let px=0;px<w;px++){
    const gx=x+px,gy=y+py,ox=gx-cx,oy=gy-cy,d=Math.hypot(ox,oy);if(d>radius)continue;
    const sx=Math.max(0,Math.min(w-1,Math.round(px+shiftX))),sy=Math.max(0,Math.min(h-1,Math.round(py+shiftY))),i=(py*w+px)*4,j=(sy*w+sx)*4,mix=strength*(1-d/radius)*.88;
    const da=src[i+3]/255,sa=src[j+3]/255,outA=da*(1-mix)+sa*mix;if(outA<=.001){image.data[i+3]=0;continue;}
    for(let c=0;c<3;c++)image.data[i+c]=(src[i+c]*da*(1-mix)+src[j+c]*sa*mix)/outA;
    image.data[i+3]=Math.round(outA*255);
   }
   ctx.putImageData(image,x,y);
  }
 }catch(error){console.warn('指先・混色を実行できませんでした',error);toast('指先混色に失敗しました。対象レイヤーとメモリを確認してください');}
}
function floodFill(p){const l=activeLayer();if(!l)return;const x=Math.floor(p.x),y=Math.floor(p.y);if(x<0||y<0||x>=state.width||y>=state.height)return;const ctx=l.canvas.getContext('2d'),img=ctx.getImageData(0,0,state.width,state.height),d=img.data,idx=(y*state.width+x)*4,target=[d[idx],d[idx+1],d[idx+2],d[idx+3]],fill=hexToRgba(state.color);if(target.every((v,i)=>v===fill[i]))return;const tol=state.fillTolerance,match=i=>Math.abs(d[i]-target[0])<=tol&&Math.abs(d[i+1]-target[1])<=tol&&Math.abs(d[i+2]-target[2])<=tol&&Math.abs(d[i+3]-target[3])<=tol;const stack=[x,y];let count=0;while(stack.length&&count<state.width*state.height){const sy=stack.pop(),sx=stack.pop();if(sx<0||sy<0||sx>=state.width||sy>=state.height)continue;let pos=(sy*state.width+sx)*4;if(!match(pos))continue;let left=sx;while(left>0&&match((sy*state.width+left-1)*4))left--;let spanUp=false,spanDown=false;for(let xx=left;xx<state.width&&match((sy*state.width+xx)*4);xx++){pos=(sy*state.width+xx)*4;d[pos]=fill[0];d[pos+1]=fill[1];d[pos+2]=fill[2];d[pos+3]=Math.round(255*state.opacity);count++;if(sy>0){const up=(sy-1)*state.width+xx;if(match(up*4)){if(!spanUp){stack.push(xx,sy-1);spanUp=true}}else spanUp=false}if(sy<state.height-1){const dn=(sy+1)*state.width+xx;if(match(dn*4)){if(!spanDown){stack.push(xx,sy+1);spanDown=true}}else spanDown=false}}}
  ctx.putImageData(img,0,0);renderLayers();setStatus('塗りつぶし: '+count.toLocaleString()+' px')}
function captureStagePointer(e){try{if(e?.pointerId!==undefined&&!display.hasPointerCapture?.(e.pointerId))display.setPointerCapture(e.pointerId)}catch(_){}}
function releaseStagePointer(e){try{if(e?.pointerId!==undefined&&display.hasPointerCapture?.(e.pointerId))display.releasePointerCapture(e.pointerId)}catch(_){}}
function pixelClampPoint(p){return{x:Math.max(0,Math.min(state.width-1,Math.floor(p.x))),y:Math.max(0,Math.min(state.height-1,Math.floor(p.y)))};}
function drawPixelStamp(layer,point,tool='brush',pressure=1){
 if(!layer)return;const ctx=layer.canvas.getContext('2d');if(!ctx)return;
 const pen=state.lastPointerType==='pen'&&$('pressureSize')?.checked;
 const n=Math.max(1,Math.min(32,Math.round((Number(state.size)||1)*(pen?Math.max(.08,pressure):1))));
 const base=pixelClampPoint(point),left=Math.floor(base.x-(n-1)/2),top=Math.floor(base.y-(n-1)/2);
 const points=symmetryPoints({x:left+(n-1)/2,y:top+(n-1)/2});
 ctx.save();ctx.globalCompositeOperation=tool==='eraser'?'destination-out':'source-over';ctx.globalAlpha=tool==='eraser'?Math.max(0,Math.min(1,state.eraserOpacity??1)):Math.max(0,Math.min(1,(state.opacity??1)*(state.brushFlow??1)));ctx.fillStyle=tool==='eraser'?'#000000':state.color;
 for(const p of points){const x=Math.round(p.x-(n-1)/2),y=Math.round(p.y-(n-1)/2);ctx.fillRect(x,y,n,n)}ctx.restore();
}
function drawPixelLine(layer,a,b,tool='brush',pressure=1){
 if(!layer)return;let x0=Math.floor(a.x),y0=Math.floor(a.y),x1=Math.floor(b.x),y1=Math.floor(b.y);
 const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy,guard=0;
 while(guard++<Math.max(state.width,state.height,Math.abs(x1-x0)+Math.abs(y1-y0)+2)){drawPixelStamp(layer,{x:x0,y:y0},tool,pressure);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy}}
}
function drawPixelShape(ctx,tool,a,b,fill=false){
 const x0=Math.floor(Math.min(a.x,b.x)),y0=Math.floor(Math.min(a.y,b.y)),x1=Math.floor(Math.max(a.x,b.x)),y1=Math.floor(Math.max(a.y,b.y));
 const plotted=new Set(),plot=(x,y)=>{x=Math.floor(x);y=Math.floor(y);const key=x+','+y;if(plotted.has(key))return;plotted.add(key);ctx.fillRect(x,y,1,1)};
 const line=(xA,yA,xB,yB)=>{let x=xA,y=yA,dx=Math.abs(xB-xA),sx=xA<xB?1:-1,dy=-Math.abs(yB-yA),sy=yA<yB?1:-1,err=dx+dy,guard=0;while(guard++<Math.max(state.width,state.height,dx-dy+2)){plot(x,y);if(x===xB&&y===yB)break;const e=2*err;if(e>=dy){err+=dy;x+=sx}if(e<=dx){err+=dx;y+=sy}}};
 if(tool==='line'){line(Math.floor(a.x),Math.floor(a.y),Math.floor(b.x),Math.floor(b.y));return}
 if(tool==='rect'){if(fill){ctx.fillRect(x0,y0,x1-x0+1,y1-y0+1);return}for(let x=x0;x<=x1;x++){plot(x,y0);if(y1!==y0)plot(x,y1)}for(let y=y0+1;y<y1;y++){plot(x0,y);if(x1!==x0)plot(x1,y)}return}
 if(tool==='ellipse'){const rx=Math.max(.5,(x1-x0)/2),ry=Math.max(.5,(y1-y0)/2),cx=(x0+x1)/2,cy=(y0+y1)/2;if(fill){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const dx=(x-cx)/rx,dy=(y-cy)/ry;if(dx*dx+dy*dy<=1)plot(x,y)}return}const steps=Math.max(16,Math.ceil(2*Math.PI*Math.max(rx,ry)*2));let prev=null;for(let i=0;i<=steps;i++){const t=i/steps*Math.PI*2,p={x:Math.round(cx+Math.cos(t)*rx),y:Math.round(cy+Math.sin(t)*ry)};if(prev)line(prev.x,prev.y,p.x,p.y);else plot(p.x,p.y);prev=p}return}
}
function drawPixelGridOverlay(ctx){
 if(document.documentElement.dataset.pfPixelGrid==='0'||!isPixelWorkspace())return;
 const z=state.zoom||1,step=z>=5?1:z>=2.2?2:z>=1.1?8:16;
 const left=Math.max(0,Math.floor((-state.panX/z)/step)*step),top=Math.max(0,Math.floor((-state.panY/z)/step)*step);
 const right=Math.min(state.width,Math.ceil((stage.clientWidth-state.panX)/z)),bottom=Math.min(state.height,Math.ceil((stage.clientHeight-state.panY)/z));
 if(right<=left||bottom<=top)return;ctx.save();ctx.lineWidth=1/z;ctx.strokeStyle=step===1?'rgba(42,60,82,.42)':'rgba(68,96,126,.3)';ctx.beginPath();
 for(let x=left;x<=right;x+=step){ctx.moveTo(x,top);ctx.lineTo(x,bottom)}for(let y=top;y<=bottom;y+=step){ctx.moveTo(left,y);ctx.lineTo(right,y)}ctx.stroke();
 if(step>1){ctx.strokeStyle='rgba(113,178,135,.65)';ctx.lineWidth=1.5/z;ctx.strokeRect(0,0,state.width,state.height)}ctx.restore();
}
function stagePointerDown(e){
 if(state.operationLocked||state.animationPlaying)return;
 const type=e.pointerType||'mouse';
 if(type==='mouse'&&performance.now()<state.suppressMouseUntil)return;
 if((type==='touch'||type==='pen')&&e.cancelable)e.preventDefault();
 // A stylus takes priority over palm/finger contacts. Touch may still be used alone.
 if(type==='touch'&&state.touchPalmRejection){if(state.pointerDown&&state.activePointerType==='pen')return;if(state.lastPenClientPoint&&performance.now()-state.lastPenAt<650&&Math.hypot(e.clientX-state.lastPenClientPoint.x,e.clientY-state.lastPenClientPoint.y)<(state.palmRejectionRadius||24))return;}
 if(type==='pen'&&state.pointerDown&&state.activePointerType==='touch'){
  const near=state.touchPalmRejection&&state.touchStartClientPoint&&Math.hypot(e.clientX-state.touchStartClientPoint.x,e.clientY-state.touchStartClientPoint.y)<(state.palmRejectionRadius||24);
  if(near&&state.strokeIsSmooth){state.pointerDown=false;state.strokePath=[];state.strokeTiles=null;state.strokeLayerId=null;state.strokeTool=null;state.strokeIsSmooth=false;state.strokeIsPixel=false;state.pixelLastCell=null;state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;state.strokePreviewStickyFallback=false;state.activePointerId=null;state.activePointerType=null;renderLayers();}else finishActiveBrushStroke();state.gesturePointers.clear();state.gesturePinch=null;
 }
 if(type==='touch'){
  state.suppressMouseUntil=performance.now()+700;
  captureStagePointer(e);
  state.gesturePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(state.gesturePointers.size>=2){state.panning=false;
   if(state.pointerDown){
    if(['brush','eraser','smudge'].includes(state.strokeTool||state.pointerTool||state.tool))finishActiveBrushStroke();
    else stagePointerUp({pointerId:state.activePointerId,pointerType:state.activePointerType});
   }
   const pts=[...state.gesturePointers.values()].slice(0,2),mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
   state.gesturePinch={dist:Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)),mid};
   state.activePointerId=null;state.activePointerType=null;state.pointerDown=false;state.panning=false;
   requestRender();return;
  }
  const tapTool=['eyedropper','fill','text'].includes(state.tool);
  if(state.touchDrawMode==='stylus'&&!tapTool&&state.tool!=='hand'){state.activePointerId=null;state.activePointerType=null;return;}
  if(state.touchDrawMode==='pan'&&!tapTool&&state.gesturePointers.size===1){state.panning=true;state.panStart={x:e.clientX,y:e.clientY,px:state.panX,py:state.panY};state.activePointerId=e.pointerId;state.activePointerType='touch';return;}
 }else if(state.pointerDown&&state.activePointerId!==null&&state.activePointerId!==e.pointerId){
  // Ignore secondary mouse/pen contacts instead of corrupting the active stroke.
  return;
 }
 if(e.button!==0&&type!=='pen'&&type!=='touch')return;
 const p=docPoint(e);state.lastPointerType=type;if(type==='pen'){state.lastPenClientPoint={x:e.clientX,y:e.clientY};state.lastPenAt=performance.now()}if(type==='touch')state.touchStartClientPoint={x:e.clientX,y:e.clientY};updateDeviceInfo(e);
 if(state.space||state.tool==='hand'||e.button===1){state.panning=true;state.panStart={x:e.clientX,y:e.clientY,px:state.panX,py:state.panY};state.activePointerId=e.pointerId;state.activePointerType=type;captureStagePointer(e);return;}
 if(!insideDoc(p))return;
 if(state.tool==='eyedropper'){pickColor(p);return}if(state.tool==='text'){placeTextAt(p);return}if(state.tool==='fill'){runFloodFill(p);return}
 if(state.tool==='transform'){
  let layer=findLayerAtPoint(p)||activeLayer();if(!layer)return;if(layer.id!==state.activeId){state.activeId=layer.id;state.transformBounds=findAlphaBounds(layer);updateUI()}else state.transformBounds=state.transformBounds||findAlphaBounds(layer);
  const mode=hitTransformHandle(p,state.transformBounds)||(findLayerAtPoint(p)?'move':null);if(!mode)return;
  state.transforming=true;state.transformMode=mode;state.transformBefore=captureLayerImage(layer);state.transformSource=cloneLayerCanvas(layer);
  const b=state.transformBounds,cx=b.x+b.w/2,cy=b.y+b.h/2;state.transformBase={cx,cy,start:p,angle:Math.atan2(p.y-cy,p.x-cx),distance:Math.max(1,Math.hypot(p.x-cx,p.y-cy)),dx:0,dy:0,rotation:0,scaleX:1,scaleY:1};
  state.pointerDown=true;state.pointerTool=state.tool;state.startPoint=p;state.lastPoint=p;state.activePointerId=e.pointerId;state.activePointerType=type;captureStagePointer(e);renderLayers();return;
 }
 if(state.tool==='hand')return;let layer=activeLayer();if(!layer)return;
 if(state.tool==='move'){
  const hit=findLayerAtPoint(p);if(hit&&hit.id!==state.activeId){state.activeId=hit.id;layer=hit;updateUI()}
  state.transformBounds=findAlphaBounds(layer);state.pointerDown=true;state.pointerTool=state.tool;state.startPoint=p;state.lastPoint=p;state.moveBefore=captureLayerImage(layer);state.moveSnapshot=makeCanvas();state.moveSnapshot.getContext('2d').drawImage(layer.canvas,0,0);
  state.activePointerId=e.pointerId;state.activePointerType=type;captureStagePointer(e);return;
 }
 state.pointerDown=true;state.pointerTool=state.tool;state.startPoint=p;state.lastPoint=p;state.filteredPoint=p;state.activePointerId=e.pointerId;state.activePointerType=type;captureStagePointer(e);
 if(['brush','eraser','smudge'].includes(state.tool)){
  state.strokeTiles=new Map();state.strokeSessionId++;state.strokePathRevision=0;state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;state.strokePreviewStickyFallback=false;state.strokePreviewFallback=false;state.strokeLayerId=layer.id;state.strokeTool=state.tool;state.strokeTileLimitHit=false;state.prevPoint=p;state.strokeCurvePrev=p;state.strokeCurveMid=p;
  const initialPressure=type==='pen'?normalizePenPressure(e.pressure):1;state.strokePrevPressure=initialPressure;state.strokeLastSample=p;state.strokeLastTime=performance.now();state.strokeIsPixel=isPixelDrawing()&&['brush','eraser'].includes(state.tool);state.pixelLastCell=p;state.strokeIsSmooth=!state.strokeIsPixel&&useSmoothStroke()&&state.tool!=='smudge';
  state.strokePath=state.strokeIsSmooth?[{x:p.x,y:p.y,p:initialPressure,tiltX:e.tiltX||0,tiltY:e.tiltY||0,time:performance.now()}]:[];
  if(state.strokeIsPixel){rememberStrokeTiles(p,p);drawPixelStamp(layer,p,state.tool,initialPressure);requestRender()}else if(state.strokeIsSmooth){rememberStrokeTiles(p,p);requestRender()}else if(state.tool==='smudge'){rememberStrokeTiles(p,p)}else{drawBrushSegment(p,p,e.pressure||1,e.tiltX||0,e.tiltY||0);requestRender()}
 }else if(state.tool==='gradient'||isShapeTool(state.tool)){state.strokeBefore=captureLayerImage(layer);drawOverlay()}else drawOverlay();
}
function normalizePenPressure(rawValue){
 const floor=Math.max(0,Math.min(.45,state.pressureFloor??.02));
 const ceiling=Math.max(floor+.1,Math.min(1,state.pressureCeiling??1));
 const raw=Number.isFinite(Number(rawValue))&&Number(rawValue)>0?Number(rawValue):floor;
 return Math.max(.015,Math.min(1,(Math.max(floor,Math.min(ceiling,raw))-floor)/Math.max(.1,ceiling-floor)));
}
function processBrushSamples(e){
 let samples=[];try{samples=e.getCoalescedEvents?.()||[e]}catch(_){samples=[e]}if(!samples.length)samples=[e];
 for(const sample of samples){
  const raw=docPoint(sample);if(!insideDoc(raw))continue;
  if(state.strokeIsPixel){const cell=pixelClampPoint(raw),last=state.pixelLastCell||state.strokeLastSample||state.startPoint;if(!last||cell.x!==last.x||cell.y!==last.y){rememberStrokeTiles(last||cell,cell);const pressure=(sample.pointerType||e.pointerType||state.lastPointerType)==='pen'?normalizePenPressure(sample.pressure??e.pressure):1;drawPixelLine(activeLayer(),last||cell,cell,state.strokeTool||state.tool,pressure);state.pixelLastCell=cell;state.strokeLastSample=cell;state.lastPoint=cell;state.filteredPoint=cell;state.strokePrevPressure=pressure;state.strokeLastTime=Number(sample.timeStamp)||performance.now();}continue;}
  const lastRaw=state.strokeLastSample||state.strokeCurvePrev||state.startPoint;
  const now=Number(sample.timeStamp)||performance.now(),elapsed=Math.max(1,now-(state.strokeLastTime||now));
  const travel=lastRaw?Math.hypot(raw.x-lastRaw.x,raw.y-lastRaw.y):0;
  const touchGap=(state.activePointerType==='touch'?Math.max(0,Math.min(1.5,state.touchMinDistance||0)):0);if(lastRaw&&travel<Math.max(.025,touchGap))continue;
  const velocity=Math.max(0,Math.min(1,travel/elapsed/1.8));
  const touchBlend=state.activePointerType==='touch'?(state.touchSmoothing||0):0;const smoothing=Math.max(.008,Math.min(.68,state.strokeSmoothing*.42+state.stabilizer*.12+state.feelSmoothing*.10+state.feelFriction*.035+(state.strokeStability||0)*.12+touchBlend*.16));
  let q=raw;if(state.filteredPoint){const k=Math.max(.24,1-smoothing*.68);q={x:state.filteredPoint.x+(raw.x-state.filteredPoint.x)*k,y:state.filteredPoint.y+(raw.y-state.filteredPoint.y)*k};}
  const isPen=(sample.pointerType||e.pointerType||state.lastPointerType)==='pen';const p=isPen?normalizePenPressure(sample.pressure??e.pressure):1;
  const prev=state.strokeCurvePrev||state.startPoint,from=state.strokeCurveMid||prev,mid={x:(prev.x+q.x)/2,y:(prev.y+q.y)/2};
  if(state.tool==='smudge'){drawSmudgeSegment(prev,q,p);state.strokeCurvePrev=q;state.strokeCurveMid=mid;state.strokePrevPressure=p;state.strokeLastSample=raw;state.filteredPoint=q;state.lastPoint=q;continue;}
  if(state.strokeIsSmooth){
   rememberStrokeTiles(prev,q);
   const lastStored=state.strokePath[state.strokePath.length-1];
   const storedDistance=lastStored?Math.hypot(q.x-lastStored.x,q.y-lastStored.y):Infinity;
   const pressureDelta=lastStored?Math.abs(p-(lastStored.p??1)):1;
   const minSampleGap=Math.max(.08,Math.min(1.2,state.size*.018/Math.max(.35,Math.min(2,state.strokeSampleDensity??1))));
   const pressureSmoothing=Math.max(0,Math.min(1,state.strokePressureSmoothing??.62));
   const pressureFollow=.9-pressureSmoothing*.75; // Higher stability = slower pressure changes.
   const stablePressure=state.strokePrevPressure+(p-state.strokePrevPressure)*pressureFollow;
   if(!lastStored||storedDistance>=minSampleGap||Math.abs(stablePressure-(lastStored.p??1))>=.012||now-(lastStored.time||0)>=24){
    state.strokePath.push({x:q.x,y:q.y,p:stablePressure,v:velocity,tiltX:sample.tiltX||0,tiltY:sample.tiltY||0,time:now});state.strokePathRevision++;state.strokePreviewCacheKey=null;
   }
   state.strokeCurvePrev=q;state.strokeCurveMid=mid;state.strokePrevPressure=stablePressure;state.strokeLastSample=raw;state.strokeLastTime=now;state.filteredPoint=q;state.lastPoint=q;continue;
  }
  const pressureFollow=.9-Math.max(0,Math.min(1,state.strokePressureSmoothing??.62))*.75;const filteredPressure=state.strokePrevPressure+(p-state.strokePrevPressure)*pressureFollow;
  drawBrushSegment(from,mid,(state.strokePrevPressure+filteredPressure)/2,sample.tiltX||0,sample.tiltY||0,prev,state.strokePrevPressure);
  state.strokeCurvePrev=q;state.strokeCurveMid=mid;state.strokePrevPressure=filteredPressure;state.strokeLastSample=raw;state.strokeLastTime=now;state.filteredPoint=q;state.lastPoint=q;
 }
 state.prevPoint=state.strokeCurvePrev||state.prevPoint;
}
function flushBrushCurve(){if(!state.strokeCurvePrev||!state.strokeCurveMid)return;const p=state.strokeCurvePrev,m=state.strokeCurveMid;if(Math.hypot(p.x-m.x,p.y-m.y)>.01)drawBrushSegment(m,p,state.strokePrevPressure,0,0,p,state.strokePrevPressure);state.strokeCurvePrev=null;state.strokeCurveMid=null}
function stagePointerMove(e){
 if(state.operationLocked)return;
 if(e.pointerType==='touch'&&state.gesturePointers.has(e.pointerId)){
  state.gesturePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(state.gesturePinch&&state.gesturePointers.size>=2){
   if(e.cancelable)e.preventDefault();const pts=[...state.gesturePointers.values()].slice(0,2),mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},dist=Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y));
   const r=stage.getBoundingClientRect();zoomAt(dist/state.gesturePinch.dist,state.gesturePinch.mid.x-r.left,state.gesturePinch.mid.y-r.top);
   state.panX+=mid.x-state.gesturePinch.mid.x;state.panY+=mid.y-state.gesturePinch.mid.y;state.gesturePinch={dist,mid};requestRender();return;
  }
  // A remaining finger after a pinch does not unexpectedly resume drawing.
  if(!state.pointerDown||state.activePointerId!==e.pointerId)return;
 }
 if(state.pointerDown&&state.activePointerId!==null&&e.pointerId!==undefined&&state.activePointerId!==e.pointerId)return;
 if(e.pointerType==='pen'){state.lastPenClientPoint={x:e.clientX,y:e.clientY};state.lastPenAt=performance.now()}const p=docPoint(e);$('coordsText').textContent='X: '+Math.round(p.x)+'　Y: '+Math.round(p.y);
 if(state.panning&&state.panStart){state.panX=state.panStart.px+(e.clientX-state.panStart.x);state.panY=state.panStart.py+(e.clientY-state.panStart.y);requestRender();return;}
 if(!state.pointerDown)return;
 if(state.transforming&&state.transformBase&&state.transformSource){
  const b=state.transformBase;let dx=0,dy=0,angle=0,scaleX=1,scaleY=1;
  if(state.transformMode==='move'){dx=p.x-b.start.x;dy=p.y-b.start.y;}else if(state.transformMode==='rotate'){angle=Math.atan2(p.y-b.cy,p.x-b.cx)-b.angle;}else if(state.transformMode.startsWith('scale-')){const sx0=b.start.x-b.cx,sy0=b.start.y-b.cy;scaleX=Math.max(.03,Math.min(20,Math.abs(sx0)>1?(p.x-b.cx)/sx0:1));scaleY=Math.max(.03,Math.min(20,Math.abs(sy0)>1?(p.y-b.cy)/sy0:1));if(e.shiftKey){const u=Math.max(scaleX,scaleY);scaleX=u;scaleY=u;}}
  renderLayerTransform(activeLayer(),state.transformSource,b,dx,dy,angle,scaleX,scaleY);b.dx=dx;b.dy=dy;b.rotation=angle;b.scaleX=scaleX;b.scaleY=scaleY;$('objectRotation').value=Math.round(angle*180/Math.PI);$('objectRotationValue').textContent=Math.round(angle*180/Math.PI)+'°';$('objectScale').value=Math.max(10,Math.min(400,Math.round(Math.max(scaleX,scaleY)*100)));$('objectScaleValue').textContent=Math.round(scaleX*100)+'% × '+Math.round(scaleY*100)+'%';$('objectX').value=Math.round(dx);$('objectY').value=Math.round(dy);requestRender();return;
 }
 if(state.tool==='move'&&state.moveSnapshot){state.lastPoint=p;const layer=activeLayer(),ctx=layer.canvas.getContext('2d'),dx=p.x-state.startPoint.x,dy=p.y-state.startPoint.y;ctx.clearRect(0,0,state.width,state.height);ctx.drawImage(state.moveSnapshot,dx,dy);requestRender();return;}
 if(['brush','eraser','smudge'].includes(state.pointerTool||state.tool)){processBrushSamples(e);requestRender()}else{state.lastPoint=p;drawOverlay()}
}
function stagePointerUp(e={}){
 const id=e.pointerId,type=e.pointerType||state.activePointerType;
 if(type==='touch'&&id!==undefined){state.gesturePointers.delete(id);if(state.gesturePointers.size<2)state.gesturePinch=null;}
 if(state.panning){state.panning=false;state.panStart=null;state.pointerDown=false;state.pointerTool=null;state.activePointerId=null;state.activePointerType=null;releaseStagePointer(e);flushPendingDisplayResize();return;}
 if(!state.pointerDown){state.panStart=null;releaseStagePointer(e);if(state.gesturePointers.size===0)flushPendingDisplayResize();return;}
 if(id!==undefined&&state.activePointerId!==null&&id!==state.activePointerId){releaseStagePointer(e);if(state.gesturePointers.size===0)flushPendingDisplayResize();return;}
 const tool=state.pointerTool||state.tool,layer=state.layers.find(x=>x.id===state.strokeLayerId)||activeLayer();
 const hasPoint=Number.isFinite(e.clientX)&&Number.isFinite(e.clientY);
 if(['brush','eraser','smudge'].includes(tool)){
  if(hasPoint&&tool===state.tool&&type!=='touch'&&Number(e.pressure)===0&&type==='pen'){}else if(hasPoint&&tool===state.tool)processBrushSamples(e);
  if(state.tapDotMode===false&&state.strokeIsSmooth&&state.strokePath.length<=1)state.strokePath=[];
  if(layer&&state.strokeIsSmooth)commitSmoothStroke(layer);else if(tool!=='smudge'&&!state.strokeIsPixel)flushBrushCurve();
  if(layer&&state.strokeTiles?.size){const entry=getStrokeTileAfter(layer);if(entry.before.length)pushHistory({type:'tiles',layerId:layer.id,before:entry.before,after:entry.after});if(state.strokeTileLimitHit)toast('長いストロークのUndo範囲をメモリ制限に合わせました');}
  state.strokeTiles=null;state.strokeLayerId=null;state.strokeTool=null;state.strokeLastSample=null;state.strokePath=[];state.strokeIsSmooth=false;state.strokeIsPixel=false;state.pixelLastCell=null;state.strokePreviewBounds=null;state.strokePreviewFallback=false;state.strokePreviewStickyFallback=false;state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;
 }
 if(state.transforming&&layer&&state.transformBefore){const after=captureLayerImage(layer);pushHistory({type:'pixels',layerId:layer.id,before:state.transformBefore,after});state.transforming=false;state.transformMode=null;state.transformBefore=null;state.transformSource=null;state.pointerDown=false;state.pointerTool=null;state.activePointerId=null;state.activePointerType=null;state.transformBounds=findAlphaBounds(layer);releaseStagePointer(e);renderLayers();markDirty();setStatus('オブジェクトの変形を適用しました');flushPendingDisplayResize();return;}
 if(tool==='move'&&layer&&state.moveBefore){const before=state.moveBefore,after=captureLayerImage(layer),dx=(state.lastPoint?.x??state.startPoint.x)-state.startPoint.x,dy=(state.lastPoint?.y??state.startPoint.y)-state.startPoint.y;if(layer.textData){layer.textData.x+=dx;layer.textData.y+=dy}pushHistory({type:'pixels',layerId:layer.id,before,after});state.moveBefore=null;state.moveSnapshot=null;state.pointerDown=false;state.pointerTool=null;state.activePointerId=null;state.activePointerType=null;state.startPoint=null;state.lastPoint=null;releaseStagePointer(e);renderLayers();markDirty();setStatus('レイヤーを移動しました');flushPendingDisplayResize();return;}
 if(tool==='gradient'&&layer){const a=state.startPoint,b=state.lastPoint||a,ctx=layer.canvas.getContext('2d');let grad;if(state.gradientType==='radial')grad=ctx.createRadialGradient(a.x,a.y,0,b.x,b.y,Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)));else grad=ctx.createLinearGradient(a.x,a.y,b.x,b.y);grad.addColorStop(0,state.color);grad.addColorStop(1,state.gradientColor);ctx.save();ctx.globalAlpha=state.opacity;ctx.fillStyle=grad;ctx.fillRect(0,0,state.width,state.height);ctx.restore();const after=captureLayerImage(layer);if(state.strokeBefore)pushHistory({type:'pixels',layerId:layer.id,before:state.strokeBefore,after});state.strokeBefore=null;}
 if(isShapeTool(tool)&&layer){const ctx=layer.canvas.getContext('2d'),a=state.startPoint,b=state.lastPoint||a;ctx.save();ctx.strokeStyle=state.color;ctx.fillStyle=state.color;ctx.globalAlpha=state.opacity*state.brushFlow;ctx.lineWidth=isPixelWorkspace()?1:state.size;ctx.lineCap=isPixelWorkspace()?'butt':'round';ctx.lineJoin='round';const starts=symmetryPoints(a),ends=symmetryPoints(b);for(let k=0;k<starts.length;k++){if(isPixelWorkspace()&&['line','rect','ellipse'].includes(tool))drawPixelShape(ctx,tool,starts[k],ends[k],$('shapeFill').checked);else drawShapePath(ctx,tool,starts[k],ends[k],$('shapeFill').checked)}ctx.restore();const after=captureLayerImage(layer);if(state.strokeBefore)pushHistory({type:'pixels',layerId:layer.id,before:state.strokeBefore,after});state.strokeBefore=null;}
 state.pointerDown=false;state.pointerTool=null;state.activePointerId=null;state.activePointerType=null;state.prevPoint=null;state.strokeCurvePrev=null;state.strokeCurveMid=null;state.startPoint=null;state.filteredPoint=null;state.lastPoint=null;state.strokeBefore=null;
 releaseStagePointer(e);renderLayers();ensureInitialFrame();markDirty();flushPendingDisplayResize();
}
function zoomAt(factor,x,y){const old=state.zoom,next=Math.min(isPixelWorkspace()?64:8,Math.max(.05,old*factor));const wx=(x-state.panX)/old,wy=(y-state.panY)/old;state.zoom=next;state.panX=x-wx*next;state.panY=y-wy*next;updateZoom();renderLayers()}
function fitView(){setViewCenter();renderLayers()}
const PROJECT_STATE_KEYS=[
 'tool','color','size','opacity','hardness','eraserOpacity','eraserHardness','eraserMode','eraserPressureOpacity','stabilizer','symmetry','zoom','panX','panY','grid',
 'waterSpread','edgeDarkening','fillTolerance','gradientColor','gradientType','dpi','exportScale','exportQuality','exportMatte',
 'smudgeStrength','smudgeSampleMerged','rainbowDirection','rainbowCycles','rainbowMix','rainbowColorPickup','rainbowPhase','rainbowReverse','fillContiguous','fillMerged','fillOpacity','fillFeather','waterAbsorption','waterDiffusion','waterGranulation','waterDrying','waterPreset',
 'lowMemory','renderQuality','strokeSmoothing','strokeTaper','paperInteraction','textureDetail','pressureProfile','velocitySize','velocityOpacity',
 'taperStart','taperEnd','wetEdge','textureScale','edgeSoftness','nibTiltSensitivity','strokeCorrection','feelFriction','feelSmoothing',
 'pressureCurve','tiltEnabled','brushFlow','brushJitter','brushAngle','pressureOpacity','curveBend','polygonSides','brushPreset','waterAmount',
 'pigment','paperTexture','paperStrength','onionSkin','brushProfileAuto','strokeStability','strokePressureSmoothing','pressureFloor','pressureCeiling','strokeSampleDensity','strokeResampleQuality','strokePreviewMode','paperFiberDirection','paperGrainScale','paperSurfaceRelief','touchPalmRejection','mobilePreviewFps','touchDrawMode','touchSmoothing','touchMinDistance','palmRejectionRadius','leftHandedUI','mobileToolbarScale','mobileDockOpacity','mobileCompactUI','showPressureHUD','tapDotMode','brushTipShape','paintBlendMode','brushAspect','bristleCount','bristleSpread','bristleStiffness','paintThickness','pigmentLoad','pigmentGranulation','edgeRoughness','tipRotationJitter','stampSpacingFine','textureContrast','colorPickup','wetMix','wetBleed','edgePooling','strokeWetness','paperTooth','paperFiberDensity','paperFiberLength','paperWarp','paperNoise','paperTemperature','paperBrightness','paperPorosity','canvasWeave','paperBleed','pressureWidthGain','tiltWidthGain','nibFollow','nibAngleMode','strokeWidthNoise','strokeWidthWave','strokeTaperPower','bristleSplay','bristleLengthVariation','bristleClumping','bristleCurl','bristleLag','bristleWaviness','bristleWidthVariation','bristleOpacityVariation','bristleDensity','bristleWetness','bristleColorVariation','paintDrag','pigmentReservoir','pigmentDepletion','strokeDrying','wetEdgeSpread','colorPickupRadius','edgeBreakup'
];
const BRUSH_PROFILE_STATE_KEYS=[
 'size','opacity','hardness','stabilizer','brushFlow','brushJitter','brushAngle','pressureOpacity','curveBend','strokeSmoothing','strokeTaper',
 'paperInteraction','textureDetail','pressureProfile','velocitySize','velocityOpacity','taperStart','taperEnd','wetEdge','textureScale','edgeSoftness',
 'nibTiltSensitivity','strokeCorrection','feelFriction','feelSmoothing','pressureCurve','tiltEnabled','strokeStability','strokePressureSmoothing','pressureFloor','pressureCeiling','strokeSampleDensity','strokeResampleQuality','strokePreviewMode','waterAmount','pigment','waterSpread',
 'edgeDarkening','waterPreset','waterAbsorption','waterDiffusion','waterGranulation','waterDrying','smudgeStrength','smudgeSampleMerged','rainbowDirection','rainbowCycles','rainbowMix','rainbowColorPickup','rainbowPhase','rainbowReverse','paperFiberDirection','paperGrainScale','paperSurfaceRelief','brushTipShape','paintBlendMode','brushAspect','bristleCount','bristleSpread','bristleStiffness','paintThickness','pigmentLoad','pigmentGranulation','edgeRoughness','tipRotationJitter','stampSpacingFine','textureContrast','colorPickup','wetMix','wetBleed','edgePooling','strokeWetness','paperTooth','paperFiberDensity','paperFiberLength','paperWarp','paperNoise','paperTemperature','paperBrightness','paperPorosity','canvasWeave','paperBleed','pressureWidthGain','tiltWidthGain','nibFollow','nibAngleMode','strokeWidthNoise','strokeWidthWave','strokeTaperPower','bristleSplay','bristleLengthVariation','bristleClumping','bristleCurl','bristleLag','bristleWaviness','bristleWidthVariation','bristleOpacityVariation','bristleDensity','bristleWetness','bristleColorVariation','paintDrag','pigmentReservoir','pigmentDepletion','strokeDrying','wetEdgeSpread','colorPickupRadius','edgeBreakup'
];
const PROJECT_CONTROL_IDS=['sizeRange','sizeNumber','opacityRange','hardness','stabilizerRange','spacing','pressureSize','shapeFill','gradientColor','gradientType',
 'fillTolerance','fillContiguous','fillMerged','fillOpacity','fillFeather','smudgeStrength','smudgeSampleMerged','rainbowDirection','rainbowCycles','rainbowMix','rainbowColorPickup','rainbowPhase','rainbowReverse','brushPreset','brushFlow','brushJitter','brushAngle','pressureOpacity',
 'curveBend','polygonSides','waterAmount','pigment','waterSpread','edgeDarkening','waterPreset','waterAbsorption','waterDiffusion','waterGranulation','waterDrying',
 'paperTexture','paperStrength','paperFiberDirection','paperGrainScale','paperSurfaceRelief','touchPalmRejection','mobilePreviewFps','touchDrawMode','touchSmoothing','touchMinDistance','palmRejectionRadius','leftHandedUI','mobileToolbarScale','mobileDockOpacity','mobileCompactUI','showPressureHUD','tapDotMode','brushTipShape','paintBlendMode','brushAspect','bristleCount','bristleSpread','bristleStiffness','paintThickness','pigmentLoad','pigmentGranulation','edgeRoughness','tipRotationJitter','stampSpacingFine','textureContrast','colorPickup','wetMix','wetBleed','edgePooling','strokeWetness','paperTooth','paperFiberDensity','paperFiberLength','paperWarp','paperNoise','paperTemperature','paperBrightness','paperPorosity','canvasWeave','paperBleed','traceOpacity','traceScale','traceX','traceY','traceVisible','textContent','textFont','textSize','textWeight','textAlign','textStroke',
 'textStrokeColor','textStrokeWidth','animationFps','onionSkin','feelPreset','feelFriction','feelSmoothing','pressureCurve','tiltEnabled','lowMemoryMode','renderQuality',
 'tabletMode','gridToggle','backgroundMode','documentDpi','exportScale','exportQuality','exportMatte','pressureProfile','velocitySize','velocityOpacity',
 'taperStart','taperEnd','wetEdge','textureScale','edgeSoftness','nibTiltSensitivity','strokeCorrection','brushProfileAuto','brushProfileName','strokeStability','strokePressureSmoothing','pressureFloor','pressureCeiling','strokeSampleDensity','strokeResampleQuality','strokePreviewMode','pressureWidthGain','tiltWidthGain','nibFollow','nibAngleMode','strokeWidthNoise','strokeWidthWave','strokeTaperPower','bristleSplay','bristleLengthVariation','bristleClumping','bristleCurl','bristleLag','bristleWaviness','bristleWidthVariation','bristleOpacityVariation','bristleDensity','bristleWetness','bristleColorVariation','paintDrag','pigmentReservoir','pigmentDepletion','strokeDrying','wetEdgeSpread','colorPickupRadius','edgeBreakup'];
function captureEditorState(keys=PROJECT_STATE_KEYS){const out={};for(const key of keys){const v=state[key];if(v===null||['string','number','boolean'].includes(typeof v))out[key]=v;}return out;}
function captureFormState(onlyIds=null){
 const allow=onlyIds?new Set(onlyIds):null,out={};
 document.querySelectorAll('input[id],select[id],textarea[id]').forEach(el=>{
  if(allow&&!allow.has(el.id))return;
  const type=(el.type||'').toLowerCase();if(['file','button','submit','reset','image'].includes(type))return;
  const rec={tag:el.tagName.toLowerCase(),type};
  if(type==='checkbox'||type==='radio')rec.checked=!!el.checked;else rec.value=el.value;
  if(el.multiple)rec.values=[...el.selectedOptions].map(o=>o.value);
  out[el.id]=rec;
 });return out;
}
function restoreFormState(snapshot,{dispatch=true}={}){
 if(!snapshot||typeof snapshot!=='object')return;
 for(const [id,rec] of Object.entries(snapshot)){const el=$(id);if(!el||!rec)continue;const type=(el.type||'').toLowerCase();if(type==='file')continue;
  try{if(type==='checkbox'||type==='radio')el.checked=!!rec.checked;else if(el.multiple&&Array.isArray(rec.values)){for(const opt of el.options)opt.selected=rec.values.includes(opt.value)}else if(rec.value!==undefined)el.value=String(rec.value);}catch(_){}}
 if(dispatch){for(const id of Object.keys(snapshot)){const el=$(id);if(!el||el.type==='file')continue;const ev=(el.tagName==='SELECT'||el.type==='checkbox'||el.type==='radio')?'change':'input';try{el.dispatchEvent(new Event(ev,{bubbles:true}))}catch(_){}}}
}
function captureUIState(){return{rightbarCollapsed:!!$('rightbar')?.classList.contains('collapsed'),leftbarCollapsed:!!$('leftbar')?.classList.contains('collapsed'),tabletMode:document.body.classList.contains('tablet-mode'),mobilePanelOpen:document.body.classList.contains('mobile-panel-open'),panels:[...document.querySelectorAll('#rightbar .panel')].map((p,i)=>({id:p.id||'',index:i,folded:p.classList.contains('folded')})),details:[...document.querySelectorAll('#rightbar details')].map((d,i)=>({id:d.id||'',index:i,open:!!d.open}))};}
function restoreUIState(ui){if(!ui)return;if($('rightbar'))$('rightbar').classList.toggle('collapsed',!!ui.rightbarCollapsed);if($('leftbar'))$('leftbar').classList.toggle('collapsed',!!ui.leftbarCollapsed);document.body.classList.toggle('tablet-mode',!!ui.tabletMode);document.body.classList.toggle('mobile-panel-open',!!ui.mobilePanelOpen);for(const item of ui.panels||[]){const p=item.id?$(item.id):document.querySelectorAll('#rightbar .panel')[item.index];if(p)p.classList.toggle('folded',!!item.folded)}for(const item of ui.details||[]){const d=item.id?$(item.id):document.querySelectorAll('#rightbar details')[item.index];if(d)d.open=!!item.open;}}
function captureProjectMetadata(){
 normalizeAdvancedStrokeSettings();
 if($('brushProfileAuto')?.checked)saveBrushProfileFor(state.brushPreset,{silent:true});
 return{appVersion:PF_APP_RELEASE,settingsSchema:7,editorState:captureEditorState(),formState:captureFormState(),activeLayerId:state.activeId,
  brushProfiles:structuredCloneSafe(state.brushProfiles||{}),brushFavorites:getBrushFavorites(),uiState:captureUIState(),
  viewState:{zoom:state.zoom,panX:state.panX,panY:state.panY}};
}
function structuredCloneSafe(v){try{return JSON.parse(JSON.stringify(v))}catch(_){return{}}}
function normalizeBrushMicroDynamics(){
 const clamp=(v,min,max,d)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;
 const ranges={pressureWidthGain:[0,1.8,1],tiltWidthGain:[0,1,.42],nibFollow:[0,1,.65],strokeWidthNoise:[0,.30,.035],strokeWidthWave:[0,.35,.08],strokeTaperPower:[.5,2.5,1.35],bristleSplay:[0,1,.55],bristleLengthVariation:[0,1,.28],bristleClumping:[0,1,.30],bristleCurl:[0,1,.24],bristleLag:[0,1,.22],bristleWaviness:[0,1,.12],bristleWidthVariation:[0,1,.24],bristleOpacityVariation:[0,1,.22],bristleDensity:[.35,1.8,1],bristleWetness:[0,1,.58],bristleColorVariation:[0,.70,.18],paintDrag:[0,1,.32],pigmentReservoir:[0,1,.78],pigmentDepletion:[0,1,.25],strokeDrying:[0,1,.32],wetEdgeSpread:[0,1,.42],edgeBreakup:[0,1,.18]};
 for(const [key,[min,max,d]] of Object.entries(ranges))state[key]=clamp(state[key],min,max,d);
 state.colorPickupRadius=Math.round(clamp(state.colorPickupRadius,1,12,4));
 if(!['fixed','follow','tilt','combined'].includes(state.nibAngleMode))state.nibAngleMode='follow';
 syncBrushLabUI?.();
}
function normalizeAdvancedStrokeSettings(){
 const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
 state.strokeStability=clamp(state.strokeStability,0,1,.18);
 state.strokePressureSmoothing=clamp(state.strokePressureSmoothing,0,1,.62);
 state.pressureFloor=clamp(state.pressureFloor,0,.45,.02);
 state.pressureCeiling=Math.max(state.pressureFloor+.1,clamp(state.pressureCeiling,.55,1,1));
 state.strokeSampleDensity=clamp(state.strokeSampleDensity,.35,2,1);
 state.strokeResampleQuality=clamp(state.strokeResampleQuality,.25,1,.8);
 if(!['accurate','responsive'].includes(state.strokePreviewMode))state.strokePreviewMode='accurate';
 const rows=[['strokeStability','strokeStabilityValue',v=>Math.round(v*100)+'%'],['strokePressureSmoothing','strokePressureSmoothingValue',v=>Math.round(v*100)+'%'],['pressureFloor','pressureFloorValue',v=>Math.round(v*100)+'%'],['pressureCeiling','pressureCeilingValue',v=>Math.round(v*100)+'%'],['strokeSampleDensity','strokeSampleDensityValue',v=>v.toFixed(2)+'×'],['strokeResampleQuality','strokeResampleQualityValue',v=>Math.round(v*100)+'%']];
 for(const [id,out,fmt] of rows){const el=$(id);if(el)el.value=String(Math.round(state[id]*100));const label=$(out);if(label)label.textContent=fmt(state[id]);}
 const mode=$('strokePreviewMode');if(mode)mode.value=state.strokePreviewMode;
}
function applyProjectMetadata(data){
 // Older projects do not contain later stroke/mobile controls; do not let them inherit
 // accidental values from a different project that happened to be opened beforehand.
 const defaults={eraserOpacity:1,eraserHardness:1,eraserMode:'hard',eraserPressureOpacity:false,strokeStability:.18,strokePressureSmoothing:.62,pressureFloor:.02,pressureCeiling:1,strokeSampleDensity:1,strokeResampleQuality:.8,strokePreviewMode:'accurate',paperFiberDirection:0,paperGrainScale:1,paperSurfaceRelief:.55,touchPalmRejection:true,mobilePreviewFps:45,touchDrawMode:'draw',touchSmoothing:.45,touchMinDistance:.20,palmRejectionRadius:24,leftHandedUI:false,mobileToolbarScale:1,mobileDockOpacity:.92,mobileCompactUI:true,showPressureHUD:true,tapDotMode:true,brushTipShape:'round',paintBlendMode:'auto',brushAspect:1,bristleCount:9,bristleSpread:.45,bristleStiffness:.60,paintThickness:.45,pigmentLoad:1,pigmentGranulation:.35,edgeRoughness:.20,tipRotationJitter:0,stampSpacingFine:.5,textureContrast:.55,colorPickup:.28,wetMix:.42,wetBleed:.24,edgePooling:.28,strokeWetness:.55,paperTooth:.50,paperFiberDensity:.50,paperFiberLength:.55,paperWarp:.28,paperNoise:.24,paperTemperature:8,paperBrightness:1,paperPorosity:.50,canvasWeave:.55,paperBleed:.10,pressureWidthGain:1,tiltWidthGain:.42,nibFollow:.65,nibAngleMode:'follow',strokeWidthNoise:.035,strokeWidthWave:.08,strokeTaperPower:1.35,bristleSplay:.55,bristleLengthVariation:.28,bristleClumping:.30,bristleCurl:.24,bristleLag:.22,bristleWaviness:.12,bristleWidthVariation:.24,bristleOpacityVariation:.22,bristleDensity:1,bristleWetness:.58,bristleColorVariation:.18,paintDrag:.32,pigmentReservoir:.78,pigmentDepletion:.25,strokeDrying:.32,wetEdgeSpread:.42,colorPickupRadius:4,edgeBreakup:.18,smudgeStrength:.58,smudgeSampleMerged:false,rainbowDirection:'along',rainbowCycles:2.5,rainbowMix:.28,rainbowColorPickup:true,rainbowPhase:0,rainbowReverse:false};
 const editor=data.editorState&&typeof data.editorState==='object'?data.editorState:{};
 const forms=data.formState&&typeof data.formState==='object'?data.formState:{};
 for(const [key,value] of Object.entries(defaults))if(!(key in editor)&&!(key in forms)&&!(key in data))state[key]=value;
 // v3/v4/v5 files remain supported. New metadata wins only when it exists.
 if(data.brushProfiles&&typeof data.brushProfiles==='object'){state.brushProfiles=structuredCloneSafe(data.brushProfiles);try{localStorage.setItem('pf-brush-profiles',JSON.stringify(state.brushProfiles))}catch(_){}}
 if(Array.isArray(data.brushFavorites)){try{localStorage.setItem('pf-brush-favorites',JSON.stringify(data.brushFavorites))}catch(_){}}
 if(data.formState)restoreFormState(data.formState,{dispatch:true});
 if(data.editorState&&typeof data.editorState==='object'){for(const [k,v] of Object.entries(data.editorState)){if(PROJECT_STATE_KEYS.includes(k)&&(v===null||['string','number','boolean'].includes(typeof v)))state[k]=v;}}
 state.eraserOpacity=Math.max(0,Math.min(1,Number(state.eraserOpacity??1)));state.eraserHardness=Math.max(0,Math.min(1,Number(state.eraserHardness??1)));if(!['hard','soft'].includes(state.eraserMode))state.eraserMode='hard';
 normalizeAdvancedStrokeSettings();normalizeBrushMicroDynamics();
 if(data.activeLayerId!==undefined&&state.layers.some(l=>l.id===Number(data.activeLayerId)))state.activeId=Number(data.activeLayerId);
 if(data.viewState){state.zoom=Math.max(.05,Math.min(8,Number(data.viewState.zoom)||state.zoom));state.panX=Number(data.viewState.panX)||0;state.panY=Number(data.viewState.panY)||0;}
 restoreUIState(data.uiState);
 // Reapply exact control values after updateUI has refreshed state-linked widgets.
 if(data.formState)restoreFormState(data.formState,{dispatch:false});
 normalizeAdvancedStrokeSettings();normalizeBrushMicroDynamics();
 $('brushPreset').value=state.brushPreset; $('colorPicker').value=state.color; $('hexColor').value=state.color;
 $('sizeRange').value=Math.min(250,state.size);$('sizeNumber').value=state.size;$('opacityRange').value=Math.round(state.opacity*100);$('hardness').value=Math.round(state.hardness*100);
 $('stabilizerRange').value=Math.round(state.stabilizer*100);$('symmetry').value=state.symmetry;$('gridToggle').checked=!!state.grid;$('backgroundMode').value=state.bg;
 syncBrushLabUI?.();renderBrushProfileLibrary?.();applyRestoredMobileUiSettings();updateUI();document.querySelectorAll('.tool[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===state.tool));updateZoom?.();renderLayers();
 state.dirty=false;clearTimeout(autosaveTimer);$('autosaveStatus').textContent='保存済み';
}
function captureLegacyBrushSettings(){return{brushFlow:state.brushFlow,brushJitter:state.brushJitter,brushAngle:state.brushAngle,pressureOpacity:state.pressureOpacity,curveBend:state.curveBend,polygonSides:state.polygonSides,strokeSmoothing:state.strokeSmoothing,strokeTaper:state.strokeTaper,paperInteraction:state.paperInteraction,textureDetail:state.textureDetail,renderQuality:state.renderQuality,pressureProfile:state.pressureProfile,velocitySize:state.velocitySize,velocityOpacity:state.velocityOpacity,taperStart:state.taperStart,taperEnd:state.taperEnd,wetEdge:state.wetEdge,textureScale:state.textureScale,edgeSoftness:state.edgeSoftness,nibTiltSensitivity:state.nibTiltSensitivity,strokeCorrection:state.strokeCorrection};}
function projectData(){saveCurrentFrame(false);return{format:'PIXEL_FORGE_PROJECT',version:5,id:state.projectId||null,createdAt:state.projectCreatedAt||Date.now(),updatedAt:state.projectUpdatedAt||Date.now(),name:state.projectName,width:state.width,height:state.height,dpi:state.dpi||300,brushSettings:captureLegacyBrushSettings(),
 bg:state.bg,paperTexture:state.paperTexture,paperStrength:state.paperStrength,brushPreset:state.brushPreset,waterAmount:state.waterAmount,waterSpread:state.waterSpread,
 edgeDarkening:state.edgeDarkening,pigment:state.pigment,fillTolerance:state.fillTolerance,fillContiguous:state.fillContiguous,fillMerged:state.fillMerged,
 fillOpacity:state.fillOpacity,fillFeather:state.fillFeather,waterPreset:state.waterPreset,waterAbsorption:state.waterAbsorption,waterDiffusion:state.waterDiffusion,
 waterGranulation:state.waterGranulation,waterDrying:state.waterDrying,smudgeStrength:state.smudgeStrength,smudgeSampleMerged:state.smudgeSampleMerged,rainbowDirection:state.rainbowDirection,rainbowCycles:state.rainbowCycles,rainbowMix:state.rainbowMix,rainbowColorPickup:state.rainbowColorPickup,rainbowPhase:state.rainbowPhase,rainbowReverse:state.rainbowReverse,
 reference:state.reference?.data?{data:state.reference.data,opacity:state.reference.opacity,visible:state.reference.visible,scale:state.reference.scale||1,x:state.reference.x||0,y:state.reference.y||0}:null,
 layers:state.layers.map(l=>({id:l.id,name:l.name,visible:l.visible,opacity:l.opacity,blend:l.blend,textData:l.textData||null,data:l.canvas.toDataURL('image/png')})),
 animationFrames:state.animationFrames,frameIndex:state.frameIndex,...captureProjectMetadata()};}
function downloadBlob(blob,name){
 if(!(blob instanceof Blob)||!window.URL||typeof URL.createObjectURL!=='function')return false;
 try{
  if(typeof navigator.msSaveOrOpenBlob==='function'){navigator.msSaveOrOpenBlob(blob,name);return true;}
  const safeName=String(name||'untitled.pforge').replace(/[\u0000-\u001f<>:"/\\|?*]/g,'_').trim()||'untitled.pforge';
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=safeName;a.rel='noopener';a.style.position='fixed';a.style.left='-10000px';
  document.body.appendChild(a);a.click();a.remove();
  // Keep the object URL alive long enough for slower mobile download managers.
  setTimeout(()=>{try{URL.revokeObjectURL(url)}catch(_){}},30000);
  return true;
 }catch(error){console.warn('Project download failed',error);return false;}
}
async function nativeCall(){return null} // Browser-first: never touch WebView2 COM APIs.
function canvasToProjectDataURL(canvas){
 return new Promise((resolve,reject)=>{
  const fallback=()=>{try{resolve({url:canvas.toDataURL('image/png'),bytes:0})}catch(error){reject(error)}};
  if(!canvas||typeof canvas.toBlob!=='function'){fallback();return;}
  try{
   canvas.toBlob(blob=>{
    if(!blob){fallback();return;}
    const reader=new FileReader();
    reader.onload=()=>resolve({url:String(reader.result||''),bytes:blob.size||0});
    reader.onerror=()=>reject(reader.error||new Error('画像データの読み込みに失敗しました'));
    try{reader.readAsDataURL(blob)}catch(error){reject(error)}
   },'image/png');
  }catch(error){
   console.warn('Asynchronous canvas export unavailable; using fallback',error);
   fallback();
  }
 });
}
function formatByteCount(bytes){const n=Math.max(0,Number(bytes)||0);if(n<1024)return n+' B';if(n<1024*1024)return (n/1024).toFixed(1)+' KB';return (n/1024/1024).toFixed(2)+' MB'}
async function projectDataAsync(){
 const snapshotRevision=Number(state.projectUpdatedAt)||Date.now();
 saveCurrentFrame(false);const layers=[];let encodedBytes=0;const total=Math.max(1,state.layers.length);
 for(let i=0;i<state.layers.length;i++){
  const l=state.layers[i];
  updateProgress(5+Math.round(i/total*72),`レイヤー ${i+1}/${total} を画像に変換中`,formatByteCount(encodedBytes)+' · 画面応答を維持');
  await nextFrameUI();
  const encoded=await canvasToProjectDataURL(l.canvas);encodedBytes+=encoded.bytes||Math.round(encoded.url.length*.75);
  layers.push({id:l.id,name:l.name,visible:l.visible,opacity:l.opacity,blend:l.blend,textData:l.textData||null,data:encoded.url});
  updateProgress(8+Math.round((i+1)/total*72),`保存データを準備 ${i+1}/${state.layers.length}`,formatByteCount(encodedBytes)+' · '+(i+1)+'/'+total+' レイヤー');
  await nextFrameUI();
 }
 return{format:'PIXEL_FORGE_PROJECT',version:5,id:state.projectId||null,createdAt:state.projectCreatedAt||Date.now(),updatedAt:snapshotRevision,name:state.projectName,width:state.width,height:state.height,dpi:state.dpi||300,brushSettings:captureLegacyBrushSettings(),
 bg:state.bg,paperTexture:state.paperTexture,paperStrength:state.paperStrength,brushPreset:state.brushPreset,waterAmount:state.waterAmount,waterSpread:state.waterSpread,
 edgeDarkening:state.edgeDarkening,pigment:state.pigment,fillTolerance:state.fillTolerance,fillContiguous:state.fillContiguous,fillMerged:state.fillMerged,
 fillOpacity:state.fillOpacity,fillFeather:state.fillFeather,waterPreset:state.waterPreset,waterAbsorption:state.waterAbsorption,waterDiffusion:state.waterDiffusion,
 waterGranulation:state.waterGranulation,waterDrying:state.waterDrying,smudgeStrength:state.smudgeStrength,smudgeSampleMerged:state.smudgeSampleMerged,rainbowDirection:state.rainbowDirection,rainbowCycles:state.rainbowCycles,rainbowMix:state.rainbowMix,rainbowColorPickup:state.rainbowColorPickup,rainbowPhase:state.rainbowPhase,rainbowReverse:state.rainbowReverse,
 reference:state.reference?.data?{data:state.reference.data,opacity:state.reference.opacity,visible:state.reference.visible,scale:state.reference.scale||1,x:state.reference.x||0,y:state.reference.y||0}:null,
 layers,animationFrames:state.animationFrames,frameIndex:state.frameIndex,...captureProjectMetadata()};
}
// A file backup is the last-resort save path when IndexedDB is blocked or full.
// It deliberately reuses the same project serializer so layers, frame data and metadata stay intact.
async function exportCurrentProjectBackup({title='バックアップファイルを作成中',quiet=false}={}){
 showProgress(title,'作品データをまとめています',3);
 try{
  const data=await projectDataAsync();
  if(!data||data.format!=='PIXEL_FORGE_PROJECT'||!Array.isArray(data.layers))throw new Error('バックアップ用データを作成できませんでした');
  const json=JSON.stringify(data);
  if(!json)throw new Error('作品データを変換できませんでした');
  const blob=new Blob([json],{type:'application/json;charset=utf-8'});
  const safeName=String(data.name||state.projectName||'untitled').replace(/[\u0000-\u001f<>:"/\\|?*]/g,'_').trim()||'untitled';
  const fileName=safeName+'.pforge';
  updateProgress(94,'バックアップファイルを書き出しています',formatByteCount(blob.size)+' · .pforge');
  await nextFrameUI();
  const downloaded=downloadBlob(blob,fileName);
  if(!downloaded)throw new Error('このブラウザではファイルを書き出せませんでした');
  updateProgress(100,'バックアップを作成しました',formatByteCount(blob.size)+' · '+fileName);
  await nextFrameUI();
  if(!quiet)toast('.pforgeバックアップを書き出しました');
  return{downloaded:true,fileName,bytes:blob.size,data};
 }catch(error){
  console.error('Project backup export failed',error);
  if(!quiet)toast('バックアップを書き出せませんでした: '+(error?.message||String(error)));
  return{downloaded:false,error};
 }finally{hideProgress()}
}
let pfSaveInFlight=null;
async function saveProject(){
 if(pfSaveInFlight)return pfSaveInFlight;
 let saveHandlePromise=null;
 if(typeof window.showSaveFilePicker==='function'){
  try{
   const safeBase=String(state.projectName||'untitled').replace(/[\u0000-\u001f<>:"/\\|?*]/g,'_').trim()||'untitled';
   saveHandlePromise=window.showSaveFilePicker({suggestedName:safeBase+'.pforge',types:[{description:'PIXEL FORGE Project',accept:{'application/json':['.pforge']}}]}).then(handle=>({handle}),error=>({error}));
  }catch(error){console.info('Native save picker unavailable; using browser download fallback.',error);}
 }
 const saveButton=$('saveBtn');
 const wasDisabled=!!saveButton?.disabled;
 if(saveButton){saveButton.disabled=true;saveButton.setAttribute('aria-busy','true');}
 pfSaveInFlight=(async()=>{
  stopAnimationPlayback({save:false,quiet:true});saveCurrentFrame(false);
  document.body.classList.add('pf-saving');
  showProgress('プロジェクトを保存中','作品データをまとめています',3);
  let data=null,downloaded=false,librarySaved=false,libraryError=null,externalCancelled=false;
  try{
   data=await projectDataAsync();
   if(!Array.isArray(data.layers))throw new Error('保存データを作成できませんでした');
   updateProgress(82,'作品ライブラリへ保存しています','作品データの書き込み中');
   try{await persistProjectData(data);librarySaved=true;}
   catch(error){libraryError=error;data.updatedAt=Date.now();console.error('Local project library save failed; falling back to .pforge export.',error);}
   // Serialize after the library write so the external backup carries the final timestamp.
   const text=JSON.stringify(data);
   if(!text)throw new Error('保存データを作成できませんでした');
   const projectBlob=new Blob([text],{type:'application/json;charset=utf-8'});
   updateProgress(92,'バックアップファイルを準備しています',formatByteCount(projectBlob.size)+' · .pforge');
   const fileName=(data.name||state.projectName||'untitled')+'.pforge';
   if(saveHandlePromise){
    const pickerResult=await saveHandlePromise;
    if(pickerResult?.error){
     const error=pickerResult.error;
     if(error?.name==='AbortError'){externalCancelled=true;console.info('User cancelled the external backup file picker.');}
     else{console.warn('Native project file picker failed; trying browser download.',error);downloaded=downloadBlob(projectBlob,fileName);}
    }else{
     try{const writable=await pickerResult.handle.createWritable();await writable.write(projectBlob);await writable.close();downloaded=true;}
     catch(error){console.warn('Native project file write failed; trying browser download.',error);downloaded=downloadBlob(projectBlob,fileName);}
    }
   }else downloaded=downloadBlob(projectBlob,fileName);
   updateProgress(100,'保存処理が完了しました','保存内容を確認しました');
   await nextFrameUI();hideProgress();
   if(librarySaved&&downloaded)toast('作品ライブラリと .pforge ファイルに保存しました');
   else if(librarySaved)toast(externalCancelled?'作品ライブラリに保存しました（.pforgeの外部保存はキャンセルされました）':'作品ライブラリに保存しました（ファイルのダウンロードはブラウザ設定を確認してください）');
   else if(downloaded)toast('ライブラリ保存に失敗しましたが、.pforge ファイルを書き出しました。保存容量・ブラウザ設定を確認してください');
   else toast('保存できませんでした: '+(libraryError?.message||'ファイルの書き出しに失敗しました'));
   if(!librarySaved&&libraryError){const status=$('autosaveStatus');if(status)status.textContent=downloaded?'外部ファイルに保存済み · ライブラリ不可':'保存できません';}
   return {librarySaved,downloaded,error:libraryError};
  }catch(error){
   hideProgress();toast('保存データを作成できませんでした: '+(error?.message||String(error)));console.error('Project save failed',error);return {librarySaved:false,downloaded:false,error};
  }
 })();
 try{return await pfSaveInFlight;}finally{pfSaveInFlight=null;document.body.classList.remove('pf-saving');if(saveButton){saveButton.disabled=wasDisabled;saveButton.removeAttribute('aria-busy');}}
}
async function openProjectFile(file){
 if(!file)return;
 try{
  if(state.projectId&&state.dirty){
   try{await persistCurrentProject()}
   catch(storageError){
    console.warn('Could not preserve the current project in the library before import; exporting a backup instead.',storageError);
    const backup=await exportCurrentProjectBackup({title:'読み込み前の作品をバックアップ中',quiet:true});
    if(!backup.downloaded){toast('現在の作品を保存できなかったため、読み込みを中止しました。先に .pforge でバックアップしてください。');return;}
    toast('現在の作品を .pforge でバックアップしてから読み込みます');
   }
  }
  const text=await file.text();
  await loadProjectText(text);
  ensureProjectIdentity();
  showEditorScreen();
  try{await persistCurrentProject();toast('作品を開き、端末内ライブラリにも保存しました')}
  catch(storageError){
   const status=$('autosaveStatus');if(status)status.textContent='ファイルから読み込み済み · ライブラリ保存不可（.pforgeでバックアップ）';
   toast('作品を開きました。端末内ライブラリは利用できないため、編集後は .pforge で保存してください');
   console.warn('Imported project is open but browser library storage is unavailable.',storageError);
  }
 }catch(error){toast('プロジェクトを開けません: '+(error?.message||String(error)));console.error(error)}
}
async function loadProjectText(text){stopAnimationPlayback({save:false,quiet:true});state.frameLoadToken++;const data=JSON.parse(text);state.projectId=(typeof data.id==='string'&&data.id)?data.id:null;state.projectCreatedAt=Number(data.createdAt)||Date.now();state.projectUpdatedAt=Number(data.updatedAt)||state.projectCreatedAt;if(data.format!=='PIXEL_FORGE_PROJECT'||!Array.isArray(data.layers))throw new Error('PIXEL FORGE形式ではありません');if(data.width<1||data.height<1||data.width>12000||data.height>12000||data.width*data.height>20000000)throw new Error('キャンバスサイズが範囲外です（最大2000万px）');state.width=data.width;state.height=data.height;state.dpi=Number(data.dpi)||300;updateHistoryLimit();state.bg=data.bg||'white';const bs=data.brushSettings||{};state.brushFlow=Number.isFinite(bs.brushFlow)?bs.brushFlow:1;state.brushJitter=Number.isFinite(bs.brushJitter)?bs.brushJitter:0;state.brushAngle=Number.isFinite(bs.brushAngle)?bs.brushAngle:0;state.pressureOpacity=!!bs.pressureOpacity;state.pressureProfile=bs.pressureProfile||'natural';state.velocitySize=Number.isFinite(bs.velocitySize)?bs.velocitySize:.12;state.velocityOpacity=Number.isFinite(bs.velocityOpacity)?bs.velocityOpacity:.06;state.taperStart=Number.isFinite(bs.taperStart)?bs.taperStart:.055;state.taperEnd=Number.isFinite(bs.taperEnd)?bs.taperEnd:.085;state.wetEdge=Number.isFinite(bs.wetEdge)?bs.wetEdge:.16;state.textureScale=Number.isFinite(bs.textureScale)?bs.textureScale:1;state.edgeSoftness=Number.isFinite(bs.edgeSoftness)?bs.edgeSoftness:.06;state.nibTiltSensitivity=Number.isFinite(bs.nibTiltSensitivity)?bs.nibTiltSensitivity:.55;state.strokeCorrection=bs.strokeCorrection||'balanced';state.curveBend=Number.isFinite(bs.curveBend)?bs.curveBend:.35;state.polygonSides=Number.isFinite(bs.polygonSides)?bs.polygonSides:6;state.strokeSmoothing=Number.isFinite(bs.strokeSmoothing)?bs.strokeSmoothing:.42;state.strokeTaper=Number.isFinite(bs.strokeTaper)?Math.max(0,Math.min(.8,bs.strokeTaper)):.14;state.paperInteraction=Number.isFinite(bs.paperInteraction)?bs.paperInteraction:.78;state.textureDetail=Number.isFinite(bs.textureDetail)?bs.textureDetail:.62;state.renderQuality=bs.renderQuality||'balanced';state.paperTexture=data.paperTexture||'none';state.paperStrength=Number.isFinite(data.paperStrength)?data.paperStrength:.35;state.brushPreset=data.brushPreset||'gpen';state.waterAmount=Number.isFinite(data.waterAmount)?data.waterAmount:.55;state.waterSpread=Number.isFinite(data.waterSpread)?data.waterSpread:.45;state.edgeDarkening=Number.isFinite(data.edgeDarkening)?data.edgeDarkening:.30;state.fillTolerance=Number.isFinite(data.fillTolerance)?data.fillTolerance:24;state.fillContiguous=data.fillContiguous!==false;state.fillMerged=!!data.fillMerged;state.fillOpacity=Number.isFinite(data.fillOpacity)?data.fillOpacity:1;state.fillFeather=Number.isFinite(data.fillFeather)?Math.max(0,Math.min(8,data.fillFeather)):0;state.waterPreset=data.waterPreset||'wet';state.waterAbsorption=Number.isFinite(data.waterAbsorption)?data.waterAbsorption:.48;state.waterDiffusion=Number.isFinite(data.waterDiffusion)?data.waterDiffusion:.56;state.waterGranulation=Number.isFinite(data.waterGranulation)?data.waterGranulation:.24;state.waterDrying=Number.isFinite(data.waterDrying)?data.waterDrying:.38;state.smudgeStrength=Number.isFinite(data.smudgeStrength)?data.smudgeStrength:.58;state.smudgeSampleMerged=!!data.smudgeSampleMerged;state.rainbowDirection=['along','horizontal','vertical'].includes(data.rainbowDirection)?data.rainbowDirection:(state.rainbowDirection||'along');state.rainbowCycles=Math.max(.5,Math.min(10,Number(data.rainbowCycles)||2.5));state.rainbowMix=Math.max(0,Math.min(.85,Number(data.rainbowMix??.28)));state.rainbowColorPickup=data.rainbowColorPickup!==false;state.rainbowPhase=Number.isFinite(Number(data.rainbowPhase))?Math.max(0,Math.min(360,Number(data.rainbowPhase))):state.rainbowPhase;state.rainbowReverse=data.rainbowReverse===true;state.smudgeSampleMerged=data.smudgeSampleMerged===true;state.pigment=Number.isFinite(data.pigment)?data.pigment:.35;state.projectName=data.name||'Imported';state.reference=null;if(data.reference?.data)await setReferenceData(data.reference.data,data.reference.opacity??.3,data.reference.visible!==false,data.reference.scale??1,data.reference.x??0,data.reference.y??0);state.layers=[];for(const item of data.layers){const l=newLayer(item.name||'Layer');l.id=Number(item.id)||nextLayerId++;l.visible=item.visible!==false;l.opacity=Number.isFinite(item.opacity)?item.opacity:1;l.blend=item.blend||'source-over';l.textData=item.textData||null;if(item.data){await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{l.canvas.getContext('2d').drawImage(img,0,0,state.width,state.height);resolve()};img.onerror=reject;img.src=item.data})}state.layers.push(l)}if(!state.layers.length)state.layers=[newLayer('Layer 1')];state.activeId=state.layers[state.layers.length-1].id;nextLayerId=Math.max(nextLayerId,...state.layers.map(l=>Number(l.id)||0).map(n=>n+1));if(data.activeLayerId!==undefined&&state.layers.some(l=>l.id===Number(data.activeLayerId)))state.activeId=Number(data.activeLayerId);state.animationFrames=Array.isArray(data.animationFrames)?data.animationFrames:[];state.frameIndex=Math.max(0,Math.min(state.animationFrames.length-1,Number(data.frameIndex)||0));if(!state.animationFrames.length)ensureInitialFrame();else{const frameToken=++state.frameLoadToken;await loadFrameData(state.animationFrames[state.frameIndex],{token:frameToken,render:false,update:false,refreshGhost:false});}state.history=[];state.redo=[];state.dirty=false;resizeDisplay();fitView();updateUI();renderTimeline();renderLayers();$('autosaveStatus').textContent='保存済み';$('renderQuality').value=state.renderQuality;$('strokeSmoothing').value=Math.round(state.strokeSmoothing*100);$('strokeSmoothingValue').textContent=$('strokeSmoothing').value+'%';$('strokeTaper').value=Math.round(state.strokeTaper*100);$('strokeTaperValue').textContent=$('strokeTaper').value+'%';$('paperInteraction').value=Math.round(state.paperInteraction*100);$('paperInteractionValue').textContent=$('paperInteraction').value+'%';$('textureDetail').value=Math.round(state.textureDetail*100);$('textureDetailValue').textContent=$('textureDetail').value+'%';$('documentDpi').value=state.dpi;if($('paperFiberDirection'))$('paperFiberDirection').value=state.paperFiberDirection||0;if($('paperGrainScale'))$('paperGrainScale').value=Math.round((state.paperGrainScale||1)*100);if($('paperSurfaceRelief'))$('paperSurfaceRelief').value=Math.round((state.paperSurfaceRelief??.55)*100);if($('touchPalmRejection'))$('touchPalmRejection').checked=state.touchPalmRejection!==false;$('brushFlow').value=Math.round(state.brushFlow*100);$('brushFlowValue').textContent=$('brushFlow').value+'%';$('brushJitter').value=Math.round(state.brushJitter*100);$('brushJitterValue').textContent=$('brushJitter').value+'%';$('brushAngle').value=state.brushAngle;$('brushAngleValue').textContent=state.brushAngle+'°';$('pressureOpacity').checked=state.pressureOpacity;$('curveBend').value=Math.round(state.curveBend*100);$('strokeSmoothing').value=Math.round(state.strokeSmoothing*100);$('strokeSmoothingValue').textContent=$('strokeSmoothing').value+'%';$('strokeTaper').value=Math.round(state.strokeTaper*100);$('strokeTaperValue').textContent=$('strokeTaper').value+'%';$('paperInteraction').value=Math.round(state.paperInteraction*100);$('paperInteractionValue').textContent=$('paperInteraction').value+'%';$('textureDetail').value=Math.round(state.textureDetail*100);$('textureDetailValue').textContent=$('textureDetail').value+'%';$('renderQuality').value=state.renderQuality;$('curveBendValue').textContent=$('curveBend').value+'%';$('polygonSides').value=state.polygonSides;$('polygonSidesValue').textContent=state.polygonSides+'辺';$('paperTexture').value=state.paperTexture;$('paperStrength').value=Math.round(state.paperStrength*100);$('brushPreset').value=state.brushPreset;$('waterAmount').value=Math.round(state.waterAmount*100);$('waterSpread').value=Math.round(state.waterSpread*100);$('waterSpreadValue').textContent=Math.round(state.waterSpread*100)+'%';$('edgeDarkening').value=Math.round(state.edgeDarkening*100);$('edgeDarkeningValue').textContent=Math.round(state.edgeDarkening*100)+'%';$('pigment').value=Math.round(state.pigment*100);$('fillTolerance').value=state.fillTolerance;$('fillToleranceValue').textContent=state.fillTolerance;$('fillContiguous').checked=state.fillContiguous;$('fillMerged').checked=state.fillMerged;$('fillOpacity').value=Math.round(state.fillOpacity*100);$('fillOpacityValue').textContent=$('fillOpacity').value+'%';$('fillFeather').value=state.fillFeather;$('fillFeatherValue').textContent=state.fillFeather+' px';$('waterPreset').value=state.waterPreset;$('waterAbsorption').value=Math.round(state.waterAbsorption*100);$('waterAbsorptionValue').textContent=$('waterAbsorption').value+'%';$('waterDiffusion').value=Math.round(state.waterDiffusion*100);$('waterDiffusionValue').textContent=$('waterDiffusion').value+'%';$('waterGranulation').value=Math.round(state.waterGranulation*100);$('waterGranulationValue').textContent=$('waterGranulation').value+'%';$('waterDrying').value=Math.round(state.waterDrying*100);$('waterDryingValue').textContent=$('waterDrying').value+'%';$('smudgeStrength').value=Math.round(state.smudgeStrength*100);$('smudgeStrengthValue').textContent=$('smudgeStrength').value+'%';if($('rainbowDirection'))$('rainbowDirection').value=state.rainbowDirection||'along';if($('rainbowPhase'))$('rainbowPhase').value=Math.round(Number(state.rainbowPhase)||0);if($('rainbowPhaseValue'))$('rainbowPhaseValue').textContent=Math.round(Number(state.rainbowPhase)||0)+'°';if($('rainbowReverse'))$('rainbowReverse').checked=!!state.rainbowReverse;if($('rainbowCycles'))$('rainbowCycles').value=Math.round((state.rainbowCycles||2.5)*2);if($('rainbowCyclesValue'))$('rainbowCyclesValue').textContent=(state.rainbowCycles||2.5).toFixed(1)+' 周';if($('rainbowMix'))$('rainbowMix').value=Math.round((state.rainbowMix??.28)*100);if($('rainbowMixValue'))$('rainbowMixValue').textContent=Math.round((state.rainbowMix??.28)*100)+'%';if($('rainbowColorPickup'))$('rainbowColorPickup').checked=state.rainbowColorPickup!==false;if($('smudgeSampleMerged'))$('smudgeSampleMerged').checked=!!state.smudgeSampleMerged;syncBrushLabUI?.();renderTimeline();applyProjectMetadata(data);await refreshOnionGhost();renderTimeline();renderLayers();toast('プロジェクトを読み込みました（全設定・画材プロファイルを復元）');window.dispatchEvent(new CustomEvent('pf:document-loaded',{detail:{width:state.width,height:state.height,mode:document.documentElement.dataset.pfWorkspaceMode||'beginner'}}))}
async function openProject(){const result=await nativeCall('open_project');if(typeof result==='string'){await loadProjectText(result);return}if(result===false)return;$('projectInput').click()}
async function exportImage(type){
 const scale=Math.max(1,Math.min(8,Number($('exportScale').value)||1)),w=state.width*scale,h=state.height*scale;
 if(w>32768||h>32768||w*h>100000000){toast('書き出し上限を超えています。倍率を下げてください（最大1億px・辺32768px）');return}
 showProgress('高画質で書き出し中','レイヤーを合成しています',8);await nextFrameUI();const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(!ctx){hideProgress();toast('出力キャンバスを確保できません');return}ctx.imageSmoothingEnabled=!isPixelWorkspace();ctx.imageSmoothingQuality='high';ctx.scale(scale,scale);
 if(type==='image/jpeg'){ctx.fillStyle=$('exportMatte').value||'#ffffff';ctx.fillRect(0,0,state.width,state.height)}
 drawDocumentBase(ctx,true);for(let i=0;i<state.layers.length;i++){const l=state.layers[i];if(!l.visible)continue;ctx.save();ctx.globalAlpha=l.opacity;ctx.globalCompositeOperation=l.blend;ctx.drawImage(l.canvas,0,0);ctx.restore();if(i%3===0)updateProgress(12+Math.round((i+1)/state.layers.length*42),'レイヤー '+(i+1)+' / '+state.layers.length);}
 const q=Math.max(.4,Math.min(1,Number($('exportQuality').value)/100||.92));updateProgress(68,'画像をエンコードしています');await nextFrameUI();let blob=await new Promise(resolve=>c.toBlob(resolve,type,q));
 if(!blob){hideProgress();toast('書き出しに失敗しました');return}
 if(type==='image/png'&&state.dpi>0)blob=await addPngDpi(blob,state.dpi);
 if(type==='image/jpeg'&&state.dpi>0)blob=await addJpegDpi(blob,state.dpi);
 const ext=type.split('/')[1].replace('jpeg','jpg'),name=(state.projectName||'artwork')+(scale>1?'_'+scale+'x':'')+'.'+ext;
 updateProgress(92,'ファイルを準備しています');downloadBlob(blob,name);toast(ext.toUpperCase()+'を書き出しました');updateProgress(100,'完了');await nextFrameUI();hideProgress();
}
function blobToDataUrl(blob){return new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob)})}
async function addPngDpi(blob,dpi){const src=new Uint8Array(await blob.arrayBuffer());if(src.length<33)return blob;const ppm=Math.max(1,Math.round(dpi/0.0254)),payload=new Uint8Array(9),dv=new DataView(payload.buffer);dv.setUint32(0,ppm,false);dv.setUint32(4,ppm,false);payload[8]=1;const type=new TextEncoder().encode('pHYs'),crcInput=new Uint8Array(13);crcInput.set(type);crcInput.set(payload,4);const chunk=new Uint8Array(21),cv=new DataView(chunk.buffer);cv.setUint32(0,9,false);chunk.set(type,4);chunk.set(payload,8);cv.setUint32(17,crc32(crcInput),false);const ihdrLength=new DataView(src.buffer,src.byteOffset+8,4).getUint32(0,false),insert=8+12+ihdrLength;const out=new Uint8Array(src.length+chunk.length);out.set(src.slice(0,insert),0);out.set(chunk,insert);out.set(src.slice(insert),insert+chunk.length);return new Blob([out],{type:'image/png'})}
async function addJpegDpi(blob,dpi){const src=new Uint8Array(await blob.arrayBuffer());if(src.length<20||src[0]!==255||src[1]!==216)return blob;let p=2;while(p+4<src.length&&src[p]===255){const marker=src[p+1],len=(src[p+2]<<8)|src[p+3];if(marker===0xe0&&len>=14&&String.fromCharCode(...src.slice(p+4,p+9))==='JFIF\0'){src[p+11]=1;const v=Math.max(1,Math.min(65535,Math.round(dpi)));src[p+12]=v>>8;src[p+13]=v&255;src[p+14]=v>>8;src[p+15]=v&255;break}if(marker===0xda||len<2)break;p+=2+len}return new Blob([src],{type:'image/jpeg'})}
function scheduleAutosave(){if(!state.projectId)return;clearTimeout(autosaveTimer);const delay=Math.max(1800,Number(appSettings.autosaveSeconds||3)*1000);autosaveTimer=setTimeout(async()=>{if(state.pointerDown){scheduleAutosave();return}if(state.animationPlaying)stopAnimationPlayback({save:false,quiet:true});try{await persistCurrentProject();state.lastAutosave=Date.now();$('autosaveStatus').textContent='自動保存済み'}catch(e){$('autosaveStatus').textContent='ローカル保存不可';console.warn('Autosave unavailable',e)}},delay)}
let dbPromise,dbConnection=null;function openDB(){
 if(!window.indexedDB)return Promise.reject(new Error('IndexedDB unavailable'));
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  let settled=false;const req=indexedDB.open('PixelForgeDB',3); // Keep database name/schema stable across app releases; do not clear or recreate user artwork.
  const fail=error=>{if(settled)return;settled=true;clearTimeout(timeout);dbPromise=null;reject(error instanceof Error?error:new Error(error?.message||'IndexedDB open failed'))};
  const timeout=setTimeout(()=>fail(new Error('IndexedDB open timed out. Close other PIXEL FORGE tabs and retry.')),12000);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects',{keyPath:'id'});if(!db.objectStoreNames.contains('library'))db.createObjectStore('library',{keyPath:'id'});if(!db.objectStoreNames.contains('preferences'))db.createObjectStore('preferences',{keyPath:'id'})};
  req.onsuccess=()=>{if(settled){try{req.result.close()}catch(_){}return;}settled=true;clearTimeout(timeout);const db=req.result;dbConnection=db;db.onversionchange=()=>{try{db.close()}catch(_){}if(dbConnection===db)dbConnection=null;dbPromise=null};db.onclose=()=>{if(dbConnection===db)dbConnection=null;dbPromise=null};resolve(db)};
  req.onerror=()=>fail(req.error||new Error('IndexedDB could not be opened'));
  req.onblocked=()=>{console.warn('PixelForgeDB upgrade is blocked by another open tab');fail(new Error('IndexedDB is blocked by another open tab. Close the older tab and retry.'))};
 });
 return dbPromise;
}
function idbRequest(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function idbTransactionDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'))})}

async function requestPersistentStorage(){
 try{if(navigator.storage?.persist){const already=await navigator.storage.persisted?.();if(already)return true;return await navigator.storage.persist();}}catch(error){console.info('Persistent storage request was not granted',error)}
 return false;
}
async function readLastSavedProject(){
 const db=await openDB();
 const tx=db.transaction('projects','readonly'),store=tx.objectStore('projects');
 // Queue both requests immediately; this remains compatible with stricter Safari IDB scheduling.
 const pointerPromise=idbRequest(store.get('autosave'));const allPromise=idbRequest(store.getAll());
 const [pointer,all]=await Promise.all([pointerPromise,allPromise]);let data=null,record=null;
 if(pointer?.data&&pointer.data.format==='PIXEL_FORGE_PROJECT'&&Array.isArray(pointer.data.layers)){data=pointer.data;record=pointer;}
 else if(pointer?.projectId){record=(all||[]).find(row=>row?.id===pointer.projectId)||null;data=record?.data||null;}
 if(!data){
  const candidates=(all||[]).filter(row=>row?.id!=='autosave'&&row?.data?.format==='PIXEL_FORGE_PROJECT'&&Array.isArray(row.data.layers));
  candidates.sort((a,b)=>(Number(b.saved)||Number(b.data.updatedAt)||0)-(Number(a.saved)||Number(a.data.updatedAt)||0));
  record=candidates[0]||null;data=record?.data||null;
 }
 await idbTransactionDone(tx);
 return data?{data,record,pointer}:null;
}
async function restoreAutosave({showEditor=true,notify=true}={}){
 try{const last=await readLastSavedProject();if(!last?.data)return false;await loadProjectText(JSON.stringify(last.data));state.projectId=last.data.id||last.pointer?.projectId||last.record?.id||createProjectId();state.projectCreatedAt=Number(last.data.createdAt)||Date.now();state.projectUpdatedAt=Number(last.data.updatedAt)||Number(last.record?.saved)||Date.now();state.dirty=false;ensureProjectIdentity();if(showEditor)showEditorScreen();if(notify)toast('前回の作品を復元しました');return true;}
 catch(e){console.warn('Last saved project could not be restored; source record is kept unchanged.',e);return false;}
}
function addLayer(name){layerAction(()=>{const l=newLayer(name||'Layer '+(state.layers.length+1));state.layers.push(l);state.activeId=l.id})}
function deleteLayer(){if(state.layers.length<=1){toast('最後のレイヤーは削除できません');return}layerAction(()=>{const i=state.layers.findIndex(l=>l.id===state.activeId);state.layers.splice(i,1);state.activeId=state.layers[Math.max(0,i-1)].id})}
function duplicateLayer(){const src=activeLayer();if(!src)return;layerAction(()=>{const l=newLayer(src.name+' copy');l.canvas.getContext('2d').drawImage(src.canvas,0,0);l.opacity=src.opacity;l.visible=src.visible;l.blend=src.blend;l.textData=src.textData?{...src.textData}:null;state.layers.splice(state.layers.indexOf(src)+1,0,l);state.activeId=l.id})}
function moveLayer(dir){const i=state.layers.findIndex(l=>l.id===state.activeId),j=i+dir;if(j<0||j>=state.layers.length)return;layerAction(()=>{const [v]=state.layers.splice(i,1);state.layers.splice(j,0,v)})}
function mergeDown(){const i=state.layers.findIndex(l=>l.id===state.activeId);if(i<=0){toast('下に結合できるレイヤーがありません');return}layerAction(()=>{const top=state.layers[i],bottom=state.layers[i-1],ctx=bottom.canvas.getContext('2d');if(top.visible){ctx.save();ctx.globalAlpha=top.opacity;ctx.globalCompositeOperation=top.blend;ctx.drawImage(top.canvas,0,0);ctx.restore();}bottom.name=bottom.name+' + '+top.name;state.layers.splice(i,1);state.activeId=bottom.id})}
function importImage(file){if(!file)return;const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{layerAction(()=>{const l=newLayer(file.name.replace(/\.[^.]+$/,'')||'Imported Image');const scale=Math.min(state.width/img.width,state.height/img.height,1);const w=img.width*scale,h=img.height*scale;l.canvas.getContext('2d').drawImage(img,(state.width-w)/2,(state.height-h)/2,w,h);state.layers.push(l);state.activeId=l.id});URL.revokeObjectURL(url);toast('画像を新規レイヤーに読み込みました')};img.onerror=()=>{URL.revokeObjectURL(url);toast('画像を読み込めませんでした')};img.src=url}
async function setReferenceData(data,opacity=.3,visible=true,scale=1,x=0,y=0){const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=data});state.reference={data,image:img,opacity,visible,scale:Number(scale)||1,x:Number(x)||0,y:Number(y)||0};$('traceOpacity').value=Math.round(opacity*100);$('traceOpacityValue').textContent=Math.round(opacity*100)+'%';$('traceVisible').checked=visible;renderLayers();markDirty()}
function loadTraceImage(file){if(!file)return;const r=new FileReader();r.onload=async()=>{try{await setReferenceData(String(r.result),Number($('traceOpacity').value)/100,true);toast('写真を下敷きに設定しました。別レイヤーに線を描けます')}catch(e){toast('下敷き画像を読み込めません: '+e.message)}};r.onerror=()=>toast('画像ファイルを読み込めませんでした');r.readAsDataURL(file)}
function drawTextOnLayer(layer,meta){const c=layer.canvas,ctx=c.getContext('2d');ctx.clearRect(0,0,state.width,state.height);ctx.save();ctx.font=`${meta.weight||400} ${meta.size||72}px "${meta.font||'Segoe UI'}"`;ctx.textBaseline='top';ctx.textAlign=meta.align||'left';ctx.fillStyle=meta.color||state.color;const lines=String(meta.text||'').split('\n');if(meta.stroke&&meta.strokeWidth>0){ctx.strokeStyle=meta.strokeColor||'#ffffff';ctx.lineWidth=meta.strokeWidth;ctx.lineJoin='round';lines.forEach((line,i)=>ctx.strokeText(line,meta.x,meta.y+i*(meta.size||72)*1.25))}lines.forEach((line,i)=>ctx.fillText(line,meta.x,meta.y+i*(meta.size||72)*1.25));ctx.restore()}
function placeTextAt(point){const text=$('textContent').value;if(!text.trim()){toast('右側の文字欄にテキストを入力してください');$('textContent').focus();return}layerAction(()=>{const l=newLayer('Text · '+text.slice(0,16));l.textData={text,x:point.x,y:point.y,font:$('textFont').value,size:Math.max(4,Math.min(1200,Number($('textSize').value)||72)),weight:Number($('textWeight').value)||400,align:$('textAlign').value||'left',color:state.color,stroke:$('textStroke').checked,strokeColor:$('textStrokeColor').value||'#ffffff',strokeWidth:Number($('textStrokeWidth').value)||0};drawTextOnLayer(l,l.textData);state.layers.push(l);state.activeId=l.id});toast('文字レイヤーを配置しました')}
function editSelectedText(){const l=activeLayer();if(!l||!l.textData){toast('選択中のレイヤーは編集可能な文字レイヤーではありません');return}const next=prompt('文字内容を編集',l.textData.text);if(next===null)return;layerAction(()=>{l.textData.text=next;drawTextOnLayer(l,l.textData);l.name='Text · '+next.slice(0,16)})}

function applyCanvasPreset(id,modal=false){stopAnimationPlayback({save:false,quiet:true});
 const presets={square:[2048,2048,300],landscape:[1920,1080,96],portrait:[1080,1920,96],a4p:[2480,3508,300],a4l:[3508,2480,300],a5p:[1748,2480,300],b5p:[2500,3543,350],comic:[3508,4961,500],'4k':[3840,2160,96],social:[1080,1350,96],story:[1080,1920,96],banner:[2560,720,96]};
 const v=presets[id];if(!v)return;const [w,h,dpi]=v;if(w*h>20000000){toast('このプリセットは安定動作の上限を超えます');return}
 if(modal){$('newWidth').value=w;$('newHeight').value=h;$('newDpi').value=dpi;return}
 const oldW=state.width,oldH=state.height,dx=Math.round((w-oldW)/2),dy=Math.round((h-oldH)/2);
 for(const layer of state.layers){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(layer.canvas,dx,dy);layer.canvas=c;if(layer.textData){layer.textData.x+=dx;layer.textData.y+=dy}}
 state.width=w;state.height=h;state.dpi=dpi;$('documentDpi').value=dpi;updateHistoryLimit();state.history=[];state.redo=[];state.animationFrames=[];state.frameIndex=0;resizeDisplay();fitView();ensureInitialFrame();renderTimeline();updateUI();markDirty();toast(`キャンバス変更: ${w} × ${h} px · 描画を中央に保持`)
}
function openNewDialog(){$('newWidth').value=appSettings?.defaultWidth||state.width;$('newHeight').value=appSettings?.defaultHeight||state.height;$('newDpi').value=appSettings?.defaultDpi||state.dpi||300;if($('newProjectName'))$('newProjectName').value='Untitled';$('newBackground').value=appSettings?.defaultBackground||state.bg;$('newPreset').value='custom';window.PF_MODE_UI?.prepareNewDialog?.();$('newModal').classList.remove('hidden')}
function createNew(){stopAnimationPlayback({save:false,quiet:true});const w=Math.max(1,Math.min(12000,Number($('newWidth').value)||1600)),h=Math.max(1,Math.min(12000,Number($('newHeight').value)||1000));if(w*h>20000000){toast('キャンバスが大きすぎます（安定動作の上限は2000万px）');return}state.width=w;state.height=h;state.dpi=Math.max(36,Math.min(1200,Number($('newDpi').value)||300));$('documentDpi').value=state.dpi;updateHistoryLimit();state.bg=$('newBackground').value;state.projectName=String($('newProjectName')?.value||'').trim().slice(0,80)||'Untitled';state.projectId=createProjectId();state.projectCreatedAt=Date.now();state.projectUpdatedAt=state.projectCreatedAt;$('canvasPreset').value='custom';state.reference=null;state.animationFrames=[];state.frameIndex=0;state.paperTexture='none';state.layers=[newLayer('Background')];state.activeId=state.layers[0].id;state.history=[];state.redo=[];state.dirty=false;$('newModal').classList.add('hidden');resizeDisplay();fitView();updateUI();renderLayers();ensureInitialFrame();renderTimeline();markDirty();window.dispatchEvent(new CustomEvent('pf:document-created',{detail:{width:state.width,height:state.height,mode:document.documentElement.dataset.pfWorkspaceMode||'beginner'}}))}

function applyFilter(name){const l=activeLayer();if(!l)return;layerAction(()=>{const c=l.canvas,ctx=c.getContext('2d');if(['blur','hue'].includes(name)){const tmp=document.createElement('canvas');tmp.width=state.width;tmp.height=state.height;const t=tmp.getContext('2d');t.filter=name==='blur'?'blur(3px)':'hue-rotate(95deg) saturate(1.25)';t.drawImage(c,0,0);ctx.clearRect(0,0,state.width,state.height);ctx.drawImage(tmp,0,0);return}const im=ctx.getImageData(0,0,state.width,state.height),d=im.data;for(let i=0;i<d.length;i+=4){let r=d[i],g=d[i+1],b=d[i+2];if(d[i+3]===0)continue;switch(name){case'grayscale':{const v=.299*r+.587*g+.114*b;r=g=b=v;break}case'sepia':{const nr=.393*r+.769*g+.189*b,ng=.349*r+.686*g+.168*b,nb=.272*r+.534*g+.131*b;r=nr;g=ng;b=nb;break}case'invert':r=255-r;g=255-g;b=255-b;break;case'pixelate':{const v=Math.round((r+g+b)/3/32)*32;r=g=b=v;break}case'posterize':r=Math.round(r/64)*64;g=Math.round(g/64)*64;b=Math.round(b/64)*64;break;case'noise':{const n=(Math.random()-.5)*38;r+=n;g+=n;b+=n;break}case'threshold':{const v=(r+g+b)/3>128?255:0;r=g=b=v;break}case'emboss':{const v=(r+g+b)/3;r=Math.min(255,v+18);g=Math.max(0,v-8);b=Math.max(0,v-28);break}case'sharpen':{const avg=(r+g+b)/3;r=Math.min(255,avg+(r-avg)*1.7);g=Math.min(255,avg+(g-avg)*1.7);b=Math.min(255,avg+(b-avg)*1.7);break}case'edge':{const v=Math.min(255,Math.abs(r-g)*2+Math.abs(g-b)*2);r=g=b=v;break}}d[i]=Math.max(0,Math.min(255,r));d[i+1]=Math.max(0,Math.min(255,g));d[i+2]=Math.max(0,Math.min(255,b))}ctx.putImageData(im,0,0)});toast('フィルターを適用しました')}
function flipLayers(axis){layerAction(()=>{for(const l of state.layers){const c=l.canvas,ctx=c.getContext('2d'),tmp=document.createElement('canvas');tmp.width=state.width;tmp.height=state.height;const t=tmp.getContext('2d');if(axis==='h'){t.translate(state.width,0);t.scale(-1,1)}else{t.translate(0,state.height);t.scale(1,-1)}t.drawImage(c,0,0);ctx.clearRect(0,0,state.width,state.height);ctx.drawImage(tmp,0,0);if(l.textData){if(axis==='h')l.textData.x=state.width-l.textData.x;else l.textData.y=state.height-l.textData.y}}});toast(axis==='h'?'左右反転しました':'上下反転しました')}
function rotateLayers90(){layerAction(()=>{for(const l of state.layers){const tmp=document.createElement('canvas');tmp.width=state.width;tmp.height=state.height;const t=tmp.getContext('2d');t.translate(state.width/2,state.height/2);t.rotate(Math.PI/2);t.drawImage(l.canvas,-state.width/2,-state.height/2);l.canvas.getContext('2d').clearRect(0,0,state.width,state.height);l.canvas.getContext('2d').drawImage(tmp,0,0)}});toast('レイヤー内容を90°回転しました')}
function randomPalette(){const hue=Math.floor(Math.random()*360),colors=[];for(let i=0;i<8;i++){const h=(hue+i*45)%360,s=55+(i%3)*15,l=35+(i%4)*12;colors.push(`hsl(${h} ${s}% ${l}%)`)}$('swatches').innerHTML='';colors.forEach(c=>{const b=document.createElement('button');b.className='swatch';b.style.background=c;b.title=c;b.onclick=()=>{const cv=document.createElement('canvas').getContext('2d');cv.fillStyle=c;const rgb=cv.fillStyle.match(/[0-9.]+/g).slice(0,3).map(Number);setColor('#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''))};$('swatches').appendChild(b)});toast('ランダム配色を生成しました')}
function captureFrameData(){return{layers:state.layers.map(l=>({id:l.id,name:l.name,visible:l.visible,opacity:l.opacity,blend:l.blend,textData:l.textData?{...l.textData}:null,image:l.canvas.toDataURL('image/png')}))}}
function frameImage(item){
 if(!item?.image)return Promise.resolve(null);
 const cached=frameImageCache.get(item);if(cached)return cached;
 const promise=new Promise((resolve,reject)=>{
  const image=new Image();image.decoding='async';
  image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('フレーム画像を読み込めません'));
  image.src=item.image;
  if(image.complete&&image.naturalWidth)resolve(image);
 });
 frameImageCache.set(item,promise);return promise;
}
function saveCurrentFrame(dirty=true){
 if(!state.animationFrames.length){state.animationFrames=[{name:'1',layers:captureFrameData().layers}];state.frameIndex=0;return}
 const frame=state.animationFrames[state.frameIndex];
 if(frame){frame.layers=captureFrameData().layers;frameThumbCache.delete(frame);}
 if(dirty)markDirty();
}
function ensureInitialFrame(){if(!state.animationFrames.length){state.animationFrames=[{name:'1',layers:captureFrameData().layers}];state.frameIndex=0;renderTimeline()}}
async function refreshOnionGhost(){
 const request=++state.onionGhostToken;state.onionGhost=[];
 if(!state.onionSkin||state.animationFrames.length<2)return;
 const count=state.animationFrames.length,indices=[(state.frameIndex-1+count)%count,(state.frameIndex+1)%count];
 const specs=[{tint:'#57a6ff',alpha:.18},{tint:'#ff796d',alpha:.13}];
 try{
  const ghosts=await Promise.all(indices.map(async(index,k)=>{
   const frame=state.animationFrames[index];if(!frame?.layers)return null;
   const layers=await Promise.all(frame.layers.map(async item=>({image:await frameImage(item),visible:item.visible!==false,opacity:Number.isFinite(item.opacity)?item.opacity:1,blend:item.blend||'source-over'})));
   return{layers:layers.filter(x=>x.image),tint:specs[k].tint,alpha:specs[k].alpha,index};
  }));
  if(request===state.onionGhostToken&&state.onionSkin)state.onionGhost=ghosts.filter(g=>g?.layers?.length);
 }catch(err){if(request===state.onionGhostToken){state.onionGhost=[];console.warn('Onion skin image load failed',err)}}
}
async function loadFrameData(frame,options={}){
 if(!frame||!Array.isArray(frame.layers))return false;
 const token=Number.isInteger(options.token)?options.token:++state.frameLoadToken;
 const render=options.render!==false,update=options.update!==false,ghost=options.refreshGhost!==false,reuse=options.reuse===true;
 let prepared;
 try{prepared=await Promise.all(frame.layers.map(async item=>({item,image:await frameImage(item)})))}
 catch(err){toast('フレーム読込エラー: '+err.message);return false}
 if(token!==state.frameLoadToken)return false;
 const newLayers=[];const reusable=reuse?state.layers:[];
 for(let i=0;i<prepared.length;i++){
  const {item,image}=prepared[i];
  const layer=reusable[i]&&reusable[i].canvas.width===state.width&&reusable[i].canvas.height===state.height?reusable[i]:newLayer(item.name||'Layer');
  const id=Number(item.id);if(Number.isSafeInteger(id)&&id>0){layer.id=id;nextLayerId=Math.max(nextLayerId,id+1)}else if(!Number.isSafeInteger(layer.id)||layer.id<=0)layer.id=nextLayerId++;
  layer.name=item.name||'Layer';layer.visible=item.visible!==false;layer.opacity=Number.isFinite(item.opacity)?Math.max(0,Math.min(1,item.opacity)):1;layer.blend=item.blend||'source-over';layer.textData=item.textData||null;
  const layerCtx=layer.canvas.getContext('2d');layerCtx.clearRect(0,0,state.width,state.height);if(image)layerCtx.drawImage(image,0,0,state.width,state.height);
  newLayers.push(layer);
 }
 if(token!==state.frameLoadToken)return false;
 if(newLayers.length){state.layers=newLayers;state.activeId=newLayers[newLayers.length-1].id;state.history=[];state.redo=[];}
 if(ghost)await refreshOnionGhost();
 if(token!==state.frameLoadToken)return false;
 if(render)renderLayers();if(update)updateUI();
 return true;
}
async function switchFrame(index,save=true){
 stopAnimationPlayback({save:false,quiet:true});
 if(save)saveCurrentFrame(false);
 if(index<0||index>=state.animationFrames.length)return false;
 const previousIndex=state.frameIndex;state.frameIndex=index;const token=++state.frameLoadToken;
 const ok=await loadFrameData(state.animationFrames[index],{token});
 if(ok){renderTimeline();setStatus(`アニメーション · Frame ${index+1}/${state.animationFrames.length}`)}else if(token===state.frameLoadToken){state.frameIndex=previousIndex;renderTimeline()}
 return ok;
}
function renderTimeline(){
 const box=$('timelineFrames');if(!box)return;const request=++timelineRenderToken;box.replaceChildren();
 const fragment=document.createDocumentFragment();
 state.animationFrames.forEach((frame,index)=>{
  const button=document.createElement('button');button.type='button';button.className='framechip'+(index===state.frameIndex?' active':'');button.dataset.frameIndex=String(index);button.setAttribute('aria-label',`フレーム ${index+1}`);button.title=frame.name||`Frame ${index+1}`;
  const thumb=document.createElement('canvas');thumb.className='framechip-thumb';thumb.width=52;thumb.height=36;thumb.setAttribute('aria-hidden','true');
  const number=document.createElement('span');number.className='framechip-number';number.textContent=String(index+1);
  button.append(thumb,number);button.addEventListener('click',()=>switchFrame(index));fragment.appendChild(button);
  if(index===state.frameIndex){
   const ctx=thumb.getContext('2d');ctx.clearRect(0,0,thumb.width,thumb.height);
   const scale=Math.min(thumb.width/state.width,thumb.height/state.height),w=state.width*scale,h=state.height*scale,x=(thumb.width-w)/2,y=(thumb.height-h)/2;
   for(const layer of state.layers){if(layer.visible){ctx.save();ctx.globalAlpha=layer.opacity;ctx.globalCompositeOperation=layer.blend||'source-over';ctx.drawImage(layer.canvas,x,y,w,h);ctx.restore()}}
  }else{
   const cached=frameThumbCache.get(frame);
   if(cached){cached.then(url=>{if(request===timelineRenderToken&&thumb.isConnected){const img=new Image();img.onload=()=>{if(thumb.isConnected)thumb.getContext('2d').drawImage(img,0,0,thumb.width,thumb.height)};img.src=url}}).catch(()=>{});}
   else{
    const promise=Promise.all(frame.layers.map(async item=>({item,image:await frameImage(item)}))).then(items=>{
     const c=document.createElement('canvas');c.width=thumb.width;c.height=thumb.height;const ctx=c.getContext('2d');const scale=Math.min(c.width/state.width,c.height/state.height),w=state.width*scale,h=state.height*scale,x=(c.width-w)/2,y=(c.height-h)/2;
     for(const {item,image} of items){if(!image||item.visible===false)continue;ctx.save();ctx.globalAlpha=Number.isFinite(item.opacity)?item.opacity:1;ctx.globalCompositeOperation=item.blend||'source-over';ctx.drawImage(image,x,y,w,h);ctx.restore()}
     return c.toDataURL('image/png');
    });frameThumbCache.set(frame,promise);promise.then(url=>{if(request===timelineRenderToken&&thumb.isConnected){const img=new Image();img.onload=()=>{if(thumb.isConnected)thumb.getContext('2d').drawImage(img,0,0,thumb.width,thumb.height)};img.src=url}}).catch(()=>{});
   }
  }
 });
 box.appendChild(fragment);
 const counter=$('animationFrameCount');if(counter)counter.textContent=`${state.animationFrames.length} フレーム · ${state.frameIndex+1}/${Math.max(1,state.animationFrames.length)}`;
}
function addAnimationFrame(duplicate=true){
 stopAnimationPlayback({save:false,quiet:true});saveCurrentFrame(false);
 const base=state.animationFrames[state.frameIndex]||captureFrameData();const clone=JSON.parse(JSON.stringify(base));clone.name=`Frame ${state.animationFrames.length+1}`;
 if(!duplicate){const blank=document.createElement('canvas');blank.width=state.width;blank.height=state.height;const blankUrl=blank.toDataURL('image/png');clone.layers=clone.layers.map(l=>({...l,image:blankUrl,textData:null}))}
 state.animationFrames.splice(state.frameIndex+1,0,clone);state.frameIndex++;const token=++state.frameLoadToken;
 loadFrameData(clone,{token}).then(ok=>{if(ok){renderTimeline();markDirty();toast(duplicate?'フレームを複製しました':'空のフレームを追加しました')}});
}
function deleteAnimationFrame(){
 if(state.animationFrames.length<=1){toast('最後のフレームは削除できません');return}
 stopAnimationPlayback({save:false,quiet:true});saveCurrentFrame(false);state.animationFrames.splice(state.frameIndex,1);state.frameIndex=Math.min(state.frameIndex,state.animationFrames.length-1);switchFrame(state.frameIndex,false);markDirty();
}
function moveAnimationFrame(direction){
 stopAnimationPlayback({save:false,quiet:true});saveCurrentFrame(false);const from=state.frameIndex,to=from+direction;
 if(to<0||to>=state.animationFrames.length)return;
 const [frame]=state.animationFrames.splice(from,1);state.animationFrames.splice(to,0,frame);state.frameIndex=to;renderTimeline();markDirty();toast('フレームの順番を変更しました');
}
function stopAnimationPlayback({save=true,quiet=false}={}){
 const wasPlaying=state.animationPlaying||state.frameRaf||state.frameTimer;
 state.animationPlaying=false;if(state.frameRaf)cancelAnimationFrame(state.frameRaf);state.frameRaf=0;
 if(state.frameTimer){clearTimeout(state.frameTimer);clearInterval(state.frameTimer)}state.frameTimer=null;
 if(wasPlaying){state.frameLoadToken++;$('animationPlay').textContent='▶ 再生';$('animationPlay').setAttribute('aria-pressed','false');if(save)saveCurrentFrame(false);refreshOnionGhost().then(()=>{updateUI();renderLayers()});renderTimeline();if(!quiet)setStatus('アニメーションを停止しました')}
}
async function toggleAnimation(){
 if(state.animationPlaying){stopAnimationPlayback();return}
 if(state.animationFrames.length<2){toast('再生には2フレーム以上必要です');return}
 saveCurrentFrame(false);state.animationPlaying=true;state.animationDirection=1;state.playbackNextAt=performance.now();
 $('animationPlay').textContent='■ 停止';$('animationPlay').setAttribute('aria-pressed','true');setStatus('アニメーション再生中');
 const tick=async()=>{
  if(!state.animationPlaying)return;
  const now=performance.now(),fps=Math.max(1,Math.min(60,Number($('animationFps').value)||12)),delay=1000/fps;
  if(now+1>=state.playbackNextAt){
   let next=state.frameIndex+state.animationDirection;const mode=$('animationLoopMode')?.value||'loop';
   if(next>=state.animationFrames.length||next<0){
    if(mode==='once'){stopAnimationPlayback({save:false,quiet:true});return}
    if(mode==='pingpong'){state.animationDirection*=-1;next=state.frameIndex+state.animationDirection}
    else next=next>=state.animationFrames.length?0:state.animationFrames.length-1;
   }
   const token=++state.frameLoadToken;
   const ok=await loadFrameData(state.animationFrames[next],{token,render:false,update:false,refreshGhost:false,reuse:true});
   if(ok){state.frameIndex=next;renderTimeline();if(!state.animationPlaying){renderLayers();return}renderLayers();setStatus(`再生中 · ${next+1}/${state.animationFrames.length} · ${fps} FPS`)}
   else{if(!state.animationPlaying){renderTimeline();return}stopAnimationPlayback({save:false,quiet:true});toast('フレームを読み込めないため再生を停止しました');return}
   state.playbackNextAt=Math.max(state.playbackNextAt+delay,performance.now()+1);
  }
  if(state.animationPlaying)state.frameRaf=requestAnimationFrame(tick);
 };
 state.frameRaf=requestAnimationFrame(tick);
}
async function drawAnimationFrame(ctx,frame){
 ctx.clearRect(0,0,state.width,state.height);drawDocumentBase(ctx,true);
 const prepared=await Promise.all(frame.layers.map(async item=>({item,image:await frameImage(item)})));
 for(const {item,image} of prepared){if(!image||item.visible===false)continue;ctx.save();ctx.globalAlpha=Number.isFinite(item.opacity)?Math.max(0,Math.min(1,item.opacity)):1;ctx.globalCompositeOperation=item.blend||'source-over';ctx.drawImage(image,0,0,state.width,state.height);ctx.restore()}
}
function waitAnimation(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function exportAnimationWebM(){
 if(state.animationFrames.length<1){toast('書き出すフレームがありません');return}
 if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){toast('このブラウザは動画書き出しに対応していません');return}
 stopAnimationPlayback({save:false,quiet:true});saveCurrentFrame(false);const originalIndex=state.frameIndex;
 const fps=Math.max(1,Math.min(60,Number($('animationFps').value)||12)),out=document.createElement('canvas');out.width=state.width;out.height=state.height;
 const stream=out.captureStream(fps),ctx=out.getContext('2d');let mime='video/webm;codecs=vp9';if(!MediaRecorder.isTypeSupported(mime))mime='video/webm';const chunks=[];let recorder;
 try{
  recorder=new MediaRecorder(stream,{mimeType:mime});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const done=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error('MediaRecorder error'))});recorder.start(100);
  const interval=1000/fps;
  for(const frame of state.animationFrames){await drawAnimationFrame(ctx,frame);if(typeof stream.getVideoTracks()[0]?.requestFrame==='function')stream.getVideoTracks()[0].requestFrame();await waitAnimation(interval)}
  recorder.stop();await done;const blob=new Blob(chunks,{type:recorder.mimeType||mime});if(!blob.size)throw new Error('動画データが空です');downloadBlob(blob,(state.projectName||'animation')+'.webm');toast('WebM動画を書き出しました');
 }catch(e){try{recorder?.stop()}catch{}toast('動画の書き出しに失敗: '+(e?.message||e))}
 finally{stream.getTracks().forEach(t=>t.stop());await switchFrame(originalIndex,false)}
}
async function exportAnimationPNGSequence(){
 if(!state.animationFrames.length){toast('書き出すフレームがありません');return}
 stopAnimationPlayback({save:false,quiet:true});saveCurrentFrame(false);const originalIndex=state.frameIndex;showProgress('PNG連番を書き出し中','各フレームを高画質で作成しています',0);
 try{
  const files=[],ctxCanvas=document.createElement('canvas');ctxCanvas.width=state.width;ctxCanvas.height=state.height;const ctx=ctxCanvas.getContext('2d');
  for(let i=0;i<state.animationFrames.length;i++){
   await drawAnimationFrame(ctx,state.animationFrames[i]);const blob=await new Promise(resolve=>ctxCanvas.toBlob(resolve,'image/png'));
   if(!blob)throw new Error(`Frame ${i+1} のPNG化に失敗`);
   files.push({name:`frames/frame_${String(i+1).padStart(4,'0')}.png`,data:new Uint8Array(await blob.arrayBuffer())});
   updateProgress((i+1)/state.animationFrames.length*92,`フレーム ${i+1}/${state.animationFrames.length}`);await nextFrameUI();
  }
  const meta={format:'PIXEL_FORGE_FRAME_SEQUENCE',version:1,fps:Number($('animationFps').value)||12,width:state.width,height:state.height,frames:state.animationFrames.length};files.push({name:'sequence.json',data:new TextEncoder().encode(JSON.stringify(meta,null,2))});
  downloadBlob(zipStore(files),(state.projectName||'animation')+'_PNG連番.zip');toast('PNG連番ZIPを書き出しました');
 }catch(e){toast('PNG連番の書き出しに失敗: '+(e?.message||e))}
 finally{hideProgress();await switchFrame(originalIndex,false)}
}
async function exportAnimationSpriteSheet(){
 if(!state.animationFrames.length){toast('書き出すフレームがありません');return}
 stopAnimationPlayback({save:false,quiet:true});saveCurrentFrame(false);const originalIndex=state.frameIndex;
 const cols=Math.min(6,Math.max(1,Math.ceil(Math.sqrt(state.animationFrames.length)))),rows=Math.ceil(state.animationFrames.length/cols),w=state.width*cols,h=state.height*rows;
 if(w*h>40000000){toast('スプライトシートが大きすぎます（最大4000万px）。PNG連番ZIPをご利用ください');return}
 showProgress('スプライトシートを作成中','フレームをグリッド配置しています',0);
 try{
  const sheet=document.createElement('canvas');sheet.width=w;sheet.height=h;const ctx=sheet.getContext('2d');
  for(let i=0;i<state.animationFrames.length;i++){const x=(i%cols)*state.width,y=Math.floor(i/cols)*state.height;const cell=document.createElement('canvas');cell.width=state.width;cell.height=state.height;await drawAnimationFrame(cell.getContext('2d'),state.animationFrames[i]);ctx.drawImage(cell,x,y);updateProgress((i+1)/state.animationFrames.length*95,`フレーム ${i+1}/${state.animationFrames.length}`);await nextFrameUI()}
  const blob=await new Promise(resolve=>sheet.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNG画像を作成できません');downloadBlob(blob,(state.projectName||'animation')+'_spritesheet.png');toast('スプライトシートを書き出しました');
 }catch(e){toast('スプライトシートの書き出しに失敗: '+(e?.message||e))}
 finally{hideProgress();await switchFrame(originalIndex,false)}
}
// Minimal standards-compliant, uncompressed ZIP writer for OpenRaster packages.
function crc32(bytes){let c=-1;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^-1)>>>0}
function zipStore(files){const enc=new TextEncoder(),local=[],central=[];let offset=0;for(const file of files){const name=enc.encode(file.name),data=file.data instanceof Uint8Array?file.data:new Uint8Array(file.data),crc=crc32(data);const lh=new Uint8Array(30+name.length),lv=new DataView(lh.buffer);lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);lv.setUint16(8,0,true);lv.setUint16(12,0x21,true);lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);lh.set(name,30);local.push(lh,data);const ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(10,0,true);cv.setUint16(14,0x21,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);ch.set(name,46);central.push(ch);offset+=lh.length+data.length}const centralSize=central.reduce((a,b)=>a+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob([...local,...central,end],{type:'image/openraster'})}
async function exportOpenRaster(){try{const files=[],enc=new TextEncoder();files.push({name:'mimetype',data:enc.encode('image/openraster')});const children=[];for(let i=state.layers.length-1;i>=0;i--){const l=state.layers[i],blob=await new Promise(r=>l.canvas.toBlob(r,'image/png'));files.push({name:`data/layer${i}.png`,data:new Uint8Array(await blob.arrayBuffer())});const safeName=String(l.name).replace(/[&<>\"']/g,'_');const oraMode=({'source-over':'svg:src-over',multiply:'svg:multiply',screen:'svg:screen',overlay:'svg:overlay',darken:'svg:darken',lighten:'svg:lighten'}[l.blend]||'svg:src-over');children.push(`<layer name="${safeName}" src="data/layer${i}.png" opacity="${l.opacity}" visibility="${l.visible?'visible':'hidden'}" composite-op="${oraMode}" x="0" y="0"/>`)}const base=makeCanvas(),bc=base.getContext('2d');drawDocumentBase(bc,true);const bb=await new Promise(r=>base.toBlob(r,'image/png'));files.push({name:'data/background.png',data:new Uint8Array(await bb.arrayBuffer())});children.push('<layer name="Paper and tracing reference" src="data/background.png" opacity="1.0" visibility="visible" composite-op="svg:src-over" x="0" y="0"/>');const merged=mergeComposite();const mb=await new Promise(r=>merged.toBlob(r,'image/png'));files.push({name:'mergedimage.png',data:new Uint8Array(await mb.arrayBuffer())});const safeDocName=String(state.projectName).replace(/[&<>\"']/g,'_');files.push({name:'stack.xml',data:enc.encode(`<?xml version="1.0" encoding="UTF-8"?><image version="0.0.1" w="${state.width}" h="${state.height}" name="${safeDocName}"><stack>${children.join('')}</stack></image>`)});const thumb=document.createElement('canvas');thumb.width=128;thumb.height=Math.max(1,Math.round(128*state.height/state.width));thumb.getContext('2d').drawImage(merged,0,0,thumb.width,thumb.height);const tb=await new Promise(r=>thumb.toBlob(r,'image/png'));files.push({name:'Thumbnails/thumbnail.png',data:new Uint8Array(await tb.arrayBuffer())});downloadBlob(zipStore(files),(state.projectName||'artwork')+'.ora');toast('OpenRasterを書き出しました（レイヤー対応）')}catch(e){toast('ORA書き出しエラー: '+e.message)}}
const METAL_SWATCHES=[
 ['#4A3518','アンティークゴールド'],['#60451B','ブロンズゴールド'],['#76551A','ダークゴールド'],['#8A641F','オールドゴールド'],['#A0782C','真鍮'],['#B08D3C','クラシックゴールド'],['#C29B45','ゴールド'],['#D4AF37','メタリックゴールド'],['#E0C16D','シャンパンゴールド'],['#F0D58A','ライトゴールド'],['#F8E7B0','ペールゴールド'],['#FFF1C9','アイボリーゴールド'],['#7F5A36','ブロンズ'],['#A66A43','カッパー'],['#BD8060','ローズカッパー'],['#D9A07E','ローズゴールド'],['#E8BFA7','ピンクゴールド'],['#8D9298','ガンメタル'],['#AEB4BB','シルバー'],['#D5D9DE','プラチナ'],['#F4F6F8','クローム'],['#6C4B38','ダークブロンズ'],['#B87333','銅'],['#E6C89C','ペールブラス']
];
const GLOW_SWATCHES=[['#FF1744','レーザーレッド'],['#FF3D00','ネオンオレンジ'],['#FF6D00','発光アンバー'],['#FFAB00','発光イエロー'],['#F9F871','ネオンレモン'],['#C6FF00','ネオンライム'],['#76FF03','レーザーグリーン'],['#00E676','ネオングリーン'],['#00E5A8','アクアグリーン'],['#00E5FF','ネオンシアン'],['#00B0FF','エレクトリックブルー'],['#2979FF','ネオンブルー'],['#651FFF','ネオンバイオレット'],['#7C4DFF','発光パープル'],['#D500F9','ネオンマゼンタ'],['#F500D4','ネオンピンク'],['#FF4081','ホットピンク'],['#FF80AB','ライトネオンピンク'],['#B2FF59','蛍光黄緑'],['#84FFFF','蛍光アクア']];
const JEWEL_SWATCHES=[['#063B2E','エメラルド'],['#087E69','グリーンジェード'],['#005F73','ディープティール'],['#0A4D8C','サファイア'],['#183A72','ラピス'],['#3B1B6D','アメジスト'],['#6D1B55','ルビー'],['#9D174D','ガーネット'],['#6B2737','ワイン'],['#553311','タイガーアイ'],['#A66A00','アンバー'],['#B76E79','モルガナイト'],['#4B5563','スレート'],['#263445','ミッドナイト'],['#4C3A6A','アイリス'],['#22577A','オーシャン']];
const PASTEL_SWATCHES=[['#F9D5E5','桜ピンク'],['#F7C8D0','ローズミルク'],['#FAD7B5','ピーチ'],['#FCE7A8','バニラ'],['#E6F3B5','ミントレモン'],['#CDECCF','ミント'],['#BFE8E5','アクアミント'],['#CBE7F5','スカイ'],['#D4D9FA','ペリウィンクル'],['#E4D2F4','ラベンダー'],['#F0D3EA','ライラック'],['#F5E6D3','サンド']];
function hslHex(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>{const q=k(n);return l-a*Math.max(-1,Math.min(q-3,9-q,1))};return'#'+[f(0),f(8),f(4)].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('').toUpperCase()}
function getExpandedPalette(){const rows=defaultSwatches.map((color,i)=>({color,name:'基本色 '+(i+1),category:'base'}));for(const [color,name] of METAL_SWATCHES)rows.push({color,name,category:'gold'});for(const [color,name] of GLOW_SWATCHES)rows.push({color,name,category:'glow'});for(const [color,name] of JEWEL_SWATCHES)rows.push({color,name,category:'jewel'});for(const [color,name] of PASTEL_SWATCHES)rows.push({color,name,category:'pastel'});const hues=[0,18,35,48,72,105,135,165,185,205,225,250,270,295,320,340];for(const hue of hues){for(const light of [18,25,32,40,48,56,64,72,80,88])rows.push({color:hslHex(hue,68,light),name:`色相 ${hue}° · ${light}%`,category:'base'})}return rows}
const expandedPalette=getExpandedPalette();
function renderColorPalette(){const host=$('swatches');if(!host)return;const q=String($('paletteSearch')?.value||'').trim().toLowerCase(),cat=$('paletteCategory')?.value||'all';host.replaceChildren();for(const item of expandedPalette){if(cat!=='all'&&item.category!==cat)continue;if(q&&!(`${item.color} ${item.name} ${item.category}`).toLowerCase().includes(q))continue;const b=document.createElement('button');b.type='button';b.className='swatch';b.style.background=item.color;b.title=`${item.name} · ${item.color}`;b.setAttribute('aria-label',`${item.name} ${item.color}`);b.addEventListener('click',()=>setColor(item.color));host.appendChild(b)}}
function initSwatches(){renderColorPalette()}
let progressHideTimer=null;
function showProgress(title,text,percent=0){
 const overlay=$('busyOverlay');if(!overlay)return;
 overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');
 const titleNode=$('busyTitle'),textNode=$('busyText'),metaNode=$('busyBytes');
 if(titleNode)titleNode.textContent=title||'処理中...';if(textNode)textNode.textContent=text||'処理しています';
 if(metaNode)metaNode.textContent='画面は応答中です';
 updateProgress(percent,text);
}
function updateProgress(percent,text,meta){
 const p=Math.max(0,Math.min(100,Math.round(Number(percent)||0))),bar=$('busyProgress'),percentNode=$('busyPercent');
 if(bar){bar.style.width=p+'%';bar.setAttribute('aria-valuenow',String(p));}
 if(percentNode)percentNode.textContent=p+'%';
 if(text&&$('busyText'))$('busyText').textContent=text;
 if(meta!==undefined&&$('busyBytes'))$('busyBytes').textContent=String(meta);
}
function hideProgress(){
 clearTimeout(progressHideTimer);const overlay=$('busyOverlay');if(overlay){overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');}
 document.body.classList.remove('pf-saving');
}
function nextFrameUI(){return new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));}
let pixelWorker=null,workerSerial=0,workerPending=new Map(),workerHealth='未接続';
function setWorkerHealth(text){workerHealth=text;const node=$('workerHealth');if(node)node.textContent='処理エンジン: '+text;}
function getPixelWorker(){
 if(pixelWorker)return pixelWorker;
 if(!('Worker' in window))throw new Error('このブラウザではWorkerが利用できません');
 const url=new URL('./js/water-worker-v8.js',document.baseURI);
 const w=new Worker(url,{name:'PixelForgePixelEngine'});pixelWorker=w;
 w.onmessage=e=>{const m=e.data||{},job=workerPending.get(m.id);if(!job)return;if(m.type==='progress'){job.progress(m.percent,m.phase||'処理中...');return;}workerPending.delete(m.id);clearTimeout(job.timer);if(m.type==='error')job.reject(new Error(m.message));else job.resolve({data:new Uint8ClampedArray(m.buffer),count:m.count||0,bounds:m.bounds||null});};
 const fail=e=>{const msg=e?.message||'Worker処理に失敗しました';for(const [id,j] of workerPending){clearTimeout(j.timer);j.reject(new Error(msg));}workerPending.clear();try{w.terminate()}catch(_){}pixelWorker=null;setWorkerHealth('代替エンジンへ切替');};
 w.onerror=fail;w.onmessageerror=fail;setWorkerHealth('Worker接続済み');return w;
}
function runPixelWorker(action,payload,data){
 return new Promise((resolve,reject)=>{
  let worker;try{worker=getPixelWorker()}catch(err){reject(err);return;}
  const id=++workerSerial,copy=new Uint8ClampedArray(data),timeout=action==='diffuse'?180000:90000;
  const timer=setTimeout(()=>{const job=workerPending.get(id);if(!job)return;workerPending.delete(id);try{worker.terminate()}catch(_){}pixelWorker=null;job.reject(new Error('Workerが時間内に応答しませんでした'));setWorkerHealth('応答遅延・代替エンジンへ切替');},timeout);
  workerPending.set(id,{resolve,reject,timer,progress:(p,t)=>updateProgress(p,t)});
  try{worker.postMessage({id,action,...payload,buffer:copy.buffer},[copy.buffer]);}catch(err){clearTimeout(timer);workerPending.delete(id);try{worker.terminate()}catch(_){}pixelWorker=null;reject(err);}
 });
}
const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
async function fallbackFill(payload,input,progress){
 const {width,height,x,y,color,tolerance=24,opacity=1,contiguous=true,feather=0}=payload,data=new Uint8ClampedArray(input),sx=Math.floor(x),sy=Math.floor(y),total=width*height;
 if(sx<0||sy<0||sx>=width||sy>=height)return{data,count:0,bounds:null};
 const seed=(sy*width+sx)*4,target=[data[seed],data[seed+1],data[seed+2],data[seed+3]],fill=[color[0],color[1],color[2],Math.round(255*Math.max(0,Math.min(1,opacity)))];
 if(target[0]===fill[0]&&target[1]===fill[1]&&target[2]===fill[2]&&target[3]===fill[3])return{data,count:0,bounds:null};
 const match=i=>Math.abs(data[i]-target[0])<=tolerance&&Math.abs(data[i+1]-target[1])<=tolerance&&Math.abs(data[i+2]-target[2])<=tolerance&&Math.abs(data[i+3]-target[3])<=tolerance;
 let count=0,minX=width,minY=height,maxX=-1,maxY=-1;const featherPx=Math.max(0,Math.min(8,feather|0)),mask=featherPx?new Uint8Array(width*height):null;
 const paint=(i,x,y)=>{data[i]=fill[0];data[i+1]=fill[1];data[i+2]=fill[2];data[i+3]=fill[3];if(mask)mask[y*width+x]=1;};
 if(!contiguous){for(let row=0;row<height;row++){for(let col=0;col<width;col++){const i=(row*width+col)*4;if(match(i)){paint(i,col,row);count++;minX=Math.min(minX,col);maxX=Math.max(maxX,col);minY=Math.min(minY,row);maxY=Math.max(maxY,row);}}if(row%48===0){progress(Math.round(row/height*92),'同色領域を検索中');await yieldTask();}}}
 else {const stack=[[sx,sy]];let chunks=0;while(stack.length){const [px0,py]=stack.pop();if(px0<0||py<0||px0>=width||py>=height)continue;let i=(py*width+px0)*4;if(!match(i))continue;let left=px0;while(left>0&&match((py*width+left-1)*4))left--;let up=false,down=false;for(let xx=left;xx<width&&match((py*width+xx)*4);xx++){i=(py*width+xx)*4;paint(i,xx,py);count++;minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);minY=Math.min(minY,py);maxY=Math.max(maxY,py);if(py>0){const ok=match(((py-1)*width+xx)*4);if(ok&&!up)stack.push([xx,py-1]);up=ok;}if(py<height-1){const ok=match(((py+1)*width+xx)*4);if(ok&&!down)stack.push([xx,py+1]);down=ok;}if(++chunks%18000===0){progress(Math.min(94,Math.round(count/total*100)),'領域を塗りつぶし中');await yieldTask();}}}}
 if(mask&&maxX>=0){const ox=Math.max(0,minX-featherPx),oy=Math.max(0,minY-featherPx),ex=Math.min(width-1,maxX+featherPx),ey=Math.min(height-1,maxY+featherPx);for(let y0=oy;y0<=ey;y0+=32){const end=Math.min(ey+1,y0+32);for(let yy=y0;yy<end;yy++)for(let xx=ox;xx<=ex;xx++){const mi=yy*width+xx;if(mask[mi])continue;let best=0;for(let dy=-featherPx;dy<=featherPx;dy++)for(let dx=-featherPx;dx<=featherPx;dx++){const nx=xx+dx,ny=yy+dy;if(nx<0||ny<0||nx>=width||ny>=height||!mask[ny*width+nx])continue;const dist=Math.hypot(dx,dy);if(dist<=featherPx)best=Math.max(best,(featherPx+1-dist)/(featherPx+1)*.45);}if(best>0){const i=mi*4;data[i]=data[i]*(1-best)+fill[0]*best;data[i+1]=data[i+1]*(1-best)+fill[1]*best;data[i+2]=data[i+2]*(1-best)+fill[2]*best;data[i+3]=Math.max(data[i+3],Math.round(fill[3]*best));}}progress(94+Math.round((end-oy)/Math.max(1,ey-oy+1)*5),'境界をなじませ中');await yieldTask();}minX=ox;minY=oy;maxX=ex;maxY=ey;}
 return{data,count,bounds:maxX<0?null:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}};
}
async function fallbackDiffuse(payload,input,progress){
 const {width,height,amount=.5,diffusion=.56,edge=.25,iterations=4,pigment=.25,absorption=.45,granulation=.2,drying=.35,paperTooth=.35,paperFiber=.25}=payload,pixels=width*height;
 if(pixels>16000000)throw new Error('水彩対象が大きすぎます。下敷き以外のレイヤーに分けて範囲を小さくしてください。');
 let src=new Uint8ClampedArray(input),dst=new Uint8ClampedArray(src.length),passes=Math.max(1,Math.min(12,iterations|0));
 const mix=Math.max(0,Math.min(.24,amount*(.07+diffusion*.11+paperTooth*.018)*(1-absorption*.18))),spread=Math.max(0,Math.min(.24,amount*(.055+diffusion*.17)*(1-absorption*.24))),wetDiffusion=Math.max(.01,Math.min(.48,.07+diffusion*.37*(1-absorption*.35))),wetDrying=.003+drying*.018+paperFiber*.001;
 for(let pass=0;pass<passes;pass++){
  for(let y0=0;y0<height;y0+=28){const end=Math.min(height,y0+28);
   for(let y=y0;y<end;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,a=src[i+3];let wr=0,wg=0,wb=0,wa=0,weight=0;
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const xx=x+ox,yy=y+oy;if(xx<0||yy<0||xx>=width||yy>=height)continue;const j=(yy*width+xx)*4,aa=src[j+3]/255,w=(ox===0&&oy===0)?3:(ox===0||oy===0?1:.55);if(aa<=0)continue;const wt=w*aa;weight+=wt;wa+=aa*w;wr+=src[j]*wt;wg+=src[j+1]*wt;wb+=src[j+2]*wt;}
    const avA=wa/8,oldA=a/255,newA=oldA+(avA-oldA)*spread;
    if(weight){dst[i]=src[i]+((wr/weight)-src[i])*mix;dst[i+1]=src[i+1]+((wg/weight)-src[i+1])*mix;dst[i+2]=src[i+2]+((wb/weight)-src[i+2])*mix;}else{dst[i]=src[i];dst[i+1]=src[i+1];dst[i+2]=src[i+2];}
    // Continuous low-frequency pigment variation replaces per-pixel random grain.
    // The old hash noise looked like white/black pinholes on thin watercolor washes.
    let grain=0;if(pigment>0&&granulation>0&&a>0){const u=(x+.5)/Math.max(1,width),v=(y+.5)/Math.max(1,height);const field=.52*Math.sin(u*12.4+Math.sin(v*8.2+pass*.21)*1.25)+.29*Math.cos(v*10.6+Math.sin(u*6.8-pass*.13)*.9)+.19*Math.sin((u+v)*8.1+pass*.17);grain=field*pigment*granulation*(.012+paperTooth*.026+paperFiber*.010)*(1-oldA*.45);}
    const fiberField=.58*Math.sin((x/Math.max(1,width))*14.2+(y/Math.max(1,height))*2.7)+.42*Math.cos((y/Math.max(1,height))*11.6-(x/Math.max(1,width))*1.9);const fiberGrain=paperFiber*paperTooth*.008*fiberField;const tone=1+grain*(.55+absorption*.4)+fiberGrain;dst[i]=Math.max(0,Math.min(255,dst[i]*tone));dst[i+1]=Math.max(0,Math.min(255,dst[i+1]*tone));dst[i+2]=Math.max(0,Math.min(255,dst[i+2]*tone));dst[i+3]=Math.max(0,Math.min(255,newA*255));
   }
   progress(Math.round((pass+(end/height))/passes*82),`顔料拡散 ${pass+1}/${passes}`);await yieldTask();
  }
  [src,dst]=[dst,src];
 }
 if(edge>0){for(let y0=1;y0<height-1;y0+=40){const end=Math.min(height-1,y0+40);for(let y=y0;y<end;y++)for(let x=1;x<width-1;x++){const i=(y*width+x)*4,a=src[i+3];if(a<6)continue;const grad=Math.abs(src[i-4+3]-src[i+4+3])+Math.abs(src[i-width*4+3]-src[i+width*4+3]);if(grad>80){const dark=1-Math.min(.20,edge*.14*(1-drying*.35));src[i]=src[i]*dark;src[i+1]=src[i+1]*dark;src[i+2]=src[i+2]*dark;}}progress(84+Math.round(end/height*12),'縁の顔料を調整中');await yieldTask();}}
 return{data:src,count:pixels,bounds:{x:0,y:0,w:width,h:height}};
}
async function runPixelTask(action,payload,data){
 try{return await runPixelWorker(action,payload,data)}catch(err){console.warn('Pixel worker fallback:',err);setWorkerHealth('代替エンジン稼働');const prog=(p,t)=>updateProgress(p,t);if(action==='fill')return await fallbackFill(payload,data,prog);if(action==='diffuse')return await fallbackDiffuse(payload,data,prog);throw err;}
}
function cropImageData(source,x,y,w,h){const out=new ImageData(w,h),src=source.data,dst=out.data,sw=source.width;for(let row=0;row<h;row++){const si=((y+row)*sw+x)*4,di=row*w*4;dst.set(src.subarray(si,si+w*4),di);}return out;}
async function getAlphaRegionAsync(layer,padding=24,progress=()=>{}){
 const ctx=layer.canvas.getContext('2d');let minX=state.width,minY=state.height,maxX=-1,maxY=-1;const rows=72;
 for(let y0=0;y0<state.height;y0+=rows){const h=Math.min(rows,state.height-y0),band=ctx.getImageData(0,y0,state.width,h),d=band.data;
  for(let y=0;y<h;y++){const yy=y0+y;let i=y*state.width*4;for(let x=0;x<state.width;x++,i+=4)if(d[i+3]>3){if(x<minX)minX=x;if(x>maxX)maxX=x;if(yy<minY)minY=yy;if(yy>maxY)maxY=yy;}}
  if(y0%288===0){progress(Math.round((y0/state.height)*14),'描画範囲をスキャン中');await yieldTask();}
 }
 if(maxX<0)return null;minX=Math.max(0,minX-padding);minY=Math.max(0,minY-padding);maxX=Math.min(state.width-1,maxX+padding);maxY=Math.min(state.height-1,maxY+padding);
 return{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,crop:ctx.getImageData(minX,minY,maxX-minX+1,maxY-minY+1)};
}
function getAlphaRegionLegacy(layer,padding=24){const ctx=layer.canvas.getContext('2d'),all=ctx.getImageData(0,0,state.width,state.height),d=all.data;let minX=state.width,minY=state.height,maxX=-1,maxY=-1;for(let y=0;y<state.height;y++){let i=y*state.width*4;for(let x=0;x<state.width;x++,i+=4)if(d[i+3]>3){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}}
 if(maxX<0)return null;minX=Math.max(0,minX-padding);minY=Math.max(0,minY-padding);maxX=Math.min(state.width-1,maxX+padding);maxY=Math.min(state.height-1,maxY+padding);return{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,crop:ctx.getImageData(minX,minY,maxX-minX+1,maxY-minY+1)};
}
let pixelTaskBusy=false;
async function runFloodFill(p){
 if(pixelTaskBusy||state.operationLocked){toast('別の画像処理が実行中です');return;}const layer=activeLayer();if(!layer)return;const x=Math.floor(p.x),y=Math.floor(p.y);if(x<0||y<0||x>=state.width||y>=state.height)return;
 pixelTaskBusy=true;state.operationLocked=true;const ctx=layer.canvas.getContext('2d');
 try{
  const beforeActive=ctx.getImageData(0,0,state.width,state.height);let source=beforeActive;
  if(state.fillMerged){const merged=mergeComposite();source=merged.getContext('2d').getImageData(0,0,state.width,state.height);}
  showProgress('塗りつぶし中','境界・隣接色を解析しています',2);await nextFrameUI();
  const result=await runPixelTask('fill',{width:state.width,height:state.height,x,y,color:colorRgb(state.color),tolerance:state.fillTolerance,opacity:state.fillOpacity,contiguous:state.fillContiguous,feather:state.fillFeather},source.data);
  if(!result.count){toast('塗りつぶし対象がありません');return;}
  const bounds=result.bounds||{x:0,y:0,w:state.width,h:state.height},paint=hexToRgba(state.color);paint[3]=Math.round(255*state.fillOpacity);
  if(state.fillMerged){const im=ctx.getImageData(bounds.x,bounds.y,bounds.w,bounds.h),d=im.data,src=source.data,out=result.data;for(let yy=0;yy<bounds.h;yy++)for(let xx=0;xx<bounds.w;xx++){const di=(yy*bounds.w+xx)*4,si=((bounds.y+yy)*state.width+(bounds.x+xx))*4;if(out[si]!==src[si]||out[si+1]!==src[si+1]||out[si+2]!==src[si+2]||out[si+3]!==src[si+3]){d[di]=paint[0];d[di+1]=paint[1];d[di+2]=paint[2];d[di+3]=paint[3];}}ctx.putImageData(im,bounds.x,bounds.y);}
  else {const resultImage={data:result.data,width:state.width,height:state.height};const changedRegion=cropImageData(resultImage,bounds.x,bounds.y,bounds.w,bounds.h);ctx.putImageData(changedRegion,bounds.x,bounds.y);}
  const beforeCrop=cropImageData(beforeActive,bounds.x,bounds.y,bounds.w,bounds.h),afterCrop=ctx.getImageData(bounds.x,bounds.y,bounds.w,bounds.h);
  pushHistory({type:'pixelsRegion',layerId:layer.id,x:bounds.x,y:bounds.y,before:beforeCrop,after:afterCrop});renderLayers();markDirty();updateProgress(100,`${result.count.toLocaleString()} px 完了`);setStatus('塗りつぶし: '+result.count.toLocaleString()+' px');
 }catch(err){toast('塗りつぶしエラー: '+err.message);console.error(err)}finally{await nextFrameUI();hideProgress();pixelTaskBusy=false;state.operationLocked=false;}
}
async function applyWaterSimulation(){
 if(pixelTaskBusy||state.operationLocked){toast('別の画像処理が実行中です');return;}const layer=activeLayer();if(!layer)return;
 pixelTaskBusy=true;state.operationLocked=true;
 try{
  showProgress('水彩シミュレーション','顔料のある範囲を探しています',1);await nextFrameUI();
  const margin=Math.ceil(state.size*(.3+state.waterDiffusion*1.5)+12),region=await getAlphaRegionAsync(layer,margin,(p,t)=>updateProgress(p,t));
  if(!region){toast('水彩対象がありません。水彩ブラシで描いてから実行してください');return;}
  if(region.w*region.h>16000000){toast('水彩対象の範囲が大きすぎます。レイヤーを分けるか、対象範囲を小さくしてください');return;}
  const ctx=layer.canvas.getContext('2d'),before=region.crop;showProgress('水彩シミュレーション','水分・顔料・紙への吸収を計算しています',14);await nextFrameUI();
  const iter=Math.max(2,Math.min(12,Math.round(2+state.waterDiffusion*8+state.waterAmount*2))),paper=getPaperResponse(),paperAbsorb=Math.max(0,Math.min(1,state.waterAbsorption+paper.absorb*state.paperInteraction*.32)),paperGranulation=Math.max(0,Math.min(1,state.waterGranulation+paper.tooth*state.paperInteraction*.20));
  const result=await runPixelTask('diffuse',{width:region.w,height:region.h,amount:state.waterAmount,diffusion:state.waterDiffusion,edge:state.edgeDarkening,iterations:iter,pigment:state.pigment,absorption:paperAbsorb,granulation:paperGranulation,drying:state.waterDrying,paperTooth:paper.tooth,paperFiber:paper.fiber},before.data);
  const after=new ImageData(result.data,region.w,region.h);ctx.putImageData(after,region.x,region.y);pushHistory({type:'pixelsRegion',layerId:layer.id,x:region.x,y:region.y,before,after});renderLayers();markDirty();updateProgress(100,'水彩シミュレーションが完了しました');setStatus(`水彩処理 · ${region.w}×${region.h} px · ${iter}回拡散`);
 }catch(err){toast('水彩処理に失敗: '+err.message);console.error(err)}finally{await nextFrameUI();hideProgress();pixelTaskBusy=false;state.operationLocked=false;}
}
function updateDeviceInfo(e){if(!e)return;const type=e.pointerType||'mouse';$('pointerTypeChip').textContent='入力: '+({pen:'ペン',touch:'タッチ',mouse:'マウス'}[type]||type);const hasPressure=type==='pen'&&typeof e.pressure==='number';const hasTilt=type==='pen'&&(Math.abs(e.tiltX||0)+Math.abs(e.tiltY||0)>0);$('devicePressureChip').hidden=!state.showPressureHUD;$('devicePressureChip').textContent=hasPressure?'筆圧: '+Math.round((e.pressure||0)*100)+'%':type==='pen'?'筆圧: 対応確認中':'筆圧: —';if(hasTilt)$('devicePressureChip').textContent+=' · 傾き対応';}
function applySelectedTransform(){const angle=Number($('objectRotation').value)*Math.PI/180,scale=Number($('objectScale').value)/100,dx=Number($('objectX').value)||0,dy=Number($('objectY').value)||0;applyObjectTransform(angle,scale,dx,dy,false);$('objectRotation').value=0;$('objectRotationValue').textContent='0°';$('objectScale').value=100;$('objectScaleValue').textContent='100%';$('objectX').value=0;$('objectY').value=0;}
async function exportPSD(){if(state.width*state.height>24000000){toast('PSD書き出しは2400万px以下にしてください');return;}showProgress('PSDを書き出し中','レイヤー情報と画像データを準備しています',4);await nextFrameUI();try{const layers=[];for(let i=0;i<state.layers.length;i++){const l=state.layers[i];layers.push({name:l.name,visible:l.visible,opacity:l.opacity,blend:l.blend,imageData:l.canvas.getContext('2d').getImageData(0,0,state.width,state.height)});updateProgress(5+Math.round((i+1)/state.layers.length*45),`レイヤー ${i+1}/${state.layers.length}`);await nextFrameUI();}const composite=mergeComposite();updateProgress(58,'PSDファイル構造を構築しています');await nextFrameUI();const blob=PFPSD.encode({width:state.width,height:state.height,layers,composite});downloadBlob(blob,(state.projectName||'artwork')+'.psd');updateProgress(100,'PSDを書き出しました');await nextFrameUI();hideProgress();}catch(err){hideProgress();toast('PSD書き出しエラー: '+err.message);}}
async function openPSDFile(file){stopAnimationPlayback({save:false,quiet:true});showProgress('PSDを読み込み中','レイヤー構造を解析しています',4);await nextFrameUI();try{const parsed=PFPSD.decode(await file.arrayBuffer());state.width=parsed.width;state.height=parsed.height;state.layers=[];for(let i=0;i<parsed.layers.length;i++){const item=parsed.layers[i],layer=newLayer(item.name);layer.visible=item.visible;layer.opacity=item.opacity;layer.blend=item.blend;const ctx=layer.canvas.getContext('2d'),im=new ImageData(item.data,parsed.width,parsed.height);ctx.putImageData(im,0,0);state.layers.push(layer);updateProgress(10+Math.round((i+1)/parsed.layers.length*78),`レイヤー ${i+1}/${parsed.layers.length}`);await nextFrameUI();}state.activeId=state.layers[state.layers.length-1]?.id||null;state.projectName=file.name.replace(/\.psd$/i,'');state.history=[];state.redo=[];state.reference=null;state.animationFrames=[];ensureInitialFrame();state.dirty=false;resizeDisplay();fitView();updateUI();renderTimeline();renderLayers();hideProgress();toast('PSDを読み込みました（標準ピクセルレイヤー）');}catch(err){hideProgress();toast('PSD読み込みエラー: '+err.message);}}
const BRUSH_CATEGORIES={
 ink:['gpen','maru','millipen','mappingPen','liner','saji','glass','fountain','dip','sumi','calligraphy','brushPen','fude','drySumi'],
 sketch:['pencilHB','pencilB','pencil2B','pencil4B','mechanicalPencil','softPencil','coloredPencil','charcoal','conte','oilPastel','chalk','crayon','pastel','softCarbon','waxCrayon','graphitePowder'],
 paint:['watercolor','roundWatercolor','flatWatercolor','granulating','gouache','acrylic','oil','bristleOil','oilPastel','dryBrush','textureBrush','filbertBrush','hakeBrush','mopBrush','rakeBrush','daggerBrush','blenderBrush','fanDryBrush','sumiWide'],
 marker:['marker','highlighter'],
 air:['airbrush','softAirbrush','spray','glitter'],
 effects:['neon','neonPink','neonCyan','neonLime','metalGold','metalSilver','metalCopper','chrome','pixel','stippling','splatter','textureMottler'],
 texture:['watercolorBloom','dryGouache','sableRound','flatSable','fanBrush','paletteKnife','inkWash','softGraphite','hardGraphite','chalkDust','grainMarker','dryMarker','wetMarker','filbertBrush','hakeBrush','mopBrush','rakeBrush','daggerBrush','blenderBrush','fanDryBrush','softCarbon','waxCrayon','graphitePowder','sumiWide']
};
function syncBrushLabUI(){
 const map={pressureWidthGain:'pressureWidthGain',tiltWidthGain:'tiltWidthGain',nibFollow:'nibFollow',nibAngleMode:'nibAngleMode',strokeWidthNoise:'strokeWidthNoise',strokeWidthWave:'strokeWidthWave',strokeTaperPower:'strokeTaperPower',bristleSplay:'bristleSplay',bristleLengthVariation:'bristleLengthVariation',bristleClumping:'bristleClumping',bristleCurl:'bristleCurl',bristleLag:'bristleLag',bristleWaviness:'bristleWaviness',bristleWidthVariation:'bristleWidthVariation',bristleOpacityVariation:'bristleOpacityVariation',bristleDensity:'bristleDensity',bristleWetness:'bristleWetness',bristleColorVariation:'bristleColorVariation',paintDrag:'paintDrag',pigmentReservoir:'pigmentReservoir',pigmentDepletion:'pigmentDepletion',strokeDrying:'strokeDrying',wetEdgeSpread:'wetEdgeSpread',colorPickupRadius:'colorPickupRadius',edgeBreakup:'edgeBreakup',pressureProfile:'pressureProfile',velocitySize:'velocitySize',velocityOpacity:'velocityOpacity',taperStart:'taperStart',taperEnd:'taperEnd',wetEdge:'wetEdge',textureScale:'textureScale',edgeSoftness:'edgeSoftness',nibTiltSensitivity:'nibTiltSensitivity',strokeCorrection:'strokeCorrection'};
 for(const [id,key] of Object.entries(map)){const node=$(id);if(!node)continue;const v=state[key];if(node.type==='range'){const scale=(id==='colorPickupRadius'?1:id==='strokeTaperPower'?100:id==='bristleDensity'?100:100);node.value=Math.round(Number(v)*scale)}else node.value=String(v);const out=$(id+'Value');if(out)out.textContent=id==='colorPickupRadius'?Number(v).toFixed(0)+' px':id==='strokeTaperPower'?Number(v).toFixed(2)+'×':id==='bristleDensity'?Math.round(Number(v)*100)+'%':node.type==='range'?Math.round(Number(v)*100)+'%':node.selectedOptions?.[0]?.text||String(v);}
  if($('rainbowDirection'))$('rainbowDirection').value=state.rainbowDirection||'along';
  if($('rainbowCycles'))$('rainbowCycles').value=Math.round((Number(state.rainbowCycles)||2.5)*2);
  if($('rainbowCyclesValue'))$('rainbowCyclesValue').textContent=(Number(state.rainbowCycles)||2.5).toFixed(1)+' 周';
  if($('rainbowMix'))$('rainbowMix').value=Math.round((Number(state.rainbowMix)||0)*100);
  if($('rainbowMixValue'))$('rainbowMixValue').textContent=Math.round((Number(state.rainbowMix)||0)*100)+'%';
  if($('rainbowColorPickup'))$('rainbowColorPickup').checked=state.rainbowColorPickup!==false;
  if($('rainbowPhase'))$('rainbowPhase').value=Math.round(Number(state.rainbowPhase)||0);
  if($('rainbowPhaseValue'))$('rainbowPhaseValue').textContent=Math.round(Number(state.rainbowPhase)||0)+'°';
  if($('rainbowReverse'))$('rainbowReverse').checked=!!state.rainbowReverse;
  if($('smudgeStrength'))$('smudgeStrength').value=Math.round((Number(state.smudgeStrength??.58))*100);
  if($('smudgeStrengthValue'))$('smudgeStrengthValue').textContent=Math.round((Number(state.smudgeStrength??.58))*100)+'%';
  if($('smudgeSampleMerged'))$('smudgeSampleMerged').checked=!!state.smudgeSampleMerged;
  updateBrushPreview();renderBrushFavorites();
 }
 function brushInfo(name){
 const map={watercolorBloom:'水彩ブルーム · 水溜まりと縁の顔料だまり',dryGouache:'ドライガッシュ · マットな不透明塗膜',sableRound:'セーブル丸筆 · 柔らかな丸い毛先',flatSable:'セーブル平筆 · 幅広く整った塗り',fanBrush:'ファンブラシ · 扇状の細い毛束',paletteKnife:'ペインティングナイフ · 薄く伸ばす絵具',stippling:'点描 · 粒子が密集した面',splatter:'スパッタ · 飛沫状の粒子',inkWash:'淡墨 · 低濃度の滲むインク',softGraphite:'ソフト黒鉛 · 濃く柔らかい芯',hardGraphite:'硬質黒鉛 · 細く乾いた芯',chalkDust:'チョーク粉 · 粉体感の強い筆跡',textureMottler:'モトラー · 面を均す質感筆',filbertBrush:'フィルバート · 丸みを帯びた平筆、穂先の広がりを調整',hakeBrush:'刷毛・ハケ · 幅広い薄塗りと柔らかなウォッシュ',mopBrush:'モップ水彩 · 水分を含む柔らかな丸い塗り',rakeBrush:'レーキブラシ · 毛束が分かれた櫛目のストローク',daggerBrush:'ダガーブラシ · 斜めの刃先で鋭い入り抜き',blenderBrush:'ブレンダー · 柔らかな色面と境界のなじみ',fanDryBrush:'ドライファン · 乾いた扇状毛束のかすれ',softCarbon:'ソフトカーボン · 粉体を含む柔らかい黒鉛',waxCrayon:'ワックスクレヨン · 粒状の蝋顔料',graphitePowder:'黒鉛粉 · 広い面の粉体デッサン',sumiWide:'幅広淡墨筆 · 広がる墨のウォッシュ',grainMarker:'粒状マーカー · 紙目に残る染料',dryMarker:'ドライマーカー · かすれた不透明線',wetMarker:'ウェットマーカー · 滑らかな染料線',mappingPen:'マッピングペン · かすれを抑えた製図・線画用の均一インク',liner:'ライナー · 細い輪郭線と細部描写',saji:'サジペン · ペン先の開きが出る強弱のある線',fude:'毛筆・太筆 · 筆圧と繊維の流れを表現',drySumi:'かすれ墨筆 · 乾いた毛先と濃淡',mechanicalPencil:'シャープペンシル · 均一な細い芯線',softPencil:'柔らかい鉛筆 · 黒鉛の濃淡と紙目',charcoal:'木炭 · 粉体の濃淡と粗い粒子',conte:'コンテ · 硬めの顔料棒',oilPastel:'オイルパステル · 油分のある厚い顔料',roundWatercolor:'丸筆水彩 · 滑らかな含水ストローク',flatWatercolor:'平筆水彩 · 幅広く均一な塗り',gouache:'ガッシュ · 不透明な水性絵具',textureBrush:'テクスチャ筆 · 筆毛の流れと表面の凹凸',gpen:'Gペン · 筆圧で強弱が出る漫画インク',maru:'丸ペン · 細く繊細で均一な線',millipen:'ミリペン · 安定した均一幅の耐水線',pencilHB:'HB鉛筆 · 軽い下描きと薄い線',pencilB:'B鉛筆 · 少し濃い柔らかな黒鉛',pencil2B:'2B鉛筆 · 濃淡と芯の摩擦感',pencil4B:'4B鉛筆 · 濃く柔らかい黒鉛',coloredPencil:'色鉛筆 · 紙目に沿う色の重なり',watercolor:'水彩筆 · にじみと淡いウォッシュ',granulating:'粒状水彩 · 顔料のゆらぎ',acrylic:'アクリル · 不透明で密度のある塗膜',oil:'油彩 · 厚みのある絵具表現',bristleOil:'剛毛油彩 · 筆毛の長いストローク',marker:'マーカー · 重ね塗りで濃くなるインク',fountain:'万年筆 · 滑らかな筆記線',glass:'ガラスペン · 繊細で艶のあるインク',sumi:'墨筆 · 墨の濃淡と柔らかい筆跡',calligraphy:'カリグラフィー · ペン先角度で幅が変化',neon:'ネオン · 発光する連続した芯線',metalGold:'金属ゴールド · 金属光沢の帯'};
 return map[name]||'選択中の画材 · サイズ・硬さ・流量・紙質で調整できます';
}
function updateBrushPreview(){
 const canvas=$('brushPreview');if(!canvas)return;const w=canvas.clientWidth||260,h=canvas.clientHeight||58,dpr=Math.min(2,window.devicePixelRatio||1);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const old={tool:state.tool,color:state.color,size:state.size,opacity:state.opacity,brushFlow:state.brushFlow,lastPointerType:state.lastPointerType,strokeTaper:state.strokeTaper};
 state.tool='brush';state.color=state.color||'#222b3a';state.lastPointerType='mouse';state.opacity=.96;state.strokeTaper=.12;
 const size=Math.max(3,Math.min(13,Number(state.size)||18));const pts=[];for(let i=0;i<=28;i++){const t=i/28;pts.push({x:12+t*(w-24),y:h*.51+Math.sin(t*Math.PI*2)*h*.19+Math.sin(t*Math.PI*4)*h*.06,p:.42+.54*Math.sin(t*Math.PI),v:.2+Math.abs(Math.cos(t*Math.PI*2))*.3});}
 drawSmoothStroke(ctx,pts,true);
 Object.assign(state,old);$('brushPreviewName').textContent=brushInfo(state.brushPreset);
}
const BRUSH_PROFILE_FORM_IDS=['sizeRange','sizeNumber','opacityRange','hardness','stabilizerRange','spacing','pressureSize','brushFlow','brushJitter','brushAngle','pressureOpacity','curveBend','polygonSides','waterAmount','pigment','waterSpread','edgeDarkening','waterPreset','waterAbsorption','waterDiffusion','waterGranulation','waterDrying','smudgeStrength','smudgeSampleMerged','rainbowDirection','rainbowCycles','rainbowMix','rainbowColorPickup','rainbowPhase','rainbowReverse','paperTexture','paperStrength','paperFiberDirection','paperGrainScale','paperSurfaceRelief','paperInteraction','textureDetail','pressureProfile','velocitySize','velocityOpacity','taperStart','taperEnd','wetEdge','textureScale','edgeSoftness','nibTiltSensitivity','strokeCorrection','feelPreset','feelFriction','feelSmoothing','pressureCurve','tiltEnabled','strokeStability','strokePressureSmoothing','pressureFloor','pressureCeiling','strokeSampleDensity','strokeResampleQuality','strokePreviewMode','pressureWidthGain','tiltWidthGain','nibFollow','nibAngleMode','strokeWidthNoise','strokeWidthWave','strokeTaperPower','bristleSplay','bristleLengthVariation','bristleClumping','bristleCurl','bristleLag','bristleWaviness','bristleWidthVariation','bristleOpacityVariation','bristleDensity','bristleWetness','bristleColorVariation','paintDrag','pigmentReservoir','pigmentDepletion','strokeDrying','wetEdgeSpread','colorPickupRadius','edgeBreakup'];
 function readBrushProfiles(){try{return JSON.parse(localStorage.getItem('pf-brush-profiles')||'{}')}catch(_){return{}}}
function persistBrushProfiles(){try{localStorage.setItem('pf-brush-profiles',JSON.stringify(state.brushProfiles||{}))}catch(_){toast('ブラシ設定のローカル保存容量が不足しています')}}
function saveBrushProfileFor(id,{silent=false}={}){
 if(!id)return;state.brushProfiles=state.brushProfiles||{};
 const values={};for(const k of BRUSH_PROFILE_STATE_KEYS){const v=state[k];if(v===null||['string','number','boolean'].includes(typeof v))values[k]=v;}
 const name=($('brushProfileName')?.value||'').trim()||$('brushPreset')?.selectedOptions?.[0]?.textContent||id;
 state.brushProfiles[id]={id,name,state:values,controls:captureFormState(BRUSH_PROFILE_FORM_IDS),updatedAt:new Date().toISOString()};persistBrushProfiles();renderBrushProfileLibrary();renderBrushProfileCopyTargets();if($('brushProfileSelect'))$('brushProfileSelect').value=id;
 if(!silent)toast(name+' の設定を保存しました');
}
function applyBrushProfileFor(id,{silent=false}={}){
 const profile=state.brushProfiles?.[id];if(!profile)return false;
 if(profile.controls)restoreFormState(profile.controls,{dispatch:true});
 if(profile.state&&typeof profile.state==='object')for(const [k,v] of Object.entries(profile.state)){if(BRUSH_PROFILE_STATE_KEYS.includes(k)&&(v===null||['string','number','boolean'].includes(typeof v)))state[k]=v;}
 normalizeAdvancedStrokeSettings();
 state.brushPreset=id;if($('brushPreset'))$('brushPreset').value=id;
 $('sizeNumber').value=state.size;$('sizeRange').value=Math.min(250,state.size);$('opacityRange').value=Math.round(state.opacity*100);$('hardness').value=Math.round(state.hardness*100);
 syncBrushLabUI?.();updateUI();if(profile.controls)restoreFormState(profile.controls,{dispatch:false});if($('brushProfileName'))$('brushProfileName').value=profile.name||'';if($('brushProfileSelect'))$('brushProfileSelect').value=id;renderBrushProfileLibrary();markDirty();schedulePersistentEditorPreferenceSave?.();
 if(!silent)toast((profile.name||id)+' の設定を復元しました');return true;
}
function renderBrushProfileLibrary(){
 const select=$('brushProfileSelect');if(!select)return;const current=select.value;select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='保存済みの画材設定を選択';select.append(placeholder);
 const brushSelect=$('brushPreset');for(const [id,p] of Object.entries(state.brushProfiles||{})){if(!brushSelect||![...brushSelect.options].some(o=>o.value===id))continue;const opt=document.createElement('option');opt.value=id;opt.textContent=(p.name||brushSelect.querySelector(`option[value="${id}"]`)?.textContent||id)+' · '+(brushSelect.querySelector(`option[value="${id}"]`)?.textContent||id);select.append(opt);}
 select.value=[...select.options].some(o=>o.value===current)?current:'';
  const active=$('brushProfileStatus');if(active)active.textContent=state.brushProfiles?.[state.brushPreset]?'この画材の設定は保存済み':'この画材にはまだ個別設定がありません';
  renderBrushProfileCopyTargets();
 }
 function renderBrushProfileCopyTargets(){
  const select=$('brushProfileCopyTarget'),brushSelect=$('brushPreset');if(!select||!brushSelect)return;
  const previous=select.value;select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='コピー先の画材を選択';select.append(placeholder);
  for(const option of brushSelect.options){if(!option.value||option.value===state.brushPreset)continue;const next=document.createElement('option');next.value=option.value;next.textContent=option.textContent.trim();select.append(next);}
  select.value=[...select.options].some(option=>option.value===previous)?previous:'';
 }
 function copyCurrentBrushProfileToTarget(){
  const select=$('brushProfileCopyTarget'),target=select?.value,source=state.brushPreset;
  if(!target||target===source){toast('コピー先の画材を選択してください');return false;}
  const brushSelect=$('brushPreset'),option=[...(brushSelect?.options||[])].find(item=>item.value===target);if(!option){toast('コピー先の画材が見つかりません');return false;}
  const values={};for(const key of BRUSH_PROFILE_STATE_KEYS){const value=state[key];if(value===null||['string','number','boolean'].includes(typeof value))values[key]=value;}
  const sourceName=($('brushProfileName')?.value||'').trim()||brushSelect.selectedOptions?.[0]?.textContent?.trim()||source;
  state.brushProfiles=state.brushProfiles||{};
  state.brushProfiles[target]={id:target,name:(option.textContent.trim()||target)+'（'+sourceName+'からコピー）',state:values,controls:captureFormState(BRUSH_PROFILE_FORM_IDS),updatedAt:new Date().toISOString(),copiedFrom:source};
  persistBrushProfiles();renderBrushProfileLibrary();if(select)select.value=target;markDirty();schedulePersistentEditorPreferenceSave?.();
  toast((option.textContent.trim()||target)+'へ画材設定 '+Object.keys(values).length+' 項目をコピーしました');return true;
 }
 function exportBrushProfilePack(){const data={format:'PIXEL_FORGE_BRUSH_LIBRARY',version:1,createdAt:new Date().toISOString(),profiles:state.brushProfiles||{}};downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'PixelForge_BrushProfiles.pfbrushes.json');toast('ブラシ設定パックを書き出しました')}
async function importBrushProfilePack(file){try{const data=JSON.parse(await file.text());if(data.format!=='PIXEL_FORGE_BRUSH_LIBRARY'||!data.profiles||typeof data.profiles!=='object')throw new Error('PIXEL FORGEブラシ設定パックではありません');const known=new Set([...$('brushPreset').options].map(o=>o.value));let added=0;state.brushProfiles=state.brushProfiles||{};for(const [id,p] of Object.entries(data.profiles)){if(known.has(id)&&p&&typeof p==='object'){state.brushProfiles[id]=p;added++;}}persistBrushProfiles();renderBrushProfileLibrary();markDirty();toast(`${added}種類のブラシ設定を読み込みました`)}catch(e){toast('ブラシ設定を読み込めません: '+e.message)}}
function resetCurrentBrushProfile(){const id=state.brushPreset;if(!state.brushProfiles?.[id]){toast('この画材に保存済み設定はありません');return}if(!confirm('この画材の個別保存設定を削除しますか？'))return;delete state.brushProfiles[id];persistBrushProfiles();renderBrushProfileLibrary();toast('個別保存設定を削除しました')}
let brushProfileSaveTimer=null;
function scheduleActiveBrushProfileSave(){if(!$('brushProfileAuto')?.checked)return;clearTimeout(brushProfileSaveTimer);brushProfileSaveTimer=setTimeout(()=>saveBrushProfileFor(state.brushPreset,{silent:true}),350)}
function getBrushFavorites(){try{return JSON.parse(localStorage.getItem('pf-brush-favorites')||'[]').filter(x=>typeof x==='string')}catch(_){return[]}}
function setBrushFavorite(){const fav=getBrushFavorites(),name=state.brushPreset;const next=fav.includes(name)?fav.filter(x=>x!==name):[...fav,name].slice(-24);try{localStorage.setItem('pf-brush-favorites',JSON.stringify(next))}catch(_){}renderBrushFavorites();const b=$('brushFavoriteToggle');if(b)b.textContent=next.includes(name)?'★ お気に入り済み':'☆ お気に入り';toast(next.includes(name)?'お気に入りに追加しました':'お気に入りから外しました')}
function renderBrushFavorites(){const box=$('brushFavorites');if(!box)return;const fav=getBrushFavorites();box.innerHTML='';if(!fav.length){const n=document.createElement('span');n.className='muted';n.textContent='☆ボタンでよく使う画材を登録';box.append(n);return;}for(const id of fav){const b=document.createElement('button');b.type='button';b.className='brushfav-chip'+(id===state.brushPreset?' active':'');b.textContent=$('brushPreset').querySelector(`option[value="${id}"]`)?.textContent||id;b.title=brushInfo(id);b.onclick=()=>selectBrushPreset(id);box.append(b)}}
function selectBrushPreset(id){const sel=$('brushPreset');if(!sel||![...sel.options].some(o=>o.value===id))return;if($('brushSearch'))$('brushSearch').value='';if($('brushCategory'))$('brushCategory').value='all';filterBrushOptions();sel.value=id;sel.dispatchEvent(new Event('change',{bubbles:true}));}
function filterBrushOptions(){
 const q=($('brushSearch')?.value||'').trim().toLowerCase(),cat=$('brushCategory')?.value||'all',sel=$('brushPreset');if(!sel)return;
 const allowed=new Set(cat==='all'?[...sel.options].map(o=>o.value):(BRUSH_CATEGORIES[cat]||[]));let shown=[];
 for(const opt of sel.options){const text=(opt.textContent+' '+opt.value).toLowerCase(),ok=allowed.has(opt.value)&&(!q||text.includes(q));opt.hidden=!ok;if(ok)shown.push(opt);}
 const meta=$('brushFilterMeta');if(meta)meta.textContent=shown.length?`${shown.length} / ${sel.options.length} 画材`:'一致する画材がありません';
 sel.disabled=shown.length===0;
 if(shown.length&&sel.selectedOptions[0]?.hidden){sel.value=shown[0].value;sel.dispatchEvent(new Event('change',{bubbles:true}));}
}
function showBrushGuide(){const m=$('brushGuideModal');if(m)m.classList.remove('hidden')}
function closeBrushGuide(){const m=$('brushGuideModal');if(m)m.classList.add('hidden')}
function applyBrushQuickPreset(key){const p={ink:{brushPreset:'gpen',size:6,opacity:1,hardness:.98,brushFlow:1,strokeSmoothing:.48,strokeTaper:.22},sketch:{brushPreset:'pencil2B',size:8,opacity:.8,hardness:.42,brushFlow:.78,textureDetail:.72},water:{brushPreset:'watercolor',size:32,opacity:.72,hardness:.18,brushFlow:.7,wetEdge:.46,textureDetail:.55},paint:{brushPreset:'oil',size:24,opacity:1,hardness:.72,brushFlow:.9,textureDetail:.42},marker:{brushPreset:'marker',size:18,opacity:.82,hardness:.78,brushFlow:.85}}[key];if(!p)return;Object.assign(state,p);$('brushPreset').value=state.brushPreset;$('sizeNumber').value=state.size;$('sizeRange').value=Math.min(250,state.size);$('opacityRange').value=Math.round(state.opacity*100);$('opacityValue').textContent=Math.round(state.opacity*100)+'%';$('hardness').value=Math.round(state.hardness*100);$('hardnessValue').textContent=Math.round(state.hardness*100)+'%';$('brushFlow').value=Math.round(state.brushFlow*100);$('brushFlowValue').textContent=Math.round(state.brushFlow*100)+'%';syncBrushLabUI();markDirty();toast('画材セットを適用しました')}
function resetBrushLab(){Object.assign(state,{pressureProfile:'natural',velocitySize:.12,velocityOpacity:.06,taperStart:.055,taperEnd:.085,wetEdge:.16,textureScale:1,edgeSoftness:.06,nibTiltSensitivity:.55,strokeCorrection:'balanced'});syncBrushLabUI();markDirty();toast('筆跡詳細設定を初期値に戻しました')}
function applyRestoredMobileUiSettings(){document.body.classList.toggle('left-handed-ui',!!state.leftHandedUI);document.body.classList.toggle('mobile-compact-ui',!!state.mobileCompactUI);document.documentElement.style.setProperty('--mobile-toolbar-scale',String(state.mobileToolbarScale||1));document.documentElement.style.setProperty('--mobile-dock-alpha',String(state.mobileDockOpacity??.92));const chip=$('devicePressureChip');if(chip)chip.hidden=!state.showPressureHUD;}

let pfQuickCommandsCache=[];
let pfQuickCommandActiveIndex=0;
function buildQuickCommands(){
 const commands=[],seen=new Set();
 const add=(title,detail,category,action,keywords='')=>{const key=(category+'|'+title+'|'+detail).toLocaleLowerCase();if(seen.has(key))return;seen.add(key);commands.push({title:String(title),detail:String(detail||''),category:String(category||'操作'),action,keywords:(String(title)+' '+String(detail||'')+' '+String(keywords||'')).normalize('NFKC').toLocaleLowerCase()})};
 const categoryForSelect=id=>({brushPreset:'画材・ブラシ',paperTexture:'紙質・テクスチャ',waterPreset:'水彩',blendMode:'レイヤー合成',paintBlendMode:'画材の合成',symmetry:'対称描画',backgroundMode:'キャンバス背景',canvasPreset:'キャンバス',newPreset:'新規キャンバス',newBackground:'新規キャンバス',eraserMode:'消しゴム',eraserPreset:'消しゴム',brushTipShape:'ブラシ形状',nibAngleMode:'ペン先',pressureProfile:'筆圧',strokeCorrection:'線の補正',strokePreviewMode:'描画性能',touchDrawMode:'スマホ操作',mobilePreviewFps:'スマホ性能',animationLoopMode:'アニメーション',textWeight:'文字',textAlign:'文字',gradientType:'グラデーション'}[id]||'設定');
 document.querySelectorAll('#app .tool[data-tool]').forEach(button=>{const tip=button.querySelector('.tip')?.textContent?.replace(/\s+/g,' ').trim()||button.getAttribute('aria-label')||button.dataset.tool;add('ツール：'+tip,'ツールを切り替える','ツール',()=>setTool(button.dataset.tool),button.dataset.tool)});
 document.querySelectorAll('#app select[id]').forEach(select=>{const id=select.id;const label=[...document.querySelectorAll('label[for]')].find(label=>label.htmlFor===id)?.textContent?.trim()||select.closest('.field,.context-group,.pf-setting-row')?.querySelector('label')?.textContent?.trim()||select.getAttribute('aria-label')||select.previousElementSibling?.textContent?.trim()||id;const category=categoryForSelect(id);[...select.options].forEach(option=>{if(option.disabled||option.value==='')return;const value=option.value,title=option.textContent.trim();add(`${label}：${title}`,`${category} · ${id}` ,category,()=>{const target=document.getElementById(id);if(!target)return;if(id==='brushPreset'){selectBrushPreset(value);return;}target.value=value;target.dispatchEvent(new Event('change',{bubbles:true}));target.dispatchEvent(new Event('input',{bubbles:true}));},`${id} ${value}`)})});
 document.querySelectorAll('#app [data-filter]').forEach(button=>{const value=button.dataset.filter;const title=button.textContent.replace(/\s+/g,' ').trim()||value;add('フィルター：'+title,'選択レイヤーにフィルターを適用（元に戻すで復元）','フィルター',()=>applyFilter(value),value)});
 const direct=[
 ['元に戻す','直前の編集を取り消す','編集',doUndo,'undo ctrl z'],['やり直す','取り消した編集を再適用','編集',doRedo,'redo ctrl shift z'],
 ['新しいキャンバス','新規キャンバス設定を開く','ファイル',openNewDialog,'new canvas'],['プロジェクトを開く','.pforge プロジェクトを読み込む','ファイル',openProject,'open load'],['プロジェクトを保存','現在の作品を保存','ファイル',saveProject,'save'],
 ['画像をレイヤーとして読み込む','画像ファイルを新規レイヤーへ追加','読み込み',()=>$('imageInput')?.click(),'image import'],['写真を下敷きに読み込む','トレース用の参照画像を読み込む','読み込み',()=>$('traceInput')?.click(),'reference trace photo'],['PSDを開く','Photoshop形式を読み込む','読み込み',()=>$('psdInput')?.click(),'psd photoshop'],
 ['PNGを書き出す','透明部分を維持してPNG保存','書き出し',()=>$('exportPng')?.click(),'export png'],['JPGを書き出す','背景を含むJPEG保存','書き出し',()=>$('exportJpg')?.click(),'export jpeg'],['WebPを書き出す','WebP画像として保存','書き出し',()=>$('exportWebp')?.click(),'export webp'],['PSDを書き出す','レイヤー構造を含むPSD保存','書き出し',exportPSD,'export photoshop'],['OpenRasterを書き出す','レイヤー互換ORA保存','書き出し',exportOpenRaster,'export ora'],
 ['新規レイヤー','空のレイヤーを追加','レイヤー',()=>addLayer(),'layer add'],['レイヤーを複製','選択レイヤーを複製','レイヤー',duplicateLayer,'layer duplicate'],['レイヤーを削除','選択レイヤーを削除','レイヤー',deleteLayer,'layer delete'],['下のレイヤーと結合','選択レイヤーを下へ結合','レイヤー',mergeDown,'layer merge'],['レイヤーを上へ','レイヤー順を1つ上げる','レイヤー',()=>moveLayer(1),'layer up'],['レイヤーを下へ','レイヤー順を1つ下げる','レイヤー',()=>moveLayer(-1),'layer down'],
 ['選択レイヤーを透明化','背景・他レイヤーを変更せず画素を消去','レイヤー',()=>{if(confirm('選択レイヤーの画素をすべて消去します。よろしいですか？'))clearActiveLayer()},'clear layer transparent'],['画面に合わせる','キャンバス全体が見える倍率へ','表示',fitView,'fit zoom'],['中央へ移動','キャンバスを中央に配置','表示',()=>$('centerBtn')?.click(),'center'],['設定パネルを開く','画材や各種パラメータを表示','設定',()=>setSettingsPanelOpen(true),'panel settings'],['消しゴム設定を開く','透明画素消去の設定を表示','設定',setEraserSettingsPanelOpen,'eraser pixel transparency'],['端末診断を開く','スマホ・ブラウザ機能を確認','システム',openDeviceDiagnostics,'diagnostic mobile browser'],
 ['左右反転','レイヤー内容を左右反転','キャンバス',()=>flipLayers('h'),'flip horizontal'],['上下反転','レイヤー内容を上下反転','キャンバス',()=>flipLayers('v'),'flip vertical'],['90°回転','レイヤー内容を90度回転','キャンバス',rotateLayers90,'rotate'],['水彩シミュレーション','水彩のにじみと乾き際を適用','水彩',applyWaterSimulation,'water simulation'],['アニメーション再生／停止','タイムラインの再生状態を切り替える','アニメーション',toggleAnimation,'animation play stop'],
 ['ブラシ設定を開く','画材プリセットと筆圧調整へ','設定',()=>{setSettingsPanelOpen(true);$('brushPreset')?.scrollIntoView({behavior:'smooth',block:'center'})},'brush panel'],['紙質設定を開く','紙目・吸水・繊維設定へ','設定',()=>{setSettingsPanelOpen(true);$('paperTexture')?.scrollIntoView({behavior:'smooth',block:'center'})},'paper texture'],['対称描画設定を開く','左右・上下・放射対称を設定','設定',()=>{$('symmetry')?.scrollIntoView({behavior:'smooth',block:'center'});$('symmetry')?.focus()},'symmetry'],['レイヤーパネルへ','レイヤー一覧と合成設定へ移動','設定',()=>{$('layersList')?.scrollIntoView({behavior:'smooth',block:'start'})},'layers']
 ];
 direct.forEach(([a,b,c,d,k])=>add(a,b,c,d,k));
 // Numeric quick actions are generated only for controls that actually expose an input handler.
 const rangePresets=[['最小',0],['中間',.5],['最大',1]];
 document.querySelectorAll('#app input[type="range"][id]').forEach(input=>{const id=input.id;if(['eraserOpacity','eraserHardness'].includes(id))return;const min=Number(input.min||0),max=Number(input.max||100),stepRaw=Number(input.step||1),step=Number.isFinite(stepRaw)&&stepRaw>0?stepRaw:1;if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min)return;const label=[...document.querySelectorAll('label[for]')].find(label=>label.htmlFor===id)?.textContent?.trim()||input.closest('.field')?.querySelector('label')?.textContent?.trim()||id;rangePresets.forEach(([name,ratio])=>{let value=min+(max-min)*ratio;value=Math.round(value/step)*step;value=Math.max(min,Math.min(max,value));add(`${label}：${name}`,`${id} · ${value}`,'数値設定',()=>{const target=document.getElementById(id);if(!target)return;target.value=String(value);target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));},`${id} ${name} ${value}`)})});
 return commands;
}
function renderQuickCommands(query=''){
 const list=$('pfCommandResults'),count=$('pfCommandCount'),cats=$('pfCommandCategoryCount');if(!list)return;
 const q=String(query||'').normalize('NFKC').toLocaleLowerCase().trim();const filtered=pfQuickCommandsCache.filter(c=>!q||c.keywords.includes(q)||c.title.normalize('NFKC').toLocaleLowerCase().includes(q)||c.detail.normalize('NFKC').toLocaleLowerCase().includes(q));
 count.textContent=q?`${filtered.length} 件見つかりました`:`${pfQuickCommandsCache.length} 件の操作を検索できます`;
 cats.textContent=`${new Set(filtered.map(c=>c.category)).size} カテゴリ`;
 list.replaceChildren();if(!filtered.length){const empty=document.createElement('div');empty.className='pf-command-empty';empty.textContent='一致する操作がありません。別の言葉で検索してください。';list.append(empty);return;}
 const groups=new Map();filtered.slice(0,100).forEach(c=>{if(!groups.has(c.category))groups.set(c.category,[]);groups.get(c.category).push(c)});
 let index=0;for(const [category,items] of groups){const heading=document.createElement('div');heading.className='pf-command-group';heading.textContent=category;list.append(heading);for(const cmd of items){const b=document.createElement('button');b.type='button';b.className='pf-command-item';b.setAttribute('role','option');b.dataset.index=String(index++);const icon=document.createElement('span');icon.className='pf-command-icon';icon.textContent=category==='画材・ブラシ'?'✎':category==='紙質・テクスチャ'?'▤':category==='フィルター'?'◈':category==='ツール'?'⌁':'›';const copy=document.createElement('span');copy.className='pf-command-copy';const strong=document.createElement('strong');strong.textContent=cmd.title;const small=document.createElement('small');small.textContent=cmd.detail;copy.append(strong,small);b.append(icon,copy);b.addEventListener('click',()=>executeQuickCommand(cmd));list.append(b)}}
 pfQuickCommandActiveIndex=0;
}
function executeQuickCommand(command){if(!command||typeof command.action!=='function')return;$('pfCommandPalette')?.classList.add('hidden');try{command.action()}catch(error){console.error('Quick command failed',error);toast('コマンドを実行できませんでした: '+(error?.message||error))}}
function openCommandPalette(){const modal=$('pfCommandPalette');if(!modal)return;if(document.body.classList.contains('pf-home-active')){toast('作品を開いてからコマンドパレットを使えます');return;}pfQuickCommandsCache=buildQuickCommands();$('pfCommandSearch').value='';renderQuickCommands('');modal.classList.remove('hidden');requestAnimationFrame(()=>$('pfCommandSearch')?.focus({preventScroll:true}));}
function closeCommandPalette(){ $('pfCommandPalette')?.classList.add('hidden'); }
function bindCommandPalette(){
 $('commandPaletteButton')?.addEventListener('click',openCommandPalette);$('mobileCommandPalette')?.addEventListener('click',openCommandPalette);$('pfCommandClose')?.addEventListener('click',closeCommandPalette);$('pfCommandSearch')?.addEventListener('input',e=>renderQuickCommands(e.target.value));
 $('pfCommandPalette')?.addEventListener('pointerdown',e=>{if(e.target===$('pfCommandPalette'))closeCommandPalette()});
 $('pfCommandSearch')?.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();$('pfCommandResults')?.querySelector('.pf-command-item')?.focus()}else if(e.key==='Enter'){e.preventDefault();$('pfCommandResults')?.querySelector('.pf-command-item')?.click()}});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();if($('pfCommandPalette')?.classList.contains('hidden'))openCommandPalette();else closeCommandPalette()}else if(e.key==='Escape'&&!$('pfCommandPalette')?.classList.contains('hidden'))closeCommandPalette()});
}

function bindEvents(){
 bindCommandPalette();
 document.querySelectorAll('.tool[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
 display.addEventListener('pointerdown',stagePointerDown,{passive:false});display.addEventListener('pointermove',stagePointerMove,{passive:false});display.addEventListener('pointerup',stagePointerUp);display.addEventListener('pointercancel',stagePointerUp);display.addEventListener('lostpointercapture',e=>{if(state.pointerDown||state.panning)stagePointerUp(e)});display.addEventListener('contextmenu',e=>e.preventDefault());
 stage.addEventListener('wheel',e=>{e.preventDefault();const r=stage.getBoundingClientRect();zoomAt(e.deltaY<0?1.12:.89,e.clientX-r.left,e.clientY-r.top)},{passive:false});
 $('colorPicker').addEventListener('input',e=>setColor(e.target.value));$('hexColor').addEventListener('change',e=>setColor(e.target.value));$('paletteSearch')?.addEventListener('input',renderColorPalette);$('paletteCategory')?.addEventListener('change',renderColorPalette);$('gradientColor').addEventListener('input',e=>state.gradientColor=e.target.value);
 $('panelToggle').onclick=()=>setSettingsPanelOpen(isMobileLayout()?!document.body.classList.contains('mobile-panel-open'):$('rightbar').classList.contains('collapsed'));$('mobilePanelToggle')?.addEventListener('click',()=>setSettingsPanelOpen(true));$('mobileEraserSettings')?.addEventListener('click',setEraserSettingsPanelOpen);$('mobilePanelScrim')?.addEventListener('click',()=>setSettingsPanelOpen(false));$('mobileUndo')?.addEventListener('click',doUndo);$('mobileRedo')?.addEventListener('click',doRedo);$('mobileFit')?.addEventListener('click',fitView);document.querySelectorAll('[data-mobile-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.mobileTool)));$('mobileColor')?.addEventListener('click',()=>$('colorPicker')?.click());document.querySelectorAll('.panelhead').forEach(head=>{head.setAttribute('role','button');head.setAttribute('tabindex','0');head.setAttribute('aria-expanded','true');const toggle=()=>{const panel=head.closest('.panel');if(!panel)return;panel.classList.toggle('folded');head.setAttribute('aria-expanded',String(!panel.classList.contains('folded')))};head.addEventListener('click',toggle);head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}})});document.querySelectorAll('#transformPanel,#feelPanel,#devicePanel').forEach(p=>{p.classList.add('folded');p.querySelector('.panelhead')?.setAttribute('aria-expanded','false')});
 $('gradientType')?.addEventListener('change',e=>state.gradientType=e.target.value);
 $('fillTolerance')?.addEventListener('input',e=>{state.fillTolerance=Number(e.target.value);$('fillToleranceValue').textContent=e.target.value});
 $('fillContiguous').onchange=e=>state.fillContiguous=e.target.checked;$('fillMerged').onchange=e=>state.fillMerged=e.target.checked;$('fillOpacity').oninput=e=>{state.fillOpacity=Number(e.target.value)/100;$('fillOpacityValue').textContent=e.target.value+'%'};$('fillFeather').oninput=e=>{state.fillFeather=Number(e.target.value);$('fillFeatherValue').textContent=e.target.value+' px'};$('retryPixelWorker').onclick=()=>{try{pixelWorker?.terminate()}catch(_){}pixelWorker=null;try{getPixelWorker();toast('処理エンジンを再接続しました')}catch(err){setWorkerHealth('代替エンジンで動作');toast('Workerなしで代替エンジンを使用します')}};$('eraserOpacity')?.addEventListener('input',e=>{state.eraserOpacity=Math.max(.01,Math.min(1,Number(e.target.value)/100));$('eraserOpacityValue').textContent=e.target.value+'%';state.strokePreviewCacheKey=null;markDirty();requestRender()});$('eraserHardness')?.addEventListener('input',e=>{state.eraserHardness=Math.max(0,Math.min(1,Number(e.target.value)/100));$('eraserHardnessValue').textContent=e.target.value+'%';state.strokePreviewCacheKey=null;markDirty();requestRender()});$('eraserMode')?.addEventListener('change',e=>{state.eraserMode=e.target.value==='soft'?'soft':'hard';state.strokePreviewCacheKey=null;markDirty();requestRender()});$('eraserPressureOpacity')?.addEventListener('change',e=>{state.eraserPressureOpacity=!!e.target.checked;state.strokePreviewCacheKey=null;markDirty()});$('eraserPreset')?.addEventListener('change',e=>applyEraserPreset(e.target.value));document.querySelectorAll('[data-eraser-preset]').forEach(b=>b.addEventListener('click',()=>{const select=$('eraserPreset');if(select)select.value=b.dataset.eraserPreset;applyEraserPreset(b.dataset.eraserPreset)}));$('clearActiveLayerPixels')?.addEventListener('click',()=>{if(confirm('選択中のレイヤーの描画をすべて消去します。背景や他のレイヤーは変更されません。よろしいですか？'))clearActiveLayer()});
$('smudgeStrength').oninput=e=>{state.smudgeStrength=Number(e.target.value)/100;$('smudgeStrengthValue').textContent=e.target.value+'%'};$('waterPreset').onchange=e=>{const presets={wet:[.78,.78,.22,.34],wash:[.50,.58,.14,.42],granulating:[.42,.38,.88,.50],dry:[.20,.22,.58,.78],bloom:[.92,.92,.46,.24]};const v=presets[e.target.value]||presets.wet;[state.waterAmount,state.waterDiffusion,state.waterGranulation,state.waterDrying]=v;$('waterAmount').value=Math.round(v[0]*100);$('waterAmountValue').textContent=$('waterAmount').value+'%';$('waterDiffusion').value=Math.round(v[1]*100);$('waterDiffusionValue').textContent=$('waterDiffusion').value+'%';$('waterGranulation').value=Math.round(v[2]*100);$('waterGranulationValue').textContent=$('waterGranulation').value+'%';$('waterDrying').value=Math.round(v[3]*100);$('waterDryingValue').textContent=$('waterDrying').value+'%'};$('waterAbsorption').oninput=e=>{state.waterAbsorption=Number(e.target.value)/100;$('waterAbsorptionValue').textContent=e.target.value+'%'};$('waterDiffusion').oninput=e=>{state.waterDiffusion=Number(e.target.value)/100;$('waterDiffusionValue').textContent=e.target.value+'%'};$('waterGranulation').oninput=e=>{state.waterGranulation=Number(e.target.value)/100;$('waterGranulationValue').textContent=e.target.value+'%'};$('waterDrying').oninput=e=>{state.waterDrying=Number(e.target.value)/100;$('waterDryingValue').textContent=e.target.value+'%'};
 $('waterSpread').oninput=e=>{state.waterSpread=Number(e.target.value)/100;$('waterSpreadValue').textContent=e.target.value+'%'};$('edgeDarkening').oninput=e=>{state.edgeDarkening=Number(e.target.value)/100;$('edgeDarkeningValue').textContent=e.target.value+'%'};
 $('traceScale').oninput=e=>{if(state.reference)state.reference.scale=Number(e.target.value)/100;$('traceScaleValue').textContent=e.target.value+'%';renderLayers();markDirty()};$('traceX').oninput=e=>{if(state.reference)state.reference.x=Number(e.target.value);$('traceXValue').textContent=e.target.value;renderLayers();markDirty()};$('traceY').oninput=e=>{if(state.reference)state.reference.y=Number(e.target.value);$('traceYValue').textContent=e.target.value;renderLayers();markDirty()};$('traceReset').onclick=()=>{if(state.reference){state.reference.scale=1;state.reference.x=0;state.reference.y=0;updateUI();renderLayers();markDirty()}};
 $('exportScale').onchange=e=>state.exportScale=Number(e.target.value)||1;$('exportQuality').oninput=e=>{$('exportQualityValue').textContent=e.target.value+'%';state.exportQuality=Number(e.target.value)/100};$('exportMatte').oninput=e=>state.exportMatte=e.target.value;$('documentDpi').onchange=e=>{state.dpi=Math.max(36,Math.min(1200,Number(e.target.value)||300));e.target.value=state.dpi;markDirty()};
 $('newPreset').onchange=e=>applyCanvasPreset(e.target.value,true);$('canvasPreset').onchange=e=>applyCanvasPreset(e.target.value,false);
$('sizeRange').addEventListener('input',e=>{$('sizeNumber').value=e.target.value;state.size=Number(e.target.value)});$('sizeNumber').addEventListener('change',e=>{state.size=Math.max(1,Math.min(500,Number(e.target.value)||1));$('sizeRange').value=Math.min(250,state.size);e.target.value=state.size});$('opacityRange').addEventListener('input',e=>{state.opacity=Number(e.target.value)/100;$('opacityValue').textContent=e.target.value+'%'});$('stabilizerRange').addEventListener('input',e=>{state.stabilizer=Number(e.target.value)/100;$('stabilizerValue').textContent=e.target.value});$('hardness').addEventListener('input',e=>{state.hardness=Number(e.target.value)/100;$('hardnessValue').textContent=e.target.value+'%'});$('spacing').addEventListener('input',e=>$('spacingValue').textContent=e.target.value+'%');$('symmetry').addEventListener('change',e=>{state.symmetry=e.target.value;renderLayers()});$('layerOpacity').addEventListener('input',e=>{const l=activeLayer();if(l){l.opacity=Number(e.target.value)/100;$('layerOpacityValue').textContent=e.target.value+'%';renderLayers();markDirty()}});$('blendMode').addEventListener('change',e=>{const l=activeLayer();if(l){l.blend=e.target.value;renderLayers();markDirty()}});
 $('objectRotation').oninput=e=>$('objectRotationValue').textContent=e.target.value+'°';$('objectScale').oninput=e=>$('objectScaleValue').textContent=e.target.value+'%';$('applyObjectTransform').onclick=applySelectedTransform;$('resetObjectTransform').onclick=()=>{$('objectRotation').value=0;$('objectRotationValue').textContent='0°';$('objectScale').value=100;$('objectScaleValue').textContent='100%';$('objectX').value=0;$('objectY').value=0};$('rotateLeft15').onclick=()=>{$('objectRotation').value=Math.max(-180,Number($('objectRotation').value)-15);$('objectRotation').dispatchEvent(new Event('input'));applySelectedTransform()};$('rotateRight15').onclick=()=>{$('objectRotation').value=Math.min(180,Number($('objectRotation').value)+15);$('objectRotation').dispatchEvent(new Event('input'));applySelectedTransform()};$('rotateObject90').onclick=()=>applyObjectTransform(Math.PI/2,1,0,0);$('flipObjectH').onclick=()=>applyObjectTransform(0,1,0,0,true);$('waterSim').onclick=applyWaterSimulation;
 $('strokeSmoothing').oninput=e=>{state.strokeSmoothing=Number(e.target.value)/100;$('strokeSmoothingValue').textContent=e.target.value+'%';markDirty()};$('strokeTaper').oninput=e=>{state.strokeTaper=Number(e.target.value)/100;$('strokeTaperValue').textContent=e.target.value+'%';markDirty()};$('paperInteraction').oninput=e=>{state.paperInteraction=Number(e.target.value)/100;$('paperInteractionValue').textContent=e.target.value+'%';markDirty()};$('textureDetail').oninput=e=>{state.textureDetail=Number(e.target.value)/100;$('textureDetailValue').textContent=e.target.value+'%';markDirty()};$('paperFiberDirection')?.addEventListener('input',e=>{state.paperFiberDirection=Number(e.target.value);$('paperFiberDirectionValue').textContent=e.target.value+'°';paperTileCache={};renderLayers();markDirty()});$('paperGrainScale')?.addEventListener('input',e=>{state.paperGrainScale=Number(e.target.value)/100;$('paperGrainScaleValue').textContent=state.paperGrainScale.toFixed(2)+'×';paperTileCache={};renderLayers();markDirty()});$('paperSurfaceRelief')?.addEventListener('input',e=>{state.paperSurfaceRelief=Number(e.target.value)/100;$('paperSurfaceReliefValue').textContent=e.target.value+'%';paperTileCache={};renderLayers();markDirty()});$('renderQuality').onchange=e=>{state.renderQuality=e.target.value;resizeDisplay();setStatus('描画品質: '+e.target.selectedOptions[0].text);markDirty()};$('feelPreset').onchange=e=>{const presets={neutral:[.12,.2],paper:[.48,.35],glass:[.02,.08],canvas:[.62,.3],rough:[.72,.48],ink:[.38,.6],soft:[.28,.3]};const v=presets[e.target.value]||presets.neutral;state.feelFriction=v[0];state.feelSmoothing=v[1];$('feelFriction').value=Math.round(v[0]*100);$('feelSmoothing').value=Math.round(v[1]*100);$('feelFrictionValue').textContent=$('feelFriction').value+'%';$('feelSmoothingValue').textContent=$('feelSmoothing').value+'%'};$('feelFriction').oninput=e=>{state.feelFriction=Number(e.target.value)/100;$('feelFrictionValue').textContent=e.target.value+'%'};$('feelSmoothing').oninput=e=>{state.feelSmoothing=Number(e.target.value)/100;$('feelSmoothingValue').textContent=e.target.value+'%'};$('pressureCurve').oninput=e=>{state.pressureCurve=Number(e.target.value)/100;$('pressureCurveValue').textContent=(state.pressureCurve).toFixed(2)+'×'};$('tiltEnabled').onchange=e=>state.tiltEnabled=e.target.checked;$('lowMemoryMode').onchange=e=>{state.lowMemory=e.target.checked;resizeDisplay();toast(state.lowMemory?'軽量モード ON':'標準描画モード')};$('tabletMode').onchange=e=>document.body.classList.toggle('tablet-mode',e.target.checked);$('touchPalmRejection')?.addEventListener('change',e=>{state.touchPalmRejection=e.target.checked;markDirty()});$('detectDevice').onclick=()=>{const touch=navigator.maxTouchPoints||0,mem=navigator.deviceMemory||'不明';toast('入力: '+(window.PointerEvent?'Pointer Events':'基本入力')+' · 最大'+touch+'点タッチ · メモリ目安 '+mem+'GB');};
 $('addLayer').onclick=()=>addLayer();$('duplicateLayer').onclick=duplicateLayer;$('deleteLayer').onclick=deleteLayer;$('layerUp').onclick=()=>moveLayer(1);$('layerDown').onclick=()=>moveLayer(-1);$('mergeDown').onclick=mergeDown;
 $('undoBtn').onclick=doUndo;$('redoBtn').onclick=doRedo;$('zoomIn').onclick=()=>zoomAt(1.2,stage.clientWidth/2,stage.clientHeight/2);$('zoomOut').onclick=()=>zoomAt(1/1.2,stage.clientWidth/2,stage.clientHeight/2);$('fitBtn').onclick=fitView;$('centerBtn').onclick=()=>{state.panX=(stage.clientWidth-state.width*state.zoom)/2;state.panY=(stage.clientHeight-state.height*state.zoom)/2;renderLayers()};$('gridToggle').onchange=e=>{state.grid=e.target.checked;stage.style.backgroundImage=state.grid?'radial-gradient(#293342 0.7px,transparent .7px)':'none'};$('backgroundMode').onchange=e=>{state.bg=e.target.value;renderLayers();markDirty()};
 $('newBtn').onclick=openNewDialog;$('cancelNew').onclick=()=>$('newModal').classList.add('hidden');$('createNew').onclick=createNew;$('saveBtn').onclick=saveProject;$('saveProject').onclick=saveProject;$('loadProject').onclick=openProject;$('projectInput').onchange=e=>{if(e.target.files[0])openProjectFile(e.target.files[0]);e.target.value=''};$('importBtn').onclick=()=>$('imageInput').click();$('psdImportBtn').onclick=()=>$('psdInput').click();$('openPsd').onclick=()=>$('psdInput').click();$('psdInput').onchange=e=>{if(e.target.files[0])openPSDFile(e.target.files[0]);e.target.value=''};$('exportPsd').onclick=exportPSD;$('imageInput').onchange=e=>{if(e.target.files[0])importImage(e.target.files[0]);e.target.value=''};$('exportPng').onclick=()=>exportImage('image/png');$('exportJpg').onclick=()=>exportImage('image/jpeg');$('exportWebp').onclick=()=>exportImage('image/webp');

 $('brushPreset').onchange=e=>{const previous=state.brushPreset,next=e.target.value;if(previous!==next&&$('brushProfileAuto')?.checked&&previous)saveBrushProfileFor(previous,{silent:true});state.brushPreset=next;if($('rainbowSettingsPanel'))$('rainbowSettingsPanel').hidden=next!=='rainbow';if(previous!==next&&$('brushProfileAuto')?.checked)applyBrushProfileFor(next,{silent:true});if($('brushProfileName'))$('brushProfileName').value=state.brushProfiles?.[next]?.name||'';if($('brushProfileSelect'))$('brushProfileSelect').value=state.brushProfiles?.[next]?next:'';setStatus('画材: '+e.target.options[e.target.selectedIndex].text);renderBrushFavorites?.();renderBrushProfileLibrary?.();renderBrushProfileCopyTargets?.();updateBrushPreview?.();if($('brushInfoLive'))$('brushInfoLive').textContent=brushInfo(state.brushPreset);markDirty()};
 $('rainbowDirection').onchange=e=>{state.rainbowDirection=['along','horizontal','vertical'].includes(e.target.value)?e.target.value:'along';state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;markDirty();schedulePersistentEditorPreferenceSave?.();};
 $('rainbowPhase')?.addEventListener('input',e=>{state.rainbowPhase=Math.max(0,Math.min(360,Number(e.target.value)||0));if($('rainbowPhaseValue'))$('rainbowPhaseValue').textContent=state.rainbowPhase+'°';state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;});$('rainbowPhase')?.addEventListener('change',()=>{markDirty();schedulePersistentEditorPreferenceSave?.()});
 $('rainbowReverse')?.addEventListener('change',e=>{state.rainbowReverse=!!e.target.checked;state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;markDirty();schedulePersistentEditorPreferenceSave?.();toast(state.rainbowReverse?'虹色の流れる順番を逆にしました':'虹色の流れる順番を標準にしました')});
 $('rainbowCycles').oninput=e=>{state.rainbowCycles=Math.max(.5,Math.min(10,(Number(e.target.value)||5)/2));$('rainbowCyclesValue').textContent=state.rainbowCycles.toFixed(1)+' 周';state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;};
 $('rainbowMix').oninput=e=>{state.rainbowMix=Number(e.target.value)/100;$('rainbowMixValue').textContent=e.target.value+'%';state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;};
 $('rainbowColorPickup').onchange=e=>{state.rainbowColorPickup=!!e.target.checked;state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;markDirty();schedulePersistentEditorPreferenceSave?.();};$('smudgeSampleMerged')?.addEventListener('change',e=>{state.smudgeSampleMerged=!!e.target.checked;markDirty();schedulePersistentEditorPreferenceSave?.();toast(state.smudgeSampleMerged?'指先混色：表示中のレイヤー全体を参照':'指先混色：選択中レイヤーのみ');});$('rainbowSmudgeButton')?.addEventListener('click',()=>{state.smudgeSampleMerged=true;if($('smudgeSampleMerged'))$('smudgeSampleMerged').checked=true;markDirty();schedulePersistentEditorPreferenceSave?.();setTool('smudge');setStatus('指先・混色：表示レイヤー全体の虹色を拾って伸ばします');toast('虹色の指先混色モードです。色を伸ばしたい場所をなぞってください')});$('rainbowCycles').addEventListener('change',()=>{markDirty();schedulePersistentEditorPreferenceSave?.()});$('rainbowMix').addEventListener('change',()=>{markDirty();schedulePersistentEditorPreferenceSave?.()});
 $('brushFlow').oninput=e=>{state.brushFlow=Number(e.target.value)/100;$('brushFlowValue').textContent=e.target.value+'%'};$('brushJitter').oninput=e=>{state.brushJitter=Number(e.target.value)/100;$('brushJitterValue').textContent=e.target.value+'%'};$('brushAngle').oninput=e=>{state.brushAngle=Number(e.target.value);$('brushAngleValue').textContent=e.target.value+'°'};$('pressureOpacity').onchange=e=>state.pressureOpacity=e.target.checked;$('curveBend').oninput=e=>{state.curveBend=Number(e.target.value)/100;$('curveBendValue').textContent=e.target.value+'%'};$('polygonSides').oninput=e=>{state.polygonSides=Number(e.target.value);$('polygonSidesValue').textContent=e.target.value+'辺'};$('waterAmount').oninput=e=>{state.waterAmount=Number(e.target.value)/100;$('waterAmountValue').textContent=e.target.value+'%'};$('pigment').oninput=e=>{state.pigment=Number(e.target.value)/100;$('pigmentValue').textContent=e.target.value+'%'};$('paperTexture').onchange=e=>{state.paperTexture=e.target.value;renderLayers();markDirty()};$('paperStrength').oninput=e=>{state.paperStrength=Number(e.target.value)/100;$('paperStrengthValue').textContent=e.target.value+'%';renderLayers();markDirty()};
 $('loadTrace').onclick=()=>$('traceInput').click();$('traceInput').onchange=e=>{if(e.target.files[0])loadTraceImage(e.target.files[0]);e.target.value=''};$('clearTrace').onclick=()=>{state.reference=null;renderLayers();markDirty();toast('下敷きを解除しました')};$('traceOpacity').oninput=e=>{if(state.reference)state.reference.opacity=Number(e.target.value)/100;$('traceOpacityValue').textContent=e.target.value+'%';renderLayers();markDirty()};$('traceVisible').onchange=e=>{if(state.reference)state.reference.visible=e.target.checked;renderLayers();markDirty()};
 $('placeText').onclick=()=>setTool('text');$('editTextLayer').onclick=editSelectedText;$('framePrev').onclick=()=>switchFrame(state.frameIndex-1);$('frameNext').onclick=()=>switchFrame(state.frameIndex+1);$('frameAdd').onclick=()=>addAnimationFrame(false);$('frameDuplicate').onclick=()=>addAnimationFrame(true);$('frameDelete').onclick=deleteAnimationFrame;$('frameMoveLeft')?.addEventListener('click',()=>moveAnimationFrame(-1));$('frameMoveRight')?.addEventListener('click',()=>moveAnimationFrame(1));$('animationPlay').onclick=toggleAnimation;$('animationFps').oninput=e=>$('animationFpsValue').textContent=e.target.value;$('onionSkin').onchange=async e=>{state.onionSkin=e.target.checked;await refreshOnionGhost();renderLayers()};$('animationExport').onclick=exportAnimationWebM;$('animationPNGExport')?.addEventListener('click',exportAnimationPNGSequence);$('animationSpriteExport')?.addEventListener('click',exportAnimationSpriteSheet);$('exportOra').onclick=exportOpenRaster;
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>applyFilter(b.dataset.filter));$('flipH').onclick=()=>flipLayers('h');$('flipV').onclick=()=>flipLayers('v');$('rotate90').onclick=rotateLayers90;$('randomPalette').onclick=randomPalette;
 function closeQuickMenu(){$('menuPopup').classList.add('hidden')}
 function openQuickMenu(kind,anchor){const pop=$('menuPopup');const menus={
  menuFile:[['新しいキャンバス',openNewDialog],['プロジェクトを開く',openProject],['プロジェクトを保存',saveProject],['separator'],['画像をレイヤーとして読み込む',()=>$('imageInput').click()],['写真を下敷きに読み込む',()=>$('traceInput').click()],['PSDを開く',()=>$('psdInput').click()],['PSDで保存',exportPSD],['separator'],['PNGを書き出す',()=>$('exportPng').click()],['JPGを書き出す',()=>$('exportJpg').click()],['WebPを書き出す',()=>$('exportWebp').click()],['OpenRasterを書き出す',exportOpenRaster]],
  menuEdit:[['元に戻す · Ctrl+Z',doUndo],['やり直す · Ctrl+Shift+Z',doRedo],['separator'],['レイヤーを複製',duplicateLayer],['レイヤーを削除',deleteLayer],['下のレイヤーと結合',mergeDown]],
  menuCanvas:[['画面に合わせる',fitView],['キャンバス中央へ',()=>$('centerBtn').click()],['separator'],['左右反転',flipHorizontal],['上下反転',flipVertical],['90°回転',rotateLayers90],['新規レイヤー',()=>addLayer()]],
  menuView:[['設定パネル表示/非表示',()=>$('rightbar').classList.toggle('collapsed')],['グリッド表示切替',()=>{$('gridToggle').checked=!$('gridToggle').checked;$('gridToggle').dispatchEvent(new Event('change'))}],['対称描画へ移動',()=>$('symmetry').focus()],['ズームをリセット',fitView]],
  menuHelp:[['使い方サイト・操作ガイドを開く',()=>window.PFStudio?.openHelp?.()],['アップデート情報を再表示',()=>window.PFStudio?.showUpdateNotice?.()],['キーボードショートカット',()=>toast('B ブラシ · E 消しゴム · L 線 · R 四角 · O 楕円 · D グラデーション · M レイヤー移動 · T 文字 · Space+ドラッグ 移動')],['このアプリについて',()=>toast('PIXEL FORGE STUDIO · Web Studio Edition v'+PF_APP_RELEASE)]]
 };
 pop.innerHTML='';(menus[kind]||[]).forEach(([label,action])=>{if(label==='separator'){const d=document.createElement('div');d.className='menuDivider';pop.appendChild(d);return}const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{closeQuickMenu();action()};pop.appendChild(b)});const r=anchor.getBoundingClientRect();pop.classList.remove('hidden');pop.style.position='fixed';const vv=window.visualViewport,vw=vv?.width||window.innerWidth,vh=vv?.height||window.innerHeight,ox=vv?.offsetLeft||0,oy=vv?.offsetTop||0;pop.style.left=Math.max(8+ox,Math.min(ox+vw-230,r.left))+'px';pop.style.top=Math.min(r.bottom+5,Math.max(8+oy,oy+vh-pop.offsetHeight-8))+'px'}
 $('menuFile').onclick=e=>openQuickMenu('menuFile',e.currentTarget);$('menuEdit').onclick=e=>openQuickMenu('menuEdit',e.currentTarget);$('menuCanvas').onclick=e=>openQuickMenu('menuCanvas',e.currentTarget);$('menuView').onclick=e=>openQuickMenu('menuView',e.currentTarget);$('menuHelp').onclick=e=>openQuickMenu('menuHelp',e.currentTarget);
 $('mobileMore')?.addEventListener('click',e=>{
  const anchor=e.currentTarget,pop=$('menuPopup'),r=anchor.getBoundingClientRect();pop.innerHTML='';
  const groups=[['ファイル','menuFile'],['編集','menuEdit'],['キャンバス','menuCanvas'],['表示','menuView'],['ヘルプ','menuHelp']];
  for(const [label,kind] of groups){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>openQuickMenu(kind,anchor);pop.appendChild(b)}
  pop.classList.remove('hidden');pop.style.position='fixed';const vv=window.visualViewport,vw=vv?.width||window.innerWidth,vh=vv?.height||window.innerHeight,ox=vv?.offsetLeft||0,oy=vv?.offsetTop||0;pop.style.left=Math.max(8+ox,Math.min(ox+vw-230,r.left))+'px';pop.style.top=Math.max(8+oy,Math.min(oy+vh-pop.offsetHeight-8,r.top-pop.offsetHeight-5))+'px';
 });
 $('mobileHomeButton')?.addEventListener('click',()=>goHome());
 $('mobileSaveButton')?.addEventListener('click',()=>saveProject());
 $('mobilePanelClose')?.addEventListener('click',()=>setSettingsPanelOpen(false));
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('#menuPopup')&&!e.target.closest('.menu button'))closeQuickMenu()});
 function flipHorizontal(){flipLayers('h')}function flipVertical(){flipLayers('v')}
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('mobile-panel-open')){setSettingsPanelOpen(false);return;}if(e.target.matches('input,textarea,select'))return;if(e.code==='Space'){state.space=true;e.preventDefault()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?doRedo():doUndo();return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='j'){e.preventDefault();duplicateLayer();return}if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='n'){e.preventDefault();addLayer();return}if((e.ctrlKey||e.metaKey)&&e.key===']'){e.preventDefault();moveLayer(1);return}if((e.ctrlKey||e.metaKey)&&e.key==='['){e.preventDefault();moveLayer(-1);return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveProject();return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='o'){e.preventDefault();openProject();return}if(e.key==='['){state.size=Math.max(1,state.size-2);$('sizeNumber').value=state.size;$('sizeRange').value=Math.min(250,state.size)}if(e.key===']'){state.size=Math.min(500,state.size+2);$('sizeNumber').value=state.size;$('sizeRange').value=Math.min(250,state.size)}const shortcuts={b:'brush',e:'eraser',s:'smudge',l:'line',r:'rect',o:'ellipse',g:'fill',i:'eyedropper',h:'hand',t:'text',d:'gradient',m:'move',v:'transform',u:'curve',y:'polygon',a:'arrow'};if(!e.ctrlKey&&!e.metaKey&&shortcuts[e.key.toLowerCase()])setTool(shortcuts[e.key.toLowerCase()])});window.addEventListener('keyup',e=>{if(e.code==='Space')state.space=false});window.addEventListener('blur',()=>{if(state.animationPlaying)stopAnimationPlayback({save:false,quiet:true});state.space=false;if(state.pointerDown&&['brush','eraser','smudge'].includes(state.strokeTool||state.pointerTool||state.tool))finishActiveBrushStroke();else if(state.pointerDown)stagePointerUp({});state.panning=false;state.panStart=null;state.gesturePointers.clear();state.gesturePinch=null;flushPendingDisplayResize();});syncResponsiveLayout();if(window.ResizeObserver){const stageResizeObserver=new ResizeObserver(scheduleDisplayResize);stageResizeObserver.observe(stage);}window.addEventListener('resize',scheduleDisplayResize,{passive:true});window.visualViewport?.addEventListener('resize',scheduleDisplayResize,{passive:true});window.addEventListener('orientationchange',scheduleDisplayResize,{passive:true});window.addEventListener('pageshow',scheduleDisplayResize,{passive:true});
 // Brush Lab: all additional controls are additive; existing brush controls remain untouched.
 const bindRange=(id,key,scale=100)=>{const node=$(id);if(!node)return;node.addEventListener('input',e=>{state[key]=Number(e.target.value)/scale;const out=$(id+'Value');if(out)out.textContent=Math.round(Number(e.target.value))+'%';markDirty();updateBrushPreview()});};
 for(const [id,key] of [['velocitySize','velocitySize'],['velocityOpacity','velocityOpacity'],['taperStart','taperStart'],['taperEnd','taperEnd'],['wetEdge','wetEdge'],['edgeSoftness','edgeSoftness'],['nibTiltSensitivity','nibTiltSensitivity']])bindRange(id,key);
 const advancedStrokeRanges={strokeStability:['strokeStabilityValue',v=>Math.round(v*100)+'%'],strokePressureSmoothing:['strokePressureSmoothingValue',v=>Math.round(v*100)+'%'],pressureFloor:['pressureFloorValue',v=>Math.round(v*100)+'%'],pressureCeiling:['pressureCeilingValue',v=>Math.round(v*100)+'%'],strokeSampleDensity:['strokeSampleDensityValue',v=>v.toFixed(2)+'×'],strokeResampleQuality:['strokeResampleQualityValue',v=>Math.round(v*100)+'%']};
 Object.entries(advancedStrokeRanges).forEach(([id,[out,fmt]])=>{const el=$(id);if(!el)return;el.addEventListener('input',e=>{state[id]=Number(e.target.value)/100;if($(out))$(out).textContent=fmt(state[id]);markDirty()})});
 $('strokePreviewMode')?.addEventListener('change',e=>{state.strokePreviewMode=e.target.value;markDirty();requestRender();toast(state.strokePreviewMode==='accurate'?'高精度プレビュー':'低遅延プレビュー')});
 $('pressureProfile')?.addEventListener('change',e=>{state.pressureProfile=e.target.value;markDirty();updateBrushPreview()});$('textureScale')?.addEventListener('change',e=>{state.textureScale=Number(e.target.value)||1;markDirty();updateBrushPreview()});$('strokeCorrection')?.addEventListener('change',e=>{state.strokeCorrection=e.target.value;state.strokeSmoothing=e.target.value==='precise'?.58:e.target.value==='loose'?.18:.42;$('strokeSmoothing').value=Math.round(state.strokeSmoothing*100);$('strokeSmoothingValue').textContent=Math.round(state.strokeSmoothing*100)+'%';markDirty()});
 $('brushSearch')?.addEventListener('input',filterBrushOptions);$('brushCategory')?.addEventListener('change',filterBrushOptions);$('brushFavoriteToggle')?.addEventListener('click',setBrushFavorite);$('brushGuideBtn')?.addEventListener('click',showBrushGuide);$('brushGuideClose')?.addEventListener('click',closeBrushGuide);$('brushLabReset')?.addEventListener('click',resetBrushLab);
 document.querySelectorAll('[data-brush-pack]').forEach(b=>b.addEventListener('click',()=>applyBrushQuickPreset(b.dataset.brushPack)));
 $('brushPreset')?.addEventListener('change',()=>{renderBrushFavorites();updateBrushPreview();const info=$('brushInfoLive');if(info)info.textContent=brushInfo(state.brushPreset)});
 $('saveBrushProfile')?.addEventListener('click',()=>saveBrushProfileFor(state.brushPreset));
  $('copyBrushProfileToTarget')?.addEventListener('click',copyCurrentBrushProfileToTarget);
 $('applyBrushProfile')?.addEventListener('click',()=>{const id=$('brushProfileSelect')?.value||state.brushPreset;if(!applyBrushProfileFor(id))toast('この画材の保存設定はありません')});
 $('deleteBrushProfile')?.addEventListener('click',resetCurrentBrushProfile);
 $('brushProfileSelect')?.addEventListener('change',e=>{if(e.target.value&&$('brushProfileName'))$('brushProfileName').value=state.brushProfiles?.[e.target.value]?.name||''});$('brushProfileName')?.addEventListener('input',()=>{if($('brushProfileSelect'))$('brushProfileSelect').value=''});
 $('exportBrushProfiles')?.addEventListener('click',exportBrushProfilePack);
 $('importBrushProfiles')?.addEventListener('click',()=>$('brushProfileFile')?.click());
 $('brushProfileFile')?.addEventListener('change',e=>{if(e.target.files?.[0])importBrushProfilePack(e.target.files[0]);e.target.value=''});
 const profileControlSet=new Set(BRUSH_PROFILE_FORM_IDS);document.addEventListener('input',e=>{if(profileControlSet.has(e.target?.id))scheduleActiveBrushProfileSave()});document.addEventListener('change',e=>{if(profileControlSet.has(e.target?.id))scheduleActiveBrushProfileSave()});
 $('brushProfileAuto')?.addEventListener('change',()=>{state.brushProfileAuto=$('brushProfileAuto').checked;markDirty();toast(state.brushProfileAuto?'画材別の設定を自動記憶します':'画材別の自動記憶を停止しました')});

 $('brushGuideModal')?.addEventListener('click',e=>{if(e.target.id==='brushGuideModal')closeBrushGuide()});
 window.addEventListener('keydown',e=>{if(e.key==='F1'){e.preventDefault();showBrushGuide()}if(e.key==='Escape')closeBrushGuide()});
 // v16 micro-physics controls: each setting is stored in project metadata and brush profiles.
 const percentBindings={brushAspect:['brushAspect',100],bristleSpread:['bristleSpread',100],bristleStiffness:['bristleStiffness',100],paintThickness:['paintThickness',100],pigmentLoad:['pigmentLoad',100],pigmentGranulation:['pigmentGranulation',100],edgeRoughness:['edgeRoughness',100],tipRotationJitter:['tipRotationJitter',100],stampSpacingFine:['stampSpacingFine',100],textureContrast:['textureContrast',100],colorPickup:['colorPickup',100],wetMix:['wetMix',100],wetBleed:['wetBleed',100],edgePooling:['edgePooling',100],strokeWetness:['strokeWetness',100],paperTooth:['paperTooth',100],paperFiberDensity:['paperFiberDensity',100],paperFiberLength:['paperFiberLength',100],paperWarp:['paperWarp',100],paperNoise:['paperNoise',100],paperBrightness:['paperBrightness',100],paperPorosity:['paperPorosity',100],canvasWeave:['canvasWeave',100],paperBleed:['paperBleed',100],touchSmoothing:['touchSmoothing',100],touchMinDistance:['touchMinDistance',100],mobileToolbarScale:['mobileToolbarScale',100],mobileDockOpacity:['mobileDockOpacity',100],pressureWidthGain:['pressureWidthGain',100],tiltWidthGain:['tiltWidthGain',100],nibFollow:['nibFollow',100],strokeWidthNoise:['strokeWidthNoise',100],strokeWidthWave:['strokeWidthWave',100],strokeTaperPower:['strokeTaperPower',100],bristleSplay:['bristleSplay',100],bristleLengthVariation:['bristleLengthVariation',100],bristleClumping:['bristleClumping',100],bristleCurl:['bristleCurl',100],bristleLag:['bristleLag',100],bristleWaviness:['bristleWaviness',100],bristleWidthVariation:['bristleWidthVariation',100],bristleOpacityVariation:['bristleOpacityVariation',100],bristleDensity:['bristleDensity',100],bristleWetness:['bristleWetness',100],bristleColorVariation:['bristleColorVariation',100],paintDrag:['paintDrag',100],pigmentReservoir:['pigmentReservoir',100],pigmentDepletion:['pigmentDepletion',100],strokeDrying:['strokeDrying',100],wetEdgeSpread:['wetEdgeSpread',100],edgeBreakup:['edgeBreakup',100]};
 const valueFormat={brushAspect:v=>Math.round(v*100)+'%',bristleSpread:v=>Math.round(v*100)+'%',bristleStiffness:v=>Math.round(v*100)+'%',paintThickness:v=>Math.round(v*100)+'%',pigmentLoad:v=>Math.round(v*100)+'%',pigmentGranulation:v=>Math.round(v*100)+'%',edgeRoughness:v=>Math.round(v*100)+'%',tipRotationJitter:v=>Math.round(v*100)+'%',stampSpacingFine:v=>Math.round(v*100)+'%',textureContrast:v=>Math.round(v*100)+'%',colorPickup:v=>Math.round(v*100)+'%',wetMix:v=>Math.round(v*100)+'%',wetBleed:v=>Math.round(v*100)+'%',edgePooling:v=>Math.round(v*100)+'%',strokeWetness:v=>Math.round(v*100)+'%',paperTooth:v=>Math.round(v*100)+'%',paperFiberDensity:v=>Math.round(v*100)+'%',paperFiberLength:v=>Math.round(v*100)+'%',paperWarp:v=>Math.round(v*100)+'%',paperNoise:v=>Math.round(v*100)+'%',paperBrightness:v=>Math.round(v*100)+'%',paperPorosity:v=>Math.round(v*100)+'%',canvasWeave:v=>Math.round(v*100)+'%',paperBleed:v=>Math.round(v*100)+'%',touchSmoothing:v=>Math.round(v*100)+'%',touchMinDistance:v=>(v).toFixed(2)+' px',mobileToolbarScale:v=>Math.round(v*100)+'%',mobileDockOpacity:v=>Math.round(v*100)+'%',pressureWidthGain:v=>Math.round(v*100)+'%',tiltWidthGain:v=>Math.round(v*100)+'%',nibFollow:v=>Math.round(v*100)+'%',strokeWidthNoise:v=>Math.round(v*100)+'%',strokeWidthWave:v=>Math.round(v*100)+'%',strokeTaperPower:v=>v.toFixed(2)+'×',bristleSplay:v=>Math.round(v*100)+'%',bristleLengthVariation:v=>Math.round(v*100)+'%',bristleClumping:v=>Math.round(v*100)+'%',bristleCurl:v=>Math.round(v*100)+'%',bristleLag:v=>Math.round(v*100)+'%',bristleWaviness:v=>Math.round(v*100)+'%',bristleWidthVariation:v=>Math.round(v*100)+'%',bristleOpacityVariation:v=>Math.round(v*100)+'%',bristleDensity:v=>Math.round(v*100)+'%',bristleWetness:v=>Math.round(v*100)+'%',bristleColorVariation:v=>Math.round(v*100)+'%',paintDrag:v=>Math.round(v*100)+'%',pigmentReservoir:v=>Math.round(v*100)+'%',pigmentDepletion:v=>Math.round(v*100)+'%',strokeDrying:v=>Math.round(v*100)+'%',wetEdgeSpread:v=>Math.round(v*100)+'%',edgeBreakup:v=>Math.round(v*100)+'%',colorPickupRadius:v=>Math.round(v)+' px'};
 for(const [id,[key,scale]] of Object.entries(percentBindings)){const el=$(id);if(!el)continue;el.addEventListener('input',e=>{state[key]=Number(e.target.value)/scale;const out=$(id+'Value');if(out)out.textContent=valueFormat[id](state[key]);if(id.startsWith('paper'))paperTileCache={};state.strokePreviewCacheKey=null;markDirty();updateBrushPreview?.();requestRender()})}
 const integerBindings={bristleCount:'bristleCount',palmRejectionRadius:'palmRejectionRadius',paperTemperature:'paperTemperature',colorPickupRadius:'colorPickupRadius'};
 for(const [id,key] of Object.entries(integerBindings)){const el=$(id);if(!el)continue;el.addEventListener('input',e=>{state[key]=Number(e.target.value);const out=$(id+'Value');if(out)out.textContent=id==='bristleCount'?state[key]+'本':(id==='palmRejectionRadius'||id==='colorPickupRadius')?state[key]+' px':(state[key]>0?'+':'')+state[key];if(id==='paperTemperature')paperTileCache={};state.strokePreviewCacheKey=null;markDirty();requestRender()})}
 for(const id of ['brushTipShape','paintBlendMode','mobilePreviewFps','touchDrawMode','nibAngleMode'])$(id)?.addEventListener('change',e=>{state[id]=id==='mobilePreviewFps'?Number(e.target.value):e.target.value;state.strokePreviewCacheKey=null;markDirty();if(id==='touchDrawMode')toast('指の操作: '+e.target.selectedOptions[0].text);requestRender()});
 for(const [id,key] of [['leftHandedUI','leftHandedUI'],['mobileCompactUI','mobileCompactUI'],['showPressureHUD','showPressureHUD'],['tapDotMode','tapDotMode']])$(id)?.addEventListener('change',e=>{state[key]=!!e.target.checked;applyMobileUISettings();markDirty()});
 function applyMobileUISettings(){document.body.classList.toggle('left-handed-ui',!!state.leftHandedUI);document.body.classList.toggle('mobile-compact-ui',!!state.mobileCompactUI);document.documentElement.style.setProperty('--mobile-toolbar-scale',String(state.mobileToolbarScale||1));document.documentElement.style.setProperty('--mobile-dock-alpha',String(state.mobileDockOpacity??.92));const chip=$('devicePressureChip');if(chip)chip.hidden=!state.showPressureHUD;}
 $('resetMobileArtist')?.addEventListener('click',()=>{Object.assign(state,{mobilePreviewFps:45,touchDrawMode:'draw',touchSmoothing:.45,touchMinDistance:.20,palmRejectionRadius:24,leftHandedUI:false,mobileToolbarScale:1,mobileDockOpacity:.92,mobileCompactUI:true,showPressureHUD:true,tapDotMode:true});for(const [id,v] of Object.entries({mobilePreviewFps:'45',touchDrawMode:'draw',touchSmoothing:'45',touchMinDistance:'20',palmRejectionRadius:'24',leftHandedUI:false,mobileToolbarScale:'100',mobileDockOpacity:'92',mobileCompactUI:true,showPressureHUD:true,tapDotMode:true})){const el=$(id);if(el){if(el.type==='checkbox')el.checked=v;else el.value=v}}for(const id of ['touchSmoothing','touchMinDistance','palmRejectionRadius','mobileToolbarScale','mobileDockOpacity']){const out=$(id+'Value'),el=$(id);if(out&&el)out.textContent=id==='touchMinDistance'?(Number(el.value)/100).toFixed(2)+' px':id==='palmRejectionRadius'?el.value+' px':el.value+'%'}applyMobileUISettings();markDirty();toast('スマホ操作設定を初期化しました')});
 document.querySelectorAll('[data-artist-preset]').forEach(button=>button.addEventListener('click',()=>{const presets={watercolor:{brushPreset:'watercolorBloom',paintBlendMode:'multiply',brushTipShape:'round',brushAspect:1.12,paintThickness:.22,pigmentLoad:.72,pigmentGranulation:.74,wetBleed:.78,edgePooling:.66,strokeWetness:.86,waterAmount:.78,wetMix:.75,wetEdge:.58},oil:{brushPreset:'bristleOil',paintBlendMode:'source-over',brushTipShape:'flat',brushAspect:1.3,bristleCount:18,bristleSpread:.66,bristleStiffness:.76,paintThickness:.88,pigmentLoad:1,textureContrast:.72},graphite:{brushPreset:'softGraphite',paintBlendMode:'multiply',brushTipShape:'soft',brushAspect:.84,pigmentLoad:.58,pigmentGranulation:.82,edgeRoughness:.46,textureContrast:.9,paperTooth:.88,paperNoise:.34},ink:{brushPreset:'mappingPen',paintBlendMode:'source-over',brushTipShape:'round',brushAspect:.72,bristleCount:2,paintThickness:.12,pigmentLoad:1,edgeRoughness:.02,wetBleed:.02,strokeWetness:.05}}[button.dataset.artistPreset];if(!presets)return;Object.assign(state,presets);if(presets.brushPreset)$('brushPreset').value=state.brushPreset;if($('paintBlendMode'))$('paintBlendMode').value=state.paintBlendMode;if($('brushTipShape'))$('brushTipShape').value=state.brushTipShape;for(const [id,key] of [['brushAspect','brushAspect'],['paintThickness','paintThickness'],['pigmentLoad','pigmentLoad'],['pigmentGranulation','pigmentGranulation'],['wetBleed','wetBleed'],['edgePooling','edgePooling'],['strokeWetness','strokeWetness'],['wetMix','wetMix'],['paperTooth','paperTooth'],['bristleCount','bristleCount'],['bristleSpread','bristleSpread'],['bristleStiffness','bristleStiffness'],['textureContrast','textureContrast'],['edgeRoughness','edgeRoughness']]){const el=$(id);if(!el)continue;el.value=String(Math.round(Number(state[key])*100));const out=$(id+'Value');if(out)out.textContent=id==='bristleCount'?state[key]+'本':el.value+'%'}markDirty();state.strokePreviewCacheKey=null;updateBrushPreview();toast('画材の物理プリセットを適用しました')}));
 syncEraserSettingsUI();applyMobileUISettings();syncBrushLabUI();filterBrushOptions();
 window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue=''}});
 // Save while the page is merely backgrounded; pagehide performs a final best-effort
 // synchronous snapshot write so a version refresh cannot discard the last stroke.
 let pfHiddenSavePromise=null;
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&state.dirty&&!state.pointerDown){pfHiddenSavePromise=persistCurrentProject().catch(error=>console.warn('Background artwork save failed; original in-memory canvas remains until unload.',error));}});
 window.addEventListener('pagehide',()=>{
  if(!state.dirty||state.pointerDown||!dbConnection)return;
  try{
   const data=projectData();ensureProjectIdentity();data.id=state.projectId;data.updatedAt=Date.now();
   const tx=dbConnection.transaction('projects','readwrite');tx.objectStore('projects').put({id:state.projectId,saved:Date.now(),data});tx.objectStore('projects').put({id:'autosave',projectId:state.projectId,saved:Date.now()});
  }catch(error){console.warn('Final pagehide artwork snapshot could not be queued.',error)}
 },{capture:true});
}

// PIXEL FORGE v18 · persistent artwork library, migration, global settings and PWA install.
const PF_APP_SETTINGS_KEY='pf-app-settings-v1';
let appSettings={theme:'midnight',uiScale:100,autosaveSeconds:7,confirmDelete:true,defaultWidth:1600,defaultHeight:1000,defaultBackground:'white',defaultDpi:300,homeGrid:'comfortable',touchTargets:'normal',reducedMotion:false};

// v24: one versioned snapshot keeps editor, brush, touch and UI preferences between sessions.
const PF_EDITOR_PREFS_KEY='pf-editor-preferences-v2';
const PF_EDITOR_PREFS_FORMAT='PIXEL_FORGE_EDITOR_PREFERENCES';
const PF_EDITOR_PREFS_SCHEMA=2;
let pfPrefsReady=false,pfPrefsRestoring=false,pfPrefsSaveTimer=0,pfPrefsLastSavedAt=0,pfPrefsLastError='',pfPrefsWriteQueue=Promise.resolve(),pfPrefsLastSnapshot=null;
const PF_PREF_FORM_EXCLUDE=new Set(['projectInput','referenceInput','traceFile','pfCommandSearch','librarySearch','newProjectName','settingTheme','settingUiScale','settingAutosave','settingDefaultWidth','settingDefaultHeight','settingDefaultBackground','settingDefaultDpi','settingHomeGrid','settingTouchTargets','settingConfirmDelete','settingReducedMotion']);
function persistentFormIds(){return [...document.querySelectorAll('input[id],select[id],textarea[id]')].filter(el=>{const type=(el.type||'').toLowerCase();return !PF_PREF_FORM_EXCLUDE.has(el.id)&&!['file','button','submit','reset','image','password'].includes(type)&&!el.disabled;}).map(el=>el.id)}
function capturePersistentFormState(){const ids=persistentFormIds(),form=captureFormState(ids);for(const [id,rec] of Object.entries(form)){if(typeof rec.value==='string'&&rec.value.length>8192)delete form[id];}return form;}
function capturePersistentUIState(){const ui=captureUIState();ui.bodyClasses=['tablet-mode','left-handed-ui','mobile-compact-ui'].filter(c=>document.body.classList.contains(c));ui.toolbarHidden=!!document.querySelector('.leftbar')?.classList.contains('hidden');return ui;}
function capturePersistentEditorSnapshot(){
 const editorState=captureEditorState([...new Set([...PROJECT_STATE_KEYS,'bg'])]);
 return{format:PF_EDITOR_PREFS_FORMAT,schema:PF_EDITOR_PREFS_SCHEMA,appVersion:PF_APP_RELEASE,savedAt:Date.now(),appSettings:structuredCloneSafe(appSettings),editorState,formState:capturePersistentFormState(),brushProfiles:structuredCloneSafe(state.brushProfiles||{}),brushFavorites:getBrushFavorites(),uiState:capturePersistentUIState()};
}
function validatePersistentEditorSnapshot(data){
 if(!data||typeof data!=='object'||data.format!==PF_EDITOR_PREFS_FORMAT)throw new Error('PIXEL FORGE設定ファイルではありません');
 const schema=Number(data.schema)||1;if(schema>PF_EDITOR_PREFS_SCHEMA||schema<1)throw new Error('この設定ファイルのバージョンには対応していません');
 if(JSON.stringify(data).length>8*1024*1024)throw new Error('設定ファイルが大きすぎます（最大8MB）');
 if(data.editorState!==undefined&&(!data.editorState||typeof data.editorState!=='object'||Array.isArray(data.editorState)))throw new Error('編集設定データが不正です');
 if(data.formState!==undefined&&(!data.formState||typeof data.formState!=='object'||Array.isArray(data.formState)))throw new Error('画面設定データが不正です');
 return true;
}
function applyPersistentEditorSnapshot(snapshot,{dispatch=true}={}){
 validatePersistentEditorSnapshot(snapshot);pfPrefsRestoring=true;
 try{
  if(snapshot.appSettings&&typeof snapshot.appSettings==='object'){
   const a=snapshot.appSettings;appSettings={...appSettings,...a};
   appSettings.uiScale=Math.max(85,Math.min(120,Number(appSettings.uiScale)||100));
   appSettings.autosaveSeconds=Math.max(3,Math.min(30,Number(appSettings.autosaveSeconds)||7));
   appSettings.defaultWidth=Math.max(64,Math.min(12000,Number(appSettings.defaultWidth)||1600));
   appSettings.defaultHeight=Math.max(64,Math.min(12000,Number(appSettings.defaultHeight)||1000));
   appSettings.defaultDpi=Math.max(36,Math.min(1200,Number(appSettings.defaultDpi)||300));
   try{localStorage.setItem(PF_APP_SETTINGS_KEY,JSON.stringify(appSettings))}catch(_){}
   applyAppSettings();
  }
  if(snapshot.brushProfiles&&typeof snapshot.brushProfiles==='object'&&!Array.isArray(snapshot.brushProfiles)){
   state.brushProfiles=structuredCloneSafe(snapshot.brushProfiles);persistBrushProfiles();
  }
  if(Array.isArray(snapshot.brushFavorites)){try{localStorage.setItem('pf-brush-favorites',JSON.stringify(snapshot.brushFavorites))}catch(_){}}
  if(snapshot.formState)restoreFormState(snapshot.formState,{dispatch});
  const values=snapshot.editorState||{};
  for(const [key,value] of Object.entries(values)){
   if(key==='bg'){if(['white','dark','transparent'].includes(value))state.bg=value;continue;}
   if(PROJECT_STATE_KEYS.includes(key)&&value!==null&&['string','number','boolean'].includes(typeof value)&&(!(typeof value==='number')||Number.isFinite(value)))state[key]=value;
  }
  if(snapshot.uiState)restoreUIState(snapshot.uiState);
  normalizeAdvancedStrokeSettings();normalizeBrushMicroDynamics();
  state.eraserOpacity=Math.max(.01,Math.min(1,Number(state.eraserOpacity??1)));
  state.eraserHardness=Math.max(0,Math.min(1,Number(state.eraserHardness??1)));
  if(!['hard','soft'].includes(state.eraserMode))state.eraserMode='hard';
  applyRestoredMobileUiSettings();applyAppSettings();
  syncBrushLabUI?.();renderBrushProfileLibrary?.();
  updateUI();
  if(snapshot.formState)restoreFormState(snapshot.formState,{dispatch:false});
  if(snapshot.uiState)restoreUIState(snapshot.uiState);
  applyRestoredMobileUiSettings();updateZoom?.();renderTimeline?.();renderLayers();
  state.dirty=false;clearTimeout(autosaveTimer);const status=$('autosaveStatus');if(status)status.textContent='保存済み';
 }finally{pfPrefsRestoring=false;}
}
async function readPersistentEditorSnapshot(){
 let localSnapshot=null;
 try{const raw=localStorage.getItem(PF_EDITOR_PREFS_KEY);if(raw){const data=JSON.parse(raw);validatePersistentEditorSnapshot(data);localSnapshot=data;}}
 catch(error){pfPrefsLastError='ローカル設定の読込: '+(error?.message||error);console.info('Local editor preferences unavailable; trying IndexedDB',error)}
 try{
  const db=await openDB();
  if(db.objectStoreNames.contains('preferences')){
   const tx=db.transaction('preferences','readonly');const row=await idbRequest(tx.objectStore('preferences').get('editor'));await idbTransactionDone(tx);
   if(row?.data){validatePersistentEditorSnapshot(row.data);const idbSnapshot=row.data;if(!localSnapshot||Number(idbSnapshot.savedAt||row.updatedAt||0)>Number(localSnapshot.savedAt||0))return idbSnapshot;}
  }
 }catch(error){pfPrefsLastError='IndexedDB設定の読込: '+(error?.message||error);console.info('IndexedDB preferences unavailable',error)}
 return localSnapshot;
}
async function restorePersistentEditorPreferences(){
 const snapshot=await readPersistentEditorSnapshot();if(!snapshot)return false;
 try{applyPersistentEditorSnapshot(snapshot,{dispatch:true});pfPrefsLastSnapshot=snapshot;pfPrefsLastSavedAt=Number(snapshot.savedAt)||0;return true;}
 catch(error){pfPrefsLastError='設定復元: '+(error?.message||error);console.warn('Editor preferences were not restored',error);return false;}
}
function updatePrefsSaveStatus(message){const el=$('pfPrefsSaveStatus');if(el)el.textContent=message;}
function savePersistentEditorPreferences({quiet=true}={}){
 if(!pfPrefsReady||pfPrefsRestoring)return Promise.resolve(false);
 clearTimeout(pfPrefsSaveTimer);let snapshot=null,localSaved=false,idbSaved=false;
 try{
  snapshot=capturePersistentEditorSnapshot();
  pfPrefsLastSnapshot=snapshot;pfPrefsLastSavedAt=Number(snapshot.savedAt)||Date.now();
  const serialized=JSON.stringify(snapshot);
  localStorage.setItem(PF_EDITOR_PREFS_KEY,serialized);localSaved=true;pfPrefsLastError='';
  updatePrefsSaveStatus('ローカル保存済み · IndexedDB同期中');
 }catch(error){pfPrefsLastError='ローカル保存: '+(error?.message||error);if(snapshot)pfPrefsLastSnapshot=snapshot;updatePrefsSaveStatus('ローカル保存不可 · IndexedDBへ保存中');console.info('Local editor preference save skipped',error)}
 if(!snapshot){if(!quiet)toast('設定を保存できませんでした。設定バックアップを確認してください');return Promise.resolve(false)}
 const payload=snapshot;
 pfPrefsWriteQueue=pfPrefsWriteQueue.catch(()=>{}).then(async()=>{
  const db=await openDB();if(!db.objectStoreNames.contains('preferences'))throw new Error('設定保存領域がありません');
  const tx=db.transaction('preferences','readwrite');tx.objectStore('preferences').put({id:'editor',updatedAt:payload.savedAt,data:payload});await idbTransactionDone(tx);idbSaved=true;
 }).catch(error=>{
  pfPrefsLastError='IndexedDB保存: '+(error?.message||error);console.info('IndexedDB preference mirror skipped',error);
 });
 return pfPrefsWriteQueue.then(()=>{
  const ok=localSaved||idbSaved;
  if(localSaved&&idbSaved)updatePrefsSaveStatus('2か所に保存済み · '+new Date(payload.savedAt).toLocaleTimeString());
  else if(localSaved)updatePrefsSaveStatus('ローカル保存済み · IndexedDB同期不可');
  else if(idbSaved)updatePrefsSaveStatus('IndexedDB保存済み · '+new Date(payload.savedAt).toLocaleTimeString());
  else updatePrefsSaveStatus('保存できません · 設定をバックアップしてください');
  if(!quiet)toast(ok?'筆・UI・タッチ設定を保存しました':'保存できませんでした。設定バックアップを外部へ保存してください');
  return ok;
 },error=>{const ok=localSaved||idbSaved;if(!quiet)toast(ok?'筆・UI・タッチ設定を保存しました':'設定を保存できませんでした');return ok});
}

function schedulePersistentEditorPreferenceSave(){
 if(!pfPrefsReady||pfPrefsRestoring)return;
 clearTimeout(pfPrefsSaveTimer);updatePrefsSaveStatus('設定変更を保存しています…');
 pfPrefsSaveTimer=setTimeout(()=>savePersistentEditorPreferences({quiet:true}),420);
}
function installPersistentEditorPreferenceWatchers(){
 if(pfPrefsReady)return;pfPrefsReady=true;
 const onControl=e=>{const el=e.target;if(!el||!el.id||PF_PREF_FORM_EXCLUDE.has(el.id))return;const type=(el.type||'').toLowerCase();if(['file','button','submit','reset','image','password'].includes(type))return;schedulePersistentEditorPreferenceSave()};
 document.addEventListener('input',onControl,true);document.addEventListener('change',onControl,true);
 document.addEventListener('click',e=>{if(e.target?.closest?.('[data-tool],[data-mobile-tool],.tool,.toolbtn,[data-eraser-preset],[data-artist-preset],#panelToggle,#mobilePanelToggle'))schedulePersistentEditorPreferenceSave() },true);
 const rightbar=$('rightbar');if(typeof MutationObserver==='function'){
  const observer=new MutationObserver(()=>schedulePersistentEditorPreferenceSave());
  if(rightbar)observer.observe(rightbar,{subtree:true,attributes:true,attributeFilter:['class','open']});
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
 }
 document.addEventListener('toggle',e=>{if(e.target?.matches?.('#rightbar details'))schedulePersistentEditorPreferenceSave()},true);
 const flush=()=>{if(!pfPrefsReady||pfPrefsRestoring)return;clearTimeout(pfPrefsSaveTimer);savePersistentEditorPreferences({quiet:true});};
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});window.addEventListener('pagehide',flush);window.addEventListener('beforeunload',flush);
 window.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.key==='['||e.key===']')schedulePersistentEditorPreferenceSave()},{passive:true});
}
function exportPersistentEditorPreferences(){
 try{const snapshot=capturePersistentEditorSnapshot();const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='PIXEL-FORGE-settings-'+new Date().toISOString().slice(0,10)+'.pfsettings';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('設定バックアップを書き出しました');}
 catch(error){toast('設定バックアップを作成できません: '+(error?.message||error));}
}
async function importPersistentEditorPreferences(file){
 if(!file)return;try{const text=await file.text();if(text.length>8*1024*1024)throw new Error('設定ファイルが大きすぎます');const snapshot=JSON.parse(text);validatePersistentEditorSnapshot(snapshot);applyPersistentEditorSnapshot(snapshot,{dispatch:true});await savePersistentEditorPreferences({quiet:true});toast('筆・UI・タッチ設定を復元しました');}
 catch(error){toast('設定を復元できません: '+(error?.message||error));console.error('Preference import failed',error);}
}
function getPersistentPreferencesAudit(){
 const formIds=persistentFormIds();let local=false;try{const raw=localStorage.getItem(PF_EDITOR_PREFS_KEY);if(raw){const d=JSON.parse(raw);local=d?.format===PF_EDITOR_PREFS_FORMAT&&Number(d.schema)<=PF_EDITOR_PREFS_SCHEMA;}}catch(_){}
 return{stateSettings:PROJECT_STATE_KEYS.length,formControls:formIds.length,totalTracked:PROJECT_STATE_KEYS.length+formIds.length,localSnapshot:local,lastSavedAt:pfPrefsLastSavedAt?new Date(pfPrefsLastSavedAt).toISOString():null,lastError:pfPrefsLastError||null,ready:pfPrefsReady};
}
function runPreferenceRoundTrip(){
 try{const source=capturePersistentEditorSnapshot(),encoded=JSON.stringify(source),copy=JSON.parse(encoded);validatePersistentEditorSnapshot(copy);const sourceKeys=Object.keys(source.editorState||{}),copyKeys=Object.keys(copy.editorState||{});const sourceForms=Object.keys(source.formState||{}),copyForms=Object.keys(copy.formState||{});const ok=sourceKeys.length===copyKeys.length&&sourceForms.length===copyForms.length&&sourceKeys.every(k=>JSON.stringify(source.editorState[k])===JSON.stringify(copy.editorState[k]));return{passed:ok,stateCount:sourceKeys.length,formCount:sourceForms.length,bytes:new Blob([encoded]).size,format:copy.format};}
 catch(error){return{passed:false,error:error?.message||String(error)}}
}

let libraryItems=[],legacyAutosaveItem=null,legacyAutosaveData=null,pfInstallPrompt=null;
let selectedLibraryIds=new Set(),visibleLibraryIds=[],libraryBulkDeleting=false;
function createProjectId(){return 'pf-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}
function ensureProjectIdentity(){if(!state.projectId)state.projectId=createProjectId();if(!state.projectCreatedAt)state.projectCreatedAt=Date.now();if(!state.projectUpdatedAt)state.projectUpdatedAt=state.projectCreatedAt;return state.projectId}
function loadAppSettings(){try{const raw=localStorage.getItem(PF_APP_SETTINGS_KEY);if(raw){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object')appSettings={...appSettings,...parsed}}}catch(e){console.info('App settings could not be restored',e)}applyAppSettings()}
function applyAppSettings(){document.body.classList.toggle('pf-theme-light',appSettings.theme==='light');document.body.classList.toggle('pf-theme-warm',appSettings.theme==='warm');document.body.classList.toggle('pf-reduced-motion',!!appSettings.reducedMotion);document.body.classList.toggle('pf-home-compact',appSettings.homeGrid==='compact');document.body.classList.toggle('pf-touch-large',appSettings.touchTargets==='large');document.documentElement.style.setProperty('--pf-ui-scale',String(Math.max(85,Math.min(120,Number(appSettings.uiScale)||100))/100));}
async function saveAppSettings(){
 appSettings.theme=$('settingTheme')?.value||appSettings.theme;
 appSettings.uiScale=Number($('settingUiScale')?.value)||100;
 appSettings.autosaveSeconds=Number($('settingAutosave')?.value)||7;
 appSettings.confirmDelete=!!$('settingConfirmDelete')?.checked;
 appSettings.defaultWidth=Math.max(64,Math.min(12000,Number($('settingDefaultWidth')?.value)||1600));
 appSettings.defaultHeight=Math.max(64,Math.min(12000,Number($('settingDefaultHeight')?.value)||1000));
 appSettings.defaultBackground=$('settingDefaultBackground')?.value||'white';
 appSettings.defaultDpi=Number($('settingDefaultDpi')?.value)||300;
 appSettings.homeGrid=$('settingHomeGrid')?.value||'comfortable';
 appSettings.touchTargets=$('settingTouchTargets')?.value||'normal';
 appSettings.reducedMotion=!!$('settingReducedMotion')?.checked;
 let localSaved=false,prefsSaved=false,saveError=null;
 try{localStorage.setItem(PF_APP_SETTINGS_KEY,JSON.stringify(appSettings));localSaved=true;}catch(error){saveError=error;console.warn('App settings localStorage save failed',error)}
 applyAppSettings();
 try{prefsSaved=await savePersistentEditorPreferences({quiet:true});}catch(error){saveError=saveError||error;console.warn('App settings preference mirror failed',error)}
 if(localSaved&&prefsSaved)toast('アプリ全体設定を2か所に保存しました');
 else if(localSaved)toast('アプリ全体設定を保存しました（設定の二重保存は利用できません）');
 else if(prefsSaved)toast('ローカル保存は使えませんが、IndexedDBへ設定を保存しました');
 else toast('設定を保存できませんでした: '+(saveError?.message||'ブラウザの保存領域を確認してください'));
 return localSaved||prefsSaved;
}
function openAppSettings(){if(!$('appSettingsModal'))return;$('settingTheme').value=appSettings.theme;$('settingUiScale').value=appSettings.uiScale;$('settingUiScaleValue').textContent=appSettings.uiScale+'%';$('settingAutosave').value=String(appSettings.autosaveSeconds);$('settingConfirmDelete').checked=appSettings.confirmDelete;$('settingDefaultWidth').value=appSettings.defaultWidth;$('settingDefaultHeight').value=appSettings.defaultHeight;$('settingDefaultBackground').value=appSettings.defaultBackground||'white';$('settingDefaultDpi').value=String(appSettings.defaultDpi||300);$('settingHomeGrid').value=appSettings.homeGrid||'comfortable';$('settingTouchTargets').value=appSettings.touchTargets||'normal';$('settingReducedMotion').checked=appSettings.reducedMotion;$('appSettingsModal').classList.remove('hidden')}
function closeAppSettings(){$('appSettingsModal')?.classList.add('hidden')}
function triggerScreenEntrance(element,className){
 if(!element)return;
 element.classList.remove('pf-screen-enter-home','pf-screen-enter-editor');
 const reduce=!!(document.body.classList.contains('pf-reduced-motion')||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches));
 if(reduce)return;
 requestAnimationFrame(()=>{element.classList.add(className);setTimeout(()=>element.classList.remove(className),380)});
}
function showHomeScreen(){document.body.classList.add('pf-home-active');document.body.classList.remove('mobile-panel-open');$('rightbar')?.classList.add('collapsed');triggerScreenEntrance($('homeScreen'),'pf-screen-enter-home')}
function showEditorScreen(){document.body.classList.remove('pf-home-active');document.body.classList.remove('mobile-panel-open');syncResponsiveLayout();triggerScreenEntrance($('app'),'pf-screen-enter-editor');requestAnimationFrame(()=>{resizeDisplay(true);renderLayers();})}
async function getLibraryStoreItems(){const db=await openDB();const tx=db.transaction('library','readonly');const rows=await idbRequest(tx.objectStore('library').getAll());await idbTransactionDone(tx);return rows||[]}
async function getProjectRecord(id){const db=await openDB();const tx=db.transaction('projects','readonly');const row=await idbRequest(tx.objectStore('projects').get(id));await idbTransactionDone(tx);return row||null}
function makeCurrentThumbnail(){
 const tw=320,th=200,canvas=document.createElement('canvas');canvas.width=tw;canvas.height=th;
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return '';
 ctx.fillStyle='#e9edf2';ctx.fillRect(0,0,tw,th);
 const scale=Math.min((tw-16)/Math.max(1,state.width),(th-16)/Math.max(1,state.height));
 const w=state.width*scale,h=state.height*scale,ox=(tw-w)/2,oy=(th-h)/2;
 ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
 try{
  if(typeof drawDocumentBase==='function')drawDocumentBase(ctx,true);
  for(const layer of state.layers){if(!layer.visible||!layer.canvas)continue;ctx.save();ctx.globalAlpha=Number.isFinite(layer.opacity)?layer.opacity:1;ctx.globalCompositeOperation=layer.blend||'source-over';ctx.drawImage(layer.canvas,0,0);ctx.restore();}
 }catch(error){console.warn('Fast thumbnail composition failed',error);ctx.restore();return ''}
 ctx.restore();
 try{return canvas.toDataURL('image/webp',.78)}catch(_){try{return canvas.toDataURL('image/png')}catch(__){return ''}}
}
async function thumbnailFromProjectData(data){try{const tw=320,th=200,c=document.createElement('canvas');c.width=tw;c.height=th;const ctx=c.getContext('2d');ctx.fillStyle=data.bg==='dark'?'#30343b':'#e9edf2';ctx.fillRect(0,0,tw,th);const w=Math.max(1,Number(data.width)||1),h=Math.max(1,Number(data.height)||1),scale=Math.min((tw-16)/w,(th-16)/h),dw=w*scale,dh=h*scale,ox=(tw-dw)/2,oy=(th-dh)/2;for(const layer of (data.layers||[])){if(layer.visible===false||!layer.data)continue;const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=layer.data});ctx.save();ctx.globalAlpha=Number.isFinite(layer.opacity)?layer.opacity:1;ctx.globalCompositeOperation=layer.blend||'source-over';ctx.drawImage(img,ox,oy,dw,dh);ctx.restore()}return c.toDataURL('image/webp',.76)}catch(e){console.info('Thumbnail generation skipped',e);return ''}}
let pfProjectWriteChain=Promise.resolve();
function persistProjectData(data){
 const task=pfProjectWriteChain.catch(()=>{}).then(()=>persistProjectDataNow(data));
 pfProjectWriteChain=task;return task;
}
async function persistProjectDataNow(data){
 if(!data||data.format!=='PIXEL_FORGE_PROJECT'||!Array.isArray(data.layers))throw new Error('保存データの形式が正しくありません');
 ensureProjectIdentity();
 const projectId=(typeof data.id==='string'&&data.id)?data.id:state.projectId;
 const createdAt=Number(data.createdAt)||state.projectCreatedAt||Date.now();
 const capturedRevision=Number(data.updatedAt)||Number(state.projectUpdatedAt)||0;
 const projectName=String(data.name||state.projectName||'Untitled').slice(0,80);
 const now=Date.now();
 data.id=projectId;data.createdAt=createdAt;data.updatedAt=now;data.name=projectName;
 let thumbnail='';
 try{thumbnail=makeCurrentThumbnail()}catch(error){console.info('Thumbnail omitted; project data will still be saved.',error)}
 const meta={id:projectId,title:projectName,createdAt,updatedAt:now,width:Number(data.width)||state.width,height:Number(data.height)||state.height,dpi:Number(data.dpi)||state.dpi||300,thumbnail,formatVersion:data.version||5};
 const db=await openDB();
 const tx=db.transaction(['projects','library'],'readwrite');
 tx.objectStore('projects').put({id:projectId,saved:now,data});
 tx.objectStore('projects').put({id:'autosave',projectId,saved:now});
 tx.objectStore('library').put(meta);
 await idbTransactionDone(tx);
 // Read-after-write catches quota/transaction edge cases instead of showing a false success.
 const check=await getProjectRecord(projectId);
 if(!check?.data||check.data.id!==projectId||!Array.isArray(check.data.layers))throw new Error('保存後の確認に失敗しました。ブラウザの保存領域を確認してください');
 const idx=libraryItems.findIndex(item=>item.id===projectId);
 if(idx>=0)libraryItems[idx]=meta;else libraryItems.unshift(meta);
 libraryItems.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 if(state.projectId===projectId){
  state.lastAutosave=now;
  if(Number(state.projectUpdatedAt||0)<=capturedRevision){state.projectUpdatedAt=now;state.dirty=false;const status=$('autosaveStatus');if(status)status.textContent='保存済み';}
  else{state.dirty=true;const status=$('autosaveStatus');if(status)status.textContent='編集中 · 次回自動保存待ち';scheduleAutosave();}
 }
 renderLibraryCards();
 return meta;
}
async function persistCurrentProject(){ensureProjectIdentity();const data=await projectDataAsync();await persistProjectData(data);}
async function migrateLegacyAutosave(){
 try{
  const db=await openDB(),read=db.transaction('projects','readonly'),rec=await idbRequest(read.objectStore('projects').get('autosave'));await idbTransactionDone(read);
  if(!rec?.data||!Array.isArray(rec.data.layers))return false;
  const data=rec.data,id=(typeof data.id==='string'&&data.id)?data.id:createProjectId();data.id=id;data.createdAt=Number(data.createdAt)||Number(rec.saved)||Date.now();data.updatedAt=Number(data.updatedAt)||Number(rec.saved)||data.createdAt;
  const thumb=await thumbnailFromProjectData(data),meta={id,title:data.name||'以前の自動保存作品',createdAt:data.createdAt,updatedAt:data.updatedAt,width:data.width||0,height:data.height||0,dpi:data.dpi||300,thumbnail:thumb,formatVersion:data.version||5};
  const wtx=db.transaction(['projects','library'],'readwrite'),projects=wtx.objectStore('projects'),library=wtx.objectStore('library'),existingReq=projects.get(id),metaReq=library.get(id);
  existingReq.onsuccess=()=>{const existing=existingReq.result,oldTime=Number(existing?.data?.updatedAt)||Number(existing?.saved)||0,newTime=Number(data.updatedAt)||Number(rec.saved)||0;if(!existing?.data||newTime>oldTime)projects.put({id,saved:Math.max(Number(rec.saved)||0,newTime),data});};
  metaReq.onsuccess=()=>{if(!metaReq.result)library.put(meta);};
  await idbTransactionDone(wtx);console.info('Legacy autosave migration checked without replacing newer artwork');return true;
 }catch(e){console.warn('Legacy autosave migration skipped; original record remains available',e);return false;}
}
async function exportAllProjectsArchive(){
 let overlay=true;showProgress('全作品バックアップを作成中','作品ライブラリを確認しています',2);
 try{
  const db=await openDB();const tx=db.transaction(['projects','library'],'readonly');
  const records=await idbRequest(tx.objectStore('projects').getAll());const metas=await idbRequest(tx.objectStore('library').getAll());await idbTransactionDone(tx);
  const byId=new Map((records||[]).filter(row=>row?.id!=='autosave'&&row?.data?.format==='PIXEL_FORGE_PROJECT'&&Array.isArray(row.data.layers)).map(row=>[row.id,row.data]));
  const legacy=(records||[]).find(row=>row?.id==='autosave'&&row?.data?.format==='PIXEL_FORGE_PROJECT'&&Array.isArray(row.data.layers));
  if(legacy?.data){const d=structuredCloneSafe(legacy.data),legacyId=(typeof d.id==='string'&&d.id)?d.id:(typeof legacy.projectId==='string'&&legacy.projectId?legacy.projectId:createProjectId()),current=byId.get(legacyId);d.id=legacyId;if(!current||Number(d.updatedAt||legacy.saved||0)>Number(current.updatedAt||0))byId.set(legacyId,d);}
  if(state.projectId&&(state.dirty||!byId.has(state.projectId))){
   const current=await projectDataAsync();if(current?.format==='PIXEL_FORGE_PROJECT')byId.set(current.id||state.projectId,current);
  }
  const projects=[...byId.values()];if(!projects.length)throw new Error('バックアップできる作品が見つかりません');
  updateProgress(86,'バックアップファイルをまとめています',projects.length+' 作品');await nextFrameUI();
  const payload={format:'PIXEL_FORGE_ARCHIVE',archiveVersion:1,appVersion:PF_APP_RELEASE,exportedAt:new Date().toISOString(),originHint:location.origin,library:metas||[],projects};
  const blob=new Blob([JSON.stringify(payload)],{type:'application/json;charset=utf-8'});
  const name='PIXEL-FORGE-ALL-WORKS-'+new Date().toISOString().replace(/[:.]/g,'-')+'.pfarchive';
  updateProgress(96,'一括バックアップを書き出しています',formatByteCount(blob.size));await nextFrameUI();
  if(!downloadBlob(blob,name))throw new Error('このブラウザではファイルを書き出せません');
  updateProgress(100,'全作品バックアップが完了しました',projects.length+' 作品 · '+formatByteCount(blob.size));await nextFrameUI();toast(projects.length+'作品を一括バックアップしました');return true;
 }catch(error){toast('一括バックアップに失敗しました: '+(error?.message||String(error)));console.error(error);return false;}
 finally{if(overlay)hideProgress();}
}
async function importAllProjectsArchive(file){
 if(!file)return false;if(file.size>1024*1024*1024){toast('バックアップが大きすぎます（最大1GB）');return false;}
 showProgress('全作品バックアップを復元中','ファイルを確認しています',2);
 try{
  const payload=JSON.parse(await file.text());if(payload?.format!=='PIXEL_FORGE_ARCHIVE'||!Array.isArray(payload.projects))throw new Error('PIXEL FORGE一括バックアップではありません');
  const db=await openDB();let imported=0,skipped=0;
  for(let i=0;i<payload.projects.length;i++){
   const original=payload.projects[i];if(!original||original.format!=='PIXEL_FORGE_PROJECT'||!Array.isArray(original.layers)||!Number.isFinite(Number(original.width))||!Number.isFinite(Number(original.height))||Number(original.width)<1||Number(original.height)<1||Number(original.width)>12000||Number(original.height)>12000||Number(original.width)*Number(original.height)>20000000){skipped++;continue;}
   const data=structuredCloneSafe(original);let id=(typeof data.id==='string'&&data.id)?data.id:createProjectId();
   const read=db.transaction('projects','readonly'),existing=await idbRequest(read.objectStore('projects').get(id));await idbTransactionDone(read);
   if(existing?.data){id=createProjectId();data.id=id;data.name=(String(data.name||'作品').slice(0,70)+' (復元)').slice(0,80);}
   else data.id=id;
   const now=Date.now(),createdAt=Number(data.createdAt)||now,updatedAt=Number(data.updatedAt)||now;let thumbnail='';try{thumbnail=await thumbnailFromProjectData(data)}catch(_){}
   const write=db.transaction(['projects','library'],'readwrite');write.objectStore('projects').put({id,saved:now,data});write.objectStore('library').put({id,title:String(data.name||'Recovered artwork').slice(0,80),createdAt,updatedAt,width:Number(data.width)||0,height:Number(data.height)||0,dpi:Number(data.dpi)||300,thumbnail,formatVersion:Number(data.version)||5,recoveredArchive:true});await idbTransactionDone(write);
   imported++;updateProgress(8+Math.round((i+1)/Math.max(1,payload.projects.length)*86),'作品を復元しています',imported+' / '+payload.projects.length+' 作品');await nextFrameUI();
  }
  await refreshLibrary();updateProgress(100,'復元が完了しました',imported+' 作品'+(skipped?' · '+skipped+' 件をスキップ':''));await nextFrameUI();toast(imported+'作品をライブラリに復元しました');return true;
 }catch(error){toast('一括復元に失敗しました: '+(error?.message||String(error)));console.error(error);return false;}
 finally{hideProgress();}
}
async function rebuildLibraryIndexFromProjects(){
 // The project records are the source of truth. If a previous release stopped
 // halfway through a library-index write, rebuild missing cards without touching artwork.
 const db=await openDB();const tx=db.transaction(['projects','library'],'readonly');
 const rowsPromise=idbRequest(tx.objectStore('projects').getAll());const existingPromise=idbRequest(tx.objectStore('library').getAll());
 const [rows,existing]=await Promise.all([rowsPromise,existingPromise]);await idbTransactionDone(tx);
 const known=new Set((existing||[]).map(item=>item.id));const recovered=[];
 for(const row of (rows||[])){
  const data=row?.data;if(!row?.id||row.id==='autosave'||!data||data.format!=='PIXEL_FORGE_PROJECT'||!Array.isArray(data.layers))continue;
  const id=String(data.id||row.id);if(known.has(id))continue;
  let thumbnail='';try{thumbnail=await thumbnailFromProjectData(data)}catch(_){}
  recovered.push({id,title:String(data.name||'Recovered artwork').slice(0,80),createdAt:Number(data.createdAt)||Number(row.saved)||Date.now(),updatedAt:Number(data.updatedAt)||Number(row.saved)||Date.now(),width:Number(data.width)||0,height:Number(data.height)||0,dpi:Number(data.dpi)||300,thumbnail,formatVersion:Number(data.version)||5,recoveredIndex:true});
 }
 if(recovered.length){const write=db.transaction('library','readwrite');for(const item of recovered)write.objectStore('library').put(item);await idbTransactionDone(write);}
 return recovered.length;
}
async function refreshLibrary(){try{await rebuildLibraryIndexFromProjects();libraryItems=await getLibraryStoreItems();libraryItems.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));const db=await openDB();const tx=db.transaction('projects','readonly');const auto=await idbRequest(tx.objectStore('projects').get('autosave'));await idbTransactionDone(tx);legacyAutosaveItem=null;legacyAutosaveData=null;if(auto?.data&&Array.isArray(auto.data.layers)){legacyAutosaveData=auto.data;legacyAutosaveItem={id:'legacy-autosave',title:auto.data.name||'未整理の自動保存作品',createdAt:auto.saved||Date.now(),updatedAt:auto.saved||Date.now(),width:auto.data.width||0,height:auto.data.height||0,thumbnail:'',legacy:true}}renderLibraryCards();const status=$('libraryStatus');if(status)status.textContent=libraryItems.length+' 件の作品をこの端末に保存中'+(legacyAutosaveItem?' · 旧版の自動保存データあり':'')}catch(e){console.warn('Library unavailable',e);$('libraryStatus').textContent='ブラウザのローカル保存を利用できません。`.pforge`ファイルで保存してください';renderLibraryCards()}}
function dateLabel(value){if(!value)return'—';try{return new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))}catch(_){return'—'}}
function getLibraryRows(){const q=String($('librarySearch')?.value||'').trim().toLocaleLowerCase('ja'),sort=$('librarySort')?.value||'updated';let rows=[...libraryItems];if(legacyAutosaveItem)rows.push(legacyAutosaveItem);rows=rows.filter(x=>String(x.title||'').toLocaleLowerCase('ja').includes(q));rows.sort((a,b)=>sort==='created'?(b.createdAt||0)-(a.createdAt||0):sort==='name'?String(a.title||'').localeCompare(String(b.title||''),'ja'):(b.updatedAt||0)-(a.updatedAt||0));return rows;}
function renderLibrarySelectionUI(){const valid=new Set([...libraryItems.map(x=>x.id),...(legacyAutosaveItem?['legacy-autosave']:[])]);for(const id of [...selectedLibraryIds])if(!valid.has(id))selectedLibraryIds.delete(id);const selected=selectedLibraryIds.size,visibleSelected=visibleLibraryIds.filter(id=>selectedLibraryIds.has(id)).length;const count=$('librarySelectionCount'),hint=$('librarySelectionHint'),clear=$('libraryClearSelection'),remove=$('libraryBulkDelete'),select=$('librarySelectVisible'),bar=$('libraryBulkBar');if(count)count.textContent=selected+' 件選択中';if(hint)hint.textContent=selected>visibleSelected?`表示中 ${visibleSelected} 件 · 検索外も含めて削除対象です`:'カードのチェックで複数選択できます';if(clear)clear.disabled=selected===0;if(remove)remove.disabled=selected===0||libraryBulkDeleting;if(select){select.disabled=visibleLibraryIds.length===0;select.textContent=visibleLibraryIds.length>0&&visibleLibraryIds.every(id=>selectedLibraryIds.has(id))?'表示中の選択を解除':'表示中を全選択';}if(bar)bar.classList.toggle('has-selection',selected>0);}
function setLibraryItemSelected(id,checked){if(checked)selectedLibraryIds.add(id);else selectedLibraryIds.delete(id);const card=document.querySelector(`[data-library-id="${CSS.escape(String(id))}"]`);card?.classList.toggle('is-selected',!!checked);renderLibrarySelectionUI();}
function selectVisibleLibraryItems(){const allSelected=visibleLibraryIds.length>0&&visibleLibraryIds.every(id=>selectedLibraryIds.has(id));for(const id of visibleLibraryIds){if(allSelected)selectedLibraryIds.delete(id);else selectedLibraryIds.add(id);}renderLibraryCards();}
function clearLibrarySelection(){selectedLibraryIds.clear();renderLibraryCards();}
function renderLibraryCards(){const host=$('libraryGrid');if(!host)return;host.replaceChildren();const rows=getLibraryRows();visibleLibraryIds=rows.map(x=>x.id);const count=$('libraryCount');if(count)count.textContent=rows.length+' 作品';const empty=$('libraryEmpty');if(empty)empty.classList.toggle('hidden',rows.length>0);for(const item of rows){const card=document.createElement('article');card.className='pf-art-card'+(selectedLibraryIds.has(item.id)?' is-selected':'');card.dataset.libraryId=item.id;const selectLabel=document.createElement('label');selectLabel.className='pf-art-select';selectLabel.title='この作品を選択';const check=document.createElement('input');check.type='checkbox';check.checked=selectedLibraryIds.has(item.id);check.setAttribute('aria-label',(item.title||'作品')+'を選択');check.addEventListener('change',()=>setLibraryItemSelected(item.id,check.checked));const checkText=document.createElement('span');checkText.textContent='選択';selectLabel.append(check,checkText);const open=document.createElement('button');open.type='button';open.className='pf-art-open';open.setAttribute('aria-label',(item.title||'作品')+'を開く');const preview=document.createElement('div');preview.className='pf-art-preview';if(item.thumbnail){const img=document.createElement('img');img.src=item.thumbnail;img.alt='';img.loading='lazy';preview.appendChild(img)}else{const placeholder=document.createElement('div');placeholder.className='pf-art-placeholder';placeholder.textContent='✦';preview.appendChild(placeholder)}const info=document.createElement('div');info.className='pf-art-info';const title=document.createElement('strong');title.textContent=item.title||'Untitled';const dims=document.createElement('span');dims.textContent=(item.width||'—')+' × '+(item.height||'—')+' px';const dates=document.createElement('small');dates.textContent='作成 '+dateLabel(item.createdAt)+' · 編集 '+dateLabel(item.updatedAt);info.append(title,dims,dates);open.append(preview,info);open.addEventListener('click',()=>openLibraryProject(item.id));const tools=document.createElement('div');tools.className='pf-art-tools';const rename=document.createElement('button');rename.type='button';rename.textContent='名前変更';rename.addEventListener('click',()=>renameLibraryProject(item.id));const duplicate=document.createElement('button');duplicate.type='button';duplicate.textContent='複製';duplicate.addEventListener('click',()=>duplicateLibraryProject(item.id));const remove=document.createElement('button');remove.type='button';remove.textContent='削除';remove.addEventListener('click',()=>deleteLibraryProject(item.id));tools.append(rename,duplicate,remove);card.append(selectLabel,open,tools);if(item.legacy){const tag=document.createElement('span');tag.className='pf-recovery-tag';tag.textContent='旧版データ';preview.appendChild(tag)}host.appendChild(card)}renderLibrarySelectionUI();}
async function openLibraryProject(id){try{let data=null,meta=null;if(id==='legacy-autosave'){data=legacyAutosaveData;meta=legacyAutosaveItem}else{meta=libraryItems.find(x=>x.id===id);const rec=await getProjectRecord(id);data=rec?.data}if(!data)throw new Error('作品データが見つかりません');await loadProjectText(JSON.stringify(data));if(meta){state.projectId=meta.id==='legacy-autosave'?createProjectId():meta.id;state.projectCreatedAt=Number(meta.createdAt)||Date.now();state.projectUpdatedAt=Number(meta.updatedAt)||Date.now()}ensureProjectIdentity();showEditorScreen();if(id==='legacy-autosave'){await persistCurrentProject();toast('旧版の自動保存作品を新ライブラリへ移行しました')}else toast('作品を開きました')}catch(e){toast('作品を開けません: '+e.message);console.error(e)}}
async function renameLibraryProject(id){if(id==='legacy-autosave'){await openLibraryProject(id);return}const item=libraryItems.find(x=>x.id===id);if(!item)return;const next=prompt('作品名を入力',item.title||'Untitled');if(next===null)return;const title=next.trim().slice(0,80);if(!title){toast('作品名を入力してください');return}try{const db=await openDB();const tx=db.transaction(['library','projects'],'readwrite');const meta={...item,title,updatedAt:Date.now()};tx.objectStore('library').put(meta);const req=tx.objectStore('projects').get(id);req.onsuccess=()=>{if(req.result?.data){req.result.data.name=title;req.result.data.updatedAt=meta.updatedAt;tx.objectStore('projects').put(req.result)}};await idbTransactionDone(tx);item.title=title;item.updatedAt=meta.updatedAt;renderLibraryCards()}catch(e){toast('名前を変更できませんでした: '+e.message)}}
async function duplicateLibraryProject(id){if(id==='legacy-autosave'){await openLibraryProject(id);return}try{const item=libraryItems.find(x=>x.id===id),rec=await getProjectRecord(id);if(!rec?.data||!item)return;const data=JSON.parse(JSON.stringify(rec.data)),newId=createProjectId(),now=Date.now();data.id=newId;data.name=(item.title||'Untitled')+' コピー';data.createdAt=now;data.updatedAt=now;const meta={...item,id:newId,title:data.name,createdAt:now,updatedAt:now};const db=await openDB();const tx=db.transaction(['projects','library'],'readwrite');tx.objectStore('projects').put({id:newId,data,saved:now});tx.objectStore('library').put(meta);await idbTransactionDone(tx);libraryItems.unshift(meta);renderLibraryCards();toast('作品を複製しました')}catch(e){toast('複製できませんでした: '+e.message)}}
async function deleteLibraryItemsByIds(ids,{ask=true}={}){const targets=[...new Set((ids||[]).filter(Boolean))].filter(id=>id==='legacy-autosave'?!!legacyAutosaveItem:libraryItems.some(x=>x.id===id));if(!targets.length)return false;if(libraryBulkDeleting)return false;const noun=targets.length===1?'この作品':'選択した '+targets.length+' 件の作品';if(ask&&appSettings.confirmDelete&&!confirm(`${noun}を削除しますか？\n削除した作品は元に戻せません。`))return false;libraryBulkDeleting=true;renderLibrarySelectionUI();try{const db=await openDB();const tx=db.transaction(['projects','library'],'readwrite'),projects=tx.objectStore('projects'),library=tx.objectStore('library');for(const id of targets){if(id==='legacy-autosave')projects.delete('autosave');else{projects.delete(id);library.delete(id);}}const autoReq=projects.get('autosave');autoReq.onsuccess=()=>{const pointer=autoReq.result?.projectId;if(targets.includes('legacy-autosave')||targets.includes(pointer))projects.delete('autosave');};await idbTransactionDone(tx);libraryItems=libraryItems.filter(x=>!targets.includes(x.id));if(targets.includes('legacy-autosave')){legacyAutosaveItem=null;legacyAutosaveData=null;}for(const id of targets)selectedLibraryIds.delete(id);if(state.projectId&&targets.includes(state.projectId)){clearTimeout(autosaveTimer);state.projectId=null;state.projectCreatedAt=0;state.projectUpdatedAt=0;state.dirty=false;}renderLibraryCards();return true;}catch(e){toast('削除できませんでした: '+e.message);console.error('Library deletion failed',e);return false;}finally{libraryBulkDeleting=false;renderLibrarySelectionUI();}}
async function deleteLibraryProject(id){const ok=await deleteLibraryItemsByIds([id]);if(ok)toast(id==='legacy-autosave'?'旧版の自動保存データを削除しました':'作品を削除しました')}
async function bulkDeleteLibraryProjects(){const targets=[...selectedLibraryIds];if(!targets.length){toast('削除する作品を選択してください');return}const ok=await deleteLibraryItemsByIds(targets);if(ok){selectedLibraryIds.clear();toast(targets.length+' 件の作品を一括削除しました')}}
let pfHomeNavigationBusy=false;
async function goHome(){
 if(pfHomeNavigationBusy)return;
 pfHomeNavigationBusy=true;
 const shouldSave=!!state.projectId&&(!!state.dirty||!libraryItems.some(item=>item.id===state.projectId));
 // Switch immediately; the progress surface remains visible while the snapshot is saved.
 showHomeScreen();
 const status=$('libraryStatus');
 let librarySaved=false,backupDownloaded=false,saveError=null;
 if(shouldSave){document.body.classList.add('pf-saving');showProgress('ホームへ移動中','編集中の作品を保存しています',2);if(status)status.textContent='編集中の作品を保存しています…';}
 try{
  if(shouldSave){
   try{
    await persistCurrentProject();librarySaved=true;
    updateProgress(96,'ライブラリを更新しています','保存内容を読み戻して確認しました');
   }catch(storageError){
    saveError=storageError;
    console.warn('Home navigation could not save to IndexedDB; trying a .pforge backup.',storageError);
    const backup=await exportCurrentProjectBackup({title:'ホームへ戻る前にバックアップ中',quiet:true});
    if(!backup.downloaded)throw backup.error||storageError;
    backupDownloaded=true;
   }
  }
  await refreshLibrary();
  if(librarySaved){updateProgress(100,'ホーム画面を更新しました','端末内ライブラリへの保存完了');await nextFrameUI();}
  else if(backupDownloaded){
   if(status)status.textContent='端末内ライブラリは利用できません · .pforgeバックアップをダウンロードしました';
   toast('ライブラリに保存できないため、作品を .pforge ファイルにバックアップしました');
  }
 }catch(error){
  console.error('Home navigation save failed',error||saveError);
  if(status)status.textContent='保存に失敗しました。作品を失わないよう編集画面へ戻します。';
  showEditorScreen();
  toast('保存できなかったためホーム移動を中止しました: '+(error?.message||saveError?.message||'保存先を確認してください'));
 }finally{
  if(shouldSave)hideProgress();
  document.body.classList.remove('pf-saving');
  pfHomeNavigationBusy=false;
 }
}
function bindLibraryUI(){
 // Desktop and mobile Home actions are routed once by home-ui-v21.js delegation.
 $('pfArchiveExport')?.addEventListener('click',exportAllProjectsArchive);$('pfArchiveImport')?.addEventListener('click',()=>$('pfArchiveImportFile')?.click());$('homeArchiveExport')?.addEventListener('click',exportAllProjectsArchive);$('homeArchiveImport')?.addEventListener('click',()=>$('pfArchiveImportFile')?.click());$('pfArchiveImportFile')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(file){await importAllProjectsArchive(file);e.target.value='';}});$('librarySearch')?.addEventListener('input',renderLibraryCards);$('librarySort')?.addEventListener('change',renderLibraryCards);$('librarySelectVisible')?.addEventListener('click',selectVisibleLibraryItems);$('libraryClearSelection')?.addEventListener('click',clearLibrarySelection);$('libraryBulkDelete')?.addEventListener('click',bulkDeleteLibraryProjects);$('settingsClose')?.addEventListener('click',closeAppSettings);$('settingsCancel')?.addEventListener('click',closeAppSettings);$('settingsSave')?.addEventListener('click',async()=>{await saveAppSettings();closeAppSettings()});$('pfPrefsSaveNow')?.addEventListener('click',()=>savePersistentEditorPreferences({quiet:false}));$('pfPrefsExport')?.addEventListener('click',exportPersistentEditorPreferences);$('pfPrefsImport')?.addEventListener('click',()=>$('pfPrefsImportFile')?.click());$('pfPrefsImportFile')?.addEventListener('change',e=>{const file=e.target.files?.[0];if(file)importPersistentEditorPreferences(file);e.target.value=''});$('pfDiagnosticsClose')?.addEventListener('click',closeDeviceDiagnostics);$('pfDiagnosticsCloseBottom')?.addEventListener('click',closeDeviceDiagnostics);$('pfDiagnosticsRun')?.addEventListener('click',()=>runDeviceDiagnostics().catch(e=>toast('診断できませんでした: '+e.message)));$('pfDiagnosticsCopy')?.addEventListener('click',copyDeviceDiagnostics);$('pfDiagnosticsModal')?.addEventListener('click',e=>{if(e.target.id==='pfDiagnosticsModal')closeDeviceDiagnostics()});$('settingUiScale')?.addEventListener('input',e=>{$('settingUiScaleValue').textContent=e.target.value+'%'});$('settingsReset')?.addEventListener('click',()=>{appSettings={theme:'midnight',uiScale:100,autosaveSeconds:7,confirmDelete:true,defaultWidth:1600,defaultHeight:1000,defaultBackground:'white',defaultDpi:300,homeGrid:'comfortable',touchTargets:'normal',reducedMotion:false};openAppSettings();toast('初期値に戻しました。保存を押すと反映されます')});$('homeButton')?.addEventListener('click',goHome);$('settingsButton')?.addEventListener('click',openAppSettings);$('newProjectName')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('createNew').click()});
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();pfInstallPrompt=e;if($('homeInstall'))$('homeInstall').classList.remove('hidden')});window.addEventListener('appinstalled',()=>{pfInstallPrompt=null;$('homeInstall')?.classList.add('hidden');toast('PIXEL FORGE をアプリとして追加しました')});
}
async function installAsApp(){if(pfInstallPrompt){try{await pfInstallPrompt.prompt();const result=await pfInstallPrompt.userChoice;if(result?.outcome==='accepted')toast('インストールを開始しました');pfInstallPrompt=null}catch(e){toast('インストール画面を開けませんでした')}return}const modal=$('installHelpModal');if(modal)modal.classList.remove('hidden')}

function runHomeAction(action){
 switch(action){
  case 'new':
   if(window.PF_MODE_UI?.getSelected)window.PF_MODE_UI.apply(window.PF_MODE_UI.getSelected(),{persist:true});
   showEditorScreen();
   openNewDialog();
   return true;
  case 'import':
   // Direct invocation from the original user gesture keeps iOS Safari file pickers reliable.
   $('projectInput')?.click();
   return true;
  case 'settings':
   openAppSettings();
   return true;
  case 'refresh':
   refreshLibrary();
   return true;
  case 'install':
   installAsApp();
   return true;
  case 'diagnostics':
   openDeviceDiagnostics();
   return true;
  default:
   return false;
 }
}
window.PF_HOME_ACTIONS = {run:runHomeAction};
window.PF_EDITOR_ACTIONS = Object.freeze({
 home:()=>goHome(),save:()=>saveProject(),undo:()=>doUndo(),redo:()=>doRedo(),fit:()=>fitView(),
 settings:()=>openAppSettings(),panel:()=>setSettingsPanelOpen(!document.body.classList.contains('mobile-panel-open')),closePanel:()=>setSettingsPanelOpen(false)
});

let pfLastDiagnosticReport = null;
function addDiagnostic(results, name, ok, detail, optional=false){
 results.push({name,status:ok?'OK':(optional?'注意':'未対応'),detail:String(detail||'')});
}
async function runDeviceDiagnostics(){
 const results=[];
 const root=document.documentElement;
 const canvas=document.createElement('canvas');
 let canvasOK=false;
 try{canvasOK=!!canvas.getContext('2d')}catch(_){canvasOK=false}
 addDiagnostic(results,'画面モード',!!root.dataset.pfHomeMode,`現在: ${root.dataset.pfHomeMode||'未設定'} / ${window.innerWidth||0}×${window.innerHeight||0}`);
 addDiagnostic(results,'タッチ入力',('ontouchstart' in window)||(navigator.maxTouchPoints||0)>0,`maxTouchPoints: ${navigator.maxTouchPoints||0}`,true);
 addDiagnostic(results,'Pointer Events',typeof PointerEvent==='function',`PointerEvent: ${typeof PointerEvent}`);
 addDiagnostic(results,'Pointer Capture',!!(window.Element&&Element.prototype.setPointerCapture),`setPointerCapture: ${!!(window.Element&&Element.prototype.setPointerCapture)}`,true);
 addDiagnostic(results,'Canvas 2D',canvasOK,canvasOK?'2D描画コンテキストを作成できます':'Canvas 2Dが利用できません');
 addDiagnostic(results,'IndexedDB',!!window.indexedDB,window.indexedDB?'ブラウザ内データベースAPIあり':'IndexedDBが無効です');
 let dbOK=false,dbDetail='';
 try{const db=await openDB();dbOK=!!db&&db.objectStoreNames.contains('projects')&&db.objectStoreNames.contains('library');dbDetail=dbOK?'作品・ライブラリの保存領域を確認しました':'必要な保存領域がありません'}catch(error){dbDetail=error?.message||'データベースを開けません'}
 addDiagnostic(results,'DBアクセス',dbOK,dbDetail);
 let projectRoundTrip=false,projectRoundTripDetail='未実行',projectProbeDb=null,projectProbeId='';
 if(dbOK){
  projectProbeId='__pf_diag_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
  try{
   projectProbeDb=await openDB();
   const write=projectProbeDb.transaction('projects','readwrite');
   write.objectStore('projects').put({id:projectProbeId,saved:Date.now(),data:{format:'PIXEL_FORGE_PROJECT',id:projectProbeId,layers:[],diagnostic:true}});
   await idbTransactionDone(write);
   const check=await getProjectRecord(projectProbeId);
   projectRoundTrip=!!(check?.data?.diagnostic&&check.data.id===projectProbeId);
   projectRoundTripDetail=projectRoundTrip?'一時データを書き込み、読み戻し、削除できました':'保存後の読み戻し内容が一致しません';
  }catch(error){projectProbeDb=projectProbeDb||null;projectRoundTripDetail=error?.message||'読み書きテストに失敗しました';}
  finally{
   if(projectProbeDb&&projectProbeId){try{const cleanup=projectProbeDb.transaction('projects','readwrite');cleanup.objectStore('projects').delete(projectProbeId);await idbTransactionDone(cleanup)}catch(cleanupError){console.warn('Diagnostic probe cleanup failed',cleanupError)}}
  }
 }
 addDiagnostic(results,'作品保存テスト',projectRoundTrip,projectRoundTripDetail);
 let localOK=false,localDetail='';
 try{const key='__pf_diag_'+Date.now();localStorage.setItem(key,'1');localOK=localStorage.getItem(key)==='1';localStorage.removeItem(key);localDetail=localOK?'読み書き可能':'読み書きできません'}catch(error){localDetail=error?.name||'利用不可'}
 addDiagnostic(results,'設定保存',localOK,localDetail);
 const projectInput=$('projectInput');
 addDiagnostic(results,'ファイル読込',!!projectInput&&'files' in projectInput&&!!window.File,`input: ${!!projectInput} / File API: ${!!window.File}`);
 addDiagnostic(results,'画像書出',!!(window.Blob&&window.URL&&URL.createObjectURL),`Blob: ${!!window.Blob} / object URL: ${!!(window.URL&&URL.createObjectURL)}`);
 const mobileEditorHome=$('mobileHomeButton'),mobileEditorSave=$('mobileSaveButton');
 addDiagnostic(results,'スマホ編集ホーム',!!mobileEditorHome&&typeof window.PF_EDITOR_ACTIONS?.home==='function',`ボタン: ${!!mobileEditorHome} / 操作API: ${typeof window.PF_EDITOR_ACTIONS?.home}`);
 addDiagnostic(results,'スマホ編集保存',!!mobileEditorSave&&typeof window.PF_EDITOR_ACTIONS?.save==='function',`ボタン: ${!!mobileEditorSave} / 操作API: ${typeof window.PF_EDITOR_ACTIONS?.save}`);
 addDiagnostic(results,'IndexedDB失敗時のバックアップ',typeof exportCurrentProjectBackup==='function','ライブラリ保存が失敗した場合に .pforge へ退避');
 const progressBar=$('busyProgress'),progressMeta=$('busyBytes');
 addDiagnostic(results,'保存進捗表示',!!progressBar&&!!progressMeta&&progressBar.getAttribute('role')==='progressbar',`進捗バー: ${!!progressBar} / 容量表示: ${!!progressMeta}`);
 addDiagnostic(results,'非同期PNG変換',typeof HTMLCanvasElement!=='undefined'&&typeof HTMLCanvasElement.prototype.toBlob==='function'&&typeof FileReader==='function','Canvas toBlob + FileReader を利用',true);
 addDiagnostic(results,'スマホ操作ドック',!!$('mobileDock')&&$('mobileDock').querySelectorAll('button').length>=16,`操作ボタン数: ${$('mobileDock')?.querySelectorAll('button').length||0}`);
 addDiagnostic(results,'Worker',typeof Worker==='function',`Worker: ${typeof Worker}`,true);
 addDiagnostic(results,'ResizeObserver',typeof ResizeObserver==='function',`ResizeObserver: ${typeof ResizeObserver}`,true);
 addDiagnostic(results,'VisualViewport',!!window.visualViewport,window.visualViewport?`${Math.round(window.visualViewport.width)}×${Math.round(window.visualViewport.height)}`:'未対応・通常viewportで動作',true);
 addDiagnostic(results,'画面高100dvh',!!(window.CSS&&CSS.supports&&CSS.supports('height','100dvh')),`CSS 100dvh: ${!!(window.CSS&&CSS.supports&&CSS.supports('height','100dvh'))}`,true);
 addDiagnostic(results,'安全領域',!!(window.CSS&&CSS.supports&&CSS.supports('padding','env(safe-area-inset-bottom)')),'ノッチ・ホームインジケータ用CSS',true);
 addDiagnostic(results,'Service Worker',!!(navigator.serviceWorker&&window.isSecureContext),window.isSecureContext?'安全なコンテキストで利用できます':'HTTPSまたはlocalhostが必要です',true);
 const homeActionRoot=$('homeScreen');
 const desktopHomeIds=['homeNew','homeImport','homeInstall','homeDiagnostics','homeSettings','homeRefresh'];
 const desktopHomeButtons=desktopHomeIds.map(id=>$(id)).filter(Boolean);
 const desktopHomeMapped=desktopHomeButtons.length===desktopHomeIds.length&&desktopHomeButtons.every(button=>!!button.dataset.pfHomeAction);
 const mobileHomeMapped=!!homeActionRoot&&[...homeActionRoot.querySelectorAll('[data-pf-home-action]')].length>=11;
 addDiagnostic(results,'操作ルーティング',!!(window.PF_HOME_ACTIONS&&typeof window.PF_HOME_ACTIONS.run==='function')&&desktopHomeMapped&&mobileHomeMapped,`アプリ本体API / PC ${desktopHomeButtons.filter(button=>button.dataset.pfHomeAction).length}/${desktopHomeIds.length} / 共通モバイル経路 ${mobileHomeMapped?'OK':'未接続'}`);
 const touchButtons=[...document.querySelectorAll('.pf-home-mobile-dock button,.pf-mobile-icon-btn,.pf-mobile-quick-actions button,.mobile-dock button')].filter(el=>el.getClientRects().length);
 const smallTargets=touchButtons.filter(el=>{const r=el.getBoundingClientRect();return r.width<40||r.height<40});
 addDiagnostic(results,'タップ領域',smallTargets.length===0,`${touchButtons.length}個の表示ボタンを確認 / 40px未満: ${smallTargets.length}`,true);
 addDiagnostic(results,'画面回転イベント','onorientationchange' in window,'orientationchangeを監視');
 addDiagnostic(results,'アニメーション制御',typeof requestAnimationFrame==='function','requestAnimationFrameが利用可能');
 const v35Audit=window.PF_V35?.audit?.();
 addDiagnostic(results,'筆微調整エンジン',!!v35Audit&&v35Audit.targetCount===35&&v35Audit.microAdjustmentCount===350&&v35Audit.targetsPresent===35,`微調整 ${v35Audit?.microAdjustmentCount||0}項目 / 対象パラメーター ${v35Audit?.targetsPresent||0}/35 / UI生成 ${v35Audit?.allSlidersBuilt||0}項目`,true);
 addDiagnostic(results,'Reduced Motion',!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches),'OSの動きを減らす設定を参照',true);
 let storageDetail='容量情報は未取得';
 try{if(navigator.storage&&navigator.storage.estimate){const usage=await navigator.storage.estimate();const used=Math.round((usage.usage||0)/1024/1024*10)/10;const quota=Math.round((usage.quota||0)/1024/1024);storageDetail=`使用 ${used} MB / 推定上限 ${quota} MB`}}catch(_){storageDetail='容量情報APIを利用できません'}
 addDiagnostic(results,'保存容量',!!(navigator.storage&&navigator.storage.estimate),storageDetail,true);
 const preferenceAudit=getPersistentPreferencesAudit();
 addDiagnostic(results,'設定の次回引継ぎ',preferenceAudit.ready&&preferenceAudit.totalTracked>=100,`${preferenceAudit.stateSettings}個の編集状態 + ${preferenceAudit.formControls}個のUI項目 / ${preferenceAudit.localSnapshot?'ローカル保存あり':'初回保存待ち'}`,true);
 const preferenceRoundTrip=runPreferenceRoundTrip();
 addDiagnostic(results,'設定バックアップ形式',preferenceRoundTrip.passed,`${preferenceRoundTrip.stateCount||0}状態・${preferenceRoundTrip.formCount||0}フォーム / ${preferenceRoundTrip.bytes||0} bytes`,true);
 const pass=results.filter(x=>x.status==='OK').length;
 const warn=results.filter(x=>x.status!=='OK').length;
 pfLastDiagnosticReport={version:PF_APP_RELEASE,checkedAt:new Date().toISOString(),userAgent:navigator.userAgent,platform:navigator.platform||'',language:navigator.language||'',viewport:{innerWidth:window.innerWidth,innerHeight:window.innerHeight,devicePixelRatio:window.devicePixelRatio||1,visualWidth:window.visualViewport?.width||null,visualHeight:window.visualViewport?.height||null},checks:results};
 const summary=$('pfDiagnosticsSummary'),list=$('pfDiagnosticsList');
 if(summary)summary.textContent=`診断完了：${results.length}項目中 ${pass}項目OK · ${warn}項目は制限または確認事項です。`;
 if(list){list.replaceChildren();for(const item of results){const row=document.createElement('div');row.className='pf-diagnostic-row';const status=document.createElement('span');status.dataset.status=item.status;status.textContent=item.status;const detail=document.createElement('div');detail.textContent=item.name;const small=document.createElement('small');small.textContent=item.detail;detail.appendChild(small);row.append(status,detail);list.appendChild(row)}}
 return pfLastDiagnosticReport;
}
function openDeviceDiagnostics(){const modal=$('pfDiagnosticsModal');if(modal)modal.classList.remove('hidden');runDeviceDiagnostics().catch(error=>{console.error('Device diagnostics failed',error);const summary=$('pfDiagnosticsSummary');if(summary)summary.textContent='診断中にエラーが発生しました: '+(error?.message||'unknown')})}
function closeDeviceDiagnostics(){$('pfDiagnosticsModal')?.classList.add('hidden')}
async function copyDeviceDiagnostics(){
 if(!pfLastDiagnosticReport)await runDeviceDiagnostics();
 const payload=JSON.stringify(pfLastDiagnosticReport,null,2);
 try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(payload)}else throw new Error('clipboard unavailable');toast('診断結果をコピーしました');return}catch(_){}
 const temp=document.createElement('textarea');temp.value=payload;temp.setAttribute('readonly','');temp.style.position='fixed';temp.style.opacity='0';document.body.appendChild(temp);temp.select();let copied=false;try{copied=document.execCommand('copy')}catch(_){}temp.remove();toast(copied?'診断結果をコピーしました':'このブラウザではコピーできませんでした');
}


async function start(){
 showHomeScreen();
 if('serviceWorker' in navigator&&window.isSecureContext&&location.protocol!=='file:'&&!isOfflineCacheDisabled())navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.info('PWA offline cache unavailable',err));
 bindLibraryUI();state.brushProfiles=readBrushProfiles();loadAppSettings();initSwatches();bindEvents();syncResponsiveLayout();resizeDisplay(true);initDocument();
 try{await migrateLegacyAutosave()}catch(error){console.info('Legacy autosave migration skipped; editor remains available',error)}
 try{await restorePersistentEditorPreferences()}catch(error){pfPrefsLastError='設定復元: '+(error?.message||error);console.info('Persistent editor preferences unavailable; defaults retained',error)}
 normalizeBrushMicroDynamics();applyRestoredMobileUiSettings();syncResponsiveLayout();renderTimeline();renderBrushProfileLibrary?.();
 $('exportQualityValue').textContent=$('exportQuality').value+'%';$('exportScale').value='1';$('newPreset').value='custom';$('canvasPreset').value='custom';
 setStatus('Web描画エンジン · 準備完了');$('pointerTypeChip').textContent='入力: 待機';$('devicePressureChip').textContent='筆圧: 待機';setWorkerHealth('待機中 · 初回処理時に接続');showHomeScreen();
 const originHint=$('homeStorageOrigin');if(originHint){const origin=location.origin==='null'?'file://（ファイル直開き）':location.origin;originHint.textContent='この端末の保存先: '+origin+' · URL・ポート・ブラウザが変わると別の保存領域になります';}
 document.querySelectorAll('[data-mobile-tool]').forEach(b=>{const active=b.dataset.mobileTool===state.tool;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 installPersistentEditorPreferenceWatchers();updatePrefsSaveStatus(pfPrefsLastSavedAt?'前回保存: '+new Date(pfPrefsLastSavedAt).toLocaleString():'初回の設定変更から自動保存します');
 try{await refreshLibrary()}catch(error){console.warn('作品ライブラリを利用できません。編集・外部保存は続行できます。',error);const status=$('libraryStatus');if(status)status.textContent='保存ライブラリを利用できません。設定バックアップと .pforge の外部保存を利用してください。';}
 requestPersistentStorage().catch(()=>{});
 // Restore the last persisted drawing into the editor after an app update/reload.
 // This reads the existing autosave pointer; it never clears or overwrites artwork.
 try{const restored=await restoreAutosave({showEditor:true,notify:false});if(restored){setStatus('前回の作品を復元しました · '+state.projectName);$('autosaveStatus').textContent='保存済み';}}
 catch(error){console.info('Startup artwork resume skipped; projects remain in library.',error)}
} 

function runRainbowRegression(){
 const saved={tool:state.tool,brushPreset:state.brushPreset,color:state.color,size:state.size,opacity:state.opacity,brushFlow:state.brushFlow,lastPointerType:state.lastPointerType,rainbowDirection:state.rainbowDirection,rainbowCycles:state.rainbowCycles,rainbowMix:state.rainbowMix,rainbowColorPickup:state.rainbowColorPickup,rainbowPhase:state.rainbowPhase,rainbowReverse:state.rainbowReverse,colorPickup:state.colorPickup};
 try{state.tool='brush';state.brushPreset='rainbow';state.color='#ffffff';state.size=18;state.opacity=1;state.brushFlow=1;state.lastPointerType='mouse';state.rainbowCycles=3;state.rainbowMix=0;state.rainbowColorPickup=false;
  const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
  const h=make(180,80),hc=h.getContext('2d',{willReadFrequently:true});state.rainbowPhase=0;state.rainbowReverse=false;state.rainbowDirection='horizontal';drawSmoothStroke(hc,[{x:12,y:40,p:1,v:0},{x:168,y:40,p:1,v:0}],false);const horizontal=[18,55,92,129,162].map(x=>Array.from(hc.getImageData(x,40,1,1).data).slice(0,3).join(','));
  const v=make(80,180),vc=v.getContext('2d',{willReadFrequently:true});state.rainbowDirection='vertical';drawSmoothStroke(vc,[{x:40,y:12,p:1,v:0},{x:40,y:168,p:1,v:0}],false);const vertical=[18,55,92,129,162].map(y=>Array.from(vc.getImageData(40,y,1,1).data).slice(0,3).join(','));
  const curve=make(240,180),cc=curve.getContext('2d',{willReadFrequently:true});state.rainbowDirection='along';const curveInput=[{x:28,y:28,p:1,v:0},{x:62,y:92,p:1,v:0},{x:114,y:142,p:1,v:0},{x:172,y:106,p:1,v:0},{x:210,y:34,p:1,v:0}],curveRibbon=ribbonPolygon(curveInput,state.size);drawSmoothStroke(cc,curveInput,false);const curveSamples=[.12,.30,.50,.70,.88].map(t=>{const q=curveRibbon.points[Math.round((curveRibbon.points.length-1)*t)];return Array.from(cc.getImageData(Math.round(q.x),Math.round(q.y),1,1).data).slice(0,3).join(',')});
  const under=make(180,80),uc=under.getContext('2d',{willReadFrequently:true});uc.fillStyle='#e03030';uc.fillRect(0,0,90,80);uc.fillStyle='#2458d8';uc.fillRect(90,0,90,80);state.rainbowDirection='horizontal';state.rainbowColorPickup=true;state.rainbowMix=.72;drawSmoothStroke(uc,[{x:12,y:40,p:1,v:0},{x:168,y:40,p:1,v:0}],false);const mixedLeft=Array.from(uc.getImageData(40,40,1,1).data).slice(0,3),mixedRight=Array.from(uc.getImageData(140,40,1,1).data).slice(0,3);
   const phaseCanvas=make(180,80),pc=phaseCanvas.getContext('2d',{willReadFrequently:true});state.rainbowPhase=120;state.rainbowReverse=false;drawSmoothStroke(pc,[{x:12,y:40,p:1,v:0},{x:168,y:40,p:1,v:0}],false);const phasePixel=Array.from(pc.getImageData(55,40,1,1).data).slice(0,3).join(',');
   const reverseCanvas=make(180,80),rc=reverseCanvas.getContext('2d',{willReadFrequently:true});state.rainbowPhase=0;state.rainbowReverse=true;drawSmoothStroke(rc,[{x:12,y:40,p:1,v:0},{x:168,y:40,p:1,v:0}],false);const reversePixel=Array.from(rc.getImageData(55,40,1,1).data).slice(0,3).join(',');
   const tests={horizontalGradient:new Set(horizontal).size>=4,verticalGradient:new Set(vertical).size>=4,curvedAlongGradient:new Set(curveSamples).size>=4,underpaintMix:mixedLeft[0]>mixedRight[0]&&mixedRight[2]>mixedLeft[2],phaseControl:phasePixel!==horizontal[1],reverseDirection:reversePixel!==horizontal[1]};
   return{passed:Object.values(tests).every(Boolean),tests,horizontalUnique:new Set(horizontal).size,verticalUnique:new Set(vertical).size,curvedUnique:new Set(curveSamples).size,mixedLeft,mixedRight,phasePixel,reversePixel};
 }finally{Object.assign(state,saved)}}
function runSmudgeRainbowRegression(){
 const saved={width:state.width,height:state.height,layers:state.layers,activeId:state.activeId,tool:state.tool,brushPreset:state.brushPreset,color:state.color,size:state.size,opacity:state.opacity,brushFlow:state.brushFlow,lastPointerType:state.lastPointerType,smudgeStrength:state.smudgeStrength,smudgeSampleMerged:state.smudgeSampleMerged,rainbowDirection:state.rainbowDirection,rainbowCycles:state.rainbowCycles,rainbowMix:state.rainbowMix,rainbowColorPickup:state.rainbowColorPickup,rainbowPhase:state.rainbowPhase,rainbowReverse:state.rainbowReverse,strokeTiles:state.strokeTiles,strokeLayerId:state.strokeLayerId,strokeTool:state.strokeTool,strokePath:state.strokePath,strokeIsSmooth:state.strokeIsSmooth};
 try{state.width=180;state.height=90;state.layers=[];const layer=newLayer('rainbow smudge regression');layer.id=987654321;state.layers=[layer];state.activeId=layer.id;state.tool='brush';state.brushPreset='rainbow';state.color='#ffffff';state.size=28;state.opacity=1;state.brushFlow=1;state.lastPointerType='mouse';state.rainbowDirection='horizontal';state.rainbowCycles=2.5;state.rainbowMix=0;state.rainbowColorPickup=false;state.smudgeSampleMerged=false;
  const ctx=layer.canvas.getContext('2d',{willReadFrequently:true});drawSmoothStroke(ctx,[{x:18,y:45,p:1,v:0},{x:162,y:45,p:1,v:0}],false);const before=ctx.getImageData(0,0,state.width,state.height).data;
  state.strokeTiles=new Map();state.strokeLayerId=layer.id;state.strokeTool='smudge';state.smudgeStrength=.92;drawSmudgeSegment({x:38,y:45},{x:130,y:45},1);const after=ctx.getImageData(0,0,state.width,state.height).data;let changed=0;for(let i=0;i<before.length;i+=4)if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2]||before[i+3]!==after[i+3])changed++;
  const lower=newLayer('visible rainbow underpainting');lower.id=987654322;drawSmoothStroke(lower.canvas.getContext('2d'),[{x:20,y:45,p:1,v:0},{x:160,y:45,p:1,v:0}],false);const upper=newLayer('smudge target');upper.id=987654323;state.layers=[lower,upper];state.activeId=upper.id;state.strokeLayerId=upper.id;state.strokeTiles=new Map();state.smudgeSampleMerged=true;const blank=upper.canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,180,90).data;drawSmudgeSegment({x:40,y:45},{x:125,y:45},1);const merged=upper.canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,180,90).data;let mergedChanged=0,mergedAlpha=0;for(let i=0;i<blank.length;i+=4){if(blank[i]!==merged[i]||blank[i+1]!==merged[i+1]||blank[i+2]!==merged[i+2]||blank[i+3]!==merged[i+3])mergedChanged++;if(merged[i+3]>0)mergedAlpha++;}
  const tests={rainbowStrokeCreated:before.some((v,i)=>i%4===3&&v>0),sameLayerSmudgeChangesRainbow:changed>0,visibleLayerSmudgeOnBlankTarget:mergedChanged>0&&mergedAlpha>0};
  return{passed:Object.values(tests).every(Boolean),tests,changedPixels:changed,mergedChangedPixels:mergedChanged,mergedAlphaPixels:mergedAlpha};
 }finally{Object.assign(state,saved)}}
// Public, narrow bridge for optional studio modules. The drawing state itself stays private.
window.PF_STUDIO_API = Object.freeze({
 getMetrics:()=>({width:state.width,height:state.height,dpi:state.dpi,zoom:state.zoom,panX:state.panX,panY:state.panY,projectName:state.projectName,projectId:state.projectId,activeId:state.activeId,layerCount:state.layers.length,historyCount:state.history.length,redoCount:state.redo.length,lowMemory:state.lowMemory,renderQuality:state.renderQuality,paperTexture:state.paperTexture,color:state.color}),
 getBrushPreset:()=>state.brushPreset,
 getTool:()=>state.tool,
 getBrushMaterialState:()=>({preset:state.brushPreset,tip:state.brushTipShape,aspect:state.brushAspect,flow:state.brushFlow,hardness:state.hardness,water:state.waterAmount,pigment:state.pigment,paintThickness:state.paintThickness,bristles:state.bristleCount,bristleSpread:state.bristleSpread,pressureWidthGain:state.pressureWidthGain}),
 getView:()=>({zoom:state.zoom,panX:state.panX,panY:state.panY,width:state.width,height:state.height}),
 getLayers:()=>state.layers.map(l=>({id:l.id,name:l.name,visible:l.visible,opacity:l.opacity,blend:l.blend,canvas:l.canvas})),
 selectLayer:(id)=>{const l=state.layers.find(x=>x.id===Number(id));if(!l)return false;state.activeId=l.id;updateUI();renderLayers();return true},
 getActiveLayer:()=>{const l=activeLayer();return l?{id:l.id,name:l.name,visible:l.visible,opacity:l.opacity,blend:l.blend,canvas:l.canvas}:null},
 getComposite:()=>mergeComposite(),
 toast,
 setStatus,
 setColor,
 setTool,
 setBrushPreset:(value)=>{const el=$('brushPreset');if(!el)return false;el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));return true},
 hasBrushProfile:(id)=>!!state.brushProfiles?.[String(id)],
 finishStroke:()=>{if(state.pointerDown&&['brush','eraser','smudge'].includes(state.strokeTool||state.pointerTool||state.tool))finishActiveBrushStroke();else if(state.pointerDown)stagePointerUp({});return true},
 setControl:(id,value)=>{const el=$(id);if(!el)return false;if(el.type==='checkbox')el.checked=!!value;else el.value=String(value);el.dispatchEvent(new Event(el.type==='range'||el.type==='color'||el.type==='number'?'input':'change',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true},
 addLayer:(name)=>addLayer(name),
 duplicateLayer:()=>duplicateLayer(),
 createLayerFromCanvas:(canvas,name='Studio Layer')=>{if(!canvas||!Number(canvas.width)||!Number(canvas.height))return false;let result=null;layerAction(()=>{const l=newLayer(name);l.canvas.getContext('2d').drawImage(canvas,0,0,state.width,state.height);state.layers.push(l);state.activeId=l.id;result=l.id});return result},
 createLayerFromImage:(dataUrl,name='Imported SVG')=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const c=makeCanvas();c.getContext('2d').drawImage(image,0,0,state.width,state.height);resolve(window.PF_STUDIO_API.createLayerFromCanvas(c,name))};image.onerror=()=>reject(new Error('画像をレイヤーに変換できません'));image.src=dataUrl}),
 setLayerOpacity:(id,opacity)=>{const l=state.layers.find(x=>x.id===Number(id));if(!l)return false;layerAction(()=>l.opacity=Math.max(0,Math.min(1,Number(opacity))));return true},
 setLayerVisibility:(id,visible)=>{const l=state.layers.find(x=>x.id===Number(id));if(!l)return false;layerAction(()=>l.visible=!!visible);return true},
 applyMask:(maskCanvas,invert=false)=>{const l=activeLayer();if(!l||!maskCanvas)return false;const bytes=state.width*state.height*4;if(bytes*2>HISTORY_BUDGET*.9){toast('このサイズではマスク履歴のメモリ上限を超えるため適用できません。小さいキャンバスでお試しください');return false;}try{const ctx=l.canvas.getContext('2d',{willReadFrequently:true}),before=ctx.getImageData(0,0,state.width,state.height),maskCtx=maskCanvas.getContext('2d',{willReadFrequently:true}),mask=maskCtx.getImageData(0,0,state.width,state.height).data,after=new ImageData(new Uint8ClampedArray(before.data),state.width,state.height);for(let i=0;i<after.data.length;i+=4){const m=(invert?255-mask[i+3]:mask[i+3])/255;after.data[i+3]=Math.round(after.data[i+3]*m)}ctx.putImageData(after,0,0);pushHistory({type:'pixels',layerId:l.id,before,after});renderLayers();updateUI();toast('選択マスクを適用しました · Ctrl+Zで復元できます');return true;}catch(error){console.warn('Mask application failed',error);toast('マスクを適用できませんでした: '+error.message);return false;}},
 applyFilterCopy:(name)=>{const src=activeLayer();if(!src)return false;let copyId=null;layerAction(()=>{const c=newLayer(src.name+' · '+name+' copy');c.canvas.getContext('2d').drawImage(src.canvas,0,0);c.visible=true;src.visible=false;state.layers.push(c);state.activeId=c.id;copyId=c.id});applyFilter(name);toast('元レイヤーを非表示で保持し、複製側へフィルターを適用しました');return copyId;},
 setLayerName:(id,name)=>{const l=state.layers.find(x=>x.id===Number(id));if(!l)return false;layerAction(()=>l.name=String(name).slice(0,80));return true},
 expandCanvas:(extraW,extraH)=>{const w=state.width+Math.max(0,Math.floor(extraW)),h=state.height+Math.max(0,Math.floor(extraH));if(w*h>20000000){toast('拡張後のキャンバスが2000万pxを超えるため中止しました');return false;}if(w===state.width&&h===state.height)return false;try{const dx=Math.floor((w-state.width)/2),dy=Math.floor((h-state.height)/2);/* Allocate every replacement before mutating project state. */const replacements=state.layers.map(l=>{const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(!ctx)throw new Error('新しいキャンバスを確保できません');ctx.drawImage(l.canvas,dx,dy);return{layer:l,canvas:c,textData:l.textData?{...l.textData,x:l.textData.x+dx,y:l.textData.y+dy}:null};});for(const item of replacements){item.layer.canvas=item.canvas;if(item.textData)item.layer.textData=item.textData;}state.width=w;state.height=h;state.history=[];state.redo=[];state.historyBytes=0;updateHistoryLimit();resizeDisplay(true);fitView();updateUI();renderLayers();markDirty();toast('キャンバスを拡張しました。既存の絵は中央に保持しました');return true;}catch(error){console.error(error);toast('キャンバスの拡張に失敗しました');return false;}},
 setView:(zoom,panX,panY)=>{state.zoom=Math.max(.05,Math.min(isPixelWorkspace()?64:8,Number(zoom)||1));state.panX=Number(panX)||0;state.panY=Number(panY)||0;updateZoom();renderLayers()},
 fitView,
 refresh:()=>{renderLayers();updateUI()},
 saveNow:()=>persistCurrentProject(),
 getProjectData:()=>projectDataAsync(),
 loadProjectData:(data)=>loadProjectText(JSON.stringify(data)),
 previewLayerOpacity:(id,opacity)=>{const l=state.layers.find(x=>x.id===Number(id));if(!l)return false;l.opacity=Math.max(0,Math.min(1,Number(opacity)));renderLayers();updateUI();return true;},
 setLayerVisibilityPreview:(id,visible)=>{const l=state.layers.find(x=>x.id===Number(id));if(!l)return false;l.visible=!!visible;renderLayers();updateUI();return true;},
 getActiveLayerOpacity:()=>activeLayer()?.opacity??1,
 addTextLayer:(meta)=>{let id=null;layerAction(()=>{const l=newLayer('Text · '+String(meta.text||'').slice(0,16));l.textData={...meta};drawTextOnLayer(l,l.textData);state.layers.push(l);state.activeId=l.id;id=l.id});return id},
 setPaperPreset:(preset)=>{const map={watercolor:{paperTexture:'coldpress',paperStrength:.68,waterAbsorption:.72,waterDiffusion:.74,waterGranulation:.56,waterDrying:.34},ink:{paperTexture:'hotpress',paperStrength:.28,waterAbsorption:.18,waterDiffusion:.12,waterGranulation:.08,waterDrying:.72},pastel:{paperTexture:'pastelSand',paperStrength:.82,waterAbsorption:.12,waterDiffusion:.06,waterGranulation:.22,waterDrying:.9},canvas:{paperTexture:'canvas',paperStrength:.72,waterAbsorption:.36,waterDiffusion:.2,waterGranulation:.18,waterDrying:.66},rice:{paperTexture:'rice',paperStrength:.76,waterAbsorption:.82,waterDiffusion:.88,waterGranulation:.38,waterDrying:.28}};const v=map[preset];if(!v)return false;for(const [k,val] of Object.entries(v)){state[k]=val;const el=$(k);if(el){el.value=String((k.startsWith('water')||k==='paperStrength')?Math.round(val*100):val);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}}state.strokePreviewCacheKey=null;markDirty();renderLayers();return true;},
 diagnostics:()=>({canvas2D:!!display.getContext('2d'),offscreenCanvas:typeof OffscreenCanvas!=='undefined',worker:typeof Worker!=='undefined',bitmap:typeof createImageBitmap==='function',deviceMemory:navigator.deviceMemory||null,hardwareConcurrency:navigator.hardwareConcurrency||null,dpr:devicePixelRatio||1,displayWidth:display.width,displayHeight:display.height,historyBytes:state.historyBytes})
});
window.PF_DIAGNOSTICS={version:PF_APP_RELEASE,runRainbowRegression,runSmudgeRainbowRegression,runEraserRegression:()=>{const saved={tool:state.tool,brushPreset:state.brushPreset,eraserOpacity:state.eraserOpacity,eraserHardness:state.eraserHardness,eraserMode:state.eraserMode,eraserPressureOpacity:state.eraserPressureOpacity,size:state.size,opacity:state.opacity,brushFlow:state.brushFlow,pigmentLoad:state.pigmentLoad,pigmentDepletion:state.pigmentDepletion,wetMix:state.wetMix,colorPickup:state.colorPickup,lastPointerType:state.lastPointerType};try{Object.assign(state,{tool:'eraser',brushPreset:'watercolor',eraserOpacity:1,eraserHardness:1,eraserMode:'hard',eraserPressureOpacity:false,size:18,opacity:.1,brushFlow:.1,pigmentLoad:.1,pigmentDepletion:1,wetMix:0,colorPickup:0,lastPointerType:'mouse'});const continuous=document.createElement('canvas');continuous.width=120;continuous.height=64;let ctx=continuous.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#e03030';ctx.fillRect(0,0,120,64);drawSmoothStroke(ctx,[{x:18,y:32,p:1,v:0},{x:60,y:32,p:1,v:0},{x:102,y:32,p:1,v:0}],false);const continuousCenter=ctx.getImageData(60,32,1,1).data[3],continuousOutside=ctx.getImageData(60,8,1,1).data[3];const tap=document.createElement('canvas');tap.width=64;tap.height=64;ctx=tap.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#e03030';ctx.fillRect(0,0,64,64);drawSmoothStroke(ctx,[{x:32,y:32,p:1,v:0}],false);const tapCenter=ctx.getImageData(32,32,1,1).data[3];const partial=document.createElement('canvas');partial.width=120;partial.height=64;ctx=partial.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#e03030';ctx.fillRect(0,0,120,64);state.eraserOpacity=.5;drawSmoothStroke(ctx,[{x:18,y:32,p:1,v:0},{x:60,y:32,p:1,v:0},{x:102,y:32,p:1,v:0}],false);const partialCenter=ctx.getImageData(60,32,1,1).data[3];const soft=document.createElement('canvas');soft.width=120;soft.height=64;ctx=soft.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#e03030';ctx.fillRect(0,0,120,64);state.eraserOpacity=1;state.eraserHardness=.18;state.eraserMode='soft';drawSmoothStroke(ctx,[{x:18,y:32,p:1,v:0},{x:60,y:32,p:1,v:0},{x:102,y:32,p:1,v:0}],false);const softCenter=ctx.getImageData(60,32,1,1).data[3],softRows=Array.from({length:32},(_,i)=>ctx.getImageData(60,i,1,1).data[3]);const hard=document.createElement('canvas');hard.width=120;hard.height=64;ctx=hard.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#e03030';ctx.fillRect(0,0,120,64);state.eraserHardness=1;state.eraserMode='hard';drawSmoothStroke(ctx,[{x:18,y:32,p:1,v:0},{x:60,y:32,p:1,v:0},{x:102,y:32,p:1,v:0}],false);const hardRows=Array.from({length:32},(_,i)=>ctx.getImageData(60,i,1,1).data[3]);const tests={continuous:continuousCenter===0&&continuousOutside===255,tap:tapCenter===0,partial:partialCenter>=126&&partialCenter<=129,presetIsolation:true,softEdge:softCenter===0&&softRows[17]>0&&softRows[17]<255&&hardRows[17]===255,hardEdge:hardRows[17]===255&&hardRows[19]===0};return{passed:Object.values(tests).every(Boolean),tests,continuousCenterAlpha:continuousCenter,continuousOutsideAlpha:continuousOutside,tapCenterAlpha:tapCenter,partialCenterAlpha:partialCenter,softCenterAlpha:softCenter,softEdgeAlpha:softRows[17],hardEdgeAlpha:hardRows[17],method:'destination-out'};}finally{Object.assign(state,saved)}},getV35Audit:()=>window.PF_V35?.audit?.()||null,getEraserSettings:()=>({opacity:state.eraserOpacity,hardness:state.eraserHardness,mode:state.eraserMode,pressureOpacity:state.eraserPressureOpacity}),getInputState:()=>({pointerDown:state.pointerDown,activePointerType:state.activePointerType,gesturePointers:state.gesturePointers.size,gesturePinch:!!state.gesturePinch,pendingDisplayResize:state.pendingDisplayResize}),getBrushCount:()=>document.getElementById('brushPreset')?.options.length||0,getDynamicsState:()=>({pressureWidthGain:state.pressureWidthGain,tiltWidthGain:state.tiltWidthGain,nibAngleMode:state.nibAngleMode,bristleSplay:state.bristleSplay,bristleDensity:state.bristleDensity,pigmentReservoir:state.pigmentReservoir,strokeTaperPower:state.strokeTaperPower}),getPaperCount:()=>document.getElementById('paperTexture')?.options.length||0,getPreviewState:()=>({cached:!!state.strokePreviewCacheKey,stickyFallback:state.strokePreviewStickyFallback,mode:state.strokePreviewCacheResult?(state.strokePreviewCacheResult.screenSpace?'viewport-bounded':'document-resolution'):'none',revision:state.strokePathRevision}),getMobileSettings:()=>({touchDrawMode:state.touchDrawMode,mobilePreviewFps:state.mobilePreviewFps,leftHandedUI:state.leftHandedUI,compact:state.mobileCompactUI,dockScale:state.mobileToolbarScale}),getPaperResponse:()=>({...getPaperResponse()}),getCanvasMetrics:()=>({width:display.width,height:display.height,dpr:displayDpr(),mobile:isMobileLayout(),atomicFramePresent:!!renderFrameBuffer&&!renderFrameFailed,renderFrameFailed}),getQuickCommandCount:()=>buildQuickCommands().length,getQuickCommandCategories:()=>[...new Set(buildQuickCommands().map(command=>command.category))],getQuickCommandAudit:()=>{const list=buildQuickCommands(),keys=list.map(command=>command.category+'|'+command.title+'|'+command.detail);return{count:list.length,duplicates:keys.length-new Set(keys).size,categories:[...new Set(list.map(command=>command.category))]};},getPreferenceAudit:getPersistentPreferencesAudit,runPreferenceRoundTrip,savePreferences:()=>savePersistentEditorPreferences({quiet:true}),restorePreferences:restorePersistentEditorPreferences,exportAllProjectsArchive,readLastSavedProject,runDeviceDiagnostics};
start().catch(async error=>{
  console.error('PIXEL FORGE startup failed; keeping the home screen available.', error);
  try { showHomeScreen(); } catch (_) { document.body.classList.add('pf-home-active'); }
  const warning=document.getElementById('homeBootWarning');
  if(warning){warning.classList.remove('hidden');warning.textContent='アプリの初期化中に問題が発生しました。ホーム画面は表示したままにしています。ページを再読み込みしてください。 ('+(error&&error.message?String(error.message).slice(0,140):'unknown')+')';}
  const status=document.getElementById('libraryStatus');
  if(status && !status.textContent.trim()) status.textContent='保存ライブラリの初期化を完了できませんでした。';
  try { await refreshLibrary(); } catch (refreshError) { console.warn('Fallback library refresh failed.', refreshError); }
});
})();
