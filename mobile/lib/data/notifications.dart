import 'dart:async';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../domain/models.dart';
import '../domain/money.dart';
import '../domain/weekly_digest.dart';

/// Local reminders — one notification per recurring commitment at 09:00 on
/// its due day. Device-local only; no push backend exists yet.
class NotificationService {
  NotificationService._();

  static final _plugin = FlutterLocalNotificationsPlugin();
  static var _initialized = false;

  static const _channelId = 'commitments';
  static const _channelName = 'Cam kết hàng tháng';
  static const _digestChannelId = 'weekly_digest';
  static const _digestChannelName = 'Tóm tắt tuần';

  /// Fixed id for the digest one-shot — re-arming replaces the pending
  /// notification instead of stacking copies of it. Any int outside the
  /// hash-derived commitment id space works; this just reads as a constant.
  static const _weeklyDigestId = 70001;

  /// Deterministic notification id from the commitment id.
  static int _idFor(String commitmentId) => commitmentId.hashCode & 0x7fffffff;

  static Future<void> init() async {
    if (_initialized) return;
    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    );
    await _plugin.initialize(settings: settings);
    // tz.local is UTC until both calls below run — scheduling 09:00 VN
    // reminders without them would fire seven hours late or throw.
    tzdata.initializeTimeZones();
    final zoneName = (await FlutterTimezone.getLocalTimezone()).identifier;
    tz.setLocalLocation(tz.getLocation(zoneName));
    _initialized = true;
    // Permission is requested fire-and-forget — a pending or denied
    // prompt must not leave _initialized false and silently disable
    // scheduling forever.
    unawaited(
      _plugin
              .resolvePlatformSpecificImplementation<
                AndroidFlutterLocalNotificationsPlugin
              >()
              ?.requestNotificationsPermission() ??
          Future.value(),
    );
  }

  /// Next occurrence of `dueDay` at 09:00 local — rolls to next month when
  /// today's already past it.
  static tz.TZDateTime _nextDue(int dueDay) {
    final now = tz.TZDateTime.now(tz.local);
    var due = tz.TZDateTime(tz.local, now.year, now.month, dueDay, 9);
    if (!due.isAfter(now)) {
      due = tz.TZDateTime(tz.local, now.year, now.month + 1, dueDay, 9);
    }
    return due;
  }

  /// Reschedule all commitment reminders — call after planning data loads.
  /// Paid-this-month commitments still get next month's reminder (the
  /// schedule rolls forward naturally).
  static Future<void> scheduleCommitmentReminders(
    List<RecurringCommitment> commitments,
  ) async {
    // Self-heal — the caller may reach here before the startup init
    // finished; never no-op silently on a scheduler path.
    if (!_initialized) await init();
    for (final c in commitments) {
      if (c.isArchived) {
        await _plugin.cancel(id: _idFor(c.id));
        continue;
      }
      await _plugin.zonedSchedule(
        id: _idFor(c.id),
        title: c.name,
        body: '${formatMoney(c.amountMinor)} đến hạn hôm nay',
        scheduledDate: _nextDue(c.dueDay),
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId,
            _channelName,
            importance: Importance.defaultImportance,
          ),
        ),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        matchDateTimeComponents: DateTimeComponents.dayOfMonthAndTime,
      );
    }
  }

  /// Arm the Sunday-evening digest as a ONE-SHOT at [fireAt] (callers
  /// pass [nextWeeklyDigestFire] output). The copy carries real totals
  /// for the week it describes, so it cannot repeat — a weekly schedule
  /// would keep quoting the same frozen week. Callers re-arm on every
  /// data load so the pending copy is always the freshest the device saw.
  static Future<void> scheduleWeeklyDigest({
    required String title,
    required String body,
    required DateTime fireAt,
  }) async {
    if (!_initialized) await init();
    await _plugin.zonedSchedule(
      id: _weeklyDigestId,
      title: title,
      body: body,
      scheduledDate: tz.TZDateTime(
        tz.local,
        fireAt.year,
        fireAt.month,
        fireAt.day,
        fireAt.hour,
        fireAt.minute,
      ),
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          _digestChannelId,
          _digestChannelName,
          importance: Importance.defaultImportance,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
    );
  }

  static Future<void> cancelWeeklyDigest() async {
    if (!_initialized) await init();
    await _plugin.cancel(id: _weeklyDigestId);
  }
}

/// Notification opt-ins — SharedPreferences only; the `mf_` prefix keeps
/// them inside the wipeLocalData contract.
class NotificationPrefs {
  NotificationPrefs._();

  static const _weeklyDigestKey = 'mf_weekly_digest_enabled';

  /// The weekly digest is opt-in (default OFF) — commitment reminders
  /// fire on days the user declared, but a weekly summary is a nudge and
  /// must never arrive unasked.
  static Future<bool> loadWeeklyDigestEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_weeklyDigestKey) ?? false;
  }

  static Future<void> saveWeeklyDigestEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_weeklyDigestKey, enabled);
  }
}

/// Rebuild the digest copy from the freshest rows and re-arm (or cancel)
/// the Sunday one-shot. Orchestration lives here, away from the plugin
/// calls, so the schedule/cancel decision is unit-testable with fakes:
///
/// - disabled -> cancel only; the range read is skipped so an opted-out
///   digest never even costs a request;
/// - a week with no recorded rows -> cancel, never ping an empty summary;
/// - otherwise -> re-arm with the just-computed title/body.
Future<void> refreshWeeklyDigest({
  required bool enabled,
  required Future<List<Transaction>> Function(String from, String to) loadRange,
  required Future<void> Function({
    required String title,
    required String body,
    required DateTime fireAt,
  })
  schedule,
  required Future<void> Function() cancel,
  DateTime? now,
}) async {
  if (!enabled) {
    await cancel();
    return;
  }
  final fire = nextWeeklyDigestFire(now ?? DateTime.now());
  final window = weeklyDigestWindow(fire);
  final txs = await loadRange(window.loadFrom, window.loadTo);
  final copy = weeklyDigestCopy(buildWeeklyDigest(txs, fireDate: fire));
  if (copy == null) {
    await cancel();
    return;
  }
  await schedule(title: copy.title, body: copy.body, fireAt: fire);
}
