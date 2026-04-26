# Ocean for Individual Developers

**One app for every AI agent. Stop context-switching. Start shipping.**

---

## The problem isn't the agents. It's the tooling around them.

You're already 2–3x faster with AI. Claude Code writes your refactors. Cursor handles the boilerplate. Aider drives the tests. Codex hammers out the one-off script. You've quietly built a personal development org of AI agents.

And you spend half your day doing their logistics.

- You have four terminals open and you can't remember which agent is in which.
- Two of them just edited the same file and now you have a merge conflict you didn't see coming.
- You want to hand a task from Claude to Aider, but Aider starts cold — no context of what Claude already decided.
- You finish three features in parallel, and you stare at your screen trying to figure out how to turn this into one clean PR.

iTerm, tmux, and VS Code were built before AI agents existed. They give you terminals, not agent workflows. The faster your agents get, the more this gap hurts.

## What Ocean gives you

**One app. Every agent. Zero interference.**

Ocean is a native desktop platform (macOS today, Windows and Linux coming soon) that puts every agent into an isolated, named session. You see them all at once — status, file changes, token spend, health. When they're done, you merge them, resolve anything that overlaps, and open a PR. One keystroke.

### What that looks like

| Scenario | Without Ocean | With Ocean |
|---|---|---|
| Spawn a new agent on a new branch | `git worktree add ../task-3 && cd ../task-3 && npm install` (3–5 min, ~2 GB disk) | `Cmd+T` (instant, ~KB disk) |
| See what three agents did | Tab between three terminals, read scrollback | One screen, three panes, status badges |
| Resolve a conflict between two agents' output | Manual 3-way diff in your editor | Built-in 3-way merge + one-click AI resolve |
| Turn three parallel experiments into one PR | `git rebase`, `git cherry-pick`, write PR description | `Cmd+Shift+S` |
| Know what your agent is doing right now | Grep the scrollback | Status bar + agent dashboard |

### How it works under the hood

- **Session DAG.** Every session is a node in a directed acyclic graph (`Cmd+Shift+G` opens the visualizer). Fork an agent off another agent's work, branch experiments, roll one back without touching the others. Your parallel work has a *shape*, and Ocean shows you that shape.
- **Copy-on-write isolation.** Each session gets an APFS clone of your repo. Spawning a new one takes milliseconds and costs kilobytes. Agents can't step on each other's files because they're each working on their own filesystem snapshot.
- **Auto-detection for 8+ agents.** Claude Code, Cursor, Aider, Codex, Copilot, Cody, Gemini CLI, Devin. Status badges, health metrics, waiting notifications — no configuration.
- **Claude Native (A2UI).** Claude's agents render interactive UI — buttons, cards, diffs, progress bars — inline in the terminal. No wrappers, no separate apps.
- **Real-time conflict detection.** When two sessions touch the same file, you see it immediately. Not at merge time. Not at PR time. Now.
- **Ship to PR.** `Cmd+Shift+S` merges your sessions, generates the commit, and opens the PR.
- **Session recording and replay.** Every session's terminal output, commands, and agent activity is captured. When an agent shipped a bug three days ago, you don't guess — you rewind.
- **Command palette (`Cmd+Shift+P`) and quick switcher (`Cmd+P`).** Every action is keyboard-reachable. Every open session is one fuzzy-match away.
- **Terminal annotations.** File paths, URLs, and errors in agent output become clickable. Stack traces jump straight to the line.
- **Plugin extensibility.** Three-tier plugin system (MCP servers, WASM modules, native Rust) lets you wire internal tools and custom agents into the same surface.

### The numbers

- **101 IPC commands** — every operation in Ocean is scriptable from your CLI or a plugin.
- **~65,000 lines** of Rust + TypeScript. Not a wrapper around something. A real platform.
- **2,937 tests** (977 Rust, 1,960 frontend) keep the internals honest.
- **~60 MB idle memory.** Lighter than VS Code. Lighter than most Electron terminals.
- **Local-first.** Nothing leaves your machine unless you ask it to.

## Pricing

Ocean is free during the beta. **If you download and use Ocean during the beta, you keep Ocean Platform free forever.** Not a trial. Not a teaser. Free forever for the people who show up early.

## Get it

- Download: [github.com/viveky259259/ocean-releases/releases](https://github.com/viveky259259/ocean-releases/releases)
- Docs: [viveky259259.github.io/ocean-releases](https://viveky259259.github.io/ocean-releases)

Ocean runs on macOS (Apple Silicon and Intel) today. Windows and Linux are on the roadmap.
