# Stage-1 matching gap analysis — Actual Budget vs MoneyFlow

- **Date:** 2026-09-22
- **Status:** dated research note; evidence for a future bounded experiment, not a work authorization
- **Canon route:** `docs/product/CANON.md` → Stage 1 (Low-maintenance Reality) → `PRODUCT_METRICS.md` scorecard items "duplicate and transfer matching measured" and "automatic-match precision"
- **Source set (2–4 per atlas rule):** `actualbudget/actual` via DeepWiki (Tier-A atlas entry), MoneyFlow `src/lib/inbox/detect.ts` + schema, `docs/research/MONEYFLOW_REFERENCE_REPO_ATLAS_2026.md`

## What Actual Budget does (learned 2026-09-22)

`packages/loot-core/src/server/accounts/sync.ts` (`reconcileTransactions`, `matchTransactions`):

1. **Three-step matching, ordered by fidelity:**
   - exact `imported_id` + account match;
   - fuzzy payee: same amount, date within **±7 days**, same payee id;
   - fuzzy amount/date: same amount, ±7 days, any payee.
2. **`strictIdChecking` parameter** controls whether fuzzy matching may pair rows lacking `imported_id`.
3. **`reimportDeleted` user preference** — a row the user deleted stays deleted on re-import unless the user opts in. This is an explicit policy, not a default.
4. **`updateDates` preference** — the bank's posted date may update a matched manual row's date.
5. **Transfers** use a deterministic "transfer payee" linking the two account legs; amount/payee/notes stay synced between legs, cleared/reconciled/category stay independent.
6. **Merge precedence** (`transactions/merge.ts` `determineKeepDrop`): imported evidence beats manual entries; within the same class the earlier row wins.

## What MoneyFlow does today (`src/lib/inbox/detect.ts`)

- Fingerprint `fnv1a(account_hint | occurredOn | amount | desc_norm)` — **exact same-day equality only**.
- `findDuplicateMatches`: fingerprint collisions among pending candidates and against ledger rows (transfers excluded).
- `findTransferPairs`: opposite kind, same amount, **same day**, different-account preferred, greedy one-pair-per-candidate.
- Schema is already ahead of the heuristics: `match_status` (`would_create`/`duplicate`/`suspected_transfer`/`invalid`), `match_reason`, `match_confidence`, `source_external_id`, `source_lifecycle_state`, `source_predecessor_external_id` all exist but `match_*` is **not written** by any current code path.
- Review burden instrumentation now exists (#664–#666): approve/reject/edit/field-assign + reconcile/export events.

## Gaps worth an experiment (ordered)

1. **Same-day rigidity.** VN interbank transfers and posting lag routinely produce T+1 dates; a duplicate fingerprint or transfer pair split across midnight is invisible today. Actual's ±7-day fuzzy tier is the field-proven answer.
2. **`match_status` contract unwritten.** The columns exist for `suspected_transfer`/`duplicate` classification at persistence time; today flags are computed client-side only, so detection results are not durable or auditable per-candidate.
3. **No reimport-deleted policy.** If a user deletes a posted transaction and later re-imports the same source row, fingerprint-vs-ledger may not see the soft-deleted row — the candidate resurfaces. Actual learned this needs an explicit user-visible policy.
4. **No ledger-side transfer linking.** Transfer pairing only runs candidate↔candidate; a candidate matching an *already-posted* manual row (user recorded one leg by hand, imports the other) is not suggested.

## Proposed smallest experiment (owner decision required)

**Bounded fuzzy flagging — flag-only, never auto-merge:**

- Extend `findDuplicateMatches`/`findTransferPairs` with a ±2-day tier: same amount + same normalized description/account hint (dup) or opposite kind (transfer), flagged `possibleDuplicate`/`possibleTransfer` as today — a human still approves.
- Persist the match classification into `match_status`/`match_reason`/`match_confidence` at candidate write time so detection becomes durable evidence, not a render-time guess.
- **Measure:** `candidate_approved`/`candidate_rejected` with `possible_duplicate` prop (already shipped in #664) — watch flagged-rejected rate.
- **Keep** if flagged candidates are confirmed at a materially higher rate than unflagged noise; **change** the window if misses persist; **kill** if flag-reject rate is high (flag noise burns review effort — the exact metric Stage 1 exists to protect).
- Explicit non-goals: no auto-merge, no auto-approve, no date rewriting (Actual's `updateDates` stays out), no reimport-deleted default change.

## What must NOT be copied

- Actual's ±7-day default window — too wide for a VN cash-heavy ledger; start at ±2.
- Full double-entry semantics, envelope budgeting, CRDT sync — different product methodology (atlas: concepts only).
- Bank-sync assumptions (GoCardless/SimpleFIN) — no provider sync is authorized.

## Evidence limits

DeepWiki summary of `actual` matching, not a code read; fuzzy-window choice needs real import data before widening. No production/provider evidence.
