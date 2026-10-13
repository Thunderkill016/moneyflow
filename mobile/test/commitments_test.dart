import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/commitments.dart';
import 'package:moneyflow/domain/models.dart';

RecurringCommitment _c(
  String id, {
  int dueDay = 15,
  int amountMinor = 300000,
  bool paidThisMonth = false,
  int? paidAmountMinor,
  int intervalMonths = 1,
  String? lastPaidMonth,
}) => RecurringCommitment(
  id: id,
  name: id,
  amountMinor: amountMinor,
  dueDay: dueDay,
  accountId: 'acc-1',
  accountName: 'Bank',
  categoryId: 'cat-1',
  categoryName: 'Hóa đơn',
  paidThisMonth: paidThisMonth,
  paidAmountMinor: paidAmountMinor,
  intervalMonths: intervalMonths,
  lastPaidMonth: lastPaidMonth,
);

void main() {
  group('commitmentDueDate', () {
    test('clamps dueDay 31 to a short month end', () {
      // 2026-02 has 28 days — "Ngày 31 tự chuyển thành ngày cuối tháng".
      expect(commitmentDueDate('2026-02-01', 31), '2026-02-28');
      expect(commitmentDueDate('2026-10-01', 31), '2026-10-31');
      expect(commitmentDueDate('2026-10-01', 5), '2026-10-05');
    });

    test('rejects malformed months and impossible due days', () {
      expect(commitmentDueDate('2026-10-15', 5), isNull);
      expect(commitmentDueDate('2026-10-01', 0), isNull);
      expect(commitmentDueDate('2026-10-01', 32), isNull);
    });
  });

  group('commitmentStatus', () {
    const month = '2026-10-01';

    test(
      'unpaid past due is overdue; due today is dueToday; ahead is upcoming',
      () {
        expect(
          commitmentStatus(
            _c('a', dueDay: 5),
            monthStart: month,
            today: '2026-10-06',
          ),
          CommitmentStatus.overdue,
        );
        expect(
          commitmentStatus(
            _c('a', dueDay: 6),
            monthStart: month,
            today: '2026-10-06',
          ),
          CommitmentStatus.dueToday,
        );
        expect(
          commitmentStatus(
            _c('a', dueDay: 20),
            monthStart: month,
            today: '2026-10-06',
          ),
          CommitmentStatus.upcoming,
        );
      },
    );

    test('paid rows stay paid — even when the due day already passed', () {
      expect(
        commitmentStatus(
          _c('a', dueDay: 1, paidThisMonth: true),
          monthStart: month,
          today: '2026-10-06',
        ),
        CommitmentStatus.paid,
      );
    });

    test('a recorded amount that differs reads paidDifferent', () {
      expect(
        commitmentStatus(
          _c(
            'a',
            amountMinor: 3500000,
            paidThisMonth: true,
            paidAmountMinor: 3800000,
          ),
          monthStart: month,
          today: '2026-10-06',
        ),
        CommitmentStatus.paidDifferent,
      );
      // Same amount → plain paid.
      expect(
        commitmentStatus(
          _c(
            'a',
            amountMinor: 3500000,
            paidThisMonth: true,
            paidAmountMinor: 3500000,
          ),
          monthStart: month,
          today: '2026-10-06',
        ),
        CommitmentStatus.paid,
      );
    });

    test(
      'paid with an unreadable amount stays paid, never claims a difference',
      () {
        expect(
          commitmentStatus(
            _c('a', paidThisMonth: true),
            monthStart: month,
            today: '2026-10-06',
          ),
          CommitmentStatus.paid,
        );
      },
    );

    test('malformed inputs fail to upcoming, never a fabricated overdue', () {
      expect(
        commitmentStatus(
          _c('a', dueDay: 1),
          monthStart: 'not-a-month',
          today: '2026-10-06',
        ),
        CommitmentStatus.upcoming,
      );
      expect(
        commitmentStatus(
          _c('a', dueDay: 1),
          monthStart: month,
          today: '2026-13-99',
        ),
        CommitmentStatus.upcoming,
      );
    });

    test('a yearly row whose next cycle lands later is scheduled — never '
        'overdue on an unpaid month', () {
      expect(
        commitmentStatus(
          _c('a', intervalMonths: 12, lastPaidMonth: '2026-02-01'),
          monthStart: '2026-10-01',
          today: '2026-10-20',
        ),
        CommitmentStatus.scheduled,
      );
    });

    test('a yearly row whose cycle IS this month judges like monthly', () {
      // Paid 2025-10, interval 12 → due again 2026-10; an unpaid row
      // past its day is genuinely overdue.
      expect(
        commitmentStatus(
          _c('a', dueDay: 5, intervalMonths: 12, lastPaidMonth: '2025-10-01'),
          monthStart: '2026-10-01',
          today: '2026-10-06',
        ),
        CommitmentStatus.overdue,
      );
    });

    test('a missed cycle stays due — never silently re-anchored ahead', () {
      // Paid 2025-01, interval 12 → was due 2026-01 and missed; the due
      // month clamps to the viewed month so the row stays overdue.
      final c = _c(
        'a',
        dueDay: 5,
        intervalMonths: 12,
        lastPaidMonth: '2025-01-01',
      );
      expect(commitmentDueMonth(c, monthStart: '2026-10-01'), '2026-10-01');
      expect(
        commitmentStatus(c, monthStart: '2026-10-01', today: '2026-10-06'),
        CommitmentStatus.overdue,
      );
    });
  });

  group('commitmentDueMonth', () {
    test('monthly rows are always due in the viewed month', () {
      final c = _c('a', intervalMonths: 1, lastPaidMonth: '2025-01-01');
      expect(commitmentDueMonth(c, monthStart: '2026-10-01'), '2026-10-01');
    });

    test('interval + last paid derives the next cycle month', () {
      final c = _c('a', intervalMonths: 12, lastPaidMonth: '2026-02-01');
      expect(commitmentDueMonth(c, monthStart: '2026-10-01'), '2027-02-01');
      final q = _c('a', intervalMonths: 3, lastPaidMonth: '2026-08-01');
      expect(commitmentDueMonth(q, monthStart: '2026-10-01'), '2026-11-01');
    });

    test('never-paid non-monthly rows are due now — first pay anchors', () {
      final c = _c('a', intervalMonths: 12);
      expect(commitmentDueMonth(c, monthStart: '2026-10-01'), '2026-10-01');
    });

    test('an unreadable lastPaidMonth anchors like never-paid', () {
      final c = _c('a', intervalMonths: 6, lastPaidMonth: 'not-a-month');
      expect(commitmentDueMonth(c, monthStart: '2026-10-01'), '2026-10-01');
    });
  });

  group('commitmentIntervalLabel', () {
    test('monthly needs no label; named cadences read Vietnamese', () {
      expect(commitmentIntervalLabel(1), isNull);
      expect(commitmentIntervalLabel(0), isNull);
      expect(commitmentIntervalLabel(3), 'mỗi 3 tháng');
      expect(commitmentIntervalLabel(6), 'mỗi 6 tháng');
      expect(commitmentIntervalLabel(12), 'mỗi năm');
      expect(commitmentIntervalLabel(24), 'mỗi 24 tháng');
    });
  });

  group('commitmentStatusLabel', () {
    const month = '2026-10-01';
    String fmt(int v) => '$v₫';

    test('unpaid rows name the wait in Vietnamese', () {
      expect(
        commitmentStatusLabel(
          CommitmentStatus.overdue,
          monthStart: month,
          today: '2026-10-06',
          dueDay: 5,
          format: fmt,
        ),
        'Quá hạn 1 ngày',
      );
      expect(
        commitmentStatusLabel(
          CommitmentStatus.dueToday,
          monthStart: month,
          today: '2026-10-06',
          dueDay: 6,
          format: fmt,
        ),
        'Đến hạn hôm nay',
      );
      expect(
        commitmentStatusLabel(
          CommitmentStatus.upcoming,
          monthStart: month,
          today: '2026-10-06',
          dueDay: 20,
          format: fmt,
        ),
        'Còn 14 ngày',
      );
    });

    test('paid-different names the recorded amount when known', () {
      expect(
        commitmentStatusLabel(
          CommitmentStatus.paidDifferent,
          monthStart: month,
          today: '2026-10-06',
          dueDay: 5,
          paidAmountMinor: 3800000,
          format: fmt,
        ),
        'Đã trả khác: 3800000₫',
      );
      // Unreadable amount → the honest generic label, no invented figure.
      expect(
        commitmentStatusLabel(
          CommitmentStatus.paidDifferent,
          monthStart: month,
          today: '2026-10-06',
          dueDay: 5,
          format: fmt,
        ),
        'Đã trả khác số tiền',
      );
    });

    test('clamped due days still label against the real month end', () {
      // dueDay 31 in February → due 28th; seen from Mar 1 that's 1 day late.
      expect(
        commitmentStatusLabel(
          CommitmentStatus.overdue,
          monthStart: '2026-02-01',
          today: '2026-03-01',
          dueDay: 31,
          format: fmt,
        ),
        'Quá hạn 1 ngày',
      );
    });

    test('scheduled names the real due month, never "Còn N ngày"', () {
      expect(
        commitmentStatusLabel(
          CommitmentStatus.scheduled,
          monthStart: month,
          today: '2026-10-06',
          dueDay: 5,
          dueMonth: '2027-02-01',
          format: fmt,
        ),
        'Đến hạn tháng 2/2027',
      );
      // No due month computed → generic honest line, not an invented one.
      expect(
        commitmentStatusLabel(
          CommitmentStatus.scheduled,
          monthStart: month,
          today: '2026-10-06',
          dueDay: 5,
          format: fmt,
        ),
        'Chưa đến kỳ',
      );
    });
  });

  group('sortCommitmentsForFeed', () {
    test('orders overdue → due today → upcoming → paid', () {
      const month = '2026-10-01';
      const today = '2026-10-10';
      final sorted = sortCommitmentsForFeed(
        [
          _c('paid', dueDay: 1, paidThisMonth: true),
          _c('upcoming', dueDay: 25),
          _c('paid-diff', dueDay: 2, paidThisMonth: true, paidAmountMinor: 1),
          _c('overdue-late', dueDay: 8),
          _c('today', dueDay: 10),
          _c('overdue-early', dueDay: 3),
        ],
        monthStart: month,
        today: today,
      );
      expect(sorted.map((c) => c.id).toList(), [
        // Within overdue the earlier due day (longest wait) leads.
        'overdue-early',
        'overdue-late',
        'today',
        'upcoming',
        // Paid states sink to the bottom; the "khác" row surfaces first.
        'paid-diff',
        'paid',
      ]);
    });

    test('scheduled rows sort after upcoming, before paid', () {
      const month = '2026-10-01';
      const today = '2026-10-10';
      final sorted = sortCommitmentsForFeed(
        [
          _c('paid', dueDay: 1, paidThisMonth: true),
          _c(
            'yearly',
            intervalMonths: 12,
            lastPaidMonth: '2026-05-01',
            dueDay: 3,
          ),
          _c('upcoming', dueDay: 25),
          _c('overdue', dueDay: 4),
        ],
        monthStart: month,
        today: today,
      );
      expect(sorted.map((c) => c.id).toList(), [
        'overdue',
        'upcoming',
        'yearly',
        'paid',
      ]);
    });

    test('sorting is total — equal rank and day break on id', () {
      const month = '2026-10-01';
      const today = '2026-10-10';
      final sorted = sortCommitmentsForFeed(
        [_c('b', dueDay: 20), _c('a', dueDay: 20)],
        monthStart: month,
        today: today,
      );
      expect(sorted.map((c) => c.id).toList(), ['a', 'b']);
    });

    test('does not mutate the input list', () {
      const month = '2026-10-01';
      const today = '2026-10-10';
      final input = [_c('x', dueDay: 25), _c('y', dueDay: 1)];
      sortCommitmentsForFeed(input, monthStart: month, today: today);
      expect(input.map((c) => c.id).toList(), ['x', 'y']);
    });
  });
}
