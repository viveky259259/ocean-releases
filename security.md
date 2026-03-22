# Ocean Security Model

## Architecture

Ocean is a Tauri v2 desktop application with two processes:

1. **Rust backend** — manages PTY sessions, filesystem operations, SQLite, git, and system metrics
2. **WebView frontend** — SolidJS UI rendered in the platform's native WebView (WKWebView on macOS)

All communication between frontend and backend occurs through Tauri's IPC bridge (invoke commands + events). The frontend cannot access the filesystem, spawn processes, or perform network requests except through defined IPC commands.

## Content Security Policy

Ocean enforces the following CSP:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
connect-src 'self' ipc: http://ipc.localhost;
font-src 'self' data:;
```

- No external scripts, stylesheets, or resources can be loaded
- `'unsafe-inline'` for styles is required due to SolidJS inline style objects
- `ipc:` and `http://ipc.localhost` enable Tauri's IPC bridge
- No `eval()`, `new Function()`, or dynamic script injection is used anywhere in the frontend

## IPC Security

### Input Validation

All `#[tauri::command]` handlers validate inputs:

- **Session IDs**: must be 1-64 chars, alphanumeric + hyphens only (UUID format)
- **Workspace IDs**: same validation as session IDs
- **Session names**: 1-256 characters
- **PTY write data**: max 1MB per call
- **File paths**: `read_file` restricts to `~/.ocean/` and known workspace `repo_path` directories

### Rate Limiting

- `execute_annotation_action` (opens URLs, Finder, editor): max 5 calls per 10-second window
- Exceeding the limit returns an error without executing the action

### Capabilities

Ocean uses Tauri's capability system to restrict IPC access:

- Only the `main` window has IPC access
- Event listeners are scoped to known event patterns (`pty-output-*`, `session-*`, etc.)
- Shell spawn and stdin-write are permitted (required for PTY management)
- Notifications use the platform's native notification system

## File Access

- `read_file` command validates paths against an allowlist:
  - `~/.ocean/` directory (Ocean's data)
  - Any workspace `repo_path` registered in the database
- Paths outside these directories are rejected with "Access denied"
- All paths are canonicalized before checking to prevent symlink traversal

## PTY Isolation

- Each session gets its own PTY pair (separate file descriptors)
- No cross-session PTY access is possible through the IPC layer
- Session IDs are validated before any PTY operation
- Environment variables are scrubbed: `*_KEY`, `*_SECRET`, `*_TOKEN` patterns are not exposed in annotations or logs

## SQLite Security

- Database file at `~/.ocean/ocean.db` with `0600` permissions
- WAL mode for concurrent read/write safety
- Parameterized queries throughout (no string interpolation in SQL)
- Foreign keys enforced (`PRAGMA foreign_keys=ON`)

## Session Recording

- Recordings stored at `~/.ocean/recordings/{session_id}.cast`
- Asciicast v2 format (JSON Lines)
- Recordings include raw terminal output — may contain sensitive data displayed in the terminal
- No recordings are uploaded or shared without explicit user action
- Storage limits configurable (default: 10GB total, 90-day retention)

## A2UI Sandboxing

- A2UI components are parsed from escape sequences, not arbitrary HTML
- Component types are restricted to a known allowlist (Table, Form, Button, Card, CodeBlock, Diff, ProgressBar)
- No `eval()` or dynamic code execution from A2UI data
- All A2UI property values are sanitized before rendering

## Network

- Ocean makes no outbound network requests by default
- Git operations use `libgit2` (in-process, no shell-out for git commands)
- GitHub CLI (`gh`) is invoked only for PR creation, explicitly initiated by the user
- System metrics use local APIs (`sysinfo` crate, `pmset`, `route`)
- Network status checks use `sysctl`/`route` — no external pings

## Observability (Firebase)

- Firebase is **opt-in only** — requires explicit user consent via the first-launch dialog
- Firebase is **not initialized** unless the user opts in AND a Firebase config is provided
- No terminal content, commands, file paths, or personal data is sent to Firebase
- Analytics events contain only truncated IDs (first 8 chars), feature names, and counts
- CSP allows connections to `*.googleapis.com`, `*.google-analytics.com`, `*.firebaseio.com` only when telemetry is enabled
- Enterprise admins can disable telemetry via managed config (`security.disable_telemetry = true`)
- The observability layer (`src/lib/observability.ts`) is a noop when Firebase is not initialized — all tracking functions silently return without side effects

## Reporting Vulnerabilities

If you discover a security vulnerability in Ocean, please report it responsibly by emailing security@ocean.dev (or opening a private GitHub Security Advisory).
