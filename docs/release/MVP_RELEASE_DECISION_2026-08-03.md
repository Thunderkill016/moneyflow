# MoneyFlow — MVP release decision record

- **Prepared:** 2026-08-03
- **Candidate SHA:** `main@8e08a8a748a632b07bb42c27bf14539758b28824`
- **Acceptance ledger:** `docs/release/MVP_RELEASE_ACCEPTANCE_2026-08-03.md`
- **Definition authority:** `docs/MVP_DEFINITION.md`
- **Decision status:** **PENDING — awaiting the owner**

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

`8e08a8a` is proposed as the candidate because it is current `main` and carries the
reconciled ledger. Choosing `481a9ee` instead is equally defensible and changes no
product behavior. **This is the owner's choice, not a technical constraint.**

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

**Not re-run here, and not claimed:** `test:db`, WebKit, the full responsive audit,
provider state, physical devices and production route smoke. The ledger's retained
CI #1234, CodeQL #379 and Secret history scan #379 evidence covers the merged
candidate; nothing in this record supersedes those boundaries.

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

Only the owner completes this section. Leaving it unsigned is itself a valid
outcome, and so is choosing a different SHA.

```
Release candidate SHA : ____________________________________________

Decision             : [ ] Release as MVP      [ ] Not yet

Owner                : ____________________________________________

Date (UTC)           : ____________________________________________

Conditions or notes  : ____________________________________________
```

If the decision is **Release as MVP**, the follow-up is to record the released SHA
in `docs/research/CURRENT_PROJECT_MEMORY.md` and to state plainly which public-beta
gates remain open, so "MVP released" is never read as "public-beta ready".

If the decision is **Not yet**, record the specific blocker here. "Not yet" without
a named blocker turns a decision into an indefinite hold.
