# MoneyFlow — current project memory

**Status:** M0, MON-61, MON-62, MON-63, #557 auth resilience and the #559 web-redesign foundation are completed. Merged `main@1ea23a1e9600807e0b3edf10e02f7414bcdf1cf0` has no current executable slice; PR #568 is the docs-only selector candidate for bounded database-security issue #567 and becomes executable authority only after explicit owner merge.
**Last reconciled:** 2026-09-10
**Last verified production runtime baseline:** `1ea23a1e9600807e0b3edf10e02f7414bcdf1cf0` (PR #566), Vercel READY; `/api/health` returned 200 for that exact current-main build and the reviewed recent runtime-error window was empty.
**Master program:** `docs/plans/active/432-vietnam-long-term-product-strategy.md` remains the long-term strategy authority.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product centered on one trustworthy user-owned ledger and progressively lower maintenance effort.

#557 is completed and owner-merged through PR #561 as `811a530eb1b48a543abf2a45815a57080bc5a441`. It added finite truthful recovery for a stalled top-level Cloudflare Turnstile script while preserving the fail-closed real-token gate, archived the packet and returned executable authority to `null`.

#559 is completed as research/design authority only. PRs #562, #564 and #565 established and repaired the redesign-foundation provenance; PR #566 completed its lifecycle and returned merged-main authority to `null`. No runtime redesign was implied or shipped. The owner has explicitly deferred UI work, so no visual territory or Design System runtime slice is selected now.

A fresh read-only production/repository audit isolated one bounded database-security candidate: GitHub #567. PR #568 projects `PLAN_AUTHORITY.current` to `docs/plans/active/567-rpc-least-privilege-proof.md` with `selectedByPr: 568`. That projection is **candidate only** while PR #568 is unmerged; `plan:resolve` activates it only after the selector enters merged first-parent history. No migration, pgTAP implementation or database mutation is authorized before that transition plus a fresh `plan:resolve`/`agent:doctor` pass.

Parent #174 remains the separate public-beta provider-control lane and is not selected by #568.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo mode remains explicit browser-local state.
- Missing balances, dates, source coverage, provider semantics or financial intent are never guessed by authoritative paths.
- Source/provider evidence is not automatically a posted ledger fact.
- All accepted acquisition paths converge on candidate/provenance/matching/approval/ledger/reconciliation authority.
- Corrections remain explicit and recoverable where required.
- Full archive/restore remains separate from scoped/report export.
- Sensitive financial tables remain browser-read-oriented; invariant-preserving mutation authority is deliberately concentrated in reviewed RPCs rather than direct browser writes.

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

Reconciliation remains statement-oriented and account-leg based. Completed snapshots are historical facts; later backdated activity cannot silently rewrite them. Start, clear, complete and reopen transitions remain controlled by database contracts and negative tenant tests.

## 4. Completed reliability evidence

PR #554 implemented atomic import retry, versioned preset eligibility, truthful history/recovery and tenant-isolated database contracts.

PR #555 added privacy-safe first-party maintenance counters and durable mapping evidence and was production-verified at `63c239aefca9b5629561808c17948e3aea39bf3e`.

PR #556 supplied the missing remembered-mapping browser evidence, archived MON-63 and returned executable authority to null. It was owner squash-merged as `ad0461514acaec1c9a8a100ba92592c83ece46b2`.

PR #558 was owner-merged as selector commit `60fdb1846e8cd8f9e6b48729ce1ff033778112e0`, activating #557.

PR #561 was owner-merged as `811a530eb1b48a543abf2a45815a57080bc5a441`. Its accepted implementation evidence covered CI, CAPTCHA/browser ownership flows, cross-device UI audit, CodeQL and Secret History; the lifecycle packet is now canonical under `docs/plans/completed/2026-09-10-557-turnstile-load-recovery.md`.

PRs #562/#564/#565 established and repaired #559 foundation authority without runtime UI implementation. PR #566 owner-merged the closeout as current `main@1ea23a1e9600807e0b3edf10e02f7414bcdf1cf0`, leaving `PLAN_AUTHORITY.current = null` on merged main.

## 5. Current capability inventory

| Capability | Current truth |
| --- | --- |
| Core ledger | accounts; income/expense; balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | generic CSV/XLSX/PDF; Direct CSV and Share Target; provenance-safe source adapters; explicit versioned remembered mapping; target-bank auto-map disabled |
| Import integrity | atomic/replay-safe authenticated batch commit; changed-intent fail-closed; no raw-statement retention |
| Review | deterministic exception-first Ready/Needs-attention semantics and explicit approval authority |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Auth CAPTCHA | email-auth remains real-token gated; stalled Turnstile script has finite truthful watchdog/retry behavior from merged PR #561 |
| Privileged RPCs | production audit: 62 public SECURITY DEFINER functions, 43 authenticated-callable, 19 internal-only, zero anon/PUBLIC-callable; this is reviewed privileged surface, not 43 confirmed vulnerabilities |
| Executable authority | merged main is `null`; PR #568 projects candidate #567 only until owner merge |

## 6. #557 security and browser truth

The `AuthForm.captchaBlocked` authority was not weakened. When CAPTCHA is enabled but configuration is not ready or there is no real `captchaToken`, login/register/forgot-password email submit remains disabled.

Merged PR #561 adds only the bounded client recovery seam:

- script lifecycle distinguishes `loading`, `ready` and `load_failed`;
- timeout/error clears stale token and never synthesizes one;
- 15 seconds is a MoneyFlow UX watchdog, not a Cloudflare availability SLA;
- stale timeout cannot overwrite successful readiness;
- a late Script error after `ready` cannot clobber success;
- retry is a native full-page reload rather than a second custom widget lifecycle;
- deterministic browser coverage proves stalled-script failure, disabled submit/no token, keyboard retry and stale-timer race safety.

No Supabase Auth provider setting, Turnstile site/secret configuration, redirect allowlist/rate limit, Vercel/WAF setting, environment secret, database schema/RLS, financial behavior or production user data was changed by #557.

## 7. Research/evidence boundary

External product/provider references remain evidence, not MoneyFlow authority. Provider documentation can justify bounded implementation choices but cannot establish production configuration, provider capability or legal/commercial availability that has not been directly verified.

The #567 audit used live read-only production catalog/grant/RLS evidence plus repository migrations and pgTAP. It found:

- all 43 authenticated-callable SECURITY DEFINER endpoints are denied to `anon`/PUBLIC, pin safe search paths and derive authenticated identity;
- postgres-owned functions in schema `public` are deny-by-default at `pg_default_acl`, with EXECUTE defaulting only to postgres/service_role;
- migration `20260725064242_browser_role_least_privilege.sql` owns that default-privilege policy in source control;
- current tests strongly cover object grants and cross-tenant behavior but do not directly assert `pg_default_acl` itself;
- `reconciliation_snapshot_for_user` is a read-only SECURITY DEFINER candidate for evidence-gated reduction to SECURITY INVOKER because authenticated callers already have SELECT under tenant RLS on its source tables.

These findings justify #567's narrow selector; they do not justify bulk privilege conversion or production patching.

Parent #174 still contains operational/provider-console controls that source-code evidence alone cannot close.

## 8. Reconciled issue status

- #432/#433: merged master Vietnam long-term product program; master authority remains active.
- M0 security/runtime/release-integrity: completed.
- #523 / MON-61: completed.
- MON-62 / PR #552: completed and production-verified.
- MON-63 / PRs #553–#556: completed and archived.
- #511: already completed by merged PR #522; do not reimplement from the still-open tracker.
- #426: not executable as originally written; future simplification needs fresh bounded authority and is not current work.
- #174: public-beta provider-control lane remains open and separately authorized; provider-console password/redirect/rate-limit/WAF work is not selected by #568.
- #557: completed and merged by PR #561; its packet is archived and no longer executable.
- #559: foundation completed through PR #566; no runtime redesign shipped and UI work is explicitly deferred.
- #567: open bounded database-security hardening issue; PR #568 is its docs-only selector candidate and has not yet authorized implementation.

## 9. Open pull-request memory

### PR #568 — select #567 RPC least-privilege proof

Base: merged `main@1ea23a1e9600807e0b3edf10e02f7414bcdf1cf0`.

PR #568 is documentation/authority only. It selects exactly two possible implementation changes for a later branch after owner merge:

1. directly prove the postgres/public deny-by-default function ACL with pgTAP so a future migration cannot silently restore automatic EXECUTE to PUBLIC/anon/authenticated;
2. evaluate and, only if all reconciliation/RLS behavior remains equivalent, reduce `public.reconciliation_snapshot_for_user(uuid, uuid, date)` from SECURITY DEFINER to SECURITY INVOKER and explicitly update the privileged inventory contract.

The selector does not authorize mass conversion of the remaining mutation RPCs, moving internal helpers merely to reduce Advisor findings, direct financial-table writes, provider changes, UI work or production database mutation.

The candidate authority path is `docs/plans/active/567-rpc-least-privilege-proof.md` with `selectedByPr: 568`. It is not executable merely because it appears on the selector branch; owner merge plus fresh authority/doctor resolution remains mandatory.

## 9.5. Redesign foundation truth

The #559 foundation is documentation and authority research, not shipped UI. Its historical failure postmortem, route/CSS inventory, target IA, three visual territories and Design System v3 guardrails remain reference material only.

No visual territory is selected. The owner explicitly deferred UI work in the current project sequence. A future runtime design slice needs a fresh bounded packet, explicit territory choice and normal authority resolution after the current security lane is no longer selected.

PR #565 repaired #559 selector provenance, and PR #566 archived the foundation and returned merged-main `PLAN_AUTHORITY.current` to `null`. Runtime remains unchanged by those docs.

## 10. True gaps after this audit

1. The intended postgres/public default function ACL is correct in production and source-controlled migration, but pgTAP does not directly assert `pg_default_acl`; #567 proposes this regression proof.
2. `reconciliation_snapshot_for_user` remains one read-only authenticated SECURITY DEFINER endpoint that may not require owner privilege; #567 must prove invoker equivalence before changing it.
3. #174 still has provider-console controls that cannot be proven or safely mutated from source code alone.
4. Real-world import maintenance improvement still needs cohort evidence over time.
5. Exact VCB/ACB/VietinBank export layouts and stable transaction identity remain evidence gaps for bank-specific automation.
6. Live bank/Open API connectivity still requires provider research, contracts, operational controls and explicit owner authorization.
7. Physical-device evidence and post-merge production verification remain separate release gates; source research cannot close them.
8. Tracker/project-memory semantic drift must continue to be reconciled against merged code and production truth rather than inferred from stale issue state.

## 11. Next allowed action

Run exact-head governance/security checks and independent selector evaluation for draft PR #568. If those pass, hand the selector to the owner for the explicit merge decision.

Only after owner merge may an implementation branch start from fresh post-selector main, resolve #567 as current authority, run `agent:doctor`, and implement the bounded default-ACL pgTAP proof plus the evidence-gated single snapshot privilege reduction.

Do not implement #174 provider-console work implicitly. Do not start UI/redesign work; it is deferred and unselected.

## 12. Superseded-status register

- MON-63 remains current after PR #556 — **false**; it is completed and archived.
- #511 is the next unimplemented exception-first slice — **false**; PR #522 already completed it.
- #426 can be implemented by deleting the desktop sidebar capture button — **false**; that breaks desktop paste/upload access and is not current authority.
- #174 is entirely a code PR — **false**; remaining provider-console controls are operational/provider evidence.
- Turnstile `onError` guarantees a finite outcome for every top-level script stall — **false**; #557 added an app-side deadline.
- #557 permits bypassing CAPTCHA after timeout — **false**.
- PR #561 is still awaiting merge — **false**; it was owner-merged as `811a530e...`.
- #557 remains executable after PR #561 lifecycle closeout — **false**; its packet is completed and archived.
- The #559 foundation is current executable UI work — **false**; PR #566 closed it and the owner has deferred UI.
- A visual territory is already selected — **false**; all three remain future owner decisions.
- Supabase Advisor's 43 authenticated SECURITY DEFINER findings equal 43 confirmed vulnerabilities — **false**; current evidence shows intentional authenticated privileged endpoints with explicit tenant/grant controls, while #567 targets two narrower hardening opportunities.
- The 19 internal SECURITY DEFINER helpers are browser-exposed — **false**; authenticated/anon/PUBLIC do not have EXECUTE on them.
- PR #568 is executable merely because its branch projects `PLAN_AUTHORITY.current` — **false**; it is candidate authority until explicit owner merge enters first-parent history.
- Plate priority or chat instruction alone overrides repository authority — **false**.
