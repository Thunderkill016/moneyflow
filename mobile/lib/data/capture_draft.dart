import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../domain/models.dart';

/// One editable split line inside a [CaptureDraft] — category plus the
/// amount text exactly as typed (shorthand like "45k" round-trips
/// through parseMoneyInput on restore).
class CaptureDraftSplitLine {
  const CaptureDraftSplitLine({this.categoryId, this.amountText = ''});

  final String? categoryId;
  final String amountText;

  Map<String, Object?> toJson() => {
    'categoryId': categoryId,
    'amountText': amountText,
  };

  static CaptureDraftSplitLine fromJson(Map<String, Object?> json) =>
      CaptureDraftSplitLine(
        categoryId: json['categoryId'] as String?,
        amountText: json['amountText'] as String? ?? '',
      );
}

/// An unsaved capture form, persisted per account so process death (or
/// just an interrupted session) never silently eats half-typed money
/// data. [idempotencyKey] travels with the draft: a submit that died
/// between server commit and client ack re-uses the same key when the
/// restored form is submitted, so the replay dedupes instead of
/// double-posting.
class CaptureDraft {
  const CaptureDraft({
    required this.kind,
    this.amountText = '',
    this.note = '',
    this.payee = '',
    this.accountId,
    this.destinationAccountId,
    this.categoryId,
    this.occurredOn,
    this.repeatMonthly = false,
    this.split = false,
    this.isRefund = false,
    this.splitRows = const [],
    this.idempotencyKey,
    this.savedAtMs = 0,
  });

  final TransactionKind kind;
  final String amountText;
  final String note;
  final String payee;
  final String? accountId;
  final String? destinationAccountId;
  final String? categoryId;

  /// 'yyyy-MM-dd' — null means "still on the today default".
  final String? occurredOn;
  final bool repeatMonthly;
  final bool split;

  /// "Hoàn tiền" switch state (D15) — only meaningful on income drafts;
  /// restore ignores it on any other kind.
  final bool isRefund;
  final List<CaptureDraftSplitLine> splitRows;
  final String? idempotencyKey;

  /// Epoch millis when the draft was written — the TTL clock.
  final int savedAtMs;

  /// True when nothing user-entered distinguishes this from a fresh
  /// form — saving an empty draft (or leaving one stored) would make
  /// every later open flash a false "draft restored" banner.
  bool get isEmpty =>
      kind == TransactionKind.expense &&
      amountText.trim().isEmpty &&
      note.trim().isEmpty &&
      payee.trim().isEmpty &&
      accountId == null &&
      destinationAccountId == null &&
      categoryId == null &&
      occurredOn == null &&
      !repeatMonthly &&
      !split &&
      !isRefund;

  Map<String, Object?> toJson() => {
    'v': 1,
    'kind': kind.name,
    'amountText': amountText,
    'note': note,
    'payee': payee,
    'accountId': accountId,
    'destinationAccountId': destinationAccountId,
    'categoryId': categoryId,
    'occurredOn': occurredOn,
    'repeatMonthly': repeatMonthly,
    'split': split,
    'isRefund': isRefund,
    'splitRows': [for (final r in splitRows) r.toJson()],
    'idempotencyKey': idempotencyKey,
    'savedAtMs': savedAtMs,
  };

  /// Null on any shape drift — a corrupt draft must fall back to the
  /// empty form, never crash open.
  static CaptureDraft? fromJson(Object? raw) {
    if (raw is! Map) return null;
    final kind = TransactionKind.values
        .where((k) => k.name == raw['kind'])
        .firstOrNull;
    if (kind == null) return null;
    final rows = raw['splitRows'];
    return CaptureDraft(
      kind: kind,
      amountText: raw['amountText'] as String? ?? '',
      note: raw['note'] as String? ?? '',
      payee: raw['payee'] as String? ?? '',
      accountId: raw['accountId'] as String?,
      destinationAccountId: raw['destinationAccountId'] as String?,
      categoryId: raw['categoryId'] as String?,
      occurredOn: raw['occurredOn'] as String?,
      repeatMonthly: raw['repeatMonthly'] == true,
      split: raw['split'] == true,
      isRefund: raw['isRefund'] == true,
      splitRows: rows is List
          ? [
              for (final r in rows)
                if (r is Map)
                  CaptureDraftSplitLine.fromJson(Map<String, Object?>.from(r)),
            ]
          : const [],
      idempotencyKey: raw['idempotencyKey'] as String?,
      savedAtMs: raw['savedAtMs'] is int ? raw['savedAtMs'] as int : 0,
    );
  }
}

/// Per-account draft slot — `mf_capture_draft.<userId>`. Scoping by the
/// owning account is the cross-account wall: a draft typed under one
/// sign-in can never surface inside another's form on the same device.
/// Demo/read-only hosts pass no scope and get no persistence.
class CaptureDraftStore {
  static const _prefix = 'mf_capture_draft.';

  /// Drafts older than this are treated as abandoned — a week-old
  /// half-entry popping back over the form reads as corruption, not as
  /// a kindness.
  static const maxAge = Duration(days: 7);

  static String _key(String scope) => '$_prefix$scope';

  static Future<void> save(String scope, CaptureDraft draft) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key(scope), jsonEncode(draft.toJson()));
  }

  /// The stored draft, or null when there is none, it won't decode, or
  /// it aged out (expired/corrupt entries are removed on read so a
  /// stale blob doesn't sit forever).
  static Future<CaptureDraft?> load(String scope) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key(scope));
    if (raw == null) return null;
    CaptureDraft? draft;
    try {
      draft = CaptureDraft.fromJson(jsonDecode(raw));
    } on FormatException {
      draft = null;
    }
    if (draft == null) {
      await prefs.remove(_key(scope));
      return null;
    }
    final age = DateTime.now().millisecondsSinceEpoch - draft.savedAtMs;
    if (age > maxAge.inMilliseconds) {
      await prefs.remove(_key(scope));
      return null;
    }
    return draft;
  }

  static Future<void> clear(String scope) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key(scope));
  }
}
