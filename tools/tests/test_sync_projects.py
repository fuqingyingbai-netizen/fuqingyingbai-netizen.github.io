#!/usr/bin/env python3
"""sync_projects.py 的单元测试。

运行方式：
    python -m unittest discover -s tools/tests -v
"""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "tools" / "sync_projects.py"


def load_module():
    """按路径加载被测模块（tools 目录不是 Python 包）。"""
    spec = importlib.util.spec_from_file_location("sync_projects", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"无法加载 {MODULE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


MODULE = load_module()


def make_repo(**overrides) -> dict:
    """构造一份 GitHub API 风格的仓库数据。"""
    data = {
        "html_url": "https://github.com/example/demo",
        "language": "Python",
        "stargazers_count": 3,
        "pushed_at": "2026-09-20T08:30:00Z",
    }
    data.update(overrides)
    return data


class FormatDateTests(unittest.TestCase):
    def test_formats_iso_timestamp(self):
        self.assertEqual(MODULE.format_date("2026-09-20T08:30:00Z"), "2026-09-20")

    def test_handles_missing_value(self):
        self.assertEqual(MODULE.format_date(None), "未知")

    def test_handles_invalid_value(self):
        self.assertEqual(MODULE.format_date("not-a-date"), "未知")


class RenderProjectTests(unittest.TestCase):
    project = {
        "repo": "demo",
        "emoji": "🚀",
        "title": "演示项目",
        "description": "这是一个演示项目。",
        "tags": ["Python", "测试"],
    }

    def test_renders_link_tags_and_stats(self):
        text = MODULE.render_project(self.project, make_repo(), "example")
        self.assertIn("[演示项目](https://github.com/example/demo)", text)
        self.assertIn("`Python` `测试`", text)
        self.assertIn("语言：Python", text)
        self.assertIn("⭐ 3", text)
        self.assertIn("最近更新：2026-09-20", text)

    def test_falls_back_when_repo_data_missing(self):
        text = MODULE.render_project(self.project, None, "example")
        self.assertIn("https://github.com/example/demo", text)
        self.assertIn("暂时无法读取", text)

    def test_skips_stats_when_disabled(self):
        project = dict(self.project, show_stats=False)
        text = MODULE.render_project(project, make_repo(), "example")
        self.assertNotIn("最近更新", text)

    def test_renders_note_as_blockquote(self):
        project = dict(self.project, note="来自上游项目")
        text = MODULE.render_project(project, make_repo(), "example")
        self.assertIn("> 来自上游项目", text)

    def test_unknown_language_is_labelled(self):
        text = MODULE.render_project(self.project, make_repo(language=None), "example")
        self.assertIn("语言：未标注", text)


class RenderPageTests(unittest.TestCase):
    meta = {
        "user": "example",
        "groups": [
            {"key": "personal", "title": "个人项目"},
            {"key": "learning", "title": "学习项目"},
        ],
        "projects": [
            {
                "repo": "a",
                "group": "personal",
                "title": "项目 A",
                "description": "项目 A 的说明。",
                "tags": ["Python"],
            },
            {
                "repo": "b",
                "group": "learning",
                "title": "项目 B",
                "description": "项目 B 的说明。",
                "tags": [],
            },
        ],
    }

    def test_groups_follow_configured_order(self):
        page = MODULE.render_page(self.meta, {"a": make_repo(), "b": make_repo()})
        self.assertLess(page.index("## 个人项目"), page.index("## 学习项目"))
        self.assertIn("项目 A 的说明。", page)
        self.assertIn("项目 B 的说明。", page)

    def test_page_carries_generated_comment(self):
        page = MODULE.render_page(self.meta, {"a": make_repo(), "b": make_repo()})
        self.assertIn("自动生成", page)
        self.assertIn("icon: fas fa-laptop-code", page)

    def test_empty_group_is_skipped(self):
        meta = dict(self.meta, projects=[p for p in self.meta["projects"] if p["group"] == "personal"])
        page = MODULE.render_page(meta, {"a": make_repo()})
        self.assertNotIn("## 学习项目", page)

    def test_output_is_stable(self):
        first = MODULE.render_page(self.meta, {"a": make_repo(), "b": make_repo()})
        second = MODULE.render_page(self.meta, {"a": make_repo(), "b": make_repo()})
        self.assertEqual(first, second)

    def test_projects_without_repo_data_still_render(self):
        page = MODULE.render_page(self.meta, {})
        self.assertIn("项目 A", page)
        self.assertIn("暂时无法读取", page)


if __name__ == "__main__":
    unittest.main(verbosity=2)
