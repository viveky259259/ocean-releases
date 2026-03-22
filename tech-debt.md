# Ocean — Tech Debt

## Phase 1 Carry-over

### TD-001: Stale Session Cleanup on Startup ✅ FIXED
**Priority:** High | **Phase:** 1 polish | **Status:** Done
**Issue:** Sessions persist in SQLite across app restarts, but their PTY processes are dead.
**Fix:** `db.mark_stale_sessions()` is called on startup in `lib.rs` setup hook. All "active" sessions are marked "completed" with exit_code -1.

### TD-002: Command Palette Implementation ✅ FIXED
**Priority:** Medium | **Phase:** 1 polish | **Status:** Done
**Issue:** Command palette (Cmd+Shift+P) was stubbed.
**Fix:** `CommandPalette.tsx` now has full command registry from `keybindings.ts` ALL_COMMANDS, fuzzy search, and shortcut hints.

### TD-003: Session Rename ✅ FIXED
**Priority:** Medium | **Phase:** 1 polish | **Status:** Done
**Issue:** Sessions were all named "Shell" with no way to rename.
**Fix:** `rename_session` IPC command added. Backend wired in `lib.rs`, DB method in `db.rs`.

### TD-004: Context Menus — Partial
**Priority:** Low | **Phase:** 1 polish | **Status:** Partial
**Issue:** Right-click context menus use browser `confirm()` dialog instead of proper styled menus.
**Fix:** Sidebar now has a basic context menu. Full `ContextMenu.tsx` component still needed for other areas.

### TD-005: Layout Persistence ✅ FIXED
**Priority:** Medium | **Phase:** 1 polish | **Status:** Done
**Issue:** Pane layout (splits) was not persisted across app restarts.
**Fix:** Layout tree serialized to localStorage on every mutation. On startup, restored and pruned of dead sessions (stale PTYs). Falls back to fresh single-pane layout if restore fails.

### TD-006: Unused `child_pid` Warning
**Priority:** Low | **Phase:** 1 polish | **Status:** Open
**Issue:** `cargo check` warns about unused `child_pid` field in `PtySession`.
**Fix:** Either use it (expose via API for process monitoring) or prefix with `_`. Prefer using it — will be needed for process metrics.

### TD-007: Dynamic Import Warning in Vite Build
**Priority:** Low | **Phase:** 1 polish | **Status:** Open
**Issue:** Vite warns about `layoutStore.ts` being both statically and dynamically imported. The dynamic import in `keybindings.ts` is ineffective.
**Fix:** Change the dynamic `import()` in `keybindings.ts` `new-session` action to a static import.

---

## Code Review — Security & Correctness

### TD-008: `read_file` Unrestricted Arbitrary File Read ✅ FIXED
**Priority:** Critical | **Phase:** security | **Status:** Done
**Issue:** `read_file` IPC command accepted any path with no validation.
**Fix:** Now validates canonical path is under `~/.ocean/` or a workspace's `repo_path`. Returns "Access denied" otherwise.

### TD-009: `resolve_conflict` merge_all Is Broken ✅ FIXED
**Priority:** Critical | **Phase:** correctness | **Status:** Done
**Issue:** The "merge_all" strategy used substring matching to dedup lines — produced garbage for structured files.
**Fix:** Removed `merge_all` strategy entirely. Only `accept:<session_id>` is supported. "Merge All" button removed from ConflictBanner. Proper 3-way merge can be added later using the `similar` crate.

### TD-010: Event Listener Leak in TerminalPane ✅ FIXED
**Priority:** High | **Phase:** correctness | **Status:** Done
**Issue:** `listen()` calls returned `UnlistenFn` that was never stored or called.
**Fix:** `activeListeners` changed from `Set<string>` to `Map<string, UnlistenFn[]>`. `disposeTerminal()` now calls all unlisten functions before cleanup.

### TD-011: `updateTreeNodeStatus` Breaks on Nested Sessions ✅ FIXED
**Priority:** High | **Phase:** correctness | **Status:** Done
**Issue:** Store path used flat index for nested tree update — silently failed for child sessions.
**Fix:** Removed broken in-place patching. Status changes now reload the full session tree from the backend via `loadSessionTree()`.

### TD-012: No ErrorBoundary in App ✅ FIXED
**Priority:** Medium | **Phase:** stability | **Status:** Done
**Issue:** Any component throw crashed the entire app with no recovery.
**Fix:** Added SolidJS `ErrorBoundary` wrapping all App children with error display and "Try Again" button.

### TD-013: Connector Detector Creates System::new_all() Every 5s ✅ FIXED
**Priority:** Medium | **Phase:** performance | **Status:** Done
**Issue:** `AutoDetector::new()` called `System::new_all()` every 5 seconds.
**Fix:** `AutoDetector` now wrapped in `Arc<Mutex<>>` and reused across polling iterations. `refresh_processes()` is called on the existing `System` instance instead of creating a new one.

### TD-014: Conflict Polling Interval Never Cleared ✅ FIXED
**Priority:** Medium | **Phase:** correctness | **Status:** Done
**Issue:** `setInterval` in `initConflictListener` never cleared; hot reload created duplicates.
**Fix:** Added `conflictListenerInitialized` guard flag — second call is a no-op.

### TD-015: Session Counter Resets on Restart
**Priority:** Low | **Phase:** UX | **Status:** Open
**Issue:** `sessionCounter` in `sessionStore.ts:53` starts at 0 on every app load. New "Shell 1" coexists with old completed "Shell 1".
**Fix:** Query max session name index from existing sessions on startup, or use a different naming scheme.
**Files:** `src/stores/sessionStore.ts`

### TD-016: Short SHA Regex False Positives
**Priority:** Low | **Phase:** correctness | **Status:** Open
**Issue:** Annotator regex `\b[0-9a-f]{7,12}\b` (`annotator.rs:91`) matches any 7-12 hex char sequence — color codes, UUID fragments, etc.
**Fix:** Add context checks (e.g., require git-like surrounding context) or reduce priority below file/URL annotations.
**Files:** `src-tauri/src/terminal/annotator.rs`

### TD-017: Dead Dependency @solidjs/router
**Priority:** Low | **Phase:** cleanup | **Status:** Open
**Issue:** `@solidjs/router` is in `package.json` dependencies but never imported anywhere.
**Fix:** `npm uninstall @solidjs/router`
**Files:** `package.json`

### TD-018: `base_dir_pub` / `session_dir_pub` Accessors
**Priority:** Low | **Phase:** cleanup | **Status:** Open
**Issue:** Public wrapper methods (`filesystem/mod.rs:48-56`) exist only because private methods need external access from `lib.rs`.
**Fix:** Make the underlying methods `pub` directly, or move conflict resolution logic into `FilesystemManager`.
**Files:** `src-tauri/src/filesystem/mod.rs`
