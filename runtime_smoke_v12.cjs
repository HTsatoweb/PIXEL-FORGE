const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(__dirname + '/app.js', 'utf8');
const start = source.indexOf('function frameImage(item){');
const end = source.indexOf('async function switchFrame(index,save=true){', start);
assert(start >= 0 && end > start, 'Animation frame functions found');
const snippet = source.slice(start, end);
let imageCount = 0;
let drawCount = 0;
function makeCanvas(w=64,h=64) {
  const ctx = {
    clearRect(){}, drawImage(){drawCount++}, save(){}, restore(){},
    set globalAlpha(v){}, set globalCompositeOperation(v){}
  };
  return {width:w,height:h,getContext(){return ctx;}};
}
class MockImage {
  constructor(){ imageCount++; this.complete=false; this.naturalWidth=0; this.decoding=''; }
  set src(v){ this._src=v; setTimeout(()=>{this.complete=true;this.naturalWidth=64;this.onload?.();}, v.includes('slow')?35:5); }
  get src(){return this._src;}
}
const state = {
  width:64,height:64,frameLoadToken:1,frameIndex:0,animationFrames:[],
  layers:[{id:1,name:'old',canvas:makeCanvas(),visible:true,opacity:1,blend:'source-over'}],
  activeId:1,history:[],redo:[],onionSkin:false,onionGhost:[],onionGhostToken:0
};
const sandbox = {
  state, Image:MockImage, document:{createElement(tag){if(tag==='canvas')return makeCanvas();throw new Error('unexpected element '+tag)}},
  frameImageCache:new WeakMap(), frameThumbCache:new WeakMap(), timelineRenderToken:0,
  nextLayerId:5,
  newLayer(name){return {id:this.nextLayerId++,name,canvas:makeCanvas(state.width,state.height),visible:true,opacity:1,blend:'source-over',textData:null}},
  toast(){}, markDirty(){}, renderLayers(){}, updateUI(){}, renderTimeline(){}, setStatus(){},
  captureFrameData(){return {layers:[]}}, $(){return {textContent:'',setAttribute(){},value:'12'}},
  console
};
vm.createContext(sandbox);
vm.runInContext(snippet + '\nglobalThis.__api={frameImage,loadFrameData};', sandbox);
(async()=>{
  const api=sandbox.__api;
  const cachedItem={id:10,name:'cached',image:'data:image/png;cache'};
  const a=api.frameImage(cachedItem), b=api.frameImage(cachedItem);
  assert.strictEqual(a,b,'same layer image is decoded only once');
  await Promise.all([a,b]);
  assert.strictEqual(imageCount,1,'one Image instance for cached item');

  const frame1={layers:[{id:11,name:'first',image:'data:image/png;frame1',visible:true,opacity:1,blend:'source-over'}]};
  const loaded=await api.loadFrameData(frame1,{token:1,render:false,update:false,refreshGhost:false});
  assert.strictEqual(loaded,true,'frame loads');
  assert.strictEqual(sandbox.state.layers[0].name,'first');
  assert(drawCount>0,'decoded image is drawn to the layer canvas');
  const firstLayer=sandbox.state.layers[0];

  const frame2={layers:[{id:11,name:'second',image:'data:image/png:slow',visible:true,opacity:1,blend:'source-over'}]};
  const pending=api.loadFrameData(frame2,{token:2,render:false,update:false,refreshGhost:false});
  sandbox.state.frameLoadToken=3;
  const stale=await pending;
  assert.strictEqual(stale,false,'stale async frame load is discarded');
  assert.strictEqual(sandbox.state.layers[0],firstLayer,'stale load does not replace active layers');

  const frame3={layers:[{id:11,name:'third',image:'data:image/png:frame3',visible:true,opacity:1,blend:'source-over'}]};
  sandbox.state.frameLoadToken=4;
  const reused=await api.loadFrameData(frame3,{token:4,render:false,update:false,refreshGhost:false,reuse:true});
  assert.strictEqual(reused,true,'next frame loads with canvas reuse');
  assert.strictEqual(sandbox.state.layers[0],firstLayer,'playback reuses the existing layer/canvas object');
  assert.strictEqual(sandbox.state.layers[0].name,'third');

  console.log('PASS frame image decode cache');
  console.log('PASS load/render of frame data');
  console.log('PASS stale asynchronous frame cancellation');
  console.log('PASS playback layer/canvas reuse');
})().catch(err=>{console.error(err);process.exitCode=1});
