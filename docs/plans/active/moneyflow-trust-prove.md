# MoneyFlow Trust — P3 Prove

**Status:** specified
**Execution state:** specified — awaiting owner execution of P3-T1
**Active role:** human_owner (the physical run); planner (this packet)
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #323 parent; #356 this packet
**Last updated:** 2026-08-12

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Canonical short name:** MoneyFlow Trust P3 Prove
**Program authority:** `docs/plans/active/public-beta-trust.md` (PBT-AC12 – PBT-AC15)

This packet owns **execution detail only**. Program state, phase sequence and
accepted limitations stay in the parent plan; current implementation truth stays in
`docs/research/CURRENT_PROJECT_MEMORY.md`. Nothing here restates either.

## Outcome

The owner can run a bounded, unambiguous checklist on their own physical phone and
return sanitized results that either support or refuse the claim *"MoneyFlow is a
trustworthy daily ledger"* — without inventing evidence, without putting private
financial content into Git, and without a passing automated suite standing in for a
device that was never held.

**This packet prepares the acceptance. It is not evidence.** No scenario below has
been executed. P3-T2's seven-day run has **not** started; day 1 does not exist.

## Repository reconnaissance

### Current behavior — the shipped daily loop, read from code at `277d459`

| Fact | Where | Why it shapes the checklist |
|---|---|---|
| Mobile tabs are **Tổng quan** `/dashboard`, **Giao dịch** `/transactions`, **Nhập nhanh** (action), **Tài khoản** `/accounts`, **Thêm** (`#more`) | `src/lib/nav-ia.ts:41-73`, `src/components/layout/app-shell.tsx:79-84` | the loop is reached through four tabs, so scenarios navigate the way a user does, not by typing routes |
| The primary action is `Ghi chi tiêu` → `/capture/quick`; pages may override it with a dialog while keeping the label | `src/lib/nav-ia.ts:84-87` | a scenario must accept **either** affordance rather than pinning one |
| Expense and income are one dialog with a segmented control: `Khoản chi (−)` / `Khoản thu (+)` | `src/components/add-transaction-dialog.tsx:329-346` | one form covers two scenarios; the sign is user-visible and checkable |
| Category options are filtered to the selected kind | `src/components/add-transaction-dialog.tsx:85-87,202` | category/kind mismatch is prevented in the UI, so the scenario checks the filtering rather than trying to force a mismatch |
| Transfer is a separate dialog reached from the register and Accounts | `src/components/transaction-form.module.css`, `src/components/transfer-dialog.tsx` | transfers need their own scenario and their own invariant |
| Delete uses native `window.confirm`, then an **8-second** undo through the shell notice action `Hoàn tác` | `src/components/transactions/transactions-workspace.tsx:78,483-532,623` | the undo window is time-boxed, so recovery is a genuinely load-bearing phone test — a slow tap loses it |
| Amount inputs set `inputMode="decimal"` | `add-transaction-dialog.tsx:359`, `transfer-dialog.tsx:229`, `edit-transaction-dialog.tsx:244` | the numeric keypad is a claim that can only be confirmed on hardware |
| The layout uses `viewportFit: "cover"` with `env(safe-area-inset-*)` throughout the shell | `src/app/layout.tsx:57-60`, `src/components/layout/app-shell.module.css` | notch/home-indicator behavior is real product code, not speculation, so it is worth one scenario |
| Money renders with `tabular-nums` and an explicit sign | `src/components/ui/money-value.tsx:59` | legibility of the sign is checkable without relying on colour |

### Existing automated coverage, and exactly what it does not prove

`playwright.audit.config.ts` runs emulated viewports at 320×568, 360×800, 390×844,
768×1024, 1024×768, 1366×768 and 1440×900 across browser engines, and `e2e/`
covers the expense path, transfer review, register filters and bulk correction.

That is **emulator and desktop-engine evidence**. It cannot produce a real
touch target, a real on-screen keyboard, a real notch, real Vietnamese IME input,
real network loss, or real device performance. A 390×844 Chromium window is **not**
a physical-phone pass, and this packet never treats one as such.

### Conflicting older authority — reconciled here, deliberately

`docs/REAL_USE_READINESS_CONTRACT.md` contains **R6 — Mobile daily path** and
**R7 — Seven-day self-use and owner waiver**, in which R7's duration gate is marked
accepted under an explicit owner waiver dated 2026-07-29 and R6 is ticked against a
390×844 **Chromium viewport** with one owner-confirmed keyboard line dated
2026-07-27.

A future reader must not conclude from that document that PBT-AC12 or PBT-AC13 are
already satisfied. They are not, for three reasons:

1. **Precedence.** `AGENTS.md` puts the reviewed controlling work packet above
   historical documents. MoneyFlow Trust is the current program, and it records
   physical-phone and seven-day proof as open.
2. **Different bar.** R6's evidence is an emulated viewport plus a single owner
   statement. The Trust program asks for the loop exercised on hardware with
   per-scenario recorded results.
3. **Different window.** R7's waiver covers use that happened *before* the log
   existed, on a build three phases and several defect fixes old. The current
   production build is not the build that was used.

R6/R7 remain a truthful record of what was accepted **then**. They are not
substitutes for P3 now, and `check:prove-evidence` will not accept them as such.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/layout/app-shell*` | owns mobile tabs, primary action, notice/undo | read only |
| `src/components/add-transaction-dialog.tsx` | expense and income capture | read only |
| `src/components/transfer-dialog.tsx` | transfer capture | read only |
| `src/components/transactions/transactions-workspace.tsx` | register, edit, delete, undo | read only |
| `src/components/accounts/accounts-workspace.tsx` | balance visibility | read only |
| `docs/REAL_USE_READINESS_CONTRACT.md` | older mobile/seven-day record | reconcile by reference, do not edit or re-tick |
| `scripts/check-prove-evidence.mjs` | evidence schema and privacy validator | add |

### Existing tests and constraints

- Domain and contract tests already assert the loop's invariants deterministically,
  including the 8-second undo constant (`src/lib/ui-phase5-transactions-contract.test.ts:139`).
- Product law: VND is integer đồng; transfers are never income or expense; money
  must not rely on colour alone.
- **No product change is expected from this packet.** If the run finds a real
  defect, it is reported and fixed in its own bounded mission — never repaired
  inside a preparation or evidence PR.

## Research

No external research. Every scenario below is derived from code read in this
repository at `277d459`; the only genuinely unknown input is the owner's hardware,
which is recorded at Day 0 rather than assumed.

| Source | What it established | What it does not cover |
|---|---|---|
| `src/lib/nav-ia.ts`, `app-shell.tsx` | the four mobile tabs and the primary action target | how they feel under a thumb |
| `add-transaction-dialog.tsx`, `transfer-dialog.tsx`, `edit-transaction-dialog.tsx` | the three capture paths, their kinds, and `inputMode` | whether a real keyboard covers the save control |
| `transactions-workspace.tsx` | delete confirmation, the 8-second undo, edit entry point | whether 8 seconds is enough on a real device |
| `playwright.audit.config.ts`, `e2e/` | the extent of automated coverage | anything physical |
| `docs/REAL_USE_READINESS_CONTRACT.md` | what was accepted in July and on what basis | it predates this build and this program |

Privacy, licence and rollback implications: none beyond this repository. The
validator reads only files the owner chooses to commit; no data leaves the machine.

## Specification

### The core daily-ledger loop, defined

MoneyFlow's stated core jobs are: record quickly, know balances, understand where
money went, and retain trustworthy data. On a phone, the minimum journey that
supports the daily-ledger claim is:

> **open the real app → see balances → record an expense → record income → move
> money between accounts → correct a mistake → recover from a wrong delete →
> confirm totals and balances are right → confirm it survives leaving and
> returning.**

Everything in the checklist serves one of those nine steps.

### Deliberately excluded, with reasons

Not "not important" — **not part of the daily-ledger claim**, so including them
would inflate a device run that a human has to actually perform:

| Excluded | Why it is not in the phone loop |
|---|---|
| Budgets, goals, recurring commitments, income templates | planning surfaces; a ledger is trustworthy or not before any plan is laid on top |
| Inbox, paste/upload capture, import batches, rules | advanced capture tools, explicitly not product identity (`AGENTS.md`) |
| Backup and restore | accepted in P2 on its own evidence; re-proving it on a phone adds nothing |
| Account deletion | destructive, and P1 Secure already accepted it with named limitations |
| Reconciliation, split expense, custom report ranges | correction and analysis depth, not the daily loop |
| Onboarding/registration | the owner already has an account; a fresh signup is not the daily path |

If the owner wants any of these covered, that is a **separate** acceptance, not an
extension of P3-T1.

### Acceptance criteria

- [ ] **P3-AC1** Every REQUIRED scenario is executed on a physical phone the owner
      actually possesses, with device and browser versions recorded.
- [ ] **P3-AC2** Every scenario result is `pass`, `fail` or `blocked` — never
      inferred, never left implicit, never back-filled from memory.
- [ ] **P3-AC3** Financial invariants hold everywhere they are checked: integer
      đồng, transfer neutrality, and balances that match the arithmetic.
- [ ] **P3-AC4** Persistence is proven by a full reload, not by an in-app
      navigation that could be served from memory.
- [ ] **P3-AC5** Committed evidence contains no amount, description, payee, email,
      account identifier, token or screenshot of private financial content, and
      `npm run check:prove-evidence` passes.
- [ ] **P3-AC6** Automated emulator evidence is never recorded as physical.
- [ ] **P3-AC7** A first-run failure followed by a retry success is recorded as a
      **finding**, not as a pass.
- [ ] **P3-AC8** Any P0 stops the run; any P1 is recorded with a decision before
      the phase can be accepted.
- [ ] **P3-AC9** P3-T2's Day 0 prerequisites are met and recorded before day 1 is
      claimed.

## Implementation plan

1. define the loop and the scenario table from current code (this packet);
2. add a deterministic evidence template plus a validator that enforces
   completeness and the privacy rule mechanically;
3. hand off to the owner for the physical run of P3-T1;
4. on return, record sanitized results and classify any defect;
5. only then open P3-T2's seven-day window;
6. reconcile the parent plan and memory when real evidence exists — not before.

## The physical-phone checklist (P3-T1)

Fourteen scenarios. Read the invariant column as strictly as the action column: a
scenario that "worked" but broke an invariant is a **fail**.

Vietnamese UI strings are quoted exactly as shipped so the checklist needs no
interpretation.

### Device matrix

| Tier | What | Rule |
|---|---|---|
| **REQUIRED** | the owner's own primary phone | Record platform, OS version, browser and browser version at Day 0. All fourteen scenarios run here. This is the only tier that can satisfy PBT-AC12. |
| **OPTIONAL** | a second platform (whichever of Android/iOS the required device is not), **only if the owner already owns one** | If the owner does not own one, record `not_possessed`. That is a named limitation, exactly like P1's stale-AMR probes — **never** a failure, and never a reason to buy hardware or fabricate a result. |
| **AUTOMATED (context only)** | the existing Playwright audit viewports and browser shards | Already runs in CI. Recorded as `emulated`. It may support a finding; it can never convert a missing physical run into a pass. |

Any emulator, simulator, cloud device farm or resized desktop browser is
`emulated`. The required tier means hardware in a hand.

### Scenarios

| ID | Precondition | Exact action | Expected visible result | Invariant | Persistence | Evidence |
|---|---|---|---|---|---|---|
| **PP-01** | Signed out, production origin open in the phone browser | Sign in with the owner's normal method | The authenticated app opens on **Tổng quan**; the four tabs are visible and reachable one-handed; no horizontal scrolling | The session is a real authenticated session, **not** demo mode | — | `pass/fail`, platform + browser version |
| **PP-02** | Signed in, at least two active accounts exist | Open **Tài khoản** | Each active account shows `Số dư hiện tại`; digits align and are legible at the phone's default text size | Balances are whole đồng — no decimal separator, no rounding artefact | — | `pass/fail`, count of accounts shown |
| **PP-03** | On **Tổng quan** | Tap the primary `Ghi chi tiêu` action (FAB or tab — **not** a typed URL). Choose `Khoản chi (−)`, enter a small amount, pick a category, save | A success notice appears; the expense appears in **Giao dịch** immediately with a **minus** sign | Expense reduces the chosen account's balance by exactly the amount entered | Reappears after PP-11 | `pass/fail`, whether the keypad was numeric |
| **PP-04** | As PP-03 | Same form, switch to `Khoản thu (+)`, save an income row | The income row appears with a **plus** sign; category options changed to income categories when the segment was switched | Income increases the balance by exactly the amount entered | Reappears after PP-11 | `pass/fail`, whether category options changed with the kind |
| **PP-05** | Two accounts with non-zero balance | Open the transfer dialog from **Giao dịch** or **Tài khoản**, move an amount A→B, confirm | A transfer row appears; both account balances change | **Source −amount, destination +amount, net zero.** The register's income and expense totals are **unchanged** — a transfer is never income or expense | Both balances survive PP-11 | `pass/fail`, income/expense totals before and after (sanitized: "unchanged" / "changed") |
| **PP-06** | The PP-03 expense exists | Open it in **Giao dịch**, change the amount and the category, save | The row shows the new amount and category; no duplicate row is created | The balance moves by exactly the **difference**, not by the new amount | New values survive PP-11 | `pass/fail` |
| **PP-07** | A disposable expense row exists | Delete it, accept the native confirmation, then tap `Hoàn tác` **within 8 seconds** | The row disappears, then returns; the balance returns to its pre-delete value | Recovery is exact — same amount, same account, same category, same date | Restored row survives PP-11 | `pass/fail`, whether 8 seconds was comfortably enough on this device |
| **PP-08** | Another disposable expense row exists | Delete it, accept the confirmation, and let the notice expire without tapping `Hoàn tác` | The row stays out of the register; the balance reflects the removal | No orphaned amount: balance change equals exactly the deleted amount | Still absent after PP-11 | `pass/fail` |
| **PP-09** | In the capture form | Switch between `Khoản chi (−)` and `Khoản thu (+)`; inspect the account and category pickers | Category options always match the selected kind; both pickers are operable by touch and dismissible without a stray save | No expense category can be attached to an income row through the UI | — | `pass/fail` |
| **PP-10** | PP-03 – PP-08 done | Return to **Tổng quan**, then **Giao dịch** | Dashboard figures and register totals reflect exactly the rows recorded, and agree with each other | Sum of income − sum of expense matches the reported net; transfers excluded from both | — | `pass/fail`, whether dashboard and register agreed |
| **PP-11** | Rows recorded above | **Fully reload** the page (pull-to-refresh or reload, not tab switching), then reopen **Giao dịch** and **Tài khoản** | Every row and balance from PP-03 – PP-08 is still correct after the reload | Nothing lost, nothing duplicated, nothing silently re-created | this **is** the persistence proof | `pass/fail`, sanitized row count before and after |
| **PP-12** | Capture form open | With the on-screen keyboard raised, reach the amount field and the save control; rotate to landscape and back; observe the top notch and bottom home indicator areas | The keyboard never covers the save control; no horizontal scrolling in either orientation; content is not clipped by the notch or home indicator; tap targets are hittable without zoom | — | — | `pass/fail`, orientation tested, whether the keypad was numeric |
| **PP-13** | Capture form filled, network disabled (airplane mode) | Attempt to save, then re-enable the network and reload | A clear failure message appears; **no phantom row** is present after the reload, and no balance moved | A failed save changes nothing at all | verified by the reload | `pass/fail`, whether the message was understandable |
| **PP-14** | The phone's own light/dark setting | View **Tài khoản** and **Giao dịch** in the theme the owner actually uses, then switch the OS theme once | Amounts and their signs stay legible in both themes; the sign is readable without depending on colour | Money is never distinguished by colour alone | — | `pass/fail`, which themes were checked |

PP-14 is included because reading a balance correctly *is* the daily-ledger claim,
the repository already forbids colour-only money, and the OS theme is outside the
owner's control in-app. It is one bounded check, not a design review.

PP-13 uses airplane mode deliberately: it reaches a real error state **without** a
destructive probe, corrupted data or a forced server fault.

### Failure classification for P3

| Severity | Definition | Effect |
|---|---|---|
| **P0** | Data loss; cross-tenant exposure; balance or financial-invariant corruption; or the core ledger cannot be used safely | **Stop the run.** Record and report immediately. P3 cannot be accepted, and a seven-day run must not start or continue. |
| **P1** | A reproducible blocker, or materially wrong behavior, in the normal daily loop with no reasonable safe workaround | Record with reproduction steps. Finish the remaining scenarios if it is safe to do so. PBT-AC14 requires an explicit owner decision on every P1 before acceptance. |
| **finding** | Anything else worth recording: friction, unclear wording, a slow response, a cosmetic defect | Recorded; does not block acceptance by itself. |

Deliberately three levels and no more. A larger taxonomy would be invention, not
policy.

**Retry rule.** If a scenario fails and then passes on retry, its result is
`fail_then_pass` and it counts as a **finding until explained**. Intermittent
failure in a financial ledger is a defect with an unknown cause, and the phase
cannot be accepted on the second attempt while the first is unexplained. The
validator rejects a `fail_then_pass` row that carries no note.

### Sanitized evidence protocol

Evidence lives in **one** file the owner fills in:
`docs/evidence/p3-prove/physical-phone-<YYYY-MM-DD>.md`, copied from
`docs/evidence/p3-prove/TEMPLATE.md`.

Allowed in Git — consistent with `docs/REAL_USE_READINESS_CONTRACT.md`'s existing
evidence rules:

- device platform, OS version, browser and browser version;
- scenario ID and result (`pass` / `fail` / `blocked` / `fail_then_pass`);
- the run date, and elapsed time if useful;
- **counts** (rows before/after, accounts shown) and booleans;
- "unchanged" / "changed" for totals, rather than the totals;
- defect references and free-text notes **about behavior**;
- screenshots **only** when verified to contain no private financial content.

Never in Git: real amounts, transaction descriptions, payees, notes, category
names the owner invented for private purposes, account numbers or names that
identify a real institution, emails, user ids, tokens, session data, or a raw
archive/CSV export.

`npm run check:prove-evidence` enforces the shape and scans for the forbidden
patterns. It is a guard, not a promise: the owner remains the last check on a
screenshot's contents, and the validator says so rather than implying it can see
inside an image.

## Seven-day handoff (P3-T2 — prepared, NOT started)

**Day 1 has not begun.** Nothing below may be recorded until P3-T1 passes.

### Day 0 prerequisites

1. P3-T1 complete on the required device with no open P0.
2. Every P1 from P3-T1 has an explicit owner decision recorded (fixed, accepted, or
   deferred with a reason).
3. The device and build under test are recorded: device row plus the production
   commit SHA the owner is actually using.
4. `docs/evidence/p3-prove/seven-day-<YYYY-MM-DD>.md` created from the template.

### What counts as a completed day

A day counts when the owner has, on that calendar day, **used MoneyFlow as their
actual ledger** — at minimum one real transaction recorded on the phone — and
recorded, sanitized:

- the date;
- a count of transactions recorded;
- whether balances looked correct at the end of the day (`yes`/`no`);
- whether any manual database repair was needed (`no` is required);
- any defect reference.

A day with genuinely no money movement counts **only** if the owner opened the app,
confirmed balances still looked correct, and recorded `transactions: 0` with that
confirmation. Silence is not a completed day.

### What resets the streak

- **Data loss or a P0** — the streak resets to zero, and the run cannot resume
  until the defect is fixed and P3-T1's affected scenarios are re-run.
- **Manual database repair** to keep the ledger usable — resets, because the claim
  is explicitly "without manual database repair".
- **A missed calendar day** — the days must be consecutive; a gap ends that attempt
  and a new attempt starts at day 1.
- **A production deploy that changes the daily loop mid-run** — the remaining days
  would be evidence about a different build. Days already completed stay recorded
  as a partial attempt on the earlier SHA.

### What does NOT reset the streak

- A `finding` or a P1 with a safe workaround, recorded with its reference.
- A deploy that does not touch the daily-ledger loop.
- Low usage on a quiet day, provided the day is recorded as above.
- Travel, a different network, or a temporary offline period, as long as the app
  was used and nothing was lost.

### When a P0 or P1 pauses the run

A **P0 pauses immediately** and resets. A **P1 does not pause** the run, but must be
recorded the day it is found; PBT-AC14 blocks acceptance until the owner decides on
it.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P3-T1a | define the loop, scenarios, device matrix, severity and evidence protocol | P2 accepted | this packet | complete |
| P3-T1b | evidence template + deterministic validator | P3-T1a | `docs/evidence/p3-prove/TEMPLATE.md`, `scripts/check-prove-evidence.mjs` | complete |
| P3-T1c | **owner** runs the fourteen scenarios on the required device | P3-T1b | sanitized evidence file | **awaiting owner** |
| P3-T1d | classify defects; report any P0/P1 as its own bounded mission | P3-T1c | issue/PR references | blocked |
| P3-T2 | seven consecutive days of sanitized self-use | P3-T1 accepted | seven-day evidence file | **not started** |
| P3-T3 | reconcile parent plan and memory with real evidence | P3-T2 | PBT-AC12/AC13 | blocked |

## Verification

For this packet: `check:knowledge`, `check:prove-evidence`, `test:ci-policy`,
typecheck and unit tests. No pgTAP, browser or production evidence is claimed —
this change adds documentation and one validator, and touches no product code.

Deliberately **not** verified here, because it cannot be: anything about the
physical device. That is the whole point of P3-T1.

## Permission boundary

`branch_write` + read-only provider inspection. No production write, no ledger
mutation by any agent, no Auth/provider change, no schema or Edge change, no
restore, no account deletion, no branch-protection change.

The physical run is performed **by the owner**, in the owner's own authenticated
session, on the owner's own device. No agent touches the owner's ledger, and the
owner's real data never needs to leave the phone.

## Evaluation

An independent fresh-context evaluation runs against this packet before merge,
attacking: a checklist that tests features rather than the daily-ledger claim;
automated evidence mislabelled physical; private financial data requested as
evidence; vague expected results; missing persistence proof; unchecked
transfer/income/expense semantics; retry-pass treated as pass; an impossible device
matrix; ambiguous streak rules; duplicated project authority; P3 claimed as started
or complete; and harness debt expanded outside scope. Findings and fixes are
recorded in the pull request.

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-12 | planner | human_owner | specified | packet + template + validator on `277d459`; no device evidence exists | physical-phone loop unproven; seven-day run not started | owner runs the fourteen REQUIRED scenarios and returns the sanitized evidence file |
