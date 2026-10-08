# MoneyFlow → Neon Free migration

**Status:** implementing
**Execution state:** PoC evidence complete on real Neon; awaiting owner gate
**Active role:** implementer (PoC) → evaluator handoff pending
**Permission scope:** branch_write + provider_write_approved for ONE scratch
project `moneyflow-neon-poc` (polished-pine-75721729) — synthetic data only
**Owner:** agent (Devin) — issue #774 handoff
**Issue/PR:** #774 / draft PR #775
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

| Area                                                | Role                                 | Reuse/change/avoid                                     |
| --------------------------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| `src/lib/supabase/*`                                | client/config boundary               | change — becomes the provider seam                     |
| `src/server/*` loaders                              | all PostgREST/rpc reads              | reuse — unchanged if Data API parity holds             |
| `src/app/actions/*`                                 | writes via rpc                       | reuse — unchanged                                      |
| `src/components/auth-form.tsx` + `src/app/(auth)/*` | GoTrue flows                         | change — Better Auth API surface                       |
| `supabase/migrations/*`                             | schema + RLS + RPC                   | change — auth-schema shim, grants, `auth.uid()` compat |
| `supabase/functions/delete-account`                 | privileged delete                    | change — server route or Neon Function                 |
| `src/app/oauth/*` + `src/app/api/mcp`               | OAuth 2.1 server over `auth.oauth.*` | owner decision — no Neon equivalent                    |
| `.github/workflows/ci.yml`                          | `supabase db`/`test db`              | change — plain Postgres + pgTAP                        |
| `e2e/auth/supabase-double.mjs`                      | in-repo backend double               | change — or keep as the seam test-double               |

### Open questions — resolved on the real provider (2026-10-08)

- [x] **User-ID type: resolved.** Provisioned managed Neon Auth (Better Auth)
      generates **uuid** user IDs — `neon_auth."user".id` is `uuid`, and the
      native `auth.uid()` returns `uuid` parsing `sub`. Our `user_id uuid` model
      and FK semantics port without any type migration. The earlier "text" worry
      was doc-level (`auth.user_id()` returns text); the provisioned reality is
      uuid everywhere it matters.
- [x] **Claims GUC: resolved differently.** The Data API loads pg_session_jwt;
      `auth.jwt()` (jsonb) exists natively — `auth.jwt() ->> 'client_id'` keeps
      working for the MCP boundary without a `request.jwt.*` shim.
- [x] **Managed vs self-hosted auth: leaning managed.** Verified: managed
      auth emits uuid IDs, sign-up/sign-in/JWT flow works over REST
      (`POST /sign-up|sign-in/email`, `GET /get-session` → `Set-Auth-Jwt`), and
      the provisioning trigger pattern works on `neon_auth."user"`. Remaining
      managed-auth unknowns for cutover: password-hash import from Supabase
      (bcrypt verify), admin delete-user surface, OAuth providers config —
      owner decision recorded below.
- [ ] **`auth.oauth.*` consent layer (MCP writes):** still no Neon
      equivalent — owner decision needed (keep via self-hosted OAuth or descope
      MCP write-consent for the migration).
- [ ] **Egress budget:** measured on scratch only (~103 KB after full replay
  - request-path tests). MoneyFlow production traffic measurement still
    needed before cutover (5 GB/project/mo budget).

## Research

### Sources

| Source                                                   | Date       | What it establishes                                                                                                                                        | Limits                                     |
| -------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| neon.com/docs/introduction/plans + faqs/free-plan-limits | 2026-10-08 | Free: 100 CU-hrs/proj/mo, 1 GB storage, 5 GB egress, scale-to-zero 5 min, Better Auth ≤60k MAU, 6h restore                                                 | quotas can change; re-verify at cutover    |
| neon.com/docs/data-api/access-control                    | 2026-10-08 | Data API = PostgREST-compatible; JWT→`authenticated`/`anonymous`/custom role; `auth.user_id()` returns `sub` as **text**; GRANT + RLS enforced in Postgres | no `service_role`; no claim-GUC documented |
| neon.com/docs/data-api/custom-authentication-providers   | 2026-10-08 | Any JWKS provider accepted; `aud` check supported                                                                                                          | self-hosted auth must expose JWKS          |
| neon-vs-supabase-free-plan guide                         | 2026-10-08 | Feature-parity table incl. no managed Realtime                                                                                                             | marketing-adjacent; verify against docs    |

### Alternatives considered

| Option                                                                 | Advantages                                                                         | Risks                                                           | Decision                        |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------- |
| A. Neon Data API + Neon Managed Auth                                   | smallest delta; PostgREST parity                                                   | text IDs; admin API unknown; OAuth-server gap                   | **PoC first**                   |
| B. Neon Postgres + server-owned `pg` adapter + self-hosted Better Auth | full control (uuid IDs, bcrypt verify callback, admin ops); no Data API dependency | replaces 103 `.from()` sites behind a new seam; more code owned | fallback if A fails             |
| C. Neon Data API + third-party auth (Clerk/Auth0)                      | managed                                                                            | new provider, new cost, new data residency question             | rejected — adds a second vendor |

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

| T   | Task                                                                                                                                       | Evidence                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| T1  | `supabase/migrations-neon/` compat shim: `auth` schema + `uid()`/`jwt()` reading `request.jwt.claims`-equivalent GUC, `users` table, roles | migrations replay cleanly |
| T2  | pgTAP harness on vanilla Postgres (pg_prove or container)                                                                                  | 52 suites green           |
| T3  | `src/lib/db/*` provider seam: single typed client factory; Supabase impl preserved, Neon impl added                                        | typecheck + unit tests    |
| T4  | auth adapter behind existing auth call sites                                                                                               | contract tests            |
| T5  | delete-account Edge Function → server route (service-role-equivalent `pg`)                                                                 | parity tests              |
| T6  | measurement harness: request/egress/CU budget                                                                                              | numbers in PR             |

## Tasks

| ID  | Task                                                                                                                                  | Dependency | Evidence                      | Status  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------- | ------- |
| T1  | `db/compat/supabase-auth-shim.sql` — roles, `auth` schema, `users`, `uid()`/`jwt()`/`email()`                                         | none       | 80/80 migrations replay local | done    |
| T2  | `scripts/neon-poc/replay-migrations.mjs` + `run-pgtap.mjs` on embedded-postgres 17                                                    | T1         | harness green                 | done    |
| T3  | pgTAP vendored install script (`db/compat/pgtap.sql`, license FreeBSD) in `extensions` schema                                         | T2         | 58/58 suites pass             | done    |
| T4  | Real-Neon replay: `db/compat/neon-preflight.sql` + mechanical transform                                                               | T1         | 80/80 on Neon PG 18           | done    |
| T5  | Request-path proof on real Neon (JWT→Data API→role→RLS, A/B isolation, RPC write)                                                     | T4         | verified below                | done    |
| T6  | Typed client seam (`src/server/*` unchanged call sites → provider adapter)                                                            | T1         | pending                       | pending |
| T7  | Auth adapter: managed Neon Auth works (uuid IDs, trigger provisioning); bcrypt password-hash import + admin-delete surface still open | T5         | partial                       | pending |
| T8  | delete-account Edge Function → server route via privileged `pg`                                                                       | T6         | pending                       | pending |
| T9  | Egress/compute measurement vs Free budget (scratch measured ~103 KB / 277 compute-s)                                                  | T5         | scratch only                  | done    |
| T10 | Owner decisions: OAuth consent layer, managed-auth confirm, cutover runbook                                                           | all        | gate                          | blocked |

## Evaluation

### Real-provider evidence — Neon Free scratch `moneyflow-neon-poc`

(`polished-pine-75721729`, aws-ap-southeast-1, PG 18.6, org `ThunderK` Free)

All evidence below used synthetic users only; no production or real-user data.

| Proof                                                                                                                               | Result                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provision_neon_auth` (better_auth)                                                                                                 | JWKS + base URL issued; `neon_auth` schema mirrors `user/session/account/verification/jwks/organization/member/invitation` — **`user.id` is uuid**                                                        |
| `provision_neon_data_api` (neon_auth)                                                                                               | PostgREST endpoint live; roles `anonymous`/`authenticated` pre-created; `auth` schema pre-created with native pg_session_jwt `uid()→uuid`, `jwt()→jsonb`, `user_id()→text`, `session()`, `organization()` |
| Migration replay (`--remote`, mechanical transform)                                                                                 | **80/80 OK** on PG 18.6                                                                                                                                                                                   |
| Real request path: sign-up → `neon_auth."user"` insert → `on_auth_user_created` trigger fires → profile + "Tiền mặt" account seeded | verified — profile full_name read from `new.name` correctly ("PoC User B")                                                                                                                                |
| `POST /sign-in/email` → `GET /get-session` → `Set-Auth-Jwt` header                                                                  | Ed25519 JWT, `sub`=uuid, `role`=`authenticated`, aud/iss = neonauth URL                                                                                                                                   |
| `GET /profiles`, `GET /accounts` with JWT-A                                                                                         | own rows only                                                                                                                                                                                             |
| Same with JWT-B                                                                                                                     | sees ONLY B's rows — A's account/profile invisible                                                                                                                                                        |
| No JWT / garbage JWT                                                                                                                | rejected (`missing authentication credentials` / `not a valid JWT encoding`)                                                                                                                              |
| `POST /rpc/create_financial_account` (JWT-A) + `POST /rpc/create_money_transaction` (JWT-A)                                         | security-definer RPCs execute; rows visible only to A; B's `financial_transactions` = `[]`                                                                                                                |
| Consumption after full replay + tests                                                                                               | ~103 KB data transfer, ~277 s compute, storage ~38 MB — trivially inside 5 GB / 100 CU-hr                                                                                                                 |

### Mechanical transform required for the Neon target

15 of 80 migration files needed rewrites — all captured in
`replay-migrations.mjs transformForNeon()`:

| From                                          | To                      | Files | Why                                                                                                        |
| --------------------------------------------- | ----------------------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| `auth.users`                                  | `neon_auth."user"`      | 15    | `auth` schema is provider-owned (cloud_admin); the managed mirror table is the FK target — uuid PK matches |
| `X.raw_user_meta_data ->> 'full_name'/'name'` | `X.name`                | 3     | Better Auth user row has `name`/`email`, no metadata jsonb                                                 |
| `alter default privileges for role postgres`  | `for role neondb_owner` | 2     | migration-runner role differs; identical hardening semantics                                               |

Plus the preflight (`db/compat/neon-preflight.sql`): `anon` + `service_role`
roles, `grant anon to anonymous`, `extensions`+pgcrypto, `supabase_migrations`
bookkeeping. Zero grants or policies weakened.

### Constraints discovered on real Neon

- `auth` schema: **read-only to us** — no `auth.users`, no `auth.email()` can
  be created there; use `neon_auth."user"` + `auth.jwt() ->> 'email'`.
- `neondb_owner` cannot `set role`/`grant` `authenticated` — pgTAP-style
  impersonation is impossible on the real project; request-path RLS must be
  verified through JWTs (done) instead.
- `suspend_timeout_seconds` is provider-fixed on Free (cannot set 300 s;
  observed `0` = default scale-to-zero).
- `pg_session_jwt` + the `auth` schema are **owned by neondb_owner yet
  managed** — `drop owned`/`drop schema public cascade` destroys them; the
  reset script drops public objects surgically instead, and re-provisioning
  the Data API is the recovery path.
- Data API `db_anon_role` is `anonymous` — our `anon` grants reach it via
  `grant anon to anonymous` (verified: anonymous requests get rejected before
  reaching data because the API requires a Bearer JWT anyway).

### Acceptance evidence (local harness)

| Criterion                             | Evidence                                                                    | Result |
| ------------------------------------- | --------------------------------------------------------------------------- | ------ |
| Migrations replay on vanilla Postgres | 80/80 on PG 17.10 behind the shim                                           | pass   |
| pgTAP suites on the shimmed database  | 58/58 files green, fail-closed scanner (plan + nonzero assertions enforced) | pass   |
| No RLS/grant weakening                | shim/preflight only add provider-equivalent surface                         | pass   |

### Remaining limitations

- Real-Neon proof covered replay + request path with synthetic users; the
  **app code path** (`src/lib/supabase/*` → Better Auth + postgrest-js seam)
  is not implemented yet (T6).
- Password-hash portability (Supabase bcrypt → Neon Auth) unverified — needs
  an import mechanism test or a documented reset-password cutover plan.
- `auth.oauth.*` MCP consent has no Neon equivalent — owner decision.
- `pgtap.sql` is a vendored build artifact — regenerate from pgTAP 1.3.3
  `sql/pgtap.sql.in` with `__OS__=Linux`, `__VERSION__=1.33` if upgraded.
- Egress measured on synthetic traffic only; production egress estimate
  pending (T9 scratch numbers above).

## Handoff record

| Date       | From  | To          | State                                      | Artifacts                                                                 | Next allowed action                                                                              |
| ---------- | ----- | ----------- | ------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 2026-10-08 | owner | researcher  | discovery                                  | issue #774, this packet, first reply comment                              | PoC on `feat/neon-migration-poc` branch only                                                     |
| 2026-10-08 | owner | implementer | `provider_write_approved` for scratch only | owner comment: one Neon Free project `moneyflow-neon-poc`, synthetic data | real-provider PoC + evidence report; still no production/production-data/provider-config changes |

## Stop conditions

- Any production/provider write needed → STOP, request owner approval.
- Password-hash portability unproven → STOP, surface secure-reset plan.
- A Neon gap with no safe equivalent (e.g. OAuth server) → STOP, descope
  proposal to owner rather than silently dropping security surface.
