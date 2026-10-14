import 'package:shared_preferences/shared_preferences.dart';

/// Last distinct activity-search queries, newest first — the "Tìm gần
/// đây" chips under an empty search field (the saved-searches pattern
/// of the reference apps). Session-scoped like the last-capture picks:
/// the key sits in the ordinary sign-out residue sweep so the next
/// account on this device never sees them.
class RecentSearches {
  static const storageKey = 'mf_recent_searches';
  static const maxEntries = 5;

  static Future<List<String>> load() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(storageKey) ?? const [];
  }

  /// Records [query] newest-first, deduped case-insensitively, capped
  /// at [maxEntries]. Blank entries are never stored. Returns the
  /// stored list so callers can refresh their chip row in one await.
  static Future<List<String>> record(String query) async {
    final q = query.trim();
    if (q.isEmpty) return load();
    final prefs = await SharedPreferences.getInstance();
    final current = prefs.getStringList(storageKey) ?? const [];
    final folded = q.toLowerCase();
    final next = [
      q,
      for (final s in current)
        if (s.toLowerCase() != folded) s,
    ].take(maxEntries).toList();
    await prefs.setStringList(storageKey, next);
    return next;
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(storageKey);
  }
}
