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

| ID  | Task                                                                                                                                     | Dependency | Evidence                      | Status  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------- | ------- |
| T1  | `db/compat/supabase-auth-shim.sql` — roles, `auth` schema, `users`, `uid()`/`jwt()`/`email()`                                            | none       | 80/80 migrations replay local | done    |
| T2  | `scripts/neon-poc/replay-migrations.mjs` + `run-pgtap.mjs` on embedded-postgres 17                                                       | T1         | harness green                 | done    |
| T3  | pgTAP vendored install script (`db/compat/pgtap.sql`, license FreeBSD) in `extensions` schema                                            | T2         | 58/58 suites pass             | done    |
| T4  | Real-Neon replay: `db/compat/neon-preflight.sql` + mechanical transform                                                                  | T1         | 80/80 on Neon PG 18           | done    |
| T5  | Request-path proof on real Neon (JWT→Data API→role→RLS, A/B isolation, RPC write)                                                        | T4         | verified below                | done    |
| T6  | Typed client seam (`src/server/*` unchanged call sites → provider adapter)                                                               | T1         | 14/14 vertical slice          | done    |
| T7  | Auth adapter: managed Neon Auth works (uuid IDs, trigger provisioning); bcrypt import **disproven** — reset/lazy-rehash cutover required | T5         | Gate-5 evidence               | done    |
| T8  | delete-account Edge Function → server route via privileged `pg`                                                                          | T6         | pending                       | pending |
| T11 | Backup/restore + write-freeze rehearsal on scratch                                                                                       | T4         | Gate-4 evidence               | done    |
| T12 | Identity-import / password / OAuth / scoped-token parity assessment                                                                      | T5         | Gate-5 evidence               | done    |
| T9  | Egress/compute measurement vs Free budget (scratch measured ~103 KB / 277 compute-s)                                                     | T5         | scratch only                  | done    |
| T10 | Owner decisions: OAuth consent layer, managed-auth confirm, cutover runbook                                                              | all        | gate                          | blocked |

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

### Gate-4 evidence — backup/restore rehearsal (`scripts/neon-poc/backup-rehearsal.mjs`)

All steps ran live on `moneyflow-neon-poc` at head `ca7f6379`, synthetic data:

| Step                  | Result                                                                                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--dry-run` inventory | 23 user tables, 0 FK violations, sha256 PK checksums emitted                                                                                                                                                                                                                                           |
| `--backup`            | JSON archive → AES-256-GCM envelope identical to `backup-encryption.ts` (PBKDF2-SHA-256 250k iters, 12-byte IV); wrong-pass + tamper negatives verified in-step                                                                                                                                        |
| `--restore`           | fresh scratch db `mf_poc` (allowlisted) → managed-surface stubs (`neon_auth."user"`, compile-only `auth.uid()/jwt()`) → **80/80 generated migrations** → FK-topo-ordered inserts under `set constraints all deferred` + `disable trigger user` → **all 23 table checksums identical, 0 FK violations** |
| `--freeze-rehearsal`  | `revoke … from authenticated` → insert denied, select preserved → re-grant rolled back — proves the cutover write-freeze mechanism                                                                                                                                                                     |
| `--cleanup`           | scratch db dropped; every mutating step gated by `--i-understand-destructive` + `verifyTarget()` allowlist                                                                                                                                                                                             |

Neon-specific restore constraints found: `session_replication_role` is
superuser-denied and `disable trigger all` needs superuser on constraint
triggers — owner-scope `disable trigger user` is the correct equivalent (it
suppresses `on_auth_user_created` provisioning and `set_updated_at` rewrites
that would otherwise corrupt checksums; FK enforcement stays live).

### Gate-5 evidence — identity, password, OAuth, scoped-token parity

Tested live against the provisioned managed auth on the scratch project:

| Question                                                                               | Result                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can `neon_auth."user"` accept a **pre-chosen UUID** (Supabase `auth.users.id`)?        | **YES** — direct insert with chosen uuid → `sign-in/email` returns 200 with a Better-Auth scrypt `account.password`; wrong password → 401. Identity/UUID preservation via table-level import works                                                                                                          |
| Can Supabase `encrypted_password` (bcrypt `$2a$`) be imported into `account.password`? | **NO** — real pgcrypto-generated `$2a$06$…` hash → sign-in 500. Better-Auth verifier only understands its scrypt format. Cutover requires forced email-reset or lazy re-hash (app verifies bcrypt once, writes scrypt into `account.password`) — documented strategy, no silent weak import                 |
| Google OAuth parity                                                                    | **YES** — `POST /sign-in/social {provider:"google"}` → 302 to real Google `accounts.google.com` (client_id, PKCE S256, hosted callback `neonauth.*/auth/oauth/callback/google`). GitHub disabled. MoneyFlow's `signInWithGoogle` maps to SDK `signIn.social`                                                |
| Scoped/OAuth-server tokens for MCP clients (`auth.jwt()->>'client_id'`)                | **NO equivalent** — managed Neon Auth issues session JWTs without `client_id`; `guard_oauth_mutation()` compiles and replays but the restricted-client branch can never trigger. Third-party agent transport would run at full user privilege unless a separate scoped-token layer is built — descope/defer |
| Session invalidation                                                                   | proven in Gate 3: upstream `/sign-out` → protected routes redirect (14/14 vertical slice)                                                                                                                                                                                                                   |

### Review round-1 findings and resolution (owner review 2026-10-08)

| Finding                                                                                                                                      | Severity | Resolution                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `login()` created the data client before the Neon branch — logged-out users (no JWT) hit `configurationError`                                | P0       | Neon sign-in resolves via `getNeonAuth()` alone; Supabase client only inside its branch. Slice adds wrong-password + fresh-context login-after-logout → 16/16            |
| `npm ci` fails under Node 22/npm 10 — lockfile missing nested peer entries (`ajv@8.20.0`, `ajv-formats@2.1.1`, `json-schema-traverse@1.0.0`) | P0       | lockfile regenerated with npm 10 (CI toolchain); clean `npm ci` verified                                                                                                 |
| PK-only `pk_sha256` cannot detect value corruption                                                                                           | P1       | canonical full-row `content_sha256` (UTC-pinned, PK-independent) + cross-tenant ownership invariants + in-run mutation-negative (+1 `amount_minor`, PK intact → flagged) |
| PR-775 memory record missing literal `Changed/Verified/Remaining` markers                                                                    | P0       | record rewritten to contract                                                                                                                                             |

Sibling auth actions audited per review: `signInWithGoogle` → managed
`signIn.social` branch (reauth fails closed); `requestPasswordReset` /
`updatePassword` → Better-Auth reset endpoints with `?token=` plumbing;
`finalizeAccountDeletion` → honest fail-closed (Supabase-only).

### Scoped-token design note (OAuth/MCP boundary — owner direction: keep the capability)

Neon managed JWTs carry no `client_id`, so the provider cannot mint
third-party scoped tokens. The boundary therefore moves into MoneyFlow:

1. **App-level grant registry** — a `public.oauth_client_grants` table
   (user_id, client_id, scopes, status, issued/revoked timestamps) owned
   by us, migrated like any app table. Consent UX records a grant; only
   rows in `approved` state authorize.
2. **MoneyFlow-issued agent tokens** — PAT-style opaque tokens we mint,
   hash-store, and scope to a grant. The app's bearer boundary resolves
   `token → grant → {user_id, client_id, scopes}` itself rather than
   trusting provider JWT claims.
3. **`guard_oauth_mutation()` stays the enforcement shape** — but reads
   `client_id` from a request GUC our API layer sets (`set_config`)
   instead of `auth.jwt()`, so restricted clients still cannot mutate
   beyond `pending` inbox proposals.
4. Regular Neon session JWTs keep user-level scope; they are never
   treated as OAuth clients because they carry no grant record.

Status: **design only** — implementation is its own scoped task, and the
capability stays a cutover blocker until built and tested.

### Managed-auth import limitation (review round-1)

Direct `insert` into `neon_auth."user"`/`account` preserved chosen UUIDs
and authenticated in the PoC, but these are **provider-managed internals**
— Neon's documented import path may differ and internals can change under
us. Marked as an auth-import cutover blocker: verify the official import
mechanism (or the reset-only path) before any real-user migration. The
backup rehearsal likewise excludes `neon_auth.account/session/
verification` — credential state recovery is unproven by design.

### Round-3 evidence — official import pathway + hardened enumeration test

**Official Neon documentation resolves the import question:**
`docs/auth/migrate/from-supabase` states managed Better Auth **cannot import
Supabase password hashes** — password users must create new accounts or
re-authenticate via OAuth. The only documented bulk-import path
(`guides/complete-supabase-migration`) is **legacy Stack Auth**, which
accepted `password_hash` but is closed to new projects — and even that path
reassigned user_ids, requiring a remap step. Neon Dec-2025 launch notes the
managed server is **not a drop-in self-hosted Better Auth** (no custom
plugins/handlers), so upstream Better Auth docs do not guarantee managed
functionality.

Two reconciliation strategies, now separated:

| Plan                                     | Mechanism                                                                                                                                  | Status                                                                                                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — UUID preservation**                | Direct insert into `neon_auth."user"` with the legacy UUID + forced reset                                                                  | Proven working synthetically (reset-e2e 9/9), but writes into **provider-managed internals** — no documented support; provider lifecycle could break it. Not usable for real cutover without explicit Neon confirmation.                                   |
| **B — subject remap (official pattern)** | User onboards via real sign-up/OAuth → provider assigns a fresh UUID → restore remaps `user_id` at INSERT time via a pre-built cutover map | **Proven end-to-end** (`identity-remap-e2e.mjs`, 5/5): real sign-up → fresh UUID → remapped row visible under that subject through the Data API + RLS → second subject sees zero rows. No auth-internals writes. Matches Neon's documented remap guidance. |

**Plan B is the recommended cutover path.** It requires the cutover map
(`legacy_uuid → neon_uuid`) captured per-user at onboarding, before data
restore — and honest UX (existing users re-register or OAuth, then their
history appears remapped). Plan A stays documented as a working-but-
unsupported fallback.

**Enumeration test hardened** (`reset-e2e.mjs` round-3, 9/9): response-pair
comparison now asserts identical status+body+headers for existing-vs-missing
emails (with a vacuous-pass guard requiring 200s, since identical 429s prove
nothing), plus a symmetric rate-limit burst — the managed limiter is a
**shared bucket** (both addresses interleaved 200/429), so it can't leak
existence. Burst moved last so it can't starve token steps, and
request-steps retry once inside the rate-limit window.

**Managed-auth config observed** (`neon_auth.project_config`):
`email_provider.type=shared` (Neon shared sender — actual mailbox delivery
unverifiable from the DB; needs a controlled synthetic inbox + owner
approval), `social_providers=[{google, isShared:true}]` (shared OAuth app —
Google subject-binding proof requires a dedicated client config),
`trusted_origins=[]`, `allow_localhost=true`,
`requireEmailVerification=false`, `emailVerificationMethod=otp`.

### Round-4 evidence — claim ceremony + full-data remap rehearsal

**Ordering resolved by schema fact:** the owner FKs are composite
`(id, user_id)` pairs and **not deferrable**, so `user_id` cannot be updated
in place — either side of the pair would dangle mid-statement. Therefore
**claim-before-restore is required, not optional**: unclaimed legacy rows
never land in the database; a claimed user's rows are INSERTed already keyed
to the Neon UUID inside the claim transaction. Pre-import-and-claim would
need deferrable-FK schema changes (or owner-level trigger suppression the
service role cannot perform) — rejected.

**Claim ceremony** (`claim-ceremony.sql` + `claim-ceremony-e2e.mjs`, now
18/18 after round-5 hardening — see below):
`public.identity_claims` — `legacy_user_id` and `neon_user_id` unique in both
directions, single-use `claim_token_hash` (raw secret never rests), proof
hash, idempotency key, short TTL, status machine, audit jsonb. Two
SECURITY DEFINER RPCs (`reserve`/`complete`) executable by **service_role
only** — authenticated/anon get permission denied; a client can never forge
the ceremony path. Verified negatives: unverified-email gate, unknown/forged
token, expired reservation, cross-subject replay, same-subject idempotent
replay, one-subject-one-legacy, conflicting re-reserve, RLS sees only
post-claim rows, and the legacy uuid itself holds nothing afterward.

Old-identity proof is an injectable boundary: production verifies a Supabase
JWT **offline** via cached JWKS (signature+iss+aud+exp+sub — feasible: the
project currently returns 402 on JWKS, meaning live revocation checks are
the gated part). Round 5 replaced the HMAC stand-in with real Ed25519 JWT
verification (`jose`) — see the round-5 section.

**Full-data remap rehearsal** (`backup-rehearsal.mjs --remap-rehearsal`):
the real 41-owner / 653-row scratch dataset remapped to 41 fresh uuids:

- Owner-column discovery = FK catalog **plus a value sweep** — the sweep
  caught `financial_mutation_audit_events.actor_user_id`, a nullable
  FK-less owner reference bound only by `CHECK actor_user_id = user_id`.
  An information_schema-only approach silently drops cross-schema FKs.
- Per-table canonical multiset equality between map-substituted source rows
  and restored rows; **0 legacy uuids** in owner columns AND in a serialized
  whole-row scan (embedded jsonb/provenance references included).
- Per-owner `sum(amount_minor)` totals preserved exactly.
- Encrypted bijective mapping manifest (uuids only, no PII).
- Negatives: an unmapped/unclaimed owner trips `23503` and rolls back with
  zero committed rows; a clean rerun reproduces identical multisets —
  retry-after-abort is deterministic.

**Test hygiene corrections applied** (round-4 review): `identity-remap-e2e`
now uses the sign-in response cookie for `/get-session`, cleans up BOTH
synthetic subjects, and its cleanup deletes into `neon_auth.*` are annotated
as scratch-only teardown rather than claimed as zero-writes.

**Supabase liveness (read-only probe):** `auth/v1/.well-known/jwks.json`
returns 402, `/health` 401 — the project endpoint is alive but gated
(paused/free-tier behavior). Old-session signature verification is still
feasible offline from cached JWKS; revocation/recent-auth needs liveness.

**Real-target note:** the claim-driven per-user restore must suppress the
managed provisioning trigger for the inserting transaction (same
`disable trigger user` mechanism as the rehearsal) or seeded default
categories collide with restored unique keys — and dedupe semantics need a
decision where a user's restored seed rows overlap provisioned defaults.

### Round-5 evidence — real JWT proof, session-bound completion, atomic claim+restore

Review fixes verified on scratch (`claim-ceremony-e2e.mjs` 18/18):

- **Real cryptographic old-identity proof** — `jose` Ed25519 verification
  (signature + iss + aud + exp + sub) replacing the HMAC stand-in. Forgery
  negatives: wrong key, wrong issuer, expired token, subject mismatch — all
  rejected before reserve. Honest boundary: test JWKS proves the _mechanism_;
  live Supabase liveness (revocation, recent-auth) stays gated (402/401 probe).
- **Session-bound completion** — `complete_identity_claim(token_hash,
session_token)` derives the Neon subject from a live `neon_auth.session`
  row; caller-supplied UUIDs are impossible. Negatives: forged/expired/missing
  session tokens denied (P0004), completed-token replay by a different session
  rejected (23505), impostor-session denied, same-session replay idempotent.
- **Atomic claim + restore** — single transaction: token validation, session
  subject derivation, claim state transition, remapped-row inserts. Proven
  negative: a mid-insert failure leaves the claim `reserved` (not completed)
  with zero rows — safe retry reproduces the clean result.
- **In-DB email-verified gate** — `complete()` refuses unverified destination
  subjects inside the trusted SQL boundary (not a caller-supplied flag).
- **Collision + unclaimed coverage** — unclaimed legacy data never exists to
  leak (0 rows); a Neon subject's self-created rows coexist with claimed rows
  under one uuid (merge, not overwrite); one subject cannot bind two legacies.

**Recursive JSONB canonicalization** (`backup-rehearsal.mjs`): the old
`canonRow` used `JSON.stringify` with a key-array replacer — which applied the
top-level key allowlist to nested objects and silently DROPPED jsonb sub-keys.
Replaced with recursive canonicalization (keys sorted at every depth, arrays
keep order). Self-test proves key-order tolerance + nested-mutation detection;
a LIVE negative mutates a nested path in the restored db
(`import_batches.column_map{extra,0}`) and the multiset comparison catches it.
Owner remap is now deep — uuid-equality policy applied recursively (any string
equal to a legacy owner id remaps, embedded or not), and every money-shaped
column is asserted `Number.isSafeInteger` on both sides — no float drift.
Rehearsal re-run: 654 rows / 23 tables, multisets equal, 0 legacy uuids.

**Provider email-verification, honestly bounded:** managed auth exposes a real
OTP verification flow — `send-verification-email` creates
`email-verification-otp-<email>` rows and `/email-otp/verify-email` consumes
them — BUT the stored value is an OTP hash; plaintext travels only via the
shared sender (`email_provider.type=shared`). Without a controlled mailbox the
loop cannot be closed in scratch: tests set `emailVerified` directly (marked
as stand-in, not claimed as provider proof) and the gate semantics — fail
closed for unverified subjects — are what the tests verify.

**Managed-auth OTP finding (new):** verification rows use identifier
`email-verification-otp-<email>` — distinct from `reset-password:<token>`
rows. Any claim/reset tooling must not conflate identifier namespaces.

**Still blocked (unchanged):** real-mail delivery verification, Google OAuth
subject binding, production liveness of the Supabase project, owner decisions
on password strategy/scoped tokens/real-data export. Plan B remains a
candidate direction, NOT production approval.

### Round-2 evidence — forced-reset cutover journey (`scripts/neon-poc/reset-e2e.mjs`)

9/9 live on the scratch project (round-3 rerun), synthetic user with a
pre-chosen UUID:

| Step                                      | Result                                                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `request-password-reset` on imported user | `reset-password:<token>` row bound to the user's **uuid** in `neon_auth.verification`                                       |
| Existing-vs-missing email                 | identical status+body+headers pair; symmetric shared-bucket rate limit under burst — no enumeration                         |
| Garbage / expired / consumed token        | 400 each (expired tested on a fresh row, consume-verified)                                                                  |
| Valid token reset                         | password changed; **zero sessions auto-created** — reset does not sign in (app now redirects to `/login?reset=success`)     |
| Post-reset sign-in                        | old password rejected; new password → session binds the **same uuid**; ledger rows still owned by it                        |
| App-path slice                            | `vertical-slice.mjs` drives forgot-form → update-password → `/login?reset=success` → re-login → own data intact (**17/17**) |

Identity-cutover strategy (round-4 state): **Plan B (subject remap +
claim ceremony) is the recommended candidate** — a technical direction,
not production authorization. Forced reset is only needed if Plan A
(unsupported direct insert) is ever chosen; under Plan B fresh sign-up
sets its own password and the claim ceremony binds identity. Open before
any real user: verified old-identity proof path (Supabase 402-gated —
offline JWKS feasible), real mail delivery via the shared sender,
shared-Google-client subject binding, and provisioning-trigger dedupe at
claim-restore time.

### Remaining limitations

- Password-hash portability resolved as **no** (officially documented):
  bcrypt cannot be imported into managed auth. The supported cutover is
  Plan B subject-remap (proven 5/5); Plan A direct-insert works but writes
  into provider internals.
- Managed-auth mail delivery unverified: `email_provider.type=shared`;
  token was read from the scratch DB. Needs a controlled synthetic inbox +
  owner approval; do not claim reset-mail readiness.
- Google OAuth on `isShared:true` provider config: initiation proven;
  subject binding, account collision and dedicated-client behaviour all
  unproven — requires dedicated OAuth client config (owner/provider setup).
- Scoped/OAuth-server tokens have no Neon equivalent — agent/MCP transport
  with `client_id`-scoped privileges cannot be reproduced; requires descope
  or a separate token layer.
- `auth.oauth.*` MCP consent has no Neon equivalent — owner decision.
- Backup/restore rehearsal restored to a same-project scratch database; a
  real cutover would additionally need Supabase-side export (owner approval)
  and the password cutover above.
- `pgtap.sql` is a vendored build artifact — regenerate from pgTAP 1.3.3
  `sql/pgtap.sql.in` with `__OS__=Linux`, `__VERSION__=1.33` if upgraded.
- Egress measured on synthetic traffic only; production egress estimate
  pending (T9 scratch numbers above).

## Handoff record

| Date       | From        | To          | State                                                                         | Artifacts                                                                                | Next allowed action                                                                                                                             |
| ---------- | ----------- | ----------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-08 | owner       | researcher  | discovery                                                                     | issue #774, this packet, first reply comment                                             | PoC on `feat/neon-migration-poc` branch only                                                                                                    |
| 2026-10-08 | owner       | implementer | `provider_write_approved` for scratch only                                    | owner comment: one Neon Free project `moneyflow-neon-poc`, synthetic data                | real-provider PoC + evidence report; still no production/production-data/provider-config changes                                                |
| 2026-10-08 | implementer | owner       | gates 1–5 complete on scratch                                                 | 2798ccf7, ca7f6379, 6d7c91bb; backup/restore + identity/password/OAuth evidence above    | owner review: password-cutover strategy choice + scoped-token descope decision; no merge                                                        |
| 2026-10-08 | implementer | owner       | round-3: official import-path finding + remap proof                           | reset-e2e 9/9 (hardened enumeration + burst), identity-remap 5/5, Plan A vs B documented | owner decision: Plan B cutover shape vs Plan A unsupported internals; email-delivery verification needs a controlled inbox                      |
| 2026-10-08 | implementer | owner       | round-5: real-JWT proof, session-bound atomic claim+restore, deep JSONB canon | claim-e2e 18/18, remap 654r/23t + nested-jsonb negative, money-int assertions            | owner decision: none of this is production authorization — blockers: mailbox-controlled email verify, Google subject binding, Supabase liveness |

## Stop conditions

- Any production/provider write needed → STOP, request owner approval.
- Password-hash portability unproven → STOP, surface secure-reset plan.
- A Neon gap with no safe equivalent (e.g. OAuth server) → STOP, descope
  proposal to owner rather than silently dropping security surface.
