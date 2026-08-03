# Dependabot noise control — completed

**Status:** completed  
**Merged PR:** #245  
**Merge commit:** `48a02052473b44910ff5a46cf2c837bedab39b6f`  
**Completed:** 2026-08-03

## Repository reconnaissance

The previous configuration checked npm and GitHub Actions weekly, allowed a larger queue of independent version-update PRs and requested custom labels. PR #197 proposed a correction from an old baseline and was closed unmerged. PR #245 recreated the still-valid configuration from current main.

## Research

Official GitHub documentation checked on 2026-08-03 confirmed support for monthly schedules, open-PR limits, grouping and cooldown. Cooldown applies to version updates rather than security updates. Dependabot remains manually reviewed because no auto-merge mechanism was added.

## Specification

Merged repository truth:

- npm and GitHub Actions version checks run monthly;
- at most two npm version-update PRs and one Actions version-update PR can remain open;
- `next`, `react` and `react-dom` minor/patch updates are grouped;
- other npm minor/patch updates are grouped;
- GitHub Actions updates are grouped;
- npm releases use cooldown periods;
- custom label requests were removed;
- the `deps` commit prefix remains;
- no dependency version, lockfile, workflow or auto-merge behavior changed in PR #245.

## Implementation plan

The current-main replacement was opened as PR #245, verified on its exact head and squash-merged after explicit owner authorization. PR #197 remains closed unmerged.

## Tasks

| Task | Result |
|---|---|
| Recreate configuration from current main | complete |
| Add current work packet and PR memory | complete |
| Close PR #197 unmerged | complete |
| Pass exact-head repository checks | complete |
| Receive explicit owner merge authorization | complete |
| Merge PR #245 | complete |
| Observe a future scheduled Dependabot run | external follow-up |

## Evaluation

Final head `5e3f34dd22431c186daafe97e92b2b3bf7ede575` passed:

- CI #1192, including diff hygiene, project knowledge, classification, deployment, CSS ownership, architecture, lint, typecheck, unit/static-RLS tests and production build;
- CodeQL #341 with real Initialize/Analyze;
- Secret history scan #341.

Database and browser checks were correctly not required.

Repository verification proves configuration compatibility. It does not prove the shape of future generated PRs until GitHub processes the merged configuration on a scheduled run. No dependency update was accepted by this delivery.
