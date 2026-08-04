# Ocean v0.9.2 — What's New

Released: 2026-04-03

## Shell Passthrough

You can now type in the terminal while Claude is thinking. When Claude Code is waiting for input or processing, Ocean passes your keystrokes through to the shell instead of buffering them. This means you can run quick commands, check `git status`, or browse files without waiting for the agent to finish.

## Ocean Agent API

Ocean now exposes an MCP server that AI models can call directly. The Agent API lets external tools query session state, trigger merges, and read conflict data — turning Ocean into a programmable backend for agent orchestration workflows.

## Git Fetch Remote for Pre-Push Sync

A new `fetch_remote` utility runs automatically before push operations, ensuring your local branch is in sync with the remote. This prevents failed pushes due to diverged history and reduces manual `git pull` steps in agent-driven workflows.

## Sync Commands

New context menu options for workspace management:
- **Sync from source** — pull latest changes from the original repo into the workspace base
- **Sync base to session** — push workspace base state into a specific session overlay

## Security Hardening

A comprehensive security review addressed critical and high severity issues:
- Token safety improvements for OAuth credential handling
- Path validation hardening for sync commands
- Failure logging for audit trail completeness
- Session dirty-check exception handling

## Bug Fixes

- **Dismissed conflicts** — conflicts you dismiss no longer reappear on the next poll cycle
- **Sidebar session click** — clicking a session in the sidebar now correctly switches the terminal view for ungrouped sessions
- **Apple notarization** — release signing flow now includes proper macOS notarization
- **Token caching** — Rust-side token caching for OAuth usage metrics

## Infrastructure

- 660 Rust unit tests (up from 498)
- 1034 frontend tests (up from 918)
- `test-all.sh` script with detailed per-suite reporting
- Plugin development guide with lifecycle streams and contribution points
- 86 files changed, 12371 insertions
