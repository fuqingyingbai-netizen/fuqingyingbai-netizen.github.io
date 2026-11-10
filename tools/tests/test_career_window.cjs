const test = require('node:test');
const assert = require('node:assert/strict');
const { parseStored, mergeEdit } = require('../../assets/js/career.js');
const { chooseWeek, shanghaiDate } = require('../../assets/js/career-window.js');

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

test('week selection follows inclusive date boundaries and remains useful before and after the plan', () => {
  const weeks = [{start:'2026-11-10',end:'2026-11-16'},{start:'2026-11-17',end:'2026-11-23'}];
  assert.equal(chooseWeek(weeks,'2026-11-09'),0);
  assert.equal(chooseWeek(weeks,'2026-11-16'),0);
  assert.equal(chooseWeek(weeks,'2026-11-17'),1);
  assert.equal(chooseWeek(weeks,'2026-12-01'),1);
  assert.equal(chooseWeek([],'2026-11-10'),-1);
});

test('the daily switch uses Shanghai time independently of Windows timezone', () => {
  assert.equal(shanghaiDate(new Date('2026-11-09T15:59:00Z')),'2026-11-09');
  assert.equal(shanghaiDate(new Date('2026-11-09T16:00:00Z')),'2026-11-10');
});
