# Ocean for Non-Technical Builders

**You build with AI. Ocean is the control surface for your AI team.**

---

## The new builder doesn't write most of the code.

You're a founder, a PM, a designer, a solo creator. Maybe you've never called yourself an engineer, or maybe you were one a long time ago and you prefer to think in problems, not syntax. Either way, you've already figured out the thing most engineering orgs are still in denial about: **AI agents can write most of the code**. You describe what you want, Claude or Cursor drafts it, you iterate.

That's a huge leap. But as soon as you try to do it *seriously* — ship a real product, not a demo — the ground gives out.

- You open a terminal because the tutorial said to, and you're staring at a wall of black text wondering which command was the safe one.
- Your agent edits the code, something breaks, and now you're debugging something you didn't write.
- You want two agents working at the same time — one on the landing page, one on the backend — and now they've overwritten each other.
- You finish a feature, and the words "git," "merge," and "pull request" stand between you and shipping it.

The problem isn't your skill level. The problem is that your tools were built for people who write code by hand. You're doing a different job.

## What Ocean gives you

**A visual surface for the AI team building your product.**

Ocean replaces "one dark terminal" with a real app. Every agent is a named, visible session. You see who's working, what they're changing, and whether something needs your attention. When agents disagree, Ocean flags it — and a single button asks Claude to resolve the conflict for you. When a feature is done, one keystroke turns it into a pull request.

You don't need to learn git to use Ocean. You need to learn Ocean.

### What that looks like

| Job | The old way | The Ocean way |
|---|---|---|
| Know what your AI just did | Read scrollback, guess | Status badges, activity timeline, file-change feed |
| Run two agents without breaking each other | You can't, really | Each agent gets its own isolated copy of the code |
| Resolve a conflict | Call a developer | Click "AI Merge" — Claude fixes it |
| Ship a change | `git add`, `git commit`, `git push`, open PR | `Cmd+Shift+S` |
| Know what it's costing you | Check your API dashboard later | Token count and dollar cost visible per session |

### Why the details matter to you

- **Claude Native (A2UI).** Claude talks back to you through interactive UI — buttons you can click, forms you can fill, diffs you can approve. Not command-line flags. Not cryptic output.
- **Copy-on-write isolation.** Every agent gets its own snapshot of your project. They literally cannot overwrite each other's work. No merge drama from the gate.
- **Session DAG — see your project as a tree, not a terminal.** Every agent and every experiment shows up as a node you can inspect, branch from, or throw away. `Cmd+Shift+G` opens the visual map of everything in flight. When someone asks "how did we get here?", the answer is on screen.
- **Workspaces.** Your landing page, your backend, and your marketing site live in separate workspaces — each with its own agents, its own budget, its own settings. Switching projects takes one click, not ten.
- **Git visualizer.** You don't have to *think* in branches and commits. Ocean shows you a picture of your project's history and lets you point at what you want to ship.
- **Real-time conflict detection.** If two agents do touch the same file, Ocean tells you *as it happens*, not after you've spent two hours going the wrong direction.
- **Ship to PR.** You don't have to understand git. Ocean translates "I'm done with this feature" into a clean pull request automatically.
- **Command palette (`Cmd+Shift+P`).** One keystroke, type what you want — "open landing page", "stop agent", "ship to PR". No menu hunting, no cheat sheets.
- **Budget controls.** Set a token budget per project. Ocean warns you at 50%, 75%, 100%. You don't wake up to a surprise bill.
- **Local-first.** Your code and your prompts stay on your machine. Ocean doesn't ship anything to a cloud you don't know about.

### What you *don't* need to learn

- tmux
- git worktrees
- Shell aliases
- What a merge conflict "really is"
- Which terminal tab has the agent that's still running

Ocean handles those. You stay focused on what the product should do.

## Pricing

Ocean is free during the beta. **If you join during the beta, you keep Ocean Platform free forever.** Bring your co-founder, your designer, your first intern — they're free forever too.

## Get it

- Download: [github.com/viveky259259/ocean-releases/releases](https://github.com/viveky259259/ocean-releases/releases)
- Docs: [viveky259259.github.io/ocean-releases](https://viveky259259.github.io/ocean-releases)

macOS today (Apple Silicon and Intel). Windows and Linux are coming soon.
