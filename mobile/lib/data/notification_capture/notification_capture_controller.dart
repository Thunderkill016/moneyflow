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

/// Draft-submit gate (see file header). `create_inbox_candidates` is live
/// on acceptance and production since 2026-10-14 (device-verified: a
/// posted bank notification became a pending candidate through the RPC).
/// The define stays as an emergency off-switch, not an enable.
const kNotificationDraftSubmitEnabled = bool.fromEnvironment(
  'MF_NOTIFICATION_DRAFT_SUBMIT',
  defaultValue: true,
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

  /// Per-account durable outbox — drafts held on a queueable failure
  /// survive the process, scoped to the owner exactly like the offline
  /// capture queue.
  static String outboxKeyFor(String userId) => 'mf_notif_outbox_$userId';

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

  /// Ownership fence — bumped on every bind/unbind/dispose. Async work
  /// captures it at entry and re-checks after each await: an event that
  /// arrived under account A can never submit, dedupe, or bump counters
  /// under account B just because the bind flipped mid-flight.
  var _generation = 0;

  NotificationCaptureStats get stats => _stats;

  /// Opt-in state — OFF by default, device-scoped.
  Future<bool> isEnabled() async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    return prefs.getBool(enabledKey) ?? false;
  }

  Future<void> setEnabled(bool enabled) async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    await prefs.setBool(enabledKey, enabled);
    // The native listener only runs (and only persists raw text) while it
    // sees a live owner + enabled mirror — sync it on every toggle. A
    // null owner would read as sign-out and wipe a parked queue the
    // next bind could have drained, so unbound toggles stay device-side.
    final userId = _userId;
    if (userId != null) {
      await _gateway.setCaptureSession(userId, enabled);
    }
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
    _generation++;
    await _sub?.cancel();
    _sub = null;
  }

  /// (Re)bind to the signed-in account: reloads its dedupe ring + stats,
  /// drains events parked while the engine was detached, and retries held
  /// drafts. A null userId unbinds — signed-out handling drops everything.
  Future<void> bind(String? userId) async {
    _generation++;
    final gen = _generation;
    _prefs ??= await SharedPreferences.getInstance();
    // A newer bind that started during the prefs await already owns the
    // controller — this stale bind must not clobber _userId back.
    if (gen != _generation) return;
    _userId = userId;
    _seen.clear();
    _seenSet = {};
    _stats = const NotificationCaptureStats();
    if (userId == null) {
      _outbox.clear();
      // Same native cleanup as unbind: no owner, no parked raw text.
      await _gateway.setCaptureSession(null, false);
      await _gateway.clearPending();
      return;
    }
    try {
      _seen.addAll(_prefs!.getStringList(seenKeyFor(userId)) ?? const []);
      _seenSet = _seen.toSet();
      final statsRaw = _prefs!.getString(statsKeyFor(userId));
      if (statsRaw != null) {
        _stats = NotificationCaptureStats.fromJson(jsonDecode(statsRaw));
      }
      _restoreOutbox(userId);
    } on Object {
      // Corrupt prefs read as fresh state — never crash a bind.
    }
    // Establish ownership natively before draining: the parked queue
    // answers only to this userId, and another owner's leftovers were
    // already discarded by the session swap.
    await _gateway.setCaptureSession(userId, await isEnabled());
    await flushPending();
    await _drainOutbox();
  }

  /// Signed out — release account state and the parked raw events; nothing
  /// notification-derived may persist unattributed.
  Future<void> unbind() async {
    _generation++;
    _userId = null;
    _seen.clear();
    _seenSet = {};
    _outbox.clear();
    _stats = const NotificationCaptureStats();
    await _gateway.setCaptureSession(null, false);
    await _gateway.clearPending();
  }

  /// Events parked by the service while Dart was detached — drained once,
  /// then cleared Kotlin-side. Each parked event is handled under the
  /// owner that STARTED the flush; a rebind mid-drain abandons the rest
  /// rather than reattributing them to the new account.
  Future<void> flushPending() async {
    final gen = _generation;
    final userId = _userId;
    if (userId == null) return;
    try {
      // The owner check rides into native: parked raw text only answers
      // to the account that captured it.
      final pending = await _gateway.consumePending(userId);
      if (gen != _generation) return;
      for (final raw in pending) {
        if (gen != _generation) return;
        await _handle(raw, gen, userId);
      }
    } on Object catch (e) {
      debugPrint('notif-capture: pending flush failed: $e');
    }
  }

  void _onEvent(RawBankNotification raw) {
    final gen = _generation;
    final userId = _userId;
    if (userId == null) return;
    unawaited(_handle(raw, gen, userId));
  }

  Future<void> _handle(RawBankNotification raw, int gen, String userId) async {
    if (!await isEnabled()) return;
    // The isEnabled await is a rebind window — if the account flipped,
    // this event belongs to the old owner and must not touch the new
    // one's dedupe ring, stats, or session-bound submit.
    if (gen != _generation || _userId != userId) return;

    final key = notificationDedupeKey(
      packageName: raw.packageName,
      title: raw.title,
      text: raw.text,
      postTimeMs: raw.postTimeMs,
    );
    if (_seenSet.contains(key)) return; // re-broadcast — already handled

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
      _markSeen(key);
      _bump(received: 1);
      _bump(parseFailed: 1);
      return;
    }

    // The draft must exist durably before the event counts as handled —
    // the reviewed loss was exactly "seen" persisted while the only copy
    // of the draft lived in RAM. A crash between these two lines still
    // leaves the draft in the outbox for the next bind's drain.
    await _persistOutbox(draft, userId);
    if (gen != _generation || _userId != userId) return;
    _markSeen(key);
    _bump(received: 1);
    _bump(parsed: 1);

    if (!_submitEnabled) {
      // Blocked-on-migration state — the draft stays held in the durable
      // outbox and a flag-on build's bind drains it.
      return;
    }
    await _submitOne(draft, gen);
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

  Future<void> _submitOne(BankNotificationDraft draft, int gen) async {
    // Submit only while the captured generation still owns the session —
    // _submit rides the live auth session, so a rebind mid-pipeline must
    // not let an old-owner draft go out under the new account.
    if (gen != _generation) return;
    try {
      await _submit([draft]);
      if (gen != _generation) return;
      await _removeOutbox(draft, gen);
      _bump(submitted: 1);
      // A landed write proves connectivity — retry anything held.
      if (_outbox.isNotEmpty) unawaited(_drainOutbox());
    } catch (e) {
      if (gen != _generation) return;
      if (isQueueableSubmitFailure(e)) {
        // The draft is already in the durable outbox — the next
        // connectivity-proven drain retries it with the same dedupe key.
        return;
      }
      // The server already decided (business rejection, missing RPC) —
      // retrying changes nothing; count the drop honestly.
      await _removeOutbox(draft, gen);
      _bump(dropped: 1);
      debugPrint('notif-capture: draft rejected: $e');
    }
  }

  /// Persist-first outbox: drafts enter durable storage before their
  /// event marks seen, and leave only on a server ACK or a business
  /// rejection. The dedupeKey guard makes a persist→markSeen crash
  /// re-handle idempotent.
  Future<void> _persistOutbox(
    BankNotificationDraft draft,
    String userId,
  ) async {
    if (_outbox.any((d) => d.dedupeKey == draft.dedupeKey)) return;
    _outbox.add(draft);
    while (_outbox.length > outboxMax) {
      _outbox.removeAt(0);
      _bump(dropped: 1);
      debugPrint('notif-capture: outbox full, dropped oldest draft');
    }
    final prefs = _prefs;
    if (prefs == null) return;
    // Snapshot before the sole await — a rebind inside the write must
    // not let a cleared _outbox serialize over this owner's file.
    final snapshot = jsonEncode([for (final d in _outbox) d.toJson()]);
    await prefs.setString(outboxKeyFor(userId), snapshot);
  }

  Future<void> _removeOutbox(BankNotificationDraft draft, int gen) async {
    if (gen != _generation) return;
    final userId = _userId;
    if (userId == null) return;
    if (!_outbox.remove(draft)) return;
    final snapshot = jsonEncode([for (final d in _outbox) d.toJson()]);
    await _prefs?.setString(outboxKeyFor(userId), snapshot);
  }

  /// Held drafts this account parked in an earlier session — restored on
  /// bind so a killed process never quietly loses evidence. Malformed
  /// entries drop individually, same contract as the offline queue.
  void _restoreOutbox(String userId) {
    final raw = _prefs!.getString(outboxKeyFor(userId));
    if (raw == null) return;
    final decoded = jsonDecode(raw);
    if (decoded is! List) return;
    for (final entry in decoded) {
      if (entry is! Map) continue;
      final draft = BankNotificationDraft.fromJson(
        entry.cast<String, Object?>(),
      );
      // A draft without provable amount or identity could never submit —
      // it is corrupt storage, not evidence.
      if (draft.dedupeKey.isEmpty || draft.amountMinor <= 0) continue;
      _outbox.add(draft);
    }
    while (_outbox.length > outboxMax) {
      _outbox.removeAt(0);
      _bump(dropped: 1);
    }
  }

  Future<void> _drainOutbox() async {
    // The submit flag gates the whole outbox too — a flag-off build
    // still persists drafts (parsed, counted) but never sends them.
    if (_submitting || _outbox.isEmpty || !_submitEnabled) return;
    _submitting = true;
    final gen = _generation;
    try {
      final pending = List.of(_outbox);
      for (final draft in pending) {
        // Stop the whole pass on a rebind — the outbox was cleared for
        // the new owner, and resubmitting under it would misattribute.
        if (gen != _generation) return;
        try {
          await _submit([draft]);
          if (gen != _generation) return;
          await _removeOutbox(draft, gen);
          _bump(submitted: 1);
        } catch (e) {
          if (gen != _generation) return;
          if (isQueueableSubmitFailure(e)) break; // still offline — keep rest
          await _removeOutbox(draft, gen);
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
