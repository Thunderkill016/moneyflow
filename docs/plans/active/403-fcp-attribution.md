# #403 FCP attribution experiment

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #403; this branch `perf/403-fcp-attribution`
**Last updated:** 2026-08-18

A full packet is required because adding `.github/workflows/**` classifies this as
Class 3 (`ci-security-policy`, `repository-governance`) even though no application
code changes. `npm run agent:doctor` on this branch reports risk class 3 and
"CI workflow or policy changed; exercise every gate".

## Outcome

#403 can decide whether the `/dashboard` loading boundary produces a real earlier
first paint, from evidence that names the mechanism rather than from a timing
coincidence — and, if it does not, move to the measured hydration bottleneck
without having guessed.

## Repository reconnaissance

### Current behavior

- PR #415 merged as `c9a21781…` delivering the median-of-3 Lighthouse harness,
  `src/app/dashboard/loading.tsx`, and contract guards on the private dashboard path.
  It produced **no demonstrated cold-load performance improvement**.
- `docs/performance-budgets.md` records that `/dashboard` FCP is **bimodal**: a low
  mode near 1077 ms and a high mode near 1690 ms with nothing between, appearing in
  2 of 3 samples on `4ea4746` and 1 of 3 on `bba61f9`, and 0 of 4 earlier. `/` has no
  loading boundary and never leaves 1675–1710 ms.
- The same document records the LCP median drifting 2808 → 2952 → 3100 ms across three
  runs of behaviourally identical code, so LCP cannot settle small differences here.
- #403 acceptance 3 remains unmet and the issue stays in `NOW`.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `e2e/auth/performance.mobile.auth.spec.ts` | owns the Lighthouse methodology | reuse; sample count becomes env-configurable, default unchanged at 3 |
| `playwright.auth.config.ts` | production build + loopback double + auth mode | reuse untouched; its `webServer` gives one build per invocation, which is how two arms are obtained |
| `src/app/dashboard/loading.tsx` | the subject under test | **not modified**; removed only inside the runner's checkout for the control arm, then restored |
| `.github/workflows/ci.yml` | routine gates | **untouched**; the experiment is a separate dispatch-only workflow so no pull request pays for it |
| `docs/performance-budgets.md` | measurement authority | receives the recorded result and the method |

### Existing tests and constraints

- Class 3 gate plan per `agent:doctor`: `check:migrations`, `check:knowledge`,
  `test:ci-policy`, `verify:prepush`, `test:db`, `test:e2e`, `test:ui-audit:pr`.
- `test:db` cannot run in this environment — no `supabase` CLI and no usable Docker —
  so it is an explicit limitation, not a claimed pass. The diff contains no migration,
  SQL, RLS or schema change, and CI runs the database shard on the exact head.
- Routine Browser smoke must stay at 3 samples per route and must not run the
  attribution probe.

### Similar implementation and recent history

PR #415 established the harness and the honesty rules it is read under. PR #416 closed
out its lifecycle and recorded the draft-to-ready CI race, now issue #417. Issue #418
tracks the Dependabot alerts. Neither is part of this packet.

### Open questions

1. Does the low FCP mode coincide with the loading boundary actually rendering?
2. Does it occur at all when the boundary is absent?
3. If the signal is real, is it large enough to matter under mobile throttling?

## Research

### Research scope and source selection

Two first-party sources only, both about instrument capability rather than opinion.

### Sources

| Source | Establishes | Does not cover |
|---|---|---|
| `npx lighthouse@13.4.1 --list-all-audits` | 165 audits exist and **none** names a paint element — no `largest-contentful-paint-element`, no first-paint-element equivalent | why the modes occur |
| Existing recorded runs in `docs/performance-budgets.md` (CI `32031790438`, `32033861313`, `32035005062`) | the mode split is reproducible and route-specific | the mechanism |

### Research decision

The owner's instruction was to record the paint element "if the harness supports it".
It does not: Lighthouse 13.4.1 exposes no such audit, so more Lighthouse sampling can
never answer the mechanism question. A second instrument is therefore required, and
Playwright can observe directly whether the boundary's own text rendered during a
navigation. Lighthouse keeps the timing distribution; Playwright supplies attribution.
The two are reported separately and are explicitly not comparable, because the
Playwright probe runs unthrottled on loopback.

## Specification

### Problem

The one promising signal in #403 cannot be confirmed or dismissed with the instrument
that found it, and a control arm cannot be produced with a feature flag: the Suspense
boundary exists because the file exists, so rendering `null` would leave the boundary
in place and measure nothing.

### Acceptance criteria

- [x] **A-AC1** Lighthouse sample count is configurable and still defaults to 3, so
      routine CI cost is unchanged.
- [x] **A-AC2** An attribution probe records, per navigation, whether the loading
      boundary's text rendered and when first paint occurred.
- [x] **A-AC3** The probe does not run in ordinary CI; it is gated behind
      `PERF_ATTRIBUTION` and skips otherwise.
- [x] **A-AC4** Both arms run on one runner in one job, each from its own production
      build, with the boundary genuinely absent in the control arm.
- [x] **A-AC5** Each arm asserts its own premise: boundary present must render at least
      once, boundary absent must never render. A run that cannot attribute fails
      instead of attaching an ambiguous artifact.
- [x] **A-AC6** Results are reported as a mode split, never as a mean or median over
      mixed modes.
- [ ] **A-AC7** The experiment runs on CI hardware and its result is recorded in
      `docs/performance-budgets.md`. Open: requires an owner-triggered dispatch.
- [x] **A-AC8** No application, financial, schema, RLS, Auth or provider change; `ci.yml`
      untouched; RRB-08 untouched.

### Financial and security constraints

No financial code, money formatting, RPC or ledger path is touched. The workflow declares
`permissions: contents: read`, adds no secret, and writes nothing back to the repository.
It runs against the loopback Supabase double with synthetic fixtures only, so it cannot
reach a real project or real user data.

### Out of scope

Any optimization. Changing `loading.tsx`. Extending loading boundaries to other routes.
Touching `ci.yml`, branch protection or required checks. Issues #417 and #418.

## Implementation plan

### Planned changes

1. `e2e/auth/performance.mobile.auth.spec.ts` — `PERF_SAMPLES` and `PERF_ARM`, with
   arm-scoped output filenames so two arms cannot overwrite each other, and a recorded
   `loadingBoundaryPresent` flag so an artifact states which arm produced it.
2. `e2e/auth/performance-attribution.mobile.auth.spec.ts` — new, skipped unless
   `PERF_ATTRIBUTION` is set.
3. `scripts/perf-attribution-report.mjs` — mode-split reporter; exits non-zero when an
   arm's artifact is missing so a partial run cannot read as a result.
4. `.github/workflows/perf-attribution.yml` — `workflow_dispatch` only, both arms, no
   `cancel-in-progress` because a cancelled measurement produces a misleading partial.

### Risks and counterexamples

| Risk | Counterexample it guards against | Mitigation |
|---|---|---|
| control arm is not a real control | flag-based `null` render leaves the Suspense boundary in place | remove the file, and assert the boundary text never renders in that arm |
| session lapses mid-run | a redirect to the lighter sign-in page folds a fast paint into the result | every navigation and every Lighthouse sample asserts its pathname |
| partial run read as a result | a cancelled or half-failed run leaving one arm | reporter fails on missing arms; concurrency does not cancel |
| routine CI slowed | attribution running on every pull request | probe skips without `PERF_ATTRIBUTION`; sample default stays 3 |
| unthrottled numbers quoted as budget evidence | 96 ms FCP misread against a 1.8 s FCP target | the artifact and the report both state the instrument and that only the split is meaningful |

### Verification plan

Local: `check:migrations`, `check:knowledge`, `test:ci-policy`, `lint`, `typecheck`,
`test`, `git diff --check`, both attribution arms executed end to end, plus a run proving
the probe skips when the flag is absent. `test:db` is not runnable here and is left to CI.
Exact-head CI runs every gate because a workflow changed.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| A-T1 | establish whether Lighthouse can name a paint element | — | `--list-all-audits`: 165 audits, none | complete |
| A-T2 | make sample count and arm label configurable, default unchanged | A-T1 | harness diff; `test` 1073 pass | complete |
| A-T3 | add the attribution probe, skipped by default | A-T1 | skip run recorded; both arms executed locally | complete |
| A-T4 | mode-split reporter that fails on partial runs | A-T3 | reporter output with the incomplete-run banner | complete |
| A-T5 | dispatch-only workflow running both arms on one runner | A-T2, A-T3 | `perf-attribution.yml`; YAML parsed | complete |
| A-T6 | register this packet and pass the registry validator | — | board table entry | complete |
| A-T7 | owner-triggered dispatch on CI hardware, then record the result | A-T5 | pending | open |
| A-T8 | independent evaluation and exact-head Class 3 gates | A-T5 | pending | open |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-18 | implementer | human_owner | implementing | harness + probe + reporter + dispatch workflow; both arms executed locally at n=6 | local arms are developer-machine and unthrottled, so they establish the mechanism only, not any budget effect; CI hardware result is not yet collected; `test:db` unrun locally | owner triggers the workflow, then the result is recorded in `docs/performance-budgets.md` |

### Current permission boundary

- Granted: one branch, plus a dispatch-only workflow that reads the repository and
  uploads artifacts.
- Forbidden: application/financial/schema/RLS/Auth/provider/production writes, `ci.yml`,
  branch protection, required checks, merging, and closing #403 or RRB-08.
- Stop condition: a decision needs an optimization, a change to `loading.tsx`, another
  route, or provider access.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| routine CI cost unchanged | `PERF_SAMPLES` defaults to 3; probe skipped without the flag, confirmed by an actual skipped run | PASS |
| mechanism observable | local `with-boundary` arm: boundary text seen in 1 of 6 navigations at **96 ms** FCP against **196–220 ms** on the 5 where it was not seen | PASS |
| control arm is real | local `no-boundary` arm: boundary text seen in **0 of 6**, FCP 188–496 ms, never in the low mode | PASS |
| arms cannot silently swap | each arm asserts its own premise and records `loadingBoundaryPresent` | PASS |
| partial run cannot pass as a result | reporter emits an incomplete-run banner and exits non-zero | PASS |
| Class 3 gates | local set green; `test:db` not runnable in this environment; exact-head CI authoritative | PARTIAL — recorded, not claimed |

### Remaining limitations

- The mechanism is established on a developer machine at n=6 per arm, unthrottled on
  loopback. It shows *that* the early paint is the loading boundary; it does not show
  how large the effect is under mobile throttling, or that it matters to a user.
- Absolute milliseconds from the probe are not comparable to the Lighthouse tables and
  must never be quoted against the 1.8 s FCP target.
- Whether a real FCP gain exists on CI hardware is unresolved until A-T7 runs.
- Per the owner's decision, a confirmed signal is recorded only; no code change follows
  from it in this packet.
