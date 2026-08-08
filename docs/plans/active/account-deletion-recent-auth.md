# Public Beta Trust Phase 1 — recent authentication for permanent deletion

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** replacement for PR #316; new PR pending
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent packet:** `docs/plans/active/public-beta-trust.md`  
**Base main:** `538768401bd5c0aa66523aba2a52e3601f3fadd4`  
**Branch:** `agent/public-beta-trust-phase-1-recent-auth`

The owner approved the Public Beta Trust program on 2026-08-08. Phase 1 refreshes the useful security design and tests from PR #316 onto current `main`; it must not merge the stale PR unchanged or overwrite P9–P11 UI ownership and post-#316 account-deletion cleanup changes.

## Outcome

An authenticated MoneyFlow user cannot permanently delete their server account and tenant financial data merely because an old session remains valid. The deletion Edge Function requires server-verifiable evidence that the same MoneyFlow account authenticated interactively through a currently supported method within the previous ten minutes. If the proof is stale or unavailable, no tenant purge begins and the user is routed through the existing password/Google login surface before they can type the destructive confirmation again.

## Repository reconnaissance

### Current behavior

- Current `main` contains the P8 account-deletion flow and later UI-system ownership; it still warns that recent reauthentication is a separate hardening gap.
- The current Edge Function validates the bearer user, then transactionally purges tenant data and verifies zero remaining rows before deleting the Auth identity.
- Current tenant cleanup includes `financial_mutation_audit_events`, which did not exist in PR #316's old Edge snapshot; the refresh must preserve it.
- PR #316 passed full exact-head CI/database/browser/security evidence on `181814a06d10dad57c9144e872435a2c4b6a007d`, but its branch diverged from current main and is not current product truth.
- Current Auth UI/source is compatible with #316's bounded reauth additions; P9/P10 primarily changed presentation ownership rather than these interaction contracts.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `supabase/functions/delete-account/index.ts` | final destructive authority + newest tenant cleanup list | patch current file; never replace with stale #316 file |
| `supabase/functions/_shared/account-deletion-recent-auth.ts` | deterministic recency policy | refresh method allowlist from current Supabase docs/product support |
| `src/app/(auth)/actions.ts` | password/Google step-up + typed Edge errors | selectively reuse #316 implementation |
| `src/app/auth/callback/route.ts` | Google identity continuity | selectively reuse #316 implementation |
| `src/app/(auth)/login/page.tsx` + `src/components/auth-form.tsx` | existing auth surface | add narrow deletion reauth mode; preserve current presentation CSS |
| `src/components/delete-account-page.tsx` | destructive review flow | route typed recent-auth failure through step-up; clear `XÓA` |
| `src/lib/supabase/proxy.ts` | authenticated auth-page redirect | allow only exact deletion reauth route |
| #316 source/unit/browser tests | prior security evidence | reuse where still valid, strengthen method-policy test |

### Existing tests and constraints

- Caller identity remains derived from Supabase Auth, never a client-supplied user ID.
- Tenant purge remains transactional and happens before Auth identity deletion.
- `financial_mutation_audit_events` remains part of tenant cleanup.
- CAPTCHA remains active for login/reauth where configured.
- Destructive confirmation must not cross the authentication boundary.
- Build/lint/typecheck alone are insufficient: exact-head full CI, database, browser/cross-device, CodeQL and secret-history evidence are required.

### Similar implementation and recent history

- PR #11/#31/#61 established and hardened account deletion and tenant cleanup.
- PR #309 made the deletion UI locally owned and recorded recent-auth as a remaining public-beta boundary.
- PR #316 designed and verified recent-auth on the P8 baseline; this phase is its current-main replacement.
- PR #321/#322 completed and archived UI migration; this phase must not reopen it.

### Open questions

- [x] Trust access-token `iat`? No; Supabase continuously issues JWTs during a session, so token issuance time is not interactive-login time.
- [x] Server-verifiable source? Verified Supabase JWT `amr` entries via `auth.getClaims()`.
- [x] Which AMR methods count now? Only `password` and `oauth`, matching MoneyFlow's currently exposed interactive sign-in methods.
- [x] Treat recovery/signup/refresh/MFA methods as deletion proof? No without a separately reviewed product flow.
- [x] Google freshness? Request fresh provider authentication with OIDC `max_age=0`, preserving expected-user continuity across callback.
- [x] Provider/dashboard change required? No for repository implementation; provider-backed production evidence remains post-merge.

## Research

### Research scope and source selection

- Decision question: how should the previously verified #316 recent-auth contract be refreshed against current Supabase claims and current MoneyFlow product support?
- Repository evidence was inspected first; current Supabase Auth/JWT documentation and OWASP reauthentication guidance were then used to narrow the policy.
- Source budget: focused official/authoritative sources only.

### Questions researched

1. Does current Supabase still expose AMR method plus timestamp?
2. Is JWT `iat` a valid substitute for interactive authentication recency?
3. Which AMR method values are documented now?
4. Is AAL equivalent to recent authentication?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Supabase JWT Claims Reference | official | 2026-08-08 | `amr` is optional and entries contain `method` + `timestamp`; documented methods include oauth/password/otp/totp/recovery/invite/sso/saml/magiclink/signup/email-change/token-refresh/anonymous | MoneyFlow chooses which currently supported methods authorize deletion |
| Supabase JWT guide | official | 2026-08-08 | Supabase continuously issues new JWTs while a session remains signed in and recommends `auth.getClaims()` for verification | therefore JWT `iat` alone is not recent-login evidence |
| Supabase MFA docs | official | 2026-08-08 | `aal` represents authentication assurance (`aal1`/`aal2`) | assurance level is distinct from a recent interactive timestamp |
| OWASP Authentication Cheat Sheet | authoritative guidance | 2026-08-08 | sensitive operations should require reauthentication at a trusted boundary | does not mandate MoneyFlow's exact ten-minute window |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| merge PR #316 unchanged | fastest | stale Edge cleanup and stale branch ancestry | reject |
| use JWT `iat` | trivial | refresh creates new JWT without new identity proof | reject |
| accept every documented AMR method | future-friendly | silently authorizes flows MoneyFlow does not expose/review | reject |
| accept only password + oauth and require explicit future expansion | least privilege, matches product | later MFA needs policy update | selected |

### Research decision

Keep #316's server-authoritative pattern but narrow the AMR allowlist to MoneyFlow's currently supported password and Google OAuth login methods. Verify claims using Supabase `getClaims()`, reject missing/stale/future/unsupported AMR before creating the admin client or invoking tenant purge, and treat token refresh as non-interactive. A future MFA/magic-link/OTP flow must explicitly extend this policy with its own tests and acceptance.

### Adoption review

Not applicable. No new dependency, provider, service or framework is introduced. The implementation reuses the installed Supabase SDK, existing Auth routes and current delete-account Edge Function.

## Specification

### Problem

A stolen or unattended long-lived session can currently reach the irreversible account-deletion operation after typed confirmation without proving the user authenticated interactively recently. Session validity is necessary but weaker than recent identity verification for this destructive action.

### User stories

- As an authenticated user with a stale session, I am required to authenticate again before permanent deletion.
- As a password user, I can re-enter credentials for the same account and return safely to deletion.
- As a Google user, I can request fresh Google authentication for the same account and return safely.
- As a user, a different account selected during step-up cannot inherit deletion authority.
- As the owner, token refresh, recovery or unrelated Auth events cannot silently grant deletion authority.

### Acceptance criteria

- [ ] P1-AC1: Edge rejects missing, stale, future or unsupported AMR before `purge_user_tenant_data`.
- [ ] P1-AC2: only `password` and `oauth` currently satisfy the MoneyFlow recent-auth method allowlist.
- [ ] P1-AC3: token refresh never extends deletion authority.
- [ ] P1-AC4: deletion target remains the bearer-token user and no client-supplied user ID is accepted.
- [ ] P1-AC5: password reauth confirms current email and resulting user ID.
- [ ] P1-AC6: Google reauth requests `max_age=0` and callback rejects expected-user mismatch.
- [ ] P1-AC7: reauth mode activates only for sanitized `next=/settings/delete-account` plus `reauth=1`.
- [ ] P1-AC8: typed `XÓA` is cleared before crossing the reauth boundary and must be entered again.
- [ ] P1-AC9: current tenant cleanup, including `financial_mutation_audit_events`, remains intact.
- [ ] P1-AC10: exact-head CI/database/browser/cross-device/CodeQL/secret-history gates are green with no hidden retry finding.
- [ ] P1-AC11: after owner merge/deploy, production-safe password + Google provider step-up evidence is recorded without destructive real-user deletion.

### Required states

- Fresh password/OAuth: deletion flow proceeds to current server authority.
- Stale/missing recent auth: typed error routes to reauth; no purge begins.
- Reauth page: same Auth UI with explicit destructive-step-up copy.
- Password mismatch/different current account: reject and remain safe.
- OAuth mismatch: clear continuity cookie, sign out mismatched local session, return to reauth error.
- Callback/provider failure: clear continuity cookie and return to safe reauth error.
- Demo mode: unchanged browser-local deletion behavior.
- CAPTCHA: existing behavior preserved.
- Mobile/accessibility: current Auth/Delete owners and target-size/focus contracts remain unchanged except reauth copy/state.

### Financial and security constraints

- No financial calculations or mutation payloads change.
- No database schema/RLS/grant/provider setting changes.
- Recent-auth rejection happens before tenant purge.
- No password, token, AMR claim set or provider secret is logged or stored.
- Expected-user callback cookie is short-lived, HttpOnly, callback-scoped and only a continuity guard; actual deletion authority remains verified server identity + recent AMR.
- Ten minutes is explicit MoneyFlow policy, not an external standard.

### Out of scope

- Global MFA requirement.
- New OAuth provider.
- Password/provider configuration changes.
- Destructive production-account test.
- Backup/restore Phase 2.
- UI redesign or new visual direction.

## Implementation plan

### Architecture fit

Supabase Auth remains identity authority. Existing `/login` owns password/Google step-up. The existing OAuth callback owns continuity after provider return. The existing delete-account Edge Function remains the only destructive authority. The new pure helper evaluates already-verified AMR claims; the Server Action only translates typed Edge failures into UX state.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| recent-auth helper | ten-minute policy; only password/oauth accepted | least-privilege current product support |
| delete Edge Function | verified claims + recent-auth gate before admin/purge | authoritative enforcement while preserving newest cleanup list |
| Auth actions | password/OAuth step-up, identity continuity, typed Edge errors | reuse current auth system |
| callback | expected-user check and cookie cleanup | prevent account switching |
| login/AuthForm/proxy | narrowly reachable deletion reauth mode | usable step-up without weakening normal redirect |
| delete page | clear confirmation and navigate typed failure to reauth | destructive state cannot cross boundary |
| unit/source/browser tests | recency/method/routing/continuity regressions | exact evidence |
| phase packet + PR memory | current lifecycle truth | future agents do not reuse stale #316 |

### Data and migration impact

- Schema/migration/backfill: none.
- Provider configuration: none.
- Auth session behavior: successful step-up creates/replaces the normal Supabase session through existing SDK flow.
- Rollback: revert the focused PR; no data migration rollback is needed.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| refreshed code deletes current audit-table cleanup | patch current Edge instead of copying old file; source regression |
| token refresh appears recent | token_refresh is excluded; stale password + fresh refresh unit test |
| unsupported Auth flow grants deletion | allowlist only password/oauth; negative AMR tests |
| password reauth switches account | current-email + resulting-user-ID checks |
| OAuth chooses another account | expected-user callback guard + local sign-out on mismatch |
| raw `reauth=1` weakens login routes | require sanitized deletion next path in page/actions/proxy |
| `XÓA` persists through step-up | explicitly clear before navigation; browser/source contract |
| provider behavior differs from local/browser evidence | keep post-merge provider acceptance open |

### Verification plan

- Static: project knowledge, CI policy, CSS/architecture, lint, typecheck.
- Unit/domain: recent-auth policy and source/continuity contracts.
- Database: full selected fresh reset + pgTAP because the Edge destructive boundary is Class 3, even though schema is unchanged.
- Browser: recent-auth step-up spec plus standard Browser smoke.
- Responsive: selected Chromium/WebKit cross-device audit.
- Security: CodeQL + all-ref secret history scan.
- Production/manual: after owner merge/deploy, non-destructive password + Google step-up on exact production build.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P1-T1 | reconcile #316 against current main/current Supabase docs | parent plan | compare + research | complete |
| P1-T2 | port bounded Auth/UI/tests onto current main | P1-T1 | focused branch diff | implementing |
| P1-T3 | patch current Edge with narrow AMR policy while preserving cleanup | P1-T1 | source diff + unit test | implementing |
| P1-T4 | open replacement PR and record own PR memory | P1-T2/P1-T3 | PR + memory | blocked |
| P1-T5 | run exact-head full Class 3 gates and investigate raw retries | P1-T4 | CI/artifacts/logs | blocked |
| P1-T6 | independent security/current-main review | P1-T5 | review findings | blocked |
| P1-T7 | owner merge checkpoint | P1-T6 | explicit owner decision | blocked |
| P1-T8 | production/provider-safe step-up acceptance | P1-T7 + READY deployment | provider evidence | blocked |
| P1-T9 | update parent/current memory and archive Phase 1 | P1-T8 | lifecycle closure | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | planner | planned | Public Beta Trust approval + PR #323 | #316 stale | reconcile current main |
| 2026-08-08 | planner | implementer | implementing | #316 compare, current code, official Supabase/OWASP research | provider acceptance unavailable pre-merge | port bounded branch |

### Current permission boundary

- Granted: repository branch code/test/docs and exact-head verification for Phase 1.
- Exact repository: `Thunderkill016/moneyflow`.
- Provider access before merge: read/research only.
- Forbidden without later explicit owner action: production/provider configuration writes, destructive production deletion, direct main writes, branch/ruleset changes.
- Human approval required before: merge of the Phase 1 feature PR and any provider/production mutation.
- Stop condition: unexpected financial/data/schema/Auth-provider policy change, unexplained retry/flaky, or identity-continuity ambiguity reopens specification.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| current-main differences identified and newest tenant cleanup preserved | compare/current Edge inspection | pass |
| current Supabase AMR vocabulary researched | official JWT Claims Reference | pass |
| unsupported methods fail closed by design | narrow helper + unit cases | candidate |
| exact-head full gates | replacement PR CI | pending |
| provider-backed password/Google step-up | post-merge production | pending |

### Research and adoption evidence

- Current Supabase docs still support verified `amr` method/timestamp evidence and explicitly distinguish `iat`, `aal`, and `amr` roles.
- The final method allowlist is intentionally narrower than Supabase's vocabulary because MoneyFlow currently exposes password and Google OAuth only.
- No external implementation/code is copied; #316 is internal MoneyFlow evidence and the existing Supabase SDK remains the only provider client.

### Review findings

- Correctness: current Edge cleanup list must be preserved; full replacement is rejected.
- Security/ownership: destructive authority remains Edge-side and identity-derived.
- UI/UX/accessibility: reuse existing Auth/Delete owners; no new overlay/layout system.
- Maintainability: one shared reauth route/cookie constants owner and one pure AMR policy owner.
- Scope compliance: recent-auth only; no backup/restore or redesign.

### Remaining limitations

- Implementation branch is not product truth until owner-approved merge.
- CI/provider acceptance is not yet complete.
- Ten-minute policy is a MoneyFlow judgment and may be revised only through a reviewed security/product change.

## Delivery record

- Branch: `agent/public-beta-trust-phase-1-recent-auth`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending owner merge
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: no
