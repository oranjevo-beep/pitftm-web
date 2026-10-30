const navLinks = document.querySelector('#nav-links');
const toggleNav = document.querySelector('#nav-toggle');
const overlay = document.querySelector('.overlay');

if (toggleNav && navLinks) {
  toggleNav.addEventListener('click', () => {
    navLinks.classList.toggle('show-links');
  });
}

const openModal = function (e) {
  const productIcon = e.target.closest('.product-desc-info');

  const product = e.target.closest('.product');
  if (!product) return;
  const productDesc = product.querySelector('.modal');
  if (productIcon && productDesc) {
    productDesc.classList.add('visible');
    if (overlay) overlay.classList.remove('hidden');
    const nav = document.querySelector('.nav');
    if (nav) nav.classList.add('hidden');
  }
};

const closeModal = function (e) {
  const close = e.target.closest('.product-desc-close');
  if (close) {
    const modal = close.closest('.modal');
    if (modal) modal.classList.remove('visible');
    if (overlay) overlay.classList.add('hidden');
    const nav = document.querySelector('.nav');
    if (nav) nav.classList.remove('hidden');
  }
};

const productsContainer = document.querySelector('.products-container');
if (productsContainer) {
  productsContainer.addEventListener('click', openModal);
}

const productDescClose = document.querySelectorAll('.product-desc-close');
productDescClose.forEach((btn) => {
  btn.addEventListener('click', closeModal);
});

if (overlay) {
  overlay.addEventListener('click', () => {
    document
      .querySelectorAll('.modal')
      .forEach((modal) => modal.classList.remove('visible'));
    overlay.classList.add('hidden');
    const nav = document.querySelector('.nav');
    if (nav) nav.classList.remove('hidden');
  });
}
