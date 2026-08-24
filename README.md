# 沈郑毅的个人网站

这是沈郑毅的个人网站，基于 [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) 主题搭建，托管在 GitHub Pages 上。

## 网站结构

- `_config.yml`：网站全局配置（标题、简介、联系方式等）
- `_tabs/about.md`：关于我页面
- `_posts/`：文章都放在这里，文件名格式 `年-月-日-标题.md`
- `_data/contact.yml`：侧边栏联系方式
- `assets/`：头像、图片等静态资源

## 日常更新方法

### 1. 添加一篇文章

在 `_posts/` 文件夹里新建一个文件，名字按这个格式：

```text
2026-08-25-文章标题.md
```

文件开头带上这几行信息：

```yaml
---
title: 文章标题
date: 2026-08-25 09:00:00 +0800
categories: [学习笔记]
tags: [AI, 深度学习]
---
```

下面用 Markdown 正常写内容即可。写完保存、提交、推送，网站就会自动更新。

### 2. 修改个人信息

打开 `_config.yml`，找到对应位置修改即可：

- `title` / `tagline`：网站标题和副标题
- `github.username`：你的 GitHub 用户名
- `social.email`：你的邮箱
- `social.links`：你的主页链接（第一行是页脚版权归属链接）
- `avatar`：头像图片路径（把图片放进 `assets/img/` 后填路径）

### 3. 添加头像

把头像图片放到 `assets/img/avatar.png`，然后在 `_config.yml` 里设置：

```yaml
avatar: /assets/img/avatar.png
```

## 部署到 GitHub（首次上线）

1. 在 GitHub 上新建一个仓库，名字必须是 `fuqingyingbai-netizen.github.io`（公开仓库）
2. 把本文件夹的内容推送到这个仓库（Git 命令或 GitHub Desktop 都行）
3. 进入仓库的 **Settings → Pages**，把 Source 选为 **GitHub Actions**
4. 等待一两分钟，你的网站就上线了，地址是 `https://fuqingyingbai-netizen.github.io`

之后每次推送新内容，网站都会自动重新构建。

## 本地预览（可选）

本地预览需要先安装 Ruby，然后运行：

```bash
bundle install
bundle exec jekyll serve
```

打开 `http://localhost:4000` 即可预览。不装 Ruby 也不影响上线。
