// Savings-goal projection — the pure module behind the planning tile's
// "Dự kiến đạt M/YYYY" line. All cases inject `today` so the math is
// fixed; a row that cannot produce an honest pace reports noRate.

import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/goal_projection.dart';

void main() {
  final today = DateTime(2026, 10, 15);

  group('estimateGoalMonthlyRate', () {
    test('spreads the allocated total over the elapsed span', () {
      // 122 days since 2026-06-15 ≈ 4.008 months → ~2.121tr/month.
      final rate = estimateGoalMonthlyRate(
        contributedMinor: 8500000,
        createdAt: '2026-06-15',
        today: today,
      );
      expect(rate, 2120820);
    });

    test('null when there is no honest span or no contribution', () {
      expect(
        estimateGoalMonthlyRate(
          contributedMinor: 8500000,
          createdAt: null,
          today: today,
        ),
        isNull,
      );
      expect(
        estimateGoalMonthlyRate(
          contributedMinor: 8500000,
          createdAt: 'not-a-date',
          today: today,
        ),
        isNull,
      );
      // A same-day goal's rate would be a same-day artifact — say so.
      expect(
        estimateGoalMonthlyRate(
          contributedMinor: 8500000,
          createdAt: '2026-10-15',
          today: today,
        ),
        isNull,
      );
      expect(
        estimateGoalMonthlyRate(
          contributedMinor: 0,
          createdAt: '2026-06-15',
          today: today,
        ),
        isNull,
      );
      // A future-dated created_at (clock skew) has no elapsed span.
      expect(
        estimateGoalMonthlyRate(
          contributedMinor: 8500000,
          createdAt: '2027-01-01',
          today: today,
        ),
        isNull,
      );
    });
  });

  group('projectGoalCompletion', () {
    test('funded goals are complete — nothing left to project', () {
      final p = projectGoalCompletion(
        targetMinor: 5000000,
        contributedMinor: 5000000,
        monthlyRateMinor: 1000000,
        today: today,
      );
      expect(p.status, GoalProjectionStatus.complete);
      expect(goalProjectionLabel(p), 'Đã đạt mục tiêu');
    });

    test('no rate never invents a date', () {
      final p = projectGoalCompletion(
        targetMinor: 5000000,
        contributedMinor: 0,
        monthlyRateMinor: null,
        today: today,
      );
      expect(p.status, GoalProjectionStatus.noRate);
      expect(p.projectedOn, isNull);
      expect(goalProjectionLabel(p), 'Chưa đủ dữ liệu để dự kiến');
    });

    test('on track: ceil(remaining / (rate/30.44)) days out', () {
      // remaining 2.000.000 at 1.000.000/month → 61 days → 2026-12-15.
      final p = projectGoalCompletion(
        targetMinor: 3000000,
        contributedMinor: 1000000,
        deadline: '2027-01-01',
        monthlyRateMinor: 1000000,
        today: today,
      );
      expect(p.status, GoalProjectionStatus.onTrack);
      expect(p.projectedOn, '2026-12-15');
      expect(p.hasDeadline, isTrue);
      expect(goalProjectionLabel(p), 'Dự kiến đạt 12/2026 · đúng tiến độ');
    });

    test('no deadline reports the date without a pace verdict', () {
      final p = projectGoalCompletion(
        targetMinor: 3000000,
        contributedMinor: 1000000,
        monthlyRateMinor: 1000000,
        today: today,
      );
      expect(p.status, GoalProjectionStatus.onTrack);
      expect(p.hasDeadline, isFalse);
      expect(goalProjectionLabel(p), 'Dự kiến đạt 12/2026');
    });

    test('a malformed deadline degrades to the deadline-less answer', () {
      final p = projectGoalCompletion(
        targetMinor: 3000000,
        contributedMinor: 1000000,
        deadline: 'March-ish',
        monthlyRateMinor: 1000000,
        today: today,
      );
      expect(p.status, GoalProjectionStatus.onTrack);
      expect(p.hasDeadline, isFalse);
    });

    test('at risk: projection past the deadline names the slip', () {
      // remaining 9.000.000 at 1.000.000/month → 274 days → 2027-07-16,
      // 257 days past the 2026-11-01 deadline ≈ 8 months.
      final p = projectGoalCompletion(
        targetMinor: 10000000,
        contributedMinor: 1000000,
        deadline: '2026-11-01',
        monthlyRateMinor: 1000000,
        today: today,
      );
      expect(p.status, GoalProjectionStatus.atRisk);
      expect(p.projectedOn, '2027-07-16');
      expect(p.daysPastDeadline, 257);
      expect(goalProjectionLabel(p), 'Dự kiến đạt 7/2027 · chậm ~8 tháng');
    });

    test('a sub-month slip still says chậm ~1 tháng, not 0', () {
      // ~4.008 months elapsed → rate 2.120.820; remaining 11.5tr projects
      // to 2027-03-30 — 29 days past the deadline.
      final p = projectGoalCompletion(
        targetMinor: 20000000,
        contributedMinor: 8500000,
        deadline: '2027-03-01',
        monthlyRateMinor: 2120820,
        today: today,
      );
      expect(p.status, GoalProjectionStatus.atRisk);
      expect(p.projectedOn, '2027-03-30');
      expect(goalProjectionLabel(p), 'Dự kiến đạt 3/2027 · chậm ~1 tháng');
    });
  });
}
