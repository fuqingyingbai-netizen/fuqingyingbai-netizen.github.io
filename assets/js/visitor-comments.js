const container = document.querySelector('[data-comments-server]');
if (container) {
  // Chirpy emits comment providers with its scripts; mount beside the article footer.
  const footer = document.querySelector('#tail-wrapper footer');
  if (footer) footer.before(container);
  const version = '3.16.1';
  const base = `https://cdn.jsdelivr.net/npm/@waline/client@${version}/dist/`;
  const status = container.querySelector('.comment-status');
  const retry = container.querySelector('.comment-retry');
  const mount = container.querySelector('#waline');
  const refreshText = '重新读取评论';
  let instance;
  let loading = false;
  let attempt = 0;
  let slowTimer;
  function state(kind, text) {
    clearTimeout(slowTimer);
    container.dataset.commentsState = kind;
    status.textContent = text;
    retry.hidden = kind !== 'error';
    if (kind === 'loading') slowTimer = setTimeout(() => {
      status.textContent = '评论加载较慢，仍在等待服务响应。';
    }, 15000);
  }
  const refreshButton = () => [...mount.querySelectorAll('.wl-operation button')]
    .find(button => button.textContent.trim() === refreshText);
  function syncReadState() {
    // Adapter for the pinned Waline 3.16.1 list states. Do not remount the form:
    // its built-in refresh retries the read while preserving the user's draft.
    if (refreshButton()) state('error', '评论列表读取失败，请重试。你填写的内容仍保留在输入框中。');
    else if (mount.querySelector('.wl-cards .wl-loading')) state('loading', '正在读取评论列表…');
    else if (mount.querySelector('.wl-empty')) state('empty', '暂无公开评论，欢迎留言交流。');
    else if (mount.querySelector('.wl-card')) state('ready', '评论已加载。');
  }
  new MutationObserver(syncReadState).observe(mount, { childList: true, subtree: true });
  function loadStyle() {
    let style = document.getElementById('waline-style');
    if (style?.sheet) return Promise.resolve();
    return new Promise((resolve, reject) => {
      style ||= Object.assign(document.createElement('link'), { id: 'waline-style', rel: 'stylesheet', href: base + 'waline.css' });
      const timer = setTimeout(() => fail(), 15000);
      const fail = () => { clearTimeout(timer); style.remove(); reject(new Error('Comment stylesheet unavailable')); };
      style.onload = () => { clearTimeout(timer); resolve(); };
      style.onerror = fail;
      if (!style.isConnected) document.head.append(style);
    });
  }
  const isDark = () => {
    const mode = document.documentElement.dataset.bsTheme;
    return mode === 'dark' || (!mode && matchMedia('(prefers-color-scheme: dark)').matches);
  };
  async function loadComments() {
    if (loading || instance) return;
    loading = true;
    state('loading', '正在加载评论…');
    let timer;
    try {
      const serverURL = new URL(container.dataset.commentsServer);
      if (serverURL.protocol !== 'https:') throw new Error('HTTPS required');
      const suffix = attempt++ ? `?retry=${attempt}` : '';
      const resources = Promise.all([loadStyle(), import(base + 'waline.js' + suffix)]);
      const [, { init }] = await Promise.race([resources, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Comment client unavailable')), 15000);
      })]);
      instance = init({
        el: '#waline', serverURL: serverURL.href,
        path: container.dataset.commentsPath,
        lang: 'zh-CN', login: 'enable', meta: ['nick', 'mail'], requiredMeta: ['nick'],
        wordLimit: 1000, imageUploader: false, search: false, emoji: false,
        pageview: false, comment: false, dark: isDark(),
        locale: { refresh: refreshText, sofa: '暂无公开评论，欢迎留言交流。', placeholder: '欢迎交流、提问或补充。普通留言自动显示，可疑留言待审核，请勿填写私人信息。' },
      });
      if (!instance) throw new Error('Comment client could not mount');
      syncReadState();
    } catch {
      state('error', '评论暂时加载失败，请稍后重试。也可以通过下方入口查看原 GitHub 评论。');
    } finally {
      clearTimeout(timer);
      loading = false;
    }
  }
  retry.addEventListener('click', () => {
    if (instance) { refreshButton()?.click(); syncReadState(); }
    else loadComments();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        loadComments();
      }
    }, { rootMargin: '300px' });
    observer.observe(container);
  } else {
    loadComments();
  }
  new MutationObserver(() => instance?.update({ dark: isDark() }))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => instance?.update({ dark: isDark() }));
}
