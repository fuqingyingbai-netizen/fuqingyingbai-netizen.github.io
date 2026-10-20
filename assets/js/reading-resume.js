(() => {
  'use strict';
  const banner = document.querySelector('[data-reading-resume]');
  const content = document.querySelector('.reading-page article > .content');
  if (!banner || !content) return;
  const key = `reading-position:v1:${location.pathname}`;
  let saved, recording = false, timer, available = true;
  const headings = () => [...content.querySelectorAll('h2[id], h3[id]')].filter(el => el.getClientRects().length);
  const inset = () => {
    const bar = document.querySelector('#toc-bar:not(.invisible)');
    const topbar = document.querySelector('#topbar-wrapper');
    return Math.max(0, bar?.getBoundingClientRect().bottom || 0,
      getComputedStyle(topbar).position === 'sticky' ? topbar.getBoundingClientRect().bottom : 0) + 16;
  };
  function valid(value) {
    return value && value.version === 1 && Number.isFinite(value.ratio) && value.ratio >= .05 && value.ratio < .95 &&
      typeof value.heading === 'string' && value.heading.length <= 400 && Number.isFinite(value.offset) && Math.abs(value.offset) <= 1e7;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) { try { saved = JSON.parse(raw); } catch { /* A damaged record must not disable reading. */ } }
  } catch { available = false; }
  if (valid(saved) && !location.hash) {
    const heading = headings().find(el => el.id === saved.heading);
    banner.querySelector('[data-resume-message]').textContent = heading
      ? `上次读到「${heading.textContent.trim().replace(/\s*#$/, '')}」，约 ${Math.round(saved.ratio * 100)}%。`
      : `上次阅读到约 ${Math.round(saved.ratio * 100)}%，要继续吗？`;
    banner.hidden = false;
  }
  function save() {
    if (!recording || !available) return;
    const start = scrollY + content.getBoundingClientRect().top;
    const distance = content.offsetHeight - innerHeight + inset();
    if (distance < 200) return;
    const ratio = (scrollY - start + inset()) / distance;
    if (ratio < .05) return;
    try {
      if (ratio >= .95) {
        localStorage.removeItem(key);
        banner.hidden = true;
        return;
      }
      const heading = headings().filter(el => el.getBoundingClientRect().top <= inset() + 20).pop();
      saved = { version: 1, ratio, heading: heading?.id || '', offset: heading ? scrollY - (scrollY + heading.getBoundingClientRect().top) : 0 };
      localStorage.setItem(key, JSON.stringify(saved));
    } catch { available = false; }
  }
  const schedule = () => { clearTimeout(timer); if (recording) timer = setTimeout(save, 400); };
  const engage = event => {
    if (event.type === 'keydown' && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) return;
    if (event.target.closest?.('input, textarea, select, [contenteditable], [data-reading-resume]')) return;
    recording = true;
    schedule();
  };
  ['wheel', 'touchmove', 'keydown'].forEach(type => document.addEventListener(type, engage, { passive: true }));
  document.addEventListener('click', event => {
    if (event.target.closest('a[href^="#"]')) { recording = true; schedule(); }
  });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  banner.querySelector('[data-resume-clear]').addEventListener('click', () => {
    clearTimeout(timer);
    recording = false;
    try { localStorage.removeItem(key); } catch { available = false; }
    banner.hidden = true;
    const title = document.querySelector('.reading-page h1');
    title?.setAttribute('tabindex', '-1');
    title?.focus({ preventScroll: true });
  });
  banner.querySelector('[data-resume-continue]').addEventListener('click', () => {
    if (!valid(saved)) return;
    banner.hidden = true;
    const all = headings();
    const heading = all.find(el => el.id === saved.heading);
    let target;
    if (heading) {
      const top = scrollY + heading.getBoundingClientRect().top;
      const next = all[all.indexOf(heading) + 1];
      const end = scrollY + (next || content).getBoundingClientRect()[next ? 'top' : 'bottom'];
      target = Math.min(top + saved.offset, end - inset() - 24);
    } else {
      target = scrollY + content.getBoundingClientRect().top + saved.ratio * Math.max(0, content.offsetHeight - innerHeight + inset()) - inset();
    }
    recording = true;
    window.scrollTo({ top: Math.max(0, target), behavior: 'instant' });
    const focus = heading || content;
    focus.setAttribute('tabindex', '-1');
    focus.focus({ preventScroll: true });
    schedule();
  });
})();
