import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/notifications.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  tzdata.initializeTimeZones();

  group('nextCommitmentDue', () {
    tz.TZDateTime at(int y, int m, int d, [int h = 8]) =>
        tz.TZDateTime(tz.local, y, m, d, h);

    test('a mid-month due day fires today at 09:00 when still ahead', () {
      final due = nextCommitmentDue(15, at(2026, 4, 10));
      expect(due, tz.TZDateTime(tz.local, 2026, 4, 15, 9));
    });

    test('day 31 clamps to the real month end instead of rolling over', () {
      // April has 30 days — the old TZDateTime overflow fired May 1.
      final due = nextCommitmentDue(31, at(2026, 4, 10));
      expect(due, tz.TZDateTime(tz.local, 2026, 4, 30, 9));
    });

    test('day 31 is untouched in months that have one', () {
      final due = nextCommitmentDue(31, at(2026, 5, 10));
      expect(due, tz.TZDateTime(tz.local, 2026, 5, 31, 9));
    });

    test('a passed clamped date rolls to next month, again clamped', () {
      // April 30 09:00 already passed at 10:00 → May 31, never May 30→Jun 1.
      final due = nextCommitmentDue(31, at(2026, 4, 30, 10));
      expect(due, tz.TZDateTime(tz.local, 2026, 5, 31, 9));
    });

    test('February clamps a 30-day commitment to the 28th', () {
      final due = nextCommitmentDue(30, at(2026, 2, 1));
      expect(due, tz.TZDateTime(tz.local, 2026, 2, 28, 9));
    });
  });

  group('end-of-month recurring window', () {
    tz.TZDateTime at(int y, int m, int d) =>
        tz.TZDateTime(tz.local, y, m, d, 8);

    // flutter_local_notifications' day-of-month repeat scans forward for
    // an exact day — an anchor above a month's length skips that month
    // entirely (day 31 skips every 30-day month AND February). Days 29–31
    // therefore ride a horizon of clamped one-shots instead.
    test('day-31 dues clamp per month — nothing skips or rolls over', () {
      final dues = nextCommitmentDues(31, at(2026, 4, 10), 4);
      expect(dues, [
        tz.TZDateTime(tz.local, 2026, 4, 30, 9),
        tz.TZDateTime(tz.local, 2026, 5, 31, 9),
        tz.TZDateTime(tz.local, 2026, 6, 30, 9),
        tz.TZDateTime(tz.local, 2026, 7, 31, 9),
      ]);
    });

    test('day-31 horizon crosses February without a gap', () {
      final dues = nextCommitmentDues(31, at(2027, 1, 10), 3);
      expect(dues.map((d) => (d.year, d.month, d.day)).toList(), [
        (2027, 1, 31),
        (2027, 2, 28),
        (2027, 3, 31),
      ]);
    });

    test('the window holds a full year of monthly one-shots', () {
      final dues = nextCommitmentDues(
        30,
        at(2026, 1, 15),
        eomReminderHorizonMonths,
      );
      expect(dues, hasLength(eomReminderHorizonMonths));
      // Consecutive months, all real days, never into a following month.
      for (var i = 1; i < dues.length; i++) {
        final prev = DateTime(dues[i - 1].year, dues[i - 1].month + 1);
        expect((dues[i].year, dues[i].month), (prev.year, prev.month));
      }
      expect(dues[1], tz.TZDateTime(tz.local, 2026, 2, 28, 9));
    });

    test('slot keys are stable per commitment+month', () {
      final due = tz.TZDateTime(tz.local, 2026, 4, 30, 9);
      expect(eomSlotKey('c-1', due), 'c-1#202604');
      expect(eomSlotKey('c-1', due), eomSlotKey('c-1', due));
      expect(
        eomSlotKey('c-1', due),
        isNot(eomSlotKey('c-1', tz.TZDateTime(tz.local, 2026, 5, 31, 9))),
      );
    });

    test('only days missing from some month leave the repeating path', () {
      // 28 exists in every month → recurring; 29–31 → one-shot horizon.
      expect(28 <= maxRecurringDueDay, isTrue);
      expect(29 <= maxRecurringDueDay, isFalse);
    });
  });

  group('commitmentNotificationId', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('allocates once per commitment and stays stable', () async {
      final prefs = await SharedPreferences.getInstance();
      final a1 = await commitmentNotificationId(prefs, 'c-a');
      final a2 = await commitmentNotificationId(prefs, 'c-a');
      final b = await commitmentNotificationId(prefs, 'c-b');
      expect(a1, a2);
      expect(a1, isNot(b));
    });

    test('two different commitments never share an id', () async {
      final prefs = await SharedPreferences.getInstance();
      final seen = <int>{};
      for (var i = 0; i < 200; i++) {
        seen.add(await commitmentNotificationId(prefs, 'c-$i'));
      }
      expect(seen, hasLength(200));
    });

    test('never hands out the reserved digest ids', () async {
      SharedPreferences.setMockInitialValues({
        commitmentNotifIdCounterKey: digestNotificationId - 1,
      });
      final prefs = await SharedPreferences.getInstance();
      final id = await commitmentNotificationId(prefs, 'c-x');
      expect(id, isNot(digestNotificationId));
      // The month-close digest reserves the next id too — the allocator
      // skips the whole reserved pair.
      expect(id, isNot(monthCloseNotificationId));
      expect(id, monthCloseNotificationId + 1);
    });

    test('a corrupt stored map re-allocates instead of throwing', () async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(commitmentNotifIdMapKey, '{broken,,,');
      final id = await commitmentNotificationId(prefs, 'c-x');
      expect(id, greaterThan(0));
    });
  });

  group('ReconcileReminderPrefs (D19)', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('round-trips per-account days; clear removes only that key', () async {
      final prefs = await SharedPreferences.getInstance();
      expect(ReconcileReminderPrefs.dayFor(prefs, 'a1'), isNull);
      await ReconcileReminderPrefs.saveDay(prefs, 'a1', 15);
      await ReconcileReminderPrefs.saveDay(prefs, 'a2', 31);
      expect(ReconcileReminderPrefs.dayFor(prefs, 'a1'), 15);
      expect(ReconcileReminderPrefs.dayFor(prefs, 'a2'), 31);
      await ReconcileReminderPrefs.saveDay(prefs, 'a1', null);
      expect(ReconcileReminderPrefs.dayFor(prefs, 'a1'), isNull);
      expect(ReconcileReminderPrefs.dayFor(prefs, 'a2'), 31);
    });

    test('corrupt or out-of-range blobs read as absent, never throw', () async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(ReconcileReminderPrefs.key, '{broken,,,');
      expect(ReconcileReminderPrefs.load(prefs), isEmpty);
      await prefs.setString(
        ReconcileReminderPrefs.key,
        '{"a1": 0, "a2": 32, "a3": "x", "a4": 20}',
      );
      final map = ReconcileReminderPrefs.load(prefs);
      // Only the real day-of-month survives — a corrupted entry can
      // cost its own reminder but never arms a nonsense schedule.
      expect(map, {'a4': 20});
    });
  });

  group('planReconcileReminders (D19)', () {
    tz.TZDateTime at(int y, int m, int d) =>
        tz.TZDateTime(tz.local, y, m, d, 8);

    AccountSummary acc(
      String id, {
      String name = 'VCB',
      bool archived = false,
    }) => AccountSummary(
      id: id,
      name: name,
      kind: AccountKind.bank,
      currencyCode: 'VND',
      initialBalance: 0,
      balance: 0,
      isArchived: archived,
    );

    test('a day ≤28 arms ONE repeating monthly plan keyed by account', () {
      final plans = planReconcileReminders(
        reminders: {'a1': 15},
        accounts: [acc('a1', name: 'Techcombank')],
        now: at(2026, 4, 10),
      );
      expect(plans, hasLength(1));
      final p = plans.single;
      expect(p.key, 'recon:a1');
      expect(p.repeatsMonthly, isTrue);
      expect(p.fireAt, tz.TZDateTime(tz.local, 2026, 4, 15, 9));
      // The alarm names the account so the nudge lands actionable.
      expect(p.title, 'Đối soát Techcombank');
    });

    test('days 29–31 arm clamped one-shots, never a skipping repeat', () {
      final plans = planReconcileReminders(
        reminders: {'a1': 31},
        accounts: [acc('a1')],
        now: at(2026, 4, 10),
      );
      expect(plans, hasLength(eomReminderHorizonMonths));
      expect(plans.every((p) => !p.repeatsMonthly), isTrue);
      // April lacks a 31st — the first fire is the real month end.
      expect(plans.first.fireAt, tz.TZDateTime(tz.local, 2026, 4, 30, 9));
      expect(plans.first.key, 'recon:a1#202604');
    });

    test('unstored, missing, archived, and invalid accounts arm nothing', () {
      final plans = planReconcileReminders(
        // a1 has a day but no account; a2 archived; a3 corrupt day.
        reminders: {'a1': 15, 'a2': 10, 'a3': 40},
        accounts: [acc('a2', archived: true), acc('a3')],
        now: at(2026, 4, 10),
      );
      expect(plans, isEmpty);
    });
  });
}
