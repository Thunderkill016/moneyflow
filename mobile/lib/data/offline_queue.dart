// Offline capture queue — a capture whose submit failed on a transport
// or server fault is held here and replayed later through the exact same
// submit path with the same idempotency key. The write is never silently
// lost, and the server-enforced key means a replay is safe even when the
// original request actually landed but its response never arrived.
//
// Business rejections never enter the queue (the server already
// decided), and a business rejection during replay drops the entry with
// an honest reason instead of retrying forever.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../domain/models.dart';
import '../domain/split.dart';
import '../features/capture/capture_page.dart' show CaptureIntent;
import '../features/capture/capture_submit.dart';
import 'neon/auth_client.dart';

/// SharedPreferences key. The `mf_` prefix keeps the queue inside the
/// wipeLocalData sweep, same as the other product prefs.
const offlineQueueStorageKey = 'mf_offline_capture_queue';

/// Held captures belong to the account that wrote them — the storage key
/// is scoped by userId so a different account signing in on the same
/// device can never see or replay them. A null userId (pre-scoping
/// sessions, demo) falls back to the legacy unscoped key.
String offlineQueueKeyFor(String? userId) => userId == null
    ? offlineQueueStorageKey
    : '${offlineQueueStorageKey}_$userId';

/// Held-write cap. More than this means the device has been offline a
/// very long time; the next enqueue is refused with [OfflineQueueFull] —
/// a hard error, never a silent drop of someone's money record.
const offlineQueueMaxPending = 20;

/// A capture intent held for replay. [enqueuedAtMs] is diagnostic
/// (ordering is the list position); [intent.idempotencyKey] is the
/// unique handle used for removal.
class QueuedCapture {
  const QueuedCapture({required this.intent, required this.enqueuedAtMs});

  final CaptureIntent intent;
  final int enqueuedAtMs;

  Map<String, Object?> toJson() => {
    'enqueuedAtMs': enqueuedAtMs,
    'kind': _kindToWire(intent.kind),
    'accountId': intent.accountId,
    'destinationAccountId': intent.destinationAccountId,
    'categoryId': intent.categoryId,
    'amount': intent.amount,
    'occurredOn': intent.occurredOn,
    'note': intent.note,
    'payee': intent.payee,
    'idempotencyKey': intent.idempotencyKey,
    'repeatMonthly': intent.repeatMonthly,
    'dueDay': intent.dueDay,
    'commitmentName': intent.commitmentName,
    'transactionId': intent.transactionId,
    'expectedUpdatedAt': intent.expectedUpdatedAt,
    'excludedFromReports': intent.excludedFromReports,
    'isRefund': intent.isRefund,
    'splitLines': [
      for (final l in intent.splitLines)
        {'categoryId': l.categoryId, 'amount': l.amount},
    ],
  };

  /// Strict decode — a malformed entry throws [FormatException] so the
  /// loader can drop just that entry instead of the whole queue.
  factory QueuedCapture.fromJson(Map<String, Object?> json) => QueuedCapture(
    enqueuedAtMs: _reqInt(json, 'enqueuedAtMs'),
    intent: CaptureIntent(
      kind: _kindFromWire(_reqString(json, 'kind')),
      accountId: _reqString(json, 'accountId'),
      destinationAccountId: _optString(json, 'destinationAccountId'),
      categoryId: _optString(json, 'categoryId'),
      amount: _reqInt(json, 'amount'),
      occurredOn: _reqString(json, 'occurredOn'),
      note: _optString(json, 'note') ?? '',
      payee: _optString(json, 'payee') ?? '',
      idempotencyKey: _reqString(json, 'idempotencyKey'),
      repeatMonthly: _optBool(json, 'repeatMonthly') ?? false,
      dueDay: _optInt(json, 'dueDay') ?? 1,
      commitmentName: _optString(json, 'commitmentName') ?? '',
      transactionId: _optString(json, 'transactionId'),
      expectedUpdatedAt: _optString(json, 'expectedUpdatedAt'),
      excludedFromReports: _optBool(json, 'excludedFromReports'),
      isRefund: _optBool(json, 'isRefund'),
      splitLines: [
        for (final raw in _optList(json, 'splitLines') ?? const [])
          _splitLineFromJson(raw),
      ],
    ),
  );
}

/// FIFO store of held captures, persisted as one JSON blob so list order
/// IS replay order. A [ChangeNotifier] so the pending-writes banner can
/// follow queue changes without polling.
class OfflineCaptureQueue extends ChangeNotifier {
  OfflineCaptureQueue(this._prefs, {String? userId})
    : _storageKey = offlineQueueKeyFor(userId) {
    _restore();
  }

  final SharedPreferences _prefs;
  final String _storageKey;

  var _items = <QueuedCapture>[];
  int? _lastAttemptAtMs;
  bool _draining = false;
  bool _disposed = false;

  /// Ownership fence — bumped when the queue is released on a bind
  /// change. A drain pass captures it at entry: an in-flight replay
  /// that outlives the owner's session must neither submit (the shared
  /// auth client may already carry the next account's JWT) nor remove
  /// entries on a verdict reached under a foreign session.
  var _epoch = 0;
  int get epoch => _epoch;

  /// Held captures, oldest first.
  List<QueuedCapture> get pending => List.unmodifiable(_items);

  int get pendingCount => _items.length;

  /// Epoch ms of the last replay pass — the banner's last-attempt hint.
  int? get lastAttemptAtMs => _lastAttemptAtMs;

  /// True while a replay pass is running — suppresses re-entrant drains
  /// and disables the manual retry button.
  bool get draining => _draining;

  /// The queue outlives the widget tree (account-scoped, not
  /// screen-scoped), so dispose means "the owner changed" — bump the
  /// epoch so a stale drain pass can never send or delete this
  /// account's held captures under the next sign-in.
  @override
  void dispose() {
    _epoch++;
    _disposed = true;
    super.dispose();
  }

  /// Append an intent. Throws [OfflineQueueFull] at the cap; the caller
  /// surfaces it as a normal submit error so nothing is displaced
  /// silently.
  Future<void> enqueue(CaptureIntent intent) async {
    if (_items.length >= offlineQueueMaxPending) {
      throw const OfflineQueueFull(offlineQueueMaxPending);
    }
    _items.add(
      QueuedCapture(
        intent: intent,
        enqueuedAtMs: DateTime.now().millisecondsSinceEpoch,
      ),
    );
    await _persist();
    _notify();
  }

  /// Remove the entry whose intent carries [idempotencyKey].
  Future<void> remove(String idempotencyKey) async {
    _items.removeWhere((i) => i.intent.idempotencyKey == idempotencyKey);
    await _persist();
    _notify();
  }

  /// Drop every held entry — the data-wipe path also reaches this store
  /// via the `mf_` key prefix.
  Future<void> clear() async {
    _items = [];
    _lastAttemptAtMs = null;
    await _prefs.remove(_storageKey);
    _notify();
  }

  /// ChangeNotifier throws when listeners are notified after dispose —
  /// a stale drain finishing post-unbind must still persist honestly,
  /// just without a UI pulse.
  void _notify() {
    if (!_disposed) notifyListeners();
  }

  void _restore() {
    _restoreFrom(_storageKey);
    // Pre-scoping builds kept held captures under the unscoped key —
    // adopt them (oldest first) instead of dropping someone's money
    // records. The merged list re-persists under the scoped key and the
    // legacy key is removed; idempotency-key dedup keeps a failed
    // cleanup from doubling entries on the next bind.
    if (_storageKey != offlineQueueStorageKey) {
      final legacy = _itemsFrom(_prefs.getString(offlineQueueStorageKey));
      if (legacy.isNotEmpty) {
        final seen = {for (final i in _items) i.intent.idempotencyKey};
        _items = [
          for (final i in legacy)
            if (seen.add(i.intent.idempotencyKey)) i,
          ..._items,
        ];
        unawaited(() async {
          await _persist();
          await _prefs.remove(offlineQueueStorageKey);
        }());
      }
    }
  }

  void _restoreFrom(String key) {
    final raw = _prefs.getString(key);
    if (raw == null) return;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, Object?>) return;
      _lastAttemptAtMs = (decoded['lastAttemptAtMs'] as num?)?.toInt();
      _items = _decodeItems(decoded['items']);
    } on Object {
      // A corrupt blob reads as an empty queue — never crash startup.
    }
  }

  /// Just the entry list of a stored blob — used by the legacy-key
  /// adoption where lastAttempt belongs to the scoped blob alone.
  List<QueuedCapture> _itemsFrom(String? raw) {
    if (raw == null) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, Object?>) return const [];
      return _decodeItems(decoded['items']);
    } on Object {
      return const [];
    }
  }

  List<QueuedCapture> _decodeItems(Object? items) {
    if (items is! List) return const [];
    final restored = <QueuedCapture>[];
    for (final raw in items) {
      if (raw is! Map<String, Object?>) continue;
      // A single corrupt entry is dropped; the rest still replay.
      final item = _tryDecode(raw);
      if (item != null) restored.add(item);
    }
    return restored;
  }

  static QueuedCapture? _tryDecode(Map<String, Object?> json) {
    try {
      return QueuedCapture.fromJson(json);
    } on Object {
      return null;
    }
  }

  Future<void> _persist() => _prefs.setString(
    _storageKey,
    jsonEncode({
      'v': 1,
      'lastAttemptAtMs': _lastAttemptAtMs,
      'items': [for (final i in _items) i.toJson()],
    }),
  );

  void _setDraining(bool value) {
    _draining = value;
    _notify();
  }

  Future<void> _markAttempt() async {
    _lastAttemptAtMs = DateTime.now().millisecondsSinceEpoch;
    await _persist();
  }
}

/// True when the failure is transport- or server-side — the write may
/// not have landed, so holding the intent for replay is honest.
/// [NeonAuthException] carries the HTTP status: 5xx means the server
/// faulted, while 4xx bodies carry PostgREST business codes
/// (`invalid_transaction_entries`, `stale_write`, `*_locked`) — the
/// server already decided, so those never queue.
bool isQueueableSubmitFailure(Object e) => switch (e) {
  SocketException() ||
  HttpException() ||
  TlsException() ||
  TimeoutException() => true,
  NeonAuthException(:final status) => status >= 500,
  _ => false,
};

/// Runs [submit] on [intent]; on a queueable failure the intent is held
/// and [CaptureQueued] signals the form to close with an honest result.
/// Business errors and [CommitmentFailed] propagate untouched — the
/// latter means the transaction already landed, so nothing may queue.
Future<void> submitOrQueue(
  CaptureIntent intent,
  OfflineCaptureQueue queue,
  Future<void> Function(CaptureIntent intent) submit,
) async {
  try {
    await submit(intent);
  } on CommitmentFailed {
    rethrow;
  } catch (e) {
    if (isQueueableSubmitFailure(e)) {
      await queue.enqueue(intent);
      throw const CaptureQueued();
    }
    rethrow;
  }
}

/// What one replay pass did — the shell reports each outcome honestly.
class QueueDrainReport {
  const QueueDrainReport({
    required this.sent,
    required this.partialCommitments,
    required this.dropped,
    required this.stoppedOffline,
  });

  /// Entries whose transaction landed on replay.
  final int sent;

  /// Subset of [sent] where the transaction landed but its monthly
  /// commitment did not — the same honest partial as a live submit.
  final int partialCommitments;

  /// Entries the server rejected — removed from the queue with their
  /// reasons for reporting.
  final List<QueueDrainDrop> dropped;

  /// True when a transport fault ended the pass early — the remaining
  /// entries are still held for the next attempt.
  final bool stoppedOffline;
}

/// A replayed entry the server refused; [error] feeds the shared
/// submit-error mapping for the honest report.
class QueueDrainDrop {
  const QueueDrainDrop({required this.entry, required this.error});

  final QueuedCapture entry;
  final Object error;
}

/// Replay held intents FIFO through [submit] — the same call the live
/// form uses, so RPC routing and idempotency keys stay identical.
/// Successful and business-rejected entries leave the queue; a
/// transport fault stops the pass because the next entry would fail the
/// same way.
Future<QueueDrainReport> drainQueuedCaptures(
  OfflineCaptureQueue queue,
  Future<void> Function(CaptureIntent intent) submit,
) async {
  if (queue.draining) {
    return const QueueDrainReport(
      sent: 0,
      partialCommitments: 0,
      dropped: [],
      stoppedOffline: false,
    );
  }
  queue._setDraining(true);
  await queue._markAttempt();
  final epoch = queue.epoch;
  var sent = 0;
  var partials = 0;
  final dropped = <QueueDrainDrop>[];
  var stoppedOffline = false;
  try {
    for (final item in List.of(queue._items)) {
      // The owner changed mid-pass — stop without a verdict. The held
      // entries stay under their own account key; a replay under the
      // next session's JWT could submit or wrongly drop them.
      if (queue.epoch != epoch) break;
      var keep = false;
      try {
        await submit(item.intent);
        sent++;
      } on CommitmentFailed {
        sent++;
        partials++;
      } catch (e) {
        if (queue.epoch != epoch) {
          // The verdict was reached under a foreign session — never a
          // basis for dropping this owner's held capture.
          break;
        }
        if (isQueueableSubmitFailure(e)) {
          keep = true;
          stoppedOffline = true;
        } else {
          dropped.add(QueueDrainDrop(entry: item, error: e));
        }
      }
      // A landed submit whose owner flipped mid-flight still counts as
      // sent — the entry just stays held and the next pass replays it;
      // the server-side idempotency key makes that replay a no-op.
      if (queue.epoch != epoch) break;
      if (!keep) await queue.remove(item.intent.idempotencyKey);
      if (stoppedOffline) break;
    }
  } finally {
    queue._setDraining(false);
  }
  return QueueDrainReport(
    sent: sent,
    partialCommitments: partials,
    dropped: dropped,
    stoppedOffline: stoppedOffline,
  );
}

// --- Serialization helpers ---------------------------------------------
// Same strict-decode contract as offline_cache.dart: malformed data
// throws FormatException and the caller decides the fallback.

String _kindToWire(TransactionKind kind) => switch (kind) {
  TransactionKind.expense => 'expense',
  TransactionKind.income => 'income',
  TransactionKind.transfer => 'transfer',
};

TransactionKind _kindFromWire(String raw) => switch (raw) {
  'expense' => TransactionKind.expense,
  'income' => TransactionKind.income,
  'transfer' => TransactionKind.transfer,
  _ => throw FormatException('unknown transaction kind: $raw'),
};

SplitLine _splitLineFromJson(Object? raw) {
  final json = _reqMap(raw, 'split line');
  return (
    categoryId: _reqString(json, 'categoryId'),
    amount: _reqInt(json, 'amount'),
  );
}

String _reqString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! String) throw FormatException('"$key" must be a string');
  return value;
}

int _reqInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! num) throw FormatException('"$key" must be a number');
  return value.toInt();
}

int? _optInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! num) throw FormatException('"$key" must be a number or null');
  return value.toInt();
}

bool? _optBool(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! bool) throw FormatException('"$key" must be a bool or null');
  return value;
}

String? _optString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! String) {
    throw FormatException('"$key" must be a string or null');
  }
  return value;
}

List<Object?>? _optList(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! List) throw FormatException('"$key" must be a list or null');
  return value;
}

Map<String, Object?> _reqMap(Object? raw, String context) {
  if (raw is! Map<String, Object?>) {
    throw FormatException('$context entry must be a JSON object');
  }
  return raw;
}
