# Ocean Next 6 Months Plan

**Goal:** make Ocean the trusted way for developers and teams to turn AI-agent work into validated, reviewable PRs.

**Strategic wedge:** Run Project -> Agent to PR -> Trusted PR. Most execution remains local-first. Server-backed features focus on sharing team artifacts: specs, skills, workflow templates, validation policies, PR visibility, and shared workspace metadata.

## Current Starting Point

Ocean already has a strong substrate: IDE shell, spec view, Agent Canvas, workflow engine, PR runtime/view, onboarding v2, `project_understanding`, relay/RBAC, audit, diagnostics, usage tracking, and team skills.

This means the next 6 months should mostly productize and connect existing pieces rather than build a brand-new platform.

## Months 1-3: Trusted Agent-to-PR Loop

### Month 1: Run Project + Knowledge Context Pack

**Already in place:** ~55%

Deliver:

- Turn `project_understanding` into a local agent context pack.
- Add `.ocean/knowledge.md` for explicit team/project context.
- Detect setup, dev, build, test, lint, and typecheck commands.
- Add machine readiness checks for runtimes, CLIs, env vars, services, and ports.
- Connect project context to onboarding v2 and spec-to-agent launch.
- Add run/test/build verification and a short project handbook/context preview.

Success:

- Repo open -> running app/test/build time decreases.
- Most opened repos have useful commands detected.
- Most agent launches include project context.

### Month 2: Agent to PR

**Already in place:** ~50%

Deliver:

- Polish spec-to-agent launch and saved agent presets.
- Stabilize durable sessions and agent lifecycle events.
- Tighten merge-to-commit and PR creation.
- Add local validation runs: test, lint, typecheck, build, format, security scan where available.
- Store validation run history, logs, status, duration, and command metadata.
- Generate AI review summaries with cited diffs and validation evidence.
- Add basic hybrid PR risk scoring.

Success:

- Agent changes are validated before PR.
- PRs created from Ocean include validation evidence.
- Failed validations are easy to diagnose and recover.

### Month 3: Trusted PR + Team Beta

**Already in place:** ~40%

Deliver:

- Read-only PR inbox/view with diffs, checks, branch state, review decision, AI summary, risk score, and validation results.
- Required checks per workspace.
- Team validation policies with advisory, override, and hard-block modes.
- Audit/activity v0 for workspace, validation, PR, and policy events.
- Shared artifact beta: specs, skills, workflow templates, validation policies, and shared workspace metadata.
- Basic team identity/invitations and billing skeleton for design partners.

Success:

- Design partner teams use shared artifacts.
- Teams configure required-check policies.
- Read-only PR view becomes part of review flow.
- First paid pilot conversion signal appears.

## Months 4-6: Repeatable Team Platform

### Months 4-5: Team Artifacts + Workflow Validation

**Already in place:** ~45%

Deliver:

- Shared workspace metadata and team activity dashboard.
- Team project handbook backed by local context packs and shared `.ocean/knowledge.md`.
- Shared skills and workflow templates as a primary Team feature.
- Schedule triggers for local recurring workflows.
- Workflow run history polish: last runs, logs, rerun, cancel, failure summaries.
- Test-delta regression detection.
- Known failure pattern memory from validation runs and terminal history.
- Policy-driven review gates for promote, push, and PR creation.

Success:

- Teams create shared specs, skills, workflow templates, and validation policies.
- Recurring validation workflows run locally.
- Repeated setup and validation failures decline.

### Month 6: Paid Team Readiness

**Already in place:** ~25%

Deliver:

- Team billing and seat management v0.
- Team dashboard for active workspaces, PRs, failed validations, required checks, agent activity, and usage/cost summary.
- Admin controls for members, roles, validation policies, and shared artifacts.
- Usage analytics for agent runs, validation runs, PRs, AI summaries, failed runs, and spend estimates.
- Optional remote visibility v0 for pilots: see active sessions, workflows, logs, diffs, PR state, failures, and blockers.
- Linux/Windows technical discovery, without committing to full parity in this window.

Success:

- Paid pilots convert from design partners.
- Weekly active teams grow.
- Teams use Ocean for PR creation/review visibility.
- Required-check pass rate improves.
- New developer onboarding time drops.

## Explicit Non-Goals For 6 Months

- Organization-wide knowledge graph.
- Full remote bidirectional handoff/resume.
- Full in-house PR review with line comments and approvals.
- Plugin/workflow marketplaces.
- Read-only mobile companion.
- Broad Slack/Linear integrations.
- A2UI external spec push.
- Screenshot/performance regression as a general platform.
- Full Linux/Windows parity.
- Full enterprise package: SCIM, SIEM export, SLA packaging, self-hosted relay.

## North-Star Metrics

- Time from repo open to running project.
- Percent of agent changes validated before PR.
- PRs created from Ocean with validation evidence.
- Review time saved per PR.
- Shared artifacts per team.
- Required-check policies configured.
- Paid pilot conversion.
- AI spend per merged PR.

_Internal planning page. This route is intentionally not linked from public navigation and is excluded from indexing._
