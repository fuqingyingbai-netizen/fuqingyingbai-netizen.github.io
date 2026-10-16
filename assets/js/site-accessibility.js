/* Label theme-generated icon controls after its deferred scripts run. */
document.addEventListener('DOMContentLoaded', () => {
  const sidebarTrigger = document.getElementById('sidebar-trigger');
  if (sidebarTrigger) {
    // Use Chirpy's toggle so its internal state and mask stay in sync.
    const mobileMenu = window.matchMedia('(max-width: 849px)');
    mobileMenu.addEventListener('change', (event) => {
      if (!event.matches && document.body.hasAttribute('sidebar-display')) {
        sidebarTrigger.click();
      }
    });
  }
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) backToTop.setAttribute('aria-label', '返回顶部');
  document.querySelectorAll('a.anchor').forEach((anchor) => {
    const heading = anchor.parentElement;
    anchor.setAttribute('aria-label', `链接到：${heading.textContent.trim()}`);
  });
});
