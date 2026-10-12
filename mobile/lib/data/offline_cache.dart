// Last-known-data snapshot cache so authenticated surfaces can render
// something when the network is down. Read-only honesty: callers must
// label restored data as stale — it is never presented as fresh.

import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../domain/models.dart';

/// A point-in-time copy of the dashboard's rendered data.
///
/// [savedAtMs] is `DateTime.now().millisecondsSinceEpoch` captured when
/// the snapshot is taken; surfaces use it to label the data's age.
class DashboardSnapshot {
  const DashboardSnapshot({
    required this.savedAtMs,
    required this.accounts,
    required this.transactions,
  });

  final int savedAtMs;
  final List<AccountSummary> accounts;
  final List<Transaction> transactions;

  Map<String, Object?> toJson() => {
    'savedAtMs': savedAtMs,
    'accounts': accounts.map((a) => a.toJson()).toList(),
    'transactions': transactions.map((t) => t.toJson()).toList(),
  };

  /// Strict decode — throws [FormatException] when a required field is
  /// missing, has the wrong type, or holds an unknown enum value.
  factory DashboardSnapshot.fromJson(Map<String, Object?> json) =>
      DashboardSnapshot(
        savedAtMs: _reqInt(json, 'savedAtMs'),
        accounts: _reqList(json, 'accounts').map(_accountFromJson).toList(),
        transactions: _reqList(
          json,
          'transactions',
        ).map(_transactionFromJson).toList(),
      );
}

/// SharedPreferences-backed store for [DashboardSnapshot]s.
class OfflineCache {
  OfflineCache(this._prefs);

  final SharedPreferences _prefs;

  static const _key = 'mf_dashboard_snapshot';

  Future<void> saveDashboard(DashboardSnapshot snap) =>
      _prefs.setString(_key, jsonEncode(snap.toJson()));

  /// The last saved snapshot, or null when absent or malformed — a
  /// corrupt cache must never throw on the read path.
  DashboardSnapshot? readDashboard() {
    final raw = _prefs.getString(_key);
    if (raw == null) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, Object?>) return null;
      return DashboardSnapshot.fromJson(decoded);
    } on Object {
      // Decode or validation failure — treat it as "no snapshot".
      return null;
    }
  }

  Future<void> clear() => _prefs.remove(_key);
}

// --- Domain <-> JSON converters ----------------------------------------
// models.dart is not editable, so serialization lives here. Enum strings
// mirror the server's snake_case wire values.

extension on AccountSummary {
  Map<String, Object?> toJson() => {
    'id': id,
    'name': name,
    'kind': _accountKindToString(kind),
    'currencyCode': currencyCode,
    'initialBalance': initialBalance,
    'balance': balance,
    'isArchived': isArchived,
    'icon': icon,
    'color': color,
    'updatedAt': updatedAt,
  };
}

AccountSummary _accountFromJson(Object? raw) {
  final json = _reqMap(raw, 'account');
  return AccountSummary(
    id: _reqString(json, 'id'),
    name: _reqString(json, 'name'),
    kind: accountKindFromString(_reqString(json, 'kind')),
    currencyCode: _reqString(json, 'currencyCode'),
    initialBalance: _reqInt(json, 'initialBalance'),
    balance: _reqInt(json, 'balance'),
    isArchived: _reqBool(json, 'isArchived'),
    icon: _optString(json, 'icon'),
    color: _optString(json, 'color'),
    updatedAt: _optString(json, 'updatedAt'),
  );
}

extension on Transaction {
  Map<String, Object?> toJson() => {
    'id': id,
    'kind': _transactionKindToString(kind),
    'categoryId': categoryId,
    'category': category,
    'note': note,
    'accountId': accountId,
    'account': account,
    'amount': amount,
    'occurredOn': occurredOn,
    'payee': payee,
    'destinationAccountId': destinationAccountId,
    'destinationAccount': destinationAccount,
    'reviewStatus': _reviewStatusToString(reviewStatus),
    'updatedAt': updatedAt,
  };
}

Transaction _transactionFromJson(Object? raw) {
  final json = _reqMap(raw, 'transaction');
  return Transaction(
    id: _reqString(json, 'id'),
    kind: _transactionKindFromString(_reqString(json, 'kind')),
    categoryId: _reqString(json, 'categoryId'),
    category: _reqString(json, 'category'),
    note: _reqString(json, 'note'),
    accountId: _reqString(json, 'accountId'),
    account: _reqString(json, 'account'),
    amount: _reqInt(json, 'amount'),
    occurredOn: _reqString(json, 'occurredOn'),
    payee: _optString(json, 'payee'),
    destinationAccountId: _optString(json, 'destinationAccountId'),
    destinationAccount: _optString(json, 'destinationAccount'),
    reviewStatus: _reviewStatusFromString(_reqString(json, 'reviewStatus')),
    updatedAt: _optString(json, 'updatedAt'),
  );
}

String _accountKindToString(AccountKind kind) => switch (kind) {
  AccountKind.cash => 'cash',
  AccountKind.bank => 'bank',
  AccountKind.eWallet => 'e_wallet',
  AccountKind.creditCard => 'credit_card',
  AccountKind.savings => 'savings',
};

String _transactionKindToString(TransactionKind kind) => switch (kind) {
  TransactionKind.expense => 'expense',
  TransactionKind.income => 'income',
  TransactionKind.transfer => 'transfer',
};

/// Strict — unlike the server feed (which defaults unknown kinds to
/// expense), a cached kind we can't decode means corrupt data.
TransactionKind _transactionKindFromString(String raw) => switch (raw) {
  'expense' => TransactionKind.expense,
  'income' => TransactionKind.income,
  'transfer' => TransactionKind.transfer,
  _ => throw FormatException('unknown transaction kind: $raw'),
};

String _reviewStatusToString(TransactionReviewStatus status) =>
    switch (status) {
      TransactionReviewStatus.needsReview => 'needs_review',
      TransactionReviewStatus.reviewed => 'reviewed',
    };

TransactionReviewStatus _reviewStatusFromString(String raw) => switch (raw) {
  'needs_review' => TransactionReviewStatus.needsReview,
  'reviewed' => TransactionReviewStatus.reviewed,
  _ => throw FormatException('unknown review status: $raw'),
};

// --- Strict field readers ----------------------------------------------
// Every check throws FormatException so the cache boundary can fall back
// to "no snapshot". A missing key reads as null, which fails the type
// check — one code path covers both "absent" and "wrong type".

String _reqString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! String) {
    throw FormatException('"$key" must be a string');
  }
  return value;
}

int _reqInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! num) {
    throw FormatException('"$key" must be a number');
  }
  return value.toInt();
}

bool _reqBool(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! bool) {
    throw FormatException('"$key" must be a bool');
  }
  return value;
}

String? _optString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! String) {
    throw FormatException('"$key" must be a string or null');
  }
  return value;
}

List<Object?> _reqList(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! List) {
    throw FormatException('"$key" must be a list');
  }
  return value;
}

Map<String, Object?> _reqMap(Object? raw, String context) {
  if (raw is! Map<String, Object?>) {
    throw FormatException('$context entry must be a JSON object');
  }
  return raw;
}
