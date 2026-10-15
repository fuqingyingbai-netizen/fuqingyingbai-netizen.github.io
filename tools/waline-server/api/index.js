const Waline = require('@waline/vercel');

module.exports = Waline({
  secureDomains: ['fuqingyingbai-netizen.github.io', process.env.COMMENTS_HOST].filter(Boolean),
});
