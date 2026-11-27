/* PIXEL FORGE STUDIO v48.0 — Home / Editor / Workflow Enhancement Suite.
 * Additive module: uses public app bridges and existing controls; no private drawing state access.
 */
(() => {
  'use strict';
  if (window.__PF_ENHANCEMENT_SUITE_V48__) return;
  window.__PF_ENHANCEMENT_SUITE_V48__ = true;

  const VERSION = '48.0.0';
  const STORAGE = {
    favorites: 'pf-v48-home-favorites',
    view: 'pf-v48-home-view',
    homeFilter: 'pf-v48-home-filter',
    homeSort: 'pf-v48-home-sort',
    hubFavorites: 'pf-v48-hub-favorites',
    hubRecent: 'pf-v48-hub-recent',
    prefs: 'pf-v48-enhancement-prefs'
  };
  const $ = id => document.getElementById(id);
  const api = () => window.PF_STUDIO_API || null;
  const safeRead = (key, fallback) => {
    try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }
    catch (_) { return fallback; }
  };
  const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } };
  const readPrefs = () => { const value=safeRead(STORAGE.prefs,{}); return value && typeof value==='object' && !Array.isArray(value) ? value : {}; };
  const click = id => { const el = $(id); if (!el || el.disabled) return false; el.click(); return true; };
  const setControl = (id, value) => {
    const bridge = api();
    if (bridge && typeof bridge.setControl === 'function') return bridge.setControl(id, value);
    const el = $(id); if (!el) return false;
    if (el.type === 'checkbox') el.checked = !!value; else el.value = String(value);
    el.dispatchEvent(new Event(el.type === 'range' || el.type === 'color' || el.type === 'number' ? 'input' : 'change', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  const toast = message => {
    if (typeof api()?.toast === 'function') api().toast(message);
    else {
      const node = $('toast');
      if (node) { node.textContent = message; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2200); }
    }
  };
  const isEditor = () => !document.body.classList.contains('pf-home-active');
  const requireEditor = fn => (...args) => {
    if (!isEditor()) { toast('この操作は作品を開いた後に使えます。'); return false; }
    return fn(...args);
  };
  const runExistingHome = action => {
    const runner = window.PF_HOME_ACTIONS?.run;
    if (typeof runner === 'function') return runner(action);
    const map = { new: 'homeNew', import: 'homeImport', settings: 'homeSettings', refresh: 'homeRefresh', diagnostics: 'homeDiagnostics', install: 'homeInstall' };
    return click(map[action] || '');
  };
  const openSettings = () => {
    if ($('appSettingsModal')?.classList.contains('hidden')) {
      if (typeof window.PF_EDITOR_ACTIONS?.settings === 'function') window.PF_EDITOR_ACTIONS.settings();
      else click('settingsButton') || click('homeSettings');
    }
  };
  const saveSettings = values => {
    openSettings();
    Object.entries(values || {}).forEach(([id, value]) => setControl(id, value));
    click('settingsSave');
  };
  const scrollTo = selector => {
    const node = document.querySelector(selector);
    if (!node) return false;
    node.scrollIntoView({ behavior: document.body.classList.contains('pf-reduced-motion') ? 'auto' : 'smooth', block: 'start' });
    return true;
  };

  const featureList = { home: [], editor: [], bridge: [] };
  const add = (scope, category, title, description, run, keywords = '') => {
    const index = featureList[scope].length + 1;
    featureList[scope].push({
      id: `${scope}-${String(index).padStart(3, '0')}`,
      scope, category, title, description, keywords: `${title} ${description} ${category} ${keywords}`.toLowerCase(), run
    });
  };

  /* HOME — 100 practical library, navigation, layout and recovery actions. */
  const homeLayouts = [
    ['標準カード', '通常のカード配置に戻す', 'standard'],
    ['コンパクト', 'カード間隔とサムネイルを小さくする', 'compact'],
    ['ゆったり', 'カード間隔とプレビューを広くする', 'roomy'],
    ['リスト表示', '横長の一覧表示に切り替える', 'list'],
    ['2列表示', '作品カードを2列で表示', 'cols-2'],
    ['3列表示', '作品カードを3列で表示', 'cols-3'],
    ['4列表示', '作品カードを4列で表示', 'cols-4'],
    ['5列表示', '作品カードを5列で表示', 'cols-5'],
    ['大きなプレビュー', '作品のサムネイルを大きく表示', 'preview-large'],
    ['小さなプレビュー', '作品のサムネイルを小さく表示', 'preview-small']
  ];
  homeLayouts.forEach(([title, desc, value]) => add('home', 'ホーム表示', title, desc, () => setHomeLayout(value), 'レイアウト カード グリッド'));

  const homeFilters = [
    ['すべての作品', '絞り込みを解除', 'all'],
    ['お気に入り', '★を付けた作品だけ表示', 'favorites'],
    ['最近7日', '最近7日以内に編集した作品', 'recent7'],
    ['最近30日', '最近30日以内に編集した作品', 'recent30'],
    ['今日編集', '今日の日付で編集した作品', 'today'],
    ['正方形', '幅と高さが同じ作品', 'square'],
    ['横長', '横長キャンバス', 'landscape'],
    ['縦長', '縦長キャンバス', 'portrait'],
    ['大きなキャンバス', '長辺が3000px以上の作品', 'large'],
    ['旧版データ', '旧版から復元した作品', 'legacy']
  ];
  homeFilters.forEach(([title, desc, value]) => add('home', 'スマート絞り込み', title, desc, () => setHomeFilter(value), 'ライブラリ 検索 フィルター'));

  const homeSorts = [
    ['編集が新しい順', '更新日が新しい作品を先頭へ', 'updated-desc'],
    ['編集が古い順', '更新日が古い作品を先頭へ', 'updated-asc'],
    ['作成が新しい順', '作成日が新しい作品を先頭へ', 'created-desc'],
    ['作成が古い順', '作成日が古い作品を先頭へ', 'created-asc'],
    ['名前 A → Z', '作品名を昇順に並べる', 'name-asc'],
    ['名前 Z → A', '作品名を降順に並べる', 'name-desc'],
    ['幅が大きい順', 'キャンバス幅を基準に並べる', 'width-desc'],
    ['幅が小さい順', 'キャンバス幅を基準に並べる', 'width-asc'],
    ['面積が大きい順', 'キャンバスの総ピクセル数を基準に並べる', 'area-desc'],
    ['お気に入り優先', 'お気に入りを先頭へ並べる', 'favorite-first']
  ];
  homeSorts.forEach(([title, desc, value]) => add('home', 'ライブラリ並べ替え', title, desc, () => setHomeSort(value), '作品 並び順 ソート'));

  const selections = [
    ['表示中を全選択', '現在表示されているカードを選択', 'all'],
    ['選択を解除', 'すべてのチェックを解除', 'none'],
    ['選択を反転', 'チェック状態を反転', 'invert'],
    ['お気に入りを選択', 'お気に入り作品だけを選択', 'favorites'],
    ['旧版作品を選択', '旧版データのカードを選択', 'legacy'],
    ['先頭5件を選択', '一覧の先頭5件を選択', 'first5'],
    ['先頭10件を選択', '一覧の先頭10件を選択', 'first10'],
    ['先頭25件を選択', '一覧の先頭25件を選択', 'first25'],
    ['最近の作品を選択', '直近7日以内の作品を選択', 'recent'],
    ['選択作品を一括削除', '既存の削除確認を表示して実行', 'delete']
  ];
  selections.forEach(([title, desc, value]) => add('home', '一括選択', title, desc, () => runSelection(value), 'チェック 選択 一括'));

  const homeLaunch = [
    ['新しい作品', '既存の新規キャンバス画面を開く', () => runExistingHome('new')],
    ['作品を読み込む', '既存の .pforge 読み込みを開く', () => runExistingHome('import')],
    ['全体設定', 'ホーム・エディタ共通設定を開く', () => runExistingHome('settings')],
    ['端末診断', '端末とブラウザの診断を開く', () => runExistingHome('diagnostics')],
    ['アプリとして使う', 'PWAインストール案内を開く', () => runExistingHome('install')],
    ['ライブラリ更新', '保存済み作品を再読み込み', () => runExistingHome('refresh')],
    ['全作品バックアップ', '既存の .pfarchive 出力を実行', () => click('homeArchiveExport')],
    ['バックアップ復元', '既存の .pfarchive 読み込みを開く', () => click('homeArchiveImport')],
    ['制作モード選択へ', 'ホームの制作モード選択まで移動', () => scrollTo('#pfModePicker')],
    ['ライブラリへ移動', 'マイ作品一覧まで移動', () => scrollTo('#librarySection')]
  ];
  homeLaunch.forEach(([title, desc, action]) => add('home', 'ホームクイック起動', title, desc, action, '新規 読込 設定 診断'));

  const searchPresets = [
    ['検索欄へ移動', '作品検索欄にフォーカス', null],
    ['検索をクリア', '検索語を消して一覧を戻す', ''],
    ['「Untitled」を検索', 'Untitledを含む作品を検索', 'Untitled'],
    ['「コピー」を検索', '複製作品を探す', 'コピー'],
    ['「Recovered」を検索', '復元作品を探す', 'Recovered'],
    ['「Sketch」を検索', 'Sketchという名前の作品を探す', 'Sketch'],
    ['「Final」を検索', 'Finalという名前の作品を探す', 'Final'],
    ['「Logo」を検索', 'Logoという名前の作品を探す', 'Logo'],
    ['「Banner」を検索', 'Bannerという名前の作品を探す', 'Banner'],
    ['「Character」を検索', 'Characterという名前の作品を探す', 'Character']
  ];
  searchPresets.forEach(([title, desc, value]) => add('home', '検索ショートカット', title, desc, () => {
    const input = $('librarySearch'); if (!input) return false;
    if (value === null) { input.focus(); return true; }
    input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); return true;
  }, '名前検索 ライブラリ'));

  const recoveryActions = [
    ['作品全体をバックアップ', '全作品の .pfarchive を作成', () => click('homeArchiveExport')],
    ['作品バックアップを復元', '既存のアーカイブ復元を開く', () => click('homeArchiveImport')],
    ['設定をバックアップ', 'ブラシ・UI設定の .pfsettings 出力', () => { openSettings(); setTimeout(() => click('pfPrefsExport'), 80); return true; }],
    ['設定を復元', '設定バックアップの読み込みを開く', () => { openSettings(); setTimeout(() => click('pfPrefsImport'), 80); return true; }],
    ['保存先の状態を確認', '保存先表示と端末診断を開く', () => { scrollTo('#homeStorageOrigin'); click('homeDiagnostics'); return true; }],
    ['キャッシュ管理を開く', 'キャッシュを作品データと分けて管理', () => { openSettings(); setTimeout(() => scrollTo('.pf-cache-settings'), 80); return true; }],
    ['オフラインキャッシュ再有効化', '既存のキャッシュ再有効化を実行', () => { openSettings(); setTimeout(() => click('pfEnableOfflineCache'), 80); return true; }],
    ['キャッシュ削除画面へ', 'サイトキャッシュ管理へ移動', () => { openSettings(); setTimeout(() => scrollTo('.pf-cache-settings'), 80); return true; }],
    ['作品一覧を更新', 'バックアップ復元後の一覧更新にも利用', () => runExistingHome('refresh')],
    ['復元案内を表示', '作品引き継ぎ・復元セクションへ移動', () => scrollTo('.pf-home-recovery')]
  ];
  recoveryActions.forEach(([title, desc, action]) => add('home', '復元・バックアップ', title, desc, action, '保存 復元 移行 バックアップ'));

  const navActions = [
    ['ページ先頭へ', 'ホーム画面の先頭へ戻る', () => window.scrollTo({ top: 0, behavior: 'smooth' })],
    ['モード選択へ', '制作モードを選ぶセクションへ移動', () => scrollTo('#pfModePicker')],
    ['作品ライブラリへ', 'マイ作品へ移動', () => scrollTo('#librarySection')],
    ['復元セクションへ', '作品の引き継ぎ欄へ移動', () => scrollTo('.pf-home-recovery')],
    ['一括操作バーへ', '作品一括選択欄へ移動', () => scrollTo('#libraryBulkBar')],
    ['ホーム最下部へ', 'フッターへ移動', () => scrollTo('.pf-home-footer')],
    ['作品検索へ', '検索欄へ移動して入力待ち', () => $('librarySearch')?.focus()],
    ['新規作成ボタンへ', '新規作品の入口へ移動', () => $('homeNew')?.focus()],
    ['読み込みボタンへ', '作品読み込みの入口へ移動', () => $('homeImport')?.focus()],
    ['最近の作品を開く', '現在の一覧の先頭カードを開く', () => document.querySelector('#libraryGrid .pf-art-open')?.click()]
  ];
  navActions.forEach(([title, desc, action]) => add('home', 'ナビゲーション', title, desc, action, '移動 ジャンプ ホーム'));

  const appearanceActions = [
    ['カード密度・標準', '標準密度に戻す', () => setHomeLayout('standard')],
    ['カード密度・コンパクト', '画面内に多くの作品を表示', () => setHomeLayout('compact')],
    ['カード密度・ゆったり', 'カード間の余白を増やす', () => setHomeLayout('roomy')],
    ['横長リスト', '横長の一覧レイアウト', () => setHomeLayout('list')],
    ['ホーム文字を小さく', 'ホームの文字サイズを約5%縮小', () => setHomeScale(-5)],
    ['ホーム文字を標準へ', 'ホームの文字サイズを標準に戻す', () => setHomeScale(0, true)],
    ['ホーム文字を大きく', 'ホームの文字サイズを約8%拡大', () => setHomeScale(8)],
    ['高コントラスト表示', '境界線とテキストのコントラストを強化', () => toggleBodyClass('pf-enh-high-contrast')],
    ['カードの縁を強調', '作品カードの境界を見やすくする', () => toggleBodyClass('pf-enh-card-outline')],
    ['ホーム外観をリセット', 'カードの強調・表示密度・文字倍率を標準に戻す', () => resetHomeAppearance()]
  ];
  appearanceActions.forEach(([title, desc, action]) => add('home', 'ホーム外観', title, desc, action, '見た目 配色 密度'));

  const accessibilityActions = [
    ['大きなタップ領域', 'スマホの操作ボタンを押しやすくする', () => toggleBodyClass('pf-enh-large-targets')],
    ['動きを減らす', 'アニメーション効果を抑える', () => toggleReducedMotion()],
    ['読みやすい文字', '文字間隔と行間を広げる', () => toggleBodyClass('pf-enh-readable')],
    ['フォーカス位置を強調', 'キーボード操作中の選択位置を強調', () => toggleBodyClass('pf-enh-focus')],
    ['キーボード案内', 'よく使うキーボード操作を案内', () => toast('Ctrl/⌘+K: コマンド · Ctrl+Z: 戻す · Ctrl+Shift+Z: やり直し · Ctrl+S: 保存 · B: ブラシ')],
    ['検索欄へフォーカス', '検索欄からキーボード操作を開始', () => $('librarySearch')?.focus()],
    ['新規作成へフォーカス', '新しい作品ボタンへフォーカス', () => $('homeNew')?.focus()],
    ['読み込みへフォーカス', '既存作品の読み込みボタンへフォーカス', () => $('homeImport')?.focus()],
    ['診断を開く', '入力機器・保存機能の診断を開く', () => runExistingHome('diagnostics')],
    ['視認性設定へ', 'アプリ全体設定の表示倍率へ移動', () => { openSettings(); setTimeout(() => scrollTo('#settingUiScale'), 80); return true; }]
  ];
  accessibilityActions.forEach(([title, desc, action]) => add('home', 'アクセシビリティ', title, desc, action, '操作 支援 タッチ キーボード'));

  /* EDITOR — 200 direct presets/actions connected to the existing drawing controls. */
  const tools = [
    ['ブラシ','brush'],['消しゴム','eraser'],['指先・混色','smudge'],['直線','line'],['四角形','rect'],['楕円','ellipse'],['三角形','triangle'],['星形','star'],['角丸長方形','roundedRect'],['矢印','arrow'],['多角形','polygon'],['ベジェ曲線','curve'],['塗りつぶし','fill'],['スポイト','eyedropper'],['手のひら','hand'],['テキスト','text'],['グラデーション','gradient'],['レイヤー移動','move'],['オブジェクト変形','transform'],['ブラシへ戻る','brush']
  ];
  tools.forEach(([title, value], i) => add('editor', 'ツール切替', title, `${value} ツールを選択${i === 19 ? 'し、ブラシ設定へフォーカス' : ''}`, () => {
    const bridge = api(); if (!bridge?.setTool) return false; bridge.setTool(value);
    if (i === 19) $('brushPreset')?.focus(); return true;
  }, 'ツール ペン 編集'));

  const brushSelect = $('brushPreset');
  const brushOptions = brushSelect ? Array.from(brushSelect.options).filter(o => o.value).slice(0, 20) : [];
  brushOptions.forEach(option => add('editor', 'ブラシプリセット', option.textContent.trim(), `${option.value} の画材を選び、ブラシツールに切り替え`, () => {
    const bridge = api(); if (!bridge?.setBrushPreset) return false;
    bridge.setTool('brush'); return bridge.setBrushPreset(option.value);
  }, 'ブラシ 筆 画材'));

  const colors = [
    ['墨黒','#171923'],['濃紺','#222B3A'],['スレート','#64748B'],['白','#FFFFFF'],['赤','#F04452'],['朱色','#F26B38'],['橙','#FF9D4D'],['黄','#FFD166'],['黄緑','#A4D65E'],['緑','#36A96B'],
    ['青緑','#31C9A7'],['水色','#42B8F3'],['青','#3867D6'],['群青','#4052A2'],['紫','#9A70F5'],['藤色','#B69AE6'],['桃','#F28BB8'],['茶','#A66C4F'],['焦茶','#6B4A36'],['灰','#9CA3AF']
  ];
  colors.forEach(([name, value]) => add('editor', 'クイックカラー', name, `${value} を現在色に設定`, () => {
    const bridge = api(); if (!bridge?.setColor) return false; bridge.setColor(value); return true;
  }, `カラー 色 ${value}`));

  [1,2,3,4,5,6,8,10,12,16,20,24,32,40,48,64,80,100,150,250].forEach(value => add('editor', 'ブラシサイズ', `${value} px`, `ブラシサイズを ${value}px に設定`, () => {
    const bridge = api(); if (!bridge?.setControl) return false;
    bridge.setControl('sizeRange', Math.min(value, 250)); bridge.setControl('sizeNumber', value); return true;
  }, '太さ サイズ px'));

  Array.from({ length: 20 }, (_, i) => (i + 1) * 5).forEach(value => add('editor', '不透明度プリセット', `不透明度 ${value}%`, `ツールの不透明度を ${value}% に設定`, () => setControl('opacityRange', value), '不透明度 濃さ alpha'));

  const layerCommands = [
    ['ラフレイヤーを追加', () => api()?.addLayer?.('ラフ')],['線画レイヤーを追加', () => api()?.addLayer?.('線画')],['下塗りレイヤーを追加', () => api()?.addLayer?.('下塗り')],['影レイヤーを追加', () => api()?.addLayer?.('影')],['ハイライトレイヤーを追加', () => api()?.addLayer?.('ハイライト')],['効果レイヤーを追加', () => api()?.addLayer?.('効果')],['文字レイヤー用の空レイヤー', () => api()?.addLayer?.('文字・装飾')],
    ['選択レイヤーを複製', () => api()?.duplicateLayer?.()],
    ['前のレイヤーを選択', () => selectAdjacentLayer(-1)],['次のレイヤーを選択', () => selectAdjacentLayer(1)],
    ['表示／非表示を切替', () => toggleActiveLayerVisibility()],['レイヤーを表示', () => setActiveLayerVisibility(true)],['レイヤーを隠す', () => setActiveLayerVisibility(false)],
    ['レイヤー不透明度50%', () => setActiveLayerOpacity(.5)],['レイヤー不透明度100%', () => setActiveLayerOpacity(1)],
    ['レイヤーを上へ', () => click('layerUp')],['レイヤーを下へ', () => click('layerDown')],['下のレイヤーと結合', () => click('mergeDown')],
    ['最上段レイヤーを選択', () => selectLayerAt(0)],['最下段レイヤーを選択', () => selectLayerAt(-1)]
  ];
  layerCommands.forEach(([title, action]) => add('editor', 'レイヤー操作', title, '既存のレイヤーエンジンを利用して実行', requireEditor(action), 'レイヤー 合成 重ね順'));

  [25,33,50,67,75,80,90,100,110,125,150,175,200,250,300,400,500,600,800,1000].forEach(value => add('editor', 'ズームプリセット', `ズーム ${value}%`, `キャンバス表示倍率を ${value}% に設定`, () => {
    const bridge = api(); if (!bridge?.getView || !bridge?.setView) return false;
    const view = bridge.getView(); bridge.setView(value / 100, view.panX, view.panY); return true;
  }, '表示 拡大 縮小 ズーム'));

  const paperSelect = $('paperTexture');
  const paperOptions = paperSelect ? Array.from(paperSelect.options).filter(o => o.value).slice(0, 20) : [];
  paperOptions.forEach(option => add('editor', '紙質・素材', option.textContent.trim(), `紙質を「${option.textContent.trim()}」に設定`, () => setControl('paperTexture', option.value), '紙質 テクスチャ 素材'));

  const timelineBase = [
    ['前のフレーム', 'framePrev'],['次のフレーム', 'frameNext'],['空白フレーム追加', 'frameAdd'],['フレーム複製', 'frameDuplicate'],['フレーム削除', 'frameDelete'],['再生／停止', 'animationPlay'],['フレームを左へ', 'frameMoveLeft'],['フレームを右へ', 'frameMoveRight']
  ];
  timelineBase.forEach(([title, id]) => add('editor', 'アニメーション', title, 'タイムラインの既存操作を実行', requireEditor(() => click(id)), 'フレーム タイムライン'));
  add('editor', 'アニメーション', 'オニオンスキン切替', '前後フレームの透過表示を切り替える', requireEditor(() => setControl('onionSkin', !$('onionSkin')?.checked)), '前後フレーム onion skin');
  [8,12,15,24,30].forEach(value => add('editor', 'アニメーション', `FPS ${value}`, `再生速度を ${value} FPS に設定`, requireEditor(() => setControl('animationFps', value)), '再生速度'));
  const loopSelect = $('animationLoopMode');
  const loopOptions = loopSelect ? Array.from(loopSelect.options).slice(0, 3) : [];
  loopOptions.forEach(option => add('editor', 'アニメーション', `ループ：${option.textContent.trim()}`, '再生ループ方式を設定', requireEditor(() => setControl('animationLoopMode', option.value)), 'ループ 再生'));
  [['WebMを書き出す','animationExport'],['PNG連番を書き出す','animationPNGExport'],['スプライトシートを書き出す','animationSpriteExport']].forEach(([title,id]) => add('editor', 'アニメーション', title, '現在のアニメーションを既存形式で出力', requireEditor(() => click(id)), '動画 連番 sprite'));

  const fileActions = [
    ['プロジェクトを保存','saveBtn','保存を実行'],['PNGを書き出す','exportPng','透過PNGを書き出す'],['JPGを書き出す','exportJpg','JPEGを書き出す'],['WebPを書き出す','exportWebp','WebPを書き出す'],['PSDで保存','exportPsd','レイヤー構造を含むPSD出力'],['OpenRaster出力','exportOra','OpenRaster形式で出力'],
    ['画像をレイヤーとして読込','imageInput','画像ファイル選択を開く'],['下敷き画像を読込','traceInput','トレース用画像選択を開く'],['PSDを読み込む','psdInput','PSDファイル選択を開く'],['.pforgeを開く','projectInput','PIXEL FORGEプロジェクトを開く']
  ];
  fileActions.forEach(([title,id,desc]) => add('editor', 'ファイル入出力', title, desc, requireEditor(() => click(id)), 'ファイル 読込 書出 保存'));
  [1,2,3,4,6,8].forEach(value => add('editor', 'ファイル入出力', `書き出し倍率 ${value}×`, `画像書き出し倍率を ${value}× に設定`, requireEditor(() => setControl('exportScale', value)), '書き出し 高解像度'));
  [80,90,95,100].forEach(value => add('editor', 'ファイル入出力', `書出品質 ${value}%`, `JPG/WebPの品質を ${value}% に設定`, requireEditor(() => setControl('exportQuality', value)), '画質 圧縮'));

  /* BRIDGE — 50 cross-format, preference, input, browser and workflow connectors. */
  const bridges = [
    ['ファイル互換・10', [
      ['.pforgeを開く','projectInput','既存プロジェクト形式'],['PSDを開く','psdInput','PSDレイヤーの読み込み'],['写真をレイヤー読込','imageInput','一般画像の読み込み'],['写真を下敷き読込','traceInput','参照画像として読み込み'],['PNG出力','exportPng','透明画像の書き出し'],['JPG出力','exportJpg','共有向け画像出力'],['WebP出力','exportWebp','圧縮画像出力'],['PSD出力','exportPsd','レイヤー交換用PSD'],['OpenRaster出力','exportOra','レイヤー交換用ORA'],['全作品アーカイブ','homeArchiveExport','.pfarchiveによる一括移行']
    ]],
    ['外観・設定同期10', [
      ['Midnightテーマ',null,'theme:midnight'],['Warmテーマ',null,'theme:warm'],['Lightテーマ',null,'theme:light'],['UI倍率85%',null,'scale:85'],['UI倍率95%',null,'scale:95'],['UI倍率100%',null,'scale:100'],['UI倍率110%',null,'scale:110'],['UI倍率120%',null,'scale:120'],['ホームカード標準',null,'homegrid:comfortable'],['ホームカードコンパクト',null,'homegrid:compact']
    ]],
    ['入力・アクセシビリティ10', [
      ['タッチ領域を標準に',null,'touch:normal'],['タッチ領域を大きく',null,'touch:large'],['動きを減らす',null,'motion:toggle'],['高コントラスト',null,'contrast:toggle'],['読みやすい行間',null,'readable:toggle'],['フォーカス強調',null,'focus:toggle'],['左手向けUI補助',null,'lefthand:toggle'],['検索欄へフォーカス',null,'focus:librarySearch'],['ブラシ検索へフォーカス',null,'focus:brushSearch'],['設定画面を開く',null,'open:settings']
    ]],
    ['ブラウザ・PWA連携10', [
      ['アプリインストール案内',null,'home:install'],['端末診断を実行',null,'home:diagnostics'],['オフラインキャッシュ再有効化',null,'cache:enable'],['サイトキャッシュ管理',null,'cache:open'],['設定バックアップ出力',null,'prefs:export'],['設定バックアップ復元',null,'prefs:import'],['全作品アーカイブ出力',null,'archive:export'],['全作品アーカイブ復元',null,'archive:import'],['ヘルプを開く',null,'help:open'],['診断レポートをコピー',null,'diagnostics:copy']
    ]],
    ['ワークフロー連携10', [
      ['保存して作業継続',null,'editor:save'],['元に戻す',null,'editor:undo'],['やり直す',null,'editor:redo'],['表示をフィット',null,'editor:fit'],['設定パネルを開閉',null,'editor:panel'],['設定パネルを閉じる',null,'editor:close-panel'],['ホームへ戻る',null,'editor:home'],['新規キャンバスを開く',null,'home:new'],['コマンドパレットを開く',null,'command:open'],['強化センターの操作ガイド',null,'guide:shortcuts']
    ]]
  ];
  bridges.forEach(([category, rows]) => rows.forEach(([title, id, detail]) => add('bridge', category, title, detail && detail.startsWith('theme:') ? 'テーマ設定を変更して保存' : '既存のローカル機能・ブラウザ機能へ接続', () => runBridge(id, detail), '連携 ファイル ブラウザ 設定')));

  function getCards() { return Array.from($('libraryGrid')?.querySelectorAll('.pf-art-card') || []); }
  const validHomeFilters = new Set(['all','favorites','recent7','recent30','today','square','landscape','portrait','large','legacy']);
  const storedHomeFilter = safeRead(STORAGE.homeFilter, 'all');
  let homeFilter = validHomeFilters.has(storedHomeFilter) ? storedHomeFilter : 'all';
  const nativeSortMap = { updated: 'updated-desc', created: 'created-desc', name: 'name-asc' };
  const validSorts = new Set(['updated-desc','updated-asc','created-desc','created-asc','name-asc','name-desc','width-desc','width-asc','area-desc','favorite-first']);
  const storedHomeSort = safeRead(STORAGE.homeSort, null);
  let homeSort = validSorts.has(storedHomeSort) ? storedHomeSort : (nativeSortMap[$('librarySort')?.value] || 'updated-desc');
  let homeLayout = safeRead(STORAGE.view, 'standard') || 'standard';
  const storedFavorites = safeRead(STORAGE.favorites, []);
  let favorites = new Set(Array.isArray(storedFavorites) ? storedFavorites : []);
  let cardObserverBusy = false;

  function parseCard(card) {
    const title = card.querySelector('.pf-art-info strong')?.textContent?.trim() || '';
    const dimText = card.querySelector('.pf-art-info span')?.textContent || '';
    const dim = dimText.match(/([\d,]+)\s*[×x]\s*([\d,]+)/i);
    const width = dim ? Number(dim[1].replace(/,/g,'')) : 0;
    const height = dim ? Number(dim[2].replace(/,/g,'')) : 0;
    const dateText = card.querySelector('.pf-art-info small')?.textContent || '';
    const dates = [...dateText.matchAll(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/g)].map(m => new Date(Number(m[1]), Number(m[2])-1, Number(m[3])).getTime());
    const legacy = !!card.querySelector('.pf-recovery-tag');
    const id = card.dataset.libraryId || '';
    return { id, title, width, height, area: width*height, created: dates[0] || 0, updated: dates[1] || dates[0] || 0, legacy, favorite: favorites.has(id) };
  }
  function setHomeLayout(value, quiet = false) {
    const allowed = new Set(homeLayouts.map(item => item[2]));
    homeLayout = allowed.has(value) ? value : 'standard'; safeWrite(STORAGE.view, homeLayout);
    document.body.dataset.pfEnhHomeLayout = homeLayout;
    if (!quiet) toast(`ホーム表示を「${homeLayouts.find(x=>x[2]===homeLayout)?.[0] || homeLayout}」に変更しました`);
    return true;
  }
  function setHomeFilter(value) {
    if (!validHomeFilters.has(value)) return false;
    homeFilter = value; safeWrite(STORAGE.homeFilter, value); applyHomeCards();
    return true;
  }
  function setHomeSort(value) {
    if (!validSorts.has(value)) return false;
    homeSort = value; safeWrite(STORAGE.homeSort, value);
    const enhanced = $('pfEnhHomeSort'); if (enhanced && enhanced.value !== value) enhanced.value = value;
    const native = $('librarySort');
    const nativeValue = value.startsWith('updated-') ? 'updated' : value.startsWith('created-') ? 'created' : value.startsWith('name-') ? 'name' : null;
    if (native && nativeValue && native.value !== nativeValue) native.value = nativeValue;
    applyHomeCards();
    return true;
  }
  function applyHomeCards() {
    const cards = getCards();
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const day = 86400000;
    const entries = cards.map(card => ({ card, meta: parseCard(card) }));
    const sorted = [...entries].sort((a,b) => {
      const x=a.meta,y=b.meta;
      switch(homeSort) {
        case 'updated-asc': return x.updated-y.updated;
        case 'created-desc': return y.created-x.created;
        case 'created-asc': return x.created-y.created;
        case 'name-asc': return x.title.localeCompare(y.title,'ja');
        case 'name-desc': return y.title.localeCompare(x.title,'ja');
        case 'width-desc': return y.width-x.width;
        case 'width-asc': return x.width-y.width;
        case 'area-desc': return y.area-x.area;
        case 'favorite-first': return Number(y.favorite)-Number(x.favorite) || y.updated-x.updated;
        default: return y.updated-x.updated;
      }
    });
    const host = $('libraryGrid');
    if (host && !sorted.every(({card}, index) => host.children[index] === card)) {
      cardObserverBusy = true;
      try { sorted.forEach(({card}) => host.appendChild(card)); }
      finally { cardObserverBusy = false; }
    }
    let visible = 0;
    entries.forEach(({card,meta}) => {
      const age = meta.updated ? now.getTime()-meta.updated : Infinity;
      let show = true;
      switch(homeFilter) {
        case 'favorites': show=meta.favorite; break;
        case 'recent7': show=age<=7*day; break;
        case 'recent30': show=age<=30*day; break;
        case 'today': show=meta.updated>=today; break;
        case 'square': show=!!meta.width&&meta.width===meta.height; break;
        case 'landscape': show=meta.width>meta.height; break;
        case 'portrait': show=meta.height>meta.width; break;
        case 'large': show=Math.max(meta.width,meta.height)>=3000; break;
        case 'legacy': show=meta.legacy; break;
      }
      card.hidden = !show;
      card.classList.toggle('pf-enh-is-favorite', meta.favorite);
      const star = card.querySelector('.pf-enh-card-favorite');
      if (star) { star.textContent=meta.favorite?'★':'☆'; star.setAttribute('aria-pressed',String(meta.favorite)); }
      if(show)visible++;
    });
    const counter = $('pfEnhHomeFilterStatus');
    if(counter)counter.textContent=`${visible} / ${cards.length} 作品を表示 · ${homeSortLabel(homeSort)}`;
  }
  function homeSortLabel(key) { return ({'updated-desc':'編集が新しい順','updated-asc':'編集が古い順','created-desc':'作成が新しい順','created-asc':'作成が古い順','name-asc':'名前順 A→Z','name-desc':'名前順 Z→A','width-desc':'幅が大きい順','width-asc':'幅が小さい順','area-desc':'面積が大きい順','favorite-first':'お気に入り優先'})[key] || key; }
  function decorateHomeCards() {
    if (cardObserverBusy) return;
    for (const card of getCards()) {
      const id=card.dataset.libraryId;
      if(!id)continue;
      const tools=card.querySelector('.pf-art-tools');
      if(tools&&!tools.querySelector('.pf-enh-card-favorite')){
        const star=document.createElement('button');star.type='button';star.className='pf-enh-card-favorite';star.textContent=favorites.has(id)?'★':'☆';star.setAttribute('aria-label','お気に入りを切り替え');star.title='お気に入り';star.setAttribute('aria-pressed',String(favorites.has(id)));
        star.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(favorites.has(id))favorites.delete(id);else favorites.add(id);safeWrite(STORAGE.favorites,[...favorites]);applyHomeCards();});tools.appendChild(star);
      }
    }
    applyHomeCards();
  }
  function runSelection(mode) {
    if (mode === 'delete') {
      const selected = document.querySelectorAll('#libraryGrid .pf-art-select input:checked').length;
      if (!selected) { toast('削除する作品を先に選択してください。'); return false; }
      return click('libraryBulkDelete');
    }
    const cards=getCards().filter(card=>!card.hidden), all=getCards();
    const choose=[];
    if(mode==='all')choose.push(...cards);
    else if(mode==='favorites')choose.push(...cards.filter(c=>favorites.has(c.dataset.libraryId)));
    else if(mode==='legacy')choose.push(...cards.filter(c=>!!c.querySelector('.pf-recovery-tag')));
    else if(mode==='recent')choose.push(...cards.filter(c=>{const m=parseCard(c);return m.updated&&Date.now()-m.updated<=7*86400000;}));
    else if(mode.startsWith('first'))choose.push(...cards.slice(0,Number(mode.slice(5))||5));
    const checks=all.map(card=>card.querySelector('.pf-art-select input')).filter(Boolean);
    if(mode==='none')checks.forEach(c=>{c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));});
    else if(mode==='invert')checks.forEach(c=>{if(!c.closest('.pf-art-card')?.hidden){c.checked=!c.checked;c.dispatchEvent(new Event('change',{bubbles:true}));}});
    else checks.forEach(c=>{const should=choose.includes(c.closest('.pf-art-card'));if(c.checked!==should){c.checked=should;c.dispatchEvent(new Event('change',{bubbles:true}));}});
    toast(mode==='none'?'選択を解除しました':`${choose.length||checks.filter(c=>c.checked).length} 件を選択しました`);
    return true;
  }
  function setHomeScale(delta, reset=false) {
    let current=Number(document.body.dataset.pfEnhHomeScale||100);
    current=reset?100:Math.max(85,Math.min(125,current+delta));
    document.body.dataset.pfEnhHomeScale=String(current);
    document.documentElement.style.setProperty('--pf-enh-home-scale',String(current/100));
    safeWrite(STORAGE.prefs,{...readPrefs(),homeScale:current});
    toast(`ホーム表示倍率 ${current}%`);return true;
  }
  function toggleBodyClass(name) {
    document.body.classList.toggle(name);
    const prefs=readPrefs();prefs[name]=document.body.classList.contains(name);safeWrite(STORAGE.prefs,prefs);
    return document.body.classList.contains(name);
  }
  function toggleReducedMotion() {
    const enabled=!document.body.classList.contains('pf-reduced-motion');
    document.body.classList.toggle('pf-reduced-motion',enabled);
    const prefs=readPrefs();prefs.reducedMotion=enabled;safeWrite(STORAGE.prefs,prefs);
    // Persist through the native settings flow without mutating hidden form controls.
    if ($('appSettingsModal')) {
      openSettings();
      setControl('settingReducedMotion', enabled);
      click('settingsSave');
    }
    toast(enabled?'動きを減らしました':'アニメーションを標準に戻しました');return enabled;
  }
  function resetHomeAppearance() {
    ['pf-enh-high-contrast','pf-enh-card-outline'].forEach(x=>document.body.classList.remove(x));
    const prefs=readPrefs();prefs['pf-enh-high-contrast']=false;prefs['pf-enh-card-outline']=false;safeWrite(STORAGE.prefs,prefs);
    // Preserve independent accessibility preferences such as larger touch targets,
    // readable spacing and keyboard focus highlighting.
    setHomeScale(0,true);setHomeLayout('standard');return true;
  }
  function selectAdjacentLayer(direction) {
    const bridge=api();if(!bridge?.getLayers||!bridge?.getActiveLayer||!bridge?.selectLayer)return false;
    const layers=bridge.getLayers(),active=bridge.getActiveLayer();if(!layers.length||!active)return false;
    const index=layers.findIndex(l=>l.id===active.id),next=Math.max(0,Math.min(layers.length-1,index+direction));return bridge.selectLayer(layers[next].id);
  }
  function selectLayerAt(index) {
    const bridge=api();if(!bridge?.getLayers||!bridge?.selectLayer)return false;
    const layers=bridge.getLayers();if(!layers.length)return false;const i=index<0?layers.length-1:index;return bridge.selectLayer(layers[i].id);
  }
  function setActiveLayerVisibility(value) { const bridge=api(),layer=bridge?.getActiveLayer?.();return layer?bridge.setLayerVisibility(layer.id,value):false; }
  function toggleActiveLayerVisibility() { const bridge=api(),layer=bridge?.getActiveLayer?.();return layer?bridge.setLayerVisibility(layer.id,!layer.visible):false; }
  function setActiveLayerOpacity(value) { const bridge=api(),layer=bridge?.getActiveLayer?.();return layer?bridge.setLayerOpacity(layer.id,value):false; }
  function runBridge(id, detail) {
    if (id) return click(id);
    if (!detail) return false;
    if (detail.startsWith('theme:')) { const value=detail.split(':')[1];saveSettings({settingTheme:value});return true; }
    if (detail.startsWith('scale:')) { saveSettings({settingUiScale:Number(detail.split(':')[1])});return true; }
    if (detail.startsWith('homegrid:')) { saveSettings({settingHomeGrid:detail.split(':')[1]});return true; }
    if (detail.startsWith('touch:')) { saveSettings({settingTouchTargets:detail.split(':')[1]});return true; }
    if (detail==='motion:toggle') return toggleReducedMotion();
    if (detail.endsWith(':toggle')) { const key=detail.split(':')[0];const map={contrast:'pf-enh-high-contrast',readable:'pf-enh-readable',focus:'pf-enh-focus',lefthand:'pf-enh-left-handed'};return map[key]?toggleBodyClass(map[key]):false; }
    if (detail.startsWith('focus:')) { const node=$(detail.split(':')[1]);node?.focus();return !!node; }
    if (detail.startsWith('open:')) { openSettings();return true; }
    if (detail==='home:install') return runExistingHome('install');
    if (detail==='home:diagnostics') return runExistingHome('diagnostics');
    if (detail==='cache:enable') { openSettings();setTimeout(()=>click('pfEnableOfflineCache'),80);return true; }
    if (detail==='cache:open') { openSettings();setTimeout(()=>scrollTo('.pf-cache-settings'),80);return true; }
    if (detail==='prefs:export') { openSettings();setTimeout(()=>click('pfPrefsExport'),80);return true; }
    if (detail==='prefs:import') { openSettings();setTimeout(()=>click('pfPrefsImport'),80);return true; }
    if (detail==='archive:export') return click('homeArchiveExport') || click('pfArchiveExport');
    if (detail==='archive:import') return click('homeArchiveImport') || click('pfArchiveImport');
    if (detail==='help:open') { if (window.PFStudio?.openHelp) return window.PFStudio.openHelp();return click('helpSiteButton'); }
    if (detail==='diagnostics:copy') { click('homeDiagnostics');setTimeout(()=>click('pfDiagnosticsCopy'),100);return true; }
    if (detail==='editor:save') return requireEditor(()=>window.PF_EDITOR_ACTIONS?.save?.())();
    if (detail==='editor:undo') return requireEditor(()=>window.PF_EDITOR_ACTIONS?.undo?.())();
    if (detail==='editor:redo') return requireEditor(()=>window.PF_EDITOR_ACTIONS?.redo?.())();
    if (detail==='editor:fit') return requireEditor(()=>window.PF_EDITOR_ACTIONS?.fit?.())();
    if (detail==='editor:panel') return requireEditor(()=>window.PF_EDITOR_ACTIONS?.panel?.())();
    if (detail==='editor:close-panel') return requireEditor(()=>window.PF_EDITOR_ACTIONS?.closePanel?.())();
    if (detail==='editor:home') return requireEditor(()=>window.PF_EDITOR_ACTIONS?.home?.())();
    if (detail==='home:new') return runExistingHome('new');
    if (detail==='command:open') return click('commandPaletteButton');
    if (detail==='guide:shortcuts') { toast('Ctrl/⌘+K: コマンド · Ctrl+Shift+P: 強化センター · Ctrl+Z: 戻す · Ctrl+S: 保存');return true; }
    return false;
  }

  /* Restore only enhancement preferences; native app preferences remain authoritative. */
  function restoreEnhancementPrefs() {
    const prefs=readPrefs();
    Object.entries(prefs).forEach(([key,value])=>{if(key.startsWith('pf-enh-')&&typeof value==='boolean')document.body.classList.toggle(key,value);});
    if(prefs.homeScale){document.body.dataset.pfEnhHomeScale=String(prefs.homeScale);document.documentElement.style.setProperty('--pf-enh-home-scale',String(prefs.homeScale/100));}
    if(prefs.reducedMotion)document.body.classList.add('pf-reduced-motion');
    setHomeLayout(homeLayout, true);
  }

  /* The enhancement center is a searchable, paginated command library. */
  let activeScope='home', activeCategory='all', page=0, showHubFavorites=false, lastFocus=null;
  const pageSize=24;
  const storedHubFavorites=safeRead(STORAGE.hubFavorites,[]);
  const hubFavorites=new Set(Array.isArray(storedHubFavorites)?storedHubFavorites:[]);
  const storedRecent=safeRead(STORAGE.hubRecent,[]);
  let hubRecent=(Array.isArray(storedRecent)?storedRecent:[]).filter(Boolean).slice(0,12);
  function featureScopeItems(){return featureList[activeScope]||[];}
  function filteredFeatures(){
    const q=($('pfEnhSearch')?.value||'').trim().toLowerCase();
    return featureScopeItems().filter(item=>{
      if(activeCategory!=='all'&&item.category!==activeCategory)return false;
      if(showHubFavorites&&!hubFavorites.has(item.id))return false;
      return !q||item.keywords.includes(q);
    });
  }
  function renderHub() {
    const host=$('pfEnhFeatureGrid');if(!host)return;
    const items=filteredFeatures();const maxPage=Math.max(0,Math.ceil(items.length/pageSize)-1);page=Math.min(page,maxPage);
    const start=page*pageSize,shown=items.slice(start,start+pageSize);
    host.replaceChildren();
    shown.forEach(item=>{
      const card=document.createElement('article');card.className='pf-enh-feature-card';
      const copy=document.createElement('div');copy.className='pf-enh-feature-copy';
      const meta=document.createElement('small');meta.textContent=item.category;
      const title=document.createElement('strong');title.textContent=item.title;
      const desc=document.createElement('p');desc.textContent=item.description;
      copy.append(meta,title,desc);
      const actions=document.createElement('div');actions.className='pf-enh-feature-actions';
      const run=document.createElement('button');run.type='button';run.className='pf-enh-run';run.textContent='実行';run.addEventListener('click',()=>executeFeature(item));
      const fav=document.createElement('button');fav.type='button';fav.className='pf-enh-fav';fav.textContent=hubFavorites.has(item.id)?'★':'☆';fav.setAttribute('aria-label','お気に入り');fav.setAttribute('aria-pressed',String(hubFavorites.has(item.id)));fav.addEventListener('click',()=>{if(hubFavorites.has(item.id))hubFavorites.delete(item.id);else hubFavorites.add(item.id);safeWrite(STORAGE.hubFavorites,[...hubFavorites]);renderHub();});
      actions.append(run,fav);card.append(copy,actions);host.appendChild(card);
    });
    const count=$('pfEnhCount');if(count)count.textContent=items.length?`${items.length} 件 · ${start+1}–${Math.min(start+shown.length,items.length)} 件目`:'該当する機能がありません';
    const pageLabel=$('pfEnhPageLabel');if(pageLabel)pageLabel.textContent=`${items.length? page+1:0} / ${Math.max(1,Math.ceil(items.length/pageSize))} ページ`;
    const prev=$('pfEnhPrev'),next=$('pfEnhNext');if(prev)prev.disabled=page<=0;if(next)next.disabled=page>=maxPage;
    const recent=$('pfEnhRecent');if(recent){recent.replaceChildren();hubRecent.slice(0,6).forEach(id=>{const item=[...featureList.home,...featureList.editor,...featureList.bridge].find(x=>x.id===id);if(!item)return;const b=document.createElement('button');b.type='button';b.textContent=item.title;b.title=item.description;b.addEventListener('click',()=>executeFeature(item));recent.appendChild(b);});}
  }
  function updateCategories() {
    const select=$('pfEnhCategory');if(!select)return;
    const categories=[...new Set(featureScopeItems().map(item=>item.category))];
    select.replaceChildren(new Option('すべてのカテゴリ','all'));
    categories.forEach(c=>select.add(new Option(`${c} · ${featureScopeItems().filter(x=>x.category===c).length}` ,c)));
    activeCategory='all';select.value='all';
  }
  function setScope(scope) {
    activeScope=scope;page=0;showHubFavorites=false;
    document.querySelectorAll('[data-pf-enh-scope]').forEach(button=>{const active=button.dataset.pfEnhScope===scope;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const scopeCount=$('pfEnhScopeCount');if(scopeCount)scopeCount.textContent=`${featureList[scope].length} 強化項目`;
    const search=$('pfEnhSearch');if(search)search.value='';
    const favToggle=$('pfEnhOnlyFavorites');if(favToggle){favToggle.classList.remove('active');favToggle.setAttribute('aria-pressed','false');}
    updateCategories();renderHub();
  }
  function executeFeature(item) {
    if(!item||typeof item.run!=='function')return;
    // Commands that navigate, open OS pickers, or launch another modal dismiss
    // the feature hub first so the next screen is not trapped underneath it.
    if (item.scope === 'home' || item.scope === 'bridge' || (item.scope === 'editor' && (item.category === 'ファイル入出力' || item.title.includes('書き出す')))) closeHub();
    try {
      const result=item.run();
      hubRecent=[item.id,...hubRecent.filter(x=>x!==item.id)].slice(0,12);safeWrite(STORAGE.hubRecent,hubRecent);
      if(result===false)toast('この機能を実行できませんでした。必要な画面・作品を確認してください。');
      else if(result!==undefined&&result!==true) { /* native actions own their feedback */ }
      if($('pfEnhRecent'))renderHub();
    } catch(error) { console.error('Enhancement action failed:',item.id,error);toast(`実行できませんでした: ${item.title}`); }
  }
  function openHub(scope='home') {
    const root=$('pfEnhBackdrop');if(!root)return;
    lastFocus=document.activeElement;
    root.classList.remove('hidden');root.setAttribute('aria-hidden','false');
    setScope(scope);
    $('pfEnhSearch')?.focus({preventScroll:true});
  }
  function closeHub() {
    const root=$('pfEnhBackdrop');if(!root||root.classList.contains('hidden'))return;
    root.classList.add('hidden');root.setAttribute('aria-hidden','true');
    if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
  }

  function buildHub() {
    if($('pfEnhBackdrop'))return;
    const root=document.createElement('div');root.id='pfEnhBackdrop';root.className='pf-enh-backdrop hidden';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','pfEnhTitle');root.setAttribute('aria-hidden','true');
    root.innerHTML=`
      <section class="pf-enh-modal" role="document">
        <header class="pf-enh-header"><div class="pf-enh-brand"><span class="pf-enh-mark">✦</span><div><small>PIXEL FORGE · FEATURE LAB</small><h2 id="pfEnhTitle">強化センター</h2><p>ホーム・エディタ・連携機能を一括検索して実行</p></div></div><div class="pf-enh-head-tools"><span id="pfEnhScopeCount">100 強化項目</span><button type="button" id="pfEnhClose" data-pf-window-close aria-label="強化センターを閉じる">×</button></div></header>
        <nav class="pf-enh-tabs" aria-label="強化カテゴリ"><button type="button" data-pf-enh-scope="home" aria-pressed="true" class="active">ホーム <b>100</b></button><button type="button" data-pf-enh-scope="editor" aria-pressed="false">エディタ <b>200</b></button><button type="button" data-pf-enh-scope="bridge" aria-pressed="false">連携・UI <b>50</b></button></nav>
        <div class="pf-enh-toolbar"><label class="pf-enh-search"><span>⌕</span><input type="search" id="pfEnhSearch" placeholder="機能を検索… 例：レイヤー、ズーム、バックアップ" autocomplete="off"></label><select id="pfEnhCategory" aria-label="機能カテゴリ"></select><button type="button" id="pfEnhOnlyFavorites" aria-pressed="false">★ お気に入り</button></div>
        <div class="pf-enh-overview"><span id="pfEnhCount">100 件</span><div class="pf-enh-recent-wrap"><small>最近使った機能</small><div id="pfEnhRecent"></div></div></div>
        <div id="pfEnhFeatureGrid" class="pf-enh-feature-grid" aria-live="polite"></div>
        <footer class="pf-enh-footer"><span id="pfEnhPageLabel">1 / 5 ページ</span><div><button type="button" id="pfEnhPrev" disabled>← 前へ</button><button type="button" id="pfEnhNext">次へ →</button></div></footer>
        <p class="pf-enh-hint">ショートカット：Ctrl/⌘ + Shift + P · お気に入り・表示状態はこの端末に保存されます。</p>
      </section>`;
    document.body.appendChild(root);
    $('pfEnhClose').addEventListener('click',closeHub);
    root.addEventListener('pointerdown',event=>{if(event.target===root)closeHub();});
    root.addEventListener('pf:request-close',()=>{root.classList.add('hidden');root.setAttribute('aria-hidden','true');});
    root.querySelectorAll('[data-pf-enh-scope]').forEach(button=>button.addEventListener('click',()=>setScope(button.dataset.pfEnhScope)));
    $('pfEnhSearch').addEventListener('input',()=>{page=0;renderHub();});
    $('pfEnhCategory').addEventListener('change',event=>{activeCategory=event.target.value;page=0;renderHub();});
    $('pfEnhOnlyFavorites').addEventListener('click',event=>{showHubFavorites=!showHubFavorites;event.currentTarget.classList.toggle('active',showHubFavorites);event.currentTarget.setAttribute('aria-pressed',String(showHubFavorites));page=0;renderHub();});
    $('pfEnhPrev').addEventListener('click',()=>{page=Math.max(0,page-1);renderHub();});
    $('pfEnhNext').addEventListener('click',()=>{page++;renderHub();});
  }

  function runBridgePref(id) {
    if(id==='home:install')return runExistingHome('install');
    return false;
  }

  function setHomeButton(label, className, parent) {
    if(!parent||parent.querySelector(`[data-pf-enh-open="${className}"]`))return;
    const button=document.createElement('button');button.type='button';button.className=className==='home'?'pf-home-btn pf-home-enhance-trigger':'topbtn pf-enh-editor-trigger';
    button.dataset.pfEnhOpen=className;button.textContent=label;button.setAttribute('aria-label','強化センターを開く');
    button.addEventListener('click',()=>openHub(className==='editor'?'editor':'home'));parent.appendChild(button);
  }
  function addLaunchButtons() {
    setHomeButton('✦ 強化センター','home',document.querySelector('.pf-home-actions'));
    setHomeButton('✦','home',document.querySelector('.pf-home-mobile-head-actions'));
    setHomeButton('✦ 強化','editor',document.querySelector('.topbar'));
  }
  function addHomeEnhancementToolbar() {
    const controls=document.querySelector('.pf-library-controls');if(!controls||$('pfEnhHomeControls'))return;
    const bar=document.createElement('div');bar.id='pfEnhHomeControls';bar.className='pf-enh-home-controls';
    bar.innerHTML='<div class="pf-enh-home-chips" role="group" aria-label="作品のスマート絞り込み"><button type="button" data-filter-home="all">すべて</button><button type="button" data-filter-home="favorites">★ お気に入り</button><button type="button" data-filter-home="recent7">最近7日</button><button type="button" data-filter-home="square">正方形</button><button type="button" data-filter-home="landscape">横長</button><button type="button" data-filter-home="portrait">縦長</button></div><div class="pf-enh-home-sort"><span id="pfEnhHomeFilterStatus" role="status" aria-live="polite"></span><select id="pfEnhHomeSort" aria-label="強化センターの並び順"><option value="updated-desc">編集が新しい順</option><option value="updated-asc">編集が古い順</option><option value="created-desc">作成が新しい順</option><option value="created-asc">作成が古い順</option><option value="name-asc">名前順 A→Z</option><option value="name-desc">名前順 Z→A</option><option value="width-desc">幅が大きい順</option><option value="width-asc">幅が小さい順</option><option value="area-desc">面積が大きい順</option><option value="favorite-first">お気に入り優先</option></select></div>';
    controls.insertAdjacentElement('afterend',bar);
    bar.querySelectorAll('[data-filter-home]').forEach(button=>button.addEventListener('click',()=>{setHomeFilter(button.dataset.filterHome);bar.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));}));
    $('pfEnhHomeSort').value=homeSort;$('pfEnhHomeSort').addEventListener('change',event=>setHomeSort(event.target.value));
    bar.querySelector(`[data-filter-home="${homeFilter}"]`)?.classList.add('active');
  }
  function addGlobalKeys() {
    document.addEventListener('keydown',event=>{
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='p'){
        event.preventDefault();openHub(isEditor()?'editor':'home');return;
      }
      if(event.key==='Escape'&&!$('pfEnhBackdrop')?.classList.contains('hidden')){event.preventDefault();closeHub();}
    });
  }

  function installHomeObservers() {
    const grid=$('libraryGrid');if(!grid||typeof MutationObserver!=='function')return;
    const observer=new MutationObserver(records=>{
      if(cardObserverBusy)return;
      if(records.some(record=>record.addedNodes.length||record.removedNodes.length))decorateHomeCards();
    });
    observer.observe(grid,{childList:true});
    decorateHomeCards();
  }

  function init() {
    buildHub();addLaunchButtons();addHomeEnhancementToolbar();installHomeObservers();restoreEnhancementPrefs();addGlobalKeys();
    $('librarySort')?.addEventListener('change', event => { const value=nativeSortMap[event.target.value]||'updated-desc'; setHomeSort(value); });
    const app=$('app');if(app){const observer=new MutationObserver(()=>addLaunchButtons());observer.observe(app,{childList:true,subtree:false});}
    const home=$('homeScreen');if(home){const observer=new MutationObserver(()=>{if(!document.body.classList.contains('pf-home-active'))return;decorateHomeCards();});observer.observe(home,{attributes:true,attributeFilter:['class']});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

  window.PF_ENHANCEMENT_SUITE = Object.freeze({
    version:VERSION,
    counts:Object.freeze({home:featureList.home.length,editor:featureList.editor.length,bridge:featureList.bridge.length,total:featureList.home.length+featureList.editor.length+featureList.bridge.length}),
    audit:()=>({version:VERSION,counts:{home:featureList.home.length,editor:featureList.editor.length,bridge:featureList.bridge.length,total:featureList.home.length+featureList.editor.length+featureList.bridge.length},duplicates:(()=>{const ids=[...featureList.home,...featureList.editor,...featureList.bridge].map(x=>x.id);return ids.length-new Set(ids).size;})(),actionsMissing:[...featureList.home,...featureList.editor,...featureList.bridge].filter(x=>typeof x.run!=='function').length,homeCards:getCards().length,favorites:favorites.size,hubFavorites:hubFavorites.size}),
    open:scope=>openHub(scope|| (isEditor()?'editor':'home')),
    close:closeHub,
    list:scope=>(featureList[scope]||[]).map(({id,category,title,description})=>({id,category,title,description})),
    run:id=>{const item=[...featureList.home,...featureList.editor,...featureList.bridge].find(x=>x.id===id);if(!item)return false;executeFeature(item);return true;}
  });
})();
