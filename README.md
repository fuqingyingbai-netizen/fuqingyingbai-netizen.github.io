# 沈郑毅的个人网站

基于 [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) 主题搭建的个人网站，托管在 GitHub Pages 上，推送后自动构建部署。

- 线上地址：https://fuqingyingbai-netizen.github.io/
- 仓库地址：https://github.com/fuqingyingbai-netizen/fuqingyingbai-netizen.github.io

## 目录结构

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

仓库内置了三个自动化能力，都在 `.github/workflows/` 里：

| 工作流 | 触发方式 | 作用 |
| --- | --- | --- |
| `pages-deploy.yml` | 推送到 main | 构建站点并部署到 GitHub Pages |
| `sync-projects.yml` | 每周一 + 手动 | 调用 GitHub API 同步项目信息，自动更新项目页并触发网站重建 |
| `quality-check.yml` | 推送 + 每周一 + 手动 | 构建校验、项目页同步校验、外链检查 |

### 项目展示页自动生成

项目页的数据来自两处：

- `_data/projects.json`：手工维护的部分（项目顺序、分组、简介、标签）
- GitHub API：实时信息（主要语言、星标数、最近更新时间）

本地同步（需要 Python 3.10 以上，可选设置 `GITHUB_TOKEN` 提高 API 限额）：

```bash
python tools/sync_projects.py           # 生成 / 更新 _tabs/projects.md
python tools/sync_projects.py --check    # 只检查是否已同步，不写入文件
```

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

需要本机安装 Ruby 环境：

```bash
bundle install
bundle exec jekyll serve
```

然后访问 `http://localhost:4000`。没有本地环境也不影响线上更新。

## 许可

主题部分遵循 [MIT License](LICENSE)，网站内容版权归作者所有。
