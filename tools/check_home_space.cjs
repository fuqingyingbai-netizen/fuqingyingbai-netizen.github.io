const assert = require('node:assert/strict');
const playwright = require('playwright');
const base = process.env.LAYOUT_BASE_URL || 'http://127.0.0.1:4173';

async function settled(page) {
  // Chirpy's lazy image placeholders can shimmer indefinitely below the fold.
  await page.waitForFunction(() => !document.getAnimations().some(a =>
    a.playState === 'running' && a.effect.getTiming().iterations !== Infinity));
}
async function collapsed(page, expected) {
  await page.waitForFunction(value => {
    const sidebar = document.querySelector('#sidebar');
    return document.documentElement.hasAttribute('data-sidebar-collapsed') === value && sidebar.inert === value;
  }, expected);
  await settled(page);
  assert.equal(await page.locator('#desktop-nav-toggle').getAttribute('aria-expanded'), String(!expected));
}

(async () => {
  const engine = process.env.LAYOUT_BROWSER || 'webkit';
  const browser = await playwright[engine].launch({ ...(process.env.LAYOUT_EXECUTABLE ? { executablePath: process.env.LAYOUT_EXECUTABLE } : {}) });
  const results = [];
  try {
    for (const width of [1440, 1920]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base, { waitUntil: 'networkidle' });
      await settled(page);
      assert.equal(await page.locator('.home-scene[aria-hidden="true"] svg').count(), 1);
      assert.equal(await page.locator('.home-scene').evaluate(el => getComputedStyle(el).animationIterationCount), '1');
      assert.equal(await page.locator('#panel-wrapper').isVisible(), false);
      const before = (await page.locator('.home-intro').boundingBox()).width;
      const toggle = page.locator('#desktop-nav-toggle');
      await toggle.focus();
      await page.keyboard.press('Enter');
      await collapsed(page, true);
      assert(await toggle.evaluate(el => el === document.activeElement));
      const after = (await page.locator('.home-intro').boundingBox()).width;
      assert(after - before >= 100, `${width}: collapsing did not create useful space (${before} -> ${after})`);
      assert.equal(await page.locator('#sidebar').evaluate(el => getComputedStyle(el).visibility), 'hidden');
      await page.reload({ waitUntil: 'networkidle' });
      await collapsed(page, true);
      await page.locator('.intro-actions a[href="/about/"]').click();
      await page.waitForURL('**/about/');
      await collapsed(page, true);
      await page.goBack({ waitUntil: 'networkidle' });
      await collapsed(page, true);
      await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }));
      const buttonBox = await page.locator('#desktop-nav-toggle').boundingBox();
      assert(buttonBox.y >= 0 && buttonBox.y < 50, 'Expand control disappeared on scroll');
      await page.locator('#desktop-nav-toggle').click();
      await collapsed(page, false);
      await page.locator('#desktop-nav-toggle').click();
      await collapsed(page, true);

      // The desktop preference must not prevent opening the mobile drawer.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#sidebar-trigger').click();
      await page.waitForFunction(() => !document.querySelector('#sidebar').inert && document.querySelector('#main-wrapper').inert);
      assert(await page.locator('#sidebar nav a').first().isVisible());
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.body.hasAttribute('sidebar-display'));
      await page.locator('#sidebar-trigger').click();
      await page.setViewportSize({ width, height: 1000 });
      await collapsed(page, true);
      assert.equal(await page.locator('#main-wrapper').evaluate(el => el.inert), false);
      assert(await page.locator('#mask').evaluate(el => el.classList.contains('d-none')));
      assert(await page.locator('#desktop-nav-toggle').evaluate(el => document.activeElement === el));
      // Native table-of-contents jumps must clear the sticky desktop bar.
      await page.goto(base + '/posts/LangGraph学习笔记-用问数工作流理解图式智能体/', { waitUntil: 'networkidle' });
      const anchor = await page.locator('.content h2[id]').first().getAttribute('id');
      await page.evaluate(id => { document.documentElement.style.scrollBehavior = 'auto'; location.hash = id; }, anchor);
      await page.waitForFunction(id => {
        const heading = document.getElementById(id).getBoundingClientRect();
        const bar = document.querySelector('#topbar-wrapper').getBoundingClientRect();
        return scrollY > 0 && heading.top >= bar.bottom + 4 && heading.top < bar.bottom + 100;
      }, anchor);
      assert.deepEqual(errors, []);
      results.push({ width, before, after, persistence: true, keyboard: true, mobileDrawer: true, anchorsClear: true });
      await context.close();
    }

    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.home-scene').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.locator('.home-intro').hover({ position: { x: 30, y: 30 } });
    assert.equal(await page.locator('.home-intro').evaluate(el => el.style.getPropertyValue('--scene-x')), '');
    await page.locator('#desktop-nav-toggle').click();
    await collapsed(page, true);
    assert.equal(await page.locator('#main-wrapper').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await context.close();

    const blocked = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await blocked.addInitScript(() => {
      // Fail this preference's reads/writes without disabling unrelated theme storage.
      for (const method of ['getItem', 'setItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (key, ...args) {
          if (key === 'site-sidebar') throw new Error('Storage unavailable');
          return original.call(this, key, ...args);
        };
      }
    });
    const noStorage = await blocked.newPage();
    await noStorage.goto(base, { waitUntil: 'networkidle' });
    await noStorage.locator('#desktop-nav-toggle').click();
    await collapsed(noStorage, true);
    await noStorage.locator('#desktop-nav-toggle').click();
    await collapsed(noStorage, false);
    await blocked.close();

    const plain = await browser.newContext({ viewport: { width: 1440, height: 1000 }, javaScriptEnabled: false, reducedMotion: 'reduce' });
    const noJs = await plain.newPage();
    await noJs.goto(base, { waitUntil: 'networkidle' });
    assert(await noJs.locator('#sidebar nav a[href="/projects/"]').isVisible());
    assert.equal(await noJs.locator('#desktop-nav-toggle').count(), 0);
    assert(await noJs.getByRole('heading', { name: '你好，我是沈郑毅。', exact: true }).isVisible());
    await plain.close();
    console.log(JSON.stringify({ base, engine, results, reducedMotion: true, blockedStorage: true, noJavaScript: true }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
