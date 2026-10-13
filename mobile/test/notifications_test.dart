import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/notifications.dart';
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

    test('never hands out the reserved digest id', () async {
      SharedPreferences.setMockInitialValues({
        commitmentNotifIdCounterKey: digestNotificationId - 1,
      });
      final prefs = await SharedPreferences.getInstance();
      final id = await commitmentNotificationId(prefs, 'c-x');
      expect(id, isNot(digestNotificationId));
      expect(id, digestNotificationId + 1);
    });

    test('a corrupt stored map re-allocates instead of throwing', () async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(commitmentNotifIdMapKey, '{broken,,,');
      final id = await commitmentNotificationId(prefs, 'c-x');
      expect(id, greaterThan(0));
    });
  });
}
