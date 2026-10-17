// Savings-goal on-track projection — a pure, deterministic estimate of
// when a goal completes at its observed contribution pace, and whether
// that lands inside the deadline.
//
// Honesty boundary: public.savings_goals carries only target_minor,
// allocated_minor, deadline and created_at — no contribution cadence,
// no started_at, no per-allocation history on this read path. The only
// defensible rate is "allocated ÷ elapsed since created_at"; when even
// that cannot be computed the projection says so (no_rate) instead of
// inventing a pace.

import 'report.dart' show daysBetween, dateAdd, ymd, dayOnly;

/// Average month length in days (365.25 / 12) — the convention the
/// remaining ÷ (rate/30.44) formula uses.
const avgDaysPerMonth = 30.44;

enum GoalProjectionStatus {
  /// contributedMinor >= targetMinor — nothing left to project.
  complete,

  /// A rate exists and the projected date lands on/before the deadline
  /// (or there is no deadline — the date alone is the answer).
  onTrack,

  /// A rate exists but the projected date lands past the deadline.
  atRisk,

  /// The contribution rate cannot be computed — the UI must say
  /// "chưa đủ dữ liệu" rather than guess a date.
  noRate,
}

class GoalProjection {
  const GoalProjection({
    required this.status,
    this.projectedOn,
    this.hasDeadline = false,
    this.daysPastDeadline,
  });

  final GoalProjectionStatus status;

  /// YYYY-MM-DD the goal completes at the current pace — null for
  /// [GoalProjectionStatus.complete] and [GoalProjectionStatus.noRate].
  final String? projectedOn;

  /// Whether a deadline constrained the verdict — the label only claims
  /// "đúng tiến độ"/"chậm hạn" when one did.
  final bool hasDeadline;

  /// Whole days between the deadline and the projection — set only on
  /// [GoalProjectionStatus.atRisk].
  final int? daysPastDeadline;
}

/// Estimated đồng-per-month pace of a goal: [contributedMinor] spread
/// over the real elapsed span since [createdAt] (the goal's stored
/// created_at). Null when there is no honest span — a missing/invalid
/// timestamp, a goal younger than a day (any rate there is a same-day
/// artifact), or nothing allocated at all.
int? estimateGoalMonthlyRate({
  required int contributedMinor,
  required String? createdAt,
  required DateTime today,
}) {
  if (contributedMinor <= 0) return null;
  final created = createdAt == null ? null : DateTime.tryParse(createdAt);
  if (created == null) return null;
  final elapsed = daysBetween(dayOnly(created.toLocal()), dayOnly(today));
  if (elapsed < 1) return null;
  // allocated / elapsed months — integer đồng, rounded to whole đồng.
  return (contributedMinor / (elapsed / avgDaysPerMonth)).round();
}

/// Projects a goal's completion: `days = ceil(remaining / (rate/30.44))`
/// ahead of [today], then compares against [deadline] (YYYY-MM-DD).
///
/// Deterministic: [today] is injected so tests and rebuilds agree. A
/// deadline already past with money still missing is simply at_risk —
/// the projection stays honest about when the pace would finish.
GoalProjection projectGoalCompletion({
  required int targetMinor,
  required int contributedMinor,
  String? deadline,
  int? monthlyRateMinor,
  required DateTime today,
}) {
  final remaining = targetMinor - contributedMinor;
  if (remaining <= 0) {
    return const GoalProjection(status: GoalProjectionStatus.complete);
  }
  if (monthlyRateMinor == null || monthlyRateMinor <= 0) {
    return const GoalProjection(status: GoalProjectionStatus.noRate);
  }
  final todayDay = dayOnly(today);
  final days = (remaining / (monthlyRateMinor / avgDaysPerMonth)).ceil();
  final projected = dateAdd(todayDay, days);
  // tryParse over parseYmd — a malformed stored deadline must not crash
  // a page render; it degrades to the deadline-less answer.
  final deadlineDay = deadline == null ? null : DateTime.tryParse(deadline);
  if (deadlineDay == null) {
    return GoalProjection(
      status: GoalProjectionStatus.onTrack,
      projectedOn: ymd(projected),
    );
  }
  if (!projected.isAfter(deadlineDay)) {
    return GoalProjection(
      status: GoalProjectionStatus.onTrack,
      projectedOn: ymd(projected),
      hasDeadline: true,
    );
  }
  return GoalProjection(
    status: GoalProjectionStatus.atRisk,
    projectedOn: ymd(projected),
    hasDeadline: true,
    daysPastDeadline: daysBetween(deadlineDay, projected),
  );
}

/// One-line Vietnamese summary for the goal tile — "Dự kiến đạt M/YYYY"
/// plus a pace verdict only when a deadline constrains it. The estimate
/// honestly carries month granularity; nothing invents a finer date.
String goalProjectionLabel(GoalProjection p) {
  switch (p.status) {
    case GoalProjectionStatus.complete:
      return 'Đã đạt mục tiêu';
    case GoalProjectionStatus.noRate:
      return 'Chưa đủ dữ liệu để dự kiến';
    case GoalProjectionStatus.onTrack:
      final base = 'Dự kiến đạt ${_monthYear(p.projectedOn!)}';
      return p.hasDeadline ? '$base · đúng tiến độ' : base;
    case GoalProjectionStatus.atRisk:
      final months = ((p.daysPastDeadline ?? 0) / avgDaysPerMonth).round();
      return 'Dự kiến đạt ${_monthYear(p.projectedOn!)} · '
          'chậm ~${months < 1 ? 1 : months} tháng';
  }
}

/// "M/YYYY" of a YYYY-MM-DD projection.
String _monthYear(String day) =>
    '${int.parse(day.substring(5, 7))}/${day.substring(0, 4)}';

/// D11 prerequisite honesty — the concrete pieces a pace verdict still
/// needs, in the order a reader would ask. A fully-paced goal returns
/// empty; the detail sheet lists these instead of a bare "chưa đủ dữ
/// liệu" so the reader knows which missing input blocks the verdict.
/// Nothing here invents a substitute number.
List<String> goalMissingPrerequisites({
  required int contributedMinor,
  required String? deadline,
  required String? createdAt,
  required DateTime today,
}) {
  final missing = <String>[];
  if (contributedMinor <= 0) {
    missing.add('Chưa có lần nạp nào — nạp để bắt đầu đo tiến độ.');
  } else {
    final created = createdAt == null ? null : DateTime.tryParse(createdAt);
    if (created == null ||
        daysBetween(dayOnly(created.toLocal()), dayOnly(today)) < 1) {
      missing.add('Cần ít nhất một ngày sau lần nạp đầu để ước tính nhịp.');
    }
  }
  if (deadline == null || deadline.isEmpty) {
    missing.add(
      'Chưa đặt hạn — dự kiến chỉ là ước tính, không đo được đúng/chậm.',
    );
  }
  return missing;
}
