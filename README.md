# Ocean

**Terminal for Agentic Development**

Ocean is a desktop terminal built for developers working with AI coding agents. Run multiple agents in isolated sessions, resolve conflicts automatically, and ship clean PRs.

## Waitlist

**[Join the waitlist](https://forms.gle/4RQFThD8KF6Vu1Su6)** for early access. Or visit the waitlist site at **[joinocean.web.app](https://joinocean.web.app)**.

## Documentation

Read the full developer documentation at **[viveky259259.github.io/ocean-releases](https://viveky259259.github.io/ocean-releases)**

## Download

Download the latest release from the [Releases page](https://github.com/viveky259259/ocean-releases/releases).

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | [Ocean.app.tar.gz](https://github.com/viveky259259/ocean-releases/releases/latest) |

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
