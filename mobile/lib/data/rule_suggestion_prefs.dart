import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../domain/rule_suggestions.dart';

/// Per-account correction counters behind the D6 rule-suggestion flow.
/// `mf_rule_corrections.<userId>` holds a JSON map of pair key → count;
/// `mf_rule_corrections_off.<userId>` the pairs the user declined for
/// good. Local-only bookkeeping: the counters describe THIS device's
/// manual corrections, never touch the ledger, and a lost slot only means
/// a later re-offer — never wrong data. Scoping by account keeps one
/// sign-in's history out of another's suggestions on a shared device.
class RuleSuggestionPrefs {
  static const _countsPrefix = 'mf_rule_corrections.';
  static const _declinedPrefix = 'mf_rule_corrections_off.';

  /// Storage bound — a lifetime of one-off fixes must not grow the slot
  /// forever. When the cap is hit the weakest (lowest-count) pairs are
  /// evicted first, so a near-threshold pair never loses to a stale one.
  static const maxTrackedPairs = 200;

  /// Records one correction and returns the pair's running total.
  static Future<int> recordCorrection(
    String scope,
    String payee,
    String categoryId,
  ) async {
    final counts = await _counts(scope);
    final key = ruleCorrectionKey(payee, categoryId);
    final next = (counts[key] ?? 0) + 1;
    counts[key] = next;
    _evict(counts);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_countsPrefix$scope', jsonEncode(counts));
    return next;
  }

  static Future<int> countOf(
    String scope,
    String payee,
    String categoryId,
  ) async => (await _counts(scope))[ruleCorrectionKey(payee, categoryId)] ?? 0;

  static Future<bool> isDeclined(
    String scope,
    String payee,
    String categoryId,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final off = prefs.getStringList('$_declinedPrefix$scope') ?? const [];
    return off.contains(ruleCorrectionKey(payee, categoryId));
  }

  /// "Không hỏi lại" — this exact pair is never offered again on this
  /// device. A different target category for the same payee keeps its own
  /// key and can still earn an offer.
  static Future<void> decline(
    String scope,
    String payee,
    String categoryId,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final off = prefs.getStringList('$_declinedPrefix$scope') ?? <String>[];
    final key = ruleCorrectionKey(payee, categoryId);
    if (!off.contains(key)) {
      await prefs.setStringList('$_declinedPrefix$scope', [...off, key]);
    }
  }

  static Future<Map<String, int>> _counts(String scope) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_countsPrefix$scope');
    if (raw == null) return {};
    final Object? decoded;
    try {
      decoded = jsonDecode(raw);
    } on FormatException {
      return {}; // a corrupt blob starts over — never crashes an edit save
    }
    if (decoded is! Map) return {};
    return {
      for (final e in decoded.entries)
        if (e.key is String && e.value is int) e.key as String: e.value as int,
    };
  }

  static void _evict(Map<String, int> counts) {
    while (counts.length > maxTrackedPairs) {
      // Insertion-ordered map: the first lowest-count key is also the
      // oldest — the pattern the user repeats most survives.
      String? weakest;
      for (final e in counts.entries) {
        if (weakest == null || e.value < counts[weakest]!) weakest = e.key;
      }
      counts.remove(weakest);
    }
  }
}
