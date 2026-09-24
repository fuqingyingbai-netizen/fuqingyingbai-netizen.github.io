#!/usr/bin/env python3
"""同步 GitHub 仓库信息，自动生成网站的项目展示页（_tabs/projects.md）。

用法：
    python tools/sync_projects.py             # 生成 / 更新项目展示页
    python tools/sync_projects.py --check     # 仅检查页面是否与数据一致（供 CI 使用）

数据来源：
    - _data/projects.json：手工维护的项目元信息（顺序、分组、简介、标签）
    - GitHub REST API：星标数、主要语言、最近更新时间等实时信息

环境变量：
    GITHUB_TOKEN  可选。带上可提高 API 速率上限（CI 中自动注入）。
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
META_PATH = ROOT / "_data" / "projects.json"
OUTPUT_PATH = ROOT / "_tabs" / "projects.md"
API_BASE = "https://api.github.com"
TIMEOUT_SECONDS = 30

HEADER = """---
icon: fas fa-laptop-code
order: 4
---

<!-- 本文件由 tools/sync_projects.py 自动生成，请勿直接修改。 -->
<!-- 如需增删项目或调整介绍，请编辑 _data/projects.json 后重新运行脚本。 -->

下面是我在 GitHub 上的项目，项目信息（语言、星标数、最近更新）由脚本自动同步。
"""


def load_meta(path: Path) -> dict:
    """读取项目元信息配置。"""
    with path.open(encoding="utf-8") as fp:
        return json.load(fp)


def fetch_repos(user: str, token: str | None) -> dict[str, dict]:
    """拉取该用户的全部公开仓库，返回 {仓库名: 仓库信息}。"""
    url = f"{API_BASE}/users/{user}/repos?per_page=100&sort=pushed"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "sync-projects-script",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"[sync_projects] GitHub API 返回错误：HTTP {exc.code} {exc.reason}")
    except (urllib.error.URLError, TimeoutError) as exc:
        raise SystemExit(f"[sync_projects] 无法访问 GitHub API：{exc}")

    if not isinstance(payload, list):
        raise SystemExit("[sync_projects] GitHub API 返回了非预期的数据格式")
    return {item["name"]: item for item in payload}


def format_date(value: str | None) -> str:
    """把 ISO 时间格式化成 YYYY-MM-DD。"""
    if not value:
        return "未知"
    try:
        moment = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return "未知"
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%d")


def render_project(project: dict, repo: dict | None, user: str) -> str:
    """渲染单个项目区块。"""
    name = project["repo"]
    url = (repo or {}).get("html_url") or f"https://github.com/{user}/{name}"
    emoji = project.get("emoji", "📦")
    title = project.get("title", name)

    lines = [f"### {emoji} [{title}]({url})", ""]
    lines.append(project.get("description", "").strip())
    lines.append("")

    tags = project.get("tags") or []
    if tags:
        lines.append(" ".join(f"`{tag}`" for tag in tags))
        lines.append("")

    show_stats = project.get("show_stats", True)
    # 本仓库自身不显示实时数据：否则每次推送都会改变页面内容，导致同步检查误报
    if show_stats:
        if repo is None:
            lines.append("*暂时无法读取该仓库的实时信息，请在 GitHub 上查看。*")
            lines.append("")
        else:
            language = repo.get("language") or "未标注"
            stars = repo.get("stargazers_count", 0)
            updated = format_date(repo.get("pushed_at"))
            lines.append(f"*语言：{language}　|　最近更新：{updated}　|　⭐ {stars}*")
            lines.append("")

    note = project.get("note")
    if note:
        lines.append(f"> {note}")
        lines.append("")

    return "\n".join(lines).rstrip()


def render_page(meta: dict, repos: dict[str, dict]) -> str:
    """按配置分组渲染完整页面。"""
    user = meta.get("user", "")
    groups = meta.get("groups") or [{"key": "all", "title": "项目"}]
    projects = meta.get("projects") or []

    blocks = [HEADER.strip(), ""]
    for group in groups:
        members = [p for p in projects if p.get("group") == group["key"]]
        if not members:
            continue
        blocks.append(f"## {group['title']}")
        blocks.append("")
        for project in members:
            blocks.append(render_project(project, repos.get(project["repo"]), user))
            blocks.append("")

    blocks.append("---")
    blocks.append("")
    blocks.append(
        f"本页信息由 [sync_projects.py](https://github.com/{user}/"
        f"{user}.github.io/blob/main/tools/sync_projects.py) 自动同步，"
        f"欢迎到[我的 GitHub](https://github.com/{user}) 看看，也欢迎一起交流。"
    )
    return "\n".join(blocks).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="同步 GitHub 项目信息到网站项目页")
    parser.add_argument(
        "--check",
        action="store_true",
        help="只检查 _tabs/projects.md 是否已是最新，不写入文件",
    )
    args = parser.parse_args()

    meta = load_meta(META_PATH)
    repos = fetch_repos(meta.get("user", ""), os.environ.get("GITHUB_TOKEN"))
    content = render_page(meta, repos)

    current = OUTPUT_PATH.read_text(encoding="utf-8") if OUTPUT_PATH.exists() else ""
    if args.check:
        if current == content:
            print("[sync_projects] 项目页已是最新")
            return 0
        print("[sync_projects] 项目页与 GitHub 数据不一致，请运行 python tools/sync_projects.py")
        return 1

    if current == content:
        print("[sync_projects] 没有变化，无需写入")
        return 0

    OUTPUT_PATH.write_text(content, encoding="utf-8", newline="\n")
    print(f"[sync_projects] 已更新 {OUTPUT_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
