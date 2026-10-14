import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/recurring_detection.dart';

/// Fixed "today" for every detection test — 2026-10-20 — so recency and
/// month buckets never depend on the day the suite runs.
final _today = DateTime(2026, 10, 20);

Transaction _tx({
  required String id,
  TransactionKind kind = TransactionKind.expense,
  String note = '',
  String? payee,
  String categoryId = 'cat-bills',
  String accountId = 'acc-1',
  int amount = 480000,
  required String occurredOn,
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: categoryId,
  category: 'Hóa đơn',
  note: note,
  accountId: accountId,
  account: 'Ngân hàng',
  amount: amount,
  occurredOn: occurredOn,
  payee: payee,
);

RecurringCommitment _commitment({
  String name = 'Tiền điện',
  int amountMinor = 490000,
  String categoryId = 'cat-bills',
  String accountId = 'acc-1',
}) => RecurringCommitment(
  id: 'cm-1',
  name: name,
  amountMinor: amountMinor,
  dueDay: 5,
  accountId: accountId,
  accountName: 'Ngân hàng',
  categoryId: categoryId,
  categoryName: 'Hóa đơn',
);

/// The canonical monthly bill — "Tiền điện tháng N" on days 4–6 across
/// Aug/Sep/Oct with amounts drifting inside ±10%.
List<Transaction> _electricBill() => [
  _tx(
    id: '1',
    note: 'Tiền điện tháng 8',
    amount: 480000,
    occurredOn: '2026-08-05',
  ),
  _tx(
    id: '2',
    note: 'Tiền điện tháng 9',
    amount: 500000,
    occurredOn: '2026-09-04',
  ),
  _tx(
    id: '3',
    note: 'Tiền điện tháng 10',
    amount: 490000,
    occurredOn: '2026-10-06',
  ),
];

void main() {
  group('detectRecurring', () {
    test('monthly bill across 3 months → one suggestion with medians', () {
      final suggestions = detectRecurring(_electricBill(), {}, today: _today);
      expect(suggestions, hasLength(1));
      final s = suggestions.single;
      // Newest note minus its "tháng 10" marker.
      expect(s.name, 'Tiền điện');
      expect(s.amount, 490000); // median of 480/500/490
      expect(s.dayOfMonth, 5); // median of 5/4/6
      expect(s.occurrenceCount, 3);
      expect(s.months, ['2026-08', '2026-09', '2026-10']);
      expect(s.lastSeen, '2026-10-06');
      expect(s.categoryId, 'cat-bills');
      expect(s.accountId, 'acc-1');
      // Dismissal key: 8-hex, amount-insensitive by contract.
      expect(s.key, matches(RegExp(r'^[0-9a-f]{8}$')));
    });

    test('two occurrences is not a pattern', () {
      final suggestions = detectRecurring(
        _electricBill().sublist(0, 2),
        {},
        today: _today,
      );
      expect(suggestions, isEmpty);
    });

    test('three occurrences inside one month chain-collapse to one', () {
      final suggestions = detectRecurring(
        [
          _tx(id: '1', note: 'Tiền điện', occurredOn: '2026-10-05'),
          _tx(id: '2', note: 'Tiền điện', occurredOn: '2026-10-12'),
          _tx(id: '3', note: 'Tiền điện', occurredOn: '2026-10-19'),
        ],
        {},
        today: _today,
      );
      expect(suggestions, isEmpty);
    });

    test('scattered day-of-month is rejected by the ±2 day window', () {
      final suggestions = detectRecurring(
        [
          _tx(id: '1', note: 'Tiền điện', occurredOn: '2026-08-05'),
          _tx(id: '2', note: 'Tiền điện', occurredOn: '2026-09-12'),
          _tx(id: '3', note: 'Tiền điện', occurredOn: '2026-10-20'),
        ],
        {},
        today: _today,
      );
      expect(suggestions, isEmpty);
    });

    test('weekly frequency never forms a monthly chain', () {
      // Aug 3,10,17,24,31 + Sep 7,14,21 — every gap is 7d, so the whole
      // series absorbs into a single-chain anchor and fails the month count.
      final rows = [
        for (final d in [
          '2026-08-03',
          '2026-08-10',
          '2026-08-17',
          '2026-08-24',
          '2026-08-31',
          '2026-09-07',
          '2026-09-14',
          '2026-09-21',
        ])
          _tx(id: d, note: 'Nạp điện thoại', occurredOn: d),
      ];
      final suggestions = detectRecurring(rows, {}, today: _today);
      expect(suggestions, isEmpty);
    });

    test('amounts outside ±10% of the median are not occurrences', () {
      final suggestions = detectRecurring(
        [
          _tx(
            id: '1',
            note: 'Tiền điện',
            amount: 480000,
            occurredOn: '2026-08-05',
          ),
          _tx(
            id: '2',
            note: 'Tiền điện',
            amount: 490000,
            occurredOn: '2026-09-04',
          ),
          _tx(
            id: '3',
            note: 'Tiền điện',
            amount: 900000,
            occurredOn: '2026-10-06',
          ),
        ],
        {},
        today: _today,
      );
      expect(suggestions, isEmpty);
    });

    test('income and transfer rows are never candidates', () {
      final suggestions = detectRecurring(
        [
          _tx(
            id: '1',
            kind: TransactionKind.income,
            note: 'Lương',
            occurredOn: '2026-08-05',
          ),
          _tx(
            id: '2',
            kind: TransactionKind.income,
            note: 'Lương',
            occurredOn: '2026-09-05',
          ),
          _tx(
            id: '3',
            kind: TransactionKind.income,
            note: 'Lương',
            occurredOn: '2026-10-05',
          ),
          _tx(
            id: '4',
            kind: TransactionKind.transfer,
            note: 'Tiết kiệm',
            occurredOn: '2026-08-05',
          ),
          _tx(
            id: '5',
            kind: TransactionKind.transfer,
            note: 'Tiết kiệm',
            occurredOn: '2026-09-05',
          ),
          _tx(
            id: '6',
            kind: TransactionKind.transfer,
            note: 'Tiết kiệm',
            occurredOn: '2026-10-05',
          ),
        ],
        {},
        today: _today,
      );
      expect(suggestions, isEmpty);
    });

    test('a same-named active commitment suppresses the suggestion', () {
      final keys = recurringCommitmentKeys(_commitment(name: 'Tiền điện'));
      final suggestions = detectRecurring(_electricBill(), keys, today: _today);
      expect(suggestions, isEmpty);
    });

    test(
      'a differently-named commitment still covers via category+account+amount',
      () {
        // The user declared the bill as "EVN HCMC" — the name key misses,
        // the (category, account, amount) coverage key still suppresses.
        final keys = recurringCommitmentKeys(
          _commitment(name: 'EVN HCMC', amountMinor: 490000),
        );
        final suggestions = detectRecurring(
          _electricBill(),
          keys,
          today: _today,
        );
        expect(suggestions, isEmpty);
      },
    );

    test('a pattern that stopped >62 days ago is dead, not recurring', () {
      final suggestions = detectRecurring(
        [
          _tx(id: '1', note: 'Tiền điện', occurredOn: '2026-01-05'),
          _tx(id: '2', note: 'Tiền điện', occurredOn: '2026-02-04'),
          _tx(id: '3', note: 'Tiền điện', occurredOn: '2026-03-06'),
        ],
        {},
        today: _today,
      );
      expect(suggestions, isEmpty);
    });

    test('payee-only rows still group and suggest', () {
      final suggestions = detectRecurring(
        [
          _tx(
            id: '1',
            payee: 'Netflix',
            amount: 260000,
            occurredOn: '2026-08-10',
          ),
          _tx(
            id: '2',
            payee: 'Netflix',
            amount: 260000,
            occurredOn: '2026-09-10',
          ),
          _tx(
            id: '3',
            payee: 'Netflix',
            amount: 260000,
            occurredOn: '2026-10-11',
          ),
        ],
        {},
        today: _today,
      );
      expect(suggestions, hasLength(1));
      expect(suggestions.single.name, 'Netflix');
      expect(suggestions.single.amount, 260000);
      expect(suggestions.single.dayOfMonth, 10);
    });

    test('a same-cycle duplicate payment is absorbed, not a second month', () {
      final suggestions = detectRecurring(
        [
          _tx(id: '1', note: 'Tiền điện', occurredOn: '2026-08-05'),
          _tx(id: '2', note: 'Tiền điện', occurredOn: '2026-08-07'),
          _tx(id: '3', note: 'Tiền điện', occurredOn: '2026-09-04'),
          _tx(id: '4', note: 'Tiền điện', occurredOn: '2026-10-06'),
        ],
        {},
        today: _today,
      );
      expect(suggestions, hasLength(1));
      expect(suggestions.single.occurrenceCount, 3);
      expect(suggestions.single.months, ['2026-08', '2026-09', '2026-10']);
    });

    test('more than three patterns are capped by recency', () {
      List<Transaction> monthly(String name, int amount) => [
        _tx(
          id: '$name-1',
          note: name,
          amount: amount,
          occurredOn: '2026-08-05',
        ),
        _tx(
          id: '$name-2',
          note: name,
          amount: amount,
          occurredOn: '2026-09-05',
        ),
        _tx(
          id: '$name-3',
          note: name,
          amount: amount,
          occurredOn: '2026-10-05',
        ),
      ];
      final suggestions = detectRecurring(
        [
          ...monthly('Tiền điện', 480000),
          ...monthly('Internet', 250000),
          ...monthly('Tiền nước', 150000),
          // Newest last-seen — should sort first.
          _tx(id: 'x1', note: 'Gym', amount: 300000, occurredOn: '2026-08-15'),
          _tx(id: 'x2', note: 'Gym', amount: 300000, occurredOn: '2026-09-15'),
          _tx(id: 'x3', note: 'Gym', amount: 300000, occurredOn: '2026-10-15'),
        ],
        {},
        today: _today,
      );
      expect(suggestions, hasLength(maxRecurringSuggestions));
      expect(suggestions.first.name, 'Gym');
    });
  });

  group('recurringCommitmentKeys', () {
    test('emits a name key and a coverage key', () {
      final keys = recurringCommitmentKeys(
        _commitment(name: 'Tiền điện', amountMinor: 490000),
      );
      expect(keys, contains('n|tiền điện'));
      expect(keys, contains('c|cat-bills|acc-1|490000'));
    });
  });
}
