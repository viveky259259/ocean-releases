# Ocean v0.12.3 — What's New

Released: 2026-04-15

## Stability and Refinement

Ocean v0.12.3 is a maintenance release focused on resolving critical session and terminal issues to ensure a smooth development experience.

## Key Fixes

- **WorkOS Session Cookie Fixes** — Resolved issues where session cookies were not being correctly persisted or refreshed during long-running agent sessions.
- **Terminal Resizing** — Fixed a bug where terminal panes would not correctly recalculate their dimensions after a layout split or window resize.
- **PTY Signal Leak Resolution** — Patched a resource leak in the Rust backend where PTY signals were not being correctly cleaned up after session termination.

## Improvements

- Improved responsiveness of the sidebar during high CPU usage.
- Enhanced logging for git-sync operations.

---

*Ocean is private software and local-first. [Learn more](https://docs.getocean.dev)*
