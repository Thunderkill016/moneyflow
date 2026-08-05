# MoneyFlow CI system audit — 2026-08-06

**Status:** full-risk implementation verified; documentation-only comparison pending
**Repository baseline:** `main@429eb6777a63b3172a04ce164a512420e31085c8`
**Implementation branch:** `agent/ci-system-hardening`
**Pull request:** #304
**Work packet:** `docs/plans/active/ci-system-hardening-2026-08.md`
**Measurement timezone:** GitHub Actions logs use UTC; project decisions use Asia/Ho_Chi_Minh.

## Executive result

MoneyFlow already had a strong risk-proportional CI architecture: immutable action pins, explicit permissions, stale-run cancellation, stable protected summaries, independently retryable shards, fresh local database tests, Chromium/WebKit coverage, real CodeQL upload and an all-ref secret scan.

The highest-confidence first improvements were therefore bounded rather than a rewrite:

1. replace the deprecated `actions/checkout@v4.4.0` runtime with verified `v7.0.1`;
2. stop persisting repository credentials in every read-only checkout;
3. prevent non-database changes from running checkout/Supabase/artifact setup merely to print “not required”;
4. preserve the stable `database` required check through a lightweight summary;
5. protect the new topology with tests;
6. retain every existing verification command and browser/security boundary.

The dominant full-risk latency remains the cross-device UI test execution at about 8.3 minutes. This PR does not make CI appear faster by deleting projects, widths, states or assertions.

## Audit method and evidence boundary

### Repository sources inspected

- `.github/workflows/ci.yml`, `codeql.yml` and `secret-history.yml`;
- `.github/dependabot.yml`;
- `package.json` scripts for policy, lint, type checking, tests, build and audits;
- Playwright smoke/audit configuration;
- Supabase migration, reset, RLS and pgTAP scripts;
- `vercel.json` and deployment-environment contracts;
- CI classifier, retry graph and exact-head monitoring scripts;
- current project memory and prior delivery/CI packets;
- recent PRs that changed CI, CodeQL, secret scanning, browser reliability or deployment policy;
- exact workflow jobs, step logs, artifacts, failures and same-SHA reruns.

### Measurement limitation

The available GitHub connector can inspect workflow runs associated with known commits but does not expose a complete paginated repository run census. This audit therefore does **not** claim a repository-wide first-attempt failure percentage.

A future reliability SLO needs a repeatable collector using the GitHub Actions REST API or authenticated `gh` in an approved environment.

## Current architecture

### CI workflow

The classifier reads the complete PR diff and selects risk-proportional gates. Workflow/configuration and unknown changes receive full verification. Documentation-only changes retain policy and stable summaries while application/database/browser executors skip truthfully.

```text
classify
  ├─ verify_policy ─┐
  ├─ verify_static ─┤
  ├─ verify_tests ──┼─> verify
  └─ verify_build ──┘

classify ── database=true ──> database_checks ─┐
         └─ database=false ─> skipped ─────────┼─> database

verify ─> browser_smoke ─┐
       └> ui_audit ──────┼─> e2e
```

Stable protected identities remain `verify`, `database` and `e2e`. Heavy shards stay separate so GitHub's failed-job rerun can repeat only failed work on the same SHA.

### CodeQL workflow

Runs on PRs to `main`, pushes to `main`, weekly schedule and manual dispatch. It performs real JavaScript/TypeScript extraction, query execution, SARIF upload and processing. It is intentionally not path-skipped because a previous shell-only green result left repository rules waiting for the missing analysis.

### Secret-history workflow

Runs on the same event classes as CodeQL. It checks out complete history, fetches every branch/tag, verifies the Gitleaks archive checksum and scans `--all` refs. Current measured cost is small and broad coverage previously found a reviewed finding outside the immediate PR path.

### Deployment

GitHub Actions does not deploy this repository. Vercel owns automatic deployment and `vercel.json` allows deployment only from `main`; branch deployments are disabled. This PR performs no deployment or provider mutation.

## Baseline before the change

Principal baseline: PR #301 implementation head `3a2088a3a0c80075386db9c5bf5630f87c2d209f`.

- CI #1746, run `31034093941`;
- CodeQL #866, run `31034093947`;
- Secret history #866, run `31034093950`.

| Job | Approx. duration | Measured work | Result |
|---|---:|---|---|
| Static quality | 45.8 s | `npm ci` 15.3 s; lint 15.7 s; typecheck 9.7 s | success, 2 warnings |
| Unit/static RLS | 36 s | `npm ci` ~15 s; 723 tests 9.14 s | success |
| Production build | 45.3 s | `npm ci` ~14 s; build 21.3 s | success |
| Policy contracts | 4.6 s | full-history checkout plus policy scripts | success |
| Old unselected database job | 3.6 s | runner/action preparation and checkout despite no DB work | success/no-op |
| Browser smoke | 3 m 05 s | browser/deps 24.4 s; 58 tests 2.3 m | success |
| Cross-device UI audit | 9 m 13 s | browser/deps ~36 s; 554 scheduled, tests 8.3 m | 427 passed, 127 skipped |
| CodeQL | 64.9 s | extraction/query/upload/processing | success |
| Secret history | ~6 s | 2,337 commits / 14.27 MB; scan 1.39 s | success |

### Real bottleneck order

1. Cross-device UI test execution: about 8.3 minutes.
2. Browser smoke test execution: about 2.3 minutes.
3. CodeQL extraction/query/upload: about one minute.
4. Repeated `npm ci`: about 12–15 seconds per Node job.
5. Playwright browser/dependency installation: about 20–36 seconds.
6. Secret-history scan: not a bottleneck.

## Real incidents and preserved decisions

| Incident | Consequence | Decision |
|---|---|---|
| `ready_for_review` once failed to trigger required gates | draft could become reviewable without fresh evidence | retain explicit event and condition |
| CodeQL once returned a green shell without uploaded analysis | branch rules remained blocked | retain real analysis/upload on every PR head |
| SAFE-09 failed once and passed on a same-SHA rerun | demonstrated an isolated browser flake | preserve separate shards and diagnostic reruns; no blind automatic retry |
| WebKit interacted before hydration | false negative from test boundary | fix locator/hydration behavior, not assertion scope |
| all-ref Gitleaks found a reviewed finding on another branch | narrow PR-only scan would miss evidence | retain all-ref coverage |
| old checkout emitted Node 20 deprecation warnings | future runner compatibility risk | upgrade to checkout v7.0.1 |
| unselected database path still prepared heavy actions | wasted runner/action work | conditional executor plus stable summary |

## Security assessment

### Existing strong controls

- CI and secret scan use `contents: read`;
- CodeQL adds only `packages: read` and `security-events: write`;
- third-party actions use immutable full SHAs;
- Supabase CLI and Gitleaks versions are explicit;
- Gitleaks archive checksum is verified;
- test keys are synthetic;
- diagnostic artifacts have short retention;
- exact-head monitoring rejects stale green results;
- Vercel deployment is `main`-only.

### Immediate hardening verified

All read-only checkouts now use official `actions/checkout` v7.0.1 at:

`3d3c42e5aac5ba805825da76410c181273ba90b1`

Every checkout sets `persist-credentials: false`. Exact-head logs show checkout v7 running successfully, removing its temporary Git credential configuration after fetch and no longer emitting the old checkout Node 20 deprecation warning.

### Security follow-up

- `actions/setup-node@v7.0.0` has an open upstream bundled-dependency DoS report without a confirmed patched signed release. Current use has fixed inputs, read-only permissions, timeouts and no secret-bearing custom input. Track urgently and upgrade when an official patched release exists; do not pin an unreleased branch.
- Triage the four moderate npm advisories by production reachability and exploitability rather than adding a noisy blanket gate.
- Continue reviewed Dependabot updates for pinned action SHAs.

## Implementation

### Workflow changes

- upgraded every CI, CodeQL and secret-history checkout to verified checkout v7.0.1 full SHA;
- disabled persisted credentials in every read-only checkout;
- created conditional `database_checks` for Supabase start/reset/pgTAP;
- retained `database` as the stable `always()` result validator;
- kept all policy, lint, typecheck, test, build, database, browser and security commands unchanged.

### Permanent contracts

`ci-retry-graph.test.mjs` now requires:

- conditional `database_checks` selection;
- stable `database` summary with selected/unselected result validation;
- no checkout/Supabase/artifact action in the summary;
- all eight CI checkouts to disable credential persistence;
- existing `verify`, `e2e` and attempt-specific artifact behavior.

## Full-risk exact-head verification

Verified head: `d68790a5047a38eaf3a753f87ee7936883d39a6e`.

- CI #1764, run `31043251727`: **success**;
- CodeQL #883, run `31043252721`: **success**;
- Secret history #883, run `31043252598`: **success**.

| Gate | Exact-head evidence | Comparison |
|---|---|---|
| Policy | knowledge, diff hygiene and CI topology contracts passed | new topology protected |
| Static | lint/typecheck/architecture/CSS/deployment contracts passed | same 2 pre-existing hook warnings |
| Tests | 723/723 passed; command 7.954 s | same count; normal faster-run variance |
| Build | production Next build passed; command ~22.1 s | effectively unchanged |
| Database executor | fresh Supabase start/reset/pgTAP passed | selected path preserved |
| Stable database | validated selected executor success | protected identity preserved |
| Browser smoke | 58 passed in 2.2 m | same coverage; modest run variance |
| UI audit | 554 scheduled; 427 passed, 127 skipped; tests 8.3 m | exact same counts and dominant runtime |
| Stable e2e | validated both browser shards | protected identity preserved |
| CodeQL | scanned 436 TS, 17 JS and 4 workflow files; upload processed | real security evidence preserved |
| Secret history | scanned every ref; 2,358 commits in 1.29 s | broad scope preserved |

### Interpretation

The full-risk head proves correctness and coverage preservation. It does **not** prove a general speedup:

- static/build timings were similar or slightly slower because of hosted-runner variance;
- tests and browser smoke were faster on this run, also within normal variance;
- UI audit retained the same 8.3-minute critical path;
- CodeQL and Gitleaks retained full security scope.

The measured optimization claim is narrower: checkout runtime/security is improved, and the unselected database path is structurally able to skip its heavy executor. The following documentation-only head must verify that latter path in GitHub Actions.

## Deferred and rejected work

### Do next

1. Fix the two `react-hooks/exhaustive-deps` warnings in a focused product-code PR, then decide whether warnings should become blocking.
2. Triage four moderate npm advisories by reachability.
3. Track the setup-node upstream advisory and upgrade to the first official patched release.
4. Build a complete Actions run census and first-attempt reliability SLO when an authenticated API/`gh` environment is available.
5. Reconcile Supabase CLI's `[inbucket]` deprecation warning with official docs before migrating to `[local_smtp]`.
6. Add `merge_group` only if repository merge queue is actually enabled.

### Measure later

- UI-audit sharding by browser/project family, including report/artifact merge and flake behavior;
- verified Next build-artifact reuse in browser jobs;
- targeted action version updates that solve a measured project problem.

### Not suitable now

- combining static/test/build only to avoid repeated `npm ci`;
- caching Playwright browser binaries by default;
- skipping CodeQL or all-ref secret scanning for docs-only changes;
- reducing browser matrix, widths, states or tests;
- unpinning third-party actions;
- blind automatic retries;
- changing Supabase config while CLI and official docs disagree;
- pinning unreleased action branches.

## Ranked backlog

Impact/urgency: 1–5. Cost/risk: 1–5 where 5 is higher.

| Rank | Improvement | Impact | Urgency | Cost | Risk | Decision |
|---:|---|---:|---:|---:|---:|---|
| 1 | checkout v7 + no persisted credentials | 4 | 5 | 1 | 1 | implemented and full-risk verified |
| 2 | conditional DB executor + stable summary | 4 | 4 | 2 | 2 | implemented; selected path verified |
| 3 | topology/credential contracts | 4 | 4 | 1 | 1 | implemented and passing |
| 4 | durable measured audit | 4 | 4 | 2 | 1 | implemented |
| 5 | fix hook warnings and decide warning policy | 3 | 3 | 2 | 2 | next focused PR |
| 6 | triage npm advisories | 4 | 3 | 2 | 2 | next security review |
| 7 | monitor setup-node advisory | 4 | 4 | 1 | 2 | urgent watch |
| 8 | complete Actions reliability census/SLO | 4 | 3 | 3 | 1 | later |
| 9 | UI-audit sharding experiment | 4 wall-time | 2 | 4 | 3 | measure later |
| 10 | build-artifact reuse experiment | 3 | 2 | 4 | 3 | deferred |
| 11 | Playwright browser cache | 1 | 1 | 3 | 3 | rejected now |
| 12 | narrow security/browser coverage | apparent speed only | 1 | 1 | 5 | rejected |

## Pending documentation-only comparison

The next exact head changes documentation only. Acceptance requires:

- classifier selects documentation-only path;
- static/test/build/browser executors skip;
- `database_checks` skips without runner/action setup;
- stable `database` validates that skipped result and succeeds;
- stable `verify` and `e2e` succeed;
- CodeQL still uploads real analysis;
- all-ref Gitleaks still passes.

The final result and run IDs will be recorded in PR #304 and the repo's CI memory without claiming savings beyond observed evidence.

## Durable lessons

1. Optimize measured critical paths, not visible YAML repetition.
2. Stable required checks and conditional heavy executors can coexist.
3. An unselected executor is safe only when a stable summary validates intent and actual result.
4. Security evidence may need to run even when application tests are risk-proportional.
5. Same-SHA failed-job reruns are useful only with truthful independent boundaries.
6. A fast all-history secret scan should not be narrowed merely because its scope looks broad.
7. A green shell is insufficient when a required external artifact such as CodeQL analysis is absent.
8. Before/after claims belong to exact heads and concrete run/job IDs.
9. Upstream deprecation warnings are signals, not permission to apply undocumented migrations.
10. Coverage-preserving CI hardening can improve security/resource use without making unsupported speed claims.
