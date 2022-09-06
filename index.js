const navLinks = document.querySelector('#nav-links');
const toggleNav = document.querySelector('#nav-toggle');
const overlay = document.querySelector('.overlay');

toggleNav.addEventListener('click', () => {
  navLinks.classList.toggle('show-links');
});

const openModal = function (e) {
  const productIcon = e.target.closest('.product-desc-info');

  const productDesc = e.target.closest('.product').querySelector('.modal');
  console.log(productDesc);
  if (productIcon) {
    productDesc.classList.add('visible');
    overlay.classList.remove('hidden');
    document.querySelector('.nav').classList.add('hidden');
  }
};

const closeModal = function (e) {
  const close = e.target.closest('.product-desc-close');
  if (close) {
    close.closest('.modal').classList.remove('visible');
    overlay.classList.add('hidden');
    document.querySelector('.nav').classList.remove('hidden');
  }
};
const productsContainer = document.querySelector('.products-container');
productsContainer.addEventListener('click', openModal);

const productDescClose = document.querySelectorAll('.product-desc-close');
productDescClose.forEach((btn) => {
  btn.addEventListener('click', closeModal);
});
overlay.addEventListener('click', closeModal);
