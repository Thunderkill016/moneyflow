# CodeQL and repository-ruleset alignment — completed

- **Execution state:** completed
- **Owner:** Thunderkill016
- **Implementation PR:** #230
- **Merged commit:** `68139646977f91aa4fbb9d21d03ba97f4ea217c8`
- **Completed:** 2026-08-02

## Outcome

MoneyFlow now performs and uploads a real JavaScript/TypeScript CodeQL analysis for every pull request. Application, database and browser verification remain risk-proportional.

## Problem resolved

The repository ruleset rejected documentation-only pull requests even when the stable CodeQL job name was green, because both CodeQL initialization and analysis had been skipped and no code-scanning result existed for the exact head or merge candidate.

PR #230 removed that false-green path without changing branch protection or bypassing the provider rule.

## Implemented boundary

- `.github/workflows/codeql.yml` always runs `Initialize CodeQL` and `Analyze`;
- the stable check name, pinned actions, permissions, concurrency and build mode remain intact;
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` records the provider-required exception;
- no runtime, financial, database, dependency, provider-setting or production-data behavior changed.

## Verification and acceptance

Final implementation head `d98172a81a59a07b932e1d14d598fa16cc36ac04` passed:

- CI #1101, including workflow-policy fail-safe gates;
- CodeQL #258 with real initialization and analysis;
- Secret history scan #258.

The corrected workflow then allowed PR #229 to obtain valid analysis and merge under the protected ruleset.

## Rollback boundary

Do not restore conditional CodeQL analysis while the provider code-scanning rule remains active. Rollback is valid only after an explicit owner decision removes or replaces that provider requirement.

## Final handoff

PR #221 was closed unmerged as superseded. No deployment or production/provider mutation was required.