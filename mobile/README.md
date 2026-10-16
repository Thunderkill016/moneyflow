# moneyflow

MoneyFlow mobile — Flutter client for the Neon backend.

## Build configuration (--dart-define)

Debug/profile builds default to **moneyflow-prod** — the only Neon
project that exists today — so `flutter run` and `flutter test` work
with no flags. Be honest about what that means: an unqualified debug
run reads and writes the **production** database, and a debug-signed-in
test account's activity lands in the real ledger. To keep development
data out of production, pass `--dart-define` overrides pointing at a
sandbox Neon project (none is provisioned yet — create one first; a
non-`*.neon.tech` or non-HTTPS value is rejected at construction).

**Release builds fail closed**: `NeonConfig.fromEnvironment` throws at
construction when the endpoint defines are absent, so a shipped binary
can never silently depend on whatever the compiled-in dev defaults
happen to point at.

Release builds must pass:

```sh
flutter build apk --release \
  --dart-define=MF_AUTH_BASE_URL=https://<prod-auth-host>/neondb/auth \
  --dart-define=MF_DATA_API_URL=https://<prod-data-api-host>/neondb/rest/v1
```

All build-time defines:

| Define | Required | Meaning |
| --- | --- | --- |
| `MF_AUTH_BASE_URL` | release | Better Auth service base URL (Neon Auth). |
| `MF_DATA_API_URL` | release | Neon Data API (PostgREST) base URL. |
| `MF_ARCHIVE_BACKUP` | optional | `true` enables JSON archive export — off by default until the backend RPC is callable (see `lib/app/app.dart`). |
| `MF_NOTIFICATION_DRAFT_SUBMIT` | optional | `true` enables the notification-capture draft submit path — off until `create_inbox_candidates` is applied upstream (see `lib/data/notification_capture/`). |
| `MF_GOOGLE_SERVER_CLIENT_ID` | optional | Web OAuth client id for the **native** Google sheet — requires an Android OAuth client for `app.moneyflow.moneyflow` + the signing SHA-1 in the same Google Cloud project, wired into Neon Auth as a non-shared Google provider. Empty → loopback only. |

Google sign-in is a hybrid (`lib/data/google_sign_in.dart`): with the
client-id define set it tries the native Credential Manager sheet first
and falls back to a browser loopback redirect on any failure; without
it, the loopback runs against Neon Auth's configured Google provider
directly. The button shows whenever the auth backend is configured.
NOTE: Neon managed auth currently ignores the idToken on
/sign-in/social — the native leg cannot complete upstream, so keep
`MF_GOOGLE_SERVER_CLIENT_ID` unset until Neon enables it.

## Getting Started

Standard Flutter flow: `flutter pub get`, `flutter run`, `flutter test`.
