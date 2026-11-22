const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(__dirname + '/app.js', 'utf8');
const a = source.indexOf('function smooth01(t)');
const b = source.indexOf('\nfunction traceSmoothEdge(ctx,edge)', a);
assert(a >= 0 && b > a, 'ribbon geometry helpers located');
const c = source.indexOf('function deterministicUnit(seed)', b);
const d = source.indexOf('\nfunction brushAlphaScale', c);
assert(c > b && d > c, 'bristle path helpers located');
const geom = source.slice(a, b);
const hairs = source.slice(c, d);
const baseState = {
  brushPreset:'gpen', brushTipShape:'round', brushAngle:0, nibAngleMode:'fixed', nibFollow:.65,
  tiltEnabled:true, tiltWidthGain:.42, nibTiltSensitivity:.55, lastPointerType:'pen',
  velocitySize:0, pressureWidthGain:1, strokePressureSmoothing:0, strokeWidthNoise:0,
  strokeWidthWave:0, taperStart:.08, taperEnd:.08, strokeTaper:0, strokeTaperPower:1.35,
  tipRotationJitter:0, strokeSessionId:17, brushAspect:1, bristleSpread:.45,
  bristleSplay:.55, bristleLengthVariation:.28, bristleClumping:.30, bristleCurl:.24,
  bristleLag:.22, bristleWaviness:.12, bristleWidthVariation:.24,
  bristleOpacityVariation:.22, bristleDensity:1, bristleWetness:.58,
  bristleColorVariation:.18, paintDrag:.32, size:20, pressureProfile:'natural', pressureCurve:1
};
const ctx = {
  commands:[], strokes:0,
  beginPath(){this.commands.push(['begin']);}, moveTo(x,y){this.commands.push(['M',x,y]);},
  lineTo(x,y){this.commands.push(['L',x,y]);}, quadraticCurveTo(...v){this.commands.push(['Q',...v]);},
  stroke(){this.strokes++;}
};
const sandbox = {
  state:JSON.parse(JSON.stringify(baseState)),
  resampleStroke(points){return points;},
  $(id){return id==='pressureSize'?{checked:true}:null;},
  pressureResponse(p){return Math.max(.015,Math.min(1,Number(p)||.5));},
  Math, console
};
vm.createContext(sandbox);
vm.runInContext(geom+'\n'+hairs+'\nglobalThis.__test={ribbonPolygon,traceBristleMicroPath,varyBrushColor};',sandbox);
const api=sandbox.__test;
const line=(p,tiltX=0)=>Array.from({length:11},(_,i)=>({x:i*10,y:0,p,v:.25,tiltX,tiltY:0}));
function widthFor(p, gain=1, tiltEnabled=true, tilt=0, shape='round', mode='fixed'){
  Object.assign(sandbox.state,JSON.parse(JSON.stringify(baseState)),{pressureWidthGain:gain,tiltEnabled,lastPointerType:'pen',brushTipShape:shape,nibAngleMode:mode,tiltWidthGain:.8,strokeSessionId:17});
  const pts=line(p,tilt);
  const r=api.ribbonPolygon(pts,20);
  const mid=5;
  return 2*Math.hypot(r.left[mid].x-r.points[mid].x,r.left[mid].y-r.points[mid].y);
}
const low=widthFor(.2),high=widthFor(1);
assert(high>low*2,'pressure gain changes width on pen samples');
const neutral=widthFor(.2,0);
assert(Math.abs(neutral-widthFor(1,0))<1e-6,'zero pressure gain neutralizes pressure width');
const noTilt=widthFor(1,1,false,80), withTilt=widthFor(1,1,true,80);
assert(withTilt>noTilt*1.1,'tilt width only affects enabled pen input');
Object.assign(sandbox.state,JSON.parse(JSON.stringify(baseState)),{brushTipShape:'flat',nibAngleMode:'fixed',strokeWidthNoise:0,strokeWidthWave:0});
const diagonal=line(1).map((p,i)=>({...p,y:i*12}));
const fixedRibbon=api.ribbonPolygon(diagonal,20),fixed=2*Math.hypot(fixedRibbon.left[5].x-fixedRibbon.points[5].x,fixedRibbon.left[5].y-fixedRibbon.points[5].y);
sandbox.state.nibAngleMode='follow';const followRibbon=api.ribbonPolygon(diagonal,20),follow=2*Math.hypot(followRibbon.left[5].x-followRibbon.points[5].x,followRibbon.left[5].y-followRibbon.points[5].y);
assert(Math.abs(fixed-follow)>0.05,'nib following changes flat-tip shape width');

const points=Array.from({length:24},(_,i)=>({x:i*4,y:Math.sin(i/4)*12,p:.8,v:.7}));
function hairGeometry(settings,index=1){
  Object.assign(sandbox.state,JSON.parse(JSON.stringify(baseState)),settings);
  const local={commands:[],strokes:0,beginPath(){this.commands.push(['begin']);},moveTo(x,y){this.commands.push(['M',x,y]);},lineTo(x,y){this.commands.push(['L',x,y]);},quadraticCurveTo(...v){this.commands.push(['Q',...v]);},stroke(){this.strokes++;}};
  const r=api.traceBristleMicroPath(local,points,index,9,{fan:true});
  return {r,commands:local.commands,strokes:local.strokes};
}
const first=hairGeometry({}),repeat=hairGeometry({});
assert.deepStrictEqual(first.commands,repeat.commands,'same session/settings produce identical bristle paths');
assert.strictEqual(first.strokes,0,'geometry helper does not paint before per-hair style is applied');
assert(first.commands.length>4,'bristle geometry emits continuous path commands');
const splayed=hairGeometry({bristleSplay:1});
assert.notDeepStrictEqual(first.commands,splayed.commands,'splay setting alters bristle geometry');
const curled=hairGeometry({bristleCurl:1});
assert.notDeepStrictEqual(first.commands,curled.commands,'curl setting alters bristle geometry');
const delayed=hairGeometry({bristleLag:1});
assert.notDeepStrictEqual(first.commands,delayed.commands,'lag setting alters bristle geometry');
const longVariance=hairGeometry({bristleLengthVariation:1},4);
assert.notStrictEqual(first.commands.length,longVariance.commands.length,'length variance changes strand termination');
const colorA=api.varyBrushColor('#406080',0,4,9),colorB=api.varyBrushColor('#406080',.6,8,9);
assert.notStrictEqual(colorA,colorB,'bristle color variation changes hair tone');
console.log('PASS universal pressure width');
console.log('PASS pressure gain neutral');
console.log('PASS stylus tilt gating');
console.log('PASS nib angle modes');
console.log('PASS deterministic bristle path');
console.log('PASS bristle path is not painted before style application');
console.log('PASS bristle splay/curl/lag/length/color response');
