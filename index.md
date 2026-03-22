# Ocean Developer Documentation

**Ocean** is a terminal workspace for agentic development, built with Solid.js + Tauri 2 + Rust.

## Quick Start

```bash
# Install dependencies and build
./scripts/install.sh --open

# Development mode (hot-reload)
npm run tauri dev

# Run tests
npm test
```

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│          Solid.js + TypeScript + Vite        │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │  Stores   │  │Components│  │    Lib    │ │
│  │ (state)   │  │  (UI)    │  │ (ipc,keys)│ │
│  └─────┬─────┘  └─────┬────┘  └─────┬─────┘ │
│        └───────────────┴─────────────┘       │
│                    IPC Bridge                │
├─────────────────────────────────────────────┤
│                  Backend                     │
│              Tauri 2 + Rust                  │
│                                             │
│  ┌─────┐ ┌────────┐ ┌───────┐ ┌──────────┐ │
│  │ PTY │ │Sessions│ │  Git  │ │ Metrics  │ │
│  │Mgr  │ │  Mgr   │ │Watcher│ │Collector │ │
│  └─────┘ └────────┘ └───────┘ └──────────┘ │
│  ┌─────┐ ┌────────┐ ┌───────┐ ┌──────────┐ │
│  │ DB  │ │History │ │A2UI   │ │Connectors│ │
│  │SQLite│ │Detector│ │Parser │ │ Detector │ │
│  └─────┘ └────────┘ └───────┘ └──────────┘ │
└─────────────────────────────────────────────┘
```

## Project Structure

```
ocean/
├── src/                        # Frontend (Solid.js)
│   ├── components/             # UI components
│   │   ├── terminal/           # TerminalArea, TerminalPane, PaneDivider
│   │   ├── sidebar/            # Sidebar, WorkspaceGroup, SessionNode
│   │   ├── statusbar/          # StatusBar, detail panels
│   │   ├── merge/              # MergePanel, ConflictBanner
│   │   ├── ship/               # ShipDialog
│   │   ├── connectors/         # ConnectorBar
│   │   └── a2ui/               # Agent-to-UI renderers
│   ├── stores/                 # Reactive state (Solid.js stores/signals)
│   ├── lib/                    # IPC, keybindings, observability
│   └── styles/                 # CSS variables and globals
├── src-tauri/                  # Backend (Rust)
│   ├── src/
│   │   ├── lib.rs              # Tauri setup, IPC command handlers
│   │   ├── pty/                # PTY spawning, read/write, resize
│   │   ├── session/            # Session lifecycle, activity tracking
│   │   ├── history/            # Command detection, session recording
│   │   ├── metrics/            # System, network, git metrics
│   │   ├── terminal/           # Output annotation engine
│   │   ├── a2ui/               # Agent-to-UI protocol parser
│   │   ├── connectors/         # Docker/Flutter/Node detection
│   │   ├── filesystem/         # COW filesystem, file operations
│   │   └── git/                # Git status, watcher
│   └── tauri.conf.json         # Tauri configuration
├── scripts/
│   ├── install.sh              # Dev setup (--open to build & launch)
│   └── release.sh              # GitHub release automation
└── docs/                       # This documentation
```

## Core Concepts

### Sessions & Workspaces

- **Workspace**: A named container for sessions, optionally linked to a git repo
- **Session**: A terminal shell instance with its own PTY process
- **Session Tree**: Parent-child hierarchy (Cmd+N spawns children)

### Layout System

- **Layout Group**: A set of terminal panes displayed together
- **Split Panes**: Cmd+D (vertical) / Cmd+Shift+D (horizontal) splits within a group
- **Max Panes**: 5 per group
- Groups are independent — Cmd+1-9 switches between them

```
Layout Group 1:          Layout Group 2:
┌──────┬──────┐          ┌─────────────┐
│ Sh 1 │ Sh 2 │          │    Sh 3     │
│      ├──────┤          │             │
│      │ Sh 3 │          │             │
└──────┴──────┘          └─────────────┘
```

### State Management

All state uses Solid.js primitives:

| Store | Type | Purpose |
|-------|------|---------|
| `sessionStore` | `createStore` | Workspaces, sessions, tree |
| `layoutStore` | `createStore` | Pane layout, groups |
| `uiStore` | `createSignal` | Panel visibility toggles |
| `settingsStore` | `createStore` | User preferences (persisted) |
| `notificationStore` | Signals + arrays | Notifications and toasts |
| `panelStore` | `createSignal` | Active detail panel |
| `activityStore` | Signals + Map | Per-session activity timeline |
| `logStore` | Signals + array | Debug console entries |

### IPC Layer

Frontend communicates with Rust via `src/lib/ipc.ts`:

```typescript
import { invoke, listen } from "./lib/ipc";

// Command (request-response)
const workspaces = await invoke<Workspace[]>("list_workspaces");

// Event (push from backend)
listen<string>("pty-output-{sessionId}", (event) => {
  terminal.write(atob(event.payload));
});
```

Tauri detection: checks `window.__TAURI_INTERNALS__` (Tauri 2). Falls back to mock IPC for browser-based testing.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+T | New session |
| Cmd+N | Spawn child session |
| Cmd+W | Close session |
| Cmd+D | Split vertical |
| Cmd+Shift+D | Split horizontal |
| Cmd+1-9 | Switch layout groups |
| Cmd+[ / ] | Previous/next group |
| Cmd+P | Quick session switcher |
| Cmd+Shift+P | Command palette |
| Cmd+, | Settings |
| Cmd+B | Toggle sidebar |
| Cmd+G | Toggle git panel |
| Cmd+Shift+V | Git visualizer |

## Testing

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

**232 tests** across 16 files:

| Category | Files | Tests |
|----------|-------|-------|
| Store unit tests | 12 | 154 |
| Lifecycle integration | 1 | 28 |
| Sidebar UI behavior | 1 | 18 |
| Session/layout stores | 2 | 32 |

Test setup (`src/test-setup.ts`) mocks Tauri IPC and localStorage.

## Building

```bash
# Development (hot-reload)
npm run tauri dev

# Production build
npm run tauri build

# Full install + build + open
./scripts/install.sh --open

# Release to GitHub
./scripts/release.sh 0.6.0
```

### Prerequisites

- Node.js >= 18
- Rust (via rustup)
- Xcode Command Line Tools (macOS)

## Configuration

### Settings (localStorage: `ocean:settings`)

| Setting | Default | Range |
|---------|---------|-------|
| `paneResizeWidth` | 800px | 200-2000 |
| `paneResizeHeight` | 400px | 100-1200 |
| `updateChannel` | stable | stable/beta/nightly |
| `claudeCodeNative` | false | boolean |

### Tauri Config (`src-tauri/tauri.conf.json`)

- Window: 1200x800 (min 800x600)
- Bundle target: `app` (macOS .app)
- CSP configured for self + Firebase + Sentry

## Data Storage

| Data | Location | Format |
|------|----------|--------|
| Database | `~/.ocean/ocean.db` | SQLite |
| Crash reports | `~/.ocean/crashes/` | JSON |
| Session recordings | DB + filesystem | asciicast v2 |
| Layout | localStorage `ocean:layout-groups` | JSON |
| Settings | localStorage `ocean:settings` | JSON |

## Observability

Three provider adapters (registered based on telemetry consent):

- **ConsoleProvider**: Browser console logging
- **FirebaseProvider**: Analytics events
- **SentryProvider**: Crash/error reporting

Events tracked: launch, workspace.created, session.created, snippet usage, shortcut usage, crashes.
