const Waline = require('@waline/vercel');

module.exports = Waline({
  secureDomains: [
    'fuqingyingbai-netizen.github.io',
    process.env.COMMENTS_HOST,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter(Boolean),
});
