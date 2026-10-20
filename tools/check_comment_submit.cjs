/* Touch/WebKit submission contract. All API calls are mocked, including POST. */
const assert = require('node:assert/strict');
const playwright = require('playwright');
const base = process.env.LAYOUT_BASE_URL || 'http://127.0.0.1:4173';
const article = '/posts/LangGraph学习笔记-用问数工作流理解图式智能体/';

(async () => {
  const browser = await playwright[process.env.LAYOUT_BROWSER || 'webkit'].launch();
  try {
    for (const width of [320, 390]) {
      for (const textSize of [100, 200]) {
        const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
        let mode = width === 320 ? 'network' : 'rate-limit', posts = 0;
        const assets = new Set();
        await context.route('**/*', async route => {
          const request = route.request(), url = new URL(request.url());
          if (url.origin === new URL(base).origin) {
            if (url.pathname.includes('/assets/third-party/waline/3.16.1/')) assets.add(url.pathname.split('/').pop());
            return route.continue();
          }
          assert.notEqual(url.hostname, 'cdn.jsdelivr.net', 'Comment client must load from the site');
          if (url.pathname !== '/api/comment') return route.abort();
          const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          if (request.method() === 'GET') return route.fulfill({ headers, json: { errno: 0, data: { page: 1, pageSize: 10, totalPages: 0, count: 0, data: [] } } });
          assert.equal(request.method(), 'POST'); posts++;
          assert.equal(request.headers().authorization, undefined, 'Guest submission must not require an account');
          const submitted = request.postDataJSON();
          assert.equal(submitted.url, article, 'Preserve existing comment paths');
          assert.equal(submitted.nick, '测试访客');
          assert(!submitted.mail, 'Email must remain optional');
          assert(submitted.comment.includes('尚未提交的手机留言'));
          if (mode === 'network') return route.abort();
          if (mode === 'rate-limit') return route.fulfill({ headers, json: { errno: 1000, errmsg: '请等待 60 秒后再提交' } });
          return route.fulfill({ headers, json: { errno: 0, errmsg: '', data: {
            objectId: 37, time: Date.now(), comment: '<p>尚未提交的手机留言</p>', orig: '尚未提交的手机留言', nick: submitted.nick,
            url: article, link: '', avatar: '', children: [], like: 0, sticky: false, status: mode,
          } } });
        });
        const page = await context.newPage();
        const dialogs = [];
        page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
        await page.goto(base + article, { waitUntil: 'networkidle' });
        await page.evaluate(size => document.documentElement.style.fontSize = size + '%', textSize);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.locator('.visitor-comments').scrollIntoViewIfNeeded();
        await page.locator('[data-comments-state="empty"]').waitFor();
        const draft = page.locator('#waline textarea'), submit = page.locator('#waline .wl-btn.primary');
        await page.locator('#waline input[name=nick]').fill('测试访客');
        await draft.fill('尚未提交的手机留言');
        await submit.scrollIntoViewIfNeeded();
        const target = await submit.boundingBox();
        assert(target.x >= 0 && target.x + target.width <= width + 1 && target.height >= 44, 'The submit button must fit the phone viewport');
        await submit.tap();
        await page.waitForFunction(() => !document.querySelector('#waline .wl-btn.primary').disabled);
        assert.equal(posts, 1);
        assert.equal(dialogs.length, 1, 'A failed submit must report an error');
        if (mode === 'rate-limit') assert(dialogs[0].includes('60'));
        assert.equal(await draft.inputValue(), '尚未提交的手机留言', 'Failure must preserve the draft');
        assert.equal(await page.locator('#waline input[name=nick]').inputValue(), '测试访客');
        assert.equal(await page.locator('#waline input[name=mail]').inputValue(), '');
        mode = width === 320 ? 'waiting' : 'approved';
        await submit.tap();
        await page.waitForFunction(() => !document.querySelector('#waline textarea').value);
        assert.equal(posts, 2, 'Only a second user action may resubmit');
        assert.equal(dialogs.length, 1);
        const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
          x: scrollX, visualWidth: visualViewport.width, outside: [...document.querySelectorAll('body *')].filter(el => !el.closest('svg') && el.getBoundingClientRect().right + scrollX > innerWidth + 1)
            .slice(0, 12).map(el => ({ tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width, left: el.getBoundingClientRect().left })) }));
        assert(layout.scroll <= layout.width, `${width}px at ${textSize}% text overflowed: ${JSON.stringify(layout)}`);
        assert(assets.has('waline.js') && assets.has('waline.css'), 'Both client assets must be served locally');
        await context.close();
      }
    }
    console.log(JSON.stringify({ anonymousTouchSubmit: true, emailOptional: true, failurePreservesDraft: true, manualRetry: true, approvedAndWaiting: true, localAssets: true }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
