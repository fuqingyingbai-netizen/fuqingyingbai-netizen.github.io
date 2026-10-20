/* Stateful browser checks use synthetic records in isolated contexts only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwright = require('playwright');
const base = process.env.LAYOUT_BASE_URL || 'http://127.0.0.1:4173';
const article = '/posts/生涯规划-先把工程能力做扎实/';
const meta = JSON.parse(fs.readFileSync(path.join(__dirname, '../_data/projects.json'), 'utf8'));
async function downloaded(download) {
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').replace(/^\ufeff/, '');
}
(async () => {
  const browser = await playwright[process.env.LAYOUT_BROWSER || 'webkit'].launch();
  async function context(options = {}) {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', ...options });
    await c.route('**/*', route => {
      assert.equal(route.request().method(), 'GET', 'Personal tools must never upload records');
      return new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort();
    });
    return c;
  }
  try {
    const reader = await context(), page = await reader.newPage();
    await page.goto(base + article, { waitUntil: 'networkidle' });
    const key = await page.evaluate(() => `reading-position:v1:${location.pathname}`);
    assert.equal(await page.locator('[data-reading-resume]').isVisible(), false);
    const position = await page.evaluate(() => {
      const content = document.querySelector('.reading-page article > .content');
      const y = scrollY + content.getBoundingClientRect().top + (content.offsetHeight - innerHeight) * .4;
      document.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, bubbles: true }));
      scrollTo(0, y); return y;
    });
    await page.waitForFunction(k => Boolean(localStorage.getItem(k)), key);
    const record = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
    assert(record.ratio >= .3 && record.ratio < .7);
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.goto(base + article, { waitUntil: 'networkidle' });
    assert(await page.locator('[data-reading-resume]').isVisible());
    assert(await page.evaluate(() => scrollY < 200), 'Returning must not jump automatically');
    await page.locator('[data-resume-continue]').click();
    assert(Math.abs(await page.evaluate(() => scrollY) - position) < 100, 'Continue must restore the previous passage');
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.goto(base + article, { waitUntil: 'networkidle' });
    await page.locator('[data-resume-clear]').click();
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key), null);
    await page.evaluate(({ k, value }) => localStorage.setItem(k, JSON.stringify(value)), { k: key, value: record });
    await page.goto(base + article + '#' + encodeURIComponent(record.heading), { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-reading-resume]').isVisible(), false, 'An explicit heading link takes precedence');
    await page.goto(base + article, { waitUntil: 'networkidle' });
    await page.locator('[data-resume-continue]').click();
    await page.evaluate(() => { const c = document.querySelector('.reading-page article > .content'); scrollTo(0, scrollY + c.getBoundingClientRect().bottom - innerHeight + 100); });
    await page.waitForFunction(k => !localStorage.getItem(k), key);
    await reader.close();

    const directory = await context(), projects = await directory.newPage();
    await projects.goto(base + '/projects/', { waitUntil: 'networkidle' });
    const form = projects.locator('[data-project-filters]');
    await form.waitFor();
    const total = meta.projects.length;
    assert.equal(await projects.locator('.project-card:visible').count(), total);
    const actualTags = await form.locator('select[name=tag] option').evaluateAll(options => options.map(o => o.value).filter(Boolean).sort());
    assert.deepEqual(actualTags, [...new Set(meta.projects.flatMap(p => p.tags || []))].sort());
    await form.locator('[name=group]').selectOption('personal');
    await form.locator('[name=tag]').selectOption('Python');
    const expected = meta.projects.filter(p => p.group === 'personal' && p.tags.includes('Python')).map(p => 'project-' + p.repo).sort();
    const visibleIds = () => projects.locator('.project-card:visible').evaluateAll(cards => cards.map(c => c.id).sort());
    assert.deepEqual(await visibleIds(), expected);
    const shared = projects.url();
    assert(new URL(shared).searchParams.get('tag') === 'Python');
    await projects.goBack({ waitUntil: 'networkidle' });
    assert.equal(await form.locator('[name=tag]').inputValue(), '');
    await projects.goForward({ waitUntil: 'networkidle' });
    assert.deepEqual(await visibleIds(), expected);
    await projects.goto(shared, { waitUntil: 'networkidle' });
    assert.deepEqual(await visibleIds(), expected);
    const learningTag = meta.projects.filter(p => p.group === 'learning').flatMap(p => p.tags).find(t => !meta.projects.some(p => p.group === 'personal' && p.tags.includes(t)));
    await form.locator('[name=tag]').selectOption(learningTag);
    assert.equal(await projects.locator('.project-card:visible').count(), 0);
    assert(await projects.locator('[data-project-empty]').isVisible());
    await form.getByRole('button', { name: '清除筛选', exact: true }).click();
    assert.equal(await projects.locator('.project-card:visible').count(), total);
    await projects.goto(base + '/projects/?group=personal&tag=Python#project-shopkeeper-agent', { waitUntil: 'networkidle' });
    assert(await projects.locator('#project-shopkeeper-agent').isVisible(), 'Old project anchors must remain reachable');
    assert.equal(await form.locator('[name=group]').inputValue(), '');
    await projects.goto(base + '/projects/?group=unknown&tag=%3Cimg%20src=x%3E', { waitUntil: 'networkidle' });
    assert.equal(await projects.locator('.project-card:visible').count(), total);
    assert.equal(new URL(projects.url()).searchParams.has('tag'), false);
    for (const width of [320, 390]) {
      await projects.setViewportSize({ width, height: 844 });
      await projects.evaluate(() => document.documentElement.style.fontSize = '200%');
      assert(await projects.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await directory.close();

    const planner = await context(), career = await planner.newPage();
    const errors = [];
    career.on('pageerror', e => errors.push(e.message));
    await career.goto(base + '/career/', { waitUntil: 'networkidle' });
    const planId = await career.locator('[data-career-planner]').getAttribute('data-plan-id');
    const planKey = `career-planner:${planId}:v1`;
    const task = career.locator('[data-task]'), review = career.locator('[data-review]').first();
    await task.first().evaluate(el => el.closest('details').open = true);
    await task.first().check(); await review.fill('测试记录 A：仅用于本地恢复检查');
    const downloadWait = career.waitForEvent('download');
    await career.locator('[data-backup]').click();
    const backup = JSON.parse(await downloaded(await downloadWait));
    assert.equal(backup.format, 'career-planner-backup'); assert.equal(backup.planId, planId);
    assert.equal(backup.data.completed.length, 1);
    await task.first().uncheck(); await task.nth(1).check(); await review.fill('测试记录 B');
    const current = () => career.evaluate(k => localStorage.getItem(k), planKey);
    const before = await current();
    const upload = async value => {
      await career.locator('[data-import-file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
    };
    await upload(backup); await career.locator('[data-import-preview]').waitFor();
    assert.equal(await current(), before, 'Selecting a file must not overwrite records');
    await career.locator('[data-cancel-import]').click(); assert.equal(await current(), before);
    await upload(backup); await career.locator('[data-confirm-import]').click();
    assert(await task.first().isChecked()); assert.equal(await task.nth(1).isChecked(), false);
    assert.equal(await review.inputValue(), '测试记录 A：仅用于本地恢复检查');
    await career.locator('[data-undo-import]').click(); assert.equal(await current(), before);
    for (const invalid of [
      '{not JSON', { ...backup, version: 99 }, { ...backup, planId: 'another-plan' },
      { ...backup, data: { completed: ['unknown-task'], reviews: {} } },
      { ...backup, data: { completed: [], reviews: { 'unknown-week': 'x' } } },
      { ...backup, data: { completed: [], reviews: { [Object.keys(backup.data.reviews)[0]]: 'x'.repeat(2001) } } },
      'x'.repeat(256 * 1024 + 1),
    ]) {
      await upload(invalid);
      await career.waitForFunction(() => document.querySelector('[data-import-file]').value === '');
      assert.equal(await current(), before);
      assert.equal(await career.locator('[data-import-preview]').isVisible(), false);
    }
    const literal = '<img src=x onerror="alert(1)">';
    const htmlBackup = structuredClone(backup); htmlBackup.data.reviews[Object.keys(backup.data.reviews)[0]] = literal;
    await upload(htmlBackup); await career.locator('[data-confirm-import]').click();
    assert.equal(await review.inputValue(), literal);
    assert.equal(await career.locator('.career-page img').count(), 0, 'Imported text must not render as HTML');
    await review.fill('继续编辑'); assert.equal(await career.locator('[data-undo-import]').isVisible(), false);
    await career.reload({ waitUntil: 'networkidle' }); assert.equal(await review.inputValue(), '继续编辑');
    await career.setViewportSize({ width: 320, height: 844 });
    await career.evaluate(() => document.documentElement.style.fontSize = '200%');
    await upload(backup); await career.locator('[data-import-preview]').waitFor();
    assert(await career.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    await planner.close();

    const blocked = await context();
    await blocked.addInitScript(() => { Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); }; });
    const limited = await blocked.newPage();
    await limited.goto(base + article, { waitUntil: 'networkidle' });
    assert.equal(await limited.locator('[data-reading-resume]').isVisible(), false);
    await limited.goto(base + '/career/', { waitUntil: 'networkidle' });
    await limited.locator('[data-import-file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await limited.locator('[data-confirm-import]').click();
    assert((await limited.locator('[data-save-status]').innerText()).includes('未能保存'));
    const offlineDownload = limited.waitForEvent('download'); await limited.locator('[data-backup]').click();
    assert.equal(JSON.parse(await downloaded(await offlineDownload)).data.completed.length, 1);
    await blocked.close();
    const plain = await context({ javaScriptEnabled: false }), noJS = await plain.newPage();
    await noJS.goto(base + '/projects/', { waitUntil: 'networkidle' });
    assert.equal(await noJS.locator('.project-card:visible').count(), total);
    assert.equal(await noJS.locator('[data-project-filters]').isVisible(), false);
    await plain.close();
    console.log(JSON.stringify({ readingResume: true, projectFiltersAndSharedURLs: true, existingAnchors: true, backupRestoreAndUndo: true, invalidBackupPreservesRecords: true, localOnly: true, smallScreen: true, noStorageAndNoJS: true }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
