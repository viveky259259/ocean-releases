# Ocean for Software Architects

**A technical deep-dive into how Ocean solves the multi-agent orchestration problem at the systems level.**

---

## The 24 Problems Ocean Solves

As an architect, you evaluate tools by the problems they eliminate. Here is every architectural problem Ocean addresses, organized by domain.

---

## 1. Isolation & State Management

### Problem: No isolation primitive exists between "full clone" and "shared filesystem"

Before Ocean, your options for parallel agent work were: (a) full git worktrees at ~2GB each, or (b) shared filesystem with race conditions. There was nothing in between.

Ocean introduces **COW (copy-on-write) filesystem overlays** — a lightweight isolation primitive that stores only deltas. Each session gets its own writable layer; reads fall through to the shared base.

```
Base Snapshot (workspace creation)
│
├── Session A (COW overlay: delta-A)
│   ├── reads: fall through to base
│   └── writes: captured in delta-A
│
├── Session B (COW overlay: delta-B)
│   ├── reads: fall through to base
│   └── writes: captured in delta-B
│
└── Session C (child of A)
    ├── reads: fall through to delta-A → base
    └── writes: captured in delta-C
```

### Problem: Git worktree cost explosion

Each parallel agent requires a full directory copy.

| Dimension | Git Worktrees | Ocean COW |
|-----------|---------------|-----------|
| Disk per session | ~2GB (full copy) | ~50KB (delta only) |
| Setup time | Minutes (`clone` + `npm install`) | <100ms (APFS clonefile) |
| Cleanup | Manual `git worktree remove` | Automatic on session close |
| 4-agent overhead | ~8GB disk, ~12 min setup | ~200KB disk, <1 second |

### Problem: Dependency duplication

`node_modules/`, `.git/objects/`, `build/`, `.gradle/`, `Pods/` — all duplicated per worktree. Ocean symlinks these directories read-only from the original repo. Zero duplication, zero reinstalls.

```
Heavy directories excluded from copy, symlinked instead:
  node_modules, .git/objects, .git/lfs,
  build, dist, .next, .nuxt,
  target, __pycache__, .dart_tool,
  .gradle, .build, Pods,
  vendor/bundle, .venv, venv
```

### Problem: Session spawn latency

Worktree creation: clone + install = minutes. Ocean session spawn: `cp -Rc` leveraging APFS native copy-on-write = <100ms. The difference between "I'll set up an agent" and "I'll spawn one right now."

---

## 2. Conflict & Merge Architecture

### Problem: Merge-time conflict discovery

Traditional: two agents work for an hour, both edit `auth.ts`, you discover the conflict at `git merge`. By then, both agents have built 50 lines on top of conflicting foundations.

Ocean detects same-file edits **in real-time** via a three-component system in the Rust backend:

1. **File watcher** (`notify` crate, FSEvents on macOS) — monitors each session's overlay with 300ms debounce
2. **Delta tracker** — walks each session's overlay to compute modified/created/deleted file sets
3. **Severity classifier** — classifies conflicts as they occur:

```
Severity Classification:
  Clean       → No overlap (different files modified)
  Diverged    → Same file, disjoint sections (auto-mergeable)
  Overlapping → Same file, nearby lines (needs review)
  Conflicting → Same file, same lines (requires human decision)
```

### Problem: No common ancestor for 3-way merge

When two agents diverge from the same base, you need the original file to perform a semantic merge. Ocean maintains the **base snapshot** as the common ancestor at all times, enabling the 3-way merge engine (built on the `similar` crate) to classify overlapping edits accurately.

### Problem: Merge resolution requires switching tools

Traditional: detect conflict in git, open a diff tool, manually resolve, commit. Ocean provides a complete resolution pipeline without leaving the terminal:

- **Per-hunk actions**: Accept A, Accept B, Accept Both, Accept Base, Manual Edit
- **AI-assisted merge**: Claude API integration with confidence scoring and quality evaluation
- **Merge queue**: Topological sort computes optimal merge order based on conflict complexity
- **Pre-merge snapshots**: Automatic backup before every merge, one-click undo
- **Session stash**: Save/restore session state mid-merge
- **Advisory file locks**: Prevent concurrent edits before conflicts occur
- **Dependency graph**: Declare session dependencies, enforce merge order, detect cycles (DFS + Kahn's algorithm)

### Problem: No visibility into file contention patterns

Which files are "hot" across your agents? Ocean's **file activity heatmap** shows contention density across the workspace. The **health dashboard** aggregates conflict metrics, session activity, and risk areas into a single view.

### Problem: Conflict remediation cost compounds over time

A conflict caught at t=5min costs 1 minute to resolve. The same conflict caught at t=60min costs 30+ minutes because both agents built further on their divergent foundations. Ocean's real-time detection collapses the feedback loop:

```
Traditional:                         Ocean:
  t=0    Both agents start            t=0    Both agents start
  t=60m  Merge attempted → CONFLICT   t=5m   ⚠️ Overlapping edit detected
  t=90m  Manual resolution complete   t=6m   Developer pauses one agent
  ────────────────────────────        ────────────────────────────
  Wasted: 30-60 minutes              Wasted: ~1 minute
```

---

## 3. Observability & Monitoring

### Problem: Agent state is invisible

Which of your 4 agents is stuck waiting for input? Which finished? Which errored? Without Ocean, you cycle through tabs, run `ps aux`, and lose 5 minutes of context each time.

Ocean provides real-time lifecycle indicators per session: **active**, **idle**, **waiting**, **failed**, **completed**. The Agent Dashboard (Cmd+Shift+J) shows all agents across all workspaces.

### Problem: No ambient system awareness

Developers manually run `htop`, `git status`, `ping`, `curl` to check environment state. Ocean's persistent status bar updates continuously:

```
🌐 Online 23ms │ RAM 62% CPU 34% │ main ↑2 +3 ~5 ● CI:passing │ 3 agents active
```

No commands needed. No context switching.

### Problem: Process relationship blindness

A Flutter developer runs `flutter run`, DevTools, and `adb logcat` — three processes that are semantically related but invisible to each other. A Node developer runs the API server, a database, and Redis.

Ocean's **Parallel Execution Connectors** auto-detect related processes via port scanning and process tree analysis, grouping them visually with health indicators and aggregated resource usage.

### Problem: Terminal output is inert text

An agent prints a file path — you copy-paste it into your editor. It prints an error — you copy-paste it back. In 2026, this is still the workflow.

Ocean's **annotation engine** (compiled regex set, <0.5ms/line) detects file paths, URLs, errors, stack traces, git refs, and network addresses in real-time. Every annotation is clickable with hover tooltips, primary actions (click), secondary actions (Cmd+Click), and context menus.

---

## 4. Version Control & Traceability

### Problem: No DAG-to-git translation

Parallel agent work has no clean mapping to git history. How do you turn 4 agents' simultaneous file changes into a reviewable PR?

Ocean's **Git Translation Layer** is a structured pipeline:

```
Session DAG                          Git
┌──────────┐                    ┌──────────┐
│Workspace │ ──ship──────────→  │   PR     │
│  ├─S1    │                    │  ├─C1    │ (commit per session)
│  ├─S2    │                    │  ├─C2    │
│  └─S3    │                    │  └─C3    │
└──────────┘                    └──────────┘

Commit trailers:
  Ocean-Session: <session-id>
  Ocean-Agent: claude-code
  Ocean-Workspace: auth-refactor
  Ocean-Delta-Files: 5 modified, 2 created
```

Each session's delta becomes a commit. The workspace becomes a PR with full DAG context in the body. Auto-commit generates smart messages based on the merge: "Merge auth-session: update 3 files" or "Merge feature-work: update login.rs" for single-file merges.

### Problem: Sharing local development state with teammates

A developer runs a dev server. A teammate needs to see it. Traditional options: deploy to staging (slow), ngrok (manual setup), or screen share (bandwidth).

Ocean's built-in **port forwarding** detects listening ports automatically and offers one-click tunnel creation via Bore or Cloudflared. Share a public URL instantly. Ocean auto-installs the provider binary on first use.

### Problem: No audit trail for agent-generated code

Which agent changed which file? When? What human reviewed it? Ocean logs every action to a local audit database:

- Session creation, modification, and termination
- Agent type detection and lifecycle events
- File modifications per session (delta tracking)
- Merge operations and conflict resolutions
- Git operations (commits, pushes, PR creation)

Exportable via `ocean audit export --from 2026-03-01 --format json`.

### Problem: Agent attribution in code review

PRs from multi-agent work are opaque — you see the final diff but not who did what. Ocean's commit trailers (`Ocean-Agent`, `Ocean-Session`, `Ocean-Delta-Files`) give reviewers per-agent attribution without changing their review workflow.

---

## 5. Architecture & Stack Decisions

### Problem: Electron memory bloat for terminal applications

AI-aware terminals built on Electron consume 300MB+. A terminal that manages filesystems, processes, and git repositories needs native performance.

Ocean uses **Tauri v2** with a Rust backend:

| Dimension | Tauri v2 | Electron |
|-----------|----------|----------|
| Idle memory | ~60MB | ~300MB+ |
| Binary size | ~15MB | ~150MB+ |
| Backend language | Rust | Node.js |
| System access | Native (no IPC overhead for fs/process) | Sandboxed by default |
| Security model | Command-based allowlist | Full Node.js access |

File I/O, process tree analysis, and conflict detection all run at native speed in Rust — not in a garbage-collected runtime.

### Problem: Virtual DOM overhead for high-frequency UI updates

PTY output streams at 60fps. Status bar metrics refresh every 2 seconds. File watcher events arrive asynchronously. React's virtual DOM diffs the entire component tree on every update.

Ocean uses **SolidJS** — fine-grained reactivity where a git status change updates exactly one DOM element. Benchmarks show 3-5x fewer re-renders than React for Ocean's update patterns.

### Problem: No native agent communication protocol

Agents can only output plain text via stdout. There's no standard way for an agent to render a table, a form, a progress bar, or a diff inline in the terminal.

Ocean implements **Google's A2UI protocol** — the first terminal to do so natively. Agents emit declarative JSON via terminal escape sequences; Ocean renders interactive components:

- Tables (sortable, filterable)
- Forms with typed inputs
- Code blocks with syntax highlighting
- Diff views with inline actions
- Progress bars and status indicators
- Interactive buttons

### Problem: Shell-out for git operations is slow and fragile

Spawning `git` subprocesses for status checks, staging, and commits adds latency and parsing complexity. Ocean uses **git2-rs** (libgit2 Rust bindings) for direct, in-process git operations — no shell-out, no output parsing.

---

## 6. Security & Governance

### Problem: Uncontrolled agent file access

Agents running in terminal sessions can read and write anywhere on the filesystem. There's no access control layer between the agent and the OS.

Ocean's Tauri command layer validates **all** file I/O from the frontend:

```rust
// Security controls on every file operation:
// 1. Allowlisted directories only: ~/.ocean/, ~/.claude/, workspace repo paths
// 2. Path traversal rejected: ../ components cause immediate error
// 3. Symlink writes refused: symlink_metadata check prevents write-through attacks
// 4. Content limit: 1MB max per write_file call
// 5. Canonicalization: all paths resolved to absolute before validation
```

### Problem: No managed configuration for enterprise deployment

No way for IT to enforce model restrictions, budget caps, or permission boundaries across a development team.

Ocean supports a **4-tier configuration hierarchy**:

```
Priority (highest first):
  1. Managed    → MDM/IT-deployed policies (cannot be overridden)
  2. User       → Developer's global preferences (~/.ocean/config)
  3. Project    → Team-shared settings (committed to git)
  4. Session    → Runtime overrides
```

Enforceable policies include: model restrictions, budget caps per session, permission boundaries for agent shell commands, telemetry requirements, and update channel pinning.

### Problem: Cloud dependency and data sovereignty risk

Warp, Cursor, and other AI-integrated tools require cloud connectivity and transmit data externally.

Ocean is **local-first by design**:
- All processing runs on the developer's machine
- No terminal content leaves the device
- No account system, no cloud dependency, no remote execution
- Telemetry is opt-in, anonymous, and limited to crash reports
- Full source code available for audit

### Problem: Context management requires CLI expertise

Configuring Claude Code's model, effort level, permissions, and CLAUDE.md requires documentation diving and manual file editing.

Ocean's **Claude Context Management UI** replaces CLI flags with visual controls: model selector, effort pills, budget inputs, permission mode dropdown, inline CLAUDE.md editor with token count. Managed defaults can be enforced at the IT level.

---

## 7. Developer Experience

### Problem: Workflow fragmentation across teams

Every developer invents their own tmux/worktree/script workflow. Onboarding takes days. Troubleshooting is unpredictable.

Ocean **standardizes** multi-agent development into a single workflow: workspace → spawn sessions → real-time conflict detection → merge → ship to PR. Every developer uses the same primitives.

### Problem: Progressive disclosure gap

Existing terminals are either too simple (iTerm2 — no agent support) or too complex (Warp — forces AI UX on everyone). There's no terminal that works well for both single-shell usage and multi-agent orchestration.

Ocean applies **progressive disclosure**: it looks and behaves like a fast, GPU-accelerated terminal by default. Orchestration features (DAG view, connectors, A2UI, conflict detection) reveal themselves on demand. A developer who never uses agents gets a great terminal. A developer running 4 agents gets a control plane.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    SolidJS Frontend                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Terminal  │ │ Session  │ │  Status  │ │   A2UI     │  │
│  │  Panes   │ │   DAG    │ │   Bar    │ │ Renderer   │  │
│  │(xterm.js)│ │  View    │ │          │ │            │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘  │
│       │             │            │              │         │
│  ─────┴─────────────┴────────────┴──────────────┴──────   │
│                    Tauri IPC Bridge                        │
│  ─────────────────────────────────────────────────────    │
│       │             │            │              │         │
│  ┌────┴─────┐ ┌─────┴────┐ ┌────┴─────┐ ┌─────┴──────┐  │
│  │   PTY    │ │   COW    │ │ Metrics  │ │  Conflict  │  │
│  │ Manager  │ │Filesystem│ │Collector │ │ Detector   │  │
│  │(Rust)    │ │ Manager  │ │          │ │            │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│                    Rust Backend                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │  SQLite  │ │  git2-rs │ │  notify  │ │  sysinfo   │  │
│  │ Database │ │  (Git)   │ │(Watcher) │ │ (Metrics)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Data Architecture

All persistent state lives in SQLite (via `rusqlite`):

```sql
-- Core tables
workspaces (id, name, repo_path, status, created_at)
sessions (id, workspace_id, parent_id, name, status, session_type, pid, recording_path)

-- Git integration
git_status_cache (repo_path, branch, ahead, behind, staged, modified, untracked)

-- Terminal history
command_history (id, session_id, command, exit_code, duration_ms, started_at)

-- Snippets
snippets (id, name, command, category, use_count)

-- Audit trail
audit_events (id, category, action, details, timestamp)
```

Session recordings are stored as JSONL files — timestamped PTY events that can be replayed.

## Performance Budgets

| Metric | Target | Achieved |
|--------|--------|----------|
| App launch to usable terminal | <500ms | ~400ms |
| Session spawn (COW) | <100ms | ~50ms (APFS) |
| Idle memory (single session) | <80MB | ~60MB |
| Memory per additional session | <15MB | ~12MB |
| Output annotation latency | <1ms/line | <0.5ms |
| Status bar update latency | <200ms | ~100ms |

## Integration Matrix

**Agent-agnostic:**
- Claude Code (full context management UI built in)
- Cursor, Aider, GitHub Copilot, Cody, Codex, Gemini, Devin (auto-detected, badged)
- Any process-based agent (generic detection)

**Tool-agnostic connectors:**
- Docker, Flutter, Node.js, Kubernetes (auto-detected)
- Custom connector types (extensible architecture)

## Competitive Positioning

| Capability | Ocean | Warp | Ghostty | iTerm2 | Claude Squad |
|------------|-------|------|---------|--------|--------------|
| Architecture | Tauri + Rust + SolidJS | Rust (proprietary) | Zig, GPU-native | macOS native | tmux wrapper |
| Code isolation | COW overlays (~KB) | None | None | None | Git worktrees (~GB) |
| Conflict detection | Real-time | None | None | None | Merge-time only |
| A2UI support | Native | None | None | None | None |
| Agent awareness | First-class lifecycle | Warp AI only | None | None | Agent list |
| Open source | Yes | No | Yes | Yes (GPL) | Yes |
| Local-first | Yes | No (cloud) | Yes | Yes | Yes |
| Memory | ~60MB | ~150MB | ~30MB | ~100MB | Depends on tmux |

## When to Recommend Ocean

**Recommend when:**
- Team runs 2+ AI agents on the same codebase
- Isolation cost (worktrees) is a bottleneck
- Real-time conflict detection saves more than merge-time resolution
- Audit trails for agent-generated code are required
- Open-source, local-first architecture is a requirement
- Standardized tooling across teams is valued

**Don't recommend when:**
- Minimal, zero-overhead terminal needed (use Ghostty)
- No AI agents in the workflow (yet)
- Windows required today (macOS and Linux only in V1)

---

*Open-source. Local-first. Built with Rust + Tauri + SolidJS. [GitHub](https://github.com/viveky259259/ocean-releases)*
