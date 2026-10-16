import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/report.dart';

/// Feed rows keyed by the (name, id) pair the backend would send — the
/// breakdown groups on the stored id now, so each display name gets a
/// matching distinct id; sharing one id across different names would be
/// inconsistent feed data and rightly merges.
Transaction tx(
  TransactionKind kind,
  int amount, {
  String category = 'X',
  String account = 'A',
  String? payee,
}) => Transaction(
  id: 't',
  kind: kind,
  categoryId: 'c-$category',
  category: category,
  note: '',
  accountId: 'a-$account',
  account: account,
  amount: amount,
  occurredOn: '2026-10-01',
  payee: payee,
);

void main() {
  group('buildPeriodReport', () {
    test('sums income and expense, excludes transfers', () {
      final r = buildPeriodReport([
        tx(TransactionKind.income, 15000000),
        tx(TransactionKind.expense, 45000),
        tx(TransactionKind.expense, 32000),
        tx(TransactionKind.transfer, 500000),
      ]);
      expect(r.income, 15000000);
      expect(r.expense, 77000);
      expect(r.net, 14923000);
      expect(r.transactionCount, 4);
    });

    test(
      'savingsRatePercent mirrors web rounding; null when income is zero',
      () {
        // net/income = (1tr-700k)/1tr = 30%
        final withIncome = buildPeriodReport([
          tx(TransactionKind.income, 1000000),
          tx(TransactionKind.expense, 700000),
        ]);
        expect(withIncome.savingsRatePercent, 30);

        final noIncome = buildPeriodReport([tx(TransactionKind.expense, 1000)]);
        expect(noIncome.savingsRatePercent, isNull);

        // 1/3 -> 33% (Math.round equivalence)
        final third = buildPeriodReport([
          tx(TransactionKind.income, 3000),
          tx(TransactionKind.expense, 2000),
        ]);
        expect(third.savingsRatePercent, 33);
      },
    );

    test('category shares sorted desc with rounded percent', () {
      final r = buildPeriodReport([
        tx(TransactionKind.expense, 50000, category: 'Ăn uống'),
        tx(TransactionKind.expense, 30000, category: 'Di chuyển'),
        tx(TransactionKind.expense, 20000, category: 'Khác'),
        tx(TransactionKind.income, 99000, category: 'Lương'),
      ]);
      expect(r.categories.map((c) => c.name), ['Ăn uống', 'Di chuyển', 'Khác']);
      expect(r.categories.map((c) => c.share), [50, 30, 20]);
    });

    test('empty period yields zeroed report with null rate', () {
      final r = buildPeriodReport(const []);
      expect(r.income, 0);
      expect(r.expense, 0);
      expect(r.net, 0);
      expect(r.transactionCount, 0);
      expect(r.savingsRatePercent, isNull);
      expect(r.categories, isEmpty);
      expect(r.incomeCategories, isEmpty);
      expect(r.payees, isEmpty);
      expect(r.accounts, isEmpty);
    });
  });

  group('buildPeriodReport breakdowns', () {
    test('income groups by category with shares of total income', () {
      final r = buildPeriodReport([
        tx(TransactionKind.income, 12000000, category: 'Lương'),
        tx(TransactionKind.income, 3000000, category: 'Thưởng'),
        // An expense under the same name must not join the income split.
        tx(TransactionKind.expense, 500000, category: 'Lương'),
      ]);
      expect(r.incomeCategories.map((c) => c.name), ['Lương', 'Thưởng']);
      expect(r.incomeCategories.map((c) => c.amount), [12000000, 3000000]);
      expect(r.incomeCategories.map((c) => c.share), [80, 20]);
      // The expense still lands in the expense breakdown.
      expect(r.categories.map((c) => c.name), ['Lương']);
    });

    test('payee-less expenses group under the honest "Không tên" bucket', () {
      final r = buildPeriodReport([
        tx(TransactionKind.expense, 50000, payee: 'Quán gần nhà'),
        tx(TransactionKind.expense, 30000), // no payee
        tx(TransactionKind.expense, 20000, payee: '   '), // blank = unnamed
        tx(TransactionKind.income, 90000, payee: 'Công ty'),
      ]);
      // Income rows never join the payee (expense) section; the 50k/50k
      // tie resolves by name so the order is deterministic.
      expect(r.payees.map((c) => c.name), ['Không tên', 'Quán gần nhà']);
      expect(r.payees.map((c) => c.amount), [50000, 50000]);
      // Shares divide by total expense (100.000), sorted desc.
      expect(r.payees.map((c) => c.share), [50, 50]);
    });

    test('expense groups by the account it left from', () {
      final r = buildPeriodReport([
        tx(TransactionKind.expense, 70000, account: 'Tiền mặt'),
        tx(TransactionKind.expense, 30000, account: 'Ví MoMo'),
        tx(TransactionKind.income, 15000000, account: 'Ngân hàng VCB'),
        tx(TransactionKind.transfer, 500000, account: 'Ngân hàng VCB'),
      ]);
      // Only expense rows — a transfer out of VCB must not inflate it.
      expect(r.accounts.map((c) => c.name), ['Tiền mặt', 'Ví MoMo']);
      expect(r.accounts.map((c) => c.share), [70, 30]);
    });

    test('transfers never appear in any breakdown', () {
      final r = buildPeriodReport([
        tx(
          TransactionKind.transfer,
          500000,
          category: 'Chuyển khoản',
          account: 'VCB',
          payee: 'Me',
        ),
      ]);
      expect(r.categories, isEmpty);
      expect(r.incomeCategories, isEmpty);
      expect(r.payees, isEmpty);
      expect(r.accounts, isEmpty);
      expect(r.transactionCount, 1); // the row still counts as activity
    });
  });

  group('breakdown drill-in keys', () {
    Transaction txId(
      TransactionKind kind,
      int amount, {
      String categoryId = 'c',
      String category = 'X',
      String accountId = 'a',
      String account = 'A',
      String? payee,
    }) => Transaction(
      id: 't',
      kind: kind,
      categoryId: categoryId,
      category: category,
      note: '',
      accountId: accountId,
      account: account,
      amount: amount,
      occurredOn: '2026-10-01',
      payee: payee,
    );

    test('category and account rows carry their stored ids', () {
      final r = buildPeriodReport([
        txId(
          TransactionKind.expense,
          45000,
          categoryId: 'cat-food',
          category: 'Ăn uống',
          accountId: 'acc-cash',
          account: 'Tiền mặt',
          payee: 'Quán A',
        ),
        txId(
          TransactionKind.income,
          9000000,
          categoryId: 'cat-salary',
          category: 'Lương',
        ),
      ]);
      expect(r.categories.single.id, 'cat-food');
      expect(r.incomeCategories.single.id, 'cat-salary');
      expect(r.accounts.single.id, 'acc-cash');
      // The payee key is the trimmed text itself — no id exists to hide.
      expect(r.payees.single.id, 'Quán A');
    });

    test('the unnamed payee bucket keys on ""', () {
      final r = buildPeriodReport([txId(TransactionKind.expense, 1000)]);
      expect(r.payees.single.name, 'Không tên');
      expect(r.payees.single.id, '');
    });

    test('same-name categories stay separate rows keyed by id', () {
      // Two "Ăn uống" ids must not merge — one category_id filter could
      // never reproduce the merged row, so merging would make the
      // drill-in count disagree with the share the row claims.
      final r = buildPeriodReport([
        txId(
          TransactionKind.expense,
          30000,
          categoryId: 'cat-1',
          category: 'Ăn uống',
        ),
        txId(
          TransactionKind.expense,
          20000,
          categoryId: 'cat-2',
          category: 'Ăn uống',
        ),
      ]);
      expect(r.categories.map((c) => c.id), ['cat-1', 'cat-2']);
      expect(r.categories.map((c) => c.amount), [30000, 20000]);
    });

    test('a row grouped by name only carries no drill-in key', () {
      // A feed row with no category_id groups under 'name:<label>' and
      // stays untappable — no filter could rebuild exactly those rows.
      final r = buildPeriodReport([
        txId(
          TransactionKind.expense,
          40000,
          categoryId: '',
          category: 'Tên lạ',
        ),
      ]);
      expect(r.categories.single.name, 'Tên lạ');
      expect(r.categories.single.id, isNull);
    });
  });

  group('payee counts', () {
    test('payee rows carry the transaction count behind the total', () {
      final r = buildPeriodReport([
        tx(TransactionKind.expense, 30000, payee: 'Quán A'),
        tx(TransactionKind.expense, 20000, payee: 'Quán A'),
        tx(TransactionKind.expense, 50000, payee: 'Quán B'),
        tx(TransactionKind.expense, 10000), // lands in 'Không tên'
        // Income rows never join the payee section at all.
        tx(TransactionKind.income, 9000000, payee: 'Công ty'),
      ]);
      final byName = {for (final p in r.payees) p.name: p};
      expect(byName['Quán B']!.count, 1);
      expect(byName['Quán B']!.amount, 50000);
      expect(byName['Quán A']!.count, 2);
      expect(byName['Quán A']!.amount, 50000);
      expect(byName[unnamedPayeeBucket]!.count, 1);
    });

    test('category, income and account rows carry no count', () {
      // Count is the payee ranking's field — the other sections leave
      // it null rather than display an unasked-for number.
      final r = buildPeriodReport([
        tx(TransactionKind.expense, 30000, category: 'Ăn uống'),
        tx(TransactionKind.income, 9000000, category: 'Lương'),
      ]);
      expect(r.categories.single.count, isNull);
      expect(r.incomeCategories.single.count, isNull);
      expect(r.accounts.single.count, isNull);
    });
  });

  group('expenseCategoryDeltas', () {
    /// Rows keyed like the feed — 'c-$category' keeps each display name
    /// on a distinct stored id, the same data the backend sends.
    Transaction cat(String category, int amount, {String? categoryId}) =>
        Transaction(
          id: 't',
          kind: TransactionKind.expense,
          categoryId: categoryId ?? 'c-$category',
          category: category,
          note: '',
          accountId: 'a',
          account: 'A',
          amount: amount,
          occurredOn: '2026-10-01',
        );

    test('rise, drop and unchanged buckets report honest signs', () {
      final deltas = expenseCategoryDeltas(
        current: [
          cat('Ăn uống', 50000),
          cat('Di chuyển', 20000),
          cat('Khác', 7),
        ],
        previous: [
          cat('Ăn uống', 30000),
          cat('Di chuyển', 45000),
          cat('Khác', 7),
        ],
      );
      expect(deltas['c-Ăn uống']!.current, 50000);
      expect(deltas['c-Ăn uống']!.previous, 30000);
      expect(deltas['c-Ăn uống']!.change, 20000);
      expect(deltas['c-Di chuyển']!.change, -25000);
      expect(deltas['c-Khác']!.change, 0);
    });

    test('a category absent last window is "mới" — previous null, not 0', () {
      final deltas = expenseCategoryDeltas(
        current: [cat('Sức khỏe', 15000)],
        previous: [cat('Ăn uống', 30000)],
      );
      // Null marks "no prior data" — a real 0 baseline would wrongly
      // read as "không đổi" for a 0-amount current row.
      expect(deltas['c-Sức khỏe']!.previous, isNull);
      expect(deltas['c-Sức khỏe']!.change, 15000);
    });

    test('no prior window data at all — every bucket is new', () {
      final deltas = expenseCategoryDeltas(
        current: [cat('Ăn uống', 50000)],
        previous: const [],
      );
      expect(deltas['c-Ăn uống']!.previous, isNull);
    });

    test('spending dropped to zero keeps its honest negative change', () {
      // A prior-only bucket stays in the map — carrying its label and
      // drill-in id so the section can render the honest zero row.
      final deltas = expenseCategoryDeltas(
        current: [cat('Ăn uống', 50000)],
        previous: [cat('Ăn uống', 30000), cat('Tiền nhà', 3000000)],
      );
      expect(deltas['c-Tiền nhà']!.current, 0);
      expect(deltas['c-Tiền nhà']!.previous, 3000000);
      expect(deltas['c-Tiền nhà']!.change, -3000000);
      expect(deltas['c-Tiền nhà']!.name, 'Tiền nhà');
      expect(deltas['c-Tiền nhà']!.id, 'c-Tiền nhà');
    });

    test('a name-only prior bucket carries its label, no id', () {
      final deltas = expenseCategoryDeltas(
        current: [cat('Ăn uống', 50000)],
        previous: [cat('Chợ', 80000, categoryId: '')],
      );
      expect(deltas['name:Chợ']!.name, 'Chợ');
      expect(deltas['name:Chợ']!.id, isNull);
      expect(deltas['name:Chợ']!.change, -80000);
    });

    test('name-only buckets match across windows like the breakdown', () {
      // Feed rows without a category_id group under 'name:<label>' —
      // the delta must bucket identically or rows would miss their key.
      final deltas = expenseCategoryDeltas(
        current: [cat('Tên lạ', 40000, categoryId: '')],
        previous: [cat('Tên lạ', 25000, categoryId: '')],
      );
      expect(deltas['name:Tên lạ']!.change, 15000);
    });

    test('same-name categories on different ids stay separate', () {
      // Two stored ids sharing a label never merge — merging would
      // make a row's delta disagree with the drill-in behind it.
      final deltas = expenseCategoryDeltas(
        current: [cat('Ăn uống', 30000, categoryId: 'cat-1')],
        previous: [
          cat('Ăn uống', 20000, categoryId: 'cat-1'),
          cat('Ăn uống', 90000, categoryId: 'cat-2'),
        ],
      );
      expect(deltas['cat-1']!.change, 10000);
      // cat-2 fell to zero this window — honest negative, not absent.
      expect(deltas['cat-2']!.change, -90000);
    });

    test('income, transfers and uncategorised spend never feed a delta', () {
      Transaction kind(TransactionKind k, String category, int amount) =>
          Transaction(
            id: 't',
            kind: k,
            categoryId: 'c-$category',
            category: category,
            note: '',
            accountId: 'a',
            account: 'A',
            amount: amount,
            occurredOn: '2026-10-01',
          );
      final deltas = expenseCategoryDeltas(
        current: [
          kind(TransactionKind.income, 'Lương', 9000000),
          kind(TransactionKind.transfer, 'Chuyển', 500000),
          // An expense row carrying no category label joins no bucket,
          // exactly like the breakdown it feeds.
          Transaction(
            id: 't',
            kind: TransactionKind.expense,
            categoryId: '',
            category: '',
            note: '',
            accountId: 'a',
            account: 'A',
            amount: 60000,
            occurredOn: '2026-10-01',
          ),
        ],
        previous: [cat('Ăn uống', 30000)],
      );
      expect(deltas.keys, {'c-Ăn uống'});
    });

    test('categoryDeltaKey maps a row to its bucket like the report', () {
      const named = CategoryShare(
        name: 'Ăn uống',
        amount: 1,
        share: 1,
        id: 'cat-1',
      );
      const unnamed = CategoryShare(name: 'Tên lạ', amount: 1, share: 1);
      expect(categoryDeltaKey(named), 'cat-1');
      expect(categoryDeltaKey(unnamed), 'name:Tên lạ');
    });
  });

  group('MonthPeriod', () {
    test('bounds cover the whole calendar month', () {
      final p = MonthPeriod(2026, 10);
      expect(p.from, '2026-10-01');
      expect(p.to, '2026-11-01');
      expect(p.label, 'Tháng 10/2026');
    });

    test('prev crosses the year boundary', () {
      final prev = MonthPeriod(2026, 1).prev;
      expect(prev.from, '2025-12-01');
      expect(prev.to, '2026-01-01');
      expect(prev.label, 'Tháng 12/2025');
    });

    test('next is null while viewing the current month', () {
      final today = DateTime(2026, 10, 15);
      expect(MonthPeriod(2026, 10).next(today), isNull);
      final next = MonthPeriod(2026, 9).next(today);
      expect(next?.from, '2026-10-01');
      expect(next?.to, '2026-11-01');
    });
  });

  group('CustomPeriod', () {
    test('label names the picked dates like the web', () {
      expect(
        const CustomPeriod('2026-10-05', '2026-10-20').label,
        '5/10 – 20/10/2026',
      );
      // Different years keep both years on the label.
      expect(
        const CustomPeriod('2025-12-28', '2026-01-03').label,
        '28/12/2025 – 3/1/2026',
      );
    });

    test('bounds are inclusive-from / exclusive-to', () {
      const p = CustomPeriod('2026-10-05', '2026-10-07');
      expect(p.from, '2026-10-05');
      expect(p.to, '2026-10-08');
      expect(p.spanDays, 3);
    });

    test('prev/next shift by the window span', () {
      const p = CustomPeriod('2026-10-05', '2026-10-07');
      final prev = p.prev;
      expect(prev.from, '2026-10-02');
      expect(prev.to, '2026-10-05'); // exclusive: ends on the 4th
      final next = p.next(DateTime(2026, 10, 20))!;
      expect(next.from, '2026-10-08');
      expect(next.to, '2026-10-11');
    });

    test('next clamps to today and is null when fully future', () {
      const p = CustomPeriod('2026-10-01', '2026-10-10');
      final next = p.next(DateTime(2026, 10, 15))!;
      expect(next.from, '2026-10-11');
      expect(next.to, '2026-10-16'); // clamped: the 15th inclusive
      expect(p.next(DateTime(2026, 10, 10)), isNull);
    });
  });

  group('VN civil clock (audit P1-6)', () {
    test('vnToday anchors on Asia/Saigon, not the device zone', () {
      // 2026-10-13 16:30 UTC is still 23:30 in Vietnam — same day.
      expect(vnToday(DateTime.utc(2026, 10, 13, 16, 30)), '2026-10-13');
      // 17:30 UTC crosses midnight in Saigon — a device still showing
      // "the 13th" in New York writes the 14th the bank meant.
      expect(vnToday(DateTime.utc(2026, 10, 13, 17, 30)), '2026-10-14');
      // The boundary itself: exactly 17:00 UTC = 00:00 VN next day.
      expect(vnToday(DateTime.utc(2026, 10, 13, 17, 0)), '2026-10-14');
      expect(vnToday(DateTime.utc(2026, 10, 13, 16, 59)), '2026-10-13');
    });

    test('vnMonthStart rolls over on the VN month boundary', () {
      expect(vnMonthStart(DateTime.utc(2026, 10, 31, 16, 59)), '2026-10-01');
      // 17:00 UTC Oct 31 = 00:00 VN Nov 1 — the commitment payment lands
      // in November even though a US device still shows October.
      expect(vnMonthStart(DateTime.utc(2026, 10, 31, 17, 0)), '2026-11-01');
      // Year boundary too.
      expect(vnMonthStart(DateTime.utc(2026, 12, 31, 17, 0)), '2027-01-01');
    });

    test('vnNow reads the instant in the VN civil calendar', () {
      final vn = vnNow(DateTime.utc(2026, 10, 13, 17, 30));
      // The returned DateTime's calendar fields ARE the Saigon wall
      // clock — feed them to ymd/dayOnly, never persist the instant.
      expect(ymd(vn), '2026-10-14');
      expect(vn.hour, 0);
      expect(vn.minute, 30);
    });
  });
}
