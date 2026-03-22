# Ocean -- Feature Specification

**Version:** 1.0
**Last Updated:** 2026-03-15
**Status:** Draft
**Source Documents:** plan-output.md, think-output.md

---

## Overview

This document defines every feature in Ocean V1, organized by functional group. Each feature includes a unique ID, priority level, roadmap phase, description, user value, acceptance criteria, technical dependencies, and UX notes.

**Priority Definitions:**

- **P0** -- Must ship in the target phase. Blocking for subsequent features or for the product to be viable.
- **P1** -- Should ship in the target phase. High value but the product is minimally functional without it.
- **P2** -- Nice to have in the target phase. Can slip to a later phase without impacting the release.

**Phase Definitions:**

| Phase | Name | Weeks | Goal |
|-------|------|-------|------|
| 1 | Foundation | 1-6 | Working terminal with session tree |
| 2 | Ambient Awareness | 7-10 | Status bar with live metrics |
| 3 | Interactive Output | 11-15 | Clickable, actionable terminal output |
| 4 | Code State Isolation | 16-22 | Session DAG with COW filesystem |
| 5 | Git Translation Layer | 23-25 | Translate DAG state back to git |
| 6 | A2UI and Connectors | 26-30 | Rich UI in terminal and process connectors |

---

## A. Session DAG and Code State Isolation

The Session DAG is Ocean's central primitive. Each session owns both a terminal and a filesystem layer. Spawning a child session forks the parent's code state via copy-on-write. The DAG is simultaneously the session graph, the version graph, and the isolation layer.

---

### F-001: Workspace Creation and Base Snapshot

**Priority:** P0
**Phase:** 4 -- Code State Isolation

**Description:**
A workspace is the top-level grouping tied to a task or goal (e.g., "Auth Refactor", "Fix #423"). Creating a workspace snapshots the current repository state as a read-only base layer using hard-links or reflinks for instant, zero-copy creation. All sessions within the workspace derive their filesystem state from this base.

**User Value:**
Gives users a clean, immutable reference point for a task. Multiple agents and sessions can branch from the same known state without manually managing git branches or worktrees.

**Acceptance Criteria:**
- User can create a workspace from the command palette, keyboard shortcut (Cmd+Shift+T), or session sidebar context menu.
- Workspace creation prompts for a name and optionally a description/tag.
- The system snapshots the current repository at HEAD using hard-links (or reflinks where supported), completing in under 2 seconds for a repository of up to 5GB.
- The snapshot is stored as a read-only base layer; no process can write to it.
- The workspace record is persisted in SQLite with fields: id, name, created_at, status, base_snapshot path, base_commit hash, merged_state path, git_branch (nullable), git_pr (nullable), and metadata (JSON).
- Creating a workspace while the working tree has uncommitted changes displays a warning and prompts the user to stash, commit, or proceed anyway (snapshot includes dirty state).
- Workspace appears immediately in the session sidebar under its own collapsible group.
- The workspace's base_commit is displayed in the sidebar tooltip and in the workspace header.
- Workspaces persist across application restarts via SQLite; reopening Ocean restores all active and archived workspaces.
- Shared directories (node_modules, .dart_tool, build, vendor) are mounted read-only and shared across all sessions in the workspace, not duplicated.

**Technical Dependencies:**
- SQLite storage layer (rusqlite)
- Filesystem Manager component in Rust backend
- Session sidebar UI (F-004)

**UX Notes:**
- Keyboard shortcut: Cmd+Shift+T
- Workspace name is editable after creation via double-click in the sidebar.
- Collapsed workspaces show a summary line: "(N active, M idle)".
- The active workspace is visually distinguished with a brighter header.

---

### F-002: Session Creation with COW Filesystem Layer

**Priority:** P0
**Phase:** 4 -- Code State Isolation

**Description:**
Creating a session within a workspace allocates a copy-on-write (COW) filesystem overlay on top of the workspace's base snapshot. Reads fall through to the base layer; writes are captured in a per-session delta directory. This gives each session full filesystem isolation at near-zero disk cost.

**User Value:**
Agents and users can freely modify files in their session without affecting other sessions or the base state. No need for git worktrees, no multi-GB directory copies, no redundant `npm install` runs. Isolation is instant and automatic.

**Acceptance Criteria:**
- User can create a session via Cmd+T (in current workspace), right-click on a workspace in the sidebar, or command palette.
- Session creation supports three fs_mode values: `cow` (own delta layer), `shared` (read-only view of base), and `none` (uses host filesystem directly).
- For `cow` mode on macOS: an NFS loopback overlay is created with SQLite-backed delta tracking. Session filesystem is mounted at a unique path.
- For `cow` mode on Linux: OverlayFS is used when available (requires mount namespace or root); FUSE-based overlay is the fallback for unprivileged operation.
- The session's PTY CWD is automatically set to the session's mount path so all commands see the isolated filesystem.
- The delta directory starts empty (zero bytes). Only files modified by the session are copied into the delta.
- Reads that miss the delta layer fall through to the base snapshot transparently.
- Delta size is tracked and displayed in the session sidebar (e.g., "3 files changed, 12KB delta").
- Session metadata is persisted in SQLite: id, workspace_id, parent_id, edge_type, name, type, fs_mode, agent_type, pid, pty_id, status, timestamps, exit_code, cwd, env_snapshot, scrollback_path.
- Creating a session completes in under 500ms (no full directory copy).
- A session with fs_mode=shared sees the base snapshot read-only; writes fail with a clear error.
- A session with fs_mode=none operates on the host filesystem with no overlay (for legacy workflows).

**Technical Dependencies:**
- F-001 (Workspace creation and base snapshot)
- PTY management (F-036)
- Platform-specific filesystem overlay (NFS loopback on macOS, OverlayFS/FUSE on Linux)
- SQLite storage layer

**UX Notes:**
- Keyboard shortcut: Cmd+T for new session in current workspace.
- When creating a session, a dropdown offers fs_mode selection; defaults to `cow` for agent/shell sessions and `shared` for dev servers.
- The session node in the sidebar shows a delta indicator badge (e.g., "delta: 3 files") once writes occur.

---

### F-003: Child Session Spawning (Stacked Overlays)

**Priority:** P0
**Phase:** 4 -- Code State Isolation

**Description:**
A session can spawn child sessions whose COW layer is stacked on top of the parent's delta. The child sees the parent's modifications plus the base snapshot. The child's own writes go to its own delta. This models the sub-agent pattern: an agent spawns a sub-task that builds on the agent's current work.

**User Value:**
Agents can delegate sub-tasks to child agents without losing or conflicting with their own in-progress work. The child sees the parent's latest state, can make its own changes, and those changes can be merged back to the parent or discarded independently.

**Acceptance Criteria:**
- User can spawn a child session via right-click on a session node and selecting "Spawn child session", or via Cmd+N when a session is focused.
- The child session's COW layer is stacked: reads check child delta, then parent delta, then base snapshot.
- The child session has its own independent delta directory; writes do not affect the parent's delta.
- The read path correctly resolves at each layer: if child has not modified file X but parent has, child reads parent's version of X. If neither has modified it, the base version is returned.
- Stacking depth is capped at 4 levels. Attempting to create a 5th level prompts the user to flatten (merge intermediate deltas) before proceeding.
- The session tree sidebar shows the parent-child relationship with indentation and a connecting line or arrow.
- The child session's edge_type is set to `spawned` and parent_id references the parent session.
- A child session can be merged back into its parent via the merge flow (F-006).
- Discarding a child session removes its delta without affecting the parent.
- If the parent session is terminated while children are active, the user is warned and can choose to: reparent children to the workspace root, merge children first, or force-kill all.

**Technical Dependencies:**
- F-002 (Session creation with COW)
- Filesystem Manager: support for stacked overlay mounts
- Session Manager: DAG parent-child tracking

**UX Notes:**
- Keyboard shortcut: Cmd+N to spawn child from focused session.
- Child sessions are indented under the parent in the sidebar with a vertical connector line.
- The child node's tooltip shows the full overlay stack (e.g., "base -> Session 1 delta -> this session delta").

---

### F-004: Session Tree Sidebar UI

**Priority:** P0
**Phase:** 1 -- Foundation

**Description:**
A left sidebar displays all workspaces and their session trees in a hierarchical, collapsible view. Each node shows the session name, status indicator, type icon, and (when code state isolation is active) the delta summary. The sidebar is the primary navigation surface for switching between sessions and workspaces.

**User Value:**
Replaces the "many tabs" cognitive overload with a structured, task-oriented view. Users can see at a glance which agents are active, which are waiting, and how sessions relate to each other.

**Acceptance Criteria:**
- The sidebar is visible by default on the left side of the application, occupying approximately 200-250px width.
- The sidebar can be toggled (shown/hidden) via a keyboard shortcut or button.
- Workspaces are shown as top-level collapsible groups, sorted by most recent activity.
- Within each workspace, sessions are displayed as a tree reflecting parent-child relationships.
- Each session node displays: status indicator icon (color-coded), session name, type badge (shell/agent/process), and time since last activity.
- When code state isolation is active (Phase 4+), each COW session also shows delta summary (e.g., "delta: 3 files, 12KB").
- Clicking a session node focuses that session's terminal pane and brings it to the foreground.
- Right-clicking a session node opens a context menu with: Spawn child session, Rename, Kill, Merge to parent, Merge to workspace, Archive, Show in graph view.
- Right-clicking a workspace header opens a context menu with: New session, Rename, Archive, Ship workspace, Show graph view.
- Collapsed workspaces show an activity summary: "(N active, M idle)" or "(archived)".
- Keyboard navigation: arrow keys move between nodes, Enter focuses the selected session, Cmd+[ and Cmd+] navigate prev/next sibling.
- Drag-and-drop is supported for reordering sessions within a workspace (changes display order only, not DAG structure).
- The sidebar updates in real-time as session statuses change (no manual refresh).
- Sessions whose processes have exited with non-zero are highlighted with a red accent.
- Sessions waiting for user input pulse with a yellow accent.

**Technical Dependencies:**
- Session Manager (Rust backend): provides session tree data
- Tauri IPC: real-time events for session state changes
- SolidJS reactive UI

**UX Notes:**
- Status indicators use the following visual language: green filled circle = active, blue open circle = idle, yellow dotted circle = waiting, red X = failed, grey checkmark = completed, dimmed text = archived.
- When the user has many workspaces, a search/filter input at the top of the sidebar allows filtering by workspace or session name.
- Double-clicking a workspace name makes it editable inline.

---

### F-005: Real-Time Conflict Detection

**Priority:** P0
**Phase:** 4 -- Code State Isolation

**Description:**
Because Ocean controls the filesystem layer, it can detect in real-time when two sibling sessions modify the same file -- before any merge, before any commit. The system watches all active session deltas, computes line-range overlaps, and categorizes conflicts by severity: disjoint (same file, different regions), overlapping (same file, overlapping lines), or conflicting (same lines, incompatible changes).

**User Value:**
This is the killer feature that is impossible with git-based workflows. Users are alerted the moment two agents start stepping on each other, not hours later during a merge. They can pause an agent, merge early, or let both continue with full awareness.

**Acceptance Criteria:**
- When a session writes to a file that another sibling session has also modified, a conflict alert is emitted within 2 seconds of the write.
- Conflict severity is classified as one of: `disjoint`, `overlapping`, or `conflicting`.
  - Disjoint: same file, non-overlapping line ranges. Displayed as an informational notification.
  - Overlapping: same file, overlapping line ranges but potentially auto-mergeable. Displayed as a warning notification.
  - Conflicting: same lines with incompatible changes. Displayed as an urgent alert requiring user action.
- The conflict alert notification includes: the file path, the two (or more) sessions involved, the line ranges each session has modified, and the overlap region.
- The alert provides actionable buttons: "Pause Agent [N]", "Let Both Continue", "Merge Now", "Show Both Diffs Side-by-Side".
- Conflict data is stored in a ConflictWatch record: file_path, sessions list, overlap_ranges, severity, detected_at, resolved flag, and resolution method.
- The session sidebar shows a conflict badge (e.g., a warning icon) on sessions that have active conflicts.
- The graph view (F-007) highlights edges between conflicting sessions with a red accent.
- Conflict detection works for all COW sessions within the same workspace. Sessions in different workspaces are not compared.
- The ConflictDetector registers each session on creation and processes file write events via the filesystem watcher (kqueue on macOS, inotify on Linux).
- When a conflict is resolved (via merge, discard, or manual choice), the ConflictWatch record is updated and the visual indicators clear.
- Performance: conflict checking for a write event completes in under 10ms even with 20 active sessions in the workspace.

**Technical Dependencies:**
- F-002 (COW filesystem layer providing per-session delta tracking)
- Filesystem watcher (kqueue/inotify) integrated into Filesystem Manager
- ConflictDetector component in Rust backend
- Notification system in frontend

**UX Notes:**
- Disjoint conflicts appear as a subtle blue info badge -- not intrusive.
- Overlapping conflicts appear as an amber warning badge with a dismissable notification toast.
- Conflicting (urgent) alerts appear as a modal or prominent panel that requires acknowledgment; the user must choose an action.
- The "Show Both Diffs Side-by-Side" action opens a split diff view showing the two sessions' changes to the file.

---

### F-006: Session Merge Flow

**Priority:** P0
**Phase:** 4 -- Code State Isolation

**Description:**
When a session completes its work (or the user triggers a merge manually), its delta is applied to a target -- either its parent session or the workspace's merged state. The merge flow presents a review panel showing all changed files, diffs, and any conflicts that need resolution before the delta is applied.

**User Value:**
Provides a controlled, reviewable process for incorporating an agent's work. Unlike git merge which operates at the text level, Ocean's merge is task-aware: it shows which agent made which change and why, enabling informed decisions about what to keep.

**Acceptance Criteria:**
- A merge can be initiated from: the session context menu ("Merge to parent" or "Merge to workspace"), a button in the session detail panel, or automatically when a session's process exits with code 0 (configurable: auto-merge on success, or always prompt).
- The merge panel displays: a list of all modified/created/deleted files in the session's delta, a diff viewer for each file, and any conflicts with other sessions.
- For clean merges (no conflicts): the user can review and confirm with a single "Apply" action, or enable auto-merge to skip the review.
- For merges with conflicts: the panel shows a three-way diff (base, source session, target) and the user must resolve each conflicting file before proceeding.
- Resolution options for each conflicting file: accept source (this session), accept target (parent/workspace), manual edit, or defer (skip this file).
- After a successful merge, the session's delta is applied to the target's filesystem state. The session's SessionState record is updated: merged_to_parent = true, merged_at = timestamp.
- The session's delta directory is cleaned up after merge (or retained based on a "keep history" setting).
- Merge operations are atomic: if the merge fails partway, no partial changes are applied to the target.
- The merge panel shows delta statistics: number of files changed, lines added/removed, total delta size.
- If the session being merged has active child sessions, the user is warned that merging will change the base state for those children.

**Technical Dependencies:**
- F-002 (COW filesystem)
- F-005 (Conflict detection, to show conflicts in the merge panel)
- Diff rendering component (SolidJS)
- Filesystem Manager: merge_deltas operation

**UX Notes:**
- The merge panel slides in from the right side of the terminal area, replacing the detail panel temporarily.
- Files are listed with colored status indicators: green (added), yellow (modified), red (deleted).
- The diff viewer supports unified and side-by-side modes, toggled with a button.
- After merge completes, a brief success toast appears and the session node in the sidebar shows a grey checkmark.

---

### F-007: Graph View (DAG Visualization)

**Priority:** P1
**Phase:** 4 -- Code State Isolation

**Description:**
A full-screen or overlay view that renders the complete Session DAG as a visual directed acyclic graph. Workspace nodes sit at the top; session nodes branch downward. Edges show the relationship type (spawned, linked, depends). Nodes display status indicators, delta sizes, and conflict markers.

**User Value:**
Provides a bird's-eye view of all active work -- essential when orchestrating multiple agents across multiple tasks. Users can see the entire state of their development session at a glance, identify bottlenecks, and navigate directly to any session.

**Acceptance Criteria:**
- The graph view is toggled via Cmd+Shift+G or from the command palette.
- The graph view replaces the main terminal area (full-width) when active; the status bar and sidebar remain visible.
- Workspace nodes are rendered at the top of each graph cluster with a distinct visual style (larger, bordered).
- Session nodes display: name, status indicator, type icon, delta size (if COW), and time since last activity.
- Edges between nodes are visually distinct by type: solid line for `spawned`, dashed line for `linked`, double line for `depends`.
- Conflicting sessions are connected by a red highlighted edge with a warning icon at the midpoint.
- Clicking a node in the graph view focuses that session (switches back to terminal view with that session active).
- Right-clicking a node opens the same context menu as the sidebar.
- The graph auto-layouts using a top-down DAG layout algorithm (e.g., Dagre or similar). Manual node repositioning is supported but not required for V1.
- The graph updates in real-time as sessions are created, terminated, or change status.
- Multiple workspaces are shown as separate disconnected subgraphs within the same view.
- A legend is displayed in a corner showing the meaning of node status indicators and edge types.
- The graph is pannable and zoomable (scroll to zoom, drag to pan).
- For workspaces with more than 20 sessions, the graph remains responsive (renders at 30fps or above).

**Technical Dependencies:**
- F-004 (Session tree data)
- F-005 (Conflict data for edge highlighting)
- DAG layout algorithm (Dagre.js or equivalent)
- SolidJS canvas/SVG rendering component

**UX Notes:**
- Keyboard shortcut: Cmd+Shift+G to toggle.
- Pressing Escape exits graph view and returns to the previously focused terminal.
- Hovering a node shows a tooltip with full session details (PID, uptime, delta file list).
- The graph uses the same color palette as the sidebar status indicators for consistency.

---

### F-008: Auto-Detection of Child Processes

**Priority:** P1
**Phase:** 4 -- Code State Isolation

**Description:**
Ocean periodically scans the process tree under each session's PID to detect newly spawned child processes. When a child process matches known patterns (e.g., a Claude Code sub-agent, a node process, a flutter run), Ocean automatically creates a child session in the DAG, optionally with its own COW layer. For non-agent processes like dev servers, a `shared` (read-only) session is created instead.

**User Value:**
Eliminates manual session setup when agents spawn sub-tasks. The user's session DAG stays accurate and complete without any intervention, reflecting the actual process hierarchy.

**Acceptance Criteria:**
- Every 2 seconds, the Process Monitor scans the process tree under each active session's root PID using sysinfo/libproc.
- New child processes are detected and compared against a configurable pattern list (process name, command-line arguments).
- Known agent patterns (claude, aider, copilot, cursor-agent) trigger automatic creation of a `cow` child session with a stacked overlay.
- Known service patterns (node, python, flutter, java, go -- without agent indicators) trigger creation of a `shared` child session (read-only).
- Unknown processes are logged but do not create sessions by default. A user preference controls whether unknown children are auto-tracked.
- Auto-created sessions appear in the sidebar and graph view immediately, with an "auto-detected" badge.
- Auto-created sessions inherit the parent session's workspace.
- Listening port detection: if a child process opens a listening port, the port is recorded in the session metadata and used for connector linking (F-025).
- The auto-detection can be disabled per-workspace or per-session via settings.
- When an auto-detected child process exits, its session transitions to `completed` or `failed` based on exit code.

**Technical Dependencies:**
- F-002 (Session creation with COW)
- Process Monitor component (sysinfo crate, platform-specific process tree scanning)
- Session Manager: create_session API

**UX Notes:**
- Auto-detected sessions show a small "auto" badge in the sidebar to distinguish them from manually created sessions.
- A notification toast appears when a new child is auto-detected: "New child process detected: [name]. Session created."
- The user can convert an auto-detected session between fs_modes (e.g., promote a shared session to cow) via the context menu.

---

### F-009: Session Lifecycle States

**Priority:** P0
**Phase:** 2 -- Ambient Awareness

**Description:**
Each session transitions through well-defined lifecycle states: active, idle, waiting, failed, completed, and archived. State transitions are detected automatically based on process output activity, exit codes, and user actions. Each state has a distinct visual indicator, and transitions trigger notifications for background sessions.

**User Value:**
Reduces cognitive load by making it immediately obvious which sessions need attention (waiting, failed) versus which are fine (active, idle, completed). Users do not need to manually check each session.

**Acceptance Criteria:**
- Sessions support the following states: `active`, `idle`, `waiting`, `failed`, `completed`, `archived`.
- State transitions are automatic:
  - `active`: the session's process has produced output within the last 30 seconds (configurable threshold).
  - `idle`: the session's process is running but has not produced output for more than 30 seconds.
  - `waiting`: the session's process is running and has emitted a known "waiting for input" pattern (e.g., a prompt, a y/n question, an approval request). Detection uses configurable regex patterns.
  - `failed`: the session's process exited with a non-zero exit code.
  - `completed`: the session's process exited with exit code 0.
  - `archived`: the user has manually archived the session or workspace.
- Each state has a distinct visual indicator in the sidebar and graph view:
  - Active: green filled circle, bright text, optional streaming indicator
  - Idle: blue open circle, normal text
  - Waiting: yellow dotted circle, pulsing animation
  - Failed: red X, error badge
  - Completed: grey checkmark
  - Archived: dimmed text, collapsed by default
- When a background session transitions to `waiting`, a system notification is emitted: "[Session name] needs input".
- When a background session transitions to `failed`, a system notification is emitted with the last N lines of output or the error summary.
- When all sessions in a workspace reach `completed`, a notification is emitted: "Workspace [name] -- all tasks done".
- State history is recorded per session (timestamps of each transition) for debugging and metrics.
- The user can manually override a state (e.g., mark a session as archived even if its process is still running -- the process is killed first).

**Technical Dependencies:**
- PTY output monitoring (to detect active vs idle vs waiting)
- Process exit code monitoring
- Session Manager: state transition logic
- System notification integration (macOS Notification Center)

**UX Notes:**
- The status indicator is the leftmost element in each session sidebar node -- always visible at a glance.
- A session in the `waiting` state has a subtle pulsing animation to draw attention without being distracting.
- Hovering over the status indicator shows a tooltip: "Active -- last output 5s ago" or "Waiting -- prompt detected at line 142".

---

## B. Interactive Terminal Output

Terminal output becomes a rich, interactive surface. Ocean parses output in real-time and annotates actionable elements with clickable overlays.

---

### F-010: File Path Detection and Actions

**Priority:** P0
**Phase:** 3 -- Interactive Output

**Description:**
Ocean's output annotator detects file paths in terminal output using pattern matching (absolute paths, relative paths, and paths with line:column suffixes). Detected paths are rendered as underlined, clickable links. Clicking opens the file in the user's configured editor at the specified line and column.

**User Value:**
Eliminates the tedious copy-paste-open workflow. When a compiler error shows `src/auth/login.dart:42:15`, one click opens the file at exactly that location.

**Acceptance Criteria:**
- The annotator detects absolute file paths (e.g., `/Users/foo/bar.ts`), relative file paths (e.g., `./src/auth.ts`, `src/auth.ts`), and paths with line:column suffixes (e.g., `file.ts:42`, `file.ts:42:15`).
- Detected paths are visually distinguished: underlined text with a subtle color change (not altering the terminal's own coloring).
- Hovering over a detected file path shows a tooltip with: full resolved path, file size, last modified time, and git status of the file (modified/staged/untracked) if applicable.
- Clicking a detected file path opens it in the user's configured editor (configurable: VS Code, Vim, Emacs, or system default). If a line number is present, the editor opens at that line.
- Cmd+Click copies the full resolved path to the clipboard.
- Right-click opens a context menu with actions: "Open in Editor", "Open in Finder/File Manager", "Copy Path", "Copy Path with Line", "Show Git Blame", "Ask Agent to Fix" (if the path is in an error context).
- Relative paths are resolved against the session's CWD.
- Paths that do not resolve to an existing file are not annotated (no false positives on random text that looks like a path).
- The annotator processes each line of output in under 1ms.
- Annotations persist in the scrollback buffer -- scrolling up to old output still shows clickable paths.
- File paths within ANSI-colored output are correctly detected (the annotator strips ANSI codes before matching, but the rendered link preserves the original coloring).

**Technical Dependencies:**
- Output Annotator engine (Rust backend, F-035 terminal rendering provides the output stream)
- Annotation Overlay renderer (SolidJS component overlaid on xterm.js)
- Editor integration (configurable `$EDITOR` or VS Code `code --goto` command)

**UX Notes:**
- File path links use a dotted underline to distinguish them from terminal-native underlines.
- The hover tooltip appears after 300ms delay to avoid flickering during fast mouse movement.
- The default click action (open in editor) is configurable in Ocean settings.

---

### F-011: URL Detection and Actions

**Priority:** P0
**Phase:** 3 -- Interactive Output

**Description:**
Ocean detects URLs (http, https, localhost references, IP:port combinations) in terminal output and renders them as clickable links. Clicking opens the URL in the system default browser. URLs that point to known development tools (Flutter DevTools, Chrome DevTools, webpack dev server) offer additional context-specific actions.

**User Value:**
Development workflows constantly emit URLs -- dev server addresses, documentation links, debug tool URLs. Making them instantly clickable saves time and reduces errors from manual copy-paste.

**Acceptance Criteria:**
- The annotator detects: `http://` and `https://` URLs, `localhost:PORT` references, `127.0.0.1:PORT` references, and `0.0.0.0:PORT` references.
- Detected URLs are rendered with a dotted underline and a subtle link color.
- Clicking a URL opens it in the system default browser.
- Cmd+Click copies the URL to the clipboard.
- Right-click opens a context menu: "Open in Browser", "Copy URL", "Inline Preview" (for supported content types), "Health Check" (pings the URL and shows status).
- For known development tool URLs (Flutter DevTools at port 9100, Chrome DevTools, webpack dev server), the context menu includes additional actions: "Connect DevTools Panel" (if connector feature is available), "Open in Embedded Browser" (P2, future).
- URL detection handles URLs with query parameters, fragments, and encoded characters correctly.
- URLs that span multiple lines (due to line wrapping) are not detected to avoid false positives. Single-line URLs up to 2000 characters are supported.
- Hovering over a URL shows a tooltip with the full URL (useful when truncated in output) and, for localhost URLs, whether the port is currently listening.

**Technical Dependencies:**
- Output Annotator engine (Rust backend)
- Annotation Overlay renderer (SolidJS)
- System browser launch command (platform-specific: `open` on macOS, `xdg-open` on Linux)

**UX Notes:**
- URLs use a distinct color from file paths (e.g., file paths use the editor theme's link color; URLs use a blue tint).
- The "Health Check" action in the context menu shows a small inline badge: green checkmark if the URL responds with 2xx, red X otherwise.

---

### F-012: Error / Stack Trace Detection and Actions

**Priority:** P0
**Phase:** 3 -- Interactive Output

**Description:**
Ocean detects compiler errors, runtime exceptions, and stack traces across multiple languages using language-specific regex patterns. Detected errors are highlighted with a colored background and offer actions including opening the source file at the error line and requesting an AI agent to fix the issue.

**User Value:**
Error output is the most actionable content in a terminal. Being able to click directly on an error to open the file or hand it to an AI agent collapses what is normally a multi-step workflow into a single click.

**Acceptance Criteria:**
- The annotator detects error patterns for at least the following languages/tools: TypeScript/JavaScript (tsc, node), Dart/Flutter, Python, Rust (rustc, cargo), Go, Java/Kotlin, C/C++ (gcc, clang), and generic patterns (e.g., "Error:", "FAILED", "Exception").
- Stack trace frames (e.g., `at functionName (file.ts:42:15)`, `File "foo.py", line 42`, `#0 main (file.dart:42)`) are detected and each frame's file reference is individually clickable.
- Detected errors are highlighted with a subtle red/orange background tint on the error lines.
- A floating action bar appears near the error with buttons: "Open File", "Ask Agent to Fix", "Copy Error".
- "Open File" opens the file at the error's line and column in the configured editor.
- "Ask Agent to Fix" sends the error text (including surrounding context lines) to the active agent session in the workspace. If no agent is active, it offers to create one.
- "Copy Error" copies the full error block (all consecutive error/stack trace lines) to the clipboard.
- Multi-line errors and stack traces are grouped as a single annotation block; clicking the action bar applies to the entire block.
- Error detection does not produce false positives on the word "error" in normal prose (the patterns require structural markers like file:line, indented stack frames, or compiler-specific prefixes).
- The error annotation is visually distinct from file path and URL annotations.

**Technical Dependencies:**
- Output Annotator engine (Rust backend, with language-specific regex patterns)
- Annotation Overlay renderer (SolidJS)
- Editor integration (same as F-010)
- Agent communication channel (for "Ask Agent to Fix" -- send text to agent session's stdin or A2UI side-channel)

**UX Notes:**
- The floating action bar appears to the right of the error block, outside the terminal text area, to avoid obscuring output.
- The error highlight uses a translucent red background that does not interfere with the terminal's own ANSI colors.
- Errors from the most recent command are prioritized visually (brighter highlight) over errors from earlier in the scrollback.

---

### F-013: Git Ref Detection

**Priority:** P1
**Phase:** 3 -- Interactive Output

**Description:**
Ocean detects git references in terminal output: commit hashes (full and abbreviated), branch names (in known patterns like `origin/main`), and tag references. Detected refs are clickable and offer actions such as showing the diff, checking out the ref, or copying the hash.

**User Value:**
When reviewing git log output, cherry-pick suggestions, or CI messages that reference commits, users can act on those references directly without switching to another tool.

**Acceptance Criteria:**
- The annotator detects: full 40-character commit hashes, abbreviated commit hashes (7+ hex characters in a git-context line), branch names in patterns like `origin/feature-x` or `refs/heads/main`, and tag references like `v1.2.3`.
- Detected refs are rendered with a dotted underline.
- Clicking a commit hash opens a diff view (either inline or in a panel) showing the commit's changes.
- Right-click context menu: "Show Diff", "Checkout", "Cherry-pick", "Copy Hash", "Open on GitHub" (if remote is configured).
- Branch name clicks show the branch's latest commit and ahead/behind status relative to the current branch.
- False positive mitigation: 7-character hex strings are only annotated if they appear in a context that suggests git output (e.g., preceded by "commit", in a log-formatted line, or within output of a known git command).
- The annotator uses git2-rs to validate that a detected hash actually exists in the repository before annotating it.

**Technical Dependencies:**
- Output Annotator engine (Rust backend)
- Git integration (git2-rs) for ref validation and diff retrieval
- Annotation Overlay renderer (SolidJS)
- Diff viewer component (shared with F-006 merge flow)

**UX Notes:**
- Git refs use a distinct visual style: monospace font with a subtle border/badge appearance.
- "Open on GitHub" is only shown when the repository has a GitHub remote configured.

---

### F-014: Context Menus on Annotations

**Priority:** P0
**Phase:** 3 -- Interactive Output

**Description:**
Every annotation type (file path, URL, error, git ref) supports a right-click context menu that presents all available actions for that annotation. The context menu is consistent in structure but adapts its content based on the annotation type and available integrations.

**User Value:**
Provides a discoverable, consistent way to access all actions for any interactive element in terminal output. Users do not need to memorize different click behaviors -- right-click always reveals what is possible.

**Acceptance Criteria:**
- Right-clicking any annotated element in terminal output opens a context menu.
- The context menu renders within 100ms of the right-click event.
- Menu items are grouped by category: primary action at the top, then secondary actions, then clipboard actions at the bottom.
- Each menu item shows an icon, label, and keyboard shortcut (if one exists).
- The menu dismisses on: clicking outside, pressing Escape, or selecting an item.
- The menu positions itself to avoid overflowing the window bounds (flips direction if near edge).
- Menu content adapts by annotation type:
  - File path: Open in Editor, Open in Finder, Copy Path, Copy Path with Line, Show Git Blame, Ask Agent to Fix
  - URL: Open in Browser, Copy URL, Health Check
  - Error: Open File at Error, Ask Agent to Fix, Copy Error Block, Search Error Online
  - Git ref: Show Diff, Checkout, Cherry-pick, Copy Hash, Open on GitHub
- Menu items that are not applicable in the current context are hidden (not greyed out). For example, "Open on GitHub" does not appear if no GitHub remote is configured.
- The context menu is keyboard-navigable: arrow keys move between items, Enter selects, Escape dismisses.

**Technical Dependencies:**
- Annotation Overlay renderer (all annotation detection features must provide action definitions)
- SolidJS context menu component
- Platform integration for actions (editor launch, browser launch, clipboard)

**UX Notes:**
- The context menu uses the application's theme colors and matches the overall Ocean visual design.
- A subtle shadow and border distinguish the menu from the terminal background.
- The menu appears at the cursor position, offset slightly to avoid obscuring the annotation text.

---

### F-015: Hover Tooltips

**Priority:** P1
**Phase:** 3 -- Interactive Output

**Description:**
Hovering over any annotated element in terminal output shows a tooltip with contextual information. The tooltip content varies by annotation type: file paths show size/modified/git status, URLs show reachability status, errors show a summary, and git refs show commit metadata.

**User Value:**
Provides quick information without requiring a click or context menu. Users can scan terminal output and gather context just by moving the cursor.

**Acceptance Criteria:**
- Tooltips appear after a 300ms hover delay over any annotated element.
- Tooltips disappear when the cursor moves off the annotation or after 5 seconds of no cursor movement.
- Tooltip content by annotation type:
  - File path: full resolved path, file size, last modified timestamp, git status (modified/staged/untracked/clean).
  - URL: full URL, reachability status (checking.../reachable/unreachable), response time in ms.
  - Error: error type/code, affected file and line, a one-line summary.
  - Git ref: commit hash (full), author, date, first line of commit message.
- Tooltips render as a floating card with a small arrow pointing to the annotation.
- Tooltip content that requires async data (URL reachability, git commit info) shows a loading indicator while fetching.
- Tooltips do not block terminal input; the user can continue typing while a tooltip is visible.
- Tooltips are dismissable by pressing Escape.
- The tooltip never overflows the application window; it repositions as needed.

**Technical Dependencies:**
- Annotation data from F-010 through F-013
- Git integration (git2-rs) for commit metadata
- Network health check (async HTTP HEAD request for URLs)
- SolidJS tooltip component

**UX Notes:**
- Tooltips use a semi-transparent dark background with light text, consistent with the terminal aesthetic.
- The tooltip is compact: maximum 3-4 lines of content.
- Multiple tooltips cannot be shown simultaneously; hovering a new annotation replaces the previous tooltip.

---

## C. Ambient Awareness (Status Bar)

A persistent bar showing system state, git status, and agent health at a glance. Information is always visible, never requiring the user to run a command.

---

### F-016: System Metrics (RAM, CPU, Battery)

**Priority:** P0
**Phase:** 2 -- Ambient Awareness

**Description:**
The status bar displays real-time system metrics: RAM usage with a visual bar, CPU usage with a visual bar, and battery level (on laptops). Metrics are collected by a Rust backend service using the sysinfo crate and pushed to the frontend at regular intervals.

**User Value:**
When running multiple agents, build servers, and dev tools simultaneously, system resources can become a bottleneck. Always-visible metrics let users spot resource pressure before it causes slowdowns or OOM kills.

**Acceptance Criteria:**
- The status bar shows RAM usage as: "[used]/[total] GB" with a proportional bar graphic (e.g., "8.2/16GB" with a filled/empty bar).
- The status bar shows CPU usage as a percentage with a proportional bar graphic (e.g., "34%").
- On laptops, battery level is shown with a percentage and a visual indicator. When charging, a charging icon is displayed. Below 20%, the indicator turns red.
- Metrics update every 2 seconds. The update does not cause visible flicker or layout shift.
- RAM and CPU bars use color gradients: green (0-60%), yellow (60-80%), red (80-100%).
- The metrics collector runs in a background Rust thread and sends updates to the frontend via Tauri events.
- The metrics display occupies minimal horizontal space (approximately 200-250px for all three metrics).
- If the system is under heavy load (CPU > 90% or RAM > 90%), the relevant metric pulses or uses a brighter red to draw attention.

**Technical Dependencies:**
- sysinfo crate (Rust) for cross-platform metric collection
- Tauri event system for backend-to-frontend metric streaming
- SolidJS status bar component

**UX Notes:**
- The bars are thin (approximately 4-6px height) and integrated into the text line of the status bar.
- Numbers use a monospace font to prevent layout jitter as digits change.
- Click-to-expand detail is covered by F-020.

---

### F-017: Network Status Indicator

**Priority:** P1
**Phase:** 2 -- Ambient Awareness

**Description:**
The status bar displays the current network connection status: connection type (WiFi/Ethernet/none), signal quality, and latency to key development endpoints (GitHub, npm registry). The indicator updates every 5 seconds and provides event-based updates when the connection state changes.

**User Value:**
Network issues silently cause git push failures, npm install timeouts, and agent API call errors. Ambient network status lets users diagnose connectivity problems immediately rather than debugging mysterious command failures.

**Acceptance Criteria:**
- The status bar shows a network indicator with: connection type icon (WiFi/Ethernet/none), and a signal quality indicator (strong/medium/weak/disconnected).
- When connected, the indicator shows the connection type (e.g., "WiFi 5G" or "Ethernet").
- When disconnected, the indicator shows "Offline" with a red icon.
- Latency to at least two endpoints (github.com, registry.npmjs.org) is checked every 5 seconds via lightweight HTTP HEAD or ICMP ping.
- If latency to a key endpoint exceeds 500ms, the indicator shows a yellow warning.
- If a key endpoint is unreachable, the indicator shows which endpoint is down.
- The network monitor uses event-based detection for connection state changes (macOS: System Configuration framework or NWPathMonitor) in addition to polling.
- The indicator occupies approximately 60-80px in the status bar.

**Technical Dependencies:**
- Custom Rust network monitor (socket checks, ICMP or HTTP HEAD pings)
- Platform-specific network event listeners (macOS: NWPathMonitor, Linux: netlink)
- Tauri event system
- SolidJS status bar component

**UX Notes:**
- The network indicator is the leftmost item in the status bar.
- A filled WiFi icon means strong signal; partially filled means medium; outline means weak.
- Click-to-expand detail is covered by F-020.

---

### F-018: Git Status Badge

**Priority:** P0
**Phase:** 2 -- Ambient Awareness

**Description:**
The status bar displays a compact git status badge showing: current branch name, ahead/behind counts relative to the upstream, staged/modified/untracked file counts, CI pipeline status, and PR status if the branch has an open pull request. The badge updates on filesystem changes and on a periodic fallback.

**User Value:**
Eliminates the need to run `git status`, `git log`, or check GitHub for CI/PR status. The git state is always visible, always current. This is "Ambient Git" -- the developer always knows where they stand.

**Acceptance Criteria:**
- The badge shows the current branch name, truncated to 20 characters with an ellipsis if longer.
- The branch name is color-coded: green = clean working tree, yellow = uncommitted changes, red = merge conflicts.
- Ahead/behind counts relative to upstream are shown as arrows: "up-arrow 2" (2 commits ahead), "down-arrow 3" (3 behind). If no upstream is configured, this section is hidden.
- File counts are shown with symbols: "+" for staged, "~" for modified, "?" for untracked. Example: "+3 ~1 ?2".
- CI status is fetched from GitHub API (using gh CLI or GitHub REST API) and shown as: green circle (passing), yellow circle (pending), red circle (failed), grey circle (no CI configured).
- PR status is shown if the current branch has an open PR: "PR#47" with the PR number, and a brief status (e.g., "2 approvals", "changes requested", "merge conflicts").
- Git status updates are triggered by filesystem watch events (fsnotify on the .git directory and working tree) with a 10-second polling fallback.
- CI and PR status are fetched every 60 seconds (API rate limits) or on manual refresh.
- The badge occupies approximately 150-200px in the status bar.
- If the current directory is not a git repository, the git badge is hidden.

**Technical Dependencies:**
- git2-rs (Rust bindings to libgit2) for local git status
- Filesystem watcher (fsnotify) for change detection
- GitHub API (via gh CLI or REST) for CI and PR status
- Tauri event system
- SolidJS status bar component

**UX Notes:**
- The git badge is positioned in the right portion of the status bar for visual balance.
- Clicking the git badge toggles the full Git Panel (Cmd+G), which is a separate detail panel.
- The branch name uses a monospace font for readability.

---

### F-019: Agent Status Row

**Priority:** P0
**Phase:** 2 -- Ambient Awareness

**Description:**
A secondary row in the status bar (or a section of the primary row) displays the status of all active agent sessions. Each agent shows its name and a status indicator (active, idle, waiting, error, done). The row provides at-a-glance visibility into what all agents are doing without switching to their sessions.

**User Value:**
When multiple agents are running in parallel, this row is the "mission control" that tells the user which agents need attention. A pulsing "waiting" indicator means an agent needs approval; a red "error" means something broke.

**Acceptance Criteria:**
- The agent status row shows one entry per agent-type session across all active workspaces.
- Each entry displays: agent name (truncated to 12 characters), status indicator icon (matching the session lifecycle states from F-009).
- Entries are ordered by: waiting/error first (needs attention), then active, then idle, then completed.
- The row updates in real-time as agent states change (via the same process monitoring that drives F-009).
- Clicking an agent entry focuses that agent's session (switches to its terminal pane and highlights it in the sidebar).
- If there are more than 5 agents, the row shows the first 5 and a "+N more" indicator. Clicking "+N more" expands to show all.
- Agent heartbeats: an agent is considered active if it has produced output within the last 30 seconds. The indicator for an active agent shows a subtle animation (e.g., a slow pulse) to convey liveness.
- If no agents are running, the agent status row is hidden to save space.
- The row is visually separated from the system metrics row by a subtle divider or background color difference.

**Technical Dependencies:**
- F-009 (Session lifecycle states)
- Session Manager: filter sessions by type=agent
- Tauri event system for real-time updates
- SolidJS status bar component

**UX Notes:**
- Status indicators use the same visual language as the sidebar: green filled circle, blue open circle, yellow dotted circle, red X, grey checkmark.
- The agent row is the second row of the status bar, below the system metrics row.
- Keyboard shortcut Cmd+Shift+A focuses the agent status row and allows arrow-key navigation between agents, with Enter to focus the selected agent's session.

---

### F-020: Click-to-Expand Details for Each Status Section

**Priority:** P1
**Phase:** 2 -- Ambient Awareness

**Description:**
Each section of the status bar (system metrics, network, git, agents) is clickable and expands into a detail panel that provides more granular information. The detail panel appears as a dropdown below the status bar section that was clicked.

**User Value:**
Progressive disclosure: the status bar shows the summary; clicking reveals the full picture. Users get ambient awareness by default and detailed diagnostics on demand, without leaving the terminal.

**Acceptance Criteria:**
- Clicking the system metrics section expands a panel showing: per-process CPU and RAM breakdown (top 10 processes by resource usage), swap usage, disk usage for the workspace directory, and system uptime.
- Clicking the network section expands a panel showing: connection type and interface, IP address, DNS servers, latency to each monitored endpoint (GitHub, npm, Docker Hub) with historical sparkline (last 5 minutes), and packet loss percentage.
- Clicking the git section expands the full Git Panel (shared with Cmd+G): branch info, staged/modified/untracked file lists with diff/stage/unstage/revert actions, recent commits, and PR/CI details.
- Clicking an agent in the agent row focuses that agent's session (does not open a panel; this behavior is intentional).
- Only one detail panel can be open at a time. Clicking a different section closes the current panel and opens the new one.
- The detail panel dismisses when: clicking outside it, pressing Escape, or clicking the same status bar section again (toggle).
- The detail panel is overlaid on top of the terminal area and does not shift the terminal layout.
- Each detail panel loads its data lazily (not pre-fetched) and shows a loading indicator for the first 200ms.

**Technical Dependencies:**
- F-016 (System metrics data)
- F-017 (Network status data)
- F-018 (Git status data)
- Process metrics from sysinfo crate (per-process breakdown)
- SolidJS dropdown panel component

**UX Notes:**
- The detail panel has a dark background matching the status bar, with a subtle drop shadow to distinguish it from the terminal area.
- The panel appears directly below the clicked section, aligned to the section's left edge.
- The panel is scrollable if content exceeds the available height (max height: 60% of window height).

---

## D. A2UI Integration

Ocean natively renders A2UI (Agent-to-UI) components inline in terminal output. When an AI agent wants to show a form, table, or interactive widget, it emits A2UI JSON via a special escape sequence and Ocean renders it as a native component.

---

### F-021: A2UI Escape Sequence Parser

**Priority:** P0
**Phase:** 6 -- A2UI and Connectors

**Description:**
Ocean's terminal output parser recognizes A2UI escape sequences embedded in the terminal byte stream. The escape sequence format is `\x1b]ocean;a2ui;<json>\x07`. When detected, the JSON payload is extracted, validated against the A2UI schema, and forwarded to the component renderer. The parser must handle partial sequences (data arriving in chunks) and malformed sequences gracefully.

**User Value:**
This is the protocol layer that enables agents to render rich UI in the terminal. Without a robust parser, agents cannot communicate their UI intentions to Ocean.

**Acceptance Criteria:**
- The parser detects the escape sequence `\x1b]ocean;a2ui;<json>\x07` (OSC sequence with "ocean;a2ui;" prefix, terminated by ST=\x07).
- Also supports the two-byte ST terminator `\x1b\\` as an alternative to `\x07`.
- The parser handles partial delivery: if the escape sequence spans multiple PTY read chunks, it buffers the partial data and assembles the complete sequence before processing.
- Incomplete sequences that remain unterminated for more than 5 seconds are discarded (timeout to prevent unbounded buffering).
- Malformed JSON within a valid escape sequence wrapper is logged as a warning and does not crash the parser or corrupt the terminal output stream.
- Valid JSON is validated against the A2UI schema. Components with unknown types are logged but do not cause errors; they are rendered as a fallback "unsupported component" placeholder.
- The parser does not interfere with standard ANSI escape sequences, xterm OSC sequences, or Kitty graphics protocol sequences. Only the `ocean;a2ui;` prefix triggers A2UI handling.
- The parser operates in the Rust backend, on the same thread (or a dedicated parser thread) as the PTY output stream. Parsed A2UI events are emitted to the frontend via Tauri events.
- The parser supports nested A2UI sequences (an agent can emit multiple components in a single output burst).
- Performance: parsing overhead is less than 0.5ms per A2UI sequence for payloads up to 100KB.
- A2UI sequences are stripped from the raw terminal output so they do not appear as garbled text in the terminal buffer.

**Technical Dependencies:**
- PTY management (F-036): access to the raw output byte stream before it reaches xterm.js
- Tauri event system for forwarding parsed components to the frontend
- A2UI schema definition (JSON Schema or equivalent)

**UX Notes:**
- This feature has no direct UX surface; it is the protocol layer consumed by F-022 (renderer).
- If an A2UI sequence is malformed, a subtle developer-facing log entry is created (visible in Ocean's debug console, not in the user's terminal).

---

### F-022: A2UI Component Renderer

**Priority:** P0
**Phase:** 6 -- A2UI and Connectors

**Description:**
The A2UI renderer takes parsed A2UI component JSON and renders native SolidJS components inline in the terminal output. Components are anchored to a specific line position in the terminal buffer and scroll with the output. The renderer supports the core A2UI component set: Table, Form, Button/ButtonGroup, Card/CardGroup, ProgressBar, Spinner, CodeBlock (with syntax highlighting), Diff viewer, and Tree (collapsible).

**User Value:**
Transforms the terminal from a text-only surface into a rich application canvas. Agents can show interactive tables, forms for user input, diff previews, and progress indicators -- all without the user leaving the terminal.

**Acceptance Criteria:**
- The renderer supports the following A2UI component types:
  - **Text/Heading/Paragraph**: rendered with appropriate typography (heading sizes, paragraph spacing).
  - **Button/ButtonGroup**: rendered as clickable buttons with hover and active states. Clicking a button sends the button's action payload back to the agent.
  - **Table**: rendered with columns, rows, headers. Supports sorting by column (click header) and horizontal scrolling if wider than the terminal pane.
  - **Form**: rendered with input fields (text, select, checkbox, radio). Submitting a form sends the form data back to the agent.
  - **Card/CardGroup**: rendered as bordered sections with a title, body, and optional action buttons.
  - **ProgressBar**: rendered as a horizontal bar with a percentage label. Supports indeterminate mode (animated).
  - **Spinner**: rendered as an animated loading indicator.
  - **CodeBlock**: rendered with syntax highlighting (language specified in props). Includes a "Copy" button.
  - **Diff**: rendered as an inline diff viewer with added/removed line highlighting.
  - **Tree**: rendered as a collapsible hierarchical list.
- Each component is anchored to the terminal line where the A2UI escape sequence was emitted. Components scroll with the terminal output.
- Components are rendered above the terminal text layer, in a transparent overlay container.
- Components are interactive: clicks, form inputs, and selections are captured by the component, not passed through to the terminal.
- Components can be collapsed/dismissed by the user (small "X" or collapse button on each component).
- Component state is tracked in the A2UIComponent data model: session_id, component_id, line_position, type, props, state (rendered/collapsed/dismissed).
- Dismissed components can be restored via a "Show dismissed components" action in the terminal context menu.
- Components respect the terminal's color theme (dark/light mode).
- Rendering a component with 100 table rows or 50 form fields completes in under 200ms.

**Technical Dependencies:**
- F-021 (A2UI escape sequence parser provides the parsed JSON)
- xterm.js overlay/decoration API for inline positioning
- SolidJS component library for each A2UI type
- Syntax highlighting library (e.g., Prism.js or Shiki) for CodeBlock

**UX Notes:**
- Components have a subtle border and background to distinguish them from terminal text.
- A small "A2UI" badge appears in the top-right corner of each component to indicate it was agent-generated.
- Components are resizable by dragging their bottom edge (especially useful for Table and Diff components).

---

### F-023: Ocean-Specific A2UI Extensions

**Priority:** P1
**Phase:** 6 -- A2UI and Connectors

**Description:**
Ocean extends the standard A2UI component set with Ocean-specific components that integrate deeply with Ocean's features: SessionLink (clickable link to another session), ProcessStatus (live status of a running process), and GitWidget (inline git status/diff viewer). These extensions are registered under the `ocean:` namespace.

**User Value:**
Allows agents to leverage Ocean's unique capabilities -- an agent can render a link to a sibling session, show the live status of a spawned process, or display an inline git diff, all within the conversational flow of the terminal.

**Acceptance Criteria:**
- **SessionLink**: renders as a styled link showing the target session's name and status indicator. Clicking navigates to that session (focuses its terminal pane). Props: session_id (required), label (optional, defaults to session name).
- **ProcessStatus**: renders a live-updating badge showing a process's name, PID, status (running/stopped/crashed), CPU%, and RAM usage. Updates every 3 seconds. Props: pid or session_id (required).
- **GitWidget**: renders an inline git status/diff viewer. Two modes:
  - Status mode: shows branch, ahead/behind, modified file list. Props: mode="status".
  - Diff mode: shows the diff for a specific file or commit. Props: mode="diff", file (optional), commit (optional).
- All Ocean extensions use the `ocean:` type prefix (e.g., `ocean:SessionLink`, `ocean:ProcessStatus`, `ocean:GitWidget`).
- Extensions that reference invalid session IDs or PIDs display a graceful "not found" state rather than crashing.
- Extensions update reactively: if the referenced session changes state or the process metrics change, the rendered component updates automatically.
- Non-Ocean terminals that receive Ocean extension escape sequences display a fallback text representation (the agent should provide a `fallback_text` field in the JSON).

**Technical Dependencies:**
- F-022 (A2UI component renderer -- extensions are additional component types)
- Session Manager (for SessionLink and ProcessStatus data)
- Git integration (git2-rs) for GitWidget
- Process metrics (sysinfo) for ProcessStatus

**UX Notes:**
- SessionLink renders inline with the text flow (like a hyperlink), not as a block component.
- ProcessStatus renders as a compact badge, similar to the agent status indicators in the status bar.
- GitWidget renders as a block component, similar to the git panel but embedded in the terminal output.

---

### F-024: Agent-to-A2UI Bidirectional Communication

**Priority:** P0
**Phase:** 6 -- A2UI and Connectors

**Description:**
When users interact with A2UI components (clicking buttons, submitting forms, selecting table rows), the interaction data must be sent back to the agent that rendered the component. Ocean supports two channels: stdin (the agent reads the response as a structured line on its standard input) and a WebSocket side-channel (for complex, asynchronous interactions).

**User Value:**
Without bidirectional communication, A2UI components are display-only. This feature closes the loop: agents can ask questions via forms, users can approve actions via buttons, and agents receive the responses to continue their work.

**Acceptance Criteria:**
- When a user interacts with an A2UI component (button click, form submit, etc.), the interaction generates a response payload: JSON with the component_id, action type, and user-provided data.
- The response is sent to the agent via the configured channel:
  - **stdin mode** (default): the response is written to the session's PTY stdin as a single JSON line, prefixed with a recognizable marker (e.g., `__OCEAN_A2UI_RESPONSE__:{...}\n`).
  - **WebSocket mode**: the response is sent over a per-session WebSocket. The WebSocket URL is communicated to the agent via an environment variable (`OCEAN_A2UI_WS`) set when the session starts.
- The agent can specify its preferred response channel in the A2UI component JSON (`response_channel: "stdin" | "websocket"`).
- Stdin responses do not interfere with the agent's normal stdin consumption. If the agent is not reading stdin, responses are queued (up to 100 items; older items are dropped with a warning).
- WebSocket connections are authenticated per-session using a token generated at session creation and passed via the environment variable.
- The WebSocket server runs on localhost only (no external exposure).
- Form submissions include all field values keyed by field name.
- Button clicks include the button's action identifier.
- Table row selections include the selected row data.
- If the target session has exited, the response is discarded and the user is shown a message: "Agent session has ended. Response not delivered."

**Technical Dependencies:**
- F-022 (A2UI component renderer triggers the response)
- PTY management (F-036) for stdin writing
- WebSocket server (Rust, e.g., tokio-tungstenite) for the side-channel
- Session Manager for session-to-channel mapping

**UX Notes:**
- When a response is sent via stdin, a brief flash or highlight on the component confirms delivery.
- When a response fails to deliver (session ended), the component shows a red "delivery failed" status.
- The response channel is invisible to the user; it is a protocol-level concern.

---

## E. Parallel Execution Connectors

Connectors visualize and manage relationships between parallel processes. They auto-detect known process relationships and provide unified monitoring and control.

---

### F-025: Connector Auto-Detection Engine

**Priority:** P1
**Phase:** 6 -- A2UI and Connectors

**Description:**
The connector engine automatically discovers relationships between running processes within a workspace. It uses port scanning, process tree analysis, and known heuristics (e.g., `flutter run` opens a Dart VM service URL; `node --inspect` opens a debug port) to link related sessions. Discovered relationships are displayed in the connector bar (F-029) and graph view (F-007).

**User Value:**
Modern development involves multiple interacting processes (app server, devtools, database, log watchers). Auto-detection means the user does not need to manually wire up these relationships -- Ocean understands the process constellation automatically.

**Acceptance Criteria:**
- The engine runs a detection pass every 5 seconds and on process creation/termination events.
- Detection heuristics include:
  - Port relationships: if process A listens on port X and process B connects to port X, they are linked.
  - Process tree: child processes of a session are candidates for linking.
  - Known patterns: `flutter run` output containing a VM service URL triggers linking to DevTools; `node --inspect=PORT` triggers linking to a Chrome DevTools session; `docker compose up` output containing container names triggers linking between containers.
- Discovered links create ConnectorGroup records in the data model with: id, workspace_id, name, connector_type, sessions list, and health status.
- The engine supports manual linking via `ocean connect <pid1> <pid2>` or right-click in the sidebar.
- The engine can be disabled per-workspace via settings.
- False positive links (e.g., two unrelated processes using the same port on different interfaces) can be dismissed by the user, and the engine remembers the dismissal.
- Health status for a connector group is computed as: `healthy` if all member processes are running, `degraded` if some are down, `down` if all are down.

**Technical Dependencies:**
- Process Monitor (sysinfo, libproc for process tree, netstat-equivalent for port mapping)
- Session Manager (for session-to-process mapping)
- ConnectorGroup data model in SQLite

**UX Notes:**
- Newly discovered connector groups appear in the connector bar with a brief "new" badge for 5 seconds.
- The user can rename auto-detected connector groups.

---

### F-026: Flutter Connector

**Priority:** P1
**Phase:** 6 -- A2UI and Connectors

**Description:**
A specialized connector for Flutter development workflows. Detects `flutter run` processes, parses the Dart VM service URL and Flutter DevTools URL from output, links to `adb` processes for Android device communication, and provides Flutter-specific actions (hot reload, hot restart, open DevTools).

**User Value:**
Flutter developers typically juggle the app process, DevTools, and device logs. The Flutter connector unifies these into a single managed group with one-click actions for common tasks.

**Acceptance Criteria:**
- Detects `flutter run` processes by command-line pattern matching.
- Parses the VM service URL (e.g., `http://127.0.0.1:8181/...`) from the session output and records it in the connector metadata.
- Parses the DevTools URL (e.g., `http://127.0.0.1:9100?uri=...`) and offers a "Connect DevTools" action.
- Detects associated `adb` processes (for Android) and links them to the connector group.
- Provides Flutter-specific actions in the connector bar and context menu: "Hot Reload" (sends 'r' to the flutter session stdin), "Hot Restart" (sends 'R'), "Open DevTools" (opens URL in browser), "Toggle Debug Paint" (sends 'p'), "Quit App" (sends 'q').
- Shows device information: device name, platform, and connection type (USB/WiFi).
- Health monitoring: alerts if the Flutter process crashes or the device disconnects.
- Multiple Flutter sessions (e.g., running on multiple devices) create separate connector groups.

**Technical Dependencies:**
- F-025 (Connector auto-detection engine)
- Output Annotator (for parsing VM service and DevTools URLs from output)
- PTY stdin writing (for hot reload/restart commands)

**UX Notes:**
- The Flutter connector group icon uses the Flutter logo (or a recognizable "F" icon).
- Hot Reload and Hot Restart are the most prominent actions (largest buttons or first in the action list).

---

### F-027: Node.js Connector

**Priority:** P1
**Phase:** 6 -- A2UI and Connectors

**Description:**
A specialized connector for Node.js development. Detects `node --inspect` and `node --inspect-brk` processes, links to Chrome DevTools debug sessions, and monitors the debug port for health.

**User Value:**
Node.js debugging involves connecting the inspector to Chrome DevTools or VS Code. The connector provides one-click access to the debug session and monitors the debug port health.

**Acceptance Criteria:**
- Detects Node.js processes started with `--inspect`, `--inspect-brk`, or `--inspect=PORT` flags.
- Parses the debug port from the command-line arguments or the "Debugger listening on ws://..." output.
- Creates a connector group linking the Node.js process session to any Chrome DevTools sessions connecting to that port.
- Provides actions: "Open Debug URL" (opens `chrome://inspect` or the direct WebSocket URL), "Copy Debug URL", "Restart with Debug" (kills and restarts with --inspect).
- Monitors the debug port: shows "debugger attached" or "debugger not attached" status.
- Handles the common case of multiple Node.js processes (e.g., a Next.js server + a worker process) by creating separate connector entries.

**Technical Dependencies:**
- F-025 (Connector auto-detection engine)
- Output Annotator (for parsing debug URL from output)
- Port monitoring (TCP connect check)

**UX Notes:**
- The Node.js connector uses a Node.js logo icon (or a recognizable "N" icon).
- The debug URL is shown in the connector bar tooltip.

---

### F-028: Docker Connector

**Priority:** P2
**Phase:** 6 -- A2UI and Connectors

**Description:**
A specialized connector for Docker and Docker Compose workflows. Detects `docker compose up` processes, discovers running containers, links containers that share a network, and provides container-level actions (logs, exec, stop, restart).

**User Value:**
Docker-based development involves multiple containers with inter-dependencies. The connector provides a unified view of the container constellation with quick actions, eliminating the need for separate `docker ps` and `docker logs` commands.

**Acceptance Criteria:**
- Detects `docker compose up` and `docker run` processes by command-line pattern matching.
- Discovers running containers using the Docker API (via the Docker socket or `docker ps` output parsing).
- Links containers that share a Docker network into a connector group.
- Shows per-container information: name, image, status (running/stopped/restarting), ports, and resource usage.
- Provides actions per container: "View Logs" (opens a session tailing docker logs for that container), "Exec Shell" (opens a session with `docker exec -it <container> /bin/sh`), "Stop", "Restart".
- Provides group-level actions: "Stop All", "Restart All", "Down" (docker compose down).
- Health monitoring: alerts if a container exits unexpectedly or enters a restart loop.
- Port mappings are displayed and linked to URL annotations in terminal output.

**Technical Dependencies:**
- F-025 (Connector auto-detection engine)
- Docker socket or CLI for container discovery
- Session creation for "View Logs" and "Exec Shell" actions

**UX Notes:**
- The Docker connector uses a container/whale icon.
- Container status uses the same color coding as session status: green=running, red=stopped, yellow=restarting.

---

### F-029: Connector Bar UI

**Priority:** P1
**Phase:** 6 -- A2UI and Connectors

**Description:**
A bottom bar in the application layout that displays all active connector groups for the current workspace. Each group shows its member processes as linked nodes with health indicators. The bar provides quick actions and a visual representation of the process constellation.

**User Value:**
Gives an always-visible view of the inter-related processes in the workspace. Users can see at a glance whether all their development services are running, click to get details, and perform group-level actions.

**Acceptance Criteria:**
- The connector bar is positioned at the bottom of the application window, below the terminal area.
- Each connector group is displayed as a horizontal cluster of linked node badges (e.g., "[Flutter App] -- [DevTools] -- [adb]").
- Each node badge shows: process name (truncated), status indicator (colored dot), and PID.
- Links between nodes are rendered as lines or arrows connecting the badges.
- The connector bar shows an overall health summary for all groups: "All N running" (green) or "M of N degraded" (yellow/red).
- Clicking a node badge focuses that process's session.
- Right-clicking a node badge opens a context menu with process-specific actions.
- Right-clicking a connector group header opens a context menu with: "Kill All", "Restart All", "Merge Logs", "Remove Group".
- The connector bar can be toggled (shown/hidden) via Cmd+K.
- If no connector groups exist, the bar is hidden.
- The bar height is approximately 40-60px, showing a single row of connector groups. If there are more groups than fit, a horizontal scroll or overflow indicator is shown.

**Technical Dependencies:**
- F-025 (Connector auto-detection engine provides the group data)
- ConnectorGroup data model
- SolidJS connector bar component

**UX Notes:**
- Keyboard shortcut: Cmd+K toggles the connector bar.
- Node badges use a pill shape with rounded corners.
- The link lines between nodes animate briefly when a new connection is detected.
- The connector bar uses a slightly different background color from the terminal area and status bar for visual separation.

---

### F-030: Merged Log View

**Priority:** P2
**Phase:** 6 -- A2UI and Connectors

**Description:**
A unified log stream that interleaves output from all sessions in a connector group, with each session's output color-coded and prefixed with the session name. The merged view is displayed in a dedicated terminal pane and supports filtering by session.

**User Value:**
When debugging issues that span multiple processes (e.g., a request flows from Flutter app to API server to database), viewing all logs in a single chronological stream is far more efficient than switching between sessions.

**Acceptance Criteria:**
- A merged log view can be opened from the connector group context menu ("Merge Logs") or from a button in the connector bar.
- The merged view opens in a new terminal pane within the current workspace.
- Output from each member session is interleaved chronologically (by timestamp of receipt).
- Each line is prefixed with the source session name in a distinct color (session 1 = blue prefix, session 2 = green prefix, etc.).
- A filter bar at the top of the merged view allows toggling individual sessions on/off.
- A search function (Cmd+F within the pane) searches across all merged output.
- The merged view supports pausing the stream (output is buffered while paused) and resuming.
- Clicking a line in the merged view focuses the source session and scrolls to that line in its original output.
- The merged view handles high-throughput output (up to 10,000 lines/second combined) without dropping lines or excessive CPU usage.
- The merged view is read-only; the user cannot type into it.

**Technical Dependencies:**
- F-029 (Connector bar provides the entry point)
- PTY output streams from member sessions
- Terminal pane rendering (xterm.js)
- Session Manager for session output stream access

**UX Notes:**
- The merged view pane has a distinct header showing "Merged: [Connector Group Name]" and the filter toggles.
- Session name prefixes use a fixed-width format (padded to the longest name) for alignment.
- The pause/resume button is prominent in the header.

---

## F. Git Translation Layer

The Git Translation Layer bridges Ocean's Session DAG with the git workflow. It translates the internal working-phase state (deltas, merges, DAG metadata) into standard git commits, branches, and pull requests.

---

### F-031: Session-to-Git Commit Translation

**Priority:** P0
**Phase:** 5 -- Git Translation Layer

**Description:**
When a session's delta is merged to the workspace, Ocean can automatically create a git commit containing the session's changes. The commit message includes the session name, agent identity, and a summary of the changes. Commit authorship reflects the agent that performed the work.

**User Value:**
Preserves a clean git history that captures not just what changed but who (which agent) changed it and why. The user gets granular commits without manually staging and committing after each agent's work.

**Acceptance Criteria:**
- When a session merge completes (F-006), the user is offered the option to create a git commit from the merged delta. This can also be configured to happen automatically.
- The git commit is created using git2-rs (not shelling out to git).
- The commit includes exactly the files from the session's delta (modified, created, deleted).
- The commit message follows the format: `<type>: <summary>\n\n<body>`. The summary is derived from the session name or workspace task. The body includes session metadata.
- The commit author is set to the agent identity (e.g., "Claude Code <claude@ocean.dev>") or the user's git config, based on a user preference.
- The session's SessionState record is updated with the git_commit hash after translation.
- If the session delta contains no changes (empty delta), no commit is created and the user is informed.
- Translation handles binary files, new files, and deleted files correctly.
- The commit is created on the workspace's git branch (created if it does not yet exist).
- Commits are created locally; pushing is a separate action.

**Technical Dependencies:**
- F-006 (Session merge flow provides the delta)
- git2-rs for commit creation
- Workspace data model (git_branch field)

**UX Notes:**
- A "Create Commit" checkbox in the merge panel (F-006) controls whether a commit is created on merge.
- The auto-generated commit message is editable before creation.
- After commit creation, the git status badge (F-018) updates to reflect the new commit.

---

### F-032: Workspace-to-PR Creation

**Priority:** P0
**Phase:** 5 -- Git Translation Layer

**Description:**
When a workspace is "done" (all sessions completed and merged), Ocean can create a GitHub pull request containing all the workspace's changes. The PR body includes the full DAG history: which agents worked on what, the order of operations, how conflicts were resolved, and a summary of all changes.

**User Value:**
Automates the final step of the agentic workflow: shipping the work as a reviewable PR. The rich DAG context in the PR body helps reviewers understand not just the code changes but the process that produced them.

**Acceptance Criteria:**
- A "Ship Workspace" action is available from the workspace context menu, command palette, and as the final step of the merge-all flow.
- The action creates a git branch (if not already created) from the workspace's merged state.
- All accumulated commits from session-to-git translations (F-031) are included on the branch.
- A pull request is created on the configured remote (GitHub) using the gh CLI.
- The PR title defaults to the workspace name (editable before creation).
- The PR body is auto-generated and includes:
  - A summary of all changes (files modified, lines added/removed).
  - A list of all sessions and their agents with brief descriptions of each agent's work.
  - The DAG structure rendered as a text diagram.
  - Any conflicts that were detected and how they were resolved.
  - Total time from workspace creation to completion.
- The workspace's git_pr field is updated with the PR URL.
- The user can edit the PR title and body before creation.
- If the workspace has no commits or no changes, the action is blocked with an explanation.
- The branch is pushed to the remote before PR creation.
- If the remote push fails (e.g., auth issue, network error), the error is shown and the user can retry.

**Technical Dependencies:**
- F-031 (Session-to-git commit translation, for the commits on the branch)
- gh CLI for PR creation
- git2-rs for branch creation and management
- Network connectivity for push and PR creation

**UX Notes:**
- The "Ship Workspace" action is a prominent button in the workspace header or context menu.
- A preview of the PR body is shown before creation, allowing edits.
- After PR creation, the workspace status badge shows the PR link.

---

### F-033: DAG Metadata as Git Trailers

**Priority:** P1
**Phase:** 5 -- Git Translation Layer

**Description:**
When translating sessions to git commits, Ocean appends structured metadata as git trailers (key-value pairs at the end of the commit message). Trailers capture: the agent identity, session ID, parent session ID, workspace ID, conflict resolutions, and any other DAG-specific context.

**User Value:**
Preserves the full provenance chain in the git history. Tools and reviewers can trace which agent produced each commit, how sessions related to each other, and how conflicts were resolved -- all from the commit metadata.

**Acceptance Criteria:**
- Each commit created by F-031 includes the following git trailers:
  - `Ocean-Session-Id: <UUID>`
  - `Ocean-Workspace-Id: <UUID>`
  - `Ocean-Agent: <agent_type>` (e.g., "claude-code", "aider")
  - `Ocean-Parent-Session: <UUID>` (if the session had a parent; omitted for root sessions)
  - `Ocean-Conflicts-Resolved: <count>` (number of conflicts resolved during this session's work, 0 if none)
- Trailers are appended after a blank line following the commit message body, per git trailer convention.
- Trailers are parseable by standard git tools: `git log --format='%(trailers)'` correctly extracts them.
- The user can disable trailer generation in settings (for repositories where commit message format is strictly controlled).
- Trailers do not duplicate information already in the commit message body.

**Technical Dependencies:**
- F-031 (Session-to-git commit translation, which creates the commits)
- Session data model (session ID, parent, workspace, agent type)
- git2-rs for commit message formatting

**UX Notes:**
- Trailers are visible in the commit message preview during the merge/commit flow.
- A tooltip in the commit preview explains what each trailer means.

---

### F-034: "Ship Workspace" Command

**Priority:** P0
**Phase:** 5 -- Git Translation Layer

**Description:**
A single command that orchestrates the entire translation pipeline: merge all remaining session deltas to the workspace, create git commits for each uncommitted merge, push the branch to the remote, and create the PR. This is the "one-click ship" experience for completing an agentic workflow.

**User Value:**
Reduces the multi-step "merge sessions, commit, push, create PR" workflow to a single action. Essential for the "vibe coding" use case where the user wants to review the result once and ship it.

**Acceptance Criteria:**
- The command is available via: command palette ("Ship Workspace"), keyboard shortcut (Cmd+Shift+S), workspace context menu, and CLI (`ocean ship`).
- The command performs the following steps in sequence:
  1. Checks for any active (non-completed) sessions in the workspace. If found, prompts: "N sessions are still active. Wait for them to complete, or force-merge now?"
  2. Merges all completed sessions' deltas that have not yet been merged to the workspace.
  3. Creates git commits for each merged session that does not yet have a commit (F-031).
  4. Creates a git branch (if not already created) and pushes it to the remote.
  5. Creates a PR (F-032) with the auto-generated title and body.
  6. Returns the PR URL.
- Each step shows progress in a status overlay or progress bar.
- If any step fails, the command stops, shows the error, and allows retrying from the failed step (not from the beginning).
- Conflicts encountered during merge (step 2) pause the flow and open the merge panel (F-006) for resolution.
- Dry-run mode: `ocean ship --dry-run` shows what would be done without executing.
- After a successful ship, the workspace status changes to reflect that it has been shipped (shows the PR link).

**Technical Dependencies:**
- F-006 (Session merge flow)
- F-031 (Session-to-git commit)
- F-032 (Workspace-to-PR creation)
- All session and workspace data model components

**UX Notes:**
- The progress overlay shows a checklist of steps with checkmarks as each completes.
- The final step (PR creation) shows the PR URL as a clickable link.
- If the user has already shipped this workspace and runs ship again, a warning is shown: "This workspace was already shipped as PR#N. Create a new PR or update the existing one?"

---

## G. Core Terminal

The foundational terminal functionality that Ocean must provide to be usable as a daily-driver terminal. This is the substrate on which all other features are built.

---

### F-035: Terminal Rendering (xterm.js + WebGL)

**Priority:** P0
**Phase:** 1 -- Foundation

**Description:**
Ocean uses xterm.js with the WebGL renderer addon as its core terminal rendering engine, running inside the Tauri WebView. The renderer must support full ANSI escape codes, true color (24-bit), Unicode (including CJK and emoji), font ligatures, and smooth 60fps scrolling.

**User Value:**
The terminal must be fast, correct, and visually polished. Users will not adopt Ocean if basic terminal rendering is slow, buggy, or missing features they rely on in their current terminal.

**Acceptance Criteria:**
- xterm.js is integrated with the WebGL addon enabled. Fallback to the canvas renderer if WebGL is unavailable.
- The terminal supports: all standard ANSI/VT100/VT220 escape codes, 256-color and true color (24-bit RGB), bold, italic, underline, strikethrough, inverse, and dim text attributes.
- Unicode support: BMP and supplementary plane characters render correctly. CJK characters occupy two columns. Emoji render at the correct width.
- Font configuration: users can set the terminal font family, size, line height, and letter spacing. Ligature-capable fonts (Fira Code, JetBrains Mono) render ligatures correctly.
- Scrolling is smooth at 60fps even with 100,000+ lines in the scrollback buffer.
- Scrollback buffer size is configurable (default: 10,000 lines, max: 1,000,000 lines).
- The terminal cursor supports block, underline, and bar styles, configurable by the user.
- The cursor blinks at a configurable rate (default: 530ms on, 530ms off) and can be set to non-blinking.
- The terminal resizes responsively when the window or pane is resized. The PTY is notified of the new dimensions via SIGWINCH.
- Selection: text selection via mouse drag is supported. Selected text is highlighted. Cmd+C copies selected text to the clipboard.
- Right-click on selected text offers: "Copy", "Paste", "Search", "Open in Editor" (if the selection is a file path).
- The terminal renders correctly on Retina/HiDPI displays.
- The terminal supports the Kitty graphics protocol for inline image display.
- Performance: rendering 1,000 lines of new output per second does not exceed 10% CPU overhead on a modern Mac.

**Technical Dependencies:**
- Tauri v2 WebView for hosting the frontend
- xterm.js library with WebGL addon
- PTY management (F-036) for the terminal data source

**UX Notes:**
- The default theme is a dark theme with high-contrast colors, inspired by modern terminal aesthetics.
- Users can choose from built-in themes (Dracula, Solarized, Nord, One Dark, Monokai) or define custom themes.
- The terminal background supports configurable opacity for a translucent effect (macOS vibrancy).

---

### F-036: PTY Management (portable-pty)

**Priority:** P0
**Phase:** 1 -- Foundation

**Description:**
Ocean manages pseudo-terminal (PTY) instances via the portable-pty Rust crate. Each session owns a PTY that connects the terminal renderer to a shell process. The PTY manager handles creation, resizing, input/output streaming, and cleanup. A migration path to libghostty-vt is architected but not implemented in V1.

**User Value:**
Correct PTY management is invisible when it works and catastrophic when it does not. Users expect their shell, programs, and interactive tools (vim, tmux, htop) to work flawlessly.

**Acceptance Criteria:**
- Each session creates a PTY via portable-pty with the user's default shell (or a configured shell).
- The PTY is created with the correct terminal type (TERM=xterm-256color), locale settings, and environment variables.
- The session's CWD is passed to the PTY on creation (for COW sessions, this is the mount path; for others, the user's current directory or workspace root).
- Input from the terminal renderer (keystrokes) is written to the PTY master. Output from the PTY master is forwarded to the terminal renderer (xterm.js).
- The PTY output stream is also tapped by the Output Annotator (F-010-F-013) and the A2UI parser (F-021) before reaching the renderer.
- PTY resizing: when the terminal pane is resized, the PTY slave is notified of the new dimensions (rows, columns) via the appropriate ioctl call.
- PTY cleanup: when a session is closed, the PTY master is closed and the shell process is sent SIGHUP. If the process does not exit within 5 seconds, SIGKILL is sent.
- Multiple PTYs can be active simultaneously (at least 50 concurrent PTYs without resource issues).
- The PTY output stream supports backpressure: if the renderer is slow, the PTY read buffer grows but does not cause the shell process to block indefinitely.
- Environment variable injection: Ocean can inject additional environment variables into the PTY shell (e.g., `OCEAN_SESSION_ID`, `OCEAN_WORKSPACE_ID`, `OCEAN_A2UI_WS`) for agent and A2UI integration.
- Shell integration: Ocean supports detecting the shell prompt (via OSC 133 or similar protocols) to identify command boundaries.

**Technical Dependencies:**
- portable-pty crate (Rust)
- Tauri IPC for frontend-to-backend input/output streaming
- Session Manager (for session-to-PTY mapping)

**UX Notes:**
- This feature has no direct user-facing UX beyond "the terminal works." Its quality is measured by the absence of bugs.
- A user setting allows choosing the shell: zsh, bash, fish, or a custom command.

---

### F-037: Keyboard Shortcuts

**Priority:** P0
**Phase:** 1 -- Foundation

**Description:**
Ocean defines a comprehensive keyboard shortcut system for all application-level actions (session management, panel toggling, navigation). Shortcuts use the Cmd modifier on macOS (Ctrl on Linux) and do not conflict with common shell or vim keybindings. Shortcuts are user-customizable.

**User Value:**
Keyboard-driven users (the primary audience for a terminal) expect fast, predictable shortcuts for all common actions. Customization ensures Ocean does not conflict with individual workflows.

**Acceptance Criteria:**
- The following default shortcuts are implemented:
  - Cmd+T: New session in current workspace
  - Cmd+Shift+T: New workspace
  - Cmd+N: Spawn child session from current
  - Cmd+W: Close current session (with confirmation if process is running)
  - Cmd+G: Toggle git panel
  - Cmd+Shift+G: Toggle graph view
  - Cmd+K: Toggle connector bar
  - Cmd+1 through Cmd+9: Switch to session by index in the sidebar
  - Cmd+[ / Cmd+]: Navigate to previous/next session
  - Cmd+Shift+A: Focus agent status row
  - Cmd+Shift+M: Toggle system metrics detail panel
  - Cmd+P: Quick session switcher (fuzzy search popup)
  - Cmd+Shift+P: Command palette
  - Cmd+Shift+S: Ship workspace
  - Cmd+D: Split pane vertically
  - Cmd+Shift+D: Split pane horizontally
  - Cmd+F: Search in terminal output
  - Cmd+Shift+F: Search across all sessions
- Shortcuts do not intercept key combinations when the terminal has focus and the key is not an Ocean shortcut (e.g., Ctrl+C is passed through to the PTY, not intercepted by Ocean).
- Shortcut conflicts are detected: if the user configures a shortcut that conflicts with another, a warning is shown.
- Shortcuts are customizable via a settings UI or a JSON configuration file.
- A shortcut reference overlay is shown via Cmd+/ (or a help action in the command palette).
- On Linux, Cmd is replaced by Ctrl for all default shortcuts. The modifier is user-configurable.

**Technical Dependencies:**
- Tauri global shortcut registration (for app-level shortcuts)
- SolidJS key event handling (for in-app shortcuts)
- Settings storage (SQLite or JSON file)

**UX Notes:**
- The shortcut reference overlay is a semi-transparent overlay showing all shortcuts grouped by category.
- Shortcuts in context menus are displayed right-aligned next to the menu item label.
- When a shortcut conflicts with a shell binding, Ocean provides a "pass-through" mode that forwards all keys to the terminal (toggled via a designated escape key).

---

### F-038: Command Palette

**Priority:** P0
**Phase:** 1 -- Foundation

**Description:**
A VS Code-style command palette that provides fuzzy-searchable access to all Ocean commands. The palette opens as a centered overlay with a text input, displays matching commands as the user types, and executes the selected command on Enter.

**User Value:**
Provides discoverability and fast access to all Ocean features without memorizing shortcuts. New users can explore functionality; experienced users can quickly execute commands by typing a few characters.

**Acceptance Criteria:**
- The command palette opens via Cmd+Shift+P.
- The palette renders as a centered overlay, approximately 500px wide, with a text input at the top and a scrollable list of matching commands below.
- All Ocean commands are registered in the palette: session management, panel toggles, workspace actions, ship workspace, view toggles, settings, etc.
- The search is fuzzy: typing "ship" matches "Ship Workspace", "shw" matches "Ship Workspace", "nses" matches "New Session".
- Each command entry shows: command name, keyboard shortcut (if any), and a brief description.
- Pressing Enter executes the highlighted command and closes the palette.
- Pressing Escape closes the palette without executing.
- Arrow keys navigate between results; the first result is highlighted by default.
- The palette also supports quick session switching: typing a session name filters to matching sessions and selecting one focuses it.
- Recently used commands appear at the top of the list when the input is empty.
- The palette renders within 100ms of the keyboard shortcut and filters within 50ms of each keystroke.
- The palette is accessible: screen reader compatible, keyboard-only navigable.

**Technical Dependencies:**
- SolidJS overlay component
- Command registry (a centralized list of all available commands with metadata)
- Fuzzy search algorithm (e.g., fzf-like scoring)

**UX Notes:**
- The palette uses a dark semi-transparent backdrop that dims the terminal area.
- The text input has an auto-focus on open.
- Command categories are shown as subtle section headers in the results list.

---

### F-039: Pane Splitting

**Priority:** P0
**Phase:** 1 -- Foundation

**Description:**
The terminal area can be split into multiple panes, each displaying a different session's terminal. Panes can be split vertically (side-by-side) or horizontally (top-and-bottom). Pane borders are draggable to resize. A focused pane receives keyboard input.

**User Value:**
Essential for monitoring multiple sessions simultaneously -- for example, watching an agent's terminal while a dev server runs in an adjacent pane. This is a baseline expectation for any modern terminal.

**Acceptance Criteria:**
- The user can split the current pane vertically via Cmd+D, producing two side-by-side panes.
- The user can split the current pane horizontally via Cmd+Shift+D, producing two stacked panes.
- The new pane starts a new session (or the user can assign an existing session to it).
- Pane borders are draggable to resize. Minimum pane size is 20 columns x 5 rows.
- Clicking a pane focuses it (gives it keyboard input focus). The focused pane has a subtle highlight on its border.
- Keyboard navigation between panes: Cmd+Alt+Arrow keys move focus between adjacent panes.
- Closing a pane (Cmd+W) closes its session (with confirmation) and the adjacent pane expands to fill the space.
- Pane layout supports nesting: a pane can be split again, creating complex layouts (up to 4 levels deep).
- The pane layout is preserved across application restarts (stored in workspace state).
- Each pane's terminal is independently scrollable and independently resizable (PTY dimensions match the pane, not the window).
- A "maximize pane" action (double-click border or shortcut) temporarily expands one pane to fill the terminal area, hiding others. Repeating the action restores the layout.

**Technical Dependencies:**
- xterm.js: multiple instances, one per pane
- PTY management (F-036): multiple PTYs, one per pane/session
- SolidJS splitter component (drag-to-resize)
- Workspace state persistence (SQLite)

**UX Notes:**
- Pane borders are thin (1-2px) and use a subtle color. The focused pane's border is brighter.
- When splitting, a brief animation slides the new pane into place.
- Right-clicking a pane border offers: "Split Vertical", "Split Horizontal", "Close Pane", "Maximize Pane".

---

### F-040: Search in Terminal Output

**Priority:** P1
**Phase:** 1 -- Foundation

**Description:**
A search bar within the terminal pane that allows the user to search through the scrollback buffer. The search supports plain text and regex, highlights all matches, and allows navigating between matches with keyboard shortcuts.

**User Value:**
Finding specific output in a long terminal session is a common need -- looking for an error message, a specific log line, or a configuration value. In-pane search is faster than scrolling manually.

**Acceptance Criteria:**
- The search bar opens via Cmd+F within a terminal pane.
- The search bar appears at the top-right corner of the pane, overlaying the terminal output.
- The user can type a search query; matching text in the scrollback buffer and visible output is highlighted with a background color.
- The current match is highlighted with a distinct color (e.g., orange) while other matches use a secondary color (e.g., yellow).
- Enter or the down-arrow button navigates to the next match. Shift+Enter or the up-arrow button navigates to the previous match.
- A match count is displayed: "N of M matches".
- The search supports case-sensitive and case-insensitive modes (toggled via a button in the search bar).
- The search supports regex mode (toggled via a button in the search bar).
- Pressing Escape closes the search bar and removes all highlights.
- The search operates on the full scrollback buffer, not just the visible portion.
- Search performance: for a scrollback of 100,000 lines, the initial search completes in under 500ms. Incremental search (as the user types) updates within 200ms.
- xterm.js search addon is used as the underlying implementation.

**Technical Dependencies:**
- xterm.js search addon
- SolidJS search bar component
- Keyboard shortcut system (F-037) for Cmd+F binding

**UX Notes:**
- The search bar is compact: a text input, match count, prev/next buttons, case/regex toggle buttons, and a close button.
- The search bar does not shift the terminal content; it overlays in the top-right corner.
- When navigating between matches, the terminal auto-scrolls to bring the current match into view.

---

## Cross-Cutting Concerns

The following items are not individual features but apply across multiple features.

### Data Persistence

All session, workspace, connector, and annotation data is persisted in SQLite via rusqlite. Terminal scrollback is stored on the filesystem. The application restores all state on restart, including active workspaces, session trees, pane layouts, and scrollback buffers.

### Performance Targets

| Metric | Target |
|--------|--------|
| Application startup | Under 2 seconds to usable terminal |
| Session creation | Under 500ms |
| PTY output latency | Under 5ms from PTY read to screen render |
| Annotation per line | Under 1ms |
| A2UI component render | Under 200ms |
| Memory (idle, single session) | Under 100MB |
| Memory per additional session | Under 20MB incremental |
| Conflict detection per write event | Under 10ms |

### Platform Support

- **macOS** (primary): full feature support including NFS loopback for COW.
- **Linux** (secondary): full feature support using OverlayFS/FUSE for COW.
- **Windows** (tertiary): deferred to a later release. Architecture should not preclude it.

---

## Feature Dependency Graph (Summary)

```
Phase 1 (Foundation):
  F-035 (Terminal Rendering) --> F-036 (PTY) --> F-037 (Shortcuts) --> F-038 (Palette)
  F-035 --> F-039 (Pane Splitting)
  F-035 --> F-040 (Search)
  F-035 --> F-004 (Session Tree Sidebar)

Phase 2 (Ambient Awareness):
  F-016 (System Metrics)
  F-017 (Network Status)
  F-018 (Git Status) --> depends on git2-rs
  F-019 (Agent Status) --> depends on F-009 (Session Lifecycle)
  F-020 (Click-to-Expand) --> depends on F-016, F-017, F-018

Phase 3 (Interactive Output):
  F-010 (File Paths) --> depends on F-035 (output stream)
  F-011 (URLs) --> depends on F-035
  F-012 (Errors) --> depends on F-035
  F-013 (Git Refs) --> depends on F-035, git2-rs
  F-014 (Context Menus) --> depends on F-010, F-011, F-012, F-013
  F-015 (Hover Tooltips) --> depends on F-010, F-011, F-012, F-013

Phase 4 (Code State Isolation):
  F-001 (Workspace) --> depends on SQLite, Filesystem Manager
  F-002 (Session COW) --> depends on F-001
  F-003 (Child Sessions) --> depends on F-002
  F-005 (Conflict Detection) --> depends on F-002
  F-006 (Merge Flow) --> depends on F-002, F-005
  F-007 (Graph View) --> depends on F-004, F-005
  F-008 (Auto-Detection) --> depends on F-002, Process Monitor
  F-009 (Lifecycle States) --> depends on F-036 (process monitoring)

Phase 5 (Git Translation):
  F-031 (Session->Commit) --> depends on F-006, git2-rs
  F-032 (Workspace->PR) --> depends on F-031, gh CLI
  F-033 (DAG Trailers) --> depends on F-031
  F-034 (Ship Workspace) --> depends on F-031, F-032, F-006

Phase 6 (A2UI and Connectors):
  F-021 (A2UI Parser) --> depends on F-036 (PTY output stream)
  F-022 (A2UI Renderer) --> depends on F-021, F-035
  F-023 (Ocean Extensions) --> depends on F-022
  F-024 (A2UI Bidirectional) --> depends on F-022, F-036
  F-025 (Connector Engine) --> depends on Process Monitor
  F-026 (Flutter Connector) --> depends on F-025
  F-027 (Node Connector) --> depends on F-025
  F-028 (Docker Connector) --> depends on F-025
  F-029 (Connector Bar) --> depends on F-025
  F-030 (Merged Log View) --> depends on F-029, F-035
```

---

## Appendix: Feature Index

| ID | Name | Priority | Phase |
|----|------|----------|-------|
| F-001 | Workspace Creation and Base Snapshot | P0 | 4 |
| F-002 | Session Creation with COW Filesystem Layer | P0 | 4 |
| F-003 | Child Session Spawning (Stacked Overlays) | P0 | 4 |
| F-004 | Session Tree Sidebar UI | P0 | 1 |
| F-005 | Real-Time Conflict Detection | P0 | 4 |
| F-006 | Session Merge Flow | P0 | 4 |
| F-007 | Graph View (DAG Visualization) | P1 | 4 |
| F-008 | Auto-Detection of Child Processes | P1 | 4 |
| F-009 | Session Lifecycle States | P0 | 2 |
| F-010 | File Path Detection and Actions | P0 | 3 |
| F-011 | URL Detection and Actions | P0 | 3 |
| F-012 | Error/Stack Trace Detection and Actions | P0 | 3 |
| F-013 | Git Ref Detection | P1 | 3 |
| F-014 | Context Menus on Annotations | P0 | 3 |
| F-015 | Hover Tooltips | P1 | 3 |
| F-016 | System Metrics (RAM, CPU, Battery) | P0 | 2 |
| F-017 | Network Status Indicator | P1 | 2 |
| F-018 | Git Status Badge | P0 | 2 |
| F-019 | Agent Status Row | P0 | 2 |
| F-020 | Click-to-Expand Details | P1 | 2 |
| F-021 | A2UI Escape Sequence Parser | P0 | 6 |
| F-022 | A2UI Component Renderer | P0 | 6 |
| F-023 | Ocean-Specific A2UI Extensions | P1 | 6 |
| F-024 | Agent-to-A2UI Bidirectional Communication | P0 | 6 |
| F-025 | Connector Auto-Detection Engine | P1 | 6 |
| F-026 | Flutter Connector | P1 | 6 |
| F-027 | Node.js Connector | P1 | 6 |
| F-028 | Docker Connector | P2 | 6 |
| F-029 | Connector Bar UI | P1 | 6 |
| F-030 | Merged Log View | P2 | 6 |
| F-031 | Session-to-Git Commit Translation | P0 | 5 |
| F-032 | Workspace-to-PR Creation | P0 | 5 |
| F-033 | DAG Metadata as Git Trailers | P1 | 5 |
| F-034 | Ship Workspace Command | P0 | 5 |
| F-035 | Terminal Rendering (xterm.js + WebGL) | P0 | 1 |
| F-036 | PTY Management (portable-pty) | P0 | 1 |
| F-037 | Keyboard Shortcuts | P0 | 1 |
| F-038 | Command Palette | P0 | 1 |
| F-039 | Pane Splitting | P0 | 1 |
| F-040 | Search in Terminal Output | P1 | 1 |
