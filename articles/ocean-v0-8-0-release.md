# Ocean v0.8.0 — What's New

*Released April 1, 2026*

v0.8.0 is a quality-of-life and reliability release. The headline features are **Discard Session Changes** and **View Changes** in context menus, the **File Picker** shortcut, and a sweep of conflict detection and merge workflow fixes that have been in the backlog since v0.7.0.

---

## Discard Session Changes

Right-click any session — live or closed — and choose **Discard Changes** to reset the session overlay back to the workspace base. A confirmation dialog shows how many files will be reset before anything happens. The option is hidden for sessions that have already been committed.

This is useful when an agent goes in the wrong direction and you want to start fresh without losing the base workspace state.

---

## View Changes

Right-click any session and choose **View Changes** to open the merge panel pre-filtered to that session's diffs. Previously this required opening the merge panel manually and scrolling to find the session. Now it's one click.

---

## File Picker (Cmd+Option+F)

Opens a native macOS file picker. Selected file paths are pasted shell-escaped into the focused terminal. Multi-select is supported — each path is appended space-separated. Also available in the command palette as "Pick File to Paste Path".

This complements the existing file drag-and-drop added in v0.7.1.

---

## Copy Workspace Path

Right-click a workspace header and choose **Copy Workspace Path** to copy the Ocean workspace directory (`~/.ocean/workspaces/{id}`) to the clipboard. Useful when you need to inspect the COW overlay directly or pass the path to a tool.

---

## Shortcut Error Notifications

Every keyboard shortcut now shows a helpful notification when it can't execute. For example, `Cmd+Shift+M` (merge) shows "Merge requires 2+ sessions" if the workspace only has one session. Previously shortcuts silently did nothing.

---

## Git Index Auto-Repair

Ocean now detects a corrupt `.git/index` on commit and shows an error dialog with a **Fix** button. Clicking Fix rebuilds the git index automatically and you can retry the commit. This was a papercut that required knowing the `git read-tree HEAD` workaround — now it's handled in-app.

---

## Conflict & Merge Fixes

This release fixes 10 issues in the conflict detection and merge workflows:

- **`.git/index` symlink**: The workspace base snapshot was symlinking `.git/index` back to the original project, causing the base and project to share a git index. This corrupted git state in both places and caused `hello.md`-style files to appear in both the base and the actual project after a merge. Fixed.
- **False conflicts from identical sessions**: When sessions are cloned from a dirty repo, they all inherit the same files. These were incorrectly flagged as conflicts. Files with identical content across all sessions are now skipped.
- **Phantom conflicts from completed sessions**: Conflict detection now ignores sessions whose overlays are stale (completed/merged sessions).
- **Closed session context menu**: Used `activeWorkspaceId` (the last-focused workspace) instead of the session's own `workspace_id`, so Merge/View Changes/Discard were hidden when a different workspace was focused. Fixed.
- **Circular conflict resolution loop**: Closing the conflict flow unconditionally retried the merge, causing an infinite loop. Now only retries when conflicts are actually resolved.
- **Empty diff viewer**: `get_conflict_details` returned undefined versions on some files, crashing the diff viewer.
- **Merge panel stale after Ship/Sync**: Session state in the merge panel now refreshes after Ship as PR and Sync to Project.
- **Auto-commit hash not persisted**: After a session merge with auto-commit, the commit hash is now correctly saved.
- **File drop in production builds**: `dragDropEnabled` was missing from `tauri.conf.json`, breaking file drop in signed/installed builds.
- **Cmd+Option+F on macOS**: Option key remapping caused the keybinding to read `ƒ` instead of `F`. Fixed by using `e.code` (physical key position) for alt combos.

---

## Numbers

- 322 Rust unit tests
- 878 frontend tests
- 13 new Playwright E2E tests for conflict resolution flow
- Conflict poll interval: 10s → 5s for faster detection

---

[Download v0.8.0](https://github.com/viveky259259/ocean-releases/releases/tag/v0.8.0)
