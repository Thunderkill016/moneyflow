# MoneyFlow Trust — execution roadmap to bounded public beta

**Status:** active plan candidate
**Current main baseline:** `4caefac67d9da2dd312fdeae40616fa4efb17517`
**Parent:** `docs/plans/active/public-beta-trust.md`
**Owner:** Thunderkill016
**Last updated:** 2026-08-09

## 1. Purpose

Turn the current functional MoneyFlow MVP into a trustworthy bounded public beta without adding speculative feature breadth.

The execution order is fixed unless new P0/P1 evidence forces a rollback to an earlier phase:

> **Secure → Recover → Prove → Improve → Release**

This roadmap is the practical task sequence. The parent MoneyFlow Trust plan remains the program-level source for phase intent and acceptance criteria.

## 2. Current baseline

Already complete and not to be reopened without new evidence:

- functional MVP released;
- database migration/schema drift reconciled;
- production audit ACL aligned to the reviewed SELECT-only `service_role` contract;
- production `delete-account` Edge Function upgraded to v6 with `verify_jwt=true`;
- provider read-back contains the current recent-auth helper and tenant cleanup inventory;
- UI migration P0–P11 archived with strong automated browser/responsive evidence.

Still open before bounded public beta:

1. provider-backed recent-auth behavioral acceptance;
2. complete versioned user archive/export + safe restore;
3. physical-phone core-ledger proof;
4. seven consecutive days of sanitized self-use without data loss/manual database repair;
5. evidence-selected fixes for any P0/P1 or repeated high-friction issue;
6. final owner public-beta decision.

## 3. Execution rules

1. **Product first.** Process or governance work is not on the critical path unless it directly blocks delivery evidence.
2. **One phase at a time.** Do not start Recover implementation before Secure acceptance; do not start Prove before Recover acceptance.
3. **Evidence matches the claim.** CI does not prove provider behavior; browser emulation does not prove a physical phone; source deployment does not prove authenticated-flow behavior.
4. **No destructive proof.** Never delete a real production account merely to prove reauthentication.
5. **No speculative breadth before beta.** Bank sync, AI advice, household finance, investments, native apps and full envelope budgeting remain out of scope.
6. **Preserve financial invariants.** Integer money, transfer neutrality, split exactness, tenant isolation and soft-delete/recovery behavior remain mandatory.
7. **Production/provider writes require a separate explicit owner approval.** A previous approval never chains into a later write.
8. **Fix blockers where they are found.** A P0/P1 discovered during Prove returns the affected boundary to implementation and verification before the phase advances.
9. **Open process PR #331 is not a MoneyFlow product blocker.** It must not delay this roadmap unless the owner explicitly prioritizes it again.

## 4. Severity used by this roadmap

- **P0:** data loss/corruption, cross-tenant exposure, destructive-account security bypass, impossible recovery of the core ledger.
- **P1:** core daily-ledger flow cannot complete reliably, wrong balance/income/expense/transfer result, authentication/recovery failure, restore is unsafe or non-atomic.
- **P2:** important friction or missing depth with a safe workaround.
- **P3:** polish or speculative improvement.

Only P0/P1 are automatic public-beta blockers.

---

# Phase 1 — Secure acceptance

## Goal

Prove that the already-deployed recent-auth design behaves correctly against the real production Auth/Edge provider without performing destructive account deletion.

## Entry state

Already true:

- #324 recent-auth implementation merged;
- Vercel Next.js path live;
- Supabase DB/schema/ACL prerequisites aligned;
- `delete-account` v6 ACTIVE with `verify_jwt=true`;
- provider bundle read back and source-aligned.

## S1. Fresh production preflight

### Actions

- fresh-read current `main` and production deployment identities;
- confirm Vercel production target still serves the merged auth/delete flow;
- confirm Supabase `delete-account` is still v6 ACTIVE and `verify_jwt=true`;
- confirm Google/OAuth remains enabled for the supported production login path;
- inspect recent Edge/Auth/API/Postgres logs before testing so pre-existing errors are separated from acceptance traffic;
- identify the production-safe account/session to use; do not create or mutate financial data solely for this test.

### Evidence

- exact Git commit;
- Vercel deployment/alias identity;
- Edge version/status/config read-back;
- pre-test provider log timestamp window.

### Stop conditions

Stop before auth testing if deployment identity, Edge source/config or provider state no longer matches the reviewed contract.

## S2. Password recent-auth acceptance

### Preconditions

Use an authenticated same-account session whose latest accepted interactive `password|oauth` AMR is outside the MoneyFlow ten-minute recent-auth window.

### Actions

1. Open the permanent account-deletion flow on production.
2. Confirm the stale session is routed to same-account reauthentication rather than destructive authority.
3. Reauthenticate with the current account password.
4. Confirm the resulting authenticated user ID is unchanged.
5. Confirm the flow returns to the deletion route and requires the destructive confirmation again; typed `XÓA` must not survive the auth boundary.
6. Inspect the verified JWT claims used by the server/provider path and record only non-secret structural evidence:
   - `amr` includes `password`;
   - its timestamp is within the MoneyFlow recent-auth window;
   - the user identity matches the original account.
7. **Do not submit the final destructive deletion action.**

### Pass criteria

- stale session cannot reach tenant purge;
- password step-up succeeds for the same account;
- fresh `password` AMR is observable in provider-backed claims;
- account continuity holds;
- destructive confirmation is reset;
- no user/financial deletion occurs.

## S3. Google/OAuth continuity acceptance

### Actions

1. Start deletion reauthentication from a valid-but-stale same-account session.
2. Confirm the OAuth request forces fresh provider authentication according to the merged flow.
3. Return with the expected same Google account.
4. Confirm callback continuity succeeds only for the expected user and returns to the deletion route with confirmation cleared.
5. Confirm the verified provider-backed claims include a recent `oauth` AMR and the same user identity.
6. Exercise the **missing continuity** fail-closed path without deleting data, for example by removing the expected-user continuity cookie before the callback/re-entry path.
7. If a second safe non-financial test identity already exists, exercise account mismatch and confirm recovery goes to ordinary login. Do not create a second production identity solely to satisfy this optional mismatch case without a separate owner decision.
8. Never confirm account deletion.

### Pass criteria

- same-account Google/OAuth step-up succeeds;
- current `oauth` AMR is provider-evidenced;
- expected-user continuity is enforced;
- missing continuity fails closed/recoverably;
- no silent account switch reaches destructive authority;
- destructive confirmation is reset.

## S4. Post-flow provider observation

Inspect the exact acceptance window in:

- Supabase Edge logs;
- Supabase Auth logs/events available to the project;
- API/Postgres logs for related errors;
- Vercel runtime logs for callback/action failures.

### Pass criteria

- no new P0/P1 error cluster is associated with the tested flows;
- expected auth/reauth traffic is observable where provider logging supports it;
- an absence of logs is recorded as a limitation, not converted into a pass claim.

## S5. Secure closeout

### Actions

- reconcile `account-deletion-recent-auth.md`, Provider Sync, parent MoneyFlow Trust and current project memory;
- close Provider Sync as aligned/accepted for its reviewed boundary;
- mark P1 Secure accepted only if password/OAuth/fail-closed/log evidence supports it;
- record any provider-evidence limitation explicitly;
- unlock Phase 2 Recover.

## Phase 1 acceptance gate

Secure passes only when all are true:

- password step-up provider evidence: PASS;
- supported Google/OAuth step-up provider evidence: PASS;
- missing/stale continuity fail-closed behavior: PASS;
- no destructive production deletion used as proof: PASS;
- post-flow log review: PASS or explicit non-blocking evidence limitation;
- no unresolved P0/P1 auth/security defect.

---

# Phase 2 — Recover: complete user archive and restore

## Goal

A user can export a complete versioned MoneyFlow archive, validate it before mutation, and restore it safely with financial/ownership invariants intact.

This is **not** the same as Supabase project backup. Provider backups recover infrastructure/project state; MoneyFlow needs a user-owned portability/recovery contract.

## R1. Inventory and classify every tenant-owned domain

Use the current deletion/purge inventory as the completeness baseline. The current schema purge checks these 19 tenant-owned tables/domains:

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

For each domain classify it as exactly one of:

- **restorable operational state**;
- **regenerated/derived state**;
- **archive-only historical evidence**.

No purge-owned domain may be silently omitted.

### Default design recommendation

- restore primary operational state and relationship history required to reproduce the ledger;
- treat views/derived read models as regenerated, not serialized;
- keep Auth passwords, JWTs, provider keys, cookies and infrastructure metadata out of the archive;
- treat `financial_mutation_audit_events` as archive-visible history unless a reviewed live-audit restore contract proves that replaying historical audit events is semantically safe.

## R2. Define archive format v1

Use one explicit versioned archive contract, preferably JSON for v1.

### Manifest minimum

- `format`: fixed MoneyFlow archive identifier;
- `version`: integer archive version;
- `exported_at`;
- source application/schema revision;
- domain row counts;
- optional canonical payload checksum for corruption detection;
- no access tokens, passwords, OAuth secrets or service-role material.

### Data rules

- money remains integer minor units;
- dates/timestamps use an explicit stable representation;
- internal relational IDs remain stable inside the archive;
- source tenant ownership is never trusted on restore; restored rows are bound to the currently authenticated destination tenant;
- archive sections have deterministic ordering so round-trip comparisons are stable;
- unsupported future versions fail closed.

## R3. Define restore scope v1 before coding

Keep first restore semantics intentionally narrow:

- restore into an **empty MoneyFlow tenant** only;
- no merge-with-existing-ledger semantics in v1;
- no automatic deletion/replacement of an existing ledger;
- any future replace/merge mode requires a separate reviewed contract.

This removes ambiguity around duplicate IDs, double-counting and conflict resolution.

## R4. Build archive export

### Requirements

- export every domain classified for archive inclusion;
- use ownership-safe server reads/RPCs;
- produce deterministic v1 output;
- verify row counts against the source tenant;
- expose the archive from Settings/Data ownership, separate from the existing human-readable CSV transaction export;
- clearly label the archive as sensitive financial data stored on the user's device.

## R5. Build validator/dry-run

Before any restore write, validate:

- archive identifier/version;
- parse/shape;
- required sections;
- type/enum validity;
- integer money;
- referential integrity;
- transfer balance/neutrality;
- split exactness;
- account/category/reference existence;
- recurrence/goal/reconciliation relationships;
- duplicate IDs;
- destination tenant emptiness;
- unsupported or corrupt sections.

Output a human-readable dry-run summary:

- version;
- row counts by domain;
- validation warnings/errors;
- whether restore is permitted.

Validation failure must produce **zero writes**.

## R6. Build atomic restore

### Requirements

- server-controlled destination identity;
- one atomic database transaction or equivalent all-or-nothing RPC boundary;
- insert in dependency-safe order;
- remap tenant ownership to the authenticated destination user;
- preserve logical IDs where the empty-tenant v1 contract allows it;
- any failure rolls the whole restore back;
- never disable RLS globally or expose service credentials to the client.

## R7. Round-trip and failure tests

Required automated evidence:

### Unit/domain

- archive parser and version dispatch;
- deterministic serialization;
- corrupt/partial/unsupported archive rejection;
- checksum mismatch if checksum is adopted;
- integer money and financial invariant validation.

### Database/RLS

- user A cannot export or restore user B data;
- empty-tenant restore succeeds atomically;
- partially invalid archive causes zero committed rows;
- wrong-owner IDs are ignored/remapped rather than trusted;
- transaction/entry relationships survive restore;
- transfers remain balanced and excluded from income/expense;
- split totals remain exact;
- recurrence, goals, Inbox/provenance/rules and reconciliation relationships remain valid.

### End-to-end round trip

1. create or use a synthetic non-production fixture tenant;
2. populate representative records across every restorable domain;
3. export archive;
4. restore into a fresh empty synthetic tenant;
5. compare normalized state and financial totals;
6. verify UI can load the restored ledger without manual DB repair.

## R8. Recover acceptance gate

Recover passes only when:

- every purge-owned domain is classified explicitly;
- archive v1 format is documented and versioned;
- export includes all required user-owned state;
- corrupt/partial/unsupported archives fail with zero writes;
- tenant isolation is proven;
- round-trip restore reproduces normalized financial state/invariants;
- restore is atomic;
- credentials/secrets are excluded;
- no P0/P1 recovery defect remains.

---

# Phase 3 — Prove: physical device and real self-use

## Goal

Demonstrate that MoneyFlow survives the real daily-ledger loop outside automated test harnesses.

## P3.1 Physical-phone acceptance

Minimum required evidence: one real physical phone on the production domain. Browser/device emulation is supplementary only.

### Core checklist

- sign in and sign out;
- recovery/login return path if safely exercisable;
- create expense;
- create income;
- create balanced transfer;
- edit transaction;
- soft delete + restore;
- inspect account balance/register;
- inspect dashboard totals;
- inspect report totals/transfer exclusion;
- category selection/edit path;
- budget view/update path;
- recurring/goal navigation does not block core use;
- export standard CSV;
- export MoneyFlow archive after Recover is implemented;
- touch targets, keyboard/input behavior, scrolling and destructive confirmations are usable.

### Platform rule

- physical Android Chrome is a strong minimum because MoneyFlow is a mobile-first web product;
- if a physical iOS/Safari device is unavailable, record it as an explicit beta limitation rather than claiming coverage.

## P3.2 Seven-consecutive-day sanitized self-use

For seven consecutive calendar days:

- use production MoneyFlow as the primary sanitized personal ledger for the chosen test scope;
- record real daily-loop actions rather than synthetic button clicking;
- include ordinary create/edit/correction behavior;
- include at least one transfer during the evidence period when naturally applicable;
- use export/archive during the period at least once;
- do not repair production state manually in SQL;
- record defects/friction without copying sensitive finance data into GitHub/docs.

### Daily log fields

- date;
- device/browser;
- core flows used;
- failure/friction category;
- severity P0/P1/P2/P3;
- reproducible? yes/no;
- workaround required? yes/no;
- data loss/corruption? yes/no;
- manual DB repair? must remain no.

## P3.3 Defect triage rule

- P0: stop Prove immediately; fix and re-establish relevant trust evidence.
- P1: fix before Prove can close; rerun affected core flow.
- P2: fix before beta only if repeated/high-friction or owner-selected.
- P3: backlog.

## P3.4 Prove acceptance gate

Prove passes only when:

- physical-phone core checklist passes;
- seven consecutive days complete;
- zero data loss/corruption;
- zero manual production DB repair;
- no unresolved P0/P1 core-flow defect;
- observed P2/P3 friction is captured for Improve/backlog.

---

# Phase 4 — Improve from evidence only

## Goal

Fix the highest-value friction actually observed during Prove without reopening speculative feature breadth.

## I1. Build evidence-ranked list

For every observed issue record:

- frequency;
- severity;
- core-job impact;
- workaround cost;
- risk to financial trust;
- implementation/rollback boundary.

Priority order remains:

1. correctness/ownership;
2. core transaction flow;
3. mobile/accessibility;
4. recovery/explanations;
5. trust depth;
6. repeated friction;
7. planning/reporting depth;
8. performance;
9. polish.

## I2. Select a bounded improvement slice

Before beta, choose only:

- all remaining P0/P1 issues; plus
- at most the smallest set of repeated P2 friction that materially hurts the daily ledger.

Do not implement product-depth candidates merely because they exist in current memory.

## I3. Candidate backlog only if evidence selects it

Current known product-depth candidates include:

- richer account closing/reconciliation matching;
- split-line correction;
- user-facing mutation-audit depth;
- budget rollover/flex;
- recurring history/matching;
- goal funding/contribution history;
- report account/type dimensions and deeper drill-down;
- broader deterministic rule conditions/actions.

These remain candidates until self-use/user evidence selects them.

## I4. Improve acceptance gate

- all selected fixes merged and production-evidenced at the correct layer;
- affected self-use/physical flows rerun;
- no new P0/P1 regression;
- unselected product-depth items remain backlog rather than silently entering scope.

---

# Phase 5 — Release bounded public beta

## Goal

Make an explicit owner decision from evidence, not from feature count.

## L1. Final production truth audit

Fresh-read and reconcile:

- exact `main` commit;
- Vercel production deployment;
- Supabase migration history/schema/RLS/critical privileges;
- current Edge Function versions/config;
- Auth provider configuration relevant to released login paths;
- recent relevant provider/runtime errors;
- open P0/P1 GitHub issues/PR findings.

## L2. Recovery/operations check

Two separate recovery layers must be understood:

### User recovery

- MoneyFlow archive v1 export/validate/restore is working and user-owned.

### Infrastructure recovery

- inspect the actual Supabase plan/backup configuration;
- if the project is on a plan with managed daily backup/PITR, record the active retention/recovery boundary;
- if it is on Free, maintain an owner-controlled off-site logical database dump procedure using the supported Supabase CLI path;
- infrastructure backup never substitutes for the user archive contract.

## L3. Trust-copy check

Verify the production UI/copy accurately states:

- what MoneyFlow stores;
- export/data-ownership paths;
- account deletion behavior;
- recovery limitations;
- beta limitations;
- privacy route remains reachable and consistent with actual implementation.

Do not make legal/compliance claims that have not been separately reviewed.

## L4. Beta scope and support boundary

Define before opening access:

- who is invited;
- how defects are reported;
- what financial data users should avoid putting into bug reports;
- known accepted limitations;
- rollback/disable path if a P0 security/data issue appears.

## L5. Final evidence packet

Minimum release evidence:

- Secure acceptance evidence;
- Recover round-trip evidence;
- physical-phone evidence;
- seven-day self-use log summary;
- zero unresolved P0/P1;
- exact current production identities;
- accepted limitations;
- owner decision.

## L6. Release decision

Owner chooses one:

- **GO — bounded public beta**;
- **GO with explicit limitations**;
- **NO-GO — return to named phase/blocker**.

A release decision must identify the exact unresolved limitation if not fully green.

---

# 6. Master tracking table

| Stage | Task | Current status | Gate to advance |
|---|---|---|---|
| Secure | S1 fresh provider/deployment preflight | next | provider state still matches reviewed source |
| Secure | S2 password reauth acceptance | todo | fresh password AMR + same-account continuity |
| Secure | S3 Google/OAuth continuity acceptance | todo | fresh oauth AMR + continuity/fail-closed proof |
| Secure | S4 post-flow logs | todo | no acceptance-blocking error cluster |
| Secure | S5 closeout | blocked | S2–S4 pass |
| Recover | R1 tenant-domain classification | blocked | Secure accepted |
| Recover | R2 archive v1 contract | blocked | R1 complete |
| Recover | R3/R4 export + validator | blocked | contract accepted |
| Recover | R5/R6 atomic restore + tests | blocked | exporter/validator stable |
| Recover | R7 round-trip evidence | blocked | implementation green |
| Recover | R8 closeout | blocked | round trip + failure isolation pass |
| Prove | physical-phone checklist | blocked | Recover accepted |
| Prove | seven-day self-use | blocked | physical core flow usable |
| Prove | defect closure | blocked | no unresolved P0/P1 |
| Improve | evidence-selected fixes | blocked | Prove evidence available |
| Release | final truth/recovery/trust audit | blocked | Improve accepted |
| Release | owner beta decision | blocked | release evidence complete |

# 7. Immediate next action

Do **not** start a new feature.

Next execution target is:

> **Phase 1 / S1 → S2: fresh production preflight, then production-safe password recent-auth acceptance without confirming account deletion.**

After password evidence is captured, the next target is Google/OAuth continuity acceptance. Recover begins only after Secure closes.

# 8. Definition of roadmap completion

This roadmap is complete only when the owner has made the bounded public-beta decision and the repository records:

- security behavior proven against production Auth/Edge;
- complete user archive/restore proven by round trip;
- physical mobile proof;
- seven-day self-use proof;
- no unresolved P0/P1 core blocker;
- exact production state and accepted limitations;
- final GO/NO-GO decision.
