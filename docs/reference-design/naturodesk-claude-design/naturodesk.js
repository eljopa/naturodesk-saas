/* NaturoDesk — interactions (vanilla) */
(function () {
  const root = document.documentElement;

  /* ---- Nav scroll shadow ---- */
  const nav = document.querySelector('.nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  const burger = document.querySelector('.nav__burger');
  const mobile = document.querySelector('.mobile-menu');
  if (burger && mobile) {
    burger.addEventListener('click', () => mobile.classList.toggle('open'));
    mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobile.classList.remove('open')));
  }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.faq__item').forEach(item => {
    const q = item.querySelector('.faq__q');
    const a = item.querySelector('.faq__a');
    q.addEventListener('click', () => {
      const open = item.classList.contains('open');
      document.querySelectorAll('.faq__item.open').forEach(o => {
        o.classList.remove('open');
        o.querySelector('.faq__a').style.maxHeight = null;
      });
      if (!open) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });

  /* ---- Reveal on scroll (rect-based, robust) ---- */
  const reveals = [...document.querySelectorAll('.reveal')];
  function checkReveal() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    for (let i = reveals.length - 1; i >= 0; i--) {
      const el = reveals[i];
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) {
        el.classList.add('in');
        reveals.splice(i, 1);
      }
    }
  }
  window.addEventListener('scroll', checkReveal, { passive: true });
  window.addEventListener('resize', checkReveal);
  checkReveal();
  requestAnimationFrame(checkReveal);
  setTimeout(checkReveal, 200);

  /* ---- Language toggle (FR default, EN via data-en) ---- */
  const i18n = document.querySelectorAll('[data-en]');
  i18n.forEach(el => { el.dataset.fr = el.innerHTML; });
  function setLang(lang) {
    i18n.forEach(el => { el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.fr; });
    root.lang = lang;
    document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    try { localStorage.setItem('nd_lang', lang); } catch (e) {}
    // refresh any open FAQ heights after text swap
    document.querySelectorAll('.faq__item.open .faq__a').forEach(a => { a.style.maxHeight = a.scrollHeight + 'px'; });
  }
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  let savedLang = 'fr';
  try { savedLang = localStorage.getItem('nd_lang') || 'fr'; } catch (e) {}
  if (savedLang === 'en') setLang('en'); else setLang('fr');

  window.__ndSetLang = setLang;
})();
