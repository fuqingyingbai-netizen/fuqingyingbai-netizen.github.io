/* Older browsers get an entrance fade without delaying or intercepting links. */
(() => {
  if (typeof window.CSSViewTransitionRule === 'function') return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let entrance;
  function reveal() {
    entrance?.cancel();
    const content = document.querySelector('main');
    if (preference.matches || !content?.animate) return;
    entrance = content.animate([{ opacity: .65 }, { opacity: 1 }], {
      duration: 200, easing: 'ease-out'
    });
  }
  window.addEventListener('pageshow', reveal);
  preference.addEventListener('change', () => {
    if (preference.matches) entrance?.cancel();
  });
})();
