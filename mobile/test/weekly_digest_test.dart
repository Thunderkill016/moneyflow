import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/notifications.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/weekly_digest.dart';
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

  group('nextWeeklyDigestFire', () {
    test('weekday arms the coming Sunday 19:00', () {
      // Monday 2026-10-19 09:00 -> Sunday 2026-10-25 19:00.
      final fire = nextWeeklyDigestFire(DateTime(2026, 10, 19, 9));
      expect(fire, DateTime(2026, 10, 25, 19));
    });

    test('Saturday arms tomorrow', () {
      final fire = nextWeeklyDigestFire(DateTime(2026, 10, 24, 23));
      expect(fire, DateTime(2026, 10, 25, 19));
    });

    test('Sunday before 19:00 arms the same evening', () {
      final fire = nextWeeklyDigestFire(DateTime(2026, 10, 25, 18, 30));
      expect(fire, DateTime(2026, 10, 25, 19));
    });

    test('Sunday at/after 19:00 rolls a full week', () {
      final fire = nextWeeklyDigestFire(DateTime(2026, 10, 25, 19, 30));
      expect(fire, DateTime(2026, 11, 1, 19));
    });

    test('a custom fire time lands on the same Sunday, same rule', () {
      // Monday 2026-10-19 09:00 -> Sunday 2026-10-25 08:30.
      final fire = nextWeeklyDigestFire(
        DateTime(2026, 10, 19, 9),
        hour: 8,
        minute: 30,
      );
      expect(fire, DateTime(2026, 10, 25, 8, 30));
    });

    test('a Sunday already past a custom time rolls a full week', () {
      final fire = nextWeeklyDigestFire(
        DateTime(2026, 10, 25, 9),
        hour: 8,
        minute: 30,
      );
      expect(fire, DateTime(2026, 11, 1, 8, 30));
    });
  });

  group('weeklyDigestWindow', () {
    test('Mon–Sun ending on the fire Sunday plus the week before', () {
      final w = weeklyDigestWindow(DateTime(2026, 10, 25, 19));
      expect(w.start, '2026-10-19');
      expect(w.end, '2026-10-25');
      expect(w.previousStart, '2026-10-12');
      expect(w.previousEnd, '2026-10-18');
      // The range load covers both windows, exclusive upper bound.
      expect(w.loadFrom, '2026-10-12');
      expect(w.loadTo, '2026-10-26');
    });

    test('the window anchors on the VN week, not the device zone', () {
      // audit P1-6: a local-Sunday 19:00 fire is already Monday morning
      // in Saigon — the closed week must still be the Mon–Sun just
      // ended, never one the device's own weekday would imply.
      final sundayEveningUtc = weeklyDigestWindow(
        DateTime.utc(2026, 10, 25, 12), // 19:00 VN — still Sunday
      );
      final alreadyMondayVn = weeklyDigestWindow(
        DateTime.utc(2026, 10, 25, 17), // 00:00 VN Monday — fire instant
      );
      for (final w in [sundayEveningUtc, alreadyMondayVn]) {
        expect(w.start, '2026-10-19');
        expect(w.end, '2026-10-25');
      }
    });
  });

  group('buildWeeklyDigest', () {
    final fire = DateTime(2026, 10, 25, 19); // window 19–25 Oct

    test(
      'sums the week, compares to the prior one, finds the top category',
      () {
        final digest = buildWeeklyDigest([
          _tx(
            id: 'a',
            category: 'Ăn uống',
            amount: 200000,
            occurredOn: '2026-10-19',
          ),
          _tx(
            id: 'b',
            category: 'Di chuyển',
            amount: 100000,
            occurredOn: '2026-10-24',
          ),
          _tx(
            id: 'c',
            kind: TransactionKind.income,
            category: 'Lương',
            amount: 5000000,
            occurredOn: '2026-10-20',
          ),
          _tx(
            id: 'd',
            kind: TransactionKind.transfer,
            category: 'Chuyển khoản',
            amount: 700000,
            occurredOn: '2026-10-21',
          ),
          _tx(
            id: 'e',
            amount: 200000,
            occurredOn: '2026-10-13',
          ), // previous week
          _tx(
            id: 'f',
            amount: 90000,
            occurredOn: '2026-10-26',
          ), // outside — after
          _tx(
            id: 'g',
            amount: 90000,
            occurredOn: '2026-10-11',
          ), // outside — before
        ], fireDate: fire);
        expect(digest.expense, 300000);
        expect(digest.income, 5000000);
        // The transfer is not a row worth counting.
        expect(digest.transactionCount, 3);
        expect(digest.topCategory, 'Ăn uống');
        expect(digest.topCategoryAmount, 200000);
        expect(digest.expenseChangePercent, 50);
      },
    );

    test('no prior-week expense gives a null compare, not an invented one', () {
      final digest = buildWeeklyDigest([
        _tx(id: 'a', amount: 200000, occurredOn: '2026-10-20'),
      ], fireDate: fire);
      expect(digest.expenseChangePercent, isNull);
    });

    test('top category tie breaks by name so the copy is deterministic', () {
      final digest = buildWeeklyDigest([
        _tx(
          id: 'a',
          category: 'Di chuyển',
          amount: 100000,
          occurredOn: '2026-10-20',
        ),
        _tx(
          id: 'b',
          category: 'Ăn uống',
          amount: 100000,
          occurredOn: '2026-10-21',
        ),
      ], fireDate: fire);
      // UTF-16 order puts ASCII 'D' before 'Ă' — the point is
      // determinism, not a particular alphabet.
      expect(digest.topCategory, 'Di chuyển');
    });
  });

  group('weeklyDigestCopy', () {
    WeeklyDigest digest({
      int expense = 300000,
      int income = 0,
      int count = 3,
      String? top = 'Ăn uống',
      int topAmount = 200000,
      int? change,
    }) => WeeklyDigest(
      window: weeklyDigestWindow(DateTime(2026, 10, 25, 19)),
      income: income,
      expense: expense,
      transactionCount: count,
      topCategory: top,
      topCategoryAmount: topAmount,
      expenseChangePercent: change,
    );

    test('full copy for a typical week', () {
      final copy = weeklyDigestCopy(digest(income: 5000000, change: 50))!;
      expect(copy.title, 'Tóm tắt tuần này');
      expect(
        copy.body,
        'Tuần 19/10 – 25/10: chi 300.000 ₫ · thu 5.000.000 ₫ · '
        'nhiều nhất: Ăn uống · cao hơn ~50% so với tuần trước',
      );
    });

    test('lower spend reads thấp hơn, zero reads ngang tuần trước', () {
      expect(
        weeklyDigestCopy(digest(change: -25))!.body,
        contains('thấp hơn ~25% so với tuần trước'),
      );
      expect(
        weeklyDigestCopy(digest(change: 0))!.body,
        contains('ngang tuần trước'),
      );
    });

    test('no prior baseline omits the compare clause', () {
      final copy = weeklyDigestCopy(digest())!;
      expect(copy.body, isNot(contains('tuần trước')));
    });

    test('income without expense still reports honestly', () {
      final copy = weeklyDigestCopy(
        digest(expense: 0, income: 5000000, count: 1, top: null, topAmount: 0),
      )!;
      expect(copy.body, contains('chưa ghi khoản chi nào'));
      expect(copy.body, contains('thu 5.000.000 ₫'));
    });

    test('an empty week produces no copy — never ping for nothing', () {
      expect(weeklyDigestCopy(digest(count: 0, top: null)), isNull);
    });
  });

  group('refreshWeeklyDigest', () {
    // Monday 2026-10-19 — next fire is Sunday 2026-10-25 19:00, window
    // 19–25 Oct, load range 12–26 Oct.
    final now = DateTime(2026, 10, 19, 9);

    test('disabled opts out entirely — cancel only, no range read', () async {
      var loaded = false, cancelled = false, scheduled = false;
      await refreshWeeklyDigest(
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

    test('enabled arms the Sunday one-shot with the fresh copy', () async {
      String? from, to, gotTitle, gotBody;
      DateTime? gotFireAt;
      await refreshWeeklyDigest(
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
      expect(from, '2026-10-12');
      expect(to, '2026-10-26');
      expect(gotFireAt, DateTime(2026, 10, 25, 19));
      expect(gotTitle, 'Tóm tắt tuần này');
      expect(gotBody, contains('Tuần 19/10 – 25/10: chi 300.000 ₫'));
    });

    test(
      'a truncated range leaves the previous schedule — no partial totals',
      () async {
        var cancelled = false, scheduled = false;
        await refreshWeeklyDigest(
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
        // Neither re-arm nor cancel — the armed digest keeps its last
        // complete-data copy rather than quoting partial numbers.
        expect(cancelled, isFalse);
        expect(scheduled, isFalse);
      },
    );

    test('a week with no rows cancels instead of pinging', () async {
      var cancelled = false, scheduled = false;
      await refreshWeeklyDigest(
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

    test(
      'the stored fire time flows through to the scheduled one-shot',
      () async {
        DateTime? gotFireAt;
        await refreshWeeklyDigest(
          enabled: true,
          digestHour: 8,
          digestMinute: 30,
          loadRange: (f, t) async => (
            rows: [_tx(id: 'a', amount: 300000, occurredOn: '2026-10-20')],
            truncated: false,
          ),
          schedule: ({required title, required body, required fireAt}) async {
            gotFireAt = fireAt;
          },
          cancel: () async {},
          now: now,
        );
        expect(gotFireAt, DateTime(2026, 10, 25, 8, 30));
      },
    );
  });

  group('NotificationPrefs', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('digest opt-in defaults off, then persists the toggle', () async {
      expect(await NotificationPrefs.loadWeeklyDigestEnabled(), isFalse);
      await NotificationPrefs.saveWeeklyDigestEnabled(true);
      expect(await NotificationPrefs.loadWeeklyDigestEnabled(), isTrue);
      await NotificationPrefs.saveWeeklyDigestEnabled(false);
      expect(await NotificationPrefs.loadWeeklyDigestEnabled(), isFalse);
    });
  });
}
