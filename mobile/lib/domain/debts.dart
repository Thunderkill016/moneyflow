// Debt/loan tracking (D1) — informal "đi vay / cho vay" records over real
// ledger movements, never a second ledger. Mirrors
// supabase/migrations/20261016120000_debts.sql: creating a debt posts
// nothing; every repayment is an explicit user action writing a real
// financial_transactions row (expense for payable, income for receivable)
// linked through debt_repayments.

import 'models.dart';

/// 'payable' = I owe the counterparty (đi vay); 'receivable' = they owe me
/// (cho vay). Wire values match the public.debt_direction enum.
enum DebtDirection { payable, receivable }

DebtDirection debtDirectionFromString(String raw) => switch (raw) {
  'receivable' => DebtDirection.receivable,
  _ => DebtDirection.payable,
};

String debtDirectionWire(DebtDirection d) => switch (d) {
  DebtDirection.payable => 'payable',
  DebtDirection.receivable => 'receivable',
};

/// Vietnamese labels — "đi vay" is money I borrowed and must pay back,
/// "cho vay" is money I lent and will collect.
String debtDirectionLabel(DebtDirection d) => switch (d) {
  DebtDirection.payable => 'Đi vay',
  DebtDirection.receivable => 'Cho vay',
};

/// open → still owed; settled → done (fully repaid or marked closed by the
/// user); archived → hidden but recoverable. Wire values match the
/// public.debt_state enum.
enum DebtState { open, settled, archived }

DebtState debtStateFromString(String raw) => switch (raw) {
  'settled' => DebtState.settled,
  'archived' => DebtState.archived,
  _ => DebtState.open,
};

String debtStateWire(DebtState s) => switch (s) {
  DebtState.open => 'open',
  DebtState.settled => 'settled',
  DebtState.archived => 'archived',
};

/// The ledger kind a repayment posts as — direction-derived server-side
/// so a caller can never mislabel it. Paying back what I owe is money
/// leaving (expense); collecting what I'm owed is money arriving
/// (income). Never transfer: transfers are equal/opposite movements
/// between own accounts and cannot change what I owe the world.
TransactionKind repaymentKind(DebtDirection d) => switch (d) {
  DebtDirection.payable => TransactionKind.expense,
  DebtDirection.receivable => TransactionKind.income,
};

/// Debt row — mirrors public.debts. `remainingMinor` is the server's
/// authoritative outstanding figure: decremented only inside
/// apply_debt_repayment, never edited client-side or invented.
class Debt {
  const Debt({
    required this.id,
    required this.counterparty,
    required this.direction,
    required this.principalMinor,
    required this.remainingMinor,
    this.note = '',
    this.dueDate,
    this.state = DebtState.open,
    this.version = 1,
    this.updatedAt,
  });

  final String id;
  final String counterparty;
  final DebtDirection direction;

  /// The original obligation (đồng). Immutable in v1 — later advances are
  /// a new debt.
  final int principalMinor;

  /// Outstanding amount (đồng) — server-decremented on each repayment.
  final int remainingMinor;
  final String note;

  /// Optional pay-back/collect-by date (YYYY-MM-DD).
  final String? dueDate;
  final DebtState state;

  /// Row version — the optimistic-concurrency token (bumps server-side on
  /// every content change).
  final int version;
  final String? updatedAt;

  bool get isOpen => state == DebtState.open;

  /// Paid so far — derived from two stored facts, never stored itself.
  int get repaidMinor => principalMinor - remainingMinor;
}

/// What a submit of the add-debt form carries to the store.
class DebtDraft {
  const DebtDraft({
    required this.direction,
    required this.counterparty,
    required this.principalMinor,
    this.note = '',
    this.dueDate,
  });

  final DebtDirection direction;
  final String counterparty;
  final int principalMinor;
  final String note;
  final String? dueDate;
}

/// One repayment request — amount capped by remaining, account/category
/// chosen by the user, idempotency key minted per dialog instance so a
/// retry after a lost response replays the same logical write.
class DebtRepayment {
  const DebtRepayment({
    required this.debtId,
    required this.amountMinor,
    required this.accountId,
    required this.categoryId,
    required this.occurredOn,
    this.note = '',
    required this.idempotencyKey,
  });

  final String debtId;
  final int amountMinor;
  final String accountId;
  final String categoryId;

  /// Ledger date (YYYY-MM-DD).
  final String occurredOn;
  final String note;
  final String idempotencyKey;
}

/// Client-side mirror of the server's repayment guard — the dialog
/// pre-validates so a doomed RPC never leaves the phone. Returns the
/// server error token, or null when the amount is payable.
String? validateRepaymentAmount(int remainingMinor, int amountMinor) {
  if (amountMinor <= 0) return 'amount_must_be_positive';
  if (amountMinor > remainingMinor) return 'repayment_exceeds_remaining';
  return null;
}

/// A counterparty's open debts plus the outstanding total — the
/// per-person rollup the list page renders ("Anh Hai · còn 2.000.000 ₫").
class DebtGroup {
  const DebtGroup({
    required this.counterparty,
    required this.debts,
    required this.remainingMinor,
    required this.direction,
  });

  /// Display name — the raw counterparty of the group's first debt.
  final String counterparty;
  final List<Debt> debts;
  final int remainingMinor;

  /// Every member's direction — 'payable' totals and 'receivable' totals
  /// are never mixed: owing someone and being owed by them are different
  /// facts, so they stay separate groups even under the same name.
  final DebtDirection direction;
}

/// Groups [open] debts by (direction, counterparty) for the list page.
/// The name key is trim + lowercased so "Anh Hai" and "anh hai" merge,
/// but the displayed name keeps the first spelling the user saved.
/// "I owe Hai" and "Hai owes me" never share a group — the outstanding
/// total would otherwise claim a meaningless net. Groups sort by
/// outstanding total desc then name; debts inside keep creation order.
/// Non-open debts are the caller's concern — pass only open rows.
List<DebtGroup> groupOpenDebts(List<Debt> debts) {
  final byKey = <String, List<Debt>>{};
  for (final d in debts) {
    final key = '${d.direction.index}|${d.counterparty.trim().toLowerCase()}';
    byKey.putIfAbsent(key, () => []).add(d);
  }
  final groups = [
    for (final entry in byKey.entries)
      DebtGroup(
        counterparty: entry.value.first.counterparty,
        debts: entry.value,
        remainingMinor: entry.value.fold(0, (s, d) => s + d.remainingMinor),
        direction: entry.value.first.direction,
      ),
  ];
  groups.sort((a, b) {
    final byRemaining = b.remainingMinor.compareTo(a.remainingMinor);
    if (byRemaining != 0) return byRemaining;
    return a.counterparty.toLowerCase().compareTo(b.counterparty.toLowerCase());
  });
  return groups;
}

/// Error-token → Vietnamese copy for the debts surface — same contract as
/// planningErrorMessage/accountFormErrorMessage: the RPC raises a code,
/// the UI answers in plain language.
String debtErrorMessage(Object e, {required String fallback}) {
  final msg = e.toString();
  if (msg.contains('repayment_exceeds_remaining')) {
    return 'Số tiền vượt phần còn lại của khoản nợ';
  }
  if (msg.contains('debt_not_open')) {
    return 'Khoản nợ không còn mở — tải lại rồi thử lại';
  }
  if (msg.contains('category_kind_mismatch')) {
    return 'Danh mục không khớp loại khoản — chọn danh mục khác';
  }
  if (msg.contains('category_archived')) {
    return 'Danh mục đã bị ẩn — chọn danh mục khác';
  }
  if (msg.contains('invalid_counterparty')) {
    return 'Tên người vay/cho vay chưa hợp lệ';
  }
  if (msg.contains('idempotency_intent')) {
    return 'Thao tác này đã được ghi — tải lại để xem bản mới';
  }
  // *_not_found (row deleted elsewhere) and archive/state refusals all
  // mean the local row state was stale.
  if (msg.contains('not_found') || msg.contains('rejected')) {
    return 'Dữ liệu vừa thay đổi — tải lại rồi thử lại';
  }
  return fallback;
}
