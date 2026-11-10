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
    root.querySelector('[data-window-progress-text]').textContent = `本周完成 ${done} / ${tasks.length}`;
    const progress = root.querySelector('[data-window-progress]');
    progress.max = tasks.length;
    progress.value = done;
    root.querySelector('[data-window-date]').textContent = today;
    const inCurrent = today >= dates[selected].start && today <= dates[selected].end;
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
