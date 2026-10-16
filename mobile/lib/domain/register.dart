// Per-account register math — port of src/lib/account-register.ts plus the
// per-row running balance the web list does not carry (its detail page shows
// only the impact per row; the mobile register adds balance-after per row).
//
// Money rules: all amounts integer đồng; a transfer posts −amount on the
// source and +amount on the destination; split expenses keep their whole
// amount on the paying account — the split lines divide categories, never
// the balance effect.

import 'models.dart';

/// Direction of a register movement from the viewed account's side.
enum RegisterDirection { inflow, outflow }

/// One register line: a feed row plus its signed effect on the viewed
/// account and the balance right after it posted.
class AccountRegisterEntry {
  const AccountRegisterEntry({
    required this.transaction,
    required this.impact,
    required this.direction,
    required this.balanceAfter,
    this.transferCounterparty,
  });

  final Transaction transaction;

  /// Signed đồng effect on the viewed account: + in, − out.
  final int impact;
  final RegisterDirection direction;

  /// The other account of a transfer (destination name for an outflow,
  /// source name for an inflow); null on expense/income rows.
  final String? transferCounterparty;

  /// Account balance immediately after this row — the running balance.
  /// For the newest row this IS the account's stored current balance.
  final int balanceAfter;
}

/// Signed ledger effect of [tx] on [accountId], or null when the row does
/// not move that account. Mirrors the web's `accountTransactionImpact`:
/// non-positive amounts and structurally ambiguous rows (a transfer whose
/// source and destination are the same account) return null rather than
/// inventing a movement in the presentation layer.
({int impact, RegisterDirection direction, String? transferCounterparty})?
accountTransactionImpact(Transaction tx, String accountId) {
  if (tx.amount <= 0) return null;

  if (tx.kind == TransactionKind.transfer) {
    final isSource = tx.accountId == accountId;
    final isDestination = tx.destinationAccountId == accountId;
    if (isSource == isDestination) return null;
    return isSource
        ? (
            impact: -tx.amount,
            direction: RegisterDirection.outflow,
            transferCounterparty: tx.destinationAccount,
          )
        : (
            impact: tx.amount,
            direction: RegisterDirection.inflow,
            transferCounterparty: tx.account,
          );
  }

  if (tx.accountId != accountId) return null;
  return tx.kind == TransactionKind.income
      ? (
          impact: tx.amount,
          direction: RegisterDirection.inflow,
          transferCounterparty: null,
        )
      : (
          impact: -tx.amount,
          direction: RegisterDirection.outflow,
          transferCounterparty: null,
        );
}

/// Per-row running balances over [newestFirst] — the account's feed rows
/// newest → oldest, exactly as `loadTransactionPage` returns them.
///
/// INVARIANT: `entries.first.balanceAfter == currentBalance` by
/// construction — the newest feed row is the last thing that touched the
/// account, so the balance right after it IS the current balance. Each
/// older row's `balanceAfter` then subtracts every newer row's impact.
///
/// The chain is only honest while [newestFirst] is a contiguous prefix of
/// the account's ledger: offset pages of one fixed order satisfy this (a
/// later page simply continues the subtraction — a row's balance depends
/// only on the newer rows already loaded). A filtered or gapped list would
/// fabricate intermediate balances, so callers pass the unfiltered account
/// query, never a searched-down subset.
///
/// Soft-delete consistency holds by construction too: `transaction_feed`
/// and `account_balances` both exclude `deleted_at` rows
/// (db/neon/migrations/20260714000100 + 20260922120000), so a delete moves
/// the anchor and the feed together — reloading the account re-anchors the
/// chain at the fresh balance with no drift.
List<AccountRegisterEntry> buildAccountRegister({
  required int currentBalance,
  required String accountId,
  required List<Transaction> newestFirst,
}) {
  final entries = <AccountRegisterEntry>[];
  var balance = currentBalance;
  for (final tx in newestFirst) {
    final impact = accountTransactionImpact(tx, accountId);
    if (impact == null) continue;
    entries.add(
      AccountRegisterEntry(
        transaction: tx,
        impact: impact.impact,
        direction: impact.direction,
        transferCounterparty: impact.transferCounterparty,
        balanceAfter: balance,
      ),
    );
    balance -= impact.impact;
  }
  return entries;
}

/// Soft-delete refusal messages — mirrors the web's deleteTransaction
/// action guards. The RPC raises plain-text exception codes, matched by
/// substring like every other Neon error mapper.
String transactionDeleteErrorMessage(Object error) {
  final msg = error.toString();
  if (msg.contains('recurring_payment_locked')) {
    return 'Khoản này được tạo từ lịch định kỳ — hoàn tác ở mục Định kỳ.';
  }
  if (msg.contains('transaction_reconciled')) {
    return 'Giao dịch đã đối soát — mở lại kỳ đối soát ở trang tài khoản.';
  }
  if (msg.contains('authentication_required')) {
    return 'Hết phiên đăng nhập — đăng nhập lại rồi thử lại.';
  }
  return 'Không xóa được — thử lại.';
}
