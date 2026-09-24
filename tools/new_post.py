#!/usr/bin/env python3
"""快速创建一篇新文章，自动生成规范的 front matter。

用法示例：
    python tools/new_post.py "LangGraph 学习笔记" --category 学习笔记 --tag LangGraph --tag AI
    python tools/new_post.py "随笔标题" --category 随笔 --date "2026-09-25 09:00"
    python tools/new_post.py "还没写完的草稿" --draft

说明：
    - 文件名遵循 `年-月-日-标题.md` 规范，日期取 `--date` 或当前时间
    - `--draft` 会把文章写入 `_drafts/`，不会直接发布到网站
    - 已存在同名文件时会中止，避免覆盖
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

# Windows 控制台默认编码可能不支持部分字符，这里统一成 UTF-8 输出
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / "_posts"
DRAFTS_DIR = ROOT / "_drafts"

# Windows / macOS / Linux 文件名非法字符，以及空格
INVALID_FILENAME_CHARS = re.compile(r'[\\/:*?"<>|\s]+')
DEFAULT_CATEGORY = "随笔"


def slugify(title: str) -> str:
    """把标题转换成安全的文件名片段。"""
    cleaned = INVALID_FILENAME_CHARS.sub("-", title.strip())
    cleaned = cleaned.strip("-.")
    if not cleaned:
        raise ValueError("标题不能为空")
    return cleaned


def parse_date(value: str | None) -> datetime:
    """解析 --date 参数，默认取当前时间。"""
    if not value:
        return datetime.now()
    for pattern in ("%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(value.strip(), pattern)
        except ValueError:
            continue
    raise ValueError(f"无法识别的日期格式：{value}（示例：2026-09-25 09:00）")


def build_content(title: str, categories: list[str], tags: list[str], moment: datetime) -> str:
    """生成文章内容（front matter + 正文骨架）。"""
    stamp = moment.strftime("%Y-%m-%d %H:%M:%S +0800")
    category_text = ", ".join(categories) if categories else DEFAULT_CATEGORY
    lines = [
        "---",
        f"title: {title}",
        f"date: {stamp}",
        f"categories: [{category_text}]",
    ]
    if tags:
        lines.append(f"tags: [{', '.join(tags)}]")
    lines.extend(
        [
            "---",
            "",
            "在这里开始写正文。",
            "",
            "> 小提示：需要画流程图时，在 front matter 里加一行 `mermaid: true`，正文用 ```mermaid 代码块即可。",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="创建一篇新的网站文章")
    parser.add_argument("title", help="文章标题")
    parser.add_argument(
        "--category",
        action="append",
        default=[],
        help="分类，可重复使用；默认「随笔」",
    )
    parser.add_argument("--tag", action="append", default=[], help="标签，可重复使用")
    parser.add_argument("--date", help="发布日期，格式 2026-09-25 或 '2026-09-25 09:00'")
    parser.add_argument("--draft", action="store_true", help="写入 _drafts/ 草稿目录")
    args = parser.parse_args()

    try:
        moment = parse_date(args.date)
        slug = slugify(args.title)
    except ValueError as exc:
        print(f"[new_post] {exc}")
        return 2

    if args.draft:
        target_dir = DRAFTS_DIR
        filename = f"{slug}.md"
    else:
        target_dir = POSTS_DIR
        filename = f"{moment.strftime('%Y-%m-%d')}-{slug}.md"

    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / filename
    if target.exists():
        print(f"[new_post] 文件已存在，未做修改：{target.relative_to(ROOT)}")
        return 1

    content = build_content(args.title, args.category, args.tag, moment)
    target.write_text(content, encoding="utf-8", newline="\n")

    print(f"[new_post] 已创建：{target.relative_to(ROOT)}")
    if args.draft:
        print("[new_post] 这是草稿，写完后移动到 _posts/ 目录即可发布")
    else:
        print("[new_post] 提交并推送后，网站会自动更新")
    return 0


if __name__ == "__main__":
    sys.exit(main())
