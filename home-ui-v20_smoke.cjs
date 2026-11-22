const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(__dirname + '/home-ui-v20.js', 'utf8');
function classList(){const values=new Set();return{toggle(k,v){if(v)values.add(k);else values.delete(k)},contains(k){return values.has(k)}}}
const listeners={};
const home={dataset:{},addEventListener(type,fn){listeners[type]=fn},contains(){return true}};
const html={dataset:{},classList:classList()};
const body={classList:{contains:()=>true}};
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
const mobileQuery={matches:true,addEventListener(){},addListener(){}};
const context={
  document:{querySelector(sel){return sel==='#homeScreen'?home:sel==='#libraryCount'?sourceCount:sel==='#mobileLibraryCount'?mobileCount:targets[sel]||null},documentElement:html,body},
  window:{matchMedia:()=>mobileQuery,addEventListener(){}},MutationObserver,
  requestAnimationFrame(fn){fn()},
};
vm.runInNewContext(source,context);
if(html.dataset.pfHomeMode!=='mobile'||!html.classList.contains('pf-home-mobile-active'))throw Error('mobile mode not activated');
if(mobileCount.textContent!=='12')throw Error('library count not mirrored');
for(const key of Object.keys(clicks)){
  const trigger={dataset:{pfHomeAction:key}};
  listeners.click({target:{closest:()=>trigger},preventDefault(){}});
  if(clicks[key]!==1)throw Error('action not routed: '+key);
}
sourceCount.textContent='7 作品';
observers[0].fn();
if(mobileCount.textContent!=='7')throw Error('library count did not update');
console.log('PASS: responsive mode flag; five mobile home action routes; live library count mirror.');
