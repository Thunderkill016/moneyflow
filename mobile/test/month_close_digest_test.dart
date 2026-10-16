// D9 — month-close digest + in-app month summary. Mirrors
// weekly_digest_test.dart's coverage at the month boundary: fire
// calculation, VN-anchored window, integer sums, calm copy, the
// refresh orchestration contract, and the opt-in pref.

import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/notifications.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/month_close_digest.dart';
import 'package:moneyflow/domain/month_summary.dart';
import 'package:shared_preferences/shared_preferences.dart';

Transaction _tx({
  required String id,
  TransactionKind kind = TransactionKind.expense,
  String category = 'Ăn uống',
  int amount = 0,
  required String occurredOn,
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: 'cat-${category.hashCode}',
  category: category,
  note: '',
  accountId: 'acc-1',
  account: 'Tiền mặt',
  amount: amount,
  occurredOn: occurredOn,
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('nextMonthCloseFire', () {
    test('mid-month arms the last day at 19:00', () {
      // 2026-10-15 -> 2026-10-31 19:00.
      final fire = nextMonthCloseFire(DateTime(2026, 10, 15, 9));
      expect(fire, DateTime(2026, 10, 31, 19));
    });

    test('the last day before 19:00 arms the same evening', () {
      final fire = nextMonthCloseFire(DateTime(2026, 10, 31, 18, 30));
      expect(fire, DateTime(2026, 10, 31, 19));
    });

    test('the last day at/after 19:00 rolls to next month\'s last day', () {
      // Oct 31 19:30 -> Nov 30 19:00 (November has 30 days — a bare
      // "day 31" alarm would be a bug here).
      final fire = nextMonthCloseFire(DateTime(2026, 10, 31, 19, 30));
      expect(fire, DateTime(2026, 11, 30, 19));
    });

    test('February resolves its own last day', () {
      // 2026 is not a leap year: Feb 20 -> Feb 28 (and mid-January
      // correctly arms Jan 31 first — the same-month fire wins).
      expect(
        nextMonthCloseFire(DateTime(2026, 2, 20, 12)),
        DateTime(2026, 2, 28, 19),
      );
      expect(
        nextMonthCloseFire(DateTime(2026, 1, 20, 12)),
        DateTime(2026, 1, 31, 19),
      );
    });

    test('a custom fire time lands on the same last day', () {
      final fire = nextMonthCloseFire(
        DateTime(2026, 10, 15, 9),
        hour: 8,
        minute: 30,
      );
      expect(fire, DateTime(2026, 10, 31, 8, 30));
    });
  });

  group('monthCloseWindow', () {
    test('the just-closed month plus the full month before', () {
      final w = monthCloseWindow(DateTime(2026, 10, 31, 19));
      expect(w.start, '2026-10-01');
      expect(w.end, '2026-10-31');
      expect(w.previousStart, '2026-09-01');
      expect(w.previousEnd, '2026-09-30');
      expect(w.loadFrom, '2026-09-01');
      expect(w.loadTo, '2026-11-01');
    });

    test('the window anchors on the VN month, not the device zone', () {
      // A last-local-day 19:00 fire west of UTC+7 can already be the
      // 1st of the next month in Saigon — the closed month must still
      // be the one that just ended there.
      // 2026-10-31 19:00 UTC-5 == 2026-11-01 07:00 VN.
      final w = monthCloseWindow(DateTime(2026, 10, 31, 19).toUtc());
      expect(w.start, '2026-10-01');
      expect(w.end, '2026-10-31');
    });
  });

  group('buildMonthCloseDigest', () {
    // Fire 2026-10-31 19:00 local — VN month October is closing.
    final fire = DateTime(2026, 10, 31, 19);

    test('sums the closed month, compares to the full prior month', () {
      final digest = buildMonthCloseDigest([
        _tx(
          id: 'a',
          category: 'Ăn uống',
          amount: 200000,
          occurredOn: '2026-10-05',
        ),
        _tx(
          id: 'b',
          category: 'Di chuyển',
          amount: 100000,
          occurredOn: '2026-10-30',
        ),
        _tx(
          id: 'c',
          kind: TransactionKind.income,
          category: 'Lương',
          amount: 5000000,
          occurredOn: '2026-10-01',
        ),
        _tx(
          id: 'd',
          kind: TransactionKind.transfer,
          category: 'Chuyển khoản',
          amount: 700000,
          occurredOn: '2026-10-10',
        ),
        _tx(
          id: 'e',
          amount: 200000,
          occurredOn: '2026-09-15',
        ), // previous month
        _tx(
          id: 'f',
          amount: 90000,
          occurredOn: '2026-11-01',
        ), // outside — after
        _tx(
          id: 'g',
          amount: 90000,
          occurredOn: '2026-08-31',
        ), // outside — before
      ], fireDate: fire);
      expect(digest.expense, 300000);
      expect(digest.income, 5000000);
      // The transfer is not a row worth counting.
      expect(digest.transactionCount, 3);
      expect(digest.topCategory, 'Ăn uống');
      expect(digest.topCategoryAmount, 200000);
      expect(digest.expenseChangePercent, 50);
    });

    test('no prior-month expense gives a null compare, not a guess', () {
      final digest = buildMonthCloseDigest([
        _tx(id: 'a', amount: 200000, occurredOn: '2026-10-20'),
      ], fireDate: fire);
      expect(digest.expenseChangePercent, isNull);
    });
  });

  group('monthCloseCopy', () {
    MonthCloseDigest digest({
      int expense = 300000,
      int income = 0,
      int count = 3,
      String? top = 'Ăn uống',
      int? change,
    }) => MonthCloseDigest(
      window: monthCloseWindow(DateTime(2026, 10, 31, 19)),
      income: income,
      expense: expense,
      transactionCount: count,
      topCategory: top,
      topCategoryAmount: 200000,
      expenseChangePercent: change,
    );

    test('full copy names the closed month and its clauses', () {
      final copy = monthCloseCopy(digest(income: 5000000, change: 50))!;
      expect(copy.title, 'Tổng kết tháng 10/2026');
      expect(
        copy.body,
        'chi 300.000 ₫ · thu 5.000.000 ₫ · '
        'nhiều nhất: Ăn uống · cao hơn ~50% so với tháng trước',
      );
    });

    test('lower spend reads thấp hơn, zero reads ngang tháng trước', () {
      expect(
        monthCloseCopy(digest(change: -25))!.body,
        contains('thấp hơn ~25% so với tháng trước'),
      );
      expect(
        monthCloseCopy(digest(change: 0))!.body,
        contains('ngang tháng trước'),
      );
    });

    test('income without expense still reports honestly', () {
      final copy = monthCloseCopy(
        digest(expense: 0, income: 5000000, count: 1, top: null),
      )!;
      expect(copy.body, contains('chưa ghi khoản chi nào'));
      expect(copy.body, contains('thu 5.000.000 ₫'));
    });

    test('an empty month produces no copy — never ping for nothing', () {
      expect(monthCloseCopy(digest(count: 0, top: null)), isNull);
    });
  });

  group('refreshMonthCloseDigest', () {
    // 2026-10-15 — next fire is Oct 31 19:00, load range Sep 1..Nov 1.
    final now = DateTime(2026, 10, 15, 9);

    test('disabled opts out entirely — cancel only, no range read', () async {
      var loaded = false, cancelled = false, scheduled = false;
      await refreshMonthCloseDigest(
        enabled: false,
        loadRange: (from, to) async {
          loaded = true;
          return (rows: const <Transaction>[], truncated: false);
        },
        schedule: ({required title, required body, required fireAt}) async {
          scheduled = true;
        },
        cancel: () async {
          cancelled = true;
        },
        now: now,
      );
      expect(loaded, isFalse);
      expect(cancelled, isTrue);
      expect(scheduled, isFalse);
    });

    test('enabled arms the last-day one-shot with the fresh copy', () async {
      String? from, to, gotTitle, gotBody;
      DateTime? gotFireAt;
      await refreshMonthCloseDigest(
        enabled: true,
        loadRange: (f, t) async {
          from = f;
          to = t;
          return (
            rows: [_tx(id: 'a', amount: 300000, occurredOn: '2026-10-20')],
            truncated: false,
          );
        },
        schedule: ({required title, required body, required fireAt}) async {
          gotTitle = title;
          gotBody = body;
          gotFireAt = fireAt;
        },
        cancel: () async {},
        now: now,
      );
      expect(from, '2026-09-01');
      expect(to, '2026-11-01');
      expect(gotFireAt, DateTime(2026, 10, 31, 19));
      expect(gotTitle, 'Tổng kết tháng 10/2026');
      expect(gotBody, contains('chi 300.000 ₫'));
    });

    test(
      'a truncated range leaves the previous schedule — no partial totals',
      () async {
        var cancelled = false, scheduled = false;
        await refreshMonthCloseDigest(
          enabled: true,
          loadRange: (from, to) async =>
              (rows: const <Transaction>[], truncated: true),
          schedule: ({required title, required body, required fireAt}) async {
            scheduled = true;
          },
          cancel: () async {
            cancelled = true;
          },
          now: now,
        );
        expect(cancelled, isFalse);
        expect(scheduled, isFalse);
      },
    );

    test('a month with no rows cancels instead of pinging', () async {
      var cancelled = false, scheduled = false;
      await refreshMonthCloseDigest(
        enabled: true,
        loadRange: (from, to) async =>
            (rows: const <Transaction>[], truncated: false),
        schedule: ({required title, required body, required fireAt}) async {
          scheduled = true;
        },
        cancel: () async {
          cancelled = true;
        },
        now: now,
      );
      expect(cancelled, isTrue);
      expect(scheduled, isFalse);
    });
  });

  group('month digest pref', () {
    test('opt-in persists and defaults OFF', () async {
      SharedPreferences.setMockInitialValues({});
      expect(await NotificationPrefs.loadMonthDigestEnabled(), isFalse);
      await NotificationPrefs.saveMonthDigestEnabled(true);
      expect(await NotificationPrefs.loadMonthDigestEnabled(), isTrue);
    });
  });

  group('buildMonthSummary (in-app card)', () {
    final today = DateTime(2026, 10, 20);

    test('month-to-date sums with the equal-length trailing compare', () {
      final s = buildMonthSummary([
        _tx(id: 'a', amount: 300000, occurredOn: '2026-10-05'),
        _tx(
          id: 'b',
          kind: TransactionKind.income,
          category: 'Lương',
          amount: 5000000,
          occurredOn: '2026-10-01',
        ),
        // Trailing 20 days ending Sep 30 = the compare window.
        _tx(id: 'c', amount: 200000, occurredOn: '2026-09-20'),
        _tx(id: 'd', amount: 90000, occurredOn: '2026-09-10'),
        _tx(id: 'e', amount: 90000, occurredOn: '2026-10-21'),
      ], today: today);
      expect(s.monthStart, '2026-10-01');
      expect(s.monthEnd, '2026-10-20');
      expect(s.compareDays, 20);
      expect(s.income, 5000000);
      expect(s.expense, 300000);
      expect(s.net, 4700000);
      expect(s.transactionCount, 2);
      // Only 2026-09-20 is inside the prior window (Sep 11–30).
      expect(s.expenseChangePercent, 50);
    });

    test('transfers and empty categories stay out', () {
      final s = buildMonthSummary([
        _tx(
          id: 'a',
          kind: TransactionKind.transfer,
          category: 'Chuyển khoản',
          amount: 700000,
          occurredOn: '2026-10-10',
        ),
        _tx(id: 'b', category: '', amount: 100000, occurredOn: '2026-10-10'),
      ], today: today);
      expect(s.transactionCount, 1);
      expect(s.topCategory, isNull);
      expect(s.expense, 100000);
    });

    test('compare line names the equal-length baseline', () {
      expect(
        monthSummaryCompareLine(25, days: 20),
        'Chi cao hơn ~25% so với 20 ngày liền trước',
      );
      expect(
        monthSummaryCompareLine(-10, days: 20),
        'Chi thấp hơn ~10% so với 20 ngày liền trước',
      );
      expect(
        monthSummaryCompareLine(0, days: 7),
        'Chi ngang 7 ngày liền trước',
      );
      expect(monthSummaryCompareLine(null, days: 20), isNull);
    });

    test('the load range covers both windows', () {
      final r = monthSummaryLoadRange(today);
      expect(r.from, '2026-09-11');
      expect(r.to, '2026-10-21');
    });
  });
}
