import 'package:shared_preferences/shared_preferences.dart';

/// Server side of advisory-dismissal sync — implemented by RealStore
/// over the Neon Data API. Mirrors the web contract
/// (supabase/migrations/20260925150000_pattern_dismissals.sql +
/// src/app/actions/dismissals.ts): reads select `pattern_dismissals`
/// (RLS scopes rows to the caller's own user_id); writes go through the
/// `dismiss_pattern_keys` security-definer RPC — direct inserts are
/// revoked, and the function derives user_id from auth.uid().
abstract class PatternDismissalSync {
  const PatternDismissalSync();

  /// Server-persisted dismissal keys for the recurring-suggestion scope.
  Future<Set<String>> loadRecurringDismissedKeys();

  /// Write-through for the recurring scope. Idempotent server-side
  /// (`on conflict do nothing`), so republishing a known key is a no-op.
  Future<void> dismissRecurringKeys(List<String> keys);
}

/// Dismissed recurring-pattern suggestions — the SharedPreferences
/// counterpart of src/lib/planning/recurring-dismissals.ts. Stores the
/// pattern's 8-hex key only; the key hashes `expense|<normalized name>`
/// and ignores amount drift, so a dismissed pattern stays dismissed even
/// when next month's bill posts at a slightly different price.
///
/// Sync contract (signed-in mode only): [load] merges server ∪ local —
/// a dismissal is a fact, never a mutation, so union is the honest join
/// and "server wins conflicts" reduces to "server rows always count".
/// Keys the server lacks (dismissed while offline) are re-published on
/// the spot; a failed push just retries on the next load. When the sync
/// read itself fails, local alone is served — a hidden suggestion stays
/// hidden offline, and the merge heals the next time the network is up.
class RecurringDismissals {
  RecurringDismissals._();

  /// `mf_` prefix keeps the key inside the wipeLocalData contract.
  static const _key = 'mf_recurring_dismissed';

  static Future<Set<String>> load({PatternDismissalSync? sync}) async {
    final prefs = await SharedPreferences.getInstance();
    final local = prefs.getStringList(_key)?.toSet() ?? const <String>{};
    if (sync == null) return local;

    final Set<String> server;
    try {
      server = await sync.loadRecurringDismissedKeys();
    } on Object {
      // Offline or pre-migration server — local stands alone, honestly.
      return local;
    }

    final merged = {...server, ...local};
    if (merged.length != local.length) {
      await prefs.setStringList(_key, merged.toList()..sort());
    }

    // Dismissals made while offline reach the server here — resync on
    // open. A failed push loses nothing: the key stays local and the
    // next load retries it.
    final pending = local.difference(server).toList()..sort();
    if (pending.isNotEmpty) {
      try {
        await sync.dismissRecurringKeys(pending);
      } on Object {
        /* stays local-only until a later load succeeds */
      }
    }
    return merged;
  }

  /// "Ẩn" is permanent — a dismissed suggestion never resurfaces. The
  /// local write lands first so the card never flickers back; the server
  /// row follows, and a failed write simply waits for [load]'s resync.
  static Future<void> dismiss(
    String dismissKey, {
    PatternDismissalSync? sync,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final current = prefs.getStringList(_key) ?? const <String>[];
    if (!current.contains(dismissKey)) {
      await prefs.setStringList(_key, [...current, dismissKey]);
    }
    if (sync == null) return;
    try {
      await sync.dismissRecurringKeys([dismissKey]);
    } on Object {
      /* offline — the local row stands and load() re-publishes it */
    }
  }
}
