// Local screening only. Suspect comments remain available for manual review.
function reviewReasons(value) {
  if (typeof value !== 'string') return ['invalid-text'];
  const text = value.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/gu, '').toLowerCase();
  const reasons = [];
  if ([...text].length > 1000) reasons.push('long-comment');
  if ((text.match(/(?:https?:\/\/|www\.)[^\s<>()[\]"']+/gu) || []).length >= 3) reasons.push('many-links');
  if (/博彩|刷单|论文代写|代写论文|代开发票|稳赚不赔/u.test(text)) reasons.push('advertising');
  if (/(?:微信|加微|私聊|联系|\bvx\b)/u.test(text) && /推广|返佣|返利|代写|下注|办证/u.test(text)) reasons.push('promotion-contact');
  if (/javascript\s*:|data\s*:\s*text\/html/u.test(text)) reasons.push('unsafe-link');
  return reasons;
}

function preSave(comment) {
  // Never promote a comment already held by Waline or emergency manual mode.
  if (comment.status === 'approved' && reviewReasons(comment.comment).length) {
    comment.status = 'waiting';
  }
}

module.exports = { preSave, reviewReasons };
