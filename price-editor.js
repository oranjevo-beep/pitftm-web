/**
 * In-browser price editor for static GitHub Pages.
 * Edits stay local (draft in localStorage); export/download products.json
 * for the owner to commit on GitHub. No backend.
 */
(function () {
  if (!window.PifPrices) return;
  if (!document.getElementById('price-editor')) return;

  const api = window.PifPrices;
  const panel = document.getElementById('price-editor');
  const listEl = document.getElementById('price-editor-list');
  const statusEl = document.getElementById('price-editor-status');
  const openBtn = document.getElementById('price-editor-open');
  const closeBtn = document.getElementById('price-editor-close');
  const downloadBtn = document.getElementById('price-editor-download');
  const copyBtn = document.getElementById('price-editor-copy');
  const saveDraftBtn = document.getElementById('price-editor-save-draft');
  const clearDraftBtn = document.getElementById('price-editor-clear-draft');
  const backdrop = document.getElementById('price-editor-backdrop');

  let working = null; // deep copy being edited
  let remoteBaseline = null;

  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.className = 'price-editor-status' + (kind ? ' is-' + kind : '');
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
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
        lab.textContent = size.label || 'Об\'єм ' + (idx + 1);
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

  function closeEditor() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    if (backdrop) backdrop.classList.add('hidden');
    document.body.classList.remove('price-editor-open');
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

  if (openBtn) openBtn.addEventListener('click', openEditor);
  if (closeBtn) closeBtn.addEventListener('click', closeEditor);
  if (backdrop) backdrop.addEventListener('click', closeEditor);
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

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) closeEditor();
  });
})();
