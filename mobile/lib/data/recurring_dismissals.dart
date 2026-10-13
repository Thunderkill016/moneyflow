import 'package:shared_preferences/shared_preferences.dart';

/// Dismissed recurring-pattern suggestions — the SharedPreferences
/// counterpart of src/lib/planning/recurring-dismissals.ts. Stores the
/// pattern's 8-hex key only; the key hashes `expense|<normalized name>`
/// and ignores amount drift, so a dismissed pattern stays dismissed even
/// when next month's bill posts at a slightly different price.
class RecurringDismissals {
  RecurringDismissals._();

  /// `mf_` prefix keeps the key inside the wipeLocalData contract.
  static const _key = 'mf_recurring_dismissed';

  static Future<Set<String>> load() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_key)?.toSet() ?? const {};
  }

  /// "Ẩn" is permanent — a dismissed suggestion never resurfaces.
  static Future<void> dismiss(String dismissKey) async {
    final prefs = await SharedPreferences.getInstance();
    final current = prefs.getStringList(_key) ?? const <String>[];
    if (current.contains(dismissKey)) return;
    await prefs.setStringList(_key, [...current, dismissKey]);
  }
}
