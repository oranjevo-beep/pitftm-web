const navLinks = document.querySelector('#nav-links');
const toggleNav = document.querySelector('#nav-toggle');
const productsContainer = document.querySelector('.products-container');

if (toggleNav && navLinks) {
  toggleNav.addEventListener('click', () => {
    const open = navLinks.classList.toggle('show-links');
    toggleNav.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

function setDescOpen(product, open) {
  if (!product) return;
  const toggle = product.querySelector('.product-desc-toggle');
  const panel = product.querySelector('.product-desc-panel');
  if (!toggle || !panel) return;
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    panel.hidden = false;
    product.classList.add('is-desc-open');
  } else {
    panel.hidden = true;
    product.classList.remove('is-desc-open');
  }
  toggle.textContent = open ? 'Сховати опис' : 'Склад і застосування';
}

function closeAllDescs(exceptProduct) {
  document.querySelectorAll('.product.is-desc-open').forEach(function (product) {
    if (exceptProduct && product === exceptProduct) return;
    setDescOpen(product, false);
  });
}

if (productsContainer) {
  productsContainer.addEventListener('click', function (e) {
    const toggle = e.target.closest('.product-desc-toggle');
    if (!toggle) return;
    const product = toggle.closest('.product');
    if (!product) return;
    const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
    if (willOpen) {
      closeAllDescs(product);
      setDescOpen(product, true);
      const panel = product.querySelector('.product-desc-panel');
      if (panel && panel.scrollIntoView) {
        window.setTimeout(function () {
          panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 50);
      }
    } else {
      setDescOpen(product, false);
    }
  });
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  const editorOpen = document.getElementById('price-editor');
  if (editorOpen && editorOpen.classList.contains('is-open')) return;
  const gateOpen = document.getElementById('price-editor-gate');
  if (gateOpen && gateOpen.classList.contains('is-open')) return;
  if (document.querySelector('.product.is-desc-open')) {
    e.preventDefault();
    closeAllDescs();
  }
});
