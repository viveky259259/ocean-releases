# Ocean v0.2.0 - What's New

Released: 2026-07-28

## Release Overview

Ocean v0.2.0 makes the in-app agent experience practical for real coding work. Codex and Claude can be selected directly in chat, agent runs report their status in the conversation, and Codex-generated changes are exercised against an installed app rather than only mocked browser state.

## Highlights

- **Codex and Claude in chat** - Choose the provider for an agent chat turn, follow launch and progress in the chat view, and continue a focused coding task without jumping to a separate run dashboard.
- **Reliable Codex code generation** - Codex CLI agent runs use the supported non-interactive invocation, wait for the PTY prompt to settle, preserve their session through the persistent-session router, and surface generated files back in the workspace.
- **Claude Agent SDK packaging** - The packaged macOS app bundles the Claude Agent SDK runner and runtime dependency, so Claude agent chat works after installation as well as from a source checkout.
- **Installed-app QA journeys** - Release testing launches a real signed-style QA build, creates a workspace, asks Codex to generate a Python `hello` file, verifies its contents and execution, and checks persistent PTY health.

## New Features

- Ocean Remote companion application with API models, repository layer, responsive status views, coverage gates, and integration journeys.
- Workspace feedback flow and authenticated feedback API support.
- Session layout controls, focus-preserving close behavior, and refreshed sidebar/session discovery surfaces.
- Expanded agent API registry and MCP access controls.

## Bug Fixes

- Avoid persistent-session failures when a workspace path makes a Unix socket exceed macOS socket-path limits.
- Avoid nested Tokio runtime panics while routing PTY RPCs from Tauri commands.
- Stop stale session daemons before reinstalling a development or production app, preventing reconnects to an obsolete detached process.
- Make release versions explicit when needed, with semantic-version and existing-tag guards.

## Quality

- Added real Codex chat, Codex code-generation, and terminal release journeys.
- Added regression coverage for long persistent-session socket paths and daemon RPC calls made inside the Tauri runtime.
- Expanded component, store, Playwright, and mobile/remote test coverage.

## Install

```bash
tar -xzf Ocean_0.2.0_aarch64.app.tar.gz
mv Ocean.app /Applications/
xattr -cr /Applications/Ocean.app
```

**Platform:** macOS (Apple Silicon)

---

*Ocean is the trust layer for coding agents. [Learn more](https://docs.getocean.dev)*
