"""Privacy, time-window, pagination and safe rendering checks for auto-publication."""
import importlib.util
import unittest
from datetime import datetime, timedelta
from pathlib import Path

spec = importlib.util.spec_from_file_location("weekly_summary", Path(__file__).resolve().parents[1] / "weekly_summary.py")
MODULE = importlib.util.module_from_spec(spec)
spec.loader.exec_module(MODULE)
END = MODULE.FIRST_PUBLICATION


def event(identifier="1", **overrides):
    value = {"id": identifier, "public": True, "type": "PushEvent", "actor": {"login": "example"},
             "created_at": "2026-10-17T12:00:00Z", "repo": {"name": "example/demo"}, "payload": {"head": "a" * 40}}
    value.update(overrides)
    return value


class ScheduleTests(unittest.TestCase):
    def test_sunday_before_publication_uses_previous_week(self):
        self.assertEqual(MODULE.scheduled_end(END - timedelta(seconds=1)), END - timedelta(days=7))

    def test_delayed_execution_keeps_fixed_week_boundary(self):
        self.assertEqual(MODULE.scheduled_end(END + timedelta(days=2)), END)

    def test_utc_execution_maps_to_beijing_sunday(self):
        self.assertEqual(MODULE.scheduled_end(datetime.fromisoformat("2026-10-18T12:05:00+00:00")), END)


class PrivacyTests(unittest.TestCase):
    def test_only_public_actor_events_inside_half_open_window_are_kept(self):
        batch = [event(), event("2", public=False), event("3", actor={"login": "other"}),
                 event("4", created_at="2026-10-18T12:00:00Z"), event("5", created_at="2026-10-11T12:00:00Z"),
                 event("6", created_at="2026-10-11T11:59:59Z"), event("7", type="WatchEvent")]
        paths = []
        def fetch(path):
            paths.append(path)
            return batch
        result, capped = MODULE.fetch_events("example", END - timedelta(days=7), END, fetch)
        self.assertEqual([e["id"] for e in result], ["1", "5"])
        self.assertIn("/events/public?", paths[0])
        self.assertFalse(capped)

    def test_pagination_deduplicates_and_reports_limit(self):
        pages = [[event(str(i + page * 100)) for i in range(100)] for page in range(3)]
        result, capped = MODULE.fetch_events("example", END - timedelta(days=7), END, lambda _: pages.pop(0))
        self.assertEqual(len(result), 300)
        self.assertTrue(capped)

    def test_repository_made_private_is_omitted(self):
        result = MODULE.render_summary("example", END, [event()], False, lambda _: {"private": True, "visibility": "private"})
        self.assertNotIn("example/demo", result)
        self.assertIn("未从公开活动接口获取到", result)

    def test_visibility_error_stops_publication(self):
        def fail(_):
            raise RuntimeError("API unavailable")
        with self.assertRaises(RuntimeError):
            MODULE.render_summary("example", END, [event()], False, fail)

    def test_untrusted_titles_cannot_inject_html_or_liquid(self):
        item = event(type="IssuesEvent", payload={"action": "opened", "issue": {"number": 3, "title": '<script>x</script> {{ site.secret }} [x](bad)'}})
        result = MODULE.render_summary("example", END, [item], False, lambda _: {"private": False, "visibility": "public"})
        self.assertNotIn("<script>", result)
        self.assertIn("render_with_liquid: false", result)
        self.assertIn("https://github.com/example/demo/issues/3", result)
        self.assertNotIn("{{ site.secret }}", result)

    def test_duplicate_events_appear_once(self):
        items, _ = MODULE.fetch_events("example", END - timedelta(days=7), END, lambda _: [event(), event()])
        self.assertEqual(len(items), 1)


class DigestTests(unittest.TestCase):
    def test_repeated_pr_actions_share_one_entry_and_all_sources_remain_in_details(self):
        items = [event(str(i), type="PullRequestEvent", payload={"action": action, "number": 7})
                 for i, action in enumerate(["opened", "reopened", "closed"])] + [event("9")]
        paths = []
        def fetch(path):
            paths.append(path)
            return {"private": False, "visibility": "public"} if path == "/repos/example/demo" else {"title": "Improve search"}
        result = MODULE.render_summary("example", END, items, False, fetch)
        main, details = result.split('<details class="weekly-details" markdown="1">')
        self.assertIn("4 条公开活动，涉及 1 个项目", main)
        self.assertIn("代码推送 1 条、PR 活动 3 条", main)
        self.assertEqual(main.count("https://github.com/example/demo/pull/7"), 1)
        self.assertIn("Improve search", main)
        self.assertIn("关闭 PR #7", main)
        self.assertNotIn("合并 PR", main)
        self.assertEqual(details.count("https://github.com/example/demo/pull/7"), 3)
        self.assertIn("/commit/" + "a" * 40, details)
        self.assertEqual(paths.count("/repos/example/demo/pulls/7"), 1)
        self.assertIn("card_title:", result)
        self.assertIn("description:", result)

    def test_representative_links_are_bounded_and_public_titles_are_escaped(self):
        items = [event(str(i), type="IssuesEvent", payload={"action": "opened", "issue": {"number": i + 1}}) for i in range(8)]
        lookups = []
        def fetch(path):
            if path == "/repos/example/demo":
                return {"private": False, "visibility": "public"}
            lookups.append(path)
            return {"title": '<script>{{site.secret}}</script> [x](https://bad.example)'}
        result = MODULE.render_summary("example", END, items, False, fetch)
        main = result.split("<details")[0]
        self.assertEqual(len(lookups), 3)
        self.assertEqual(main.count("https://github.com/example/demo/issues/"), 3)
        self.assertNotIn("<script>", result)
        self.assertNotIn("{{site.secret}}", result)
        self.assertIn("展开 8 条活动明细", result)

    def test_optional_title_failure_keeps_numbered_link_without_empty_colon(self):
        def fetch(path):
            if path == "/repos/example/demo":
                return {"private": False, "visibility": "public"}
            raise RuntimeError("Rate limit")
        result = MODULE.render_summary("example", END, [event(type="PullRequestEvent", payload={"number": 2})], False, fetch)
        self.assertIn("[更新 PR #2](https://github.com/example/demo/pull/2)", result)
        self.assertNotIn("PR #2：", result)

    def test_non_public_repository_never_fetches_item_titles(self):
        paths = []
        def fetch(path):
            paths.append(path)
            return {"private": True, "visibility": "private"}
        result = MODULE.render_summary("example", END, [event(type="PullRequestEvent", payload={"number": 2})], False, fetch)
        self.assertEqual(paths, ["/repos/example/demo"])
        self.assertNotIn("example/demo", result)


if __name__ == "__main__":
    unittest.main()
