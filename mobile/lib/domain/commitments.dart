// Commitment feed status — port of the web's dueDateForMonth +
// commitmentDueTone/commitmentDueLabel (src/lib/planning/commitments.ts,
// src/lib/planning-pages.ts), extended with the Monarch-style "paid a
// different amount" state: the occurrence's ledger transaction can carry
// an amount the commitment no longer declares (edited after paying, or
// the payment itself was corrected in the ledger).
//
// All date math is string-based on YYYY-MM-DD — the same contract the
// feeds use, so tests never depend on the device clock.

import 'models.dart';

/// The commitment's occurrence date inside `monthStart`'s month —
/// `dueDay` clamped to the month's last day (the web's "Ngày 31 tự chuyển
/// thành ngày cuối tháng" rule). Returns null on a malformed month.
String? commitmentDueDate(String monthStart, int dueDay) {
  if (!RegExp(r'^\d{4}-\d{2}-01$').hasMatch(monthStart)) return null;
  if (dueDay < 1 || dueDay > 31) return null;
  final year = int.parse(monthStart.substring(0, 4));
  final month = int.parse(monthStart.substring(5, 7));
  final lastDay = DateTime(year, month + 1, 0).day;
  final day = dueDay <= lastDay ? dueDay : lastDay;
  return '${monthStart.substring(0, 8)}${day.toString().padLeft(2, '0')}';
}

final _isoDatePattern = RegExp(r'^\d{4}-\d{2}-\d{2}$');

/// Whole days from [today] to [dueDate] — negative means overdue. Both
/// are YYYY-MM-DD; UTC parsing keeps DST out of the count, like the web.
/// Returns null on a malformed input rather than throwing — an
/// unreadable date must never become a fabricated "overdue" claim.
int? commitmentDaysUntil(String dueDate, String today) {
  final due = _parseIsoDay(dueDate);
  final now = _parseIsoDay(today);
  if (due == null || now == null) return null;
  return due.difference(now).inDays;
}

/// Strict YYYY-MM-DD → UTC midnight. `DateTime.parse` accepts out-of-range
/// components and silently rolls them into the next month (2026-02-30
/// becomes Mar 2), so the components are validated by hand — an impossible
/// date stays unreadable rather than fabricating a day count.
DateTime? _parseIsoDay(String isoDate) {
  if (!_isoDatePattern.hasMatch(isoDate)) return null;
  final year = int.parse(isoDate.substring(0, 4));
  final month = int.parse(isoDate.substring(5, 7));
  final day = int.parse(isoDate.substring(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  final parsed = DateTime.utc(year, month, day);
  // DateTime normalizes overflows too — confirm nothing rolled over.
  if (parsed.year != year || parsed.month != month || parsed.day != day) {
    return null;
  }
  return parsed;
}

/// Display state of one commitment row for the viewed month — calm bands,
/// always paired with a text label (never color alone).
enum CommitmentStatus {
  /// Past due and unpaid — the row that needs action first.
  overdue,

  /// Unpaid, due date is today.
  dueToday,

  /// Unpaid, due date still ahead.
  upcoming,

  /// An occurrence exists but its ledger amount differs from the
  /// commitment's declared amount — settled, yet worth a glance.
  paidDifferent,

  /// Occurrence exists and its amount matches (or the amount is not
  /// readable — an honest "paid" beats an invented figure).
  paid,
}

/// Resolves the row's status — pure; `today` is a YYYY-MM-DD string so
/// the same input always produces the same state.
///
/// `paidAmountMinor` is the amount the linked payment transaction
/// recorded this month, when the feed could read it. Null means "paid,
/// amount unknown" and stays plain [CommitmentStatus.paid] rather than
/// claiming a difference it cannot show.
CommitmentStatus commitmentStatus(
  RecurringCommitment c, {
  required String monthStart,
  required String today,
}) {
  if (c.paidThisMonth) {
    final paid = c.paidAmountMinor;
    return paid != null && paid != c.amountMinor
        ? CommitmentStatus.paidDifferent
        : CommitmentStatus.paid;
  }
  final due = commitmentDueDate(monthStart, c.dueDay);
  // A malformed month or due-day cannot be judged — the honest fallback
  // is "upcoming", never a fabricated overdue claim.
  if (due == null) return CommitmentStatus.upcoming;
  final days = commitmentDaysUntil(due, today);
  if (days == null) return CommitmentStatus.upcoming;
  if (days < 0) return CommitmentStatus.overdue;
  if (days == 0) return CommitmentStatus.dueToday;
  return CommitmentStatus.upcoming;
}

/// The line under the commitment's name — web vocabulary where the same
/// state exists there ("Quá hạn N ngày", "Đến hạn hôm nay", "Còn N ngày",
/// "Đã trả"). `paidDifferent` names the recorded amount so the row is
/// self-explanatory; [format] is `formatMoney`.
String commitmentStatusLabel(
  CommitmentStatus status, {
  required String monthStart,
  required String today,
  required int dueDay,
  int? paidAmountMinor,
  required String Function(int) format,
}) {
  switch (status) {
    case CommitmentStatus.paid:
      return 'Đã trả';
    case CommitmentStatus.paidDifferent:
      return paidAmountMinor == null
          ? 'Đã trả khác số tiền'
          : 'Đã trả khác: ${format(paidAmountMinor)}';
    case CommitmentStatus.overdue:
    case CommitmentStatus.dueToday:
    case CommitmentStatus.upcoming:
      final due = commitmentDueDate(monthStart, dueDay);
      if (due == null) return 'Chưa đến hạn';
      final days = commitmentDaysUntil(due, today);
      if (days == null) return 'Chưa đến hạn';
      if (days == 0) return 'Đến hạn hôm nay';
      if (days < 0) return 'Quá hạn ${-days} ngày';
      return 'Còn $days ngày';
  }
}

/// Feed ordering — the task contract plus the web's paid-last rule:
/// overdue first (longest wait first), then due-today, then upcoming by
/// due day; every paid state sits at the bottom. Ties break on id so the
/// order is total — Dart's sort is not stable.
List<RecurringCommitment> sortCommitmentsForFeed(
  List<RecurringCommitment> commitments, {
  required String monthStart,
  required String today,
}) {
  int rank(RecurringCommitment c) =>
      switch (commitmentStatus(c, monthStart: monthStart, today: today)) {
        CommitmentStatus.overdue => 0,
        CommitmentStatus.dueToday => 1,
        CommitmentStatus.upcoming => 2,
        CommitmentStatus.paidDifferent => 3,
        CommitmentStatus.paid => 4,
      };

  final sorted = [...commitments];
  sorted.sort((a, b) {
    final byRank = rank(a).compareTo(rank(b));
    if (byRank != 0) return byRank;
    // Within a rank the earlier due day comes first — for overdue rows
    // that puts the longest-waiting payment on top.
    final byDay = a.dueDay.compareTo(b.dueDay);
    return byDay != 0 ? byDay : a.id.compareTo(b.id);
  });
  return sorted;
}
