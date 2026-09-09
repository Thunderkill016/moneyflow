# MoneyFlow — current project memory

**Status:** M0, MON-61, MON-62 and MON-63 are completed. PR #558 is the selector vehicle for bounded auth-resilience issue #557; the manifest projection is candidate before owner merge and active only after #558 enters merged first-parent history.
**Last reconciled:** 2026-09-09
**Last verified production runtime baseline:** `ad0461514acaec1c9a8a100ba92592c83ece46b2` (PR #556), Vercel READY; `/api/health` returned 200 for that exact commit and the post-deploy error/fatal log check was empty.
**Master program:** `docs/plans/active/432-vietnam-long-term-product-strategy.md` remains the long-term strategy authority.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product centered on one trustworthy user-owned ledger and progressively lower maintenance effort.

MON-63 is completed and archived. The next bounded candidate is GitHub #557: make a stalled top-level Cloudflare Turnstile script produce finite truthful recovery UX while preserving the existing fail-closed CAPTCHA token gate.

PR #558 projects `PLAN_AUTHORITY.current` to `docs/plans/active/557-turnstile-load-recovery.md` with `selectedByPr: 558`. That projection is not executable merely because it exists on the selector branch: `plan:resolve` uses merged first-parent history, so it is candidate before owner merge and active after owner merge. No runtime implementation is authorized before that transition plus fresh authority/doctor resolution.

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

## 4. MON-63 completion evidence

PR #554 implemented atomic import retry, versioned preset eligibility, truthful history/recovery and tenant-isolated database contracts.

PR #555 added privacy-safe first-party maintenance counters and durable mapping evidence and was production-verified at `63c239aefca9b5629561808c17948e3aea39bf3e`.

PR #556 supplied the missing remembered-mapping browser evidence, archived MON-63 and returned executable authority to null. It was owner squash-merged as `ad0461514acaec1c9a8a100ba92592c83ece46b2`; production is READY and `/api/health` returned 200 for that exact commit.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | accounts; income/expense; balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | generic CSV/XLSX/PDF; Direct CSV and Share Target; provenance-safe source adapters; explicit versioned remembered mapping; target-bank auto-map disabled |
| Import integrity | atomic/replay-safe authenticated batch commit; changed-intent fail-closed; no raw-statement retention |
| Review | deterministic exception-first Ready/Needs-attention semantics and explicit approval authority |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Auth CAPTCHA | production Turnstile is enforced for email-auth flows; successful token path is browser-tested; top-level script stall currently lacks a finite app-side watchdog |
| Executable authority | #557 projection belongs to selector PR #558; candidate before merge, active only after merged first-parent history confirms #558 |

## 6. Research/evidence boundary

External product/provider references are evidence, not MoneyFlow authority. Cloudflare documents client error/timeout handling and network/browser-extension conditions that can block challenge resources. Next.js documents third-party Script lifecycle hooks. These support a bounded recovery design but do not establish a provider SLA or justify bypassing CAPTCHA.

Turnstile widget `timeout-callback` is not evidence that a top-level script which never becomes ready will always produce a callback. MoneyFlow therefore needs its own finite loading deadline if #557 is selected and implemented.

## 7. Security and production-schema truth

Current `AuthForm` already fails closed: when CAPTCHA is enabled but configuration is not ready or there is no real `captchaToken`, login/register/forgot-password email submit remains disabled.

Current `AuthTurnstile` handles Next.js Script `onReady`/`onError` plus widget callback, expiration and error callbacks. It does not currently have an application-side watchdog for a script that remains unresolved without a timely callback.

#557 may improve only that client resilience path. It does not authorize Supabase Auth provider settings, Turnstile keys/configuration, redirect allowlists, login rate limits, Vercel/WAF changes, schema/RLS, production data or financial behavior.

## 8. Reconciled issue status

- #432/#433: merged master Vietnam long-term product program; master authority remains active.
- M0 security/runtime/release-integrity: completed.
- #523 / MON-61: completed.
- MON-62 / PR #552: completed and production-verified.
- MON-63 / PRs #553–#556: completed and archived; production baseline now includes #556.
- #511: already completed by merged PR #522 (`feat(inbox): make grouped review exception-first`); do not reimplement from the still-open tracker.
- #426: not executable as originally written. PR #480 showed desktop capture deletion breaks paste/upload access, and later planning direction superseded the dashboard-column deletion; a fresh owner design decision is required before any replacement slice.
- #174: remains the public-beta provider-control lane. Production verification has already proved several controls, while provider-console password/redirect/rate-limit/WAF work remains separate operational work.
- #557: bounded code-testable child of #174 for Turnstile top-level script-load recovery; selector vehicle is PR #558.

## 9. Open pull-request memory

### PR #558 — select #557 Turnstile script-load recovery

PR #558 starts from exact post-MON-63 `main@ad0461514acaec1c9a8a100ba92592c83ece46b2` and is documentation/authority only.

Its packet records the current fail-closed token gate, the missing top-level script watchdog, current successful CAPTCHA browser coverage and current Cloudflare/Next.js guidance. It explicitly separates this code-testable reliability defect from provider-console changes still tracked by #174.

The manifest projection names #557 with `selectedByPr: 558`. Before owner merge it is a candidate projection; after owner merge the same merged content becomes executable because first-parent history then contains #558. Implementation must still resolve fresh main and doctor before runtime work.

## 10. True gaps after this audit

1. Turnstile top-level script stall can leave legitimate email-auth users in indefinite loading; #557 is the bounded candidate fix.
2. #174 still has provider-console controls that cannot be proven or safely mutated from source code alone.
3. Real-world import maintenance improvement still needs cohort evidence over time.
4. Exact VCB/ACB/VietinBank export layouts and stable transaction identity remain evidence gaps for bank-specific automation.
5. Live bank/Open API connectivity still requires provider research, contracts, operational controls and explicit owner authorization.
6. #426 needs a fresh capture/navigation design decision rather than execution of its stale deletion plan.

## 11. Next allowed action

For PR #558: finish selector evaluation and exact-head governance checks. Only explicit owner merge may activate #557.

After selector merge, read fresh main, run `npm run plan:resolve`, then `npm run agent:doctor -- --json` in a fully materialized repository/toolchain environment before runtime implementation.

Do not infer implementation authorization from Plate, the issue being open, or this candidate packet alone.

## 12. Superseded-status register

- MON-63 remains current after PR #556 — **false**; it is completed and archived.
- #511 is the next unimplemented exception-first slice — **false**; PR #522 already completed it.
- #426 can be implemented by deleting the desktop sidebar capture button — **false**; that breaks desktop paste/upload access.
- Removing `DashboardPlanningColumn` remains the current #426 direction — **false**; later planning product direction superseded it.
- #174 is entirely a code PR — **false**; remaining provider-console controls are operational/provider evidence.
- Turnstile `onError` guarantees a finite outcome for every top-level script stall — **false**; the current code has no app-side deadline for no-callback loading.
- #557 permits bypassing CAPTCHA after timeout — **false**.
- PR #558 being open makes #557 executable — **false**; selector merge history determines activation.
- Plate or backlog priority is executable authority — **false**.
