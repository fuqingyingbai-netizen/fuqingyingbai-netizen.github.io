/* Website-specific ports of React Bits Magnet, StarBorder and ClickSpark.
 * Copyright (c) 2026 David Haz. MIT + Commons Clause.
 * Source and adaptations: docs/react-bits.md; license: /assets/licenses/react-bits.txt.
 * Native DOM, SVG, Canvas and WAAPI; no React runtime. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const resets = [];
  const running = new Set();

  // Magnet: a stable hit area around a spring-driven link, limited to four pixels.
  document.querySelectorAll('.intro-actions > a').forEach(link => {
    const wrapper = document.createElement('span');
    wrapper.className = 'rb-magnet';
    link.before(wrapper); wrapper.append(link);
    let frame = 0, last = 0;
    let x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0;
    function reset() {
      cancelAnimationFrame(frame);
      frame = last = x = y = vx = vy = tx = ty = 0;
      link.style.removeProperty('translate');
      wrapper.removeAttribute('data-magnet-active');
    }
    function step(now) {
      frame = 0;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const steps = Math.ceil(dt * 120), interval = dt / steps;
      for (let i = 0; i < steps; i++) {
        vx += (170 * (tx - x) - 26 * vx) * interval;
        vy += (170 * (ty - y) - 26 * vy) * interval;
        x += vx * interval; y += vy * interval;
      }
      const resting = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(vx) + Math.abs(vy) < .04;
      if (resting) { x = tx; y = ty; vx = vy = 0; }
      if (resting && tx === 0 && ty === 0) { reset(); return; }
      link.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      if (!resting) frame = requestAnimationFrame(step);
      else last = 0;
    }
    function wake() { if (!frame) frame = requestAnimationFrame(step); }
    wrapper.addEventListener('pointermove', event => {
      if (reduce.matches || !pointer.matches || event.pointerType === 'touch' || link.matches(':focus-visible')) return;
      const rect = wrapper.getBoundingClientRect();
      tx = (event.clientX - rect.left - rect.width / 2) / 10;
      ty = (event.clientY - rect.top - rect.height / 2) / 10;
      const length = Math.hypot(tx, ty);
      if (length > 4) { tx *= 4 / length; ty *= 4 / length; }
      wrapper.setAttribute('data-magnet-active', ''); wake();
    }, { passive: true });
    wrapper.addEventListener('pointerleave', () => {
      if (reduce.matches || !pointer.matches) { reset(); return; }
      tx = ty = 0; wrapper.removeAttribute('data-magnet-active');
      if (x || y || frame) wake();
    });
    wrapper.addEventListener('pointercancel', reset);
    link.addEventListener('focus', reset);
    resets.push(reset);
  });

  // StarBorder: one quiet lap around the actual rounded outline, on interaction only.
  // SVG replaces the upstream canvas engine; no idle rotation, bloom or stardust.
  document.querySelectorAll('.topic-link, .content-type, .about-paths > a').forEach(target => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    const rect = document.createElementNS(ns, 'rect');
    svg.classList.add('rb-star-border');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    rect.setAttribute('x', '1'); rect.setAttribute('y', '1');
    rect.setAttribute('pathLength', '100'); rect.setAttribute('stroke-dasharray', '20 80');
    svg.append(rect); target.append(svg); target.classList.add('rb-border-target');
    let animation;
    function measure() {
      rect.setAttribute('width', String(Math.max(0, target.clientWidth - 2)));
      rect.setAttribute('height', String(Math.max(0, target.clientHeight - 2)));
      rect.setAttribute('rx', String(Math.max(0, parseFloat(getComputedStyle(target).borderRadius) - 1) || 0));
    }
    measure();
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(target);
    function stop() { animation?.cancel(); animation = undefined; }
    function lap() {
      if (reduce.matches || !rect.animate) return;
      stop(); measure();
      animation = rect.animate([
        { strokeDashoffset: '0', opacity: 0, offset: 0 },
        { strokeDashoffset: '-10', opacity: .8, offset: .1 },
        { strokeDashoffset: '-80', opacity: .8, offset: .8 },
        { strokeDashoffset: '-100', opacity: 0, offset: 1 }
      ], { duration: 1100, easing: 'ease-in-out' });
      const current = animation;
      running.add(current);
      current.finished.then(() => { running.delete(current); current.cancel(); }, () => running.delete(current));
    }
    target.addEventListener('pointerenter', event => { if (pointer.matches && event.pointerType !== 'touch') lap(); });
    target.addEventListener('pointerleave', stop);
    target.addEventListener('focus', () => { if (target.matches(':focus-visible')) lap(); });
    target.addEventListener('blur', stop);
    resets.push(stop);
  });

  // ClickSpark: six short radial strokes; a small temporary canvas per press.
  const bursts = new Set();
  const sparkTargets = '.intro-actions > .rb-magnet > a, .notes-nav a[href^="#"], #all-tags summary, #desktop-nav-toggle';
  function remove(burst) { cancelAnimationFrame(burst.frame); burst.canvas.remove(); bursts.delete(burst); }
  function clearSparks() { [...bursts].forEach(remove); }
  function spark(target, clientX, clientY) {
    if (reduce.matches || document.hidden || !Element.prototype.animate) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'rb-click-spark'; canvas.setAttribute('aria-hidden', 'true');
    const size = 44, ratio = Math.min(devicePixelRatio || 1, 2);
    const left = Math.max(0, Math.min(clientX - size / 2, innerWidth - size));
    const top = Math.max(0, Math.min(clientY - size / 2, innerHeight - size));
    canvas.width = canvas.height = size * ratio;
    Object.assign(canvas.style, { left: `${left}px`, top: `${top}px` });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const color = getComputedStyle(target).getPropertyValue('--site-accent').trim() || '#245d65';
    const x = clientX - left, y = clientY - top, start = performance.now();
    const burst = { canvas, frame: 0 };
    document.body.append(canvas); bursts.add(burst);
    while (bursts.size > 4) remove(bursts.values().next().value);
    function draw(now) {
      const p = Math.min(1, (now - start) / 300);
      if (p === 1 || reduce.matches || document.hidden) { remove(burst); return; }
      const eased = 1 - (1 - p) ** 3;
      const distance = 12 * eased, length = 5 * (1 - p) ** 1.6;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, size, size);
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.globalAlpha = .85 * (1 - p);
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance);
        ctx.lineTo(x + Math.cos(angle) * (distance + length), y + Math.sin(angle) * (distance + length)); ctx.stroke();
      }
      burst.frame = requestAnimationFrame(draw);
    }
    burst.frame = requestAnimationFrame(draw);
  }
  let lastPress = { time: 0, x: 0, y: 0 };
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.pointerType === 'touch') return;
    const target = event.target.closest?.(sparkTargets);
    if (!target) return;
    lastPress = { time: performance.now(), x: event.clientX, y: event.clientY };
    spark(target, event.clientX, event.clientY);
  }, { passive: true });
  document.addEventListener('click', event => {
    const target = event.target.closest?.(sparkTargets);
    if (!target) return;
    if (event.detail === 0) {
      const rect = target.getBoundingClientRect();
      spark(target, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else if (performance.now() - lastPress.time > 700 || Math.hypot(event.clientX - lastPress.x, event.clientY - lastPress.y) > 12) {
      spark(target, event.clientX, event.clientY);
    }
  });
  resets.push(clearSparks);
  function reset() { resets.forEach(stop => stop()); running.forEach(animation => animation.cancel()); running.clear(); }
  reduce.addEventListener('change', () => { if (reduce.matches) reset(); });
  pointer.addEventListener('change', reset);
  addEventListener('pagehide', reset);
  addEventListener('blur', reset);
  addEventListener('scroll', () => { if (bursts.size) clearSparks(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
})();
