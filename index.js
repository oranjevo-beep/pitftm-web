const navLinks = document.querySelector('#nav-links');
const toggleNav = document.querySelector('#nav-toggle');
toggleNav.addEventListener('click', () => {
  navLinks.classList.toggle('show-links');
});
