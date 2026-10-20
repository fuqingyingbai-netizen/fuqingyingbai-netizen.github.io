/* Real Mermaid and pinned Waline client; comment API reads are always mocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwright = require('playwright');
const base = process.env.LAYOUT_BASE_URL || 'http://127.0.0.1:4173';
const article = '/posts/LangGraph学习笔记-用问数工作流理解图式智能体/';
const clientDir = process.env.WALINE_CLIENT_DIR || path.dirname(require.resolve('@waline/client'));
const client = fs.readFileSync(path.join(clientDir, 'waline.js'), 'utf8');
const css = fs.readFileSync(path.join(clientDir, 'waline.css'), 'utf8');

(async () => {
  const browser = await playwright[process.env.LAYOUT_BROWSER || 'webkit'].launch();
  try {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const page = await phone.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('#search-trigger').click();
    for (const [query, target] of [['简历', '/projects/resume-evaluator-agent/'], ['dIfY', '/projects/dify-apps/'], ['Coze', '/projects/resume-evaluator-agent/']]) {
      await page.locator('#search-input').fill(query);
      await page.waitForFunction(url => document.querySelector('#search-results article a')?.getAttribute('href') === url, target);
      const urls = await page.locator('#search-results article a').evaluateAll(links => links.map(link => link.getAttribute('href')));
      assert.equal(urls.filter(url => url === target).length, 1);
      assert(!urls.some(url => url.startsWith('/projects/#project-') && url.includes(query === '简历' || query === 'Coze' ? 'resume-evaluator-agent' : 'dify-apps')));
    }
    await page.locator('#search-input').fill('<img src=x onerror=alert(1)>');
    await page.waitForFunction(() => document.querySelector('#search-results')?.textContent.includes('搜索结果为空'));
    assert.equal(await page.locator('#search-results img').count(), 0);
    await page.locator('#search-input').fill('问数');
    await page.waitForFunction(() => document.querySelectorAll('#search-results article').length > 0);
    const urls = await page.locator('#search-results article a').evaluateAll(links => links.map(link => link.getAttribute('href')));
    assert.equal(new Set(urls).size, urls.length);
    assert(urls.some(url => decodeURI(url) === '/posts/练习项目总结-电商问数智能Agent/'));
    await page.locator('#search-input').fill('');
    await page.waitForFunction(() => document.querySelector('#search-results').childElementCount === 0);

    await page.goto(base + article, { waitUntil: 'networkidle' });
    const viewport = page.locator('.diagram-viewport').first();
    await viewport.waitFor();
    const measure = () => viewport.locator('svg').evaluate(svg => ({
      scale: svg.getBoundingClientRect().width / svg.viewBox.baseVal.width,
      scroll: svg.closest('.diagram-viewport').scrollWidth,
      width: svg.closest('.diagram-viewport').clientWidth
    }));
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const scale of [100, 200]) {
        await page.evaluate(percent => document.documentElement.style.fontSize = percent + '%', scale);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Diagram widened the document');
        const diagram = await measure(); assert(diagram.scale >= .9 && diagram.scroll > diagram.width);
      }
    }
    await page.evaluate(() => document.documentElement.style.fontSize = '');
    const opener = page.getByRole('button', { name: '放大查看流程图', exact: true });
    await opener.click();
    const dialog = page.locator('.diagram-dialog[open]');
    assert(await dialog.isVisible());
    await dialog.getByRole('button', { name: '适应窗口', exact: true }).click();
    const fitted = Number.parseInt(await dialog.locator('output').innerText()); assert(fitted < 100);
    await dialog.getByRole('button', { name: '放大', exact: true }).click();
    assert(Number.parseInt(await dialog.locator('output').innerText()) > fitted);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      assert(await dialog.evaluate(el => el.contains(document.activeElement)), 'Focus escaped the modal');
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.diagram-dialog[open]').count(), 0);
    assert(await opener.evaluate(el => document.activeElement === el));
    assert.equal(await viewport.locator('svg').count(), 1);
    await page.evaluate(() => document.documentElement.dataset.bsTheme = 'dark');
    await page.waitForTimeout(250);
    assert((await measure()).scale >= .9);
    await phone.close();

    for (const initial of ['network', 'http', 'json', 'invalid', 'module', 'style']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      let mode = initial, reads = 0;
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === new URL(base).origin) return route.continue();
        if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('@waline/client@3.16.1/')) {
          if ((mode === 'module' && url.pathname.endsWith('waline.js')) || (mode === 'style' && url.pathname.endsWith('waline.css'))) return route.abort();
          return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: url.pathname.endsWith('.css') ? 'text/css' : 'application/javascript', body: url.pathname.endsWith('.css') ? css : client });
        }
        if (url.pathname === '/api/comment') {
          assert.equal(route.request().method(), 'GET', 'Tests must never submit a comment'); reads++;
          const headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
          if (mode === 'network') return route.abort();
          if (mode === 'http') return route.fulfill({ status: 503, headers, body: 'unavailable' });
          if (mode === 'invalid') return route.fulfill({ status: 200, headers, body: 'invalid JSON' });
          if (mode === 'json') return route.fulfill({ status: 200, headers, json: { errno: 500, errmsg: 'temporary read failure' } });
          return route.fulfill({ status: 200, headers, json: { errno: 0, errmsg: '', data: { page: 1, pageSize: 10, totalPages: 0, count: 0, data: [] } } });
        }
        return route.abort();
      });
      const comments = await context.newPage();
      await comments.goto(base + article, { waitUntil: 'networkidle' });
      assert.equal(reads, 0, 'Comment API was read before scrolling');
      await comments.locator('.visitor-comments').scrollIntoViewIfNeeded();
      await comments.locator('[data-comments-state="error"]').waitFor();
      assert(await comments.locator('.comment-retry').isVisible());
      assert(!(await comments.locator('.comment-status').innerText()).includes('暂无'));
      const draft = comments.locator('#waline textarea');
      if (await draft.count()) {
        await draft.fill('尚未提交的测试草稿');
        await comments.locator('#waline input').first().fill('测试访客');
      }
      mode = 'empty';
      await comments.locator('.comment-retry').click();
      await comments.locator('[data-comments-state="empty"]').waitFor();
      assert.equal(await comments.locator('.comment-retry').isVisible(), false);
      if (!['module', 'style'].includes(initial)) {
        assert.equal(await draft.inputValue(), '尚未提交的测试草稿');
        assert.equal(await comments.locator('#waline input').first().inputValue(), '测试访客');
      }
      assert(await comments.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert(reads > 0);
      await context.close();
    }
    const plain = await browser.newContext({ javaScriptEnabled: false });
    const noJs = await plain.newPage();
    await noJs.goto(base + article, { waitUntil: 'networkidle' });
    assert.equal(await noJs.locator('.diagram-caption button').count(), 0);
    assert((await noJs.locator('main').innerText()).includes('flowchart LR'));
    await plain.close();
    console.log(JSON.stringify({ searchRankingAndDeduplication: true, readableDiagrams: true, dialogKeyboard: true, commentFailuresAndDraftRetry: true, noJavaScript: true }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
