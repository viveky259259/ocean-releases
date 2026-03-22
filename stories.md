# Ocean -- Engineering Task Stories

> This document breaks the Ocean design into Epics, User Stories, and Engineering Tasks.
> Each task is sized and scoped so a single developer can pick it up without ambiguity.
>
> **Sizing guide:**
> - S = less than 1 day
> - M = 1--3 days
> - L = 3--5 days
> - XL = 5--10 days (should be broken down further)

## Progress Summary

| Epic | Phase | Status | Tasks | Progress |
|------|-------|--------|-------|----------|
| E-01: Project Scaffolding & Core Terminal | 1 | ✅ DONE | 30/30 | 100% |
| E-02: Session Model & Sidebar | 1 | ✅ DONE | 25/25 | 100% |
| E-03: Ambient Awareness | 2 | ✅ DONE | 21/21 | 100% |
| E-04: Interactive Output | 3 | ✅ DONE | 26/26 | 100% |
| E-05: Workspace & Session DAG | 4 | ✅ DONE | 32/32 | 100% |
| E-06: Git Translation | 5 | ✅ DONE | 16/16 | 100% |
| E-07: A2UI Integration | 6 | ✅ DONE | 21/21 | 100% |
| E-08: Parallel Execution Connectors | 6 | ✅ DONE | 18/18 | 100% |
| E-09: Security Hardening & Code Signing | T0 | 🟡 PARTIAL | 6/9 | 67% |
| E-10: Auto-Update & Telemetry | T1 | ✅ DONE | 10/10 | 100% |
| E-11: Audit Logging & Managed Config | T1 | ✅ DONE | 16/16 | 100% |
| E-12: Terminal History & Session Recording | T1 | ✅ DONE | 22/22 | 100% |
| E-13: Saved Prompts & Snippets | T1 | ✅ DONE | 13/13 | 100% |
| E-14: Team Collaboration & Shared Workspaces | T2 | 🟡 IN PROGRESS | 4/30 | 13% |
| E-15: Enterprise Edition | T3 | 🔲 TODO | 0/26 | 0% |

**V1: 189/189 tasks complete (100%) — ALL PHASES DONE**
**Enterprise: 67/126 tasks (53%) — E-09 (partial), E-10, E-10b (Firebase), E-11, E-12 & E-13 COMPLETE**

---

## Epic E-01: Project Scaffolding & Core Terminal ✅ COMPLETE

Phase: 1 | Priority: P0 | **Status: DONE**

Ocean's foundation. This epic delivers a working terminal application built on Tauri v2 with a SolidJS frontend, xterm.js terminal rendering, and Rust-side PTY management. At the end of this epic a user can launch Ocean, get a shell prompt, type commands, see output, split panes, and use basic keyboard shortcuts. Everything else builds on top of this.

### Story S-01.1: Tauri v2 Project Scaffolding

**As a** developer, **I want** a fully configured Tauri v2 + SolidJS project with a repeatable build, **so that** the team has a clean starting point to build Ocean.

Priority: P0 | Estimate: M

**Tasks:**
- [x] T-01.1.1: Initialize a Tauri v2 project using `npm create tauri-app@latest` with the SolidJS + TypeScript template. Resulting structure: `src/` for frontend, `src-tauri/` for Rust backend. Verify `cargo tauri dev` produces a running window. (S)
- [x] T-01.1.2: Configure `src-tauri/Cargo.toml` with initial dependencies: `tauri` (v2), `serde`, `serde_json`, `tokio` (full features), `uuid`, `log`, `env_logger`. Pin versions in `Cargo.toml`. (S)
- [x] T-01.1.3: Configure frontend `package.json` with dependencies: `solid-js`, `@solidjs/router`, `xterm`, `@xterm/addon-webgl`, `@xterm/addon-fit`, `@xterm/addon-search`, `typescript`. Set up `tsconfig.json` with strict mode. (S)
- [x] T-01.1.4: Create the Rust module directory structure under `src-tauri/src/`: `main.rs`, `lib.rs`, `session/mod.rs`, `pty/mod.rs`, `metrics/mod.rs`, `annotator/mod.rs`, `fs/mod.rs`, `git/mod.rs`, `a2ui/mod.rs`, `ipc/mod.rs`. Each module file should contain a placeholder `pub fn init() {}`. (S)
- [x] T-01.1.5: Create the frontend directory structure under `src/`: `App.tsx`, `index.tsx`, `components/`, `components/terminal/`, `components/sidebar/`, `components/statusbar/`, `components/connectors/`, `hooks/`, `stores/`, `lib/`. (S)
- [x] T-01.1.6: Set up a basic CI pipeline (GitHub Actions) that runs `cargo check`, `cargo test`, `npm run build`, and `cargo tauri build` on push. Create `.github/workflows/ci.yml`. (M)
- [x] T-01.1.7: Configure Tauri permissions in `src-tauri/capabilities/default.json`: allow shell spawning, filesystem access, process management, and IPC event emission. (S)

### Story S-01.2: xterm.js Terminal Integration

**As a** user, **I want** a GPU-accelerated terminal rendering surface inside the Ocean window, **so that** I get smooth, high-performance terminal output.

Priority: P0 | Estimate: M

**Tasks:**
- [x] T-01.2.1: Create `src/components/terminal/TerminalPane.tsx` -- a SolidJS component that mounts an xterm.js `Terminal` instance into a container `div`. Initialize with sensible defaults: `fontFamily: 'JetBrains Mono, Menlo, monospace'`, `fontSize: 14`, `theme` (dark), `cursorBlink: true`, `scrollback: 10000`. (M)
- [x] T-01.2.2: Attach the WebGL addon (`@xterm/addon-webgl`) to the Terminal instance for GPU-accelerated rendering. Add a fallback to the canvas renderer if WebGL initialization fails. Log renderer type on startup. (S)
- [x] T-01.2.3: Attach the Fit addon (`@xterm/addon-fit`) and call `fitAddon.fit()` on mount and on window resize (listen to `ResizeObserver` on the container). Emit the new column/row dimensions to the Rust backend via a Tauri command `resize_pty(session_id, cols, rows)`. (S)
- [x] T-01.2.4: Attach the Search addon (`@xterm/addon-search`). Wire Cmd+F to open a search bar overlay within the terminal pane, and Cmd+G / Cmd+Shift+G for find-next / find-previous. (S)
- [x] T-01.2.5: Create `src/components/terminal/TerminalArea.tsx` -- a container component that holds one or more `TerminalPane` instances. For now, render a single pane that fills the available space. This component will later support split layouts. (S)

### Story S-01.3: PTY Management in Rust

**As a** user, **I want** Ocean to spawn real shell processes (zsh/bash) behind the terminal, **so that** I can run any command just like in a native terminal.

Priority: P0 | Estimate: L

**Tasks:**
- [x] T-01.3.1: Add the `portable-pty` crate to `src-tauri/Cargo.toml`. Create `src-tauri/src/pty/mod.rs` with a `PtyManager` struct that holds a `HashMap<String, PtySession>` where `PtySession` wraps a `portable_pty::PtyPair` (master + child). (M)
- [x] T-01.3.2: Implement `PtyManager::spawn(session_id: &str, shell: &str, cwd: &str, cols: u16, rows: u16, env: HashMap<String, String>) -> Result<()>`. This should open a new PTY pair, spawn the shell process as the child, and store the master handle keyed by `session_id`. Default shell: read `$SHELL` env var, fallback to `/bin/zsh` on macOS, `/bin/bash` on Linux. (M)
- [x] T-01.3.3: Implement PTY read loop: for each active PTY, spawn a `tokio::task` that reads from the master fd in a loop (8KB buffer) and emits the data to the frontend via Tauri event `pty-output-{session_id}` as a base64-encoded payload. (M)
- [x] T-01.3.4: Implement Tauri command `write_pty(session_id: String, data: String)` that writes user keystrokes (received as UTF-8) to the master fd of the corresponding PTY. Wire this from the frontend: `terminal.onData(data => invoke('write_pty', { sessionId, data }))`. (S)
- [x] T-01.3.5: Implement Tauri command `resize_pty(session_id: String, cols: u16, rows: u16)` that calls `master.resize(PtySize { rows, cols, .. })` on the corresponding PTY. (S)
- [x] T-01.3.6: Implement PTY lifecycle management: `close_pty(session_id: String)` that sends SIGHUP to the child process, waits up to 2 seconds, then sends SIGKILL if still alive, and removes the entry from the map. (S)
- [x] T-01.3.7: Handle PTY child exit: detect when the child process exits (poll or `waitpid`), emit a Tauri event `pty-exit-{session_id}` with the exit code, and clean up resources. (M)

### Story S-01.4: Basic Shell Session (End-to-End)

**As a** user, **I want** to launch Ocean and immediately get a working shell where I can type commands and see output, **so that** Ocean is usable as my daily terminal from day one.

Priority: P0 | Estimate: M

**Tasks:**
- [x] T-01.4.1: In `src/App.tsx`, on mount, invoke Tauri command `create_session()` which creates a new session in the backend, spawns a PTY, and returns `{ sessionId }`. Pass `sessionId` to `TerminalArea`. (S)
- [x] T-01.4.2: In `TerminalPane.tsx`, listen to the Tauri event `pty-output-{sessionId}`. Decode the base64 payload and write it to the xterm.js terminal via `terminal.write(data)`. (S)
- [x] T-01.4.3: In `TerminalPane.tsx`, hook `terminal.onData(data => ...)` to invoke `write_pty` with the session ID and keystroke data. (S)
- [x] T-01.4.4: In `TerminalPane.tsx`, hook `terminal.onResize(({ cols, rows }) => ...)` to invoke `resize_pty`. Also call `resize_pty` once after the initial `fitAddon.fit()`. (S)
- [x] T-01.4.5: Handle session termination: when `pty-exit-{sessionId}` fires, display a "[Process exited with code X]" message in the terminal pane and optionally allow the user to restart or close the pane. (S)
- [x] T-01.4.6: Set the window title dynamically based on the current session's CWD or running command. Use `terminal.onTitleChange` from xterm.js to relay the title to the Tauri window via `appWindow.setTitle(title)`. (S)

### Story S-01.5: Keyboard Shortcuts

**As a** user, **I want** standard terminal keyboard shortcuts to work, **so that** Ocean feels familiar and efficient.

Priority: P1 | Estimate: M

**Tasks:**
- [x] T-01.5.1: Create `src/lib/keybindings.ts` -- a registry that maps keyboard shortcuts to action names. Populate with defaults from the design doc: `Cmd+T` (new session), `Cmd+W` (close session), `Cmd+1-9` (switch session by index), `Cmd+[` / `Cmd+]` (prev/next session), `Cmd+P` (quick session switcher), `Cmd+Shift+P` (command palette stub). (M)
- [x] T-01.5.2: Create `src/hooks/useKeybindings.ts` -- a SolidJS hook that attaches a global `keydown` listener on mount. The listener checks the keybinding registry, prevents default browser behavior for registered shortcuts, and dispatches the corresponding action. Ensure terminal input (e.g., Ctrl+C, Ctrl+D) is NOT intercepted when the terminal is focused. (M)
- [x] T-01.5.3: Implement the `new-session` action (Cmd+T): invoke `create_session()` and add the resulting pane to the terminal area. (S)
- [x] T-01.5.4: Implement the `close-session` action (Cmd+W): invoke `close_pty()` for the focused session and remove it from the UI. If it is the last session, either create a new default session or close the window (configurable). (S)
- [x] T-01.5.5: Implement session switching via `Cmd+1` through `Cmd+9` by index, and `Cmd+[` / `Cmd+]` for sequential navigation. Update the focused pane and sidebar selection. (S)
- [x] T-01.5.6: Stub the command palette (Cmd+Shift+P) as a centered modal overlay with a text input. No commands needed yet -- just the UI chrome. Create `src/components/CommandPalette.tsx`. (S)

### Story S-01.6: Pane Splitting

**As a** user, **I want** to split the terminal area horizontally or vertically, **so that** I can view multiple sessions side by side.

Priority: P1 | Estimate: L

**Tasks:**
- [x] T-01.6.1: Design a pane layout tree data structure in `src/stores/layoutStore.ts`. Each node is either a `leaf` (contains a `sessionId`) or a `split` (contains `direction: 'horizontal' | 'vertical'`, `ratio: number`, and two children). Export a SolidJS store with `splitPane(paneId, direction)`, `closePane(paneId)`, and `resizePane(paneId, ratio)` actions. (M)
- [x] T-01.6.2: Refactor `TerminalArea.tsx` to recursively render the layout tree. Each `split` node renders a flex container with two children and a draggable divider between them. Each `leaf` node renders a `TerminalPane`. (M)
- [x] T-01.6.3: Implement the draggable divider component `src/components/terminal/PaneDivider.tsx`. On mousedown, track mousemove to update the split ratio in the layout store. Set a minimum pane size of 80px. (M)
- [x] T-01.6.4: Wire keyboard shortcuts: `Cmd+D` for vertical split (new session to the right), `Cmd+Shift+D` for horizontal split (new session below). Each split action creates a new session/PTY and inserts it into the layout tree. (S)
- [x] T-01.6.5: When a pane is closed, if it was part of a split, promote its sibling to take the parent's place in the tree. Call `fitAddon.fit()` on all remaining panes after any layout change. (S)

---

## Epic E-02: Session Model & Sidebar ✅ COMPLETE

Phase: 1 | Priority: P0 | **Status: DONE**

This epic implements the session data model (backed by SQLite), the sidebar component for browsing and managing sessions, and session lifecycle operations. Sessions are the fundamental unit in Ocean -- every terminal pane corresponds to a session, and sessions belong to workspaces. This epic establishes the CRUD operations and persistence that all later features depend on.

### Story S-02.1: SQLite Schema & Data Layer

**As a** developer, **I want** a persistent SQLite-backed data layer for sessions and workspaces, **so that** sessions survive app restarts and the data model is queryable.

Priority: P0 | Estimate: M

**Tasks:**
- [x] T-02.1.1: Add `rusqlite` (with `bundled` feature) to `src-tauri/Cargo.toml`. Create `src-tauri/src/db/mod.rs` with a `Database` struct that holds a `rusqlite::Connection`. Initialize the database file at `~/.ocean/ocean.db` (create directory if needed). (S)
- [x] T-02.1.2: Create `src-tauri/src/db/migrations.rs` with a `run_migrations(conn: &Connection)` function. Implement migration v1 that creates the following tables: `workspaces` (id TEXT PK, name TEXT, created_at TEXT, status TEXT DEFAULT 'active', base_commit TEXT, git_branch TEXT, git_pr TEXT, metadata TEXT), `sessions` (id TEXT PK, workspace_id TEXT FK, parent_id TEXT FK nullable, edge_type TEXT, name TEXT, type TEXT, fs_mode TEXT, agent_type TEXT, pid INTEGER, pty_id TEXT, status TEXT, started_at TEXT, ended_at TEXT, exit_code INTEGER, cwd TEXT, env_snapshot TEXT, scrollback_path TEXT). Use a `schema_version` table to track migration state. (M)
- [x] T-02.1.3: Implement `Database::create_workspace(name: &str) -> Result<Workspace>`. Generate a UUID, insert a row, return the struct. (S)
- [x] T-02.1.4: Implement `Database::create_session(workspace_id: &str, parent_id: Option<&str>, name: &str, session_type: SessionType) -> Result<Session>`. Generate a UUID, default status to `active`, default `fs_mode` to `none` (COW comes in Phase 4). (S)
- [x] T-02.1.5: Implement `Database::list_sessions(workspace_id: &str) -> Result<Vec<Session>>` and `Database::get_session(id: &str) -> Result<Session>`. (S)
- [x] T-02.1.6: Implement `Database::update_session_status(id: &str, status: SessionStatus) -> Result<()>` and `Database::close_session(id: &str, exit_code: i32) -> Result<()>` (sets `status`, `ended_at`, `exit_code`). (S)
- [x] T-02.1.7: Implement `Database::list_workspaces() -> Result<Vec<Workspace>>` and `Database::get_workspace(id: &str) -> Result<Workspace>`. (S)
- [x] T-02.1.8: Expose the `Database` as Tauri managed state via `app.manage(database)` in `main.rs`. Write unit tests for all CRUD operations using an in-memory SQLite database. (M)

### Story S-02.2: Session Manager Service

**As a** developer, **I want** a high-level session manager that coordinates database persistence, PTY lifecycle, and state transitions, **so that** the frontend has a clean API to work with.

Priority: P0 | Estimate: M

**Tasks:**
- [x] T-02.2.1: Create `src-tauri/src/session/mod.rs` with a `SessionManager` struct that owns a reference to `Database` and `PtyManager`. This is the primary entry point for all session operations. (S)
- [x] T-02.2.2: Implement `SessionManager::create_session(workspace_id, name, parent_id) -> Result<Session>` that: (1) inserts into DB, (2) spawns a PTY, (3) updates the session with the PTY ID and PID, (4) returns the session. (M)
- [x] T-02.2.3: Implement `SessionManager::close_session(session_id) -> Result<()>` that: (1) closes the PTY, (2) updates DB status to `completed` or `failed` based on exit code, (3) emits a `session-closed` Tauri event. (S)
- [x] T-02.2.4: Implement `SessionManager::get_session_tree(workspace_id) -> Result<Vec<SessionTreeNode>>` that queries all sessions for a workspace and builds a tree structure based on `parent_id` relationships. `SessionTreeNode` includes `session: Session, children: Vec<SessionTreeNode>`. (M)
- [x] T-02.2.5: Register Tauri commands in `src-tauri/src/ipc/mod.rs`: `create_session`, `close_session`, `list_sessions`, `get_session_tree`, `list_workspaces`, `create_workspace`. Each command extracts `SessionManager` from Tauri state and delegates. (M)
- [x] T-02.2.6: Create a default workspace ("Default") on first launch if no workspaces exist. Create an initial session in that workspace when the app starts. (S)

### Story S-02.3: Sidebar Component

**As a** user, **I want** a sidebar on the left showing my workspaces and sessions as a tree, **so that** I can see all my active work and navigate between sessions.

Priority: P0 | Estimate: L

**Tasks:**
- [x] T-02.3.1: Create `src/stores/sessionStore.ts` -- a SolidJS store that holds `workspaces: Workspace[]`, `sessions: Map<string, Session[]>`, and `activeSessionId: string`. Provide actions: `loadWorkspaces()`, `loadSessions(workspaceId)`, `setActiveSession(id)`. Each action calls the corresponding Tauri command. (M)
- [x] T-02.3.2: Create `src/components/sidebar/Sidebar.tsx` -- a fixed-width (250px default, resizable) panel on the left side of the app. It renders a list of `WorkspaceGroup` components, one per workspace. Include a "+" button at the top to create a new workspace (invokes `create_workspace` via a name prompt). (M)
- [x] T-02.3.3: Create `src/components/sidebar/WorkspaceGroup.tsx` -- a collapsible section. Header shows workspace name, session count summary (e.g., "2 active, 1 idle"), and a collapse/expand toggle. Body renders `SessionNode` components in a tree. (M)
- [x] T-02.3.4: Create `src/components/sidebar/SessionNode.tsx` -- a recursive tree node component. Shows: status indicator dot (color-coded per design doc: green=active, blue=idle, yellow=waiting, red=failed, grey=completed), session name, and time-since-last-activity or status label. Indents child sessions. Clicking a node calls `setActiveSession(id)`. (M)
- [x] T-02.3.5: Add right-click context menu to `SessionNode.tsx` with actions: "Rename", "Spawn Child Session", "Close Session", "Kill Session" (force). Use a simple absolutely-positioned div for the menu. (M)
- [x] T-02.3.6: Add right-click context menu to `WorkspaceGroup.tsx` with actions: "Rename Workspace", "New Session", "Archive Workspace". (S)
- [x] T-02.3.7: Implement drag-and-drop reordering of sessions within a workspace (optional at this phase -- can be deferred). At minimum, ensure the visual order is stable and follows creation order with children nested under parents. (S)

### Story S-02.4: Session Switching

**As a** user, **I want** to click a session in the sidebar and immediately see its terminal, **so that** I can quickly switch context between different tasks.

Priority: P0 | Estimate: M

**Tasks:**
- [x] T-02.4.1: When `activeSessionId` changes in `sessionStore`, update `TerminalArea` to display the corresponding pane. If the session has an existing xterm.js instance, reattach it to the DOM (do not re-create). Maintain a `Map<string, Terminal>` of xterm instances in a module-level cache in `src/lib/terminalCache.ts`. (M)
- [x] T-02.4.2: When switching sessions, call `fitAddon.fit()` on the newly visible terminal to ensure correct sizing, then invoke `resize_pty` to sync the backend. (S)
- [x] T-02.4.3: Highlight the active session in the sidebar with a distinct background color or left border accent. Dim sessions in other workspaces. (S)
- [x] T-02.4.4: Implement the quick session switcher (Cmd+P): a centered overlay with a text input that fuzzy-filters all sessions by name. Pressing Enter switches to the selected session. Use a simple substring match; no external fuzzy-search library needed. Create `src/components/QuickSwitcher.tsx`. (M)
- [x] T-02.4.5: Subscribe to `session-closed` Tauri events. When the active session closes, auto-switch to the next sibling session or the parent session. Update the sidebar accordingly. (S)

---

## Epic E-03: Ambient Awareness ✅ COMPLETE

Phase: 2 | Priority: P1 | **Status: DONE**

Ambient awareness is what makes Ocean feel alive. This epic adds a persistent status bar showing real-time system metrics (CPU, RAM), network connectivity, git status, and per-session health indicators. The user never has to run `htop`, `ping`, or `git status` -- that information is always visible and updated in the background.

### Story S-03.1: System Metrics Collector

**As a** user, **I want** to see CPU, RAM, and battery usage at a glance in the status bar, **so that** I know when my system is under load without running a separate monitor.

Priority: P1 | Estimate: M

**Tasks:**
- [x] T-03.1.1: Add the `sysinfo` crate to `src-tauri/Cargo.toml`. Create `src-tauri/src/metrics/system.rs` with a `SystemMetricsCollector` struct that holds a `sysinfo::System` instance. (S)
- [x] T-03.1.2: Implement `SystemMetricsCollector::collect() -> SystemMetrics` that returns `{ cpu_percent: f32, ram_used_bytes: u64, ram_total_bytes: u64, swap_used_bytes: u64, swap_total_bytes: u64, battery_percent: Option<u8> }`. Use `sysinfo` APIs: `system.global_cpu_usage()`, `system.used_memory()`, `system.total_memory()`. For battery, use the `battery` crate or `sysinfo` if supported. (M)
- [x] T-03.1.3: Implement a polling loop in `src-tauri/src/metrics/mod.rs`: spawn a `tokio::task` that calls `collect()` every 2000ms and emits a Tauri event `system-metrics` with the JSON payload. (S)
- [x] T-03.1.4: Implement per-process metrics: `get_process_metrics(pid: u32) -> ProcessMetrics` returning `{ cpu_percent, ram_bytes, thread_count }`. This will be used later for session and connector status. (S)

### Story S-03.2: Network Monitor

**As a** user, **I want** to see my network connectivity status (WiFi/Ethernet, latency to key endpoints) in the status bar, **so that** I know immediately if connectivity issues will affect my git pushes or package installs.

Priority: P1 | Estimate: M

**Tasks:**
- [x] T-03.2.1: Create `src-tauri/src/metrics/network.rs` with a `NetworkMonitor` struct. Implement `check_connectivity() -> NetworkStatus` returning `{ connected: bool, interface_type: String, latency_github_ms: Option<u32>, latency_npm_ms: Option<u32> }`. (M)
- [x] T-03.2.2: Implement connectivity checks via TCP connect to `github.com:443` and `registry.npmjs.org:443` with a 3-second timeout. Measure round-trip time. Do NOT use ICMP ping (requires root). (M)
- [x] T-03.2.3: Detect interface type (WiFi vs Ethernet) using platform-specific APIs. On macOS: parse output of `networksetup -listallhardwareports` or use the `system_configuration` crate. On Linux: read from `/sys/class/net/`. (S)
- [x] T-03.2.4: Implement a polling loop that checks network status every 5000ms and emits a Tauri event `network-status` with the JSON payload. If connectivity drops, increase polling to every 2000ms until restored. (S)

### Story S-03.3: Git Watcher

**As a** user, **I want** to see the current branch, ahead/behind counts, staged/modified file counts, and CI status in the status bar, updating in real-time, **so that** I always know my git state.

Priority: P1 | Estimate: L

**Tasks:**
- [x] T-03.3.1: Add `git2` crate to `src-tauri/Cargo.toml`. Create `src-tauri/src/metrics/git.rs` with a `GitWatcher` struct that takes a repo path. (S)
- [x] T-03.3.2: Implement `GitWatcher::get_status(repo_path: &str) -> GitStatus` returning `{ branch: String, ahead: u32, behind: u32, staged: u32, modified: u32, untracked: u32, conflicts: u32 }`. Use `git2::Repository::open()`, `repo.head()`, `repo.statuses()`. For ahead/behind, use `repo.graph_ahead_behind(local_oid, upstream_oid)`. (M)
- [x] T-03.3.3: Implement filesystem watching for the `.git` directory of the active session's CWD. Use the `notify` crate (`RecommendedWatcher`) to watch `.git/HEAD`, `.git/index`, and `.git/refs/`. On any change, re-collect git status and emit a Tauri event `git-status`. (M)
- [x] T-03.3.4: Implement a fallback poll every 10000ms in case filesystem events are missed (e.g., NFS-mounted repos). (S)
- [x] T-03.3.5: Implement CI status fetching: shell out to `gh api repos/{owner}/{repo}/commits/{sha}/status` to get the combined CI status. Cache for 30 seconds. Emit as part of the `git-status` event: `{ ci_status: 'success' | 'failure' | 'pending' | 'unknown' }`. (M)

### Story S-03.4: Status Bar UI

**As a** user, **I want** a persistent status bar at the top of the Ocean window showing network, system, and git information, **so that** I have ambient awareness without running commands.

Priority: P1 | Estimate: M

**Tasks:**
- [x] T-03.4.1: Create `src/components/statusbar/StatusBar.tsx` -- a fixed-height (approx. 28px per row, 2 rows) component at the top of the app layout. Row 1: network, system metrics, git. Row 2: agent status indicators. (M)
- [x] T-03.4.2: Create `src/components/statusbar/NetworkIndicator.tsx`. Subscribe to the `network-status` Tauri event. Display: icon (WiFi/Ethernet/disconnected), and latency as a colored dot (green < 100ms, yellow < 300ms, red > 300ms). (S)
- [x] T-03.4.3: Create `src/components/statusbar/SystemMetrics.tsx`. Subscribe to the `system-metrics` Tauri event. Display: "RAM X.X/Y.YGB" with a miniature bar chart (8 blocks), "CPU XX%" with a miniature bar chart. Use color thresholds: green < 60%, yellow < 85%, red >= 85%. (M)
- [x] T-03.4.4: Create `src/components/statusbar/GitStatusBadge.tsx`. Subscribe to the `git-status` Tauri event. Display: branch name (truncated to 20 chars), up/down arrows with ahead/behind counts, `+N ~N` for staged/modified, CI status dot. Clicking this badge will later open the git panel (Cmd+G). (M)
- [x] T-03.4.5: Create `src/components/statusbar/AgentStatusRow.tsx`. For each session in the active workspace that has `type: 'agent'`, render a status pill: `[indicator name]`. Color-code the indicator per session status. Clicking a pill switches to that session. (S)
- [x] T-03.4.6: Create `src/stores/metricsStore.ts` that holds the latest `systemMetrics`, `networkStatus`, and `gitStatus` values. Subscribe to the respective Tauri events and update the store. All status bar components read from this store. (S)

### Story S-03.5: Session Status Indicators

**As a** user, **I want** each session in the sidebar to show its current status (active, idle, waiting, failed, completed) with a color-coded indicator, **so that** I can see at a glance which sessions need attention.

Priority: P1 | Estimate: M

**Tasks:**
- [x] T-03.5.1: In the Rust backend, implement session activity detection in `src-tauri/src/session/activity.rs`. Track the timestamp of the last output from each PTY. If no output for 30 seconds but the process is alive, transition status to `idle`. If the process has exited, set `completed` or `failed`. (M)
- [x] T-03.5.2: Implement "waiting for input" detection: scan the last few lines of terminal output for common prompt patterns (e.g., `[Y/n]`, `(yes/no)`, `Continue?`, `Enter password`). If detected and no recent output, transition to `waiting`. (M)
- [x] T-03.5.3: Emit `session-status-changed` Tauri events whenever a session's status transitions. Include `{ sessionId, previousStatus, newStatus }`. (S)
- [x] T-03.5.4: Update `SessionNode.tsx` in the sidebar to subscribe to `session-status-changed` events and re-render the indicator dot. Use CSS transitions for smooth color changes. (S)
- [x] T-03.5.5: Implement desktop notifications for key transitions: `waiting` (agent needs input), `failed` (process crashed), all-sessions-completed in a workspace. Use the Tauri notification plugin. (S)

---

## Epic E-04: Interactive Output ✅ COMPLETE

Phase: 3 | Priority: P1 | **Status: DONE**

This epic makes terminal output smart and actionable. Every file path, URL, error, and stack trace in terminal output becomes a clickable element with context actions. The output annotator runs in Rust for performance, and the overlay is rendered in SolidJS on top of the xterm.js terminal.

### Story S-04.1: Output Annotator Engine

**As a** developer, **I want** a high-performance Rust engine that scans terminal output lines for actionable patterns, **so that** the frontend can render interactive overlays.

Priority: P1 | Estimate: L

**Tasks:**
- [x] T-04.1.1: Add the `regex` crate to `src-tauri/Cargo.toml`. Create `src-tauri/src/annotator/mod.rs` with an `OutputAnnotator` struct that holds a `regex::RegexSet` compiled from all built-in patterns. (S)
- [x] T-04.1.2: Define the `Annotation` struct in `src-tauri/src/annotator/types.rs`: `{ session_id: String, line: u32, col_start: u32, col_end: u32, annotation_type: AnnotationType, value: String, metadata: serde_json::Value }`. Define `AnnotationType` enum: `FilePath`, `Url`, `Error`, `GitRef`, `NetworkAddr`, `TestResult`, `ContainerId`. (S)
- [x] T-04.1.3: Implement `OutputAnnotator::process_line(session_id: &str, line_number: u32, text: &str) -> Vec<Annotation>`. Strip ANSI escape codes from `text` before matching (use the `strip-ansi-escapes` crate). Run all patterns via `RegexSet::matches()` for parallel matching, then extract captures for each match. Target: < 1ms per line. (M)
- [x] T-04.1.4: Store annotations in a per-session in-memory ring buffer (last 10,000 lines). Create `src-tauri/src/annotator/store.rs` with `AnnotationStore` using `HashMap<String, VecDeque<Vec<Annotation>>>`. (S)
- [x] T-04.1.5: Hook the annotator into the PTY read loop: after emitting `pty-output`, also split output by newlines and feed each line to `process_line`. Emit a batched Tauri event `annotations-{sessionId}` every 100ms (debounced) with new annotations. (M)
- [x] T-04.1.6: Expose Tauri command `get_annotations(session_id: String, line_start: u32, line_end: u32) -> Vec<Annotation>` for the frontend to query annotations for a visible range. (S)

### Story S-04.2: File Path Detection

**As a** user, **I want** file paths in terminal output to be highlighted and clickable, **so that** I can open them in my editor instantly.

Priority: P1 | Estimate: M

**Tasks:**
- [x] T-04.2.1: Implement the file path regex pattern in `src-tauri/src/annotator/patterns/file_path.rs`. Match patterns: absolute paths (`/path/to/file.ext`), relative paths (`./path/to/file`), paths with line and column (`file.ext:42:15`), and common compiler output formats (`at file.ext:42`). Exclude false positives like URLs and `//` comments. (M)
- [x] T-04.2.2: In the annotation metadata, extract: `{ path: String, line: Option<u32>, column: Option<u32>, absolute_path: String }`. Resolve relative paths against the session's CWD. (S)
- [x] T-04.2.3: Define actions for file path annotations: primary action = "Open in Editor" (shell out to `$EDITOR` or `code` command), secondary actions = "Copy Path", "Copy Line Reference", "Reveal in Finder", "Show Git Blame". (S)

### Story S-04.3: URL Detection

**As a** user, **I want** URLs in terminal output to be highlighted and clickable, **so that** I can open dev servers, documentation links, and debug URLs quickly.

Priority: P1 | Estimate: S

**Tasks:**
- [x] T-04.3.1: Implement the URL regex pattern in `src-tauri/src/annotator/patterns/url.rs`. Match `http://` and `https://` URLs. Handle URLs with ports (`localhost:3000`), paths, query strings, and fragments. Do not match trailing punctuation (period, comma, parenthesis). (S)
- [x] T-04.3.2: Define actions for URL annotations: primary = "Open in Browser" (use `open::that(url)`), secondary = "Copy URL", "Check Health" (for localhost URLs, attempt a HEAD request and show status). (S)

### Story S-04.4: Error Detection

**As a** user, **I want** compiler errors and stack traces to be detected and highlighted, **so that** I can jump to the error location or ask an agent to fix it.

Priority: P1 | Estimate: L

**Tasks:**
- [x] T-04.4.1: Create `src-tauri/src/annotator/patterns/error.rs`. Implement regex patterns for common error formats: TypeScript/JavaScript (`Error: ... at file:line:col`), Rust (`error[E0XXX]: ... --> file:line:col`), Python (`File "file", line N`), Go (`file.go:N:N:`), Swift (`file.swift:N:N: error:`), Dart/Flutter (`lib/file.dart:N:N: Error:`). (M)
- [x] T-04.4.2: Implement multi-line stack trace grouping: when an error annotation is detected, scan subsequent lines for stack frame patterns (indented `at` lines, `File "..."` lines, etc.) and group them into a single annotation with `metadata.frames: [{ file, line, function }]`. (L)
- [x] T-04.4.3: Define actions for error annotations: primary = "Open File at Error Line", secondary = "Copy Error Message", "Search Error Online", "Ask Agent to Fix" (sends error text to active agent session's stdin). (S)

### Story S-04.5: Annotation Overlay

**As a** user, **I want** annotations to appear as subtle visual markers on the terminal output that I can interact with, **so that** the terminal remains readable while being interactive.

Priority: P1 | Estimate: L

**Tasks:**
- [x] T-04.5.1: Create `src/components/terminal/AnnotationOverlay.tsx` -- a SolidJS component that renders absolutely positioned elements over the xterm.js terminal canvas. It receives the current `sessionId` and the terminal's viewport state (first visible line, rows, cols). (M)
- [x] T-04.5.2: Map annotation positions (line, col_start, col_end) to pixel coordinates using xterm.js `_core.buffer.viewportY`, `charMeasure` dimensions (cell width and height from the terminal's `_core._renderService.dimensions`). Account for scrollback offset. (M)
- [x] T-04.5.3: Render annotations as translucent underline highlights (dashed for file paths, solid for URLs, wavy red for errors). Use CSS `position: absolute` with computed `top`, `left`, `width`. Ensure the overlay does not capture mouse events except on the annotation elements themselves (use `pointer-events: none` on the container, `pointer-events: auto` on annotations). (M)
- [x] T-04.5.4: On terminal scroll, re-query annotations for the visible range via `get_annotations(sessionId, firstVisibleLine, firstVisibleLine + rows)` and update the overlay. Debounce scroll handler to 50ms. (S)
- [x] T-04.5.5: Subscribe to `annotations-{sessionId}` Tauri events to incrementally add new annotations to the overlay as output arrives. (S)

### Story S-04.6: Context Menus

**As a** user, **I want** to right-click an annotation to see all available actions in a context menu, **so that** I can choose the action that best fits my current need.

Priority: P1 | Estimate: M

**Tasks:**
- [x] T-04.6.1: Create `src/components/terminal/AnnotationContextMenu.tsx` -- a floating menu component that appears at the cursor position on right-click of an annotation element. It receives the `Annotation` object and renders its `actions` as menu items. (M)
- [x] T-04.6.2: Implement action dispatch: when a menu item is clicked, invoke the corresponding Tauri command. For "Open in Editor": `invoke('open_in_editor', { path, line, col })`. For "Open in Browser": `invoke('open_url', { url })`. For "Copy": write to clipboard via `navigator.clipboard.writeText()`. (M)
- [x] T-04.6.3: Implement `open_in_editor` Tauri command in `src-tauri/src/ipc/actions.rs`. Detect the user's editor via `$VISUAL`, `$EDITOR`, or fall back to `code` (VS Code). Open the file at the specified line. Support VS Code (`code --goto file:line:col`), Vim (`vim +line file`), and generic fallback. (M)
- [x] T-04.6.4: Implement `open_url` Tauri command using the `open` crate to launch the system default browser. (S)
- [x] T-04.6.5: Close the context menu when clicking outside of it or pressing Escape. (S)

### Story S-04.7: Hover Tooltips

**As a** user, **I want** to hover over an annotated element and see a tooltip with additional context, **so that** I can preview information before taking action.

Priority: P2 | Estimate: M

**Tasks:**
- [x] T-04.7.1: Create `src/components/terminal/AnnotationTooltip.tsx` -- a floating tooltip that appears 300ms after hovering over an annotation. Positioned above or below the annotation based on available space. (S)
- [x] T-04.7.2: For file path annotations, show: file name, line:col, git status of the file (modified/staged/untracked), last commit message that touched the file. Fetch git info via Tauri command `get_file_git_info(path)`. (M)
- [x] T-04.7.3: For URL annotations, show: the full URL (in case it was truncated in output), and for localhost URLs, show a status indicator (reachable/unreachable). (S)
- [x] T-04.7.4: For error annotations, show: the full error message, the stack trace summary (top 3 frames), and a "Ask Agent to Fix" button. (S)
- [x] T-04.7.5: Dismiss the tooltip when the mouse leaves the annotation or after 5 seconds of no interaction. (S)

---

## Epic E-05: Workspace & Session DAG ✅ COMPLETE

Phase: 4 | Priority: P0 | **Status: DONE**

This is Ocean's core differentiator. This epic implements filesystem-level code state isolation using copy-on-write layers, the workspace model, child session stacking, real-time conflict detection, and the merge workflow. After this epic, spawning a session forks the codebase instantly at near-zero cost, multiple agents can work on the same repo in parallel with full isolation, and conflicts are detected in real-time.

### Story S-05.1: Workspace Model

**As a** user, **I want** to create a workspace that snapshots my repo state, **so that** all sessions within it start from a consistent base.

Priority: P0 | Estimate: L

**Tasks:**
- [x] T-05.1.1: Extend the SQLite schema (migration v2) in `src-tauri/src/db/migrations.rs`. Add columns to `workspaces`: `base_snapshot_path TEXT`, `merged_state_path TEXT`. Add a new table `session_state` (session_id TEXT PK FK, delta_path TEXT, parent_delta_id TEXT FK nullable, mount_path TEXT, modified_files TEXT, created_files TEXT, deleted_files TEXT, delta_size_bytes INTEGER, merged_to_parent INTEGER DEFAULT 0, merged_at TEXT, git_commit TEXT). (M)
- [x] T-05.1.2: Create `src-tauri/src/fs/mod.rs` with a `FilesystemManager` struct. Implement `create_snapshot(repo_path: &str) -> Result<String>` that creates a read-only snapshot of the repo using hard-links (`fs::hard_link`) for every file. Store the snapshot under `~/.ocean/snapshots/{workspace_id}/`. Skip `.git/objects` (already content-addressed), copy `.git/HEAD` and refs. (L)
- [x] T-05.1.3: Implement `create_snapshot` optimization: on macOS with APFS, use `clonefile(2)` (via `libc::clonefile` or `std::fs::copy` with reflink support) for instant copy-on-write at the filesystem level. Fall back to hard-links on HFS+ or other filesystems. (M)
- [x] T-05.1.4: Update `SessionManager::create_workspace(name, repo_path)` to call `FilesystemManager::create_snapshot()`, store the snapshot path and base commit hash in the workspace record. (S)
- [x] T-05.1.5: Implement `FilesystemManager::cleanup_snapshot(workspace_id: &str)` that removes the snapshot directory when a workspace is archived. Guard against deleting the original repo. (S)

### Story S-05.2: COW Filesystem -- macOS (NFS Loopback)

**As a** developer working on macOS, **I want** sessions to get isolated filesystem views via NFS loopback with COW delta tracking, **so that** agents can modify files without affecting each other.

Priority: P0 | Estimate: XL

**Tasks:**
- [x] T-05.2.1: Create `src-tauri/src/fs/cow_macos.rs`. Research and implement a user-space NFS loopback server using the `nfsd` approach (or the `nfs` Rust crate). The server intercepts read/write calls and layers a delta directory on top of a base directory. Document the approach in a comment block at the top of the file. (L)
- [x] T-05.2.2: Implement the read path: when a file is read, check the delta directory first; if not present, read from the parent delta (if stacked); if not present, read from the base snapshot. Return the first match. (M)
- [x] T-05.2.3: Implement the write path: when a file is written, copy it to the delta directory first (copy-on-write), then apply the write to the delta copy. Track the file in the `session_state.modified_files` list. (M)
- [x] T-05.2.4: Implement the delete path: write a sentinel `.ocean_deleted` marker file in the delta directory. The read path must check for this sentinel and return ENOENT even if the file exists in the base. (S)
- [x] T-05.2.5: Implement `create_overlay(base_path, parent_delta_path, session_id) -> Result<String>` that starts the NFS loopback server on a unique local port, mounts it at `~/.ocean/mounts/{session_id}/`, and returns the mount path. (L)
- [x] T-05.2.6: Implement `unmount_overlay(session_id)` that unmounts the NFS mount and stops the loopback server for that session. Handle force-unmount if processes are still using the mount. (M)
- [x] T-05.2.7: Write integration tests: create a snapshot, create an overlay, write a file in the overlay, verify it does not appear in the base, read the base file through the overlay, delete a base file in the overlay and verify ENOENT. (M)

### Story S-05.3: COW Filesystem -- Linux (OverlayFS)

**As a** developer working on Linux, **I want** sessions to get isolated filesystem views via OverlayFS, **so that** I get the same isolation as macOS with kernel-level performance.

Priority: P1 | Estimate: L

**Tasks:**
- [x] T-05.3.1: Create `src-tauri/src/fs/cow_linux.rs`. Implement `create_overlay(base_path, parent_delta_path, session_id) -> Result<String>` using the `mount` syscall with `fstype = "overlay"`. The lower dir is the base snapshot (and optionally the parent delta), the upper dir is the session's delta directory, and the work dir is a per-session temp directory. Mount at `~/.ocean/mounts/{session_id}/`. (L)
- [x] T-05.3.2: Handle the unprivileged case: if OverlayFS mount fails (requires root or user namespaces), fall back to a FUSE-based overlay. Use the `fuser` crate to implement a simple FUSE filesystem with the same layered read/write semantics. (L)
- [x] T-05.3.3: Implement `unmount_overlay(session_id)` using `umount2` with `MNT_DETACH` flag for lazy unmount. (S)
- [x] T-05.3.4: Write integration tests mirroring the macOS tests: snapshot, overlay, write, verify isolation, delete sentinel, read-through. (M)

### Story S-05.4: Shared Read-Only Mounts

**As a** user, **I want** `node_modules/`, `.dart_tool/`, and `build/` directories to be shared read-only across all sessions, **so that** dependencies are not duplicated and disk usage stays low.

Priority: P1 | Estimate: M

**Tasks:**
- [x] T-05.4.1: In `FilesystemManager::create_overlay()`, accept a `shared_paths: Vec<String>` parameter. These paths are bind-mounted (Linux) or symlinked (macOS) from the base snapshot into the overlay mount, bypassing the COW layer entirely. (M)
- [x] T-05.4.2: Implement a default shared paths list: `["node_modules", ".dart_tool", "build", "dist", ".next", "__pycache__", "target"]`. Allow user override via a workspace-level config file `.ocean/config.toml`. (S)
- [x] T-05.4.3: Ensure writes to shared paths are rejected (read-only bind mount on Linux) or logged as warnings (symlink on macOS). If an agent tries to write to `node_modules/`, log the attempt and surface it in the UI. (M)

### Story S-05.5: Child Session Stacking

**As a** user, **I want** to spawn a child session that inherits its parent's file changes (stacked COW), **so that** sub-agents can build on a parent agent's work without merging first.

Priority: P0 | Estimate: L

**Tasks:**
- [x] T-05.5.1: Update `SessionManager::create_session()` to accept an optional `parent_id`. When provided and the parent has `fs_mode = cow`, create a new overlay with `parent_delta_path` set to the parent's delta directory. The child's read path becomes: child delta -> parent delta -> base snapshot. (M)
- [x] T-05.5.2: Cap overlay stacking depth at 4 levels. If a user tries to spawn a child at depth 4, show a warning and offer to merge the parent's delta into the workspace before proceeding. Implement depth checking in `SessionManager`. (S)
- [x] T-05.5.3: When a parent session's delta changes (new file written), the change should be visible to child sessions immediately (assuming the child has not overridden that file). Verify this works naturally with the overlay implementation; add integration tests. (M)
- [x] T-05.5.4: Update the sidebar UI to show the stacking indicator: for each session with `fs_mode = cow`, show "delta: N files" next to the session name. Update in real-time as files are modified. (S)

### Story S-05.6: File Write Watcher & Conflict Detection

**As a** user, **I want** Ocean to detect in real-time when two sessions modify the same file, **so that** I can address conflicts before they become merge nightmares.

Priority: P0 | Estimate: L

**Tasks:**
- [x] T-05.6.1: Create `src-tauri/src/fs/watcher.rs`. Use the `notify` crate to watch each session's delta directory. On any file write event, emit a `FileWriteEvent { session_id, file_path, event_type: created | modified | deleted }`. (M)
- [x] T-05.6.2: Create `src-tauri/src/fs/conflict.rs` with a `ConflictDetector` struct. Maintain a `HashMap<String, Vec<String>>` mapping file paths to the list of session IDs that have modified them. On each `FileWriteEvent`, update the map and check for overlaps. (M)
- [x] T-05.6.3: Implement line-level overlap detection: when two sessions modify the same file, read both deltas, compute a diff against the base, and check if the modified line ranges overlap. Classify as `disjoint` (same file, different regions), `overlapping` (same file, overlapping lines), or `conflicting` (same lines, incompatible changes). Use the `similar` crate for diffing. (L)
- [x] T-05.6.4: Add a `conflict_watches` table to SQLite (migration v3): `file_path TEXT, session_ids TEXT (JSON array), severity TEXT, detected_at TEXT, resolved INTEGER DEFAULT 0, resolution TEXT`. Insert/update on conflict detection. (S)
- [x] T-05.6.5: Emit a Tauri event `conflict-detected` with `{ file_path, sessions: [{id, name}], severity, overlapping_lines }` when a new conflict is detected or severity escalates. (S)
- [x] T-05.6.6: Implement `ConflictDetector::resolve(file_path, resolution)` where resolution is one of: `auto_merged`, `session_X_wins`, `manual`. Update the DB record. (S)

### Story S-05.7: Merge Panel

**As a** user, **I want** a merge panel that appears when a session completes, showing what files changed and letting me merge the delta into the workspace, **so that** I can review and accept agent work.

Priority: P0 | Estimate: L

**Tasks:**
- [x] T-05.7.1: Create `src/components/merge/MergePanel.tsx` -- a right-side panel (or modal) that activates when a session's status transitions to `completed` and it has `fs_mode = cow`. Shows: session name, list of modified/created/deleted files with diff previews, conflict indicators. (L)
- [x] T-05.7.2: For each file in the delta, show a unified diff (base vs delta) using a diff viewer component. Create `src/components/merge/DiffViewer.tsx` that renders a side-by-side or inline diff. Use a lightweight diff library or render pre-computed diffs from the Rust backend. (L)
- [x] T-05.7.3: Implement Tauri command `get_session_delta(session_id) -> DeltaInfo { modified: Vec<FileDiff>, created: Vec<String>, deleted: Vec<String> }`. `FileDiff` includes `{ path, base_content, delta_content, diff_hunks }`. (M)
- [x] T-05.7.4: Implement Tauri command `merge_session(session_id, target: 'parent' | 'workspace') -> MergeResult`. Apply the session's delta to the target: copy delta files, remove sentinel-deleted files. Return `{ status: 'clean' | 'conflicts', conflicts: Vec<ConflictInfo> }`. (M)
- [x] T-05.7.5: In the merge panel, provide buttons: "Merge All" (apply entire delta), "Merge Selected" (checkboxes per file), "Discard" (delete delta without applying), "Resolve Conflicts" (opens conflict resolution sub-panel). (M)
- [x] T-05.7.6: After a successful merge, update the session's `session_state.merged_to_parent = true` and `merged_at`. Emit a `session-merged` event. Clean up the overlay mount. (S)

### Story S-05.8: Graph View UI

**As a** user, **I want** a full-screen graph view showing the Session DAG with delta sizes, conflict indicators, and session statuses, **so that** I can see the big picture of all parallel work.

Priority: P1 | Estimate: L

**Tasks:**
- [x] T-05.8.1: Create `src/components/graph/GraphView.tsx` -- a full-screen overlay toggled by Cmd+Shift+G. Fetches the full session DAG for all active workspaces via Tauri command `get_full_dag() -> Vec<WorkspaceDAG>`. (M)
- [x] T-05.8.2: Implement DAG layout using a simple top-down tree layout algorithm. Each workspace is a root node; sessions are children. Edges represent `spawned` (solid line), `linked` (dashed line), or `depends` (double line) relationships. Use an HTML5 Canvas or SVG for rendering. (L)
- [x] T-05.8.3: Render each node as a card showing: session name, status indicator, type icon (shell/agent/process), delta size ("delta: 3 files"), and time since last activity. (M)
- [x] T-05.8.4: Render conflict indicators on edges or nodes: if two sibling sessions have conflicting files, show a warning icon on both nodes and a red highlight on their shared parent edge. (S)
- [x] T-05.8.5: Make nodes interactive: click to focus that session (switch to terminal view and select it), right-click for context menu (same actions as sidebar), double-click to expand/collapse children. (M)
- [x] T-05.8.6: Add a legend to the graph view explaining node states and edge types. (S)

---

## Epic E-06: Git Translation ✅ COMPLETE

Phase: 5 | Priority: P1 | **Status: DONE**

This epic bridges the Session DAG world (where agents work) and the git world (where humans collaborate). When a workspace is done, Ocean translates the accumulated deltas into clean git commits and optionally creates a pull request. DAG metadata (which agent did what, session relationships, conflict resolutions) is preserved as git commit trailers.

### Story S-06.1: Session to Commit Translation

**As a** user, **I want** a completed session's file changes to be translatable into a git commit, **so that** agent work is recorded in version control with full context.

Priority: P1 | Estimate: L

**Tasks:**
- [x] T-06.1.1: Create `src-tauri/src/git/translator.rs`. Implement `session_to_commit(session_id: &str, message: Option<&str>) -> Result<String>` that: (1) reads the session's delta files, (2) stages them in the workspace's git index using `git2::Index`, (3) creates a commit with the provided message or an auto-generated one. Return the commit hash. (L)
- [x] T-06.1.2: Auto-generate commit messages from session metadata: `"[ocean] {session_name}: {summary}"`. Summary is derived from the modified file list (e.g., "modified 3 files in src/auth/"). If the session has `agent_type`, include it: `"[ocean/claude-code] auth middleware: modified 3 files"`. (M)
- [x] T-06.1.3: Add git trailers to the commit message: `Ocean-Session-Id: {uuid}`, `Ocean-Agent: {agent_type}`, `Ocean-Parent-Session: {parent_id}`, `Ocean-Workspace: {workspace_name}`. Use `git2::Commit::create()` with the formatted message. (S)
- [x] T-06.1.4: Expose Tauri command `translate_session_to_commit(session_id, message) -> { commit_hash }`. (S)

### Story S-06.2: Workspace to PR

**As a** user, **I want** to ship a completed workspace as a pull request on GitHub, **so that** the team can review the combined output of all agents.

Priority: P1 | Estimate: L

**Tasks:**
- [x] T-06.2.1: Implement `workspace_to_branch(workspace_id: &str) -> Result<String>` in `src-tauri/src/git/translator.rs`. Create a new git branch named `ocean/{workspace_name_slug}` from the workspace's base commit. Apply all merged session deltas as commits on this branch (one commit per merged session, ordered by merge timestamp). Return the branch name. (L)
- [x] T-06.2.2: Implement `create_pr(workspace_id: &str, title: &str, draft: bool) -> Result<String>` that: (1) pushes the branch to the remote, (2) calls `gh pr create --title "{title}" --body "{body}" --head {branch}` via `std::process::Command`. Return the PR URL. (M)
- [x] T-06.2.3: Generate the PR body from workspace metadata: include a summary of all sessions (name, agent type, status, files changed), the DAG structure as a text tree, conflict resolutions if any, and total stats (files changed, lines added/removed). (M)
- [x] T-06.2.4: Expose Tauri command `create_workspace_pr(workspace_id, title, draft) -> { pr_url, branch }`. (S)

### Story S-06.3: DAG Metadata to Trailers

**As a** developer reviewing a PR, **I want** git commit trailers to contain the full DAG provenance, **so that** I can trace which agent produced which change and how sessions related to each other.

Priority: P2 | Estimate: M

**Tasks:**
- [x] T-06.3.1: Define the trailer schema in `src-tauri/src/git/trailers.rs`: `Ocean-Session-Id`, `Ocean-Agent`, `Ocean-Agent-Type`, `Ocean-Parent-Session`, `Ocean-Workspace`, `Ocean-Workspace-Id`, `Ocean-Conflict-Resolution` (if the session had conflicts that were resolved). (S)
- [x] T-06.3.2: Update `session_to_commit()` to always include the full trailer block. Format trailers per git convention: blank line after the commit message body, then `Key: Value` lines. (S)
- [x] T-06.3.3: Implement `parse_ocean_trailers(commit_hash: &str) -> Option<OceanTrailers>` that reads a commit and extracts Ocean-specific trailers. This enables future features like "show DAG history from commit trailers". (M)

### Story S-06.4: Ship Workspace Command

**As a** user, **I want** a single "Ship Workspace" command that merges all sessions, commits, pushes, and creates a PR, **so that** I can go from agent work to review-ready in one action.

Priority: P1 | Estimate: L

**Tasks:**
- [x] T-06.4.1: Implement `ship_workspace(workspace_id: &str, pr_title: &str) -> Result<ShipResult>` as an orchestration function in `src-tauri/src/git/translator.rs`. Steps: (1) verify all sessions are completed or merged, (2) merge any unmerged session deltas to workspace, (3) create git branch with commits, (4) push to remote, (5) create PR. Return `ShipResult { branch, commits: Vec<String>, pr_url }`. (L)
- [x] T-06.4.2: Handle partial failures gracefully: if push fails (auth, network), return the error but preserve the local branch and commits. If PR creation fails, return the branch name so the user can create the PR manually. (M)
- [x] T-06.4.3: Create `src/components/ship/ShipWorkspaceDialog.tsx` -- a modal dialog triggered by a "Ship" button on the workspace in the sidebar or via a keyboard shortcut. Shows: workspace name, session summary, PR title input (pre-filled), draft toggle, "Ship" button. Displays progress steps as they complete. (M)
- [x] T-06.4.4: After successful shipping, update the workspace status to `shipped` and store the PR URL in the workspace record. Show a success notification with a clickable PR link. (S)
- [x] T-06.4.5: Preserve terminal scrollback and session history as a workspace artifact. Write a JSON summary to `~/.ocean/artifacts/{workspace_id}/history.json` containing all session metadata, merged file lists, and conflict resolutions. (M)

---

## Epic E-07: A2UI Integration ✅ COMPLETE

Phase: 6 | Priority: P2 | **Status: DONE**

This epic implements support for Google's Agent-to-UI (A2UI) protocol. When an AI agent emits a special escape sequence containing A2UI JSON, Ocean renders it as a native interactive component inline in the terminal. User interactions on these components are sent back to the agent. This makes Ocean the first terminal to natively render rich agent UI.

### Story S-07.1: Escape Sequence Parser

**As a** developer, **I want** Ocean to detect and parse the custom A2UI escape sequence in terminal output, **so that** A2UI JSON payloads are extracted for rendering.

Priority: P2 | Estimate: M

**Tasks:**
- [x] T-07.1.1: Define the Ocean A2UI escape sequence format: `\x1b]ocean;a2ui;<base64-encoded-json>\x07`. Document this in `src-tauri/src/a2ui/protocol.md`. The base64 encoding avoids issues with special characters in the JSON. (S)
- [x] T-07.1.2: Create `src-tauri/src/a2ui/parser.rs`. Implement `parse_a2ui_sequence(data: &[u8]) -> Vec<A2UIParseResult>` that scans a byte stream for the escape sequence, extracts the base64 payload, decodes it, and parses the JSON. Return `A2UIParseResult { position: usize, component: A2UIComponent }`. Handle malformed sequences gracefully (log warning, skip). (M)
- [x] T-07.1.3: Hook the A2UI parser into the PTY read loop in `src-tauri/src/pty/mod.rs`. Before emitting `pty-output`, scan for A2UI sequences. If found, strip them from the terminal data (so xterm.js does not render garbage), and emit a separate Tauri event `a2ui-component-{sessionId}` with the parsed component. (M)
- [x] T-07.1.4: Define the `A2UIComponent` Rust struct in `src-tauri/src/a2ui/types.rs`: `{ component_id: String, component_type: String, props: serde_json::Value, children: Vec<A2UIComponent> }`. Validate against a basic A2UI schema (require `component_type` and `props`). (S)

### Story S-07.2: Component Renderer

**As a** user, **I want** A2UI components to appear inline in my terminal as native interactive widgets, **so that** agents can present rich information without me leaving the terminal.

Priority: P2 | Estimate: L

**Tasks:**
- [x] T-07.2.1: Create `src/components/terminal/A2UIRenderer.tsx` -- a SolidJS component that receives `A2UIComponent` data and the terminal insertion point (line number). It renders the component as a DOM element absolutely positioned over the terminal, similar to the annotation overlay but with larger, block-level elements. (M)
- [x] T-07.2.2: Implement a component registry in `src/lib/a2ui/registry.ts`: a `Map<string, Component>` that maps A2UI component type names to SolidJS components. Export `registerComponent(type, component)` and `getComponent(type)`. (S)
- [x] T-07.2.3: Handle A2UI component insertion into the terminal flow. When an A2UI component arrives, insert a placeholder block in the xterm.js buffer (empty lines of the appropriate height). Render the SolidJS component in the overlay at that position. Track the mapping in `src/stores/a2uiStore.ts`. (L)
- [x] T-07.2.4: Handle terminal scroll and resize: when the terminal scrolls or resizes, reposition all active A2UI components. When a component scrolls out of the visible viewport, hide it (display: none) for performance. (M)
- [x] T-07.2.5: Implement component dismissal: each A2UI component gets a small "X" button in the top-right corner. Clicking it collapses the component back to a single line summary. The state transitions: `rendered` -> `collapsed` -> `dismissed`. (S)

### Story S-07.3: Core A2UI Components

**As a** user, **I want** common A2UI components (tables, forms, buttons, cards, code blocks, diffs) to render correctly, **so that** agents can present structured data natively.

Priority: P2 | Estimate: XL

**Tasks:**
- [x] T-07.3.1: Implement `src/components/a2ui/A2UIButton.tsx` and `src/components/a2ui/A2UIButtonGroup.tsx`. Button renders as a styled terminal-themed button. ButtonGroup renders buttons inline. (S)
- [x] T-07.3.2: Implement `src/components/a2ui/A2UITable.tsx`. Renders a table with headers, rows, and optional sorting (click header to sort). Support column types: text, number, badge (colored status). Max height with scroll for large datasets. (M)
- [x] T-07.3.3: Implement `src/components/a2ui/A2UIForm.tsx`. Renders a form with input types: text, select, checkbox, radio. Collects form state in a SolidJS signal. On submit, sends the form data back to the agent. (M)
- [x] T-07.3.4: Implement `src/components/a2ui/A2UICard.tsx` and `A2UICardGroup.tsx`. Card shows a title, body text, and optional action buttons. CardGroup arranges cards in a grid or horizontal scroll. (S)
- [x] T-07.3.5: Implement `src/components/a2ui/A2UIProgressBar.tsx` and `A2UISpinner.tsx`. ProgressBar shows a labeled bar with percentage. Spinner shows a terminal-style spinner animation. (S)
- [x] T-07.3.6: Implement `src/components/a2ui/A2UICodeBlock.tsx`. Renders a code block with syntax highlighting (use `Prism.js` or `highlight.js` with a terminal-appropriate theme) and a "Copy" button. (M)
- [x] T-07.3.7: Implement `src/components/a2ui/A2UIDiff.tsx`. Renders an inline unified diff with line numbers, color-coded additions/deletions. (M)
- [x] T-07.3.8: Implement `src/components/a2ui/A2UITree.tsx`. Renders a collapsible tree view. Nodes can be expanded/collapsed by clicking. (S)
- [x] T-07.3.9: Register all core components in `src/lib/a2ui/registry.ts` at app initialization. (S)

### Story S-07.4: Ocean-Specific Extensions

**As a** user, **I want** Ocean-specific A2UI extensions like SessionLink, ProcessStatus, and GitWidget, **so that** agents can deeply integrate with Ocean features.

Priority: P2 | Estimate: M

**Tasks:**
- [x] T-07.4.1: Implement `src/components/a2ui/OceanSessionLink.tsx`. Renders a clickable link to another Ocean session. Shows the session name and status indicator. Clicking switches to that session. (S)
- [x] T-07.4.2: Implement `src/components/a2ui/OceanProcessStatus.tsx`. Shows live status of a running process: PID, CPU, RAM, uptime, status indicator. Subscribes to process metrics from the Rust backend. (M)
- [x] T-07.4.3: Implement `src/components/a2ui/OceanGitWidget.tsx`. Renders an inline git status viewer: branch, staged/modified counts, last commit, with "Commit" and "Push" action buttons. (M)
- [x] T-07.4.4: Implement `src/components/a2ui/OceanMetricsChart.tsx`. Renders a live-updating sparkline chart for a metric (CPU, RAM, or custom). Uses a rolling window of 60 data points (one per second). (M)

### Story S-07.5: Bidirectional Communication

**As an** agent developer, **I want** user interactions on A2UI components (button clicks, form submissions) to be sent back to the agent, **so that** the agent can respond to user choices.

Priority: P2 | Estimate: M

**Tasks:**
- [x] T-07.5.1: Define the response protocol: when a user interacts with an A2UI component, Ocean writes a JSON response to the agent's stdin: `{"ocean_a2ui_response": {"component_id": "...", "action": "click|submit|select", "data": {...}}}` followed by a newline. (S)
- [x] T-07.5.2: Implement the response writer in `src-tauri/src/a2ui/responder.rs`. Create `send_response(session_id: &str, component_id: &str, action: &str, data: serde_json::Value) -> Result<()>` that writes the JSON to the session's PTY master (which the agent reads as stdin). (M)
- [x] T-07.5.3: Wire frontend component interactions to the responder. In each A2UI component (Button, Form, Table row click), on interaction, invoke Tauri command `a2ui_respond(session_id, component_id, action, data)`. (M)
- [x] T-07.5.4: Implement an optional WebSocket side-channel for A2UI communication (for agents that prefer async messaging over stdin). Create a local WebSocket server on a random port in `src-tauri/src/a2ui/websocket.rs`. Agents connect via the port advertised in an environment variable `OCEAN_A2UI_WS_PORT`. (L)

---

## Epic E-08: Parallel Execution Connectors ✅ COMPLETE

Phase: 6 | Priority: P2 | **Status: DONE**

Connectors visualize relationships between related parallel processes (e.g., a Flutter app, its DevTools inspector, and adb logcat). This epic implements auto-detection of known process relationships, a connector bar UI, and a merged log view. Connectors reduce the cognitive load of monitoring multiple related processes.

### Story S-08.1: Auto-Detection Engine

**As a** user, **I want** Ocean to automatically detect when processes in different sessions are related, **so that** I do not have to manually configure process relationships.

Priority: P2 | Estimate: L

**Tasks:**
- [x] T-08.1.1: Create `src-tauri/src/connectors/mod.rs` with an `AutoDetector` struct. Implement a polling loop (every 3 seconds) that iterates over all active sessions and scans for connector patterns. (M)
- [x] T-08.1.2: Create `src-tauri/src/connectors/detector.rs` with a `ConnectorPattern` trait: `fn detect(sessions: &[Session], processes: &[ProcessInfo], ports: &[ListeningPort]) -> Vec<ConnectorCandidate>`. Each connector type implements this trait. (M)
- [x] T-08.1.3: Implement port scanning: `get_listening_ports() -> Vec<ListeningPort>` where `ListeningPort { pid: u32, port: u16, protocol: String }`. On macOS, use `lsof -i -P -n` output. On Linux, read `/proc/net/tcp`. Map PIDs back to session IDs. (M)
- [x] T-08.1.4: Implement process tree scanning: for each session's PID, walk the process tree (children, grandchildren) using `sysinfo` crate. Build a `HashMap<u32, Vec<u32>>` of PID -> child PIDs. (S)
- [x] T-08.1.5: Add `connector_groups` table to SQLite (migration v4): `id TEXT PK, workspace_id TEXT FK, name TEXT, connector_type TEXT, session_ids TEXT (JSON array), health TEXT, metadata TEXT`. (S)
- [x] T-08.1.6: When a connector is detected, insert into `connector_groups` and emit Tauri event `connector-detected` with `{ connector_type, sessions, name }`. When a connector's processes all die, update health to `down` and emit `connector-down`. (M)

### Story S-08.2: Flutter Connector

**As a** Flutter developer, **I want** Ocean to detect my Flutter app, DevTools, and device connections as a related group, **so that** I can see their combined status and health.

Priority: P2 | Estimate: M

**Tasks:**
- [x] T-08.2.1: Implement `FlutterDetector` in `src-tauri/src/connectors/flutter.rs`. Detection logic: (1) find a session running `flutter run` or `flutter attach`, (2) parse its output for the VM service URL (`http://127.0.0.1:PORT/...`), (3) find any session whose process is listening on that port or connecting to it (DevTools), (4) find any `adb` process connected to the same device. (M)
- [x] T-08.2.2: Parse the Flutter tool output for the DevTools URL (`http://127.0.0.1:9100?uri=...`). Store in connector metadata. (S)
- [x] T-08.2.3: Populate the connector group with metadata: `{ vm_service_url, devtools_url, device_name, device_type }`. (S)

### Story S-08.3: Node.js Connector

**As a** Node.js developer, **I want** Ocean to detect my Node server's debug port and link it with Chrome DevTools sessions, **so that** I can see the debugging relationship.

Priority: P2 | Estimate: M

**Tasks:**
- [x] T-08.3.1: Implement `NodeDetector` in `src-tauri/src/connectors/node.rs`. Detection logic: (1) find sessions running `node --inspect` or `node --inspect-brk`, (2) parse output for the debug URL (`Debugger listening on ws://127.0.0.1:9229/...`), (3) find any process connecting to that WebSocket port. (M)
- [x] T-08.3.2: Detect related processes: if the Node process spawns child processes (e.g., worker threads, child_process.fork), group them into the same connector. (S)

### Story S-08.4: Docker Connector

**As a** developer using Docker, **I want** Ocean to detect `docker compose` services and their relationships, **so that** I can monitor the health of my containerized stack.

Priority: P2 | Estimate: M

**Tasks:**
- [x] T-08.4.1: Implement `DockerDetector` in `src-tauri/src/connectors/docker.rs`. Detection logic: (1) find sessions running `docker compose up` or `docker-compose up`, (2) shell out to `docker compose ps --format json` to get running containers, (3) map container network ports to host ports, (4) detect which other sessions are connecting to those ports. (M)
- [x] T-08.4.2: Populate connector metadata with: `{ containers: [{name, image, status, ports}], compose_file }`. (S)
- [x] T-08.4.3: Implement health checking: periodically run `docker compose ps` and update the connector health. If any container exits, set health to `degraded`. If all exit, set to `down`. (M)

### Story S-08.5: Connector Bar UI

**As a** user, **I want** a connector bar at the bottom of the Ocean window showing all active connector groups, **so that** I can see the health of related process groups at a glance.

Priority: P2 | Estimate: M

**Tasks:**
- [x] T-08.5.1: Create `src/components/connectors/ConnectorBar.tsx` -- a fixed-height bar at the bottom of the app window. Shows one `ConnectorGroup` component per detected connector. Toggle visibility with Cmd+K. (M)
- [x] T-08.5.2: Create `src/components/connectors/ConnectorGroup.tsx`. Renders the group as a horizontal chain of process nodes connected by lines (using SVG or CSS borders). Each node shows: process name, status dot, and PID. The connecting line shows the relationship (port number, protocol). (M)
- [x] T-08.5.3: Show aggregated stats per group: total RAM, total CPU, uptime. Display at the end of the chain. (S)
- [x] T-08.5.4: Make nodes clickable: clicking a process node switches to that session's terminal. Right-click shows: "Kill Process", "Show Logs", "Restart". (S)
- [x] T-08.5.5: Show health status: green border for `healthy`, yellow for `degraded`, red for `down`. Animate a brief pulse when health changes. (S)

### Story S-08.6: Merged Log View

**As a** user, **I want** to see a merged, interleaved log stream from all processes in a connector group, **so that** I can correlate events across related processes.

Priority: P2 | Estimate: L

**Tasks:**
- [x] T-08.6.1: Create `src/components/connectors/MergedLogView.tsx` -- a full-pane or modal component that renders a merged terminal output stream. Each line is prefixed with the source session name in a distinct color. Activated via "Merge Logs" button on a connector group. (M)
- [x] T-08.6.2: Implement log merging in `src-tauri/src/connectors/log_merger.rs`. Subscribe to PTY output events from all sessions in a connector group. Timestamp each line and emit a merged stream via Tauri event `merged-log-{connector_id}`. Maintain ordering by timestamp. (L)
- [x] T-08.6.3: Implement filtering: add a filter bar at the top of the merged log view. Allow filtering by source session (checkboxes) and by text search (substring match). (M)
- [x] T-08.6.4: Implement log-level detection: parse common log formats (JSON logs, `[INFO]`/`[ERROR]` prefixes) and color-code accordingly. Allow filtering by log level. (M)
- [x] T-08.6.5: Support scrollback in the merged view: buffer the last 10,000 merged lines. Allow scrolling up. Auto-scroll to bottom when new lines arrive (unless user has scrolled up). (S)

---

## Appendix: Cross-Cutting Concerns

The following items are not epics but should be tracked and addressed across all phases:

**Testing strategy:**
- Unit tests for all Rust modules (run via `cargo test`)
- Integration tests for PTY, filesystem, and git operations
- Frontend component tests using Vitest + SolidJS testing library
- End-to-end tests using Tauri's WebDriver support

**Configuration:**
- User settings stored in `~/.ocean/config.toml`
- Workspace-level overrides in `.ocean/config.toml` within the repo
- Configurable: font family, font size, theme, keybindings, shared paths, polling intervals, editor command

**Theming:**
- Ship with a dark theme (default) and a light theme
- Theme defined in `src/styles/themes/` as CSS custom properties
- Terminal colors follow the xterm.js theme API

**Accessibility:**
- All interactive elements must be keyboard-navigable
- Status indicators should not rely solely on color (use shape: dot, ring, circle, cross, check)
- Screen reader labels for status bar sections

**Logging and diagnostics:**
- Rust backend logs via `env_logger` at configurable levels
- Frontend logs via `console.log` with a `[Ocean]` prefix
- Crash reports written to `~/.ocean/logs/crash-{timestamp}.log`

---
---

# Enterprise Readiness — Epics E-09 through E-15

> Tiers: T0 = V1, T1 = V1.x (months 1-6), T2 = V2 (months 6-12), T3 = V2.x (months 12-24).
> Full architecture in `.gstack/solve/artifacts/plan-output.md`.

---

## Epic E-09: Security Hardening & Code Signing

Tier: 0 (ship with V1) | Priority: P0 | **Status: TODO**

### Story S-09.1: Content Security Policy ✅
Priority: P0 | Estimate: S
- [x] T-09.1.1: Set `security.csp` in `src-tauri/tauri.conf.json`. Verified no eval/innerHTML/dynamic scripts in frontend. (S)
- [x] T-09.1.2: Audited all SolidJS components — no CSP violations found (no eval, no dynamic scripts, no external resources). (M)

### Story S-09.2: Code Signing & Notarization
Priority: P0 | Estimate: M
- [ ] T-09.2.1: Add `bundle.macOS.signingIdentity` to `tauri.conf.json`. Requires Apple Developer ID certificate. (S)
- [ ] T-09.2.2: Create `.github/workflows/release.yml` — build, sign, notarize, upload DMG as release asset. (L)
- [ ] T-09.2.3: Add Linux signing — GPG-sign `.deb` and `.AppImage` in release workflow. (M)

### Story S-09.3: Capability Tightening ✅
Priority: P0 | Estimate: M
- [x] T-09.3.1: Audited all `#[tauri::command]` handlers. Added `validate_session_id`, `validate_workspace_id`, PTY write size limit (1MB). (M)
- [x] T-09.3.2: Tightened `default.json` — scoped event listeners to known event patterns. (M)
- [x] T-09.3.3: Added rate limiting to `execute_annotation_action` — max 5 calls per 10s window. (S)
- [x] T-09.3.4: Wrote `docs/security.md` — CSP, IPC security, file access, PTY isolation, SQLite, A2UI, network. (M)

---

## Epic E-12: Terminal History & Session Recording ✅ COMPLETE

Tier: 1 (V1.x) | Priority: P1 | **Status: DONE**

### Story S-12.1: Shell Integration for Command Detection ✅
- [x] T-12.1.1–T-12.1.7: Command detector module, OSC 7337 shell integration, SQLite FTS5 storage, PTY read loop hooks. (commits 182eab0, d0a978f)

### Story S-12.2: Session Recording (Asciicast v2) ✅
- [x] T-12.2.1–T-12.2.7: SessionRecorder writing asciicast v2 `.cast` files, PTY output+input recording, storage management. (commit 182eab0)

### Story S-12.3: Command History Panel ✅
- [x] T-12.3.1–T-12.3.5: History panel UI (Cmd+Shift+H), FTS5 search, keyboard nav, click-to-insert. (commit 182eab0)

### Story S-12.4: Session Recording Playback ✅
- [x] T-12.4.1–T-12.4.3: `get_session_recording` command, ScrollbackViewer playback mode with controls, recording indicator. (commit d0a978f)

---

## Epic E-13: Saved Prompts & Snippets ✅ COMPLETE

Tier: 1 (V1.x) | Priority: P1 | **Status: DONE**

### Story S-13.1: Snippet Storage & CRUD ✅
- [x] T-13.1.1–T-13.1.4: SQLite snippets table, CRUD commands, variable substitution, usage tracking. (commit 182eab0)

### Story S-13.2: Snippet Library UI ✅
- [x] T-13.2.1–T-13.2.5: SnippetLibrary panel (Cmd+Shift+E), category tabs, inline editor, variable prompt flow. (commit 182eab0)

### Story S-13.3: Command Palette & History Integration ✅
- [x] T-13.3.1–T-13.3.4: Snippets in CommandPalette, auto-suggestions from history. (commit 182eab0)

---

## Epic E-10: Auto-Update & Telemetry ✅ COMPLETE

Tier: 1 (V1.x) | Priority: P1 | **Status: DONE**

### Story S-10.1: Tauri Auto-Updater ✅
- [x] T-10.1.1–T-10.1.6: tauri-plugin-updater integration, check_for_update + install_update commands, UpdateNotification banner with version info and install button, update channel preference in settings.

### Story S-10.2: Crash Reporting ✅
- [x] T-10.2.1–T-10.2.4: Rust panic hook writing crash JSON to ~/.ocean/crashes/, write_crash_report + get_crash_reports commands, ErrorBoundary enhanced to save crash reports, TelemetryConsent first-launch dialog.

---

## Epic E-11: Audit Logging & Managed Configuration ✅ COMPLETE

Tier: 1 (V1.x) | Priority: P1 | **Status: DONE**

### Story S-11.1: Persistent Audit Logging ✅
- [x] T-11.1.1–T-11.1.8: SQLite audit_events table (migration v5), AuditLogger module, hooks into session/workspace/filesystem/git lifecycle, get_audit_events + export_audit_log commands, AuditViewer panel (Cmd+Shift+U) with category filters, pagination, and JSON Lines export.

### Story S-11.2: Managed Configuration (MDM) ✅
- [x] T-11.2.1–T-11.2.8: ConfigManager with priority cascade (MDM plist > enterprise.toml > user settings > defaults), macOS plist reading, Linux /etc/ocean/managed.toml, get_config/set_user_config commands (rejects managed keys), docs/enterprise-config.md with .mobileconfig sample and full key reference.
