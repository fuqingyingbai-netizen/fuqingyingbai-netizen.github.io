/* Adapt Chirpy controls without replacing its drawer or theme state. */
document.addEventListener('DOMContentLoaded', () => {
  const sidebarTrigger = document.getElementById('sidebar-trigger');
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main-wrapper');
  if (sidebarTrigger && sidebar && main) {
    const mobileMenu = window.matchMedia('(max-width: 849px)');
    let wasOpen = false;
    sidebarTrigger.setAttribute('aria-controls', 'sidebar');
    sidebar.setAttribute('aria-label', '网站导航');
    function syncMenu() {
      const open = mobileMenu.matches && document.body.hasAttribute('sidebar-display');
      sidebarTrigger.setAttribute('aria-expanded', String(open));
      sidebarTrigger.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
      sidebar.inert = mobileMenu.matches && !open;
      main.inert = open;
      if (open && !wasOpen) sidebar.querySelector('nav a')?.focus({ preventScroll: true });
      if (!open && wasOpen && mobileMenu.matches) sidebarTrigger.focus({ preventScroll: true });
      wasOpen = open;
    }
    new MutationObserver(syncMenu).observe(document.body, { attributes: true, attributeFilter: ['sidebar-display'] });
    mobileMenu.addEventListener('change', (event) => {
      // Keep the theme's internal flag and mask in sync when rotating.
      if (!event.matches && document.body.hasAttribute('sidebar-display')) {
        sidebarTrigger.click();
      }
      syncMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (!mobileMenu.matches || !document.body.hasAttribute('sidebar-display')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        sidebarTrigger.click();
      } else if (event.key === 'Tab') {
        const items = [...sidebar.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')]
          .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }
    });
    syncMenu();
  }
  document.getElementById('mode-toggle')?.setAttribute('aria-label', '切换显示主题');
  document.querySelectorAll('.toc-trigger').forEach(button => button.setAttribute('aria-label', '打开文章目录'));
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) backToTop.setAttribute('aria-label', '返回顶部');
  document.querySelectorAll('a.anchor').forEach((anchor) => {
    const heading = anchor.parentElement;
    anchor.setAttribute('aria-label', `链接到：${heading.textContent.trim()}`);
  });
});
