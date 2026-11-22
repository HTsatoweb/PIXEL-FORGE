const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(__dirname + '/home-ui-v21.js', 'utf8');
function makeClassList(){const values=new Set();return{toggle(k,v){if(v)values.add(k);else values.delete(k)},contains(k){return values.has(k)}}}
function run(width, mediaAvailable=true){
  const listeners={};
  const home={dataset:{},addEventListener(type,fn){listeners[type]=fn},contains(){return true}};
  const html={dataset:{},classList:makeClassList()};
  const body={classList:makeClassList()};body.classList.toggle('pf-home-active',true);
  const sourceCount={textContent:'12 作品'};
  const mobileCount={textContent:'0',setAttribute(k,v){this[k]=v}};
  const clicks={new:0,import:0,settings:0,refresh:0,install:0};
  const targets={
    '#homeNew':{click(){clicks.new++}}, '#homeImport':{click(){clicks.import++}},
    '#homeSettings':{click(){clicks.settings++}}, '#homeRefresh':{click(){clicks.refresh++}},
    '#homeInstall':{click(){clicks.install++}}
  };
  const observers=[];
  class MutationObserver{constructor(fn){this.fn=fn;observers.push(this)}observe(){}}
  const windowObject={innerWidth:width,addEventListener(){},visualViewport:null};
  if(mediaAvailable)windowObject.matchMedia=()=>({matches:width<=760,addEventListener(){},addListener(){}});
  const context={
    document:{querySelector(sel){return sel==='#homeScreen'?home:sel==='#libraryCount'?sourceCount:sel==='#mobileLibraryCount'?mobileCount:targets[sel]||null},documentElement:html,body},
    window:windowObject,MutationObserver,requestAnimationFrame(fn){fn()}
  };
  vm.runInNewContext(source,context);
  const expected=width<=760?'mobile':'desktop';
  if(html.dataset.pfHomeMode!==expected)throw Error('responsive mode mismatch with matchMedia='+mediaAvailable);
  if(expected==='mobile'&&!html.classList.contains('pf-home-mobile-active'))throw Error('mobile active class missing');
  if(mobileCount.textContent!=='12')throw Error('library count not mirrored');
  for(const key of Object.keys(clicks)){
    const trigger={dataset:{pfHomeAction:key}};
    listeners.click({target:{closest:()=>trigger},preventDefault(){}});
    if(clicks[key]!==1)throw Error('action not routed: '+key);
  }
  sourceCount.textContent='7 作品';observers[0].fn();
  if(mobileCount.textContent!=='7')throw Error('library count did not update');
  observers[1].fn();
}
run(390,true);
run(1440,true);
run(390,false); // older WebView / unavailable matchMedia fallback
console.log('PASS: mobile/desktop mode, matchMedia fallback, five action routes, live library count, MutationObserver guards.');
