(() => {
  'use strict';
  const root = document.querySelector('[data-career-planner]');
  if (!root) return;

  const key = `career-planner:${root.dataset.planId}:v1`;
  const tasks = Array.from(root.querySelectorAll('[data-task]'));
  const weeks = Array.from(root.querySelectorAll('[data-week]'));
  const reviews = Array.from(root.querySelectorAll('[data-review]'));
  const status = root.querySelector('[data-save-status]');
  const empty = root.querySelector('[data-empty]');
  const progress = root.querySelector('[data-career-progress]');
  let filter = 'all';
  let saved = { completed: [], reviews: {} };
  let storageAvailable = true;
  const preview = root.querySelector('[data-import-preview]');
  const fileInput = root.querySelector('[data-import-file]');
  const undoButton = root.querySelector('[data-undo-import]');
  let pendingBackup, previousState, importAttempt = 0;

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || !Array.isArray(value.completed) ||
          !value.reviews || typeof value.reviews !== 'object' || Array.isArray(value.reviews)) {
        throw new Error('Invalid saved record');
      }
      saved = value;
    }
    localStorage.setItem(key, JSON.stringify(saved));
  } catch {
    storageAvailable = false;
    status.textContent = '未能读取或保存本地记录。本次仍可填写，请在离开前导出复盘。';
  }

  const completed = new Set(saved.completed.filter(value => typeof value === 'string'));
  tasks.forEach(task => { task.disabled = false; task.checked = completed.has(task.dataset.task); });
  reviews.forEach(review => {
    const value = saved.reviews[review.dataset.review];
    review.value = typeof value === 'string' ? value.slice(0, 2000) : '';
  });
  root.querySelectorAll('[data-career-tools], [data-review-box], [data-week-count]').forEach(element => { element.hidden = false; });

  const todayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const part = type => todayParts.find(value => value.type === type).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const currentWeek = weeks.find(week => today >= week.dataset.start && today <= week.dataset.end);
  if (currentWeek) {
    weeks.forEach(week => { week.open = week === currentWeek; });
    currentWeek.classList.add('is-current');
  }

  const planStatus = currentWeek
    ? `本周：${currentWeek.querySelector('.career-week-number').textContent} 周`
    : today < root.dataset.planStart ? '本期计划尚未开始' : '本期已结束，可继续复盘';
  root.querySelector('[data-plan-status]').textContent = `今天 ${today} · ${planStatus}`;

  function state() {
    return {
      completed: tasks.filter(task => task.checked).map(task => task.dataset.task),
      reviews: Object.fromEntries(reviews.map(review => [review.dataset.review, review.value]))
    };
  }

  function applyFilter() {
    let visible = 0;
    weeks.forEach(week => {
      const checked = Array.from(week.querySelectorAll('[data-task]')).every(task => task.checked);
      week.hidden = filter === 'current' ? week !== currentWeek : filter === 'unfinished' && checked;
      if (!week.hidden) visible += 1;
    });
    empty.hidden = visible > 0;
    empty.textContent = filter === 'current' && !currentWeek
      ? `今天不在本期计划（${root.dataset.planStart} 至 ${root.dataset.planEnd}）内，可切换全部周次。`
      : '这个筛选下的任务都已完成，可以切换全部周次查看复盘。';
    root.querySelectorAll('[data-filter]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    });
  }

  function renderProgress() {
    const count = tasks.filter(task => task.checked).length;
    progress.max = tasks.length;
    progress.value = count;
    progress.textContent = `${count} / ${tasks.length}`;
    root.querySelector('[data-progress-text]').textContent = `已完成 ${count} / ${tasks.length} 项任务`;
    weeks.forEach(week => {
      const items = Array.from(week.querySelectorAll('[data-task]'));
      const done = items.filter(task => task.checked).length;
      week.querySelector('[data-week-count]').textContent = `${done} / ${items.length}`;
      week.classList.toggle('is-complete', done === items.length);
    });
    applyFilter();
  }

  function persist() {
    if (!storageAvailable) return;
    try {
      localStorage.setItem(key, JSON.stringify(state()));
      status.textContent = '已保存在当前浏览器';
    } catch {
      storageAvailable = false;
      status.textContent = '本次改动未能保存，请在离开前导出复盘。';
    }
  }

  function edited() {
    previousState = null;
    undoButton.hidden = true;
    persist();
  }
  tasks.forEach(task => task.addEventListener('change', () => { edited(); renderProgress(); }));
  reviews.forEach(review => review.addEventListener('input', edited));
  root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    applyFilter();
    if (filter === 'current' && currentWeek) currentWeek.open = true;
  }));

  function openWeek(id) {
    const week = weeks.find(element => element.id === id);
    if (!week) return;
    filter = 'all';
    applyFilter();
    week.open = true;
  }
  function followHash() {
    openWeek(location.hash.slice(1));
  }
  root.querySelectorAll('[data-open-week]').forEach(link => link.addEventListener('click', () => openWeek(link.dataset.openWeek)));
  window.addEventListener('hashchange', followHash);

  function download(content, type, filename) {
    const url = URL.createObjectURL(new Blob(['\ufeff', content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  root.querySelector('[data-backup]').addEventListener('click', () => {
    const backup = { format: 'career-planner-backup', version: 1, planId: root.dataset.planId, exportedAt: new Date().toISOString(), data: state() };
    download(JSON.stringify(backup, null, 2), 'application/json;charset=utf-8', `生涯规划备份-${root.dataset.planId}-${today}.json`);
    status.textContent = '已下载可恢复的备份文件，请自行保管。';
  });
  function validateBackup(value) {
    if (!value || value.format !== 'career-planner-backup' || value.version !== 1 || value.planId !== root.dataset.planId) throw new Error('这不是当前计划支持的备份文件，请核对计划与备份版本。');
    const data = value.data;
    const taskIds = new Set(tasks.map(task => task.dataset.task));
    const reviewIds = new Set(reviews.map(review => review.dataset.review));
    if (!data || !Array.isArray(data.completed) || data.completed.length > tasks.length ||
        data.completed.some(id => typeof id !== 'string' || !taskIds.has(id)) || new Set(data.completed).size !== data.completed.length ||
        !data.reviews || typeof data.reviews !== 'object' || Array.isArray(data.reviews) ||
        Object.entries(data.reviews).some(([id, text]) => !reviewIds.has(id) || typeof text !== 'string' || text.length > 2000)) {
      throw new Error('备份中的任务或复盘格式不匹配，当前记录未修改。');
    }
    return { completed: [...data.completed], reviews: Object.fromEntries(Object.entries(data.reviews)) };
  }
  function restore(data) {
    tasks.forEach(task => { task.checked = data.completed.includes(task.dataset.task); });
    reviews.forEach(review => { review.value = data.reviews[review.dataset.review] || ''; });
    persist();
    renderProgress();
  }
  root.querySelector('[data-import]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const attempt = ++importAttempt;
    preview.hidden = true;
    pendingBackup = null;
    try {
      if (file.size > 256 * 1024) throw new Error('备份文件超过 256 KB，请选择本页导出的 JSON 备份。');
      const text = await file.text();
      if (attempt !== importAttempt) return;
      let value;
      try { value = JSON.parse(text.replace(/^\ufeff/, '')); } catch { throw new Error('无法读取 JSON 备份，当前记录未修改。'); }
      pendingBackup = validateBackup(value);
      const count = Object.values(pendingBackup.reviews).filter(text => text.trim()).length;
      root.querySelector('[data-import-summary]').textContent = `备份已读取：${pendingBackup.completed.length} 项已完成任务，${count} 周复盘。尚未修改当前记录。`;
      preview.hidden = false;
      root.querySelector('[data-confirm-import]').focus();
      status.textContent = '请核对备份摘要，再确认恢复或取消。';
    } catch (error) {
      if (attempt === importAttempt) status.textContent = error.message;
    } finally { if (attempt === importAttempt) fileInput.value = ''; }
  });
  root.querySelector('[data-cancel-import]').addEventListener('click', () => {
    pendingBackup = null;
    preview.hidden = true;
    status.textContent = '已取消恢复，当前记录未修改。';
    root.querySelector('[data-import]').focus();
  });
  root.querySelector('[data-confirm-import]').addEventListener('click', () => {
    if (!pendingBackup) return;
    previousState = state();
    restore(pendingBackup);
    pendingBackup = null;
    preview.hidden = true;
    undoButton.hidden = false;
    undoButton.focus();
    status.textContent = storageAvailable ? '备份已恢复并保存在当前浏览器；再次编辑前可撤销。' : '备份已恢复到本页，但浏览器未能保存；离开前请下载备份。';
  });
  undoButton.addEventListener('click', () => {
    if (!previousState) return;
    restore(previousState);
    previousState = null;
    undoButton.hidden = true;
    root.querySelector('[data-import]').focus();
    status.textContent = storageAvailable ? '已撤销恢复，原记录已保存在当前浏览器。' : '已撤销恢复，原记录已回到本页；离开前请下载备份。';
  });

  root.querySelector('[data-export]').addEventListener('click', () => {
    const lines = [
      `# 生涯规划复盘：${root.dataset.planTitle}`,
      '', `计划周期：${root.dataset.planStart} — ${root.dataset.planEnd}`,
      `导出日期：${today}`, '', root.querySelector('[data-progress-text]').textContent, ''
    ];
    weeks.forEach(week => {
      lines.push(`## 第 ${week.querySelector('.career-week-number').textContent} 周：${week.dataset.weekTitle}`,
        '', `${week.dataset.start} — ${week.dataset.end}`, '');
      week.querySelectorAll('[data-task]').forEach(task => {
        const label = task.labels[0];
        lines.push(`- [${task.checked ? 'x' : ' '}] ${label.querySelector('.career-task-kind').textContent}：${label.lastElementChild.textContent}`);
      });
      lines.push('', week.querySelector('.career-deliverable').textContent.trim(), '', '### 本周复盘', '',
        week.querySelector('[data-review]').value || '尚未填写', '');
    });
    download(lines.join('\n'), 'text/markdown;charset=utf-8', `生涯规划复盘-${root.dataset.planId}-${today}.md`);
    status.textContent = storageAvailable ? '已导出复盘；记录仍保留在当前浏览器' : '已导出本次记录；当前浏览器未能保存';
  });

  renderProgress();
  followHash();
})();
