// Search + filter model for the Hoạt động feed. One definition, two
// evaluators: [toPostgrestParams] for the real backend and [matches] for
// demo/in-memory data, so both sides agree on semantics (tested together).
// Web reference: src/lib/transaction-filters.ts.

import 'models.dart';

/// Rows per feed page.
const transactionPageSize = 30;

/// One page of the feed; [hasMore] is true when a further page exists.
class TransactionPage {
  const TransactionPage(this.rows, {required this.hasMore});

  final List<Transaction> rows;
  final bool hasMore;
}

/// Loads the page of [query] starting at [offset].
typedef TransactionPageLoader =
    Future<TransactionPage> Function(TransactionQuery query, {int offset});

class TransactionQuery {
  const TransactionQuery({
    this.text = '',
    this.kind,
    this.accountId,
    this.categoryId,
    this.dateFrom,
    this.dateTo,
    this.minAmount,
    this.maxAmount,
  });

  final String text;
  final TransactionKind? kind;
  final String? accountId;
  final String? categoryId;

  /// Inclusive YYYY-MM-DD bounds on occurred_on.
  final String? dateFrom;
  final String? dateTo;

  /// Inclusive bounds on amount_minor (integer đồng).
  final int? minAmount;
  final int? maxAmount;

  static const none = TransactionQuery();

  /// Search text as both evaluators see it: trimmed, and without `*`.
  /// PostgREST turns every `*` into a LIKE wildcard with no way to match
  /// a literal one, so it is dropped on both sides instead.
  String get searchTerm => text.replaceAll('*', '').trim();

  bool get isEmpty =>
      searchTerm.isEmpty &&
      kind == null &&
      accountId == null &&
      categoryId == null &&
      dateFrom == null &&
      dateTo == null &&
      minAmount == null &&
      maxAmount == null;

  /// Number of active filters, not counting the search text.
  int get filterCount => [
    kind,
    accountId,
    categoryId,
    dateFrom ?? dateTo,
    minAmount ?? maxAmount,
  ].where((v) => v != null).length;

  /// Each argument is optional; pass [clearX] to null a field out.
  TransactionQuery copyWith({
    String? text,
    TransactionKind? kind,
    String? accountId,
    String? categoryId,
    String? dateFrom,
    String? dateTo,
    int? minAmount,
    int? maxAmount,
    bool clearKind = false,
    bool clearAccount = false,
    bool clearCategory = false,
    bool clearDates = false,
    bool clearAmounts = false,
  }) => TransactionQuery(
    text: text ?? this.text,
    kind: clearKind ? null : kind ?? this.kind,
    accountId: clearAccount ? null : accountId ?? this.accountId,
    categoryId: clearCategory ? null : categoryId ?? this.categoryId,
    dateFrom: clearDates ? null : dateFrom ?? this.dateFrom,
    dateTo: clearDates ? null : dateTo ?? this.dateTo,
    minAmount: clearAmounts ? null : minAmount ?? this.minAmount,
    maxAmount: clearAmounts ? null : maxAmount ?? this.maxAmount,
  );

  /// Client-side equivalent of [toPostgrestParams].
  bool matches(Transaction t) {
    if (kind != null && t.kind != kind) return false;
    if (accountId != null &&
        t.accountId != accountId &&
        t.destinationAccountId != accountId) {
      return false;
    }
    if (categoryId != null && t.categoryId != categoryId) return false;
    // YYYY-MM-DD compares correctly as a string.
    if (dateFrom != null && t.occurredOn.compareTo(dateFrom!) < 0) return false;
    if (dateTo != null && t.occurredOn.compareTo(dateTo!) > 0) return false;
    if (minAmount != null && t.amount < minAmount!) return false;
    if (maxAmount != null && t.amount > maxAmount!) return false;
    final term = searchTerm.toLowerCase();
    if (term.isNotEmpty) {
      final hay = [
        t.note,
        t.payee,
        t.category,
        t.account,
        t.destinationAccount,
      ].whereType<String>().any((s) => s.toLowerCase().contains(term));
      if (!hay) return false;
    }
    return true;
  }

  /// Columns searched by free text (transaction_feed).
  static const searchColumns = [
    'note',
    'payee',
    'category_name',
    'account_name',
    'destination_account_name',
  ];

  /// PostgREST filter params for transaction_feed. Everything goes into
  /// one `and=(...)` group because the params map holds a single key per
  /// name and the text/account filters both need an `or`.
  Map<String, String> toPostgrestParams() {
    final parts = <String>[];
    final term = searchTerm;
    if (term.isNotEmpty) {
      final pattern = postgrestQuote('*${escapeLikeTerm(term)}*');
      parts.add(
        'or(${[for (final c in searchColumns) '$c.ilike.$pattern'].join(',')})',
      );
    }
    if (accountId != null) {
      final id = postgrestQuote(accountId!);
      parts.add('or(account_id.eq.$id,destination_account_id.eq.$id)');
    }
    if (dateFrom != null) {
      parts.add('occurred_on.gte.${postgrestQuote(dateFrom!)}');
    }
    if (dateTo != null) {
      parts.add('occurred_on.lte.${postgrestQuote(dateTo!)}');
    }
    if (minAmount != null) parts.add('amount_minor.gte.$minAmount');
    if (maxAmount != null) parts.add('amount_minor.lte.$maxAmount');
    return {
      if (kind != null) 'kind': 'eq.${kind!.name}',
      if (categoryId != null)
        'category_id': 'eq.${postgrestQuote(categoryId!)}',
      if (parts.isNotEmpty) 'and': '(${parts.join(',')})',
    };
  }
}

/// Makes `%`, `_` and `\` literal inside a LIKE/ILIKE pattern (Postgres's
/// default escape character is backslash).
String escapeLikeTerm(String s) =>
    s.replaceAllMapped(RegExp(r'[\\%_]'), (m) => '\\${m[0]}');

/// Double-quotes a PostgREST filter value so `,` `(` `)` `:` `.` and
/// spaces in user input stay data. Inside quotes only `"` and `\` are
/// special and take a backslash.
String postgrestQuote(String s) =>
    '"${s.replaceAllMapped(RegExp(r'["\\]'), (m) => '\\${m[0]}')}"';

/// In-memory page loader (demo mode and tests): same order as the server
/// (occurred_on desc; stable for ties) and the same [TransactionQuery]
/// semantics.
TransactionPageLoader inMemoryPageLoader(
  List<Transaction> all, {
  int pageSize = transactionPageSize,
}) => (query, {offset = 0}) async {
  // List.sort is not stable; the index keeps ties in input order.
  final indexed =
      [
        for (var i = 0; i < all.length; i++)
          if (query.matches(all[i])) (i, all[i]),
      ]..sort((a, b) {
        final byDate = b.$2.occurredOn.compareTo(a.$2.occurredOn);
        return byDate != 0 ? byDate : a.$1.compareTo(b.$1);
      });
  final rows = [for (final e in indexed) e.$2];
  final end = offset + pageSize;
  return TransactionPage(
    rows.skip(offset).take(pageSize).toList(),
    hasMore: rows.length > end,
  );
};
