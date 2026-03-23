# Ocean for AI Developers

**Your terminal was built for humans typing commands. Your workflow isn't.**

---

You run Claude Code in one tab. Aider in another. A manual shell for git operations in a third. Maybe Cursor's agent mode in VS Code on the side. You're orchestrating 3-5 AI agents working on the same codebase — and your terminal has no idea.

Ocean was built for exactly this.

## The Problem You Already Feel

If you're using AI coding agents daily, you've hit these walls:

**Agents step on each other.** Two agents edit the same file. You only find out when `git merge` explodes. By then, both agents have built 50 lines on top of conflicting foundations, and you're spending 30 minutes untangling the mess.

**Worktrees are expensive.** The "safe" approach is one git worktree per agent. Each costs ~2GB of disk, needs its own `npm install`, causes port conflicts, and takes minutes to set up. For 4 agents, that's 8GB of duplicated state before you write a line of code.

**You can't see what's happening.** Which agent is stuck waiting for input? Which one finished? Is your laptop melting? You cycle through tabs, run `ps aux`, check `htop`, and lose 5 minutes of context every time.

**Terminal output is dead text.** An agent prints a file path — you copy-paste it into your editor. It prints an error — you copy-paste it back to the agent. In 2026, this is still the workflow.

## How Ocean Changes This

### Zero-Cost Filesystem Isolation

When you spawn a session in Ocean, it creates a copy-on-write (COW) overlay of your codebase. Not a full copy — just a thin delta layer that stores only what changes. A new session costs kilobytes, not gigabytes. It spawns in milliseconds, not minutes.

```
Traditional workflow:
  git worktree add ../agent-1    → 2GB, 3 minutes, npm install
  git worktree add ../agent-2    → 2GB, 3 minutes, npm install
  Total: 4GB disk, 6 minutes

Ocean workflow:
  Spawn child session (Cmd+N)    → ~50KB, instant
  Spawn another (Cmd+N)          → ~50KB, instant
  Total: ~100KB disk, <1 second
```

Dependencies like `node_modules/` are shared read-only across all sessions. No duplication. No reinstalls.

### Real-Time Conflict Detection

Because Ocean controls the filesystem layer, it knows the moment two sessions modify the same file — not at merge time, but *as it happens*.

Conflicts are classified by severity:
- **Diverged** — Both modified the file, but in different sections. Auto-mergeable.
- **Overlapping** — Edits touch nearby lines. Needs attention.
- **Conflicting** — Same lines modified. Requires resolution.

You see this in real-time as colored badges on each session pane. No surprises at merge time.

### Agent-Aware Terminal

Ocean detects AI agents automatically — Claude Code, Codex, Aider, Cursor, Copilot, Cody, Gemini, Devin. Each gets a colored badge in the pane header. The Agent Dashboard (Cmd+Shift+J) shows all agents across all workspaces with their lifecycle state.

```
┌─────────────────────────┬─────────────────────────┐
│ ● claude  auth-module   │ ● aider  test-suite     │
│ ⚡ High | Opus 4.6      │ ⚡ Med  | Sonnet 4.6    │
│ ~/project $             │ ~/project $             │
│ Working on login flow...│ Writing unit tests...   │
├─────────────────────────┴─────────────────────────┤
│ ● shell  manual                                   │
│ ~/project $ git status                            │
└───────────────────────────────────────────────────┘
```

### Interactive Output

Every file path, URL, error, and stack trace in terminal output is clickable. Click a file path to open it. Click an error to trigger an agent fix. Right-click for context actions. No more copy-paste gymnastics.

### Session DAG — Think in Tasks, Not Tabs

Ocean organizes work as a directed acyclic graph (DAG). A workspace represents a task. Sessions within it represent parallel work streams. Child sessions inherit their parent's code state. When work is done, you merge it back.

```
Workspace: "Auth Refactor"
├── base (main branch snapshot)
├── Session 1: Claude → login flow
│   ├── Session 1a: Claude → OAuth integration
│   └── Session 1b: Aider → login tests
├── Session 2: Cursor → signup flow
└── Session 3: manual shell → monitoring
```

This replaces the mental overhead of managing branches, worktrees, and merge conflicts with a visual, intuitive model.

### Ship to Git in One Command

When you're done, **Cmd+Shift+S** translates your Session DAG back to git:
- Each session becomes a commit with agent metadata in trailers
- The workspace becomes a PR with full DAG context in the body
- Clean, reviewable git history — even though 4 agents worked in parallel

## Claude Context Management — Built In

Ocean includes a visual settings panel for configuring Claude Code context. No more CLI flags and manual CLAUDE.md editing:

- **Model selector** — Switch between Opus, Sonnet, and Haiku visually
- **Effort level** — Dial from Low to Max with one click
- **Session limits** — Set max turns and budget per session
- **CLAUDE.md editor** — Edit your project context inline with token count
- **Permission mode** — Choose how much autonomy Claude gets

All of this previously required CLI knowledge. Ocean makes it point-and-click.

## What Ocean Is Not

Ocean is not an IDE. It doesn't replace VS Code or Cursor. It's your terminal — but built for how you actually work in 2026: orchestrating AI agents, monitoring parallel execution, and shipping code that multiple agents wrote simultaneously.

## Get Started

1. Download from the [Releases page](https://github.com/viveky259259/ocean-releases/releases)
2. Create a workspace linked to your repo
3. Spawn child sessions for each agent
4. Watch conflicts get caught in real-time
5. Ship to PR when everything converges

---

*Ocean is open-source, local-first, and runs entirely on your machine. No cloud dependency. No telemetry unless you opt in. No lock-in.*
