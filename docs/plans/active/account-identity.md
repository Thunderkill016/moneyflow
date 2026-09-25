# Account identity — stored icon/color on the only write path

**Status:** implemented
**Execution state:** implemented
**Active role:** autonomous agent under the owner's standing merge grant
**Permission scope:** code + one migration extending existing RPCs; no
production-data writes
**Owner:** agent (Devin)
**Issue/PR:** backlog item "Accounts: identity (màu/icon riêng)"; pattern
mirrors merged #718 (categories)
**Last updated:** 2026-09-25

## Repository reconnaissance

The `accounts` row has carried `icon`/`color` columns since the initial
schema (20260714000100), and the archive contract already round-trips them.
Nothing could write or read them:

- `create/update_financial_account` — the only mutation path after direct
  `insert/update` was revoked — accepted no identity params.
- `mapAccountRow` never selected or parsed the columns.
- Every render surface derived icon/tone from `kind` alone.
- `src/lib/accounts.ts` exported no palette, icon set, or identity fields.

Categories solved the identical gap in #718 — this slice follows that
merged pattern deliberately rather than inventing a second convention.

## Research

- **#718 merged diff** — establishes the stored-wins → fallback contract,
  the palette/literal-union guard (so the css-ownership scanner keeps
  tracking emission), and the zod write boundary.
- **RPC change convention** (20260715001500) — `drop function` the old
  signature, `create or replace` with the appended defaulted params,
  re-grant `execute` to `authenticated`. Backward-compatible for positional
  callers in tests and code.
- **Money Lover** — the local incumbent lets users pick account icons
  (bank logos); matching the expectation costs one select pair.

## Specification

- `AccountSummary.icon/color`: stored picker choice or `null`; `null` or
  out-of-palette stored values degrade to the kind-derived identity —
  never an unowned class or blank glyph.
- `ACCOUNT_ICON_NAMES`: wallet, bank, card, piggy, coins, briefcase,
  receipt, spark (all exist in `KNOWN_ICONS`).
- `ACCOUNT_COLORS`: the shared 8-tone token palette (same names as
  categories).
- `ACCOUNT_KIND_DEFAULT_ICONS`: cash→wallet, bank→bank, e_wallet→spark,
  credit_card→card, savings→piggy.
- Both RPCs gain `p_icon/p_color text default null`, validated against the
  mirrored allowlists; `null` stores `null` (no invented default).
- `mapAccountRow` moves to `src/lib/accounts.ts` — a pure function in the
  testable domain layer, re-exported from `server/accounts` so callers are
  unchanged.
- Dialog: icon + color selects; icon re-seeds from kind only while the
  current value is still a kind default (an explicit pick survives a kind
  change).
- Demo fixtures carry honest identity (bank/blue, wallet/green, spark/pink,
  coins/amber) so the feature is observable without an auth backend.

## Implementation plan

- Migration `20260926120000_account_identity.sql`: drop + recreate both
  RPCs with appended identity params, allowlist checks, re-grants.
- `src/lib/accounts.ts`: palette/icon constants, guards, kind defaults,
  `AccountSummary`/`SaveAccountInput` fields, moved `mapAccountRow`.
- `src/server/accounts.ts` + `reports.ts` + `actions/accounts.ts`: select
  `icon,color`; zod enum validation; pass `p_icon/p_color`.
- `account-dialog.tsx`, `accounts-workspace.tsx`,
  `account-detail-page.tsx`: pickers + stored-wins rendering; palette tone
  classes in both CSS modules.
- pgTAP `account_identity_rpc.test.sql` (9 assertions) + contract tests in
  `src/lib/account-identity.test.ts` (11) including migration↔app enum
  parity.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Migration + RPC identity params | none | 20260926120000_account_identity.sql | done |
| T2 | Domain types + mapper + selects | T1 | accounts.ts, server files | done |
| T3 | Dialog pickers + render fallback | T2 | dialog/workspace/detail | done |
| T4 | Contract + pgTAP tests | T2 | 11 unit + 9 pgTAP assertions | done |
| T5 | Exact-head gates + browser evidence | T3 | see evaluation | done |

## Evaluation

- Unit suite: **1937/1937** — incl. `account-identity.test.ts` 11/11.
- typecheck, lint (1 pre-existing warning elsewhere), css-ownership,
  architecture, knowledge, ci-policy (191/191), build 52/52: pass.
- pgTAP runs on the CI `database` lane (no local Docker).
- Browser (demo): account cards show stored icon + tone (blue/green/pink/
  amber); detail page applies stored tone; dialog exposes both pickers.
- Archive contract: icon/color already round-tripped — verified in
  `moneyflow-archive.ts` field specs and the restore RPC key list.
