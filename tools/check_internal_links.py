#!/usr/bin/env python3
"""检查站点构建产物中的站内链接是否有效。

用法：
    bundle exec jekyll build -d _site     # 先构建站点
    python tools/check_internal_links.py  # 再检查 _site 里的站内链接

说明：
    - 扫描 `_site` 下所有 HTML 文件，提取 href / src 中的链接
    - 跳过外部链接（http/https）、锚点、mailto、javascript、data URI
    - 校验目标文件是否真的存在于 `_site`，失效链接会打印出来并返回非 0 退出码
    - 适合放进 CI：能提前发现文章里写错的站内链接
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

# Windows 控制台默认编码可能不支持特殊符号，这里统一成 UTF-8 输出
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
ATTRIBUTE_PATTERN = re.compile(r'(?:href|src)\s*=\s*"([^"]+)"', re.IGNORECASE)
EXTERNAL_PREFIXES = ("http://", "https://", "//", "mailto:", "tel:", "javascript:", "data:")


def collect_targets(site: Path) -> dict[str, set[str]]:
    """返回 {站内链接: {引用它的页面}}。"""
    targets: dict[str, set[str]] = {}
    for page in sorted(site.rglob("*.html")):
        text = page.read_text(encoding="utf-8", errors="ignore")
        for raw in ATTRIBUTE_PATTERN.findall(text):
            link = raw.strip()
            if not link or link.startswith("#") or link.startswith(EXTERNAL_PREFIXES):
                continue
            path = urlparse(link).path
            if not path:
                continue
            targets.setdefault(unquote(path), set()).add(str(page.relative_to(site)))
    return targets


def resolve(site: Path, source_page: Path, link_path: str) -> Path | None:
    """把站内链接解析成文件系统路径，找到存在的目标就返回它。"""
    if link_path.startswith("/"):
        base = site / link_path.lstrip("/")
    else:
        base = site / source_page.parent / link_path

    candidates = [base]
    if link_path.endswith("/"):
        candidates.append(base / "index.html")
    if not base.suffix:
        candidates.append(base / "index.html")
        candidates.append(base.with_suffix(".html"))

    for candidate in candidates:
        try:
            if candidate.exists():
                return candidate
        except OSError:
            continue
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="检查 _site 中的站内链接")
    parser.add_argument("--site", default="_site", help="构建产物目录，默认 _site")
    parser.add_argument("--verbose", action="store_true", help="打印每条被检查的链接")
    args = parser.parse_args()

    site = (ROOT / args.site).resolve()
    if not site.exists():
        print(f"[check_internal_links] 找不到目录 {site}，请先执行 bundle exec jekyll build -d {args.site}")
        return 2

    targets = collect_targets(site)
    if not targets:
        print("[check_internal_links] 没有发现任何 HTML 文件，请确认构建产物目录是否正确")
        return 2

    broken: dict[str, set[str]] = {}
    for link, pages in sorted(targets.items()):
        if args.verbose:
            print(f"  检查 {link}（来自 {len(pages)} 个页面）")
        if resolve(site, Path(next(iter(pages))), link) is None:
            broken[link] = pages

    checked = len(targets)
    if broken:
        print(f"[check_internal_links] 检查了 {checked} 个站内链接，发现 {len(broken)} 个失效：")
        for link, pages in sorted(broken.items()):
            print(f"  ✗ {link}")
            for page in sorted(pages)[:3]:
                print(f"      来自 {page}")
        return 1

    print(f"[check_internal_links] 检查了 {checked} 个站内链接，全部有效 ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())
