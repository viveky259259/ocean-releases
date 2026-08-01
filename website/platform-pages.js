const themeToggle = document.getElementById('theme-toggle');
themeToggle?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ocean-theme', next);
});

const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav?.classList.toggle('scrolled', window.scrollY > 18));

const navMenu = document.getElementById('nav-menu');
const navLinks = document.getElementById('nav-links');
navMenu?.addEventListener('click', () => {
  const open = navLinks?.classList.toggle('open') || false;
  navMenu.setAttribute('aria-expanded', String(open));
});

navLinks?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navMenu?.setAttribute('aria-expanded', 'false');
  });
});
