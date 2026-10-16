import 'package:flutter/material.dart';

import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/recurring_detection.dart';
import '../shared/timed_snack_bar.dart';
import '../capture/capture_submit.dart' show DemoReadOnly;

/// Honest message for a failed planning write — the web server actions
/// map the same RPC codes; stale_write reuses the edit flow's wording
/// pattern ("đóng rồi mở lại để sửa bản mới").
String planningErrorMessage(Object e, {required String fallback}) {
  final msg = e.toString();
  // Same notice the capture form gives — a demo write is not a
  // transient failure, so it must not invite a retry.
  if (e is DemoReadOnly) {
    return 'Demo chỉ xem — đăng nhập để ghi khoản';
  }
  if (msg.contains('stale_write')) {
    return 'Dữ liệu vừa thay đổi — đóng rồi mở lại để sửa bản mới';
  }
  if (msg.contains('invalid_commitment_interval')) {
    return 'Kỳ lặp phải từ 1 đến 24 tháng';
  }
  if (msg.contains('goal_not_found_or_target_below_allocated')) {
    return 'Mức đích không được thấp hơn tiền đã dành';
  }
  if (msg.contains('allocation_below_zero')) {
    return 'Không thể rút quá số tiền đã dành';
  }
  if (msg.contains('allocation_above_target')) {
    return 'Số tiền vượt phần còn thiếu của mục tiêu';
  }
  if (msg.contains('insufficient_unreserved_balance')) {
    return 'Không đủ số dư chưa được giữ trước';
  }
  if (msg.contains('goal_archive_blocked')) {
    return 'Hãy rút hết tiền đã dành trước khi lưu trữ';
  }
  if (msg.contains('category_archived')) {
    return 'Danh mục đã bị ẩn — chọn danh mục khác';
  }
  if (msg.contains('expense_category_required')) {
    return 'Cần chọn một danh mục chi';
  }
  if (msg.contains('income_category_required')) {
    return 'Cần chọn một danh mục thu';
  }
  // *_not_found (row deleted elsewhere), nothing_to_undo and
  // archive_rejected all mean the local row state was stale.
  if (msg.contains('not_found') ||
      msg.contains('nothing_to_undo') ||
      msg.contains('archive_rejected')) {
    return 'Dữ liệu vừa thay đổi — tải lại rồi thử lại';
  }
  return fallback;
}

/// One dialog for both recurring shapes — a monthly commitment
/// (expense categories, "Tài khoản trả") or recurring income such as
/// salary (income categories, "Tài khoản nhận"). Extracted from
/// PlanningPage so the dashboard's detection card can open the same
/// form prefilled — two surfaces, one contract.
///
/// A non-null [commitment]/[template] switches to edit mode: fields
/// prefill from the row and [onSave] receives the row's ids through the
/// caller's closure. A non-null [suggestion] prefills a create from the
/// detected pattern. Returns true only after a real save — cancel and
/// picker-unavailable both resolve false.
Future<bool> showRecurringFormDialog(
  BuildContext context, {
  required List<AccountSummary> accounts,
  required List<Category> categories,
  required bool income,
  RecurringCommitment? commitment,
  RecurringIncome? template,
  RecurringSuggestion? suggestion,
  required Future<void> Function(
    String name,
    int amountMinor,
    int dueDay,
    String accountId,
    String categoryId,
    int intervalMonths,
  )
  onSave,
}) async {
  final kindCats = categories
      .where(
        (c) =>
            c.kind ==
            (income ? TransactionKind.income : TransactionKind.expense),
      )
      .toList();
  if (kindCats.isEmpty || accounts.isEmpty) {
    showTimedSnackBar(
      ScaffoldMessenger.of(context),
      SnackBar(
        content: Text(
          income
              ? 'Cần ít nhất một tài khoản và một danh mục thu'
              : 'Cần ít nhất một tài khoản và một danh mục chi',
        ),
      ),
    );
    return false;
  }
  final isEdit = commitment != null || template != null;
  final initialAccountId =
      commitment?.accountId ?? template?.accountId ?? suggestion?.accountId;
  final initialCategoryId =
      commitment?.categoryId ?? template?.categoryId ?? suggestion?.categoryId;
  final name = TextEditingController(
    text: commitment?.name ?? template?.name ?? suggestion?.name ?? '',
  );
  final amount = TextEditingController(
    text:
        (commitment?.amountMinor ?? template?.amountMinor ?? suggestion?.amount)
            ?.toString() ??
        '',
  );
  final dueDay = TextEditingController(
    text:
        (commitment?.dueDay ?? template?.dueDay ?? suggestion?.dayOfMonth)
            ?.toString() ??
        '',
  );
  // A stored account/category that is gone or archived since can't be a
  // dropdown value — fall back to the first option so the field shows
  // exactly what a save would write.
  Category? cat =
      kindCats.where((c) => c.id == initialCategoryId).firstOrNull ??
      kindCats.firstOrNull;
  AccountSummary? acc =
      accounts.where((a) => a.id == initialAccountId).firstOrNull ??
      accounts.firstOrNull;
  // Cadence picker — commitments only (income templates stay monthly).
  // The stored interval rides through even when it is not one of the
  // four offered steps so an edit never silently narrows the cadence.
  var interval = commitment?.intervalMonths ?? 1;
  const offeredIntervals = [1, 3, 6, 12];
  final intervalItems = [
    ...offeredIntervals,
    if (!offeredIntervals.contains(interval)) interval,
  ];
  String intervalLabel(int months) => switch (months) {
    1 => 'Mỗi tháng',
    12 => 'Mỗi năm',
    final m => 'Mỗi $m tháng',
  };
  String? error;
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDlg) => AlertDialog(
        title: Text(
          isEdit
              ? (income ? 'Sửa thu nhập định kỳ' : 'Sửa cam kết')
              : (income ? 'Thu nhập định kỳ mới' : 'Cam kết mới'),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                decoration: InputDecoration(
                  labelText: 'Tên',
                  hintText: income ? 'vd: Lương' : 'vd: Tiền nhà',
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: amount,
                decoration: InputDecoration(
                  labelText: 'Số tiền',
                  hintText: income ? 'vd: 15tr' : 'vd: 3tr',
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: dueDay,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Ngày đến hạn (1-31)',
                  border: OutlineInputBorder(),
                ),
              ),
              // Commitments can be non-monthly (Tết, bảo hiểm, học phí);
              // recurring income stays monthly — the income RPC has no
              // cadence column.
              if (!income) ...[
                const SizedBox(height: 12),
                DropdownButtonFormField<int>(
                  initialValue: interval,
                  decoration: const InputDecoration(
                    labelText: 'Lặp lại',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    for (final m in intervalItems)
                      DropdownMenuItem(value: m, child: Text(intervalLabel(m))),
                  ],
                  onChanged: (v) => setDlg(() => interval = v ?? interval),
                ),
              ],
              const SizedBox(height: 12),
              DropdownButtonFormField<AccountSummary>(
                initialValue: acc,
                decoration: InputDecoration(
                  labelText: income ? 'Tài khoản nhận' : 'Tài khoản trả',
                  border: const OutlineInputBorder(),
                ),
                items: [
                  for (final a in accounts)
                    DropdownMenuItem(value: a, child: Text(a.name)),
                ],
                onChanged: (v) => setDlg(() => acc = v ?? acc),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<Category>(
                initialValue: cat,
                decoration: const InputDecoration(
                  labelText: 'Danh mục',
                  border: OutlineInputBorder(),
                ),
                items: [
                  for (final c in kindCats)
                    DropdownMenuItem(value: c, child: Text(c.name)),
                ],
                onChanged: (v) => setDlg(() => cat = v ?? cat),
              ),
              if (error != null) ...[
                const SizedBox(height: 12),
                Text(
                  error!,
                  style: TextStyle(color: Theme.of(ctx).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () async {
              final n = name.text.trim();
              final a = parseMoneyInput(amount.text);
              final day = int.tryParse(dueDay.text.trim());
              if (n.isEmpty ||
                  a == null ||
                  a <= 0 ||
                  day == null ||
                  day < 1 ||
                  day > 31 ||
                  acc == null ||
                  cat == null) {
                return;
              }
              try {
                // Income has no interval field — the picker is hidden and
                // the saved value is always the monthly default.
                await onSave(
                  n,
                  a,
                  day,
                  acc!.id,
                  cat!.id,
                  income ? 1 : interval,
                );
              } catch (e) {
                setDlg(
                  () => error = planningErrorMessage(
                    e,
                    fallback: 'Không lưu được — thử lại',
                  ),
                );
                return;
              }
              if (ctx.mounted) Navigator.pop(ctx, true);
            },
            child: Text(isEdit ? 'Lưu' : 'Tạo'),
          ),
        ],
      ),
    ),
  );
  // Controllers are deliberately not disposed here — the pop animation
  // keeps the fields mounted a few frames after showDialog resolves, and
  // disposing early trips "used after dispose" assertions. Same lifetime
  // contract this dialog had inside PlanningPage.
  return ok ?? false;
}
