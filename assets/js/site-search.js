/* Ranked search over the generated local index; preserve Chirpy's search UI. */
(() => {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const source = document.querySelector('script[data-search-index]');
  if (!input || !results || !source) return;
  results.setAttribute('aria-live', 'polite');
  let indexPromise, composing = false, revision = 0;
  const normalize = text => String(text || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  function canonical(path) {
    const url = new URL(path, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/')) throw new Error('Invalid search target');
    return url.pathname + url.search + url.hash;
  }
  function merge(entries) {
    const groups = new Map();
    for (const entry of entries) {
      const url = canonical(entry.canonical_url || entry.url);
      const priority = entry.categories === '项目' ? 0 : 1;
      const existing = groups.get(url);
      if (existing) {
        existing.titles += ' ' + entry.title + ' ' + (entry.aliases || '');
        existing.content += ' ' + entry.content;
        existing.tags += ' ' + entry.tags;
        if (priority > existing.priority) Object.assign(existing, { entry, priority });
      } else groups.set(url, { url, entry, priority, titles: entry.title + ' ' + (entry.aliases || ''), tags: entry.tags || '', content: entry.content || '' });
    }
    return [...groups.values()].map(item => ({ ...item,
      titleText: normalize(item.titles), tagText: normalize(item.tags),
      categoryText: normalize(item.entry.categories), contentText: normalize(item.content)
    }));
  }
  function load() {
    if (!indexPromise) indexPromise = fetch(source.dataset.searchIndex)
      .then(response => { if (!response.ok) throw new Error('Search unavailable'); return response.json(); })
      .then(merge).catch(error => { indexPromise = undefined; throw error; });
    return indexPromise;
  }
  function message(text) {
    const p = document.createElement('p'); p.className = 'mt-5'; p.textContent = text;
    results.replaceChildren(p);
  }
  function score(item, query) {
    let value = normalize(item.entry.title) === query ? 200 : 0;
    for (const word of query.split(' ')) {
      if (item.titleText.includes(word)) value += 50;
      else if (item.tagText.includes(word)) value += 20;
      else if (item.categoryText.includes(word)) value += 8;
      else if (item.contentText.includes(word)) value += 1;
      else return 0;
    }
    return value;
  }
  function excerpt(item, query) {
    if (item.entry.summary) return item.entry.summary;
    const text = String(item.entry.content || '').replace(/\s+/g, ' ').trim();
    const position = normalize(text).indexOf(query.split(' ')[0]);
    const start = Math.max(0, position - 35);
    return (start ? '…' : '') + text.slice(start, start + 180) + (text.length > start + 180 ? '…' : '');
  }
  async function search() {
    const current = ++revision, query = normalize(input.value);
    if (!query) { results.replaceChildren(); return; }
    message('正在查找…');
    try {
      const index = await load();
      if (current !== revision) return;
      const matches = index.map(item => ({ item, score: score(item, query) }))
        .filter(match => match.score > 0).sort((a, b) => b.score - a.score).slice(0, 20);
      if (!matches.length) { message('搜索结果为空，可以试试项目名称或技术关键词。'); return; }
      const fragment = document.createDocumentFragment();
      for (const { item } of matches) {
        const article = document.createElement('article'); article.className = 'px-1 px-sm-2 px-lg-4 px-xl-0';
        const header = document.createElement('header'), h2 = document.createElement('h2'), link = document.createElement('a');
        link.href = item.url; link.textContent = item.entry.title; h2.append(link);
        const meta = document.createElement('div'); meta.className = 'post-meta text-muted mt-1 mb-1';
        meta.textContent = [item.entry.categories, item.entry.tags].filter(Boolean).join(' · ');
        header.append(h2, meta);
        const p = document.createElement('p'); p.className = 'search-excerpt'; p.textContent = excerpt(item, query);
        article.append(header, p); fragment.append(article);
      }
      results.replaceChildren(fragment);
    } catch { if (current === revision) message('搜索暂时不可用，请重新输入关键词重试。'); }
  }
  input.addEventListener('compositionstart', () => { composing = true; ++revision; });
  input.addEventListener('compositionend', () => { composing = false; search(); });
  input.addEventListener('input', () => { if (!composing) search(); });
})();
