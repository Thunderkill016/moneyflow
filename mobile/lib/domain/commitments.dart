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

final _monthStartPattern = RegExp(r'^\d{4}-\d{2}-01$');

/// Whole months from [fromMonthStart] to [toMonthStart] — positive when
/// the target is later. Both are YYYY-MM-01; a malformed input returns
/// null rather than fabricating a distance.
int? monthDiff(String fromMonthStart, String toMonthStart) {
  if (!_monthStartPattern.hasMatch(fromMonthStart) ||
      !_monthStartPattern.hasMatch(toMonthStart)) {
    return null;
  }
  final fy = int.parse(fromMonthStart.substring(0, 4));
  final fm = int.parse(fromMonthStart.substring(5, 7));
  final ty = int.parse(toMonthStart.substring(0, 4));
  final tm = int.parse(toMonthStart.substring(5, 7));
  return (ty - fy) * 12 + (tm - fm);
}

/// YYYY-MM-01 shifted by [months] whole months — DateTime normalization
/// keeps the year boundary right; null on a malformed input.
String? shiftMonthStart(String monthStart, int months) {
  if (!_monthStartPattern.hasMatch(monthStart)) return null;
  final y = int.parse(monthStart.substring(0, 4));
  final m = int.parse(monthStart.substring(5, 7));
  final d = DateTime(y, m + months);
  return '${d.year}-${d.month.toString().padLeft(2, '0')}-01';
}

/// The month (YYYY-MM-01) the commitment's current due cycle lands in —
/// never after a skipped cycle silently re-anchors: a missed payment
/// stays due now instead of jumping a full interval ahead.
///
/// - `intervalMonths <= 1` (or an unreadable value) → the viewed month:
///   monthly rows are due every month, unchanged contract.
/// - `lastPaidMonth` set → `lastPaidMonth + interval`; a due month
///   already past clamps to the viewed month (overdue, not skipped).
/// - Never paid → the viewed month: the user just declared the
///   commitment, so the first payment establishes the cycle anchor.
String commitmentDueMonth(RecurringCommitment c, {required String monthStart}) {
  if (c.intervalMonths <= 1) return monthStart;
  final last = c.lastPaidMonth;
  if (last == null || !_monthStartPattern.hasMatch(last)) {
    return monthStart;
  }
  final due = shiftMonthStart(last, c.intervalMonths) ?? monthStart;
  return due.compareTo(monthStart) < 0 ? monthStart : due;
}

/// "tháng M/YYYY" — the label style the web's `formatMonthLabel` uses.
String commitmentMonthLabel(String monthStart) =>
    'tháng ${int.parse(monthStart.substring(5, 7))}/'
    '${monthStart.substring(0, 4)}';

/// Cadence chip copy — null for monthly rows (the default needs no
/// label, like the web). "mỗi năm" reads better than "mỗi 12 tháng".
String? commitmentIntervalLabel(int intervalMonths) => switch (intervalMonths) {
  <= 1 => null,
  12 => 'mỗi năm',
  final m => 'mỗi $m tháng',
};

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

  /// A non-monthly commitment whose next cycle lands in a later month —
  /// not due yet, so it cannot be overdue, but it is not paid either.
  scheduled,

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
  // A non-monthly row whose cycle lands in a later month is scheduled,
  // never due/overdue now — "Đến hạn tháng M" is the honest line.
  if (commitmentDueMonth(c, monthStart: monthStart).compareTo(monthStart) > 0) {
    return CommitmentStatus.scheduled;
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

  /// The resolved due month for [CommitmentStatus.scheduled] —
  /// `commitmentDueMonth` on the caller's row. Null falls back to a
  /// generic line rather than naming a month that was not computed.
  String? dueMonth,
  required String Function(int) format,
}) {
  switch (status) {
    case CommitmentStatus.paid:
      return 'Đã trả';
    case CommitmentStatus.paidDifferent:
      return paidAmountMinor == null
          ? 'Đã trả khác số tiền'
          : 'Đã trả khác: ${format(paidAmountMinor)}';
    case CommitmentStatus.scheduled:
      return dueMonth == null
          ? 'Chưa đến kỳ'
          : 'Đến hạn ${commitmentMonthLabel(dueMonth)}';
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
/// due day, then not-yet-due interval rows; every paid state sits at the
/// bottom. Ties break on id so the order is total — Dart's sort is not
/// stable.
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
        CommitmentStatus.scheduled => 3,
        CommitmentStatus.paidDifferent => 4,
        CommitmentStatus.paid => 5,
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

// ── D8 calendar helpers ───────────────────────────────────────────────
// PocketGuard's bill-calendar view: a month grid marking which days have
// a commitment due, with tap-a-day detail. Same string contract as the
// rest of this file — the grid never invents dates; a malformed month
// yields an empty grid, and a due day beyond the month's length only
// marks the day the "tự chuyển thành ngày cuối tháng" rule resolves to.

/// Monday-first cells for `monthStart` (YYYY-MM-01): `null` pads the
/// leading/trailing slots that belong to neighboring months — the grid
/// shows only days this month actually has. Weekday headers are
/// T2…CN, the convention Vietnamese calendars use.
List<int?> commitmentMonthGrid(String monthStart) {
  if (!_monthStartPattern.hasMatch(monthStart)) return const [];
  final year = int.parse(monthStart.substring(0, 4));
  final month = int.parse(monthStart.substring(5, 7));
  // The pattern's `\d{2}` accepts 13-99 — a month outside 1-12 is a
  // malformed input, and DateTime would silently roll it into a later
  // year instead of refusing.
  if (month < 1 || month > 12) return const [];
  final firstWeekday = DateTime(year, month, 1).weekday; // 1=Mon … 7=Sun
  final lastDay = DateTime(year, month + 1, 0).day;
  final cells = <int?>[
    for (var i = 1; i < firstWeekday; i++) null,
    for (var d = 1; d <= lastDay; d++) d,
  ];
  // Round to a full final row so every rendered week holds 7 cells.
  while (cells.length % 7 != 0) {
    cells.add(null);
  }
  return cells;
}

/// The commitments whose resolved due date lands on [day] of
/// [monthStart]. A row counts only when it is actually due this month —
/// a non-monthly commitment whose cycle lands in a later month (status
/// `scheduled`) marks nothing here; its tile already says "Đến hạn
/// tháng M". Pass the ACTIVE list: archived rows are the caller's call.
List<RecurringCommitment> commitmentsDueOnDay(
  List<RecurringCommitment> commitments, {
  required String monthStart,
  required int day,
}) {
  final iso = '${monthStart.substring(0, 8)}${day.toString().padLeft(2, '0')}';
  return [
    for (final c in commitments)
      if (commitmentDueMonth(c, monthStart: monthStart) == monthStart &&
          commitmentDueDate(monthStart, c.dueDay) == iso)
        c,
  ];
}
