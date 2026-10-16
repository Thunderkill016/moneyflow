import 'package:flutter/material.dart';

import '../domain/history_purge.dart';
import '../domain/reconciliation.dart' show displayDate;
import '../domain/report.dart' show vnToday, ymd;
import 'delete_data.dart' show deleteConfirmText, matchesDeleteConfirm;

/// The seam the host provides — one RPC call
/// (`delete_transactions_before`, migration 20261017230000) returning
/// the parsed report. The dialog never speaks to the store directly.
typedef HistoryPurgeRunner =
    Future<HistoryPurgeReport> Function({
      required String before,
      required Set<HistoryPurgeSource> sources,
    });

/// D21 — Settings → "Dữ liệu" → "Xóa lịch sử trước ngày".
///
/// Scoped retention purge (Monarch-style "delete history before [date]"),
/// deliberately OUTSIDE the trash contract: matched rows are gone for
/// good, so the flow mirrors the account-deletion boundary:
///   * step 1 states the consequence BEFORE any confirm affordance;
///   * step 2 makes the user pick the cutoff, tick the source scopes and
///     pass the same typed "gõ XÓA" guard as the other wipes;
///   * one server round-trip returns {deleted, locked} — the host prints
///     both numbers so schedule/debt-linked survivors are disclosed,
///     not silently skipped.
///
/// Returns the report on success, null on cancel. Demo mode never sees
/// the row — the seam only exists for the signed-in store.
Future<HistoryPurgeReport?> showDeleteHistoryFlow(
  BuildContext context, {
  required HistoryPurgeRunner purge,
}) async {
  final report = await showDialog<HistoryPurgeReport>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => _DeleteHistoryDialog(purge: purge),
  );
  return report;
}

class _DeleteHistoryDialog extends StatefulWidget {
  const _DeleteHistoryDialog({required this.purge});

  final HistoryPurgeRunner purge;

  @override
  State<_DeleteHistoryDialog> createState() => _DeleteHistoryDialogState();
}

class _DeleteHistoryDialogState extends State<_DeleteHistoryDialog> {
  final _confirm = TextEditingController();

  bool _confirmStep = false;
  bool _busy = false;
  String? _error;

  /// Picked civil cutoff — null until the user chooses; the submit
  /// affordance stays off so an unpicked date can never default-sweep.
  DateTime? _before;
  final _sources = <HistoryPurgeSource>{};

  bool get _confirmOk => matchesDeleteConfirm(_confirm.text);

  bool get _canSubmit =>
      _confirmOk && _before != null && _sources.isNotEmpty && !_busy;

  Future<void> _pickBefore() async {
    // Civil-day cutoff in the app's own clock — vnToday, not the device
    // timezone guess, so "trước hôm nay" means the Vietnam civil day.
    final today = DateTime.parse(vnToday());
    final picked = await showDatePicker(
      context: context,
      initialDate: _before ?? today,
      firstDate: DateTime(2000),
      // A cutoff past today adds nothing the purge can reach — cap it.
      lastDate: today,
      helpText: 'Xóa lịch sử trước ngày',
      cancelText: 'Hủy',
      confirmText: 'Chọn',
    );
    if (picked == null || !mounted) return;
    setState(() => _before = picked);
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final report = await widget.purge(
        before: ymd(_before!),
        sources: Set.of(_sources),
      );
      if (mounted) Navigator.pop(context, report);
    } catch (_) {
      // Nothing was reported deleted — the RPC is atomic, so a failure
      // means zero rows changed; say exactly that.
      if (mounted) {
        setState(() {
          _busy = false;
          _error =
              'Không xóa được — chưa có gì thay đổi, kiểm tra kết nối '
              'rồi thử lại.';
        });
      }
    }
  }

  @override
  void dispose() {
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AlertDialog(
      title: const Text('Xóa lịch sử trước ngày'),
      content: SingleChildScrollView(
        child: _confirmStep ? _confirmContent(scheme) : _warningContent(),
      ),
      actions: _confirmStep
          ? [
              TextButton(
                onPressed: _busy
                    ? null
                    : () => setState(() => _confirmStep = false),
                child: const Text('Quay lại'),
              ),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: scheme.error,
                  foregroundColor: scheme.onError,
                ),
                onPressed: _canSubmit ? _submit : null,
                child: Text(_busy ? 'Đang xóa…' : 'Xóa vĩnh viễn'),
              ),
            ]
          : [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Hủy'),
              ),
              FilledButton(
                onPressed: () => setState(() => _confirmStep = true),
                child: const Text('Tiếp tục'),
              ),
            ],
    );
  }

  /// Step 1 — consequences before any confirm affordance, including what
  /// the sweep will NOT touch (linked rows, the inbox's source history).
  Widget _warningContent() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Xóa lịch sử là thao tác vĩnh viễn — các giao dịch không vào '
          'thùng rác và không thể khôi phục.',
        ),
        const SizedBox(height: 12),
        const Text('Sẽ bị xóa vĩnh viễn:'),
        const SizedBox(height: 4),
        const Text('• Giao dịch trước ngày bạn chọn'),
        const Text('• Chỉ thuộc các nguồn bạn chọn'),
        const Text('• Kể cả giao dịch đang ở thùng rác'),
        const SizedBox(height: 12),
        const Text('Sẽ được giữ lại:'),
        const SizedBox(height: 4),
        const Text('• Giao dịch gắn lịch định kỳ hoặc công nợ'),
        const Text('• Bản ghi nguồn trong Hộp thư (chỉ mất liên kết)'),
        const SizedBox(height: 12),
        Text(
          'Nếu cần giữ dữ liệu, hãy dùng "Sao lưu (JSON)" trước khi '
          'tiếp tục.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  /// Step 2 — cutoff + scope + typed guard; nothing mutates until
  /// "Xóa vĩnh viễn" passes all three gates.
  Widget _confirmContent(ColorScheme scheme) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.event_outlined),
          title: const Text('Trước ngày'),
          subtitle: Text(
            _before == null ? 'Chưa chọn ngày' : displayDate(ymd(_before!)),
          ),
          enabled: !_busy,
          onTap: _busy ? null : _pickBefore,
        ),
        const SizedBox(height: 4),
        Text('Nguồn giao dịch', style: Theme.of(context).textTheme.labelLarge),
        for (final source in HistoryPurgeSource.values)
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            title: Text(historyPurgeSourceLabel(source)),
            subtitle: Text(switch (source) {
              HistoryPurgeSource.manual => 'Giao dịch bạn tự ghi',
              HistoryPurgeSource.notification => 'Ghi từ thông báo ngân hàng',
              HistoryPurgeSource.imported => 'Nhập từ file CSV, Excel, PDF',
            }),
            value: _sources.contains(source),
            onChanged: _busy
                ? null
                : (checked) => setState(() {
                    if (checked ?? false) {
                      _sources.add(source);
                    } else {
                      _sources.remove(source);
                    }
                  }),
          ),
        const SizedBox(height: 8),
        TextField(
          controller: _confirm,
          onChanged: (_) => setState(() {}),
          enabled: !_busy,
          decoration: InputDecoration(
            labelText: 'Gõ $deleteConfirmText để xác nhận',
            border: const OutlineInputBorder(),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: TextStyle(color: scheme.error)),
        ],
      ],
    );
  }
}
