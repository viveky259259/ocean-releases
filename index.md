# Ocean Documentation

**Ocean** is a desktop terminal built for developers who work with AI coding agents. It organizes your terminal sessions into workspaces, tracks what each agent is doing, and gives you split panes, git integration, and command history — all in one window.

---

## Installation

### macOS (Apple Silicon)

1. Download the latest release from the [Releases page](https://github.com/viveky259259/ocean-releases/releases)
2. Extract the archive:
   ```bash
   tar -xzf Ocean_*_aarch64.app.tar.gz
   ```
3. Move `Ocean.app` to your Applications folder:
   ```bash
   mv Ocean.app /Applications/
   ```
4. On first launch, macOS may block the app. Open **System Settings > Privacy & Security** and click **Open Anyway**, or run:
   ```bash
   xattr -cr /Applications/Ocean.app
   ```
5. Double-click `Ocean.app` to launch

---

## Getting Started

When Ocean launches, you'll see a single terminal session in the **Default** workspace.

### The Interface

```
┌──────────────────────────────────────────────────────┐
│  NetworkIndicator   SystemMetrics         GitStatus  │  Status Bar
├──────────┬───────────────────────────────────────────┤
│ SESSIONS │  ● Shell 1                                │  Pane Header
│          │                                           │
│ Default  │  ~ $                                      │  Terminal
│ ● Shell 1│                                           │
│ ● Shell 2│                                           │
│          │                                           │
│ Settings │                                           │
├──────────┴───────────────────────────────────────────┤
│ docker ● │ flutter ● │ node ●                        │  Connectors
└──────────────────────────────────────────────────────┘
```

- **Sidebar** (left): Workspaces and sessions
- **Terminal area** (center): Active terminal panes
- **Status bar** (top): System metrics, network, git info
- **Connector bar** (bottom): Detected dev tools

---

## Sessions

Sessions are individual terminal instances, each running its own shell process.

| Action | Shortcut |
|--------|----------|
| New session | **Cmd+T** |
| Spawn child session | **Cmd+N** |
| Close session | **Cmd+W** |
| Switch tabs | **Cmd+1** through **Cmd+9** |
| Previous / next tab | **Cmd+[** / **Cmd+]** |

- **Rename**: Double-click the session name in the sidebar
- **Closed sessions**: Move to the **Closed** section. Click to view scrollback history.

---

## Split Panes

Work on multiple things side by side within the same tab.

| Action | Shortcut |
|--------|----------|
| Split vertical (side by side) | **Cmd+D** |
| Split horizontal (stacked) | **Cmd+Shift+D** |

### Sidebar Indicators

Sessions sharing a split show direction-aware badges:

| Badge | Meaning |
|-------|---------|
| **┃2** | 2 panes side by side (vertical) |
| **━2** | 2 panes stacked (horizontal) |
| **┼3** | 3+ panes, mixed layout |

### Resizing

- Drag the divider between panes
- Click **⇔** in the pane header to auto-resize to your configured width
- Up to **5 panes** per tab

---

## Workspaces

Workspaces group sessions under a project.

- **WS** button: Create a blank workspace
- **Repo** button: Create a workspace linked to a git repository

### Repo Workspaces

When linked to a git repo, workspaces show:
- Branch name, ahead/behind counts in the pane header
- Staged, modified, and untracked file counts
- Ship to PR capability (**Cmd+Shift+S**)

---

## Keyboard Shortcuts

### Essential

| Shortcut | Action |
|----------|--------|
| **Cmd+T** | New session |
| **Cmd+W** | Close session |
| **Cmd+D** | Split vertical |
| **Cmd+Shift+D** | Split horizontal |
| **Cmd+1-9** | Switch tabs |
| **Cmd+P** | Quick session switcher |
| **Cmd+Shift+P** | Command palette |
| **Cmd+B** | Toggle sidebar |
| **Cmd+,** | Settings |

### Git

| Shortcut | Action |
|----------|--------|
| **Cmd+G** | Git panel |
| **Cmd+Shift+V** | Git visualizer |
| **Cmd+Shift+S** | Ship to PR |

### Panels

| Shortcut | Action |
|----------|--------|
| **Cmd+Shift+H** | Terminal history |
| **Cmd+Shift+E** | Snippet library |
| **Cmd+Shift+G** | Session DAG view |
| **Cmd+Shift+J** | Agent dashboard |
| **Cmd+Shift+N** | Notifications |
| **Cmd+Shift+L** | Activity timeline |
| **Cmd+Shift+A** | API inspector |
| **Cmd+K** | Toggle connectors |

All shortcuts are searchable in **Settings > Commands** tab.

---

## Command Palette

**Cmd+Shift+P** opens the command palette — a searchable list of every command, shortcut, and saved snippet.

**Cmd+P** opens the quick switcher to jump to any session by name.

---

## Terminal History

**Cmd+Shift+H** opens the history panel showing commands across all sessions.

- Type to search
- **Enter** to re-run a command
- Exit codes shown: **✓** success, **✗** failure with code

---

## Snippet Library

**Cmd+Shift+E** opens the snippet library for saved commands.

- **Name**: Descriptive label
- **Command**: Shell command (supports `${variable}` templates)
- **Category**: general, dev, git, docker, etc.

Run snippets from the library or from the command palette.

---

## AI Agent Detection

Ocean detects AI coding agents running in your sessions:

**Claude** | **Codex** | **Aider** | **Cursor** | **GitHub Copilot** | **Cody** | **Gemini** | **Devin**

Detected agents show a colored badge in the pane header. View all agents in the Agent Dashboard (**Cmd+Shift+J**).

---

## Git Visualizer

**Cmd+Shift+V** opens the Git Visualizer showing:
- Staged, modified, and untracked files
- File diffs
- Staging controls

---

## Settings

Open with **Cmd+,** or the gear icon in the sidebar.

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-resize width | Target width for split pane auto-resize | 800px |
| Auto-resize height | Target height for horizontal splits | 400px |
| Claude Code Native | Show Claude Code indicator at top of app | Off |

---

## Articles

Understand Ocean from the perspective that matters to you:

| Article | For | What You'll Learn |
|---------|-----|-------------------|
| [Ocean for AI Developers](articles/ocean-for-ai-developers.md) | Developers using Claude, Aider, Cursor | COW isolation, conflict detection, agent workflow, Claude context UI |
| [Ocean for Architects](articles/ocean-for-architects.md) | Tech leads & solution architects | 24 problems solved, system architecture, security model, performance budgets |
| [Ocean for Product Managers](articles/ocean-for-product-managers.md) | Non-technical stakeholders | Business impact, team visibility, cost comparison, ROI |
| [Ocean for Enterprises](articles/ocean-for-enterprises.md) | IT, security & engineering leadership | Governance, audit trail, managed config, deployment, ROI framework |

---

## Use Cases

### Multi-Agent Development

Run Claude Code in one pane, Aider in another, and a manual shell in a third. Ocean tracks each agent with status badges.

```
┌────────────────┬────────────────┐
│ ● Claude Code  │ ● Aider        │
│ Working on     │ Refactoring    │
│ auth module... │ tests...       │
├────────────────┴────────────────┤
│ ● Shell                         │
│ ~/project $ git status          │
└─────────────────────────────────┘
```

### Microservice Development

Create a workspace per service. Each workspace holds sessions for servers, logs, and tests.

```
▼ API Service       3 sessions
  ● Server  ● Tests  ● Logs
▼ Frontend          2 sessions
  ● Dev Server  ● Build
▼ Database          1 session
  ● Migrations
```

### Feature Branch Workflow

1. Create a repo workspace (click **Repo**)
2. Split panes for code + tests
3. Monitor git status in pane headers
4. Review changes in Git Visualizer (**Cmd+Shift+V**)
5. Ship to PR (**Cmd+Shift+S**)

### Debugging with History

1. Run your failing command
2. Open history (**Cmd+Shift+H**) to find previous runs
3. Compare exit codes and timing
4. Click to re-run from history

---

## Data and Privacy

| What | Where | Shared? |
|------|-------|---------|
| Sessions and history | Local on your machine | Never |
| Settings | Local on your machine | Never |
| Terminal content | Never collected | Never |
| Crash reports | Optional, anonymous | Only if you opt in |

Ocean runs entirely on your machine. No terminal content or commands leave your device.

---

## Troubleshooting

**App won't open on macOS**
```bash
xattr -cr /Applications/Ocean.app
```

**Terminal shows blank screen**
Quit and relaunch the app. If it persists, delete `~/.ocean/ocean.db` and restart.

**Sessions missing after restart**
Ocean respawns sessions automatically. If a session's directory was deleted, it won't respawn. Create a new session with **Cmd+T**.

**Shortcut not working**
Open **Cmd+Shift+P** and search for the action. Some shortcuts may conflict with macOS system shortcuts.

---

## Downloads

Get the latest version from the [Releases page](https://github.com/viveky259259/ocean-releases/releases).

| Version | Date | Highlights |
|---------|------|------------|
| v0.6.0 | 2026-03-22 | Git Visualizer, split indicators, 16 bug fixes |
| v0.5.0 | 2026-03-21 | Ocean Sync backend, settings improvements |
