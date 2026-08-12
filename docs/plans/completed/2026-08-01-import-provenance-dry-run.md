# Atomic Inbox approval with import provenance and server dry-run

**Status:** accepted  
**Execution state:** accepted  
**Owner:** Thunderkill016  
**Issue/PR:** #182 / #183  
**Accepted:** 2026-08-01

## Outcome

Authenticated Inbox approval is now one atomic database operation. The server classifies the pending candidate, creates the ledger transaction and entries, stores immutable import provenance, links the candidate to the transaction and marks it approved in the same transaction.

A successful ledger write can no longer leave the Inbox candidate pending. Retrying an already-approved candidate returns the existing transaction instead of creating a duplicate. Demo mode remains local.

## Final authorities

| Area | Authority |
|---|---|
| Mutable review queue | `inbox_candidates`, `import_batches` |
| Immutable approved-import lineage | `transaction_import_provenance` |
| Ledger facts | `financial_transactions`, `transaction_entries` |
| Server classification | `plan_inbox_candidate` |
| Atomic commit | `approve_inbox_candidate` |
| TypeScript provenance contract | `src/lib/inbox/provenance.ts` |
| Domain/Supabase mapping | `src/lib/inbox/inbox-map.ts` |
| Authenticated application boundary | `src/app/actions/inbox-approval.ts` |
| Transaction integration | `src/hooks/use-transactions.ts` |

## Scope delivered

### Database

- Added versioned batch and candidate provenance fields.
- Added one-to-one `transaction_import_provenance` with own-row RLS.
- Added tenant/source uniqueness for non-null external IDs.
- Added a versioned, non-unique heuristic fingerprint and protected trigger.
- Added deterministic dry-run results: `would_create`, `duplicate`, `suspected_transfer` and `invalid`.
- Added row-locked, idempotent `approve_inbox_candidate`.
- Preserved transfer neutrality with exactly two opposite ledger entries.
- Allowed reviewed missing mappings to resolve during money or transfer approval while rejecting unknown invalid states.

### Application

- Added typed dry-run and provenance contracts.
- Routed authenticated candidate posting through the atomic Server Action and RPC.
- Kept the existing local approval path for demo mode.
- Round-tripped source row, external ID, fingerprint version, parser version and mapping version.
- Required explicit human confirmation before a heuristic duplicate override reaches the RPC.
- Kept exact external-ID duplicates non-overridable.
- Removed the legacy second candidate-status write after authenticated approval.

### Verification coverage

- Provenance parsing and default tests.
- Candidate and batch mapping tests.
- Duplicate-review tests proving the override defaults to false.
- Fresh migration replay.
- Import provenance, tenant isolation, idempotency, invalid-state and balanced-transfer pgTAP suites.
- Existing expense-path browser smoke and production cross-device UI audit.

## Merge and CI evidence

- Squash commit: `1612788a61841dfd9f0ccac7ec2c142238514125`.
- Exact reviewed PR head: `df15a01712260247bdbb735628a951533f82bd4c`.
- CI #771 passed on the exact PR head:
  - project knowledge, deployment, CSS ownership and architecture contracts;
  - lint and typecheck;
  - unit tests and static RLS checks;
  - production build;
  - fresh Supabase reset and all pgTAP suites;
  - expense-path browser smoke;
  - production cross-device UI audit;
  - Playwright evidence upload.

Earlier red runs exposed temporary codemod residue and a pgTAP plan mismatch. Independent evaluation then found three application-contract gaps: the duplicate override was not forwarded, authenticated approval still entered the legacy status-persistence path, and transfer review could retain an invalid provenance result. All were corrected before the final exact-head run.

## Production rollout evidence

### Database migration

The following merged migrations were applied to production in order:

1. `20260801084523_import_provenance_and_atomic_approval.sql`;
2. `20260801084534_secure_inbox_fingerprint_trigger.sql`;
3. `20260801084604_guard_invalid_inbox_approval.sql`.

Production schema inspection confirmed the new candidate fields, provenance table and RPC authorities. The fingerprint trigger helper remains unavailable for direct browser execution; authenticated users call only the intended planning and approval RPC boundaries.

### Synthetic authenticated smoke

A transaction-scoped production smoke was executed and rolled back after verification:

1. a pending synthetic candidate initially classified as `invalid / account_required`;
2. reviewed transfer approval created one transaction and exactly two opposite entries;
3. the candidate became `approved` and linked to that transaction;
4. one provenance row retained the source row, external ID and parser/mapping versions;
5. the reviewed result was stored as `would_create / resolved_during_review`;
6. approving the same candidate again returned the existing transaction and created no duplicate;
7. the post-approval plan returned `duplicate / already_approved`;
8. the transaction was rolled back so no synthetic user data remained.

This proves the authenticated database/RPC path. It is not a browser-session test of a real user's production account.

### Deployment

- Vercel production deployment: `dpl_5EhmN6PGLSRnL5M7rwmbGzd2Cbdz`.
- Deployed commit: `1612788a61841dfd9f0ccac7ec2c142238514125`.
- Deployment state: `READY`.
- Production alias `mfvn.vercel.app` returned HTTP 200 after deployment.

No migration failure or new runtime blocker was observed during rollout. Supabase Advisor continues to report project-wide informational index findings, expected warnings for authenticated `SECURITY DEFINER` RPCs and the existing leaked-password-protection warning; those are separate hardening work, not hidden as part of this packet.

## Financial and security review

- VND values remain integer đồng.
- Transfers remain neutral to income and expense totals.
- `auth.uid()` is the tenant authority inside the RPCs.
- The client cannot supply `user_id` or an approved transaction ID.
- Cross-tenant candidate, account and category references are rejected below the UI.
- Heuristic fingerprints remain evidence rather than unique identity.
- Historical provenance was not guessed; older rows may remain unlinked or contain null lineage fields.
- No bank sync, reconciliation session, AI categorization, persisted rules engine or background service was added.

## Remaining boundaries

- Imported update/merge policy (`would_update`) remains undefined and out of scope.
- Reconciliation remains a separate future account-level workflow.
- Standard browser CI still uses demo mode; authenticated atomic behavior is covered at the database/RPC layer and by the production synthetic smoke.
- Existing Advisor warnings should be triaged through separate focused issues rather than folded into this completed feature.

## Handoff

The feature issue is complete. Future import work must preserve the authority split between mutable candidates, immutable provenance and ledger facts. Any reconciliation, update-policy or bank-integration work requires a new bounded issue and must not weaken atomic approval, tenant isolation, idempotency or transfer neutrality.
