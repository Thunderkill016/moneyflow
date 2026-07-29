# Repository consolidation — Phase 1 inventory

**Status:** completed
**Owner:** agent
**Issue/PR:** none yet — inventory only, no branch/PR opened for this phase
**Last updated:** 2026-07-28 (update 3: human owner approved clearing the rest of the legacy autopilot cluster — see "Update 3" in section C)

**Scope of this document (Phase 1 only):** classify every notable file/PR/branch into
`KEEP / MOVE / MERGE / ARCHIVE / DELETE / UNKNOWN`. **No file was moved, merged, archived
or deleted while producing the initial inventory below.** No open PR was closed or
merged. This packet is the audit; later phases (doc consolidation, GitHub cleanup,
domain-by-domain code moves) each get their own packet and human sign-off before any
change lands.

**Amendment (2026-07-28, same session):** the human owner reviewed the open questions
raised by this inventory and approved two rounds of action, each recorded below with
its own evidence:

- **Update 2:** remove the Grok-branded agent runtime (`.grok/`, `IDEA.md` and its
  direct dependents). See "Update 2" in section B/C.
- **Update 3:** clear the remaining non-Grok legacy autopilot/backlog-tracking cluster
  once each file was read in full and confirmed superseded, with dangling references
  in still-live docs (`docs/MVP_DEFINITION.md`, `docs/UX_PRINCIPLES.md`,
  `docs/REAL_USE_READINESS_CONTRACT.md`, `scripts/check-project-knowledge.mjs`) fixed
  first. See "Update 3" in section C. Everything else in this packet remains a proposal
  awaiting its own decision — this was not a blanket delete-everything pass.

## Outcome

A single, evidence-based map of where repository complexity actually lives — oversized
files, duplicated authority documents, orphaned legacy tooling, stale active work
packets, and any code that violates the `lib → app/components/server` ownership rule —
so the human owner can decide what to freeze, consolidate, archive or delete without
re-deriving the facts from scratch.

## Repository reconnaissance

### Current behavior

- `docs/plans/active/` currently holds 4 packets. All 4 reference PRs/branches that are
  already closed (see Finding A below) — the directory is not currently doing the job
  `docs/plans/active/README.md` assigns it ("only deliberately started, non-trivial work").
- Two parallel "how agents should operate" systems exist side by side: `.claude/` +
  `CLAUDE.md` + `AGENTS.md` (current, Claude Code-oriented) and `.grok/` + `IDEA.md`
  (declares itself the locked runtime: *"Runtime locked: Grok VIP stack ...  Not primary:
  Claude Code ... unless user changes this"*). This is a live authority conflict, not
  historical residue — `IDEA.md` is still read by the current `SessionStart` hook (this
  session's own startup banner printed `next IDEA: (no open R*/Q*)`, sourced from
  `IDEA.md`'s R\*/Q\* checklist).
- `scripts/check-project-knowledge.mjs` (run in CI on every PR) lists `docs/PRODUCT.md`
  as a "current truth" file to scan for stale claims, even though `CLAUDE.md`'s source
  precedence list and `README.md`'s "sources of truth" section both point to
  `docs/product/PRINCIPLES.md` instead. The CI contract itself still encodes the
  duplicate authority.
- CI (`.github/workflows/ci.yml`) runs exactly: `check:knowledge`, `check:deployment-env`,
  `check:css-ownership`, `lint`, `typecheck`, `test`, `build`, then `test:db` (separate
  job) and `test:e2e` + `test:ui-audit:pr` (separate job). None of the `scripts/agent-*`
  shell/python scripts, `mvp-verify.sh`, or anything under `.grok/` is invoked by CI —
  they are dead from CI's perspective, referenced only by other legacy docs.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/plans/active/*.md` | 4/4 packets reference already-merged PRs; directory contract is violated | Move stale packets to `completed/` after human confirms production verification — do not move automatically |
| `IDEA.md`, `.grok/` | Declares a different, non-Claude runtime as authoritative; still read by live SessionStart hook | Needs an explicit human decision: retire, or reconcile with `CLAUDE.md`/`AGENTS.md` |
| `docs/PRODUCT.md` vs `docs/product/PRINCIPLES.md` | Both currently function as "current truth" (one by CI script, one by `CLAUDE.md`) | **DONE (Update 3):** `docs/PRODUCT.md` deleted (content was a strict subset of `PRINCIPLES.md` + README), `check-project-knowledge.mjs`'s `currentTruthFiles` updated |
| `AGENT_BACKLOG.md` (935 lines), `AGENT_AUTOPILOT.md`, `AGENT_ROADMAP.md` (root) | Legacy backlog-in-Markdown; `AGENT_ROADMAP.md` has zero external references (only self-referenced from `AGENT_BACKLOG.md`) | Candidate to archive; conflicts with "backlog belongs in GitHub Issues" already recommended |
| `scripts/agent-*.sh`, `scripts/agent-competitor-gap.py`, `scripts/mvp-verify.sh` | Not invoked anywhere in `.github/workflows/*.yml`; referenced only by legacy docs/`.grok` | Candidate to archive/delete once human confirms nothing local still runs them |
| `src/lib/inbox/client-inbox.ts` | Imports server actions from `@/app/actions/inbox` — `lib` importing from `app` violates the proposed ownership rule | Needs a decision: is this file actually orchestration (belongs in `hooks/`), or is the ownership rule wrong for this case? |
| `src/lib/money.ts`, `money-display.ts`, `currency.ts` | Looked like possible duplication at a glance; verified as a clean layered split (currency metadata → formatting/parsing → presentation text) | **KEEP as-is** — cited as a positive counterexample, not a problem |
| `src/components/inbox-page.tsx` (782 ln), `layout/app-shell.tsx` (769 ln), `transactions-page.tsx` (764 ln), `direct-csv-import-page.tsx` (757 ln) | Largest TSX files in the repo | Signal for future `check:repo-health`, not an action in this phase |
| `src/app/globals.css` (7,786 lines) | By far the largest stylesheet; dwarfs every other CSS file combined | Already flagged by existing `check:css-ownership`/`docs/design/CSS_OWNERSHIP.md` — cross-check before assuming it's unowned debt |

### Existing tests and constraints

- Related unit tests: `src/lib/money.test.ts`, `money-display.test.ts`, `money-invariants.test.ts`, `currency.test.ts` already cover the money-formatting layer confirmed clean above.
- Database/RLS tests: not touched by this phase (no schema/code change).
- Browser tests: not touched by this phase.
- Product/architecture rules: `ARCHITECTURE.md` "Repository map" and "Change map" are the target shape referenced throughout this inventory; this phase does not change `ARCHITECTURE.md`.

### Similar implementation and recent history

- Three open PRs move in three different directions right now: **#107** (draft, Claude Code operating workflow, 11 files, CI green, blocked only on a human-local checklist), **#106** (logo/identity redesign, 6 files, not draft, awaiting browser evidence review), **#105** (draft, adds a 7-file "design handbook" that explicitly says it does not replace `PRINCIPLES.md`/`CALM_LEDGER_V2.md`/`design-system.md`/`UX_PRINCIPLES.md`/`AI_UIUX_WORKFLOW.md`). None of these three PRs touch the same files as each other or as this inventory.
- `docs/plans/completed/2026-07-26-ai-project-operating-system.md` is the one precedent of a packet that *was* correctly moved to `completed/` after merge — the process this phase wants to restore for the other four.

### Open questions

- [x] Should `.grok/` and `IDEA.md` be retired outright, or does the human owner still use the Grok-oriented workflow for some sessions? — **Resolved 2026-07-28: retired.** See "Update 2" in sections B/C.
- [ ] For each of the 4 stale active packets below: has the referenced production flow actually been verified, or only merged? (`docs/plans/active/README.md` and `AGENTS.md` §8 require production verification before moving to `completed/`, not just a merged PR.)
- [ ] Is `src/lib/inbox/client-inbox.ts` misplaced (should live under `hooks/`), or should the `lib` ownership rule carve out an exception for client facades that call server actions?

## Research

Not required — this is an internal repository audit using only committed files, `git`, and the GitHub API for this repository. No external product/technology/standards question is in play.

## Specification

### Problem

Three parallel documentation/tooling efforts (a Grok-oriented agent stack, a Claude
Code-oriented agent stack, and a design handbook) and four unmoved "active" work
packets have made it hard to answer "where is the one true rule for X, and is this
directory still doing its job?" in under a few minutes, contrary to the repo's own
`ARCHITECTURE.md` goal of being "the shortest reliable map of the current system."

### User stories

- As the human owner, I can read one document and see every file/PR/branch classified as KEEP/MOVE/MERGE/ARCHIVE/DELETE/UNKNOWN, so that I can make freeze/cleanup decisions without re-auditing the repo myself.
- As an agent picking up work later, I can read this packet and know which findings are already decided vs. still open questions, so I don't redo this audit.

### Acceptance criteria

- [x] Every finding below is backed by a concrete, re-runnable check (line count, grep, `git ls-remote`, GitHub API), not a guess.
- [x] No file was moved, merged, archived, deleted, or renamed to produce this inventory.
- [x] No open PR (#105/#106/#107) or branch was closed, merged, or pushed to.
- [ ] Human owner has reviewed the classification and either approved specific MOVE/MERGE/ARCHIVE/DELETE actions or reclassified them (pending — this is the deliverable of Phase 1, not yet actioned).

### Required states

Not applicable — this is a documentation/audit artifact with no UI, loading, empty, or error states.

### Financial and security constraints

- No financial calculation, schema, RLS policy, or runtime code is touched in this phase.
- No guessed data: every classification below cites the command/evidence used.

### Out of scope

- Actually moving, merging, archiving, or deleting any file (Phase 2/3 work, each its own packet).
- Closing, merging, or commenting on PR #105, #106 or #107 (human owner's call, tracked separately).
- Building `check:architecture` / `check:repo-health` (Phase 4 per the agreed plan — needs its own packet since it requires real ESLint/AST boundary rules, not a quick script).
- Redesigning or moving any Ledger-domain code (highest financial risk; per `AI_DELIVERY_WORKFLOW.md`, domain moves need counterexample tests first and should not be the first domain exercised).

## Implementation plan

### Architecture fit

This phase produces only this Markdown file under `docs/plans/active/`. It does not
change `ARCHITECTURE.md`, `AGENTS.md`, or any runtime boundary — it documents where the
*current* system already deviates from the boundaries those files already describe.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/plans/active/repository-consolidation.md` | New file (this packet) | Phase 1 deliverable: inventory only |

### Data and migration impact

None — no schema, migration, or backfill involved.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Treating a "closed" PR as "merged" when it was actually closed-without-merging | Cross-checked closed PR branch names/titles against `git log --oneline` on `main` for the packets referenced below (#92, #83, #79/#80, #82 all correspond to commits already in `main`'s history) |
| Recommending deletion of something still privately used by the human owner outside CI (e.g., `scripts/agent-daemon.sh` run manually) | Every ARCHIVE/DELETE candidate below is phrased as a candidate needing explicit human confirmation, not an action taken |

### Verification plan

- Static: none needed — no code changed.
- Unit/domain: none needed.
- Database: none needed.
- Browser flow: none needed.
- Responsive/visual: none needed.
- Production/manual: human owner reviews the classification tables below.

## Inventory findings

### A. Active work packets — corrected after reading each one in full (Update 4)

`docs/plans/active/README.md`: *"Only deliberately started, non-trivial work belongs
here."* The first pass through this inventory cross-checked declared PRs against
`git log --oneline -20` and the PR list (`state=all`) only, and provisionally called
all four "stale, MOVE to completed." Reading each packet's full text (not just its
header) plus `pull_request_read` on the specific PRs, using the API's reliable
per-PR `merged` field instead of the list endpoint's, corrected that:

| Packet | Declared status | What the header-only pass got wrong | What the full read found | Action taken |
|---|---|---|---|---|
| `calm-ledger-daily-shell.md` | evaluating | Nothing — the packet was already accurate | Its own acceptance criteria/delivery record already say production flow, screenshots and physical-phone checks are `pending`, and explicitly "remains `evaluating`" | **No change needed.** Already correctly not in `completed/`. |
| `calm-ledger-system-redesign.md` | in progress | Assumed "PR #82 closed" meant the whole packet was done | This packet is the *parent* multi-slice redesign plan (landing, shell, planning/settings); PR #82's title is "**start** Calm Ledger redesign with public surfaces" — only part of Slice 1/2. Its own Tasks checklist (Slice 1/2/3) is still almost entirely unchecked, and `src/app/globals.css` (7,786 ln) plus every `*refresh*.css` file the plan says to remove are all still present on disk. | **No change needed.** Genuinely still in progress, correctly labeled — not stale. |
| `phase-b-rich-vnd-audit.md` | evaluating | Delivery record said "Squash commit: pending merge" | `pull_request_read(104)` confirms `merged: true`, `merged_at: 2026-07-28T05:58:11Z`; squash commit `76c4629d636f1f50a9c6f96fab12c7dd4b46e6c6` is current `main` HEAD | **Delivery record corrected** to reflect the real merge. Still **not** moved to `completed/` — production manual/physical verification remains unclaimed, and the packet says so itself. |
| `landing-dark-mode-contrast.md` | planned, PR "pending" | Assumed #79 *and* #80 both shipped it | `pull_request_read(79)`: `merged: false` (closed unmerged, an earlier abandoned attempt). `pull_request_read(80)`: `merged: true`, body explicitly names `docs/plans/active/landing-dark-mode-contrast.md` as its work packet, squash commit `1ba77d05d9894ccd820f300d5bc743cd93d7d8b3`. The packet had never been updated after #80 merged — every task still said `todo`. | **Fully reconciled**: status → `evaluating`, all 7 acceptance criteria checked with PR #80 evidence, all 4 tasks marked done, delivery record filled in with the real PR/commit/CI run. Still **not** moved to `completed/` — same physical/production-verification gap as the other three. |

**Net result: zero packets moved to `completed/`.** All four remain in `docs/plans/active/`
because none has a recorded human production-verification pass (AGENTS.md §8) — the one
gate this inventory cannot satisfy on its own, since it requires an actual person visiting
the live deployment. Two packets needed no change; two needed their text corrected to
match reality (which is a materially different action from "move them," and the header-only
first pass would have gotten both wrong in the other direction — moving the two that
needed correcting instead of the two that were already fine).

### B. Duplicate/competing authority

| Topic | Documents involved | Finding | Classification |
|---|---|---|---|
| "What is MoneyFlow" | `docs/PRODUCT.md` (70 ln) vs `docs/product/PRINCIPLES.md` (102 ln) | `CLAUDE.md` source precedence and `README.md` both name only `PRINCIPLES.md`. But `scripts/check-project-knowledge.mjs` (CI-enforced) still scans `docs/PRODUCT.md` as a "current truth" file. `docs/PRODUCT.md` is referenced only from other legacy/historical docs (a completed packet, `REBUILD_MASTER_PLAN.md`, `UX_RESEARCH_AND_REDESIGN.md`, `docs/research/01_RESEARCH_PLAN.md`, `docs/cyclewarden/...`) | **MERGE/ARCHIVE** `docs/PRODUCT.md` into `PRINCIPLES.md` if it holds anything not already there, then update `check-project-knowledge.mjs`'s `currentTruthFiles` list to drop it |
| "How should the agent operate" | `CLAUDE.md` + `AGENTS.md` + `.claude/` (current) vs `IDEA.md` + `.grok/` (declared itself "locked", not Claude) | ~~`IDEA.md` is still read by the live `SessionStart` hook.~~ **Update 2 (2026-07-28): human owner decided — remove Grok.** Deleted: `.grok/` (entire dir), `IDEA.md`, `AGENT_AUTOPILOT.md`, `docs/AGENT_RUNTIME.md`, `docs/VIP_AGENT_STACK.md`, `docs/AUTOPILOT_PLAN.md`, and the self-contained script chain `scripts/agent-{daemon,daemon-start,daemon-stop,orchestrator,pick-task,refill-backlog,run-headless}.sh`. Edited `docs/CLAUDE_SKILLS.md` to drop its `.grok/skills/` line. `scripts/hooks/session-start.sh` guarded `IDEA.md` with `[[ -f IDEA.md ]]`, so its absence was a no-op, not a break; the now-dead `IDEA.md`-reading branch was also removed from that hook for clarity. `npm run check:knowledge` still passes. | **DONE** |
| "What's the MVP" | `docs/MVP_DEFINITION.md` (58 ln, current per `AGENTS.md` table) vs `docs/MVP_BEST_BAR.md` (56 ln) vs `docs/MVP_SHIPPED.md` (39 ln) | `MVP_BEST_BAR.md`/`MVP_SHIPPED.md` referenced only by `IDEA.md`, `.grok/`, `docs/AGENT_RUNTIME.md`, `docs/REAL_USE_READINESS_CONTRACT.md`, `docs/REBUILD_MASTER_PLAN.md`, `docs/COMPETITOR_GAP_BAR.md` — all part of the same legacy/Grok cluster, not from `AGENTS.md`/`README.md` | **ARCHIVE** as a unit once the `.grok`/`IDEA.md` question (above) is resolved |

### C. Legacy autopilot cluster (root + `docs/` + `scripts/` + `.grok/`)

Confirmed **not invoked by CI** (`grep` against `.github/workflows/*.yml` for every
script name below returned nothing):

- Root: `IDEA.md`, `AGENT_BACKLOG.md` (935 ln), `AGENT_AUTOPILOT.md`, `AGENT_ROADMAP.md` (referenced only by `AGENT_BACKLOG.md` itself — zero external inbound references)
- `docs/`: `AGENT_RUNTIME.md`, `VIP_AGENT_STACK.md`, `AUTOPILOT_PLAN.md`, `REBUILD_MASTER_PLAN.md` (400 ln), `MVP_SHIPPED.md`, `MVP_BEST_BAR.md`, `COMPETITOR_GAP_BAR.md`, `COMPETITOR_GAP_REPORT.md` — ~~`REAL_USE_READINESS_CONTRACT.md` (316 ln)~~ **corrected in Update 3 below: this one does not belong in this list**
- `scripts/`: `agent-daemon.sh`, `agent-daemon-start.sh`, `agent-daemon-stop.sh`, `agent-orchestrator.sh`, `agent-pick-task.sh`, `agent-refill-backlog.sh`, `agent-run-headless.sh`, `agent-competitor-gap.py`, `mvp-verify.sh` (this last one *is* wired as an `npm run mvp-verify` script in `package.json`, but nothing calls that npm script from CI)
- `.grok/` (entire directory): hooks, skills, rules — a second, parallel agent-operating system to `.claude/`

All internally consistent with each other and with `IDEA.md`, but disconnected from
`AGENTS.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `README.md`, and CI.

**Update 2 (2026-07-28):** the Grok-branded subset of this cluster was deleted per the
human owner's explicit decision — `IDEA.md`, `AGENT_AUTOPILOT.md`, `docs/AGENT_RUNTIME.md`,
`docs/VIP_AGENT_STACK.md`, `docs/AUTOPILOT_PLAN.md`, `.grok/`, and the
`scripts/agent-daemon*/orchestrator/pick-task/refill-backlog/run-headless.sh` chain.
Root-level `AGENT_BACKLOG.md` (935 ln, backlog-in-Markdown) and `AGENT_ROADMAP.md`
(zero inbound references even before this cleanup) were **not** part of this decision
and remain open at the time — they aren't Grok-branded by name, just adjacent legacy
backlog tooling. Two now-orphaned in-repo references surfaced by the Grok deletion:
`docs/MVP_SHIPPED.md` (still points at `IDEA.md`'s R\*/Q\* queue) and
`docs/REBUILD_MASTER_PLAN.md` (still points at `IDEA.md` and `.grok/skills/frontend-design`).

**Update 3 (2026-07-28, same session):** the human owner approved clearing the rest of
this cluster ("xử lý hết đi nếu ko liên quan và hữu ích" — go ahead and clean up
whatever isn't relevant/useful). Rather than delete the whole bulleted list above by
category, every remaining file was read in full first, because two of them turned out
not to belong in this cluster at all:

- **Reclassified to KEEP** (read in full, found to be substantive and *not* superseded):
  - `docs/REAL_USE_READINESS_CONTRACT.md` (316 ln) — a real, still-partly-open readiness
    contract with R0–R7 gates, several still unchecked (R3 real email callback, R5
    end-user spreadsheet open, R6 physical keyboard, R7 seven-day self-use not started),
    plus dated production evidence blocks. This is *more* current and detailed than
    anything in `PRINCIPLES.md`/`README.md` on the same topic — deleting it would have
    destroyed live tracking, not cruft. Only its one dangling line (`docs/MVP_SHIPPED.md`
    supports claim 1`) was fixed, pointing it at the actual gate commands instead.
  - `docs/BEST_OF_MATRIX.md` (75 ln) — cited by name as "Authority" in the live
    `docs/UX_PRINCIPLES.md` for the Inbox-is-Lab-only positioning rule, and its
    competitor→pattern→tier table is real product-design rationale, not autopilot
    bookkeeping (it just happens to end with a handful of already-checked historical
    task checkboxes). Kept as-is; only the *other* citation next to it
    (`docs/REBUILD_MASTER_PLAN.md`) was dropped since that one was deleted.
- **Deleted** (read in full, confirmed each is autopilot/backlog-tracking mechanics with
  no content not already covered by `docs/MVP_DEFINITION.md`, `docs/product/PRINCIPLES.md`
  or `docs/performance-budgets.md`): `AGENT_BACKLOG.md`, `AGENT_ROADMAP.md`,
  `docs/MVP_BEST_BAR.md`, `docs/MVP_SHIPPED.md`, `docs/REBUILD_MASTER_PLAN.md`,
  `docs/COMPETITOR_GAP_BAR.md`, `docs/COMPETITOR_GAP_REPORT.md`, plus their companion
  scripts `scripts/agent-ensure-work.sh` (already broken by Update 2 — it called the
  now-deleted `agent-refill-backlog.sh` and read the now-deleted `IDEA.md`) and
  `scripts/agent-competitor-gap.py` (read/wrote exactly the two `COMPETITOR_GAP_*.md`
  files being deleted; confirmed not called from `package.json` or CI).
  - Also folded in here: **`docs/PRODUCT.md`** (row B above) — its content was a strict
    subset of `docs/product/PRINCIPLES.md` plus README's "Current project phase"
    checklist, with nothing unique. Deleted, and `scripts/check-project-knowledge.mjs`'s
    `currentTruthFiles` list was updated to drop it so CI stops treating a now-deleted
    file as a truth source.
  - Live docs with a dangling pointer to something deleted were fixed at the same time:
    `docs/MVP_DEFINITION.md` (dropped its `AGENT_BACKLOG.md`/`scripts/agent-daemon.sh`
    header lines, replaced with "backlog lives in GitHub Issues"), `docs/UX_PRINCIPLES.md`
    (dropped `REBUILD_MASTER_PLAN.md` from its authority citation, kept `BEST_OF_MATRIX.md`).
  - **Left alone on purpose:** `docs/BEST_OF_MATRIX.md` and `docs/REAL_USE_READINESS_CONTRACT.md`
    (see KEEP above); `docs/cyclewarden/moneyflow-a2-readiness-2026-07-25.md`,
    `docs/plans/completed/2026-07-26-ai-project-operating-system.md`,
    `docs/research/01_RESEARCH_PLAN.md`, `docs/research/08_PFM_BEST_IN_CLASS.md`, and
    `docs/UX_RESEARCH_AND_REDESIGN.md` still cite one or more deleted filenames, but
    each is an explicitly dated/historical or research document — the same category the
    repo already lets `docs/plans/completed/` preserve unedited as a point-in-time
    record, so their citations were left as historical record rather than rewritten.
  - `npm run check:knowledge`, `npm run lint`, `npm run typecheck` and `npm run test`
    (566/566) all pass after this pass.

### D. Boundary check (`lib` must not import `app`/`components`/`server`)

`grep -rlE "from ['\"]@/(app|components|server)" src/lib` → 2 hits out of the entire `src/lib` tree:

| File | Import | Classification |
|---|---|---|
| `src/lib/nav-ia.ts` | `import type { IconName } from "@/components/icons"` | **KEEP** — type-only import of an icon-name union, not a runtime/behavioral dependency; low risk |
| ~~`src/lib/inbox/client-inbox.ts`~~ `src/hooks/client-inbox.ts` | Imported server actions from `@/app/actions/inbox` (`createInboxCandidatesAction`, etc.) | **DONE (T5):** moved to `src/hooks/client-inbox.ts` — it has zero financial/domain calculation of its own, only branches on `isDemo` to call either local stores or server actions, which is exactly `ARCHITECTURE.md`'s definition of `src/hooks/` ("client orchestration around stores and mutations"). Its own imports of `candidate-store`/`import-batch-store`/`inbox-map` were switched from relative (`./x.ts`) to absolute (`@/lib/inbox/x`, no extension, matching this repo's existing `@/` import convention). The 7 importing components (`capture-{upload,quick,share,paste}-page.tsx`, `import-preview-page.tsx`, `imports-page.tsx`, `inbox-page.tsx`) were repointed from `@/lib/inbox/client-inbox` to `@/hooks/client-inbox`. No exported function signature changed. `npm run typecheck`, `lint` and `test` (566/566) all pass after the move, and `grep -rlE "from ['\"]@/(app|components|server)" src/lib` now returns only the harmless `nav-ia.ts` type import. |

Everything else in `src/lib` (including the money/currency layer, `accounts.ts`,
`reporting`-style modules) is clean of this violation.

### E. Money/formatting layer — verified clean, not a problem

`src/lib/currency.ts` (currency code metadata, multi-currency totals) →
`src/lib/money.ts` (formatting/parsing, imports `currency.ts`) →
`src/lib/money-display.ts` (presentation text/tone/aria, imports `money.ts`) is a clean,
one-directional layered split, each with its own test file. `grep` found zero
`toLocaleString`/`Intl.NumberFormat`/raw-amount-arithmetic usage inside `src/components`.
**Classification: KEEP as-is.** Cited here because the reorg plan explicitly asked to
check for "duplicate utility or formatter," and this is the negative result.

### F. Largest files (signal for a future `check:repo-health`, no action here)

Top TS/TSX by line count: `inbox-page.tsx` (782), `layout/app-shell.tsx` (769),
`transactions-page.tsx` (764), `direct-csv-import-page.tsx` (757), `parse-csv.ts` (744),
`import-preview-page.tsx` (581), `add-transaction-dialog.tsx` (561), `parse-pdf.ts` (542).

Largest CSS: `src/app/globals.css` (7,786 lines — larger than every other CSS file in
the repo *combined*, which total ~7,163 lines), `landing-page.module.css` (1,048),
`landing-refresh.css` (1,048), `app-shell.module.css` (859).

**Classification: UNKNOWN / informational.** `globals.css`'s size is already a known,
named concern under `docs/design/CSS_OWNERSHIP.md` and `check:css-ownership` — this
inventory does not re-litigate that existing contract, just confirms the size finding
is consistent with it. None of these files are recommended for action in Phase 1.

### G. Open PRs (context, not a decision made here)

| PR | Draft | Files | Depends on human action |
|---|---|---|---|
| #107 | yes | 11 | Owner must run the 5-item local checklist in the PR body (SessionStart banner, `/permissions`, blocked-action test, evaluator run, verdict review) before it can leave draft |
| #106 | no | 6 | Owner must review browser/PWA screenshot evidence before merge/close |
| #105 | yes | 7 | Owner must decide: shrink to a true index (replace, don't duplicate, the 5 authorities it lists) or close |

No action taken on any of these three PRs in this phase.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Produce this Phase 1 inventory | none | this document | done |
| T2 | Human owner decides `.grok`/`IDEA.md` vs `.claude`/`CLAUDE.md` question | T1 | Grok cluster deleted (commit on `claude/doc-du-an-qnj7ya`); see "Update 2" in section B/C | done |
| T3 | Reconcile the 4 active packets against actual PR/CI state | T1 | see "Update 4" below | done — **none moved to `completed/`** |
| T4 | Clear the remaining non-Grok legacy autopilot cluster | T2 | Update 3, section C; `check:knowledge`+lint+typecheck+test green | done |
| T5 | Resolve `client-inbox.ts` boundary question (section D) | none | section D; moved to `src/hooks/client-inbox.ts`, typecheck/lint/test green | done |
| T6 | Merge/retire `docs/PRODUCT.md` and update `check-project-knowledge.mjs`'s `currentTruthFiles` | none | Update 3, section B; done as part of T4 | done |

Rules:

- One task should produce a reviewable result.
- Parallel tasks must not edit overlapping ownership areas.
- New discoveries update the specification/plan before implementation scope changes.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Every finding backed by a re-runnable check | commands quoted inline throughout "Inventory findings" | pass |
| No file moved/merged/archived/deleted | no `git mv`/`rm`/PR actions performed this phase | pass |
| No PR closed/merged/pushed to | only read-only GitHub API calls (`list_pull_requests`) used | pass |
| Human review of classification | — | pending |

### Review findings

- Correctness: findings are grounded in `git log`, `git ls-remote`, line counts, and the GitHub PR list API; not inferred.
- Security/ownership: no RLS/schema/auth touched.
- UI/UX/accessibility: not applicable.
- Maintainability/duplication: money/formatting layer explicitly verified clean (section E); duplicate-authority docs identified (section B).
- Scope compliance: no moves/merges/deletes performed, matching the "Phase 1 = inventory only" instruction from the human owner.

### Remaining limitations

- This inventory does not exhaustively review every file in the repository (e.g., it does not audit every route under `src/app/` individually) — it targets the specific checklist items the human owner asked for (largest files, boundary violations, duplicate docs, stale packets, orphaned scripts) plus what surfaced along the way.
- "Closed" vs "merged" was inferred from PR branch history matching `main`'s commit log, not from the GitHub API's per-PR `merged` field (the list endpoint used here does not reliably populate that field). This is accurate for every PR cited above but should be spot-checked with `pull_request_read` (method `get`) if a specific one is in doubt before acting on it.

## Delivery record

- Branch: `claude/doc-du-an-qnj7ya`
- PR: #108 — merged 2026-07-28
- Squash commit: `0c5d51b55c6d052b711df3a8dbf1f3647c6d3f56`
- CI run: PR #108 head — `database`, `verify`, `e2e` all green
- Production deployment: merged to `main`; no runtime/route behavior changed by this packet's own scope (Grok removal + legacy doc cleanup + stale-packet reconciliation)
- Production flow verified: owner confirmed a manual browser/production check after merge
- Work packet moved to `docs/plans/completed/`: yes
