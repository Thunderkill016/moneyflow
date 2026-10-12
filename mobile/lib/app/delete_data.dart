import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Local MoneyFlow data wipe — mirrors the web's
/// clearLocalMoneyFlowStores(): only keys this app wrote are removed
/// (`mf_*` product prefs and the `neon.*` session token), foreign keys
/// from other apps/plugins are untouched.
const _localKeyPrefixes = ['mf_', 'neon.'];

/// Removes every MoneyFlow-owned preference key. Returns the keys that
/// were removed; a read failure leaves foreign data intact either way.
Future<List<String>> wipeLocalData(SharedPreferences prefs) async {
  final keys = prefs.getKeys().where(
    (k) => _localKeyPrefixes.any(k.startsWith),
  );
  final removed = <String>[];
  for (final key in keys) {
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
