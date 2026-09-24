# Capture V2 benchmark harness — TTLT measurement tooling

Slice 0 tooling for `docs/plans/active/capture-v2-low-maintenance-acquisition.md`:
measure the released amount-first Ghi flow before any product change is
authorized. This packet ships a **measurement tool only** — it does not modify
product runtime, schema, or acquisition behavior.

## Repository reconnaissance

- Existing capture surfaces: `/capture/quick` (amount-first Ghi, released with
  #596 stable defaults + immediate correction), `/capture/paste` (deterministic
  text parsing → Inbox candidates), `/capture/upload`, `/capture/share`.
- Demo mode persists transactions in `localStorage["moneyflow-demo-transactions-v1"]`
  (`TRANSACTION_STORAGE_KEY` in `src/lib/transaction-store.ts`) and Inbox
  candidates in `localStorage["moneyflow-inbox-candidates-v1"]`.
- The app sets `frame-ancestors 'none'` + `X-Frame-Options: DENY` (verified
  against production headers), so the app cannot be embedded in an iframe.
- `public/rrb-08.html` is the precedent for a self-contained, noindex,
  privacy-safe evidence tool with a contract test in `src/lib/`.
- `/api/health` returns `{ commit, build }` for deploy identity.

## Research

The Capture V2 spec's Slice 0 requires TTLT, taps, and correction evidence for
first-time, weak-history, and stable-history cohorts. A same-origin static page
can observe demo-mode commits via the `storage` event — which fires in *other*
tabs of the same origin when a tab writes localStorage — giving precise
commit timestamps without any product instrumentation.

Two-tab measurement introduces ~1–3 s of tab-switch latency into every task.
That overhead is roughly constant across modes, so **relative** comparison
(amount-first vs description) is valid; absolute numbers are indicative only
and physical-device runs remain the strongest evidence tier (RRB-08 pattern).

## Specification

`public/capture-bench.html` — self-contained benchmark runner:

- Session facts auto-filled: date, origin, commit via `/api/health`, UA-derived
  device, `navigator.connection` network; editable before reporting.
- 10 tasks across three groups measurable today:
  - `A1–A4` amount-first control via `/capture/quick` (expense, income,
    transfer-neutrality probe, repeated expense to observe #596 defaults).
  - `D1–D3` description mode via `/capture/paste` (shorthand, dated text,
    synthetic bank SMS) — these commit to Inbox candidates first, then ledger.
  - `P1–P3` Frequent Patterns cohort via `/capture/quick`: P1 a clear single
    pattern, P2 choosing correctly among multiple plausible patterns, P3 a
    weak-history run that expects no chip. Each records whether the user
    tapped a chip, typed manually, or saw no chip (`pattern:` in the report).
- Per task: "Bắt đầu" starts `performance.now()`; a `storage` event adding a
  new transaction id stops the timer automatically. A new Inbox candidate id
  records a separate `candidateMs` leg, so description-mode TTLT splits into
  candidate creation vs ledger commit. Manual "Xong"/"Bỏ qua" fallbacks cover
  authenticated mode and bail-outs.
- Result verification: committed record's `kind`/`amount` checked against the
  task's expectation; tasks that declare `accountId`/`categoryId` (pattern
  cohort) must also land on that context → `đúng` / `khác-kỳ-vọng`.
- Correction detection: after a ledger commit, same-id rewrites inside a 60 s
  window flag `autoCorrected`; a manual self-report field also exists.
- Report: per-task lines (total/candidate/ledger ms, match, taps, corrections,
  notes) + median per group + honest caveat → copy → paste into evidence.

Pattern cohort seeding: a "Seed lịch sử mẫu" button writes five reviewed
synthetic rows (`bench-seed-*` ids: Tiền mặt·Ăn uống ×3, MoMo·Di chuyển ×2)
into the demo transaction key so `deriveFrequentLedgerPatterns` yields exactly
two chips — the stable-history cohort without hand-entering history. "Gỡ lịch
sử bench" removes only `bench-seed-*` rows and drops the key entirely when it
held nothing else, restoring the built-in demo baseline. Seed ids are excluded
from ledger-write detection so a seed write can never be timed as a task save.
Seeding only affects demo mode and must run before the app tab is (re)loaded —
the app reads storage on mount, not on `storage` events.

Fresh-profile caveat (found by dogfooding): on a profile where the demo
transaction key is still absent, the app materializes its built-in `sample-*`
fixture rows inside the same first write that carries the task's save.
`findNew` therefore also excludes `sample-*` ids — otherwise the matcher
grades a fixture row (e.g. `sample-4` income) instead of the real save and a
correct run reads `khác-kỳ-vọng`.

Privacy: no data leaves the page except a same-origin `/api/health` fetch;
all task and seed content is synthetic; `noindex,nofollow`.

## Implementation plan

1. `public/capture-bench.html` (this packet's only runtime artifact).
2. `src/lib/capture-bench-tool-contract.test.ts` pinning task ids, routes,
   storage keys, report fields, and the no-external-call boundary.
3. No product-code, schema, or loader changes. The only localStorage write the
   tool performs is the opt-in `bench-seed-*` pattern cohort above — tagged,
   synthetic, demo-only and removable in one click; it never touches the Inbox
   candidate key or any authenticated data path.

## Tasks

- [x] Harness page with storage-event TTLT detection
- [x] Contract test
- [x] P1–P3 pattern tasks + tagged demo seeding for the stable-history cohort
- [ ] Owner/user runs the benchmark on representative devices and pastes
      evidence into the Capture V2 evaluation record

## Evaluation

- Contract test green under `npm test`.
- Manual render + event simulation verified with Playwright (storage event
  stops the timer; report aggregates medians).
- Honest limits recorded: tab-switch latency, demo fixtures ≠ true first-time
  cohort, corrections only auto-detected in demo mode, seeded history is a
  synthetic approximation of stable-history cohorts, chip usage is self-reported
  (the followup select) rather than instrumented inside the app.
- Evidence from real runs feeds H1/H4 evaluation in the Capture V2 spec; this
  tool alone does not authorize any product change.
