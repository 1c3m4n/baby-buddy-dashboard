# Project instructions

Read `project.md` before working on this repository. It records the design system, connection methods, data conventions, and release workflow.

- This is Joshua's personalised Home Assistant Baby Buddy Dashboard add-on. Most requested work concerns the React frontend under `baby-buddy-dashboard/frontend/`.
- Check the working tree and run existing frontend tests before implementation; preserve unrelated user changes.
- Always bump `baby-buddy-dashboard/config.yaml` when making changes. Release completed requested changes through the existing GitHub `main` branch, matching annotated version tag and GitHub release, after verification.
- Joshua performs the Home Assistant update himself. Do not restart/update the deployed add-on or kiosk as part of a frontend release.
- Keep credentials server-side and out of git/output. Local Baby Buddy settings are in ignored `.env`; HA credentials remain in the existing Hermes environment files.
- Preserve relative URLs for HA ingress, timezone-aware form serialization, visible save errors, timer references, demo data and the distinction between rolling and calendar-day collections.
- Reuse existing design tokens/components. Add meaningful regression coverage for changed behaviour and run frontend tests/build before release.
