# Ocean

**Terminal for Agentic Development**

Ocean is a desktop terminal built for developers working with AI coding agents. Run multiple agents in isolated sessions, resolve conflicts automatically, and ship clean PRs.

## Websites

| Site | URL | Purpose |
|------|-----|---------|
| Main website | [getocean.dev](https://getocean.dev) | Marketing landing page — features, waitlist |
| Vision | [getocean.dev/vision.html](https://getocean.dev/vision.html) | Mission & long-term thinking |
| Feature blog | [getocean.dev/articles.html](https://getocean.dev/articles.html) | Feature highlights & release announcements |
| Technical docs | [docs.getocean.dev](https://docs.getocean.dev) | Documentation for external users |
| Full Reference | [docs.getocean.dev](https://docs.getocean.dev) | Full developer reference (install, API, architecture) |

## Waitlist

**[Join the waitlist](https://forms.gle/4RQFThD8KF6Vu1Su6)** for early access.

## Download

Latest release: **v0.15.0** (July 3, 2026).

Download the latest release from the [Releases page](https://github.com/Ocean-AI-Platform/ocean-releases/releases).

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | [Ocean.app.tar.gz](https://github.com/Ocean-AI-Platform/ocean-releases/releases/latest) |

## Features

### Multi-Session Terminal
- Split panes (vertical + horizontal), up to 5 per tab
- Workspace management with git repo integration
- COW filesystem isolation per session (APFS clonefile)
- Session DAG visualization (parent-child hierarchy)
- Session timeline and activity tracking

### Conflict Resolution
- 3-way merge engine with per-hunk resolution (Accept A/B/Both/Base/Edit)
- AI-assisted merge via Claude API with confidence scoring
- Real-time conflict detection with severity classification
- Pre-conflict warnings when multiple sessions edit the same file
- Merge queue with recommended order based on complexity
- Advisory file locks, session stash, replay merge
- Session dependency graph with cycle detection
- File activity heatmap and health dashboard

### Git Integration
- Git visualizer with staging panel
- Auto-commit with smart message generation after merge
- Ship to PR (multi-session to single PR via GitHub CLI)
- Branch-per-session auto-creation

### Developer Tools
- AI agent detection (Claude, Codex, Aider, Cursor, Copilot, Cody, Gemini, Devin)
- Command palette and keyboard-driven workflow
- Session recording and command history
- Snippet library with variables and shortcuts
- Terminal output annotations (file paths, URLs, errors)
- API inspector, debug console, audit log

### Infrastructure
- Port forwarding with Bore/Cloudflared tunneling
- Connector detection (Docker, Flutter, Node)
- System/network/process monitoring
- Crash reporting and observability

## License

Private software. All rights reserved.
