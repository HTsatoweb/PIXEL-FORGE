/* PIXEL FORGE STUDIO v17 compatibility + release-notice layer.
   The original editor controls remain the source of truth.  This file only
   improves browser UI, accessibility and navigation around existing tools. */
(() => {
  'use strict';
  const VERSION = '53.0';
  const UPDATE_KEY = 'pf-update-dismissed-version';
  const $ = (id) => document.getElementById(id);
  const safeGet = (key) => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const safeSet = (key, value) => { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } };

  // 01-18: stable dark native controls and browser-native menu fallbacks.
  document.documentElement.style.colorScheme = 'dark';
  document.querySelectorAll('select,input,textarea').forEach((el) => {
    el.style.colorScheme = 'dark';
    if (el instanceof HTMLSelectElement) {
      el.querySelectorAll('option,optgroup').forEach((option) => {
        option.style.colorScheme = 'dark';
      });
    }
  });

  // 19-52: one consistent in-app dark picker for EVERY native select.
  // The original <select> stays in the DOM as the single source of truth so
  // app.js handlers, project serialization and dynamic option updates remain intact.
  function installAllSelectPickers() {
    const nativeValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    const nativeSelectedIndex = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
    const states = new Set();
    let activePicker = null;
    let generatedId = 0;

    const getLabel = (select) => {
      const labels = [...document.querySelectorAll('label[for]')]
        .filter((label) => label.htmlFor === select.id)
        .map((label) => label.textContent.trim())
        .filter(Boolean);
      return select.getAttribute('aria-label') || labels[0] || select.title || select.id || '項目';
    };

    function install(select) {
      if (!(select instanceof HTMLSelectElement) || select.dataset.pfSelectReady === '1') return;
      // Multi-select and listbox controls have different semantics; none of the
      // shipped controls use them. Leave them native rather than changing behavior.
      if (select.multiple || select.size > 1 || !select.parentNode) return;
      select.dataset.pfSelectReady = '1';

      const labelMap = {
        gradientType: 'グラデーション種類', symmetry: '対称描画', brushCategory: '画材カテゴリ',
        brushPreset: 'ペン・筆の種類', waterPreset: '水彩レシピ', paperTexture: '紙質',
        textFont: 'フォント', textWeight: '文字の太さ', textAlign: '文字配置',
        animationLoopMode: '再生方式', feelPreset: '描き心地', renderQuality: '描画品質',
        blendMode: '合成モード', canvasPreset: 'キャンバスプリセット', backgroundMode: '背景モード',
        exportScale: '書き出し倍率', brushProfileSelect: '保存済み画材設定', pressureProfile: '筆圧の反応',
        textureScale: '紙目・画材粒度', strokeCorrection: '線の補正モード',
        newPreset: '新規キャンバスプリセット', newBackground: '新規キャンバス背景'
      };
      const labelText = labelMap[select.id] || getLabel(select);
      const originalRect = select.getBoundingClientRect();
      const originalStyle = getComputedStyle(select);
      const isFullWidth = select.classList.contains('fieldselect') || !!select.closest('.field');
      const isBlendRow = !!select.closest('.blendrow');
      const isContext = !!select.closest('.contextbar');
      const host = document.createElement('div');
      host.className = 'pf-brush-picker pf-select-host';
      host.dataset.pfSelectHost = 'true';
      if (isContext) host.classList.add('pf-select-compact');
      if (isFullWidth) host.style.width = '100%';
      else if (isBlendRow) { host.style.flex = '1 1 0'; host.style.minWidth = '0'; host.style.width = '0'; }
      else host.style.width = originalRect.width > 0 ? `${originalRect.width}px` : 'auto';
      if (isContext) host.style.maxWidth = originalStyle.maxWidth && originalStyle.maxWidth !== 'none' ? originalStyle.maxWidth : '145px';
      if (originalRect.height > 0) host.style.minHeight = `${originalRect.height}px`;
      select.parentNode.insertBefore(host, select);
      host.appendChild(select);
      select.classList.add('pf-native-select-proxy');
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'pf-brush-picker-trigger pf-select-trigger';
      trigger.id = `pfSelectTrigger_${select.id || ++generatedId}`;
      trigger.setAttribute('role', 'combobox');
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-label', `${labelText}を選択`);
      trigger.setAttribute('aria-controls', `${trigger.id}_list`);
      trigger.style.fontSize = originalStyle.fontSize || '';
      const valueText = document.createElement('span');
      valueText.className = 'pf-brush-picker-value';
      const arrow = document.createElement('span');
      arrow.className = 'pf-brush-picker-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '▾';
      trigger.append(valueText, arrow);
      host.appendChild(trigger);

      const popover = document.createElement('div');
      popover.className = 'pf-brush-picker-popover pf-select-popover';
      popover.id = `${trigger.id}_popup`;
      popover.hidden = true;
      popover.setAttribute('role', 'presentation');
      popover.setAttribute('aria-label', `${labelText}の候補`);
      const popHead = document.createElement('div');
      popHead.className = 'pf-brush-picker-heading';
      const popTitle = document.createElement('strong');
      popTitle.textContent = `${labelText}を選択`;
      const popCount = document.createElement('span');
      popCount.className = 'pf-brush-picker-count';
      popHead.append(popTitle, popCount);
      const search = document.createElement('input');
      search.type = 'search';
      search.className = 'pf-select-search';
      search.placeholder = '候補を検索…';
      search.autocomplete = 'off';
      search.spellcheck = false;
      search.setAttribute('aria-label', `${labelText}の候補を検索`);
      search.hidden = select.options.length <= 10 && select.dataset.searchable !== 'true';
      const list = document.createElement('div');
      list.className = 'pf-brush-picker-list pf-select-list';
      list.id = `${trigger.id}_list`;
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', `${labelText}の候補`);
      popover.append(popHead, search, list);
      document.body.appendChild(popover);

      const state = {
        select, host, trigger, valueText, popover, popCount, search, list,
        labelText, open: false, activeIndex: -1, activeOptions: [], typeAhead: '', typeAheadTimer: 0,
        syncValue: null, renderOptions: null, positionPopover: null, close: null, openPicker: null
      };
      states.add(state);

      const currentOption = () => select.selectedOptions?.[0] || select.options[select.selectedIndex] || null;
      function visibleOptions() {
        return [...select.options].filter((option) =>
          !option.hidden && !option.disabled && !option.parentElement?.disabled
        );
      }
      function syncValue() {
        const current = currentOption();
        valueText.textContent = current ? (current.label || current.textContent).trim() : '選択してください';
        trigger.disabled = select.disabled || visibleOptions().length === 0;
        trigger.setAttribute('aria-valuetext', valueText.textContent);
        trigger.title = valueText.textContent;
        trigger.setAttribute('aria-disabled', String(trigger.disabled));
        search.hidden = select.options.length <= 10 && select.dataset.searchable !== 'true';
        if (state.open) renderOptions();
      }
      function focusActive(scroll = true) {
        const nodes = [...list.querySelectorAll('.pf-brush-picker-option')];
        nodes.forEach((node, index) => node.classList.toggle('is-active', index === state.activeIndex));
        if (state.activeIndex >= 0 && nodes[state.activeIndex]) {
          trigger.setAttribute('aria-activedescendant', nodes[state.activeIndex].id);
          if (scroll) nodes[state.activeIndex].scrollIntoView({ block: 'nearest' });
        } else trigger.removeAttribute('aria-activedescendant');
      }
      function renderOptions() {
        const query = search.value.trim().toLocaleLowerCase();
        const all = visibleOptions();
        const filtered = all.filter((option) => {
          const label = (option.label || option.textContent || '').trim().toLocaleLowerCase();
          const group = option.parentElement instanceof HTMLOptGroupElement ? option.parentElement.label : '';
          return !query || label.includes(query) || group.toLocaleLowerCase().includes(query);
        });
        state.activeOptions = filtered;
        list.replaceChildren();
        popCount.textContent = `${filtered.length} / ${all.length} 件`;
        if (!filtered.length) {
          const empty = document.createElement('div');
          empty.className = 'pf-brush-picker-empty';
          empty.textContent = '一致する項目がありません。検索条件を変更してください。';
          list.appendChild(empty);
          state.activeIndex = -1;
          return;
        }
        const selectedIndex = filtered.findIndex((option) => option.value === select.value);
        state.activeIndex = selectedIndex >= 0 ? selectedIndex : Math.min(Math.max(state.activeIndex, 0), filtered.length - 1);
        let lastGroup = null;
        filtered.forEach((option, index) => {
          const group = option.parentElement instanceof HTMLOptGroupElement ? option.parentElement.label : '';
          if (group && group !== lastGroup) {
            const heading = document.createElement('div');
            heading.className = 'pf-select-group-heading';
            heading.textContent = group;
            list.appendChild(heading);
            lastGroup = group;
          }
          const item = document.createElement('button');
          item.type = 'button';
          item.className = 'pf-brush-picker-option' + (option.value === select.value ? ' is-selected' : '');
          item.id = `${trigger.id}_option_${index}`;
          item.dataset.optionIndex = String(index);
          item.setAttribute('role', 'option');
          item.setAttribute('aria-selected', String(option.value === select.value));
          const label = document.createElement('span');
          label.className = 'pf-brush-option-label';
          label.textContent = (option.label || option.textContent).trim();
          const mark = document.createElement('span');
          mark.className = 'pf-brush-option-mark';
          mark.setAttribute('aria-hidden', 'true');
          mark.textContent = option.value === select.value ? '✓' : '';
          item.append(label, mark);
          item.addEventListener('pointerdown', (event) => event.preventDefault());
          item.addEventListener('click', () => choose(option.value));
          list.appendChild(item);
        });
        focusActive(false);
      }
      function positionPopover() {
        if (!state.open || !trigger.isConnected || !popover.isConnected) return;
        const rect = trigger.getBoundingClientRect();
        const vv = window.visualViewport;
        const margin = 10;
        // visualViewport reflects the actually visible area when mobile browser
        // chrome, zoom, or the software keyboard changes the available space.
        const viewportWidth = Math.max(1, vv?.width || window.innerWidth || document.documentElement.clientWidth);
        const viewportHeight = Math.max(1, vv?.height || window.innerHeight || document.documentElement.clientHeight);
        const offsetLeft = Math.max(0, vv?.offsetLeft || 0);
        const offsetTop = Math.max(0, vv?.offsetTop || 0);
        const minLeft = offsetLeft + margin;
        const maxRight = offsetLeft + viewportWidth - margin;
        const minTop = offsetTop + margin;
        const maxBottom = offsetTop + viewportHeight - margin;
        const width = Math.max(1, Math.min(Math.max(rect.width, 220), maxRight - minLeft, 440));
        popover.style.width = `${width}px`;
        const visibleHeight = Math.max(1, maxBottom - minTop);
        const maxHeight = Math.max(1, Math.min(390, visibleHeight * 0.72));
        const below = Math.max(0, maxBottom - rect.bottom);
        const above = Math.max(0, rect.top - minTop);
        const placeBelow = below >= Math.min(220, maxHeight) || below >= above;
        const available = Math.max(1, placeBelow ? below : above);
        const height = Math.min(maxHeight, available);
        popover.style.maxHeight = `${height}px`;
        const top = placeBelow
          ? Math.min(maxBottom - height, Math.max(minTop, rect.bottom + 6))
          : Math.max(minTop, Math.min(maxBottom - height, rect.top - height - 6));
        const left = Math.max(minLeft, Math.min(maxRight - width, rect.left));
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
        // Select lists are portalled to <body>; give them a layer above the
        // drawer/scrim/modal that owns the trigger instead of leaving them behind it.
        const layerRoots = ['rightbar','mobilePanelScrim','menuPopup','pf36Backdrop','pfUiManager','appSettingsModal','newModal','brushGuideModal','pfCommandPalette'];
        let topLayer = 13040;
        for (const id of layerRoots) {
          const el = document.getElementById(id);
          if (!el || el.hidden || el.classList.contains('hidden')) continue;
          const z = Number.parseInt(getComputedStyle(el).zIndex, 10);
          if (Number.isFinite(z)) topLayer = Math.max(topLayer, z);
        }
        popover.style.zIndex = String(topLayer + 10);
      }
      function close(returnFocus = false, reason = 'manual') {
        if (!state.open) return false;
        state.open = false;
        popover.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        trigger.removeAttribute('aria-activedescendant');
        if (activePicker === state) activePicker = null;
        if (returnFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
        window.dispatchEvent(new CustomEvent('pf:select-menu-close', { detail: { id: select.id, reason } }));
        return true;
      }
      function choose(value) {
        const option = [...select.options].find((item) => item.value === value && !item.hidden && !item.disabled && !item.parentElement?.disabled);
        if (!option || select.disabled) return;
        select.value = value;
        // Match native select interaction: update listeners and legacy app state.
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncValue();
        close(true);
      }
      function moveActive(delta) {
        if (!state.activeOptions.length) return;
        state.activeIndex = Math.max(0, Math.min(state.activeOptions.length - 1, state.activeIndex + delta));
        focusActive(true);
        list.querySelectorAll('.pf-brush-picker-option')[state.activeIndex]?.focus({ preventScroll: true });
      }
      function openPicker() {
        if (trigger.disabled) return;
        if (activePicker && activePicker !== state) activePicker.close(false);
        state.open = true;
        activePicker = state;
        window.dispatchEvent(new CustomEvent('pf:select-menu-open', { detail: { id: select.id } }));
        search.value = '';
        popover.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        renderOptions();
        positionPopover();
        requestAnimationFrame(() => {
          const chosen = list.querySelector('.is-selected') || list.querySelector('.pf-brush-picker-option');
          chosen?.focus({ preventScroll: true });
        });
      }
      state.syncValue = syncValue;
      state.renderOptions = renderOptions;
      state.positionPopover = positionPopover;
      state.close = close;
      state.openPicker = openPicker;

      trigger.addEventListener('click', () => state.open ? close() : openPicker());
      trigger.addEventListener('keydown', (event) => {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'F4'].includes(event.key) || (event.altKey && event.key === 'ArrowDown')) {
          event.preventDefault();
          if (!state.open) openPicker();
          else moveActive(event.key === 'ArrowUp' ? -1 : 1);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          state.typeAhead += event.key.toLocaleLowerCase('ja');
          clearTimeout(state.typeAheadTimer);
          state.typeAheadTimer = setTimeout(() => { state.typeAhead = ''; }, 800);
          const match = visibleOptions().find((option) => (option.label || option.textContent).trim().toLocaleLowerCase('ja').startsWith(state.typeAhead));
          if (match) choose(match.value);
        }
      });
      list.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1); }
        else if (event.key === 'Home') { event.preventDefault(); state.activeIndex = 0; focusActive(); list.querySelectorAll('.pf-brush-picker-option')[0]?.focus(); }
        else if (event.key === 'End') { event.preventDefault(); state.activeIndex = state.activeOptions.length - 1; focusActive(); list.querySelectorAll('.pf-brush-picker-option')[state.activeIndex]?.focus(); }
        else if (event.key === 'PageDown') { event.preventDefault(); moveActive(8); }
        else if (event.key === 'PageUp') { event.preventDefault(); moveActive(-8); }
        else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (state.activeOptions[state.activeIndex]) choose(state.activeOptions[state.activeIndex].value); }
        else if (event.key === 'Escape') { event.preventDefault(); close(true); }
        else if (event.key === 'Tab') close();
      });
      search.addEventListener('input', renderOptions);
      search.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { event.preventDefault(); close(true); }
        else if (event.key === 'ArrowDown') { event.preventDefault(); list.querySelector('.pf-brush-picker-option')?.focus(); }
      });
      select.addEventListener('change', syncValue);
      select.addEventListener('input', syncValue);
      const optionObserver = new MutationObserver(() => { syncValue(); if (state.open) { renderOptions(); positionPopover(); } });
      optionObserver.observe(select, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'label', 'value'] });
      const form = select.form;
      form?.addEventListener('reset', () => setTimeout(syncValue, 0));

      // Catch legacy direct assignments like select.value = project.settings.foo.
      // The native getter/setter remains authoritative; this only refreshes the label.
      try {
        if (nativeValue?.get && nativeValue?.set) {
          Object.defineProperty(select, 'value', {
            configurable: true,
            get() { return nativeValue.get.call(this); },
            set(value) { nativeValue.set.call(this, value); syncValue(); }
          });
        }
        if (nativeSelectedIndex?.get && nativeSelectedIndex?.set) {
          Object.defineProperty(select, 'selectedIndex', {
            configurable: true,
            get() { return nativeSelectedIndex.get.call(this); },
            set(value) { nativeSelectedIndex.set.call(this, value); syncValue(); }
          });
        }
      } catch (_) { /* native control remains hidden only visually; events are still connected */ }

      // Redirect each associated label to the visible button, not the clipped proxy.
      if (select.id) {
        [...document.querySelectorAll('label[for]')].filter((label) => label.htmlFor === select.id)
          .forEach((label) => { label.htmlFor = trigger.id; });
      }
      syncValue();
    }

    document.querySelectorAll('select').forEach(install);
    // Some profile and future tool menus rebuild their <option> list at runtime.
    const documentObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('select')) install(node);
          node.querySelectorAll?.('select').forEach(install);
        }
      }
    });
    documentObserver.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('pointerdown', (event) => {
      if (!activePicker) return;
      if (!activePicker.host.contains(event.target) && !activePicker.popover.contains(event.target)) activePicker.close(false);
    }, true);
    window.addEventListener('resize', () => activePicker?.positionPopover(), { passive: true });
    window.addEventListener('scroll', () => activePicker?.positionPopover(), { passive: true, capture: true });
    window.visualViewport?.addEventListener('resize', () => activePicker?.positionPopover(), { passive: true });
    window.visualViewport?.addEventListener('scroll', () => activePicker?.positionPopover(), { passive: true });
    window.addEventListener('pagehide', () => states.forEach((state) => state.close(false)));

    window.PFStudio = window.PFStudio || {};
    window.PFStudio.closeSelectMenus = () => states.forEach((state) => state.close(false, 'manual'));
    window.PFStudio.getActiveSelectMenu = () => activePicker ? { id: activePicker.select.id || '', label: activePicker.labelText, element: activePicker.popover, trigger: activePicker.host } : null;
    window.PFStudio.closeActiveSelectMenu = (returnFocus = true, reason = 'manual') => activePicker ? activePicker.close(returnFocus, reason) : false;
    window.PFStudio.openSelectMenu = (id) => {
      const state = [...states].find((item) => item.select.id === id);
      state?.openPicker();
      return !!state;
    };
    window.PFStudio.selectMenuCount = () => states.size;
  }

  // 53-69: closable, version-keyed update notice (future releases reappear).
  function installUpdateNotice() {
    const notice = $('updateNotice');
    const close = $('updateNoticeClose');
    if (!notice || !close) return;
    const dismissed = safeGet(UPDATE_KEY) === VERSION;
    notice.hidden = dismissed;
    close.addEventListener('click', () => {
      notice.hidden = true;
      safeSet(UPDATE_KEY, VERSION);
    });
    window.PFStudio = window.PFStudio || {};
    window.PFStudio.showUpdateNotice = () => {
      notice.hidden = false;
      safeSet(UPDATE_KEY, '');
      notice.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
    };
  }

  // 70-86: lightweight runtime and device diagnostics shown without blocking work.
  function installRuntimeStatus() {
    const footer = document.querySelector('.bottombar');
    if (!footer || $('pfRuntimeStatus')) return;
    const status = document.createElement('span');
    status.id = 'pfRuntimeStatus';
    status.className = 'pf-runtime-status';
    status.setAttribute('aria-live', 'polite');
    const secureEnough = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
    const pointer = 'PointerEvent' in window ? '入力OK' : '入力制限';
    const memory = navigator.deviceMemory ? `${navigator.deviceMemory}GB` : '端末情報なし';
    status.textContent = `${pointer} · ${memory}${secureEnough ? '' : ' · ローカル保存/Worker制限の可能性'}`;
    status.title = `ブラウザ: ${navigator.userAgent}\nHTTPS/localhost: ${secureEnough ? '対応' : '未対応'}\nタッチ点: ${navigator.maxTouchPoints || 0}`;
    footer.appendChild(status);
    window.addEventListener('online', () => { status.dataset.network = 'online'; status.title = 'ネットワーク接続中'; });
    window.addEventListener('offline', () => { status.dataset.network = 'offline'; status.title = 'オフラインです。ローカル編集は続行できます'; });
    if (!navigator.onLine) status.dataset.network = 'offline';
  }

  // 87-100: safer keyboard/focus and viewport behavior for desktop, tablet and pen.
  function installAccessibilityAndInputGuards() {
    document.querySelectorAll('button:not([aria-label]):not([title])').forEach((button) => {
      const text = (button.textContent || '').trim().replace(/\s+/g, ' ');
      if (text) button.setAttribute('aria-label', text.slice(0, 100));
    });
    document.querySelectorAll('input[type="range"]').forEach((range) => {
      if (!range.getAttribute('aria-label') && range.id) {
        const label = document.querySelector(`label[for="${CSS.escape(range.id)}"]`);
        if (label) range.setAttribute('aria-label', label.textContent.trim());
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        window.PFStudio?.closeSelectMenus?.();
      }
    });
    // Edge pen input: avoid accidental browser gestures while interacting with
    // the canvas, but do not suppress native gestures on ordinary form controls.
    const canvas = $('display');
    canvas?.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'pen' || event.pointerType === 'touch') {
        try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
      }
    }, { passive: true });
    window.addEventListener('pagehide', () => {
      window.PFStudio?.closeSelectMenus?.();
    });
  }

  // 101-112: route help entry points into the new guide site.
  function installHelpLinks() {
    const helpButton = $('menuHelp');
    if (!helpButton) return;
    window.PFStudio = window.PFStudio || {};
    window.PFStudio.openHelp = () => window.open('./help.html', '_blank', 'noopener,noreferrer');
    $('helpSiteButton')?.addEventListener('click', () => window.PFStudio.openHelp());
  }

  installAllSelectPickers();
  installUpdateNotice();
  installRuntimeStatus();
  installAccessibilityAndInputGuards();
  installHelpLinks();
})();
