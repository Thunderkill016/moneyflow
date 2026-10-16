import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/budget.dart';
import 'package:moneyflow/domain/events.dart';
import 'package:moneyflow/domain/models.dart';

const _event = EventBudget(
  id: 'e1',
  name: 'Tết 2027',
  startDate: '2027-02-05',
  endDate: '2027-02-12',
  limitMinor: 20000000,
  spentMinor: 8000000,
);

const _scoped = EventBudget(
  id: 'e2',
  name: 'Đám cưới em',
  startDate: '2027-02-05',
  endDate: '2027-02-12',
  limitMinor: 5000000,
  spentMinor: 0,
  categoryIds: ['c1', 'c2'],
);

Transaction _tx({
  String id = 't1',
  TransactionKind kind = TransactionKind.expense,
  String categoryId = 'c1',
  String category = 'Ăn uống',
  int amount = 100000,
  String occurredOn = '2027-02-08',
  List<TransactionSplitLine> splitLines = const [],
  int splitCount = 0,
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: categoryId,
  category: category,
  note: '',
  accountId: 'a1',
  account: 'Tiền mặt',
  amount: amount,
  occurredOn: occurredOn,
  splitCount: splitCount,
  splitLines: splitLines,
);

void main() {
  group('eventPhase', () {
    test('upcoming before start, active inside, closed after end', () {
      expect(
        eventPhase(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-02-04',
        ),
        EventPhase.upcoming,
      );
      expect(
        eventPhase(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-02-05',
        ),
        EventPhase.active,
      );
      expect(
        eventPhase(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-02-12',
        ),
        EventPhase.active,
      );
      expect(
        eventPhase(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-02-13',
        ),
        EventPhase.closed,
      );
    });
  });

  group('day arithmetic', () {
    test('addDaysToYmd rolls month and year boundaries', () {
      expect(addDaysToYmd('2027-02-12', 1), '2027-02-13');
      expect(addDaysToYmd('2027-02-28', 1), '2027-03-01');
      expect(addDaysToYmd('2027-12-31', 1), '2028-01-01');
      expect(addDaysToYmd('2028-02-28', 1), '2028-02-29'); // leap year
      expect(addDaysToYmd('2027-01-01', -1), '2026-12-31');
    });

    test('a one-day event reads 1 total day', () {
      expect(eventTotalDays('2027-02-05', '2027-02-05'), 1);
      expect(eventTotalDays('2027-02-05', '2027-02-12'), 8);
    });

    test('elapsed counts today while running, clamps at both ends', () {
      expect(
        eventDaysElapsed(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-02-01',
        ),
        0,
      );
      expect(
        eventDaysElapsed(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-02-05',
        ),
        1,
      );
      expect(
        eventDaysElapsed(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-02-12',
        ),
        8,
      );
      expect(
        eventDaysElapsed(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-03-01',
        ),
        8,
      );
    });

    test('remaining is what is still ahead inside the window', () {
      expect(
        eventDaysRemaining(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-02-05',
        ),
        7,
      );
      expect(
        eventDaysRemaining(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-02-12',
        ),
        0,
      );
      expect(
        eventDaysRemaining(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-02-20',
        ),
        0,
      );
    });

    test('until-start only counts an unopened window', () {
      expect(
        eventDaysUntilStart(startDate: '2027-02-05', today: '2027-02-01'),
        4,
      );
      expect(
        eventDaysUntilStart(startDate: '2027-02-05', today: '2027-02-05'),
        0,
      );
      expect(
        eventDaysUntilStart(startDate: '2027-02-05', today: '2027-02-10'),
        0,
      );
    });

    test('pace mirrors elapsed fraction, clamped', () {
      expect(
        eventPace(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-01-01',
        ),
        0,
      );
      // Day 5 of an 8-day window: 5/8 elapsed by end of today.
      expect(
        eventPace(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-02-09',
        ),
        5 / 8,
      );
      expect(
        eventPace(
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          today: '2027-03-01',
        ),
        1,
      );
    });
  });

  group('eventSpentOfTransaction', () {
    test('unscoped event counts an in-range expense at its full amount', () {
      expect(eventSpentOfTransaction(_event, _tx(amount: 250000)), 250000);
    });

    test('both window boundaries are inclusive', () {
      expect(
        eventSpentOfTransaction(_event, _tx(occurredOn: '2027-02-05')),
        100000,
      );
      expect(
        eventSpentOfTransaction(_event, _tx(occurredOn: '2027-02-12')),
        100000,
      );
    });

    test('rows before start or after end count nothing', () {
      expect(eventSpentOfTransaction(_event, _tx(occurredOn: '2027-02-04')), 0);
      expect(eventSpentOfTransaction(_event, _tx(occurredOn: '2027-02-13')), 0);
    });

    test('income and transfers never count', () {
      expect(
        eventSpentOfTransaction(_event, _tx(kind: TransactionKind.income)),
        0,
      );
      expect(
        eventSpentOfTransaction(_event, _tx(kind: TransactionKind.transfer)),
        0,
      );
    });

    test('scoped event counts an in-scope single-category expense', () {
      expect(eventSpentOfTransaction(_scoped, _tx(categoryId: 'c2')), 100000);
    });

    test('scoped event skips an out-of-scope expense', () {
      expect(eventSpentOfTransaction(_scoped, _tx(categoryId: 'c9')), 0);
    });

    test('scoped event counts only the in-scope legs of a split', () {
      final split = _tx(
        amount: 300000,
        splitCount: 3,
        splitLines: const [
          TransactionSplitLine(
            categoryId: 'c1',
            category: 'Ăn uống',
            amount: 120000,
          ),
          TransactionSplitLine(
            categoryId: 'c2',
            category: 'Di chuyển',
            amount: 80000,
          ),
          // c9 is outside the scope — its leg stays out of the total.
          TransactionSplitLine(
            categoryId: 'c9',
            category: 'Khác',
            amount: 100000,
          ),
        ],
      );
      expect(eventSpentOfTransaction(_scoped, split), 200000);
    });

    test('unscoped event counts a split at its whole amount', () {
      final split = _tx(
        amount: 300000,
        splitCount: 2,
        splitLines: const [
          TransactionSplitLine(
            categoryId: 'c1',
            category: 'Ăn uống',
            amount: 200000,
          ),
          TransactionSplitLine(
            categoryId: 'c9',
            category: 'Khác',
            amount: 100000,
          ),
        ],
      );
      expect(eventSpentOfTransaction(_event, split), 300000);
    });
  });

  group('eventScopeLabel', () {
    const cats = [
      Category(id: 'c1', name: 'Ăn uống', kind: TransactionKind.expense),
      Category(id: 'c2', name: 'Di chuyển', kind: TransactionKind.expense),
    ];

    test('unscoped reads Tất cả danh mục', () {
      expect(eventScopeLabel(_event, cats), 'Tất cả danh mục');
    });

    test('scoped joins resolved names', () {
      expect(eventScopeLabel(_scoped, cats), 'Ăn uống · Di chuyển');
    });

    test('an unresolvable id degrades to an honest placeholder', () {
      const orphan = EventBudget(
        id: 'e3',
        name: 'x',
        startDate: '2027-02-05',
        endDate: '2027-02-12',
        limitMinor: 1,
        spentMinor: 0,
        categoryIds: ['c-gone'],
      );
      expect(eventScopeLabel(orphan, cats), 'Danh mục đã ẩn');
    });
  });

  group('spend state', () {
    test('reuses the monthly-budget vocabulary — over/near/ok', () {
      expect(_event.spendState, BudgetState.ok);
      expect(
        const EventBudget(
          id: 'e',
          name: 'n',
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          limitMinor: 20000000,
          spentMinor: 17000000,
        ).spendState,
        BudgetState.nearLimit,
      );
      expect(
        const EventBudget(
          id: 'e',
          name: 'n',
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          limitMinor: 20000000,
          spentMinor: 21000000,
        ).spendState,
        BudgetState.over,
      );
    });
  });

  group('eventErrorMessage', () {
    test('maps the RPC tokens to Vietnamese copy', () {
      expect(
        eventErrorMessage(Exception('stale_write'), fallback: 'x'),
        contains('thay đổi ở nơi khác'),
      );
      expect(
        eventErrorMessage(Exception('event_end_before_start'), fallback: 'x'),
        contains('Ngày kết thúc'),
      );
      expect(
        eventErrorMessage(
          Exception('expense_category_required'),
          fallback: 'x',
        ),
        contains('danh mục chi'),
      );
      expect(
        eventErrorMessage(Exception('event_not_found'), fallback: 'x'),
        contains('không còn tồn tại'),
      );
      expect(
        eventErrorMessage(Exception('???'), fallback: 'dự phòng'),
        'dự phòng',
      );
    });
  });
}
