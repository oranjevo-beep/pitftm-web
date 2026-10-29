/**
 * Load product prices from products.json (source of truth).
 * Safe to include only on products.html; no-ops if no price hooks.
 */
(function () {
  const priceEls = document.querySelectorAll('.product-price[data-product-id]');
  if (!priceEls.length) return;

  function formatPriceLine(sizes) {
    if (!sizes || !sizes.length) return '';
    return (
      'Ціна: ' +
      sizes.map(function (s) {
        return s.price + ' грн';
      }).join(', ')
    );
  }

  function applyPrices(products) {
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

  // Relative to the page URL — works on GitHub Pages project sites.
  fetch('./products.json', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('products.json HTTP ' + res.status);
      return res.json();
    })
    .then(applyPrices)
    .catch(function (err) {
      console.error('Failed to load product prices:', err);
    });
})();
