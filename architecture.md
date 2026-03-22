# Ocean -- Architecture & Tech Stack

**Version:** 1.0
**Last Updated:** 2026-03-15
**Status:** Reference Architecture (pre-implementation)

This document is the canonical technical reference for Ocean's architecture. It covers
every layer of the system -- from the Tauri app shell down to the SQLite schema and
COW filesystem mounts. Engineers joining the project should read this end-to-end before
writing code.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Tech Stack (with rationale)](#2-tech-stack-with-rationale)
3. [Module Architecture (Rust Backend)](#3-module-architecture-rust-backend)
4. [Frontend Architecture](#4-frontend-architecture)
5. [IPC Contract](#5-ipc-contract)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [Performance Targets](#7-performance-targets)
8. [Security Considerations](#8-security-considerations)
9. [Testing Strategy](#9-testing-strategy)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
+=========================================================================+
|                         Ocean Application                                |
|=========================================================================|
|                                                                          |
|  +------------------------------------------------------------------+   |
|  |                   PRESENTATION LAYER                              |   |
|  |                   (Tauri v2 WebView)                              |   |
|  |                                                                    |   |
|  |  +--------------------+  +-------------------------------------+  |   |
|  |  | SolidJS UI         |  | Terminal Panes                      |  |   |
|  |  | - SessionSidebar   |  | - xterm.js + WebGL addon            |  |   |
|  |  | - StatusBar        |  | - AnnotationOverlay (DOM layer)     |  |   |
|  |  | - GitPanel         |  | - A2UIRenderer (inline components)  |  |   |
|  |  | - ConnectorBar     |  | - PaneSplitter (drag-resize)        |  |   |
|  |  | - GraphView        |  +-------------------------------------+  |   |
|  |  | - MergePanel       |                                           |   |
|  |  | - CommandPalette   |                                           |   |
|  |  +--------------------+                                           |   |
|  +------------------------------------------------------------------+   |
|       |              ^                                                   |
|       | Tauri IPC    | Tauri Events                                      |
|       | (commands)   | (push notifications)                              |
|       v              |                                                   |
|  +------------------------------------------------------------------+   |
|  |                   APPLICATION LAYER                                |   |
|  |                   (Rust / Tauri Core)                              |   |
|  |                                                                    |   |
|  |  +--------------+ +--------------+ +---------------------------+  |   |
|  |  | Session      | | Terminal     | | Metrics                   |  |   |
|  |  | Manager      | | Manager      | | Collector                 |  |   |
|  |  | (DAG, state, | | (PTY spawn,  | | (CPU, RAM, battery, net,  |  |   |
|  |  |  lifecycle)  | |  I/O bridge, | |  git status, per-process) |  |   |
|  |  +--------------+ |  annotator)  | +---------------------------+  |   |
|  |                    +--------------+                                |   |
|  |  +--------------+ +--------------+ +---------------------------+  |   |
|  |  | Connector    | | Git          | | A2UI                      |  |   |
|  |  | Engine       | | Translation  | | Protocol                  |  |   |
|  |  | (detect,     | | Layer        | | Handler                   |  |   |
|  |  |  link procs) | | (DAG->commit | | (parse, validate, route)  |  |   |
|  |  +--------------+ |  ->PR)       | +---------------------------+  |   |
|  |                    +--------------+                                |   |
|  +------------------------------------------------------------------+   |
|       |              ^                                                   |
|       | mount ops    | write events (kqueue/inotify)                     |
|       v              |                                                   |
|  +------------------------------------------------------------------+   |
|  |                   FILESYSTEM LAYER                                 |   |
|  |                   (COW / Code State Isolation)                     |   |
|  |                                                                    |   |
|  |  +--------------+ +--------------+ +---------------------------+  |   |
|  |  | Filesystem   | | Conflict     | | Delta                     |  |   |
|  |  | Manager      | | Detector     | | Storage                   |  |   |
|  |  | (overlay/NFS | | (real-time   | | (per-session COW files,   |  |   |
|  |  |  mount/umnt) | |  overlap)    | |  tracked in SQLite)       |  |   |
|  |  +--------------+ +--------------+ +---------------------------+  |   |
|  |                                                                    |   |
|  |  macOS: NFS loopback    Linux: OverlayFS / FUSE fallback         |   |
|  +------------------------------------------------------------------+   |
|       |                                                                  |
|       v                                                                  |
|  +------------------------------------------------------------------+   |
|  |                   STORAGE LAYER                                    |   |
|  |                                                                    |   |
|  |  +------------------------------+ +----------------------------+  |   |
|  |  | SQLite (WAL mode)            | | Filesystem                 |  |   |
|  |  | - sessions, workspaces       | | - base snapshots (reflink) |  |   |
|  |  | - annotations, conflicts     | | - delta directories        |  |   |
|  |  | - connector groups           | | - terminal scrollback      |  |   |
|  |  | - metrics history            | | - A2UI component cache     |  |   |
|  |  | - config + migrations        | |                            |  |   |
|  |  +------------------------------+ +----------------------------+  |   |
|  +------------------------------------------------------------------+   |
|                                                                          |
+==========================================================================+
```

### 1.2 Component List with Responsibilities

| Component | Layer | Responsibility |
|-----------|-------|----------------|
| **SolidJS UI** | Presentation | All non-terminal chrome: sidebar, status bar, panels, graph view, command palette. Reactive stores updated via Tauri events. |
| **xterm.js + WebGL** | Presentation | Terminal text rendering at 60 fps. Hosts the annotation overlay and A2UI inline components as DOM layers positioned over the canvas. |
| **Session Manager** | Application | DAG data structure, workspace/session lifecycle (create, fork, merge, archive), state machine transitions, auto-detection of child processes. |
| **Terminal Manager** | Application | PTY allocation via `portable-pty`, stdin/stdout bridging to xterm.js over IPC, output tee to the annotator pipeline. |
| **Output Annotator** | Application | Compiled `RegexSet` pattern matching on every line of terminal output. Produces `Annotation` records stored in SQLite, pushed to frontend via events. |
| **A2UI Protocol Handler** | Application | Detects `\x1b]ocean;a2ui;<json>\x07` escape sequences in the PTY output stream, validates against A2UI schema, routes parsed components to the frontend for rendering. |
| **Metrics Collector** | Application | Periodic polling of CPU, RAM, swap, battery, disk, network via `sysinfo` crate. Git status via `git2` + `notify` (fs watcher). Per-process metrics for sessions. |
| **Connector Engine** | Application | Auto-detection of related processes (Flutter, Node.js debug, Docker Compose) via process tree scanning and port analysis. Maintains `ConnectorGroup` records. |
| **Git Translation Layer** | Application | Converts session deltas into git commits (via `git2`), workspaces into PRs (via `gh` CLI), embeds DAG metadata as git trailers. |
| **Filesystem Manager** | Filesystem | Creates read-only base snapshots (hard-links/reflinks), mounts per-session COW overlays, manages shared read-only mounts for dependency directories. |
| **Conflict Detector** | Filesystem | Watches file write events across all active sessions. Maintains a map of `file_path -> [session_ids]`. Computes line-range overlap on concurrent modifications. Emits alerts at three severity levels: disjoint, overlapping, conflicting. |
| **Delta Storage** | Filesystem | Per-session directory of copy-on-write files. Metadata (modified/created/deleted file lists, byte sizes) tracked in SQLite for fast queries. |
| **SQLite** | Storage | Single database file in WAL mode. Holds all structured data: sessions, workspaces, annotations, conflicts, connector groups, metrics snapshots, user config. |
| **Filesystem (raw)** | Storage | Base snapshot directories, delta directories, scrollback log files, A2UI component cache. Managed by the Filesystem Manager; never accessed directly by the frontend. |

### 1.3 Data Flow Between Components

The system has four primary data flow paths:

**Path A -- User input to PTY:**
```
User keystroke -> xterm.js -> IPC(write_to_pty) -> Terminal Manager -> PTY stdin
```

**Path B -- PTY output to screen (with annotation):**
```
PTY stdout -> Terminal Manager -> [tee] -> Output Annotator -> Annotation records -> IPC event
                                    |
                                    +---> IPC(pty_output) -> xterm.js -> WebGL render
                                                                |
                                          Annotation Overlay <--+ (positions DOM elements
                                                                    over matched text ranges)
```

**Path C -- Metrics push:**
```
sysinfo/git2/notify -> Metrics Collector -> IPC event(metrics_update) -> SolidJS store -> StatusBar
```

**Path D -- Filesystem write interception:**
```
Process writes file -> kqueue/inotify fires -> Filesystem Manager -> Conflict Detector
                                                                          |
                       IPC event(conflict_alert) <------------------------+
                             |
                             v
                       ConflictAlert component (frontend)
```

---

## 2. Tech Stack (with Rationale)

### 2.1 App Shell: Tauri v2

**Choice:** Tauri v2 (Rust core + system WebView)
**Rejected:** Electron, native Cocoa/GTK

#### Why Tauri over Electron

| Dimension | Tauri v2 | Electron |
|-----------|----------|----------|
| Base memory | 30-60 MB | 200-400 MB |
| Binary size | 5-10 MB | 150+ MB |
| Backend language | Rust (native perf) | Node.js (GC pauses, single-threaded) |
| Security model | No bundled Node.js; allowlist-gated IPC | Full Node.js in renderer possible |
| Update mechanism | Built-in updater with delta updates | electron-updater (full binary) |

Ocean is a terminal -- it runs continuously, often alongside resource-hungry agents. Every
megabyte of base memory matters. Electron's ~300 MB baseline for WaveTerm is unacceptable
when Ocean targets <100 MB base.

The Rust backend is critical. Ocean's backend does heavy lifting: PTY I/O, regex matching on
every line of output, filesystem mount management, process tree scanning, git operations.
These are all CPU-sensitive, concurrency-sensitive operations where Rust's zero-cost
abstractions and `tokio` async runtime outperform Node.js by an order of magnitude.

#### Tauri v2 Specific Features Used

- **Custom Protocol Handlers (`tauri://`)**: Used to serve the SolidJS frontend bundle and
  any locally-generated assets (scrollback HTML exports, A2UI cached renders) without a
  localhost HTTP server.
- **IPC Commands**: Typed Rust functions exposed to the frontend via `#[tauri::command]`.
  Every backend operation (create session, write to PTY, get metrics) is an IPC command.
- **Event System**: Backend pushes real-time updates to the frontend (PTY output, metrics,
  conflict alerts, session state changes) via Tauri's event bus. The frontend subscribes
  with `listen()`.
- **System Tray**: Shows Ocean status when the window is minimized -- active session count,
  agent states, conflict alerts.
- **Window Management**: Multi-window support for detaching terminal panes or the graph view
  into separate OS windows.
- **Auto Updater**: Built-in signed update mechanism for distributing new Ocean versions.
- **Permissions System**: Tauri v2's fine-grained capability system restricts which IPC
  commands each window can call. Terminal panes cannot invoke filesystem mount commands
  directly.

#### WebView Considerations per Platform

| Platform | WebView Engine | Notes |
|----------|----------------|-------|
| macOS | WKWebView (WebKit) | Primary platform. WebGL support is mature. `WKWebView` works in-process, low overhead. Safari-based CSS/JS behavior -- test flexbox edge cases. |
| Linux | WebKitGTK | Requires `libwebkit2gtk-4.1`. WebGL support depends on Mesa/GPU drivers. Test on both X11 and Wayland. Fallback: `xterm.js` canvas renderer if WebGL unavailable. |
| Windows | WebView2 (Chromium) | Deferred to V2. WebView2 is Chromium-based, so xterm.js WebGL works identically to Chrome. Requires Edge WebView2 Runtime. |

**Key risk:** WebKit on macOS handles `ResizeObserver` and `IntersectionObserver` differently
from Chromium. Terminal pane resize events must be tested thoroughly on WKWebView.

---

### 2.2 Frontend: SolidJS + TypeScript

**Choice:** SolidJS 1.x + TypeScript 5.x
**Rejected:** React, Svelte, Vue

#### Why SolidJS over React

| Dimension | SolidJS | React |
|-----------|---------|-------|
| Reactivity model | Fine-grained (signals, effects track dependencies at the variable level) | Coarse (component re-render on any state change in subtree) |
| Virtual DOM | None -- compiles to direct DOM operations | Yes -- diff + patch on every render |
| Bundle size | ~7 KB gzipped | ~40 KB gzipped (react + react-dom) |
| Terminal overlay perf | Updates a single annotation DOM element without touching others | Re-renders entire overlay layer on any annotation change |

Ocean's UI has extreme reactivity requirements. The status bar updates every 2 seconds
(CPU, RAM). The annotation overlay updates on every line of terminal output. The session
sidebar updates on every state transition. In React, each of these would trigger component
tree reconciliation. SolidJS updates only the specific DOM nodes bound to the changed
signal -- no reconciliation, no virtual DOM diffing.

The bundle size difference (7 KB vs 40 KB) compounds when you add routing and state
management. Ocean's total JS bundle should stay under 200 KB gzipped for instant WebView
load.

#### Key Libraries

| Library | Purpose | Version |
|---------|---------|---------|
| `solid-js` | Core reactivity and component framework | 1.x |
| `@solidjs/router` | Client-side routing (workspace view, graph view, settings) | 0.x |
| `xterm` | Terminal emulator widget | 5.x |
| `@xterm/addon-webgl` | WebGL-accelerated terminal renderer | 0.x |
| `@xterm/addon-fit` | Auto-resize terminal to container | 0.x |
| `@xterm/addon-search` | In-terminal text search | 0.x |
| `@xterm/addon-unicode11` | Full Unicode 11 width support | 0.x |
| `@xterm/addon-image` | Inline image rendering (Kitty/Sixel protocol) | 0.x |
| `@tauri-apps/api` | Tauri IPC bindings for commands and events | 2.x |
| `solid-icons` | Icon library (Feather, Lucide sets) | -- |

**No additional state management library.** SolidJS's built-in `createStore` and
`createSignal` primitives are sufficient. Global state lives in `/src/stores/` as
exported SolidJS stores, updated by Tauri event listeners.

#### Component Architecture

SolidJS components in Ocean follow these conventions:

1. **Leaf components** are pure: they receive props and render. No side effects.
2. **Container components** subscribe to stores and pass data down.
3. **IPC hooks** (in `/src/hooks/`) wrap `invoke()` and `listen()` calls, returning
   signals that auto-update when backend events arrive.
4. **No prop drilling beyond two levels.** Use context providers for cross-cutting
   concerns (active session, theme, user preferences).

---

### 2.3 Terminal: xterm.js + WebGL

**Choice:** xterm.js 5.x with `@xterm/addon-webgl`
**Rejected:** Building a custom GPU renderer, Alacritty's renderer (Rust, not embeddable in WebView), Hyper.js (Electron-only)

#### Why xterm.js

1. **Battle-tested.** xterm.js powers the integrated terminal in VS Code (150M+ users),
   Eclipse Theia, Gitpod, and countless web-based terminals. It has thousands of
   contributors and a comprehensive test suite.

2. **WebGL addon.** The `@xterm/addon-webgl` renders the terminal grid in a single WebGL
   draw call per frame, achieving smooth 60 fps scrolling even at large buffer sizes.
   This is critical for Ocean where agents produce high-throughput output.

3. **Addon ecosystem.** Search, fit, image rendering, Unicode, ligatures, serialization --
   all available as official or community addons. Ocean does not need to build these from
   scratch.

4. **Decoration API.** xterm.js exposes a `registerDecoration()` API that allows placing
   DOM elements at specific buffer positions. Ocean uses this for the annotation overlay --
   clickable file paths, URLs, and error badges are DOM elements positioned precisely over
   the terminal canvas by the decoration system.

5. **Custom parser hooks.** The `parser.registerOscHandler()` API allows Ocean to intercept
   custom OSC escape sequences (specifically `\x1b]ocean;...`) without forking xterm.js.
   This is how A2UI escape sequences are routed from the terminal stream to the A2UI
   renderer.

#### Custom Addons Planned

**ocean-annotator addon:**
Bridges the Rust annotator output to xterm.js decorations. When the backend emits an
`annotation_created` event, this addon creates a decoration at the correct buffer position
and attaches a click handler that invokes the annotation's primary action.

**ocean-a2ui addon:**
Intercepts `\x1b]ocean;a2ui;<json>\x07` sequences via `parser.registerOscHandler()`.
Parses the JSON payload, creates a SolidJS component in a DOM container, and positions it
inline in the terminal buffer using a decoration. The component is interactive -- button
clicks and form submissions send responses back through IPC.

**ocean-metrics addon:**
Renders per-session mini-metrics (CPU, memory of the session's process) in the terminal
gutter area as a subtle overlay. Toggled by user preference.

#### Migration Path to libghostty

When `libghostty` (Mitchell Hashimoto's embeddable terminal library in Zig) reaches a stable
release with a C ABI, Ocean can migrate the core terminal rendering from xterm.js/WebGL to a
native view backed by `libghostty`. The migration plan:

1. **Phase 1 (current):** xterm.js in WebView. All annotation and A2UI logic operates at the
   DOM/JavaScript level.
2. **Phase 2:** Embed `libghostty` as a native child window (Tauri supports native child
   views via platform-specific APIs). Terminal rendering moves to Metal/Vulkan. The annotation
   overlay remains in the WebView, positioned over the native view using coordinate
   translation.
3. **Phase 3:** If `libghostty` exposes a decoration/overlay API, move annotations and A2UI
   into the native layer entirely, eliminating the WebView overlay for terminal panes.

The key architectural decision enabling this migration: Ocean's annotation and A2UI logic
lives in the Rust backend, not in JavaScript. The frontend is a rendering target, not the
source of truth. Swapping xterm.js for `libghostty` changes the rendering target but not the
annotation pipeline.

---

### 2.4 Backend: Rust

The entire backend is a single Rust binary compiled as the Tauri app's core process. All
heavy computation -- PTY management, output parsing, filesystem operations, metrics
collection, git operations -- runs in Rust on the `tokio` async runtime.

#### Key Crates

| Crate | Purpose | Notes |
|-------|---------|-------|
| `tauri` (2.x) | App shell, IPC, event system, window management | Core framework dependency |
| `portable-pty` | Cross-platform PTY allocation and I/O | Used by wezterm. Handles `forkpty()` on Unix, `ConPTY` on Windows. |
| `tokio` (1.x) | Async runtime | Multi-threaded runtime for I/O, timers, spawning. All IPC handlers are async. |
| `git2` | libgit2 bindings | Git status, diff, commit, branch operations without shelling out. |
| `sysinfo` | System metrics | Cross-platform CPU, RAM, disk, network, process information. |
| `rusqlite` | SQLite bindings | WAL mode, prepared statements, migration support. |
| `notify` (6.x) | Filesystem watcher | Cross-platform (kqueue on macOS, inotify on Linux). Powers git status updates and conflict detection write monitoring. |
| `regex` | Regular expressions | `RegexSet` for parallel multi-pattern matching on terminal output lines. |
| `serde` / `serde_json` | Serialization | JSON serialization for IPC payloads, A2UI parsing, SQLite JSON columns. |
| `nix` | Unix system calls | Low-level mount/umount for NFS loopback and OverlayFS operations. |
| `uuid` | UUID generation | Session and workspace identifiers. |
| `chrono` | Timestamps | Session timing, metrics history. |
| `tracing` | Structured logging | Async-aware logging with span context for debugging session lifecycle. |
| `thiserror` | Error types | Ergonomic error enums for each module. |

#### Async Architecture (tokio runtime)

Ocean uses a multi-threaded `tokio` runtime (default: number of CPU cores). Work is
distributed across three categories:

**1. IPC command handlers (spawn on tokio thread pool):**
Every `#[tauri::command]` is an `async fn` that runs on tokio's thread pool. Short-lived
commands (get session list, get metrics) complete immediately. Long-lived commands (create
workspace with snapshot) yield cooperatively.

**2. Long-running background tasks (tokio::spawn):**
- PTY I/O bridge: one task per session, reads PTY stdout in a loop, tees to annotator + IPC.
- Metrics collector: one task, polls system metrics on a timer.
- Filesystem watcher: one task per workspace, receives notify events, routes to conflict
  detector.
- Process scanner: one task, scans process trees every 2 seconds for auto-detection.

**3. Blocking operations (tokio::spawn_blocking):**
- SQLite writes (rusqlite is synchronous; wrapped in `spawn_blocking`).
- Filesystem mount/unmount (system calls that may block).
- Git operations via git2 (some operations are CPU-bound).

```
tokio runtime (multi-threaded)
|
+-- IPC handler pool
|   +-- create_session()
|   +-- write_to_pty()
|   +-- get_metrics()
|   +-- ... (all #[tauri::command] fns)
|
+-- Spawned tasks (long-running)
|   +-- pty_io_bridge(session_1)
|   +-- pty_io_bridge(session_2)
|   +-- pty_io_bridge(session_N)
|   +-- metrics_collector_loop()
|   +-- fs_watcher(workspace_1)
|   +-- fs_watcher(workspace_2)
|   +-- process_scanner_loop()
|   +-- git_status_watcher(workspace_1)
|
+-- spawn_blocking pool
    +-- sqlite_write(...)
    +-- mount_overlay(...)
    +-- git2_diff(...)
```

---

### 2.5 Storage: SQLite

**Choice:** SQLite 3.x via `rusqlite`, WAL mode
**Rejected:** PostgreSQL (too heavy, needs server), RocksDB (key-value, no relational
queries), flat JSON files (no ACID, no concurrent reads)

#### Why SQLite

1. **Embedded.** No server process. The database is a single file in the Ocean data
   directory. Zero configuration for the user.
2. **ACID transactions.** Session creation involves writing to `workspaces`, `sessions`,
   and `session_states` tables atomically. SQLite transactions guarantee consistency even
   if Ocean crashes mid-operation.
3. **WAL mode for concurrent reads.** The metrics collector, conflict detector, and IPC
   handlers all read from the database concurrently. WAL (Write-Ahead Logging) mode allows
   unlimited concurrent readers without blocking the single writer.
4. **JSON support.** SQLite's `json_extract()` and `json_each()` functions allow querying
   JSON columns (session metadata, annotation details) without deserializing in Rust.
5. **Single-file backup.** The entire Ocean state can be backed up by copying one file.

#### Schema Design

```sql
-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE workspaces (
    id              TEXT PRIMARY KEY,        -- UUID
    name            TEXT NOT NULL,           -- "Auth Refactor"
    repo_path       TEXT NOT NULL,           -- original repo path
    base_snapshot   TEXT NOT NULL,           -- path to read-only snapshot dir
    base_commit     TEXT NOT NULL,           -- git commit hash at snapshot time
    merged_state    TEXT,                    -- path to accumulated merged state dir
    git_branch      TEXT,                    -- created when translating to git
    git_pr_url      TEXT,                    -- PR URL if workspace was shipped
    status          TEXT NOT NULL DEFAULT 'active',  -- active | archived
    metadata        TEXT DEFAULT '{}',       -- JSON: user tags, notes
    created_at      TEXT NOT NULL,           -- ISO 8601
    updated_at      TEXT NOT NULL
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE sessions (
    id              TEXT PRIMARY KEY,        -- UUID
    workspace_id    TEXT NOT NULL REFERENCES workspaces(id),
    parent_id       TEXT REFERENCES sessions(id),  -- NULL = root session
    name            TEXT NOT NULL,           -- "Claude Agent" or auto-generated
    session_type    TEXT NOT NULL,           -- shell | agent | process
    fs_mode         TEXT NOT NULL,           -- cow | shared | none
    edge_type       TEXT NOT NULL DEFAULT 'spawned', -- spawned | linked | depends
    agent_type      TEXT,                    -- "claude-code" | "cursor" | "aider" | NULL
    pid             INTEGER,                 -- OS process ID (NULL if not yet spawned)
    pty_id          TEXT,                    -- PTY identifier
    status          TEXT NOT NULL DEFAULT 'active',
                                             -- active | idle | waiting | failed
                                             -- | completed | archived
    exit_code       INTEGER,                 -- NULL while running
    cwd             TEXT NOT NULL,           -- working directory (mount path for COW)
    env_snapshot    TEXT DEFAULT '{}',       -- JSON: captured env vars
    scrollback_path TEXT,                    -- file path to scrollback buffer
    started_at      TEXT NOT NULL,
    ended_at        TEXT,
    updated_at      TEXT NOT NULL
);

CREATE INDEX idx_sessions_workspace ON sessions(workspace_id);
CREATE INDEX idx_sessions_parent ON sessions(parent_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- ============================================================
-- SESSION STATE (COW filesystem layer)
-- ============================================================
CREATE TABLE session_states (
    session_id      TEXT PRIMARY KEY REFERENCES sessions(id),
    delta_path      TEXT NOT NULL,           -- path to COW delta directory
    parent_delta_id TEXT REFERENCES session_states(session_id),
    mount_path      TEXT NOT NULL,           -- where merged view is mounted
    modified_files  TEXT DEFAULT '[]',       -- JSON array of file paths
    created_files   TEXT DEFAULT '[]',
    deleted_files   TEXT DEFAULT '[]',
    delta_size_bytes INTEGER DEFAULT 0,
    merged_to_parent INTEGER DEFAULT 0,      -- boolean
    merged_at       TEXT,
    git_commit      TEXT,                    -- set when translated to git
    updated_at      TEXT NOT NULL
);

-- ============================================================
-- CONFLICTS
-- ============================================================
CREATE TABLE conflicts (
    id              TEXT PRIMARY KEY,
    workspace_id    TEXT NOT NULL REFERENCES workspaces(id),
    file_path       TEXT NOT NULL,
    session_ids     TEXT NOT NULL,           -- JSON array of session UUIDs
    overlap_ranges  TEXT NOT NULL,           -- JSON: [{line_start, line_end, session_id}]
    severity        TEXT NOT NULL,           -- disjoint | overlapping | conflicting
    resolved        INTEGER DEFAULT 0,
    resolution      TEXT,                    -- auto-merged | session-X-wins | manual
    detected_at     TEXT NOT NULL,
    resolved_at     TEXT
);

CREATE INDEX idx_conflicts_workspace ON conflicts(workspace_id);
CREATE INDEX idx_conflicts_file ON conflicts(file_path);

-- ============================================================
-- ANNOTATIONS
-- ============================================================
CREATE TABLE annotations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL REFERENCES sessions(id),
    line_start      INTEGER NOT NULL,
    col_start       INTEGER NOT NULL,
    line_end        INTEGER NOT NULL,
    col_end         INTEGER NOT NULL,
    annotation_type TEXT NOT NULL,           -- file_path | url | error | git_ref
                                             -- | port | container | test_result
    value           TEXT NOT NULL,           -- the matched text
    metadata        TEXT DEFAULT '{}',       -- JSON: parsed details
    actions         TEXT DEFAULT '[]',       -- JSON: [{label, icon, command, shortcut}]
    created_at      TEXT NOT NULL
);

CREATE INDEX idx_annotations_session ON annotations(session_id);
CREATE INDEX idx_annotations_line ON annotations(session_id, line_start);

-- ============================================================
-- A2UI COMPONENTS
-- ============================================================
CREATE TABLE a2ui_components (
    id              TEXT PRIMARY KEY,        -- component_id from A2UI JSON
    session_id      TEXT NOT NULL REFERENCES sessions(id),
    line_position   INTEGER NOT NULL,
    component_type  TEXT NOT NULL,           -- Table | Form | Button | Card | ...
    props           TEXT NOT NULL,           -- JSON: A2UI component properties
    data_bindings   TEXT DEFAULT '{}',       -- JSON: reactive data model refs
    state           TEXT NOT NULL DEFAULT 'rendered',  -- rendered | collapsed | dismissed
    created_at      TEXT NOT NULL
);

CREATE INDEX idx_a2ui_session ON a2ui_components(session_id);

-- ============================================================
-- CONNECTOR GROUPS
-- ============================================================
CREATE TABLE connector_groups (
    id              TEXT PRIMARY KEY,
    workspace_id    TEXT NOT NULL REFERENCES workspaces(id),
    name            TEXT NOT NULL,
    connector_type  TEXT NOT NULL,           -- flutter | node | docker | k8s | custom
    session_ids     TEXT NOT NULL,           -- JSON array
    health          TEXT NOT NULL DEFAULT 'healthy',  -- healthy | degraded | down
    metadata        TEXT DEFAULT '{}',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- ============================================================
-- SESSION LINKS (edges in the DAG)
-- ============================================================
CREATE TABLE session_links (
    id              TEXT PRIMARY KEY,
    source_id       TEXT NOT NULL REFERENCES sessions(id),
    target_id       TEXT NOT NULL REFERENCES sessions(id),
    link_type       TEXT NOT NULL,           -- spawned | linked | depends
    auto_detected   INTEGER DEFAULT 0,
    metadata        TEXT DEFAULT '{}',       -- JSON: {port, protocol, ...}
    created_at      TEXT NOT NULL
);

CREATE INDEX idx_links_source ON session_links(source_id);
CREATE INDEX idx_links_target ON session_links(target_id);

-- ============================================================
-- METRICS SNAPSHOTS (ring buffer, pruned to last 24h)
-- ============================================================
CREATE TABLE metrics_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       TEXT NOT NULL,
    cpu_percent     REAL,
    ram_used_bytes  INTEGER,
    ram_total_bytes INTEGER,
    swap_used_bytes INTEGER,
    battery_percent INTEGER,
    battery_charging INTEGER,
    network_type    TEXT,                    -- wifi | ethernet | none
    network_signal  INTEGER,                -- dBm for wifi
    recorded_at     TEXT NOT NULL
);

-- Pruning: DELETE WHERE recorded_at < datetime('now', '-24 hours')

-- ============================================================
-- MIGRATIONS
-- ============================================================
CREATE TABLE schema_migrations (
    version         INTEGER PRIMARY KEY,
    applied_at      TEXT NOT NULL
);
```

**WAL mode is enabled at connection open:**
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;    -- safe with WAL, better write performance
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;     -- wait up to 5s for writer lock
```

---

### 2.6 COW Filesystem

The COW (Copy-on-Write) filesystem is Ocean's most architecturally significant subsystem.
It provides per-session code isolation at near-zero cost, replacing git worktrees entirely.

#### Core Concept

Every session with `fs_mode = cow` gets a layered filesystem view:

```
Session's mount point (what the process sees as its working directory)
    |
    |  READ: check layers top-down, return first hit
    |  WRITE: always goes to the topmost (session delta) layer
    |
    +-- [Layer 0] Session delta     (read-write, initially empty)
    +-- [Layer 1] Parent delta      (read-only, only if child session)
    +-- [Layer N] Ancestor deltas   (read-only, stacked)
    +-- [Layer N+1] Base snapshot   (read-only, hard-linked from repo)
```

When a process reads a file, the layers are checked top-down. The first layer containing
the file wins. When a process writes a file, the write always targets Layer 0 (the session's
own delta). If the file existed in a lower layer, it is first copied to Layer 0 (the "copy"
in copy-on-write), then the write applies to the copy.

#### macOS Implementation: NFS Loopback + SQLite Delta Tracking

macOS does not have a kernel-level overlay filesystem (no OverlayFS). Ocean uses an NFS
loopback mount -- the same approach proven by the AgentFS project for agent-based
development.

**How it works:**

1. **Snapshot creation.** When a workspace is created, Ocean creates a read-only snapshot
   of the repository using `clonefile()` (APFS copy-on-write clones) or hard links. This
   is nearly instant and uses negligible disk space on APFS volumes.

2. **NFS server (in-process).** Ocean runs a lightweight NFS v3 server on localhost
   (127.0.0.1). This server is implemented in Rust using the `nfs3_server` trait pattern --
   it handles `LOOKUP`, `READ`, `WRITE`, `CREATE`, `REMOVE`, `GETATTR`, and `READDIR`
   operations.

3. **Layer resolution.** On every `LOOKUP` or `READ`, the NFS server resolves the file
   path through the layer stack:
   - Check the session delta directory (`~/.ocean/deltas/<session_id>/`)
   - If not found and session has a parent, check parent's delta
   - Continue up the ancestor chain
   - Fall back to the base snapshot

4. **Write interception.** On every `WRITE` or `CREATE`, the NFS server:
   - Writes the data to the session delta directory
   - Records the operation in SQLite (`session_states.modified_files`)
   - Notifies the Conflict Detector via an in-process channel

5. **Mount.** Each session's working directory is an NFS mount:
   ```
   mount -t nfs -o port=<port>,mountport=<port>,vers=3,tcp,locallocks \
       127.0.0.1:/<session_id> /path/to/session/mount
   ```

**Delta tracking in SQLite:**

Every file write is recorded atomically:
```sql
-- On first write to a file in this session:
UPDATE session_states
SET modified_files = json_insert(modified_files, '$[#]', '/src/auth/session.ts'),
    delta_size_bytes = delta_size_bytes + <file_size>,
    updated_at = datetime('now')
WHERE session_id = '<session_id>';
```

**Performance characteristics:**
- Read overhead: ~5% vs direct filesystem (NFS loopback over TCP on localhost)
- Write overhead: ~8% (NFS + SQLite metadata write)
- Snapshot creation: <100ms on APFS (clonefile)
- Mount time: <200ms (NFS mount negotiation)

#### Linux Implementation: OverlayFS with FUSE Fallback

Linux has native OverlayFS support in the kernel, which is the preferred implementation.

**Primary: OverlayFS (requires CAP_SYS_ADMIN or user namespace):**

```bash
mount -t overlay overlay \
    -o lowerdir=<parent_delta>:<base_snapshot>,\
       upperdir=<session_delta>,\
       workdir=<session_workdir> \
    <mount_point>
```

- `lowerdir`: Colon-separated list of read-only layers (parent delta, base snapshot).
  OverlayFS supports stacking multiple lower directories natively.
- `upperdir`: The session's delta directory (all writes land here).
- `workdir`: Required by OverlayFS for atomic operations (same filesystem as `upperdir`).

OverlayFS is zero-overhead for reads (kernel resolves layers in VFS, no userspace
round-trip). Write overhead is minimal (copy-up on first write to a lower-layer file).

**Fallback: FUSE (unprivileged, no CAP_SYS_ADMIN):**

If OverlayFS mount fails (e.g., rootless container, restricted environment), Ocean falls
back to a FUSE-based overlay implemented in Rust using the `fuser` crate. The FUSE
implementation mirrors the NFS loopback logic: layer resolution on read, delta-directory
writes, SQLite metadata tracking.

FUSE has higher overhead than kernel OverlayFS (~10-15% on reads) but requires no
privileges beyond FUSE group membership.

**Detection order:**
1. Try OverlayFS mount. If it succeeds, use it.
2. If OverlayFS fails with EPERM, try FUSE.
3. If FUSE is unavailable, fall back to full directory copy (degraded mode, warns user).

#### Shared Mount Strategy

Large dependency directories should NOT be copied into each session's delta. They are
read-only and shared across all sessions in a workspace.

**Shared directories (configured per workspace, auto-detected by connector type):**

| Directory | Detected by | Mount strategy |
|-----------|-------------|----------------|
| `node_modules/` | `package.json` present | Bind mount (read-only) from base snapshot |
| `.dart_tool/` | `pubspec.yaml` present | Bind mount (read-only) from base snapshot |
| `build/`, `dist/`, `.next/` | Build output heuristics | Bind mount (read-only) OR session-local if build process writes here |
| `.git/` | Always | Bind mount (read-only) from original repo; git writes go through Ocean's translation layer |
| `vendor/` | `go.mod`, `Gemfile` present | Bind mount (read-only) from base snapshot |
| `__pycache__/`, `.venv/` | `requirements.txt`, `pyproject.toml` | Bind mount (read-only) from base snapshot |

**Implementation:** Before mounting the COW overlay, Ocean bind-mounts each shared directory
into the mount point as read-only. These bind mounts are layered beneath the COW overlay,
so any attempt to write to them will be caught by the overlay and redirected to the delta
directory. This means a session CAN write to `node_modules/` if it needs to (e.g.,
`npm install` adds a package), but the write goes to the delta, not the shared base.

#### Delta Storage Format

Each session's delta is a plain directory mirroring the repo structure:

```
~/.ocean/deltas/<session_id>/
    src/
        auth/
            session.ts          # modified file (full copy)
            tokens.ts           # new file
    .ocean_tombstones           # list of deleted file paths (one per line)
```

**Why full file copies, not binary diffs?**

1. Simplicity. The NFS/OverlayFS layer can serve files directly from the delta directory
   without a reconstruction step.
2. Performance. No diff-apply on every read.
3. Conflict detection. Full files can be diffed against each other (session A's version
   vs session B's version) without reconstructing from a base.

**Tombstone file (`.ocean_tombstones`):**

When a session deletes a file that exists in a lower layer, the deletion is recorded in
`.ocean_tombstones` so that the overlay layer returns ENOENT for that path even though the
lower layer still has it. On Linux OverlayFS, this is handled natively by whiteout files.
On NFS loopback (macOS), Ocean's NFS server checks the tombstone list before falling through
to lower layers.

#### File Write Interception for Conflict Detection

The Conflict Detector receives a stream of `FileWriteEvent` records from the filesystem
layer:

```
FileWriteEvent {
    session_id: UUID,
    file_path: String,           // relative to repo root
    operation: Modified | Created | Deleted,
    byte_range: Option<(u64, u64)>,  // offset + length for partial writes
    timestamp: Instant,
}
```

**Detection algorithm:**

```
on FileWriteEvent(session_id, file_path, ...):
    sessions_touching_file = lookup(file_path)  // HashMap<FilePath, HashSet<SessionId>>
    sessions_touching_file.insert(session_id)

    if sessions_touching_file.len() > 1:
        // Multiple sessions have modified the same file
        for other_session in sessions_touching_file - {session_id}:
            overlap = compute_line_overlap(
                delta_file(session_id, file_path),
                delta_file(other_session, file_path),
                base_file(file_path)
            )
            match overlap:
                Disjoint(ranges)    -> emit(severity=disjoint, auto_mergeable=true)
                Overlapping(ranges) -> emit(severity=overlapping)
                Conflicting(ranges) -> emit(severity=conflicting)
```

**`compute_line_overlap` logic:**

1. Diff session A's version against base -> get A's changed line ranges.
2. Diff session B's version against base -> get B's changed line ranges.
3. Intersect the two sets of line ranges.
4. If intersection is empty -> `Disjoint`.
5. If intersection is non-empty but changes are compatible (e.g., both added the same
   lines) -> `Overlapping`.
6. If intersection is non-empty and changes differ -> `Conflicting`.

The diff computation uses the `similar` crate (Rust implementation of the patience diff
algorithm), the same algorithm used by git for high-quality diffs.

---

## 3. Module Architecture (Rust Backend)

```
src-tauri/src/
|
+-- main.rs                      // Tauri app entry point, plugin registration,
|                                // runtime configuration, command registration
|
+-- commands.rs                  // All #[tauri::command] handler functions.
|                                // Thin layer: validates input, delegates to
|                                // domain modules, serializes output.
|
+-- db.rs                        // SQLite connection pool (r2d2 + rusqlite),
|                                // schema migrations, query helpers.
|
+-- session/
|   +-- mod.rs                   // SessionManager: public API surface.
|   |                            // Owns the in-memory DAG and coordinates
|   |                            // with FilesystemManager, Terminal, DB.
|   +-- dag.rs                   // DAG data structure. Adjacency list with
|   |                            // typed edges (spawned/linked/depends).
|   |                            // Topological sort for merge ordering.
|   |                            // Cycle detection (must remain acyclic).
|   +-- workspace.rs             // Workspace lifecycle: create (snapshot repo),
|   |                            // archive, restore, translate-to-git.
|   +-- state.rs                 // Session state machine:
|                                // active -> idle -> waiting -> completed
|                                //                          -> failed
|                                // Transition rules and event emission.
|
+-- filesystem/
|   +-- mod.rs                   // FilesystemManager: public API.
|   |                            // Dispatches to platform-specific impl.
|   +-- overlay_macos.rs         // NFS loopback server implementation.
|   |                            // Handles LOOKUP, READ, WRITE, CREATE,
|   |                            // REMOVE, GETATTR, READDIR.
|   |                            // Manages per-session NFS exports.
|   +-- overlay_linux.rs         // OverlayFS mount/umount via nix crate.
|   |                            // FUSE fallback via fuser crate.
|   +-- snapshot.rs              // Repo snapshot creation:
|   |                            // APFS clonefile() on macOS,
|   |                            // reflink on btrfs/XFS,
|   |                            // hard-link tree on ext4.
|   +-- delta.rs                 // Delta directory management.
|   |                            // File copy-on-write, tombstone tracking,
|   |                            // size calculation, delta-to-diff conversion.
|   +-- conflict.rs              // ConflictDetector: receives FileWriteEvents,
|                                // maintains file->sessions map, computes
|                                // line-range overlap, emits ConflictAlerts.
|
+-- terminal/
|   +-- mod.rs                   // PTY management via portable-pty.
|   |                            // Spawn, resize, read, write, kill.
|   |                            // I/O bridge: PTY stdout -> annotator + IPC.
|   +-- annotator.rs             // OutputAnnotator: compiled RegexSet,
|   |                            // processes each line, produces Annotations.
|   |                            // Pattern registry (built-in + user-defined).
|   +-- a2ui.rs                  // A2UI escape sequence parser.
|                                // Detects OSC sequences, validates JSON
|                                // against A2UI schema, emits A2UIComponent
|                                // events to frontend.
|
+-- metrics/
|   +-- mod.rs                   // MetricsCollector: orchestrates all metric
|   |                            // sources, manages polling intervals,
|   |                            // emits unified MetricsEvent to frontend.
|   +-- system.rs                // CPU, RAM, swap, battery, disk usage
|   |                            // via sysinfo crate.
|   +-- network.rs               // Network interface status, WiFi signal,
|   |                            // latency probes to github.com, npmjs.com.
|   +-- process.rs               // Per-process metrics: CPU, RAM, threads,
|   |                            // file descriptors. Uses sysinfo per-PID API.
|   +-- git.rs                   // Git status watcher: branch, ahead/behind,
|                                // staged/modified/untracked counts, CI status.
|                                // Uses git2 + notify (fs watcher) for
|                                // event-driven updates with polling fallback.
|
+-- connector/
|   +-- mod.rs                   // Connector engine: manages ConnectorGroups,
|   |                            // coordinates auto-detection, health checks.
|   +-- detect.rs                // Auto-detection: process tree scanning
|   |                            // (every 2s), port scanning, pattern matching
|   |                            // against known process signatures.
|   +-- flutter.rs               // Flutter connector: detects VM service URL,
|   |                            // DevTools port, adb processes.
|   +-- node.rs                  // Node.js connector: detects --inspect port,
|   |                            // Chrome DevTools protocol endpoints.
|   +-- docker.rs                // Docker connector: detects docker-compose
|                                // containers, port mappings, container health.
|
+-- git_translate/
    +-- mod.rs                   // Git translation layer: coordinates
    |                            // session->commit and workspace->PR flows.
    +-- commit.rs                // Session delta -> git commit:
    |                            // applies delta files to a git index,
    |                            // creates commit with agent metadata
    |                            // in trailers (git2 API).
    +-- pr.rs                    // Workspace -> PR: generates PR body from
                                 // DAG history (which agents worked on what,
                                 // conflict resolutions, merge order).
                                 // Calls gh CLI for PR creation.
```

**Module dependency graph:**

```
commands.rs
    |
    +---> session/mod.rs
    |         |
    |         +---> session/dag.rs
    |         +---> session/workspace.rs ---> filesystem/mod.rs
    |         +---> session/state.rs
    |         +---> terminal/mod.rs
    |         +---> db.rs
    |
    +---> filesystem/mod.rs
    |         |
    |         +---> filesystem/overlay_macos.rs (cfg(target_os = "macos"))
    |         +---> filesystem/overlay_linux.rs  (cfg(target_os = "linux"))
    |         +---> filesystem/snapshot.rs
    |         +---> filesystem/delta.rs
    |         +---> filesystem/conflict.rs
    |         +---> db.rs
    |
    +---> terminal/mod.rs
    |         |
    |         +---> terminal/annotator.rs
    |         +---> terminal/a2ui.rs
    |         +---> db.rs
    |
    +---> metrics/mod.rs
    |         |
    |         +---> metrics/system.rs
    |         +---> metrics/network.rs
    |         +---> metrics/process.rs
    |         +---> metrics/git.rs
    |
    +---> connector/mod.rs
    |         |
    |         +---> connector/detect.rs
    |         +---> connector/flutter.rs
    |         +---> connector/node.rs
    |         +---> connector/docker.rs
    |
    +---> git_translate/mod.rs
              |
              +---> git_translate/commit.rs
              +---> git_translate/pr.rs
```

---

## 4. Frontend Architecture

```
src/
|
+-- App.tsx                       // Root component. Sets up router, global
|                                 // context providers (ActiveSession, Theme,
|                                 // UserPrefs), initializes Tauri event
|                                 // listeners.
|
+-- index.tsx                     // Entry point. Mounts App into DOM.
|                                 // Initializes xterm.js WebGL context.
|
+-- components/
|   |
|   +-- StatusBar/
|   |   +-- StatusBar.tsx         // Top bar container. Horizontal layout
|   |   +-- NetworkIndicator.tsx  // WiFi/Ethernet icon + signal
|   |   +-- SystemMetrics.tsx     // RAM bar + CPU bar + battery
|   |   +-- GitStatusBadge.tsx    // Branch name, ahead/behind, CI dot
|   |   +-- AgentStatusRow.tsx    // Per-agent status indicators
|   |
|   +-- SessionSidebar/
|   |   +-- SessionSidebar.tsx    // Left sidebar container
|   |   +-- WorkspaceGroup.tsx    // Collapsible workspace with sessions
|   |   +-- SessionNode.tsx       // Single session: icon, name, status,
|   |   |                         // delta indicator, last activity time.
|   |   |                         // Recursive for child sessions.
|   |   +-- WorkspaceActions.tsx  // New session, new workspace buttons
|   |
|   +-- TerminalPane/
|   |   +-- TerminalPane.tsx      // Wraps xterm.js Terminal instance.
|   |   |                         // Manages lifecycle: create, attach to
|   |   |                         // IPC stream, resize, dispose.
|   |   +-- PaneSplitter.tsx      // Drag handle for splitting/resizing
|   |   +-- TerminalTabs.tsx      // Tab bar when multiple panes exist
|   |
|   +-- AnnotationOverlay/
|   |   +-- AnnotationOverlay.tsx // Positioned over xterm.js canvas.
|   |   |                         // Receives annotation list from store,
|   |   |                         // renders clickable elements at buffer
|   |   |                         // positions using xterm decoration API.
|   |   +-- AnnotationBadge.tsx   // Single annotation: hover tooltip,
|   |   |                         // click handler, context menu.
|   |   +-- ContextMenu.tsx       // Right-click menu for annotations
|   |
|   +-- A2UIRenderer/
|   |   +-- A2UIRenderer.tsx      // Dispatches A2UI JSON to component
|   |   |                         // renderers. Positioned inline in
|   |   |                         // terminal buffer via decorations.
|   |   +-- A2UITable.tsx         // Sortable, filterable table
|   |   +-- A2UIForm.tsx          // Input fields, selects, checkboxes
|   |   +-- A2UIButton.tsx        // Button and ButtonGroup
|   |   +-- A2UICard.tsx          // Card and CardGroup
|   |   +-- A2UICodeBlock.tsx     // Syntax-highlighted code with copy
|   |   +-- A2UIDiff.tsx          // Inline diff viewer
|   |   +-- A2UIProgress.tsx      // Progress bar, spinner
|   |   +-- A2UIChart.tsx         // Bar/line charts (canvas-based)
|   |   +-- A2UITree.tsx          // Collapsible tree view
|   |   +-- A2UIImage.tsx         // Image display (Kitty protocol)
|   |
|   +-- GitPanel/
|   |   +-- GitPanel.tsx          // Right panel: branch, staged, modified,
|   |   |                         // recent commits, PR status.
|   |   +-- StagedFiles.tsx       // List of staged files with actions
|   |   +-- ModifiedFiles.tsx     // List of modified files with actions
|   |   +-- CommitHistory.tsx     // Recent commits list
|   |   +-- DiffViewer.tsx        // Inline diff for selected file
|   |
|   +-- ConnectorBar/
|   |   +-- ConnectorBar.tsx      // Bottom bar: connector group status
|   |   +-- ConnectorGroup.tsx    // Group of connected processes
|   |   +-- ProcessNode.tsx       // Single process: name, PID, health
|   |
|   +-- GraphView/
|   |   +-- GraphView.tsx         // Full-screen DAG visualization.
|   |   |                         // Canvas-based rendering of session
|   |   |                         // graph with zoom, pan, click-to-focus.
|   |   +-- GraphNode.tsx         // Session/workspace node in graph
|   |   +-- GraphEdge.tsx         // Edge rendering (spawned/linked/depends)
|   |   +-- GraphLegend.tsx       // Legend overlay
|   |
|   +-- MergePanel/
|   |   +-- MergePanel.tsx        // Appears when session completes.
|   |   |                         // Shows delta summary, file list,
|   |   |                         // merge target, confirm/discard.
|   |   +-- DeltaSummary.tsx      // File count, size, changed lines
|   |   +-- MergeActions.tsx      // Merge, discard, inspect buttons
|   |
|   +-- ConflictAlert/
|   |   +-- ConflictAlert.tsx     // Modal/toast for conflict detection.
|   |   |                         // Shows file, sessions, overlap region,
|   |   |                         // severity, action buttons.
|   |   +-- ConflictDiff.tsx      // Side-by-side diff of conflicting changes
|   |
|   +-- CommandPalette/
|       +-- CommandPalette.tsx    // Cmd+Shift+P fuzzy search over all
|       +-- CommandList.tsx       // commands, sessions, workspaces.
|       +-- CommandItem.tsx       // Single command with keybinding hint
|
+-- stores/
|   +-- sessionStore.ts           // Workspace list, session tree, active
|   |                             // session. Updated by Tauri events:
|   |                             // session_created, session_state_changed,
|   |                             // session_removed.
|   +-- metricsStore.ts           // System metrics, network status.
|   |                             // Updated by metrics_update events.
|   +-- gitStore.ts               // Git branch, status, PR info.
|   |                             // Updated by git_status_changed events.
|   +-- annotationStore.ts        // Per-session annotation lists.
|   |                             // Updated by annotation_created events.
|   +-- conflictStore.ts          // Active conflicts list.
|   |                             // Updated by conflict_detected events.
|   +-- connectorStore.ts         // Connector groups.
|   |                             // Updated by connector_changed events.
|   +-- uiStore.ts                // UI state: active panel, sidebar width,
|                                 // theme, pane layout, command palette open.
|
+-- hooks/
|   +-- useSession.ts             // invoke('create_session', ...), etc.
|   |                             // Returns signals auto-updated by events.
|   +-- useTerminal.ts            // invoke('write_to_pty', ...),
|   |                             // listen('pty_output', ...).
|   |                             // Manages xterm.js Terminal instance.
|   +-- useMetrics.ts             // listen('metrics_update', ...).
|   +-- useGit.ts                 // invoke('git_stage', ...), etc.
|   +-- useConflict.ts            // listen('conflict_detected', ...).
|   +-- useConnector.ts           // invoke('get_connectors', ...).
|   +-- useA2UI.ts                // listen('a2ui_component', ...).
|   +-- useKeyboard.ts            // Global keyboard shortcut registration.
|
+-- lib/
    +-- ipc.ts                    // Typed wrapper around @tauri-apps/api.
    |                             // All invoke() calls go through here
    |                             // with TypeScript types matching Rust.
    +-- a2ui-schema.ts            // A2UI JSON schema validation.
    +-- terminal-utils.ts         // xterm.js helper functions.
    +-- graph-layout.ts           // DAG layout algorithm (Sugiyama/layered).
    +-- theme.ts                  // Color tokens, dark/light mode.
    +-- keybindings.ts            // Keybinding definitions and conflict
                                  // resolution.
```

---

## 5. IPC Contract

All communication between the SolidJS frontend and the Rust backend goes through Tauri's
IPC mechanism. Commands are request-response (frontend invokes, backend returns). Events are
push (backend emits, frontend listens).

### 5.1 Tauri Commands (Frontend -> Backend)

#### Session Management

| Command | Parameters | Return Type | Description |
|---------|-----------|-------------|-------------|
| `create_workspace` | `{ name: string, repo_path: string }` | `Workspace` | Snapshot repo, create workspace record |
| `create_session` | `{ workspace_id: string, parent_id?: string, name: string, session_type: "shell"\|"agent"\|"process", fs_mode: "cow"\|"shared"\|"none", edge_type?: "spawned"\|"linked"\|"depends" }` | `Session` | Create session, set up COW layer, spawn PTY |
| `kill_session` | `{ session_id: string, preserve_delta?: boolean }` | `void` | Kill process, unmount overlay |
| `merge_session` | `{ session_id: string, target: "parent"\|"workspace" }` | `MergeResult` | Apply delta to target, detect conflicts |
| `archive_workspace` | `{ workspace_id: string }` | `void` | Archive workspace and all sessions |
| `get_workspaces` | `{}` | `Workspace[]` | List all workspaces |
| `get_session_tree` | `{ workspace_id: string }` | `SessionTree` | Full session DAG for workspace |
| `get_session_state` | `{ session_id: string }` | `SessionState` | COW delta info for session |
| `set_session_name` | `{ session_id: string, name: string }` | `void` | Rename session |

#### Terminal

| Command | Parameters | Return Type | Description |
|---------|-----------|-------------|-------------|
| `write_to_pty` | `{ session_id: string, data: Uint8Array }` | `void` | Send bytes to PTY stdin |
| `resize_pty` | `{ session_id: string, cols: number, rows: number }` | `void` | Resize PTY |
| `get_scrollback` | `{ session_id: string, offset: number, limit: number }` | `string` | Read scrollback buffer |

#### Metrics

| Command | Parameters | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_system_metrics` | `{}` | `SystemMetrics` | One-shot current metrics |
| `get_process_metrics` | `{ pid: number }` | `ProcessMetrics` | Metrics for specific PID |
| `get_network_status` | `{}` | `NetworkStatus` | Current network state |

#### Git

| Command | Parameters | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_git_status` | `{ repo_path: string }` | `GitStatus` | Branch, staged, modified, etc. |
| `git_stage` | `{ repo_path: string, file_path: string }` | `void` | Stage file |
| `git_unstage` | `{ repo_path: string, file_path: string }` | `void` | Unstage file |
| `git_commit` | `{ repo_path: string, message: string }` | `string` | Create commit, return hash |
| `git_diff` | `{ repo_path: string, file_path?: string }` | `string` | Get diff (all or specific file) |
| `translate_to_git` | `{ workspace_id: string, create_pr?: boolean }` | `GitTranslateResult` | Session DAG -> git commits, optional PR |

#### Connectors

| Command | Parameters | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_connectors` | `{ workspace_id: string }` | `ConnectorGroup[]` | List connector groups |
| `create_connector` | `{ workspace_id: string, name: string, session_ids: string[] }` | `ConnectorGroup` | Manual connector creation |
| `kill_connector_group` | `{ connector_id: string }` | `void` | Kill all processes in group |

#### Conflicts

| Command | Parameters | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_conflicts` | `{ workspace_id: string }` | `Conflict[]` | List active conflicts |
| `resolve_conflict` | `{ conflict_id: string, resolution: "auto-merge"\|"session-wins"\|"manual", winning_session_id?: string }` | `void` | Resolve a conflict |

#### Annotations

| Command | Parameters | Return Type | Description |
|---------|-----------|-------------|-------------|
| `get_annotations` | `{ session_id: string, line_start: number, line_end: number }` | `Annotation[]` | Get annotations in range |
| `execute_annotation_action` | `{ annotation_id: number, action_index: number }` | `void` | Execute an annotation action |

### 5.2 Tauri Events (Backend -> Frontend)

Events are pushed from the Rust backend to all listening frontend windows.

| Event Name | Payload Type | Trigger | Rate |
|------------|-------------|---------|------|
| `pty_output` | `{ session_id: string, data: Uint8Array }` | PTY stdout has data | Per byte chunk (batched, ~60 Hz) |
| `session_created` | `Session` | New session created (including auto-detected) | On creation |
| `session_state_changed` | `{ session_id: string, old_status: string, new_status: string }` | State machine transition | On transition |
| `session_removed` | `{ session_id: string }` | Session killed/archived | On removal |
| `metrics_update` | `SystemMetrics` | Periodic system metrics | Every 2000ms |
| `network_update` | `NetworkStatus` | Network state change | Every 5000ms or on change |
| `git_status_changed` | `GitStatus` | File change in repo detected | On fs event (debounced 500ms) |
| `annotation_created` | `{ session_id: string, annotation: Annotation }` | New annotation found in output | Per annotation |
| `a2ui_component` | `{ session_id: string, component: A2UIComponent }` | A2UI escape sequence parsed | Per component |
| `conflict_detected` | `Conflict` | Conflict detector finds overlap | Per conflict |
| `conflict_resolved` | `{ conflict_id: string }` | Conflict resolved | Per resolution |
| `connector_changed` | `ConnectorGroup` | Connector group created/updated/removed | On change |
| `process_detected` | `{ session_id: string, child_pid: number, name: string }` | Auto-detected child process | Per detection |
| `merge_completed` | `{ session_id: string, result: MergeResult }` | Session merge finished | Per merge |
| `workspace_translated` | `{ workspace_id: string, result: GitTranslateResult }` | Git translation done | Per translation |

### 5.3 Event Payload Types (TypeScript)

```typescript
// ---- Core Types ----

interface Workspace {
  id: string;
  name: string;
  repo_path: string;
  base_snapshot: string;
  base_commit: string;
  merged_state: string | null;
  git_branch: string | null;
  git_pr_url: string | null;
  status: "active" | "archived";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface Session {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  session_type: "shell" | "agent" | "process";
  fs_mode: "cow" | "shared" | "none";
  edge_type: "spawned" | "linked" | "depends";
  agent_type: string | null;
  pid: number | null;
  pty_id: string | null;
  status: "active" | "idle" | "waiting" | "failed" | "completed" | "archived";
  exit_code: number | null;
  cwd: string;
  started_at: string;
  ended_at: string | null;
}

interface SessionState {
  session_id: string;
  delta_path: string;
  parent_delta_id: string | null;
  mount_path: string;
  modified_files: string[];
  created_files: string[];
  deleted_files: string[];
  delta_size_bytes: number;
  merged_to_parent: boolean;
  merged_at: string | null;
  git_commit: string | null;
}

interface SessionTree {
  workspace: Workspace;
  sessions: Session[];
  links: SessionLink[];
}

interface SessionLink {
  id: string;
  source_id: string;
  target_id: string;
  link_type: "spawned" | "linked" | "depends";
  auto_detected: boolean;
  metadata: Record<string, unknown>;
}

// ---- Metrics ----

interface SystemMetrics {
  cpu_percent: number;
  ram_used_bytes: number;
  ram_total_bytes: number;
  swap_used_bytes: number;
  battery_percent: number | null;
  battery_charging: boolean | null;
  disk_used_bytes: number;
  disk_total_bytes: number;
  timestamp: string;
}

interface ProcessMetrics {
  pid: number;
  name: string;
  cpu_percent: number;
  ram_bytes: number;
  threads: number;
  open_fds: number;
}

interface NetworkStatus {
  connected: boolean;
  interface_type: "wifi" | "ethernet" | "none";
  signal_dbm: number | null;
  ssid: string | null;
  latency_github_ms: number | null;
  latency_npm_ms: number | null;
}

// ---- Git ----

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  conflicted: string[];
  ci_status: "passing" | "failing" | "pending" | "unknown" | null;
  pr_number: number | null;
  pr_url: string | null;
  pr_approvals: number | null;
}

interface GitTranslateResult {
  commits: Array<{ hash: string; message: string; session_id: string }>;
  pr_url: string | null;
  branch: string;
}

// ---- Annotations ----

interface Annotation {
  id: number;
  session_id: string;
  line_start: number;
  col_start: number;
  line_end: number;
  col_end: number;
  annotation_type:
    | "file_path"
    | "url"
    | "error"
    | "git_ref"
    | "port"
    | "container"
    | "test_result";
  value: string;
  metadata: Record<string, unknown>;
  actions: AnnotationAction[];
}

interface AnnotationAction {
  label: string;
  icon: string;
  command: string;
  shortcut: string | null;
}

// ---- A2UI ----

interface A2UIComponent {
  id: string;
  session_id: string;
  line_position: number;
  component_type: string;
  props: Record<string, unknown>;
  data_bindings: Record<string, unknown>;
  state: "rendered" | "collapsed" | "dismissed";
}

// ---- Conflicts ----

interface Conflict {
  id: string;
  workspace_id: string;
  file_path: string;
  session_ids: string[];
  overlap_ranges: Array<{
    line_start: number;
    line_end: number;
    session_id: string;
  }>;
  severity: "disjoint" | "overlapping" | "conflicting";
  resolved: boolean;
  resolution: string | null;
  detected_at: string;
}

// ---- Merge ----

interface MergeResult {
  status: "clean" | "conflicts";
  applied_files: string[];
  conflicts: Conflict[];
}

// ---- Connectors ----

interface ConnectorGroup {
  id: string;
  workspace_id: string;
  name: string;
  connector_type: "flutter" | "node" | "docker" | "k8s" | "custom";
  session_ids: string[];
  health: "healthy" | "degraded" | "down";
  metadata: Record<string, unknown>;
}
```

---

## 6. Data Flow Diagrams

### 6.1 Session Creation Flow (with COW Layer Setup)

```
User clicks "New Session" (or Cmd+T)
    |
    v
[Frontend: SessionSidebar]
    |
    | invoke('create_session', { workspace_id, name, type, fs_mode: 'cow' })
    v
[Backend: commands.rs -> create_session()]
    |
    +---> [session/mod.rs: SessionManager::create_session()]
    |         |
    |         +---> [db.rs] INSERT INTO sessions (...)
    |         |
    |         +---> [filesystem/mod.rs: FilesystemManager::create_overlay()]
    |         |         |
    |         |         +--- (macOS) ---> [overlay_macos.rs]
    |         |         |                     |
    |         |         |                     +-- mkdir delta dir: ~/.ocean/deltas/<session_id>/
    |         |         |                     +-- register NFS export for session
    |         |         |                     +-- mount -t nfs 127.0.0.1:/<session_id> <mount>
    |         |         |                     +-- bind-mount shared dirs (node_modules, etc.)
    |         |         |                     +-- return mount_path
    |         |         |
    |         |         +--- (Linux) ----> [overlay_linux.rs]
    |         |                               |
    |         |                               +-- mkdir delta dir + workdir
    |         |                               +-- mount -t overlay (OverlayFS)
    |         |                               +-- OR fuser mount (FUSE fallback)
    |         |                               +-- bind-mount shared dirs
    |         |                               +-- return mount_path
    |         |
    |         +---> [db.rs] INSERT INTO session_states (delta_path, mount_path, ...)
    |         |
    |         +---> [filesystem/conflict.rs] ConflictDetector::register_session()
    |         |
    |         +---> [terminal/mod.rs: TerminalManager::spawn_pty()]
    |         |         |
    |         |         +-- portable_pty::CommandBuilder::new(shell)
    |         |         +-- set cwd = mount_path (session sees isolated filesystem)
    |         |         +-- set env: OCEAN_SESSION_ID, OCEAN_WORKSPACE
    |         |         +-- spawn -> PtyPair { master, slave }
    |         |         +-- tokio::spawn(pty_io_bridge) -- read loop
    |         |
    |         +---> [session/dag.rs] DAG::add_node(session, parent_edge)
    |         |
    |         +---> return Session { id, mount_path, pty_id, status: active, ... }
    |
    | emit event: 'session_created' -> Session
    v
[Frontend: sessionStore] updates session tree
    |
    v
[Frontend: TerminalPane] creates xterm.js Terminal, attaches to IPC stream
    |
    v
[Frontend: SessionSidebar] re-renders with new session node
```

**Total time budget: <500ms** (breakdown: delta dir mkdir <1ms, NFS mount <200ms, PTY
spawn <50ms, SQLite writes <10ms, IPC round-trip <20ms, frontend render <50ms).

### 6.2 File Write -> Conflict Detection Flow

```
Agent in Session A writes to src/auth/session.ts
    |
    v
[OS: write() syscall hits COW overlay]
    |
    +--- (macOS: NFS server intercepts WRITE)
    |    |
    |    +-- Copy file from lower layer to delta dir (copy-on-write)
    |    +-- Apply write to delta copy
    |    +-- Record in SQLite: session_states.modified_files += file_path
    |    +-- Send FileWriteEvent to conflict detector channel
    |
    +--- (Linux: OverlayFS copy-up + notify watcher)
         |
         +-- OverlayFS performs copy-up automatically
         +-- notify (inotify) fires IN_MODIFY on delta dir
         +-- FilesystemManager receives notify event
         +-- Record in SQLite: session_states.modified_files += file_path
         +-- Send FileWriteEvent to conflict detector channel
    |
    v
[filesystem/conflict.rs: ConflictDetector::on_file_write()]
    |
    +-- Lookup file_path in sessions_map: HashMap<FilePath, HashSet<SessionId>>
    |
    +-- Insert current session_id
    |
    +-- If len > 1: multiple sessions touching same file
    |       |
    |       +-- For each other_session:
    |       |       |
    |       |       +-- Read session A's delta version of file
    |       |       +-- Read other_session's delta version of file
    |       |       +-- Read base version of file
    |       |       +-- Diff A vs base -> A's changed line ranges
    |       |       +-- Diff other vs base -> other's changed line ranges
    |       |       +-- Intersect ranges
    |       |       |
    |       |       +-- Empty intersection:
    |       |       |       severity = Disjoint (auto-mergeable)
    |       |       |
    |       |       +-- Non-empty, compatible changes:
    |       |       |       severity = Overlapping (warn)
    |       |       |
    |       |       +-- Non-empty, incompatible:
    |       |               severity = Conflicting (pause agent)
    |       |
    |       +-- INSERT INTO conflicts (...)
    |       +-- emit event: 'conflict_detected' -> Conflict
    |
    +-- If len == 1: no conflict, return
    |
    v
[Frontend: conflictStore] receives conflict_detected event
    |
    v
[Frontend: ConflictAlert] renders modal/toast with:
    - File path
    - Session names involved
    - Overlap region (line numbers)
    - Severity badge
    - Action buttons: [Pause Agent] [Let Both Continue] [Merge Now] [Show Diffs]
```

**Total time budget: <100ms** from write syscall to conflict alert appearing in UI.

### 6.3 Agent Output -> Annotation -> User Click Flow

```
Claude Code agent writes output to PTY:
  "Error: src/auth/login_page.dart:42:15: Expected ';'"
    |
    v
[terminal/mod.rs: pty_io_bridge task]
    |
    +-- Read bytes from PTY stdout
    |
    +-- [tee 1] Send raw bytes to frontend:
    |       emit event: 'pty_output' { session_id, data }
    |
    +-- [tee 2] Convert to UTF-8 string, split by newline
    |       |
    |       v
    |   [terminal/annotator.rs: OutputAnnotator::process_line()]
    |       |
    |       +-- Run compiled RegexSet against line
    |       |   (all patterns tested in parallel in single pass)
    |       |
    |       +-- Match found: file_path pattern
    |       |   "src/auth/login_page.dart:42:15"
    |       |
    |       +-- Create Annotation {
    |       |       session_id,
    |       |       line_start: <current_line>,
    |       |       col_start: 7,
    |       |       col_end: 42,
    |       |       type: file_path,
    |       |       value: "src/auth/login_page.dart:42:15",
    |       |       metadata: { file: "src/auth/login_page.dart", line: 42, col: 15 },
    |       |       actions: [
    |       |           { label: "Open File", command: "editor.open", ... },
    |       |           { label: "Ask Agent to Fix", command: "agent.fix", ... },
    |       |           { label: "Copy Path", command: "clipboard.copy", ... }
    |       |       ]
    |       |   }
    |       |
    |       +-- INSERT INTO annotations (...)
    |       +-- emit event: 'annotation_created' { session_id, annotation }
    |
    v (parallel)
[Frontend: TerminalPane/xterm.js]
    |
    +-- Receives 'pty_output' event
    +-- terminal.write(data) -> WebGL renders text
    |
    v
[Frontend: AnnotationOverlay]
    |
    +-- Receives 'annotation_created' event
    +-- Uses xterm.js decoration API:
    |       terminal.registerDecoration({
    |           marker: terminal.registerMarker(line_offset),
    |           x: col_start,
    |           width: col_end - col_start
    |       })
    +-- Renders AnnotationBadge at decoration position
    |   (underline, subtle highlight, hover shows tooltip)
    |
    v
User hovers -> tooltip: "src/auth/login_page.dart:42:15 | Open File | Ask Agent to Fix"
    |
User clicks "Open File"
    |
    v
[Frontend: AnnotationBadge click handler]
    |
    | invoke('execute_annotation_action', { annotation_id, action_index: 0 })
    v
[Backend: commands.rs -> execute_annotation_action()]
    |
    +-- Look up annotation from DB
    +-- Match action.command:
    |       "editor.open" -> open_in_editor(file, line, col)
    |       "agent.fix"   -> send_to_agent(session_id, "fix this error: ...")
    |       "clipboard.copy" -> write to system clipboard
    |
    v
[OS: editor opens file at line 42, column 15]
```

### 6.4 Session Complete -> Merge -> Git Commit Flow

```
Agent in Session 1 completes task (process exits with code 0)
    |
    v
[terminal/mod.rs: pty_io_bridge detects PTY EOF]
    |
    +-- [session/state.rs] transition: active -> completed
    +-- emit event: 'session_state_changed' { session_id, old: active, new: completed }
    |
    v
[Frontend: sessionStore] updates session status
    |
    v
[Frontend: MergePanel] appears for completed session
    |
    +-- invoke('get_session_state', { session_id })
    |       -> SessionState { modified_files: ["src/auth/session.ts", "src/auth/tokens.ts"],
    |                         created_files: ["src/auth/helpers.ts"],
    |                         delta_size_bytes: 4096, ... }
    |
    +-- Displays:
    |       Session "Claude Agent" completed (exit 0)
    |       Delta: 2 modified, 1 created, 0 deleted (4 KB)
    |       Files:
    |         M src/auth/session.ts    [Diff]
    |         M src/auth/tokens.ts     [Diff]
    |         A src/auth/helpers.ts    [View]
    |       [Merge to Workspace] [Discard] [Keep for Later]
    |
User clicks "Merge to Workspace"
    |
    | invoke('merge_session', { session_id, target: 'workspace' })
    v
[Backend: session/mod.rs: SessionManager::merge_session()]
    |
    +-- [filesystem/mod.rs: FilesystemManager::merge_deltas()]
    |       |
    |       +-- For each file in session delta:
    |       |       Copy from delta dir to workspace merged_state dir
    |       |       (or apply to parent delta if merging to parent)
    |       |
    |       +-- Check for conflicts with other active sessions' deltas
    |       |       (final check at merge time, in addition to real-time detection)
    |       |
    |       +-- If clean: return MergeResult { status: "clean", applied_files: [...] }
    |       +-- If conflicts: return MergeResult { status: "conflicts", conflicts: [...] }
    |
    +-- [db.rs] UPDATE session_states SET merged_to_parent = 1, merged_at = now()
    |
    +-- [filesystem/mod.rs] unmount_overlay(session_id) -- cleanup
    |
    +-- emit event: 'merge_completed' { session_id, result }
    |
    v
[User later clicks "Ship Workspace" (Cmd+Shift+S)]
    |
    | invoke('translate_to_git', { workspace_id, create_pr: true })
    v
[Backend: git_translate/mod.rs]
    |
    +-- [git_translate/commit.rs]
    |       |
    |       +-- Open repo with git2
    |       +-- Create branch: ocean/<workspace_name>
    |       +-- For each merged session (topological order from DAG):
    |       |       +-- Apply session's files to git index
    |       |       +-- Create commit:
    |       |           message: "<session_name>: <summary>"
    |       |           trailers:
    |       |             Ocean-Session: <session_id>
    |       |             Ocean-Agent: <agent_type>
    |       |             Ocean-Workspace: <workspace_id>
    |       |
    |       +-- Push branch to remote
    |
    +-- [git_translate/pr.rs]
    |       |
    |       +-- Generate PR body from DAG:
    |       |       ## Summary
    |       |       Workspace: "Auth Refactor"
    |       |       Sessions: 3 (2 agent, 1 manual)
    |       |       Conflicts resolved: 1 (auto-merged)
    |       |       ## Session History
    |       |       1. Claude Agent: refactored token validation (3 files)
    |       |       2. Sub-agent: added unit tests (1 file)
    |       |       3. Manual: fixed edge case in session expiry (1 file)
    |       |
    |       +-- Execute: gh pr create --title "..." --body "..."
    |       +-- Return PR URL
    |
    +-- [db.rs] UPDATE workspaces SET git_branch = ..., git_pr_url = ...
    |
    +-- emit event: 'workspace_translated' { workspace_id, result }
    |
    v
[Frontend] displays PR link, marks workspace as shipped
```

### 6.5 A2UI Rendering Pipeline

```
Agent outputs A2UI escape sequence:
  \x1b]ocean;a2ui;{"type":"Table","props":{"columns":[...],"rows":[...]}}\x07
    |
    v
[terminal/mod.rs: pty_io_bridge]
    |
    +-- Raw bytes include the escape sequence
    +-- Forward to xterm.js (xterm ignores unknown OSC sequences by default)
    +-- Forward to annotator pipeline
    |
    v
[terminal/a2ui.rs: A2UIParser]
    |
    +-- Scans byte stream for OSC pattern: \x1b]ocean;a2ui;
    +-- Extracts JSON payload until \x07 (BEL) terminator
    +-- Parses JSON with serde_json
    +-- Validates against A2UI schema:
    |       - component_type must be in allowed set
    |       - props must match component schema
    |       - no script/eval/dangerous content
    +-- Creates A2UIComponent record:
    |       {
    |         id: generated UUID,
    |         session_id: current session,
    |         line_position: current terminal line,
    |         component_type: "Table",
    |         props: { columns: [...], rows: [...] },
    |         data_bindings: {},
    |         state: "rendered"
    |       }
    +-- INSERT INTO a2ui_components (...)
    +-- emit event: 'a2ui_component' { session_id, component }
    |
    v
[Frontend: useA2UI hook]
    |
    +-- Receives 'a2ui_component' event
    +-- Updates annotationStore (A2UI section)
    |
    v
[Frontend: A2UIRenderer]
    |
    +-- Creates xterm.js decoration at line_position:
    |       const marker = terminal.registerMarker(line_position);
    |       const decoration = terminal.registerDecoration({
    |           marker,
    |           x: 0,
    |           width: terminal.cols,
    |           height: calculated_component_height
    |       });
    |
    +-- Mounts SolidJS component into decoration's DOM element:
    |       Match component_type:
    |         "Table"      -> <A2UITable props={component.props} />
    |         "Form"       -> <A2UIForm props={component.props} />
    |         "Button"     -> <A2UIButton props={component.props} />
    |         "Card"       -> <A2UICard props={component.props} />
    |         "CodeBlock"  -> <A2UICodeBlock props={component.props} />
    |         "Diff"       -> <A2UIDiff props={component.props} />
    |         "Progress"   -> <A2UIProgress props={component.props} />
    |         "Chart"      -> <A2UIChart props={component.props} />
    |         "Tree"       -> <A2UITree props={component.props} />
    |         "Image"      -> <A2UIImage props={component.props} />
    |
    v
[Rendered component is interactive]
    |
User clicks a button in the A2UI Table (e.g., [Update] on a dependency row)
    |
    v
[A2UITable onClick handler]
    |
    +-- Option A (stdin): invoke('write_to_pty', { session_id, data: "update express\n" })
    |       -> sends response back to agent via PTY stdin
    |
    +-- Option B (side-channel): invoke('a2ui_respond', {
    |       session_id, component_id, action: "update", data: { package: "express" }
    |   })
    |       -> backend routes to a WebSocket or named pipe that the agent listens on
    |
    v
Agent receives user's choice and continues execution
```

**xterm.js integration detail:** The A2UI component is rendered as a DOM element positioned
by xterm.js's decoration system. The decoration reserves vertical space in the terminal
buffer (pushes subsequent lines down), so A2UI components feel inline rather than
overlapping. When the user scrolls, the decoration moves with the terminal buffer.

When the component is dismissed (user clicks "X" or agent sends a dismiss signal), the
decoration is removed, and the terminal buffer reflows to reclaim the space.

---

## 7. Performance Targets

These targets define the performance envelope for Ocean V1. Each target has a measurement
method and a fallback strategy if the target cannot be met.

| Metric | Target | Measurement | Fallback |
|--------|--------|-------------|----------|
| **Terminal rendering** | 60 fps at 200 cols x 50 rows | xterm.js `onRender` callback timing; Chrome DevTools performance tab via `--remote-debugging-port` on WebView | Drop to canvas renderer (no WebGL) if GPU is unavailable |
| **Output annotation** | <1 ms per line | `std::time::Instant` measurement around `OutputAnnotator::process_line()` | Reduce pattern count; disable low-priority patterns (container IDs, package versions) |
| **Session spawn (with COW)** | <500 ms from click to shell prompt | End-to-end timer: IPC invoke timestamp to first PTY output byte | Pre-warm NFS exports; pre-allocate delta directories |
| **Conflict detection** | <100 ms from write syscall to alert in UI | Timestamp in `FileWriteEvent` vs timestamp when frontend receives `conflict_detected` event | Batch conflict checks to 200ms windows; skip line-range computation for disjoint-file cases |
| **System metrics update** | <50 ms per collection cycle | Timer around `MetricsCollector::get_system_metrics()` | Increase polling interval; cache previous values and diff |
| **Memory: base app** | <100 MB | `sysinfo` self-process RSS measurement; macOS Activity Monitor | Profile and reduce: smaller xterm.js scrollback buffer, lazy-load panels |
| **Memory: per session** | <20 MB additional | Delta: RSS before/after session creation | Limit scrollback buffer size; compress old scrollback to disk |
| **SQLite query** | <5 ms for any single query | `rusqlite` timing; `EXPLAIN QUERY PLAN` for index usage | Add indexes; denormalize hot paths |
| **Frontend bundle** | <200 KB gzipped | Build output size | Code-split panels (GraphView, GitPanel) as lazy imports |
| **App startup** | <2 s to interactive shell | Timer from process start to first PTY byte rendered | Defer non-critical initialization (connectors, metrics) by 1s |
| **COW snapshot creation** | <100 ms on APFS | Timer around `snapshot.rs::create_snapshot()` | Fall back to hard-link tree if clonefile unavailable |

### Memory Budget Breakdown (Base App)

```
Component                    Target     Notes
-----------                  ------     -----
Tauri runtime (Rust)         ~15 MB     Binary + heap + tokio runtime
WebView (WKWebView)          ~40 MB     Baseline for WebKit process
SolidJS app bundle           ~5 MB      Includes DOM, stores, event listeners
xterm.js (1 terminal)        ~10 MB     WebGL context + buffer (1000 line scrollback)
SQLite (connection + cache)  ~5 MB      WAL mode shared memory
NFS server (macOS)           ~5 MB      In-process, connection table
Metrics collector            ~2 MB      sysinfo cache
---                          ---
Total baseline               ~82 MB
Headroom                     ~18 MB
---                          ---
Budget                       100 MB
```

### Per-Session Memory Breakdown

```
Component                    Target     Notes
-----------                  ------     -----
xterm.js Terminal instance   ~8 MB      Buffer + WebGL textures
PTY file descriptors         ~1 MB      Master/slave pair + buffers
Annotation cache             ~2 MB      In-memory for visible range
Delta metadata (in-memory)   ~1 MB      File list, size tracking
tokio task (pty_io_bridge)   ~1 MB      Task + channel buffers
---                          ---
Total per session            ~13 MB
Headroom                     ~7 MB
---                          ---
Budget                       20 MB
```

---

## 8. Security Considerations

### 8.1 COW Mount Permissions

**Threat:** A malicious or buggy agent process escapes its COW mount and reads/writes files
outside its session's isolated view.

**Mitigations:**

1. **Mount namespace isolation (Linux).** Each session's COW overlay is mounted in its own
   mount namespace (`unshare -m`). The agent process cannot see other sessions' mounts.

2. **NFS export restrictions (macOS).** The in-process NFS server only exports paths
   under `~/.ocean/`. Each session's export is restricted to its own delta directory and the
   shared base snapshot. The NFS server refuses to serve paths outside these boundaries.

3. **No symlink escape.** The NFS server and OverlayFS handler resolve symlinks within the
   layer stack. Symlinks pointing outside the workspace are either blocked or resolved
   relative to the session's mount point, never the host filesystem.

4. **Delta directory permissions.** Delta directories are created with mode `0700` (owner
   read/write/execute only). The PTY child process runs as the same user, so it can access
   its own delta but not other sessions' deltas.

### 8.2 A2UI Sandboxing

**Threat:** A malicious agent emits A2UI JSON that executes arbitrary JavaScript in the
WebView, exfiltrates data, or corrupts Ocean's UI state.

**Mitigations:**

1. **No `eval` or script execution.** A2UI components are rendered by Ocean's own SolidJS
   components, not by interpreting arbitrary HTML/JS from the agent. The A2UI JSON is
   validated against a strict schema. Unknown properties are stripped. `<script>` tags,
   `onclick` attributes, `javascript:` URLs, and similar injection vectors are rejected at
   parse time.

2. **Component allow-list.** Only known A2UI component types are rendered. An agent cannot
   request an arbitrary React/SolidJS component by name. The `component_type` field is
   matched against an enum; unrecognized types are rendered as a "Unknown component" stub.

3. **Property sanitization.** String properties that will be rendered as text content are
   sanitized: HTML entities are escaped. URL properties are validated (must be `http://`,
   `https://`, or `ocean://`). No `data:` URLs are allowed.

4. **Rate limiting.** If an agent emits more than 100 A2UI components per second, Ocean
   throttles the rendering pipeline and logs a warning. This prevents a rogue agent from
   flooding the UI.

5. **Resource limits.** A2UI images are limited to 5 MB. Tables are limited to 10,000 rows
   (paginated beyond that). Forms are limited to 100 fields.

### 8.3 PTY Isolation Between Sessions

**Threat:** One session's process reads another session's PTY, captures keystrokes, or
injects commands.

**Mitigations:**

1. **Separate PTY pairs.** Each session gets its own `forkpty()` call, producing a unique
   master/slave pair. PTY file descriptors are not shared between sessions.

2. **File descriptor hygiene.** When spawning a child process for a session, Ocean closes
   all inherited file descriptors except stdin/stdout/stderr (which are connected to the
   session's PTY slave). This uses `close_range(3, MAX, CLOSE_RANGE_UNSHARE)` on Linux or
   explicit FD iteration on macOS.

3. **No cross-session IPC.** The Tauri IPC layer requires the `session_id` parameter on
   all PTY operations. The backend validates that the calling window has permission to
   interact with that session.

### 8.4 SQLite File Permissions

**Threat:** Another process on the system reads or corrupts Ocean's database, leaking
session metadata, workspace paths, or environment snapshots.

**Mitigations:**

1. **Database file permissions.** The SQLite database file, WAL file, and shared-memory
   file are created with mode `0600` (owner read/write only).

2. **Data directory permissions.** The `~/.ocean/` directory is created with mode `0700`.

3. **Environment snapshot scrubbing.** When capturing `env_snapshot` for a session, Ocean
   strips known sensitive environment variables: `*_KEY`, `*_SECRET`, `*_TOKEN`,
   `*_PASSWORD`, `AWS_*`, `GITHUB_TOKEN`, `NPM_TOKEN`. The scrubbed variables are stored
   as `"<redacted>"`.

4. **No plaintext credentials in annotations.** The output annotator does NOT store matched
   patterns that look like secrets (e.g., strings matching `[A-Za-z0-9]{32,}` adjacent to
   keywords like "key", "token", "secret"). These are excluded from the annotations table.

---

## 9. Testing Strategy

### 9.1 Unit Tests: Rust Backend (`cargo test`)

Every Rust module has co-located unit tests. Key areas:

| Module | Test Focus | Example Tests |
|--------|-----------|---------------|
| `session/dag.rs` | DAG operations | Add node, add edge, cycle detection, topological sort, find ancestors, find descendants |
| `session/state.rs` | State machine | Valid transitions (active->idle), invalid transitions (completed->active), event emission on transition |
| `filesystem/delta.rs` | Delta operations | Write file to delta, read through layers, tombstone handling, delta size calculation |
| `filesystem/conflict.rs` | Conflict detection | Disjoint modifications (no conflict), overlapping lines (warning), conflicting changes (alert), three-way diff accuracy |
| `terminal/annotator.rs` | Pattern matching | File path extraction (with/without line:col), URL detection, error pattern matching, edge cases (paths with spaces, Unicode) |
| `terminal/a2ui.rs` | A2UI parsing | Valid JSON parsing, invalid JSON rejection, schema validation, component allow-list enforcement, property sanitization |
| `metrics/git.rs` | Git status | Clean repo, dirty repo, ahead/behind calculation, detached HEAD, no-repo case |
| `git_translate/commit.rs` | Commit creation | Single session delta -> commit, multi-session topological ordering, trailer format |
| `db.rs` | Schema migrations | Migration from V1 to V2, migration from V0 (fresh install) |

**Test utilities:**

- `TestWorkspace`: Creates a temporary git repo with known content for filesystem tests.
- `TestSession`: Creates a mock session with a delta directory for conflict detection tests.
- `TestPty`: Mock PTY that records writes and plays back scripted output for annotator tests.

**Running:**
```bash
cargo test                           # all tests
cargo test --lib session::dag        # specific module
cargo test --lib -- --nocapture      # with stdout output
```

### 9.2 Integration Tests: Tauri + Filesystem Operations

Integration tests exercise the full backend stack without the frontend. They run as Rust
integration tests (`tests/` directory in `src-tauri/`).

| Test Suite | Scope | What It Tests |
|-----------|-------|---------------|
| `tests/session_lifecycle.rs` | SessionManager + FilesystemManager + DB | Create workspace -> create session -> write files -> merge session -> verify workspace state |
| `tests/cow_overlay.rs` | FilesystemManager (platform-specific) | Create overlay -> write file through overlay -> verify delta -> verify base unchanged -> unmount |
| `tests/conflict_detection.rs` | ConflictDetector + FilesystemManager | Two sessions modify same file -> verify conflict detected -> verify severity classification |
| `tests/git_translation.rs` | GitTranslateLayer + DB | Create workspace -> merge sessions -> translate to git -> verify commits and trailers |
| `tests/annotator_pipeline.rs` | Terminal I/O + Annotator | Spawn real PTY -> run command that produces known output -> verify annotations created |
| `tests/a2ui_pipeline.rs` | Terminal I/O + A2UI parser | Spawn PTY -> write A2UI escape sequence -> verify component parsed and event emitted |

**Platform-specific tests:**

Tests in `tests/cow_overlay.rs` are conditionally compiled:
- `#[cfg(target_os = "macos")]` tests exercise the NFS loopback path.
- `#[cfg(target_os = "linux")]` tests exercise both OverlayFS and FUSE paths.

**CI configuration:**
- macOS tests run on GitHub Actions `macos-latest` runners.
- Linux tests run on `ubuntu-latest` with FUSE installed (`apt install fuse3`).
- OverlayFS tests are skipped in CI (requires CAP_SYS_ADMIN); tested locally or in
  privileged containers.

### 9.3 E2E Tests: Frontend Interaction

E2E tests verify the complete user-facing behavior, from click to screen update.

**Framework:** Vitest + `@testing-library/dom` for component-level tests. Playwright with
Tauri's WebDriver support for full app E2E tests.

| Test | Description |
|------|-------------|
| `e2e/session-creation.spec.ts` | Click "New Session" -> verify terminal appears -> type command -> verify output renders |
| `e2e/session-sidebar.spec.ts` | Create workspace with 3 sessions -> verify sidebar tree renders correctly -> click session -> verify terminal switches |
| `e2e/annotation-click.spec.ts` | Run command that outputs a file path -> verify annotation overlay appears -> click annotation -> verify action executes |
| `e2e/status-bar.spec.ts` | Verify status bar shows CPU, RAM, git branch -> verify values update periodically |
| `e2e/conflict-alert.spec.ts` | Create two sessions -> write same file in both -> verify conflict alert appears with correct severity |
| `e2e/merge-flow.spec.ts` | Complete a session -> verify merge panel appears -> click merge -> verify workspace state updated |
| `e2e/a2ui-render.spec.ts` | Agent emits A2UI table -> verify table renders inline -> click button -> verify response sent |
| `e2e/graph-view.spec.ts` | Create workspace with child sessions -> toggle graph view -> verify nodes and edges render |
| `e2e/keyboard-shortcuts.spec.ts` | Cmd+T creates session, Cmd+G toggles git panel, Cmd+Shift+P opens command palette |

**Running:**
```bash
npx vitest                           # component tests (fast, no app build)
npx playwright test                  # full E2E (builds app, launches Tauri)
npx playwright test --headed         # E2E with visible browser (debugging)
```

### 9.4 COW Filesystem Stress Tests

The COW layer is Ocean's highest-risk subsystem. Dedicated stress tests verify correctness
and performance under load.

| Test | Description | Pass Criteria |
|------|-------------|---------------|
| `stress/concurrent-writes.rs` | 10 sessions write to 100 different files concurrently for 60 seconds | No data corruption; all deltas contain expected content; base snapshot unchanged |
| `stress/deep-stack.rs` | Create 4-level deep session chain (workspace -> A -> B -> C -> D). Write files at each level. Read from D, verify correct layer resolution. | D sees its own writes, then C's, then B's, then A's, then base. No layer confusion. |
| `stress/large-delta.rs` | Single session writes 10,000 files totaling 1 GB | Mount stays responsive; SQLite metadata consistent; unmount completes cleanly |
| `stress/rapid-conflict.rs` | Two sessions write to same file 1,000 times in 10 seconds | All conflicts detected; no missed overlaps; conflict detector does not crash or fall behind |
| `stress/mount-unmount-cycle.rs` | Create and destroy 100 sessions rapidly (mount -> write -> unmount, repeat) | No leaked mounts; no orphan delta directories; no NFS server port exhaustion |
| `stress/shared-mount-integrity.rs` | 10 sessions with shared `node_modules/` bind mount. One session runs `npm install`, others read. | npm install writes go to session delta, not shared base. Other sessions still see original node_modules. |

**Running:**
```bash
cargo test --test stress -- --ignored   # stress tests are #[ignore] by default
                                        # to avoid running in normal CI
```

**CI:** Stress tests run nightly on a dedicated runner with performance monitoring (track
regressions over time).

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Workspace** | Top-level grouping tied to a task or goal. Owns the base snapshot and accumulated merged state. Analogous to a git branch, but richer. |
| **Session** | A terminal session with optional COW filesystem isolation. The node in the Session DAG. |
| **Session DAG** | Directed acyclic graph of sessions within a workspace. Edges represent spawned/linked/depends relationships. |
| **COW (Copy-on-Write)** | Filesystem technique where reads fall through to a shared base and writes go to a per-session delta directory. |
| **Delta** | The set of files modified/created/deleted by a session, stored in a per-session directory. |
| **Base snapshot** | Read-only copy of the repository at workspace creation time. Created via APFS clonefile or hard-link tree. |
| **Overlay** | The mounted filesystem view that combines base + parent deltas + session delta into a unified directory tree. |
| **Tombstone** | Marker indicating a file was deleted in a delta layer, overriding its existence in lower layers. |
| **A2UI** | Agent-to-UI protocol (Google, Apache 2.0). Declarative JSON format for agents to render rich UI components. |
| **Annotation** | A detected pattern in terminal output (file path, URL, error) with associated clickable actions. |
| **Connector** | A group of related processes (e.g., Flutter app + DevTools + adb) with health monitoring. |
| **Translation** | Converting Ocean's internal state (session deltas, DAG metadata) into git operations (commits, branches, PRs). |

## Appendix B: Configuration File Locations

```
~/.ocean/
    config.toml              # User preferences (theme, keybindings, default shell)
    ocean.db                 # SQLite database (WAL mode)
    ocean.db-wal             # WAL file (auto-managed by SQLite)
    ocean.db-shm             # Shared memory file (auto-managed by SQLite)
    snapshots/
        <workspace_id>/      # Base snapshots (read-only, hard-linked)
    deltas/
        <session_id>/        # Per-session COW delta directories
    mounts/
        <session_id>/        # Mount points for COW overlays
    scrollback/
        <session_id>.log     # Terminal scrollback buffers
    logs/
        ocean.log            # Application log (structured, tracing format)
```

## Appendix C: Environment Variables Set in Session PTY

| Variable | Value | Purpose |
|----------|-------|---------|
| `OCEAN_SESSION_ID` | UUID | Identifies the session to agents that are Ocean-aware |
| `OCEAN_WORKSPACE_ID` | UUID | Identifies the workspace |
| `OCEAN_WORKSPACE_NAME` | string | Human-readable workspace name |
| `OCEAN_FS_MODE` | `cow`\|`shared`\|`none` | Filesystem isolation mode |
| `OCEAN_MOUNT_PATH` | path | Where the COW overlay is mounted (if fs_mode=cow) |
| `OCEAN_A2UI_ENABLED` | `1` | Signals to agents that A2UI rendering is supported |
| `TERM_PROGRAM` | `Ocean` | Standard terminal identification |
| `TERM_PROGRAM_VERSION` | version | Ocean version string |
