/**
 * In-browser price editor for static GitHub Pages.
 * Password gate reads editor-config.json (client-side only).
 * Edits stay local; export/download products.json for GitHub.
 */
(function () {
  if (!window.PifPrices) return;
  if (!document.getElementById('price-editor')) return;

  const SESSION_KEY = 'pif-editor-unlocked';
  const api = window.PifPrices;
  const panel = document.getElementById('price-editor');
  const listEl = document.getElementById('price-editor-list');
  const statusEl = document.getElementById('price-editor-status');
  const openBtn = document.getElementById('price-editor-open');
  const unlockOpenBtn = document.getElementById('price-editor-unlock-open');
  const closeBtn = document.getElementById('price-editor-close');
  const downloadBtn = document.getElementById('price-editor-download');
  const copyBtn = document.getElementById('price-editor-copy');
  const saveDraftBtn = document.getElementById('price-editor-save-draft');
  const clearDraftBtn = document.getElementById('price-editor-clear-draft');
  const backdrop = document.getElementById('price-editor-backdrop');
  const gate = document.getElementById('price-editor-gate');
  const gateForm = document.getElementById('price-editor-gate-form');
  const gateInput = document.getElementById('price-editor-password');
  const gateError = document.getElementById('price-editor-gate-error');
  const gateCancel = document.getElementById('price-editor-gate-cancel');
  const logoutBtn = document.getElementById('price-editor-logout');

  let working = null;
  let remoteBaseline = null;
  let expectedPassword = null;
  let lastEditorTrigger = null;
  let configLoaded = null;

  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.className = 'price-editor-status' + (kind ? ' is-' + kind : '');
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function isUnlocked() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function setUnlocked(value) {
    if (value) sessionStorage.setItem(SESSION_KEY, '1');
    else sessionStorage.removeItem(SESSION_KEY);
  }

  function updateChrome() {
    const unlocked = isUnlocked();
    const toolbar = document.getElementById('price-editor-toolbar');
    if (toolbar) toolbar.hidden = !unlocked;
    if (openBtn) openBtn.hidden = !unlocked;
    if (logoutBtn) logoutBtn.hidden = !unlocked;
    // Discreet login control is for visitors only
    if (unlockOpenBtn) unlockOpenBtn.hidden = unlocked;
    const discreet = document.querySelector('.price-editor-discreet');
    if (discreet) discreet.hidden = unlocked;
    const unlockedHint = document.getElementById('price-editor-unlocked-hint');
    if (unlockedHint) unlockedHint.hidden = !unlocked;
  }

  function loadConfig() {
    if (configLoaded) return configLoaded;
    configLoaded = fetch('./editor-config.json', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('editor-config HTTP ' + res.status);
        return res.json();
      })
      .then(function (cfg) {
        expectedPassword = cfg && typeof cfg.password === 'string' ? cfg.password : '';
        return cfg;
      });
    return configLoaded;
  }

  function getFocusable(root) {
    return Array.from(
      root.querySelectorAll(
        'button:not([disabled]):not([hidden]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) {
      return !el.closest('[hidden]') && (el.offsetParent !== null || el === document.activeElement);
    });
  }

  function trapFocus(e, root) {
    if (e.key !== 'Tab' || !root) return;
    const focusable = getFocusable(root);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openGate() {
    if (!gate) return;
    lastEditorTrigger = document.activeElement;
    gate.classList.add('is-open');
    gate.setAttribute('aria-hidden', 'false');
    if (backdrop) backdrop.classList.remove('hidden');
    document.body.classList.add('price-editor-open');
    if (gateError) gateError.textContent = '';
    if (gateInput) {
      gateInput.value = '';
      window.setTimeout(function () {
        gateInput.focus();
      }, 0);
    }
  }

  function closeGate(restoreFocus) {
    if (!gate) return;
    gate.classList.remove('is-open');
    gate.setAttribute('aria-hidden', 'true');
    if (backdrop && !panel.classList.contains('is-open')) {
      backdrop.classList.add('hidden');
      document.body.classList.remove('price-editor-open');
    }
    if (restoreFocus !== false && lastEditorTrigger && lastEditorTrigger.focus) {
      lastEditorTrigger.focus();
    }
  }

  function normalizePrice(value) {
    const cleaned = String(value).trim().replace(',', '.');
    if (!cleaned) return '';
    const num = Number(cleaned);
    if (!isFinite(num) || num < 0) return null;
    return num.toFixed(2);
  }

  function readInputsIntoWorking() {
    if (!working) return;
    const inputs = listEl.querySelectorAll('input[data-product-id][data-size-index]');
    inputs.forEach(function (input) {
      const id = input.getAttribute('data-product-id');
      const idx = Number(input.getAttribute('data-size-index'));
      const product = working.find(function (p) {
        return p.id === id;
      });
      if (!product || !product.sizes[idx]) return;
      const normalized = normalizePrice(input.value);
      if (normalized === null) {
        input.classList.add('is-invalid');
        return;
      }
      input.classList.remove('is-invalid');
      if (normalized !== '') {
        product.sizes[idx].price = normalized;
        input.value = normalized;
      }
    });
  }

  function renderList() {
    listEl.innerHTML = '';
    working.forEach(function (product) {
      const card = document.createElement('article');
      card.className = 'price-editor-item';
      const title = document.createElement('h4');
      title.className = 'price-editor-item-title';
      title.textContent = product.name;
      card.appendChild(title);

      (product.sizes || []).forEach(function (size, idx) {
        const row = document.createElement('label');
        row.className = 'price-editor-row';
        const lab = document.createElement('span');
        lab.className = 'price-editor-size';
        lab.textContent = size.label || "Об'єм " + (idx + 1);
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'decimal';
        input.className = 'price-editor-input';
        input.value = size.price;
        input.setAttribute('data-product-id', product.id);
        input.setAttribute('data-size-index', String(idx));
        input.setAttribute('aria-label', product.name + ' — ' + (size.label || ''));
        const suffix = document.createElement('span');
        suffix.className = 'price-editor-suffix';
        suffix.textContent = 'грн';
        row.appendChild(lab);
        row.appendChild(input);
        row.appendChild(suffix);
        card.appendChild(row);

        input.addEventListener('change', function () {
          const n = normalizePrice(input.value);
          if (n === null) {
            input.classList.add('is-invalid');
            setStatus('Перевірте число ціни (наприклад 34.00).', 'error');
            return;
          }
          input.classList.remove('is-invalid');
          if (n !== '') {
            size.price = n;
            input.value = n;
          }
          api.applyPrices(working);
          setStatus('Зміни видно на сторінці. Завантажте JSON, щоб опублікувати.', 'info');
        });
      });

      listEl.appendChild(card);
    });
  }

  function openEditor() {
    if (!isUnlocked()) {
      openGate();
      return;
    }
    lastEditorTrigger = document.activeElement;
    const current = api.getProducts();
    const start = function (products, fromDraft, remote) {
      remoteBaseline = remote || products;
      working = deepClone(products);
      renderList();
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      if (backdrop) backdrop.classList.remove('hidden');
      document.body.classList.add('price-editor-open');
      setStatus(
        fromDraft
          ? 'Відкрито локальну чернетку. Не забудьте завантажити JSON для GitHub.'
          : 'Редагуйте ціни, потім завантажте products.json і замініть файл у репозиторії.',
        fromDraft ? 'warn' : 'info'
      );
      window.setTimeout(function () {
        if (closeBtn) closeBtn.focus();
      }, 0);
    };

    if (current) {
      start(current, !!api.loadDraft(), remoteBaseline || current);
      return;
    }

    api
      .loadProducts()
      .then(function (result) {
        start(result.products, result.fromDraft, result.remote);
      })
      .catch(function () {
        setStatus('Не вдалося завантажити products.json.', 'error');
      });
  }

  function closeEditor(restoreFocus) {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    if (backdrop && !(gate && gate.classList.contains('is-open'))) {
      backdrop.classList.add('hidden');
      document.body.classList.remove('price-editor-open');
    }
    if (restoreFocus !== false && lastEditorTrigger && lastEditorTrigger.focus) {
      lastEditorTrigger.focus();
    }
  }

  function exportJsonText() {
    readInputsIntoWorking();
    const invalid = listEl.querySelector('.is-invalid');
    if (invalid) {
      setStatus('Виправте підсвічені поля перед експортом.', 'error');
      return null;
    }
    return JSON.stringify(working, null, 2) + '\n';
  }

  function downloadJson() {
    const text = exportJsonText();
    if (!text) return;
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    api.saveDraft(working);
    setStatus(
      'Файл products.json завантажено. Замініть ним файл у GitHub (main) і зробіть push — сайт оновиться.',
      'ok'
    );
  }

  function copyJson() {
    const text = exportJsonText();
    if (!text) return;
    function ok() {
      api.saveDraft(working);
      setStatus('JSON скопійовано. Вставте вміст у products.json на GitHub і збережіть.', 'ok');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () {
        fallbackCopy(text) ? ok() : setStatus('Не вдалося скопіювати. Скористайтесь завантаженням.', 'error');
      });
    } else if (fallbackCopy(text)) {
      ok();
    } else {
      setStatus('Не вдалося скопіювати. Скористайтесь завантаженням.', 'error');
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    ta.remove();
    return ok;
  }

  function tryUnlock(event) {
    if (event) event.preventDefault();
    loadConfig()
      .then(function () {
        const entered = gateInput ? gateInput.value : '';
        if (!expectedPassword || entered !== expectedPassword) {
          if (gateError) gateError.textContent = 'Невірний пароль. Спробуйте ще раз.';
          if (gateInput) gateInput.focus();
          return;
        }
        setUnlocked(true);
        updateChrome();
        closeGate(false);
        openEditor();
      })
      .catch(function () {
        if (gateError) {
          gateError.textContent = 'Не вдалося перевірити пароль (editor-config.json).';
        }
      });
  }

  if (openBtn) openBtn.addEventListener('click', openEditor);
  if (unlockOpenBtn) {
    unlockOpenBtn.addEventListener('click', function () {
      loadConfig()
        .then(openGate)
        .catch(function () {
          alert('Не вдалося завантажити editor-config.json');
        });
    });
  }
  if (gateForm) gateForm.addEventListener('submit', tryUnlock);
  if (gateCancel) gateCancel.addEventListener('click', function () { closeGate(true); });
  if (closeBtn) closeBtn.addEventListener('click', function () { closeEditor(true); });
  if (backdrop) {
    backdrop.addEventListener('click', function () {
      if (gate && gate.classList.contains('is-open')) closeGate(true);
      else if (panel.classList.contains('is-open')) closeEditor(true);
    });
  }
  if (downloadBtn) downloadBtn.addEventListener('click', downloadJson);
  if (copyBtn) copyBtn.addEventListener('click', copyJson);
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', function () {
      readInputsIntoWorking();
      if (listEl.querySelector('.is-invalid')) {
        setStatus('Виправте підсвічені поля.', 'error');
        return;
      }
      api.saveDraft(working);
      api.applyPrices(working);
      setStatus('Чернетку збережено в цьому браузері.', 'ok');
    });
  }
  if (clearDraftBtn) {
    clearDraftBtn.addEventListener('click', function () {
      api.clearDraft();
      api
        .loadProducts()
        .then(function (result) {
          working = deepClone(result.products);
          remoteBaseline = result.remote;
          renderList();
          setStatus('Чернетку скинуто. Показано ціни з products.json.', 'info');
        })
        .catch(function () {
          setStatus('Не вдалося перезавантажити products.json.', 'error');
        });
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      setUnlocked(false);
      closeEditor(false);
      closeGate(false);
      updateChrome();
      if (unlockOpenBtn) unlockOpenBtn.focus();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (gate && gate.classList.contains('is-open')) {
        e.preventDefault();
        closeGate(true);
        return;
      }
      if (panel.classList.contains('is-open')) {
        e.preventDefault();
        closeEditor(true);
      }
      return;
    }
    if (gate && gate.classList.contains('is-open')) trapFocus(e, gate);
    else if (panel.classList.contains('is-open')) trapFocus(e, panel);
  });

  function maybeOpenFromSecret() {
    try {
      var params = new URLSearchParams(window.location.search);
      var hash = (window.location.hash || '').toLowerCase();
      if (params.get('edit') === '1' || hash === '#edit' || hash === '#editor') {
        if (isUnlocked()) openEditor();
        else openGate();
      }
    } catch (e) {}
  }

  updateChrome();
  loadConfig().catch(function () {});
  maybeOpenFromSecret();
  window.addEventListener('hashchange', maybeOpenFromSecret);
})();
