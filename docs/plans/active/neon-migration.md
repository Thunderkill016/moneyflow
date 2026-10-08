# MoneyFlow → Neon Free migration

**Status:** discovery
**Execution state:** discovery
**Active role:** researcher → implementer (PoC phase)
**Permission scope:** branch_write (PoC only; no provider/production writes)
**Owner:** agent (Devin) — issue #774 handoff
**Issue/PR:** #774
**Last updated:** 2026-10-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet sequences a
Class-3 provider migration; nothing here authorizes production changes.

## Outcome

MoneyFlow's authenticated mode runs on Neon Free (Postgres + Data API + auth)
instead of Supabase, with the Next.js/Vercel frontend, integer-đồng ledger
invariants, RLS tenant isolation, RPC surface and archive contract preserved —
or a documented, honest blocker list if a dependency has no Neon equivalent.

## Repository reconnaissance

### Current behavior

- Next.js modular monolith on Vercel. Authenticated mode = Supabase Auth
  (GoTrue JWT) + PostgREST Data API + Postgres RLS. Demo mode = browser-local,
  untouched by this migration.
- Single config boundary: `src/lib/supabase/config.ts` gates
  `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; browser
  and server clients in `src/lib/supabase/{server,proxy}.ts`.
- Data access: ~103 `.from()` + ~50 `.rpc()` call sites in `src/server/*` and
  actions — all user-JWT-scoped; **no service-role key exists in app code**.
- Auth surface: ~17 call sites — `signUp`, `signInWithPassword`,
  `signInWithOAuth`, `resetPasswordForEmail`, `updateUser`,
  `exchangeCodeForSession`, `getUser`, `getClaims`, `signOut`,
  `auth.admin.deleteUser` (via Edge Function), plus the `auth.oauth.*`
  authorization-server calls backing MCP consent.
- Database: 74 migrations, 52 pgTAP suites. `auth.uid()` ×167, `auth.users`
  FK references ×27 (all tenant `user_id uuid`), `authenticated` grants ×274,
  `service_role` ×26, `auth.jwt()` ×1 (MCP client_id enforcement).
  `public.handle_new_user` trigger on `auth.users` creates profiles.
  Extensions: `pgcrypto` only.
- Privileged path: `supabase/functions/delete-account` (Deno Edge Function,
  service-role client) deletes all tenant rows + `auth.admin.deleteUser`.
- CI: `supabase db start|reset` + `supabase test db` (pgTAP); e2e uses an
  in-repo Supabase REST/Auth double (`e2e/auth/supabase-double.mjs`).
- Not used: Supabase Storage, Realtime, Edge config beyond the one function.

### Relevant repository areas

| Area | Role | Reuse/change/avoid |
|---|---|---|
| `src/lib/supabase/*` | client/config boundary | change — becomes the provider seam |
| `src/server/*` loaders | all PostgREST/rpc reads | reuse — unchanged if Data API parity holds |
| `src/app/actions/*` | writes via rpc | reuse — unchanged |
| `src/components/auth-form.tsx` + `src/app/(auth)/*` | GoTrue flows | change — Better Auth API surface |
| `supabase/migrations/*` | schema + RLS + RPC | change — auth-schema shim, grants, `auth.uid()` compat |
| `supabase/functions/delete-account` | privileged delete | change — server route or Neon Function |
| `src/app/oauth/*` + `src/app/api/mcp` | OAuth 2.1 server over `auth.oauth.*` | owner decision — no Neon equivalent |
| `.github/workflows/ci.yml` | `supabase db`/`test db` | change — plain Postgres + pgTAP |
| `e2e/auth/supabase-double.mjs` | in-repo backend double | change — or keep as the seam test-double |

### Open questions

- [ ] Better Auth user-ID type: managed Neon Auth uses `text` IDs; our
  `user_id` columns are `uuid`. Options: (a) `text` columns everywhere
  (wide migration), (b) custom `generateId` returning uuid (self-hosted
  Better Auth only), (c) sub→uuid mapping table behind an `auth.uid()`
  shim. PoC must prove one.
- [ ] Whether Neon Data API exposes request claims to SQL like PostgREST's
  `request.jwt.claims` GUC — needed by the `auth.jwt() ->> 'client_id'`
  MCP boundary; otherwise that RPC needs a parameter.
- [ ] Managed vs self-hosted Better Auth: managed limits our ID format and
  admin API surface; self-hosted inside Next.js keeps `generateId` and
  password-hash callbacks (bcrypt verify → existing Supabase hashes port).
- [ ] `auth.oauth.*` consent layer (MCP writes): keep via a self-hosted
  OAuth provider, or descope MCP write-consent for the migration — owner.
- [ ] Egress budget: 5 GB/project/mo — need measured MoneyFlow traffic, not
  the org aggregate that blamed ThunderFeed.

## Research

### Sources

| Source | Date | What it establishes | Limits |
|---|---|---|---|
| neon.com/docs/introduction/plans + faqs/free-plan-limits | 2026-10-08 | Free: 100 CU-hrs/proj/mo, 1 GB storage, 5 GB egress, scale-to-zero 5 min, Better Auth ≤60k MAU, 6h restore | quotas can change; re-verify at cutover |
| neon.com/docs/data-api/access-control | 2026-10-08 | Data API = PostgREST-compatible; JWT→`authenticated`/`anonymous`/custom role; `auth.user_id()` returns `sub` as **text**; GRANT + RLS enforced in Postgres | no `service_role`; no claim-GUC documented |
| neon.com/docs/data-api/custom-authentication-providers | 2026-10-08 | Any JWKS provider accepted; `aud` check supported | self-hosted auth must expose JWKS |
| neon-vs-supabase-free-plan guide | 2026-10-08 | Feature-parity table incl. no managed Realtime | marketing-adjacent; verify against docs |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| A. Neon Data API + Neon Managed Auth | smallest delta; PostgREST parity | text IDs; admin API unknown; OAuth-server gap | **PoC first** |
| B. Neon Postgres + server-owned `pg` adapter + self-hosted Better Auth | full control (uuid IDs, bcrypt verify callback, admin ops); no Data API dependency | replaces 103 `.from()` sites behind a new seam; more code owned | fallback if A fails |
| C. Neon Data API + third-party auth (Clerk/Auth0) | managed | new provider, new cost, new data residency question | rejected — adds a second vendor |

### Research decision

Hypothesis A first: keep the PostgREST-shaped data path (Data API), and for
auth prefer **self-hosted Better Auth inside the Next.js app** over managed
Neon Auth — it keeps `generateId` (uuid), a bcrypt `verify` callback for
Supabase-hash portability, and owns the admin surface without a third vendor.
If managed Auth proves uuid-compatible and admin-complete, it is the cheaper
operational choice — decide in PoC with evidence, not preference.

### Adoption review (new runtime deps, PoC only)

- `better-auth` (MIT) — replaces GoTrue client calls; owns session/JWT issuing
  and JWKS endpoint for the Data API. No user data leaves the app beyond the
  Neon Postgres it already lives in.
- `@neondatabase/postgrest-js` or plain `postgrest-js` against the Data API —
  same wire protocol as `supabase-js`'s data calls; the seam is a typed client
  factory, not a rewrite of `src/server/*`.
- `pg`/`postgres.js` for privileged server paths (deletion, archive RPCs that
  `service_role` owned) — server-only, never bundled to the client.

## Specification

### Acceptance criteria (PoC phase)

- [ ] All 74 migrations replay on vanilla Postgres behind a `neon_compat`
  shim (`auth` schema: `uid()`, `jwt()`, `users` table, `authenticated`,
  `anonymous`, `service_role`-equivalent roles) — zero edits that weaken
  RLS, grants or financial constraints.
- [ ] 52 pgTAP suites pass against the shimmed database.
- [ ] Tenant-isolation negative tests pass: user B cannot read/write user A
  rows through the Data-API-shaped path or the pg path.
- [ ] Financial invariants hold: integer đồng, transfer neutrality,
  idempotent RPC retries, optimistic concurrency, soft-delete/recovery.
- [ ] Archive export/restore round-trip passes on synthetic fixtures.
- [ ] Typed client seam compiles: `src/server/*` unchanged call sites talk
  through one provider adapter.
- [ ] Measured: representative request counts + payload sizes + compute
  estimate vs 5 GB egress / 100 CU-hr budget.

### Out of scope (PoC)

- Production Neon project creation, DNS, Vercel env changes.
- Real user data export from Supabase (owner approval gate).
- OAuth-server (`auth.oauth.*`) reimplementation — flagged for owner.
- ThunderFeed or any other project.

## Implementation plan

| T | Task | Evidence |
|---|---|---|
| T1 | `supabase/migrations-neon/` compat shim: `auth` schema + `uid()`/`jwt()` reading `request.jwt.claims`-equivalent GUC, `users` table, roles | migrations replay cleanly |
| T2 | pgTAP harness on vanilla Postgres (pg_prove or container) | 52 suites green |
| T3 | `src/lib/db/*` provider seam: single typed client factory; Supabase impl preserved, Neon impl added | typecheck + unit tests |
| T4 | auth adapter behind existing auth call sites | contract tests |
| T5 | delete-account Edge Function → server route (service-role-equivalent `pg`) | parity tests |
| T6 | measurement harness: request/egress/CU budget | numbers in PR |

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | `db/compat/supabase-auth-shim.sql` — roles, `auth` schema, `users`, `uid()`/`jwt()`/`email()` | none | 74/74 migrations replay | done |
| T2 | `scripts/neon-poc/replay-migrations.mjs` + `run-pgtap.mjs` on embedded-postgres 17 | T1 | harness green | done |
| T3 | pgTAP vendored install script (`db/compat/pgtap.sql`, license FreeBSD) in `extensions` schema | T2 | 52/52 suites pass | done |
| T4 | Typed client seam (`src/server/*` unchanged call sites → provider adapter) | T1 | PoC evidence open | pending |
| T5 | Auth adapter: Better Auth self-hosted vs Neon Managed — decide on uuid-ID + bcrypt-verify evidence | T4 | blocked on PoC | pending |
| T6 | delete-account Edge Function → server route via privileged `pg` | T4 | pending | pending |
| T7 | Egress/compute measurement vs Free budget | T2 | pending | pending |
| T8 | Owner decisions: OAuth consent layer, managed-vs-self-hosted auth, cutover runbook | all | gate | blocked |

## Evaluation

### Acceptance evidence (PoC so far)

| Criterion | Evidence | Result |
|---|---|---|
| Migrations replay on vanilla Postgres | `replay-migrations.mjs` — 74/74 OK on PG 17.10 behind the shim | pass |
| pgTAP suites on the shimmed database | `run-pgtap.mjs` — 52/52 files green incl. tenant isolation, security-definer contract, optimistic concurrency, archive restore | pass |
| No RLS/grant weakening | shim only adds Supabase-equivalent surface; suites verifying `anon`/RLS least privilege pass unchanged | pass |
| uuid↔text auth ID | unresolved — PoC shims `auth.users.id` as uuid; real Neon Auth decision still open | open |
| Egress budget | unmeasured | open |

### Remaining limitations

- PoC proves the SQL layer ports; it does not yet prove the request path
  (Data API JWT → role switching) or any auth flow against a real Neon project.
- `pgtap.sql` is a vendored build artifact — regenerate from pgTAP 1.3.3
  `sql/pgtap.sql.in` with `__OS__=Linux`, `__VERSION__=1.33` if upgraded.


## Handoff record

| Date | From | To | State | Artifacts | Next allowed action |
|---|---|---|---|---|---|
| 2026-10-08 | owner | researcher | discovery | issue #774, this packet, first reply comment | PoC on `feat/neon-migration-poc` branch only |

## Stop conditions

- Any production/provider write needed → STOP, request owner approval.
- Password-hash portability unproven → STOP, surface secure-reset plan.
- A Neon gap with no safe equivalent (e.g. OAuth server) → STOP, descope
  proposal to owner rather than silently dropping security surface.
