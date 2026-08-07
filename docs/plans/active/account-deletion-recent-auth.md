# Recent authentication for permanent account deletion

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** human owner + implementing agent
**Issue/PR:** PR #316, branch `security/account-deletion-recent-auth`
**Last updated:** 2026-08-07

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is a Class 3 security/authentication change. Merge, deployment, provider configuration and production-account deletion require separate owner authorization.

## Outcome

An authenticated MoneyFlow user cannot permanently delete their server account and tenant financial data merely because a long-lived session remains valid. Immediately before the destructive operation, the delete-account Edge Function requires server-verifiable evidence of a recent interactive Supabase authentication event. Refreshing an access token does not create a new accepted interactive-auth timestamp.

## Control contract

### State

- Location: the authenticated Supabase access token's verified JWT claims, specifically accepted `amr` authentication-method references with timestamps; the delete-account Edge Function is the destructive-action enforcement point
- Writer/owner: Supabase Auth creates authentication/session claims after password, OAuth or other supported interactive authentication; MoneyFlow application code may request step-up authentication but cannot manufacture accepted recent-auth evidence
- Propagation: successful step-up writes a new Supabase session/access token; the subsequent server action invokes the Edge Function with that token, and the Edge Function verifies claims before any tenant purge

### Feedback

- Expected failing signal: stale, missing, malformed, future-dated or unsupported interactive AMR evidence must return `recent_auth_required` before `purge_user_tenant_data`; a newly issued access token whose latest accepted interactive AMR remains stale must still fail; ordinary authenticated `/login` must retain its redirect while only the explicit deletion reauth route remains reachable
- Success signal: pure recent-auth policy, integration/source contracts, identity-continuity contracts, `npm run test:ci-policy`, lint, typecheck, unit tests, production build, database gate selected by the Supabase boundary and selected browser tests pass; exact-head CodeQL and secret-history scans pass
- Semantic evidence: an old-but-valid session cannot delete an account; fresh password or Google step-up can return the same user to the deletion page; choosing a different account during step-up is rejected; refresh alone cannot extend deletion authority

### Removal impact

- What breaks if removed: permanent account deletion falls back to session validity plus typed `XÓA`, so a stolen or unattended long-lived session can execute the destructive operation without a recent interactive identity verification
- Rollback: revert the bounded PR #316 changes and rerun recent-auth, deletion, auth-routing and browser contracts; no schema or data migration is involved

### Action safety

- Permissions: repository branch writes only; read official Supabase/OIDC/OWASP guidance; no Supabase/Vercel/provider configuration or production-data writes
- Reversibility: code, tests and documentation are reversible Git changes; no migration, secret rotation or irreversible provider action is part of this slice
- Escalation: stop for provider-dashboard changes, MFA policy decisions, production deletion exercises, branch-protection/ruleset changes, merge or deployment
- Failure containment: failures are bounded to account-deletion step-up and auth routing; the Edge Function fails before purge whenever recent-auth evidence cannot be established

## Repository reconnaissance

### Current behavior

- Historical deletion work already proves caller-only ownership, transactional tenant purge, zero-row verification and Auth identity deletion ordering.
- The Phase 8 deletion UI explicitly recorded recent password/OAuth verification as an unresolved public-beta hardening boundary.
- `/login` already owns password + Google + CAPTCHA + safe `next`; authenticated users are normally redirected away from auth routes.
- PR #316 reuses that surface in one narrowly scoped step-up mode instead of creating a second authentication system.
- Independent review found a cross-account counterexample: reauth could otherwise become an account switch. Password step-up now checks current email and resulting user ID; Google step-up stores the expected current user ID in a short-lived HttpOnly callback cookie and rejects/signs out a mismatched OAuth identity.
- Independent review also found that a raw `reauth=1` form field should not activate step-up outside deletion. Server actions now require both the flag and a sanitized `nextPath === ACCOUNT_DELETION_PATH`.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `supabase/functions/_shared/account-deletion-recent-auth.ts` | pure 10-minute AMR policy | deterministic Edge-owned authorization rule |
| `supabase/functions/delete-account/index.ts` | final destructive authority | verify claims and reject before purge |
| `src/app/(auth)/actions.ts` | password/Google actions + Edge invocation | typed rejection mapping and identity-continuous step-up |
| `src/app/auth/callback/route.ts` | OAuth code exchange | compare expected/current identity before returning |
| `src/lib/account-deletion-reauth.ts` | shared route/cookie names | one owner for step-up routing/continuity constants |
| `src/components/delete-account-page.tsx` | destructive UX | clear confirmation and route stale sessions through step-up |
| `src/app/(auth)/login/page.tsx` | existing login route | explicit deletion-only presentation mode |
| `src/components/auth-form.tsx` | password/Google/CAPTCHA form | reuse with reauth copy; no duplicate auth UI |
| `src/lib/supabase/proxy.ts` | auth-route redirect policy | allow only exact deletion reauth login |
| recent-auth/source/browser tests | failure and semantic contracts | lock authority, continuity and routing |

### Existing tests and constraints

- User ID continues to come only from the validated bearer token; no body/user-selected ID.
- Tenant purge remains transactional and precedes Auth identity deletion.
- Recent-auth rejection occurs before tenant purge.
- Access-token refresh is not interactive identity verification and must not extend deletion authority.
- Build/lint/typecheck are not sufficient security evidence; browser path evidence plus protected CodeQL/secret-history remain required.

### Similar implementation and recent history

- PR #11 established self-service deletion.
- PR #31 verified complete cleanup.
- PR #61 established atomic purge and runtime tenant isolation.
- PR #309 migrated deletion UI and explicitly recorded recent reauthentication as remaining hardening.

### Open questions

- [x] Use `supabase.auth.reauthenticate()` nonce? No. Supabase documents it for Secure Password Change, not as a generic destructive-operation proof.
- [x] Trust JWT `iat`? No. Session refresh can issue a new access token while the latest interactive AMR timestamp remains old.
- [x] Server-verifiable signal? Use verified JWT `amr` entries and accepted interactive-method timestamps.
- [x] Create a new auth UI/provider? No. Reuse `/login`, password, Google, CAPTCHA and safe `next` routing.
- [x] Fixed freshness window? Ten minutes is an explicit MoneyFlow product/security judgment, not an externally mandated number.
- [x] What if step-up selects another account? Reject continuity, clear the mismatched local session and do not proceed to deletion.
- [x] Can any form set `reauth=1`? No. Server actions additionally require sanitized `nextPath === ACCOUNT_DELETION_PATH`.

## Research

### Research scope and source selection

- Decision question: how can MoneyFlow require recent, server-verifiable authentication before permanent account deletion without inventing a parallel identity system?
- Reference map consulted: official Supabase Auth/JWT documentation, OpenID Connect Core and OWASP authentication/session guidance.
- Source budget: focused first-party/primary security sources only.
- Expected decision: authoritative recent-auth signal, refresh versus interactive semantics, OAuth step-up behavior and server-side enforcement.

### Questions researched

1. Does Supabase expose authentication method/timestamp evidence in verified JWT claims?
2. Does automatic session refresh make access-token issuance time unsuitable as recent-login evidence?
3. Is Supabase `reauthenticate()` a generic destructive-operation primitive?
4. How should OAuth request fresh authentication rather than silently reuse an old provider session?
5. What do established security guidelines require before highly sensitive account operations?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Supabase JWT Claims Reference / current auth types | first-party | 2026-08-07 | `amr` records authentication methods and timestamps; claims can be verified through Supabase Auth | MoneyFlow still chooses accepted methods and freshness window |
| Supabase Sessions | first-party | 2026-08-07 | sessions refresh access tokens over time | token `iat` alone cannot prove recent interactive authentication |
| Supabase password security / `reauthenticate()` | first-party | 2026-08-07 | nonce reauthentication belongs to Secure Password Change | not adopted as generic deletion proof |
| OpenID Connect Core | primary standard | 2026-08-07 | `max_age=0` requests current/fresh authentication semantics | actual Google/provider UI remains external behavior |
| OWASP Authentication / Session guidance and ASVS | primary security guidance | 2026-08-07 | highly sensitive actions should require reauthentication/secondary verification | no universal ten-minute threshold is specified |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| client checkbox/timestamp | trivial | bypassable; security theater | rejected |
| JWT `iat` freshness | easy server check | refresh can create fresh token issuance without fresh login | rejected |
| Supabase `reauthenticate()` nonce | first-party API | scoped to password-change flow | rejected |
| separate custom reauth database flag | server-owned | new state, cleanup, races and identity duplication | rejected |
| verified interactive AMR timestamp + reused login | no new identity store; server-verifiable | must handle OAuth/account-switch continuity | selected |

### Research decision

The delete-account Edge Function remains the authority. It verifies the caller, obtains verified JWT claims, finds the latest accepted interactive `amr` entry and requires that timestamp to be no more than ten minutes old. Access-token refresh does not manufacture a new accepted interactive AMR entry. Failure returns typed `recent_auth_required` before any purge.

Password step-up reuses `signInWithPassword`, but only for the current account email and with a final user-ID equality check. Google step-up reuses existing OAuth with `max_age=0`; before redirect, the server stores the current user ID in a ten-minute HttpOnly cookie scoped to `/auth/callback`. The callback compares the newly authenticated user to that expectation, clears the cookie and signs out on mismatch. That cookie is a continuity guard, not deletion authorization.

The server still deletes only `user.id` from the newly verified bearer token. The ten-minute window is explicit MoneyFlow policy; external sources support recent reauthentication but do not prescribe this duration.

### Adoption review

- Observed problem: session validity is weaker than recent interactive authentication for irreversible deletion.
- Existing alternatives: typed confirmation and valid session remain useful but are insufficient alone.
- License/code reuse: no external code copied; existing Supabase SDK only.
- Secrets/privacy: no new secret or password storage; the continuity cookie contains only the expected current user ID, is HttpOnly, callback-scoped and short-lived.
- Runtime/bundle cost: bounded auth routing/UI and Edge claim inspection; no new service/dependency.
- Owning boundary: Supabase Auth creates claims; Edge Function enforces deletion authority; existing login owns step-up interaction; callback owns OAuth continuity.
- Migration/rollback: none; Git revert only.
- Verification plan: red source/unit contracts, browser step-up tests, database gate selected by Supabase path and exact-head protected checks.
- Removal condition: remove/redesign if supported Supabase tokens cannot provide reliably verified interactive AMR timestamps without provider/configuration changes.

## Specification

### Problem

A valid long-lived session could previously reach permanent deletion after typing `XÓA`, even when the last interactive authentication happened much earlier. This exposes the most destructive account operation to stolen-session or unattended-device risk.

### User stories

- As an authenticated user, stale interactive authentication requires step-up before permanent deletion.
- As a password user, I can authenticate the same account through the existing protected form and return to deletion.
- As a Google user, I can request fresh provider authentication for the same account and return to deletion.
- As the owner, token refresh cannot silently extend deletion authority and a different account cannot be mistaken for step-up of the current account.

### Acceptance criteria

- [x] Edge Function rejects stale, missing, malformed, unsupported or future interactive AMR evidence before tenant purge.
- [x] A newly issued access token with stale interactive AMR still fails.
- [x] Edge Function derives deletion target only from validated bearer-token user identity.
- [x] Recent-auth success uses verified claims, not raw client input or unchecked JWT payload.
- [x] Freshness window is a named ten-minute policy constant.
- [x] Server action exposes typed reauthentication-required result.
- [x] Account-deletion UI routes stale sessions to explicit reauth and clears typed `XÓA`.
- [x] Explicit deletion reauth `/login` is reachable while normal authenticated login redirect remains intact.
- [x] Server actions require both `reauth=1` and sanitized deletion `next` before enabling step-up semantics.
- [x] Password step-up validates current email and resulting user ID.
- [x] Google step-up requests `max_age=0`, stores short-lived expected identity and rejects callback mismatch.
- [x] Demo-local deletion behavior remains unchanged.
- [x] Existing atomic purge, cleanup verification and receipt behavior remain intact by source/unit contracts.
- [ ] Final exact-head CI, database, browser, CodeQL and secret-history evidence passes.

### Required states

- Loading: unchanged deletion-page hydration.
- Fresh auth: deletion reaches current server deletion flow.
- Stale auth: Edge returns reauth-required and no tenant data is purged.
- Reauth route: clear reason, password + Google options, CAPTCHA and safe return path.
- Reauth failure: existing auth/CAPTCHA feedback; no deletion attempt.
- Reauth success: same user returns to deletion and must type `XÓA` again.
- Different password/OAuth account: mismatch is rejected; OAuth mismatch clears the new local session and returns to step-up.
- Demo: no server reauth requirement because no server Auth identity exists.
- Accessibility/mobile: reuse current auth/delete primitives; no bespoke destructive dialog geometry.

### Financial and security constraints

- No financial values, balances or tenant assumptions are invented.
- No schema/migration/RLS/provider-setting change.
- Recent-auth check precedes any tenant purge.
- No client-supplied user ID, recent-auth timestamp or accepted auth method.
- Do not log passwords, access tokens, auth claims or provider identifiers.

### Out of scope

- Requiring MFA globally.
- Changing Supabase password/provider configuration.
- Adding another OAuth provider.
- Production destructive test/account deletion without explicit owner approval.
- Phase 9 public/Auth redesign or visual polish.
- Archive/restore work.
- Physical-device acceptance.

## Implementation plan

### Architecture fit

Identity creation stays with Supabase Auth, step-up interaction stays in the existing auth form, OAuth identity continuity stays in the existing callback and destructive authorization stays in the Edge Function. Pure AMR evaluation is shared only within the function boundary so security policy can be tested without a live provider. The server action translates Edge errors for UI flow but is not the security authority.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `supabase/functions/_shared/account-deletion-recent-auth.ts` | pure AMR policy + ten-minute constant | deterministic Edge security contract |
| `src/lib/account-deletion-recent-auth.test.ts` | fresh/stale/malformed/future/multi-method cases | red-before-green evidence |
| `supabase/functions/delete-account/index.ts` | verified claim check before purge | authoritative enforcement |
| `src/app/(auth)/actions.ts` | typed Edge mapping + scoped password/Google step-up | usable server-owned flow |
| `src/lib/account-deletion-reauth.ts` | shared route/cookie continuity constants | avoid routing drift |
| `src/app/auth/callback/route.ts` | verify OAuth identity continuity | reject account switching |
| `src/app/(auth)/login/page.tsx` | deletion-only reauth presentation | route intent |
| `src/components/auth-form.tsx` | reauth copy/state using existing form | clear UX without duplicate auth surface |
| `src/lib/supabase/proxy.ts` | narrow authenticated login exception | make step-up reachable only for deletion |
| `src/components/delete-account-page.tsx` | typed reauth route + confirmation reset | close warning-only gap |
| source continuity/integration contracts | ordering, route scope, identity continuity | independent regression evidence |
| `e2e/account-deletion-recent-auth.spec.ts` | explicit vs unrelated reauth presentation | browser semantic evidence |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: authenticated tokens without a recent accepted interactive AMR fail safe and require step-up.
- Rollback: revert PR #316 files; current session-only deletion behavior returns.

### Risks and counterexamples

| Risk/counterexample | Prevention/test |
|---|---|
| fresh JWT issuance looks like fresh login | do not use `iat`; evaluate interactive AMR timestamp |
| Edge decodes unverified claims | use Supabase `auth.getClaims(accessToken)` before policy evaluation |
| UI bypasses reauth | Edge rejects before purge regardless of route |
| Google silently reuses provider session | request OIDC `max_age=0`; callback still checks resulting identity |
| password/Google switches account | password email+ID equality; OAuth HttpOnly expected-user cookie + callback mismatch sign-out |
| arbitrary form sets `reauth=1` | server requires sanitized deletion `nextPath` too |
| login reauth exception exposes auth broadly | proxy allows only exact deletion reauth query |
| typed confirmation survives reauth | clear `XÓA`; user must re-enter after return |
| provider claims lack expected AMR | fail closed; do not weaken policy |

### Verification plan

- Static/policy: `npm run check:knowledge`, `npm run test:ci-policy`, lint, typecheck.
- Unit/source: pure policy + recent-auth integration + continuity + existing deletion contracts + full unit suite.
- Database: classifier selects database verification because a Supabase Edge boundary changed even without schema changes; final selected gate must pass.
- Browser: explicit deletion step-up presentation, unrelated reauth fallback and selected authenticated safety flows.
- Build: production build.
- Security: exact-head CodeQL + secret-history.
- Production: not authorized in this slice.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | repository/history audit | none | deletion/auth files + merged deletion PRs | done |
| T2 | official security research | T1 | Supabase/OIDC/OWASP sources | done |
| T3 | write red recent-auth contracts | T2 | pure/integration/continuity tests committed before owners | done |
| T4 | implement Edge/server auth policy | T3 | Edge + typed server flow + continuity | done |
| T5 | implement reused step-up UI/routing | T4 | login/AuthForm/proxy/delete-page/browser spec | done |
| T6 | independent review and exact-head gates | T5 | counterexamples + CI/DB/browser/CodeQL/secret evidence | in_progress |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-07 | researcher | planner | specified | main deletion/auth audit + primary security sources | provider AMR runtime behavior needed repository contracts | create red tests |
| 2026-08-07 | planner | implementer | planned | Class 3 packet | implementation not started | write failing recent-auth contracts |
| 2026-08-07 | implementer | evaluator | evaluating | pure policy 7/7; source contracts; Edge/server/UI implementation | full provider gates pending | review counterexamples |
| 2026-08-07 | evaluator | implementer | evaluating | found cross-account step-up and unscoped `reauth=1` cases | continuity/scope needed hardening | add red contracts then fix |
| 2026-08-07 | implementer | evaluator | evaluating | password/OAuth continuity, callback guard, server next-path scope, browser spec | final exact-head gates pending | fix only observed CI failures |

### Current permission boundary

- Granted scope: branch-only implementation/tests/docs in `security/account-deletion-recent-auth` and PR #316 metadata.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`; public Supabase/OIDC/OWASP documentation.
- Forbidden writes: `main`, Supabase/Vercel/provider settings, production data, branch protection/rulesets.
- Human approval required before: merge, deployment, production deletion, provider policy or MFA changes.
- Rollback or stop condition: stop if supported Supabase tokens cannot provide verifiable interactive-auth evidence without provider/configuration changes.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| recent-auth policy | red-first pure tests; isolated 7/7 pass | pass locally |
| pre-purge Edge enforcement | source contract + superseded unit suite | pass before final-head refresh |
| password/Google step-up routing | source/continuity contracts + browser spec | pending final-head refresh |
| existing deletion atomicity | superseded full unit suite | pass before final-head refresh |
| static/typecheck/build | superseded ready-for-review run before memory-only fix | pass |
| exact-head protected checks | final CI/DB/browser/CodeQL/secret history | pending |

### Research and adoption evidence

- Supabase verified claims/AMR support server-side recent-auth evaluation without a parallel identity store.
- Supabase session refresh behavior is why JWT issuance time is rejected as the signal.
- OIDC `max_age=0` supports requesting fresh Google authentication but does not replace Edge authorization.
- OWASP supports reauthentication for sensitive operations; ten minutes remains MoneyFlow policy.

### Review findings

- Correctness: Edge authority, typed server result, route scope and continuity are implemented; final exact-head gates remain.
- Security/ownership: deletion target stays token-derived; client cannot supply freshness or target user; account-switch step-up is rejected.
- UI/UX/accessibility: existing AuthForm/CAPTCHA and deletion safety primitives are reused; destructive confirmation never crosses reauth.
- Maintainability: no new service/provider/schema; route and continuity constants have one repository owner.
- Scope compliance: no production/provider writes and no Phase 9 redesign.

### Remaining limitations

- Ten minutes is MoneyFlow policy, not a universal standard.
- Repository/browser contracts can prove requested Google parameters and callback continuity but cannot prove live Google provider UI behavior without a real provider exercise.
- Production destructive acceptance remains separately authorized.

## Delivery record

- Branch: `security/account-deletion-recent-auth`
- PR: #316 (ready for review)
- Squash commit: pending owner decision
- CI run: exact-head refresh pending
- Production deployment: not authorized
- Production flow verified: not authorized
- Work packet moved to `docs/plans/completed/`: pending owner acceptance
