# MF TRUST-7 — stabilization and real-use proof

**Status:** Phase 3 active; candidate Day 1 pending completion  
**Owner:** MoneyFlow  
**Issue/PR:** #123 / #131  
**Daily evidence log:** #127  
**Last updated:** 2026-07-29

## Outcome

MoneyFlow remains frozen against redesign and feature expansion while the owner attempts seven consecutive days of real use. Phase 3 accepts only daily, sanitized owner evidence. It does not convert ordinary app usage, task activation, CI, telemetry or a general statement that bugs exist into a completed day.

## Repository reconnaissance

### Current behavior

- Phase 0 shipped through PR #124 and reconciled stale PR, issue and active-packet state.
- Phase 1 shipped through PR #125 and closed correctness issues #121 and #122.
- Phase 2 shipped through PR #126 and reconciled R0–R6, the Supabase #40 plan constraint and the authenticated mutation-RPC audit.
- Current production is deployed from `main`; no runtime change is required to activate Phase 3.
- On 2026-07-29 the owner confirmed that MoneyFlow was used and that multiple defects were observed.
- The defect details and remediation are deliberately deferred to a separate plan. They are not authorized scope for this Phase 3 activation change.
- The owner statement proves a real-use session occurred, but it does not yet prove that all Day 1 checks were completed.

### Relevant repository areas

| Area | Why it matters | Rule during Phase 3 |
|---|---|---|
| `docs/REAL_USE_READINESS_CONTRACT.md` | Authority for R0–R7 completion claims | Keep R7 incomplete until exit evidence exists |
| `docs/plans/active/mf-trust-7.md` | Sole active execution packet | Record protocol and current phase state |
| GitHub #123 | Durable master tracker | Own Phase 3 scope and exit decision |
| GitHub #127 | Subordinate daily evidence log | Store only sanitized daily records |
| GitHub #40 | Managed Auth hardening constraint | Keep open and plan-blocked |
| GitHub #72 and PR #119 | Deferred UI/brand work | Keep frozen |

### Existing tests and constraints

- Static, build, database and browser gates remain the technical baseline.
- Integer VND, transfer net-zero, exactly-once mutation, tenant isolation and export safety remain mandatory.
- Evidence must exclude credentials, tokens, personal email addresses and real financial descriptions.
- A defect may be described only in synthetic or sanitized terms.
- No feature, visual, workflow or dependency expansion is allowed during Phase 3.

### Open questions

- [ ] Did 2026-07-29 include all required Day 1 actions: open the app, record the selected spending group, check balance/month total and capture sanitized defect evidence?
- [ ] Which defects are P0/P1 blockers versus deferred friction or polish? This classification belongs to the separate defect plan, not this activation PR.

## Research

No new external research is required. Phase 3 is an owner-behavior and evidence phase, not a product-discovery or implementation phase.

### Evidence policy

A calendar day is accepted only when the owner confirms all of the following for that date:

1. MoneyFlow was opened at least once.
2. The chosen real-use spending group was recorded in MoneyFlow instead of the previous method.
3. Balance and current-month spending were checked for plausibility.
4. Any defect note was sanitized and contained no real financial description.

If one calendar day is missed or cannot be evidenced, the consecutive seven-day window restarts from the next fully accepted day. Evidence cannot be backfilled from telemetry, reminders or memory alone.

## Specification

### Problem

R0–R6 are technically and manually accepted, but R7 still lacks seven consecutive daily records and an exit review. The project must prove routine usefulness before reopening the defect-remediation roadmap, redesign or feature breadth.

### User stories

- As the owner, I can complete a small daily checklist without exposing private financial data.
- As a reviewer, I can distinguish a real-use session from a fully accepted R7 day.
- As the next planning agent, I can use a separate defect inventory after TRUST-7 without mixing it into this phase.

### Acceptance criteria

- [x] Phase 3 is explicitly activated after Phase 2 delivery.
- [x] The 2026-07-29 owner statement is recorded as a real-use session with multiple defects observed.
- [x] The same statement is not overstated as a completed Day 1.
- [x] Defect remediation is deferred to a separate plan.
- [x] A subordinate daily evidence log exists in #127 under parent #123.
- [ ] Seven consecutive calendar days satisfy the complete daily checklist.
- [ ] Final CSV is exported and opened in a normal spreadsheet application.
- [ ] A sanitized sample is checked for missing or duplicate rows.
- [ ] Median entry time is calculated from at least five measurements.
- [ ] The number of days MoneyFlow replaced the previous method is recorded.
- [ ] Exit decision is recorded: continue, fix blockers, simplify or stop.

### Out of scope

- Implementing or triaging the newly observed defects.
- Creating a feature roadmap from those defects.
- UI, brand, workflow, dependency or architecture changes.
- Marking Day 1 complete from the current owner statement alone.
- Enabling Supabase leaked-password protection without a qualifying plan.

## Implementation plan

### Daily protocol

At the end of each candidate day, record only:

- date;
- app opened: yes/no;
- selected spending group recorded: yes/no;
- balance and month total checked: yes/no;
- sanitized defect count or short synthetic summary;
- accepted/restart status.

### Candidate seven-day window

| Candidate day | Date | App opened | Selected group recorded | Balance/month checked | Sanitized defect evidence | Status |
|---|---|---|---|---|---|---|
| Day 1 | 2026-07-29 | owner-confirmed | not yet confirmed | not yet confirmed | multiple defects observed; details deferred | partial — not accepted |
| Day 2 | 2026-07-30 | pending | pending | pending | pending | pending |
| Day 3 | 2026-07-31 | pending | pending | pending | pending | pending |
| Day 4 | 2026-08-01 | pending | pending | pending | pending | pending |
| Day 5 | 2026-08-02 | pending | pending | pending | pending | pending |
| Day 6 | 2026-08-03 | pending | pending | pending | pending | pending |
| Day 7 | 2026-08-04 | pending | pending | pending | pending | pending |

The table is a candidate window, not a guarantee. If Day 1 remains partial or any later day fails, the next fully accepted date becomes the new Day 1 and the exit date moves accordingly.

### Data and migration impact

- Schema/migration: none.
- Auth configuration: none.
- Runtime code: none.
- Production data: unchanged.
- Rollback: revert the documentation commit and tracker comment.

### Risks and counterexamples

| Risk/counterexample | Prevention |
|---|---|
| “I used it” is treated as a completed day | Require all four daily checks |
| Defects expand Phase 3 into an unbounded fix program | Defer details and remediation to a separate plan |
| A missed day is silently ignored | Restart the consecutive window |
| Real transaction descriptions leak into GitHub | Store only sanitized summaries/counts |
| Reminder delivery is mistaken for usage evidence | Reminders never count as proof |

### Verification plan

- Repository: normal documentation PR CI must pass.
- GitHub: #123 remains open, #127 remains subordinate and records only daily evidence.
- Production: no deployment behavior change is claimed.
- Manual: each accepted day requires an explicit owner confirmation covering all daily fields.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P0 | Freeze and repository reconciliation | none | PR #124 | done |
| P1 | Core correctness fixes | P0 | PR #125 | done |
| P2 | Security/manual readiness synchronization | P1 | PR #126 | done |
| P3-0 | Activate seven-day protocol and candidate log | P2 | PR #131 / #123 / #127 | in progress |
| P3-1 | Accept first complete daily record | P3-0 | owner confirmation | pending |
| P3-2 | Complete seven consecutive accepted days | P3-1 | daily sanitized records | pending |
| P3-3 | Run final export, duplicate/missing review and timing summary | P3-2 | exit evidence | pending |
| P3-4 | Record continue/fix/simplify/stop decision | P3-3 | exit review | pending |

Rules:

- R7 cannot be backfilled from task activation, telemetry or reminders.
- Only a separately scoped, bounded P0/P1 blocker may interrupt the freeze.
- The newly observed defects are not silently fixed or classified in this packet.
- #40 stays open until the managed setting is actually enabled and reverified.

## Evaluation

### Current acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Phase 0 delivered | PR #124 | pass |
| Phase 1 delivered | PR #125 | pass |
| Phase 2 delivered | PR #126 | pass |
| Real-use session occurred on 2026-07-29 | owner statement | pass |
| Full Day 1 checklist completed | incomplete fields | not yet accepted |
| Defect work kept separate | explicit scope boundary | pass |
| Daily evidence log created | #127 | pass |
| Seven consecutive accepted days | daily log | pending |

### Remaining limitations

- The current owner statement does not confirm the selected spending group or balance/month review.
- The observed defect set has not been captured or classified; this is intentional and belongs to another plan.
- R7 completion date cannot be known until seven consecutive accepted days exist.
- UI/brand/roadmap work remains frozen.

## Delivery record

- Phase 0 branch/PR: `agent/mf-trust-7-phase-0` / #124
- Phase 0 squash commit: `93a8ac52aa94b7a8451e27be86af8567806b450c`
- Phase 1 branch/PR: `agent/mf-trust-7-phase-1` / #125
- Phase 1 squash commit: `470f4ac6a79dd925eef6a834d745b768c7650967`
- Phase 1 CI: #501 — verify, database and e2e passed
- Phase 1 production deployment: `dpl_14kdUsxkxruYnBVYThQWUu9msJzh` — READY
- Phase 2 branch/PR: `agent/mf-trust-7-phase-2` / #126
- Phase 2 squash commit: `2f0150ff68078919a0e22d7d915f47b9a777c8e3`
- Phase 2 CI: #504 — verify, database and e2e passed
- Phase 3 activation branch/PR: `agent/mf-trust-7-phase-3-start` / #131
- Phase 3 daily evidence log: #127
- Phase 3 production behavior change: none
- Next gate: first fully accepted daily record, then seven consecutive accepted days
