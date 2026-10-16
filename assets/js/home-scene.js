/* Six-pixel pointer drift; no continuous rendering, touch or reduced-motion drift. */
(() => {
  const hero = document.querySelector('.home-intro');
  if (!hero) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, x = 0, y = 0;
  function reset() {
    cancelAnimationFrame(frame); frame = 0;
    hero.style.removeProperty('--scene-x');
    hero.style.removeProperty('--scene-y');
  }
  hero.addEventListener('pointermove', event => {
    if (!fine.matches || reduce.matches || event.pointerType === 'touch') return;
    const r = hero.getBoundingClientRect();
    x = (event.clientX - r.left - r.width / 2) / r.width * 12;
    y = (event.clientY - r.top - r.height / 2) / r.height * 12;
    if (!frame) frame = requestAnimationFrame(() => {
      hero.style.setProperty('--scene-x', `${x.toFixed(2)}px`);
      hero.style.setProperty('--scene-y', `${y.toFixed(2)}px`);
      frame = 0;
    });
  }, { passive: true });
  hero.addEventListener('pointerleave', reset);
  hero.addEventListener('pointercancel', reset);
  fine.addEventListener('change', reset);
  reduce.addEventListener('change', reset);
  addEventListener('pagehide', reset);
})();
