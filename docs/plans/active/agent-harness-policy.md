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
      **none** is granted. `granted` is a frozen `false`; a strict-mode write
      throws; no passing gate can change the answer.
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
- `npm run agent:doctor -- --verify-provider-checks` reconciled the declared
  contexts against live ruleset `20189870`: all five match.

Not applicable and not claimed: no pgTAP (no database truth change), no browser or
responsive evidence (no runtime surface change), no production verification (no
production behavior change, and this mission carries no provider-write authority).

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

Independent fresh-context evaluation ran against the final diff, attacking:
accidental second policy source, hard-coded drift, local-green-equals-complete,
approval modelling that accidentally grants, docs-only work becoming heavy,
provider-write work becoming under-gated, secret exposure, framework
proliferation, and conflict with current P3 project state. Findings and fixes are
recorded in the pull request and in this packet's PR memory record.

Evidence honesty: this slice changes no product behavior, no database truth and no
provider state. Its verification is therefore contract, unit and hand-exercised CLI
evidence plus one read-only provider read — not browser, pgTAP or production
evidence, none of which are claimed.

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-12 | human owner | implementer | implementing | #354 merged doctor; prose authorities read | harness policy not machine-readable | build the canonical projection and consume it |
