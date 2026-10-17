# mobile/AGENTS.md — MoneyFlow Android (Flutter)

## Stack

Flutter app. `lib/data` (Neon Data API client, stores, parsers), `lib/domain` (pure logic, no Flutter), `lib/features` (screens). All Vietnamese UI. Repo-level conventions in ../AGENTS.md apply (integer đồng, RLS, soft-delete, no float money).

## Build / test

```bash
cd mobile
flutter pub get
flutter analyze          # must be clean
flutter test             # all green
flutter run              # debug — writes to the dev-default Neon project (prod today, see README.md)
flutter build apk --debug
flutter build appbundle --release   # needs --dart-define endpoints, see README.md
```

DB/migration work: twin files in `../supabase/migrations/` + `../db/neon/migrations/`, verify via `node ../supabase/tests/run-pgtap.mjs`, `npm run check:migrations && npm run check:rls` (repo root).

## Standing rules

Skills live in `../.agents/skills/` — read `money-rules`, `neon-access`, `design-system`, `vietnam-constraints`, `test-before-pr` before touching matching code. Money invariants, the Neon-HTTPS-only pattern, Fresh Blue theme, and the no-READ_SMS constraint are inviolable.

State files at repo root: `plan.md`, `findings.md`, `progress.md`, `PROGRESS.md`, `AUDIT.md`, `FIXLOG.md`, `DECISIONS.md`, `RESEARCH_TOP_FINANCE_APPS.md`.
