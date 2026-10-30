const navLinks = document.querySelector('#nav-links');
const toggleNav = document.querySelector('#nav-toggle');
const overlay = document.querySelector('.overlay');
const productsContainer = document.querySelector('.products-container');

let lastModalTrigger = null;

if (toggleNav && navLinks) {
  toggleNav.addEventListener('click', () => {
    navLinks.classList.toggle('show-links');
  });
}

function getFocusable(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(function (el) {
    return el.offsetParent !== null || el === document.activeElement;
  });
}

function openProductModal(product, trigger) {
  const productDesc = product.querySelector('.modal');
  if (!productDesc) return;
  lastModalTrigger = trigger || document.activeElement;
  productDesc.classList.add('visible');
  productDesc.setAttribute('aria-hidden', 'false');
  if (overlay) overlay.classList.remove('hidden');
  const nav = document.querySelector('.nav');
  if (nav) nav.classList.add('hidden');
  const closeBtn = productDesc.querySelector('.product-desc-close');
  const focusTarget = closeBtn || getFocusable(productDesc)[0] || productDesc;
  if (focusTarget && focusTarget.focus) {
    window.setTimeout(function () {
      focusTarget.focus();
    }, 0);
  }
}

function closeAllProductModals() {
  document.querySelectorAll('.modal.visible').forEach(function (modal) {
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
  });
  if (overlay) overlay.classList.add('hidden');
  const nav = document.querySelector('.nav');
  if (nav) nav.classList.remove('hidden');
  if (lastModalTrigger && lastModalTrigger.focus) {
    lastModalTrigger.focus();
  }
  lastModalTrigger = null;
}

const openModal = function (e) {
  const productIcon = e.target.closest('.product-desc-info');
  if (!productIcon) return;
  const product = e.target.closest('.product');
  if (!product) return;
  openProductModal(product, productIcon);
};

const closeModal = function (e) {
  const close = e.target.closest('.product-desc-close');
  if (!close) return;
  e.preventDefault();
  closeAllProductModals();
};

if (productsContainer) {
  productsContainer.addEventListener('click', openModal);
}

document.querySelectorAll('.product-desc-close').forEach(function (btn) {
  btn.addEventListener('click', closeModal);
});

if (overlay) {
  overlay.addEventListener('click', closeAllProductModals);
}

document.addEventListener('keydown', function (e) {
  const openModalEl = document.querySelector('.modal.visible');
  if (!openModalEl) return;

  if (e.key === 'Escape') {
    // Prefer editor Escape handler if editor is open
    const editorOpen = document.getElementById('price-editor');
    if (editorOpen && editorOpen.classList.contains('is-open')) return;
    e.preventDefault();
    closeAllProductModals();
    return;
  }

  if (e.key !== 'Tab') return;
  const focusable = getFocusable(openModalEl);
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
});
