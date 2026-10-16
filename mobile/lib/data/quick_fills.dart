import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../domain/models.dart';

/// D7 — one saved "mẫu ghi nhanh" (Goodbudget's Custom Quick Fills): the
/// fields a repeat expense/income needs to prefill the capture form in
/// one tap. A chip never posts by itself — tapping it fills the form and
/// the user still reviews + saves, so the ledger stays explicit-write.
class QuickFill {
  const QuickFill({
    required this.kind,
    required this.amountMinor,
    required this.categoryId,
    required this.categoryName,
    required this.accountId,
    this.payee = '',
    this.note = '',
  });

  /// Only expense/income — a transfer needs two accounts and no
  /// category, which a single chip can't honestly prefill.
  final TransactionKind kind;

  /// Integer đồng.
  final int amountMinor;
  final String categoryId;

  /// Snapshot for labeling when [categoryId] no longer resolves — the
  /// chip hides on a stale id, so this mostly serves tests/debugging.
  final String categoryName;
  final String accountId;
  final String payee;
  final String note;

  /// Two fills are the same template when every field matches — saving
  /// an identical one just refreshes its recency instead of duplicating.
  bool sameAs(QuickFill other) =>
      kind == other.kind &&
      amountMinor == other.amountMinor &&
      categoryId == other.categoryId &&
      accountId == other.accountId &&
      payee == other.payee &&
      note == other.note;

  Map<String, Object?> toJson() => {
    'v': 1,
    'kind': kind.name,
    'amountMinor': amountMinor,
    'categoryId': categoryId,
    'categoryName': categoryName,
    'accountId': accountId,
    'payee': payee,
    'note': note,
  };

  /// Null on any shape drift — a corrupt entry drops honestly rather
  /// than becoming a broken chip.
  static QuickFill? fromJson(Object? raw) {
    if (raw is! Map) return null;
    final kind = TransactionKind.values
        .where((k) => k.name == raw['kind'])
        .firstOrNull;
    final amount = raw['amountMinor'];
    final categoryId = raw['categoryId'];
    final categoryName = raw['categoryName'];
    final accountId = raw['accountId'];
    if (kind == null ||
        kind == TransactionKind.transfer ||
        amount is! int ||
        amount <= 0 ||
        categoryId is! String ||
        categoryId.isEmpty ||
        categoryName is! String ||
        accountId is! String ||
        accountId.isEmpty) {
      return null;
    }
    return QuickFill(
      kind: kind,
      amountMinor: amount,
      categoryId: categoryId,
      categoryName: categoryName,
      accountId: accountId,
      payee: raw['payee'] as String? ?? '',
      note: raw['note'] as String? ?? '',
    );
  }
}

/// Per-account template list — `mf_quick_fills.<userId>`, most recently
/// saved first. Device-local like the other prefs stores: the fills are
/// conveniences, not financial records, so they need no sync contract.
class QuickFillStore {
  static const _prefix = 'mf_quick_fills.';

  /// Chip row stays glanceable — beyond this the feature stops being
  /// "one tap" and becomes a list that needs its own manager.
  static const maxFills = 12;

  static String _key(String scope) => '$_prefix$scope';

  static Future<List<QuickFill>> load(String scope) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key(scope));
    if (raw == null) return const [];
    final Object? decoded;
    try {
      decoded = jsonDecode(raw);
    } on FormatException {
      return const [];
    }
    if (decoded is! List) return const [];
    return [for (final e in decoded) ?QuickFill.fromJson(e)];
  }

  /// Saves (or refreshes) a template — an identical fill moves to the
  /// front rather than duplicating; the oldest falls off past the cap.
  static Future<void> save(String scope, QuickFill fill) async {
    final list = [...await load(scope)];
    list.removeWhere((f) => f.sameAs(fill));
    list.insert(0, fill);
    if (list.length > maxFills) list.removeRange(maxFills, list.length);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key(scope),
      jsonEncode([for (final f in list) f.toJson()]),
    );
  }

  static Future<void> delete(String scope, QuickFill fill) async {
    final list = [...await load(scope)];
    list.removeWhere((f) => f.sameAs(fill));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key(scope),
      jsonEncode([for (final f in list) f.toJson()]),
    );
  }
}
