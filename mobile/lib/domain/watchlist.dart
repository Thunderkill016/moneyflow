// Watchlist (D10, RESEARCH_TOP_FINANCE_APPS.md §10 — Simplifi's "watch
// one category without a budget" pattern): a pinned expense category or
// payee whose month-to-date spend rides the dashboard as a small tile.
// No budgeting ceremony — the pin is a lens on the existing ledger, not
// a plan. Integer đồng; only expense rows count (income pinned under a
// category would read as "spent").
//
// Pins are device-local (SharedPreferences) like the digest opt-ins: a
// bookmark, not financial truth, so no schema and no cross-device claim.

import 'models.dart';
import 'report.dart' show dayOnly, ymd;

/// What a pin aggregates on — the D4 aggregations already exist; the
/// kind just names which field it reads.
enum WatchKind { category, payee }

class WatchItem {
  const WatchItem({
    required this.kind,
    required this.name,
    this.thresholdMinor,
  });

  final WatchKind kind;

  /// The exact category name or payee string being watched — the same
  /// spelling the ledger rows carry, so the match needs no fuzzy layer.
  final String name;

  /// Optional approach-alert ceiling (đồng). Null = no alert, just the
  /// running total — the Simplifi contract keeps the two separable.
  final int? thresholdMinor;

  /// Stable identity: kind+name — two pins on the same name under
  /// different kinds stay distinct.
  String get key => '${kind.name}:$name';
}

/// Month-to-date expense total for [item] over [rows] — rows may span
/// any range; bounds filter inside. Transfers and income never count.
int watchMonthSpend(
  List<Transaction> rows,
  WatchItem item, {
  required DateTime today,
}) {
  final todayDay = dayOnly(today);
  final monthStart = ymd(DateTime(todayDay.year, todayDay.month));
  final end = ymd(todayDay);
  var spent = 0;
  for (final t in rows) {
    if (t.kind != TransactionKind.expense) continue;
    if (t.occurredOn.compareTo(monthStart) < 0 ||
        t.occurredOn.compareTo(end) > 0) {
      continue;
    }
    final matches = switch (item.kind) {
      WatchKind.category => t.category == item.name,
      WatchKind.payee => (t.payee ?? '') == item.name,
    };
    if (matches) spent += t.amount;
  }
  return spent;
}

/// Approach state vs the optional threshold — mirrors the budget card's
/// 80%/100% convention so the two surfaces speak one language. Null
/// threshold → always ok (the tile just shows the total).
enum WatchAlert { ok, near, over }

WatchAlert watchAlert(WatchItem item, int spentMinor) {
  final limit = item.thresholdMinor;
  if (limit == null || limit <= 0) return WatchAlert.ok;
  if (spentMinor >= limit) return WatchAlert.over;
  // Same 80% line the budget alerts use — integer compare, no float.
  if (spentMinor * 5 >= limit * 4) return WatchAlert.near;
  return WatchAlert.ok;
}

/// The tile's one-line state — honest about which side of the line the
/// spend sits on, in the same calm register as the budget alerts.
String watchAlertLabel(WatchItem item, int spentMinor) =>
    switch (watchAlert(item, spentMinor)) {
      WatchAlert.over => 'Đã vượt ngưỡng',
      WatchAlert.near => 'Sắp tới ngưỡng',
      WatchAlert.ok => 'Trong ngưỡng',
    };

/// Distinct expense categories seen in [rows], spend-ranked with a
/// deterministic name tiebreak — the pin picker's option list must be
/// real ledger values, never a preset taxonomy.
List<String> watchCandidateCategories(List<Transaction> rows) {
  final totals = <String, int>{};
  for (final t in rows) {
    if (t.kind != TransactionKind.expense || t.category.isEmpty) continue;
    totals[t.category] = (totals[t.category] ?? 0) + t.amount;
  }
  final ranked = totals.entries.toList()
    ..sort(
      (a, b) => b.value.compareTo(a.value) != 0
          ? b.value.compareTo(a.value)
          : a.key.compareTo(b.key),
    );
  return [for (final e in ranked) e.key];
}

/// Same shape for payees — only expense rows (a payee pin watches where
/// money goes; an income payee pin would read as spend). Blank payees
/// stay out — "Không tên" is not a watchable entity.
List<String> watchCandidatePayees(List<Transaction> rows) {
  final totals = <String, int>{};
  for (final t in rows) {
    final payee = t.payee?.trim() ?? '';
    if (t.kind != TransactionKind.expense || payee.isEmpty) continue;
    totals[payee] = (totals[payee] ?? 0) + t.amount;
  }
  final ranked = totals.entries.toList()
    ..sort(
      (a, b) => b.value.compareTo(a.value) != 0
          ? b.value.compareTo(a.value)
          : a.key.compareTo(b.key),
    );
  return [for (final e in ranked) e.key];
}
