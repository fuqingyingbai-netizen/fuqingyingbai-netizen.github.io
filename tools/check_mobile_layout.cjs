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
      const external = [];
      await context.route('**/*', route => {
        if (new URL(route.request().url()).origin !== new URL(base).origin) {
          external.push(route.request().url());
          return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage();
      try {
        const response = await page.goto(base, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => dayjs.locale()), 'zh');
        if (viewport.width === 390) {
          const latestTop = await page.locator('#post-list').evaluate(el => el.getBoundingClientRect().top);
          assert(latestTop < 1200, `Latest articles are too far down the mobile page: ${latestTop}`);
          assert.equal(await page.locator('.featured-projects .project-card').count(), 3);
          assert.equal(await page.locator('.featured-projects .project-preview:visible').count(), 0);
        }
        assert.equal(await page.locator('#sidebar-trigger').getAttribute('aria-expanded'), 'false');
        assert(await page.locator('#sidebar').evaluate(el => el.inert));
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
          assert.equal(await page.locator('#sidebar-trigger').getAttribute('aria-expanded'), 'true');
          const currentLink = page.locator('#sidebar nav [aria-current="page"]');
          assert.equal(await currentLink.count(), 1);
          assert(await currentLink.evaluate(el => document.activeElement === el));
          assert.equal(await currentLink.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', `${label}: current row still has a filled background`);
          assert(await page.locator('#main-wrapper').evaluate(el => el.inert));
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
          const separators = await page.locator('#sidebar .sidebar-bottom').evaluate(el => {
            const native = [...el.querySelectorAll(':scope > .icon-border')];
            const links = [...el.querySelectorAll(':scope > a')];
            return {
              count: native.length + links.slice(0, -1).length,
              nativeVisible: native.every(dot => dot.getBoundingClientRect().width === 3 && dot.getBoundingClientRect().height === 3),
              addedVisible: links.slice(0, -1).every(link => {
                const dot = getComputedStyle(link, '::after');
                return dot.content === '""' && parseFloat(dot.width) === 3 && parseFloat(dot.height) === 3 && dot.backgroundColor !== 'rgba(0, 0, 0, 0)';
              })
            };
          });
          assert.equal(separators.count, controls.length - 1, `${label}: footer separator missing`);
          assert(separators.nativeVisible && separators.addedVisible, `${label}: footer separator is invisible`);
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
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.body.hasAttribute('sidebar-display'));
        assert(await page.locator('#sidebar-trigger').evaluate(el => document.activeElement === el));
        assert.equal(await page.locator('#main-wrapper').evaluate(el => el.inert), false);
        await page.locator('#sidebar-trigger').click();
        await page.locator('#sidebar .sidebar-bottom > a').last().focus();
        await page.keyboard.press('Tab');
        assert(await page.locator('#sidebar a').first().evaluate(el => document.activeElement === el));
        await page.keyboard.press('Shift+Tab');
        assert(await page.locator('#sidebar .sidebar-bottom > a').last().evaluate(el => document.activeElement === el));
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
        await page.locator('#search-trigger').click();
        await page.locator('#search-input').fill('Coze');
        await page.waitForFunction(() => document.querySelectorAll('#search-results article').length > 0);
        assert(await page.locator('#search-results a[href="/projects/resume-evaluator-agent/"]').count());
        await page.locator('#search-cancel').click();
        await page.locator('#sidebar-trigger').click();
        assert(await page.locator('body').evaluate(el => el.hasAttribute('sidebar-display')));
        await page.locator('#sidebar a[href="/projects/"]').click();
        await page.waitForURL('**/projects/');
        assert.equal(await page.locator('body').evaluate(el => el.hasAttribute('sidebar-display')), false);
        if (viewport.width === 390) {
          for (const [route, parent] of [
            ['/projects/', '/projects/'], ['/about/', '/about/'],
            ['/projects/dify-apps/', '/projects/'], ['/projects/resume-evaluator-agent/', '/projects/'],
            ['/posts/LangGraph学习笔记-用问数工作流理解图式智能体/', '/notes/'],
            ['/posts/weekly-2026-10-18/', '/notes/'],
            ['/posts/生涯规划-先把工程能力做扎实/', '/career/'],
            ['/tags/langgraph/', '/tags/'], ['/categories/学习笔记/', '/categories/']
          ]) {
            await page.goto(base + route, { waitUntil: 'networkidle' });
            await page.locator('#sidebar-trigger').tap();
            const selected = page.locator('#sidebar nav [aria-current]');
            assert.equal(await selected.count(), 1);
            assert.equal(await selected.getAttribute('href'), parent);
            assert.equal(await selected.getAttribute('aria-current'), route === parent ? 'page' : 'location');
            assert(await selected.evaluate(el => document.activeElement === el), 'Opening the drawer focused Home instead of the current section');
            assert.equal(await selected.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
            const home = page.locator('#sidebar nav a[href="/"]');
            assert.equal(await home.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
            // Sticky touch hover and keyboard focus are separate visual states.
            await home.hover();
            assert.equal(await home.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
            await page.keyboard.press('Escape');
            await page.locator('#sidebar-trigger').focus();
            await page.keyboard.press('Enter');
            assert(await selected.evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).outlineStyle === 'solid'), 'Keyboard focus indicator was lost');
          }
        }
        assert.deepEqual(external, [], 'Core pages must not request external scripts, fonts or styles');
      } finally {
        await context.close();
      }
    }
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await desktop.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.notEqual(await page.locator('#sidebar .nav-item.active .nav-link').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', 'Desktop current-page style changed');
    await desktop.close();
    console.log(JSON.stringify({ base, results, rotationAndNavigation: 'passed', mobileCurrentTextOnly: true, desktopCurrentStyle: true }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
