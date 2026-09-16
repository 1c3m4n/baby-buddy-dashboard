"""Daily Baby Buddy aggregation shared by the API and HA exporter."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable


def _as_datetime(value: str | datetime | None, fallback_tz) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=fallback_tz)
    return parsed


def _active_timer(
    timers: Iterable[dict[str, Any]], child_id: int, name: str
) -> dict[str, Any] | None:
    for timer in timers:
        if timer.get("child") == child_id and str(timer.get("name", "")).lower() == name:
            return timer
    return None


def build_daily_summary(
    feedings: Iterable[dict[str, Any]],
    sleeps: Iterable[dict[str, Any]],
    timers: Iterable[dict[str, Any]],
    *,
    child_id: int,
    now: datetime,
) -> dict[str, Any]:
    """Aggregate calendar-day feeding and sleep data in ``now``'s timezone.

    Sleep duration is clipped to the local day boundary and includes an active
    sleep timer up to ``now``. Completed counts include records overlapping the
    current day; the current timer is added to the displayed session number.
    """
    if now.tzinfo is None:
        raise ValueError("now must be timezone-aware")

    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    feeding_records = []
    for feeding in feedings:
        start = _as_datetime(feeding.get("start"), now.tzinfo)
        if start is not None and day_start <= start <= now:
            feeding_records.append(feeding)

    feeding_timer = _active_timer(timers, child_id, "feeding")
    total_amount = sum(float(item.get("amount") or 0) for item in feeding_records)
    completed_feeding_count = len(feeding_records)

    sleep_records = []
    total_sleep_seconds = 0.0
    nap_count = 0
    for sleep in sleeps:
        start = _as_datetime(sleep.get("start"), now.tzinfo)
        end = _as_datetime(sleep.get("end"), now.tzinfo)
        if start is None or end is None or end <= day_start or start >= now:
            continue
        clipped_start = max(start, day_start)
        clipped_end = min(end, now)
        if clipped_end <= clipped_start:
            continue
        sleep_records.append(sleep)
        total_sleep_seconds += (clipped_end - clipped_start).total_seconds()
        if sleep.get("nap") is True:
            nap_count += 1

    sleep_timer = _active_timer(timers, child_id, "sleep")
    if sleep_timer:
        timer_start = _as_datetime(sleep_timer.get("start"), now.tzinfo)
        if timer_start is not None and timer_start < now:
            total_sleep_seconds += (now - max(timer_start, day_start)).total_seconds()

    total_amount_value: int | float
    total_amount_value = round(float(total_amount), 1)
    if total_amount_value.is_integer():
        total_amount_value = int(total_amount_value)

    completed_sleep_count = len(sleep_records)
    return {
        "date": now.date().isoformat(),
        "generated_at": now.isoformat(),
        "feeding": {
            "total_amount_ml": total_amount_value,
            "completed_count": completed_feeding_count,
            "feeding_number": completed_feeding_count + (1 if feeding_timer else 0),
            "timer_running": feeding_timer is not None,
        },
        "sleep": {
            "total_minutes": round(total_sleep_seconds / 60),
            "completed_count": completed_sleep_count,
            "sleep_count": completed_sleep_count + (1 if sleep_timer else 0),
            "nap_count": nap_count,
            "timer_running": sleep_timer is not None,
        },
    }
