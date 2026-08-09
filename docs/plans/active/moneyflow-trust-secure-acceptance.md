# MoneyFlow Trust — Secure provider acceptance

**Status:** evaluating
**Execution state:** evaluating
**Risk class:** 3
**Workstream:** moneyflow-trust-secure
**Packet role:** execution
**Active role:** evaluator
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #324 implementation; #325–#329 provider alignment
**Last updated:** 2026-08-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

Close the remaining MoneyFlow Trust Secure boundary with production-safe provider-backed password and supported OAuth/Google recent-auth evidence, without destructive account deletion or production financial-data mutation.

## Authority references

- Current merged/provider truth: `docs/research/CURRENT_PROJECT_MEMORY.md`
- Parent/program plan: `docs/plans/active/public-beta-trust.md`
- Supporting provider evidence: `docs/plans/active/moneyflow-trust-provider-sync.md`
- Supporting implementation evidence: `docs/plans/active/account-deletion-recent-auth.md`
- Historical PR memory: #324–#329 as needed for provenance

The two supporting packets may remain active as evidence, but this file is the only execution packet and generic-`Go` target for the `moneyflow-trust-secure` workstream.

## Current decision gate

- Gate ID: G1
- Gate task: SEC-T1
- Action kind: verify
- Next allowed action: exercise the production-safe password recent-auth flow without confirming deletion
- Approval token: `Go`
- Consumes approval: yes
- After action: remain `evaluating`; record password evidence and establish a separate gate before OAuth/Google verification

## Repository reconnaissance

### Current behavior

- #324 recent-auth implementation is merged.
- Vercel has production evidence for the Next.js reauthentication/callback path.
- Supabase database/schema/ACL prerequisites are aligned.
- Production `delete-account` is v6 ACTIVE with `verify_jwt=true` and current recent-auth/current-tenant source read back.
- No provider-backed password or supported OAuth/Google acceptance flow has yet been recorded.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/research/CURRENT_PROJECT_MEMORY.md` | merged/provider truth | link; do not duplicate task diary |
| `moneyflow-trust-provider-sync.md` | provider rollout evidence | supporting only |
| `account-deletion-recent-auth.md` | implementation/security evidence | supporting only |
| current production Auth/Edge logs | provider behavior | read-only acceptance evidence |

### Existing tests and constraints

- Destructive deletion is not required for acceptance.
- Password/OAuth AMR and expected-user continuity are server-side security boundaries.
- Source read-back is not behavioral acceptance.
- Provider/config/data writes need a separate explicit owner checkpoint.

### Open questions

- [ ] Does the production-safe password step-up produce the expected recent interactive AMR and same-account continuity?
- [ ] Does supported OAuth/Google step-up preserve expected-user continuity?
- [ ] Do stale/missing-continuity paths fail closed in provider-backed flows?

## Research

### Research scope and source selection

The underlying recent-auth/provider research is already recorded in the two supporting packets and merged #324 work. This execution packet introduces no new external dependency or security policy; it narrows the remaining acceptance sequence.

### Research decision

Reuse the reviewed password/oauth recent-auth contract and gather provider-backed evidence one flow at a time. Do not chain password, OAuth and log acceptance behind one terse approval.

### Adoption review

Not applicable. No dependency, service, provider or architecture change is introduced.

## Specification

### Problem

Current source and provider deployment agree, but production-safe authenticated behavior remains unproven. Calling P1 Secure accepted before provider-backed step-up/continuity evidence would conflate deployment with behavior.

### User stories

- As the owner, I can verify password recent-auth without deleting a real account.
- As the owner, I can verify Google/OAuth continuity separately from password evidence.
- As the evaluator, I can inspect relevant provider logs without treating absent traffic as a pass.

### Acceptance criteria

- [ ] SEC-AC1: production-safe password step-up proves recent interactive authentication and same-account continuity without destructive deletion.
- [ ] SEC-AC2: supported OAuth/Google step-up proves expected-user continuity without destructive deletion.
- [ ] SEC-AC3: stale or missing continuity evidence fails closed or recovers through the reviewed ordinary-login path.
- [ ] SEC-AC4: relevant Edge/Auth/API/Postgres logs show no new acceptance-blocking error cluster around the exercised flows.

### Required states

Not a UI redesign. Required acceptance states are password success, OAuth/Google success, stale/missing-continuity fail-closed recovery, and provider-log observation around those exact flows.

### Financial and security constraints

- Never confirm destructive deletion as acceptance proof.
- Never mutate financial rows for smoke evidence.
- Never persist credentials, tokens or private claims in repository memory.
- Keep `verify_jwt=true` and current password/oauth AMR policy unchanged.

### Out of scope

- Phase 2 Recover implementation.
- Auth-provider redesign.
- Destructive production-account test.
- UI migration reopening.

## Implementation plan

### Architecture fit

This is an evidence/acceptance packet. Existing Auth routes, Supabase Edge and provider logs remain the owning runtime boundaries; no implementation change is planned unless provider evidence exposes a defect.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| provider evidence | exercise one safe flow per gate | prevent terse approval chaining |
| this packet/supporting packets | record evidence delta | keep one execution authority |
| current memory | reconcile only after accepted merged/provider truth changes | avoid task-diary duplication |

### Data and migration impact

None. No schema, backfill or production financial-data write is part of this packet.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| one `Go` silently runs password + OAuth + logs | one gate/task per acceptance action |
| deployment read-back mistaken for behavior | require provider-backed authenticated flow |
| destructive proof deletes real account | stop before confirmed deletion |
| concurrent workstream makes bare `Go` ambiguous | resolve workstream + execution packet first |

### Verification plan

- Provider-backed password flow evidence.
- Separate provider-backed OAuth/Google flow evidence.
- Fail-closed stale/missing-continuity evidence.
- Relevant provider-log inspection around exercised flows.
- Reconcile P1 only after evidence supports acceptance.

## Tasks

| ID | Task | Covers | Dependency | Evidence | Status |
|---|---|---|---|---|---|
| SEC-T1 | verify production-safe password recent-auth | SEC-AC1 | none | authenticated flow + provider evidence | todo |
| SEC-T2 | verify supported OAuth/Google continuity | SEC-AC2 | SEC-T1 | authenticated flow + continuity evidence | blocked |
| SEC-T3 | verify stale/missing-continuity fail-closed behavior | SEC-AC3 | SEC-T1, SEC-T2 | authenticated recovery evidence | blocked |
| SEC-T4 | inspect relevant provider logs and reconcile Secure acceptance | SEC-AC4 | SEC-T1, SEC-T2, SEC-T3 | Edge/Auth/API/Postgres evidence | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-09 | provider evaluator | execution evaluator | evaluating | #324–#329 + Edge v6 read-back | password/OAuth behavior unproven | verify password flow only |

### Current permission boundary

- Granted scope: read-only provider inspection plus production-safe non-destructive authentication interaction when explicitly authorized by the current gate.
- Exact resources: MoneyFlow production Auth/Edge behavior relevant to recent-auth acceptance.
- Forbidden writes: provider config/secrets, destructive account deletion, production financial-data mutation, Phase 2 implementation.
- Human approval required before: any provider/config/data write or destructive operation.
- Stop condition: account identity mismatch, unexpected destructive path, or evidence that would require broader permissions.

## Evaluation

### Independent evaluation

- Implementer: not applicable — evidence-only acceptance packet
- Evaluator: pending — independent acceptance evidence not complete
- Implementer overlap: none
- Review artifact: pending — attach final acceptance review when SEC-AC1–4 are evidenced
- Inputs reviewed: pending — actual provider evidence and exact logs required
- Author summary treated as authority: no

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| SEC-AC1 | provider-backed password flow | pending |
| SEC-AC2 | provider-backed OAuth/Google flow | pending |
| SEC-AC3 | stale/missing-continuity recovery | pending |
| SEC-AC4 | provider logs around exact flows | pending |

### Research and adoption evidence

Existing reviewed research remains authoritative; no new dependency or architecture is adopted here.

### Review findings

Pending provider-backed acceptance evidence.

### Remaining limitations

P1 Secure remains unaccepted until SEC-AC1–4 are evidenced or explicitly recorded as owner-accepted limitations without fabricating pass evidence.

## Delivery record

- Branch: not applicable for provider evidence unless a defect requires code
- PR: supporting #324–#329 history
- Squash commit: not applicable
- CI run: not applicable to evidence-only provider interaction
- Production deployment: Edge v6 already source-aligned
- Production flow verified: pending SEC-AC1–4
- Work packet moved to `docs/plans/completed/`: pending acceptance
