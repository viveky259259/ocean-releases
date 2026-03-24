# Ocean for Enterprises

**How Ocean addresses the operational, security, and governance challenges of AI-assisted development at scale.**

---

## The Enterprise AI Development Challenge

Your engineering teams are adopting AI coding agents — Claude Code, Cursor, GitHub Copilot, Aider. Some teams report 2-3x productivity gains. But this adoption is happening organically, without standardized tooling or governance.

The result:

- **No visibility** into how agents are being used across teams
- **No isolation** between parallel agent work, leading to merge conflicts and rework
- **No audit trail** for agent-generated code changes
- **No standardization** — every developer has their own tmux/worktree workflow
- **No cost controls** — agents running unchecked burn API credits

Ocean provides an enterprise-grade surface for managing AI-assisted development workflows — with the security, configurability, and governance controls that IT and engineering leadership need.

## Core Enterprise Capabilities

### 1. Standardized Multi-Agent Workflows

Ocean replaces the ad-hoc tmux scripts, git worktree hacks, and custom shell aliases that each developer invents independently. It provides a single, consistent workflow:

**Without Ocean** (current state for most teams):
```
Developer A: tmux + 4 worktrees + custom scripts
Developer B: multiple VS Code windows + terminal tabs
Developer C: Claude Squad + manual conflict resolution
Developer D: single terminal, runs agents sequentially (avoiding the problem)
```

**With Ocean** (standardized):
```
All developers: Ocean workspace → spawn sessions → real-time conflict detection → ship to PR
```

This standardization means:
- Onboarding is consistent — new developers learn one tool, not each team's custom setup
- Troubleshooting is predictable — IT support knows what to look for
- Best practices propagate — workspace templates can encode team workflows

### 2. Zero-Cost Filesystem Isolation

The number one operational problem with parallel AI agents is **isolation cost**. Git worktrees — the standard approach — consume:

| Metric | Per Agent (Worktrees) | Per Agent (Ocean) | 10-Dev Team Savings |
|--------|----------------------|-------------------|---------------------|
| Disk space | ~2GB | ~50KB | ~80GB recovered |
| Setup time | 3-5 min | <1 second | ~2 hours/day saved |
| `npm install` | Required per worktree | Shared (symlinked) | ~40 min/day saved |
| Port conflicts | Common | None (isolated CWD) | Fewer support tickets |

Ocean's copy-on-write filesystem overlay stores only the files each agent modifies. Dependencies (`node_modules/`, `build/`, `.gradle/`) are shared read-only across all sessions. This drops the marginal cost of "one more agent" to near zero.

### 3. Real-Time Conflict Detection

In traditional workflows, merge conflicts are discovered at merge time — after hours of agent work have built on conflicting foundations. The remediation cost is high and unpredictable.

Ocean detects conflicts **as they happen**:

```
Conflict Timeline Comparison:

Traditional:
  t=0     Agent A starts     Agent B starts
  t=60min Agent A finishes   Agent B finishes
  t=65min Developer tries to merge → CONFLICT
  t=90min Developer resolves conflict manually
  ═══════════════════════════════════════════
  Total wasted time: 25-60 minutes

Ocean:
  t=0     Agent A starts     Agent B starts
  t=5min  ⚠️ Ocean: "Both editing auth.ts — overlapping changes"
  t=6min  Developer pauses Agent B or reviews diff
  t=60min Agent A finishes, Agent B continues on resolved base
  ═══════════════════════════════════════════
  Total wasted time: ~1 minute
```

For a team running dozens of agents daily, this prevents hours of rework per week.

### 3a. Complete Conflict Resolution Pipeline

Detection alone is not enough. Ocean v0.7.0 ships a full resolution pipeline:

| Capability | What It Does |
|-----------|-------------|
| **3-way merge engine** | Computes base/ours/theirs at the hunk level, with per-hunk accept/reject/edit |
| **AI-assisted merge** | Claude API integration resolves complex conflicts with confidence scoring |
| **Merge queue** | Recommends optimal merge order across multiple agents based on complexity |
| **Advisory file locks** | Developers can lock files to prevent conflicts before they occur |
| **Session stash** | Save/restore session state mid-merge for safe experimentation |
| **Automatic snapshots** | Every merge creates a pre-merge backup; one-click undo if the result is wrong |
| **Dependency graph** | Declare inter-session dependencies; Ocean enforces merge ordering and detects cycles |
| **Health dashboard** | Aggregate conflict metrics, risk areas, and session activity in a single view |

This reduces conflict resolution from a multi-tool, multi-step process to a single integrated workflow.

### 4. Audit Trail and Traceability

Every action in Ocean is logged to a local audit database:

- Session creation, modification, and termination
- Agent type detection and lifecycle events
- File modifications per session (delta tracking)
- Merge operations and conflict resolutions
- Git operations (commits, pushes, PR creation)

This provides:
- **Compliance evidence** — Which agent generated which code, when, and what human reviewed it
- **Incident investigation** — If a bug ships, trace back to the exact agent session and its file changes
- **Usage analytics** — Understand how teams use AI agents (exportable audit log)

```
Audit log export:
  ocean audit export --from 2026-03-01 --to 2026-03-23 --format json

Includes:
  - 1,247 sessions across 42 workspaces
  - 89 conflicts detected, 87 resolved automatically
  - 156 PRs shipped via Ocean's translation layer
  - Agent breakdown: Claude (62%), Cursor (24%), Aider (14%)
```

### 5. Managed Configuration

Ocean supports a 4-tier configuration hierarchy:

```
Priority (highest first):
  1. Managed    — IT/MDM-deployed, cannot be overridden
  2. User       — Developer's global preferences
  3. Project    — Team-shared, committed to git
  4. Session    — Runtime overrides

Example managed policy:
{
  "permissions": {
    "deny": ["Bash(rm -rf *)", "Bash(curl * | bash)"]
  },
  "claudeModel": "claude-sonnet-4-6",
  "claudeBudgetUsd": 10,
  "claudeMaxTurns": 50,
  "telemetryConsent": "opted-in"
}
```

IT can enforce:
- **Model restrictions** — Limit which Claude models are available (cost control)
- **Budget caps** — Set maximum spend per session or per day
- **Permission boundaries** — Restrict which shell commands agents can run
- **Telemetry requirements** — Enforce opt-in for organizational analytics
- **Update channels** — Pin teams to stable releases

### 6. Claude Context Management UI

Ocean includes a visual interface for managing Claude Code configuration — replacing the CLI-based workflow that requires documentation diving:

- **Model selection** — Dropdown instead of `--model` flag
- **Effort level** — Visual selector instead of `--effort` flag
- **Permission mode** — Governed dropdown instead of manual settings.json editing
- **CLAUDE.md editor** — Inline editor with token count instead of manual file creation
- **Budget limits** — Visual input instead of `--max-budget-usd` flag

For enterprise teams, this means:
- Consistent configuration across developers
- Managed defaults that align with organizational policies
- Lower barrier to entry for developers new to AI agents

## Security Architecture

### Local-First by Design

| Concern | Ocean's Approach |
|---------|-----------------|
| Code exposure | All processing is local. No terminal content leaves the device. |
| Cloud dependency | None. Ocean works fully offline. |
| Account requirement | None. No registration, no login. |
| Data transmission | Zero by default. Opt-in crash reports only. |
| Telemetry | Anonymous, opt-in. Can be disabled via managed config. |

### Filesystem Security

- **Path validation** — All file I/O through Tauri commands with allowlisted directories
- **Path traversal prevention** — `../` components rejected at the Rust level
- **Symlink protection** — `write_file` refuses to write through symlinks
- **Content limits** — 1MB per write operation
- **Sandboxed sessions** — Each session's PTY runs with its own PID

### Supply Chain

- **Open source** — Full source code available for audit
- **Minimal dependencies** — Rust backend with well-known crates (serde, tokio, rusqlite, git2)
- **Code signing** — macOS builds are signed and notarized
- **Reproducible builds** — Build from source with documented process

## Deployment

### Current Platform Support

| Platform | Status | Distribution |
|----------|--------|-------------|
| macOS (Apple Silicon) | Available | DMG / .app.tar.gz |
| macOS (Intel) | Planned | — |
| Linux (x86_64) | Planned | AppImage / .deb |
| Windows | V2 roadmap | — |

### Installation Options

**Individual developer:**
```bash
# Download and install
tar -xzf Ocean_*_aarch64.app.tar.gz
mv Ocean.app /Applications/
```

**Fleet deployment (MDM):**
- Standard .app bundle compatible with Jamf, Mosyle, Kandji
- Managed configuration via plist or JSON config file
- Auto-update channel configurable (stable / beta / nightly)

## Roadmap: Enterprise Features

### Available Now (V1)
- Multi-agent workspace management
- COW filesystem isolation
- Real-time conflict detection
- Git translation layer (session → commit → PR)
- Audit logging
- Managed configuration support
- Claude Context Management UI
- Agent detection and monitoring

### Coming in V1.x
- **Enterprise SSO** — SAML/OIDC authentication for team features
- **RBAC** — Role-based access control for workspace sharing
- **Central audit aggregation** — Ship audit logs to your SIEM
- **Policy engine** — Fine-grained rules for agent behavior
- **Usage dashboards** — Organizational view of agent productivity

### V2 Roadmap
- **Team collaboration** — Shared workspace for team collaboration
- **Cloud agent orchestration** — Spawn and manage cloud-hosted agents
- **Remote sessions** — SSH-based terminal sessions with local Ocean UI
- **Plugin marketplace** — Custom connectors, output patterns, and integrations

## ROI Framework

### Quantifiable Savings

For a team of 20 developers, each running 3 AI agents daily:

| Metric | Without Ocean | With Ocean | Annual Savings |
|--------|--------------|------------|---------------|
| Worktree setup time | 15 min/dev/day | ~0 | 1,250 hours/year |
| Conflict resolution | 20 min/dev/day | 2 min/dev/day | 1,500 hours/year |
| Context switching (monitoring) | 10 min/dev/day | ~0 (ambient) | 833 hours/year |
| **Total developer hours saved** | | | **3,583 hours/year** |

At $100/hour fully loaded developer cost: **~$358,000/year** in recovered productivity.

### Qualitative Benefits

- **Reduced rework** — Conflicts caught early, not after hours of wasted agent work
- **Faster onboarding** — Standard tooling means less "how do you run agents?" conversation
- **Better code quality** — Audit trail enables meaningful review of agent-generated code
- **Risk reduction** — Managed configuration prevents runaway API costs and unsafe agent behavior

## Getting Started

1. **Pilot team**: Install Ocean on a 3-5 person team already using AI agents
2. **Baseline metrics**: Track conflict resolution time, agent setup time, and PRs shipped
3. **Deploy managed config**: Set model restrictions, budget caps, and audit requirements
4. **Measure**: Compare 2-week metrics with and without Ocean
5. **Scale**: Roll out to broader engineering organization

---

*Ocean is open-source (all rights reserved). For enterprise inquiries, deployment support, or custom integration discussions, contact the Ocean team via [GitHub](https://github.com/viveky259259/ocean-releases).*
