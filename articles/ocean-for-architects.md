# Ocean for Software Architects

**A technical deep-dive into how Ocean solves the multi-agent orchestration problem at the systems level.**

---

## The Architecture Problem

The terminal hasn't evolved for the paradigm shift in software development. Modern teams run 3-5 AI agents in parallel on shared codebases. The existing solutions — git worktrees, tmux wrappers, cloud-based agent managers — are either expensive, brittle, or proprietary.

As an architect, you see the fundamental issue: **there is no isolation primitive between "full git clone" and "shared filesystem with race conditions."** Ocean introduces one.

## System Architecture

Ocean is built on **Tauri v2** with a Rust backend and SolidJS frontend.

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

### Why Tauri, Not Electron

| Dimension | Tauri v2 | Electron |
|-----------|----------|----------|
| Idle memory | ~60MB | ~300MB+ |
| Binary size | ~15MB | ~150MB+ |
| Backend language | Rust | Node.js |
| System access | Native (no IPC overhead for fs/process) | Sandboxed by default |
| Security model | Command-based allowlist | Full Node.js access |

For a terminal that manages filesystems, processes, and git repositories, Rust isn't a preference — it's a requirement. File I/O, process tree analysis, and conflict detection all run at native speed.

### Why SolidJS, Not React

The terminal UI updates at high frequency: PTY output streams at 60fps, status bar metrics refresh every 2 seconds, file watcher events arrive asynchronously. SolidJS's fine-grained reactivity means a git status change updates exactly one DOM element — not a virtual DOM diff of the entire sidebar. Benchmarks show 3-5x fewer re-renders than React for Ocean's update patterns.

## The Session DAG: Core Primitive

The Session DAG is the central architectural decision. Every session has two layers:

1. **Terminal layer** — A PTY (pseudo-terminal) running the user's shell
2. **Filesystem layer** — A COW overlay tracking file modifications

### Copy-on-Write Implementation

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

On macOS, Ocean uses `rsync` for the initial workspace snapshot with symlinks to heavy directories (`node_modules/`, `.git/objects/`, `build/`). Session clones use `cp -Rc` which leverages APFS's native copy-on-write at the filesystem level — zero disk cost until a file is actually modified.

**Performance characteristics:**
- Workspace snapshot: ~2-5s for a typical repo (excludes `node_modules/`)
- Session spawn: <100ms (APFS clonefile)
- Session delta storage: typically KB-MB (only modified files)
- Dependency sharing: `node_modules/` symlinked read-only (~0 additional disk)

### Conflict Detection Architecture

The conflict detection system runs in the Rust backend with three components:

1. **File watcher** (`notify` crate, FSEvents on macOS) — monitors each session's overlay directory with 300ms debounce
2. **Delta tracker** — walks each session's overlay to compute modified/created/deleted file sets
3. **Severity classifier** — when two sessions modify the same file, classifies the conflict:

```
Severity Classification:
  Clean       → No overlap (different files)
  Diverged    → Same file, disjoint edits (auto-mergeable)
  Overlapping → Same file, nearby lines (needs review)
  Conflicting → Same file, same lines (requires resolution)
```

The 3-way merge engine (built on the `similar` crate) performs semantic diffing to classify overlapping edits, using the base snapshot as the common ancestor.

### Git Translation Layer

The translation from Session DAG to git is a structured pipeline:

```
Session DAG                          Git
┌──────────┐                    ┌──────────┐
│Workspace │ ──ship──────────→  │   PR     │
│  ├─S1    │                    │  ├─C1    │ (commit with agent metadata)
│  ├─S2    │                    │  ├─C2    │
│  └─S3    │                    │  └─C3    │
└──────────┘                    └──────────┘

Commit trailers:
  Ocean-Session: <session-id>
  Ocean-Agent: claude-code
  Ocean-Workspace: auth-refactor
  Ocean-Delta-Files: 5 modified, 2 created
```

Each session's delta becomes a commit. The workspace becomes a PR with the full DAG context in the body. Reviewers see which agent did what.

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

-- Audit
audit_events (id, category, action, details, timestamp)
```

Session recordings are stored as JSONL files — timestamped PTY events that can be replayed.

## Security Model

### Filesystem Access Control

All file I/O from the frontend goes through Tauri commands with path validation:

```rust
// Allowed directories: ~/.ocean/, ~/.claude/, workspace repo paths
// Path traversal rejected: ../ components cause immediate error
// Symlink writes refused: symlink_metadata check prevents write-through attacks
// Content limit: 1MB max per write_file call
```

### Process Isolation

Each session runs in its own PTY with its own PID. Session processes are tracked and cleaned up on session close. The connector detection system reads process trees but never modifies external processes without user action.

### Data Privacy

Ocean is local-first. No terminal content leaves the device. Telemetry is opt-in and anonymous (crash reports only). There is no account system, no cloud dependency, and no remote execution in V1.

## Extensibility Points

### A2UI Protocol

Ocean implements Google's A2UI (Agent-to-UI) protocol for rich agent output. Agents emit JSON via terminal escape sequences; Ocean renders native interactive components:

- Tables (sortable, filterable)
- Forms with typed inputs
- Code blocks with syntax highlighting
- Diff views
- Progress bars
- Interactive buttons

This is the first terminal to support A2UI natively.

### Parallel Execution Connectors

The connector system auto-detects related processes (Flutter app + DevTools + adb, Node server + database + Redis) and groups them visually. The architecture supports custom connector types for any process group pattern.

### Configuration Hierarchy

Ocean supports a 4-tier configuration model mirroring Claude Code's scope system:

```
Managed (MDM/IT policies) → User (~/.ocean/config) → Project (.ocean/) → Session (runtime)
```

Enterprise deployments can enforce settings at the managed level that cannot be overridden.

## Performance Budgets

| Metric | Target | Achieved |
|--------|--------|----------|
| App launch to usable terminal | <500ms | ~400ms |
| Session spawn (COW) | <100ms | ~50ms (APFS) |
| Idle memory (single session) | <80MB | ~60MB |
| Memory per additional session | <15MB | ~12MB |
| Annotation latency | <1ms/line | <0.5ms |
| Status bar update | <200ms | ~100ms |

## Integration with Your Stack

Ocean is agent-agnostic. It works with:
- **Claude Code** — Full context management UI built in
- **Cursor** — Agent sessions detected and tracked
- **Aider** — Recognized and badged automatically
- **GitHub Copilot** — CLI agent detected
- **Custom agents** — Any process-based agent works

It's also tool-agnostic:
- **Docker** — Connector auto-detection
- **Flutter** — DevTools + hot reload tracking
- **Node.js** — Server + build process grouping
- **Kubernetes** — Pod status in connector bar

## When to Recommend Ocean

Ocean is the right choice when:
- Your team runs 2+ AI agents on the same codebase
- You need isolation without the cost of git worktrees
- You want real-time conflict detection, not merge-time surprises
- You need audit trails for agent actions
- You value open-source, local-first architecture

Ocean is not the right choice when:
- You need a minimal, zero-overhead terminal (use Ghostty)
- You don't use AI agents in your workflow (yet)
- You need Windows support today (Linux and macOS only in V1)

---

*Open-source. Local-first. Built with Rust + Tauri + SolidJS. [GitHub](https://github.com/viveky259259/ocean-releases)*
