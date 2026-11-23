/* PIXEL FORGE PSD compatibility module
 * Supports standard 8-bit RGB pixel layers, visibility, opacity and common blend modes.
 * Unsupported Photoshop features (smart objects, adjustment layers, vector masks, layer effects, etc.) are intentionally not claimed.
 */
(() => {
  'use strict';
  const enc = new TextEncoder();
  const dec = new TextDecoder('utf-8');
  const BLEND_TO_PSD = {
    'source-over':'norm', multiply:'mul ', screen:'scrn', overlay:'over',
    darken:'dark', lighten:'lite', difference:'diff', 'color-dodge':'div ',
    'color-burn':'idiv', 'soft-light':'sLit'
  };
  const PSD_TO_BLEND = Object.fromEntries(Object.entries(BLEND_TO_PSD).map(([a,b])=>[b,a]));
  const cat = (...parts) => {
    const size=parts.reduce((n,p)=>n+p.length,0), out=new Uint8Array(size); let at=0;
    for(const p of parts){out.set(p,at);at+=p.length;} return out;
  };
  const U16=n=>Uint8Array.of((n>>>8)&255,n&255);
  const U32=n=>Uint8Array.of((n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255);
  const I32=n=>U32(n>>>0);
  const A=s=>enc.encode(s);
  const pad4=b=>b.length%4?cat(b,new Uint8Array(4-b.length%4)):b;
  const pascal=s=>{let b=A(String(s||'Layer').replace(/[^\x20-\x7e]/g,'_').slice(0,255));return pad4(cat(Uint8Array.of(b.length),b));};
  function unicodeBlock(s){const str=String(s||'Layer');const data=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);data[i*2]=c>>>8;data[i*2+1]=c&255;}return cat(A('8BIMluni'),U32(4+data.length),U32(str.length),data);}
  function plane(imageData, channel){const {data,width,height}=imageData,out=new Uint8Array(width*height);for(let i=0,j=channel;i<out.length;i++,j+=4)out[i]=data[j];return out;}
  function layerRecord(layer,w,h){
    const d=layer.imageData; if(!d||d.width!==w||d.height!==h)throw new Error('PSD書き出し: レイヤー画像サイズが一致しません');
    const channels=[[-1,3],[0,0],[1,1],[2,2]];
    const rect=cat(I32(0),I32(0),I32(h),I32(w),U16(channels.length),...channels.map(([id])=>cat(U16(id),U32(2+w*h))));
    const key=BLEND_TO_PSD[layer.blend]||'norm';
    const flags=layer.visible===false?2:0;
    const extra=cat(U32(0),U32(0),pascal(layer.name),unicodeBlock(layer.name));
    const record=cat(rect,A('8BIM'),A(key),Uint8Array.of(Math.max(0,Math.min(255,Math.round((layer.opacity??1)*255))),0,flags,0),U32(extra.length),extra);
    const channelsData=channels.map(([id,ch])=>cat(U16(0),plane(d,ch)));
    return {record,channelsData};
  }
  function encode({width,height,layers,composite}){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new Error('PSDキャンバスサイズが不正です');
    if(width*height>24000000)throw new Error('PSDの8bit RGBAレイヤー書き出しは2400万px以下にしてください');
    if(!Array.isArray(layers)||!layers.length)throw new Error('PSDに書き出すレイヤーがありません');
    const topDown=[...layers].reverse();
    const built=topDown.map(l=>layerRecord(l,width,height));
    let records=cat(U16(built.length),...built.map(x=>x.record));
    const channelBytes=cat(...built.flatMap(x=>x.channelsData));
    let layerInfo=cat(records,channelBytes);
    if(layerInfo.length%2)layerInfo=cat(layerInfo,Uint8Array.of(0));
    const layerMask=cat(U32(layerInfo.length),layerInfo,U32(0));
    const header=cat(A('8BPS'),U16(1),new Uint8Array(6),U16(3),U32(height),U32(width),U16(8),U16(3));
    const empty=U32(0);
    const pixels=composite.getImageData(0,0,width,height);
    const merged=cat(U16(0),plane(pixels,0),plane(pixels,1),plane(pixels,2));
    return new Blob([header,empty,empty,U32(layerMask.length),layerMask,merged],{type:'image/vnd.adobe.photoshop'});
  }
  function readU16(v,p){return v.getUint16(p,false)}
  function readU32(v,p){return v.getUint32(p,false)}
  function readI32(v,p){return v.getInt32(p,false)}
  function readAscii(b,p,n){return String.fromCharCode(...b.subarray(p,p+n));}
  function unpackPackBits(src, expected){const out=new Uint8Array(expected);let i=0,o=0;while(i<src.length&&o<expected){let n=(src[i++]<<24)>>24;if(n>=0){const count=n+1;out.set(src.subarray(i,i+count),o);i+=count;o+=count;}else if(n!==-128){const count=1-n,val=src[i++];out.fill(val,o,o+count);o+=count;}}if(o<expected)throw new Error('PSD RLE行数据不完整');return out;}
  function decode(buffer){
    const bytes=new Uint8Array(buffer),v=new DataView(buffer); if(bytes.length<30||readAscii(bytes,0,4)!=='8BPS')throw new Error('PSDファイルではありません');
    if(readU16(v,4)!==1)throw new Error('PSB形式は未対応です');
    const channels=readU16(v,12),height=readU32(v,14),width=readU32(v,18),depth=readU16(v,22),mode=readU16(v,24);
    if(depth!==8||mode!==3)throw new Error('現在は8bit RGB PSDのみ対応しています（CMYK/16bit/32bitは未対応）');
    if(width<1||height<1||width*height>24000000)throw new Error('PSDキャンバスが大きすぎます（最大2400万px）');
    let p=26; const colorLen=readU32(v,p);p+=4+colorLen; const resourceLen=readU32(v,p);p+=4+resourceLen; // color mode and image resources
    const lmLen=readU32(v,p);p+=4; const lmEnd=p+lmLen; const layers=[];
    if(lmLen>=4){const liLen=readU32(v,p);p+=4;const liEnd=Math.min(p+liLen,lmEnd);let count=v.getInt16(p,false);p+=2;count=Math.abs(count);
      const recs=[];
      for(let i=0;i<count;i++){
        const top=readI32(v,p),left=readI32(v,p+4),bottom=readI32(v,p+8),right=readI32(v,p+12);p+=16;
        const cc=readU16(v,p);p+=2;const ch=[];for(let c=0;c<cc;c++){ch.push({id:v.getInt16(p,false),len:readU32(v,p+2)});p+=6;}
        const sig=readAscii(bytes,p,4);p+=4;const blend=readAscii(bytes,p,4);p+=4;const opacity=bytes[p]/255,flags=bytes[p+2];p+=4;const extraLen=readU32(v,p);p+=4;const extraEnd=p+extraLen;
        const maskLen=readU32(v,p);p+=4+maskLen;const rangeLen=readU32(v,p);p+=4+rangeLen;
        const pascalStart=p;const nameLen=bytes[p];let name=dec.decode(bytes.subarray(p+1,p+1+nameLen));p+=1+nameLen;while((p-pascalStart)%4!==0)p++;
        while(p+12<=extraEnd){const asig=readAscii(bytes,p,4),key=readAscii(bytes,p+4,4),len=readU32(v,p+8);p+=12;if(asig==='8BIM'&&key==='luni'&&len>=4){const chars=readU32(v,p),raw=bytes.subarray(p+4,p+4+chars*2);let t='';for(let z=0;z+1<raw.length;z+=2)t+=String.fromCharCode((raw[z]<<8)|raw[z+1]);if(t)name=t;}p+=len;if(len%2)p++;}
        p=extraEnd;recs.push({top,left,bottom,right,ch,blend,opacity,visible:!(flags&2),name:name||`Layer ${i+1}`});
      }
      for(const rec of recs){
        const w=Math.max(0,rec.right-rec.left),h=Math.max(0,rec.bottom-rec.top);const data=new Uint8ClampedArray(width*height*4);for(let i=3;i<data.length;i+=4)data[i]=0;
        for(const ch of rec.ch){const start=p,comp=readU16(v,p);p+=2;const expected=w*h;let plane;
          if(comp===0){plane=bytes.slice(p,p+expected);p=start+ch.len;}
          else if(comp===1){const rowLens=[];for(let y=0;y<h;y++){rowLens.push(readU16(v,p));p+=2;}plane=new Uint8Array(expected);let off=0;for(let y=0;y<h;y++){const row=unpackPackBits(bytes.subarray(p,p+rowLens[y]),w);plane.set(row,off);off+=w;p+=rowLens[y];}p=start+ch.len;}
          else throw new Error('PSD ZIP圧縮チャンネルは未対応です。Photoshopで「RLE」または「なし」を選んで保存してください');
          for(let y=0;y<h;y++){const dy=rec.top+y;if(dy<0||dy>=height)continue;for(let x=0;x<w;x++){const dx=rec.left+x;if(dx<0||dx>=width)continue;const dst=(dy*width+dx)*4,val=plane[y*w+x];if(ch.id===-1)data[dst+3]=val;else if(ch.id>=0&&ch.id<=2)data[dst+ch.id]=val;}}
        }
        for(let i=0;i<data.length;i+=4)if(data[i+3]===0){/* transparent pixels remain transparent */}
        const hasAlpha=rec.ch.some(x=>x.id===-1);if(!hasAlpha)for(let i=3;i<data.length;i+=4)data[i]=255;
        layers.push({name:rec.name,visible:rec.visible,opacity:rec.opacity,blend:PSD_TO_BLEND[rec.blend]||'source-over',data,width,height});
      }
    }
    if(!layers.length)throw new Error('このPSDに読み込み可能な標準ピクセルレイヤーがありません');
    layers.reverse();
    return {width,height,layers};
  }
  window.PFPSD={encode,decode};
})();
