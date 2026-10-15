# 沈郑毅的个人网站

基于 [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) 主题搭建的个人网站，托管在 GitHub Pages 上，推送后自动构建部署。

- 线上地址：https://fuqingyingbai-netizen.github.io/
- 仓库地址：https://github.com/fuqingyingbai-netizen/fuqingyingbai-netizen.github.io

## 技术栈与功能

| 部分 | 说明 |
| --- | --- |
| 站点框架 | Jekyll + [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) 主题 |
| 托管与部署 | GitHub Pages + GitHub Actions 自动构建（推送即部署） |
| 内容组织 | Markdown（文章、页面）、JSON（项目元信息）、YAML（站点配置） |
| 自动化脚本 | Python 3.10+（项目信息同步、文章脚手架、站内链接检查） |
| 质量保障 | 单元测试、站点构建校验、站内/站外链接检查 |

主要功能：文章与分类标签、项目自动展示、学习资源页、代码高亮、流程图（Mermaid）、
深浅色主题、站内搜索、RSS 订阅。

“生涯规划”位于 `/career/`，包含长期路线、13 周任务、阶段检查、任务勾选、每周复盘和
Markdown 导出。进度与复盘仅存于当前浏览器的 localStorage，不上传、不跨设备同步；
禁用存储时仍可填写并导出，禁用 JavaScript 时可阅读完整计划。
计划内容统一维护在 `_data/career.json`，页面、样式和交互分别位于 `_tabs/career.html`、
`assets/css/career.css`、`assets/js/career.js`。开始新一期时更换计划 `id`，避免覆盖旧期进度。
本期起止日是可调整的规划窗口，公司任务服从实际排期；公开页面不包含公司内部资料。

## 目录结构

首页增加了个人介绍与项目精选；“学习记录”将学习笔记、项目随笔和每周总结集中展示。
站内搜索覆盖文章、项目、关于页和资源页；项目搜索结果可直接定位到对应卡片。
精选项目与项目页共用 `_data/projects.json`，设置 `featured: true` 即可出现在首页（最多三个）；
`short_title` / `summary` 控制精选卡片的简短介绍，`article_url` 可关联已有项目复盘。
视觉样式位于 `assets/css/site.css`，沿用 Chirpy 的深浅色主题。
导航调整不会改变 `/posts/:title/` 或原有页面地址。

```text
├── _config.yml          # 站点全局配置（标题、简介、社交链接、头像等）
├── _data/
│   ├── contact.yml      # 侧边栏联系方式图标
│   ├── share.yml        # 文章底部分享按钮
│   └── projects.json    # 项目展示页的元信息（顺序、分组、简介、标签）
├── _posts/              # 文章（学习笔记、随笔等）
├── _tabs/               # 导航栏页面
│   ├── about.md         # 关于我
│   ├── projects.md      # 项目展示（由脚本自动生成）
│   ├── resources.md     # 学习资源
│   ├── categories.md    # 分类
│   ├── tags.md          # 标签
│   └── archives.md      # 归档
├── assets/              # 图片等静态资源
├── tools/               # 辅助脚本
└── .github/workflows/   # 自动构建部署与质量检查配置
```

## 日常维护

### 1. 新增一篇文章

在 `_posts/` 里新建文件，文件名格式为 `年-月-日-标题.md`：

```text
2026-09-23-文章标题.md
```

文件开头写 front matter，下面是正文：

```yaml
---
title: 文章标题
date: 2026-09-23 09:00:00 +0800
categories: [学习笔记]
tags: [AI, LangGraph]
---
```

如果文章里要画流程图，在 front matter 里加一行 `mermaid: true`，然后用 ` ```mermaid ` 代码块即可。

### 2. 修改个人信息

编辑 `_config.yml`：

- `title` / `tagline`：网站标题与副标题
- `description`：站点描述（影响搜索引擎展示）
- `github.username`：GitHub 用户名
- `social.email`：邮箱（填了才会在侧边栏出现邮件图标）
- `social.links`：主页链接，第一行是页脚版权归属链接
- `avatar`：头像路径
- `theme_mode`：留空跟随系统，也可固定为 `light` 或 `dark`

### 3. 更换头像

把图片放到 `assets/img/avatar.png`，然后在 `_config.yml` 里写：

```yaml
avatar: /assets/img/avatar.png
```

### 4. 修改页面内容

- 关于我：`_tabs/about.md`
- 学习资源：`_tabs/resources.md`

每个页面文件开头的 `order` 决定它在导航栏中的位置（数字越小越靠前）。

> 注意：`_tabs/projects.md` 由脚本自动生成，请勿直接修改；要增删项目或调整介绍，编辑 `_data/projects.json`。

## 自动化与质量检查

仓库内置了四个自动化流程，都在 `.github/workflows/` 里：

| 工作流 | 触发方式 | 作用 |
| --- | --- | --- |
| `pages-deploy.yml` | 推送到 main | 构建站点并部署到 GitHub Pages |
| `sync-projects.yml` | 每周一 + 手动 | 调用 GitHub API 同步项目信息，自动更新项目页并触发网站重建 |
| `quality-check.yml` | PR + 推送 + 每周一 + 手动 | 构建校验、项目页同步校验、外链检查 |
| `weekly-summary.yml` | 每周日北京时间 20:00 + 手动 | 自 2026-10-18 起汇总公开 GitHub 活动，提交文章后触发网站重建 |

### 每周中文总结

`tools/weekly_summary.py` 使用**匿名公开活动接口**，并在发布时再次核验涉及仓库仍公开。
它按北京时间“上周日 20:00 至本周日 20:00”的固定区间整理来源链接，不读取私有仓库、
聊天记录或活动正文，不调用模型。已存在的当期文章不会被覆盖，首次到期前运行会直接跳过。
以后若加入聊天素材，须先取得逐项公开授权；当前自动流程不接入任何聊天内容。

```bash
python tools/weekly_summary.py --dry-run  # 到期后预览，不写文章
python -m unittest discover -s tools/tests -v
```

GitHub Actions 定时任务可能延迟，公开活动接口也存在延迟和 300 条上限；文章会说明覆盖范围，
不会将推送次数写成提交数或推测本周完成的学习成果。网络错误会终止发布，避免生成误导性的空报告。
项目同步和周总结共用写入并发组，自动提交后显式触发 Pages 部署。

### 主题覆盖文件

`_layouts/home.html` 与 `_includes/head.html` 基于 Chirpy v7.6.0。
前者保留主题的分页逻辑，后者允许浏览器缩放；升级主题时应对照上游检查这两个文件。
构建依赖和本地预览文件不要提交到仓库。

### 访客评论（待部署后端）

目前正式站点继续使用 Giscus。已预留 Waline 适配：昵称必填、邮箱选填、无需 GitHub 账户，
支持随主题切换深浅色、滚动加载与加载失败重试。
部署说明位于仓库中的 `tools/waline-server/README.md`。
必须先部署后端、注册管理员并完成匿名提交与审核验证，才能将 `comments.provider` 改为 `waline`。
只需要在站点填公开的 `server_url`；数据库密码、登录密钥和验证码 secret 只存服务端。
未配置服务端地址时会回退到 Giscus，旧 GitHub 讨论不删除。

### 项目展示页自动生成

项目页的数据来自两处：

- `_data/projects.json`：手工维护的部分（项目顺序、分组、简介、标签）
- GitHub API：实时信息（主要语言、星标数、最近更新时间）

本地同步（需要 Python 3.10 以上，可选设置 `GITHUB_TOKEN` 提高 API 限额）：

```bash
python tools/sync_projects.py           # 生成 / 更新 _tabs/projects.md
python tools/sync_projects.py --check    # 只检查是否已同步，不写入文件
```

### 工具脚本一览

| 脚本 | 作用 | 用法 |
| --- | --- | --- |
| `tools/new_post.py` | 新建文章，自动生成规范 front matter | `python tools/new_post.py "标题" --category 学习笔记 --tag AI` |
| `tools/sync_projects.py` | 同步 GitHub 项目信息，生成项目页 | `python tools/sync_projects.py`（`--check` 只校验） |
| `tools/check_internal_links.py` | 检查构建产物中的站内链接是否有效 | 先 `jekyll build`，再 `python tools/check_internal_links.py` |
| `tools/tests/` | 单元测试 | `python -m unittest discover -s tools/tests -v` |

## 提交规范建议

为了让提交历史清晰、便于追溯（例如用于作业或项目审核），建议：

- 一次提交只做一件事，不要把"改配置 + 写文章 + 换头像"混在同一个提交里
- 提交信息用中文说明"做了什么"，例如：`新增学习资源页面`、`优化项目展示结构`
- 每完成一个阶段性的功能就提交一次，保持提交历史与开发过程一一对应

## 部署说明

网站使用 GitHub Actions 自动构建部署，配置在 `.github/workflows/pages-deploy.yml`：

1. 本地或网页端修改内容并提交到 `main` 分支
2. GitHub 自动执行构建（Ruby + Jekyll），完成后部署到 Pages
3. 一两分钟后刷新线上地址即可看到更新

仓库的 **Settings → Pages → Source** 需要设置为 **GitHub Actions**（已配置好，一般不用再改）。

## 本地预览（可选）

项目介绍、封面和说明页入口维护在 `_data/projects.json`，修改后运行 `python tools/sync_projects.py`，不要只改生成页。
项目说明页位于 `projects/`；首页短标题使用文章的 `card_title`，摘要使用 `description`，文章标题与链接保持独立。
阅读路线维护在 `_data/reading_path.yml`。分享封面与流程示意图可用 `tools/generate_share_cards.py` 重新生成，需要 Pillow 和可用的中文字体；可通过 `--font` 指定字体文件。

需要本机安装 Ruby 环境：

```bash
bundle install
bundle exec jekyll serve
```

然后访问 `http://localhost:4000`。没有本地环境也不影响线上更新。

## 常见问题

**网站改动后多久生效？**
推送到 `main` 分支后 GitHub Actions 会自动构建，通常 1–2 分钟上线，可在仓库的 Actions 页面查看进度。

**构建没有自动触发怎么办？**
进入 Actions → Build and Deploy → Run workflow，手动触发一次即可。

**项目页是手写的吗？**
不是。项目页由 `tools/sync_projects.py` 按 `_data/projects.json` 与 GitHub API 自动生成，并且每周一自动同步一次。

**新增一篇文章的完整流程？**

1. `python tools/new_post.py "标题" --category 分类 --tag 标签`
2. 打开生成的文件，写好正文
3. `git add` → `git commit` → `git push`
4. 等 1–2 分钟，网站自动更新

**为什么项目页里"本仓库"不显示星标和更新时间？**
网站仓库每次推送都会刷新自己的更新时间，如果展示实时数据，页面内容会不停变化、导致同步检查误报，因此该条目固定不显示实时数据。

## 许可

主题部分遵循 [MIT License](https://github.com/fuqingyingbai-netizen/fuqingyingbai-netizen.github.io/blob/main/LICENSE)，网站内容版权归作者所有。
