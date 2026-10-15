/* Label theme-generated icon controls after its deferred scripts run. */
document.addEventListener('DOMContentLoaded', () => {
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) backToTop.setAttribute('aria-label', '返回顶部');
  document.querySelectorAll('a.anchor').forEach((anchor) => {
    const heading = anchor.parentElement;
    anchor.setAttribute('aria-label', `链接到：${heading.textContent.trim()}`);
  });
});
