# Don't Ship What You Can't Measure

**An agent just rewrote your function, summarized a PR, or answered a question from your codebase. Is the output correct? At one task, you read it. At fifty chained in a workflow, you don't — you skim, you trust, and a wrong answer flows into a commit, a ship, a customer.**

---

That's the gap. Agentic workflows are great at producing output and silent about whether the output is any good. A shell step has an exit code. An LLM step has vibes.

Ocean closes that gap with one move: **run an eval as a workflow task and gate the next step on its score.** If the agent's answer isn't faithful to the source, the workflow stops. You get a number, a reason, and a hard pass/fail — not a feeling.

This guide walks a faithfulness check end to end using Ocean's `eval.run` task, backed by [Mastra](https://mastra.ai)'s scorer library — including what failure looks like, because you'll see those errors before you see a green run.

## What You'll Get

A workflow that scores an answer against its source and only proceeds when the score clears a threshold:

```toml
[workflow]
name = "Mastra eval smoke"

[tasks.judge]
tool = "eval.run"

  [tasks.judge.tool_args]
  scorer  = "faithfulness"
  input   = "What is the capital of France?"
  output  = "The capital of France is Paris."
  rubric  = "Paris is the capital and most populous city of France."
  pass_if = "score > 0.8"
```

Paste that into a new workflow in Ocean's Workflows panel and run it. The `judge` task calls a real Mastra faithfulness scorer, returns `{ score, reason }`, and — because of `pass_if` — exits 0 or 1 so the rest of your DAG can branch on it.

## The One Concept: `eval.run` Is Just a Task

You don't learn a new system. An eval is a task like any other, with a `tool` and `tool_args`:

| Field | Required | What it does |
|---|---|---|
| `scorer` | yes | Which Mastra scorer to run: `faithfulness`, `answer-similarity`, `answer-relevancy`, `hallucination`, `bias`, `context-relevance` |
| `input` | yes | The question or task the agent was given |
| `output` | yes | The agent's answer — the thing being judged |
| `rubric` | no | Source/context the scorer judges against (e.g. ground truth for faithfulness) |
| `pass_if` | no | A threshold expression — `score > 0.8`, `score >= 0.9`, `score < 0.5`. Sets the task's exit code so downstream tasks gate on it |

`faithfulness` answers: *is every claim in the output supported by the rubric?* Hallucinated a fact the source doesn't back? The score drops. Want to fail the run when that happens? `pass_if = "score > 0.8"`. Now a hallucination is a red task, not a silent commit.

To score several things in one round-trip, use `eval.batch` with a `scorers` array.

## Run It, Read It

Save the workflow, hit run, open the execution dashboard, and expand the `judge` task. A clean run shows the scorer's verdict in the output panel — for example:

```
judge — Running: eval.run
        { "score": 0.93, "reason": "Both claims are directly supported by the provided context." }
        Passed (exit 0)
```

The score varies with the answer — that's the point. Change `output` to `"The capital of France is Berlin."` and re-run: the score collapses, `pass_if` fails, and the task goes red. You just turned "the agent might be wrong" into a build break.

## What Failure Looks Like (Read the Error Codes)

You will hit errors before you hit a green score, and the messages are precise on purpose. Two you'll likely see first:

**No key configured.**

```
eval.run: sidecar rpc error code=2: scorer faithfulness failed:
  Scorer Run Failed: reverse rpc error 11: no API key configured
  (Settings → env → bundled all empty)
```

This is the whole pipeline working — the workflow ran the scorer, the scorer asked for an LLM completion, and the completion layer found no credential. Add an Anthropic API key in **Ocean → Settings** and re-run.

**Key rejected.**

```
eval.run: ... reverse rpc error -32603: provider returned 401 Unauthorized
```

The key was sent and the provider rejected it. Use a real Anthropic API key (`sk-ant-api03-…` from the console), not a session or OAuth token. Sanity-check the key directly:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":8,"messages":[{"role":"user","content":"hi"}]}'
```

`200` means the eval will run; `401` means the key is the problem. The error codes (`11` = no key, `2` = scorer failed, `-32603` = provider error) are stable, so you can read a failed eval without guessing.

## How It Stays Safe

The scorer runs in a separate Mastra process, but that process is **keyless**. When a scorer needs an LLM call, it routes the request back into Ocean, which attaches your key and forwards it. The eval engine never sees your credentials; they never leave the app. Telemetry from the eval framework is disabled at startup. You get the scorer library without handing a third-party process your keys.

## Takeaways

- An eval is a workflow task: `tool = "eval.run"`, give it `scorer`, `input`, `output`.
- Gate on it with `pass_if = "score > 0.8"` — a low score becomes a failed task, not a silent bad answer.
- Pick the scorer to the failure you fear: `faithfulness` and `hallucination` for "did it make things up," `answer-relevancy` for "did it answer the question."
- Read the error codes literally — `11` no key, `401` bad key, `2` scorer failed.

Stop trusting agent output you can't measure. Put a number on it, and let the workflow enforce the bar.
