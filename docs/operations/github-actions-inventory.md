# GitHub Actions inventory and operating policy

Reviewed 2026-10-09. Keep this map current when editing `.github/workflows/`.

| Workflow | Triggers | Purpose | Retain policy |
|---|---|---|---|
| `ci.yml` | PR to main, push main, manual | Risk-classified policy, unit/static/build, database pgTAP, browser and responsive gates | **Required; never disable or draft-gate** |
| `codeql.yml` | PR, push main, weekly, manual | Real JS/TS code scanning and analysis upload for repository protection rules | **Required PR analysis; never replace with empty success** |
| `secret-history.yml` | PR, push main, weekly, manual | Gitleaks scan of all fetched Git refs | Keep historical scan and hard failure |
| `health-monitor.yml` | hourly at UTC minute 17, manual | Dependency-free external production health probe | Detects availability/provenance issues; manual fallback retained |
| `ui-audit-nightly.yml` | Monday/Thursday 19:23 UTC, manual | Firefox critical-route UI audit | Complementary to PR UI audit in CI; keep periodic browser coverage |
| `perf-attribution.yml` | manual only | Controlled two-arm performance experiment | Keep manual; costly and not a release gate |

## Resource stewardship

- Avoid multiple scheduled runs for the same expensive coverage when CI already executes it on relevant PRs; distinguish *periodic breadth* from *per-change correctness*.
- The health probe used to run 96 times/day (15-minute interval). The hourly probe runs 24 times/day: 75% fewer scheduled invocations, but a longer outage detection window.
- Firefox periodic audit was scheduled five weekdays/week and is now twice/week: 60% fewer scheduled invocations, without changing event-driven checks.
- These changes **do not** prove a specific dollar saving. GitHub-hosted Actions billing depends on repository visibility, account entitlements and actual runner time. For public repositories standard hosted runners are generally free; private repositories have plan-dependent included minutes.
- Scheduled workflows run on default branch and can be delayed, particularly at the start of an hour. Choose nonzero schedule minutes.
- Do not touch deployment protection, CodeQL, pgTAP, RLS, secret scanning, or branch-protection checks to optimize runtime.
- PRs must still pass their exact-head required checks; superseded runs cancelled by concurrency are not passing evidence.
- Health-monitor frequency and release-risk changes require owner review; no scheduled workflow can guarantee sub-hour outage detection.
