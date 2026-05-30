# Baby Buddy Dashboard

A personalised Home Assistant add-on and standalone dashboard for [Baby Buddy](https://github.com/babybuddy/babybuddy).

This repository is maintained as Joshua's fork of an existing Baby Buddy dashboard. It intentionally deviates from the original project: the goal is no longer to stay as close as possible to the upstream dashboard, but to provide a practical day-to-day view with custom insights, quick logging, and nutrition guidance that fits this household.

## How this fork differs

This fork adds opinionated dashboard behaviour, including:

- personalised overview cards for feeding, pumping, sleep, diapers, weight, and activity
- quick-log flows for common baby-care actions
- milk intake summaries for the last 24 hours
- feeding guide amounts derived from recent weight data
- vitamin guidance based on formula intake thresholds
- Home Assistant add-on metadata, ingress support, and direct web-port access

Some of the feeding and nutrition insights are based on common Dutch standard practice, such as using approximate daily milk intake guidance and vitamin guidance around formula intake. These are intended as household reminders and dashboard aids, not as medical advice.

Always follow the guidance from your own midwife, consultatiebureau, GP, paediatrician, or other qualified healthcare professional if it differs from what this dashboard shows.

## Feeding and nutrition guidance

The dashboard includes feeding helper cards that estimate useful amounts from tracked Baby Buddy data:

- recommended daily milk amount is based on the latest recorded weight
- per-feed guidance is shown for 7 or 8 feeds per day
- guide amounts are rounded up to the nearest 10 mL for easier real-world bottle preparation
- 24-hour breast milk and formula totals are shown separately
- vitamin guidance changes depending on whether formula intake is above or at/below 500 mL in the last 24 hours

These rules reflect the way this fork is used locally. They may not be correct for every child, country, age, feeding plan, or medical situation.

## Installation as a Home Assistant add-on

Add this repository to the Home Assistant add-on store:

```text
https://github.com/1c3m4n/baby-buddy-dashboard
```

Then install the "Baby Buddy Dashboard" add-on and configure:

- `baby_buddy_url`: URL of your Baby Buddy instance
- `baby_buddy_api_key`: Baby Buddy API token
- `refresh_interval`: dashboard refresh interval in seconds
- `demo_mode`: use mock data instead of a real Baby Buddy instance
- `unit_system`: `metric` or `imperial`

The add-on supports Home Assistant ingress and also exposes port `8099` for direct access when configured in Home Assistant's Network settings.

## Local development

Frontend:

```bash
cd frontend
npm install
npm test
npm run build
npm run dev
```

Backend/add-on wrapper files live in `backend/`, `run.sh`, and the Home Assistant add-on metadata files at the repository root.

## Release notes for this fork

For Home Assistant to show updates reliably, this fork bumps the add-on `version:` in `config.yaml`, tags the matching version, and creates a GitHub release.

## Credits

This project builds on Baby Buddy and was forked from an earlier dashboard implementation. This fork now tracks Joshua's own dashboard preferences and local care routines rather than trying to remain a neutral upstream-compatible dashboard.
