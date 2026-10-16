/* Website-specific ports of React Bits BlurText, AnimatedContent and SpotlightCard.
 * Copyright (c) 2026 David Haz. MIT + Commons Clause.
 * Source, adaptations and full license: /assets/licenses/react-bits.txt; docs/react-bits.md.
 * Native DOM/WAAPI replaces React, Motion and GSAP for this Jekyll site. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const running = new Set();
  let observer;
  const historyEntry = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';

  function animate(element, frames, options) {
    const animation = element.animate(frames, { ...options, fill: 'backwards' });
    running.add(animation);
    animation.finished.then(() => {
      running.delete(animation);
      animation.cancel(); // Release compositor resources; normal CSS is the final state.
    }, () => running.delete(animation));
  }

  // BlurText: the original three-stage blur/overshoot and character stagger.
  const title = document.querySelector('[data-blur-text]');
  if (title && !reduce.matches && !historyEntry && title.animate) {
    title.setAttribute('aria-label', title.textContent);
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let index = 0;
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      Array.from(node.textContent).forEach(character => {
        const letter = document.createElement('span');
        letter.className = 'rb-blur-letter';
        letter.setAttribute('aria-hidden', 'true');
        letter.textContent = character;
        fragment.append(letter);
        animate(letter, [
          { filter: 'blur(6px)', opacity: 0, transform: 'translateY(12px)', offset: 0 },
          { filter: 'blur(3px)', opacity: .5, transform: 'translateY(-1.2px)', offset: .5 },
          { filter: 'blur(0px)', opacity: 1, transform: 'translateY(0)', offset: 1 }
        ], { duration: 450, delay: index++ * 32, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      });
      node.replaceWith(fragment);
    });
  }

  // AnimatedContent: once-only vertical entrance; content is visible by default.
  const cards = document.querySelectorAll('.project-card, .reading-path li');
  if (!reduce.matches && !historyEntry && 'IntersectionObserver' in window && Element.prototype.animate) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        observer.unobserve(target);
        if (target.matches(':target') || target.contains(document.activeElement)) return;
        animate(target, [
          { opacity: .15, transform: 'translateY(18px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 600, easing: 'cubic-bezier(.215, .61, .355, 1)' });
      });
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    cards.forEach(card => observer.observe(card));
  }

  // SpotlightCard: pointer-relative radial light, eased in a bounded rAF loop.
  // Ambient light, press flares, grain and global pointer listeners are omitted.
  const spotlights = [];
  document.querySelectorAll('.project-card').forEach(card => {
    card.classList.add('rb-spotlight');
    let frame = 0, previous = 0;
    let x = 0, y = 0, targetX = 0, targetY = 0;
    const enabled = () => pointer.matches && !reduce.matches;
    function paint() {
      card.style.setProperty('--rb-x', `${x.toFixed(1)}px`);
      card.style.setProperty('--rb-y', `${y.toFixed(1)}px`);
    }
    function step(time) {
      const dt = Math.min((time - previous) / 1000 || .016, .064);
      previous = time;
      const follow = 1 - Math.exp(-dt / .08);
      x += (targetX - x) * follow;
      y += (targetY - y) * follow;
      paint();
      frame = Math.abs(targetX - x) + Math.abs(targetY - y) > .2
        ? requestAnimationFrame(step) : 0;
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = previous = 0;
      card.removeAttribute('data-spotlight-active');
    }
    function point(event) {
      if (!enabled() || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
      if (!card.hasAttribute('data-spotlight-active')) {
        x = targetX; y = targetY; paint();
      }
      card.setAttribute('data-spotlight-active', '');
      if (!frame) frame = requestAnimationFrame(step);
    }
    card.addEventListener('pointermove', point, { passive: true });
    card.addEventListener('pointerleave', stop);
    card.addEventListener('pointercancel', stop);
    card.addEventListener('focusin', event => {
      if (!enabled() || !event.target.matches(':focus-visible')) return;
      const rect = card.getBoundingClientRect();
      x = targetX = rect.width / 2; y = targetY = rect.height / 2;
      paint(); card.setAttribute('data-spotlight-active', '');
    });
    card.addEventListener('focusout', event => {
      if (!card.contains(event.relatedTarget)) stop();
    });
    spotlights.push(stop);
  });

  // A keyboard jump must never leave its focused content mid-entrance.
  document.addEventListener('focusin', event => {
    const card = event.target.closest('.project-card, .reading-path li');
    card?.getAnimations().forEach(animation => {
      if (running.has(animation)) animation.cancel();
    });
  });
  function settle() {
    observer?.disconnect();
    running.forEach(animation => animation.cancel());
    running.clear();
    spotlights.forEach(stop => stop());
  }
  reduce.addEventListener('change', () => { if (reduce.matches) settle(); });
  pointer.addEventListener('change', () => spotlights.forEach(stop => stop()));
  addEventListener('pagehide', settle);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) spotlights.forEach(stop => stop());
  });
})();
