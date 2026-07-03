# Ocean v0.15.0 — What's New

Released: 2026-07-03

## Release Overview

Ocean v0.15.0 is a feature release focused on persistent sessions, production Mastra evals, and a harder release pipeline. It makes long-running agent work more resilient, gives workflows measurable quality gates, and ships a signed, notarized macOS build with updater metadata.

## Key Changes

- **Persistent session manager** — Ocean can track and recover long-running shell and agent sessions with clearer health controls, focused session management, and restart paths for stuck work.
- **Mastra eval sidecar** — The production sidecar is bundled, signed, verified, and lazy-installed so workflows can run `eval.run` and `eval.batch` scorers from Ocean.
- **Workflow quality gates** — Mastra-backed scorers can now fail a workflow task when an answer misses the configured bar, turning agent output quality into a measurable gate.
- **Configured AI providers** — AI-powered features now share the configured provider path more consistently across the app.
- **Release hardening** — The build now signs the Mastra sidecar with the Tauri updater key, cleans stale signatures, skips empty native plugin placeholders during macOS signing, and serializes env-sensitive Rust tests.

## Why It Matters

Agentic work is increasingly long-running and multi-step. v0.15.0 gives Ocean a stronger foundation for that style of development: sessions survive more cleanly, evals make automated work auditable, and the release process is strict enough to catch signing, notarization, and updater mistakes before users do.

## Related Guides

- [Don't Ship What You Can't Measure](gating-agent-workflows-with-mastra-evals.md) explains how to use Mastra-backed evals as workflow gates.
- [Parallel Agents: Run Many, Keep the Best](parallel-agents-run-many-keep-the-best.md) pairs well with the new session reliability work.

---

*Ocean is private software and local-first. [Learn more](https://docs.getocean.dev)*
