const Waline = require('@waline/vercel');
const { preSave } = require('../moderation');

module.exports = Waline({
  preSave,
  secureDomains: [
    'fuqingyingbai-netizen.github.io',
    process.env.COMMENTS_HOST,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter(Boolean),
});
