/**
 * Load product prices from products.json (source of truth).
 * Safe to include only on products.html; no-ops if no price hooks.
 * Exposes window.PifPrices for the optional in-browser editor.
 */
(function () {
  const STORAGE_KEY = 'pif-products-draft-v1';
  const priceEls = document.querySelectorAll('.product-price[data-product-id]');

  let productsCache = null;

  function formatPriceLine(sizes) {
    if (!sizes || !sizes.length) return '';
    return (
      'Ціна: ' +
      sizes
        .map(function (s) {
          return s.price + ' грн';
        })
        .join(', ')
    );
  }

  function applyPrices(products) {
    if (!priceEls.length) return;
    productsCache = products;
    const byId = Object.create(null);
    products.forEach(function (p) {
      byId[p.id] = p;
    });
    priceEls.forEach(function (el) {
      const id = el.getAttribute('data-product-id');
      const product = byId[id];
      if (!product) return;
      el.textContent = formatPriceLine(product.sizes);
    });
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveDraft(products) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }

  function clearDraft() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function loadProducts() {
    return fetch('./products.json', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('products.json HTTP ' + res.status);
        return res.json();
      })
      .then(function (remote) {
        const draft = loadDraft();
        const products = draft || remote;
        applyPrices(products);
        return { products: products, fromDraft: !!draft, remote: remote };
      });
  }

  window.PifPrices = {
    STORAGE_KEY: STORAGE_KEY,
    formatPriceLine: formatPriceLine,
    applyPrices: applyPrices,
    loadProducts: loadProducts,
    loadDraft: loadDraft,
    saveDraft: saveDraft,
    clearDraft: clearDraft,
    getProducts: function () {
      return productsCache;
    },
    setProducts: function (products) {
      applyPrices(products);
    },
  };

  if (!priceEls.length) return;

  loadProducts().catch(function (err) {
    console.error('Failed to load product prices:', err);
  });
})();
