(() => {
  'use strict';
  const form = document.querySelector('[data-project-filters]');
  if (!form) return;
  const cards = [...document.querySelectorAll('.project-card[data-project-group]')];
  const sections = [...document.querySelectorAll('[data-project-section]')];
  const group = form.elements.group, tag = form.elements.tag;
  const tags = new Map(cards.map(card => [card, JSON.parse(card.dataset.projectTags)]));
  const matches = card => (!group.value || card.dataset.projectGroup === group.value) && (!tag.value || tags.get(card).includes(tag.value));
  function revealTarget() {
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
    const card = target?.closest('.project-card');
    const section = target?.closest('[data-project-section]');
    if ((cards.includes(card) && !matches(card)) ||
        (section && !cards.some(item => section.contains(item) && matches(item)))) {
      group.value = tag.value = '';
      return target;
    }
  }
  function focusTarget(target) {
    if (!target) return;
    // Fragment navigation ran while this target was hidden; finish it after rendering.
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  function render() {
    cards.forEach(card => { card.hidden = !matches(card); });
    sections.forEach(section => { section.hidden = !cards.some(card => section.contains(card) && !card.hidden); });
    const count = cards.filter(card => !card.hidden).length;
    form.querySelector('[data-project-result]').textContent = `显示 ${count} / ${cards.length} 个项目`;
    document.querySelector('[data-project-empty]').hidden = count > 0;
  }
  function writeURL(method = 'replaceState') {
    const url = new URL(location.href);
    for (const field of [group, tag]) {
      if (field.value) url.searchParams.set(field.name, field.value);
      else url.searchParams.delete(field.name);
    }
    if (url.href !== location.href) history[method](null, '', url);
  }
  function readURL() {
    const params = new URLSearchParams(location.search);
    for (const field of [group, tag]) field.value = [...field.options].some(option => option.value === params.get(field.name)) ? params.get(field.name) : '';
    const target = revealTarget();
    render();
    writeURL();
    focusTarget(target);
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('change', () => {
    // A deliberate new filter replaces the previous anchor target.
    const url = new URL(location.href); url.hash = '';
    history.replaceState(null, '', url);
    render(); writeURL('pushState');
  });
  form.addEventListener('reset', event => {
    event.preventDefault();
    group.value = tag.value = '';
    render(); writeURL('pushState');
  });
  window.addEventListener('popstate', readURL);
  window.addEventListener('hashchange', () => { const target = revealTarget(); render(); writeURL(); focusTarget(target); });
  readURL();
  form.hidden = false;
})();
