# Money domain (always-on rule)

- Persist money as **integer** minor units (VND đồng). No `number` float for ledger amounts.
- **Transfer ≠ expense** in every sum (dashboard, reports, budgets, weekly).
- Format with `formatMoney` / `formatMoneyWithKind` at display only.
- Soft-delete via `deleted_at` where schema supports; offer undo toast.
- Domain math lives in `src/lib/*` with unit tests — never only in React.
- Auth on server; RLS for user data; never trust client for ownership.
