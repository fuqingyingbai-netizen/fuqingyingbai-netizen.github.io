/* Run against a built site with Playwright's WebKit installed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwright = require('playwright');
const base = process.env.LAYOUT_BASE_URL || 'http://127.0.0.1:4173';

(async () => {
  const engine = process.env.LAYOUT_BROWSER || 'webkit';
  const browser = await playwright[engine].launch({
    ...(process.env.LAYOUT_EXECUTABLE ? { executablePath: process.env.LAYOUT_EXECUTABLE } : {})
  });
  const results = [];
  try {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 844, height: 390 }
    ]) {
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      try {
        const response = await page.goto(base, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        await page.evaluate(() => document.fonts.ready);
        for (const fontScale of [100, 125, 200]) {
          await page.evaluate(scale => {
            document.documentElement.style.fontSize = `${scale}%`;
            document.querySelector('#sidebar').scrollTop = 0;
          }, fontScale);
          await page.locator('#sidebar-trigger').click();
          await page.waitForFunction(() =>
            document.body.hasAttribute('sidebar-display') &&
            Math.abs(document.querySelector('#sidebar').getBoundingClientRect().left) < 1
          );
          const layout = await page.evaluate(() => {
            const sidebar = document.querySelector('#sidebar');
            const subtitle = sidebar.querySelector('.site-subtitle');
            const text = document.createRange();
            text.selectNodeContents(subtitle);
            const nav = sidebar.querySelector('nav').getBoundingClientRect();
            const main = document.querySelector('#main-wrapper').getBoundingClientRect();
            return {
              textBottom: text.getBoundingClientRect().bottom,
              subtitleBottom: subtitle.getBoundingClientRect().bottom,
              profileBottom: sidebar.querySelector('.profile-wrapper').getBoundingClientRect().bottom,
              navTop: nav.top,
              mainLeft: main.left,
              mainRight: main.right,
              width: innerWidth,
              maskOnTop: document.elementFromPoint(innerWidth - 10, innerHeight / 2).id === 'mask'
            };
          });
          const label = `${engine} ${viewport.width}x${viewport.height} ${fontScale}%`;
          assert(layout.textBottom <= layout.subtitleBottom + 1, `${label}: subtitle escapes its box`);
          assert(layout.textBottom <= layout.navTop, `${label}: subtitle overlaps navigation`);
          assert(layout.profileBottom <= layout.navTop + 1, `${label}: profile overlaps navigation`);
          assert(Math.abs(layout.mainLeft) < 1 && layout.mainRight <= layout.width + 1, `${label}: menu shifts the article`);
          assert(layout.maskOnTop, `${label}: outside tap cannot dismiss the menu`);
          const lastLink = page.locator('#sidebar nav a').last();
          await lastLink.scrollIntoViewIfNeeded();
          const lastBounds = await lastLink.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, height: innerHeight };
          });
          assert(lastBounds.top >= -1 && lastBounds.bottom <= lastBounds.height + 1,
            `${label}: bottom navigation cannot be reached: ${JSON.stringify(lastBounds)}`);
          const controls = await page.locator('#sidebar .sidebar-bottom #mode-toggle, #sidebar .sidebar-bottom > a').evaluateAll(elements => elements.map(el => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          }));
          assert.equal(controls.length, 3);
          for (const control of controls) {
            assert(Math.abs(control.width - control.height) < 1, `${label}: footer control is stretched`);
            assert(control.width >= 44 && control.height >= 44, `${label}: footer control is too small to tap`);
          }
          if (process.env.LAYOUT_SCREENSHOTS && viewport.width === 390 && fontScale === 100) {
            await page.locator('#sidebar').evaluate(el => { el.scrollTop = 0; });
            fs.mkdirSync(process.env.LAYOUT_SCREENSHOTS, { recursive: true });
            await page.screenshot({ path: path.join(process.env.LAYOUT_SCREENSHOTS, `${engine}-mobile-menu.png`) });
          }
          await page.locator('#mask').click({ position: { x: viewport.width - 10, y: viewport.height / 2 } });
          assert.equal(await page.locator('body').evaluate(el => el.hasAttribute('sidebar-display')), false);
          results.push(label);
        }
        // Large iPhones cross the theme's desktop breakpoint when rotated.
        await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
        await page.locator('#sidebar-trigger').click();
        await page.locator('#mode-toggle').click();
        await page.locator('button.dropdown-item[data-theme-mode="dark"]').click();
        await page.waitForFunction(() => document.documentElement.dataset.bsTheme === 'dark');
        await page.locator('#mode-toggle').click();
        await page.locator('button.dropdown-item[data-theme-mode="light"]').click();
        await page.waitForFunction(() => document.documentElement.dataset.bsTheme === 'light');
        await page.setViewportSize({ width: 932, height: 430 });
        await page.waitForFunction(() => !document.body.hasAttribute('sidebar-display'));
        assert(await page.locator('#mask').evaluate(el => el.classList.contains('d-none')));
        await page.setViewportSize(viewport);
        await page.locator('#sidebar-trigger').click();
        assert(await page.locator('body').evaluate(el => el.hasAttribute('sidebar-display')));
        await page.locator('#sidebar a[href="/projects/"]').click();
        await page.waitForURL('**/projects/');
        assert.equal(await page.locator('body').evaluate(el => el.hasAttribute('sidebar-display')), false);
      } finally {
        await context.close();
      }
    }
    console.log(JSON.stringify({ base, results, rotationAndNavigation: 'passed' }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
