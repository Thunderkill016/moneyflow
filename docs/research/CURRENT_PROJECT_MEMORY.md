# MoneyFlow — current project memory

**Status:** M0, MON-61, MON-62, MON-63 and bounded auth-resilience issue #557 are completed. PR #561 and PR #564 are merged; PR #562 is the fresh-main selector candidate for the #559 web-redesign foundation, while executable authority remains null until that selector is owner-merged.
**Last reconciled:** 2026-09-10
**Last verified production runtime baseline:** `ad0461514acaec1c9a8a100ba92592c83ece46b2` (PR #556), Vercel READY; `/api/health` returned 200 for that exact commit and the post-deploy error/fatal log check was empty.
**Master program:** `docs/plans/active/432-vietnam-long-term-product-strategy.md` remains the long-term strategy authority.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product centered on one trustworthy user-owned ledger and progressively lower maintenance effort.

#557 is complete at the implementation/evaluation level. PR #561 added finite truthful recovery for a stalled top-level Cloudflare Turnstile script while preserving the existing fail-closed real-token gate. The completing PR moved the active packet to the canonical completed-packet location `docs/plans/completed/2026-09-10-557-turnstile-load-recovery.md` and set `PLAN_AUTHORITY.current` to `null`.

PR #561 is not merged by this lifecycle projection. Final exact-head governance checks must be green on the lifecycle-closeout head, then the PR may be handed off Ready. Merge remains an explicit owner action.

PR #562 now carries the #559 redesign foundation from fresh `main@394d7120`: historical UI failure postmortem, route/CSS ownership inventory, target information architecture, focused accessibility/workflow research, three candidate visual territories and Design System v3 guardrails. It is documentation/authority only. Until owner merge, merged-main executable authority remains `null`; no runtime redesign is implied.

No provider-console follow-on from parent #174 is selected. A runtime design slice requires the #559 selector to merge, a fresh authority pass and an explicit owner choice of one visual territory.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo mode remains explicit browser-local state.
- Missing balances, dates, source coverage, provider semantics or financial intent are never guessed by authoritative paths.
- Source/provider evidence is not automatically a posted ledger fact.
- All accepted acquisition paths converge on candidate/provenance/matching/approval/ledger/reconciliation authority.
- Corrections remain explicit and recoverable where required.
- Full archive/restore remains separate from scoped/report export.

## 3. Acquisition and reconciliation truth

MON-62 established versioned source adapters, strict source identity/date/amount evidence, non-truncating persistence, Excel date-system evidence and lifecycle/parser/mapping provenance.

MON-63 hardened the import-maintenance loop:

- Direct CSV remembered mappings are versioned and bound to parser/mapping semantics rather than header shape alone.
- Remembered mapping remains an explicit user action followed by dry-run/review.
- Manual mapping changes invalidate `preset_applied` evidence and return the batch to `mapping_reviewed`.
- Authenticated preview→Inbox commit is atomic/replay-safe for the same batch intent; exact replay does not create a second candidate set.
- Reusing a batch key with changed canonical financial intent fails closed.
- Import history exposes safe outcome/provenance/retry/mapping evidence without raw statement contents.
- Cross-device history does not claim a browser-local draft is resumable when that draft is absent.
- Import maintenance counters are tenant-owned operational metadata, not tamper-proof telemetry and not financial truth.

VCB/ACB/VietinBank bank-specific auto-map remains disabled because exact current layouts and stable transaction identity are not proven.

## 4. Completed reliability evidence

PR #554 implemented atomic import retry, versioned preset eligibility, truthful history/recovery and tenant-isolated database contracts.

PR #555 added privacy-safe first-party maintenance counters and durable mapping evidence and was production-verified at `63c239aefca9b5629561808c17948e3aea39bf3e`.

PR #556 supplied the missing remembered-mapping browser evidence, archived MON-63 and returned executable authority to null. It was owner squash-merged as `ad0461514acaec1c9a8a100ba92592c83ece46b2`; production is READY and `/api/health` returned 200 for that exact commit.

PR #558 was owner-merged as selector commit `60fdb1846e8cd8f9e6b48729ce1ff033778112e0`, activating #557.

PR #561 implementation head `e4a5dfd49c9529ed19f1338a8a24630b57a2ebb8` passed CI run #3475, browser smoke including CAPTCHA and authenticated ownership flows, cross-device production UI audit, CodeQL and Secret History. An earlier browser failure was root-caused to an ambiguous Playwright status locator; runtime snapshots already showed correct finite-failure/verified states. The test was narrowed to the CAPTCHA status element without changing production behavior or weakening assertions, and the next exact implementation head passed cleanly.

## 5. Current capability inventory

| Capability           | Current truth                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core ledger          | accounts; income/expense; balanced transfers; edit; recoverable deletion                                                                                                           |
| Accounts             | balances, register/history, archive/restore, statement reconciliation                                                                                                              |
| Planning             | category budgets, recurring commitments/income, savings goals                                                                                                                      |
| Understanding        | reports, drill-downs, controlled import/export                                                                                                                                     |
| Acquisition          | generic CSV/XLSX/PDF; Direct CSV and Share Target; provenance-safe source adapters; explicit versioned remembered mapping; target-bank auto-map disabled                           |
| Import integrity     | atomic/replay-safe authenticated batch commit; changed-intent fail-closed; no raw-statement retention                                                                              |
| Review               | deterministic exception-first Ready/Needs-attention semantics and explicit approval authority                                                                                      |
| Ownership            | versioned archive/export/validation/restore with source-lineage generation                                                                                                         |
| Runtime modes        | explicit demo and authenticated/Supabase-RLS modes                                                                                                                                 |
| Auth CAPTCHA         | email-auth flows remain real-token gated; top-level Turnstile script stall now has a 15-second MoneyFlow UX watchdog, truthful finite failure state and full-page retry in PR #561 |
| Executable authority | merged main remains `PLAN_AUTHORITY.current = null`; PR #562 proposes selecting `docs/plans/active/559-web-redesign-foundation.md`                                                 |

## 6. #557 security and browser truth

The existing `AuthForm.captchaBlocked` authority was not weakened. When CAPTCHA is enabled but configuration is not ready or there is no real `captchaToken`, login/register/forgot-password email submit remains disabled.

PR #561 adds only the bounded client recovery seam:

- script lifecycle distinguishes `loading`, `ready` and `load_failed`;
- timeout/error clears stale token and never synthesizes one;
- 15 seconds is explicitly a MoneyFlow UX watchdog, not a Cloudflare availability SLA;
- stale timeout cannot overwrite successful readiness because the watchdog checks synchronous script-state authority;
- a late Script error after `ready` cannot clobber success;
- retry is a native full-page reload, so it does not introduce a second custom loader/widget lifecycle;
- deterministic Playwright coverage stalls the top-level script itself, advances the timer, proves finite failure, proves disabled submit/no token, verifies keyboard retry and proves successful readiness remains valid past the old deadline.

No Supabase Auth provider setting, Turnstile site/secret configuration, redirect allowlist/rate limit, Vercel/WAF setting, environment secret, database schema/RLS, financial behavior or production user data was changed by #557.

## 7. Research/evidence boundary

External product/provider references remain evidence, not MoneyFlow authority. Cloudflare documents client error/timeout handling and network/browser-extension conditions that can block challenge resources. Next.js documents third-party Script lifecycle hooks. Playwright Clock supports deterministic app-timer control. These support the bounded recovery design but do not establish a provider SLA or justify bypassing CAPTCHA.

Parent #174 still contains operational/provider-console controls that must not be inferred from source-code evidence alone.

## 8. Reconciled issue status

- #432/#433: merged master Vietnam long-term product program; master authority remains active.
- M0 security/runtime/release-integrity: completed.
- #523 / MON-61: completed.
- MON-62 / PR #552: completed and production-verified.
- MON-63 / PRs #553–#556: completed and archived; production baseline includes #556.
- #511: already completed by merged PR #522; do not reimplement from the still-open tracker.
- #426: not executable as originally written; a fresh owner design decision is required before replacement work.
- #174: remains the public-beta provider-control lane. Provider-console password/redirect/rate-limit/WAF work remains separate operational work and is currently unselected.
- #557: implementation/evaluation complete in PR #561; packet moved to `docs/plans/completed/` with canonical dated naming and executable authority returned to null. PR merge remains pending owner action after final exact-head checks.

## 9. Open pull-request memory

### PR #561 — recover stalled Turnstile script loads

Base: exact owner-merged selector `main@60fdb1846e8cd8f9e6b48729ce1ff033778112e0`.

Implementation adds a bounded top-level Turnstile script watchdog/recovery state, preserves the real-token submit gate and adds deterministic stalled-script/stale-timer/keyboard-retry browser evidence. Exact implementation head `e4a5dfd49c9529ed19f1338a8a24630b57a2ebb8` passed CI, Browser smoke, Cross-device UI audit, CodeQL and Secret History.

Evaluator pass found no scope or security regression. Lifecycle closeout is now represented in the same PR: #557 packet moved to canonical `docs/plans/completed/2026-09-10-557-turnstile-load-recovery.md`, `PLAN_AUTHORITY.current` null, current memory reconciled and PR memory updated. Because those docs create a newer PR head, exact-head governance checks on the final lifecycle head remain required before Ready handoff.

## 9.5. PR #562 redesign foundation truth

PR #562 is a selector candidate, not shipped UI. Its packet is grounded in the merged P0–P11 migration history and current route/CSS inventory. The three visual territories are options for owner selection; none is active. Slice 1 may begin only after the selector is merged, a fresh `plan:resolve`/`agent:doctor` pass succeeds, and the owner selects one territory.

The candidate deliberately preserves current product truth: manual/import-assisted acquisition, explicit demo versus authenticated modes, VND integer semantics, progressive disclosure and mobile as a release gate. It makes no provider, schema, production or financial claim.

## 10. True gaps after this audit

1. #174 still has provider-console controls that cannot be proven or safely mutated from source code alone.
2. Real-world import maintenance improvement still needs cohort evidence over time.
3. Exact VCB/ACB/VietinBank export layouts and stable transaction identity remain evidence gaps for bank-specific automation.
4. Live bank/Open API connectivity still requires provider research, contracts, operational controls and explicit owner authorization.
5. #426 needs a fresh capture/navigation design decision rather than execution of its stale deletion plan.
6. Physical-device evidence and post-merge production verification remain separate release gates; source/UI research cannot close them.

## 11. Next allowed action

Run exact-head governance checks for PR #562 after the fresh-main replay. If terminal green, hand the selector to the owner for merge. After merge, start a new bounded Slice 1 packet for Design System tokens/primitives; do not implement runtime UI from the selector PR.

Do not select #174 provider-console work implicitly. Merged-main `PLAN_AUTHORITY.current` remains `null` until PR #562 is owner-merged.

## 12. Superseded-status register

- MON-63 remains current after PR #556 — **false**; it is completed and archived.
- #511 is the next unimplemented exception-first slice — **false**; PR #522 already completed it.
- #426 can be implemented by deleting the desktop sidebar capture button — **false**; that breaks desktop paste/upload access.
- Removing `DashboardPlanningColumn` remains the current #426 direction — **false**; later planning product direction superseded it.
- #174 is entirely a code PR — **false**; remaining provider-console controls are operational/provider evidence.
- Turnstile `onError` guarantees a finite outcome for every top-level script stall — **false**; #557 added an app-side deadline precisely because no-callback loading was possible.
- #557 permits bypassing CAPTCHA after timeout — **false**.
- PR #558 is still merely a candidate selector — **false**; it was owner-merged as `60fdb184...` and activated #557.
- #557 remains executable after PR #561 lifecycle closeout — **false**; its packet is completed and `PLAN_AUTHORITY.current` is null.
- PR #561 lifecycle completion means it may be auto-merged — **false**; owner merge remains explicit.
- Plate or backlog priority is executable authority — **false**.
- PR #562 still targets the pre-#561/#564 base — **false**; its branch has been replayed onto `main@394d7120`.
- A visual territory is already selected — **false**; all three remain owner decisions.
