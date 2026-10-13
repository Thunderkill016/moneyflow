import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/commitments.dart';
import 'package:moneyflow/domain/models.dart';

RecurringCommitment _c(
  String id, {
  int dueDay = 15,
  int amountMinor = 300000,
  bool paidThisMonth = false,
  int? paidAmountMinor,
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
