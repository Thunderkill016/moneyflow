# moneyflow

MoneyFlow mobile — Flutter client for the Neon backend.

## Build configuration (--dart-define)

Debug/profile builds default to the acceptance sandbox so `flutter run`
and `flutter test` work with no flags. **Release builds fail closed**:
`NeonConfig.fromEnvironment` throws at construction when the endpoint
defines are absent, so a shipped binary can never silently target the dev
sandbox.

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
| `MF_GOOGLE_SERVER_CLIENT_ID` | optional | Web OAuth client id that makes the "Đăng nhập bằng Google" button appear (empty → hidden). Needs an Android OAuth client for package `app.moneyflow.moneyflow` (SHA-1 of debug + upload keys) in the same Google Cloud project as Neon Auth's Google web client. |

## Getting Started

Standard Flutter flow: `flutter pub get`, `flutter run`, `flutter test`.
