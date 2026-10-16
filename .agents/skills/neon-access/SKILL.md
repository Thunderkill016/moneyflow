---
description: Use when working on the MoneyFlow mobile app's backend, Neon, database, auth, or network code (mobile/lib/data/neon/).
---

# Neon access pattern (enforced, do not relax)

- Mobile talks to Neon ONLY via Neon Data API + Neon Auth + RLS over HTTPS. Never a connection string or credential in the bundle.
- Endpoints arrive via `--dart-define` (`MF_AUTH_BASE_URL`, `MF_DATA_API_URL`, `MF_GOOGLE_SERVER_CLIENT_ID`). Dev defaults currently point at moneyflow-prod (the only project — an unqualified debug run writes production data; see mobile/README.md).
- Release builds fail closed: `NeonConfig.fromEnvironment` throws when defines are absent; only `*.neon.tech` HTTPS endpoints accepted (`_requireTrustedEndpoint`).
- Auth: JWT Bearer. RLS enforces `user_id = auth.uid()`. HTTP is stateless — no connection-pooling issues client-side.
- Auth material never reaches logs: `neon_auth_session_verifier` (loopback callback query) must never be printed — `debugPrint` compiles into release logcat. Log paths/status only; redact queries (see `_redactedError` in google_sign_in.dart).
- Data API schema cache: a newly deployed function returns PGRST202 until the cache refreshes — refresh via Neon `PATCH /data-api` (NOT `NOTIFY pgrst`, the managed proxy doesn't listen on it).
- Migrations: write both `supabase/migrations/<ts>_<name>.sql` and the generated `db/neon/migrations/` twin; run the pgTAP harness (`run-pgtap.mjs`) before claiming DB changes work. Never apply to production Neon without owner approval.
- RLS: owned tables get select-only for `authenticated` + `guard_oauth_mutation` trigger; all writes go through SECURITY DEFINER RPCs (register them in `security_definer_contract.test.sql`).
