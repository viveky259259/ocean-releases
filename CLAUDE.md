# CLAUDE.md — ocean-releases

## What This Repo Is

This is the **public-facing** repository for Ocean — Terminal for Agentic Development. It contains:
- User documentation (`index.md` — served via GitHub Pages)
- Public README (`README.md` — repo landing page)
- Audience-targeted articles (`articles/`)
- Release binaries (via GitHub Releases, not committed to the repo)
- Jekyll config for GitHub Pages (`_config.yml`)

This is NOT the source code repo. The source lives in the private `ocean` repo. This repo is public — everything here is visible to the world.

## Repo Structure

```
ocean-releases/
├── README.md                              # Repo landing page with download links
├── index.md                               # Full user documentation (legacy, kept for reference)
├── docs.md                                # Full user documentation (served at /docs)
├── _config.yml                            # Jekyll theme config
├── website/                               # Waitlist landing page (deployed via NetLaunch as joinocean)
│   └── index.html                         # Self-contained landing page with Google Forms waitlist
└── articles/
    ├── ocean-for-ai-developers.md         # Hands-on guide for devs using AI agents
    ├── ocean-for-architects.md            # Technical deep-dive, problem-centric
    ├── ocean-for-product-managers.md       # Non-technical explainer
    └── ocean-for-enterprises.md           # Security, governance, ROI
```

## Writing Guidelines

### Tone & Voice
- Direct, confident, no hedging ("Ocean does X" not "Ocean aims to do X")
- Technical accuracy — claims must match what the product actually does
- No marketing fluff — lead with the problem, then the solution
- Use concrete numbers (memory: ~60MB, spawn: <100ms, delta: ~KB) over vague claims

### Content Rules
- **Never include source code or internal architecture details that aren't already public.** This repo is public. The Rust backend, IPC layer, store internals, and component code belong in the private repo.
- **Never include API keys, internal URLs, Slack links, or team-specific information.**
- **Feature claims must reflect shipped features**, not the roadmap. If a feature is planned but not shipped, label it as "coming in V1.x" or "V2 roadmap" — never present it as available.
- **Keep download links pointing to**: `https://github.com/viveky259259/ocean-releases/releases`
- **Keep docs link pointing to**: `https://viveky259259.github.io/ocean-releases`

### Article Format
Articles in `articles/` follow a consistent structure:
1. Title as H1 with a one-line subtitle in bold
2. `---` separator
3. Problem statement first (what breaks without Ocean)
4. Solution second (how Ocean addresses it)
5. Concrete comparisons (tables, before/after, numbers)
6. End with a footer linking to GitHub

### Audience Calibration
| Article | Audience | Jargon Level | Focus |
|---------|----------|-------------|-------|
| AI Developers | Daily Claude/Aider/Cursor users | High (COW, DAG, PTY) | Workflow, hands-on |
| Architects | Tech leads evaluating tools | High (system design) | Problems solved, trade-offs |
| Product Managers | Non-technical stakeholders | Minimal | Business impact, ROI |
| Enterprises | IT/security/engineering leadership | Medium | Governance, security, deployment |

## Ocean Product Facts (for reference)

### What Ocean Is
- Desktop terminal for macOS (Apple Silicon), built with Tauri v2 (Rust) + SolidJS + xterm.js
- Purpose-built for multi-agent AI development workflows
- Local-first, open-source (all rights reserved), no cloud dependency
- Session DAG with COW filesystem isolation is the core primitive

### Key Capabilities
- Multi-session workspaces with split panes
- Zero-cost filesystem isolation (COW overlays, ~KB per session)
- Real-time conflict detection with severity classification
- AI agent detection (Claude, Codex, Aider, Cursor, Copilot, Cody, Gemini, Devin)
- Interactive terminal output (clickable file paths, URLs, errors)
- Git translation layer (session → commit → PR)
- A2UI rendering (Google's agent-to-UI protocol)
- Parallel execution connectors (Docker, Flutter, Node)
- Claude Context Management UI (model, effort, permissions, CLAUDE.md editor)
- Ambient status bar (system metrics, git, network, agent state)
- Command palette, snippet library, terminal history
- Session recording and audit logging
- Managed configuration (4-tier hierarchy for enterprise)

### Performance Numbers
- App launch: ~400ms
- Session spawn: ~50ms (APFS)
- Idle memory: ~60MB
- Per-session memory: ~12MB
- Annotation latency: <0.5ms/line

### Competitive Position
- vs. Warp: open-source, local-first, COW isolation (Warp has none)
- vs. Ghostty: adds orchestration layer on top of terminal performance
- vs. iTerm2: generational leap for agent workflows
- vs. Claude Squad: native UI replaces tmux+worktree approach
- vs. WaveTerm: 5x lighter (Tauri vs Electron), real-time conflict detection

## Commit Style
- `docs:` prefix for all content changes
- Concise subject line (<70 chars)
- Body explains what changed and why
- Co-Author trailer for AI-assisted commits

## GitHub Pages
- Served from `main` branch root
- Theme: `pages-themes/minimal@v0.2.0`
- `index.html` is the landing page with waitlist at `viveky259259.github.io/ocean-releases`
- `docs.md` is the full documentation at `viveky259259.github.io/ocean-releases/docs`
- Waitlist landing page in `website/` folder, deployed via NetLaunch as `joinocean`
- Waitlist form links to Google Forms
- Articles are linked from docs page and can be shared directly via URL
