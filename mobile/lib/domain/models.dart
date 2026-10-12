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
}
