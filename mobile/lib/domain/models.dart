// Domain models ported from src/lib/accounts.ts + transactions/contracts.ts.

enum AccountKind { cash, bank, eWallet, creditCard, savings }

AccountKind accountKindFromString(String raw) => switch (raw) {
  'bank' => AccountKind.bank,
  'e_wallet' => AccountKind.eWallet,
  'credit_card' => AccountKind.creditCard,
  'savings' => AccountKind.savings,
  _ => AccountKind.cash,
};

class AccountSummary {
  const AccountSummary({
    required this.id,
    required this.name,
    required this.kind,
    required this.currencyCode,
    required this.initialBalance,
    required this.balance,
    this.isArchived = false,
    this.icon,
    this.color,
    this.updatedAt,
  });

  final String id;
  final String name;
  final AccountKind kind;
  final String currencyCode;
  final int initialBalance;
  final int balance;
  final bool isArchived;
  final String? icon;
  final String? color;
  final String? updatedAt;
}

enum TransactionKind { expense, income, transfer }

/// Category row — mirrors public.categories. Kinds match transaction kinds;
/// `icon`/`color` carry the web's stored vocabulary keys (unrendered legacy
/// or unknown values stay intact so a save never silently drops them).
class Category {
  const Category({
    required this.id,
    required this.name,
    required this.kind,
    this.icon,
    this.color,
    this.isDefault = false,
    this.isArchived = false,
  });

  final String id;
  final String name;
  final TransactionKind kind;
  final String? icon;
  final String? color;
  final bool isDefault;
  final bool isArchived;
}

enum TransactionReviewStatus { needsReview, reviewed }

class Transaction {
  const Transaction({
    required this.id,
    required this.kind,
    required this.categoryId,
    required this.category,
    required this.note,
    required this.accountId,
    required this.account,
    required this.amount,
    required this.occurredOn,
    this.payee,
    this.destinationAccountId,
    this.destinationAccount,
    this.reviewStatus = TransactionReviewStatus.reviewed,
    this.updatedAt,
    this.splitCount = 0,
  });

  final String id;
  final TransactionKind kind;
  final String categoryId;
  final String category;
  final String note;
  final String accountId;
  final String account;
  final int amount;
  final String occurredOn; // YYYY-MM-DD
  final String? payee;
  final String? destinationAccountId;
  final String? destinationAccount;
  final TransactionReviewStatus reviewStatus;
  final String? updatedAt;

  /// Number of category lines when this expense was split across
  /// categories (0 = ordinary single-category row). Split rows are not
  /// editable in place — update_money_transaction rejects them.
  final int splitCount;

  bool get isSplit => splitCount > 1;

  /// Copy with the review flag set — the only field the feed read has to
  /// patch in after the fact (review_status lives on another relation).
  Transaction copyWith({required bool needsReview}) => Transaction(
    id: id,
    kind: kind,
    categoryId: categoryId,
    category: category,
    note: note,
    accountId: accountId,
    account: account,
    amount: amount,
    occurredOn: occurredOn,
    payee: payee,
    destinationAccountId: destinationAccountId,
    destinationAccount: destinationAccount,
    reviewStatus: needsReview
        ? TransactionReviewStatus.needsReview
        : TransactionReviewStatus.reviewed,
    updatedAt: updatedAt,
    splitCount: splitCount,
  );
}

/// Soft-deleted ledger row — mirrors deleted_transaction_feed
/// (transaction columns + the tombstone timestamp).
class DeletedTransaction {
  const DeletedTransaction({
    required this.transaction,
    required this.deletedAt,
  });

  final Transaction transaction;
  final String deletedAt; // ISO timestamp
}

/// Monthly budget row — mirrors public.budget_progress.
class BudgetProgress {
  const BudgetProgress({
    required this.id,
    required this.categoryId,
    required this.categoryName,
    required this.monthStart,
    required this.limitMinor,
    required this.spentMinor,
  });

  final String id;
  final String categoryId;
  final String categoryName;
  final String monthStart; // YYYY-MM-01
  final int limitMinor;
  final int spentMinor;

  bool get isOver => spentMinor > limitMinor;
}

/// Recurring commitment row — mirrors public.recurring_commitment_feed.
class RecurringCommitment {
  const RecurringCommitment({
    required this.id,
    required this.name,
    required this.amountMinor,
    required this.dueDay,
    required this.accountId,
    required this.accountName,
    required this.categoryId,
    required this.categoryName,
    this.isArchived = false,
    this.paidThisMonth = false,
  });

  final String id;
  final String name;
  final int amountMinor;
  final int dueDay; // 1-31
  final String accountId;
  final String accountName;
  final String categoryId;
  final String categoryName;
  final bool isArchived;
  final bool paidThisMonth;
}

/// Recurring income (salary etc.) — mirrors
/// public.recurring_income_template_feed plus this month's receipt state.
class RecurringIncome {
  const RecurringIncome({
    required this.id,
    required this.name,
    required this.amountMinor,
    required this.dueDay,
    required this.accountId,
    required this.accountName,
    required this.categoryId,
    required this.categoryName,
    this.receivedThisMonth = false,
  });

  final String id;
  final String name;
  final int amountMinor;
  final int dueDay; // 1-31
  final String accountId;
  final String accountName;
  final String categoryId;
  final String categoryName;
  final bool receivedThisMonth;
}

/// Savings goal row — mirrors public.savings_goals.
class SavingsGoal {
  const SavingsGoal({
    required this.id,
    required this.name,
    required this.targetMinor,
    required this.allocatedMinor,
    this.deadline,
    this.isArchived = false,
  });

  final String id;
  final String name;
  final int targetMinor;
  final int allocatedMinor;
  final String? deadline; // YYYY-MM-DD
  final bool isArchived;

  double get progress => targetMinor <= 0 ? 0 : allocatedMinor / targetMinor;
}
