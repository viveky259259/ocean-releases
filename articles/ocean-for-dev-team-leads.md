# Ocean for Dev Team Leads

**Your team adopted AI faster than your tooling. Ocean closes the gap.**

---

## You're the one holding the line.

Your developers are 2–3x more productive. That's the good part. The rest of the story is what keeps you up at night.

- Every dev on your team runs agents differently. One uses tmux + git worktrees. One lives in Cursor. One has a shell script no one else understands. Onboarding a new hire means teaching them four personal workflows that weren't designed to coexist.
- PR volume is up, but half the PRs are tangled — two features welded together because the dev couldn't figure out how to split them. The other half contain subtle conflicts from agents touching the same files.
- You want to answer the simple question "is AI actually making us faster?" and you can't, because nobody's measuring anything.
- When something breaks in production, "which agent wrote this, in which session, with which prompt?" is unanswerable.
- Leadership asks about AI cost. You can point to an API invoice. You can't tell them which team, which feature, or which dev drove the spend.

The agents aren't the problem. The absence of a shared surface is.

## What Ocean gives you

**A standardized, observable, ship-safe multi-agent workflow — for the whole team.**

Ocean replaces "everyone's custom setup" with one app that every developer can use the same way. Agents run in isolated sessions. Conflicts are flagged in real-time. Every operation is audited. Every PR goes through the same `Cmd+Shift+S` path. You still let your team move fast — you just get a floor under them.

### What that looks like

| Team problem | Before Ocean | With Ocean |
|---|---|---|
| Every dev has a different setup | 6 different workflows on a 6-person team | One app. Customizable shortcuts, shared templates |
| Silent conflicts between parallel agents | Caught at merge time, often rebased away | Detected live, before the second agent builds on a broken foundation |
| No visibility into agent spend | Monthly API invoice, no breakdown | Token + dollar cost per session, workspace, dev |
| Onboarding a new hire takes days | "Here's my tmux config, good luck" | Install Ocean. Done. |
| PRs are messy and hard to review | Agents + humans sprayed commits everywhere | Merged sessions produce clean, intentional PRs |
| Compliance asks "what did that agent do?" | No good answer | Immutable audit log, JSONL export |

### What ships today

- **Session DAG.** Every session your team runs — per dev, per agent, per experiment — is a node in a shared graph (`Cmd+Shift+G`). When a dev asks "how do I split this branch of work?" or "can I roll this experiment back?", the answer is a visible, navigable structure instead of a `git reflog` archaeology dig.
- **Copy-on-write session isolation.** Every agent gets an APFS clone of the repo. No git worktrees, no duplicated `node_modules`, no "is the server still running on port 3000?" Sessions cost kilobytes and spawn in milliseconds.
- **Agent detection for 8+ agents.** Claude Code, Cursor, Aider, Codex, Copilot, Cody, Gemini, Devin. Badges, lifecycle state, waiting notifications, per-agent token/cost tracking.
- **Real-time conflict detection and 3-way merge.** When two sessions modify the same file, your dev knows immediately. Hunk-level resolution. One-click AI merge for tricky ones.
- **File locks and merge queue.** Declare "this file is mine while I'm on this session"; queue merges so two devs don't race into main. Coordination for your team's actual race conditions, not just their filesystem ones.
- **Ship to PR workflow.** Merge N sessions → generate commits → push branch → open PR. Keyboard-driven. Consistent across the team.
- **Workflow engine.** TOML-defined multi-step agent pipelines with event triggers (`git.push`, `pr.opened`, `schedule.daily`) and a visual DAG editor. Encode your team's release rituals — "on `pr.opened`, run tests, summarize the diff, assign reviewers" — as executable workflows your whole team inherits.
- **Three-tier plugin system.** MCP servers, WASM modules, and native Rust plugins. Ship internal tools to your team today — a shared marketplace is the V1.x addition, not the plugin runtime itself.
- **Workspace templates + managed configuration.** Encode your team's conventions once, at four levels (system → user → workspace → session). New devs inherit the team baseline without reading a wiki.
- **Session recording and replay.** Every session's terminal output and agent activity is captured. Post-mortems on "what did that agent do?" stop being a guessing game.
- **Audit log.** Every session, every command, every merge, every git op. JSONL export for compliance and post-mortems.
- **Usage quotas and budget alerts.** Per-session and per-workspace limits. 50/75/100% alerts. No more surprise API bills.
- **101 IPC commands.** Every operation is scriptable. Wire it into your CI, your pre-commit hooks, your internal tooling.
- **Ambient status bar.** System metrics, git state, network, per-agent status. Your team can tell at a glance what's actually running.
- **Local-first.** Nothing leaves the developer's machine unless they ask it to. Security review passes faster.

### What's arriving next (V1.x)

- **Teams / shared workspaces.** Real-time presence and shared state across a team, via a relay server you can self-host.
- **Plugin marketplace.** One-click install surface on top of the shipped plugin runtime.
- **Advanced Workflow Skills panel.** Drag-to-reorder skills, live per-task timers layered on today's workflow engine.
- **Windows and Linux builds.**

## Why this matters for *you* specifically

You don't need Ocean to make your team faster — they already are. You need Ocean to keep the speed *compounding* instead of collapsing under its own weight. Every week without a shared surface, your team accrues another layer of personal-workflow debt that someone has to maintain.

Ocean is the consolidation step.

## Pricing

Ocean is free during the beta. **Beta teams keep Ocean Platform free forever.** Bring your whole squad. If you're in before we lock this in, you're in.

## Get it

- Download: [github.com/viveky259259/ocean-releases/releases](https://github.com/viveky259259/ocean-releases/releases)
- Docs: [viveky259259.github.io/ocean-releases](https://viveky259259.github.io/ocean-releases)
- Talk to us about team pilots: open an issue or reach out via the website.

macOS today (Apple Silicon and Intel). Windows and Linux coming soon.
