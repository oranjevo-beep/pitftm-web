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
  toggle.textContent = open ? 'Сховати опис' : 'Опис і застосування';
}

function closeAllDescs(exceptProduct) {
  document.querySelectorAll('.product.is-desc-open').forEach(function (product) {
    if (exceptProduct && product === exceptProduct) return;
    setDescOpen(product, false);
  });
}

function setInnerAcc(item, open) {
  const trigger = item.querySelector('.desc-acc-trigger');
  const body = item.querySelector('.desc-acc-body');
  if (!trigger || !body) return;
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  body.hidden = !open;
}

if (productsContainer) {
  productsContainer.addEventListener('click', function (e) {
    const innerTrig = e.target.closest('.desc-acc-trigger');
    if (innerTrig) {
      const item = innerTrig.closest('.desc-acc-item');
      const accordion = innerTrig.closest('.desc-accordion');
      const willOpen = innerTrig.getAttribute('aria-expanded') !== 'true';
      accordion.querySelectorAll('.desc-acc-item').forEach(function (el) {
        setInnerAcc(el, el === item ? willOpen : false);
      });
      return;
    }

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

function applyCategoryFilter(cat) {
  const cards = document.querySelectorAll('.product[data-category]');
  if (!cards.length) return;
  const empty = document.getElementById('products-empty');
  let visible = 0;
  cards.forEach(function (card) {
    const match = !cat || cat === 'all' || card.getAttribute('data-category') === cat;
    card.hidden = !match;
    if (match) visible += 1;
  });
  if (empty) empty.hidden = visible > 0;

  document.querySelectorAll('.category-pill[data-cat]').forEach(function (pill) {
    const slug = pill.getAttribute('data-cat');
    const active = (!cat || cat === 'all') ? slug === 'all' : slug === cat;
    pill.classList.toggle('is-active', active);
  });
}

(function initCategoryFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  if (cat) applyCategoryFilter(cat);
  else applyCategoryFilter('all');

  document.querySelectorAll('.category-pill[data-cat]').forEach(function (pill) {
    pill.addEventListener('click', function (e) {
      // allow full navigation on other pages; on products intercept
      if (!document.querySelector('.product[data-category]')) return;
      const slug = pill.getAttribute('data-cat');
      if (!slug) return;
      if (pill.getAttribute('href') && pill.getAttribute('href').indexOf('products.html') === 0 && !window.location.pathname.endsWith('products.html')) {
        return; // let browser go to products.html?cat=
      }
      e.preventDefault();
      const next = slug === 'all' ? 'products.html' : '?cat=' + encodeURIComponent(slug);
      window.history.replaceState({}, '', next);
      applyCategoryFilter(slug);
      closeAllDescs();
    });
  });
})();

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
