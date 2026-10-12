import 'dart:async';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../domain/models.dart';
import '../domain/money.dart';

/// Local reminders — one notification per recurring commitment at 09:00 on
/// its due day. Device-local only; no push backend exists yet.
class NotificationService {
  NotificationService._();

  static final _plugin = FlutterLocalNotificationsPlugin();
  static var _initialized = false;

  static const _channelId = 'commitments';
  static const _channelName = 'Cam kết hàng tháng';

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
}
