const assert = require('node:assert/strict');
const playwright = require('playwright');
const base = process.env.LAYOUT_BASE_URL || 'http://127.0.0.1:4173';
const article = '/posts/生涯规划-先把工程能力做扎实/';
const cases = [
  ['/projects/', 'projects', '项目索引'],
  ['/resources/', 'resources', '配套阅读'],
  ['/notes/', 'notes', '记录类型'],
  ['/career/', 'career', '计划入口'],
  ['/about/', 'about', '继续了解']
];

(async () => {
  const engine = process.env.LAYOUT_BROWSER || 'webkit';
  const browser = await playwright[engine].launch({ ...(process.env.LAYOUT_EXECUTABLE ? { executablePath: process.env.LAYOUT_EXECUTABLE } : {}) });
  const results = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1413, height: 871 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const panels = [];
    for (const [route, kind, title] of cases) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      const panel = page.locator('#panel-wrapper');
      assert(await panel.isVisible());
      assert.equal(await panel.locator(`[data-panel-kind="${kind}"]`).count(), 1);
      assert(await panel.getByRole('heading', { name: title, exact: true }).isVisible());
      const text = await panel.innerText();
      assert(!text.includes('最近更新') && !text.includes('热门标签'));
      panels.push(text);
      // Every generated directory link must point to an actual rendered heading.
      for (const href of await panel.locator('[data-context-toc] a').evaluateAll(links => links.map(a => a.hash))) {
        assert(await page.evaluate(hash => Boolean(document.getElementById(decodeURIComponent(hash.slice(1)))), href));
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ' overflowed');
      results.push({ route, kind, title });
    }
    assert.equal(new Set(panels).size, cases.length, 'Different sections reused a cached sidebar');
    await page.goto(base + article, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('main.reading-page').count(), 1);
    assert.equal(await page.locator('article[data-toc] h1').count(), 1);
    await page.waitForFunction(() => document.querySelectorAll('#toc a').length > 1);
    const order = await page.locator('#panel-wrapper').evaluate(el => {
      const toc = el.querySelector('#toc-wrapper').getBoundingClientRect();
      const module = el.querySelector('.context-module').getBoundingClientRect();
      return toc.top < module.top;
    });
    assert(order, 'Article contents must precede related entries');
    assert(await page.locator('#panel-wrapper').getByRole('heading', { name: '计划入口', exact: true }).isVisible());
    const content = page.locator('.reading-page article > .content');
    assert((await content.innerText()).includes('企业项目的具体材料保留在内部'));
    assert((await content.innerText()).includes('六级尚未报名'));
    const styles = await content.evaluate(el => ({ font: parseFloat(getComputedStyle(el).fontSize), line: parseFloat(getComputedStyle(el).lineHeight), width: el.getBoundingClientRect().width }));
    assert(styles.font >= 16 && styles.line / styles.font >= 1.8 && styles.width <= 700);
    // Existing comments and popup TOC hooks must survive the default-layout override.
    assert.equal(await page.locator('[data-comments-server]').count(), 1);
    assert.equal(await page.locator('#toc-popup-content').count(), 1);
    assert(await page.locator('.reading-taxonomy a').count());
    assert.deepEqual(errors, []);
    await context.close();

    for (const width of [320, 390]) {
      const mobile = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      const phone = await mobile.newPage();
      await phone.goto(base, { waitUntil: 'networkidle' });
      assert(await phone.getByRole('heading', { name: '沈郑毅', exact: true }).isVisible());
      assert.equal(await phone.locator('.intro-topics, .intro-meta').count(), 0);
      assert((await phone.locator('.intro-description').innerText()).length < 30);
      assert(await phone.locator('#intro-title').evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 40));
      await phone.goto(base + article, { waitUntil: 'networkidle' });
      const map = phone.locator('.reading-map');
      assert(await map.isVisible());
      await map.locator('summary').click();
      const link = map.locator('a').first();
      const id = decodeURIComponent((await link.getAttribute('href')).slice(1));
      await link.click();
      await phone.waitForFunction(target => document.getElementById(target).getBoundingClientRect().top >= 0, id);
      for (const scale of [100, 200]) {
        await phone.evaluate(size => document.documentElement.style.fontSize = size + '%', scale);
        assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}/${scale}% article overflowed`);
      }
      assert.equal(await phone.locator('#panel-wrapper').isVisible(), false);
      await mobile.close();
    }
    const plain = await browser.newContext({ viewport: { width: 1413, height: 871 }, javaScriptEnabled: false, reducedMotion: 'reduce' });
    const noJs = await plain.newPage();
    await noJs.goto(base + '/resources/', { waitUntil: 'networkidle' });
    assert(await noJs.locator('#panel-wrapper').getByRole('heading', { name: '配套阅读', exact: true }).isVisible());
    assert.equal(await noJs.locator('[data-context-toc]').isVisible(), false);
    await plain.close();
    console.log(JSON.stringify({ base, engine, results, articleReading: true, mobileZoom: true, noJavaScript: true }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
