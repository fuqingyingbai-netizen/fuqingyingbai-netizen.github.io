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


if __name__ == "__main__":
    unittest.main()
