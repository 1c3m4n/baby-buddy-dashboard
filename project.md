# Baby Buddy Dashboard project guide

Prepared on 2026-10-20 from this checkout, Hermes's project skills and memory, and the local connection configuration. Never copy credentials or real child records into this document.

## Purpose and working agreement

This is Joshua's personalised Baby Buddy Dashboard fork, hosted as a Home Assistant add-on alongside the separate Baby Buddy application. Work here will mainly change the frontend. Preserve the existing household workflows unless Joshua requests a change.

- Implement and verify requested changes here, then publish them to the connected GitHub repository.
- **Always increase the Home Assistant add-on version when making changes**, including documentation changes. Use a patch bump for small compatible changes; choose a larger bump when the scope warrants it.
- Joshua installs the published update in Home Assistant himself. Publishing does not mean updating or restarting the running add-on or kiosk.
- The setup release is `1.2.27`; `baby-buddy-dashboard/config.yaml` is the authoritative version for subsequent releases.

## Repository and architecture

- Workspace: `/home/joshua/Development/baby-buddy-dashboard`.
- GitHub remote: `https://github.com/1c3m4n/baby-buddy-dashboard.git`; release branch: `main`.
- Add-on root: `baby-buddy-dashboard/` within this Git repository. Hermes's older `/home/joshua/baby-buddy-dashboard/...` location is historical; use the current workspace.
- Frontend: React 18, Vite 6, Recharts 2, JavaScript/JSX and plain CSS. There is no external component library or Tailwind design system.
- Backend: FastAPI, httpx and Uvicorn; serves built frontend assets and proxies Baby Buddy's REST API.
- Add-on packaging: `config.yaml`, `build.yaml`, `Dockerfile`, and `run.sh` under the add-on root. Node builds the frontend into `/app/static`; Python serves it on port `8099`.
- Repository root `Dockerfile`, `docker-compose.yml` and `run_local.sh` support standalone/development usage. The compose file currently references an upstream dashboard image; it is not this fork's release mechanism.

```text
Browser / HA ingress / Raspberry Pi kiosk
  -> Dashboard :8099 (FastAPI + built React frontend)
  -> /api/baby-buddy/* -> Baby Buddy :9090 /api/* (Token authentication)

Dashboard backend -> http://supervisor/core/api/* (Supervisor Bearer token)
  -> HA timezone + daily feeding/sleep summary sensors
```

## Connections and credentials

| Service | Address / method | Credential source |
| --- | --- | --- |
| Home Assistant | `http://homeassistant.local:8123`; REST `/api/*`, `Authorization: Bearer <token>` | `HASS_URL` and `HASS_TOKEN` in `/home/joshua/.hermes/.env`; dedicated profile also at `/home/joshua/.hermes/profiles/homeautomation/.env` |
| Baby Buddy application | `http://homeassistant.local:9090`; REST `/api/*`, `Authorization: Token <api-key>` | Local ignored `.env`: `BABY_BUDDY_URL`, `BABY_BUDDY_API_KEY`; deployed add-on options: `baby_buddy_url`, `baby_buddy_api_key` |
| Dashboard | `http://homeassistant.local:8099/`, or Home Assistant ingress | Backend keeps the Baby Buddy API key server-side; browser uses relative API URLs |
| Supervisor -> HA Core | `http://supervisor/core/api/` by default | Runtime `SUPERVISOR_TOKEN`, supplied by HA; enabled by `homeassistant_api: true` |
| Display device (Hermes history) | `baby.local`, SSH `ben@baby.local`; Chromium kiosk opens dashboard `:8099` | Existing SSH authentication; never store a password in the repository |

Both local Baby Buddy and Hermes HA token fields were populated when inspected; their values were not printed or copied. `.env` is git-ignored. Keep any future local credential files ignored, and never place tokens in frontend code, command arguments, logs, screenshots, docs, or commits.

Read-only connection checks on 2026-10-20:

- HA `/api/config` returned HTTP 200, version `2026.10.1`, timezone `Europe/Amsterdam`.
- Dashboard `/api/config` on `:8099` and authenticated Baby Buddy `/api/children/?limit=1` on `:9090` both reset the connection from this machine. These addresses are configured locally and recorded by Hermes, but reachability was not verified. This does not establish the cause or prove that the deployed services are down.
- Hermes memory mentions Baby Buddy `v2.10`; its medication schema reference covers `2.9.2`. The installed Baby Buddy version was not independently verified in this setup.

For HA inspection, use `/home/joshua/.codex/skills/home-assistant/scripts/ha.py`, which reads the Hermes environment without executing it. Example: `python3 /home/joshua/.codex/skills/home-assistant/scripts/ha.py state sensor.baby_buddy_feeding_today`. Network calls may need sandbox approval; DNS failure inside the sandbox is not evidence of an outage.

### Runtime configuration

`run.sh` exports add-on options as `BABY_BUDDY_URL`, `BABY_BUDDY_API_KEY`, `REFRESH_INTERVAL`, `DEMO_MODE`, and `UNIT_SYSTEM`. The backend also supports reading `/data/options.json` if no Baby Buddy URL is set. Current local settings: 30-second refresh, metric, demo mode off. The schema allows a 5–300-second refresh interval.

Browser API paths are `./api/baby-buddy`, `./api/config`, and `./api/media...`. Vite uses `base: "./"`; the backend injects the ingress base path using `X-Ingress-Path`. Preserve this relative routing so both ingress and direct access work. Never send the Baby Buddy token to the browser.

The add-on publishes `sensor.baby_buddy_feeding_today` and `sensor.baby_buddy_sleep_today`, with the same summary available at `/api/summary/today`. These use HA's configured calendar day and select the first Baby Buddy child; frontend child selection is separate. Publishing runs at least 30 seconds apart when a Supervisor token is available.

Hermes also records mobile/watch integration entities `sensor.baby_feeding_status`, `sensor.baby_sleep_status`, `script.baby_buddy_feeding_toggle`, and `script.baby_buddy_sleep_toggle`, backed by `/config/packages/baby_buddy_mobile_watch_package.yaml`. They are external integration context, not files managed in this repository, and were not live-checked here.

## Existing design system

The design lives in `frontend/src/styles.css`, `frontend/src/utils/colors.js`, reusable components, and component-local inline styles. Paths in this section are relative to the add-on root.

| Token | Current value |
| --- | --- |
| Page background `--bg` | `#0F1117` |
| Card background `--card-bg` | `#181A24` |
| Border `--border` | `#252836` |
| Main text `--text` | `#E4E7F1` |
| Muted text `--text-muted` | `#8F96B0` |
| Dim text `--text-dim` | `#5A6178` |
| Tooltip `--tooltip-bg` | `#1C1F2Eee` |
| Body font `--font` | DM Sans, system sans-serif fallback |
| Numeric/time font `--mono` | JetBrains Mono, monospace fallback |

Fonts load from Google Fonts in `frontend/index.html`, with local fallbacks. Overall style: dark background, quiet borders, rounded cards, compact type, coloured activity icons and data, and translucent accent fills.

Activity colours from `utils/colors.js`:

| Activity | Colour |
| --- | --- |
| Feeding | Amber `#F59E0B` |
| Sleep | Violet `#8B5CF6` |
| Diapers | Blue `#3B82F6` |
| Growth / weight | Green `#10B981` |
| Tummy time | Pink `#EC4899` |
| Pumping | Cyan `#06B6D4` |
| Temperature / current vitamins action | Red `#EF4444` |
| Height | Indigo `#6366F1` |
| Notes | Lime `#84CC16` |

Layout and interaction conventions:

- Main content is centred with a `960px` maximum width, `20px 16px 100px` padding, and a responsive breakpoint at `600px` (page padding becomes `12px 12px 100px`). Keep room for floating actions.
- Standard cards use `16px` corners, 1px borders, `16px 20px` header/body padding, and 30px accent icon tiles. Inputs use 10px corners, form buttons 12px, and modals 16px with a 400px maximum width.
- Reuse `SectionCard`, `StatCard`, `TimelineItem`, `TimerButton`, `CustomTooltip`, `ChartDetailBar`, `DayActivitiesModal`, and the form primitives exported by `Modal.jsx`. Icons are local SVG components in `Icons.jsx`.
- Tabs are Overview, Growth, and Notes. Quick-log actions are grouped into Track, Measure, and Note; feeding, pumping, sleep, and tummy time have timers.
- Recent overview sections start collapsed at two rows and use the existing expand controls; clickable entries open the matching edit modal.
- Recharts charts use activity colours and shared tooltip/detail components. Existing fade/pulse motion is subtle.
- Hermes records a `480x800` DSI panel rotated right on the kiosk. Verify the effective browser viewport before assuming its orientation; check narrow/mobile, kiosk and wider desktop layouts for UI changes.

## Frontend/data map and behaviour to preserve

- `App.jsx`: tabs, child switcher, active timers, grouped quick actions, form modals and refresh after save.
- `hooks/useBabyData.js`: API polling, child selection, independent today/recent/week/month collections and demo fixtures.
- `hooks/useTimers.js`: timer lifecycle and elapsed display.
- `api.js`: Baby Buddy resource helpers for children, feedings, sleep, changes, tummy-times, temperature, weight, height, pumping, medication, notes and timers.
- `tabs/OverviewTab.jsx`: household insight cards, charts and timelines. `GrowthTab.jsx` and `NotesTab.jsx`: their corresponding screens.
- `utils/formatters.js`, `feedingInsights.js`, `medicationInsights.js`, `decimalInput.js`: shared transformations/calculations. Keep important new calculations in pure helpers.
- `utils/mockData.js`: demo data. Update it, including child-switch paths, whenever a feature changes its data requirements.

Preserve these existing semantics unless the requested scope changes them:

- Latest/recent feeding data has no calendar-day filter so it survives midnight; today's counts remain separate. Recent feedings are capped at five in live and demo state.
- The rolling sleep collection is filtered by completion time (`end_min`, ordering `-end`); daily HA summary totals have separate calendar-day clipping rules.
- Timer completion defaults use the edited entry first, then the latest feeding's coupled type/method/amount, then static defaults. Keep timer references when saving timer-backed entries.
- Manual `datetime-local` form values must become timezone-aware ISO strings using `new Date(value).toISOString()` on create and update. Reject invalid intervals and show API errors inside the form. Retain user input on failure.
- The feeding amount guide was removed from the overview in 1.2.28 at Joshua's request. The pure calculation helper remains for existing tests; do not reintroduce the card.
- Milk totals separate breast milk and formula over 24 hours. Vitamin reminders use the existing 500 mL formula threshold; logging uses Baby Buddy medication records tagged `vitamins`, with blank dosage defaults. These are existing household rules, not a request for new health advice.
- `unit_system` currently changes labels only; it does not convert stored values.

## Development and verification

Start work by checking `git status --short --branch` and running the existing frontend tests. Do not overwrite user changes.

From the repository root, with dependencies already installed:

```bash
npm --prefix baby-buddy-dashboard/frontend test
npm --prefix baby-buddy-dashboard/frontend run build
cd baby-buddy-dashboard
/home/joshua/Development/baby-buddy-dashboard/.venv/bin/python -m unittest discover -s backend/tests
```

The system Python currently lacks FastAPI; use the existing project virtualenv for backend checks. On a fresh setup, install frontend dependencies with `npm ci` in the frontend directory and backend dependencies from `backend/requirements.txt` in a virtualenv. The root `run_local.sh` reads `.env` and starts Vite `:5173` plus FastAPI `:8099`; activate the virtualenv first so it uses the right Python. Vite proxies `/api` to the local backend.

For UI development prefer local demo mode (`DEMO_MODE=true`) and mock fixtures; avoid making test writes to live baby-care records. Demo mode supplies display data, but does not guarantee that every write action is mocked, so inspect an action before submitting it. Review changed screens at narrow and wide widths, check empty/error states, editing and timer flows, and preserve ingress routing.

Tests use Node ESM (`node:assert/strict`) under `frontend/tests/`; add meaningful coverage for changed logic and regressions. Register new test files in `package.json`. No new framework is needed for routine work.

Setup baseline: all 12 frontend test scripts and all 5 backend tests passed; production build passed with the existing warning about a JavaScript chunk above 500 kB. No UI behaviour was changed during setup.

## Release workflow

1. Fetch remote state, inspect the working tree, and finish the entire requested scope before publishing.
2. Bump `baby-buddy-dashboard/config.yaml` to a strictly newer semantic version. The frontend package's existing `1.0.0` is package metadata, not the add-on update version; changing only that field will not release an HA update.
3. Validate YAML, run frontend tests/build, and run the backend suite for backend changes. Review UI changes in the browser. Do not commit `.env`, real records, generated `dist`, or `node_modules`.
4. Commit the requested changes and version bump, then push `main` to the existing `origin`. Never force-push over remote work.
5. Create/push an annotated `vX.Y.Z` tag matching the add-on version, then create a non-draft, non-prerelease GitHub release with concise notes and validation results.
6. Verify remote `main` matches the commit, the tag targets it, the GitHub release is published, remote `baby-buddy-dashboard/config.yaml` has the new version, and the working tree is clean.
7. Tell Joshua the published version. He refreshes/checks the add-on repository for updates and updates Home Assistant himself.

There is no tracked GitHub Actions workflow in this checkout. The add-on has no `image:` reference in `config.yaml`; its Dockerfile builds from this repository. A standalone container registry push is not part of the current add-on release process.

## Sources for future work

- Hermes skill: `/home/joshua/.hermes/skills/software-development/baby-buddy-dashboard-development/SKILL.md`, available through Hermes `skill_view(name="baby-buddy-dashboard-development")` with linked references for medication, feature wiring, timer defaults, timezone/error fixes, iOS widgets and Live Activities.
- Hermes kiosk facts: `/home/joshua/.hermes/skills/smart-home/baby-kiosk-device/SKILL.md` (read for display context; device changes are outside frontend scope).
- Hermes project memory: `/home/joshua/.hermes/memories/MEMORY.md` (historical context; verify mutable details).
- Local HA skill: `/home/joshua/.codex/skills/home-assistant/SKILL.md` and its `references/local-setup.md`.
- Current source code and tests take precedence over stale paths, older example payloads, and older README text. In particular, do not reuse the medication reference's old bare-local timestamp example.

## Overview changes in 1.2.28

- Feeding summary shows today's total feedings and mL, plus hours/minutes since the latest feeding started. Sleep durations use hours/minutes; the sleep summary also shows time since the latest sleep ended. Diapers retain today's count and show whole elapsed days since the latest record.
- `recentSleep` and `recentChanges` are independent, child-scoped queries without day filters, so recency remains available across quiet days. Live fetches and both demo child paths include them.
- Breast Feeding, Recent Pumpings, Diaper Changes, Tummy Time (including its summary) and Daily Pumping Amounts are hidden without matching records today; historical data alone does not reveal them.
- Sleep Pattern uses a stacked segment per sleep session. `overviewInsights.js` clips each session at local calendar boundaries, including DST, and the weekly query uses `end_min` to include sleeps entering the first displayed day. Day details show clipped portions while edits retain original timestamps.
- Overview regression tests cover elapsed formatting, day splitting, midnight/week boundaries, DST and rendered today/empty/historical card visibility.

## Overview refinement in 1.2.29

- Feeding summary reads “x feeds” (singular “1 feed”), with mL and “since last” underneath. Sleep keeps its rolling total but omits the “Last 24h” caption.
- Milk & Vitamins and every other overview detail card share `.overview-grid`, including Daily Pumping Amounts. Cards sit side by side when two 320px columns plus the gap fit; narrow screens stack them. Previously Milk & Vitamins occupied a separate grid and forced a full-width row.

## Milk & Vitamins refinement in 1.2.30

The Vitamin guidance section (recommendation label and explanatory text) was removed at Joshua's request. Keep the milk totals, vitamin logging status, editable latest record and log button. The existing default vitamin name calculation for the logging form remains unchanged.
