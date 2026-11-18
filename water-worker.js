/* Off-main-thread pixel operations: flood fill and watercolor pigment diffusion. */
'use strict';
self.onmessage = (event) => {
  const { id, action, buffer, width, height, x, y, color, tolerance=24, amount=.45, edge=.25, iterations=8 } = event.data || {};
  try {
    const data = new Uint8ClampedArray(buffer);
    if (action === 'fill') runFill({id,data,width,height,x,y,color,tolerance});
    else if (action === 'diffuse') runDiffuse({id,data,width,height,amount,edge,iterations});
    else throw new Error('Unknown worker action');
  } catch (error) { self.postMessage({id,type:'error',message:error.message}); }
};
function runFill({id,data,width,height,x,y,color,tolerance}) {
  const sx=Math.floor(x), sy=Math.floor(y);
  if(sx<0||sy<0||sx>=width||sy>=height){self.postMessage({id,type:'done',buffer:data.buffer,count:0},[data.buffer]);return;}
  const start=(sy*width+sx)*4,target=[data[start],data[start+1],data[start+2],data[start+3]],fill=[color[0],color[1],color[2],255];
  if(target.every((v,i)=>v===fill[i])){self.postMessage({id,type:'done',buffer:data.buffer,count:0},[data.buffer]);return;}
  const matches=i=>Math.abs(data[i]-target[0])<=tolerance&&Math.abs(data[i+1]-target[1])<=tolerance&&Math.abs(data[i+2]-target[2])<=tolerance&&Math.abs(data[i+3]-target[3])<=tolerance;
  const stack=[sx,sy];let count=0;const total=width*height;const step=()=>{
    let work=0;
    while(stack.length && work<24000){const py=stack.pop(),px=stack.pop();if(px<0||py<0||px>=width||py>=height)continue;let pos=(py*width+px)*4;if(!matches(pos))continue;
      let left=px;while(left>0&&matches((py*width+left-1)*4))left--;
      let up=false,down=false;
      for(let xx=left;xx<width&&matches((py*width+xx)*4);xx++){
        pos=(py*width+xx)*4;data[pos]=fill[0];data[pos+1]=fill[1];data[pos+2]=fill[2];data[pos+3]=fill[3];count++;work++;
        if(py>0){const ok=matches(((py-1)*width+xx)*4);if(ok&&!up)stack.push(xx,py-1);up=ok;}
        if(py<height-1){const ok=matches(((py+1)*width+xx)*4);if(ok&&!down)stack.push(xx,py+1);down=ok;}
        if(work>=24000){if(xx+1<width&&matches((py*width+xx+1)*4))stack.push(xx+1,py);break;}
      }
    }
    self.postMessage({id,type:'progress',percent:Math.min(95,Math.round(count/total*100)),count});
    if(stack.length)setTimeout(step,0);else self.postMessage({id,type:'done',buffer:data.buffer,count},[data.buffer]);
  };
  step();
}
function runDiffuse({id,data,width,height,amount,edge,iterations}) {
  const pixels=width*height;
  if(pixels>8000000){self.postMessage({id,type:'error',message:'水彩シミュレーションは800万px以下で実行してください。先に画像サイズを下げてください。'});return;}
  const passes=Math.max(1,Math.min(16,iterations|0));
  let src=data, dst=new Uint8ClampedArray(data.length), pass=0;
  const chunkRows=48;
  function onePass(){
    let row=0;
    function rows(){
      const end=Math.min(height,row+chunkRows);
      for(let yy=row;yy<end;yy++){
        const y0=Math.max(0,yy-1),y1=Math.min(height-1,yy+1);
        for(let xx=0;xx<width;xx++){
          const i=(yy*width+xx)*4,a=src[i+3];
          if(a===0){dst[i]=src[i];dst[i+1]=src[i+1];dst[i+2]=src[i+2];dst[i+3]=0;continue;}
          const x0=Math.max(0,xx-1),x1=Math.min(width-1,xx+1);
          const ids=[i, (yy*width+x0)*4,(yy*width+x1)*4,(y0*width+xx)*4,(y1*width+xx)*4];
          let sums=[0,0,0],weights=0,alphaSum=0;
          for(const j of ids){const aa=src[j+3]/255;if(aa<=0)continue;const wt=j===i?2.4:1.0;weights+=wt*aa;alphaSum+=wt*aa;for(let c=0;c<3;c++)sums[c]+=src[j+c]*wt*aa;}
          const mix=Math.min(.24,Math.max(0,amount)*.045);
          for(let c=0;c<3;c++){const avg=weights?sums[c]/weights:src[i+c];dst[i+c]=src[i+c]*(1-mix)+avg*mix;}
          dst[i+3]=a;
        }
      }
      row=end;
      self.postMessage({id,type:'progress',percent:Math.round(((pass+row/height)/passes)*94),phase:`にじみ ${pass+1}/${passes}`});
      if(row<height)setTimeout(rows,0);else{[src,dst]=[dst,src];pass++;if(pass<passes)setTimeout(onePass,0);else finish();}
    }
    rows();
  }
  function finish(){
    // A restrained pigment-ring pass: slightly darken pixels at strong alpha boundaries.
    if(edge>0){const factor=Math.min(.18,edge*.18);for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=(y*width+x)*4,a=src[i+3];if(a<8)continue;const gx=Math.abs(src[i-4+3]-src[i+4+3])+Math.abs(src[i-width*4+3]-src[i+width*4+3]);if(gx>120){for(let c=0;c<3;c++)src[i+c]=Math.max(0,src[i+c]*(1-factor));}}}
    self.postMessage({id,type:'done',buffer:src.buffer,count:pixels},[src.buffer]);
  }
  onePass();
}
