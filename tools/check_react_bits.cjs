/* Browser acceptance for React Bits adaptations, including no-JS/reduced-motion. */
const assert = require('node:assert/strict');
const playwright = require('playwright');
const base = process.env.LAYOUT_BASE_URL || 'http://127.0.0.1:4173';
const heading = '沈郑毅';

async function record(context) {
  await context.addInitScript(() => {
    window.effectEntrances = [];
    window.effectFrames = 0;
    const frame = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => { window.effectFrames++; return frame.call(window, callback); };
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.matches('.rb-blur-letter, .project-card, .reading-path li')) {
        window.effectEntrances.push({ text: this.textContent, card: this.matches('.project-card') });
      }
      return original.apply(this, args);
    };
  });
}
async function settled(page) {
  await page.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running' && a.effect.getTiming().iterations !== Infinity));
}

async function checkInteractions(browser, results) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await record(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await settled(page);
  const wrapper = page.locator('.rb-magnet').first();
  const link = wrapper.locator('a');
  const initialBox = await wrapper.boundingBox();
  await wrapper.hover({ position: { x: 10, y: 10 } });
  await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('.rb-magnet a').style.translate)) > .5);
  const moved = await link.evaluate(el => el.style.translate.split(' ').map(parseFloat));
  assert(Math.hypot(...moved) <= 4.05, 'Magnet moved too far');
  assert.deepEqual(await wrapper.boundingBox(), initialBox, 'Magnet moved its hit area');
  await page.mouse.move(5, 5);
  await page.waitForFunction(() => !document.querySelector('.rb-magnet a').style.translate);
  const frames = await page.evaluate(() => window.effectFrames);
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => window.effectFrames), frames, 'An interaction kept scheduling idle frames');
  await link.focus();
  assert.equal(await link.evaluate(el => el.style.translate), '');
  await Promise.all([page.waitForURL('**/projects/'), link.press('Enter')]);

  await page.goto(base + '/tags/', { waitUntil: 'networkidle' });
  const topic = page.locator('.topic-link').first();
  const rect = topic.locator('.rb-star-border rect');
  assert.equal(await topic.locator('.rb-star-border').getAttribute('aria-hidden'), 'true');
  await topic.hover();
  await page.waitForFunction(() => document.querySelector('.rb-star-border rect').getAnimations().some(a => a.playState === 'running'));
  assert.equal(await rect.getAttribute('pathLength'), '100');
  await page.waitForFunction(() => document.querySelector('.rb-star-border rect').getAnimations().length === 0);
  assert.equal(await rect.evaluate(el => getComputedStyle(el).opacity), '0', 'Border did not finish its single lap');
  const summary = page.locator('#all-tags summary');
  await summary.click();
  assert(await page.locator('#all-tags').evaluate(el => el.open));
  assert(await page.locator('.rb-click-spark').count());
  assert.equal(await page.locator('.rb-click-spark').first().evaluate(el => getComputedStyle(el).pointerEvents), 'none');
  await page.waitForFunction(() => document.querySelectorAll('.rb-click-spark').length === 0);
  await summary.focus(); await summary.press('Enter');
  assert.equal(await page.locator('#all-tags').evaluate(el => el.open), false, 'Click feedback changed native details behavior');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelectorAll('.rb-click-spark').length === 0, undefined, { timeout: 200 });
  assert.equal(await page.locator('.rb-click-spark').count(), 0);
  await topic.hover();
  assert.equal(await rect.evaluate(el => el.getAnimations().length), 0);
  await summary.click();
  assert.equal(await page.locator('.rb-click-spark').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const phone = await mobile.newPage();
  await phone.goto(base, { waitUntil: 'networkidle' });
  await phone.locator('.rb-magnet').first().dispatchEvent('pointermove', { pointerType: 'touch', clientX: 100, clientY: 100 });
  assert.equal(await phone.locator('[data-magnet-active]').count(), 0);
  await phone.goto(base + '/tags/', { waitUntil: 'networkidle' });
  await phone.locator('#all-tags summary').tap();
  assert(await phone.locator('#all-tags').evaluate(el => el.open));
  assert(await phone.locator('.rb-click-spark').count());
  await phone.emulateMedia({ reducedMotion: 'reduce' });
  await phone.waitForFunction(() => document.querySelectorAll('.rb-click-spark').length === 0, undefined, { timeout: 200 });
  assert.equal(await phone.locator('.rb-click-spark').count(), 0);
  assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mobile.close();

  const plain = await browser.newContext({ viewport: { width: 320, height: 568 }, javaScriptEnabled: false });
  const noJs = await plain.newPage();
  await noJs.goto(base + '/tags/', { waitUntil: 'networkidle' });
  await noJs.locator('#all-tags summary').click();
  assert(await noJs.locator('#all-tags').evaluate(el => el.open));
  assert.equal(await noJs.locator('.rb-star-border, .rb-click-spark').count(), 0);
  await plain.close();
  results.push({ mode: 'interactions', magnetBounded: true, stableHitArea: true, noIdleFrames: true, borderSingleLap: true, nativeClicks: true, touch: true, reducedMotion: true, noJavaScript: true });
}

(async () => {
  const engine = process.env.LAYOUT_BROWSER || 'webkit';
  const browser = await playwright[engine].launch({
    ...(process.env.LAYOUT_EXECUTABLE ? { executablePath: process.env.LAYOUT_EXECUTABLE } : {})
  });
  const results = [];
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    await record(desktop);
    const page = await desktop.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    await settled(page);
    assert.equal(await page.locator('#intro-title').textContent(), heading);
    assert((await page.evaluate(() => window.effectEntrances.filter(e => !e.card).length)) >= 3, 'Title did not animate');
    assert.equal(await page.locator('#intro-title').evaluate(el => el.getBoundingClientRect().height < parseFloat(getComputedStyle(el).fontSize) * 1.5), true);
    const card = page.locator('.project-card').first();
    await card.hover();
    await page.waitForFunction(() => {
      const el = document.querySelector('.project-card');
      return el.hasAttribute('data-spotlight-active') && getComputedStyle(el, '::after').opacity === '1';
    });
    const box = await card.boundingBox();
    await page.mouse.move(box.x + 25, box.y + 25);
    await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('.project-card').style.getPropertyValue('--rb-x')) - 25) < 1);
    const link = card.locator('h3 a');
    assert(await link.evaluate(el => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + 5, r.y + r.height / 2);
      return hit === el || el.contains(hit);
    }), 'Spotlight intercepted the project link');
    const lightGradient = await card.evaluate(el => getComputedStyle(el, '::after').backgroundImage);
    await page.locator('html').evaluate(el => el.setAttribute('data-bs-theme', 'dark'));
    assert.notEqual(await card.evaluate(el => getComputedStyle(el, '::after').backgroundImage), lightGradient);
    await page.mouse.move(10, 10);
    await page.waitForFunction(() => !document.querySelector('.project-card').hasAttribute('data-spotlight-active'));
    await link.focus();
    assert(await link.evaluate(el => document.activeElement === el));

    await page.goto(base + '/projects/', { waitUntil: 'networkidle' });
    const last = page.locator('.project-card').last();
    const lastText = await last.textContent();
    await last.scrollIntoViewIfNeeded();
    await page.waitForFunction(text => window.effectEntrances.some(e => e.card && e.text === text), lastText);
    await settled(page);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await last.scrollIntoViewIfNeeded();
    await settled(page);
    assert.equal(await page.evaluate(text => window.effectEntrances.filter(e => e.card && e.text === text).length, lastText), 1, 'Card repeated its entrance');
    assert.equal(await last.evaluate(el => getComputedStyle(el).opacity), '1');
    assert.deepEqual(errors, []);
    results.push({ mode: 'desktop', title: true, spotlight: true, links: true, onceOnlyScroll: true, darkTheme: true });
    await desktop.close();

    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference', serviceWorkers: 'block' });
    await record(touch);
    const phone = await touch.newPage();
    await phone.goto(base, { waitUntil: 'networkidle' });
    await settled(phone);
    assert.equal(await phone.locator('.project-card').first().evaluate(el => getComputedStyle(el, '::after').opacity), '0');
    await phone.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await phone.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
    const count = await phone.evaluate(() => window.effectEntrances.length);
    await phone.locator('.project-card').last().scrollIntoViewIfNeeded();
    assert.equal(await phone.evaluate(() => window.effectEntrances.length), count);
    results.push({ mode: 'touch', noSpotlight: true, dynamicReducedMotion: true });
    await touch.close();

    for (const mode of ['reduced-motion', 'no-javascript']) {
      const context = await browser.newContext({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce', javaScriptEnabled: mode !== 'no-javascript', serviceWorkers: 'block' });
      await record(context);
      const calm = await context.newPage();
      await calm.goto(base, { waitUntil: 'networkidle' });
      await calm.getByRole('heading', { name: heading, exact: true }).waitFor();
      assert.equal(await calm.locator('.rb-blur-letter').count(), 0);
      for (const size of [100, 200]) {
        await calm.evaluate(percent => document.documentElement.style.fontSize = percent + '%', size);
        assert(await calm.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${mode} at ${size}% overflowed`);
      }
      assert.equal(await calm.locator('.project-card').first().evaluate(el => getComputedStyle(el).opacity), '1');
      if (mode === 'reduced-motion') assert.deepEqual(await calm.evaluate(() => window.effectEntrances), []);
      results.push({ mode, textVisible: true, zoom200: true });
      await context.close();
    }
    await checkInteractions(browser, results);
    console.log(JSON.stringify({ base, engine, results }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
