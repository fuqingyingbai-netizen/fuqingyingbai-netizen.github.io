#!/usr/bin/env python3
"""Publish a sourced Chinese digest of public GitHub activity only.

No authenticated activity endpoint, chat history, private repository, model API,
or event body is read. Run with --dry-run to preview without writing a post.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BEIJING = timezone(timedelta(hours=8))
FIRST_PUBLICATION = datetime(2026, 10, 18, 20, tzinfo=BEIJING)
SUPPORTED = {"PushEvent", "PullRequestEvent", "IssuesEvent", "ReleaseEvent", "CreateEvent", "ForkEvent"}
REPO_NAME = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\Z")


def scheduled_end(now: datetime) -> datetime:
    """Use the most recent Sunday 20:00, even when Actions starts late."""
    local = now.astimezone(BEIJING)
    end = (local - timedelta(days=(local.weekday() - 6) % 7)).replace(hour=20, minute=0, second=0, microsecond=0)
    return end - timedelta(days=7) if end > local else end


def get_public_json(path: str):
    # Deliberately do not attach GITHUB_TOKEN: only anonymously visible data is eligible.
    request = urllib.request.Request("https://api.github.com" + path, headers={
        "Accept": "application/vnd.github+json", "User-Agent": "public-weekly-summary",
    })
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            if not response.url.startswith("https://api.github.com/"):
                raise RuntimeError("Unexpected API redirect")
            return json.load(response)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise RuntimeError(f"Public GitHub API failed: HTTP {exc.code}") from None
    except (urllib.error.URLError, TimeoutError):
        raise RuntimeError("Public GitHub API unavailable; no post was published") from None


def fetch_events(user: str, start: datetime, end: datetime, fetch=get_public_json) -> tuple[list[dict], bool]:
    events, seen = [], set()
    for page in range(1, 4):
        batch = fetch(f"/users/{user}/events/public?per_page=100&page={page}")
        if not isinstance(batch, list):
            raise RuntimeError("Unexpected public events response")
        for event in batch:
            event_id = event.get("id")
            if not event_id or event_id in seen:
                continue
            seen.add(event_id)
            moment = datetime.fromisoformat(event["created_at"].replace("Z", "+00:00"))
            if (start <= moment < end and event.get("public") is True
                    and event.get("actor", {}).get("login", "").casefold() == user.casefold()
                    and event.get("type") in SUPPORTED):
                events.append(event)
        if len(batch) < 100 or any(datetime.fromisoformat(e["created_at"].replace("Z", "+00:00")) < start for e in batch):
            return events, False
    return events, True


def safe_text(value: str) -> str:
    value = " ".join(str(value).split())[:180]
    return re.sub(r"([\\`*_\[\]{}])", r"\\\1", html.escape(value, quote=True))


def event_line(event: dict, repo: str) -> str:
    payload = event.get("payload") or {}
    base = f"https://github.com/{repo}"
    kind = event["type"]
    if kind == "PushEvent":
        head = payload.get("head", "")
        link = f"{base}/commit/{head}" if re.fullmatch(r"[0-9a-fA-F]{40}", head) else f"{base}/commits"
        label = "推送代码更新"
    elif kind in {"PullRequestEvent", "IssuesEvent"}:
        item = payload.get("pull_request" if kind == "PullRequestEvent" else "issue") or {}
        number = item.get("number", payload.get("number"))
        if not isinstance(number, int) or number <= 0:
            return ""
        label = {"opened": "新建", "closed": "关闭", "reopened": "重新打开"}.get(payload.get("action"), "更新")
        label += " PR" if kind == "PullRequestEvent" else " Issue"
        if kind == "PullRequestEvent" and payload.get("action") == "closed" and item.get("merged"):
            label = "合并 PR"
        label += f" #{number}：{safe_text(item.get('title', ''))}"
        link = f"{base}/{'pull' if kind == 'PullRequestEvent' else 'issues'}/{number}"
    elif kind == "ReleaseEvent":
        label, link = "发布版本：" + safe_text((payload.get("release") or {}).get("name") or "Release"), f"{base}/releases"
    elif kind == "ForkEvent":
        label, link = "Fork 学习项目", base
    else:
        label, link = "创建" + {"repository": "仓库", "branch": "分支", "tag": "标签"}.get(payload.get("ref_type"), "项目内容"), base
    moment = datetime.fromisoformat(event["created_at"].replace("Z", "+00:00")).astimezone(BEIJING)
    return f"- {moment:%m-%d} · [{label}]({link})"


def render_summary(user: str, end: datetime, events: list[dict], capped: bool, fetch=get_public_json) -> str:
    groups = defaultdict(list)
    for event in sorted(events, key=lambda e: (e["created_at"], e["id"]), reverse=True):
        repo = event.get("repo", {}).get("name", "")
        if REPO_NAME.fullmatch(repo):
            groups[repo].append(event)
    sections, count = [], 0
    for repo, items in sorted(groups.items()):
        metadata = fetch(f"/repos/{repo}")
        # Recheck visibility at publication time, not just at event creation time.
        if not isinstance(metadata, dict) or metadata.get("private") is not False or metadata.get("visibility") != "public":
            continue
        lines = [line for item in items if (line := event_line(item, repo))]
        if not lines:
            continue
        count += len(lines)
        sections.extend([f"### [{safe_text(repo)}](https://github.com/{repo})", "", *lines, ""])
    start = end - timedelta(days=7)
    header = ["---", f"title: 每周总结｜{end:%Y.%m.%d} 的公开项目记录", f"date: {end:%Y-%m-%d %H:%M:%S %z}",
              "categories: [每周总结]", "tags: [GitHub, 项目实践]", "render_with_liquid: false", "---", "",
              f"这周继续把公开项目的进展整理在这里。本期记录区间为北京时间 **{start:%Y-%m-%d %H:%M} 至 {end:%Y-%m-%d %H:%M}**（不含结束时刻）。", "", "## 本周公开活动", ""]
    if sections:
        header += [f"本次整理到 {count} 条公开活动，按项目列出，具体变更可以通过链接查看。", "", *sections]
    else:
        header += ["本次未从公开活动接口获取到可列出的项目活动。这不代表本周没有学习或工作，未公开的内容不在这里推测或补写。", ""]
    if capped:
        header += ["> 本次触及 GitHub 活动接口的 300 条上限，本期记录可能不完整。", ""]
    header += ["## 记录说明", "", f"素材来自 [GitHub 公开活动](https://github.com/{user}?tab=overview)。只列出接口返回的代码推送、PR、Issue、版本发布、创建与 Fork 活动；推送次数不等于提交数，也不代表学习时长或成果数量。", "",
               "公开活动接口存在延迟和数量限制，本页并非完整贡献记录。私有仓库资料、聊天内容及尚未确认的学习成果不参与自动发布。", ""]
    return "\n".join(header)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    end = scheduled_end(datetime.now(timezone.utc))
    if end < FIRST_PUBLICATION:
        print("[weekly] 首次发布为 2026-10-18 20:00 +0800，尚未到期")
        return 0
    output = ROOT / "_posts" / f"{end:%Y-%m-%d}-weekly-{end:%Y-%m-%d}.md"
    if output.exists():
        print("[weekly] 本期已发布，保留现有文章")
        return 0
    user = json.loads((ROOT / "_data/projects.json").read_text(encoding="utf-8"))["user"]
    events, capped = fetch_events(user, end - timedelta(days=7), end)
    content = render_summary(user, end, events, capped)
    if args.dry_run:
        print(content)
    else:
        output.write_text(content, encoding="utf-8", newline="\n")
        print(f"[weekly] 已生成 {output.name}")
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    try:
        sys.exit(main())
    except RuntimeError as exc:
        print(f"[weekly] {exc}", file=sys.stderr)
        sys.exit(1)
