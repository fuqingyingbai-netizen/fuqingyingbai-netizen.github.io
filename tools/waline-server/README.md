# 访客评论后端（尚未部署）

网站继续由 GitHub Pages 提供。此目录是独立的 Waline 服务，使用 Vercel Hobby 与 Neon Free。
两者当前提供免费套餐，但有使用额度；选择免费计划，不要自动升级付费。
此目录已被 Jekyll 的 `tools` 排除规则排除，不会成为公开页面或暴露环境文件。

## 部署顺序

1. 登录并连接 Vercel 与 Neon，创建独立的免费 PostgreSQL 项目。
2. 按 [Waline 官方初始化 SQL](https://github.com/walinejs/waline/blob/main/assets/waline.pgsql)
   在新建的空数据库建表；不要在包含既有数据的数据库里重复执行建表语句。
3. 在 Vercel 导入网站仓库，Root Directory 选择 `tools/waline-server`，Framework Preset 选择 Other。
   运行时使用 Node.js 24，不配置静态输出目录，允许 `/api/index` 接收全部服务路由。
4. 按 `.env.example` 配置生产环境变量。Neon 连接信息只保存在 Vercel；`JWT_TOKEN` 使用单独生成的随机长字符串。
   `COMMENTS_HOST` 填 Vercel 分配的评论域名，不带协议；只开放博客与评论服务两个来源。
5. 部署后立即在 `/ui/register` 注册并确认管理员账户，完成后再向博客开放评论。
   首个注册者会成为管理员，因此这一步必须在切换博客前完成。
6. 测试免登录提交、后台审核、回复、刷新读取和错误提示。确认邮件通知前，不承诺邮件送达。
7. 仅在上述验证完成后，将站点 `_config.yml` 的 `comments.provider` 改为 `waline`，
   `comments.waline.server_url` 填入已验证的 HTTPS 地址。地址为空时会继续显示 Giscus。

旧 Giscus 讨论不删除，新界面保留原评论入口。两套数据不会自动迁移；若有旧评论，先评估迁移再决定是否隐藏旧入口。

## 访客体验

昵称必填，邮箱可选，不需要 GitHub 或 Waline 账号。新留言默认待审核，同一 IP 的发布间隔为 60 秒。
客户端关闭图片上传、图片搜索、表情远程资源和浏览量统计，服务端关闭地域与设备信息展示。
`AKISMET_KEY=false` 避免使用第三方共享的默认反垃圾服务，基础阶段使用人工审核与限频。
需要更强防刷时，可接入 [Turnstile](https://waline.js.org/reference/client/props.html#turnstilekey)，
其 secret 只放服务端。数据库仍会保存必要的评论元数据；关闭展示不等于不采集。

参考：[Waline 快速上手](https://waline.js.org/guide/get-started/)、
[Vercel Hobby](https://vercel.com/docs/plans/hobby)、[Neon 免费计划](https://neon.com/pricing)。
