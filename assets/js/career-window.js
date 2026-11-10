(() => {
  'use strict';
  function chooseWeek(weeks, today) {
    if (!weeks.length) return -1;
    const current = weeks.findIndex(week => today >= week.start && today <= week.end);
    return current >= 0 ? current : today < weeks[0].start ? 0 : weeks.length - 1;
  }
  function shanghaiDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const part = kind => parts.find(value => value.type === kind).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { chooseWeek, shanghaiDate };
  if (typeof document === 'undefined') return;
  const root = document.querySelector('[data-plan-window]');
  if (!root) return;
  const appearanceSelect = root.querySelector('[data-window-appearance]');
  const appearanceKey = 'career-window:appearance:v1';
  function applyAppearance(value) {
    const appearance = ['light','dark'].includes(value) ? value : 'system';
    document.documentElement.dataset.appearance = appearance;
    if (appearanceSelect) appearanceSelect.value = appearance;
  }
  try { applyAppearance(localStorage.getItem(appearanceKey)); } catch { applyAppearance('system'); }
  appearanceSelect?.addEventListener('change', () => {
    applyAppearance(appearanceSelect.value);
    try { localStorage.setItem(appearanceKey,appearanceSelect.value); } catch { /* Appearance still works for this window. */ }
  });
  const more = root.querySelector('.window-more');
  more?.addEventListener('keydown', event => {
    if (event.key === 'Escape' && more.open) { event.preventDefault(); more.open = false; more.querySelector('summary').focus(); }
  });
  document.addEventListener('click', event => { if (more?.open && !more.contains(event.target)) more.open = false; });
  const weeks = [...root.querySelectorAll('[data-week]')];
  const dates = weeks.map(week => ({start:week.dataset.start,end:week.dataset.end}));
  const select = root.querySelector('[data-window-select]');
  const previous = root.querySelector('[data-window-prev]');
  const next = root.querySelector('[data-window-next]');
  const current = root.querySelector('[data-window-current]');
  let today = shanghaiDate();
  let selected = chooseWeek(dates, today);
  let followingCurrent = true;
  if (selected < 0) return;
  function render() {
    weeks.forEach((week, i) => { week.hidden = i !== selected; });
    select.value = weeks[selected].dataset.week;
    previous.disabled = selected === 0;
    next.disabled = selected === weeks.length - 1;
    const tasks = [...weeks[selected].querySelectorAll('[data-task]')];
    const done = tasks.filter(task => task.checked).length;
    root.querySelector('[data-window-progress-text]').textContent = `${done} / ${tasks.length}`;
    const percent = root.querySelector('[data-window-percent]');
    if (percent) percent.textContent = `${Math.round(done / tasks.length * 100)}%`;
    const progress = root.querySelector('[data-window-progress]');
    progress.max = tasks.length;
    progress.value = done;
    root.querySelector('[data-window-date]').textContent = today;
    const inCurrent = today >= dates[selected].start && today <= dates[selected].end;
    const progressLabel = root.querySelector('[data-window-progress-label]');
    if (progressLabel) progressLabel.textContent = inCurrent ? '本周进度' : '所选周进度';
    root.querySelector('[data-window-context]').textContent = today < root.dataset.planStart
      ? '本期尚未开始，先查看第 1 周。'
      : today > root.dataset.planEnd ? '本期已结束，仍可回顾与复盘。'
      : inCurrent ? '' : '正在查看其他周，点击“本周”返回。';
    current.setAttribute('aria-pressed', String(followingCurrent));
  }
  function move(index) {
    selected = Math.max(0, Math.min(weeks.length - 1, index));
    followingCurrent = false;
    render();
  }
  previous.addEventListener('click', () => { move(selected - 1); if (previous.disabled) select.focus(); });
  next.addEventListener('click', () => { move(selected + 1); if (next.disabled) select.focus(); });
  select.addEventListener('change', () => move(weeks.findIndex(week => week.dataset.week === select.value)));
  current.addEventListener('click', () => { followingCurrent = true; selected = chooseWeek(dates,today); render(); });
  root.addEventListener('change', render);
  root.addEventListener('input', render);
  window.addEventListener('storage', render);
  function refreshDate() {
    const updated = shanghaiDate();
    if (updated !== today) {
      today = updated;
      if (followingCurrent) selected = chooseWeek(dates,today);
    }
    render();
  }
  window.addEventListener('focus', refreshDate);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDate(); });
  window.setInterval(refreshDate,60000);
  root.querySelector('[data-window-nav]').hidden = false;
  root.querySelector('[data-window-progress-wrap]').hidden = false;
  render();
})();
