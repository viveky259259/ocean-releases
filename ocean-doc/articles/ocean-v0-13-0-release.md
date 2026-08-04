# Ocean v0.13.0 — What's New

Released: 2026-04-20

## Save Session as Agent

You can now persist a successful session as a custom Agent. This allows you to "prime" a session with specific context, tools, and instructions, and then save that entire state as a reusable template for future tasks.

## LLM Chat Panel & Smollm

- **Generic Chat Panel** — A new persistent chat interface that works alongside your terminal panes.
- **Ocean-Smollm Plugin** — Integrated support for local Smollm execution via a dedicated plugin.
- **BYOK DB Storage** — Bring Your Own Key (BYOK) database storage for chat history and session metadata.

## Software Review Skill

A new specialized skill for comprehensive codebase audits. Trigger a software review to have an agent walk your entire codebase, identify architectural smells, security vulnerabilities, and logic bugs, and provide a detailed report in a structured A2UI format.

## Agent API & Workflows

- **ocean_create_workflow tool** — Agents can now programmatically create and trigger multi-step workflows.
- **Session Primer** — Improved initial context injection for new agent sessions.

## Automation & Secrets

- **WorkOS Env Split** — Improved handling of environment variables and secrets across development and production environments.
- **Compile-time Secrets** — Enhanced security for sensitive keys during the build process.
- **Preflight & Ship Automation** — Fully automated pre-release checks and shipping workflows.

---

*Ocean is private software and local-first. [Learn more](https://docs.getocean.dev)*
