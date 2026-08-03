# Spec Kit integration on current main — completed

- **Execution state:** completed
- **Owner:** Thunderkill016
- **Implementation PR:** #231
- **Merged commit:** `b185bce263589a79f8c7d4d9ff28ad4d73a9726b`
- **Completed:** 2026-08-03

## Outcome

MoneyFlow now supports GitHub Spec Kit as a bounded feature-artifact interface. It does not replace MoneyFlow product law, work packets, permission/handoff records, PR memory, risk-proportional delivery or owner-controlled merge/deployment decisions.

## Implemented boundary

- `.specify/README.md` defines authority, coexistence, refresh and upgrade rules;
- `.specify/memory/constitution.md` provides the compact Spec Kit governance input;
- specification, plan, task and requirements-checklist templates are available under `.specify/templates/`;
- `AGENTS.md` and `README.md` route feature work to the adapter without weakening existing governance;
- protected CodeQL guidance requires real initialization, analysis and upload on every pull request;
- no runtime, financial, database, RLS, dependency, provider-setting or production-data behavior changed.

## Upstream boundary

The adopted adapter records `github/spec-kit` release `v0.14.2`, commit `2930d06f41e3ab491ef7d111cfe7676de5ddeabd`. The official initializer and generated Codex skills were not executed by the adopting PR.

## Verification and acceptance

Final implementation head `bf4a35291c9b1fe3dcfdd6232824edc36e096270` passed:

- CI #1119, including diff hygiene, project knowledge and CI classification;
- documentation-only application/database/browser stable jobs with unrelated product gates correctly not required;
- CodeQL #276 with real `Initialize CodeQL` and `Analyze` steps;
- Secret history scan #276.

PR #231 was squash merged by the owner. PR #226 was closed unmerged as superseded.

## Rollback boundary

A squash revert may remove `.specify/**` and the bounded entrypoint references. Existing feature artifacts under `specs/` remain historical feature evidence and do not require runtime rollback.

## Final handoff

Future upstream refreshes must be pinned, review every generated file, preserve MoneyFlow-owned templates and run the repository-selected verification. No deployment or production/provider operation was required.