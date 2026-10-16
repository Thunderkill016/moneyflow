import 'dart:async';
import 'dart:convert';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../domain/models.dart';
import '../domain/money.dart';
import '../domain/month_close_digest.dart';
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
  static const _monthDigestChannelId = 'monthly_digest';
  static const _monthDigestChannelName = 'Tổng kết tháng';
  static const _reconcileChannelId = 'reconcile_reminders';
  static const _reconcileChannelName = 'Nhắc đối soát';

  /// Fixed id for the digest one-shot — re-arming replaces the pending
  /// notification instead of stacking copies of it. The commitment id
  /// allocator skips it, so the spaces can never collide.
  static const _weeklyDigestId = digestNotificationId;

  /// Same fixed-id contract for the month-close digest (D9) — own id,
  /// own channel, same replace-not-stack re-arm.
  static const _monthDigestId = monthCloseNotificationId;

  /// Notification id for [commitmentId], allocating a fresh persisted
  /// one on first sight.
  static Future<int> _idFor(String commitmentId) async =>
      commitmentNotificationId(
        await SharedPreferences.getInstance(),
        commitmentId,
      );

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

  /// Next occurrence of `dueDay` at 09:00 local strictly after now —
  /// rolls to next month when today's already past it.
  static tz.TZDateTime _nextDue(int dueDay) =>
      nextCommitmentDue(dueDay, tz.TZDateTime.now(tz.local));

  /// Reschedule all commitment reminders — call after planning data loads.
  /// Paid-this-month commitments still get next month's reminder (the
  /// schedule rolls forward naturally). Ids mapped to commitments that no
  /// longer exist (deleted, not just archived) are cancelled too — a
  /// vanished commitment must not keep firing.
  static Future<void> scheduleCommitmentReminders(
    List<RecurringCommitment> commitments,
  ) async {
    // Self-heal — the caller may reach here before the startup init
    // finished; never no-op silently on a scheduler path.
    if (!_initialized) await init();
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        _channelId,
        _channelName,
        importance: Importance.defaultImportance,
      ),
    );
    // Map keys armed this run — anything persisted but not re-armed below
    // is swept: removed/archived commitments, a changed dueDay (recurring
    // ↔ slot keys differ), and end-of-month slots past the horizon.
    final armed = <String>{};
    final now = tz.TZDateTime.now(tz.local);
    for (final c in commitments) {
      if (c.isArchived) continue;
      // A monthly due-day alarm would fire twelve times a year for a
      // yearly bill — no reminder beats a lying one. Non-monthly rows
      // are simply not armed; the sweep cancels any id a previous
      // version armed for them.
      if (c.intervalMonths != 1) continue;
      final body = '${formatMoney(c.amountMinor)} đến hạn hôm nay';
      if (c.dueDay <= maxRecurringDueDay) {
        // The day exists in every month — one repeating alarm anchored on
        // it is exact forever.
        armed.add(c.id);
        await _plugin.zonedSchedule(
          id: await _idFor(c.id),
          title: c.name,
          body: body,
          scheduledDate: _nextDue(c.dueDay),
          notificationDetails: details,
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          matchDateTimeComponents: DateTimeComponents.dayOfMonthAndTime,
        );
      } else {
        // No fixed day-of-month can express "day 31 or month end" — see
        // [maxRecurringDueDay]. Arm a horizon of clamped one-shots instead;
        // each re-arm rolls the window forward.
        for (final due in nextCommitmentDues(
          c.dueDay,
          now,
          eomReminderHorizonMonths,
        )) {
          final key = eomSlotKey(c.id, due);
          armed.add(key);
          await _plugin.zonedSchedule(
            id: await _idFor(key),
            title: c.name,
            body: body,
            scheduledDate: due,
            notificationDetails: details,
            androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          );
        }
      }
    }
    // Sweep mapped ids that were not armed this run — deleted commitments,
    // archived ones, and expired slot keys all lose their alarms.
    // Reconcile-reminder keys share this allocator map but are owned (and
    // swept) by [scheduleReconcileReminders] — never touch them here.
    final prefs = await SharedPreferences.getInstance();
    await _sweepNotifIds(
      prefs,
      (key) => key.startsWith(reconcileNotifKeyPrefix) || armed.contains(key),
    );
  }

  /// Cancels every mapped id failing [keep] and persists the pruned map —
  /// the shared sweep behind the commitment and reconcile schedulers, so
  /// each namespace retires only its own stale keys.
  static Future<void> _sweepNotifIds(
    SharedPreferences prefs,
    bool Function(String key) keep,
  ) async {
    final map = readCommitmentNotifIds(prefs);
    var stale = false;
    for (final entry in map.entries.toList()) {
      if (keep(entry.key)) continue;
      await _plugin.cancel(id: entry.value);
      map.remove(entry.key);
      stale = true;
    }
    if (stale) {
      await prefs.setString(commitmentNotifIdMapKey, jsonEncode(map));
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

  /// Arm the month-close digest as a ONE-SHOT at [fireAt] (callers pass
  /// [nextMonthCloseFire] output). Same contract as the weekly digest:
  /// the copy carries real totals for the month it describes, so it can
  /// never repeat — callers re-arm on every data load.
  static Future<void> scheduleMonthCloseDigest({
    required String title,
    required String body,
    required DateTime fireAt,
  }) async {
    if (!_initialized) await init();
    await _plugin.zonedSchedule(
      id: _monthDigestId,
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
          _monthDigestChannelId,
          _monthDigestChannelName,
          importance: Importance.defaultImportance,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
    );
  }

  static Future<void> cancelMonthCloseDigest() async {
    if (!_initialized) await init();
    await _plugin.cancel(id: _monthDigestId);
  }

  /// Re-arms every per-account reconcile reminder (D19) from the stored
  /// day map against the LIVE account list — a deleted or closed
  /// (archived) account's nudge dies here, never fires for a wallet the
  /// ledger no longer shows. Arms from [planReconcileReminders] then
  /// sweeps the `recon:` namespace of anything the plan did not re-arm.
  static Future<void> scheduleReconcileReminders(
    Map<String, int> reminders,
    List<AccountSummary> accounts,
  ) async {
    if (!_initialized) await init();
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        _reconcileChannelId,
        _reconcileChannelName,
        importance: Importance.defaultImportance,
      ),
    );
    final now = tz.TZDateTime.now(tz.local);
    final armed = <String>{};
    for (final plan in planReconcileReminders(
      reminders: reminders,
      accounts: accounts,
      now: now,
    )) {
      armed.add(plan.key);
      await _plugin.zonedSchedule(
        id: await _idFor(plan.key),
        title: plan.title,
        body: plan.body,
        scheduledDate: plan.fireAt,
        notificationDetails: details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        matchDateTimeComponents: plan.repeatsMonthly
            ? DateTimeComponents.dayOfMonthAndTime
            : null,
      );
    }
    final prefs = await SharedPreferences.getInstance();
    // Only the recon namespace is ours to sweep — commitment keys are
    // owned by the other scheduler.
    await _sweepNotifIds(
      prefs,
      (key) => !key.startsWith(reconcileNotifKeyPrefix) || armed.contains(key),
    );
  }

  /// Drops every armed reconcile reminder — the account-deletion path
  /// calls this so a wiped account's nudges can't fire after the wipe.
  static Future<void> cancelAllReconcileReminders() async {
    if (!_initialized) await init();
    final prefs = await SharedPreferences.getInstance();
    await _sweepNotifIds(
      prefs,
      (key) => !key.startsWith(reconcileNotifKeyPrefix),
    );
  }
}

/// Fixed notification id of the weekly digest — the commitment allocator
/// skips it.
const digestNotificationId = 70001;

/// Fixed notification id of the month-close digest — the commitment
/// allocator skips it too.
const monthCloseNotificationId = 70002;

/// Commitment-id → notification-id map and its counter, both persisted —
/// an id is never handed out twice and stays stable across app runs.
/// (The old `hashCode & 0x7fffffff` derivation both collided and changed
/// between runs, which orphaned scheduled notifications.)
const commitmentNotifIdMapKey = 'mf_commitment_notif_ids';
const commitmentNotifIdCounterKey = 'mf_commitment_notif_counter';

/// Read the persisted id map; a corrupt blob reads as empty — a lost map
/// only costs a few re-allocated ids, never a crash on a schedule path.
Map<String, int> readCommitmentNotifIds(SharedPreferences prefs) {
  try {
    final decoded = jsonDecode(
      prefs.getString(commitmentNotifIdMapKey) ?? '{}',
    );
    if (decoded is! Map) return {};
    return {
      for (final e in decoded.entries)
        if (e.key is String && e.value is num) e.key: (e.value as num).toInt(),
    };
  } on Object {
    return {};
  }
}

/// The notification id for [commitmentId] — the stored one when known,
/// else the next counter value (skipping the digest's fixed id).
Future<int> commitmentNotificationId(
  SharedPreferences prefs,
  String commitmentId,
) async {
  final map = readCommitmentNotifIds(prefs);
  final existing = map[commitmentId];
  if (existing != null) return existing;
  var next = (prefs.getInt(commitmentNotifIdCounterKey) ?? 0) + 1;
  while (next == digestNotificationId || next == monthCloseNotificationId) {
    next++;
  }
  map[commitmentId] = next;
  await prefs.setInt(commitmentNotifIdCounterKey, next);
  await prefs.setString(commitmentNotifIdMapKey, jsonEncode(map));
  return next;
}

/// Next occurrence of `dueDay` at 09:00 in [now]'s timezone, strictly
/// after [now] — rolls to next month when today's occurrence already
/// passed. The day is clamped to the month's real length: TZDateTime
/// overflow-normalizes `day=31` in a 30-day month forward to the 1st of
/// the following month — an end-of-month reminder firing a day late on
/// the wrong date.
tz.TZDateTime nextCommitmentDue(int dueDay, tz.TZDateTime now) {
  tz.TZDateTime inMonth(int year, int month) {
    final lastDay = DateTime(year, month + 1, 0).day;
    return tz.TZDateTime(
      now.location,
      year,
      month,
      dueDay > lastDay ? lastDay : dueDay,
      9,
    );
  }

  var due = inMonth(now.year, now.month);
  if (!due.isAfter(now)) {
    final next = DateTime(now.year, now.month + 1);
    due = inMonth(next.year, next.month);
  }
  return due;
}

/// A monthly repeating notification anchors on ONE day-of-month — the
/// plugin scans forward for an exact day match, so an anchor missing
/// from a month (day 29–31 vs February, day 31 vs every 30-day month)
/// silently skips that month entirely. 28 is the largest due day every
/// month contains, so days ≤28 stay on the repeating path and 29–31 are
/// armed as [eomReminderHorizonMonths] clamped one-shots instead.
const maxRecurringDueDay = 28;

/// Months pre-armed as one-shots for day-29–31 commitments — a year of
/// correct end-of-month fires even if the app is never reopened; every
/// [NotificationService.scheduleCommitmentReminders] run re-computes and
/// rolls the window forward.
const eomReminderHorizonMonths = 12;

/// The next [count] monthly occurrences of [dueDay] at 09:00, each
/// clamped to its month's real last day — the armed set for end-of-month
/// commitments (see [maxRecurringDueDay]).
List<tz.TZDateTime> nextCommitmentDues(
  int dueDay,
  tz.TZDateTime now,
  int count,
) {
  final dues = <tz.TZDateTime>[];
  var probe = now;
  for (var i = 0; i < count; i++) {
    // nextCommitmentDue is strictly-after, so probing just past each hit
    // lands on the following month's clamped day.
    final due = nextCommitmentDue(dueDay, probe);
    dues.add(due);
    probe = due.add(const Duration(minutes: 1));
  }
  return dues;
}

/// Persisted-id key for a day-29–31 slot — `'$commitmentId#yyyyMM'` keeps
/// each month's one-shot under the same id allocator, so re-arms replace
/// rather than stack and the sweep can retire expired slots.
String eomSlotKey(String commitmentId, tz.TZDateTime due) =>
    '$commitmentId#${due.year}${due.month.toString().padLeft(2, '0')}';

/// Allocator-map namespace for reconcile reminders (D19) — the keys sit
/// in the same `mf_commitment_notif_ids` map so the shared id counter
/// still applies, but the `recon:` prefix keeps each scheduler's sweep
/// inside its own ownership boundary.
const reconcileNotifKeyPrefix = 'recon:';

/// Id-map key for a day ≤28 repeating reconcile reminder.
String reconcileReminderKey(String accountId) =>
    '$reconcileNotifKeyPrefix$accountId';

/// Id-map key for one clamped end-of-month slot of a day 29–31
/// reconcile reminder — same shape as [eomSlotKey].
String reconcileReminderSlotKey(String accountId, tz.TZDateTime due) =>
    eomSlotKey(reconcileReminderKey(accountId), due);

/// One alarm the reconcile scheduler must hold armed — a day ≤28
/// monthly repeat ([repeatsMonthly]) or a clamped one-shot for a
/// day 29–31 "end of month" reminder.
class ReconcileReminderPlan {
  const ReconcileReminderPlan({
    required this.key,
    required this.title,
    required this.body,
    required this.fireAt,
    required this.repeatsMonthly,
  });

  /// Allocator-map key — `recon:<accountId>` or its `#yyyyMM` slot.
  final String key;
  final String title;
  final String body;
  final tz.TZDateTime fireAt;
  final bool repeatsMonthly;
}

/// The armed set for the reconcile scheduler — pure so the arm/sweep
/// decision is unit-testable without the plugin. A reminder exists only
/// while ALL of these hold: the account is in the live list and not
/// archived, the stored day is a real day-of-month (1–31). Anything else
/// (deleted account, closed account, corrupt day) arms nothing — the
/// caller's sweep then retires whatever a previous run armed.
///
/// Day ≤[maxRecurringDueDay] rides one `dayOfMonthAndTime` repeat; days
/// 29–31 ride the clamped one-shot horizon exactly like commitment dues
/// — a repeating anchor would silently skip months that lack the day.
List<ReconcileReminderPlan> planReconcileReminders({
  required Map<String, int> reminders,
  required List<AccountSummary> accounts,
  required tz.TZDateTime now,
}) {
  const body =
      'Hôm nay là ngày sao kê bạn đã chọn — mở MoneyFlow để đối chiếu số dư.';
  final plans = <ReconcileReminderPlan>[];
  for (final a in accounts) {
    if (a.isArchived) continue;
    final day = reminders[a.id];
    if (day == null || day < 1 || day > 31) continue;
    final title = 'Đối soát ${a.name}';
    if (day <= maxRecurringDueDay) {
      plans.add(
        ReconcileReminderPlan(
          key: reconcileReminderKey(a.id),
          title: title,
          body: body,
          fireAt: nextCommitmentDue(day, now),
          repeatsMonthly: true,
        ),
      );
    } else {
      for (final due in nextCommitmentDues(
        day,
        now,
        eomReminderHorizonMonths,
      )) {
        plans.add(
          ReconcileReminderPlan(
            key: reconcileReminderSlotKey(a.id, due),
            title: title,
            body: body,
            fireAt: due,
            repeatsMonthly: false,
          ),
        );
      }
    }
  }
  return plans;
}

/// Notification opt-ins — SharedPreferences only; the `mf_` prefix keeps
/// them inside the wipeLocalData contract.
class NotificationPrefs {
  NotificationPrefs._();

  static const _weeklyDigestKey = 'mf_weekly_digest_enabled';
  static const _monthDigestKey = 'mf_month_digest_enabled';

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

  /// The month-close digest (D9) — same opt-in contract: a nudge, never
  /// unasked, default OFF.
  static Future<bool> loadMonthDigestEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_monthDigestKey) ?? false;
  }

  static Future<void> saveMonthDigestEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_monthDigestKey, enabled);
  }
}

/// Per-account reconcile-reminder opt-ins (D19) — `{accountId: day}`.
/// Device-local under the `mf_` prefix (wipeLocalData sweeps it); the
/// armed alarms re-resolve against the live accounts list on every
/// schedule pass, so a deleted or closed account's nudge dies with it.
/// Statement days are a private rhythm — they survive ordinary sign-out
/// like the commitment reminders do, and never name money amounts.
class ReconcileReminderPrefs {
  ReconcileReminderPrefs._();

  static const key = 'mf_reconcile_reminder_days';

  /// Reads the stored map; a corrupt blob or out-of-range day reads as
  /// absent — a bad pref costs one reminder, never crashes a load.
  static Map<String, int> load(SharedPreferences prefs) {
    try {
      final decoded = jsonDecode(prefs.getString(key) ?? '{}');
      if (decoded is! Map) return {};
      return {
        for (final e in decoded.entries)
          if (e.key is String &&
              e.value is num &&
              e.value >= 1 &&
              e.value <= 31)
            e.key as String: (e.value as num).toInt(),
      };
    } on Object {
      return {};
    }
  }

  /// One account's stored day-of-month, null when unset.
  static int? dayFor(SharedPreferences prefs, String accountId) =>
      load(prefs)[accountId];

  /// Sets (or clears, [day] null) one account's reminder day.
  static Future<void> saveDay(
    SharedPreferences prefs,
    String accountId,
    int? day,
  ) async {
    final map = load(prefs);
    if (day == null) {
      map.remove(accountId);
    } else {
      map[accountId] = day;
    }
    await prefs.setString(key, jsonEncode(map));
  }
}

/// Rebuild the digest copy from the freshest rows and re-arm (or cancel)
/// the Sunday one-shot. Orchestration lives here, away from the plugin
/// calls, so the schedule/cancel decision is unit-testable with fakes:
///
/// - disabled -> cancel only; the range read is skipped so an opted-out
///   digest never even costs a request;
/// - a truncated range read -> leave the previous schedule untouched —
///   a notification quoting totals we know may be incomplete would lie;
/// - a week with no recorded rows -> cancel, never ping an empty summary;
/// - otherwise -> re-arm with the just-computed title/body.
Future<void> refreshWeeklyDigest({
  required bool enabled,
  required Future<({List<Transaction> rows, bool truncated})> Function(
    String from,
    String to,
  )
  loadRange,
  required Future<void> Function({
    required String title,
    required String body,
    required DateTime fireAt,
  })
  schedule,
  required Future<void> Function() cancel,
  DateTime? now,
  int digestHour = weeklyDigestHour,
  int digestMinute = weeklyDigestMinute,
}) async {
  if (!enabled) {
    await cancel();
    return;
  }
  final fire = nextWeeklyDigestFire(
    now ?? DateTime.now(),
    hour: digestHour,
    minute: digestMinute,
  );
  final window = weeklyDigestWindow(fire);
  final range = await loadRange(window.loadFrom, window.loadTo);
  if (range.truncated) return;
  final copy = weeklyDigestCopy(buildWeeklyDigest(range.rows, fireDate: fire));
  if (copy == null) {
    await cancel();
    return;
  }
  await schedule(title: copy.title, body: copy.body, fireAt: fire);
}

/// The month-close counterpart of [refreshWeeklyDigest] — identical
/// orchestration contract (disabled → cancel only, truncated read →
/// leave the previous schedule untouched, quiet month → cancel),
/// anchored on [nextMonthCloseFire]/[monthCloseWindow]. The digest
/// fire time is the shared one ([SettingsPrefs.loadDigestTime] feeds
/// [digestHour]/[digestMinute]) — one clock for both summaries.
Future<void> refreshMonthCloseDigest({
  required bool enabled,
  required Future<({List<Transaction> rows, bool truncated})> Function(
    String from,
    String to,
  )
  loadRange,
  required Future<void> Function({
    required String title,
    required String body,
    required DateTime fireAt,
  })
  schedule,
  required Future<void> Function() cancel,
  DateTime? now,
  int digestHour = monthCloseHour,
  int digestMinute = monthCloseMinute,
}) async {
  if (!enabled) {
    await cancel();
    return;
  }
  final fire = nextMonthCloseFire(
    now ?? DateTime.now(),
    hour: digestHour,
    minute: digestMinute,
  );
  final window = monthCloseWindow(fire);
  final range = await loadRange(window.loadFrom, window.loadTo);
  if (range.truncated) return;
  final copy = monthCloseCopy(
    buildMonthCloseDigest(range.rows, fireDate: fire),
  );
  if (copy == null) {
    await cancel();
    return;
  }
  await schedule(title: copy.title, body: copy.body, fireAt: fire);
}
