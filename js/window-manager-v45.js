/* PIXEL FORGE STUDIO v45 — universal window, dialog, mobile-back and hard-close recovery. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const setAttr = (el, name, value) => {
    if (!el) return;
    const next = String(value);
    if (el.getAttribute(name) !== next) el.setAttribute(name, next);
  };
  const SPECS = [
    { id: 'newModal', label: '新しいキャンバス', kind: 'hidden', close: '#newModalClose', dialog: '.modal' },
    { id: 'brushGuideModal', label: '描き方ガイド', kind: 'hidden', close: '#brushGuideClose', dialog: '.modal' },
    { id: 'appSettingsModal', label: 'アプリ全体設定', kind: 'hidden', close: '#settingsClose', dialog: '.pf-settings-modal' },
    { id: 'pfDiagnosticsModal', label: '端末・ブラウザ診断', kind: 'hidden', close: '#pfDiagnosticsClose', dialog: '.pf-settings-modal' },
    { id: 'installHelpModal', label: 'アプリ導入ガイド', kind: 'hidden', close: '#installHelpClose', dialog: '.pf-settings-modal' },
    { id: 'pfCommandPalette', label: 'コマンドパレット', kind: 'hidden', close: '#pfCommandClose', dialog: '.pf-command-dialog' },
    { id: 'pf36Backdrop', label: 'Studio+ ワークスペース', kind: 'pf36', close: '#pf36Close', dialog: '.pf36-window' },
    { id: 'pfUiManager', label: 'UI整理', kind: 'uiManager', close: '.pf-ui-dialog-close', dialog: '.pf-ui-dialog' }
  ];
  const specById = new Map(SPECS.map((spec) => [spec.id, spec]));
  const openEntries = new Map();
  const genericSpecIds = new WeakMap();
  let genericSpecSerial = 0;
  const GENERIC_ROOT_SELECTOR = '[data-pf-window-root], [role="dialog"][aria-modal="true"]';
  const closingGenericRoots = new WeakSet();
  const closeReasons = new Map();
  let observer = null;
  let serial = 0;
  let menuWasOpen = false;
  let menuReturnFocus = null;
  let menuCloseReason = 'manual';
  let viewportFrame = 0;

  const mobileQuery = window.matchMedia?.('(max-width: 760px), (max-width: 900px) and (any-pointer: coarse), (max-height: 520px) and (any-pointer: coarse)');
  const isMobile = () => !!mobileQuery?.matches;

  function rootOf(spec) { return spec?.root || $(spec?.id); }
  function genericSpecs() {
    const roots = [...document.querySelectorAll(GENERIC_ROOT_SELECTOR)];
    return roots.filter(root => {
      // The mobile settings drawer temporarily becomes role=dialog. It has its
      // own close flow and must not be registered as a generic modal as well.
      if (root.id === 'rightbar' || root.closest?.('#rightbar')) return false;
      if (SPECS.some(spec => {
        const known = $(spec.id);
        return known && (root === known || known.contains(root) || root.contains(known));
      })) return false;
      // A dialog inside a known overlay belongs to that overlay, not to a second layer.
      if (root.closest(SPECS.map(spec => `#${CSS.escape(spec.id)}`).join(','))) return false;
      return !root.parentElement?.closest(GENERIC_ROOT_SELECTOR);
    }).map(root => {
      let id = genericSpecIds.get(root);
      if (!id) { id = `__pfGeneric${++genericSpecSerial}`; genericSpecIds.set(root, id); }
      return { id, label: root.getAttribute('aria-label') || root.querySelector('h1,h2,h3')?.textContent?.trim() || '追加ウィンドウ', kind: 'generic', root, dialog: null };
    });
  }
  function allSpecs() { return [...SPECS, ...genericSpecs()]; }
  function isOpen(spec) {
    const root = rootOf(spec);
    if (!root || !root.isConnected) return false;
    if (spec.kind === 'pf36') return root.classList.contains('is-open');
    if (spec.kind === 'uiManager') return !root.hidden && root.classList.contains('is-open');
    if (spec.kind === 'generic') {
      if (root.hidden || root.classList.contains('hidden')) return false;
      const style = getComputedStyle(root);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }
    return !root.classList.contains('hidden') && !root.hidden;
  }
  function openSpecs() {
    return allSpecs().filter(isOpen).sort((a, b) => {
      const za = Number.parseInt(getComputedStyle(rootOf(a)).zIndex, 10) || 0;
      const zb = Number.parseInt(getComputedStyle(rootOf(b)).zIndex, 10) || 0;
      return za - zb || SPECS.indexOf(a) - SPECS.indexOf(b);
    });
  }
  function topOpenSpec() {
    const items = openSpecs();
    return items.length ? items[items.length - 1] : null;
  }
  function menuRoot() { return $('menuPopup'); }
  function menuIsOpen() { const menu = menuRoot(); return !!menu && !menu.classList.contains('hidden'); }
  function menuOutranks(spec) {
    if (!menuIsOpen()) return false;
    if (!spec) return true;
    const menuZ = Number.parseInt(getComputedStyle(menuRoot()).zIndex, 10) || 0;
    const modalZ = Number.parseInt(getComputedStyle(rootOf(spec)).zIndex, 10) || 0;
    return menuZ >= modalZ;
  }
  function closeMenu(reason = 'manual') {
    const menu = menuRoot();
    if (!menuIsOpen()) return false;
    menuCloseReason = reason;
    menu.classList.add('hidden');
    setAttr(menu, 'aria-hidden', 'true');
    return true;
  }
  function syncMenuTriggers(open) {
    const triggers = [...document.querySelectorAll('#menuFile,#menuEdit,#menuCanvas,#menuView,#menuHelp,#mobileMore')];
    triggers.forEach((trigger) => {
      setAttr(trigger, 'aria-haspopup', 'menu');
      setAttr(trigger, 'aria-expanded', String(!!open && trigger === menuReturnFocus));
    });
  }
  function selectMenuInfo() {
    try { return window.PFStudio?.getActiveSelectMenu?.() || null; } catch (_) { return null; }
  }
  function closeActiveSelectMenu(reason = 'manual') {
    const info = selectMenuInfo();
    if (!info) return false;
    try { return !!window.PFStudio?.closeActiveSelectMenu?.(true, reason); } catch (error) {
      console.warn('Select menu close failed:', error);
      return false;
    }
  }
  function closeMobilePanel(reason = 'manual') {
    if (!document.body.classList.contains('mobile-panel-open')) return false;
    try { window.PF_EDITOR_ACTIONS?.closePanel?.(); } catch (error) {
      console.warn('Settings panel close failed:', error);
    }
    // Do not synthesize a click on the close button here: the delegated
    // capture handler would call closeTop() again and could recurse.
    setBodyClass('mobile-panel-open', false);
    $('rightbar')?.classList.add('collapsed');
    setAttr($('rightbar'), 'aria-hidden', 'true');
    setAttr($('panelToggle'), 'aria-expanded', 'false');
    setAttr($('mobilePanelScrim'), 'aria-hidden', 'true');
    restorePageState();
    syncMobileHistoryState();
    return true;
  }
  function syncMenuState() {
    const menu = menuRoot();
    if (!menu) return;
    const open = menuIsOpen();
    if (open && !menuWasOpen) {
      menuWasOpen = true;
      // Preserve the trigger captured by the delegated click handler. For
      // programmatic opens, fall back to the current focused element.
      if (!menuReturnFocus?.isConnected || !menuReturnFocus.matches?.('#menuFile,#menuEdit,#menuCanvas,#menuView,#menuHelp,#mobileMore')) {
        menuReturnFocus = document.activeElement;
      }
      menuCloseReason = 'manual';
      setAttr(menu, 'aria-hidden', 'false');
    } else if (!open && menuWasOpen) {
      menuWasOpen = false;
      setAttr(menu, 'aria-hidden', 'true');
      if (!topOpenSpec() && !document.body.classList.contains('mobile-panel-open') && menuReturnFocus?.isConnected) {
        const target = menuReturnFocus;
        requestAnimationFrame(() => { if (!menuIsOpen() && !topOpenSpec() && target.isConnected) target.focus?.({ preventScroll: true }); });
      }
      menuReturnFocus = null;
      menuCloseReason = 'manual';
    }
    syncMenuTriggers(open);
    if (open) {
      setAttr(menu, 'aria-hidden', 'false');
      menu.querySelectorAll('button').forEach((button) => { if (button.getAttribute('role') !== 'menuitem') button.setAttribute('role', 'menuitem'); });
      if (!menu.contains(document.activeElement)) {
        const first = menu.querySelector('button:not([disabled])');
        if (first) requestAnimationFrame(() => { if (menuIsOpen() && !menu.contains(document.activeElement)) first.focus({ preventScroll: true }); });
      }
    }
  }
  function topmostMenuIsActive() { return menuOutranks(topOpenSpec()); }
  function focusables(spec) {
    const root = rootOf(spec);
    const scope = spec.dialog ? (root?.querySelector(spec.dialog) || root) : root;
    if (!scope) return [];
    return [...scope.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.hidden && el.getAttribute('aria-hidden') !== 'true' && el.getClientRects().length > 0);
  }
  function focusInto(spec) {
    const root = rootOf(spec);
    if (!root) return;
    setAttr(root, 'aria-hidden', 'false');
    const scope = spec.dialog ? (root.querySelector(spec.dialog) || root) : root;
    const candidates = [...scope.querySelectorAll('[autofocus],input[type="search"],input:not([type="hidden"]),select,textarea,button:not([disabled]),[tabindex]:not([tabindex="-1"])')];
    const target = candidates.find((el) => !el.hidden && el.getAttribute('aria-hidden') !== 'true' && el.getClientRects().length > 0) || scope;
    if (!target.hasAttribute('tabindex') && target === scope) target.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => {
      if (isOpen(spec) && target.isConnected) {
        try { target.focus({ preventScroll: true }); } catch (_) { target.focus?.(); }
      }
    });
  }
  function activeLayerId() {
    const spec = topOpenSpec();
    if (topmostMenuIsActive()) return '__pfMenuPopup';
    if (selectMenuInfo()) return '__pfSelectMenu';
    if (spec) return spec.id;
    if (document.body.classList.contains('mobile-panel-open')) return '__mobile-panel';
    return null;
  }
  function isOurHistoryMarker(marker) {
    return !!marker && marker.owner === 'pixel-forge-studio' && Number.isFinite(marker.token);
  }
  function syncMobileHistoryState() {
    if (!window.history?.pushState || !window.history?.replaceState) return;
    const current = history.state && typeof history.state === 'object' ? history.state : {};
    const marker = current.__pfV44Window;
    const activeId = isMobile() ? activeLayerId() : null;
    if (!isMobile()) {
      if (isOurHistoryMarker(marker)) {
        const next = { ...current };
        delete next.__pfV44Window;
        try { history.replaceState(next, '', location.href); } catch (_) { /* keep normal navigation available */ }
      }
      return;
    }
    if (activeId) {
      const nextMarker = { owner: 'pixel-forge-studio', id: activeId, token: marker?.token || ++serial };
      try {
        if (isOurHistoryMarker(marker)) {
          if (marker.id !== activeId || marker.owner !== 'pixel-forge-studio') history.replaceState({ ...current, __pfV44Window: nextMarker }, '', location.href);
        } else history.pushState({ ...current, __pfV44Window: nextMarker }, '', location.href);
      } catch (error) { console.warn('Window history integration unavailable:', error); }
    } else if (isOurHistoryMarker(marker)) {
      // Remove only our temporary marker. Calling history.back() here could
      // accidentally navigate away when the app has no previous page entry.
      const next = { ...current };
      delete next.__pfV44Window;
      try { history.replaceState(next, '', location.href); } catch (_) { /* leave the current view usable */ }
    }
  }
  function restorePageState() {
    if (!$('#pf36Backdrop')?.classList.contains('is-open')) setBodyClass('pf36-open', false);
    const manager = $('pfUiManager');
    if (!manager || manager.hidden || !manager.classList.contains('is-open')) setBodyClass('pf-ui-manager-open', false);
    const right = $('rightbar');
    if (right) {
      if (isMobile()) {
        const panelOpen = document.body.classList.contains('mobile-panel-open') && !right.classList.contains('collapsed');
        if (!panelOpen) setBodyClass('mobile-panel-open', false);
        right.classList.toggle('collapsed', !panelOpen);
        setAttr(right, 'aria-hidden', !panelOpen);
        setAttr(right, 'role', panelOpen ? 'dialog' : 'complementary');
        setAttr(right, 'aria-modal', panelOpen ? 'true' : 'false');
        setAttr($('mobilePanelScrim'), 'aria-hidden', !panelOpen);
        setAttr($('panelToggle'), 'aria-expanded', panelOpen);
      } else {
        // Desktop collapse is a user preference; do not force the panel open.
        setBodyClass('mobile-panel-open', false);
        setAttr(right, 'aria-hidden', right.classList.contains('collapsed'));
        setAttr(right, 'role', 'complementary');
        setAttr(right, 'aria-modal', 'false');
        setAttr($('mobilePanelScrim'), 'aria-hidden', 'true');
        setAttr($('panelToggle'), 'aria-expanded', !right.classList.contains('collapsed'));
      }
    }
  }
  function setBodyClass(name, enabled) {
    const has = document.body.classList.contains(name);
    if (has !== !!enabled) document.body.classList.toggle(name, !!enabled);
  }
  function closeGenericRoot(root, reason = 'manual') {
    if (!root || !root.isConnected) return false;
    // Give component owners a synchronous opportunity to stop timers/workers.
    try { root.dispatchEvent(new CustomEvent('pf:request-close', { bubbles: true, detail: { reason } })); } catch (_) {}
    if (root.hasAttribute('hidden')) root.hidden = true;
    else root.classList.add('hidden');
    setAttr(root, 'aria-hidden', 'true');
    root.setAttribute('data-pf-closed-by-manager', 'true');
    return true;
  }
  function findSpecForRoot(root) {
    if (!root) return null;
    // Prefer the outer window owner: many dialogs contain a nested role=dialog
    // section, but the owner wrapper is the element whose visibility changes.
    const owner = root.closest?.('[data-pf-window-root]') || root;
    const known = SPECS.find(spec => {
      const candidate = rootOf(spec);
      return candidate && (candidate === owner || candidate === root || candidate.contains(owner) || candidate.contains(root));
    });
    if (known) return known;
    return genericSpecs().find(spec => rootOf(spec) === owner || rootOf(spec) === root) || null;
  }
  function closeSpec(spec, reason = 'manual') {
    const root = rootOf(spec);
    if (!root || !isOpen(spec)) return false;
    closeReasons.set(spec.id, reason);
    if (spec.kind === 'pf36') {
      // Let the feature module clean up playback/observers, then force the shell closed
      // even if a listener was removed or an animation callback failed.
      $(spec.close.slice(1))?.click();
      root.classList.remove('is-open');
      setAttr(root, 'aria-hidden', 'true');
      setBodyClass('pf36-open', false);
    } else if (spec.kind === 'uiManager') {
      root.querySelector(spec.close)?.click();
      root.hidden = true;
      root.classList.remove('is-open');
      setAttr(root, 'aria-hidden', 'true');
      setBodyClass('pf-ui-manager-open', false);
    } else if (spec.kind === 'generic') {
      closeGenericRoot(root, reason);
    } else {
      root.classList.add('hidden');
      root.hidden = false; // Preserve CSS-driven modal layout; the .hidden class owns visibility.
      setAttr(root, 'aria-hidden', 'true');
    }
    restorePageState();
    syncMobileHistoryState();
    return true;
  }
  function closeTop(reason = 'manual') {
    const spec = topOpenSpec();
    if (topmostMenuIsActive()) return closeMenu(reason);
    if (selectMenuInfo()) return closeActiveSelectMenu(reason);
    if (spec) return closeSpec(spec, reason);
    if (document.body.classList.contains('mobile-panel-open')) return closeMobilePanel(reason);
    if (document.body.classList.contains('pf-ui-manager-open') && $('pfUiManager')?.querySelector('[data-pf-ui-close]')) {
      $('pfUiManager').querySelector('[data-pf-ui-close]').click();
      restorePageState();
      syncMobileHistoryState();
      return true;
    }
    return false;
  }
  function closeAll() {
    let closed = 0;
    if (closeMenu('manual')) closed += 1;
    if (closeActiveSelectMenu('manual')) closed += 1;
    [...openSpecs()].reverse().forEach((spec) => { if (closeSpec(spec, 'manual')) closed += 1; });
    if (closeMobilePanel('manual')) closed += 1;
    restorePageState();
    syncMobileHistoryState();
    return closed;
  }
  function onOpenStateChanges() {
    syncMenuState();
    const live = new Set(openSpecs().map((spec) => spec.id));
    const currentSpecs = allSpecs();
    const currentIds = new Set(currentSpecs.map(spec => spec.id));
    for (const spec of currentSpecs) {
      const wasOpen = openEntries.has(spec.id);
      const nowOpen = live.has(spec.id);
      if (!wasOpen && nowOpen) {
        openEntries.set(spec.id, { returnFocus: document.activeElement });
        const root = rootOf(spec);
        setAttr(root, 'aria-hidden', 'false');
        focusInto(spec);
      } else if (wasOpen && !nowOpen) {
        const entry = openEntries.get(spec.id);
        openEntries.delete(spec.id);
        const reason = closeReasons.get(spec.id) || 'manual';
        closeReasons.delete(spec.id);
        setAttr(rootOf(spec), 'aria-hidden', 'true');
        if (entry?.returnFocus?.isConnected && !topOpenSpec()) {
          requestAnimationFrame(() => {
            if (!topOpenSpec() && entry.returnFocus.isConnected) {
              try { entry.returnFocus.focus({ preventScroll: true }); } catch (_) { entry.returnFocus.focus?.(); }
            }
          });
        } else if (entry?.returnFocus?.isConnected) {
          const next = topOpenSpec();
          if (next && !rootOf(next)?.contains(document.activeElement)) focusInto(next);
        }
      }
    }
    for (const [id, entry] of [...openEntries]) {
      if (currentIds.has(id)) continue;
      openEntries.delete(id);
      if (entry?.returnFocus?.isConnected && !topOpenSpec()) requestAnimationFrame(() => entry.returnFocus?.focus?.({ preventScroll: true }));
    }
    restorePageState();
    syncMobileHistoryState();
  }
  function onDocumentPointerDown(event) {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    for (const spec of allSpecs()) {
      const root = rootOf(spec);
      if (root && event.target === root && isOpen(spec)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeSpec(spec, 'backdrop-touch');
        return;
      }
    }
  }
  function onDocumentClick(event) {
    if (event.target?.closest?.('#mobilePanelClose,#mobilePanelScrim') && document.body.classList.contains('mobile-panel-open')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMobilePanel('manual');
      return;
    }
    const menuTrigger = event.target?.closest?.('#menuFile,#menuEdit,#menuCanvas,#menuView,#menuHelp,#mobileMore');
    if (menuTrigger) menuReturnFocus = menuTrigger;
    if (event.target?.closest?.('#menuPopup button') && menuReturnFocus?.isConnected) {
      try { menuReturnFocus.focus({ preventScroll: true }); } catch (_) { menuReturnFocus.focus?.(); }
    }
    const closeButton = event.target?.closest?.('[data-pf-window-close]');
    if (closeButton) {
      const root = closeButton.closest('[data-pf-window-root]') ||
        closeButton.closest('#newModal,#brushGuideModal,#appSettingsModal,#pfDiagnosticsModal,#installHelpModal,#pfCommandPalette') ||
        closeButton.closest('[role="dialog"][aria-modal="true"]');
      const spec = root && findSpecForRoot(root);
      if (spec) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeSpec(spec, 'manual');
        return;
      }
    }
    for (const spec of allSpecs()) {
      const root = rootOf(spec);
      if (root && event.target === root && isOpen(spec)) {
        // Clicking the dimmed backdrop closes the dialog; content clicks never do.
        event.preventDefault();
        event.stopImmediatePropagation();
        closeSpec(spec, 'manual');
        return;
      }
    }
  }
  function onKeyDown(event) {
    if (event.key === 'Escape') {
      if (closeTop('manual')) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'w') {
      if (closeTop('manual')) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (selectMenuInfo() && event.key === 'Tab') {
      // Close the floating option list first; focus is returned to its trigger,
      // then normal Tab navigation continues inside the active dialog.
      closeActiveSelectMenu('tab');
    }
    if (menuOutranks(topOpenSpec())) {
      const menuItems = [...menuRoot().querySelectorAll('button:not([disabled])')];
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && menuItems.length) {
        event.preventDefault();
        const current = menuItems.indexOf(document.activeElement);
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        menuItems[(current + delta + menuItems.length) % menuItems.length].focus();
        return;
      }
      if (event.key === 'Tab' && menuItems.length) {
        const current = menuItems.indexOf(document.activeElement);
        if (event.shiftKey && (current <= 0)) { event.preventDefault(); menuItems[menuItems.length - 1].focus(); }
        else if (!event.shiftKey && current === menuItems.length - 1) { event.preventDefault(); menuItems[0].focus(); }
        return;
      }
    }
    if (event.key !== 'Tab') return;
    const spec = topOpenSpec();
    if (!spec) return;
    const items = focusables(spec);
    if (!items.length) { event.preventDefault(); focusInto(spec); return; }
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !rootOf(spec)?.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !rootOf(spec)?.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }
  function onPopState() {
    if (!isMobile()) return;
    const top = topOpenSpec();
    if (topmostMenuIsActive()) closeMenu('pop');
    else if (selectMenuInfo()) closeActiveSelectMenu('pop');
    else if (top) closeSpec(top, 'pop');
    else if (document.body.classList.contains('mobile-panel-open')) closeTop('pop');
    syncMobileHistoryState();
  }
  function updateViewport() {
    cancelAnimationFrame(viewportFrame);
    viewportFrame = requestAnimationFrame(() => {
      const vv = window.visualViewport;
      const width = Math.max(1, vv?.width || window.innerWidth || document.documentElement.clientWidth);
      const height = Math.max(1, vv?.height || window.innerHeight || document.documentElement.clientHeight);
      const top = Math.max(0, vv?.offsetTop || 0);
      const left = Math.max(0, vv?.offsetLeft || 0);
      const root = document.documentElement;
      root.style.setProperty('--pf-v44-visual-width', `${width}px`);
      root.style.setProperty('--pf-v44-visual-height', `${height}px`);
      root.style.setProperty('--pf-v44-visual-top', `${top}px`);
      root.style.setProperty('--pf-v44-visual-left', `${left}px`);
      if (!isMobile() && document.body.classList.contains('mobile-panel-open')) closeTop('resize');
    });
  }
  function audit() {
    const checks = [];
    const add = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: String(detail) });
    let present = 0, closeControls = 0, dialogSemantics = 0;
    for (const spec of SPECS) {
      const root = rootOf(spec);
      const exists = !!root;
      if (exists) present += 1;
      add(`${spec.label}のウィンドウ要素`, exists, exists ? `#${spec.id}` : 'HTML要素が見つかりません');
      if (!exists) continue;
      const close = root.querySelector(spec.close);
      if (close) closeControls += 1;
      add(`${spec.label}の閉じる操作`, !!close, close ? '閉じるボタンまたはUI操作が存在します' : `閉じる操作 ${spec.close} が見つかりません`);
      const dialog = root.matches('[role="dialog"]') || !!root.querySelector('[role="dialog"]');
      if (dialog) dialogSemantics += 1;
      add(`${spec.label}のダイアログ構造`, dialog, dialog ? 'dialog role を確認しました' : 'role="dialog" がありません');
      const label = root.getAttribute('aria-labelledby') || root.querySelector('[aria-labelledby]')?.getAttribute('aria-labelledby') || root.querySelector('h1,h2,h3')?.textContent;
      add(`${spec.label}のタイトル情報`, !!label, label ? 'タイトル情報あり' : '読み上げ用タイトルがありません');
    }
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
    add('HTML IDの重複', duplicateIds.length === 0, duplicateIds.length ? duplicateIds.join(', ') : `${ids.length}件を確認・重複なし`);
    add('Esc共通クローズ', typeof window.PF_WINDOW_MANAGER?.closeTop === 'function', 'Escで最前面のウィンドウを1つ閉じます');
    add('スマホの戻る操作', typeof history.pushState === 'function' && typeof history.back === 'function', '戻る操作で最前面ウィンドウ／設定パネルを閉じる仕組みを登録');
    add('スマホ設定パネルの閉じるボタン', !!$('mobilePanelClose'), $('mobilePanelClose') ? '実際のHTML IDを確認しました' : 'mobilePanelCloseがありません');
    add('スマホ設定パネルの背景タップ', !!$('mobilePanelScrim'), $('mobilePanelScrim') ? '背景タップ領域あり' : 'スクリーン要素がありません');
    add('スマホ設定パネルの閉じる統合', !!$('mobilePanelClose') && !!$('mobilePanelScrim') && typeof closeMobilePanel === 'function', '×・背景タップは直接閉じ、Esc・戻るは上位ウィンドウを優先。合成クリック再帰なし');
    add('スマホ設定パネルのARIA状態', !!$('rightbar') && !!$('mobilePanelScrim'), 'パネルとスクリーンのaria-hidden／roleを同期');
    add('属性監視の循環防止', !/attributeFilter:\s*\[[^\]]*aria-hidden/.test(init.toString()), 'aria-hiddenを監視対象から外し、同じ属性の自己更新ループを防止');
    add('フォーカス制御', typeof requestAnimationFrame === 'function', '初期フォーカス・フォーカス復帰・Tab循環');
    add('画面サイズ追従', !!window.visualViewport || typeof window.addEventListener === 'function', 'VisualViewport / resize / orientationchange');
    add('ウィンドウ復旧API', typeof window.PF_WINDOW_MANAGER?.closeAll === 'function', '全ウィンドウ・スマホパネル一括復旧');
    const menu = menuRoot();
    add('メニューポップアップ要素', !!menu && menu.getAttribute('role') === 'menu', menu ? 'role=menuを確認しました' : 'menuPopupがありません');
    add('カスタム選択メニューの閉じる操作', typeof window.PFStudio?.closeActiveSelectMenu === 'function', 'Esc・外側操作・戻る操作で閉じられます');
    add('メニューボタンの状態同期', [...document.querySelectorAll('#menuFile,#menuEdit,#menuCanvas,#menuView,#menuHelp,#mobileMore')].every((button) => button.getAttribute('aria-haspopup') === 'menu'), 'メニューの開閉状態をボタンへ反映');
    add('メニューの閉じる操作', !!menu && typeof closeMenu === 'function', '外側クリック・Esc・戻る操作に対応');
    add('メニュー項目の読み上げ', !!menu && [...menu.querySelectorAll('button')].every((button) => button.getAttribute('role') === 'menuitem'), '表示中のボタンをmenuitemとして管理');
    const genericCount = genericSpecs().length;
    add('追加ダイアログの自動検出', true, `既知 ${SPECS.length} 系統 + 追加 ${genericCount} 個を動的検出`);
    add('強制閉鎖復旧', typeof closeGenericRoot === 'function', 'コンポーネント側の閉じる処理が失敗した場合も表示状態を復旧');
    add('ウィンドウ要素合計', present === SPECS.length, `${present}/${SPECS.length}個`);
    add('閉じる操作合計', closeControls === SPECS.length, `${closeControls}/${SPECS.length}個`);
    add('ダイアログ構造合計', dialogSemantics === SPECS.length, `${dialogSemantics}/${SPECS.length}個`);
    return { total: checks.length, passed: checks.filter((x) => x.ok).length, failed: checks.filter((x) => !x.ok).length, checks };
  }

  function init() {
    for (const spec of SPECS) {
      const root = rootOf(spec);
      if (root && !isOpen(spec)) setAttr(root, 'aria-hidden', 'true');
    }
    document.addEventListener('pointerdown', onDocumentPointerDown, true);
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('pf:select-menu-open', syncMobileHistoryState);
    window.addEventListener('pf:select-menu-close', syncMobileHistoryState);
    window.addEventListener('resize', updateViewport, { passive: true });
    window.addEventListener('orientationchange', updateViewport, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport, { passive: true });
      window.visualViewport.addEventListener('scroll', updateViewport, { passive: true });
    }
    const watchedRoots = new Set([...SPECS.map(rootOf).filter(Boolean), menuRoot(), $('rightbar')].filter(Boolean));
    const knownRootIds = new Set([...SPECS.map(spec => spec.id), 'menuPopup', 'rightbar']);
    const nodeContainsManagedRoot = node => {
      if (!node || node.nodeType !== 1) return false;
      if (knownRootIds.has(node.id) || node.matches?.(GENERIC_ROOT_SELECTOR)) return true;
      return !!node.querySelector?.(`${GENERIC_ROOT_SELECTOR},${[...knownRootIds].map(id => `#${CSS.escape(id)}`).join(',')}`);
    };
    observer = new MutationObserver(records => {
      let relevant = false;
      for (const record of records) {
        if (record.type === 'attributes') {
          if ((record.target === document.body && record.attributeName === 'class') ||
              (watchedRoots.has(record.target) && (record.attributeName === 'class' || record.attributeName === 'hidden')) ||
              (record.target.matches?.(GENERIC_ROOT_SELECTOR) && (record.attributeName === 'class' || record.attributeName === 'hidden'))) {
            relevant = true; break;
          }
          continue;
        }
        if (record.target === menuRoot() || [...record.addedNodes, ...record.removedNodes].some(nodeContainsManagedRoot)) {
          relevant = true; break;
        }
      }
      if (relevant) onOpenStateChanges();
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    updateViewport();
    onOpenStateChanges();
  }

  window.PF_WINDOW_MANAGER = Object.freeze({
    closeTop,
    closeAll,
    getOpenWindows: () => [...openSpecs().map((spec) => ({ id: spec.id, label: spec.label })), ...(menuIsOpen() ? [{ id: 'menuPopup', label: 'メニュー' }] : []), ...(selectMenuInfo() ? [{ id: 'customSelect', label: `選択メニュー · ${selectMenuInfo().id || '設定'}` }] : []), ...(document.body.classList.contains('mobile-panel-open') ? [{ id: 'rightbar', label: '設定パネル' }] : [])],
    audit,
    repair: () => { restorePageState(); updateViewport(); onOpenStateChanges(); return audit(); }
  });
  window.addEventListener('pf:close-windows', () => closeAll());

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
