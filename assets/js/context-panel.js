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
  const content = document.querySelector('.reading-page article[data-toc] > .content');
  if (content && headings.length > 1) {
    const map = document.createElement('details');
    map.className = 'reading-map';
    const label = document.createElement('summary'); label.textContent = `阅读路线 · ${headings.length} 个章节`;
    const navigation = document.createElement('nav'); navigation.setAttribute('aria-label', '文章章节');
    const list = document.createElement('ol');
    headings.forEach((heading, index) => {
      const item = document.createElement('li');
      const link = chapterLink(heading);
      const number = document.createElement('span');
      number.className = 'chapter-number'; number.setAttribute('aria-hidden', 'true');
      number.textContent = String(index + 1).padStart(2, '0');
      link.prepend(number); item.append(link); list.append(item);
    });
    navigation.append(list); map.append(label, navigation); content.before(map);
  }
});
