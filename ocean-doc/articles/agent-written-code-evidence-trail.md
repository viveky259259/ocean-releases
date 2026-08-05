# The New Engineering Risk: Agent-Written Code With No Evidence Trail

**AI can generate the branch. It cannot carry accountability for the merge. That is now the engineering leader's problem.**

![Engineering team reviewing a pull request with missing validation evidence while AI-generated branches flow toward review.](images/evidence-trail-blog-header.png)

A pull request lands in review.

The diff looks reasonable. The description is confident. The implementation seems to follow the ticket. Maybe the tests are green. Maybe the author says, "Claude wrote most of this," or "Copilot handled the first pass."

Now comes the uncomfortable question.

What exactly was checked before this reached review?

Not what changed. The diff shows that.

Not who clicked merge. GitHub shows that.

The real question is: what evidence exists that the agent understood the task, touched the right files, ran the right checks, and noticed the risks before a human reviewer inherited the work?

For many teams, the answer is thin.

And that is the new engineering risk: agent-written code with no evidence trail.

## AI Code Is Not The Problem

The easy argument is that AI-generated code is risky because AI makes mistakes.

That is true, but incomplete.

Humans make mistakes too. Junior developers make mistakes. Senior developers make mistakes after a long day and too many context switches. Engineering systems were built around that reality. We have branches, pull requests, CI, tests, code owners, approvals, release gates, and incident reviews.

The issue is not that AI produces imperfect code.

The issue is that AI can produce code faster than the surrounding evidence system can explain it.

GitHub's documentation for [Copilot coding agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent) describes workflows where an agent can research a repository, create a plan, make code changes on a branch, and move toward a pull request. That is powerful. It also changes the shape of engineering work.

A human developer usually carries context in messy but useful ways. They remember the tradeoff they made. They know which test failed first. They know why they avoided one file and changed another. They can explain the edge case they worried about.

An agent may have gone through similar steps.

But unless those steps are captured, the reviewer only gets the final artifact.

And a final artifact is not enough.

## The Pull Request Was Not Designed For This Volume

The pull request became the default unit of engineering accountability because it is simple: show the diff, discuss the change, run the checks, approve or reject.

That worked well when the bottleneck was mostly writing code.

But AI coding agents shift the bottleneck. The expensive part becomes understanding whether the generated code deserves trust.

A [2026 longitudinal study on arXiv](https://arxiv.org/abs/2607.01904), based on one enterprise setting, found that AI adoption was associated with a major increase in pull request throughput and a meaningful increase in review load. Treat that as one data point rather than universal truth, but the pattern is familiar: code creation is getting cheaper, while review attention is not.

That creates a quiet failure mode.

Teams celebrate more PRs. Managers see more activity. Developers feel faster. But reviewers become the compression layer for everything the agent did not document.

That is not acceleration. That is debt moving downstream.

## The Evidence Trail Is The Missing Layer

An evidence trail is not a longer PR description.

It is not "I ran tests" written in a comment.

It is a structured record of what happened before review.

![A six-stage evidence trail: prompt, files changed, commands run, tests passed, risks flagged, reviewer handoff.](images/evidence-trail-infographic.png)

At minimum, teams should want to know:

- What prompt or task did the agent receive?
- What files did it inspect before editing?
- What files did it change?
- What commands did it run?
- Which tests passed?
- Which tests failed first?
- What assumptions did it make?
- What risks did it flag?
- What areas did it avoid because it lacked confidence?

This does not need to be heavy enterprise governance. In fact, if it feels like paperwork, developers will avoid it.

The best version is automatic, local, and close to the developer workflow. Evidence should be created while the work happens, not reconstructed after someone gets nervous in review.

Because by the time a reviewer asks, "Did we check this?" the context is already cooling.

## "CI Passed" Is Not The Whole Story

CI is necessary. It is not sufficient.

A green build tells you the configured checks passed. It does not tell you whether the agent chose the right approach. It does not tell you whether it skipped a relevant test because the environment was annoying. It does not tell you whether the agent changed three files after reading only one.

Code review has the same limitation. A reviewer sees the diff. They may not see the path taken to arrive there.

This matters even more for software service companies and consultancies.

When a client asks, "How do you verify AI-generated code before delivery?" a confident answer cannot be: "Our developers review it."

That may be true. It is not differentiated. It is not very reassuring. And as AI usage becomes normal, clients will expect more than good intentions.

They will expect process.

More specifically, they will expect evidence.

![A detective-style engineering desk with code diffs, terminal logs, and test results pinned as evidence.](images/engineering-evidence-desk-concept.png)

## The Accountability Gap

Here is the hard truth for engineering leaders:

AI can generate code, but it cannot absorb accountability.

If agent-written code causes a production issue, the incident review will not end with, "The model did it."

The team owns the outcome. The VP Engineering owns the system. The CTO owns the risk posture. The consultancy owns the client impact.

That means AI coding needs to be treated like a new contributor class inside the engineering workflow.

Not a person. Not a toy. Not a magical intern.

A contributor class.

And every contributor class needs rules for trust.

For humans, those rules include code review, tests, ownership, onboarding, and judgment. For agents, we need an additional layer: proof of validation before the code reaches the human review bottleneck.

## What Leaders Should Ask This Week

If your team is using Cursor, Claude Code, Copilot, Codex, or any agentic coding tool, ask five simple questions:

- When an agent writes code, where is the work validated before PR review?
- Can reviewers see what checks were actually run?
- Can tech leads distinguish human-written and agent-heavy changes?
- Do we know which types of tasks agents are safe to handle?
- Could we explain our AI code quality process to a client or auditor?

If those answers are vague, the issue is not that your team is careless.

It means your workflow was built for a previous era.

Most teams added AI coding tools before they redesigned the accountability system around them. That is understandable. Adoption moved fast.

Now the process has to catch up.

## The Teams That Win Will Not Be The Ones That Generate The Most Code

They will be the teams that create the most trustworthy path from idea to merge.

That means faster generation, yes. But also clearer validation. Better handoffs. Cleaner review queues. More useful context for senior engineers. Fewer mystery diffs.

AI coding is becoming normal engineering work. The next question is whether the work arrives with evidence or whether reviewers are forced to become detectives.

A diff shows what changed.

An evidence trail shows why the team should trust it.
