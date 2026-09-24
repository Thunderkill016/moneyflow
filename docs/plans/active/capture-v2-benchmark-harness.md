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

## Runbook — how a human runs the benchmark (handoff)

Everything below happens in **demo mode** on one device; nothing leaves the
browser except the same-origin `/api/health` fetch.

### 0. Setup (once per device/profile)

1. Serve the app with `NEXT_PUBLIC_APP_MODE=demo` (e.g. `next dev -p 3100`
   or the deployed demo build).
2. Open `/capture-bench.html` in tab A — this is the measurement tab.
3. Open the app in tab B — this is where tasks are performed.
4. Fill the session fields (date, commit, device, network, cohort). Commit
   is auto-read from `/api/health` — verify it matches the build under test.

### 1. Control cohort (released #596 behavior)

- Run tasks **A1–A4** (amount-first quick capture) and **D1–D3**
  (description/paste) exactly as described on each card.
- These are the baseline: they measure today's shipped capture cost without
  any pattern assistance.

### 2. Pattern cohort (P1–P3)

1. In tab A, press **Seed lịch sử mẫu** once — it writes five reviewed
   `bench-seed-*` rows (Tiền mặt·Ăn uống ×3, MoMo·Di chuyển ×2).
2. Reload tab B (`/capture/quick`) — the app reads storage on mount only.
3. **P1** (clear pattern): run the task; expect the food/cash chip.
4. **P2** (competing patterns): both chips appear; the saved row must land
   on the *tasked* account+category or the run is marked `khác-kỳ-vọng` —
   this verifies the user picked the right chip, not just any chip.
5. **P3** (weak history): run in a **clean profile** (fresh browser profile
   or `localStorage` cleared, no seed). Expected: **no chip**. If a chip
   still appears, the run is contaminated by real prior history — discard it
   and reset the profile. The built-in `sample-*` demo baseline is excluded
   from ledger detection automatically.
6. After each task, answer the follow-up honestly: taps, whether a chip was
   used / manual entry / no chip shown, corrections, free note.
7. When the session is done, press **Gỡ lịch sử bench** to remove the
   `bench-seed-*` rows.

### 3. Record

- Press **Tạo biên bản**, copy the report, paste it into the evaluation
  record for the run (device + cohort + commit must be filled).
- Per task the report carries: total ms, candidate ms, ledger ms, match
  verdict, taps, corrections, pattern-use answer, note — plus per-group
  medians.

### 4. Keep / change / kill criteria (H2 evaluation)

Evaluate per cohort, not pooled:

- **Keep signal:** pattern tasks show materially lower median TTLT and tap
  count than the A-cohort control, `đúng` rate is not worse, and correction
  rate does not rise.
- **Change signal:** TTLT improves but wrong-context saves or corrections
  rise (users tap the nearest chip rather than the right one) → the chip
  presentation needs work, not the concept.
- **Kill signal:** no TTLT/tap advantage, chips ignored (pattern-use =
  manual/none dominant), or P3-style weak histories keep surfacing noise.
- Any verdict requires runs on **≥2 devices** with the session fields
  filled; a single happy-path run is not evidence.

### Honest limits (unchanged)

- Tab switching adds ~1–3 s to every measured TTLT — compare within cohorts,
  never across tools.
- Demo fixtures + `bench-seed-*` are a synthetic approximation of
  stable-history, not a true longitudinal cohort.
- Correction auto-detection only works in demo mode.
- Chip usage is self-reported in the followup, not instrumented in-app.
