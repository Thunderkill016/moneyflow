---
description: Use before opening or merging any PR on the MoneyFlow mobile app, or before claiming a mobile change is done.
---

# Verification order (run all; never claim a gate you didn't run)

1. `cd mobile && dart format lib test` — formatter owns whitespace.
2. `cd mobile && flutter analyze` — must be clean.
3. `cd mobile && flutter test` — all green; a red test is a finding, never delete/weaken one.
4. DB changes: `node supabase/tests/run-pgtap.mjs` (embedded Postgres 17) + `npm run check:migrations` + `npm run check:rls` from repo root.
5. UI changes: `flutter build apk --debug` then install on device (`adb install -r build/app/outputs/flutter-apk/app-debug.apk`) and walk the flow.
6. Release check when asked: `flutter build appbundle --release` (needs the `--dart-define` endpoints from mobile/README.md; local debug fallback via `-PmfAllowDebugRelease=true`).

Evidence standard: "done" = code changed + test/build proof + FIXLOG.md entry. A build does not prove RLS, device behavior, or production state.
