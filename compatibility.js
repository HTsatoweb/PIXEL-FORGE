/* PIXEL FORGE STUDIO v11 compatibility + release-notice layer.
   The original editor controls remain the source of truth.  This file only
   improves browser UI, accessibility and navigation around existing tools. */
(() => {
  'use strict';
  const VERSION = '11.0';
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

  // 19-52: Edge/Chromium-safe brush picker. The original select is kept and
  // remains authoritative for every legacy app.js handler and project save.
  function installBrushPicker() {
    const select = $('brushPreset');
    if (!select || select.dataset.pfPickerReady === '1') return;
    select.dataset.pfPickerReady = '1';

    const host = document.createElement('div');
    host.className = 'pf-brush-picker';
    host.dataset.pfPicker = 'brush';
    select.parentNode.insertBefore(host, select);
    host.appendChild(select);
    select.classList.add('pf-native-select-proxy');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'pf-brush-picker-trigger';
    trigger.id = 'pfBrushPickerTrigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'pfBrushPickerList');
    trigger.setAttribute('aria-label', 'ペン・筆の種類を選択');
    const valueText = document.createElement('span');
    valueText.className = 'pf-brush-picker-value';
    const arrow = document.createElement('span');
    arrow.className = 'pf-brush-picker-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '▾';
    trigger.append(valueText, arrow);
    host.appendChild(trigger);

    const popover = document.createElement('div');
    popover.className = 'pf-brush-picker-popover';
    popover.id = 'pfBrushPickerPopover';
    popover.hidden = true;
    popover.setAttribute('role', 'presentation');
    const popHead = document.createElement('div');
    popHead.className = 'pf-brush-picker-heading';
    const popTitle = document.createElement('strong');
    popTitle.textContent = '画材を選択';
    const popCount = document.createElement('span');
    popCount.className = 'pf-brush-picker-count';
    popHead.append(popTitle, popCount);
    const list = document.createElement('div');
    list.className = 'pf-brush-picker-list';
    list.id = 'pfBrushPickerList';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', '利用可能な画材');
    popover.append(popHead, list);
    document.body.appendChild(popover);

    let open = false;
    let activeIndex = -1;
    let typeAhead = '';
    let typeAheadTimer = 0;
    let options = [];

    const currentOption = () => [...select.options].find((o) => o.value === select.value) || select.options[0] || null;
    const visibleOptions = () => [...select.options].filter((o) => !o.hidden && !o.disabled);
    function syncValue() {
      const current = currentOption();
      valueText.textContent = current ? current.textContent.trim() : '画材を選択';
      trigger.disabled = select.disabled || !visibleOptions().length;
      trigger.setAttribute('aria-valuetext', valueText.textContent);
      trigger.title = valueText.textContent;
      if (open) renderOptions();
    }
    function renderOptions() {
      options = visibleOptions();
      list.replaceChildren();
      popCount.textContent = `${options.length} 種類`;
      if (!options.length) {
        const empty = document.createElement('div');
        empty.className = 'pf-brush-picker-empty';
        empty.textContent = '一致する画材がありません。検索条件を変更してください。';
        list.appendChild(empty);
        activeIndex = -1;
        return;
      }
      const selectedIndex = options.findIndex((o) => o.value === select.value);
      activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
      options.forEach((option, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'pf-brush-picker-option' + (option.value === select.value ? ' is-selected' : '');
        item.id = `pf-brush-option-${index}`;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(option.value === select.value));
        item.dataset.value = option.value;
        const label = document.createElement('span');
        label.className = 'pf-brush-option-label';
        label.textContent = option.textContent.trim();
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
      const rect = trigger.getBoundingClientRect();
      const margin = 10;
      const width = Math.min(Math.max(rect.width, 250), window.innerWidth - margin * 2, 420);
      popover.style.width = `${Math.max(220, width)}px`;
      const maxHeight = Math.max(160, Math.min(360, window.innerHeight - margin * 2));
      popover.style.maxHeight = `${maxHeight}px`;
      const below = window.innerHeight - rect.bottom - margin;
      const above = rect.top - margin;
      const placeBelow = below >= Math.min(260, maxHeight) || below >= above;
      const available = Math.max(150, placeBelow ? below : above);
      popover.style.maxHeight = `${Math.min(maxHeight, available)}px`;
      const top = placeBelow ? rect.bottom + 6 : Math.max(margin, rect.top - Math.min(maxHeight, available) - 6);
      const left = Math.max(margin, Math.min(window.innerWidth - width - margin, rect.left));
      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
    }
    function focusActive(scroll = true) {
      const nodes = [...list.querySelectorAll('.pf-brush-picker-option')];
      nodes.forEach((node, i) => node.classList.toggle('is-active', i === activeIndex));
      if (activeIndex >= 0 && nodes[activeIndex]) {
        trigger.setAttribute('aria-activedescendant', nodes[activeIndex].id);
        if (scroll) nodes[activeIndex].scrollIntoView({ block: 'nearest' });
      } else trigger.removeAttribute('aria-activedescendant');
    }
    function openPicker() {
      if (trigger.disabled || open) return;
      open = true;
      popover.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      renderOptions();
      positionPopover();
      requestAnimationFrame(() => {
        const chosen = list.querySelector('.is-selected') || list.querySelector('.pf-brush-picker-option');
        chosen?.focus({ preventScroll: true });
      });
    }
    function closePicker(returnFocus = false) {
      if (!open) return;
      open = false;
      popover.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      if (returnFocus) trigger.focus({ preventScroll: true });
    }
    function choose(value) {
      if (![...select.options].some((o) => o.value === value && !o.hidden)) return;
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncValue();
      closePicker(true);
    }
    function moveActive(delta) {
      if (!options.length) return;
      activeIndex = Math.max(0, Math.min(options.length - 1, activeIndex + delta));
      focusActive(true);
      list.querySelectorAll('.pf-brush-picker-option')[activeIndex]?.focus({ preventScroll: true });
    }

    trigger.addEventListener('click', () => open ? closePicker() : openPicker());
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!open) openPicker();
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        typeAhead += event.key.toLocaleLowerCase('ja');
        clearTimeout(typeAheadTimer);
        typeAheadTimer = setTimeout(() => { typeAhead = ''; }, 800);
        const match = visibleOptions().find((o) => o.textContent.toLocaleLowerCase('ja').startsWith(typeAhead));
        if (match) choose(match.value);
      }
    });
    list.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1); }
      else if (event.key === 'Home') { event.preventDefault(); activeIndex = 0; focusActive(); list.querySelectorAll('.pf-brush-picker-option')[activeIndex]?.focus(); }
      else if (event.key === 'End') { event.preventDefault(); activeIndex = options.length - 1; focusActive(); list.querySelectorAll('.pf-brush-picker-option')[activeIndex]?.focus(); }
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (options[activeIndex]) choose(options[activeIndex].value); }
      else if (event.key === 'Escape') { event.preventDefault(); closePicker(true); }
      else if (event.key === 'Tab') closePicker();
    });
    document.addEventListener('pointerdown', (event) => {
      if (open && !host.contains(event.target) && !popover.contains(event.target)) closePicker();
    }, true);
    window.addEventListener('resize', () => { if (open) positionPopover(); }, { passive: true });
    window.addEventListener('scroll', () => { if (open) positionPopover(); }, { passive: true, capture: true });
    $('brushSearch')?.addEventListener('input', () => { if (open) { renderOptions(); positionPopover(); } });
    $('brushCategory')?.addEventListener('change', () => { if (open) { renderOptions(); positionPopover(); } });
    select.addEventListener('change', syncValue);
    select.addEventListener('input', syncValue);
    const optionObserver = new MutationObserver(() => syncValue());
    optionObserver.observe(select, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'label', 'value'] });

    // Mirror direct legacy value assignments such as loading a project or preset.
    try {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (descriptor?.get && descriptor?.set) {
        Object.defineProperty(select, 'value', {
          configurable: true,
          get() { return descriptor.get.call(this); },
          set(value) { descriptor.set.call(this, value); syncValue(); }
        });
      }
    } catch (_) { /* Native select remains usable if a browser disallows an own accessor. */ }
    // Clicking the existing text label opens the custom list instead of focusing
    // the visually-hidden native select.
    const brushLabel = document.querySelector('label[for="brushPreset"]');
    if (brushLabel) {
      brushLabel.htmlFor = trigger.id;
      brushLabel.addEventListener('click', (event) => {
        event.preventDefault();
        openPicker();
      });
    }
    syncValue();
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
        document.querySelectorAll('.pf-brush-picker-popover:not([hidden])').forEach((node) => { node.hidden = true; });
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
      document.querySelectorAll('.pf-brush-picker-popover').forEach((node) => { node.hidden = true; });
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

  installBrushPicker();
  installUpdateNotice();
  installRuntimeStatus();
  installAccessibilityAndInputGuards();
  installHelpLinks();
})();
