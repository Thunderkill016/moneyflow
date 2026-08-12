# MoneyFlow Trust — execution roadmap to bounded public beta

**Status:** superseded/archived
**Execution state:** historical planning baseline — do not execute
**Active role:** none
**Permission scope:** branch_write
**Current main baseline:** historical `4caefac67d9da2dd312fdeae40616fa4efb17517`; current status lives in the parent plan
**Parent:** `docs/plans/active/public-beta-trust.md`
**Owner:** Thunderkill016
**Last updated:** 2026-08-12

> **Superseded.** Secure, Recover and Prove have since been accepted. The current
> authority is `docs/plans/active/public-beta-trust.md`: bounded **Repository Reset**
> is next, then Brand/Product Experience A0→J, final physical/device visual QA and
> the owner public-beta decision. Do not execute S1–S4, R1–R5, P1–P3, I1–I2 or L1–L2
> from this historical plan.

## Outcome

Turn the current functional MoneyFlow MVP into a trustworthy bounded public beta without adding speculative feature breadth.

The execution order is fixed unless new P0/P1 evidence forces a return to an earlier phase:

> **Secure → Recover → Prove → Improve → Release**

This historical file no longer owns execution. The parent MoneyFlow Trust plan is the
current program authority.

## Repository reconnaissance

### Current merged/provider baseline

Already complete and not to be reopened without new evidence:

- functional MVP released;
- database migration/schema drift reconciled;
- production audit ACL aligned to the reviewed SELECT-only `service_role` contract;
- production `delete-account` Edge Function upgraded to v6 with `verify_jwt=true`;
- provider read-back contains the current recent-auth helper and tenant cleanup inventory;
- UI migration P0–P11 archived with strong automated browser/responsive evidence.

Current `main` head at planning time is `4caefac67d9da2dd312fdeae40616fa4efb17517` from merged PR #330.

### Remaining public-beta blockers

1. provider-backed recent-auth behavioral acceptance;
2. complete versioned user archive/export + safe restore;
3. physical-phone core-ledger proof;
4. ~~seven consecutive days of sanitized self-use~~ — **withdrawn by the owner on 2026-08-12** and not replaced;
5. evidence-selected fixes for any P0/P1 or repeated high-friction issue;
6. final owner public-beta decision.

### Current user-owned data inventory baseline

The current `purge_user_tenant_data` function verifies deletion across these 19 tenant-owned tables/domains:

1. `profiles`;
2. `accounts`;
3. `categories`;
4. `financial_transactions`;
5. `transaction_entries`;
6. `monthly_budgets`;
7. `recurring_commitments`;
8. `commitment_occurrences`;
9. `recurring_income_templates`;
10. `income_template_occurrences`;
11. `savings_goals`;
12. `savings_goal_allocations`;
13. `import_batches`;
14. `inbox_candidates`;
15. `transaction_import_provenance`;
16. `account_reconciliations`;
17. `account_reconciliation_events`;
18. `inbox_rules`;
19. `financial_mutation_audit_events`.

This inventory is the completeness baseline for Recover. Every domain must be explicitly classified as restorable, regenerated/derived, or archive-only historical evidence. No purge-owned domain may be silently omitted.

### Relevant current product constraints

- MoneyFlow remains a Vietnamese manual-first personal income-and-expense ledger.
- Data correctness and ownership safety outrank feature breadth.
- Mobile usability is a release gate.
- Current CSV/JSON export is not a complete restorable archive.
- Transfers stay balanced and are never income/expense.
- VND remains integer đồng; supported non-VND currencies remain integer minor units.
- Physical-device claims require physical-device evidence.
- Open process PR #331 is not a MoneyFlow product blocker and must not delay this roadmap unless the owner explicitly reprioritizes it.

## Research

### Research scope and source selection

Focused research was used only where external provider/security behavior affects the roadmap:

1. Supabase JWT claims/reference for `amr`, `aal`, `password`, `oauth` and `token_refresh` semantics.
2. OWASP Authentication Cheat Sheet for reauthentication on sensitive/high-risk actions.
3. Supabase database backup/restore documentation to distinguish project-level disaster recovery from user-owned MoneyFlow portability/recovery.

### Research decisions

- Recent-auth acceptance must be proven from provider-backed authentication evidence, not merely source deployment.
- MoneyFlow's ten-minute deletion policy uses verified `amr` method/timestamp evidence; AAL alone is not a recency signal.
- User archive/restore is a separate product contract from Supabase project backups.
- Supabase infrastructure backup should still be checked before beta, but it never substitutes for user-owned export/restore.

### Adoption review

No new dependency, service, framework or provider is selected by this roadmap. Recover should prefer existing Next.js/Supabase boundaries and only add a dependency if the archive contract demonstrates a concrete need.

## Specification

### Goal

Reach a bounded public beta with evidence that:

- sensitive account deletion is protected by working recent-auth behavior in production;
- user-owned MoneyFlow state can be exported and restored safely;
- the daily ledger works on a physical phone;
- real self-use does not cause data loss or require manual DB repair;
- all P0/P1 defects are closed;
- the owner has an exact production/evidence packet for the final GO/NO-GO decision.

### Execution rules

1. **Product first.** Process/governance work is not on the critical path unless it directly blocks delivery evidence.
2. **One phase at a time.** Do not start Recover implementation before Secure acceptance; do not start Prove before Recover acceptance.
3. **Evidence matches the claim.** CI does not prove provider behavior; browser emulation does not prove a physical phone; source deployment does not prove authenticated-flow behavior.
4. **No destructive proof.** Never delete a real production account merely to prove reauthentication.
5. **No speculative breadth before beta.** Bank sync, AI advice, household finance, investments, native apps and full envelope budgeting remain out of scope.
6. **Preserve financial invariants.** Integer money, transfer neutrality, split exactness, tenant isolation and soft-delete/recovery behavior remain mandatory.
7. **Production/provider writes require a separate explicit owner approval.** Previous approval never chains into a later write.
8. **Fix blockers where found.** A P0/P1 discovered during Prove returns the affected boundary to implementation and verification before advancing.

### Severity model

- **P0:** data loss/corruption, cross-tenant exposure, destructive-account security bypass, impossible recovery of the core ledger.
- **P1:** core daily-ledger flow cannot complete reliably, wrong balance/income/expense/transfer result, authentication/recovery failure, restore unsafe/non-atomic.
- **P2:** important friction or missing depth with a safe workaround.
- **P3:** polish or speculative improvement.

Only P0/P1 are automatic public-beta blockers.

### Acceptance criteria

- [ ] ROAD-AC1: production-safe password recent-auth is provider-evidenced without account deletion.
- [ ] ROAD-AC2: supported Google/OAuth recent-auth and expected-user continuity are provider-evidenced.
- [ ] ROAD-AC3: stale/missing continuity fails closed and post-flow logs show no acceptance-blocking error cluster.
- [ ] ROAD-AC4: complete archive v1 explicitly classifies all 19 purge-owned domains and excludes secrets/provider credentials.
- [ ] ROAD-AC5: archive validation and restore are tenant-safe, atomic, versioned and fail with zero writes on corrupt/unsupported input.
- [ ] ROAD-AC6: export→restore round trip preserves normalized financial state and invariants.
- [ ] ROAD-AC7: production core ledger is exercised on a physical phone.
- [~] ROAD-AC8: ~~seven consecutive days of sanitized self-use~~ — **withdrawn 2026-08-12** by owner decision. No duration gate replaces it; real daily use still surfaces defects, as the physical-phone run did.
- [ ] ROAD-AC9: no unresolved P0/P1 defect blocks the daily-ledger loop.
- [ ] ROAD-AC10: final production truth, recovery layers, limitations and owner beta decision are recorded.

### Out of scope before bounded beta

- bank sync/Open Banking;
- generative financial advice;
- household/collaboration;
- investments/wealth accounting;
- native mobile rewrite;
- full envelope budgeting;
- speculative product-depth work not selected by evidence.

## Implementation plan

### Phase 1 — Secure acceptance

#### Goal

Prove that the already-deployed recent-auth design behaves correctly against the real production Auth/Edge provider without destructive account deletion.

#### Entry state already satisfied

- #324 recent-auth implementation merged;
- Vercel Next.js path live;
- Supabase DB/schema/ACL prerequisites aligned;
- `delete-account` v6 ACTIVE with `verify_jwt=true`;
- provider bundle read back and source-aligned.

#### S1. Fresh production preflight

Actions:

- fresh-read current `main` and production deployment identities;
- confirm Vercel production target still serves the merged auth/delete flow;
- confirm Supabase `delete-account` is still v6 ACTIVE and `verify_jwt=true`;
- confirm Google/OAuth remains enabled for the supported production login path;
- inspect recent Edge/Auth/API/Postgres logs before testing so pre-existing errors are separated from acceptance traffic;
- identify the production-safe account/session to use; do not create/mutate financial data solely for the test.

Evidence:

- exact Git commit;
- Vercel deployment/alias identity;
- Edge version/status/config read-back;
- pre-test provider log timestamp window.

Stop before auth testing if deployment identity, Edge source/config or provider state no longer matches the reviewed contract.

#### S2. Password recent-auth acceptance

Precondition: an authenticated same-account session whose latest accepted interactive `password|oauth` AMR is outside MoneyFlow's ten-minute recent-auth window.

Actions:

1. Open the permanent account-deletion flow on production.
2. Confirm the stale session is routed to same-account reauthentication rather than destructive authority.
3. Reauthenticate with the current account password.
4. Confirm the resulting authenticated user ID is unchanged.
5. Confirm return to the deletion route requires destructive confirmation again; typed `XÓA` does not survive the auth boundary.
6. Record only non-secret structural claims evidence:
   - `amr` contains `password`;
   - timestamp is within the MoneyFlow recent-auth window;
   - user identity matches the original account.
7. Do not submit the final destructive deletion action.

Pass when stale session cannot purge, same-account password step-up succeeds, fresh `password` AMR is provider-backed, confirmation resets and no user/financial deletion occurs.

#### S3. Google/OAuth continuity acceptance

Actions:

1. Start deletion reauthentication from a valid-but-stale same-account session.
2. Confirm the OAuth path forces fresh provider authentication according to merged behavior.
3. Return with the expected same Google account.
4. Confirm callback continuity succeeds only for the expected user and confirmation is cleared.
5. Confirm provider-backed claims include recent `oauth` AMR and the same user identity.
6. Exercise missing-continuity fail-closed behavior without deleting data, e.g. remove the expected-user continuity cookie before callback/re-entry.
7. If a second safe non-financial identity already exists, exercise mismatch recovery. Do not create a new production identity solely for this optional case without a separate owner decision.
8. Never confirm account deletion.

Pass when same-account OAuth succeeds, recent `oauth` AMR is observed, continuity is enforced, missing continuity fails closed/recoverably and no silent account switch reaches destructive authority.

#### S4. Post-flow provider observation

Inspect the exact acceptance window in:

- Supabase Edge logs;
- Supabase Auth logs/events available to the project;
- API/Postgres logs for related errors;
- Vercel runtime logs for callback/action failures.

Pass when no new P0/P1 error cluster is associated with the tested flows. Lack of log coverage is recorded as a limitation, not converted into a fabricated pass.

#### S5. Secure closeout

- reconcile recent-auth packet, Provider Sync, parent Trust and current memory;
- close Provider Sync for its reviewed boundary;
- mark P1 Secure accepted only if password/OAuth/fail-closed/log evidence supports it;
- record any provider-evidence limitation;
- unlock Recover.

Secure gate:

- ROAD-AC1 PASS;
- ROAD-AC2 PASS;
- ROAD-AC3 PASS;
- no destructive production deletion used as proof;
- no unresolved P0/P1 auth/security defect.

---

### Phase 2 — Recover: complete user archive and restore

#### Goal

A user can export a complete versioned MoneyFlow archive, validate it before mutation, and restore it safely with financial/ownership invariants intact.

This is separate from Supabase project backup. Provider backups recover project infrastructure/state; MoneyFlow needs a user-owned portability/recovery contract.

#### R1. Classify every tenant-owned domain

For each of the 19 purge-owned domains, choose exactly one:

- **restorable operational state**;
- **regenerated/derived state**;
- **archive-only historical evidence**.

Default design recommendation:

- restore primary operational state and relationship history required to reproduce the ledger;
- regenerate views/derived read models;
- exclude Auth passwords, JWTs, provider keys, cookies and infrastructure metadata;
- keep `financial_mutation_audit_events` archive-visible unless a reviewed live-audit restore contract proves replaying historical audit events is semantically safe.

#### R2. Define archive format v1

Prefer one explicit JSON archive contract for v1.

Manifest minimum:

- fixed MoneyFlow archive identifier;
- integer `version`;
- `exported_at`;
- source application/schema revision;
- domain row counts;
- optional canonical payload checksum;
- no tokens/passwords/OAuth secrets/service-role material.

Data rules:

- money remains integer minor units;
- dates/timestamps have stable representation;
- relational IDs remain stable inside the archive;
- source tenant ownership is never trusted on restore;
- restored rows bind to the authenticated destination tenant;
- deterministic section ordering supports stable round-trip comparisons;
- unsupported future versions fail closed.

#### R3. Narrow restore scope v1

First restore semantics:

- restore into an **empty MoneyFlow tenant** only;
- no merge-with-existing-ledger semantics;
- no automatic deletion/replacement of an existing ledger;
- any future replace/merge mode requires a separate reviewed contract.

This deliberately removes duplicate-ID, double-counting and conflict-resolution ambiguity from v1.

#### R4. Build archive export

Requirements:

- export every domain classified for archive inclusion;
- use ownership-safe server reads/RPCs;
- deterministic v1 output;
- verify row counts against source tenant;
- expose from Settings/Data ownership, separate from human-readable CSV transaction export;
- clearly label archive as sensitive financial data stored on the user's device.

#### R5. Build validator/dry-run

Before any restore write, validate:

- identifier/version;
- parse/shape;
- required sections;
- types/enums;
- integer money;
- referential integrity;
- transfer balance/neutrality;
- split exactness;
- account/category/reference existence;
- recurrence/goal/reconciliation relationships;
- duplicate IDs;
- destination tenant emptiness;
- unsupported/corrupt sections.

Dry-run summary must show version, domain row counts, warnings/errors and whether restore is permitted.

Validation failure must produce **zero writes**.

#### R6. Build atomic restore

Requirements:

- server-controlled destination identity;
- one atomic database transaction or equivalent all-or-nothing RPC boundary;
- dependency-safe insert order;
- tenant ownership remapped to authenticated destination user;
- logical IDs preserved where empty-tenant v1 permits;
- any failure rolls the whole restore back;
- never disable RLS globally or expose service credentials to the client.

#### R7. Round-trip and failure tests

Unit/domain:

- archive parser/version dispatch;
- deterministic serialization;
- corrupt/partial/unsupported archive rejection;
- checksum mismatch if adopted;
- integer money and financial-invariant validation.

Database/RLS:

- user A cannot export/restore user B data;
- empty-tenant restore succeeds atomically;
- partially invalid archive causes zero committed rows;
- wrong-owner IDs are ignored/remapped rather than trusted;
- transaction/entry relationships survive;
- transfers remain balanced and excluded from income/expense;
- split totals remain exact;
- recurrence, goals, Inbox/provenance/rules and reconciliation relationships remain valid.

End-to-end round trip:

1. use a synthetic non-production fixture tenant;
2. populate representative records across every restorable domain;
3. export archive;
4. restore into a fresh empty synthetic tenant;
5. compare normalized state and financial totals;
6. verify UI loads the restored ledger without manual DB repair.

#### Recover gate

Recover passes only when:

- ROAD-AC4 PASS;
- ROAD-AC5 PASS;
- ROAD-AC6 PASS;
- every purge-owned domain classified explicitly;
- credentials/secrets excluded;
- restore atomic and tenant-safe;
- corrupt/partial/unsupported input produces zero writes;
- no unresolved P0/P1 recovery defect.

---

### Phase 3 — Prove: physical device and real self-use

#### Goal

Demonstrate the daily-ledger loop outside automated harnesses.

#### P3.1 Physical-phone acceptance

Minimum evidence: one real physical phone on production. Emulation is supplementary only.

Core checklist:

- sign in/out;
- recovery/login return path when safely exercisable;
- create expense;
- create income;
- create balanced transfer;
- edit transaction;
- soft delete + restore;
- inspect account balance/register;
- inspect dashboard totals;
- inspect report totals/transfer exclusion;
- category selection/edit;
- budget view/update;
- recurring/goal navigation does not block core use;
- export standard CSV;
- export MoneyFlow archive after Recover;
- verify touch targets, keyboard/input behavior, scrolling and destructive confirmations.

Physical Android Chrome is the minimum target for this roadmap. If physical iOS/Safari is unavailable, record it as an explicit beta limitation instead of claiming coverage.

#### P3.2 ~~Seven-consecutive-day sanitized self-use~~ — withdrawn 2026-08-12

The owner removed this duration gate after the physical-phone run. It never started,
nothing replaces it, and the paragraphs below are retained only as a record of what
was once planned:

- use production MoneyFlow as the primary sanitized ledger for the chosen evidence scope;
- perform real daily-loop actions rather than synthetic button clicking;
- include ordinary create/edit/correction behavior;
- include a transfer during the evidence period when naturally applicable;
- use export/archive at least once;
- do not repair production state manually in SQL;
- record defects/friction without copying sensitive finance data into GitHub/docs.

Daily log fields:

- date;
- device/browser;
- core flows used;
- failure/friction category;
- severity P0/P1/P2/P3;
- reproducible yes/no;
- workaround required yes/no;
- data loss/corruption yes/no;
- manual DB repair: must remain no.

#### P3.3 Defect triage

- P0: stop Prove immediately; fix and re-establish relevant trust evidence.
- P1: fix before Prove closes; rerun affected core flow.
- P2: fix before beta only if repeated/high-friction or owner-selected.
- P3: backlog.

#### Prove gate

- ROAD-AC7 PASS;
- ROAD-AC8 PASS;
- ROAD-AC9 PASS;
- zero data loss/corruption;
- zero manual production DB repair;
- observed P2/P3 friction captured for Improve/backlog.

---

### Phase 4 — Improve from evidence only

#### Goal

Fix the highest-value friction observed during Prove without reopening speculative feature breadth.

#### I1. Build evidence-ranked list

For each observed issue record:

- frequency;
- severity;
- core-job impact;
- workaround cost;
- financial-trust risk;
- implementation/rollback boundary.

Priority remains:

1. correctness/ownership;
2. core transaction flow;
3. mobile/accessibility;
4. recovery/explanations;
5. trust depth;
6. repeated friction;
7. planning/reporting depth;
8. performance;
9. polish.

#### I2. Select bounded improvement slice

Before beta choose only:

- all remaining P0/P1; plus
- the smallest set of repeated P2 friction materially hurting the daily ledger.

Do not implement product-depth candidates simply because they exist in current memory.

#### I3. Candidate backlog only if evidence selects it

Known candidates:

- richer account closing/reconciliation matching;
- split-line correction;
- user-facing mutation-audit depth;
- budget rollover/flex;
- recurring history/matching;
- goal funding/contribution history;
- report account/type dimensions/deeper drill-down;
- broader deterministic rule conditions/actions.

#### Improve gate

- all selected fixes merged and verified at the correct layer;
- affected physical/self-use flows rerun;
- no new P0/P1 regression;
- unselected candidates remain backlog.

---

### Phase 5 — Release bounded public beta

#### Goal

Make an explicit owner decision from evidence, not feature count.

#### L1. Final production truth audit

Fresh-read:

- exact `main` commit;
- Vercel production deployment;
- Supabase migration history/schema/RLS/critical privileges;
- current Edge Function versions/config;
- Auth provider configuration relevant to released login paths;
- recent provider/runtime errors;
- open P0/P1 issues/PR findings.

#### L2. Recovery/operations check

Two recovery layers must be recorded separately.

User recovery:

- MoneyFlow archive v1 export/validate/restore works and is user-owned.

Infrastructure recovery:

- inspect actual Supabase plan/backup configuration;
- if managed daily backup/PITR is available, record active retention/recovery boundary;
- if project is on Free, keep an owner-controlled off-site logical DB dump procedure using the supported Supabase CLI path;
- infrastructure backup never substitutes for user archive.

#### L3. Trust-copy check

Verify production accurately states:

- what MoneyFlow stores;
- export/data-ownership paths;
- account deletion behavior;
- recovery limitations;
- beta limitations;
- privacy route remains reachable and consistent with implementation.

Do not make legal/compliance claims that have not been separately reviewed.

#### L4. Beta scope/support boundary

Define:

- who is invited;
- how defects are reported;
- financial data users must not put into bug reports;
- known accepted limitations;
- rollback/disable path for P0 security/data incidents.

#### L5. Final evidence packet

Minimum evidence:

- Secure acceptance;
- Recover round-trip;
- physical-phone checklist;
- ~~seven-day self-use summary~~ — withdrawn 2026-08-12;
- zero unresolved P0/P1;
- exact production identities;
- accepted limitations;
- owner decision.

#### L6. Owner decision

Choose one:

- **GO — bounded public beta**;
- **GO with explicit limitations**;
- **NO-GO — return to named phase/blocker**.

Release gate is ROAD-AC10 plus every preceding acceptance criterion.

## Tasks

| ID | Task | Covers | Dependency | Evidence target | Status |
|---|---|---|---|---|---|
| S1 | Fresh production/deployment/auth preflight | ROAD-AC1, AC2, AC3 | current baseline | Git/Vercel/Supabase read-back + pre-test logs | **next** |
| S2 | Password recent-auth acceptance | ROAD-AC1 | S1 | provider-backed password AMR + same-user continuity | todo |
| S3 | Google/OAuth continuity acceptance | ROAD-AC2, AC3 | S1 | provider-backed oauth AMR + continuity/fail-closed evidence | todo |
| S4 | Post-flow logs and Secure closeout | ROAD-AC3 | S2, S3 | Edge/Auth/API/Postgres/Vercel evidence | blocked |
| R1 | Classify all 19 tenant-owned domains | ROAD-AC4 | Secure accepted | archive domain matrix | blocked |
| R2 | Specify archive v1 + empty-tenant restore contract | ROAD-AC4, AC5 | R1 | reviewed archive specification | blocked |
| R3 | Implement export + validator/dry-run | ROAD-AC4, AC5 | R2 | unit/domain/browser evidence | blocked |
| R4 | Implement atomic restore + RLS protection | ROAD-AC5 | R2 | database/tenant-isolation/atomicity evidence | blocked |
| R5 | Round-trip representative tenant | ROAD-AC6 | R3, R4 | export→restore normalized comparison | blocked |
| P1 | Physical-phone core-ledger checklist | ROAD-AC7 | Recover accepted | physical-device evidence | blocked |
| P2 | Seven-day sanitized self-use | ROAD-AC8, AC9 | P1 | daily sanitized log summary | blocked |
| P3 | Fix/rerun all observed P0/P1 | ROAD-AC9 | P2 or interruption | exact affected evidence | blocked |
| I1 | Rank observed friction and select bounded fixes | ROAD-AC9 | Prove evidence | evidence-ranked list | blocked |
| I2 | Implement only selected improvement slice | ROAD-AC9 | I1 | merged + affected rerun evidence | blocked |
| L1 | Final production/recovery/trust audit | ROAD-AC10 | Improve accepted | exact final evidence packet | blocked |
| L2 | Owner bounded-beta decision | ROAD-AC10 | L1 | GO / GO-with-limitations / NO-GO | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-09 | planner | production/evaluator | planned | current main + Trust/current memory + provider/recovery research | Secure behavior still unevidenced | run S1 preflight, then S2 password acceptance |

### Current permission boundary

- Current roadmap creation uses repository branch writes only.
- Runtime/provider inspection may use read-only provider access.
- No destructive account deletion is authorized.
- No production financial-data mutation is authorized.
- No provider config/secret change is authorized.
- Future provider/production writes require a separate explicit owner checkpoint.

## Evaluation

### Current roadmap status

Planning baseline is complete enough to begin Phase 1. No Secure/Recover/Prove acceptance is claimed by this planning PR.

### Immediate next action after roadmap acceptance

Do **not** start a new feature.

Execute:

> **S1 fresh production preflight → S2 production-safe password recent-auth acceptance without confirming account deletion.**

After password evidence, run S3 Google/OAuth continuity. Recover begins only after Secure closes.

### Roadmap completion criteria

This roadmap is complete only when the repository records:

- production Auth/Edge recent-auth behavior proven;
- complete user archive/restore proven by round trip;
- physical mobile proof;
- ~~seven-day self-use proof~~ — withdrawn 2026-08-12;
- no unresolved P0/P1 core blocker;
- exact production state and accepted limitations;
- final owner GO/NO-GO decision.
