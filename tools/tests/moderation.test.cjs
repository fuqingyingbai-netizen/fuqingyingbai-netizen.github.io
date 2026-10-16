const { test } = require('node:test');
const assert = require('node:assert/strict');
const { preSave, reviewReasons } = require('../waline-server/moderation');

test('ordinary questions and up to two reference links are approved', () => {
  for (const comment of ['谢谢分享，想问一下 LangGraph 如何保存状态？', '可以通过微信交流吗？', '参考 https://example.org/a 和 https://example.org/b']) {
    const data = { comment, status: 'approved' };
    preSave(data);
    assert.equal(data.status, 'approved');
  }
});
test('link flooding, obfuscated advertising and unsafe URLs wait for review', () => {
  for (const comment of [
    '[a](https://one.invalid) [b](HTTPS://two.invalid) www.three.invalid',
    '刷\u200b单返利联系微信', '论文代写', '联系 vx 做推广',
    '[link](javascript:alert(1))', 'data:text/html,<p>test</p>', '字'.repeat(1001)
  ]) {
    const data = { comment, status: 'approved' };
    assert(reviewReasons(comment).length > 0);
    assert.equal(preSave(data), undefined, 'Keep the comment instead of rejecting/deleting it');
    assert.equal(data.status, 'waiting');
  }
});
test('manual mode and existing spam decisions are never overridden', () => {
  for (const status of ['waiting', 'spam']) {
    const data = { comment: '普通留言', status };
    preSave(data);
    assert.equal(data.status, status);
  }
});
test('screening does not modify comment text or author data', () => {
  const data = { comment: '论文代写', status: 'approved', nick: '测试', mail: 'test@example.invalid' };
  preSave(data);
  assert.deepEqual(data, { comment: '论文代写', status: 'waiting', nick: '测试', mail: 'test@example.invalid' });
});
