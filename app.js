(() => {
'use strict';
const $ = id => document.getElementById(id);
const stage = $('stage'), display = $('display'), overlay = $('overlay');
const dctx = display.getContext('2d', {alpha:true});
const octx = overlay.getContext('2d', {alpha:true});
const state = {
  width:1600,height:1000,bg:'white',layers:[],activeId:null,tool:'brush',color:'#222b3a',size:18,opacity:1,hardness:.85,stabilizer:.20,
  symmetry:'none',zoom:1,panX:0,panY:0,grid:true,space:false,panning:false,pointerDown:false,lastPoint:null,filteredPoint:null,startPoint:null,moveSnapshot:null,moveBefore:null,waterSpread:.45,edgeDarkening:.30,fillTolerance:24,gradientColor:'#83b7ff',gradientType:'linear',dpi:300,exportScale:1,exportQuality:.92,exportMatte:'#ffffff',
  history:[],redo:[],historyLimit:320,historyBytes:0,strokeTiles:null,strokeLayerId:null,strokeTool:null,pointerTool:null,strokeCurvePrev:null,strokeCurveMid:null,strokePrevPressure:1,strokeLastSample:null,strokePath:[],strokeIsSmooth:false,strokeLastTime:0,strokePreviewCanvas:null,strokePreviewBounds:null,strokePreviewFallback:false,strokeStability:.18,strokePressureSmoothing:.62,pressureFloor:.02,pressureCeiling:1,strokeSampleDensity:1,strokeResampleQuality:.8,strokePreviewMode:'accurate',operationLocked:false,smudgeStrength:.58,fillContiguous:true,fillMerged:false,fillOpacity:1,fillFeather:0,waterAbsorption:.48,waterDiffusion:.56,waterGranulation:.24,waterDrying:.38,waterPreset:'wet',transformBounds:null,transforming:false,transformMode:null,transformBase:null,transformSource:null,transformBefore:null,gesturePointers:new Map(),gesturePinch:null,activePointerId:null,activePointerType:null,suppressMouseUntil:0,pendingDisplayResize:false,lowMemory:false,renderQuality:'balanced',strokeSmoothing:.42,strokeTaper:.14,paperInteraction:.78,textureDetail:.62,pressureProfile:'natural',velocitySize:.12,velocityOpacity:.06,taperStart:.055,taperEnd:.085,wetEdge:.16,textureScale:1,edgeSoftness:.06,nibTiltSensitivity:.55,strokeCorrection:'balanced',feelFriction:.25,feelSmoothing:.35,pressureCurve:1,tiltEnabled:true,brushFlow:1,brushJitter:0,brushAngle:0,pressureOpacity:false,curveBend:.35,polygonSides:6,projectName:'Untitled',dirty:false,lastAutosave:0,brushPreset:'gpen',brushProfiles:{},brushProfileAuto:true,waterAmount:.55,pigment:.35,paperTexture:'none',paperStrength:.35,paperFiberDirection:0,paperGrainScale:1,paperSurfaceRelief:.55,touchPalmRejection:true,strokeSessionId:0,strokePathRevision:0,strokePreviewCacheKey:null,strokePreviewCacheResult:null,strokePreviewStickyFallback:false,mobilePreviewFps:45,touchDrawMode:'draw',touchSmoothing:.45,touchMinDistance:.20,palmRejectionRadius:24,lastPenClientPoint:null,lastPenAt:0,leftHandedUI:false,mobileToolbarScale:1,mobileDockOpacity:.92,mobileCompactUI:true,showPressureHUD:true,tapDotMode:true,brushTipShape:'round',paintBlendMode:'auto',brushAspect:1,bristleCount:9,bristleSpread:.45,bristleStiffness:.60,paintThickness:.45,pigmentLoad:1,pigmentGranulation:.35,edgeRoughness:.20,tipRotationJitter:0,stampSpacingFine:.5,textureContrast:.55,colorPickup:.28,wetMix:.42,wetBleed:.24,edgePooling:.28,strokeWetness:.55,paperTooth:.50,paperFiberDensity:.50,paperFiberLength:.55,paperWarp:.28,paperNoise:.24,paperTemperature:8,paperBrightness:1,paperPorosity:.50,canvasWeave:.55,paperBleed:.10,pressureWidthGain:1,tiltWidthGain:.42,nibFollow:.65,nibAngleMode:'follow',strokeWidthNoise:.035,strokeWidthWave:.08,strokeTaperPower:1.35,bristleSplay:.55,bristleLengthVariation:.28,bristleClumping:.30,bristleCurl:.24,bristleLag:.22,bristleWaviness:.12,bristleWidthVariation:.24,bristleOpacityVariation:.22,bristleDensity:1,bristleWetness:.58,bristleColorVariation:.18,paintDrag:.32,pigmentReservoir:.78,pigmentDepletion:.25,strokeDrying:.32,wetEdgeSpread:.42,colorPickupRadius:4,edgeBreakup:.18,reference:null,animationFrames:[],frameIndex:0,onionSkin:false,onionGhost:[],frameTimer:null,animationPlaying:false,frameRaf:0,frameLoadToken:0,animationDirection:1,playbackNextAt:0,onionGhostToken:0
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
function markDirty(){state.dirty=true;$('autosaveStatus').textContent='未保存';scheduleAutosave()}
function activeLayer(){return state.layers.find(l=>l.id===state.activeId)||state.layers[state.layers.length-1]}
const TILE_SIZE=128, MAX_STROKE_TILES=1200;
function rememberStrokeTiles(a,b,control=null){const layer=activeLayer(),map=state.strokeTiles;if(!layer||!map||layer.id!==state.strokeLayerId)return;const pad=Math.max(4,state.size*(['spray','glitter'].includes(state.brushPreset)?3:2));const aa=symmetryPoints(a),bb=symmetryPoints(b),cc=control?symmetryPoints(control):aa,ctx=layer.canvas.getContext('2d');for(let i=0;i<Math.min(aa.length,bb.length,cc.length);i++){const p=aa[i],q=bb[i],c=cc[i],x0=Math.max(0,Math.floor((Math.min(p.x,q.x,c.x)-pad)/TILE_SIZE)),y0=Math.max(0,Math.floor((Math.min(p.y,q.y,c.y)-pad)/TILE_SIZE)),x1=Math.min(Math.ceil(state.width/TILE_SIZE)-1,Math.floor((Math.max(p.x,q.x,c.x)+pad)/TILE_SIZE)),y1=Math.min(Math.ceil(state.height/TILE_SIZE)-1,Math.floor((Math.max(p.y,q.y,c.y)+pad)/TILE_SIZE));for(let ty=y0;ty<=y1;ty++)for(let tx= x0;tx<=x1;tx++){const key=tx+','+ty;if(map.has(key))continue;if(map.size>=MAX_STROKE_TILES){state.strokeTileLimitHit=true;continue;}const x=tx*TILE_SIZE,y=ty*TILE_SIZE,w=Math.min(TILE_SIZE,state.width-x),h=Math.min(TILE_SIZE,state.height-y);map.set(key,{x,y,before:ctx.getImageData(x,y,w,h)});}}}
function getStrokeTileAfter(layer){const ctx=layer.canvas.getContext('2d'),before=[],after=[];for(const tile of (state.strokeTiles||new Map()).values()){before.push({x:tile.x,y:tile.y,image:tile.before});after.push({x:tile.x,y:tile.y,image:ctx.getImageData(tile.x,tile.y,tile.before.width,tile.before.height)});}return{before,after};}
function applyTileHistory(layer,tiles){const ctx=layer.canvas.getContext('2d');for(const tile of tiles||[])ctx.putImageData(tile.image,tile.x,tile.y);}

function makeCanvas(){const c=document.createElement('canvas');c.width=state.width;c.height=state.height;return c}
function newLayer(name='Layer'){const c=makeCanvas();return {id:nextLayerId++,name,canvas:c,visible:true,opacity:1,blend:'source-over',textData:null}}
function initDocument(){stopAnimationPlayback({save:false,quiet:true});state.layers=[newLayer('Layer 1')];state.activeId=state.layers[0].id;state.bg='white';state.projectName='Untitled';state.history=[];state.redo=[];state.dirty=false;state.reference=null;state.paperTexture='none';state.animationFrames=[];state.frameIndex=0;setViewCenter();renderLayers();updateUI();ensureInitialFrame();}
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
 transformContext(ctx);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality=state.renderQuality==='fidelity'?'high':'medium';drawDocumentBase(ctx,true);
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
function drawOverlay(){clearOverlay();if(!octx)return;drawSymmetryGuides(octx);if(state.pointerDown&&state.strokeIsSmooth&&state.strokePath?.length&&(state.strokePreviewFallback||state.strokePreviewStickyFallback))drawSmoothStroke(octx,strokePreviewSamplePath(state.strokePath),true);if(state.pointerDown&&state.startPoint&&isShapeTool(state.tool)){const starts=symmetryPoints(state.startPoint),ends=symmetryPoints(state.lastPoint||state.startPoint);octx.save();octx.strokeStyle=state.color;octx.fillStyle=state.color;octx.globalAlpha=state.opacity;octx.lineWidth=state.size;octx.lineCap='round';octx.lineJoin='round';for(let i=0;i<Math.min(starts.length,ends.length);i++)drawShapePath(octx,state.tool,starts[i],ends[i],$('shapeFill').checked);octx.restore()}if(state.pointerDown&&state.tool==='gradient'&&state.startPoint&&state.lastPoint){const a=state.startPoint,b=state.lastPoint;octx.save();const grad=state.gradientType==='radial'?octx.createRadialGradient(a.x,a.y,0,b.x,b.y,Math.max(1,Math.hypot(b.x-a.x,b.y-a.y))):octx.createLinearGradient(a.x,a.y,b.x,b.y);grad.addColorStop(0,state.color);grad.addColorStop(1,state.gradientColor);octx.globalAlpha=.35;octx.fillStyle=grad;octx.fillRect(0,0,state.width,state.height);octx.restore()}}
function drawTransformOverlay(ctx){if(!['transform','move'].includes(state.tool)||!state.transformBounds||!ctx)return;const b=state.transformBounds;ctx.save();ctx.strokeStyle='#91c8ff';ctx.fillStyle='#d9edff';ctx.lineWidth=1.4/state.zoom;ctx.setLineDash([6/state.zoom,4/state.zoom]);ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.setLineDash([]);const handles=[{x:b.x+b.w/2,y:b.y-28/state.zoom,r:5/state.zoom},...[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]].map(([x,y])=>({x,y,r:5/state.zoom}))];ctx.beginPath();ctx.moveTo(b.x+b.w/2,b.y);ctx.lineTo(b.x+b.w/2,b.y-28/state.zoom);ctx.stroke();for(const h of handles){ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.fill();ctx.stroke()}ctx.restore()}
function findAlphaBounds(layer){if(!layer)return{x:0,y:0,w:state.width,h:state.height};const d=layer.canvas.getContext('2d').getImageData(0,0,state.width,state.height).data;let minX=state.width,minY=state.height,maxX=-1,maxY=-1;for(let y=0;y<state.height;y++){let row=y*state.width*4;for(let x=0;x<state.width;x++){if(d[row+x*4+3]>4){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}}}return maxX<0?{x:0,y:0,w:state.width,h:state.height}:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}}
function cloneLayerCanvas(layer){const c=makeCanvas();c.getContext('2d').drawImage(layer.canvas,0,0);return c}
function renderLayerTransform(layer,src,base,dx,dy,angle,scaleX,scaleY=scaleX){const ctx=layer.canvas.getContext('2d');ctx.clearRect(0,0,state.width,state.height);ctx.save();ctx.translate(base.cx+dx,base.cy+dy);ctx.rotate(angle);ctx.scale(scaleX,scaleY);ctx.drawImage(src,-base.cx,-base.cy);ctx.restore();}
function applyObjectTransform(angle,scale,dx,dy,flipX=false){const layer=activeLayer();if(!layer)return;const before=captureLayerImage(layer),src=cloneLayerCanvas(layer),bounds=state.transformBounds||findAlphaBounds(layer),base={cx:bounds.x+bounds.w/2,cy:bounds.y+bounds.h/2};renderLayerTransform(layer,src,base,dx,dy,angle,scale*(flipX?-1:1));const after=captureLayerImage(layer);pushHistory({type:'pixels',layerId:layer.id,before,after});state.transformBounds=findAlphaBounds(layer);renderLayers();markDirty();}
function hitTransformHandle(p,b){const r=13/state.zoom,rot={x:b.x+b.w/2,y:b.y-28/state.zoom};if(Math.hypot(p.x-rot.x,p.y-rot.y)<r)return'rotate';const hs=[['scale-nw',b.x,b.y],['scale-ne',b.x+b.w,b.y],['scale-sw',b.x,b.y+b.h],['scale-se',b.x+b.w,b.y+b.h]];for(const [id,x,y] of hs)if(Math.hypot(p.x-x,p.y-y)<r)return id;if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return'move';return null;}
function findLayerAtPoint(p){const x=Math.max(0,Math.min(state.width-1,Math.floor(p.x))),y=Math.max(0,Math.min(state.height-1,Math.floor(p.y)));for(let i=state.layers.length-1;i>=0;i--){const l=state.layers[i];if(!l.visible||l.opacity<=0)continue;try{if(l.canvas.getContext('2d').getImageData(x,y,1,1).data[3]>12)return l}catch(_){}}return null;}
function docPoint(e){const r=stage.getBoundingClientRect();return{x:(e.clientX-r.left-state.panX)/state.zoom,y:(e.clientY-r.top-state.panY)/state.zoom}}
function insideDoc(p){return p.x>=0&&p.y>=0&&p.x<state.width&&p.y<state.height}
function colorRgb(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]}
function curvePoint(a,control,b,t){const u=1-t;return{x:u*u*a.x+2*u*t*control.x+t*t*b.x,y:u*u*a.y+2*u*t*control.y+t*t*b.y}}
function stableRandom(seed){let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}}
function traceBrushPath(ctx,a,b,control){ctx.beginPath();ctx.moveTo(a.x,a.y);if(control)ctx.quadraticCurveTo(control.x,control.y,b.x,b.y);else ctx.lineTo(b.x,b.y);ctx.stroke()}
const SMOOTH_INK_PRESETS=new Set(['gpen','maru','millipen','pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','watercolor','acrylic','glass','fountain','marker','airbrush','chalk','crayon','brushPen','sumi','dip','dryBrush','oil','pastel','highlighter','neon','metalGold','metalSilver','metalCopper','chrome','neonPink','neonCyan','neonLime','calligraphy','bristleOil','granulating','softAirbrush','mappingPen','liner','saji','fude','drySumi','mechanicalPencil','softPencil','charcoal','conte','oilPastel','roundWatercolor','flatWatercolor','gouache','textureBrush','watercolorBloom','dryGouache','sableRound','flatSable','fanBrush','paletteKnife','stippling','splatter','inkWash','softGraphite','hardGraphite','chalkDust','textureMottler','grainMarker','dryMarker','wetMarker']);
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
function brushAlphaScale(preset){return({maru:.98,glass:.78,fountain:.86,mappingPen:1,liner:1,mechanicalPencil:.40,softPencil:.46,marker:.36,saji:.9,fude:.74,drySumi:.67,airbrush:.22,softAirbrush:.19,highlighter:.26,metalGold:.98,metalSilver:.98,metalCopper:.98,chrome:.98,sumi:.88,pencilHB:.36,pencilB:.43,pencil2B:.50,pencil4B:.59,coloredPencil:.58,mechanicalPencil:.32,softPencil:.42,charcoal:.55,conte:.58,oilPastel:.62,watercolor:.50,roundWatercolor:.48,flatWatercolor:.46,gouache:.84,fude:.72,drySumi:.66,textureBrush:.55,watercolorBloom:.44,dryGouache:.78,sableRound:.72,flatSable:.72,fanBrush:.66,paletteKnife:.88,stippling:.58,splatter:.56,inkWash:.38,softGraphite:.40,hardGraphite:.50,chalkDust:.58,textureMottler:.62,grainMarker:.40,dryMarker:.42,wetMarker:.34,granulating:.54,acrylic:.82,oil:.78,bristleOil:.72,filbertBrush:.72,hakeBrush:.42,mopBrush:.38,rakeBrush:.58,daggerBrush:.72,blenderBrush:.38,fanDryBrush:.52,softCarbon:.42,waxCrayon:.62,graphitePowder:.38,sumiWide:.68,chalk:.62,crayon:.66,dryBrush:.58,pastel:.54,gpen:1,millipen:1,neon:1,neonPink:1,neonCyan:1,neonLime:1})[preset]??1;}
function drawSmoothStroke(ctx,points,preview=false){
 if(!points?.length)return;const preset=state.brushPreset,eraser=state.tool==='eraser';
 const originalColor=eraser?'#ffffff':state.color;
 let color=preset==='neonPink'?'#ff38c8':preset==='neonCyan'?'#30eaff':preset==='neonLime'?'#a8ff36':originalColor;
 // Sample the pre-stroke underpainting in the active preview/commit canvas.
 // Canvas transforms are inverted explicitly so the same sampling works on a
 // document-sized layer, a tile preview, and the phone's screen-bounded preview.
 if(!eraser&&state.colorPickup>.01&&['oil','bristleOil','acrylic','gouache','dryGouache','oilPastel','paletteKnife'].includes(preset)){
  try{const m=ctx.getTransform?.(),base=[parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16)],samples=[],count=Math.min(7,Math.max(3,Math.ceil(points.length/5)));for(let i=0;i<count;i++){const q=points[Math.round(i*(points.length-1)/Math.max(1,count-1))],sx=Math.round((m?.a??1)*q.x+(m?.c??0)*q.y+(m?.e??0)),sy=Math.round((m?.b??0)*q.x+(m?.d??1)*q.y+(m?.f??0));if(sx<0||sy<0||sx>=ctx.canvas.width||sy>=ctx.canvas.height)continue;const radius=Math.max(1,Math.min(12,Number(state.colorPickupRadius)||4)),offsets=[[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]];for(const [ox,oy] of offsets){const rx=sx+ox,ry=sy+oy;if(rx<0||ry<0||rx>=ctx.canvas.width||ry>=ctx.canvas.height)continue;const d=ctx.getImageData(rx,ry,1,1).data;if(d[3]>24)samples.push([d[0],d[1],d[2]])}}if(samples.length){const amount=Math.max(0,Math.min(.72,state.colorPickup*.72)),picked=[0,1,2].map(k=>samples.reduce((n,v)=>n+v[k],0)/samples.length),mixed=base.map((v,k)=>Math.round(v*(1-amount)+picked[k]*amount));color='#'+mixed.map(v=>v.toString(16).padStart(2,'0')).join('')}}catch(_){/* Cross-origin/tainted canvases safely fall back to the selected color. */}
 }
 const ribbon=ribbonPolygon(points,state.size);if(!ribbon)return;
 if(ribbon.single){const q=ribbon.points[0],pressure=$('pressureSize')?.checked&&state.lastPointerType==='pen'?pressureResponse(q.p??1):1,rr=Math.max(.12,state.size*pressure/2);ctx.save();ctx.globalAlpha=eraser?(preview?.42:1):state.opacity*state.brushFlow*brushAlphaScale(preset);ctx.globalCompositeOperation=eraser&&!preview?'destination-out':(['marker','highlighter','sumi','pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','watercolor','granulating','chalk','crayon','pastel','charcoal','conte','oilPastel','roundWatercolor','flatWatercolor'].includes(preset)?'multiply':'source-over');ctx.fillStyle=color;ctx.beginPath();ctx.arc(q.x,q.y,rr,0,Math.PI*2);ctx.fill();ctx.restore();return;}
 const all=[...ribbon.left,...ribbon.right];let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const q of all){minX=Math.min(minX,q.x);minY=Math.min(minY,q.y);maxX=Math.max(maxX,q.x);maxY=Math.max(maxY,q.y);}
 const texture=['pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','watercolor','granulating','chalk','crayon','dryBrush','oil','bristleOil','pastel','acrylic','sumi','mechanicalPencil','softPencil','charcoal','conte','oilPastel','roundWatercolor','flatWatercolor','gouache','fude','drySumi','textureBrush','dryGouache','sableRound','flatSable','fanBrush','paletteKnife','stippling','splatter','inkWash','softGraphite','hardGraphite','chalkDust','textureMottler','grainMarker','dryMarker','wetMarker','watercolorBloom','filbertBrush','hakeBrush','mopBrush','rakeBrush','daggerBrush','blenderBrush','fanDryBrush','softCarbon','waxCrayon','graphitePowder','sumiWide'].includes(preset);
 const meanVelocity=ribbon.points.reduce((n,p)=>n+(p.v||0),0)/ribbon.points.length;
 let alpha=state.opacity*state.brushFlow*brushAlphaScale(preset)*(1-meanVelocity*(state.velocityOpacity||0)*.32);alpha*=.62+.38*Math.max(0,Math.min(1,state.pigmentLoad??1));
 const reservoir=Math.max(0,Math.min(1,state.pigmentReservoir??.78)),depletion=Math.max(0,Math.min(1,state.pigmentDepletion??.25));alpha*=Math.max(.38,1-depletion*(1-reservoir)*.72);alpha*=1-(Math.max(0,Math.min(1,state.strokeDrying??.32))*.08);
 const wetMedia=['watercolor','watercolorBloom','granulating','roundWatercolor','flatWatercolor','inkWash','wetMarker'].includes(preset);
 const oilMedia=['oil','bristleOil','acrylic','gouache','dryGouache','oilPastel','paletteKnife'].includes(preset);
 if(wetMedia)alpha*=.70+.30*Math.max(0,Math.min(1,state.wetMix??.42));
 if(oilMedia)alpha*=.82+.18*Math.max(0,Math.min(1,state.colorPickup??.28));
 if(state.pressureOpacity&&state.lastPointerType==='pen'){const avg=ribbon.points.reduce((n,q)=>n+pressureResponse(q.p??1),0)/ribbon.points.length;alpha*=Math.max(.08,Math.pow(avg,.75));}
 const autoComp=(state.paintBlendMode&&state.paintBlendMode!=='auto')?state.paintBlendMode:(['marker','highlighter','sumi','inkWash','pencilHB','pencilB','pencil2B','pencil4B','coloredPencil','watercolor','watercolorBloom','granulating','chalk','chalkDust','crayon','pastel','charcoal','conte','oilPastel','roundWatercolor','flatWatercolor','grainMarker','wetMarker'].includes(preset)?'multiply':'source-over');
 const comp=eraser&&!preview?'destination-out':autoComp;ctx.save();ctx.globalCompositeOperation=comp;ctx.globalAlpha=preview&&eraser?.42:Math.max(0,Math.min(1,alpha));ctx.lineJoin='round';ctx.lineCap='round';
 const g=ctx.createLinearGradient(minX,minY,maxX||minX+1,maxY||minY+1);
 if(preset==='metalGold'){['#432507','#96600c','#f0c95d','#fff5cf','#d89a25','#734406'].forEach((c,i)=>g.addColorStop(i/5,c));ctx.fillStyle=g;}
 else if(preset==='metalSilver'||preset==='chrome'){['#273341','#8190a1','#ffffff','#c7d2dc','#647487','#263340'].forEach((c,i)=>g.addColorStop(i/5,c));ctx.fillStyle=g;}
 else if(preset==='metalCopper'){['#482013','#a34e2d','#ffd0a0','#d77b4f','#6e2d1a'].forEach((c,i)=>g.addColorStop(i/4,c));ctx.fillStyle=g;}
 else {ctx.fillStyle=color;}
 if(eraser)ctx.fillStyle=preview?'#f08b8b':'#fff';
 if(['watercolor','watercolorBloom','roundWatercolor','flatWatercolor','inkWash','airbrush','softAirbrush','pastel','chalk','oil'].includes(preset)){ctx.shadowColor=color;const baseBlur=preset==='airbrush'?.72:preset==='softAirbrush'?.92:(['watercolor','watercolorBloom','roundWatercolor','flatWatercolor','inkWash'].includes(preset))?.08+(state.wetEdge||0)*.12+(state.wetBleed??.24)*.22+(state.strokeWetness??.55)*.08+(state.wetMix??.42)*.045+(state.wetEdgeSpread??.42)*.07-(state.strokeDrying??.32)*.045:preset==='oil'?.025:.055;ctx.shadowBlur=Math.max(.15,state.size*(baseBlur+(state.edgeSoftness||0)*.16));}
 if(['neon','neonPink','neonCyan','neonLime'].includes(preset)){ctx.shadowColor=color;ctx.shadowBlur=Math.max(1,state.size*1.15);}
 buildRibbonPath(ctx,ribbon);ctx.fill();ctx.shadowBlur=0;
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
function buildMobileViewportStrokePreview(layer,points){
 // Bounded to the visible display bitmap rather than the full document bounds.
 // This avoids huge off-screen preview canvases on phones while keeping erasing,
 // opacity, pigment texture and the final stroke on the same raster path.
 if(!isMobileLayout()||!display.width||!display.height)return null;
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
 const last=state.strokePath[state.strokePath.length-1],cacheKey=[state.strokeSessionId,state.strokePathRevision,layer.id,display.width,display.height,state.zoom,state.panX,state.panY,state.size,state.opacity,state.hardness,state.color,state.brushPreset,state.brushTipShape,state.brushAspect,state.brushAngle,state.brushFlow,state.bristleCount,state.bristleSpread,state.bristleStiffness,state.paintThickness,state.pigment,state.pigmentLoad,state.pigmentGranulation,state.edgeRoughness,state.tipRotationJitter,state.stampSpacingFine,state.textureContrast,state.colorPickup,state.wetMix,state.paperTexture,state.paperStrength,state.paperInteraction,state.textureDetail,state.textureScale,state.edgeSoftness,state.velocitySize,state.velocityOpacity,state.pressureOpacity,state.strokeTaper,state.taperStart,state.taperEnd,state.wetEdge,state.paperFiberDirection,state.paperGrainScale,state.paperSurfaceRelief,state.paperTooth,state.paperFiberDensity,state.paperFiberLength,state.paperWarp,state.paperNoise,state.paperTemperature,state.paperBrightness,state.paperPorosity,state.canvasWeave,state.paperBleed,state.paintBlendMode,state.wetBleed,state.edgePooling,state.strokeWetness,state.pressureWidthGain,state.tiltWidthGain,state.nibFollow,state.nibAngleMode,state.strokeWidthNoise,state.strokeWidthWave,state.strokeTaperPower,state.bristleSplay,state.bristleLengthVariation,state.bristleClumping,state.bristleCurl,state.bristleLag,state.bristleWaviness,state.bristleWidthVariation,state.bristleOpacityVariation,state.bristleDensity,state.bristleWetness,state.bristleColorVariation,state.paintDrag,state.pigmentReservoir,state.pigmentDepletion,state.strokeDrying,state.wetEdgeSpread,state.colorPickupRadius,state.edgeBreakup,state.symmetry,state.renderQuality,state.lowMemory,last?.x,last?.y,last?.p].join('|');
 if(cacheKey===state.strokePreviewCacheKey)return state.strokePreviewCacheResult;
 if(state.strokePreviewMode!=='accurate'){state.strokePreviewFallback=true;state.strokePreviewStickyFallback=true;state.strokePreviewCacheKey=cacheKey;state.strokePreviewCacheResult=null;return null;}
 try{
  const previewPoints=strokePreviewSamplePath(state.strokePath);
  // Mobile uses the same document-resolution preview patch as desktop for normal
  // strokes. That makes preview pixels follow the exact same rasterization path as
  // the committed layer. Only strokes whose visible bounds exceed the memory budget
  // use the screen-bounded compositor below.
  const paths=symmetryStrokePaths(previewPoints);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const path of paths)for(const p of path){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)}
  const glowBrush=['neon','neonPink','neonCyan','neonLime','airbrush','softAirbrush','watercolor','oil','pastel','chalk'].includes(state.brushPreset);
  const pad=Math.max(16,state.size*(glowBrush?4.6:3.0));
  const x0=Math.max(0,Math.floor((minX-pad)/TILE_SIZE)*TILE_SIZE),y0=Math.max(0,Math.floor((minY-pad)/TILE_SIZE)*TILE_SIZE);
  const x1=Math.min(state.width,Math.ceil((maxX+pad)/TILE_SIZE)*TILE_SIZE),y1=Math.min(state.height,Math.ceil((maxY+pad)/TILE_SIZE)*TILE_SIZE);
  const w=Math.max(1,x1-x0),h=Math.max(1,y1-y0),area=w*h;
  // Keep the accurate live compositor bounded on very long strokes and small-memory devices.
  const mobileBudget=isMobileLayout()?(Number(navigator.deviceMemory||4)<=3?1050000:1650000):2500000;if(area>mobileBudget||w>4096||h>4096){
  const mobilePreview=buildMobileViewportStrokePreview(layer,previewPoints);
  if(mobilePreview){state.strokePreviewCacheKey=cacheKey;state.strokePreviewCacheResult=mobilePreview;return mobilePreview;}
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
 const widths={maru:.42,millipen:.72,mappingPen:.78,liner:.5,mechanicalPencil:.68,softPencil:.92,saji:1.1,fude:1.48,drySumi:1.38,flatWatercolor:1.65,roundWatercolor:1.52,gouache:1.3,charcoal:1.34,conte:1.2,oilPastel:1.44,textureBrush:1.42,pencilHB:.72,pencilB:.9,pencil2B:1.05,pencil4B:1.25,coloredPencil:.9,watercolor:1.55,acrylic:1.22,glass:.62,marker:1.45,airbrush:1.75,pixel:1,chalk:1.15,crayon:1.1,brushPen:1.25,sumi:1.15,dip:.78,dryBrush:1.4,oil:1.6,pastel:1.35,highlighter:2.1,spray:2.2,neon:.85,metalGold:1.0,metalSilver:1.0,metalCopper:1.0,chrome:1.0,neonPink:.9,neonCyan:.9,neonLime:.9,glitter:1.15,calligraphy:1.2,bristleOil:1.7,granulating:1.45,softAirbrush:2.0};width*=widths[preset]||1;
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
 ctx.save();ctx.globalCompositeOperation=state.tool==='eraser'?'destination-out':composite;ctx.globalAlpha=state.tool==='eraser'?1:Math.max(0,Math.min(1,alpha));ctx.strokeStyle=state.color;ctx.fillStyle=state.color;ctx.lineCap=preset==='pixel'?'butt':preset==='calligraphy'?'square':'round';ctx.lineJoin='round';ctx.lineWidth=width;
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
function layerAction(fn){const before=layerSnapshot();fn();const after=layerSnapshot();pushHistory({type:'layers',before,after});renderLayers();updateUI()}
function updateUndoButtons(){$('undoBtn').disabled=!state.history.length;$('redoBtn').disabled=!state.redo.length}
function updateZoom(){$('zoomText').textContent=Math.round(state.zoom*100)+'%'}
function updateUI(){const l=activeLayer();$('layerCount').textContent=state.layers.length+' layer'+(state.layers.length===1?'':'s');$('layersList').innerHTML='';[...state.layers].reverse().forEach(layer=>{const item=document.createElement('div');item.className='layer'+(layer.id===state.activeId?' active':'');const eye=document.createElement('button');eye.className='eye';eye.textContent=layer.visible?'◉':'○';eye.title='表示/非表示';eye.onclick=e=>{e.stopPropagation();layerAction(()=>{if(e.altKey){const alreadySolo=layer.visible&&state.layers.every(x=>x===layer||!x.visible);state.layers.forEach(x=>x.visible=alreadySolo?true:x===layer)}else layer.visible=!layer.visible})};const thumb=document.createElement('div');thumb.className='thumb';const tc=document.createElement('canvas');tc.width=70;tc.height=54;tc.getContext('2d').drawImage(layer.canvas,0,0,70,54);thumb.appendChild(tc);const name=document.createElement('div');name.className='layername';name.textContent=layer.name;name.title='ダブルクリックで名前変更';name.ondblclick=()=>{const n=prompt('レイヤー名',layer.name);if(n){layerAction(()=>layer.name=n)}};const quick=document.createElement('button');quick.className='eye';quick.textContent='⧉';quick.title='レイヤー複製 · Ctrl+J';quick.onclick=e=>{e.stopPropagation();state.activeId=layer.id;duplicateLayer()};const rename=document.createElement('button');rename.className='eye';rename.textContent='✎';rename.title='レイヤー名を変更';rename.onclick=e=>{e.stopPropagation();const n=prompt('レイヤー名',layer.name);if(n)layerAction(()=>layer.name=n)};item.append(eye,thumb,name,quick,rename);item.onclick=()=>{state.activeId=layer.id;if(state.tool==='transform'||state.tool==='move')state.transformBounds=findAlphaBounds(layer);updateUI();renderLayers()};item.oncontextmenu=e=>{e.preventDefault();state.activeId=layer.id;updateUI();const choice=prompt('レイヤー操作: 1=複製 2=名前変更 3=削除 4=上へ 5=下へ');if(choice==='1')duplicateLayer();else if(choice==='2'){const n=prompt('レイヤー名',layer.name);if(n)layerAction(()=>layer.name=n)}else if(choice==='3')deleteLayer();else if(choice==='4')moveLayer(1);else if(choice==='5')moveLayer(-1)};$('layersList').appendChild(item)});
  if(l){$('layerOpacity').value=Math.round(l.opacity*100);$('layerOpacityValue').textContent=Math.round(l.opacity*100)+'%';$('blendMode').value=l.blend}
  $('docName').textContent=state.projectName+' · '+state.width+' × '+state.height;$('docSizeText').textContent=state.width+' × '+state.height+' px';$('gridToggle').checked=state.grid;stage.style.backgroundImage=state.grid?'radial-gradient(#293342 0.7px,transparent .7px)':'none';$('backgroundMode').value=state.bg;if($('paperTexture'))$('paperTexture').value=state.paperTexture;if($('paperStrength')){$('paperStrength').value=Math.round(state.paperStrength*100);$('paperStrengthValue').textContent=Math.round(state.paperStrength*100)+'%'}if($('paperFiberDirection')){$('paperFiberDirection').value=state.paperFiberDirection||0;$('paperFiberDirectionValue').textContent=(state.paperFiberDirection||0)+'°'}if($('paperGrainScale')){$('paperGrainScale').value=Math.round((state.paperGrainScale||1)*100);$('paperGrainScaleValue').textContent=(state.paperGrainScale||1).toFixed(2)+'×'}if($('paperSurfaceRelief')){$('paperSurfaceRelief').value=Math.round((state.paperSurfaceRelief??.55)*100);$('paperSurfaceReliefValue').textContent=Math.round((state.paperSurfaceRelief??.55)*100)+'%'}if($('touchPalmRejection'))$('touchPalmRejection').checked=state.touchPalmRejection!==false;if($('brushPreset'))$('brushPreset').value=state.brushPreset;if($('traceVisible'))$('traceVisible').checked=!state.reference||state.reference.visible;if($('traceOpacity')&&state.reference){$('traceOpacity').value=Math.round(state.reference.opacity*100);$('traceOpacityValue').textContent=Math.round(state.reference.opacity*100)+'%';$('traceScale').value=Math.round((state.reference.scale||1)*100);$('traceScaleValue').textContent=Math.round((state.reference.scale||1)*100)+'%';$('traceX').value=state.reference.x||0;$('traceXValue').textContent=state.reference.x||0;$('traceY').value=state.reference.y||0;$('traceYValue').textContent=state.reference.y||0}if($('documentDpi'))$('documentDpi').value=state.dpi||300;updateUndoButtons();}
function setColor(v){if(!/^#[0-9a-f]{6}$/i.test(v))return;state.color=v.toLowerCase();$('colorPicker').value=state.color;$('hexColor').value=state.color.toUpperCase()}
function finishActiveBrushStroke(render=true){
 const layer=state.layers.find(x=>x.id===state.strokeLayerId)||activeLayer(),tool=state.strokeTool||state.pointerTool||state.tool;
 if(layer&&['brush','eraser','smudge'].includes(tool)){
  if(state.strokeIsSmooth)commitSmoothStroke(layer);else if(tool!=='smudge')flushBrushCurve();
  if(state.strokeTiles?.size){const entry=getStrokeTileAfter(layer);if(entry.before.length)pushHistory({type:'tiles',layerId:layer.id,before:entry.before,after:entry.after});}
 }
 state.strokeTiles=null;state.strokeLayerId=null;state.strokeTool=null;state.strokeLastSample=null;state.strokePath=[];state.strokeIsSmooth=false;state.strokePreviewBounds=null;state.strokePreviewFallback=false;state.strokePreviewStickyFallback=false;state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;state.pointerDown=false;state.pointerTool=null;state.activePointerId=null;state.activePointerType=null;state.prevPoint=null;state.strokeCurvePrev=null;state.strokeCurveMid=null;state.filteredPoint=null;state.startPoint=null;state.lastPoint=null;
 if(render){renderLayers();ensureInitialFrame();markDirty();flushPendingDisplayResize();}
}
function setTool(tool){if(state.pointerDown){if(['brush','eraser','smudge'].includes(state.strokeTool||state.pointerTool||state.tool))finishActiveBrushStroke();else stagePointerUp({});}state.tool=tool;document.querySelectorAll('.tool[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));setStatus((({brush:'ブラシ',eraser:'消しゴム',smudge:'指先・混色',line:'直線',rect:'四角形',ellipse:'楕円',triangle:'三角形',star:'星形',roundedRect:'角丸長方形',arrow:'矢印',polygon:'多角形',curve:'ベジェ曲線',fill:'塗りつぶし',eyedropper:'スポイト',hand:'手のひら',text:'テキスト配置',gradient:'グラデーション',move:'レイヤー移動',transform:'オブジェクト変形'})[tool]||'ツール')+' ツール');if(tool==='transform'||tool==='move'){state.transformBounds=findAlphaBounds(activeLayer());drawTransformOverlay(octx)}}
function mergeComposite(){const c=makeCanvas(),ctx=c.getContext('2d');drawDocumentBase(ctx,true);for(const l of state.layers){if(!l.visible)continue;ctx.save();ctx.globalAlpha=l.opacity;ctx.globalCompositeOperation=l.blend;ctx.drawImage(l.canvas,0,0);ctx.restore()}return c}
function pickColor(p){const c=mergeComposite(),x=Math.max(0,Math.min(state.width-1,Math.floor(p.x))),y=Math.max(0,Math.min(state.height-1,Math.floor(p.y))),d=c.getContext('2d').getImageData(x,y,1,1).data;setColor('#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join(''));}
function hexToRgba(hex){return[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255]}
function drawSmudgeSegment(a,b,pressure=1){
 const layer=activeLayer();if(!layer)return;rememberStrokeTiles(a,b);const ctx=layer.canvas.getContext('2d');
 const radius=Math.max(2,state.size*.5),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<.35)return;
 const steps=Math.max(1,Math.min(16,Math.ceil(len/Math.max(2,radius*.45)))),strength=Math.max(.02,Math.min(.95,state.smudgeStrength*(state.lastPointerType==='pen'?Math.max(.1,pressure):1)));
 for(let s=1;s<=steps;s++){
  const t=s/steps,cx=a.x+dx*t,cy=a.y+dy*t,rx=Math.ceil(radius+Math.abs(dx/len)*radius),ry=Math.ceil(radius+Math.abs(dy/len)*radius),x=Math.max(0,Math.floor(cx-rx)),y=Math.max(0,Math.floor(cy-ry)),w=Math.min(state.width-x,Math.ceil(2*rx)),h=Math.min(state.height-y,Math.ceil(2*ry));if(w<1||h<1)continue;
  const image=ctx.getImageData(x,y,w,h),src=new Uint8ClampedArray(image.data),shiftX=-(dx/len)*radius*.65,shiftY=-(dy/len)*radius*.65;
  for(let py=0;py<h;py++)for(let px=0;px<w;px++){const gx=x+px,gy=y+py,ox=gx-cx,oy=gy-cy,d=Math.hypot(ox,oy);if(d>radius)continue;const sx=Math.max(0,Math.min(w-1,Math.round(px+shiftX))),sy=Math.max(0,Math.min(h-1,Math.round(py+shiftY))),i=(py*w+px)*4,j=(sy*w+sx)*4,mix=strength*(1-d/radius)*.82;for(let c=0;c<4;c++)image.data[i+c]=src[i+c]*(1-mix)+src[j+c]*mix;}
  ctx.putImageData(image,x,y);
 }
}
function floodFill(p){const l=activeLayer();if(!l)return;const x=Math.floor(p.x),y=Math.floor(p.y);if(x<0||y<0||x>=state.width||y>=state.height)return;const ctx=l.canvas.getContext('2d'),img=ctx.getImageData(0,0,state.width,state.height),d=img.data,idx=(y*state.width+x)*4,target=[d[idx],d[idx+1],d[idx+2],d[idx+3]],fill=hexToRgba(state.color);if(target.every((v,i)=>v===fill[i]))return;const tol=state.fillTolerance,match=i=>Math.abs(d[i]-target[0])<=tol&&Math.abs(d[i+1]-target[1])<=tol&&Math.abs(d[i+2]-target[2])<=tol&&Math.abs(d[i+3]-target[3])<=tol;const stack=[x,y];let count=0;while(stack.length&&count<state.width*state.height){const sy=stack.pop(),sx=stack.pop();if(sx<0||sy<0||sx>=state.width||sy>=state.height)continue;let pos=(sy*state.width+sx)*4;if(!match(pos))continue;let left=sx;while(left>0&&match((sy*state.width+left-1)*4))left--;let spanUp=false,spanDown=false;for(let xx=left;xx<state.width&&match((sy*state.width+xx)*4);xx++){pos=(sy*state.width+xx)*4;d[pos]=fill[0];d[pos+1]=fill[1];d[pos+2]=fill[2];d[pos+3]=Math.round(255*state.opacity);count++;if(sy>0){const up=(sy-1)*state.width+xx;if(match(up*4)){if(!spanUp){stack.push(xx,sy-1);spanUp=true}}else spanUp=false}if(sy<state.height-1){const dn=(sy+1)*state.width+xx;if(match(dn*4)){if(!spanDown){stack.push(xx,sy+1);spanDown=true}}else spanDown=false}}}
  ctx.putImageData(img,0,0);renderLayers();setStatus('塗りつぶし: '+count.toLocaleString()+' px')}
function captureStagePointer(e){try{if(e?.pointerId!==undefined&&!display.hasPointerCapture?.(e.pointerId))display.setPointerCapture(e.pointerId)}catch(_){}}
function releaseStagePointer(e){try{if(e?.pointerId!==undefined&&display.hasPointerCapture?.(e.pointerId))display.releasePointerCapture(e.pointerId)}catch(_){}}
function stagePointerDown(e){
 if(state.operationLocked||state.animationPlaying)return;
 const type=e.pointerType||'mouse';
 if(type==='mouse'&&performance.now()<state.suppressMouseUntil)return;
 if((type==='touch'||type==='pen')&&e.cancelable)e.preventDefault();
 // A stylus takes priority over palm/finger contacts. Touch may still be used alone.
 if(type==='touch'&&state.touchPalmRejection){if(state.pointerDown&&state.activePointerType==='pen')return;if(state.lastPenClientPoint&&performance.now()-state.lastPenAt<650&&Math.hypot(e.clientX-state.lastPenClientPoint.x,e.clientY-state.lastPenClientPoint.y)<(state.palmRejectionRadius||24))return;}
 if(type==='pen'&&state.pointerDown&&state.activePointerType==='touch'){
  const near=state.touchPalmRejection&&state.touchStartClientPoint&&Math.hypot(e.clientX-state.touchStartClientPoint.x,e.clientY-state.touchStartClientPoint.y)<(state.palmRejectionRadius||24);
  if(near&&state.strokeIsSmooth){state.pointerDown=false;state.strokePath=[];state.strokeTiles=null;state.strokeLayerId=null;state.strokeTool=null;state.strokeIsSmooth=false;state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;state.strokePreviewStickyFallback=false;state.activePointerId=null;state.activePointerType=null;renderLayers();}else finishActiveBrushStroke();state.gesturePointers.clear();state.gesturePinch=null;
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
  if(state.touchDrawMode==='stylus'){state.activePointerId=null;state.activePointerType=null;return;}
  if(state.touchDrawMode==='pan'&&state.gesturePointers.size===1){state.panning=true;state.panStart={x:e.clientX,y:e.clientY,px:state.panX,py:state.panY};state.activePointerId=e.pointerId;state.activePointerType='touch';return;}
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
  const initialPressure=type==='pen'?normalizePenPressure(e.pressure):1;state.strokePrevPressure=initialPressure;state.strokeLastSample=p;state.strokeLastTime=performance.now();state.strokeIsSmooth=useSmoothStroke()&&state.tool!=='smudge';
  state.strokePath=state.strokeIsSmooth?[{x:p.x,y:p.y,p:initialPressure,tiltX:e.tiltX||0,tiltY:e.tiltY||0,time:performance.now()}]:[];
  if(state.strokeIsSmooth){rememberStrokeTiles(p,p);requestRender()}else if(state.tool==='smudge'){rememberStrokeTiles(p,p)}else{drawBrushSegment(p,p,e.pressure||1,e.tiltX||0,e.tiltY||0);requestRender()}
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
  if(layer&&state.strokeIsSmooth)commitSmoothStroke(layer);else if(tool!=='smudge')flushBrushCurve();
  if(layer&&state.strokeTiles?.size){const entry=getStrokeTileAfter(layer);if(entry.before.length)pushHistory({type:'tiles',layerId:layer.id,before:entry.before,after:entry.after});if(state.strokeTileLimitHit)toast('長いストロークのUndo範囲をメモリ制限に合わせました');}
  state.strokeTiles=null;state.strokeLayerId=null;state.strokeTool=null;state.strokeLastSample=null;state.strokePath=[];state.strokeIsSmooth=false;state.strokePreviewBounds=null;state.strokePreviewFallback=false;state.strokePreviewStickyFallback=false;state.strokePreviewCacheKey=null;state.strokePreviewCacheResult=null;
 }
 if(state.transforming&&layer&&state.transformBefore){const after=captureLayerImage(layer);pushHistory({type:'pixels',layerId:layer.id,before:state.transformBefore,after});state.transforming=false;state.transformMode=null;state.transformBefore=null;state.transformSource=null;state.pointerDown=false;state.pointerTool=null;state.activePointerId=null;state.activePointerType=null;state.transformBounds=findAlphaBounds(layer);releaseStagePointer(e);renderLayers();markDirty();setStatus('オブジェクトの変形を適用しました');flushPendingDisplayResize();return;}
 if(tool==='move'&&layer&&state.moveBefore){const before=state.moveBefore,after=captureLayerImage(layer),dx=(state.lastPoint?.x??state.startPoint.x)-state.startPoint.x,dy=(state.lastPoint?.y??state.startPoint.y)-state.startPoint.y;if(layer.textData){layer.textData.x+=dx;layer.textData.y+=dy}pushHistory({type:'pixels',layerId:layer.id,before,after});state.moveBefore=null;state.moveSnapshot=null;state.pointerDown=false;state.pointerTool=null;state.activePointerId=null;state.activePointerType=null;state.startPoint=null;state.lastPoint=null;releaseStagePointer(e);renderLayers();markDirty();setStatus('レイヤーを移動しました');flushPendingDisplayResize();return;}
 if(tool==='gradient'&&layer){const a=state.startPoint,b=state.lastPoint||a,ctx=layer.canvas.getContext('2d');let grad;if(state.gradientType==='radial')grad=ctx.createRadialGradient(a.x,a.y,0,b.x,b.y,Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)));else grad=ctx.createLinearGradient(a.x,a.y,b.x,b.y);grad.addColorStop(0,state.color);grad.addColorStop(1,state.gradientColor);ctx.save();ctx.globalAlpha=state.opacity;ctx.fillStyle=grad;ctx.fillRect(0,0,state.width,state.height);ctx.restore();const after=captureLayerImage(layer);if(state.strokeBefore)pushHistory({type:'pixels',layerId:layer.id,before:state.strokeBefore,after});state.strokeBefore=null;}
 if(isShapeTool(tool)&&layer){const ctx=layer.canvas.getContext('2d'),a=state.startPoint,b=state.lastPoint||a;ctx.save();ctx.strokeStyle=state.color;ctx.fillStyle=state.color;ctx.globalAlpha=state.opacity*state.brushFlow;ctx.lineWidth=state.size;ctx.lineCap='round';ctx.lineJoin='round';const starts=symmetryPoints(a),ends=symmetryPoints(b);for(let k=0;k<starts.length;k++)drawShapePath(ctx,tool,starts[k],ends[k],$('shapeFill').checked);ctx.restore();const after=captureLayerImage(layer);if(state.strokeBefore)pushHistory({type:'pixels',layerId:layer.id,before:state.strokeBefore,after});state.strokeBefore=null;}
 state.pointerDown=false;state.pointerTool=null;state.activePointerId=null;state.activePointerType=null;state.prevPoint=null;state.strokeCurvePrev=null;state.strokeCurveMid=null;state.startPoint=null;state.filteredPoint=null;state.lastPoint=null;state.strokeBefore=null;
 releaseStagePointer(e);renderLayers();ensureInitialFrame();markDirty();flushPendingDisplayResize();
}
function zoomAt(factor,x,y){const old=state.zoom,next=Math.min(8,Math.max(.05,old*factor));const wx=(x-state.panX)/old,wy=(y-state.panY)/old;state.zoom=next;state.panX=x-wx*next;state.panY=y-wy*next;updateZoom();renderLayers()}
function fitView(){setViewCenter();renderLayers()}
const PROJECT_STATE_KEYS=[
 'tool','color','size','opacity','hardness','stabilizer','symmetry','zoom','panX','panY','grid',
 'waterSpread','edgeDarkening','fillTolerance','gradientColor','gradientType','dpi','exportScale','exportQuality','exportMatte',
 'smudgeStrength','fillContiguous','fillMerged','fillOpacity','fillFeather','waterAbsorption','waterDiffusion','waterGranulation','waterDrying','waterPreset',
 'lowMemory','renderQuality','strokeSmoothing','strokeTaper','paperInteraction','textureDetail','pressureProfile','velocitySize','velocityOpacity',
 'taperStart','taperEnd','wetEdge','textureScale','edgeSoftness','nibTiltSensitivity','strokeCorrection','feelFriction','feelSmoothing',
 'pressureCurve','tiltEnabled','brushFlow','brushJitter','brushAngle','pressureOpacity','curveBend','polygonSides','brushPreset','waterAmount',
 'pigment','paperTexture','paperStrength','onionSkin','brushProfileAuto','strokeStability','strokePressureSmoothing','pressureFloor','pressureCeiling','strokeSampleDensity','strokeResampleQuality','strokePreviewMode','paperFiberDirection','paperGrainScale','paperSurfaceRelief','touchPalmRejection','mobilePreviewFps','touchDrawMode','touchSmoothing','touchMinDistance','palmRejectionRadius','leftHandedUI','mobileToolbarScale','mobileDockOpacity','mobileCompactUI','showPressureHUD','tapDotMode','brushTipShape','paintBlendMode','brushAspect','bristleCount','bristleSpread','bristleStiffness','paintThickness','pigmentLoad','pigmentGranulation','edgeRoughness','tipRotationJitter','stampSpacingFine','textureContrast','colorPickup','wetMix','wetBleed','edgePooling','strokeWetness','paperTooth','paperFiberDensity','paperFiberLength','paperWarp','paperNoise','paperTemperature','paperBrightness','paperPorosity','canvasWeave','paperBleed','pressureWidthGain','tiltWidthGain','nibFollow','nibAngleMode','strokeWidthNoise','strokeWidthWave','strokeTaperPower','bristleSplay','bristleLengthVariation','bristleClumping','bristleCurl','bristleLag','bristleWaviness','bristleWidthVariation','bristleOpacityVariation','bristleDensity','bristleWetness','bristleColorVariation','paintDrag','pigmentReservoir','pigmentDepletion','strokeDrying','wetEdgeSpread','colorPickupRadius','edgeBreakup'
];
const BRUSH_PROFILE_STATE_KEYS=[
 'size','opacity','hardness','stabilizer','brushFlow','brushJitter','brushAngle','pressureOpacity','curveBend','strokeSmoothing','strokeTaper',
 'paperInteraction','textureDetail','pressureProfile','velocitySize','velocityOpacity','taperStart','taperEnd','wetEdge','textureScale','edgeSoftness',
 'nibTiltSensitivity','strokeCorrection','feelFriction','feelSmoothing','pressureCurve','tiltEnabled','strokeStability','strokePressureSmoothing','pressureFloor','pressureCeiling','strokeSampleDensity','strokeResampleQuality','strokePreviewMode','waterAmount','pigment','waterSpread',
 'edgeDarkening','waterPreset','waterAbsorption','waterDiffusion','waterGranulation','waterDrying','smudgeStrength','paperFiberDirection','paperGrainScale','paperSurfaceRelief','brushTipShape','paintBlendMode','brushAspect','bristleCount','bristleSpread','bristleStiffness','paintThickness','pigmentLoad','pigmentGranulation','edgeRoughness','tipRotationJitter','stampSpacingFine','textureContrast','colorPickup','wetMix','wetBleed','edgePooling','strokeWetness','paperTooth','paperFiberDensity','paperFiberLength','paperWarp','paperNoise','paperTemperature','paperBrightness','paperPorosity','canvasWeave','paperBleed','pressureWidthGain','tiltWidthGain','nibFollow','nibAngleMode','strokeWidthNoise','strokeWidthWave','strokeTaperPower','bristleSplay','bristleLengthVariation','bristleClumping','bristleCurl','bristleLag','bristleWaviness','bristleWidthVariation','bristleOpacityVariation','bristleDensity','bristleWetness','bristleColorVariation','paintDrag','pigmentReservoir','pigmentDepletion','strokeDrying','wetEdgeSpread','colorPickupRadius','edgeBreakup'
];
const PROJECT_CONTROL_IDS=['sizeRange','sizeNumber','opacityRange','hardness','stabilizerRange','spacing','pressureSize','shapeFill','gradientColor','gradientType',
 'fillTolerance','fillContiguous','fillMerged','fillOpacity','fillFeather','smudgeStrength','brushPreset','brushFlow','brushJitter','brushAngle','pressureOpacity',
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
function captureUIState(){return{rightbarCollapsed:!!$('rightbar')?.classList.contains('collapsed'),tabletMode:document.body.classList.contains('tablet-mode'),panels:[...document.querySelectorAll('#rightbar .panel')].map((p,i)=>({id:p.id||'',index:i,folded:p.classList.contains('folded')}))};}
function restoreUIState(ui){if(!ui)return;if($('rightbar'))$('rightbar').classList.toggle('collapsed',!!ui.rightbarCollapsed);document.body.classList.toggle('tablet-mode',!!ui.tabletMode);for(const item of ui.panels||[]){const p=item.id?$(item.id):document.querySelectorAll('#rightbar .panel')[item.index];if(p)p.classList.toggle('folded',!!item.folded);}}
function captureProjectMetadata(){
 normalizeAdvancedStrokeSettings();
 if($('brushProfileAuto')?.checked)saveBrushProfileFor(state.brushPreset,{silent:true});
 return{appVersion:'17.0.0',settingsSchema:7,editorState:captureEditorState(),formState:captureFormState(),activeLayerId:state.activeId,
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
 const defaults={strokeStability:.18,strokePressureSmoothing:.62,pressureFloor:.02,pressureCeiling:1,strokeSampleDensity:1,strokeResampleQuality:.8,strokePreviewMode:'accurate',paperFiberDirection:0,paperGrainScale:1,paperSurfaceRelief:.55,touchPalmRejection:true,mobilePreviewFps:45,touchDrawMode:'draw',touchSmoothing:.45,touchMinDistance:.20,palmRejectionRadius:24,leftHandedUI:false,mobileToolbarScale:1,mobileDockOpacity:.92,mobileCompactUI:true,showPressureHUD:true,tapDotMode:true,brushTipShape:'round',paintBlendMode:'auto',brushAspect:1,bristleCount:9,bristleSpread:.45,bristleStiffness:.60,paintThickness:.45,pigmentLoad:1,pigmentGranulation:.35,edgeRoughness:.20,tipRotationJitter:0,stampSpacingFine:.5,textureContrast:.55,colorPickup:.28,wetMix:.42,wetBleed:.24,edgePooling:.28,strokeWetness:.55,paperTooth:.50,paperFiberDensity:.50,paperFiberLength:.55,paperWarp:.28,paperNoise:.24,paperTemperature:8,paperBrightness:1,paperPorosity:.50,canvasWeave:.55,paperBleed:.10,pressureWidthGain:1,tiltWidthGain:.42,nibFollow:.65,nibAngleMode:'follow',strokeWidthNoise:.035,strokeWidthWave:.08,strokeTaperPower:1.35,bristleSplay:.55,bristleLengthVariation:.28,bristleClumping:.30,bristleCurl:.24,bristleLag:.22,bristleWaviness:.12,bristleWidthVariation:.24,bristleOpacityVariation:.22,bristleDensity:1,bristleWetness:.58,bristleColorVariation:.18,paintDrag:.32,pigmentReservoir:.78,pigmentDepletion:.25,strokeDrying:.32,wetEdgeSpread:.42,colorPickupRadius:4,edgeBreakup:.18};
 const editor=data.editorState&&typeof data.editorState==='object'?data.editorState:{};
 const forms=data.formState&&typeof data.formState==='object'?data.formState:{};
 for(const [key,value] of Object.entries(defaults))if(!(key in editor)&&!(key in forms))state[key]=value;
 // v3/v4/v5 files remain supported. New metadata wins only when it exists.
 if(data.brushProfiles&&typeof data.brushProfiles==='object'){state.brushProfiles=structuredCloneSafe(data.brushProfiles);try{localStorage.setItem('pf-brush-profiles',JSON.stringify(state.brushProfiles))}catch(_){}}
 if(Array.isArray(data.brushFavorites)){try{localStorage.setItem('pf-brush-favorites',JSON.stringify(data.brushFavorites))}catch(_){}}
 if(data.formState)restoreFormState(data.formState,{dispatch:true});
 if(data.editorState&&typeof data.editorState==='object'){for(const [k,v] of Object.entries(data.editorState)){if(PROJECT_STATE_KEYS.includes(k)&&(v===null||['string','number','boolean'].includes(typeof v)))state[k]=v;}}
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
function projectData(){saveCurrentFrame(false);return{format:'PIXEL_FORGE_PROJECT',version:5,name:state.projectName,width:state.width,height:state.height,dpi:state.dpi||300,brushSettings:captureLegacyBrushSettings(),
 bg:state.bg,paperTexture:state.paperTexture,paperStrength:state.paperStrength,brushPreset:state.brushPreset,waterAmount:state.waterAmount,waterSpread:state.waterSpread,
 edgeDarkening:state.edgeDarkening,pigment:state.pigment,fillTolerance:state.fillTolerance,fillContiguous:state.fillContiguous,fillMerged:state.fillMerged,
 fillOpacity:state.fillOpacity,fillFeather:state.fillFeather,waterPreset:state.waterPreset,waterAbsorption:state.waterAbsorption,waterDiffusion:state.waterDiffusion,
 waterGranulation:state.waterGranulation,waterDrying:state.waterDrying,smudgeStrength:state.smudgeStrength,
 reference:state.reference?.data?{data:state.reference.data,opacity:state.reference.opacity,visible:state.reference.visible,scale:state.reference.scale||1,x:state.reference.x||0,y:state.reference.y||0}:null,
 layers:state.layers.map(l=>({id:l.id,name:l.name,visible:l.visible,opacity:l.opacity,blend:l.blend,textData:l.textData||null,data:l.canvas.toDataURL('image/png')})),
 animationFrames:state.animationFrames,frameIndex:state.frameIndex,...captureProjectMetadata()};}
function downloadBlob(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
async function nativeCall(){return null} // Browser-first: never touch WebView2 COM APIs.
async function projectDataAsync(){
 saveCurrentFrame(false);const layers=[];
 for(let i=0;i<state.layers.length;i++){const l=state.layers[i];layers.push({id:l.id,name:l.name,visible:l.visible,opacity:l.opacity,blend:l.blend,textData:l.textData||null,data:l.canvas.toDataURL('image/png')});updateProgress(8+Math.round((i+1)/state.layers.length*72),`保存データを準備 ${i+1}/${state.layers.length}`);await nextFrameUI();}
 return{format:'PIXEL_FORGE_PROJECT',version:5,name:state.projectName,width:state.width,height:state.height,dpi:state.dpi||300,brushSettings:captureLegacyBrushSettings(),
 bg:state.bg,paperTexture:state.paperTexture,paperStrength:state.paperStrength,brushPreset:state.brushPreset,waterAmount:state.waterAmount,waterSpread:state.waterSpread,
 edgeDarkening:state.edgeDarkening,pigment:state.pigment,fillTolerance:state.fillTolerance,fillContiguous:state.fillContiguous,fillMerged:state.fillMerged,
 fillOpacity:state.fillOpacity,fillFeather:state.fillFeather,waterPreset:state.waterPreset,waterAbsorption:state.waterAbsorption,waterDiffusion:state.waterDiffusion,
 waterGranulation:state.waterGranulation,waterDrying:state.waterDrying,smudgeStrength:state.smudgeStrength,
 reference:state.reference?.data?{data:state.reference.data,opacity:state.reference.opacity,visible:state.reference.visible,scale:state.reference.scale||1,x:state.reference.x||0,y:state.reference.y||0}:null,
 layers,animationFrames:state.animationFrames,frameIndex:state.frameIndex,...captureProjectMetadata()};
}
async function saveProject(){stopAnimationPlayback({save:false,quiet:true});saveCurrentFrame(false);showProgress('プロジェクトを保存中','レイヤー画像を順番にパックしています',2);await nextFrameUI();try{const obj=await projectDataAsync(),text=JSON.stringify(obj);updateProgress(90,'プロジェクトファイルを作成しています');await nextFrameUI();downloadBlob(new Blob([text],{type:'application/json'}),(state.projectName||'untitled')+'.pforge');state.dirty=false;$('autosaveStatus').textContent='保存済み';updateProgress(100,'保存しました');await nextFrameUI();hideProgress();}catch(err){hideProgress();toast('保存できませんでした: '+err.message)}}
async function openProjectFile(file){try{const text=await file.text();await loadProjectText(text)}catch(e){toast('プロジェクトを開けません: '+e.message)}}
async function loadProjectText(text){stopAnimationPlayback({save:false,quiet:true});state.frameLoadToken++;const data=JSON.parse(text);if(data.format!=='PIXEL_FORGE_PROJECT'||!Array.isArray(data.layers))throw new Error('PIXEL FORGE形式ではありません');if(data.width<1||data.height<1||data.width>12000||data.height>12000||data.width*data.height>20000000)throw new Error('キャンバスサイズが範囲外です（最大2000万px）');state.width=data.width;state.height=data.height;state.dpi=Number(data.dpi)||300;updateHistoryLimit();state.bg=data.bg||'white';const bs=data.brushSettings||{};state.brushFlow=Number.isFinite(bs.brushFlow)?bs.brushFlow:1;state.brushJitter=Number.isFinite(bs.brushJitter)?bs.brushJitter:0;state.brushAngle=Number.isFinite(bs.brushAngle)?bs.brushAngle:0;state.pressureOpacity=!!bs.pressureOpacity;state.pressureProfile=bs.pressureProfile||'natural';state.velocitySize=Number.isFinite(bs.velocitySize)?bs.velocitySize:.12;state.velocityOpacity=Number.isFinite(bs.velocityOpacity)?bs.velocityOpacity:.06;state.taperStart=Number.isFinite(bs.taperStart)?bs.taperStart:.055;state.taperEnd=Number.isFinite(bs.taperEnd)?bs.taperEnd:.085;state.wetEdge=Number.isFinite(bs.wetEdge)?bs.wetEdge:.16;state.textureScale=Number.isFinite(bs.textureScale)?bs.textureScale:1;state.edgeSoftness=Number.isFinite(bs.edgeSoftness)?bs.edgeSoftness:.06;state.nibTiltSensitivity=Number.isFinite(bs.nibTiltSensitivity)?bs.nibTiltSensitivity:.55;state.strokeCorrection=bs.strokeCorrection||'balanced';state.curveBend=Number.isFinite(bs.curveBend)?bs.curveBend:.35;state.polygonSides=Number.isFinite(bs.polygonSides)?bs.polygonSides:6;state.strokeSmoothing=Number.isFinite(bs.strokeSmoothing)?bs.strokeSmoothing:.42;state.strokeTaper=Number.isFinite(bs.strokeTaper)?Math.max(0,Math.min(.8,bs.strokeTaper)):.14;state.paperInteraction=Number.isFinite(bs.paperInteraction)?bs.paperInteraction:.78;state.textureDetail=Number.isFinite(bs.textureDetail)?bs.textureDetail:.62;state.renderQuality=bs.renderQuality||'balanced';state.paperTexture=data.paperTexture||'none';state.paperStrength=Number.isFinite(data.paperStrength)?data.paperStrength:.35;state.brushPreset=data.brushPreset||'gpen';state.waterAmount=Number.isFinite(data.waterAmount)?data.waterAmount:.55;state.waterSpread=Number.isFinite(data.waterSpread)?data.waterSpread:.45;state.edgeDarkening=Number.isFinite(data.edgeDarkening)?data.edgeDarkening:.30;state.fillTolerance=Number.isFinite(data.fillTolerance)?data.fillTolerance:24;state.fillContiguous=data.fillContiguous!==false;state.fillMerged=!!data.fillMerged;state.fillOpacity=Number.isFinite(data.fillOpacity)?data.fillOpacity:1;state.fillFeather=Number.isFinite(data.fillFeather)?Math.max(0,Math.min(8,data.fillFeather)):0;state.waterPreset=data.waterPreset||'wet';state.waterAbsorption=Number.isFinite(data.waterAbsorption)?data.waterAbsorption:.48;state.waterDiffusion=Number.isFinite(data.waterDiffusion)?data.waterDiffusion:.56;state.waterGranulation=Number.isFinite(data.waterGranulation)?data.waterGranulation:.24;state.waterDrying=Number.isFinite(data.waterDrying)?data.waterDrying:.38;state.smudgeStrength=Number.isFinite(data.smudgeStrength)?data.smudgeStrength:.58;state.pigment=Number.isFinite(data.pigment)?data.pigment:.35;state.projectName=data.name||'Imported';state.reference=null;if(data.reference?.data)await setReferenceData(data.reference.data,data.reference.opacity??.3,data.reference.visible!==false,data.reference.scale??1,data.reference.x??0,data.reference.y??0);state.layers=[];for(const item of data.layers){const l=newLayer(item.name||'Layer');l.id=Number(item.id)||nextLayerId++;l.visible=item.visible!==false;l.opacity=Number.isFinite(item.opacity)?item.opacity:1;l.blend=item.blend||'source-over';l.textData=item.textData||null;if(item.data){await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{l.canvas.getContext('2d').drawImage(img,0,0,state.width,state.height);resolve()};img.onerror=reject;img.src=item.data})}state.layers.push(l)}if(!state.layers.length)state.layers=[newLayer('Layer 1')];state.activeId=state.layers[state.layers.length-1].id;nextLayerId=Math.max(nextLayerId,...state.layers.map(l=>Number(l.id)||0).map(n=>n+1));if(data.activeLayerId!==undefined&&state.layers.some(l=>l.id===Number(data.activeLayerId)))state.activeId=Number(data.activeLayerId);state.animationFrames=Array.isArray(data.animationFrames)?data.animationFrames:[];state.frameIndex=Math.max(0,Math.min(state.animationFrames.length-1,Number(data.frameIndex)||0));if(!state.animationFrames.length)ensureInitialFrame();else{const frameToken=++state.frameLoadToken;await loadFrameData(state.animationFrames[state.frameIndex],{token:frameToken,render:false,update:false,refreshGhost:false});}state.history=[];state.redo=[];state.dirty=false;resizeDisplay();fitView();updateUI();renderTimeline();renderLayers();$('autosaveStatus').textContent='保存済み';$('renderQuality').value=state.renderQuality;$('strokeSmoothing').value=Math.round(state.strokeSmoothing*100);$('strokeSmoothingValue').textContent=$('strokeSmoothing').value+'%';$('strokeTaper').value=Math.round(state.strokeTaper*100);$('strokeTaperValue').textContent=$('strokeTaper').value+'%';$('paperInteraction').value=Math.round(state.paperInteraction*100);$('paperInteractionValue').textContent=$('paperInteraction').value+'%';$('textureDetail').value=Math.round(state.textureDetail*100);$('textureDetailValue').textContent=$('textureDetail').value+'%';$('documentDpi').value=state.dpi;if($('paperFiberDirection'))$('paperFiberDirection').value=state.paperFiberDirection||0;if($('paperGrainScale'))$('paperGrainScale').value=Math.round((state.paperGrainScale||1)*100);if($('paperSurfaceRelief'))$('paperSurfaceRelief').value=Math.round((state.paperSurfaceRelief??.55)*100);if($('touchPalmRejection'))$('touchPalmRejection').checked=state.touchPalmRejection!==false;$('brushFlow').value=Math.round(state.brushFlow*100);$('brushFlowValue').textContent=$('brushFlow').value+'%';$('brushJitter').value=Math.round(state.brushJitter*100);$('brushJitterValue').textContent=$('brushJitter').value+'%';$('brushAngle').value=state.brushAngle;$('brushAngleValue').textContent=state.brushAngle+'°';$('pressureOpacity').checked=state.pressureOpacity;$('curveBend').value=Math.round(state.curveBend*100);$('strokeSmoothing').value=Math.round(state.strokeSmoothing*100);$('strokeSmoothingValue').textContent=$('strokeSmoothing').value+'%';$('strokeTaper').value=Math.round(state.strokeTaper*100);$('strokeTaperValue').textContent=$('strokeTaper').value+'%';$('paperInteraction').value=Math.round(state.paperInteraction*100);$('paperInteractionValue').textContent=$('paperInteraction').value+'%';$('textureDetail').value=Math.round(state.textureDetail*100);$('textureDetailValue').textContent=$('textureDetail').value+'%';$('renderQuality').value=state.renderQuality;$('curveBendValue').textContent=$('curveBend').value+'%';$('polygonSides').value=state.polygonSides;$('polygonSidesValue').textContent=state.polygonSides+'辺';$('paperTexture').value=state.paperTexture;$('paperStrength').value=Math.round(state.paperStrength*100);$('brushPreset').value=state.brushPreset;$('waterAmount').value=Math.round(state.waterAmount*100);$('waterSpread').value=Math.round(state.waterSpread*100);$('waterSpreadValue').textContent=Math.round(state.waterSpread*100)+'%';$('edgeDarkening').value=Math.round(state.edgeDarkening*100);$('edgeDarkeningValue').textContent=Math.round(state.edgeDarkening*100)+'%';$('pigment').value=Math.round(state.pigment*100);$('fillTolerance').value=state.fillTolerance;$('fillToleranceValue').textContent=state.fillTolerance;$('fillContiguous').checked=state.fillContiguous;$('fillMerged').checked=state.fillMerged;$('fillOpacity').value=Math.round(state.fillOpacity*100);$('fillOpacityValue').textContent=$('fillOpacity').value+'%';$('fillFeather').value=state.fillFeather;$('fillFeatherValue').textContent=state.fillFeather+' px';$('waterPreset').value=state.waterPreset;$('waterAbsorption').value=Math.round(state.waterAbsorption*100);$('waterAbsorptionValue').textContent=$('waterAbsorption').value+'%';$('waterDiffusion').value=Math.round(state.waterDiffusion*100);$('waterDiffusionValue').textContent=$('waterDiffusion').value+'%';$('waterGranulation').value=Math.round(state.waterGranulation*100);$('waterGranulationValue').textContent=$('waterGranulation').value+'%';$('waterDrying').value=Math.round(state.waterDrying*100);$('waterDryingValue').textContent=$('waterDrying').value+'%';$('smudgeStrength').value=Math.round(state.smudgeStrength*100);$('smudgeStrengthValue').textContent=$('smudgeStrength').value+'%';syncBrushLabUI?.();renderTimeline();applyProjectMetadata(data);await refreshOnionGhost();renderTimeline();renderLayers();toast('プロジェクトを読み込みました（全設定・画材プロファイルを復元）')}
async function openProject(){const result=await nativeCall('open_project');if(typeof result==='string'){await loadProjectText(result);return}if(result===false)return;$('projectInput').click()}
async function exportImage(type){
 const scale=Math.max(1,Math.min(8,Number($('exportScale').value)||1)),w=state.width*scale,h=state.height*scale;
 if(w>32768||h>32768||w*h>100000000){toast('書き出し上限を超えています。倍率を下げてください（最大1億px・辺32768px）');return}
 showProgress('高画質で書き出し中','レイヤーを合成しています',8);await nextFrameUI();const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(!ctx){hideProgress();toast('出力キャンバスを確保できません');return}ctx.scale(scale,scale);
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
function scheduleAutosave(){clearTimeout(autosaveTimer);autosaveTimer=setTimeout(async()=>{if(state.pointerDown){scheduleAutosave();return}if(state.animationPlaying)stopAnimationPlayback({save:false,quiet:true});try{const db=await openDB();const data=await projectDataAsync();await new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put({id:'autosave',saved:Date.now(),data});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});state.lastAutosave=Date.now();$('autosaveStatus').textContent='自動保存済み'}catch(e){$('autosaveStatus').textContent='ローカル保存不可';console.warn('Autosave unavailable',e)}},7000)}
let dbPromise;function openDB(){if(!('indexedDB'in window))return Promise.reject(new Error('IndexedDB unavailable'));if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('PixelForgeDB',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('projects'))req.result.createObjectStore('projects',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return dbPromise}
async function restoreAutosave(){try{const db=await openDB();const rec=await new Promise((resolve,reject)=>{const req=db.transaction('projects').objectStore('projects').get('autosave');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});if(rec&&rec.data){await loadProjectText(JSON.stringify(rec.data));toast('前回の自動保存を復元しました')}}catch(e){console.info('No autosave found',e)}}
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
function openNewDialog(){$('newWidth').value=state.width;$('newHeight').value=state.height;$('newDpi').value=state.dpi||300;$('newBackground').value=state.bg;$('newPreset').value='custom';$('newModal').classList.remove('hidden')}
function createNew(){stopAnimationPlayback({save:false,quiet:true});const w=Math.max(1,Math.min(12000,Number($('newWidth').value)||1600)),h=Math.max(1,Math.min(12000,Number($('newHeight').value)||1000));if(w*h>20000000){toast('キャンバスが大きすぎます（安定動作の上限は2000万px）');return}state.width=w;state.height=h;state.dpi=Math.max(36,Math.min(1200,Number($('newDpi').value)||300));$('documentDpi').value=state.dpi;updateHistoryLimit();state.bg=$('newBackground').value;state.projectName='Untitled';$('canvasPreset').value='custom';state.reference=null;state.animationFrames=[];state.frameIndex=0;state.paperTexture='none';state.layers=[newLayer('Background')];state.activeId=state.layers[0].id;state.history=[];state.redo=[];state.dirty=false;$('newModal').classList.add('hidden');resizeDisplay();fitView();updateUI();renderLayers();ensureInitialFrame();renderTimeline();markDirty()}

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
function initSwatches(){$('swatches').innerHTML='';defaultSwatches.forEach(c=>{const b=document.createElement('button');b.className='swatch';b.style.background=c;b.title=c;b.onclick=()=>setColor(c);$('swatches').appendChild(b)})}
let progressHideTimer=null;
function showProgress(title,text,percent=0){$('busyOverlay').classList.remove('hidden');$('busyTitle').textContent=title;$('busyText').textContent=text;updateProgress(percent,text);}
function updateProgress(percent,text){const p=Math.max(0,Math.min(100,Math.round(percent)));$('busyProgress').style.width=p+'%';$('busyPercent').textContent=p+'%';if(text)$('busyText').textContent=text;}
function hideProgress(){clearTimeout(progressHideTimer);$('busyOverlay').classList.add('hidden');}
function nextFrameUI(){return new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));}
let pixelWorker=null,workerSerial=0,workerPending=new Map(),workerHealth='未接続';
function setWorkerHealth(text){workerHealth=text;const node=$('workerHealth');if(node)node.textContent='処理エンジン: '+text;}
function getPixelWorker(){
 if(pixelWorker)return pixelWorker;
 if(!('Worker' in window))throw new Error('このブラウザではWorkerが利用できません');
 const url=new URL('./water-worker-v8.js',document.baseURI);
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
const BRUSH_PROFILE_FORM_IDS=['sizeRange','sizeNumber','opacityRange','hardness','stabilizerRange','spacing','pressureSize','brushFlow','brushJitter','brushAngle','pressureOpacity','curveBend','polygonSides','waterAmount','pigment','waterSpread','edgeDarkening','waterPreset','waterAbsorption','waterDiffusion','waterGranulation','waterDrying','paperTexture','paperStrength','paperFiberDirection','paperGrainScale','paperSurfaceRelief','paperInteraction','textureDetail','pressureProfile','velocitySize','velocityOpacity','taperStart','taperEnd','wetEdge','textureScale','edgeSoftness','nibTiltSensitivity','strokeCorrection','feelPreset','feelFriction','feelSmoothing','pressureCurve','tiltEnabled','strokeStability','strokePressureSmoothing','pressureFloor','pressureCeiling','strokeSampleDensity','strokeResampleQuality','strokePreviewMode','pressureWidthGain','tiltWidthGain','nibFollow','nibAngleMode','strokeWidthNoise','strokeWidthWave','strokeTaperPower','bristleSplay','bristleLengthVariation','bristleClumping','bristleCurl','bristleLag','bristleWaviness','bristleWidthVariation','bristleOpacityVariation','bristleDensity','bristleWetness','bristleColorVariation','paintDrag','pigmentReservoir','pigmentDepletion','strokeDrying','wetEdgeSpread','colorPickupRadius','edgeBreakup'];
function readBrushProfiles(){try{return JSON.parse(localStorage.getItem('pf-brush-profiles')||'{}')}catch(_){return{}}}
function persistBrushProfiles(){try{localStorage.setItem('pf-brush-profiles',JSON.stringify(state.brushProfiles||{}))}catch(_){toast('ブラシ設定のローカル保存容量が不足しています')}}
function saveBrushProfileFor(id,{silent=false}={}){
 if(!id)return;state.brushProfiles=state.brushProfiles||{};
 const values={};for(const k of BRUSH_PROFILE_STATE_KEYS){const v=state[k];if(v===null||['string','number','boolean'].includes(typeof v))values[k]=v;}
 const name=($('brushProfileName')?.value||'').trim()||$('brushPreset')?.selectedOptions?.[0]?.textContent||id;
 state.brushProfiles[id]={id,name,state:values,controls:captureFormState(BRUSH_PROFILE_FORM_IDS),updatedAt:new Date().toISOString()};persistBrushProfiles();renderBrushProfileLibrary();if($('brushProfileSelect'))$('brushProfileSelect').value=id;
 if(!silent)toast(name+' の設定を保存しました');
}
function applyBrushProfileFor(id,{silent=false}={}){
 const profile=state.brushProfiles?.[id];if(!profile)return false;
 if(profile.controls)restoreFormState(profile.controls,{dispatch:true});
 if(profile.state&&typeof profile.state==='object')for(const [k,v] of Object.entries(profile.state)){if(BRUSH_PROFILE_STATE_KEYS.includes(k)&&(v===null||['string','number','boolean'].includes(typeof v)))state[k]=v;}
 normalizeAdvancedStrokeSettings();
 state.brushPreset=id;if($('brushPreset'))$('brushPreset').value=id;
 $('sizeNumber').value=state.size;$('sizeRange').value=Math.min(250,state.size);$('opacityRange').value=Math.round(state.opacity*100);$('hardness').value=Math.round(state.hardness*100);
 syncBrushLabUI?.();updateUI();if(profile.controls)restoreFormState(profile.controls,{dispatch:false});if($('brushProfileName'))$('brushProfileName').value=profile.name||'';if($('brushProfileSelect'))$('brushProfileSelect').value=id;renderBrushProfileLibrary();markDirty();
 if(!silent)toast((profile.name||id)+' の設定を復元しました');return true;
}
function renderBrushProfileLibrary(){
 const select=$('brushProfileSelect');if(!select)return;const current=select.value;select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='保存済みの画材設定を選択';select.append(placeholder);
 const brushSelect=$('brushPreset');for(const [id,p] of Object.entries(state.brushProfiles||{})){if(!brushSelect||![...brushSelect.options].some(o=>o.value===id))continue;const opt=document.createElement('option');opt.value=id;opt.textContent=(p.name||brushSelect.querySelector(`option[value="${id}"]`)?.textContent||id)+' · '+(brushSelect.querySelector(`option[value="${id}"]`)?.textContent||id);select.append(opt);}
 select.value=[...select.options].some(o=>o.value===current)?current:'';
 const active=$('brushProfileStatus');if(active)active.textContent=state.brushProfiles?.[state.brushPreset]?'この画材の設定は保存済み':'この画材にはまだ個別設定がありません';
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
function bindEvents(){
 document.querySelectorAll('.tool[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
 display.addEventListener('pointerdown',stagePointerDown,{passive:false});display.addEventListener('pointermove',stagePointerMove,{passive:false});display.addEventListener('pointerup',stagePointerUp);display.addEventListener('pointercancel',stagePointerUp);display.addEventListener('lostpointercapture',e=>{if(state.pointerDown||state.panning)stagePointerUp(e)});display.addEventListener('contextmenu',e=>e.preventDefault());
 stage.addEventListener('wheel',e=>{e.preventDefault();const r=stage.getBoundingClientRect();zoomAt(e.deltaY<0?1.12:.89,e.clientX-r.left,e.clientY-r.top)},{passive:false});
 $('colorPicker').addEventListener('input',e=>setColor(e.target.value));$('hexColor').addEventListener('change',e=>setColor(e.target.value));$('gradientColor').addEventListener('input',e=>state.gradientColor=e.target.value);
 $('panelToggle').onclick=()=>setSettingsPanelOpen(isMobileLayout()?!document.body.classList.contains('mobile-panel-open'):$('rightbar').classList.contains('collapsed'));$('mobilePanelToggle')?.addEventListener('click',()=>setSettingsPanelOpen(true));$('mobilePanelScrim')?.addEventListener('click',()=>setSettingsPanelOpen(false));$('mobileUndo')?.addEventListener('click',doUndo);$('mobileRedo')?.addEventListener('click',doRedo);$('mobileFit')?.addEventListener('click',fitView);document.querySelectorAll('[data-mobile-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.mobileTool)));$('mobileColor')?.addEventListener('click',()=>$('colorPicker')?.click());document.querySelectorAll('.panelhead').forEach(head=>{head.setAttribute('role','button');head.setAttribute('tabindex','0');head.setAttribute('aria-expanded','true');const toggle=()=>{const panel=head.closest('.panel');if(!panel)return;panel.classList.toggle('folded');head.setAttribute('aria-expanded',String(!panel.classList.contains('folded')))};head.addEventListener('click',toggle);head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}})});document.querySelectorAll('#transformPanel,#feelPanel,#devicePanel').forEach(p=>{p.classList.add('folded');p.querySelector('.panelhead')?.setAttribute('aria-expanded','false')});
 $('gradientType')?.addEventListener('change',e=>state.gradientType=e.target.value);
 $('fillTolerance')?.addEventListener('input',e=>{state.fillTolerance=Number(e.target.value);$('fillToleranceValue').textContent=e.target.value});
 $('fillContiguous').onchange=e=>state.fillContiguous=e.target.checked;$('fillMerged').onchange=e=>state.fillMerged=e.target.checked;$('fillOpacity').oninput=e=>{state.fillOpacity=Number(e.target.value)/100;$('fillOpacityValue').textContent=e.target.value+'%'};$('fillFeather').oninput=e=>{state.fillFeather=Number(e.target.value);$('fillFeatherValue').textContent=e.target.value+' px'};$('retryPixelWorker').onclick=()=>{try{pixelWorker?.terminate()}catch(_){}pixelWorker=null;try{getPixelWorker();toast('処理エンジンを再接続しました')}catch(err){setWorkerHealth('代替エンジンで動作');toast('Workerなしで代替エンジンを使用します')}};$('smudgeStrength').oninput=e=>{state.smudgeStrength=Number(e.target.value)/100;$('smudgeStrengthValue').textContent=e.target.value+'%'};$('waterPreset').onchange=e=>{const presets={wet:[.78,.78,.22,.34],wash:[.50,.58,.14,.42],granulating:[.42,.38,.88,.50],dry:[.20,.22,.58,.78],bloom:[.92,.92,.46,.24]};const v=presets[e.target.value]||presets.wet;[state.waterAmount,state.waterDiffusion,state.waterGranulation,state.waterDrying]=v;$('waterAmount').value=Math.round(v[0]*100);$('waterAmountValue').textContent=$('waterAmount').value+'%';$('waterDiffusion').value=Math.round(v[1]*100);$('waterDiffusionValue').textContent=$('waterDiffusion').value+'%';$('waterGranulation').value=Math.round(v[2]*100);$('waterGranulationValue').textContent=$('waterGranulation').value+'%';$('waterDrying').value=Math.round(v[3]*100);$('waterDryingValue').textContent=$('waterDrying').value+'%'};$('waterAbsorption').oninput=e=>{state.waterAbsorption=Number(e.target.value)/100;$('waterAbsorptionValue').textContent=e.target.value+'%'};$('waterDiffusion').oninput=e=>{state.waterDiffusion=Number(e.target.value)/100;$('waterDiffusionValue').textContent=e.target.value+'%'};$('waterGranulation').oninput=e=>{state.waterGranulation=Number(e.target.value)/100;$('waterGranulationValue').textContent=e.target.value+'%'};$('waterDrying').oninput=e=>{state.waterDrying=Number(e.target.value)/100;$('waterDryingValue').textContent=e.target.value+'%'};
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

 $('brushPreset').onchange=e=>{const previous=state.brushPreset,next=e.target.value;if(previous!==next&&$('brushProfileAuto')?.checked&&previous)saveBrushProfileFor(previous,{silent:true});state.brushPreset=next;if(previous!==next&&$('brushProfileAuto')?.checked)applyBrushProfileFor(next,{silent:true});if($('brushProfileName'))$('brushProfileName').value=state.brushProfiles?.[next]?.name||'';if($('brushProfileSelect'))$('brushProfileSelect').value=state.brushProfiles?.[next]?next:'';setStatus('画材: '+e.target.options[e.target.selectedIndex].text);renderBrushFavorites?.();renderBrushProfileLibrary?.();updateBrushPreview?.();if($('brushInfoLive'))$('brushInfoLive').textContent=brushInfo(state.brushPreset);markDirty()};$('brushFlow').oninput=e=>{state.brushFlow=Number(e.target.value)/100;$('brushFlowValue').textContent=e.target.value+'%'};$('brushJitter').oninput=e=>{state.brushJitter=Number(e.target.value)/100;$('brushJitterValue').textContent=e.target.value+'%'};$('brushAngle').oninput=e=>{state.brushAngle=Number(e.target.value);$('brushAngleValue').textContent=e.target.value+'°'};$('pressureOpacity').onchange=e=>state.pressureOpacity=e.target.checked;$('curveBend').oninput=e=>{state.curveBend=Number(e.target.value)/100;$('curveBendValue').textContent=e.target.value+'%'};$('polygonSides').oninput=e=>{state.polygonSides=Number(e.target.value);$('polygonSidesValue').textContent=e.target.value+'辺'};$('waterAmount').oninput=e=>{state.waterAmount=Number(e.target.value)/100;$('waterAmountValue').textContent=e.target.value+'%'};$('pigment').oninput=e=>{state.pigment=Number(e.target.value)/100;$('pigmentValue').textContent=e.target.value+'%'};$('paperTexture').onchange=e=>{state.paperTexture=e.target.value;renderLayers();markDirty()};$('paperStrength').oninput=e=>{state.paperStrength=Number(e.target.value)/100;$('paperStrengthValue').textContent=e.target.value+'%';renderLayers();markDirty()};
 $('loadTrace').onclick=()=>$('traceInput').click();$('traceInput').onchange=e=>{if(e.target.files[0])loadTraceImage(e.target.files[0]);e.target.value=''};$('clearTrace').onclick=()=>{state.reference=null;renderLayers();markDirty();toast('下敷きを解除しました')};$('traceOpacity').oninput=e=>{if(state.reference)state.reference.opacity=Number(e.target.value)/100;$('traceOpacityValue').textContent=e.target.value+'%';renderLayers();markDirty()};$('traceVisible').onchange=e=>{if(state.reference)state.reference.visible=e.target.checked;renderLayers();markDirty()};
 $('placeText').onclick=()=>setTool('text');$('editTextLayer').onclick=editSelectedText;$('framePrev').onclick=()=>switchFrame(state.frameIndex-1);$('frameNext').onclick=()=>switchFrame(state.frameIndex+1);$('frameAdd').onclick=()=>addAnimationFrame(false);$('frameDuplicate').onclick=()=>addAnimationFrame(true);$('frameDelete').onclick=deleteAnimationFrame;$('frameMoveLeft')?.addEventListener('click',()=>moveAnimationFrame(-1));$('frameMoveRight')?.addEventListener('click',()=>moveAnimationFrame(1));$('animationPlay').onclick=toggleAnimation;$('animationFps').oninput=e=>$('animationFpsValue').textContent=e.target.value;$('onionSkin').onchange=async e=>{state.onionSkin=e.target.checked;await refreshOnionGhost();renderLayers()};$('animationExport').onclick=exportAnimationWebM;$('animationPNGExport')?.addEventListener('click',exportAnimationPNGSequence);$('animationSpriteExport')?.addEventListener('click',exportAnimationSpriteSheet);$('exportOra').onclick=exportOpenRaster;
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>applyFilter(b.dataset.filter));$('flipH').onclick=()=>flipLayers('h');$('flipV').onclick=()=>flipLayers('v');$('rotate90').onclick=rotateLayers90;$('randomPalette').onclick=randomPalette;
 function closeQuickMenu(){$('menuPopup').classList.add('hidden')}
 function openQuickMenu(kind,anchor){const pop=$('menuPopup');const menus={
  menuFile:[['新しいキャンバス',openNewDialog],['プロジェクトを開く',openProject],['プロジェクトを保存',saveProject],['separator'],['画像をレイヤーとして読み込む',()=>$('imageInput').click()],['写真を下敷きに読み込む',()=>$('traceInput').click()],['PSDを開く',()=>$('psdInput').click()],['PSDで保存',exportPSD],['separator'],['PNGを書き出す',()=>$('exportPng').click()],['JPGを書き出す',()=>$('exportJpg').click()],['WebPを書き出す',()=>$('exportWebp').click()],['OpenRasterを書き出す',exportOpenRaster]],
  menuEdit:[['元に戻す · Ctrl+Z',doUndo],['やり直す · Ctrl+Shift+Z',doRedo],['separator'],['レイヤーを複製',duplicateLayer],['レイヤーを削除',deleteLayer],['下のレイヤーと結合',mergeDown]],
  menuCanvas:[['画面に合わせる',fitView],['キャンバス中央へ',()=>$('centerBtn').click()],['separator'],['左右反転',flipHorizontal],['上下反転',flipVertical],['90°回転',rotateLayers90],['新規レイヤー',()=>addLayer()]],
  menuView:[['設定パネル表示/非表示',()=>$('rightbar').classList.toggle('collapsed')],['グリッド表示切替',()=>{$('gridToggle').checked=!$('gridToggle').checked;$('gridToggle').dispatchEvent(new Event('change'))}],['対称描画へ移動',()=>$('symmetry').focus()],['ズームをリセット',fitView]],
  menuHelp:[['使い方サイト・操作ガイドを開く',()=>window.PFStudio?.openHelp?.()],['アップデート情報を再表示',()=>window.PFStudio?.showUpdateNotice?.()],['キーボードショートカット',()=>toast('B ブラシ · E 消しゴム · L 線 · R 四角 · O 楕円 · D グラデーション · M レイヤー移動 · T 文字 · Space+ドラッグ 移動')],['このアプリについて',()=>toast('PIXEL FORGE STUDIO · Web Studio Edition v16.0')]]
 };
 pop.innerHTML='';(menus[kind]||[]).forEach(([label,action])=>{if(label==='separator'){const d=document.createElement('div');d.className='menuDivider';pop.appendChild(d);return}const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{closeQuickMenu();action()};pop.appendChild(b)});const r=anchor.getBoundingClientRect();pop.classList.remove('hidden');pop.style.position='fixed';const vv=window.visualViewport,vw=vv?.width||window.innerWidth,vh=vv?.height||window.innerHeight,ox=vv?.offsetLeft||0,oy=vv?.offsetTop||0;pop.style.left=Math.max(8+ox,Math.min(ox+vw-230,r.left))+'px';pop.style.top=Math.min(r.bottom+5,Math.max(8+oy,oy+vh-pop.offsetHeight-8))+'px'}
 $('menuFile').onclick=e=>openQuickMenu('menuFile',e.currentTarget);$('menuEdit').onclick=e=>openQuickMenu('menuEdit',e.currentTarget);$('menuCanvas').onclick=e=>openQuickMenu('menuCanvas',e.currentTarget);$('menuView').onclick=e=>openQuickMenu('menuView',e.currentTarget);$('menuHelp').onclick=e=>openQuickMenu('menuHelp',e.currentTarget);
 $('mobileMore')?.addEventListener('click',e=>{
  const anchor=e.currentTarget,pop=$('menuPopup'),r=anchor.getBoundingClientRect();pop.innerHTML='';
  const groups=[['ファイル','menuFile'],['編集','menuEdit'],['キャンバス','menuCanvas'],['表示','menuView'],['ヘルプ','menuHelp']];
  for(const [label,kind] of groups){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>openQuickMenu(kind,anchor);pop.appendChild(b)}
  pop.classList.remove('hidden');pop.style.position='fixed';const vv=window.visualViewport,vw=vv?.width||window.innerWidth,vh=vv?.height||window.innerHeight,ox=vv?.offsetLeft||0,oy=vv?.offsetTop||0;pop.style.left=Math.max(8+ox,Math.min(ox+vw-230,r.left))+'px';pop.style.top=Math.max(8+oy,Math.min(oy+vh-pop.offsetHeight-8,r.top-pop.offsetHeight-5))+'px';
 });
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
 applyMobileUISettings();syncBrushLabUI();filterBrushOptions();
 window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue=''}});
}
async function start(){state.brushProfiles=readBrushProfiles();initSwatches();bindEvents();syncResponsiveLayout();resizeDisplay(true);initDocument();await restoreAutosave();normalizeBrushMicroDynamics();applyRestoredMobileUiSettings();syncResponsiveLayout();renderTimeline();renderBrushProfileLibrary?.();$('exportQualityValue').textContent=$('exportQuality').value+'%';$('exportScale').value='1';$('newPreset').value='custom';$('canvasPreset').value='custom';setStatus('Web描画エンジン · 準備完了');$('pointerTypeChip').textContent='入力: 待機';$('devicePressureChip').textContent='筆圧: 待機';setWorkerHealth('待機中 · 初回処理時に接続');if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(err=>console.info('PWA offline cache unavailable',err));}
window.PF_DIAGNOSTICS={version:'17.0.0',getInputState:()=>({pointerDown:state.pointerDown,activePointerType:state.activePointerType,gesturePointers:state.gesturePointers.size,gesturePinch:!!state.gesturePinch,pendingDisplayResize:state.pendingDisplayResize}),getBrushCount:()=>document.getElementById('brushPreset')?.options.length||0,getDynamicsState:()=>({pressureWidthGain:state.pressureWidthGain,tiltWidthGain:state.tiltWidthGain,nibAngleMode:state.nibAngleMode,bristleSplay:state.bristleSplay,bristleDensity:state.bristleDensity,pigmentReservoir:state.pigmentReservoir,strokeTaperPower:state.strokeTaperPower}),getPaperCount:()=>document.getElementById('paperTexture')?.options.length||0,getPreviewState:()=>({cached:!!state.strokePreviewCacheKey,stickyFallback:state.strokePreviewStickyFallback,mode:state.strokePreviewCacheResult?(state.strokePreviewCacheResult.screenSpace?'viewport-bounded':'document-resolution'):'none',revision:state.strokePathRevision}),getMobileSettings:()=>({touchDrawMode:state.touchDrawMode,mobilePreviewFps:state.mobilePreviewFps,leftHandedUI:state.leftHandedUI,compact:state.mobileCompactUI,dockScale:state.mobileToolbarScale}),getPaperResponse:()=>({...getPaperResponse()}),getCanvasMetrics:()=>({width:display.width,height:display.height,dpr:displayDpr(),mobile:isMobileLayout(),atomicFramePresent:!!renderFrameBuffer&&!renderFrameFailed,renderFrameFailed})};
start();
})();
