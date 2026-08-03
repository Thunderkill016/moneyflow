# MoneyFlow — MVP release decision record

- **Prepared:** 2026-08-03
- **Candidate SHA:** `main@8e08a8a748a632b07bb42c27bf14539758b28824`
- **Acceptance ledger:** `docs/release/MVP_RELEASE_ACCEPTANCE_2026-08-03.md`
- **Definition authority:** `docs/MVP_DEFINITION.md`
- **Decision status:** **DECIDED — release as MVP at `8e08a8a`, 2026-08-03**

This record exists so the release decision is a deliberate human act with the
evidence gathered beside it. It does not make the decision, and a merged, green or
successfully deployed candidate is not a decision to release.

## 1. Which SHA is the candidate, and why it moved

The acceptance ledger scored `main@481a9ee` (PR #252). Current `main` is `8e08a8a`
(PR #253). The delta is **documentation only**:

```
docs/release/MVP_RELEASE_ACCEPTANCE_2026-08-03.md | 57 ++++++-------
docs/research/CURRENT_PROJECT_MEMORY.md           | 32 ++++-----
docs/research/pr-memory/2026/Q3/PR-253.md         | 12 +++++
```

`git diff --name-only 481a9ee..8e08a8a` returns no file outside `docs/`. So the
two commits are **functionally identical**, and the acceptance evidence recorded
against `481a9ee` carries to `8e08a8a` without re-running acceptance.

### `8e08a8a` carries a full-gate CI run of its own

This was checked rather than assumed, and it changed the recommendation. A push to
`main` runs **every** gate regardless of risk classification, so CI **#1240** on
`8e08a8a` is not the reduced documentation-only run its PR received:

| Job | Result on `8e08a8a` |
|---|---|
| `verify` | success — diff hygiene, knowledge, CI classification, deployment contract, CSS ownership, architecture, lint, typecheck, unit + static RLS, production build |
| `database` | success — "Database checks not required" **skipped**; fresh local reset and **pgTAP ran** |
| `e2e` | success — "Browser checks not required" **skipped**; **Chromium and WebKit installed**, expense/Auth-CAPTCHA smoke passed, **production cross-device UI audit passed**, Playwright evidence uploaded |

So `8e08a8a` has pgTAP, WebKit and the cross-device audit **on that exact commit**.

### Recommendation

**`8e08a8a`.** It is what is actually running on `main`; its evidence is stronger
rather than weaker than the audited SHA; and its product content is provably
identical to `481a9ee`. Releasing `481a9ee` while `main` sits at `8e08a8a` creates a
gap between "the released SHA" and "what users have", for no gain.

Choosing `481a9ee` is not wrong — it is the SHA the ledger scored directly. It just
buys nothing and costs an explanation. **The choice remains the owner's.**

## 2. Re-verification at decision time

The three remaining locked actions were: choose the SHA, confirm no known P0 money
blocker *at decision time*, and decide. The second was re-run today against
`8e08a8a`, not inherited from the ledger.

| Gate | Result on `8e08a8a` |
|---|---|
| `check:knowledge` | pass |
| `test:ci-policy` | pass |
| `check:architecture` | pass |
| `check:css-ownership` | 1105 `!important` (budget 1200), `unauthorizedDocumentSelectors` 0 |
| `lint` | pass |
| `typecheck` | pass |
| `test` | **649/649** |
| `build` (demo) | pass |
| `e2e/expense-path.spec.ts` | **4/4** — Chromium desktop + mobile |
| `e2e/mvp-empty-state-primary-actions.spec.ts` | **4/4** — Chromium desktop + mobile |

One honest note on how that table was produced. The first `typecheck` run failed
with `Cannot find module '@vercel/analytics/next'`. That was **a stale local
`node_modules`, not a defect on `main`** — `@vercel/analytics` is in `package.json`
and the failure disappeared after `npm ci`. It is recorded here rather than quietly
re-run, because "green after I reinstalled" and "green" are different claims.

**Not re-run locally:** `test:db`, WebKit, the full responsive audit. An earlier
revision of this record listed those three as "not claimed". That was wrong, and the
correction matters to the decision rather than being cosmetic: CI **#1240** ran all
three on `8e08a8a` itself, as the table in section 1 shows. They are claimed — by
CI, on the exact candidate, not by this container.

**Genuinely not claimed anywhere here:** provider state reads or writes,
physical-device acceptance, and an independent production route smoke. The ledger's
retained CI #1234, CodeQL #379 and Secret history scan #379 evidence covers the
merged candidate; nothing in this record supersedes those boundaries.

## 3. Criterion 8 at decision time

The only exit criterion that is conditional rather than evidenced.

Open issues on 2026-08-03, all six of them:

| Issue | Subject | Bearing on a P0 money blocker |
|---|---|---|
| #254 | transaction review and bounded bulk correction | post-MVP depth, explicitly listed as such in project memory |
| #174 | publish provider controls before public beta | separate public-beta gate |
| #172 | product assessment | market framing; memory records the old feature-freeze framing as superseded |
| #72 | Phase B route/state UI audit and **P2** remediation | P2 by its own title |
| #53 | domain benchmark and correctness roadmap | partial/post-MVP tracks |
| #40 | enable leaked-password protection in Supabase Auth | provider setting, public-beta gate |

A label search for `P0`, `priority:P0`, `p0` and `bug:P0` returns **0 open issues**.

**What this does and does not establish.** It establishes that no P0 money blocker
is *known and recorded* at decision time. It does not establish that none exists —
absence cannot be proven from a label search or a passing suite, which is exactly
why the ledger calls this criterion conditional. Signing below accepts that
residual risk knowingly; it does not eliminate it.

## 4. What releasing does not include

Recorded so the decision is not read as broader than it is. None of the following
is an MVP exit criterion, and none of them blocks this decision:

- provider controls and hosted-auth acceptance (#174, #40);
- physical-device acceptance evidence held by the owner;
- final visual-direction approval for landing/auth;
- approved staging or provider load evidence;
- reconciliation (PR #222 — verified unmerged, absent on `main`);
- post-MVP depth: transaction review/bulk correction, budget/recurring/goal
  history, report range and drill-down, import batch UX, authenticated rules.

## 5. Decision

```
Release candidate SHA : 8e08a8a748a632b07bb42c27bf14539758b28824

Decision              : [x] Release as MVP      [ ] Not yet

Owner                 : Thunderkill016 (repository owner)

Date (UTC)            : 2026-08-03

Conditions or notes   : Owner selected the recommended candidate and directed
                        release after reviewing the candidate comparison, the
                        decision-time gate results and the criterion-8 boundary.
```

**How this was recorded.** The decision was given by the owner in a working session
on 2026-08-03, directly in response to the candidate comparison and the `8e08a8a`
recommendation in section 1. It is transcribed here rather than inferred. If any
part of it misstates the owner's intent — the SHA, the decision itself, or its
conditions — correct this block; it is the record, not the act.

**What was accepted knowingly.** Criterion 8 is conditional. No P0 money blocker is
known or recorded, and that is not the same as none existing. This decision accepts
that residual risk deliberately.

### Follow-up now owed

1. record the released SHA in `docs/research/CURRENT_PROJECT_MEMORY.md`, together
   with the public-beta gates that remain open — done in this change;
2. keep "MVP released" and "public-beta ready" separate in every later statement;
3. if a P0 money bug is found after this date, it does not retroactively invalidate
   the decision — it opens a fix, and the conditional wording above is why.
