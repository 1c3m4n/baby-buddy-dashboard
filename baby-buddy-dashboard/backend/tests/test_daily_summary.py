import unittest
from datetime import datetime
from pathlib import Path

from backend.daily_summary import build_daily_summary
from backend import server


class DailySummaryTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime.fromisoformat("2026-09-16T23:20:00+02:00")

    def test_feeding_total_and_active_feeding_number(self):
        feedings = [
            {"start": "2026-09-16T09:00:00+02:00", "amount": 200},
            {"start": "2026-09-16T12:00:00+02:00", "amount": 160.5},
            {"start": "2026-09-16T15:00:00+02:00", "amount": None},
        ]
        timers = [
            {
                "child": 1,
                "name": "feeding",
                "start": "2026-09-16T23:00:00+02:00",
            }
        ]

        summary = build_daily_summary(feedings, [], timers, child_id=1, now=self.now)

        self.assertEqual(summary["feeding"]["total_amount_ml"], 360.5)
        self.assertEqual(summary["feeding"]["completed_count"], 3)
        self.assertEqual(summary["feeding"]["feeding_number"], 4)
        self.assertTrue(summary["feeding"]["timer_running"])

    def test_sleep_total_intersects_midnight_and_includes_active_timer(self):
        sleeps = [
            {
                "start": "2026-09-15T23:30:00+02:00",
                "end": "2026-09-16T01:00:00+02:00",
                "nap": False,
            },
            {
                "start": "2026-09-16T13:00:00+02:00",
                "end": "2026-09-16T14:30:00+02:00",
                "nap": True,
            },
            {
                "start": "2026-09-16T17:00:00+02:00",
                "end": "2026-09-16T17:30:00+02:00",
                "nap": True,
            },
        ]
        timers = [
            {
                "child": 1,
                "name": "sleep",
                "start": "2026-09-16T22:50:00+02:00",
            }
        ]

        summary = build_daily_summary([], sleeps, timers, child_id=1, now=self.now)

        self.assertEqual(summary["sleep"]["total_minutes"], 210)
        self.assertEqual(summary["sleep"]["completed_count"], 3)
        self.assertEqual(summary["sleep"]["sleep_count"], 4)
        self.assertEqual(summary["sleep"]["nap_count"], 2)
        self.assertTrue(summary["sleep"]["timer_running"])

    def test_other_child_timer_is_ignored(self):
        timers = [
            {
                "child": 2,
                "name": "feeding",
                "start": "2026-09-16T23:00:00+02:00",
            }
        ]

        summary = build_daily_summary([], [], timers, child_id=1, now=self.now)

        self.assertEqual(summary["feeding"]["feeding_number"], 0)
        self.assertFalse(summary["feeding"]["timer_running"])

    def test_addon_manifest_grants_home_assistant_api_access(self):
        manifest = Path(__file__).parents[2] / "config.yaml"
        self.assertIn("homeassistant_api: true", manifest.read_text())


class HomeAssistantPublisherTests(unittest.IsolatedAsyncioTestCase):
    async def test_publishes_feeding_and_sleep_summary_entities(self):
        class FakeResponse:
            def raise_for_status(self):
                return None

        class FakeClient:
            def __init__(self):
                self.posts = []

            async def post(self, path, json):
                self.posts.append((path, json))
                return FakeResponse()

        client = FakeClient()
        original_client = server.home_assistant_client
        server.home_assistant_client = client
        try:
            await server._publish_summary_to_home_assistant(
                {
                    "date": "2026-09-16",
                    "generated_at": "2026-09-16T23:20:00+02:00",
                    "child": {"id": 1, "name": "Benjamin Robin Potgieter"},
                    "feeding": {
                        "total_amount_ml": 690,
                        "completed_count": 4,
                        "feeding_number": 5,
                        "timer_running": True,
                    },
                    "sleep": {
                        "total_minutes": 736,
                        "completed_count": 5,
                        "sleep_count": 5,
                        "nap_count": 3,
                        "timer_running": False,
                    },
                }
            )
        finally:
            server.home_assistant_client = original_client

        self.assertEqual(
            [path for path, _ in client.posts],
            [
                "states/sensor.baby_buddy_feeding_today",
                "states/sensor.baby_buddy_sleep_today",
            ],
        )
        feeding_attributes = client.posts[0][1]["attributes"]
        sleep_attributes = client.posts[1][1]["attributes"]
        self.assertEqual(feeding_attributes["feeding_number"], 5)
        self.assertEqual(sleep_attributes["formatted_total"], "12h 16m")
        self.assertEqual(sleep_attributes["nap_count"], 3)


if __name__ == "__main__":
    unittest.main()
