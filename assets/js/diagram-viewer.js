/* Enhance rendered Mermaid SVGs; leave the source readable if rendering fails. */
(() => {
  const article = document.querySelector('main article');
  if (!article) return;
  let dialog, stage, output, close, minus, plus, active;
  function size(svg, width) { svg.style.width = `${width}px`; svg.style.maxWidth = 'none'; svg.style.height = 'auto'; }
  function zoom(scale) {
    if (!active) return;
    const oldWidth = active.width * active.scale;
    const center = (stage.scrollLeft + stage.clientWidth / 2) / oldWidth;
    active.scale = Math.max(.15, Math.min(3, scale));
    size(active.svg, active.width * active.scale);
    stage.scrollLeft = Math.max(0, center * active.width * active.scale - stage.clientWidth / 2);
    output.textContent = `${Math.round(active.scale * 100)}%`;
    minus.disabled = active.scale <= .15;
    plus.disabled = active.scale >= 3;
  }
  function createDialog() {
    dialog = document.createElement('dialog'); dialog.className = 'diagram-dialog';
    dialog.setAttribute('aria-labelledby', 'diagram-dialog-title');
    const toolbar = document.createElement('div'); toolbar.className = 'diagram-toolbar';
    const title = document.createElement('h2'); title.id = 'diagram-dialog-title'; title.textContent = '查看流程图';
    const button = (label, action) => {
      const el = document.createElement('button'); el.type = 'button'; el.textContent = label; el.addEventListener('click', action); return el;
    };
    minus = button('缩小', () => zoom(active.scale / 1.25));
    plus = button('放大', () => zoom(active.scale * 1.25));
    const fit = button('适应窗口', () => zoom(Math.min(1, (stage.clientWidth - 32) / active.width)));
    close = button('关闭', () => dialog.close());
    output = document.createElement('output'); output.setAttribute('aria-live', 'polite'); output.setAttribute('aria-label', '流程图缩放比例');
    toolbar.append(title, minus, output, plus, fit, close);
    stage = document.createElement('div'); stage.className = 'diagram-stage'; stage.tabIndex = 0;
    stage.setAttribute('role', 'region'); stage.setAttribute('aria-label', '放大的流程图，可滚动查看');
    dialog.append(toolbar, stage); document.body.append(dialog);
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')];
      if (!items.length) return;
      const index = items.indexOf(document.activeElement);
      event.preventDefault();
      items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    });
    dialog.addEventListener('close', () => {
      const previous = active;
      if (previous) {
        size(previous.svg, previous.width);
        previous.placeholder.replaceWith(previous.svg);
        previous.button.focus({ preventScroll: true });
      }
      active = undefined; document.documentElement.removeAttribute('data-diagram-open');
    });
  }
  function open(svg, button) {
    if (!dialog) createDialog();
    const rect = svg.getBoundingClientRect(), placeholder = document.createElement('div');
    placeholder.style.width = `${rect.width}px`; placeholder.style.height = `${rect.height}px`;
    svg.before(placeholder);
    active = { svg, button, placeholder, width: svg.viewBox.baseVal.width, scale: 1 };
    stage.replaceChildren(svg); document.documentElement.setAttribute('data-diagram-open', '');
    dialog.showModal(); zoom(1); stage.scrollLeft = stage.scrollTop = 0; close.focus();
  }
  function enhance() {
    for (const container of article.querySelectorAll('.mermaid')) {
      const svg = container.querySelector('svg');
      if (!svg || !svg.viewBox.baseVal.width) continue;
      // Mermaid replaces the SVG when the theme changes; reapply readable sizing.
      size(svg, svg.viewBox.baseVal.width);
      if (container.closest('.diagram-viewer')) continue;
      const figure = document.createElement('figure'); figure.className = 'diagram-viewer';
      const viewport = document.createElement('div'); viewport.className = 'diagram-viewport'; viewport.tabIndex = 0;
      viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-label', '流程图，可左右滚动查看');
      const caption = document.createElement('figcaption'); caption.className = 'diagram-caption';
      const hint = document.createElement('span'); hint.textContent = '可左右滑动查看完整流程。';
      const button = document.createElement('button'); button.type = 'button'; button.textContent = '放大查看流程图';
      button.addEventListener('click', () => { const current = container.querySelector('svg'); if (current) open(current, button); });
      caption.append(hint, button); container.before(figure); viewport.append(container); figure.append(viewport, caption);
    }
  }
  new MutationObserver(enhance).observe(article, { childList: true, subtree: true });
  enhance();
})();
