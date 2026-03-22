# Ocean -- Product Requirements Document

**Version:** 1.0
**Date:** March 15, 2026
**Status:** Draft
**Author:** Ocean Team

---

## 1. Executive Summary

Ocean is a next-generation terminal and control plane purpose-built for agentic and vibe coding workflows. Where traditional terminals assume a single human typing commands, Ocean is architected around the reality of modern AI-assisted development: multiple autonomous agents executing in parallel, producing rich output, and modifying shared codebases simultaneously. Ocean introduces the Session DAG -- a directed acyclic graph where spawning a session forks the codebase via copy-on-write and completing a session merges it back -- replacing the expensive, brittle pattern of git worktrees with zero-cost filesystem isolation, real-time conflict detection, and a clean translation layer back to git. Built on Tauri v2, Rust, SolidJS, and xterm.js, Ocean is open-source, local-first, and designed to be the definitive orchestration surface for the agentic development era.

---

## 2. Problem Statement

The terminal is the most-used developer tool, yet it has not evolved for the paradigm shift happening in software development. Today's developers routinely orchestrate 3-5 AI agents (Claude Code, Cursor, Aider, build servers, dev tools) working in parallel on a single codebase. The existing terminal ecosystem fails them in five specific ways:

**2.1 No native concept of parallel agent work.** Terminals think in tabs and panes. Agentic coding thinks in tasks that span multiple sessions, processes, and agents. Developers resort to tmux hacks (Claude Squad) or proprietary cloud wrappers (Warp Oz) to manage this complexity.

**2.2 Catastrophically expensive isolation.** When two agents need to modify the same codebase, the standard approach is git worktrees -- each costing ~2GB of disk, requiring separate `npm install` runs, causing port conflicts, and detecting merge conflicts only after the fact. For a developer running four agents, that is 8GB of duplicated state and minutes of setup per session.

**2.3 Terminal output is inert text.** In 2026, developers still cannot reliably click a file path in terminal output to open it, click a URL to navigate to it, or click an error to trigger an AI fix. Every actionable piece of information requires manual copy-paste.

**2.4 Zero ambient awareness.** Git status, system health, network connectivity, agent lifecycle state -- all of these require explicit commands to query. Developers context-switch constantly to check whether an agent is stuck, whether CI passed, or whether their laptop is running out of memory.

**2.5 No rich agent-to-human communication channel.** Agents can only communicate via plain text stdout. There is no protocol for agents to render tables, forms, charts, or interactive widgets inline in the terminal. Google's A2UI protocol (v0.8) defines exactly this, but no terminal supports it.

These problems compound. A developer orchestrating four agents spends more time monitoring, navigating, and context-switching than the agents spend doing useful work. The cognitive overhead of multi-agent development is the bottleneck, not the agents themselves.

---

## 3. Vision

**12-month end state:** Ocean is the default terminal for developers who use AI agents as part of their daily workflow. It is recognized as the first terminal built for the agentic era -- not through marketing, but because it solves problems no other terminal addresses. Developers launch Ocean, create a workspace for their task, spawn agents that each get instant, zero-cost isolated filesystems, monitor all activity through ambient status indicators, interact with rich agent output via A2UI components, and ship clean git commits and PRs with a single command. The Session DAG becomes the standard mental model for how parallel agent work is organized, and Ocean's interactive output protocol is adopted by agent frameworks as the way to communicate with humans.

---

## 4. Target Users

### Persona 1: The Vibe Coder

| Attribute | Detail |
|-----------|--------|
| **Profile** | Solo developer or small-team lead, uses Claude Code or Cursor daily, runs 2-4 agents simultaneously on personal projects or startup codebases |
| **Pain points** | Loses track of what each agent is doing; agents step on each other's changes; spends 10+ minutes setting up worktrees per session; can't tell at a glance if an agent is stuck waiting for input |
| **How Ocean helps** | Session DAG organizes agents by task, not by tab. COW isolation means spawning a new agent takes milliseconds and costs kilobytes. Agent heartbeat indicators and smart notifications surface exactly when human attention is needed. |

### Persona 2: The Full-Stack / Mobile Developer

| Attribute | Detail |
|-----------|--------|
| **Profile** | Flutter, React Native, or full-stack developer who runs app servers, dev tools, emulators, log watchers, and AI agents simultaneously across multiple terminal windows |
| **Pain points** | Juggles 6+ terminal windows with no sense of which processes are related; misses errors buried in log output; manually checks if the dev server is still running; can't see system resource usage without opening Activity Monitor |
| **How Ocean helps** | Parallel execution connectors auto-detect and visualize related processes (Flutter app, DevTools, adb). Interactive output makes every error clickable. Status bar shows RAM, CPU, and network at a glance. Session tree groups everything by task. |

### Persona 3: The Power Engineer

| Attribute | Detail |
|-----------|--------|
| **Profile** | Senior or staff engineer at a mid-to-large company, uses the terminal as their primary development environment, cares deeply about performance, correctness, and keyboard-driven workflows |
| **Pain points** | Existing "AI terminals" (Warp) are cloud-first and proprietary; tmux is powerful but ugly and requires too much manual configuration; wants a fast, minimal terminal that stays out of the way until orchestration features are needed |
| **How Ocean helps** | Progressive disclosure: Ocean looks and feels like a great terminal by default (fast, GPU-accelerated, keyboard-driven). Orchestration features reveal themselves on demand. Open-source and local-first -- no cloud dependency, no telemetry, no lock-in. |

---

## 5. Product Principles

1. **Tasks, not tabs.** Sessions are grouped by what the developer is working on, not by when they were opened. The organizational unit is the workspace (a task or goal), not the window.

2. **Sessions are code state.** Spawning a session forks the codebase. Completing a session merges it back. The Session DAG is the version graph for the agentic working phase -- git handles collaboration and permanence.

3. **Ambient awareness.** Git status, system health, network state, and agent status are always visible and always current. Developers never need to run a command to check the state of their environment.

4. **Output is interactive.** Every file path, URL, error, stack trace, and actionable element in terminal output is clickable and offers context-appropriate actions. Terminal output is a surface for interaction, not just display.

5. **Agents are first-class.** Agent sessions have lifecycle management, heartbeat monitoring, semantic relationships to other sessions, and dedicated filesystem isolation. Agents are not an afterthought bolted onto a human-first terminal.

6. **Progressive disclosure.** Simple by default -- Ocean looks and behaves like a great, fast terminal. Powerful on demand -- the full orchestration surface (DAG view, connectors, A2UI, conflict detection) reveals itself when needed.

---

## 6. Core Value Proposition

Ocean's differentiation rests on six capabilities that no existing terminal provides:

### 6.1 Session DAG as Code State

The Session DAG is Ocean's central primitive. Each session has both a terminal and a filesystem layer. Spawning a child session forks the parent's code state via copy-on-write. The DAG is simultaneously the session graph, the version graph, and the isolation layer. This replaces the entire git-worktree-per-agent pattern with a unified model.

### 6.2 Zero-Cost Isolation

Each session's filesystem is a lightweight COW (copy-on-write) overlay that stores only modified files. A new session costs kilobytes of disk and spawns in milliseconds -- compared to gigabytes and minutes for a git worktree. Dependencies like `node_modules/` are shared read-only across all sessions, eliminating duplication entirely.

| Dimension | Git Worktrees | Session DAG + COW |
|-----------|---------------|---------------------|
| Isolation cost | Full directory copy (~2GB) | Only deltas (~KB-MB) |
| Setup time | `git worktree add` + `npm install` (minutes) | Instant (COW overlay, shared deps) |
| Conflict detection | At merge time (too late) | Real-time, as writes happen |
| Dependency handling | Separate per worktree | Shared base (read-only) |
| Cleanup | Manual `git worktree remove` | Session ends, delta discarded or promoted |

### 6.3 Real-Time Conflict Detection

Because Ocean controls the filesystem layer, it knows the moment two sessions modify the same file -- before merge, before commit, as it happens. Conflicts are classified by severity (disjoint, overlapping, conflicting) and surfaced with actionable options: pause an agent, show side-by-side diffs, or merge immediately.

### 6.4 Interactive Output

A real-time pattern recognition engine parses terminal output and annotates file paths, URLs, errors, stack traces, git refs, network addresses, test results, and container IDs. Each annotation is clickable, with hover tooltips, primary actions (click), secondary actions (Cmd+Click), and context menus (right-click).

### 6.5 A2UI (Agent-to-UI) Rendering

Ocean is the first terminal to natively render A2UI components -- Google's declarative JSON protocol for agent-to-human UI. Agents emit A2UI JSON via a terminal escape sequence, and Ocean renders tables, forms, buttons, charts, diffs, and more as native interactive components inline in the terminal buffer.

### 6.6 Ambient Awareness

A persistent status bar displays system metrics (RAM, CPU, battery), network state (connectivity, latency to GitHub/npm), git status (branch, ahead/behind, CI, PR state), and agent health (active, idle, waiting, errored, done) -- all updating in real time without any user action.

---

## 7. Feature Requirements

### P0 -- Must Have for V1

These features define the minimum viable product. Without them, Ocean is not shippable.

| ID | Feature | Description |
|----|---------|-------------|
| P0-1 | **Session DAG with COW filesystem** | Workspace creation snapshots repo state. Session spawn creates COW overlay. Child sessions stack on parent deltas. macOS via NFS loopback + SQLite delta tracking; Linux via OverlayFS with FUSE fallback. Shared read-only mounts for `node_modules/` and equivalent. |
| P0-2 | **Interactive terminal output** | Real-time output annotator detecting file paths, URLs, errors/stack traces, git refs, and network addresses. Click, hover, and context-menu interactions. Annotation overlay rendered on top of xterm.js. |
| P0-3 | **Status bar** | Persistent top bar with four sections: network status, system metrics (RAM/CPU with visual bars), git status (branch, ahead/behind, staged/modified counts, CI status), and agent status (per-agent lifecycle indicators). All updating in real time. |
| P0-4 | **Session tree sidebar** | Left sidebar showing workspaces and their session trees. Per-session status indicators (active, idle, waiting, failed, completed, archived). Delta indicators showing number of modified files. Collapse/expand workspaces. Click to focus session. |
| P0-5 | **Core terminal functionality** | PTY management via portable-pty in Rust. xterm.js with WebGL renderer. Tab and pane splitting. Shell integration. Scrollback buffer persistence. Session state preserved across app restarts (via SQLite). |
| P0-6 | **Basic keyboard shortcuts** | Cmd+T (new session), Cmd+Shift+T (new workspace), Cmd+N (spawn child), Cmd+W (close session), Cmd+1-9 (switch session), Cmd+P (quick switcher), Cmd+Shift+P (command palette), Cmd+[/] (navigate tree). |

### P1 -- Should Have for V1

These features deliver the full vision. They should ship with V1 if timeline permits, but V1 can launch without them if necessary.

| ID | Feature | Description |
|----|---------|-------------|
| P1-1 | **A2UI rendering** | Parse A2UI escape sequences from agent output. Render core A2UI components inline: Text, Button, Table (sortable/filterable), Form, Card, ProgressBar, CodeBlock, Diff, Tree. Ocean-specific extensions: SessionLink, ProcessStatus, GitWidget. User interactions sent back to agent via stdin or WebSocket side-channel. |
| P1-2 | **Parallel execution connectors** | Auto-detect related processes via port scanning and process tree analysis. Built-in connector types: Flutter, Node.js, Docker, Kubernetes. Visual connector bar showing process relationships, health, and aggregated resource usage. Click-to-focus, kill-group, merged log view. |
| P1-3 | **Git translation layer** | Session delta to git commit translation with agent metadata in commit trailers. Workspace to PR creation with DAG context in PR body. "Ship workspace" command: merge all sessions, commit, push, create PR. |
| P1-4 | **Graph view** | Full-screen DAG visualization (Cmd+Shift+G) showing all workspaces and sessions, their relationships (spawned, linked, depends), status indicators, delta sizes, and conflict indicators. Click any node to focus its session. |
| P1-5 | **Conflict detection UI** | Real-time conflict alerts with severity classification. Side-by-side diff viewer for overlapping changes. Action buttons: pause agent, let both continue, merge now. Conflict history in workspace view. |
| P1-6 | **Inline git integration** | Toggleable git panel (Cmd+G) showing branch, PR state, staged/modified files with inline actions (stage, unstage, diff, revert, commit, push, pull). File-level git awareness in terminal output (modified/new/deleted indicators on file paths). |

### P2 -- Nice to Have / V2

These features are explicitly deferred from V1 to manage scope. Architecture should accommodate them.

| ID | Feature | Description |
|----|---------|-------------|
| P2-1 | **Plugin system** | Extension API for custom connectors, output patterns, A2UI components, and status bar widgets. Plugin marketplace. |
| P2-2 | **Remote sessions (SSH)** | Session model extended to support remote hosts. PTY over SSH with local Ocean UI. Remote COW isolation. |
| P2-3 | **Team collaboration** | Shared workspaces, session sharing, real-time collaborative terminal viewing, team-visible agent status. |
| P2-4 | **Cloud agent orchestration** | Spawn and manage cloud-hosted agents from Ocean. Resource allocation, cost tracking, multi-region support. |
| P2-5 | **Custom themes and branding** | Theming engine for colors, fonts, and layout customization. |
| P2-6 | **Mobile companion app** | View agent status and workspace health from a mobile device. Push notifications for agent state changes. |

---

## 8. Success Metrics

### Adoption Metrics

| Metric | V1 Target (6 months post-launch) | Measurement |
|--------|-----------------------------------|-------------|
| GitHub stars | 5,000 | GitHub API |
| Weekly active users (WAU) | 2,000 | Opt-in anonymous telemetry |
| Daily active users (DAU) | 500 | Opt-in anonymous telemetry |
| Community contributors | 50 | GitHub contributor count |
| Homebrew installs | 3,000 | Homebrew analytics |

### Performance Benchmarks

| Metric | Target | Rationale |
|--------|--------|-----------|
| App launch to usable terminal | < 500ms | Must feel instant; competitive with Ghostty/iTerm2 |
| Session spawn (with COW overlay) | < 100ms | Must be imperceptibly fast; replaces minutes-long worktree setup |
| Memory usage (idle, single session) | < 80MB | Tauri target: 30-60MB base; must not balloon |
| Memory per additional session | < 15MB | Sessions should be cheap to keep open |
| Output annotation latency | < 1ms per line | Must not cause visible lag in terminal output rendering |
| Status bar update latency | < 200ms from state change | Ambient awareness requires near-real-time |
| COW delta storage overhead | < 1MB per session (typical) | Must justify "zero-cost" claim |

### User Workflow Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Average sessions per workspace | > 3 | Indicates DAG adoption vs. single-terminal usage |
| Conflict detection usage | > 30% of multi-agent workspaces trigger at least one alert | Validates real-time conflict detection value |
| Interactive output click-through rate | > 15% of annotated elements clicked | Validates that annotations are useful, not noisy |
| Git translation adoption | > 50% of completed workspaces use "ship workspace" | Validates translation layer value |
| Session spawn method | > 40% via "spawn child" (vs. new standalone) | Indicates DAG-native workflow adoption |

---

## 9. Non-Goals

Ocean has a clear scope. The following are explicitly out of scope:

- **Ocean is not an IDE.** It does not provide code editing, IntelliSense, debugging, or project management. It is a terminal. Developers use their editor of choice alongside Ocean.

- **Ocean is not a code editor.** While interactive output and A2UI enable rich display of code (diffs, syntax-highlighted blocks), Ocean does not support editing code within its interface.

- **Ocean is not a CI/CD tool.** Ocean shows CI status (via git integration) and can trigger builds, but it does not define, manage, or execute CI/CD pipelines.

- **Ocean is not replacing git for collaboration.** The Session DAG manages the chaotic working phase of agentic development. Git remains the source of truth for version history, code review, and team collaboration. Ocean translates its internal state to git, not the other way around.

- **Ocean is not a cloud platform.** V1 is local-first with no cloud dependency. There is no account, no SaaS, no remote execution. Cloud agent orchestration is a V2 concern.

- **Ocean is not agent-specific.** Ocean does not bundle or prefer any particular AI agent. It detects and manages agents generically via process monitoring. It works with Claude Code, Cursor, Aider, Copilot, or any agent that runs as a process.

---

## 10. Competitive Landscape

| Capability | Ocean | WaveTerm | Warp | Ghostty | iTerm2 | Claude Squad |
|------------|-------|----------|------|---------|--------|--------------|
| **Architecture** | Tauri + Rust + SolidJS | Electron + Go | Rust (proprietary) | Zig, GPU-native | macOS native (Obj-C) | tmux wrapper (Go) |
| **Session model** | Session DAG with COW filesystem | Block-based layout | Blocks with AI | Tabs/splits | Tabs/splits/tmux | tmux sessions |
| **Code isolation** | COW overlays (~KB per session) | None | None | None | None | Git worktrees (~GB each) |
| **Conflict detection** | Real-time, as writes happen | None | None | None | None | None (merge-time only) |
| **Interactive output** | Pattern engine + clickable annotations | Block-based widgets | AI command suggestions | Minimal (URLs only) | Clickable URLs | None |
| **A2UI support** | Native rendering (V1) | None | None | None | None | None |
| **Agent awareness** | First-class: lifecycle, heartbeat, status | AI chat sidebar | Warp AI (proprietary) | None | None | Agent list with status |
| **Ambient status** | System + git + network + agents | Partial (system info) | AI-focused | None | None | None |
| **Git integration** | Ambient + translation layer (DAG to commits/PRs) | None | None | None | None | Basic (worktree management) |
| **Process connectors** | Auto-detected, visual, with health monitoring | None | None | None | None | None |
| **Open source** | Yes | Yes | No | Yes | Yes (GPL) | Yes |
| **Local-first** | Yes | Yes | No (cloud features) | Yes | Yes | Yes |
| **Memory footprint** | ~60MB (Tauri) | ~300MB+ (Electron) | ~150MB | ~30MB | ~100MB | Depends on tmux |
| **Platform** | macOS, Linux (V1); Windows (V2) | macOS, Linux, Windows | macOS, Linux | macOS, Linux | macOS only | macOS, Linux |

**Key differentiators vs. each competitor:**

- **vs. WaveTerm:** Ocean's Session DAG with COW isolation is a fundamentally different paradigm from WaveTerm's block layout. Ocean is 5x lighter (Tauri vs. Electron) and has real-time conflict detection.
- **vs. Warp:** Ocean is open-source and local-first. Warp's agent features (Oz) require cloud; Ocean's work entirely offline. Session DAG gives Ocean structural advantages for multi-agent orchestration.
- **vs. Ghostty:** Ghostty is the fastest minimal terminal. Ocean builds orchestration on top of that class of performance (potential libghostty integration path). Ghostty users who adopt agent workflows are Ocean's target converts.
- **vs. iTerm2:** iTerm2 is mature and stable but architecturally stuck in the pre-agent era. Ocean is a generational leap in what a terminal can do.
- **vs. Claude Squad:** Claude Squad proves the demand for multi-agent terminal orchestration. Ocean replaces the tmux+worktree approach with native UI, visual DAG, COW isolation, and real-time conflict detection.

---

## 11. Risks and Mitigations

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| 1 | **COW filesystem complexity on macOS.** macOS lacks native OverlayFS. The NFS loopback approach (used by AgentFS) works but adds implementation complexity and potential edge cases with file locking, permissions, and filesystem events. | High | Medium | Prototype the NFS loopback layer in weeks 1-2 as a standalone spike. Validate with real-world repos (monorepo, Flutter project, Node.js app). Maintain a FUSE fallback path. SQLite delta tracking provides an auditable, debuggable layer. Cap overlay depth at 3-4 levels with auto-flatten. |
| 2 | **Adoption inertia.** Developers are deeply habitual about their terminal. Switching from iTerm2/Ghostty/Warp requires a compelling reason, and "better for agents" may not be enough until agent usage is truly mainstream. | High | Medium | Ship Ocean as a great terminal first (P0 features make it competitive even without agent workflows). Progressive disclosure ensures non-agent users get value from interactive output, ambient git, and status bar. Target the Claude Code and Cursor communities specifically -- they already feel the pain. |
| 3 | **A2UI protocol instability.** A2UI is at v0.8. Google may change the spec, deprecate components, or the protocol may fail to gain agent-framework adoption. | Medium | Medium | Abstract the A2UI renderer behind a versioned interface. Pin to a specific A2UI version at launch. Design Ocean-specific A2UI extensions as a superset. If A2UI fails to gain traction, Ocean's native extensions become the de facto standard for agent-to-terminal UI. |
| 4 | **Performance regression at scale.** With many concurrent sessions (10+), each with COW overlays, file watchers, and real-time conflict detection, system resource consumption could become problematic. | Medium | Low | Establish performance budgets from day one (see Section 8). Profile under load early (Phase 4 testing). Use kqueue/inotify for file watching (not polling). Batch conflict detection checks. Implement session hibernation for idle workspaces. |
| 5 | **Scope creep delays V1.** The feature surface is large. Attempting to ship all P0 and P1 features simultaneously risks slipping the timeline and never reaching users. | Medium | High | Strict P0/P1/P2 prioritization enforced at every sprint. V1 ships when P0 is complete and stable, regardless of P1 status. P1 features ship as incremental updates. Weekly milestone reviews with clear go/no-go criteria. The terminal must be usable and valuable at every phase of the roadmap. |

---

## 12. Timeline

The implementation roadmap spans 30 weeks across six phases. Each phase produces a working, testable deliverable.

| Phase | Weeks | Duration | Focus | Deliverable |
|-------|-------|----------|-------|-------------|
| **1. Foundation** | 1-6 | 6 weeks | Core terminal + session tree | Working terminal app with Tauri v2 + SolidJS + xterm.js (WebGL), PTY management in Rust, basic session model (create, close, list), session sidebar with tree view, tab/pane splitting, and keyboard shortcuts. |
| **2. Ambient Awareness** | 7-10 | 4 weeks | Status bar + live metrics | System metrics collector (RAM, CPU, battery), network status monitor, git status watcher (git2-rs + fsnotify), full status bar UI, and session status indicators with active/idle/waiting/failed/completed states. |
| **3. Interactive Output** | 11-15 | 5 weeks | Clickable terminal output | Output annotator engine in Rust (compiled regex set for <1ms/line), detection of file paths, URLs, errors, git refs, and network addresses. Annotation overlay renderer, context menus, and hover tooltips. |
| **4. Code State Isolation** | 16-22 | 7 weeks | Session DAG + COW filesystem | Workspace model with base snapshots, COW overlay implementation (macOS NFS loopback, Linux OverlayFS/FUSE), shared read-only mounts for dependencies, child session stacked overlays, real-time conflict detection with severity levels, merge panel, and graph view. |
| **5. Git Translation** | 23-25 | 3 weeks | DAG-to-git bridge | Session-to-commit translation with agent metadata in trailers, workspace-to-PR creation with DAG context, "ship workspace" command, and scrollback/history preservation as workspace artifacts. |
| **6. A2UI and Connectors** | 26-30 | 5 weeks | Rich UI + process connectors | A2UI escape sequence parser and component renderer, core A2UI components (Table, Form, Button, Card, Code, Diff), Ocean-specific extensions, connector auto-detection engine, built-in connectors (Flutter, Node.js, Docker), connector bar UI, and merged log view. |

**Total: 30 weeks to V1 feature-complete.**

Key milestones:

- **Week 6:** Internal alpha -- usable as a daily-driver terminal (no agent features yet).
- **Week 15:** Public alpha -- interactive output alone justifies early adoption.
- **Week 22:** Private beta -- Session DAG with COW isolation available to testers. This is the inflection point where Ocean becomes categorically different from every other terminal.
- **Week 25:** Public beta -- git translation layer closes the workflow loop.
- **Week 30:** V1 release -- full feature set including A2UI and connectors.

---

## Appendix A: Technology Stack Summary

| Layer | Technology | Rationale |
|-------|------------|-----------|
| App shell | Tauri v2 (Rust) | 10x lighter than Electron, native system access, Rust backend |
| Frontend | SolidJS + TypeScript | Fine-grained reactivity, smaller bundle than React, ideal for real-time updates |
| Terminal rendering | xterm.js + WebGL addon | GPU-accelerated, battle-tested (VS Code, WaveTerm), extensible |
| Terminal emulation | portable-pty (Rust) | PTY management in Rust; migration path to libghostty-vt when stable |
| COW filesystem (macOS) | NFS loopback + SQLite delta tracking | No kernel extension, proven by AgentFS |
| COW filesystem (Linux) | OverlayFS / FUSE fallback | Kernel-fast when available, FUSE for unprivileged environments |
| Git integration | git2-rs (libgit2 bindings) | No shell-out, fast, reliable |
| System metrics | sysinfo crate (Rust) | Cross-platform CPU, RAM, disk, network |
| Session storage | SQLite (rusqlite) | Lightweight, embedded, queryable |
| IPC | Tauri commands + events | Frontend-backend communication |

## Appendix B: Key Terminology

| Term | Definition |
|------|------------|
| **Workspace** | Top-level grouping tied to a task or goal (e.g., "Auth Refactor", "Fix #423"). Owns the base filesystem snapshot. |
| **Session** | A terminal session within a workspace. Has its own PTY, optional COW filesystem layer, and lifecycle state. |
| **Session DAG** | The directed acyclic graph of all sessions within a workspace, including their parent-child relationships and filesystem dependencies. |
| **COW (Copy-on-Write)** | Filesystem isolation technique where a session's writes go to a thin delta layer. Reads fall through to the parent delta, then the base snapshot. |
| **Delta** | The set of files modified, created, or deleted by a session. Stored separately from the base snapshot. |
| **A2UI** | Agent-to-UI protocol (Google, Apache 2.0). A declarative JSON format for agents to render rich interactive components. |
| **Connector** | A visual grouping of related processes (e.g., Flutter app + DevTools + adb) with health monitoring and aggregated metrics. |
| **Annotation** | A clickable, actionable element detected in terminal output (file path, URL, error, etc.) rendered as an overlay. |
