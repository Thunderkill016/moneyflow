// Category-usage ranking for the capture form's "Mục hay dùng" row.
// Counts per-category occurrences in the loaded transaction feed — pure
// domain logic so the ranking is unit-testable without a widget tree.

import 'models.dart';

/// Category ids ordered by usage frequency for [kind] (expense/income);
/// ties break toward the most recent `occurredOn`. Transfers carry no
/// category and never appear. At most [limit] ids, in rank order.
List<String> frequentCategoryIds(
  List<Transaction> txs,
  TransactionKind kind, {
  int limit = 8,
}) {
  // Transfers carry no category — ranking them would surface a phantom.
  if (kind == TransactionKind.transfer) return const [];
  final counts = <String, int>{};
  final latest = <String, String>{};
  for (final t in txs) {
    if (t.kind != kind || t.categoryId.isEmpty) continue;
    counts[t.categoryId] = (counts[t.categoryId] ?? 0) + 1;
    final prev = latest[t.categoryId];
    if (prev == null || t.occurredOn.compareTo(prev) > 0) {
      latest[t.categoryId] = t.occurredOn;
    }
  }
  final ranked = counts.keys.toList()
    ..sort((a, b) {
      final byCount = counts[b]!.compareTo(counts[a]!);
      if (byCount != 0) return byCount;
      return latest[b]!.compareTo(latest[a]!);
    });
  return ranked.take(limit).toList();
}
