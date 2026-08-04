# Ocean v0.9.1 — What's New

Released: 2026-04-02

## Claude OAuth Usage Panel

Ocean now shows your real-time Claude usage quota directly in the status bar. When Claude Code Native mode is enabled, a usage bar appears showing:

- **5-hour utilization** — short-window quota with reset timer
- **7-day utilization** — rolling weekly quota
- **Sonnet / Opus breakdowns** — per-model consumption

The poller runs every 60 seconds and reads usage from the local Claude keychain. Configure warning and error thresholds in **Settings → General → Usage Quota**.

## PTY Deadlock Fix

A deadlock in the PTY read loop could cause terminal sessions to hang silently when multiple agents ran concurrently. The fix eliminates the contention point in the PTY event loop, making long-running agent sessions more reliable.

## Bug Fixes

- **OAuth poller guard** — The poller now skips IPC entirely when Claude Code Native mode is off, preventing spurious backend calls.
- **OAuth null propagation** — On keychain errors, the usage store is updated with `null` instead of silently stalling, keeping the UI consistent.
- **E2E test suite** — All Playwright tests restored across smoke, terminal operations, and conflict resolution suites.
- **Session lifecycle regressions** — Multiple edge-case fixes in overlay cleanup and PTY teardown from real-world agent sessions.

## Infrastructure

- 498 Rust unit tests (↑ from 322)
- 918 frontend tests (↑ from 878)
- Plugin development and troubleshooting guides added to docs
