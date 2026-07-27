# MoneyFlow Spec Kit integration pilot

This directory records how the MFVN-003 pilot uses GitHub Spec Kit without making CycleWarden a second specification engine.

## Pinned reference

- Project: `github/spec-kit`
- Reference release: `v0.8.14`
- Integration: Codex skills mode
- Official target structure: `.agents/skills/speckit-<command>/SKILL.md`
- Feature artifacts: `specs/003-calm-ledger-foundation/`

The release is pinned for reproducibility; this file does not claim it is the newest available release.

## Reproduction command

From a local checkout with Python 3.11+, `uv`, Git and Codex CLI available:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.8.14
specify version
specify init --here --force --integration codex --integration-options="--skills"
```

The execution environment used to prepare this pilot could access GitHub through the repository connector but could not resolve external hosts from its shell. Therefore the CLI installation itself was not falsely claimed as executed. The feature documents were created from the official `v0.8.14` constitution, specification, plan and task patterns and should be compared with locally regenerated output before this integration is adopted permanently.

## Responsibility boundary

```text
CycleWarden
→ assessment, initiative validity, dependency order, one current task, owner acceptance

Spec Kit
→ constitution, feature specification, implementation plan, user-story tasks

Codex
→ implement only the current task

MoneyFlow repository
→ lint, typecheck, tests, build, browser/UI audit

Owner
→ accept, merge and deploy
```

## Current handoff

- CycleWarden task: `MFVN-003`
- Spec Kit feature: `specs/003-calm-ledger-foundation/`
- Current Spec Kit task: `T001`
- Allowed output: `specs/003-calm-ledger-foundation/token-inventory.md`
- Forbidden during T001: application-code changes, landing redesign, auth edits, new libraries or later Calm Ledger slices

## Pilot decision criteria

After T001 and at least one implementation task, record:

1. whether Spec Kit made scope and acceptance clearer than the existing issue alone;
2. whether the artifacts duplicated repository truth excessively;
3. whether Codex stayed within the selected task;
4. whether a fresh session could continue from the artifacts;
5. whether preparation time was justified;
6. whether CW should integrate, wrap minimally or drop Spec Kit support.
