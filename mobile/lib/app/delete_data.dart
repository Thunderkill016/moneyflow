import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/offline_cache.dart';
import '../data/offline_queue.dart';
import '../data/session_store.dart';

/// Local MoneyFlow data wipe — mirrors the web's
/// clearLocalMoneyFlowStores(): only keys this app wrote are removed
/// (`mf_*` product prefs and any pre-migration `neon.*` plaintext),
/// foreign keys from other apps/plugins are untouched.
const _localKeyPrefixes = ['mf_', 'neon.'];

/// Removes every MoneyFlow-owned preference key plus the secure-storage
/// session keys — the token no longer lives in the prefs file, so a
/// prefix sweep alone would leave the credential behind. Returns the
/// preference keys that were removed; a read failure leaves foreign data
/// intact either way.
Future<List<String>> wipeLocalData(SharedPreferences prefs) async {
  await SessionStore.clear();
  final keys = prefs.getKeys().where(
    (k) => _localKeyPrefixes.any(k.startsWith),
  );
  final removed = <String>[];
  for (final key in keys) {
    if (await prefs.remove(key)) removed.add(key);
  }
  return removed;
}

/// Preference keys that belong to the signed-in account's session rather
/// than the device — cleared on ordinary sign-out so the next account on
/// this device never sees the previous one's leftovers.
///
/// Sign-out deliberately does NOT equal the wipe: device-level opt-ins
/// (`mf_biometric_enabled`, `mf_weekly_digest_enabled`,
/// `mf_weekly_digest_minutes`, `mf_theme_mode`, `mf_notif_capture_enabled`,
/// `mf_seen_welcome`) survive because the user opted in on this device,
/// not on this account; and account-scoped keys
/// (`mf_dashboard_snapshot_<uid>`, `mf_offline_capture_queue_<uid>`) stay
/// on disk because they cannot leak into another account — and destroying
/// held captures on sign-out would silently lose unposted money records.
const signOutResidueKeys = [
  'mf_last_capture_account',
  'mf_last_capture_category',
  'mf_recurring_dismissed',
  // Session-scoped search history — the next account on this device
  // must not see the previous one's queries.
  'mf_recent_searches',
  // Pre-scoping leftover keys — the scoped stores never read them, and
  // they cannot be attributed to any particular account.
  OfflineCache.legacyKey,
  offlineQueueStorageKey,
];

/// The ordinary sign-out sweep — see [signOutResidueKeys] for the scope
/// contract. Returns the keys that were removed.
Future<List<String>> clearSignOutResidue(SharedPreferences prefs) async {
  final removed = <String>[];
  for (final key in signOutResidueKeys) {
    if (await prefs.remove(key)) removed.add(key);
  }
  return removed;
}

/// Typed-confirmation contract — same "gõ XÓA" guard as the web.
const deleteConfirmText = 'XÓA';

/// Destructive confirmation for wiping local data. [serverNote] explains
/// what happens to the server-side account (currently: nothing — managed
/// account deletion is not implemented upstream).
Future<bool> showDeleteDataDialog(
  BuildContext context, {
  required String title,
  required String body,
  String? serverNote,
}) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) =>
        _DeleteDataDialog(title: title, body: body, serverNote: serverNote),
  );
  return confirmed ?? false;
}

class _DeleteDataDialog extends StatefulWidget {
  const _DeleteDataDialog({
    required this.title,
    required this.body,
    this.serverNote,
  });

  final String title;
  final String body;
  final String? serverNote;

  @override
  State<_DeleteDataDialog> createState() => _DeleteDataDialogState();
}

class _DeleteDataDialogState extends State<_DeleteDataDialog> {
  final _confirm = TextEditingController();

  bool get _confirmOk => _confirm.text.trim() == deleteConfirmText;

  @override
  void dispose() {
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.body),
            if (widget.serverNote != null) ...[
              const SizedBox(height: 12),
              Text(
                widget.serverNote!,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _confirm,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'Gõ XÓA để xác nhận',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: !_confirmOk ? null : () => Navigator.pop(context, true),
          child: const Text('Xóa'),
        ),
      ],
    );
  }
}
