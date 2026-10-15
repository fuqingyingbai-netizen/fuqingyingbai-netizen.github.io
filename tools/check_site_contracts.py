"""Check generated search targets and comment modes after a Jekyll build."""
import argparse
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = []
        self.visitor_comments = False
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"])
        if "data-comments-server" in values:
            self.visitor_comments = True


def check(site: Path, waline: bool | None):
    entries = json.loads((site / "assets/js/data/search.json").read_text(encoding="utf-8"))
    assert isinstance(entries, list) and entries, "Search index is empty"
    projects = json.loads((ROOT / "_data/projects.json").read_text(encoding="utf-8"))["projects"]
    expected = {f"/projects/#project-{p['repo']}" for p in projects}
    actual = {entry["url"] for entry in entries if entry["categories"] == "项目"}
    assert expected == actual, "Project search entries do not match the source data"
    for entry in entries:
        parsed = urlsplit(entry["url"])
        assert not parsed.scheme and parsed.path.startswith("/"), "Search must point to local content"
        target = site / unquote(parsed.path).lstrip("/")
        target = target / "index.html" if parsed.path.endswith("/") else target
        assert target.is_file(), f"Search target missing: {entry['url']}"
        if parsed.fragment:
            ids = Page(target.read_text(encoding="utf-8")).ids
            assert ids.count(unquote(parsed.fragment)) == 1, f"Search anchor missing or duplicated: {entry['url']}"
    post_pages = list((site / "posts").glob("*/index.html"))
    assert post_pages, "No published posts"
    for post in post_pages:
        text = post.read_text(encoding="utf-8")
        if waline is None:
            waline = Page(text).visitor_comments
        assert Page(text).visitor_comments == waline, f"Wrong comment mode: {post.name}"
        if waline:
            assert "visitor-comments.js" in text and 'id="waline"' in text
        else:
            assert "https://giscus.app/client.js" in text
    assert not (site / "tools").exists(), "Deployment source must not be publicly served"
    print(f"[site-contracts] {len(entries)} search entries, {len(actual)} project anchors, {len(post_pages)} post comment modes verified")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", default="_site")
    parser.add_argument("--waline", action="store_true", default=None,
                        help="Require Waline; otherwise verify the build's active comment mode")
    options = parser.parse_args()
    check(ROOT / options.site, options.waline)
