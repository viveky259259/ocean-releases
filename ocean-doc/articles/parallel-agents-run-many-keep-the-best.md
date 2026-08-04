# Parallel Agents: Run Many, Keep the Best

**One agent, one attempt, one answer you hope is right. But the same prompt to the same model gives a different result every time — and on a hard, ambiguous task, the first rollout is rarely the best one. Good engineers try three approaches and keep the winner. Your agents should too.**

---

Running agents serially bets everything on a single rollout. LLMs are stochastic: ask five Claudes to refactor the same auth flow and you get five different attempts — one elegant, two mediocre, one that misreads the task, one that's almost right. Pick the first and you're gambling. Run all five, compare, and keep the best, and you've turned a gamble into a selection problem.

That's parallel agents: **spawn N agents on the same task in isolated workspaces, then promote the best result.** This guide covers the trade-offs — and exactly how to do it in Ocean.

## Why Run Agents in Parallel

- **Best-of-N quality.** Sampling the distribution and picking the top result beats a single draw. For ambiguous tasks, best-of-5 routinely clears a bar a single attempt misses.
- **Explore different approaches.** Give each agent the same goal and they take different routes. You see the solution space, not one point in it.
- **Wall-clock speed on independent work.** Three unrelated subtasks done concurrently finish in the time of the slowest, not the sum.
- **Fault tolerance.** One agent wedges on a bad path; the others still deliver. No single point of failure.

## The Costs (Be Honest About Them)

- **N× the tokens.** Five agents cost roughly five times the spend. Parallelism buys quality and speed with money.
- **Review burden.** Now you have five diffs to compare instead of one. Without good tooling this overhead eats the gains.
- **Coordination on shared files.** Agents editing the same files create conflicts you have to resolve before merging.
- **Diminishing returns.** Best-of-3 is a big jump over 1; best-of-20 is rarely worth 20×. Most tasks plateau between 3 and 6.

## When to Do It — and When Not To

**Do it when:**
- The task is **high-variance or ambiguous** — design, refactors, "make this better," anything with judgment.
- **Correctness matters and you'll judge the output** (ideally with an eval — see below).
- The work splits into **independent subtasks** that don't touch the same files.

**Don't bother when:**
- The task is **trivial or deterministic** — one correct answer, no judgment. One agent is fine.
- The work is **tightly sequential** — each step depends on the last. Parallelism just multiplies cost with no benefit.

## How to Do It in Ocean

Ocean runs parallel agents as first-class sessions. Each spawned agent gets its own **copy-on-write clone** of your code, so they can't step on each other until you decide to merge.

### 1. Spawn a batch

From the **Sessions** panel, choose **Spawn parallel Claudes**. Pick how many (1–25), and optionally type one task in plain language — it goes to every session once Claude is ready.

![The Spawn parallel Claudes dialog: choose a session count and an optional shared prompt.](images/parallel-spawn-batch.png)

Each session starts in its own isolated COW workspace — no `npm install` per worktree, no port collisions, no 2 GB of duplicated state per agent.

### 2. Broadcast a prompt to all of them

Already have sessions running? **Broadcast** sends one prompt to every active session at once, so you steer the whole fleet without retyping.

![The broadcast dialog sends a single prompt to every running session.](images/parallel-broadcast.png)

### 3. Compare with an N-way diff

When they finish, you don't read five diffs by hand. The **parallel diff** panel lines up every session's changes side by side so you can see how the approaches differ and which one is cleanest.

![The N-way diff panel compares every parallel session's changes side by side.](images/parallel-diff.png)

### 4. Promote the winner

Pick the best result and promote it — its changes merge to your target, the rest are discarded. One clean result out of N attempts.

### 5. Save the winner as a reusable agent

Found a setup that works? Save it as an agent and re-run it later without rebuilding the prompt.

![The Agents panel: save a winning session as a reusable agent.](images/parallel-agents-panel.png)

## Pair It With Evals to Pick Objectively

Eyeballing five diffs is still subjective. Combine parallel agents with Ocean's [`eval.run` workflow task](article.html?id=gating-agent-workflows-with-mastra-evals): score each result and promote the highest — **best-of-N, decided by a number, not a hunch.**

## Takeaways

- Parallel agents turn a stochastic gamble into a selection problem: run N, keep the best.
- Worth it for ambiguous, high-variance, or independent work; skip it for trivial or tightly-sequential tasks.
- The cost is real — N× tokens and more diffs to review — so let the tooling (COW isolation, N-way diff, eval-based promotion) carry the overhead.
- In Ocean: **Spawn parallel Claudes → broadcast → N-way diff → promote the winner.**

Stop betting on one rollout. Run a few, and keep the one that's actually good.
