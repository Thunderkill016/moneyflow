---
description: Use when writing or reviewing any money, ledger, transaction, transfer, balance, or financial logic in mobile/.
---

# Money rules (inviolable)

- VND is stored as integer/BIGINT `*_minor` (đồng). Never float/double in any money path; bound inputs BEFORE scaling (see `domain/money.dart`, `_maxSafeAmount = 9007199254740991`).
- Transfers are atomic and balanced — only via the single RPC `create_account_transfer`; never income/expense.
- Soft-delete + audit trail for financial records (`soft_delete_money_transaction`, `restore_money_transaction`, `permanently_delete_money_transaction` only on trashed rows). No silent hard deletes.
- `idempotency_key` on every write — retries and offline replays must never duplicate. Stable key per logical operation (`OperationIdempotencyKeys` in real_store.dart; one key per form instance for captures, persisted with the draft so post-death retries dedupe).
- Time: TIMESTAMPTZ/UTC in DB; civil-day math in Asia/Saigon via `vnNow()`/`vnToday()`/`vnMonthStart()`/`dateAdd` in `domain/report.dart` (fixed +7, VN has no DST). Never compute "today" from device-local `DateTime.now()` for ledger fields.
- AI/voice/notification/rules NEVER auto-post a transaction — candidates wait in inbox for explicit user approval. No feature pays or moves real money.
