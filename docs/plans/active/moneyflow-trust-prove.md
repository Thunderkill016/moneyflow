# MoneyFlow Trust — P3 Prove

**Status:** remediating
**Execution state:** remediating — physical run done, four defects fixed, bounded owner retest outstanding
**Active role:** human_owner (the physical run); planner (this packet)
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #323 parent; #356 this packet; #357 remediation
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

The physical run happened on 2026-08-12 and is recorded below as **owner-observed**.
Four defects were remediated in #357 and are **unverified on hardware** — a bounded
owner retest of PP-03, PP-07, PP-12 and PP-16 is what closes P3, and only the owner
can supply it. The seven-day requirement was withdrawn by the owner; no duration gate
replaces it.

## Repository reconnaissance

### Current behavior — the shipped daily loop, read from code at `277d459`

| Fact | Where | Why it shapes the checklist |
|---|---|---|
| There are **five** mobile tabs: **Tổng quan** `/dashboard`, **Giao dịch** `/transactions`, the capture action rendered with the visible label **`Ghi`**, **Tài khoản** `/accounts`, and **Thêm** (`#more`) | `src/lib/nav-ia.ts:43-72`, `src/components/layout/app-shell.tsx:79-84`, and the visible label at `app-shell.tsx:437` | the loop is reached through tabs, so scenarios navigate the way a user does. The tab reads `Ghi`; `Nhập nhanh` is the desktop sidebar label and survives on mobile only as the accessible name |
| The primary action is `Ghi chi tiêu` → `/capture/quick`; pages may override it with a dialog while keeping the label | `src/lib/nav-ia.ts:84-87` | a scenario must accept **either** affordance rather than pinning one |
| Expense and income are one dialog with a segmented control: `Khoản chi (−)` at `:334` and `Khoản thu (+)` at `:346` | `src/components/add-transaction-dialog.tsx:323-347` | one form covers two scenarios; the sign is user-visible and checkable |
| Category options are filtered to the selected kind | `src/components/add-transaction-dialog.tsx:85-87,202` | category/kind mismatch is prevented in the UI, so the scenario checks the filtering rather than trying to force a mismatch |
| Transfer is a separate dialog, opened by **`Chuyển tiền ví`** in the register and **`Chuyển tiền`** on Accounts | `src/components/transactions/transactions-workspace.tsx:685`, `src/components/accounts/accounts-workspace.tsx:263`, `src/components/transfer-dialog.tsx` | transfers need their own scenario and their own invariant, and the two entry points are labelled differently |
| Delete uses native `window.confirm`, then an **8-second** undo through the shell notice action `Hoàn tác` | `src/components/transactions/transactions-workspace.tsx:78,483-532,623` | the undo window is time-boxed, so recovery is a genuinely load-bearing phone test — a slow tap loses it |
| Amount inputs set `inputMode="decimal"` | `add-transaction-dialog.tsx:359`, `transfer-dialog.tsx:229`, `edit-transaction-dialog.tsx:244` | the numeric keypad is a claim that can only be confirmed on hardware |
| The layout uses `viewportFit: "cover"` with `env(safe-area-inset-*)` throughout the shell | `src/app/layout.tsx:57-60`, `src/components/layout/app-shell.module.css` | notch/home-indicator behavior is real product code, not speculation, so it is worth one scenario |
| Money renders with `tabular-nums` (`src/components/money-value.module.css:13-15`), and a sign appears only in `mode="kind"` via `formatMoneyWithKind` (`src/lib/money.ts:51-55`) | `src/components/money-value.tsx` — note that `src/components/ui/money-value.tsx` has **zero importers** and is dead code; do not read it for shipped behavior | legibility of the sign is checkable without relying on colour, but only where the kind mode is used |
| Amount entry is **digits-only**: `parseMoneyInput` strips every non-digit, so a keypad separator is silently swallowed — typing `12,5` yields **125 đồng** | `src/lib/money.ts:69-72` | the decimal keypad offers a separator the parser discards, which is exactly the kind of quiet wrongness a device run must catch (PP-16) |
| A save carries an **idempotency key** created before the attempt and cleared only on success | `src/components/add-transaction-dialog.tsx:241-242,273` | product code that exists to stop a duplicate row on a retried save; retrying after a failure is therefore a real scenario (PP-15) |
| A new transaction defaults to the Vietnam calendar day and the date is user-editable | `src/components/add-transaction-dialog.tsx:72` | a row landing on the wrong day is the most ordinary trust failure in a daily ledger (PP-17) |
| Dashboard figures cover the **current month only**; the register's totals cover whatever is filtered, and no period filter is applied by default | `src/lib/finance.ts:152-158`, `src/components/transactions/transactions-workspace.tsx:176-177,339-347` | the two surfaces legitimately differ, so a scenario must not demand that they match |

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
**R7 — Seven-day self-use and owner waiver**. R6 is ticked against a 390×844
**Chromium viewport**, with one owner-confirmed real-keyboard line dated 2026-07-27.
R7's duration gate was accepted on the owner's **statement** of 2026-07-29 that seven
days of use had already happened; the explicit *waiver* there covers four separate
exit-review checks (CSV comparison, timing, replacement rate), not the duration
itself.

A future reader must not conclude from that document that PBT-AC12 or PBT-AC13 are
already satisfied. They are not, for three reasons:

1. **Precedence.** `AGENTS.md` gives the active packet ownership of execution state,
   and `docs/plans/active/public-beta-trust.md` is the current program: it records
   PBT-AC12 and PBT-AC13 as open. Nothing in `AGENTS.md` ranks
   `REAL_USE_READINESS_CONTRACT.md` above or below anything, so this reason rests on
   the Trust plan being the live program rather than on a documented hierarchy.
2. **Different bar.** R6's evidence is an emulated viewport plus a single owner
   statement. The Trust program asks for the loop exercised on hardware with
   per-scenario recorded results.
3. **Different window.** R7's acceptance rests on use that happened *before* the log
   existed, on a build three phases and several defect fixes old. The current
   production build is not the build that was used.

R6/R7 remain a truthful record of what was accepted **then**, and this packet does
not edit or re-tick them. They are simply not substitutes for P3 now.
`check:prove-evidence` only ever reads `docs/evidence/p3-prove/`, so it neither
accepts nor rejects them — the reconciliation above is the safeguard, not the tool.

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
- **No product change came from the preparation PR (#356).** Defects the run found
  were remediated in a separate bounded mission (#357), which is where the runtime
  fixes and this packet's status update live together. What remains forbidden is
  repairing product behavior inside an *evidence* PR — the file that records what a
  device did must not also change what the device would do.

## Research

No external research. Every scenario below is derived from code read in this
repository at `277d459`; the only genuinely unknown input is the owner's hardware,
which is recorded with the run rather than assumed.

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
- [ ] **P3-AC2** Every scenario result is one of `pass`, `fail`, `blocked`,
      `fail_then_pass` or `not_applicable` — never inferred, never left implicit,
      never back-filled from memory. `not_applicable` is for hardware that lacks the
      feature under test, never for a scenario that was skipped.
- [ ] **P3-AC3** Financial invariants hold everywhere they are checked: integer đồng
      **on entry** (PP-16) as well as on display, transfer neutrality (PP-05, PP-09),
      edit-by-difference (PP-06), and exactly one row per logical transaction even
      after a retried save (PP-15).
- [ ] **P3-AC4** Persistence is proven by a full reload, not by an in-app
      navigation that could be served from memory.
- [ ] **P3-AC5** Committed evidence contains no amount, description, payee, email,
      account identifier, token or screenshot of private financial content, and
      `npm run check:prove-evidence` passes.
- [ ] **P3-AC6** Automated emulator evidence is never recorded as physical.
- [ ] **P3-AC7** A first-run failure followed by a retry success is recorded as
      `fail_then_pass` **and** carries a row in the Defects table, so the finding
      exists somewhere a reader will see it. `check:prove-evidence` refuses a
      `fail_then_pass` that has neither an explanation nor a defect row.
- [ ] **P3-AC8** Any P0 stops the run; any P1 is recorded with a decision before
      the phase can be accepted.
- [~] **P3-AC9** ~~P3-T2's Day 0 prerequisites~~ — **withdrawn** with the seven-day
      requirement on 2026-08-12. Nothing replaces it. Marked withdrawn rather than
      ticked: a withdrawn criterion is not a satisfied one.
- [ ] **P3-AC10** Every P1 from the physical run is fixed or explicitly accepted, and
      the retest set is bounded rather than a repeat of all seventeen.

## Implementation plan

1. define the loop and the scenario table from current code (this packet);
2. add a deterministic evidence template plus a validator that enforces
   completeness and the privacy rule mechanically;
3. hand off to the owner for the physical run of P3-T1;
4. on return, record sanitized results and classify any defect;
5. remediate every P1, then take the bounded owner retest;
6. reconcile the parent plan and memory when retest evidence exists — not before.

## The physical-phone checklist (P3-T1)

Seventeen scenarios. Read the invariant column as strictly as the action column: a
scenario that "worked" but broke an invariant is a **fail**.

Vietnamese UI strings are quoted exactly as shipped so the checklist needs no
interpretation.

### Device matrix

| Tier | What | Rule |
|---|---|---|
| **REQUIRED** | the owner's own primary phone | Record platform, OS version, browser and browser version with the run. All seventeen scenarios run here. This is the only tier that can satisfy PBT-AC12. |
| **OPTIONAL** | a second platform (whichever of Android/iOS the required device is not), **only if the owner already owns one** | If the owner does not own one, record `not_possessed`. That is a named limitation, exactly like P1's stale-AMR probes — **never** a failure, and never a reason to buy hardware or fabricate a result. |
| **AUTOMATED (context only)** | the existing Playwright audit viewports and browser shards | Already runs in CI. Recorded as `emulated`. It may support a finding; it can never convert a missing physical run into a pass. |

Any emulator, simulator, cloud device farm or resized desktop browser is
`emulated`. The required tier means hardware in a hand.

### Scenarios

| ID | Precondition | Exact action | Expected visible result | Invariant | Persistence | Evidence |
|---|---|---|---|---|---|---|
| **PP-01** | Signed out, production origin open in the phone browser | Sign in with the owner's normal method | The authenticated app opens on **Tổng quan**; all five bottom tabs are visible (`Tổng quan`, `Giao dịch`, `Ghi`, `Tài khoản`, `Thêm`) and each responds to a tap; the page does not scroll sideways | The session is a real authenticated session, **not** demo mode | — | `pass/fail`, platform + browser version |
| **PP-02** | Signed in, at least two active accounts exist | Open **Tài khoản** | Each active account card shows a balance amount as visible text, with `Số dư ban đầu:` beneath it. Digits do not wrap or clip at the phone's default text size | The balance is a whole-đồng amount: **vi-VN uses `.` as the thousands separator**, so `120.000` is correct and a **`,` followed by 1–2 digits** would be wrong | — | `pass/fail`, count of accounts shown |
| **PP-03** | On **Tổng quan** | Tap the capture action (the `Ghi` tab or the on-page primary button — **not** a typed URL). Choose `Khoản chi (−)`, type an amount **using only digits**, pick a category, save | A success notice appears; the expense appears in **Giao dịch** immediately, displayed with a **minus** sign | Expense reduces the chosen account's balance by exactly the amount entered | Reappears after PP-11 | `pass/fail`, whether the keypad was numeric |
| **PP-04** | As PP-03 | In the same form, switch the segment to `Khoản thu (+)` and watch the category list, then save an income row | The category options **change** when the segment changes, so only income categories remain; the saved row appears with a **plus** sign. Both pickers open and close by touch without triggering a save | Income increases the balance by exactly the amount entered, and no expense category can be attached to an income row through the UI | Reappears after PP-11 | `pass/fail`, whether category options changed with the kind |
| **PP-05** | Two accounts with non-zero balance | Open the transfer dialog — `Chuyển tiền ví` in **Giao dịch** or `Chuyển tiền` on **Tài khoản** — move an amount A→B, confirm | A transfer row appears; both account balances change | **Source −amount, destination +amount, net zero.** The register's `Khoản thu` and `Khoản chi` totals are **unchanged** — a transfer is never income or expense | Both balances survive PP-11 | `pass/fail`, totals recorded as `unchanged`/`changed` |
| **PP-06** | The PP-03 expense exists | Open it in **Giao dịch**, change the amount and the category, save | The row shows the new amount and category; **no second row** is created | The balance moves by exactly the **difference**, not by the new amount | New values survive PP-11 | `pass/fail`, balance moved by difference only `yes/no` |
| **PP-07** | A disposable expense row exists | Delete it, accept the native confirmation, then tap `Hoàn tác` **within 8 seconds** | The row disappears, then returns; the balance returns to its pre-delete value | Recovery is exact — same amount, account, category and date | Restored row survives PP-11 | `pass/fail`, whether 8 seconds was comfortably enough |
| **PP-08** | Another disposable expense row exists | Delete it, accept the confirmation, and let the notice expire without tapping `Hoàn tác` | The row stays out of the register; the balance reflects the removal | Balance change equals exactly the deleted amount — no orphaned remainder | Still absent after PP-11 | `pass/fail` |
| **PP-09** | The rows from PP-03 – PP-08 exist | In **Giao dịch**, tap the `Khoản chi`, `Khoản thu` and `Chuyển tiền` type filters in turn | Each filter shows only rows of that type; the transfer appears under `Chuyển tiền` and under **neither** of the other two | A transfer is not reachable as income or as expense | — | `pass/fail` |
| **PP-10** | PP-03 – PP-08 done **today** | Open **Tổng quan**, then **Giao dịch** | Today's rows appear on both surfaces, and each surface's own income/expense figures account for exactly the rows it covers | **Do not compare the two surfaces' totals to each other.** Tổng quan covers the **current month**; the register covers everything unless filtered, so different numbers are correct behavior. What must hold is that the transfer from PP-05 is excluded from income and expense on **both** | — | `pass/fail`, whether the transfer was excluded on both |
| **PP-11** | Rows recorded above | **Fully reload** the page (pull-to-refresh or the browser's reload — not tab switching), then reopen **Giao dịch** and **Tài khoản** | Every row and balance from PP-03 – PP-08 is still correct after the reload | Nothing lost, nothing duplicated, nothing silently re-created | this **is** the persistence proof | `pass/fail`, row count before and after |
| **PP-12** | Capture form open | With the on-screen keyboard raised, reach the amount field and the save control; rotate to landscape and back; look at the top and bottom edges of the screen | The keyboard never covers the save control; neither orientation scrolls sideways; content is not clipped at the top or bottom edge; every control you need can be hit **without pinch-zooming** | — | — | `pass/fail`, orientations tested; `not_applicable` for the edge check if the device has no notch or home indicator |
| **PP-13** | Capture form filled, network disabled (airplane mode) | Attempt to save. Do **not** retry yet. Re-enable the network and fully reload | The failure message `Mất kết nối khi lưu. Hãy thử lại.` appears; after the reload there is **no row** and no balance moved | A failed save changes nothing at all | verified by the reload | `pass/fail`, rows present after reload (must be 0 new) |
| **PP-14** | The phone's own light/dark setting | View **Tài khoản** and **Giao dịch** in the theme the owner actually uses, then change the OS theme once and look again | Amounts stay legible in both themes, and an expense is still distinguishable from income **with colour ignored** (by its sign) | Money is never distinguished by colour alone | — | `pass/fail`, themes checked |
| **PP-15** | Capture form filled, network disabled | Attempt to save and let it fail. Re-enable the network and tap save **again on the same form** | The row is created **once** | **Exactly one row** exists for one logical transaction, and the balance moved once. The product carries an idempotency key precisely for this path | Single row survives PP-11 | `pass/fail`, rows created by the retry (must be 1) |
| **PP-16** | Capture form open | In the amount field, type a value using the keypad's **decimal separator** (for example `12,5` or `12.5`), then look at what the form and the saved row show | Whatever is saved matches what you believe you entered — if the separator is discarded, the amount is wrong and this is a **fail** | Money is integer đồng: a separator must not silently change the magnitude of the amount | — | `pass/fail`, amount matched what was typed `yes/no` |
| **PP-17** | Capture form open, phone clock set to the owner's normal timezone | Save an expense without touching the date field, then find it in **Giao dịch** | The row is dated **today** in the app's own calendar, grouped under today | A row lands on the day the owner meant, not a neighbouring day | Date unchanged after PP-11 | `pass/fail`, date matched the intended day `yes/no` |

**Why these seventeen and not others.**

PP-14 is included because reading a balance correctly *is* the daily-ledger claim,
the repository already forbids colour-only money, and the OS theme is outside the
owner's control in-app. It is one bounded check, not a design review.

PP-13 and PP-15 use airplane mode deliberately: they reach a real error state
**without** a destructive probe, corrupted data or a forced server fault. They are
split because they prove opposite things — PP-13 that a failure writes nothing, and
PP-15 that *retrying* it writes exactly one row. PP-15 is the single highest-value
scenario here: the product ships an idempotency key for that path, and a duplicated
transaction is a silent balance error the owner would discover days later.

PP-16 exists because the amount field advertises a decimal keypad while the parser
discards separators, so the keypad offers a key that changes the amount by a factor
of ten. That is only observable by typing on a real keyboard.

PP-17 exists because a row on the wrong day is the most ordinary way a daily ledger
loses trust, and the default depends on a timezone the phone controls.

PP-09 tests the type filters rather than restating PP-04's category filtering, so no
two scenarios cover the same behavior.

### Failure classification for P3

| Severity | Definition | Effect |
|---|---|---|
| **P0** | Data loss; cross-tenant exposure; balance or financial-invariant corruption; or the core ledger cannot be used safely | **Stop the run.** Record and report immediately. P3 cannot be accepted until it is fixed and the affected scenarios are re-run. |
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

## Seven-day self-use — withdrawn by the owner

On **2026-08-12**, after running the physical checklist, the owner **removed the
seven-day self-use requirement** from the active program.

- P3 Prove is now **physical-phone core-ledger acceptance only**.
- P3-T2 was never started. No day 1 exists, so nothing is lost by withdrawing it.
- **No replacement duration gate is introduced.** Not "three days", not "a week of
  spot checks" — the requirement is gone, not renamed.
- `PBT-AC13` is marked withdrawn in the parent plan rather than deleted, so the
  decision stays visible instead of looking like an oversight.
- The historical seven-day records in `docs/REAL_USE_READINESS_CONTRACT.md` (R7,
  2026-07-29) remain **historical truth** and are not re-opened, re-ticked or reused
  as current evidence.

Real daily use continues to be how defects get found — this run is the proof of that
— but it is no longer a counted gate.

## Owner-reported physical run (2026-08-12)

**Provenance:** reported by the owner in the remediation mission brief, not through a
signed evidence file. It is recorded here as **owner-observed** and deliberately
**not** written into `docs/evidence/p3-prove/` as a completed run: that file requires
the owner's own declaration that each result was observed on the device, and no agent
may sign it on their behalf. The blank working copy on the owner's machine was left
untracked and uncommitted.

No amounts, descriptions, payees, account names, identifiers, tokens or screenshots
were transferred into this repository. The owner's screenshots contain real financial
amounts and stay outside Git.

| ID | Owner-observed | Note |
|---|---|---|
| PP-01 | pass, with a performance finding | navigation and tab transitions often exceed one second |
| PP-02 | pass | |
| PP-03 | pass functionally, **defect** | a financial aggregate briefly showed a wrong intermediate value before settling |
| PP-04 | pass | |
| PP-05 | pass | transfer was disabled with one account and enabled after a second was created — the precondition working, **not** a defect |
| PP-06 | pass | |
| PP-07 | pass functionally, **defect** | the `Hoàn tác` feedback presentation was defective on the phone |
| PP-08 – PP-11 | pass | |
| PP-12 | **fail** | mobile sheet/viewport behavior, observed in "Thêm & tài khoản" |
| PP-13 – PP-15 | pass | |
| PP-16 | **fail** | separator input could silently change the amount's magnitude |
| PP-17 | pass | |

### Severity applied

| Ref | Scenario | Severity | Why |
|---|---|---|---|
| D1 | PP-16 | **P1** | a wrong amount can be saved with no visible sign, and the daily loop has no safe workaround beyond avoiding a key on the keypad |
| D2 | PP-03 | **P1** | a financial figure that flashes a wrong number undermines the trust the ledger claim depends on |
| D3 | PP-12 | **P1** | the shared sheet is on the daily path; unusable positioning blocks ordinary use |
| D4 | PP-07 | finding | recovery worked; its presentation was defective |
| D5 | PP-01 | finding | latency, with no data or correctness impact |

No P0 was reported: no data loss, no cross-tenant exposure, no balance corruption.

### Remediation and the bounded retest

Fixes landed in #357. Each is a root-cause change in a shared primitive, so the
retest is a **subset**, not another full run:

| Ref | Root cause | Fix | Retest |
|---|---|---|---|
| D2 (PP-03) | the confirmed row arrives with a server id, so the pending row's id filter never removed it; both existed inside the transition and every aggregate counted the amount twice | both rows carry the idempotency key, and the optimistic layer retires the pending row when its confirmation lands | **PP-03** |
| D3 (PP-12) | four competing `max-height` declarations on one element (utility vs CSS module, equal specificity), an inner scroll box constrained to its own `100dvh` rather than its parent, `dvh` resizing with browser chrome, and safe-area padding on the outer box instead of the footer | one height owner, `svh` throughout, the scroll box bounded by its dialog, safe-area on the edges that touch the device, and `interactiveWidget: "resizes-content"` so the keyboard resizes the layout | **PP-12** |
| D1 (PP-16) | `parseMoneyInput` stripped every non-digit, so `12,5` became `125` while the field advertised a decimal keypad | entry is whole đồng: grouping separators are accepted, a fraction tail is rejected with a message, and every money field asks for a numeric keypad | **PP-16** |
| D4 (PP-07) | the toast title was an `inline-flex` with no `min-width: 0`, so the note in the delete notice overflowed instead of wrapping | the title shrinks and wraps; placement still comes from the shell variable that already clears the nav | **PP-07** |
| D5 (PP-01) | **not fixed.** Every authenticated route is a dynamic server render with a database read per navigation; there is no bounded regression to undo, and the tabs already use client-side navigation | parked as a performance finding | **not required** — no navigation code changed |

### Bounded retest status and remaining PP-12 work

The owner reported the bounded retest after #357 directly to the implementer. This
is **owner-observed**, not a signed evidence file: no agent may convert it into a
physical-device pass declaration.

| Scenario | Current status | Scope decision |
|---|---|---|
| PP-03 | pass | remains closed unless a later change regresses it |
| PP-07 | pass functionally | toast presentation remains a parked UI finding |
| PP-12 | **fail** | only remaining P3 blocker; #358 is the focused candidate remediation |
| PP-16 | pass | remains closed unless a later change regresses it |

#358 removes the last competing mobile height utility from the More sheet,
makes that sheet's height definite, and assigns the shared Dialog grid's middle
row to its existing scroll body. Its authenticated browser regression reaches and
hit-tests **Đăng xuất** at standard and short phone heights, but it is not a
substitute for the same-phone retest. P3 remains open and P3-T1e awaits that
one PP-12 retest after #358 merges.

## Parked for the later Brand / Product Experience rebuild

Real findings from the same physical run, recorded **once** here so they are not
lost, and deliberately **not** acted on in this mission. None blocks the
daily-ledger claim, and fixing them piecemeal would be the start of the broad UI
redesign this phase must not begin. Whichever mission opens the Brand / Product
Experience rebuild should adopt this list as input.

| Ref | Finding | Why it is parked rather than fixed now |
|---|---|---|
| UX-1 | Tapping the MoneyFlow logo while already on Dashboard does not visibly refresh | navigation semantics, not a functional defect; the answer depends on what the logo should mean, which is a design decision |
| UX-2 | Dashboard Planning shortcuts are compressed horizontally and their labels clip | layout of a planning surface, outside the core loop |
| UX-3 | Budget and planning mobile pages have poor hierarchy, truncation and density | a redesign of those screens, not a primitive defect |
| UX-4 | A focused input can show overlapping double cyan focus borders | focus treatment belongs to the design system; changing it carelessly risks accessibility, and the run confirmed focus is visible today |
| UX-5 | Cancel/Confirm ordering and visual hierarchy differ across transaction, account and budget dialogs | needs one decision applied everywhere, which is a system change rather than a fix |
| UX-6 | The transaction summary 2×2 block mixes count and money metrics, uses too much mobile space, and "Còn lại" can be read as an account balance | information design; "Còn lại" wording in particular needs a product decision, and the sums themselves are correct |
| UX-7 | "Chia khoản chi" purpose and discoverability are unclear | discoverability of an advanced capture tool, explicitly not core product identity |
| UX-8 | The owner's physical screenshots contain real financial amounts | **never copy or commit them.** They stay outside Git; this row exists so the constraint survives with the findings |

PP-01's navigation latency is recorded above as D5 and is also parked: the cause is
architectural — every authenticated route is a dynamic server render with a database
read per navigation — so it belongs to a performance slice, not a UI rebuild.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P3-T1a | define the loop, scenarios, device matrix, severity and evidence protocol | P2 accepted | this packet | complete |
| P3-T1b | evidence template + deterministic validator | P3-T1a | `docs/evidence/p3-prove/TEMPLATE.md`, `scripts/check-prove-evidence.mjs` | complete |
| P3-T1c | **owner** runs the seventeen scenarios on the required device | P3-T1b | owner-reported 2026-08-12, recorded above as owner-observed; **no signed evidence file exists** | reported, not filed |
| P3-T1d | classify defects and remediate every P1 | P3-T1c | #357 — PP-03, PP-07, PP-12, PP-16 | complete, unverified on hardware |
| P3-T1e | **owner** retests the remaining PP-12 blocker on the same device | #358 merged | PP-12 only | **awaiting owner** |
| ~~P3-T2~~ | ~~seven consecutive days of sanitized self-use~~ | — | **withdrawn 2026-08-12**, never started | withdrawn |
| P3-T3 | reconcile parent plan and memory with real evidence | P3-T1e | PBT-AC12 | blocked on the retest |

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
| 2026-08-12 | planner | human_owner | specified | packet + template + validator on `277d459`; no device evidence exists | physical-phone loop unproven; seven-day run not started | owner runs the seventeen REQUIRED scenarios and returns the sanitized evidence file |
