/* Keep a full-width desktop option without changing mobile drawer behavior. */
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const breadcrumb = document.getElementById('breadcrumb');
  if (!sidebar || !breadcrumb) return;
  const root = document.documentElement;
  const desktop = matchMedia('(min-width: 850px)');
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'desktop-nav-toggle';
  button.className = 'desktop-nav-toggle';
  button.setAttribute('aria-controls', 'sidebar');
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/><path class="nav-toggle-arrow"/></svg><span></span>';
  breadcrumb.before(button);

  function update(collapsed) {
    if (desktop.matches && collapsed && sidebar.contains(document.activeElement)) button.focus({ preventScroll: true });
    root.toggleAttribute('data-sidebar-collapsed', collapsed);
    const label = collapsed ? '展开导航' : '收起导航';
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', label);
    button.querySelector('span').textContent = label;
    button.querySelector('.nav-toggle-arrow').setAttribute('d', collapsed ? 'm13 9 3 3-3 3' : 'm16 9-3 3 3 3');
  }
  function restore() {
    try { update(localStorage.getItem('site-sidebar') === 'collapsed'); }
    catch (_) { update(root.hasAttribute('data-sidebar-collapsed')); }
  }
  button.addEventListener('click', () => {
    const collapsed = !root.hasAttribute('data-sidebar-collapsed');
    update(collapsed);
    try { localStorage.setItem('site-sidebar', collapsed ? 'collapsed' : 'expanded'); } catch (_) {}
  });
  desktop.addEventListener('change', () => {
    if (!desktop.matches && document.activeElement === button) document.getElementById('sidebar-trigger')?.focus({ preventScroll: true });
    if (desktop.matches && root.hasAttribute('data-sidebar-collapsed')) button.focus({ preventScroll: true });
    update(root.hasAttribute('data-sidebar-collapsed'));
  });
  addEventListener('storage', event => { if (event.key === 'site-sidebar' || event.key === null) restore(); });
  addEventListener('pageshow', restore);
  restore();
});
