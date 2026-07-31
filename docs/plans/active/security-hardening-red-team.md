# Security hardening after production red-team

**Status:** evaluating  
**Owner:** GPT-5.6 Thinking + human owner  
**Issue/PR:** #173  
**Last updated:** 2026-07-31

## Outcome

MoneyFlow rejects oversized and binary abuse at the public Web Share Target, ships a materially stricter browser security policy, avoids account-enumeration hints, applies a stronger app-level password policy, and continuously proves that authenticated user B cannot read or mutate user A's ledger objects through RLS, views or financial RPCs.

## Repository reconnaissance

### Baseline behavior

- Production protected routes redirected unauthenticated requests to `/login`.
- `safeNextPath` rejected absolute, protocol-relative, control-character, backslash and Inbox redirects.
- Every public tenant table had RLS; `anon` had no public-table grants; ledger mutation tables were SELECT-only for authenticated clients.
- Five read views used `security_invoker=true`.
- Authenticated financial RPCs were `SECURITY DEFINER`, derived identity from `auth.uid()`, filtered ownership and set an empty `search_path`.
- `/api/share-target` called `request.formData()` before enforcing a total request limit and could call `File.text()` on non-text files.
- The CSP only set `frame-ancestors`, `base-uri` and `object-src`.
- Email registration/update accepted eight-character passwords at the app layer. Supabase leaked-password protection was unavailable on the current Free plan.

### Relevant repository areas

| Area | Security ownership |
|---|---|
| `src/proxy.ts` | Earliest app-owned rejection for declared oversized share requests |
| `src/app/api/share-target/route.ts` | Multipart stream, cumulative size, file type and decoding boundary |
| `src/lib/inbox/share-target-security.ts` | Pure request/file policy shared by proxy and route |
| `src/lib/security-headers.ts`, `next.config.ts` | Browser policy owner for all routes |
| `src/app/(auth)/actions.ts` | Public Auth Server Action validation and neutral failures |
| `src/components/auth-form.tsx` | User-visible password guidance |
| `supabase/tests/database/` | Runtime catalog and forged-user ownership gates |
| `.github/dependabot.yml` | Dependency update monitoring |

### Existing constraints

- Runtime imports inside `src/lib/**` use relative paths with explicit `.ts` extensions in plain Node tests.
- Security changes must not alter financial calculations, transfer semantics or UI hierarchy.
- CI workflow permissions, required checks and branch protection are outside this packet.
- Provider settings must not be claimed as configured from repository code.

### Red-team baseline

Production-safe verification on 2026-07-31 used one transaction and ended in `rollback`:

- two deterministic `.invalid` Auth identities were inserted through the normal new-user trigger;
- user A created accounts, active/deleted transactions, a transfer, budget, recurring commitment/payment, recurring income/receipt and savings goal;
- the JWT subject was switched to user B;
- 25 foreign-object reads and mutations were attempted;
- every attack was blocked by invisibility, `false` or a neutral domain not-found error;
- no test identity or tenant row persisted.

Live catalog review also confirmed no `anon` grants, security-invoker views, locked definer-function search paths and owner-derived RPC identity. The JWT-protected `delete-account` Edge Function was reviewed separately.

## Research

### Decisions

1. Next.js `16.2.11` is the patched boundary for the July 2026 advisories reviewed for this packet.
2. A full nonce CSP is not safe as a drive-by change: current framework/theme output uses inline scripts and a nonce changes rendering/cache behavior.
3. A static CSP can still restrict origins, form posts, frames, workers and inline event-handler attributes while temporarily permitting framework inline script blocks.
4. An in-memory serverless limiter is not a valid replacement for Vercel Firewall.
5. Application password validation cannot enforce the provider's direct Auth API; Supabase minimum length and CAPTCHA must match in dashboard configuration.

### Sources

| Source | Date accessed | Establishes | Limitation |
|---|---|---|---|
| Next.js GitHub Security Advisories | 2026-07-31 | Patched version boundaries for current App Router/Server Action advisories | Does not prove app authorization |
| Supabase advisor and live catalog | 2026-07-31 | Effective grants, RLS, functions, views and disabled leaked-password protection | Advisor warnings are not exploits by themselves |
| Vercel Firewall guidance | 2026-07-31 | Route rate limits belong at the deployment edge | Rule publication is a provider action |

### Alternatives

| Option | Decision |
|---|---|
| Full nonce CSP in proxy | Deferred to a measured packet because it changes dynamic rendering/cache behavior |
| CSP without `script-src` | Rejected because it leaves script origins unrestricted |
| Current static CSP with bounded external origins and `script-src-attr 'none'` | Implemented with explicit `unsafe-inline` limitation |
| In-memory app rate limiter | Rejected as ephemeral and multi-region unsafe |
| Header-only upload cap | Rejected; chunked bodies are byte-counted before multipart parsing |

## Specification

### User stories

- Another authenticated account cannot read or mutate my money data even when it knows UUIDs.
- One public share request cannot make the application decode an unbounded or arbitrary binary body as text.
- The browser blocks unneeded framing, external scripts, form posts, objects and workers.
- Dependency security updates are surfaced without waiting for a manual audit.

### Acceptance criteria

- [x] Declared share requests above 12 MiB receive HTTP 413 before rewrite or multipart parsing.
- [x] Chunked requests are byte-counted and aborted when they cross the same total cap.
- [x] Each shared file is capped at 2 MiB; text fields are capped; unsupported binary files never call `File.text()`.
- [x] Only multipart requests with a boundary enter the Web Share parser.
- [x] CSP owns default, script origin, script attributes, connections, forms, frames, objects, workers, media, images, fonts and production upgrades; `unsafe-eval` is absent.
- [x] Registration/update require 12–72 characters at the application boundary and UI copy matches.
- [x] Registration, login and reset responses do not reveal whether an email exists.
- [x] Database tests create two users and attack 25 foreign-object read/mutation paths.
- [x] Catalog tests prove grants, definer execution, `auth.uid()`, search path and security-invoker view contracts.
- [x] Dependabot monitors npm and GitHub Actions weekly.

### Security constraints

- No service-role key in normal application/browser code.
- No destructive, brute-force or availability testing against production.
- Production simulations use deterministic data, one transaction and rollback.
- Existing passwords remain valid for login; the stronger boundary applies to registration and update.
- CAPTCHA, provider minimum password, leaked-password protection and WAF are not falsely represented as code changes.

### Out of scope

- Brute force, credential stuffing, denial of service or destructive production testing.
- Supabase Pro leaked-password protection.
- Publishing CAPTCHA, Auth or Vercel Firewall settings.
- Full nonce CSP migration.
- Merge or deployment.

## Implementation

| File/area | Implemented change |
|---|---|
| `src/lib/inbox/share-target-security.ts` | Total/per-file/text limits, multipart validation, text-file allow-list and byte-counting stream |
| `src/proxy.ts` | Early 413 for declared oversized PWA share POST |
| `src/app/api/share-target/route.ts` | Stream-bound multipart parsing, 413/415 responses, cumulative/type enforcement |
| `src/lib/security-headers.ts`, `next.config.ts` | Centralized CSP and browser isolation headers |
| Auth action/form/policy files | 12–72 character policy, neutral errors and synchronized guidance |
| `security_catalog.test.sql` | Effective grant/function/view assertions |
| `cross_tenant_rpc.test.sql` | 25 runtime attacks using two forged JWT subjects with rollback |
| `docs/configuration.md`, `docs/security-rls-check.md` | Provider checklist and current executable security model |
| `.github/dependabot.yml` | Weekly npm and Actions monitoring |

### Data impact

- Schema/migration: none.
- Backfill: none.
- Production data change: none.
- Rollback: revert the branch; provider configuration is unchanged.

### Known limitations

- CSP still permits framework inline script blocks; it blocks external unlisted script origins, inline event attributes and `unsafe-eval`, but it is not a nonce CSP.
- Vercel Firewall must still reject abusive traffic before it reaches application compute.
- Supabase Auth minimum length and CAPTCHA must be configured separately to prevent direct-API bypass.
- Leaked-password protection remains unavailable until plan upgrade.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Production-safe red-team | 25/25 foreign-object attacks blocked and rolled back | done |
| T2 | Share hard limits | policy, stream, route and static tests | done |
| T3 | CSP/security headers | shared owner and policy tests | done |
| T4 | Auth hardening | policy, neutral response and source tests | done |
| T5 | Catalog and two-user pgTAP | two new database suites | done |
| T6 | Dependency monitoring | Dependabot npm/Actions config | done |
| T7 | Evaluate and deliver draft PR | PR #173; exact-head full CI pending | evaluating |

## Evaluation

### Evidence so far

| Layer | Evidence | Result |
|---|---|---|
| Production RLS/RPC | rollback simulation, 25 attacks | pass |
| Production catalog | tables, grants, policies, views, functions, Edge Function | pass |
| Redirect/auth surface | protected route and external `next` probes | pass |
| Partial CI #652 | knowledge, env, CSS ownership, architecture, lint, typecheck, unit/static tests | pass before concurrency cancellation |
| Exact-head build/database/E2E | final CI run | pending |

### Review findings

- Financial behavior: unchanged.
- Ownership: live attacks passed and are now represented as repeatable pgTAP cases.
- Upload abuse: both declared and chunked paths are bounded; binary text decoding is removed.
- Authentication: enumeration hints removed; provider parity remains an explicit operation.
- Browser policy: materially stronger, with nonce limitation disclosed.
- Scope: no provider mutation, production schema change, merge or deployment.

## Delivery record

- Branch: `agent/security-hardening-red-team`
- PR: #173 (draft)
- Head commit: final head to be recorded in PR after CI
- CI: #652 partial/cancelled by newer commits; exact-head run pending
- Production deployment: not performed
- Production flow verified after deployment: not performed
- Work packet moved to `docs/plans/completed/`: no; merge and deployment verification are required first
