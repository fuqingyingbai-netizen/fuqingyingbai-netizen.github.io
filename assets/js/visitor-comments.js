const container = document.querySelector('[data-comments-server]');
if (container) {
  const version = '3.16.1';
  const base = `https://cdn.jsdelivr.net/npm/@waline/client@${version}/dist/`;
  const status = container.querySelector('.comment-status');
  const retry = container.querySelector('.comment-retry');
  let instance;
  let loading = false;
  const isDark = () => {
    const mode = document.documentElement.dataset.mode;
    return mode === 'dark' || (!mode && matchMedia('(prefers-color-scheme: dark)').matches);
  };
  async function loadComments() {
    if (loading || instance) return;
    loading = true;
    retry.hidden = true;
    status.textContent = '正在加载评论…';
    try {
      const serverURL = new URL(container.dataset.commentsServer);
      if (serverURL.protocol !== 'https:') throw new Error('HTTPS required');
      if (!document.getElementById('waline-style')) {
        const style = document.createElement('link');
        Object.assign(style, { id: 'waline-style', rel: 'stylesheet', href: base + 'waline.css' });
        document.head.append(style);
      }
      const { init } = await import(base + 'waline.js');
      instance = init({
        el: '#waline', serverURL: serverURL.href,
        path: container.dataset.commentsPath,
        lang: 'zh-CN', login: 'enable', meta: ['nick', 'mail'], requiredMeta: ['nick'],
        wordLimit: 1000, imageUploader: false, search: false, emoji: false,
        pageview: false, comment: false, dark: isDark(),
        locale: { placeholder: '欢迎交流、提问或补充。留言审核后显示，请勿填写私人信息。' },
      });
      status.textContent = '';
    } catch {
      status.textContent = '评论暂时加载失败，请稍后重试。也可以通过下方入口查看原 GitHub 评论。';
      retry.hidden = false;
    } finally {
      loading = false;
    }
  }
  retry.addEventListener('click', loadComments);
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
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => instance?.update({ dark: isDark() }));
}
