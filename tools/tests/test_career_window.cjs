const test = require('node:test');
const assert = require('node:assert/strict');
const { parseStored, mergeEdit, scheduleForDate, shanghaiDate } = require('../../assets/js/career.js');

test('existing v1 task and review records remain readable; malformed records are not silently reset', () => {
  const old = {completed:['week-01-learning','week-01-project'],reviews:{'week-01':'保留原复盘'}};
  assert.deepEqual(parseStored(JSON.stringify(old)),old);
  assert.deepEqual(parseStored(null),{completed:[],reviews:{}});
  assert.throws(()=>parseStored('{oops'));
  assert.throws(()=>parseStored(JSON.stringify({completed:[],reviews:[]})));
});

test('a checkbox edit preserves changes and reviews saved by another window', () => {
  const latest = {completed:['week-01-learning'],reviews:{'week-01':'另一窗口刚写的复盘'}};
  const saved = mergeEdit(latest,{kind:'task',id:'week-01-project',checked:true});
  assert.deepEqual(saved.completed,['week-01-learning','week-01-project']);
  assert.equal(saved.reviews['week-01'],latest.reviews['week-01']);
  assert.deepEqual(latest.completed,['week-01-learning']);
  assert.deepEqual(mergeEdit(saved,{kind:'task',id:'week-01-learning',checked:false}).completed,['week-01-project']);
});

test('editing one review retains completion and all other weeks', () => {
  const latest = {completed:['week-02-evidence'],reviews:{'week-01':'旧复盘','week-02':'另一周'}};
  const saved = mergeEdit(latest,{kind:'review',id:'week-01',text:'新复盘'});
  assert.deepEqual(saved.completed,latest.completed);
  assert.deepEqual(saved.reviews,{'week-01':'新复盘','week-02':'另一周'});
  assert.equal(mergeEdit(latest,{kind:'review',id:'week-01',text:'长'.repeat(2100)}).reviews['week-01'].length,2000);
});

test('workweeks end on Friday and weekends keep the previous week available for review', () => {
  const { weeks } = require('../../_data/career.json');
  assert.deepEqual(scheduleForDate(weeks,'2026-11-15'),{index:0,status:'upcoming'});
  assert.deepEqual(scheduleForDate(weeks,'2026-11-27'),{index:1,status:'active'});
  assert.deepEqual(scheduleForDate(weeks,'2026-11-28'),{index:1,status:'weekend'});
  assert.deepEqual(scheduleForDate(weeks,'2026-11-29'),{index:1,status:'weekend'});
  assert.deepEqual(scheduleForDate(weeks,'2026-11-30'),{index:2,status:'active'});
  assert.deepEqual(scheduleForDate(weeks,'2027-02-08'),{index:11,status:'buffer'});
  assert.deepEqual(scheduleForDate(weeks,'2027-02-12'),{index:11,status:'buffer'});
  assert.deepEqual(scheduleForDate(weeks,'2027-02-15'),{index:12,status:'active'});
  assert.deepEqual(scheduleForDate(weeks,'2027-03-05'),{index:14,status:'active'});
  assert.deepEqual(scheduleForDate(weeks,'2027-03-06'),{index:14,status:'finished'});
  assert.deepEqual(scheduleForDate([],'2026-11-27'),{index:-1,status:'upcoming'});
  for (const { start, end } of weeks) {
    const monday = new Date(start);
    const friday = new Date(end);
    assert.equal(monday.getUTCDay(),1);
    assert.equal(friday.getUTCDay(),5);
    assert.equal((friday - monday) / 86400000,4);
  }
});

test('the daily switch uses Shanghai time independently of Windows timezone', () => {
  assert.equal(shanghaiDate(new Date('2026-11-09T15:59:00Z')),'2026-11-09');
  assert.equal(shanghaiDate(new Date('2026-11-09T16:00:00Z')),'2026-11-10');
});
