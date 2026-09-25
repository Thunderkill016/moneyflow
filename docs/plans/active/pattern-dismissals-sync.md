# Server-persisted advisory dismissals (`pattern_dismissals`)

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer (owner delegated: "toàn quyền làm việc merge
xử lý mọi vấn đề trong dự án này … ko cần hỏi ý kiến")
**Permission scope:** branch_write + merge (owner-granted this session)
**Owner:** agent (Devin)
**Issue/PR:** #720; owner-reported defect 2026-09-25
**Last updated:** 2026-09-25

## Repository reconnaissance

- Owner report: dismissed the duplicate-advisory strip on the phone, the
  same banner stayed visible on desktop.
- Root cause: `dismissLedgerDupePatterns` / `dismissRecurringPattern` write
  `localStorage` — device-local by construction
  (`src/lib/ledger-duplicate-dismissals.ts`,
  `src/lib/recurring-dismissals.ts`).
- Pattern keys are deterministic fnv1a hashes of the bucket
  (`account|kind|amount|normalized desc` for ledger dupes via
  `findLedgerDuplicateGroups`; `expense|note` for recurring suggestions), so
  identical ledger data produces identical keys on every device — persisting
  the key is sufficient to share the decision.
- Repo convention for user-owned writes: RLS-protected table with no open
  DML, mutations through security-definer RPCs (`search_path = ''`,
  `auth.uid()`-derived identity). This slice follows that boundary exactly.
- `purge_user_tenant_data` enumerates tables explicitly and the archive
  inventory must match it — anchoring the new table's FK on
  `public.profiles(id) ON DELETE CASCADE` removes rows with the profile on
  both purge and auth-user delete, without touching either contract.

## Design decisions

- **UI preference, not ledger truth**: `pattern_dismissals` is deliberately
  absent from the backup archive inventory, export RPC and restore RPC —
  deleting a row only re-surfaces a suggestion. Shipping it in the archive
  would force contract changes for zero recovery value.
- **Scope whitelist**: `scope` CHECK + RPC validation share the list
  `('ledger_dupe', 'recurring')` — adding a dismissal domain is a deliberate
  migration, never a caller-supplied string. Mirrored in
  `src/lib/pattern-dismissals.ts` (`DISMISSAL_SCOPES`) with a drift test.
- **Idempotent write**: `ON CONFLICT DO NOTHING` — a second device
  re-dismissing the same pattern is a no-op, not an error.
- **Demo unchanged**: `getPatternDismissedKeys` returns `null` for demo
  viewers; components keep the localStorage read-after-mount path byte-
  identical. Demo has no server tenant to sync into.
- **Honest degradation**: read error → `[]` (suppressed suggestion
  reappears, can be re-dismissed) rather than pretending the read
  succeeded; write failure → optimistic hide reverts + error notice, so the
  UI never claims a dismissal the account did not store.
- **No flash**: `null` sentinel — already-dismissed groups render only
  after the server prop (auth) or localStorage effect (demo) resolves.

## Implementation plan

1. Migration `20260925150000_pattern_dismissals.sql`: table + RLS
   select-own + `SELECT`-only grant + `dismiss_pattern_keys(text, text[])`
   RPC; identity baseline extended via `check-migration-identity.mjs
   --write`.
2. `src/lib/pattern-dismissals.ts` shared contract + tests.
3. `src/server/dismissals.ts` loader; `src/app/actions/dismissals.ts`
   action.
4. Wire `transactions/page.tsx` + `commitments/page.tsx` loaders;
   components take the server set or fall back to localStorage.
5. pgTAP `pattern_dismissals.test.sql` (11 assertions) +
   `schema_and_rls.test.sql` plan 82→85.

## Verification

- Local: typecheck, lint, 1888/1888 unit tests, check:migrations,
  check:rls, check:architecture, check:knowledge, ci-policy, build,
  browser smoke.
- CI: `database` lane runs the new pgTAP file; e2e/browser shards per
  classifier (Class 3 → full verify).

## Out of scope

- Migrating pre-existing localStorage keys to the server (one re-dismiss
  silences a pattern everywhere; a migration pass would add a write path
  for zero ledger value).
- Un-dismissing ("xem lại gợi ý đã bỏ qua") — no UI asks for it yet.
- Extending scopes beyond `ledger_dupe` / `recurring`.
