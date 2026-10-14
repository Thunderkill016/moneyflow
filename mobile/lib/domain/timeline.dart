import 'models.dart';

/// Read-only "đã duyệt" ledger boundary — mirrors the web timeline
/// (src/components/transactions/timeline-workspace.tsx). Rows are grouped
/// by occurred_on in feed order (already desc); only reviewed rows count.
class TimelineDayGroup {
  const TimelineDayGroup({
    required this.date,
    required this.label,
    required this.displayDate,
    required this.transactions,
    required this.netForDay,
  });

  /// YYYY-MM-DD key.
  final String date;

  /// "Hôm nay" / "Hôm qua" / dd/MM/yyyy.
  final String label;

  /// dd/MM/yyyy for display.
  final String displayDate;

  final List<Transaction> transactions;

  /// income − expense for the day; transfers never count.
  final int netForDay;
}

class TimelineTotals {
  const TimelineTotals({
    required this.count,
    required this.income,
    required this.expense,
    required this.net,
  });

  final int count;
  final int income;
  final int expense;
  final int net;
}

String _ddMMyyyy(String occurredOn) {
  final parts = occurredOn.split('-');
  if (parts.length != 3) return occurredOn;
  return '${parts[2]}/${parts[1]}/${parts[0]}';
}

String _relativeLabel(String occurredOn, String today) {
  if (occurredOn == today) return 'Hôm nay';
  final t = DateTime.tryParse(today);
  final d = DateTime.tryParse(occurredOn);
  if (t != null && d != null && t.difference(d).inDays == 1) return 'Hôm qua';
  return _ddMMyyyy(occurredOn);
}

/// Groups the reviewed subset of [rows] by day. [today] is YYYY-MM-DD —
/// the caller passes the Vietnam date so "Hôm nay" matches the ledger's
/// timezone, not the device's.
List<TimelineDayGroup> timelineDayGroups(
  List<Transaction> rows, {
  required String today,
}) {
  final groups = <TimelineDayGroup>[];
  final byDate = <String, int>{}; // date -> index into groups
  final nets = <String, int>{};
  final txs = <String, List<Transaction>>{};
  for (final t in rows) {
    if (t.reviewStatus != TransactionReviewStatus.reviewed) continue;
    if (!byDate.containsKey(t.occurredOn)) {
      byDate[t.occurredOn] = groups.length;
      groups.add(
        TimelineDayGroup(
          date: t.occurredOn,
          label: _relativeLabel(t.occurredOn, today),
          displayDate: _ddMMyyyy(t.occurredOn),
          transactions: const [],
          netForDay: 0,
        ),
      );
      nets[t.occurredOn] = 0;
      txs[t.occurredOn] = [];
    }
    txs[t.occurredOn]!.add(t);
    if (t.kind == TransactionKind.income) {
      nets[t.occurredOn] = nets[t.occurredOn]! + t.amount;
    } else if (t.kind == TransactionKind.expense) {
      nets[t.occurredOn] = nets[t.occurredOn]! - t.amount;
    }
  }
  return [
    for (final g in groups)
      TimelineDayGroup(
        date: g.date,
        label: g.label,
        displayDate: g.displayDate,
        transactions: txs[g.date]!,
        netForDay: nets[g.date]!,
      ),
  ];
}

/// Summary over the reviewed subset — the same "Tiền vào / Tiền ra /
/// Còn lại" chips the web timeline shows.
TimelineTotals timelineTotals(List<Transaction> rows) {
  var income = 0, expense = 0, count = 0;
  for (final t in rows) {
    if (t.reviewStatus != TransactionReviewStatus.reviewed) continue;
    count += 1;
    if (t.kind == TransactionKind.income) income += t.amount;
    if (t.kind == TransactionKind.expense) expense += t.amount;
  }
  return TimelineTotals(
    count: count,
    income: income,
    expense: expense,
    net: income - expense,
  );
}
