// Watchlist persistence (D10) — SharedPreferences under the `mf_`
// prefix, so wipeLocalData's contract covers it like the digest opt-ins.
// A pin is a device-local bookmark on ledger values, not financial
// truth — there is deliberately no server table.

import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../domain/watchlist.dart';

class WatchlistPrefs {
  WatchlistPrefs._();

  static const _key = 'mf_watch_items';

  /// The pin list in insertion order. Malformed entries drop silently —
  /// a corrupt pref must never fail a dashboard load (the tile simply
  /// shows fewer pins, matching its advisory posture).
  static Future<List<WatchItem>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return const [];
      return [
        for (final e in decoded)
          if (e is Map<String, dynamic>)
            WatchItem(
              kind: e['kind'] == 'payee' ? WatchKind.payee : WatchKind.category,
              name: (e['name'] as String?) ?? '',
              thresholdMinor: (e['threshold_minor'] as num?)?.toInt(),
            ),
      ].where((i) => i.name.isNotEmpty).toList();
    } catch (_) {
      return const [];
    }
  }

  static Future<void> save(List<WatchItem> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode([
        for (final i in items)
          {
            'kind': i.kind.name,
            'name': i.name,
            if (i.thresholdMinor != null) 'threshold_minor': i.thresholdMinor,
          },
      ]),
    );
  }
}
