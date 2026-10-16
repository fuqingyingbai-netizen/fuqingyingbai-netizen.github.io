const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwright = require('playwright');
const base = process.env.LAYOUT_BASE_URL || 'http://127.0.0.1:4173';

async function observe(context, fallback = false) {
  await context.addInitScript(forceFallback => {
    if (forceFallback) Object.defineProperty(window, 'CSSViewTransitionRule', { value: undefined });
    window.motionCheck = { native: false, animations: [], entrances: [], token: Math.random() };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.matches('main')) window.motionCheck.entrances.push(options.duration);
      return animate.call(this, frames, options);
    };
    addEventListener('pagereveal', event => {
      window.motionCheck.native = Boolean(event.viewTransition);
      event.viewTransition?.ready.then(() => {
        window.motionCheck.animations = document.getAnimations().map(animation => animation.animationName);
      }).catch(() => {});
    });
  }, fallback);
}

(async () => {
  const engine = process.env.LAYOUT_BROWSER || 'webkit';
  const browser = await playwright[engine].launch({
    ...(process.env.LAYOUT_EXECUTABLE ? { executablePath: process.env.LAYOUT_EXECUTABLE } : {})
  });
  const results = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', serviceWorkers: 'block' });
    await observe(context);
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    const native = await page.evaluate(() => typeof CSSViewTransitionRule === 'function');
    await page.locator('#sidebar nav a[href="/about/"]').click();
    await page.waitForURL('**/about/');
    if (native) {
      await page.waitForFunction(() => window.motionCheck.animations.includes('site-page-in'));
      assert(await page.evaluate(() => window.motionCheck.native));
    }
    await page.locator('#sidebar nav a[href="/projects/"]').click();
    await page.waitForURL('**/projects/');
    await page.evaluate(() => scrollTo(0, 500));
    const position = await page.evaluate(() => scrollY);
    await page.goBack({ waitUntil: 'load' });
    await page.waitForURL('**/about/');
    await page.goForward({ waitUntil: 'load' });
    await page.waitForURL('**/projects/');
    await page.waitForFunction(y => Math.abs(scrollY - y) < 5, position);
    assert.equal(await page.locator('main').evaluate(el => getComputedStyle(el).opacity), '1');
    await page.goto(base + '/notes/', { waitUntil: 'networkidle' });
    const token = await page.evaluate(() => window.motionCheck.token);
    await page.locator('.notes-nav a[href^="#"]').first().click();
    assert(new URL(page.url()).hash);
    assert.equal(await page.evaluate(() => window.motionCheck.token), token, 'An anchor must not reload the page');
    results.push({ mode: 'normal', native, historyAndAnchors: true });
    await context.close();

    const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await observe(reduced);
    const calm = await reduced.newPage();
    await calm.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await calm.locator('.site-button').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await calm.locator('#sidebar-trigger').click();
    await calm.locator('#sidebar nav a[href="/about/"]').click();
    await calm.waitForURL('**/about/');
    await calm.waitForLoadState('load');
    assert.equal(await calm.evaluate(() => window.motionCheck.native), false);
    assert.deepEqual(await calm.evaluate(() => window.motionCheck.entrances), []);
    results.push({ mode: 'reduced-motion', noAnimation: true });
    await reduced.close();

    const fallback = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', serviceWorkers: 'block' });
    await observe(fallback, true);
    const css = fs.readFileSync(path.join(__dirname, '../assets/css/site-motion.css'), 'utf8').replace('navigation: auto', 'navigation: none');
    await fallback.route('**/assets/css/site-motion.css', route => route.fulfill({ contentType: 'text/css', body: css }));
    const legacy = await fallback.newPage();
    await legacy.goto(base, { waitUntil: 'networkidle' });
    assert.deepEqual(await legacy.evaluate(() => window.motionCheck.entrances), [200]);
    await legacy.locator('#sidebar-trigger').click();
    await legacy.locator('#sidebar nav a[href="/about/"]').click();
    await legacy.waitForURL('**/about/');
    await legacy.waitForLoadState('networkidle');
    assert.deepEqual(await legacy.evaluate(() => window.motionCheck.entrances), [200]);
    await legacy.goBack({ waitUntil: 'load' });
    await legacy.waitForURL(base + '/');
    await legacy.waitForFunction(() => !document.querySelector('main').getAnimations().some(a => a.playState === 'running'));
    assert.equal(await legacy.locator('main').evaluate(el => getComputedStyle(el).opacity), '1');
    results.push({ mode: 'legacy-fallback', entranceAndBack: true });
    await fallback.close();
    console.log(JSON.stringify({ base, engine, results }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
