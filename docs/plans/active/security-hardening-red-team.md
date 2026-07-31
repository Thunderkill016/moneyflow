# Security hardening after production red-team

**Status:** implementing  
**Owner:** GPT-5.6 Thinking + human owner  
**Issue/PR:** pending  
**Last updated:** 2026-07-31

## Outcome

MoneyFlow rejects oversized or binary abuse at the public Web Share Target, ships a materially stricter browser security policy, avoids account-enumeration hints, applies a stronger app-level password policy, and continuously proves that authenticated user B cannot read or mutate user A's ledger objects through RLS, views or financial RPCs.

## Repository reconnaissance

### Current behavior

- Production protected routes redirect unauthenticated requests to `/login`.
- `safeNextPath` rejects absolute, protocol-relative, control-character, backslash and Inbox redirects.
- Every public tenant table has RLS; `anon` has no public-table grants; ledger mutation tables are SELECT-only for authenticated clients.
- Five read views use `security_invoker=true`.
- Authenticated financial RPCs are `SECURITY DEFINER`, derive identity from `auth.uid()`, filter ownership and set an empty `search_path`.
- `/api/share-target` calls `request.formData()` before enforcing a total request limit and may call `File.text()` on non-text files.
- The CSP only sets `frame-ancestors`, `base-uri` and `object-src`; it does not restrict script, connection, form, worker or image sources.
- Email registration/update accepts eight-character passwords at the app layer. Supabase leaked-password protection is unavailable on the current Free plan.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/proxy.ts` | Earliest application-owned point for Web Share Target requests | Reject declared oversized bodies before rewrite |
| `src/app/api/share-target/route.ts` | Public multipart parser and bridge | Enforce total/per-file/type limits before reading file text |
| `src/lib/inbox/share-payload.ts` | Existing share contract | Preserve payload and candidate behavior |
| `next.config.ts` | Global response headers | Replace partial CSP with tested policy and add isolation headers |
| `src/app/(auth)/actions.ts` | Public auth Server Actions | Stronger password length and neutral registration failure copy |
| `src/components/auth-form.tsx` | Password guidance | Keep UI copy synchronized with policy |
| `supabase/tests/database/` | Runtime database security gates | Add forged-user cross-tenant tests and catalog assertions |
| `.github/dependabot.yml` | Supply-chain monitoring | Add weekly npm and Actions checks without changing CI permissions |

### Existing tests and constraints

- Unit tests run through plain Node and runtime imports inside `src/lib/**` require relative paths with `.ts` extensions.
- `schema_and_rls.test.sql` validates tables, policies and key RPC existence but not forged-user behavior.
- `AGENTS.md` forbids changing CI workflow permissions or required checks in this task.
- Financial invariants, runtime behavior and UI hierarchy must remain unchanged.

### Similar implementation and recent history

- PR #163 connected security-like UI gates only after deliberate red proofs.
- Production rollback simulations on 2026-07-31 created two temporary Auth identities and attacked user A's objects as user B. All 25 RLS/RPC isolation checks passed; no production rows persisted.
- Next.js `16.2.11` is the patched boundary for the July 2026 App Router advisories reviewed for this packet. The repository also pins `sharp@0.35.0` and SheetJS CE `0.20.3`.

### Open questions

- [x] Can cross-tenant isolation be exercised without persistent production data? Yes: transaction-scoped Auth identities plus rollback.
- [x] Can strict nonce CSP be added safely in this packet? No. Current Next rendering emits framework inline scripts; nonce adoption changes rendering/cache behavior and needs a separate measured packet.
- [x] Can provider settings be changed from this repository? No. CAPTCHA, Supabase minimum password length, leaked-password protection and Vercel WAF remain deployment actions.

## Research

### Questions researched

1. Which current Next.js security advisories affect the pinned version?
2. Which CSP directives can be added without introducing a nonce/rendering migration?
3. Which controls must live in Supabase/Vercel provider settings rather than code?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Next.js GitHub Security Advisories | 2026-07-31 | `16.2.11` patches the July 2026 disclosed App Router/server-action issues reviewed here | Does not prove application authorization |
| Supabase database advisor and live catalog | 2026-07-31 | Leaked-password protection is disabled; RPC and RLS surface is externally reachable but ownership-filtered | Advisor warnings are not exploits by themselves |
| Vercel Firewall guidance | 2026-07-31 | Platform DDoS protection exists; route-specific rate limiting is a provider rule | Provider rule cannot be committed from this connector |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Full nonce CSP in proxy | Strongest script policy | Changes dynamic rendering/cache behavior; recent nonce-specific advisories; wide regression surface | Defer to separate packet |
| Static CSP with no script directive | No breakage | Leaves script execution unrestricted | Reject |
| Static CSP allowing framework inline scripts but blocking inline event handlers and external script origins | Material defense-in-depth with bounded compatibility risk | Does not stop an injected inline `<script>` | Implement and document limitation |
| In-memory application rate limiter | Easy code | Ephemeral, multi-region and false sense of protection | Reject; use provider WAF |
| Total/per-file/type limits in proxy and route | Bounded parsing and text decoding | Chunked bodies still require provider limit for earliest rejection | Implement |

### Research decision

Implement bounded, testable application controls now. Do not claim a nonce CSP, WAF rule, CAPTCHA or provider password policy is active until configured and production-verified. Preserve the current architecture and financial behavior.

## Specification

### Problem

A public finance application must assume direct calls to its Server Actions, Supabase Data API, RPCs and share endpoint. Current database ownership is strong, but upload parsing, browser policy and automated cross-tenant evidence are weaker than the paid-product standard.

### User stories

- As a user, another authenticated account cannot read or mutate my money data even when it knows object UUIDs.
- As an operator, one public share request cannot make the application decode arbitrary large or binary file bodies as text.
- As a user, the browser blocks unneeded framing, external scripts, form posts and resource connections.
- As an operator, dependency security updates are surfaced automatically.

### Acceptance criteria

- [ ] Declared share requests above the total limit receive HTTP 413 before rewrite or multipart parsing.
- [ ] The route rejects cumulative/per-file overflow and never calls `File.text()` for unsupported binary types.
- [ ] CSP includes `default-src`, `script-src`, `script-src-attr`, `connect-src`, `form-action`, `frame-ancestors`, `object-src`, `worker-src` and production upgrade behavior; no `unsafe-eval`.
- [ ] Registration/update require at least 12 characters at the application boundary and UI copy matches.
- [ ] Registration errors do not suggest whether an email already exists.
- [ ] Database tests create two users, attack 25 foreign-object read/mutation paths and prove every attempt is isolated.
- [ ] Catalog tests prove no anon public-table access, no anon/public execution of financial RPCs, authenticated RPC identity derivation and security-invoker views.
- [ ] Dependabot monitors npm and GitHub Actions weekly.

### Required states

- Validation/error: oversized share returns 413; malformed share still reaches the existing friendly empty-payload state.
- Recovery/undo: unchanged.
- Mobile/tablet/desktop: no visual change except password guidance text.
- Accessibility: validation messages remain associated with fields.

### Financial and security constraints

- No financial calculation, balance, transfer or report behavior changes.
- Integer VND and transfer invariants remain intact.
- No service-role key enters application/browser code.
- Production attack simulations must use rollback and no destructive or availability attack.

### Out of scope

- Brute force, credential stuffing, denial of service or destructive production testing.
- Supabase Pro leaked-password protection.
- Enabling CAPTCHA, changing Supabase Auth minimum password length or publishing Vercel WAF rules.
- Full CSP nonce migration.
- Merging or deploying the branch.

## Implementation plan

### Architecture fit

Pure request-limit and header policy helpers live in `src/lib` and are consumed by proxy/config/route owners. Auth validation remains in the Auth Server Action. Database isolation is enforced and tested in PostgreSQL rather than duplicated in UI code.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/inbox/share-target-security.ts` | Pure size/type policy | One tested owner usable by proxy and route |
| `src/proxy.ts` | Early Content-Length rejection | Avoid invoking multipart route for declared oversized requests |
| `src/app/api/share-target/route.ts` | Cumulative/per-file/type enforcement | Prevent binary decoding and bounded resource abuse |
| `src/lib/security-headers.ts`, `next.config.ts` | Tested CSP/header policy | Defense in depth without nonce migration |
| Auth action/form + policy helper | 12-character policy and neutral failure text | Reduce weak-password and enumeration risk |
| `supabase/tests/database/*.sql` | Catalog and two-user runtime attacks | Make live findings repeatable in CI database job |
| `.github/dependabot.yml` | Weekly dependency update monitoring | Supply-chain visibility |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: existing passwords remain valid for login; only new/updated passwords use the app boundary.
- Rollback: revert branch; no production data migration.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| CSP blocks Supabase or Speed Insights | Explicit connect allow-list and production browser smoke |
| Android share sends empty MIME | Permit `.csv`, `.txt`, `.tsv` by filename when MIME is empty/octet-stream |
| Attacker omits Content-Length | Route cumulative/per-file checks remain; provider WAF is still required for earliest network rejection |
| App password rule bypassed through direct Supabase Auth API | Deployment checklist requires matching Supabase Auth minimum; do not claim provider enforcement from code |
| pgTAP test accidentally persists users | Entire file runs inside `begin`/`rollback` with deterministic `.invalid` identities |

### Verification plan

- Static: knowledge, architecture, lint, typecheck, build.
- Unit/domain: security header, share-limit and password-policy tests.
- Database: pgTAP catalog + 25 cross-tenant read/RPC attacks.
- Browser flow: login/register, protected-route redirect, share error and core expense smoke in CI.
- Production/manual: inspect exact headers; verify login/register and share target after deployment; configure provider controls separately.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Record production attack surface and rollback red-team | none | 25/25 foreign-object attacks blocked | done |
| T2 | Add share request hard limits and tests | T1 | unit tests + 413 behavior | todo |
| T3 | Add CSP/security headers and tests | T1 | policy tests + response header inspection | todo |
| T4 | Harden auth messages/password policy | T1 | unit/static tests + browser form | todo |
| T5 | Add database catalog and two-user pgTAP gates | T1 | local/CI `test:db` | todo |
| T6 | Add dependency monitoring | none | valid Dependabot config | todo |
| T7 | Evaluate diff and open draft PR | T2-T6 | checks and disclosed limits | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Current cross-tenant ownership | Production rollback simulation, 25 tests | pass |

### Review findings

- Correctness: pending implementation.
- Security/ownership: database baseline passed; web hardening pending.
- UI/UX/accessibility: no intended visual hierarchy change.
- Maintainability/duplication: one policy owner per concern.
- Scope compliance: no destructive test, provider mutation, merge or deploy.

### Remaining limitations

- Provider CAPTCHA, minimum password length, WAF and leaked-password protection require separate dashboard actions.
- A nonce-based CSP remains future work.

## Delivery record

- Branch: `agent/security-hardening-red-team`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not performed
- Production flow verified: not performed
- Work packet moved to `docs/plans/completed/`: no
