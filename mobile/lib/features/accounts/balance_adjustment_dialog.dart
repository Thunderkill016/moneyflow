import 'package:flutter/material.dart';

import '../../domain/models.dart';
import '../../domain/money.dart';

/// "Điều chỉnh số dư" — the quick drift fix MISA/Money Lover users
/// expect, without the silent-balance-edit trap: the difference posts
/// as a real labeled ledger transaction (kind forced by the sign,
/// payee 'Điều chỉnh số dư', note carrying ghi → thực tế), never an
/// account-field overwrite. Reconciliation still exists for statement
/// workflows; this covers the "sao kê lệch nhưng không muốn đối soát
/// cả kỳ" case honestly.
///
/// Returns true when an adjustment posted so the caller refreshes.
Future<bool> showBalanceAdjustmentDialog(
  BuildContext context, {
  required AccountSummary account,

  /// Categories for the picker — filtered client-side to the kind the
  /// difference forces (income when the ledger understates, expense
  /// when it overstates), the same rule complete_account_reconciliation
  /// enforces server-side.
  required Future<List<Category>> Function() loadCategories,

  /// Posts the adjustment transaction. Receives the forced kind, the
  /// absolute difference, the picked category and the composed note.
  /// The caller owns payee/idempotency/refresh — throws surface inline.
  required Future<void> Function({
    required TransactionKind kind,
    required int amountMinor,
    required String categoryId,
    required String note,
  })
  submit,
}) async {
  final actual = TextEditingController();
  final userNote = TextEditingController();
  List<Category>? categories;
  Object? categoriesError;
  String? categoryId;
  String? error;
  var busy = false;
  try {
    categories = await loadCategories();
  } catch (e) {
    categoriesError = e;
  }
  if (!context.mounted) return false;
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDlg) {
        final actualBalance = parseMoneyInput(actual.text.trim());
        final diff = actualBalance == null
            ? null
            : actualBalance - account.balance;
        final kind = diff == null || diff == 0
            ? null
            : diff > 0
            ? TransactionKind.income
            : TransactionKind.expense;
        final options = kind == null || categories == null
            ? const <Category>[]
            : categories.where((c) => c.kind == kind && !c.isArchived).toList();
        // A kind flip can leave the picked id outside the new option
        // set — clear it rather than post a mismatched category.
        if (categoryId != null && !options.any((c) => c.id == categoryId)) {
          categoryId = null;
        }
        final canSubmit =
            !busy &&
            categoriesError == null &&
            diff != null &&
            diff != 0 &&
            categoryId != null;
        return AlertDialog(
          title: const Text('Điều chỉnh số dư'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Số dư đang ghi: ${formatMoney(account.balance)}'),
                const SizedBox(height: 12),
                TextField(
                  controller: actual,
                  keyboardType: TextInputType.number,
                  autofocus: true,
                  decoration: const InputDecoration(
                    labelText: 'Số dư thực tế',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setDlg(() {}),
                ),
                const SizedBox(height: 12),
                if (actualBalance != null && diff != null)
                  Text(
                    diff == 0
                        ? 'Không chênh lệch — không cần điều chỉnh.'
                        : 'Chênh lệch ${formatSignedMoney(diff)} — sẽ ghi '
                              'một khoản ${kind == TransactionKind.income ? 'thu' : 'chi'} '
                              'điều chỉnh ${formatMoney(diff.abs())}.',
                    style: Theme.of(ctx).textTheme.bodySmall,
                  )
                else if (actual.text.trim().isNotEmpty)
                  Text(
                    'Nhập số tiền hợp lệ.',
                    style: TextStyle(color: Colors.red.shade700),
                  ),
                const SizedBox(height: 12),
                if (categoriesError != null)
                  Text(
                    'Chưa tải được danh mục — thử lại sau.',
                    style: TextStyle(color: Colors.red.shade700),
                  )
                else
                  DropdownButtonFormField<String>(
                    initialValue: categoryId,
                    decoration: const InputDecoration(
                      labelText: 'Danh mục điều chỉnh',
                      border: OutlineInputBorder(),
                    ),
                    items: [
                      for (final c in options)
                        DropdownMenuItem(value: c.id, child: Text(c.name)),
                    ],
                    onChanged: kind == null
                        ? null
                        : (v) => setDlg(() => categoryId = v),
                  ),
                const SizedBox(height: 12),
                TextField(
                  controller: userNote,
                  decoration: const InputDecoration(
                    labelText: 'Ghi chú (tùy chọn)',
                    border: OutlineInputBorder(),
                  ),
                ),
                if (error != null) ...[
                  const SizedBox(height: 12),
                  Text(error!, style: TextStyle(color: Colors.red.shade700)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: busy ? null : () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: canSubmit
                  ? () async {
                      setDlg(() {
                        busy = true;
                        error = null;
                      });
                      try {
                        await submit(
                          kind: kind!,
                          amountMinor: diff.abs(),
                          categoryId: categoryId!,
                          note:
                              'Số dư ghi ${formatMoney(account.balance)} → '
                              'thực tế ${formatMoney(actualBalance!)}'
                              '${userNote.text.trim().isEmpty ? '' : ' · ${userNote.text.trim()}'}',
                        );
                        if (ctx.mounted) Navigator.pop(ctx, true);
                      } catch (_) {
                        setDlg(() {
                          busy = false;
                          error = 'Không ghi được điều chỉnh — thử lại sau';
                        });
                      }
                    }
                  : null,
              child: const Text('Ghi điều chỉnh'),
            ),
          ],
        );
      },
    ),
  );
  return result ?? false;
}
