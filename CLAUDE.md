@AGENTS.md

# Claude Code runtime contract

For every non-trivial change, read `docs/engineering/CLAUDE_CODE_WORKFLOW.md` and the matching work packet under `docs/plans/active/` before implementation.

- Start unfamiliar or non-trivial work in plan mode.
- Do not edit on `main`; use a focused branch.
- Implement one approved task at a time and update the specification before changing scope.
- After implementation, use the `evaluator` subagent in a clean context; the evaluator reports findings and never fixes them.
- Do not force-push, merge, deploy production or access secrets autonomously.
- A task is complete only after the required evidence, human approval and production verification where applicable.
