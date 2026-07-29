# MF TRUST-7 — stabilization and real-use proof

**Status:** in progress  
**Owner:** MoneyFlow  
**Master tracker:** #123  
**Branch:** `agent/mf-trust-7-phase-0`  
**Draft PR:** #124  
**Started:** 2026-07-29

## Outcome

MoneyFlow stops parallel expansion, fixes known core correctness gaps, aligns repository tracking with delivered reality, and proves seven consecutive days of real owner use before reopening redesign or feature breadth.

## Authority

This packet is the only active multi-session plan for TRUST-7. GitHub issue #123 owns progress and decisions. Product and financial truth remain in:

- `docs/product/PRINCIPLES.md`
- `ARCHITECTURE.md`
- `docs/REAL_USE_READINESS_CONTRACT.md`
- `docs/MVP_DEFINITION.md`

## Scope

### Allowed before the day-7 exit review

- bounded P0/P1 correctness, auth, persistence, balance, export or mobile-entry fixes;
- repository/source-of-truth cleanup;
- evidence updates that do not expose secrets or real financial descriptions;
- regression tests required by a reproduced defect.

### Frozen

- new product features;
- redesign, brand expansion or new UI programs;
- new AI/Codex/Claude workflow layers;
- dependency adoption not required by a blocking defect;
- P2/P3 visual polish;
- import/reconciliation/rules/audit roadmap work without self-use evidence.

## Phase 0 — Freeze and cleanup

- [x] Close stale/superseded draft PR #105.
- [x] Close stale/superseded draft PR #107.
- [x] Convert logo candidate PR #119 back to draft and preserve owner approval gate.
- [x] Close completed umbrella issue #70.
- [x] Close completed Calm Ledger umbrella issue #81.
- [x] Keep #72 as the only remaining UI route/state tracker and freeze it under #123.
- [x] Move delivered packets from `docs/plans/active/` to `docs/plans/completed/`.
- [x] Record the owner-confirmed manual readiness gates from #27 without marking seven-day use complete.
- [x] Open draft PR #124 for the documentation cleanup.
- [ ] Let repository CI verify PR #124 before merge.

## Phase 1 — Core correctness

- [ ] #121: keep-open transaction entry remains open from the Dashboard path.
- [ ] #122: demo balance derives deterministically from the current demo ledger.
- [ ] Add regression coverage for Dashboard/FAB, balances, reload and transfer invariants.
- [ ] Run applicable static, unit, build, database and browser gates.

## Phase 2 — Readiness alignment

- [ ] Resolve or document the service-plan constraint for #40.
- [ ] Confirm R0–R6 reflect accepted evidence.
- [ ] Confirm no P0/P1 blocks auth, capture, balance, persistence or export.

## Phase 3 — Seven consecutive days

For seven consecutive calendar days:

- open MoneyFlow at least once;
- record the selected real daily expenses in MoneyFlow instead of the previous method;
- check balance and monthly expense plausibility;
- record only sanitized defect evidence;
- do not add features.

At exit:

- export and open the file in a normal spreadsheet application;
- inspect a sanitized sample for missing or duplicate entries;
- record median entry time from at least five timed entries;
- record how many days MoneyFlow replaced the previous method;
- decide: continue, fix blockers, simplify or stop.

## Change control

Every implementation PR during TRUST-7 must identify one failed gate, touch the smallest necessary boundary, add evidence, state rollback/security implications, and list explicit out-of-scope work.

## Completion

After the day-7 decision and production verification, move this packet to `docs/plans/completed/` with the final decision and evidence summary.