# Ocean for Enterprise Buyers

**Your engineers are already running AI agents. Ocean makes that safe, auditable, and scalable.**

---

## The AI agent footprint inside your company is already bigger than you think.

Walk a floor of your engineering org and you will find Claude Code, Cursor, Copilot, Aider, Codex, and a handful of internal agents, all running on corporate laptops, against corporate repos. Most of this happened without procurement, without a security review, and without a plan.

The productivity upside is real. The exposure is also real.

- **No isolation.** Multiple agents working on the same repo step on each other, silently. Merge conflicts become production bugs.
- **No audit trail.** When a regression lands, you cannot answer "which agent, which prompt, which dev." Code review is not enough.
- **No cost control.** Individual developers authorize API spend. Finance sees a line-item they can't decompose by team, feature, or project.
- **No standardization.** Every team has invented its own tmux/worktree workflow. Tooling cost compounds with every new hire.
- **No exit strategy.** If an agent vendor ships a bad update, you have no centralized way to pin versions or block it across the org.

The agents aren't going away. The current tooling was not built for them. You need a surface that gives leadership, security, and IT *jurisdiction* over AI-assisted development without slowing the devs down.

## What Ocean gives you

**An enterprise-grade platform for multi-agent development. Local-first. Auditable. Standardized.**

Ocean is a native desktop application (macOS today, Windows and Linux on the roadmap) that sits on every developer's machine as the single entry point for running AI agents against company code. It isolates each agent, detects conflicts in real time, logs every operation, and ships cleanly to a pull request.

You do not deploy a cluster. You do not ship code to a vendor cloud. You install an app.

### The enterprise capability surface

#### Shipped today

- **Local-first execution.** All sessions, all merges, all state. Nothing leaves the developer's machine unless the developer explicitly pushes to your git remote. No vendor cloud is in the critical path.
- **Session DAG.** Every agent session is a node in a directed acyclic graph. Fork, branch, and roll back are first-class operations — not `git reflog` archaeology. For security and IR teams, this means *every unit of agent work has a stable identity* an audit log entry can point at.
- **Copy-on-write isolation.** Every agent gets its own APFS filesystem snapshot. Agents cannot cross-contaminate work. Setup cost per agent is ~kilobytes; it enables *real* parallelism at scale.
- **Immutable audit log.** Every command, session lifecycle event, git operation, merge, and configuration change is recorded. JSONL export for compliance pipelines, SIEM ingestion, or post-mortems.
- **Session recording and replay.** Terminal output, commands, and agent activity are captured per session. When an incident lands, forensics is not an interview — it's a replay.
- **Four-tier managed configuration as a policy surface.** System → user → workspace → session precedence. IT can pin model choice, restrict remote endpoints, lock down plugins, and seed workspace defaults from a single system-level file. Developers cannot silently override policy.
- **Workflow engine.** TOML-defined multi-step agent pipelines with event triggers (`git.push`, `pr.opened`, `schedule.daily`) and a visual DAG editor. Use it as a compliance gate — e.g., run a secret-scan skill on every `git.push`, block merges that fail, log both outcomes to the audit stream.
- **Three-tier plugin system with a permission model.** MCP servers, WASM modules, and native Rust plugins, all gated by managed configuration. Internal tools can be shipped to the org today; the marketplace surface is V2.
- **Usage quotas and budget controls.** Per-session and per-workspace token budgets. Alerts at 50/75/100%. Stops runaway agent spend before it shows up on the invoice.
- **Agent detection and observability.** 8+ agents detected automatically (Claude Code, Cursor, Aider, Codex, Copilot, Cody, Gemini CLI, Devin). Per-agent status, health, token cost, and activity timeline.
- **Real-time conflict detection.** Divergent changes are flagged the moment they happen, with a 3-way merge engine and optional AI-assisted resolution. File locks and a merge queue prevent racing sessions from stomping shared files.
- **101 IPC commands.** Every operation is scriptable. Policy enforcement, pre-commit gates, CI integration, and internal automation all sit on a stable command surface.
- **Built with Rust + Tauri.** Small attack surface, ~60 MB idle memory, ~65,000 lines of code — an order of magnitude lighter than Electron alternatives. Backed by 2,937 tests (977 Rust + 1,960 frontend).

#### On the near-term roadmap (V1.x)

- **SSO via WorkOS.** Google, GitHub, Microsoft. For teams and enterprise tenants.
- **Teams and shared workspaces** with a relay server customers can self-host.
- **Org-level allowlists** for models and plugins surfaced through a first-class admin UI (the underlying policy hooks are shipped today via managed configuration).
- **Admin console** for seat management, usage dashboard, and audit export.
- **Windows and Linux builds.**

#### Deferred (V2, scoped on customer demand)

SAML / SCIM, SOC 2 Type II, and on-premise deployment are on the V2 track and will be prioritized in response to concrete enterprise requirements.

### Why this beats the alternatives

| Capability | "Let devs pick their own tools" | Warp-class terminals | Ocean |
|---|---|---|---|
| Native multi-agent isolation | No | No | Yes (COW filesystem) |
| Real-time conflict detection | No | No | Yes |
| Immutable audit log | No | Partial / cloud-based | Yes, local + exportable |
| Standardized "ship to PR" | No | No | Yes (`Cmd+Shift+S`) |
| Local-first (no vendor cloud) | Varies | No | Yes |
| Usage quotas per agent / session | No | No | Yes |
| Scriptable policy enforcement | No | Limited | 101 IPC commands |
| Memory footprint | Variable | 300+ MB (Electron) | ~60 MB (Rust + Tauri) |

### What procurement and security get

- **Data flow:** Code and prompts stay on the developer's machine. No telemetry pipeline is required to use Ocean.
- **Audit:** Exportable JSONL audit log per workspace, per user, with tamper-evident sequencing.
- **Configurability:** Org-level policies via managed configuration files. No "developer can override" footguns.
- **Licensing:** Proprietary license. Commercial use allowed. Redistribution restricted. Source stays in our private repo.

## Pricing

Ocean is currently in beta and free. **Beta teams — including enterprise pilots that start during beta — keep Ocean Platform free forever for that team's current seats.** Future-priced seats will apply to net-new seats added after GA.

For enterprise pilots, we'll set up a direct line: a named engineer from our side, a Slack Connect channel, and a rollout plan tuned to your environment.

## Next steps

- **Pilot**: Pick a team of 5–15 developers, install Ocean, run for two weeks. We'll help you set up workspace templates and audit export.
- **Evaluation kit**: We can provide a security whitepaper, data-flow diagram, and audit-log schema on request.
- **Download and try first**: [github.com/viveky259259/ocean-releases/releases](https://github.com/viveky259259/ocean-releases/releases)
- **Docs**: [viveky259259.github.io/ocean-releases](https://viveky259259.github.io/ocean-releases)
- **Contact**: open an issue on the releases repo, or reach out via the enterprise page.

Ocean runs on macOS (Apple Silicon and Intel) today. Windows and Linux are on the roadmap.
