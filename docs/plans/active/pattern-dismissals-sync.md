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

## Research

- **Deterministic keys make sync cheap**: both dismissal domains already
  hash stable bucket content — no row IDs, no clock. Storing the key is
  the whole sync story; no payload replication needed.
- **In-repo precedent**: every user-owned write boundary uses an
  RLS-protected table plus a security-definer RPC (`search_path = ''`,
  identity from `auth.uid()`); reads stay RLS-invoker. This packet adds
  no new boundary kind.
- **Alternatives rejected**: (a) a generic `user_preferences` JSON blob —
  weaker validation, invites unbounded preference sprawl; (b) putting
  dismissals in the archive inventory — forces export/restore/fixture
  contract churn for state whose deletion only re-surfaces a suggestion;
  (c) migrating existing localStorage keys — a write path for zero ledger
  value when one re-dismiss already silences a pattern everywhere.

## Specification

- `pattern_dismissals`: PK `(user_id, scope, pattern_key)`; `user_id`
  references `public.profiles(id) ON DELETE CASCADE`; scope CHECK
  `('ledger_dupe','recurring')`; `pattern_key ~ ^[0-9a-f]{8}$`; RLS
  select-own; `SELECT`-only grant to `authenticated`.
- `dismiss_pattern_keys(text, text[])` security definer,
  `search_path = ''`: derives `user_id` from `auth.uid()`; validates
  scope whitelist, non-empty ≤500 batch and key shape before any insert;
  `ON CONFLICT DO NOTHING` (second device re-dismissal is a no-op).
- `getPatternDismissedKeys(scope)`: `null` for demo (component keeps
  localStorage), `[]` on read error — honest degradation.
- `dismissPatternKeysAction(scope, keys)`: non-demo `requireViewer`,
  zod-validated scope + keys, RPC call, typed failure result.
- Components: `null` sentinel init (no flash); optimistic hide + revert
  + error notice on `{ok:false}` **and** on a rejected action (offline);
  `markSuggestionHandled` keeps the saved commitment but reverts the
  local hide on write failure.
- Demo path byte-identical to before; ledger truth untouched.

## Implementation plan

1. Migration `20260925150000_pattern_dismissals.sql` + identity baseline
   via `check-migration-identity.mjs --write`.
2. `src/lib/pattern-dismissals.ts` shared contract + tests.
3. `src/server/dismissals.ts` loader; `src/app/actions/dismissals.ts`
   action.
4. Wire `transactions/page.tsx` + `commitments/page.tsx` loaders;
   components take the server set or fall back to localStorage.
5. pgTAP `pattern_dismissals.test.sql` + `schema_and_rls.test.sql`
   plan bump + `security_definer_contract` inventory bump.

## Tasks

- [x] Migration, RPC, grants, identity baseline.
- [x] Shared contract + server loader + action.
- [x] Component wiring (transactions strip, commitments cards).
- [x] pgTAP file + contract bumps; director round-2 fixes (anon 42501
  assertion vs in-body guard, definer inventory 42→43, rejection paths).
- [ ] CI exact-head green; merge; production migration apply (owner
  boundary); post-merge read-back.

## Evaluation

- Local gates: typecheck, lint (0 errors), unit suite,
  check:migrations, check:rls, check:architecture, check:knowledge,
  ci-policy, build, browser smoke `/transactions` + `/commitments`.
- CI: `database` lane runs the pgTAP file; browser/e2e shards per
  classifier (Class 3 → full verify).
- Acceptance signal: dismiss on device A → open device B → the flagged
  pattern stays suppressed; offline dismiss → suggestion returns with an
  error notice, never silently "stored".

## Out of scope

- Migrating pre-existing localStorage keys to the server (one re-dismiss
  silences a pattern everywhere; a migration pass adds a write path for
  zero ledger value).
- Un-dismissing ("xem lại gợi ý đã bỏ qua") — no UI asks for it yet.
- Extending scopes beyond `ledger_dupe` / `recurring`.
