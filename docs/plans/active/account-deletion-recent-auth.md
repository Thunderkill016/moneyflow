# Recent authentication for permanent account deletion

**Status:** planned
**Execution state:** planned
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** human owner + implementing agent
**Issue/PR:** branch `security/account-deletion-recent-auth`
**Last updated:** 2026-08-07

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is a Class 3 security/authentication change. Merge, deployment, provider configuration and production-account deletion require separate owner authorization.

## Outcome

An authenticated MoneyFlow user cannot permanently delete their server account and tenant financial data merely because a long-lived session cookie is still valid. Immediately before the destructive action, MoneyFlow requires server-verifiable evidence of a recent interactive Supabase authentication event. Automatic JWT refresh is not accepted as recent authentication.

## Control contract

### State

- Location: the authenticated Supabase access token's verified JWT claims, specifically the `amr` authentication-method references with timestamps; the delete-account Edge Function is the destructive-action enforcement point
- Writer/owner: Supabase Auth creates authentication/session claims after password, OAuth or other provider authentication; MoneyFlow application code may request a new login but cannot manufacture accepted recent-auth evidence
- Propagation: a successful step-up login writes the new Supabase session cookies/access token; the subsequent server action invokes the Edge Function with that token, and the Edge Function verifies the claims before any tenant purge

### Feedback

- Expected failing signal: a stale, missing, malformed or refresh-only authentication history must return `recent_auth_required` before `purge_user_tenant_data` is called; an authenticated user hitting ordinary `/login` still follows current redirect behavior, while the explicit reauth route remains reachable
- Success signal: focused source/unit contracts, `npm run test:ci-policy`, lint, typecheck, unit tests, production build and selected browser tests pass; exact-head CodeQL and secret-history scans pass
- Semantic evidence: an old-but-valid session cannot delete an account; a new interactive password or OAuth login can return to the deletion page and the Edge Function accepts only the identity represented by the newly verified token; token refresh alone cannot refresh deletion authority

### Removal impact

- What breaks if removed: permanent account deletion falls back to session-validity plus typed `XÓA`, so a stolen or unattended long-lived session can execute the destructive operation without a fresh authentication event
- Rollback: revert the bounded recent-auth branch changes and rerun the account-deletion source contracts plus browser/auth gates; no schema or data migration is involved

### Action safety

- Permissions: repository branch writes only; read official Supabase/OIDC/OWASP guidance; no Supabase/Vercel/provider configuration or production-data writes
- Reversibility: code, tests and documentation are reversible Git changes; no migration, secret rotation or irreversible provider action is part of this slice
- Escalation: stop for provider-dashboard changes, MFA policy decisions, production deletion exercises, branch-protection/ruleset changes, merge or deployment
- Failure containment: failures are bounded to the account-deletion step-up path and auth routing; the Edge Function must reject before purge whenever recent-auth evidence cannot be established

## Repository reconnaissance

### Current behavior

- `src/components/delete-account-page.tsx` explicitly tells users that current authenticated deletion has a valid session but no password/OAuth reauthentication immediately before deletion.
- `src/app/(auth)/actions.ts` verifies the current user and invokes `delete-account`, then clears the local session only after server deletion succeeds.
- `supabase/functions/delete-account/index.ts` validates the bearer token, derives `user.id` only from the verified caller, atomically purges tenant rows, verifies zero rows, then deletes the Auth identity.
- `src/lib/account-deletion-edge-contract.test.ts` locks caller-only deletion, service-role isolation, purge ordering, cleanup verification and the deletion receipt.
- `/login` already supports password + Google + CAPTCHA + a safe `next` path, but `src/lib/supabase/proxy.ts` redirects authenticated users away from `/login`; an explicit step-up mode therefore needs a narrow routing exception.
- Historical deletion work already proved tenant isolation, atomic cleanup and production deletion. This slice must not reimplement those solved boundaries.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `supabase/functions/delete-account/index.ts` | final destructive authority | add recent-auth rejection before purge |
| `src/app/(auth)/actions.ts` | password/OAuth actions + Edge invocation | reuse; map typed Edge rejection |
| `src/components/delete-account-page.tsx` | destructive UX | replace warning-only gap with step-up action |
| `src/app/(auth)/login/page.tsx` | existing login route | add explicit reauth presentation mode |
| `src/components/auth-form.tsx` | password/Google/CAPTCHA form | reuse with reauth copy; avoid second auth UI |
| `src/lib/supabase/proxy.ts` | auth-route redirect policy | allow only explicit authenticated reauth login |
| `src/lib/account-deletion-edge-contract.test.ts` | current security contract | extend with recent-auth ordering/ownership |

### Existing tests and constraints

- User ID must continue to come only from the validated bearer token; no body/user-selected ID.
- Tenant purge must remain transactional and must occur before Auth identity deletion.
- Recent-auth rejection must occur before tenant purge.
- Token refresh is not an interactive identity verification and must not extend deletion authority.
- Build/lint/typecheck are not security evidence by themselves; browser route evidence and protected CodeQL/secret-history remain required.

### Similar implementation and recent history

- PR #11 established self-service deletion.
- PR #31 verified complete cleanup.
- PR #61 established atomic purge and runtime tenant-isolation contracts.
- PR #309 migrated the deletion UI and explicitly recorded recent re-authentication as a remaining hardening boundary.

### Open questions

- [x] Use `supabase.auth.reauthenticate()` nonce? No. Supabase documents it for Secure Password Change, not as a generic destructive-action proof.
- [x] Trust JWT `iat`? No. Automatic refresh issues new access tokens, so token issuance time can be fresh while interactive authentication is old.
- [x] Server-verifiable signal? Use verified JWT `amr` entries and their timestamps; ignore refresh-only methods.
- [x] Create a new auth UI/provider? No. Reuse `/login`, password, Google, CAPTCHA and `next` routing.
- [x] Fixed freshness window? Use 10 minutes as a MoneyFlow product/security judgment, not as an externally mandated number.

## Research

### Research scope and source selection

- Decision question: how can MoneyFlow require recent, server-verifiable authentication before permanent account deletion without inventing a parallel identity system?
- Reference map consulted: official Supabase Auth/JWT documentation, OpenID Connect Core and OWASP authentication/session guidance.
- Source budget: focused first-party/primary security sources only.
- Expected decision: choose the authoritative recent-auth signal, distinguish refresh from interactive authentication, define OAuth step-up behavior and keep the destructive check server-side.

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
| OpenID Connect Core | primary standard | 2026-08-07 | `max_age` requests fresh authentication and `max_age=0` forces current authentication semantics | provider implementation still needs browser verification |
| OWASP Authentication / Session guidance and ASVS | primary security guidance | 2026-08-07 | highly sensitive actions should require reauthentication/secondary verification | no universal 10-minute threshold is specified |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| client checkbox/timestamp | trivial | fully bypassable; security theater | rejected |
| JWT `iat` freshness | easy server check | refresh tokens create fresh JWTs without re-login | rejected |
| Supabase `reauthenticate()` nonce | first-party API | scoped to password-change flow, not deletion authority | rejected |
| separate custom reauth database flag | server-owned | new state, cleanup, races and identity duplication | rejected |
| verified JWT `amr` interactive timestamp + reused login | no new identity store; server-verifiable | must handle OAuth and refresh semantics carefully | selected |

### Research decision

The delete-account Edge Function remains the authority. It verifies the caller's token, obtains verified JWT claims, finds the latest accepted interactive `amr` entry and requires that timestamp to be no more than 10 minutes old. Refresh-only authentication references do not count. Failure returns a typed `recent_auth_required` response before any purge.

The UI reuses the existing login surface in an explicit reauth mode. Password login naturally performs fresh password authentication. Google step-up uses the existing Supabase OAuth action with provider parameters requesting fresh authentication and returns through the existing safe `next` route. The server still deletes only `user.id` from the newly verified token; selecting a different provider account cannot target the previous identity.

The 10-minute window is an explicit MoneyFlow product/security policy for this destructive operation. External sources support recent reauthentication as a control but do not mandate this exact duration.

### Adoption review

- Observed problem: session validity is weaker than recent interactive authentication for irreversible deletion.
- Existing alternatives: typed confirmation and valid session remain useful UX/identity checks but are insufficient alone.
- License/code reuse: no external code copied; existing Supabase SDK only.
- Secrets/privacy: no new secret or credential storage; passwords remain submitted only through current Supabase Auth action.
- Runtime/bundle cost: bounded auth routing/UI and Edge claim inspection; no new service/dependency.
- Owning boundary: Supabase Auth creates claims; Edge Function enforces deletion authority; existing login owns step-up interaction.
- Migration/rollback: none; Git revert only.
- Verification plan: red source/unit contracts, browser step-up route tests, exact-head protected checks.
- Removal condition: remove/redesign if current Supabase tokens cannot provide reliably verified interactive `amr` timestamps for the supported login methods.

## Specification

### Problem

A user with a valid long-lived session can currently reach the final permanent deletion action after typing `XÓA`, even if their last interactive authentication happened much earlier. This leaves the most destructive account operation exposed to stolen-session or unattended-device risk.

### User stories

- As an authenticated user, if my last interactive authentication is too old, I am asked to verify my identity again before permanent deletion.
- As a password user, I can re-enter my credentials through the existing protected login form and return to account deletion.
- As a Google user, I can perform a fresh provider authentication and return to the same deletion path.
- As the owner, refresh-only JWT activity can never silently extend deletion authority.

### Acceptance criteria

- [ ] Edge Function rejects stale/missing/refresh-only recent-auth evidence before tenant purge.
- [ ] Edge Function still derives deletion target only from the validated bearer token.
- [ ] Recent-auth success is based on verified claims, not raw client input or unchecked JWT payload.
- [ ] Freshness window is one named shared policy constant and is 10 minutes.
- [ ] Server action exposes a typed reauthentication-required result rather than flattening it into a generic deletion failure.
- [ ] Account-deletion UI sends authenticated users to explicit reauth mode when required.
- [ ] Authenticated users can access `/login?reauth=1&next=/settings/delete-account` while ordinary `/login` still redirects them away.
- [ ] Password and Google actions preserve safe `next` behavior; Google requests fresh provider authentication.
- [ ] Successful step-up returns to deletion; a different OAuth account cannot delete the original account by client-supplied identity.
- [ ] Demo-local deletion behavior remains unchanged.
- [ ] Existing atomic purge, cleanup verification and receipt behavior remains intact.
- [ ] Exact-head CI, CodeQL and secret-history pass before owner review.

### Required states

- Loading: unchanged current deletion-page hydration.
- Fresh auth: deletion proceeds to current server deletion flow.
- Stale auth: destructive call returns reauth-required and no server data is purged.
- Reauth route: clear reason, password + Google options, CAPTCHA and safe return path.
- Reauth failure: current auth error/CAPTCHA feedback; no deletion attempt.
- Reauth success: return to deletion page; typed `XÓA` must be entered again because destructive confirmation is not carried through auth.
- Different OAuth account: current session becomes that authenticated identity; Edge target remains token-derived only.
- Demo: no server reauth requirement because no server Auth identity exists.
- Accessibility/mobile: use current auth/delete primitives and browser contracts; no new bespoke dialog geometry.

### Financial and security constraints

- No financial values, balances or tenant assumptions are invented.
- No schema/migration/RLS/provider-setting change.
- The recent-auth check must precede any tenant purge.
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

Keep identity creation with Supabase Auth, step-up interaction in the existing auth form, and destructive authorization in the Edge Function. Add pure recent-auth claim evaluation so the policy can be tested without a live provider. The server action translates Edge errors for UI flow but is not the security authority.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/account-deletion-recent-auth.ts` | pure AMR policy + 10-minute constant | deterministic security contract |
| focused test | stale/fresh/refresh-only/malformed cases | red-before-green evidence |
| `supabase/functions/delete-account/index.ts` | verified claim check before purge | authoritative enforcement |
| `src/app/(auth)/actions.ts` | typed Edge error mapping + Google fresh-auth parameters | usable step-up flow |
| `src/app/(auth)/login/page.tsx` | parse explicit reauth mode | route intent |
| `src/components/auth-form.tsx` | reauth copy/state without duplicating form | clear UX |
| `src/lib/supabase/proxy.ts` | narrow authenticated-login exception for reauth mode | make step-up reachable |
| `src/components/delete-account-page.tsx` | reauth action after typed server rejection | close current warning-only gap |
| `src/lib/account-deletion-edge-contract.test.ts` | lock pre-purge enforcement and ownership | source-level regression |
| browser/auth tests | stale-flow routing + ordinary-login redirect | semantic evidence |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: existing Supabase access tokens whose verified `amr` lacks a recent interactive entry fail safe and require step-up.
- Rollback: revert branch files; current session-only deletion behavior returns.

### Risks and counterexamples

| Risk/counterexample | Prevention/test |
|---|---|
| refreshed JWT looks newly authenticated | ignore refresh-only AMR; do not use JWT `iat` |
| Edge decodes unverified claims | obtain verified claims through Supabase Auth before policy evaluation |
| UI bypasses reauth | Edge rejects before purge regardless of client route |
| Google silently reuses provider session | request fresh OIDC authentication parameters and browser-test return flow |
| user picks a different Google account | Edge still derives target from new validated token; never carry original user ID |
| login reauth exception exposes auth screen broadly | allow only explicit `reauth=1`; ordinary authenticated `/login` remains redirected |
| deletion confirmation survives reauth unexpectedly | do not persist typed `XÓA`; user re-enters it after returning |
| provider claims lack expected AMR | fail safe to reauth-required; do not weaken the check |

### Verification plan

- Static/policy: `npm run check:knowledge`, `npm run test:ci-policy`, lint, typecheck.
- Unit/source: recent-auth pure tests + account-deletion edge contracts + full unit suite.
- Database: no schema/RLS change; classifier should mark DB gate not required.
- Browser: login reauth routing, normal authenticated login redirect, stale deletion response UI and return path where deterministic harness supports it.
- Build: production build.
- Security: exact-head CodeQL + secret-history.
- Production: not authorized in this slice.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | repository/history audit | none | current deletion/auth files + merged deletion PRs | done |
| T2 | official security research | T1 | Supabase/OIDC/OWASP sources | done |
| T3 | write red recent-auth contracts | T2 | failing focused tests before implementation | in_progress |
| T4 | implement Edge/server auth policy | T3 | unit/source contracts | todo |
| T5 | implement reused step-up UI/routing | T4 | browser/auth contracts | todo |
| T6 | independent review and exact-head gates | T5 | CI/CodeQL/secret evidence | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-07 | researcher | planner | specified | main deletion/auth audit + primary security sources | provider AMR runtime behavior still needs repository contracts | create red tests |
| 2026-08-07 | planner | implementer | planned | this Class 3 packet | implementation not started | write failing recent-auth policy/source contracts |

### Current permission boundary

- Granted scope: branch-only implementation/tests/docs in `security/account-deletion-recent-auth`.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`; public Supabase/OIDC/OWASP documentation.
- Forbidden writes: `main`, Supabase/Vercel/provider settings, production data, branch protection/rulesets.
- Human approval required before: merge, deployment, production deletion, provider policy or MFA changes.
- Rollback or stop condition: stop if supported Supabase tokens cannot provide verifiable interactive-auth evidence without provider/configuration changes.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| recent-auth policy | red/green focused tests | pending |
| pre-purge Edge enforcement | source contract + exact-head tests | pending |
| password/Google step-up routing | browser/auth contracts | pending |
| existing deletion atomicity | current source contracts remain green | pending refresh |
| exact-head protected checks | CI/CodeQL/secret history | pending |

### Review findings

- Correctness: pending implementation.
- Security/ownership: design keeps final authority in verified Edge claims and token-derived user identity.
- UI/UX/accessibility: reuses existing auth and secondary safety primitives; no Phase 9 redesign.
- Maintainability: no new service, provider or persistent reauth state.
- Scope compliance: no production/provider writes.

### Remaining limitations

- The 10-minute window is MoneyFlow policy, not a universal standard.
- Real Google provider behavior requires browser/provider evidence; repository contracts can prove requested parameters and safe routing but not provider UI behavior.
- Production destructive acceptance remains a separately authorized operation.

## Delivery record

- Branch: `security/account-deletion-recent-auth`
- PR: pending
- Squash commit: pending owner decision
- CI run: pending
- Production deployment: not authorized
- Production flow verified: not authorized
- Work packet moved to `docs/plans/completed/`: pending owner acceptance
