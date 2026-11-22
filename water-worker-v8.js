/* PIXEL FORGE v8 pixel worker: bounded scanline fill + chunked pigment/water diffusion. */
'use strict';
self.onmessage = (event) => {
  const msg = event.data || {};
  const { id, action, buffer, width, height } = msg;
  try {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || !buffer) throw new Error('画像データが不正です');
    const data = new Uint8ClampedArray(buffer);
    if (data.length !== width * height * 4) throw new Error('画像データのサイズが一致しません');
    if (action === 'fill') runFill({ ...msg, id, data, width, height });
    else if (action === 'diffuse') runDiffuse({ ...msg, id, data, width, height });
    else throw new Error('Unknown pixel action: ' + action);
  } catch (error) {
    self.postMessage({ id, type: 'error', message: error?.message || String(error) });
  }
};

function runFill({ id, data, width, height, x, y, color, tolerance = 24, opacity = 1, contiguous = true, feather = 0 }) {
  const sx = Math.floor(Number(x)), sy = Math.floor(Number(y));
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) {
    self.postMessage({ id, type: 'done', buffer: data.buffer, count: 0, bounds: null }, [data.buffer]); return;
  }
  if (!Array.isArray(color) || color.length < 3) throw new Error('塗り色が不正です');
  const seedIndex = (sy * width + sx) * 4;
  const tr = data[seedIndex], tg = data[seedIndex + 1], tb = data[seedIndex + 2], ta = data[seedIndex + 3];
  const fr = color[0] | 0, fg = color[1] | 0, fb = color[2] | 0, fa = Math.max(0, Math.min(255, Math.round(255 * opacity)));
  if (tr === fr && tg === fg && tb === fb && ta === fa) {
    self.postMessage({ id, type: 'done', buffer: data.buffer, count: 0, bounds: null }, [data.buffer]); return;
  }
  const tol = Math.max(0, Math.min(255, tolerance | 0));
  const matches = (i) => Math.abs(data[i] - tr) <= tol && Math.abs(data[i + 1] - tg) <= tol && Math.abs(data[i + 2] - tb) <= tol && Math.abs(data[i + 3] - ta) <= tol;
  let count = 0, minX = width, minY = height, maxX = -1, maxY = -1;
  const featherPx=Math.max(0,Math.min(8,feather|0)), mask=featherPx?new Uint8Array(width*height):null;
  const paint = (i, px, py) => {
    data[i] = fr; data[i + 1] = fg; data[i + 2] = fb; data[i + 3] = fa; if(mask)mask[(py*width)+px]=1;
    count++; if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
  };
  const total = width * height;
  const finish = () => {
    if(mask && maxX>=0){
      const ox=Math.max(0,minX-featherPx),oy=Math.max(0,minY-featherPx),ex=Math.min(width-1,maxX+featherPx),ey=Math.min(height-1,maxY+featherPx);
      for(let py=oy;py<=ey;py++)for(let px=ox;px<=ex;px++){
        const mi=py*width+px;if(mask[mi])continue;let best=0;
        for(let dy=-featherPx;dy<=featherPx;dy++)for(let dx=-featherPx;dx<=featherPx;dx++){const xx=px+dx,yy=py+dy;if(xx<0||yy<0||xx>=width||yy>=height||!mask[yy*width+xx])continue;const dist=Math.hypot(dx,dy);if(dist<=featherPx)best=Math.max(best,(featherPx+1-dist)/(featherPx+1)*.45);}
        if(best>0){const i=mi*4;data[i]=data[i]*(1-best)+fr*best;data[i+1]=data[i+1]*(1-best)+fg*best;data[i+2]=data[i+2]*(1-best)+fb*best;data[i+3]=Math.max(data[i+3],Math.round(fa*best));}
      }
      minX=ox;minY=oy;maxX=ex;maxY=ey;
    }
    const bounds = maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    self.postMessage({ id, type: 'done', buffer: data.buffer, count, bounds }, [data.buffer]);
  };
  if (!contiguous) {
    let row = 0;
    const scan = () => {
      const end = Math.min(height, row + 40);
      for (; row < end; row++) {
        let i = row * width * 4;
        for (let col = 0; col < width; col++, i += 4) if (matches(i)) paint(i, col, row);
      }
      self.postMessage({ id, type: 'progress', percent: Math.min(96, Math.round(row / height * 96)), phase: '同色領域を検索中' });
      if (row < height) setTimeout(scan, 0); else finish();
    };
    scan(); return;
  }
  const stack = [sx, sy]; let workTotal = 0;
  const step = () => {
    let work = 0;
    while (stack.length && work < 26000) {
      const py = stack.pop(), px = stack.pop();
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      let i = (py * width + px) * 4; if (!matches(i)) continue;
      let left = px; while (left > 0 && matches((py * width + left - 1) * 4)) left--;
      let up = false, down = false;
      for (let xx = left; xx < width; xx++) {
        i = (py * width + xx) * 4; if (!matches(i)) break;
        paint(i, xx, py); work++; workTotal++;
        if (py > 0) { const ok = matches(((py - 1) * width + xx) * 4); if (ok && !up) stack.push(xx, py - 1); up = ok; }
        if (py < height - 1) { const ok = matches(((py + 1) * width + xx) * 4); if (ok && !down) stack.push(xx, py + 1); down = ok; }
        if (work >= 26000) { if (xx + 1 < width && matches((py * width + xx + 1) * 4)) stack.push(xx + 1, py); break; }
      }
    }
    self.postMessage({ id, type: 'progress', percent: Math.min(96, Math.round(count / total * 100)), phase: '隣接領域を塗りつぶし中' });
    if (stack.length) setTimeout(step, 0); else finish();
  };
  step();
}

function runDiffuse({ id, data, width, height, amount = .55, diffusion = .56, edge = .3, iterations = 5, pigment = .25, absorption = .48, granulation = .24, drying = .38, paperTooth = .35, paperFiber = .25 }) {
  const pixels = width * height;
  if (pixels > 16000000) throw new Error('水彩処理範囲は1600万px以下にしてください');
  const passes = Math.max(1, Math.min(12, iterations | 0));
  const amt = Math.max(0, Math.min(1, amount));
  const absorb = Math.max(0, Math.min(1, absorption));
  const dry = Math.max(0, Math.min(1, drying));
  const gran = Math.max(0, Math.min(1, granulation));
  const diff = Math.max(0, Math.min(1, diffusion));
  const tooth = Math.max(0, Math.min(1, paperTooth));
  const fiber = Math.max(0, Math.min(1, paperFiber));
  const spread = Math.min(.24, amt * (.055 + diff * .17) * (1 - absorb * .24));
  const mix = Math.min(.24, amt * (.07 + diff * .11 + tooth * .018) * (1 - absorb * .22));
  const wetDiffusion = Math.min(.48, .07 + diff * .37 * (1 - absorb * .35));
  const wetDrying = .003 + dry * .018 + fiber * .001;
  let src = data;
  let dst = new Uint8ClampedArray(data.length);
  // A separate water field lets color and moisture travel at different rates.
  let wet = new Float32Array(pixels), wetNext = new Float32Array(pixels);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) wet[p] = (data[i + 3] / 255) * amt * (1 - absorb * .22);
  const chunkRows = 24;
  let pass = 0;

  function processPass() {
    let row = 0;
    const rows = () => {
      const end = Math.min(height, row + chunkRows);
      for (let y = row; y < end; y++) {
        const ym = Math.max(0, y - 1), yp = Math.min(height - 1, y + 1);
        for (let x = 0; x < width; x++) {
          const xm = Math.max(0, x - 1), xp = Math.min(width - 1, x + 1);
          const p = y * width + x, i = p * 4;
          const oldA = src[i + 3] / 255;
          let colorWeight = 0, sumR = 0, sumG = 0, sumB = 0, alphaSum = 0, wetSum = 0, kernelSum = 0;
          // 3×3 finite-difference kernel. No temporary arrays are allocated per pixel.
          for (let oy = -1; oy <= 1; oy++) {
            const yy = oy < 0 ? ym : (oy > 0 ? yp : y);
            for (let ox = -1; ox <= 1; ox++) {
              const xx = ox < 0 ? xm : (ox > 0 ? xp : x);
              const q = yy * width + xx, j = q * 4;
              const k = (ox === 0 && oy === 0) ? 3.6 : ((ox === 0 || oy === 0) ? 1 : .48);
              const a = src[j + 3] / 255, wv = wet[q];
              const kw = k * (a > 0 ? (0.28 + wv * .72) : .08);
              kernelSum += k;
              alphaSum += a * k;
              wetSum += wv * k;
              if (a > .001) {
                const cw = kw * a;
                colorWeight += cw;
                sumR += src[j] * cw; sumG += src[j + 1] * cw; sumB += src[j + 2] * cw;
              }
            }
          }
          const avgA = alphaSum / kernelSum;
          const avgWet = wetSum / kernelSum;
          const localWet = wet[p];
          const aMix = spread * (.22 + localWet * .78);
          const newA = Math.max(0, Math.min(1, oldA + (avgA - oldA) * aMix));
          const cMix = mix * (.18 + localWet * .82);
          if (colorWeight > 1e-5) {
            const r = sumR / colorWeight, g = sumG / colorWeight, b = sumB / colorWeight;
            dst[i] = src[i] + (r - src[i]) * cMix;
            dst[i + 1] = src[i + 1] + (g - src[i + 1]) * cMix;
            dst[i + 2] = src[i + 2] + (b - src[i + 2]) * cMix;
          } else { dst[i] = src[i]; dst[i + 1] = src[i + 1]; dst[i + 2] = src[i + 2]; }
          // Capillary flow through the paper, followed by gradual evaporation.
          let nextWet = localWet + (avgWet - localWet) * wetDiffusion - localWet * wetDrying;
          nextWet = Math.max(0, Math.min(1, nextWet));
          wetNext[p] = nextWet;
          let grain = 0;
          if (pigment > 0 && gran > 0 && newA > .015) {
            // Soft, continuous pigment blooms instead of independent pixel speckles.
            const u = (x + .5) / Math.max(1, width), v = (y + .5) / Math.max(1, height);
            const field = .52 * Math.sin(u * 12.4 + Math.sin(v * 8.2 + pass * .21) * 1.25)
              + .29 * Math.cos(v * 10.6 + Math.sin(u * 6.8 - pass * .13) * .9)
              + .19 * Math.sin((u + v) * 8.1 + pass * .17);
            grain = field * pigment * gran * (.012 + tooth * .026 + fiber * .010) * (1 - nextWet * .45);
          }
          const u = (x + .5) / Math.max(1, width), v = (y + .5) / Math.max(1, height);
          const fiberField = .58 * Math.sin(u * 14.2 + v * 2.7) + .42 * Math.cos(v * 11.6 - u * 1.9);
          const tone = 1 + grain + fiber * tooth * .008 * fiberField;
          dst[i] = Math.max(0, Math.min(255, dst[i] * tone));
          dst[i + 1] = Math.max(0, Math.min(255, dst[i + 1] * tone));
          dst[i + 2] = Math.max(0, Math.min(255, dst[i + 2] * tone));
          dst[i + 3] = Math.round(newA * 255);
        }
      }
      row = end;
      self.postMessage({ id, type: 'progress', percent: Math.min(82, Math.round((pass + row / height) / passes * 82)), phase: `水分・顔料の拡散 ${pass + 1}/${passes}` });
      if (row < height) setTimeout(rows, 0);
      else {
        [src, dst] = [dst, src]; [wet, wetNext] = [wetNext, wet];
        pass++;
        if (pass < passes) setTimeout(processPass, 0); else finishEdges();
      }
    };
    rows();
  }

  function finishEdges() {
    const factor = Math.min(.24, Math.max(0, edge) * .19 * (1 - dry * .3));
    if (factor <= 0 || height < 3 || width < 3) { finish(); return; }
    let y = 1;
    const edges = () => {
      const end = Math.min(height - 1, y + 32);
      for (; y < end; y++) for (let x = 1; x < width - 1; x++) {
        const p = y * width + x, i = p * 4, a = src[i + 3]; if (a < 8) continue;
        const gx = Math.abs(src[i - 4 + 3] - src[i + 4 + 3]) + Math.abs(src[i - width * 4 + 3] - src[i + width * 4 + 3]);
        if (gx > 70) {
          const wetFactor = wet[p];
          const dark = 1 - factor * Math.min(1, gx / 280) * (1 - wetFactor * .55);
          src[i] *= dark; src[i + 1] *= dark; src[i + 2] *= dark;
        }
      }
      self.postMessage({ id, type: 'progress', percent: 82 + Math.round(y / height * 16), phase: '乾き際・顔料リングを計算中' });
      if (y < height - 1) setTimeout(edges, 0); else finish();
    };
    edges();
  }
  function finish() {
    self.postMessage({ id, type: 'done', buffer: src.buffer, count: pixels, bounds: { x: 0, y: 0, w: width, h: height } }, [src.buffer]);
  }
  processPass();
}
