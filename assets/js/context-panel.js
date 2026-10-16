/* Local navigation is derived from rendered headings; no content or tracking requests. */
document.addEventListener('DOMContentLoaded', () => {
  const headings = [...document.querySelectorAll('main .content h2[id]')];
  function chapterLink(heading) {
    const link = document.createElement('a');
    const title = heading.cloneNode(true);
    title.querySelectorAll('.anchor').forEach(anchor => anchor.remove());
    link.href = '#' + encodeURIComponent(heading.id);
    link.textContent = title.textContent.trim();
    return link;
  }
  const panel = document.querySelector('[data-context-toc]');
  if (panel && headings.length > 1) {
    const list = panel.querySelector('ol');
    headings.forEach(heading => {
      const item = document.createElement('li');
      item.append(chapterLink(heading)); list.append(item);
    });
    panel.hidden = false;
    function active() {
      list.querySelectorAll('a').forEach(link => {
        if (link.hash === location.hash) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    addEventListener('hashchange', active); active();
  }
});
