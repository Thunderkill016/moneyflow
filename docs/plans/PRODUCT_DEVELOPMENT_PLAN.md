# MoneyFlow — Product Development Plan

**Last updated:** 2026-08-18
**Baseline:** `main@fec1195` (PR #419 merged)
**Status legend:** ✅ done · 🔄 in progress · ⬜ not started · ⛔ blocked on someone other than an agent

This is the strategic view. `docs/plans/active/README.md` remains the execution
board and outranks this file on what is being worked right now. Where the two
disagree, the board and current code win.

---

## 1. What this product is

A Vietnamese, manual-first personal income-and-expense ledger. Four jobs: record
quickly, know balances, understand where money went, and keep data that can be
trusted and exported.

Its declared brand mechanism (Phase D) is **traceability + reversibility** — not
automation, not advice. It cannot beat bank-sync competitors on effort, so its
claim has to be that every figure is accountable and every action is undoable.

---

## 2. Honest assessment

### What is genuinely strong ✅

- Financial invariants are real and enforced: integer đồng, transfer neutrality,
  soft delete with recovery, financial maths in tested domain modules.
- Verification culture is unusually strong — risk-proportional gates, exact-head
  provider checks, pgTAP, a knowledge contract, and PR memory records.
- Capture is fast. Five consecutive releases (#404, #408, #410, #412, #414) drove
  the quick-capture path down to amount-first with learned presets.

### The central product problem ⚠️

**Five releases lowered the cost of recording; none raised the payoff.**

Manual ledgers do not die because entry is slow. They die because entry is
unrewarded — you type fifty rows and get a pie chart. Optimising capture speed
attacks the cost side of a trade the user is already losing on.

Two consequences, both now identified from code rather than assumption:

1. Until 2026-08-18 the dashboard contained **zero links**. Numbers were shown but
   could not be interrogated — the traceability half of the brand promise was
   documented as a target, not shipped.
2. Demo/first-run opens with an **empty ledger**: maximum cost, zero payoff, and
   the category panel does not even render.

### Where the diminishing returns show

#406 was superseded by #408; #410 by #412; #412's presentation by #414. That is
three of five releases replaced by the next one — a loop, not progress.

---

## 3. Roadmap

### Phase 1 — Make recorded data pay the user back 🔄

The thesis: convert MoneyFlow from a data-entry chore into something that answers
questions. Nothing here needs new financial modelling or a research contract.

| # | Item | Status | Notes |
|---|---|---|---|
| 1.1 | Category figure → the rows behind it | ✅ | Whole-row target, month-accurate window, transfer-neutral. 10 invariant tests + browser test. |
| 1.2 | Statement period → the month's rows | ✅ *(reduced scope)* | I had framed this as blocked on a density decision, which was the wrong frame: it assumed each figure had to become its own 44px target, and the legend is a `flex-wrap` row with an 8px gap where that would overlap. The period row above it was already a two-column flex holding one child, so the control lands where the layout expected it and the legend is untouched. **Deliberately unfiltered by kind:** the statement shows income, expense and a difference, and no single list sums to all three — carrying a kind would claim a correspondence that does not exist. A reader who wants one side filters once they arrive. Per-figure drill-downs remain undone and would still need the density decision. |
| 1.3 | Account balance → account register | ✅ already shipped, and this row was wrong | Corrected after checking the code: the dashboard shows only a **total** balance and no per-account rows, so there was nothing there to link. `/accounts` already links every account to `/accounts/[accountId]` (`accounts-workspace.tsx`). Listing this as dashboard work was my error. |
| 1.4 | Budget row → that category's rows for the budget period | ✅ | Uses the budget's own `monthStart`, not today, because a budget's period is not necessarily the current month. Rendered as an explicit `section-link` (already 44px-compliant) rather than an overlay, since this panel's rows are short text lines — the same collision that blocked 1.2. |
| 1.5 | Net (thu−chi) drill-down | ⛔ by design | Deliberately **not** linked: no single row set sums to a net figure. Linking it would invite the mismatch the feature exists to prevent. |
| 1.6 | Consequence shown at the moment of saving | ⬜ | Highest-attention moment in the app, currently spent on nothing. One honest line, e.g. category spend against the user's own budget. **Must not** become spending advice — see §5. |
| 1.7 | First-run: value before the first row is typed | ⬜ | Hardest and least defined. Needs a concept decision, not just implementation. |

### Phase 2 — Prove the promises that are still assumptions ⬜

| # | Item | Status | Notes |
|---|---|---|---|
| 2.1 | Hosted restore proof (RRB-02) | ⛔ needs a disposable hosted project | **The largest unproven claim in the product.** Restore is verified only against local Postgres as the `postgres` superuser (`ARCHIVE_DB_URL` defaults to `127.0.0.1:54322`). Hosted differs exactly where restores break: restricted roles, RLS enforced, statement timeouts, pooling. Green CI here proves the SQL logic, not the promise. |
| 2.2 | Physical-device proof (RRB-08, #398) | ⛔ owner + a real phone | Needs a re-test of the post-#414 build. Emulation is not evidence. No earlier dated evidence can close it. |
| 2.3 | Destructive recent-auth provider edge (RRB-03) | ⛔ owner/provider | Proof or an explicit accepted limitation. |

### Phase 3 — Release gates ⛔

All four remaining **P1** gates are owner/provider/legal, not engineering. Controlled
closed beta is blocked until they clear.

| # | Item | Status | Notes |
|---|---|---|---|
| 3.1 | RRB-06 — Vietnam personal-data legal/privacy review | ⛔ needs a qualified lawyer | Sharpest of the four: legally binding, and it only gets more expensive once real users exist, because improperly collected data cannot be fixed retroactively. An agent can prepare the data inventory; it cannot produce the opinion. |
| 3.2 | RRB-05 — operator-controlled support/privacy contact | ⛔ owner | A prerequisite for any lawful privacy policy. This is an identity fact, not a task. |
| 3.3 | RRB-04 — provider/Auth/firewall read-back + #40/#174 | ⛔ owner/provider | The repository currently holds **no verified statement** about production; every claim about it is inference. |
| 3.4 | RRB-09 — production deployment/provider identity | ⛔ owner/provider | Tied to the release candidate. |
| 3.5 | Controlled closed beta | ⬜ | After P1 clears and no P0 is open. |
| 3.6 | Public beta (PBT-AC15) | ⬜ | Owner decision, after controlled-beta evidence. |

### Phase 4 — Engineering health ⬜

| # | Item | Status | Notes |
|---|---|---|---|
| 4.1 | CI draft-to-ready false-green race (#417) | ⬜ | A job skipped by `if:` reports success and does not block merge. A PR opened as draft and readied quickly can merge with the knowledge, migration and classification contracts never having run. Cheap fix, protects every other gate. |
| 4.2 | Dependabot alerts (#418) | ⬜ | Both held open by our own `"postcss": "8.5.19"` override; `nanoid` rides underneath it. Build-time toolchain only, so real exposure is the build environment. The override has no recorded reason — recover that before changing it. |
| 4.3 | `tsconfig.json` excludes `e2e` | ⬜ | No Playwright spec is statically checked. A wiring bug reached a full local run before anything caught it. |
| 4.4 | Dashboard hydration cost | ⬜ | The measured #403 bottleneck: 311.6 KB transferred script, 766 → 814 ms JS bootup, server response only 5–15 ms. Real and measurable — and lower priority than everything in Phases 1–3. |

### Phase 5 — Deliberately not now ⛔

Bank sync, AI advice, OCR as product identity, family finance, full envelope
budgeting. All require explicit owner approval and a new specification. Brand
Phase E/F is paused: every candidate territory was rejected, and selection needs
the owner's judgement, not a guess.

---

## 4. Completed work (verified, not assumed)

| Item | Evidence |
|---|---|
| ✅ Capture 1→4 (#401/#404, #407/#408, #409/#410, #411/#412, #413/#414) | Merged; #414 at `8ef322ba` |
| ✅ UI evolutionary refresh Slice 1 + Slice 2 | Merged |
| ✅ RRB-01, RRB-07 | Closed with browser/runtime evidence |
| ✅ Canonical performance measurement harness (#415) | Merged `c9a21781`. **Produced no demonstrated cold-load performance improvement** — it delivered measurement, a truthful loading boundary and private-path guards. |
| ✅ #415 lifecycle closeout (#416) | Merged `5db583d6` |
| ✅ #403 FCP attribution experiment (#419) | Merged `fec1195`. Dispatch-only; both arms proven locally. The CI result itself is **not yet collected**. |
| ✅ Category drill-down (Phase 1.1) | This branch; 10 invariants + browser test |

### What the performance work actually taught us

The measurable outcome of #403/#415 was not speed. It was that a **−99 ms
"improvement" was noise**: the harness's own LCP median drifts a few hundred
milliseconds across runs of behaviourally identical code. The review caught a
false performance win before it reached `main`. Script-transfer bytes are the only
metric from that harness stable enough to carry a small claim.

---

## 5. Standing constraints

These are not negotiable by an implementer:

- **No invented financial guidance.** The numeric safe-to-spend figure stays
  withdrawn until MoneyFlow can prove a complete income-based plan or a next-payday
  plan with protected cash. Restating a user's own recorded numbers is honest;
  telling them what to spend is not, and item 1.6 lives strictly on the first side
  of that line.
- **A figure and the rows behind it must agree**, or the drill-down is not shipped.
  Where they cannot agree exactly (splits), the weaker guarantee is stated rather
  than implied.
- Integer đồng; transfers never income or expense; RLS and tenant isolation for
  user-owned data; destructive actions soft-deleted and recoverable.
- Green in one layer never proves another. A skipped required check is not a pass.
- Merging and deployment stay owner decisions.

---

## 6. Recommended order

1. **Phase 1.2–1.4** — finish the drill-down set. Cheapest remaining product win,
   builder already written and proven.
2. **#417** — half a day, protects the evidence system everything else relies on.
3. **Phase 1.6** — the post-save payoff. The first item that attacks retention
   rather than entry cost.
4. **RRB-06 data inventory** — turn a vague "get legal review" into a short,
   prepared session. The highest-leverage agent contribution to a blocked P1 gate.
5. **RRB-02** — the moment a disposable hosted project exists, this is the most
   valuable thing in the entire backlog.

Performance work (4.4) resumes only after P1 clears.
