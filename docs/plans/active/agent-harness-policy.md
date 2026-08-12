# MoneyFlow agent harness policy

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #354 harness phase 1 (agent doctor); this slice is harness phase 2
**Last updated:** 2026-08-12

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Canonical short name:** Agent harness policy

This packet exists because the repository's own rule demands it, and because the
tool being built said so on its first run. `RISK_PROPORTIONAL_DELIVERY.md` puts
"CI policy, required-check behavior or security-scanning configuration" in Class 3,
and the work-packet decision test asks "does it alter CI policy or required-check
behavior?". A policy artifact that agents will act on is policy. Ignoring the
harness's own verdict about its own diff would have been the worst possible first
signal about whether the harness can be trusted.

## Outcome

An agent starting work in this repository can ask a tool, rather than a human, six
questions it currently has to re-derive by reading four prose documents: what risk
class this change is, which local gates apply, which provider checks it cannot run
locally, which local capabilities it needs, whether an owner approval boundary is
in play, and what evidence counts as done. The answers come from the rules that
already exist, not from new ones.

## Repository reconnaissance

### Current behavior

- `scripts/classify-ci-changes.mjs` maps changed paths to CI job selection and is
  consumed by `.github/workflows/ci.yml`. Verified by reading both.
- `scripts/agent-doctor.mjs` (merged in #354) reported environment readiness, a
  local gate plan and a provider check list. It consumed the classifier for gate
  flags but held its own hard-coded `GATE_COMMANDS` and `PROVIDER_CHECKS`.
- Risk class, approval boundaries and evidence requirements existed only in prose.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` listed four stable required
  checks. The live branch ruleset requires **five** — `Gitleaks all refs` was
  missing from the document. Verified by reading ruleset `20189870`.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `scripts/classify-ci-changes.mjs` | sole authority for path → gate selection | reuse, import, never restate |
| `scripts/agent-doctor.mjs` | the consumer surface | change to a pure consumer |
| `scripts/agent-policy.mjs` | new canonical policy projection | add |
| `.github/workflows/*.yml` | job identities the drift guard derives from | read only |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | prose authority for classes and checks | reconcile the check list |

### Existing tests and constraints

- Related unit tests: `scripts/classify-ci-changes.test.mjs`, and the harness
  tests now split across `scripts/agent-policy.test.mjs` and
  `scripts/agent-doctor.test.mjs`, both inside `npm run test:ci-policy`.
- Database/RLS tests: not applicable; no database truth changes.
- Browser tests: not applicable; no runtime or UI surface changes.
- Product/architecture rules: no product behavior, UI or brand change. No second
  management framework (`AGENTS.md`: "Do not create a new management layer;
  extend existing policy, memory or packet").

## Research

No external research was needed and none is claimed: every rule projected here is
already written in this repository, and the only unknown was provider state, which
was read directly rather than researched.

Sources consulted, all internal:

| Source | What it established | What it does not cover |
|---|---|---|
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | the four change classes, per-class required gates, the stable check identities and the work-packet decision test | it listed four required checks where the ruleset requires five |
| `scripts/classify-ci-changes.mjs` | path → gate selection, fail-safe rules | it deliberately carries no risk class, approval or evidence concept |
| `.github/workflows/*.yml` | the real job identities GitHub reports, and which trigger on `pull_request` | a workflow cannot say which contexts are *required* to merge |
| Live branch ruleset `20189870` (read-only) | the five required contexts | owner-controlled state that can change without a repository commit |
| `docs/engineering/AGENT_OPERATING_MODEL.md`, `AGENTS.md` | permission-scope vocabulary and the definition of done | neither is machine-readable today |

Licence, security, privacy, ownership and rollback implications: none beyond this
repository. Nothing is added as a dependency; no data leaves the machine except one
optional authenticated read of a ruleset the owner already controls; no secret value
is read or emitted; rollback is a revert.

## Specification

### Current problem

Every mission re-establishes the same context by prose reading, and the harness
that was supposed to reduce that had begun accumulating a parallel copy of the
policy it reports. Two copies of a rule is worse than one copy plus prose,
because the copies can disagree silently.

### Acceptance criteria

- [x] **AHP-AC1** One canonical machine-readable policy artifact exists and is the
      only place the harness's non-classifier policy data lives.
- [x] **AHP-AC2** Path → gate selection remains owned by
      `scripts/classify-ci-changes.mjs`. The policy imports it; a behavioural test
      asserts the policy's classification is byte-identical to the classifier's own
      output across eight diff shapes, so a second implementation cannot hide.
- [x] **AHP-AC3** `agent:doctor` holds no policy constants. Enforced by a source
      check: no gate table, no risk-class table, and no direct import of the
      classifier — it must go through the policy module, not around it.
- [x] **AHP-AC4** The six questions are answered for docs-only, bounded runtime,
      database/schema, UI/browser and provider-write task shapes.
- [x] **AHP-AC5** Provider checks stay separate from local commands, are declared
      with what each one proves, and are never presented as locally runnable.
- [x] **AHP-AC6** A deterministic offline guard fails when a declared provider
      context stops being a real pull-request job, and a second guard fails when
      the prose list and the policy data disagree.
- [x] **AHP-AC7** The five approval boundaries are distinguishable by tooling and
      **none** is granted. The whole emitted decision is deep-frozen, not merely
      the catalogue, so `granted` cannot be flipped in the object a consumer
      holds; no passing gate can change the answer.
- [x] **AHP-AC8** Editing a migration requires no approval; deploying it does. The
      model reports `requiredForThisDiff: none` alongside
      `ownerApprovalRequiredBeforeDeployment: true`.
- [x] **AHP-AC9** `--json` exposes stable keyed fields; human output stays readable.
- [x] **AHP-AC10** No environment value is ever emitted — presence and variable
      name only, proven by a test that plants a secret in three variables.
- [x] **AHP-AC11** Local green is explicitly not completion, in both output modes.
- [x] **AHP-AC12** Docs-only work stays light: three contract gates, no packet
      demanded, no database or browser capability required.

## Risks and rollback

| Risk | Mitigation |
|---|---|
| The projection drifts from prose | Two guards: prose-list equality, and job-identity existence |
| Requiredness cannot be proven offline | Stated as a limitation; opt-in read-only live reconciliation, and a failed lookup reports unchecked rather than clean |
| The harness becomes a second authority | Behavioural pass-through test plus source checks in both directions |
| Approval modelling reads as permission | `granted: false` frozen, explicit note, dedicated tests |

Rollback: the policy module and its tests are additive and read-only. Reverting
this PR restores #354's doctor with no effect on CI selection, workflows or
product behavior, because nothing here is consumed by `ci.yml`.

## Verification

- `npm run test:ci-policy` — includes both harness test files.
- `npm run check:knowledge`, `npm run check:migrations`, `npm run lint`,
  `npm run typecheck`, `npm test`.
- `npm run agent:doctor` and `-- --json` exercised by hand on five diff shapes.
- Temp-directory workflow mutations prove the drift guard catches a rename, a
  deleted job, an unhooked workflow, a nested `pull_request` key, a job-level
  event condition and a decoy workflow.
- `npm run agent:doctor -- --verify-provider-checks` reconciled the declared
  contexts against live ruleset `20189870`: all five match.

Not applicable and not claimed: no pgTAP (no database truth change), no browser or
responsive evidence (no runtime surface change), no production verification (no
production behavior change, and this mission carries no provider-write authority).

## Accepted limitations

Named rather than smoothed over, because each is a real edge of what this slice
proves:

- **Requiredness cannot be proven offline.** Which contexts the branch ruleset
  demands is owner-controlled provider state. The offline guard proves only that
  each declared context is still a real pull-request job. The opt-in
  `--verify-provider-checks` closes this on demand and reports `checked: false`
  rather than agreement when the lookup fails.
- **The workflow reader is a line scanner, not a YAML parser.** It resolves job
  identities the way GitHub does for the shapes this repository uses. Unusual
  shapes — quoted job keys, `name:` nested deeper than a job's direct children —
  fail closed and report a problem rather than guessing.
- **Job-condition analysis is conservative, not an expression evaluator.** A
  condition that reasons about `github.event_name` without naming `pull_request`
  is treated as gating the job away. That can over-report; it will not
  under-report.
- **`paths-ignore` and branch filters are invisible** to the guard, so a check
  that exists but is filtered out for a given diff still reports as required.
- **Tenant-mutation inference is a floor.** Filename stems plus a `delete from` /
  `truncate` body scan catch the cases this repository actually contains; a
  migration that mutates tenant rows through a function call under a neutral name
  would still be reported only as `production_schema_write`.

## Permission boundary

`branch_write` only. No Supabase production access, no restore, no provider
configuration, ruleset, `CODEOWNERS` or workflow-permission change. The live
ruleset read is read-only and opt-in.

## Implementation plan

1. extract the harness policy the doctor had hard-coded into one canonical module
   that imports the classifier for gate selection;
2. add the dimensions prose owned but tooling could not read: risk class, approval
   boundaries, evidence types;
3. reduce the doctor to a consumer and prove it holds no policy;
4. add the offline drift guards, and an opt-in read-only live reconciliation for
   the half that cannot be proven offline;
5. reconcile the prose required-check list with the live ruleset;
6. cover the five task shapes plus secrets, single-source and drift.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| AHP-T1 | canonical policy module | — | `scripts/agent-policy.mjs` | complete |
| AHP-T2 | risk class, approval, evidence derivation | AHP-T1 | policy tests | complete |
| AHP-T3 | doctor becomes a pure consumer | AHP-T1 | doctor source checks | complete |
| AHP-T4 | offline drift guards | AHP-T1 | identity + prose-equality tests | complete |
| AHP-T5 | opt-in live ruleset reconciliation | AHP-T4 | ruleset `20189870`, five contexts match | complete |
| AHP-T6 | reconcile prose check list | AHP-T4 | `Gitleaks all refs` added | complete |
| AHP-T7 | task-shape and secret coverage | AHP-T2 | 35 harness assertions in `test:ci-policy` | complete |

## Evaluation

An independent fresh-context evaluation ran against the diff on 2026-08-12,
attacking ten vectors: accidental second policy source, hard-coded drift,
local-green-equals-complete, approval modelling that accidentally grants,
docs-only work becoming heavy, provider-write work becoming under-gated, secret
exposure, framework proliferation, conflict with current P3 project state, and
plain correctness bugs. It found real defects in seven of the ten and they are
fixed in this branch. The material ones, kept as a record because each was a
failure of the thing this slice claims to provide:

| Defect | Fix |
|---|---|
| All three single-source guards were defeatable — a third policy module plus a concatenated `import("./classify-ci" + "-changes.mjs")` passed every test while two live gate tables disagreed | the guards now sweep every non-test script for every owned command and provider context, forbid a computed module specifier, and assert exactly one static classifier importer |
| `granted: false` was frozen on the catalogue but the *emitted* `approval` object was a plain literal — the report a consumer reads could be set to `granted: true` | `buildPolicyDecision` deep-freezes what it returns; the test now asserts the value survives a non-strict write attempt rather than asserting a decorative `"use strict"` throw |
| `pull_request:` was matched at any depth under `on:`, so a `workflow_call` input *named* `pull_request` counted as a trigger | only a direct child of `on:` counts, with inline-array form handled |
| A job-level `if: github.event_name == 'push'` could silence a required check while the doctor kept advertising it | job conditions that reason about the event but never name `pull_request` mark the job as gated away |
| Identity, ownership and PR-triggering were three independent `.some()` calls, so a decoy workflow could supply an identity for an unhooked job | the conjunction is per-job |
| `supabase/functions/_shared/**` — the recent-auth guard that decides whether a caller may destroy an Auth identity — implied **no** boundary while `delete-account/index.ts` implied one | the whole Edge deployment unit implies `auth_identity_mutation` |
| `.github/CODEOWNERS` was Class 1 with no boundary, though `AGENTS.md` forbids touching it in feature work | `.github/**` except documentation templates is Class 3 and implies provider read-back |
| `harden_tenant_deletion.sql` escaped the tenant boundary because `"deletion"` does not contain `"delete"` | broadened stems plus optional SQL-body inspection, so a neutrally named migration containing `delete from` is caught |
| `roles.sql` and `config.toml` were Class 3 with no implied write | both imply `production_schema_write` |
| `src/lib/supabase/**` and `src/app/api/**/route.ts` were Class 1 while `src/app/actions/` was Class 3 | both are Class 3; the harness files are now symmetric too |
| `deriveRiskClass` defaulted an absent file list to `[]`, silently skipping Class 3 detection and returning "Class 1" — and a test locked that in as intended | it throws rather than guess |
| `--files a.md --base-ref origin/main` treated `origin/main` as a changed file | collection stops at the next flag instead of filtering flags out |
| `--json` carried the absolute checkout path, i.e. the OS username | only the basename ships |
| Two duplicated matchers and two disagreeing definitions of "CI policy script" | the classifier exports `isRequestBoundary`, `databaseMatchers` and `workflowOrPolicyMatchers`; the policy imports them |

Judged clean by the evaluator: docs-only weight (byte-identical to before this
slice), secret handling, packet justification, and consistency with current P3
project state.

Evidence honesty: this slice changes no product behavior, no database truth and no
provider state. Its verification is therefore contract, unit and hand-exercised CLI
evidence plus one read-only provider read — not browser, pgTAP or production
evidence, none of which are claimed.

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-12 | human owner | implementer | implementing | #354 merged doctor; prose authorities read | harness policy not machine-readable | build the canonical projection and consume it |
