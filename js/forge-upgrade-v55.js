/* PIXEL FORGE STUDIO v55.0 — additive workspace, palette, storage and security tools. */
(() => {
  'use strict';

  const VERSION = '55.0.0';
  const PREF_KEY = 'pf-forge-upgrade-v55';
  const MAX_PALETTE_COLORS = 80;
  const api = () => window.PF_STUDIO_API;
  const $ = (id) => document.getElementById(id);
  let root = null;
  let activeTab = 'overview';
  let restoreFocus = null;
  let palette = readPreferences();
  let busy = false;
  const approvedFiles = new WeakMap();
  const opacityOriginal = new WeakMap();
  const recentColors = new Set(palette.recent || []);

  function readPreferences() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      return {
        version: 1,
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter(isHex).slice(0, MAX_PALETTE_COLORS) : [],
        recent: Array.isArray(parsed.recent) ? parsed.recent.filter(isHex).slice(0, 24) : []
      };
    } catch (_) {
      return { version: 1, favorites: [], recent: [] };
    }
  }

  function persistPreferences() {
    try {
      const safe = {
        version: 1,
        favorites: [...new Set(palette.favorites.filter(isHex))].slice(0, MAX_PALETTE_COLORS),
        recent: [...recentColors].filter(isHex).slice(0, 24)
      };
      localStorage.setItem(PREF_KEY, JSON.stringify(safe));
      palette = safe;
      return true;
    } catch (error) {
      notify('パレット設定を保存できません: ' + safeMessage(error));
      return false;
    }
  }

  function isHex(value) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function safeMessage(error) { return String(error?.message || error || '不明なエラー').slice(0, 180); }
  function safeFileName(value) {
    return String(value || 'PIXEL-FORGE')
      .normalize('NFKC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 64) || 'PIXEL-FORGE';
  }
  function notify(message) {
    if (api()?.toast) api().toast(String(message));
    else console.info('[PIXEL FORGE v55]', message);
  }
  function createButton(label, action, className = 'pf55-btn') {
    const button = document.createElement('button');
    button.type = 'button'; button.className = className; button.textContent = label;
    button.addEventListener('click', action);
    return button;
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name; link.rel = 'noopener';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function mount() {
    if (!document.body || !api() || $('pf55Hub')) return false;
    root = document.createElement('div');
    root.id = 'pf55Hub';
    root.className = 'pf55-backdrop';
    root.hidden = true;
    root.innerHTML = `
      <section class="pf55-dialog" role="dialog" aria-modal="true" aria-labelledby="pf55Title" tabindex="-1">
        <header class="pf55-head">
          <div><span class="pf55-eyebrow">PIXEL FORGE · WORKSPACE TOOLS</span><h2 id="pf55Title">FORGE CONTROL CENTER</h2><p>作品を壊さず、制作・管理・安全確認をまとめて操作</p></div>
          <button type="button" class="pf55-close" data-pf55-close aria-label="閉じる">×</button>
        </header>
        <nav class="pf55-tabs" aria-label="強化ツール">
          <button type="button" data-pf55-tab="overview" aria-selected="true">概要</button>
          <button type="button" data-pf55-tab="layers" aria-selected="false">レイヤー</button>
          <button type="button" data-pf55-tab="color" aria-selected="false">カラー</button>
          <button type="button" data-pf55-tab="canvas" aria-selected="false">表示・キャンバス</button>
          <button type="button" data-pf55-tab="backup" aria-selected="false">保存・バックアップ</button>
          <button type="button" data-pf55-tab="security" aria-selected="false">安全・診断</button>
        </nav>
        <main class="pf55-content" id="pf55Content" tabindex="0"></main>
        <footer class="pf55-foot"><span>v55.0 · 既存の作品形式 v5 / IndexedDB v3 を維持</span><button type="button" data-pf55-close>閉じる</button></footer>
      </section>`;
    document.body.appendChild(root);
    root.addEventListener('click', (event) => {
      if (event.target === root || event.target.closest('[data-pf55-close]')) closeHub();
      const tab = event.target.closest('[data-pf55-tab]');
      if (tab) renderTab(tab.dataset.pf55Tab);
    });
    root.addEventListener('input', handleInput);
    root.addEventListener('change', handleChange);
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeHub(); }
      if (event.key === 'Tab') trapFocus(event);
    });

    const desktopActions = $('.pf-home-header .pf-home-actions');
    if (desktopActions) desktopActions.appendChild(createButton('✦ 強化ツール', openHub, 'pf-home-btn pf55-home-trigger'));
    const mobileActions = $('.pf-home-mobile-head-actions');
    if (mobileActions) {
      const b = createButton('✦', openHub, 'pf-mobile-icon-btn pf55-mobile-trigger');
      b.setAttribute('aria-label', '強化ツール'); b.title = '強化ツール'; mobileActions.appendChild(b);
    }
    const context = $('.contextbar');
    if (context) context.appendChild(createButton('FORGE+', openHub, 'smallbtn pf55-editor-trigger'));
    document.addEventListener('keydown', handleShortcut);
    document.addEventListener('change', guardFileImport, true);
    document.addEventListener('change', rememberColorEvent, true);
    window.addEventListener('pf:history-state', refreshIfOpen);
    window.PF_UPGRADE_V55 = Object.freeze({ version: VERSION, open: openHub, close: closeHub, diagnostics: getUpgradeDiagnostics });
    return true;
  }

  function openHub() {
    if (!root) return;
    restoreFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add('pf55-open');
    renderTab(activeTab);
    requestAnimationFrame(() => root.querySelector('.pf55-dialog')?.focus({ preventScroll: true }));
  }
  function closeHub() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove('pf55-open');
    restoreFocus?.focus?.({ preventScroll: true });
    restoreFocus = null;
  }
  function trapFocus(event) {
    const nodes = [...root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')]
      .filter(node => !node.hidden && node.getClientRects().length);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function handleShortcut(event) {
    if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey) {
      const target = event.target;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      event.preventDefault(); openHub();
    }
  }
  function refreshIfOpen() { if (root && !root.hidden) renderTab(activeTab); }

  function renderTab(tab) {
    activeTab = ['overview', 'layers', 'color', 'canvas', 'backup', 'security'].includes(tab) ? tab : 'overview';
    root.querySelectorAll('[data-pf55-tab]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.pf55Tab === activeTab)));
    const content = $('pf55Content');
    content.replaceChildren();
    const renderer = ({ overview: renderOverview, layers: renderLayers, color: renderColor, canvas: renderCanvas, backup: renderBackup, security: renderSecurity })[activeTab];
    renderer(content);
  }
  function section(title, description = '') {
    const box = document.createElement('section'); box.className = 'pf55-section';
    const h = document.createElement('h3'); h.textContent = title; box.appendChild(h);
    if (description) { const p = document.createElement('p'); p.className = 'pf55-muted'; p.textContent = description; box.appendChild(p); }
    return box;
  }
  function metric(label, value) {
    const box = document.createElement('div'); box.className = 'pf55-metric';
    const b = document.createElement('b'); b.textContent = value;
    const span = document.createElement('span'); span.textContent = label;
    box.append(b, span); return box;
  }
  function addField(parent, label, control) {
    const row = document.createElement('label'); row.className = 'pf55-field';
    const span = document.createElement('span'); span.textContent = label;
    row.append(span, control); parent.appendChild(row); return control;
  }
  function addNote(parent, text) { const note = document.createElement('p'); note.className = 'pf55-note'; note.textContent = text; parent.appendChild(note); }

  function renderOverview(parent) {
    const m = api().getMetrics();
    const stats = document.createElement('div'); stats.className = 'pf55-metrics';
    stats.append(metric('キャンバス', `${m.width} × ${m.height}`), metric('レイヤー', String(m.layerCount)), metric('ズーム', `${Math.round(m.zoom * 100)}%`), metric('Undo履歴', `${m.historyCount} / Redo ${m.redoCount}`));
    parent.appendChild(stats);
    const quick = section('クイック操作', '既存の編集エンジンへ安全に接続します。');
    const actions = document.createElement('div'); actions.className = 'pf55-action-grid';
    actions.append(
      createButton('通常保存', () => api().saveNow().catch(e => notify('保存に失敗しました: ' + safeMessage(e)))),
      createButton('元に戻す', () => $('undoBtn')?.click()),
      createButton('やり直す', () => $('redoBtn')?.click()),
      createButton('全体表示', () => api().fitView()),
      createButton('ブラシ', () => api().setTool('brush')),
      createButton('消しゴム', () => api().setTool('eraser')),
      createButton('新規レイヤー', () => { api().addLayer('Layer ' + (api().getMetrics().layerCount + 1)); renderTab('layers'); })
    );
    quick.appendChild(actions); parent.appendChild(quick);
    const health = section('作業状態', '保存先と描画環境の概要です。');
    const status = document.createElement('div'); status.className = 'pf55-inline-status';
    status.textContent = `描画品質: ${m.renderQuality} · 低メモリモード: ${m.lowMemory ? 'ON' : 'OFF'} · 紙質: ${m.paperTexture || 'なし'}`;
    health.appendChild(status); parent.appendChild(health);
    const shortcut = section('ショートカット', 'このパネルは Alt + Shift + F でも開けます。');
    addNote(shortcut, '既存ショートカットは変更しません。文字入力中は追加ショートカットを無効にします。'); parent.appendChild(shortcut);
  }

  function renderLayers(parent) {
    const layers = api().getLayers();
    const tools = section('レイヤー管理', `${layers.length} レイヤー · 選択、表示切替、不透明度、名前変更、複製に対応`);
    const toolbar = document.createElement('div'); toolbar.className = 'pf55-action-grid';
    toolbar.append(createButton('＋ レイヤー', () => { api().addLayer('Layer ' + (api().getMetrics().layerCount + 1)); renderTab('layers'); }),
      createButton('複製', () => { api().duplicateLayer(); renderTab('layers'); }));
    tools.appendChild(toolbar);
    const list = document.createElement('div'); list.className = 'pf55-layer-list';
    [...layers].reverse().forEach(layer => {
      const row = document.createElement('article'); row.className = 'pf55-layer-row';
      if (layer.id === api().getMetrics().activeId) row.classList.add('is-active');
      const select = createButton(layer.name || 'Layer', () => { api().selectLayer(layer.id); renderTab('layers'); }, 'pf55-layer-select');
      select.title = `レイヤー ${layer.id} を選択`;
      const visibility = createButton(layer.visible ? '表示中' : '非表示', () => { api().setLayerVisibility(layer.id, !layer.visible); renderTab('layers'); }, 'pf55-visibility');
      visibility.setAttribute('aria-pressed', String(layer.visible));
      const rename = createButton('名前', () => { const value = prompt('レイヤー名', layer.name); if (value !== null && value.trim()) { api().setLayerName(layer.id, value.trim().slice(0, 80)); renderTab('layers'); } });
      const opacity = document.createElement('input'); opacity.type = 'range'; opacity.min = '0'; opacity.max = '100'; opacity.value = String(Math.round(layer.opacity * 100)); opacity.setAttribute('aria-label', `${layer.name}の不透明度`); opacity.dataset.layerOpacity = String(layer.id);
      const output = document.createElement('output'); output.textContent = `${Math.round(layer.opacity * 100)}%`;
      const line = document.createElement('div'); line.className = 'pf55-layer-controls'; line.append(visibility, rename);
      row.append(select, line, opacity, output); list.appendChild(row);
    });
    tools.appendChild(list); parent.appendChild(tools);
    addNote(parent, '削除・結合・マスクなどの不可逆操作は既存UIから行ってください。ここでは安全に確認できる操作のみ提供します。');
  }

  function hexToRgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
  function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase(); }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, s = 0, l = (max + min) / 2;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); switch (max) { case r: h = ((g - b) / d) % 6; break; case g: h = (b - r) / d + 2; break; default: h = (r - g) / d + 4; } h *= 60; if (h < 0) h += 360; }
    return [h, s, l];
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    let rgb = [0, 0, 0];
    if (h < 60) rgb = [c, x, 0]; else if (h < 120) rgb = [x, c, 0]; else if (h < 180) rgb = [0, c, x]; else if (h < 240) rgb = [0, x, c]; else if (h < 300) rgb = [x, 0, c]; else rgb = [c, 0, x];
    return rgbToHex(...rgb.map(v => (v + m) * 255));
  }
  function currentColor() { return isHex(api().getMetrics().color) ? api().getMetrics().color.toUpperCase() : '#222B3A'; }
  function rememberColor(color) {
    if (!isHex(color)) return;
    recentColors.delete(color.toUpperCase()); recentColors.add(color.toUpperCase());
    while (recentColors.size > 24) recentColors.delete(recentColors.values().next().value);
    palette.recent = [...recentColors]; persistPreferences();
  }
  function rememberColorEvent(event) {
    if (event.target?.id === 'colorPicker' && isHex(event.target.value)) rememberColor(event.target.value);
  }
  function swatchButton(color, parent, isFavorite = false) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pf55-swatch'; b.style.backgroundColor = color; b.title = `${color} · クリックで使用`; b.setAttribute('aria-label', `${color}を使用`);
    b.addEventListener('click', () => { api().setColor(color); rememberColor(color); notify('色を ' + color + ' に変更しました'); });
    b.addEventListener('contextmenu', event => { event.preventDefault(); if (isFavorite) { palette.favorites = palette.favorites.filter(v => v !== color); persistPreferences(); renderTab('color'); } else { addFavorite(color); renderTab('color'); } });
    parent.appendChild(b); return b;
  }
  function addFavorite(color) {
    if (!isHex(color)) return;
    palette.favorites = [...new Set([color.toUpperCase(), ...palette.favorites])].slice(0, MAX_PALETTE_COLORS);
    persistPreferences(); notify('お気に入りパレットへ追加しました');
  }
  function harmonyColors(color) {
    const [h, s, l] = rgbToHsl(...hexToRgb(color));
    return [0, 30, -30, 180, 150, 210, 120, 240].map(offset => hslToHex(h + offset, s, l));
  }
  function luminance(hex) {
    const values = hexToRgb(hex).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
  }
  function contrastRatio(a, b) { const vals = [luminance(a), luminance(b)].sort((x, y) => y - x); return (vals[0] + .05) / (vals[1] + .05); }

  function renderColor(parent) {
    const color = currentColor();
    const pickerSection = section('色の管理', '現在色、配色候補、履歴、お気に入りをまとめて扱います。');
    const current = document.createElement('div'); current.className = 'pf55-current-color';
    const input = document.createElement('input'); input.type = 'color'; input.value = color; input.setAttribute('aria-label', '現在色');
    input.addEventListener('input', () => { api().setColor(input.value); rememberColor(input.value); updateHarmonyPreview(pickerSection, input.value); });
    const hex = document.createElement('code'); hex.textContent = color;
    const add = createButton('お気に入りへ追加', () => addFavorite(input.value));
    const copy = createButton('HEXをコピー', async () => { try { if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable'); await navigator.clipboard.writeText(input.value.toUpperCase()); notify('HEXをコピーしました'); } catch (_) { notify('クリップボードを利用できません'); } });
    current.append(input, hex, add, copy); pickerSection.appendChild(current);
    const harmony = document.createElement('div'); harmony.className = 'pf55-swatch-grid'; harmony.dataset.harmony = 'true';
    harmonyColors(color).forEach(c => swatchButton(c, harmony));
    pickerSection.appendChild(harmony); parent.appendChild(pickerSection);

    const recent = section('最近使った色', '色をクリックで使用。右クリックでお気に入りへ追加。');
    const recentGrid = document.createElement('div'); recentGrid.className = 'pf55-swatch-grid';
    [...recentColors].reverse().forEach(c => swatchButton(c, recentGrid));
    if (!recentGrid.childElementCount) addNote(recent, 'まだ色の履歴はありません。カラーを変更すると記録されます。');
    recent.appendChild(recentGrid); parent.appendChild(recent);

    const favorites = section('お気に入りパレット', '右クリックでお気に入りから削除できます。');
    const favoriteGrid = document.createElement('div'); favoriteGrid.className = 'pf55-swatch-grid';
    palette.favorites.forEach(c => swatchButton(c, favoriteGrid, true));
    if (!favoriteGrid.childElementCount) addNote(favorites, '現在色や配色候補を追加してください。');
    favorites.appendChild(favoriteGrid);
    const actions = document.createElement('div'); actions.className = 'pf55-action-grid';
    actions.append(createButton('作品から色を抽出', extractPaletteFromArtwork), createButton('パレットを書き出す', exportPalette));
    const importButton = createButton('パレットを読み込む', () => $('pf55PaletteInput').click());
    actions.appendChild(importButton); favorites.appendChild(actions); parent.appendChild(favorites);
    const contrast = section('コントラスト確認', '現在色と白・黒のコントラスト比を表示します。');
    const dark = contrastRatio(color, '#000000').toFixed(2), light = contrastRatio(color, '#FFFFFF').toFixed(2);
    addNote(contrast, `黒との比率 ${dark}:1 · 白との比率 ${light}:1 · 文字用途では4.5:1以上が一般的な目安です。`);
    parent.appendChild(contrast);
    if (!$('pf55PaletteInput')) {
      const file = document.createElement('input'); file.type = 'file'; file.id = 'pf55PaletteInput'; file.accept = '.json,application/json'; file.hidden = true;
      file.addEventListener('change', importPalette); document.body.appendChild(file);
    }
  }
  function updateHarmonyPreview(container, color) {
    const grid = container.querySelector('[data-harmony]'); if (!grid) return;
    grid.replaceChildren(); harmonyColors(color).forEach(c => swatchButton(c, grid));
  }
  async function extractPaletteFromArtwork() {
    try {
      const source = api().getComposite();
      if (!source) throw new Error('作品の合成画像を取得できません');
      const c = document.createElement('canvas'); c.width = 80; c.height = 80;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, 0, 0, 80, 80);
      const data = ctx.getImageData(0, 0, 80, 80).data; const bins = new Map();
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3] < 32) continue;
        const r = data[i] >> 3, g = data[i + 1] >> 3, b = data[i + 2] >> 3;
        const key = (r << 10) | (g << 5) | b;
        let item = bins.get(key); if (!item) bins.set(key, item = { r: 0, g: 0, b: 0, n: 0 });
        item.r += data[i]; item.g += data[i + 1]; item.b += data[i + 2]; item.n++;
      }
      const colors = [...bins.values()].sort((a, b) => b.n - a.n).slice(0, 12).map(x => rgbToHex(x.r / x.n, x.g / x.n, x.b / x.n));
      if (!colors.length) throw new Error('抽出できる不透明な色がありません');
      palette.favorites = [...new Set([...colors, ...palette.favorites])].slice(0, MAX_PALETTE_COLORS);
      persistPreferences(); notify(`${colors.length}色を作品から抽出しました`); renderTab('color');
    } catch (error) { notify('色の抽出に失敗しました: ' + safeMessage(error)); }
  }
  function exportPalette() {
    const data = { format: 'PIXEL_FORGE_PALETTE', version: 1, exportedAt: new Date().toISOString(), colors: [...new Set(palette.favorites)].slice(0, MAX_PALETTE_COLORS) };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), 'PixelForge-Palette-v1.json');
    notify('パレットを書き出しました');
  }
  async function importPalette(event) {
    const input = event.target, file = input.files?.[0]; if (!file) return;
    try {
      if (file.size > 256 * 1024) throw new Error('パレットファイルは256KB以下にしてください');
      const data = JSON.parse(await file.text());
      if (data?.format !== 'PIXEL_FORGE_PALETTE' || !Array.isArray(data.colors) || data.colors.length > MAX_PALETTE_COLORS) throw new Error('パレット形式が正しくありません');
      const colors = data.colors.filter(isHex).map(v => v.toUpperCase());
      if (!colors.length) throw new Error('有効なHEXカラーがありません');
      palette.favorites = [...new Set([...colors, ...palette.favorites])].slice(0, MAX_PALETTE_COLORS);
      persistPreferences(); notify(`${colors.length}色を読み込みました`); renderTab('color');
    } catch (error) { notify('パレットを読み込めません: ' + safeMessage(error)); }
    finally { input.value = ''; }
  }

  function zoomAroundCenter(value) {
    const view = api().getView(), stage = $('stage');
    if (!stage) return;
    const rect = stage.getBoundingClientRect(), cx = rect.width / 2, cy = rect.height / 2;
    const worldX = (cx - view.panX) / view.zoom, worldY = (cy - view.panY) / view.zoom;
    const zoom = clamp(value, .05, 8);
    api().setView(zoom, cx - worldX * zoom, cy - worldY * zoom);
    renderTab('canvas');
  }
  function renderCanvas(parent) {
    const view = api().getView(), canvas = section('表示倍率', 'ズームは表示だけを変更し、作品のピクセルデータには影響しません。');
    const grid = document.createElement('div'); grid.className = 'pf55-action-grid';
    [0.25, 0.5, 1, 2, 4].forEach(v => grid.appendChild(createButton(`${v * 100}%`, () => zoomAroundCenter(v))));
    grid.appendChild(createButton('全体表示', () => { api().fitView(); renderTab('canvas'); }));
    grid.appendChild(createButton('実ピクセル', () => zoomAroundCenter(1)));
    canvas.appendChild(grid);
    addNote(canvas, `現在 ${Math.round(view.zoom * 100)}% · キャンバス ${view.width} × ${view.height}px`);
    parent.appendChild(canvas);

    const expand = section('キャンバスを中央基準で拡張', '絵を縮小せず、上下左右へ均等に余白を追加します。');
    const fields = document.createElement('div'); fields.className = 'pf55-expand-fields';
    const w = document.createElement('input'); w.type = 'number'; w.min = '0'; w.max = '5000'; w.step = '1'; w.value = '128'; w.id = 'pf55ExpandW';
    const h = document.createElement('input'); h.type = 'number'; h.min = '0'; h.max = '5000'; h.step = '1'; h.value = '128'; h.id = 'pf55ExpandH';
    addField(fields, '追加幅(px)', w); addField(fields, '追加高さ(px)', h);
    expand.appendChild(fields);
    expand.appendChild(createButton('キャンバスを拡張', () => {
      const extraW = clamp(Math.floor(Number(w.value) || 0), 0, 5000), extraH = clamp(Math.floor(Number(h.value) || 0), 0, 5000);
      if (!extraW && !extraH) { notify('追加する幅か高さを入力してください'); return; }
      const m = api().getMetrics();
      if ((m.width + extraW) * (m.height + extraH) > 20000000) { notify('拡張後のサイズが2000万pxを超えます'); return; }
      if (!confirm(`${m.width + extraW} × ${m.height + extraH}px に拡張します。既存の絵は中央に保持されます。安全のため、実行後は現在のUndo/Redo履歴がリセットされます。重要な作品は先にバックアップしてください。続行しますか？`)) return;
      if (api().expandCanvas(extraW, extraH)) { notify('キャンバスを拡張しました'); renderTab('overview'); }
    }));
    parent.appendChild(expand);
  }

  function renderBackup(parent) {
    const save = section('作品の保存', '保存形式 .pforge v5 を維持したまま、現在の作品を外部バックアップできます。');
    const actions = document.createElement('div'); actions.className = 'pf55-action-grid';
    actions.append(createButton('通常保存（ライブラリ＋.pforge）', async () => {
      if (busy) return; busy = true;
      try { await api().saveNow(); }
      catch (error) { notify('保存に失敗しました: ' + safeMessage(error)); }
      finally { busy = false; }
    }), createButton('現在の作品を .pforge 保存', exportCurrentProject), createButton('全作品を .pfarchive 保存', async () => { const run = window.PF_DIAGNOSTICS?.exportAllProjectsArchive; if (typeof run !== 'function') { notify('全作品バックアップ機能を利用できません'); return; } const ok = await run(); if (!ok) notify('全作品バックアップを作成できませんでした'); }));
    save.appendChild(actions); parent.appendChild(save);
    const storage = section('ブラウザー保存容量', 'ブラウザーが公開する推定値です。実際の上限や保持期間は端末・設定により異なります。');
    const output = document.createElement('div'); output.id = 'pf55StorageEstimate'; output.className = 'pf55-inline-status'; output.textContent = '容量情報を取得中…';
    storage.appendChild(output); const refresh = createButton('容量を再確認', () => updateStorageEstimate(output)); storage.appendChild(refresh); parent.appendChild(storage);
    updateStorageEstimate(output);
  }
  async function exportCurrentProject() {
    if (busy) return; busy = true;
    try {
      const data = await api().getProjectData();
      if (!data || data.format !== 'PIXEL_FORGE_PROJECT') throw new Error('作品データを取得できません');
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json;charset=utf-8' });
      downloadBlob(blob, safeFileName(data.name || 'PIXEL-FORGE') + '.pforge');
      notify('現在の作品を .pforge 形式で書き出しました');
    } catch (error) { notify('作品バックアップに失敗しました: ' + safeMessage(error)); }
    finally { busy = false; }
  }
  async function updateStorageEstimate(output) {
    if (!output) return;
    try {
      if (!navigator.storage?.estimate) { output.textContent = 'このブラウザーは容量推定APIに対応していません'; return; }
      const estimate = await navigator.storage.estimate();
      const used = Number(estimate.usage) || 0, quota = Number(estimate.quota) || 0;
      const format = n => n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(2)} GB` : `${(n / 1024 ** 2).toFixed(1)} MB`;
      output.textContent = `使用量 ${format(used)} / 推定割当 ${quota ? format(quota) : '不明'}${quota ? ` · ${Math.max(0, 100 - used / quota * 100).toFixed(1)}% 空き` : ''}`;
    } catch (error) { output.textContent = '容量情報を取得できません: ' + safeMessage(error); }
  }

  function renderSecurity(parent) {
    const sec = section('セキュリティ保護', '外部通信・危険なファイル・異常なファイルサイズを抑える仕組みを適用しています。');
    const policy = document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || 'CSP未設定';
    const checks = [
      ['Content Security Policy', policy !== 'CSP未設定', policy],
      ['外部接続制限', /connect-src[^;]*'self'/.test(policy), 'connect-src は同一オリジンに制限'],
      ['外部画像制限', /img-src[^;]*'self'[^;]*data:[^;]*blob:/.test(policy), '画像は同一オリジン・data・blobを許可'],
      ['オブジェクト埋め込み禁止', /object-src\s+'none'/.test(policy), 'object-src none'],
      ['ファイル形式検査', typeof guardFileImport === 'function', '画像/PSD/JSONのヘッダーと容量を検査'],
      ['作品データの上限検査', !!window.PF_APP_RELEASE, '既存の寸法・レイヤー・画像データ検査を維持']
    ];
    checks.forEach(([name, ok, detail]) => {
      const row = document.createElement('div'); row.className = 'pf55-check-row';
      const mark = document.createElement('b'); mark.className = ok ? 'is-ok' : 'is-warn'; mark.textContent = ok ? '有効' : '要確認';
      const copy = document.createElement('span'); const title = document.createElement('strong'); title.textContent = name; const sub = document.createElement('small'); sub.textContent = detail;
      copy.append(title, sub); row.append(copy, mark); sec.appendChild(row);
    });
    addNote(sec, 'このツールはローカル作品の暗号化や端末全体のウイルス対策を行うものではありません。信頼できるファイルのみ読み込んでください。');
    parent.appendChild(sec);

    const diag = section('診断テスト', 'テストは一時キャンバスで行い、現在の作品状態を変更しない設計の既存診断を呼び出します。');
    const run = createButton('描画・画材テストを実行', runCoreTests); diag.appendChild(run);
    diag.appendChild(createButton('診断レポートを書き出す', exportDiagnosticReport));
    const result = document.createElement('div'); result.id = 'pf55DiagResult'; result.className = 'pf55-diagnostic-result';
    result.textContent = 'テストは必要なときに実行できます。'; diag.appendChild(result); parent.appendChild(diag);
  }
  async function runCoreTests() {
    const output = $('pf55DiagResult'); if (!output || busy) return;
    busy = true; output.textContent = '診断を実行中…';
    try {
      const tests = [
        ['虹色ブラシ', window.PF_DIAGNOSTICS?.runRainbowRegression],
        ['指先混色', window.PF_DIAGNOSTICS?.runSmudgeRainbowRegression],
        ['画材の描き分け', window.PF_DIAGNOSTICS?.runMaterialDistinctionRegression],
        ['消しゴム', window.PF_DIAGNOSTICS?.runEraserRegression]
      ];
      const results = [];
      for (const [name, fn] of tests) {
        if (typeof fn !== 'function') { results.push({ name, passed: false, skipped: true }); continue; }
        try { const result = fn(); results.push({ name, passed: !!result?.passed, details: result?.tests || result?.error || '' }); }
        catch (error) { results.push({ name, passed: false, error: safeMessage(error) }); }
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      output.replaceChildren();
      results.forEach(r => {
        const line = document.createElement('div'); line.className = 'pf55-check-row';
        const label = document.createElement('span'); label.textContent = r.name;
        const status = document.createElement('b'); status.className = r.passed ? 'is-ok' : 'is-warn'; status.textContent = r.passed ? 'PASS' : (r.skipped ? 'SKIP' : '要確認');
        line.append(label, status); output.appendChild(line);
      });
      const passed = results.filter(r => r.passed).length;
      notify(`診断完了: ${passed}/${results.length} 件 PASS`);
    } finally { busy = false; }
  }
  async function exportDiagnosticReport() {
    try {
      const report = {
        appVersion: window.PF_APP_RELEASE || VERSION,
        upgradeVersion: VERSION,
        generatedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 },
        editor: api().getMetrics(),
        capabilities: api().diagnostics?.() || {},
        security: { cspPresent: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'), secureContext: isSecureContext, indexedDB: typeof indexedDB !== 'undefined' },
        storage: await (navigator.storage?.estimate?.().catch(() => null) || Promise.resolve(null))
      };
      downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' }), 'PIXEL-FORGE-Diagnostics-v55.json');
      notify('診断レポートを書き出しました（作品画像・作品本文は含みません）');
    } catch (error) { notify('診断レポートを作成できません: ' + safeMessage(error)); }
  }
  function getUpgradeDiagnostics() {
    return { version: VERSION, modalMounted: !!root, fileGuardInstalled: true, paletteFavorites: palette.favorites.length, recentColors: recentColors.size, activeTab };
  }

  function handleInput(event) {
    const input = event.target;
    if (input?.matches('[data-layer-opacity]')) {
      const value = clamp(Number(input.value) / 100, 0, 1);
      const id = Number(input.dataset.layerOpacity);
      if (!opacityOriginal.has(input)) {
        const layer = api().getLayers().find(item => item.id === id);
        opacityOriginal.set(input, layer ? layer.opacity : value);
      }
      const output = input.parentElement?.querySelector('output'); if (output) output.textContent = `${Math.round(value * 100)}%`;
      api().previewLayerOpacity?.(id, value);
    }
  }
  function handleChange(event) {
    const input = event.target;
    if (input?.matches('[data-layer-opacity]')) {
      const id = Number(input.dataset.layerOpacity);
      const original = opacityOriginal.has(input) ? opacityOriginal.get(input) : null;
      const next = clamp(Number(input.value) / 100, 0, 1);
      if (original !== null) api().previewLayerOpacity?.(id, original);
      api().setLayerOpacity(id, next);
      opacityOriginal.delete(input);
      renderTab('layers');
    }
  }
  // File gate: pause the original handler until a cheap header/size check succeeds.
  const FILE_POLICIES = Object.freeze({
    imageInput: { kind: 'image', max: 64 * 1024 * 1024 },
    traceInput: { kind: 'image', max: 64 * 1024 * 1024 },
    psdInput: { kind: 'psd', max: 320 * 1024 * 1024 },
    projectInput: { kind: 'json', max: 512 * 1024 * 1024 },
    pfArchiveImportFile: { kind: 'json', max: 1024 * 1024 * 1024 },
    pfPrefsImportFile: { kind: 'json', max: 8 * 1024 * 1024 },
    pf35TuneImportFile: { kind: 'json', max: 8 * 1024 * 1024 },
    brushProfileFile: { kind: 'json', max: 16 * 1024 * 1024 }
  });
  async function guardFileImport(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !FILE_POLICIES[input.id]) return;
    const file = input.files?.[0]; if (!file) return;
    if (approvedFiles.get(input) === file) { approvedFiles.delete(input); return; }
    event.preventDefault(); event.stopImmediatePropagation();
    try {
      const policy = FILE_POLICIES[input.id];
      if (file.size <= 0 || file.size > policy.max) throw new Error(`ファイル容量が上限を超えています（最大 ${Math.round(policy.max / 1024 / 1024)}MB）`);
      const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
      if (policy.kind === 'psd') {
        if (head.length < 6 || head[0] !== 0x38 || head[1] !== 0x42 || head[2] !== 0x50 || head[3] !== 0x53) throw new Error('PSDのヘッダー（8BPS）が確認できません');
      } else if (policy.kind === 'image') {
        if ((file.type || '').toLowerCase() === 'image/svg+xml' || /\.svgz?$/i.test(file.name)) throw new Error('SVGは安全確認のため直接読み込めません。PNG/WebPに変換してください');
        const isPng = head.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => head[i] === v);
        const isJpeg = head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
        const isGif = head.length >= 6 && String.fromCharCode(...head.slice(0, 6)).match(/^GIF8[79]a$/);
        const isWebp = head.length >= 12 && String.fromCharCode(...head.slice(0, 4)) === 'RIFF' && String.fromCharCode(...head.slice(8, 12)) === 'WEBP';
        const isBmp = head.length >= 2 && head[0] === 0x42 && head[1] === 0x4d;
        const isAvif = head.length >= 12 && String.fromCharCode(...head.slice(4, 8)) === 'ftyp' && /avif|avis/.test(String.fromCharCode(...head.slice(8, 16)));
        if (!(isPng || isJpeg || isGif || isWebp || isBmp || isAvif)) throw new Error('対応する画像形式の実データを確認できません（PNG/JPEG/GIF/WebP/BMP/AVIF）');
        if (file.type && file.type !== 'application/octet-stream' && !/^image\/(png|jpeg|gif|webp|bmp|avif|pjpeg|x-png)$/i.test(file.type)) throw new Error('ファイル拡張子・MIME形式が対応範囲外です');
        if (typeof createImageBitmap === 'function') {
          let bitmap;
          try { bitmap = await createImageBitmap(file); const pixelLimit = 20000000; if (bitmap.width * bitmap.height > pixelLimit) throw new Error(`画像サイズが大きすぎます（最大 ${pixelLimit.toLocaleString()}px）`); }
          finally { bitmap?.close?.(); }
        }
      } else {
        const text = new TextDecoder('utf-8', { fatal: false }).decode(head).replace(/^\uFEFF/, '').trimStart();
        if (!(text.startsWith('{') || text.startsWith('[')) || head.includes(0)) throw new Error('JSONファイルの先頭データが正しくありません');
      }
      approvedFiles.set(input, file);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (error) {
      input.value = '';
      notify(`読み込みを中止しました: ${safeMessage(error)}`);
    }
  }

  // App startup is synchronous up to API publication; retry once at DOM ready if needed.
  if (!mount()) document.addEventListener('DOMContentLoaded', () => { if (!mount()) console.warn('PIXEL FORGE v55 add-on could not mount: editor API unavailable'); }, { once: true });
})();
