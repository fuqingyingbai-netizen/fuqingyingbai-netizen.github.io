# 访客评论后端

网站继续由 GitHub Pages 提供。此目录是独立的 Waline 服务，使用 Vercel Hobby 与 Neon Free。
两者当前提供免费套餐，但有使用额度；选择免费计划，不要自动升级付费。
此目录已被 Jekyll 的 `tools` 排除规则排除，不会成为公开页面或暴露环境文件。

## 当前进度（2026-10-16）

Neon Free 的独立 `personal-site-comments` 项目已建立，位于新加坡，PostgreSQL 17，
计算规格上限为 0.25 CU。`waline` 数据库已按下方脚本初始化，包含评论、计数与用户三张表。
建表脚本先在独立测试分支验证，再应用到正式分支；不要在此数据库重复执行。
Vercel Hobby 中已创建同名独立项目，Node.js 24，函数区域 `sin1`。
数据库连接采用 TLS 与连接池，生产和预览配置均保存在 Vercel 的 Secret 环境变量中。
站主已自行注册管理员。评论采用本地规则筛选：普通留言自动显示，可疑留言待审核；
仍允许免登录且不填写邮箱，390px 手机宽度的真实客户端已连接后端通过检查。
正式地址为 `https://personal-site-comments-web-fqyb.vercel.app`，管理入口为 `/ui`。
生产域名已公开，预览及独立部署地址继续受 Vercel 身份验证保护；网站配置已切换到 Waline。
测试留言使用独立路径 `/__comment-healthcheck__/2026-10-15`，不会出现在正式文章评论中。

## 部署顺序

1. 登录并连接 Vercel 与 Neon，创建独立的免费 PostgreSQL 项目。
2. 仅在新建的空数据库中执行 [`migrations/001-init.sql`](migrations/001-init.sql)。
   此文件保存了 [Waline 官方初始化 SQL](https://github.com/walinejs/waline/blob/main/assets/waline.pgsql)
   及其来源版本；不要在包含既有数据的数据库里重复执行建表语句。
3. 在 Vercel 导入网站仓库，Root Directory 选择 `tools/waline-server`，Framework Preset 选择 Other。
   运行时使用 Node.js 24，不配置静态输出目录，允许 `/api/index` 接收全部服务路由。
4. 按 `.env.example` 配置生产环境变量。Neon 连接信息只保存在 Vercel；`JWT_TOKEN` 使用单独生成的随机长字符串。
   `COMMENTS_HOST` 填正式评论域名，不带协议；入口还会允许 Vercel 自动提供的当前部署域名。
5. 初次部署先保护全部服务地址。站主在 `/ui/register` 自行设置密码，注册并确认管理员账户，完成后再向博客开放评论。
   首个注册者会成为管理员，因此这一步必须在切换博客前完成。
6. 测试免登录提交、后台审核、回复、刷新读取和错误提示。确认邮件通知前，不承诺邮件送达。
7. 仅在上述验证完成后，将站点 `_config.yml` 的 `comments.provider` 改为 `waline`，
   `comments.waline.server_url` 填入已验证的 HTTPS 地址。地址为空时会继续显示 Giscus。

旧 Giscus 讨论不删除，新界面保留原评论入口。两套数据不会自动迁移；若有旧评论，先评估迁移再决定是否隐藏旧入口。

## Vercel 运行时兼容

`vercel.json` 中的 `NODE_OPTIONS=--experimental-require-module` 按
[Vercel 官方说明](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration#experimental-nodejs-require-of-es-module)
开启 Waline 所需的模块互操作。缺少此设置时，构建可通过，但调用会报 `ERR_REQUIRE_ESM`。
`functions.includeFiles` 显式包含动态加载的 MathJax 字体、管理页面及 Waline 服务文件，
避免构建跟踪遗漏引发 `ERR_MODULE_NOT_FOUND`。`.vercelignore` 排除环境文件、文档与初始化脚本。

## 访客体验

昵称必填，邮箱可选，不需要 GitHub 或 Waline 账号。同一 IP 的发布间隔为 60 秒。
`COMMENT_AUDIT=false` 时，普通留言自动显示；`moderation.js` 在写入前将以下内容转为待审核：
3 个及以上链接、超过 1000 字的内容、列出的明显广告短语、推广词与联系方式组合、危险链接协议。
这些规则可能漏判或误判，不等同于 AI 内容审核；技术交流中的多链接也可能需要人工放行。
可疑留言保留在后台，不自动删除。修改规则后运行 `node --test tools/tests/moderation.test.cjs`。
若需要恢复全部人工审核，将 Vercel 的 `COMMENT_AUDIT` 改为 `true` 并重新部署；现有待审留言不会批量放行。
客户端关闭图片上传、图片搜索、表情远程资源和浏览量统计，服务端关闭地域与设备信息展示。
`AKISMET_KEY=false` 避免使用第三方共享的默认反垃圾服务，筛选在本服务执行，不调用外部审核或模型 API。
需要更强防刷时，可接入 [Turnstile](https://waline.js.org/reference/client/props.html#turnstilekey)，
其 secret 只放服务端。数据库仍会保存必要的评论元数据；关闭展示不等于不采集。

参考：[Waline 快速上手](https://waline.js.org/guide/get-started/)、
[Vercel Hobby](https://vercel.com/docs/plans/hobby)、[Neon 免费计划](https://neon.com/pricing)。
