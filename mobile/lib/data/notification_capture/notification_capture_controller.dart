// Notification-capture pipeline: whitelisted notification → dedupe → parse
// → submit as a pending inbox draft. Every stage is best-effort and every
// drop is counted — the listener must never crash, and a failure must never
// pretend a draft landed.
//
// Submit path: `create_inbox_candidates` — the SECURITY DEFINER RPC drafted
// in db/neon/migrations/20261010122000 for batch-less sources. Applied on
// the acceptance sandbox (verified live end-to-end 2026-10-14: listener →
// parse → submit → pending candidate → approve). The flag below keeps the
// submit path opt-in per build until the same migration is verified on
// production — parsed notifications are counted either way, submitted
// ones only when it is on.
//
// Canon guardrails implemented here:
//  - opt-in only, default OFF, device-scoped;
//  - nothing runs while signed out — drafts need a user, and raw
//    notification text must never persist unattributed;
//  - dedupe rides the deterministic `notif:` key so re-broadcasts don't
//    double-create drafts;
//  - drafts are best-effort: queueable failures retry in a tiny in-memory
//    outbox, business rejections drop with a log — never a crash.

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../offline_queue.dart' show isQueueableSubmitFailure;
import 'bank_notification_parser.dart';
import 'notification_capture_channel.dart';

/// Build-time gate for the draft submit path (see file header). Build with
/// `--dart-define=MF_NOTIFICATION_DRAFT_SUBMIT=true` once the
/// create_inbox_candidates migration is applied upstream.
const kNotificationDraftSubmitEnabled = bool.fromEnvironment(
  'MF_NOTIFICATION_DRAFT_SUBMIT',
);

/// What the pipeline did with a notification — persisted per account so the
/// settings sheet can show honest evidence of work ("Đã nhận N · tạo M nháp").
class NotificationCaptureStats {
  const NotificationCaptureStats({
    this.received = 0,
    this.parseFailed = 0,
    this.parsed = 0,
    this.submitted = 0,
    this.dropped = 0,
  });

  /// Whitelisted events handled while enabled (deduped).
  final int received;

  /// Events with no provable amount — no draft can exist for them.
  final int parseFailed;

  /// Events parsed into a draft.
  final int parsed;

  /// Drafts the server accepted.
  final int submitted;

  /// Drafts permanently dropped (business rejection, outbox overflow).
  final int dropped;

  NotificationCaptureStats copy({
    int? received,
    int? parseFailed,
    int? parsed,
    int? submitted,
    int? dropped,
  }) => NotificationCaptureStats(
    received: received ?? this.received,
    parseFailed: parseFailed ?? this.parseFailed,
    parsed: parsed ?? this.parsed,
    submitted: submitted ?? this.submitted,
    dropped: dropped ?? this.dropped,
  );

  Map<String, int> toJson() => {
    'received': received,
    'parseFailed': parseFailed,
    'parsed': parsed,
    'submitted': submitted,
    'dropped': dropped,
  };

  factory NotificationCaptureStats.fromJson(Object? raw) {
    if (raw is! Map) return const NotificationCaptureStats();
    int v(String k) => (raw[k] as num?)?.toInt() ?? 0;
    return NotificationCaptureStats(
      received: v('received'),
      parseFailed: v('parseFailed'),
      parsed: v('parsed'),
      submitted: v('submitted'),
      dropped: v('dropped'),
    );
  }
}

class NotificationCaptureController {
  NotificationCaptureController({
    required NotificationCaptureGateway gateway,
    required Future<void> Function(List<BankNotificationDraft> drafts) submit,
    bool submitEnabled = kNotificationDraftSubmitEnabled,
  }) : _gateway = gateway,
       _submit = submit,
       _submitEnabled = submitEnabled;

  final NotificationCaptureGateway _gateway;
  final Future<void> Function(List<BankNotificationDraft> drafts) _submit;
  final bool _submitEnabled;

  /// Device-level opt-in (`mf_` prefix → inside the wipeLocalData sweep,
  /// surviving ordinary sign-out like the biometric/digest opt-ins).
  static const enabledKey = 'mf_notif_capture_enabled';

  /// Per-account dedupe ring + counters — same scoping contract as the
  /// offline queue, so two accounts on one device can never share
  /// notification evidence.
  static String seenKeyFor(String userId) => 'mf_notif_seen_$userId';
  static String statsKeyFor(String userId) => 'mf_notif_stats_$userId';

  /// Dedupe ring bound — weeks of bank pushes; oldest ids evict FIFO.
  static const seenSetMax = 300;

  /// Held-draft bound — drafts are best-effort, so a long outage drops the
  /// oldest rather than buffering unbounded raw text.
  static const outboxMax = 20;

  String? _userId;
  SharedPreferences? _prefs;
  StreamSubscription<RawBankNotification>? _sub;
  final _seen = <String>[];
  var _seenSet = <String>{};
  var _stats = const NotificationCaptureStats();
  final _outbox = <BankNotificationDraft>[];
  bool _submitting = false;

  NotificationCaptureStats get stats => _stats;

  /// Opt-in state — OFF by default, device-scoped.
  Future<bool> isEnabled() async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    return prefs.getBool(enabledKey) ?? false;
  }

  Future<void> setEnabled(bool enabled) async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    await prefs.setBool(enabledKey, enabled);
  }

  /// Subscribe to live events once — cheap even before opt-in because the
  /// handler exits early while disabled/signed out.
  void start() {
    _sub ??= _gateway.stream().listen(
      _onEvent,
      // A dead channel (non-Android host) must not take the listener
      // down — treat it as "no events".
      onError: (Object _) {},
    );
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    _sub = null;
  }

  /// (Re)bind to the signed-in account: reloads its dedupe ring + stats,
  /// drains events parked while the engine was detached, and retries held
  /// drafts. A null userId unbinds — signed-out handling drops everything.
  Future<void> bind(String? userId) async {
    _prefs ??= await SharedPreferences.getInstance();
    _userId = userId;
    _seen.clear();
    _seenSet = {};
    _stats = const NotificationCaptureStats();
    if (userId == null) {
      _outbox.clear();
      return;
    }
    try {
      _seen.addAll(_prefs!.getStringList(seenKeyFor(userId)) ?? const []);
      _seenSet = _seen.toSet();
      final statsRaw = _prefs!.getString(statsKeyFor(userId));
      if (statsRaw != null) {
        _stats = NotificationCaptureStats.fromJson(jsonDecode(statsRaw));
      }
    } on Object {
      // Corrupt prefs read as fresh state — never crash a bind.
    }
    await flushPending();
    await _drainOutbox();
  }

  /// Signed out — release account state and the parked raw events; nothing
  /// notification-derived may persist unattributed.
  Future<void> unbind() async {
    _userId = null;
    _seen.clear();
    _seenSet = {};
    _outbox.clear();
    _stats = const NotificationCaptureStats();
    await _gateway.clearPending();
  }

  /// Events parked by the service while Dart was detached — drained once,
  /// then cleared Kotlin-side.
  Future<void> flushPending() async {
    if (_userId == null) return;
    try {
      final pending = await _gateway.consumePending();
      for (final raw in pending) {
        await _handle(raw);
      }
    } on Object catch (e) {
      debugPrint('notif-capture: pending flush failed: $e');
    }
  }

  void _onEvent(RawBankNotification raw) {
    if (_userId == null) return;
    unawaited(_handle(raw));
  }

  Future<void> _handle(RawBankNotification raw) async {
    final userId = _userId;
    if (userId == null || !await isEnabled()) return;

    final key = notificationDedupeKey(
      packageName: raw.packageName,
      title: raw.title,
      text: raw.text,
      postTimeMs: raw.postTimeMs,
    );
    if (_seenSet.contains(key)) return; // re-broadcast — already handled
    _markSeen(key);
    _bump(received: 1);

    final draft = parseBankNotification(
      packageName: raw.packageName,
      sourceLabel: raw.sourceLabel,
      title: raw.title,
      text: raw.text,
      postTimeMs: raw.postTimeMs,
    );
    if (draft == null) {
      // No provable amount → no draft can exist (see parser header). The
      // notification is still counted so the drop is visible.
      _bump(parseFailed: 1);
      return;
    }
    _bump(parsed: 1);

    if (!_submitEnabled) {
      // Blocked-on-migration state — counted as parsed, never submitted.
      return;
    }
    await _submitOne(draft);
  }

  void _markSeen(String key) {
    _seenSet.add(key);
    _seen.add(key);
    while (_seen.length > seenSetMax) {
      _seenSet.remove(_seen.removeAt(0));
    }
    unawaited(
      _prefs?.setStringList(seenKeyFor(_userId!), _seen) ?? Future.value(),
    );
  }

  Future<void> _submitOne(BankNotificationDraft draft) async {
    try {
      await _submit([draft]);
      _bump(submitted: 1);
      // A landed write proves connectivity — retry anything held.
      if (_outbox.isNotEmpty) unawaited(_drainOutbox());
    } catch (e) {
      if (isQueueableSubmitFailure(e)) {
        _hold(draft);
      } else {
        // The server already decided (business rejection, missing RPC) —
        // retrying changes nothing; count the drop honestly.
        _bump(dropped: 1);
        debugPrint('notif-capture: draft rejected: $e');
      }
    }
  }

  void _hold(BankNotificationDraft draft) {
    _outbox.add(draft);
    while (_outbox.length > outboxMax) {
      _outbox.removeAt(0);
      _bump(dropped: 1);
      debugPrint('notif-capture: outbox full, dropped oldest draft');
    }
  }

  Future<void> _drainOutbox() async {
    if (_submitting || _outbox.isEmpty) return;
    _submitting = true;
    try {
      final pending = List.of(_outbox);
      for (final draft in pending) {
        try {
          await _submit([draft]);
          _outbox.remove(draft);
          _bump(submitted: 1);
        } catch (e) {
          if (isQueueableSubmitFailure(e)) break; // still offline — keep rest
          _outbox.remove(draft);
          _bump(dropped: 1);
        }
      }
    } finally {
      _submitting = false;
    }
  }

  void _bump({
    int received = 0,
    int parseFailed = 0,
    int parsed = 0,
    int submitted = 0,
    int dropped = 0,
  }) {
    _stats = _stats.copy(
      received: _stats.received + received,
      parseFailed: _stats.parseFailed + parseFailed,
      parsed: _stats.parsed + parsed,
      submitted: _stats.submitted + submitted,
      dropped: _stats.dropped + dropped,
    );
    final userId = _userId;
    final prefs = _prefs;
    if (userId != null && prefs != null) {
      unawaited(
        prefs.setString(statsKeyFor(userId), jsonEncode(_stats.toJson())),
      );
    }
  }
}
