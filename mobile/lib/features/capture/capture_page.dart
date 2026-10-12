import 'dart:async';

import 'package:flutter/material.dart';

import '../../data/capture_prefs.dart';
import '../../data/neon/real_store.dart' show newIdempotencyKey;
import '../../data/share/share_text_parser.dart';
import '../../domain/frequency.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import 'capture_submit.dart' show CommitmentFailed;
import 'category_picker.dart';

/// Result of one capture intent — carries the idempotency key generated when
/// the form opened so replays of the same intent never double-post.
class CaptureIntent {
  const CaptureIntent({
    required this.kind,
    required this.accountId,
    this.destinationAccountId,
    this.categoryId,
    required this.amount,
    required this.occurredOn,
    this.note = '',
    this.payee = '',
    required this.idempotencyKey,
    this.repeatMonthly = false,
    this.dueDay = 1,
    this.commitmentName = '',
  });

  final TransactionKind kind;
  final String accountId;
  final String? destinationAccountId;
  final String? categoryId;
  final int amount;
  final String occurredOn;
  final String note;
  final String payee;
  final String idempotencyKey;

  /// "Lặp lại hàng tháng" — after the transaction saves, a monthly
  /// commitment is created on [dueDay] under [commitmentName] (Money
  /// Manager's inline-recurring pattern, mapped to our commitment RPC).
  final bool repeatMonthly;
  final int dueDay;
  final String commitmentName;
}

/// What the capture route returns — `saved` is a clean save;
/// `savedPartial` means the transaction landed but its recurring
/// commitment did not (the shell shows an honest snackbar).
enum CaptureResult { saved, savedPartial }

/// Manual capture: Chi / Thu / Chuyển — mirrors the web's three action
/// shapes (create_money_transaction, create_account_transfer).
class CapturePage extends StatefulWidget {
  const CapturePage({
    super.key,
    required this.accounts,
    required this.categories,
    required this.onSubmit,
    this.prefill,
    this.transactions = const [],
  });

  final List<AccountSummary> accounts;
  final List<Category> categories;
  final Future<void> Function(CaptureIntent intent) onSubmit;

  /// Shared-text extraction applied to the form on open. The user still
  /// reviews and submits manually — a share never posts a transaction.
  final SharedTextPrefill? prefill;

  /// Recent transactions — ranked into the "Mục hay dùng" category row.
  /// Empty for share-receive opens (no feed loaded yet).
  final List<Transaction> transactions;

  @override
  State<CapturePage> createState() => _CapturePageState();
}

class _CapturePageState extends State<CapturePage> {
  final _amount = TextEditingController();
  final _note = TextEditingController();
  final _payee = TextEditingController();

  // One key per form-open — the idempotency key of this capture intent.
  final String _idempotencyKey = newIdempotencyKey();

  TransactionKind _kind = TransactionKind.expense;
  String? _accountId;
  String? _destAccountId;
  String? _categoryId;
  DateTime _date = DateTime.now();
  bool _busy = false;
  bool _repeatMonthly = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final p = widget.prefill;
    if (p != null) {
      if (p.kind != null) _kind = p.kind!;
      if (p.amount != null) _amount.text = p.amount!.toString();
      if (p.note != null) _note.text = p.note!;
    }
    // Last-used defaults — prefills only win when the id still exists.
    // A prefs-backend failure (no plugin, corrupt store) just means no
    // prefill; it must never break the form.
    CapturePrefs.loadLastCapture()
        .then((last) {
          if (!mounted) return;
          setState(() {
            if (widget.accounts.any((a) => a.id == last.accountId)) {
              _accountId = last.accountId;
            }
            // A remembered category only applies when it still exists and
            // matches the current kind — an income category can't prefill an
            // expense form.
            if (widget.categories.any(
              (c) => c.id == last.categoryId && c.kind == _kind,
            )) {
              _categoryId = last.categoryId;
            }
          });
        })
        .catchError((_) {});
  }

  /// Most-used categories for the current kind — the inline pick row.
  List<Category> get _frequentCategories {
    final ids = frequentCategoryIds(widget.transactions, _kind);
    final byId = {for (final c in widget.categories) c.id: c};
    return [
      for (final id in ids)
        if (byId.containsKey(id)) byId[id]!,
    ];
  }

  /// VND quick amounts — the magnitudes people type most (100k..5tr).
  static const _quickAmounts = [
    (label: '50k', value: 50000),
    (label: '100k', value: 100000),
    (label: '200k', value: 200000),
    (label: '500k', value: 500000),
    (label: '1tr', value: 1000000),
    (label: '5tr', value: 5000000),
  ];

  List<Category> get _kindCategories =>
      widget.categories.where((c) => c.kind == _kind).toList();

  String _fmtDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _submit() async {
    final amount = parseMoneyInput(_amount.text);
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Số tiền chưa hợp lệ — vd: 50k, 2tr');
      return;
    }
    if (_accountId == null) {
      setState(() => _error = 'Chọn tài khoản');
      return;
    }
    if (_kind != TransactionKind.transfer && _categoryId == null) {
      setState(() => _error = 'Chọn danh mục');
      return;
    }
    if (_kind == TransactionKind.transfer && _destAccountId == null) {
      setState(() => _error = 'Chọn tài khoản đến');
      return;
    }
    if (_kind == TransactionKind.transfer && _destAccountId == _accountId) {
      setState(() => _error = 'Tài khoản đến phải khác tài khoản nguồn');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    // Commitment display name: the most human label available.
    final categoryName = widget.categories
        .where((c) => c.id == _categoryId)
        .map((c) => c.name)
        .firstOrNull;
    final commitmentName = _note.text.trim().isNotEmpty
        ? _note.text.trim()
        : (_payee.text.trim().isNotEmpty
              ? _payee.text.trim()
              : (categoryName ?? 'Khoản lặp lại'));
    try {
      await widget.onSubmit(
        CaptureIntent(
          kind: _kind,
          accountId: _accountId!,
          destinationAccountId: _destAccountId,
          categoryId: _categoryId,
          amount: amount,
          occurredOn: _fmtDate(_date),
          note: _note.text.trim(),
          payee: _payee.text.trim(),
          idempotencyKey: _idempotencyKey,
          repeatMonthly: _repeatMonthly && _kind != TransactionKind.transfer,
          dueDay: _date.day,
          commitmentName: commitmentName,
        ),
      );
      // Persist the last-used picks so the next capture starts pre-filled.
      unawaited(
        CapturePrefs.saveLastCapture(
          accountId: _accountId!,
          categoryId: _categoryId,
        ),
      );
      if (mounted) Navigator.of(context).pop(CaptureResult.saved);
    } on CommitmentFailed {
      // The transaction saved; only the recurring commitment failed. The
      // caller turns savedPartial into an honest snackbar — still a save.
      if (mounted) Navigator.of(context).pop(CaptureResult.savedPartial);
    } catch (e) {
      setState(() {
        _busy = false;
        _error = 'Không lưu được — thử lại';
      });
    }
  }

  /// Category selection via a searchable bottom sheet — the flat list
  /// will not scale as user categories grow (Money Lover/Wallet pattern).
  Future<void> _pickCategory() async {
    final picked = await showCategoryPicker(
      context,
      categories: _kindCategories,
      selectedId: _categoryId,
    );
    if (picked != null) setState(() => _categoryId = picked.id);
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  @override
  Widget build(BuildContext context) {
    final isTransfer = _kind == TransactionKind.transfer;
    return Scaffold(
      appBar: AppBar(title: const Text('Ghi khoản')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (widget.prefill != null) ...[
            Card(
              color: Theme.of(context).colorScheme.primaryContainer,
              child: const ListTile(
                dense: true,
                leading: Icon(Icons.share),
                title: Text('Điền sẵn từ nội dung chia sẻ'),
                subtitle: Text('Kiểm tra lại trước khi lưu'),
              ),
            ),
            const SizedBox(height: 12),
          ],
          SegmentedButton<TransactionKind>(
            segments: const [
              ButtonSegment(
                value: TransactionKind.expense,
                label: Text('Chi'),
                icon: Icon(Icons.remove),
              ),
              ButtonSegment(
                value: TransactionKind.income,
                label: Text('Thu'),
                icon: Icon(Icons.add),
              ),
              ButtonSegment(
                value: TransactionKind.transfer,
                label: Text('Chuyển'),
                icon: Icon(Icons.swap_horiz),
              ),
            ],
            selected: {_kind},
            onSelectionChanged: (s) => setState(() {
              _kind = s.first;
              _categoryId = null;
            }),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _amount,
            keyboardType: TextInputType.text,
            decoration: const InputDecoration(
              labelText: 'Số tiền',
              hintText: 'vd: 50k, 2tr, 150.000',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
          // Quick-amount chips — one tap beats six digits for common sizes.
          Wrap(
            spacing: 8,
            children: [
              for (final q in _quickAmounts)
                ActionChip(
                  label: Text(q.label),
                  onPressed: () =>
                      setState(() => _amount.text = q.value.toString()),
                ),
            ],
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            // initialValue is non-reactive: the key recreates the field
            // when the remembered-account prefill lands asynchronously.
            key: ValueKey('acc-$_accountId'),
            initialValue: _accountId,
            decoration: InputDecoration(
              labelText: isTransfer ? 'Từ tài khoản' : 'Tài khoản',
              border: const OutlineInputBorder(),
            ),
            items: [
              for (final a in widget.accounts)
                DropdownMenuItem(value: a.id, child: Text(a.name)),
            ],
            onChanged: (v) => setState(() => _accountId = v),
          ),
          if (isTransfer) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _destAccountId,
              decoration: const InputDecoration(
                labelText: 'Đến tài khoản',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final a in widget.accounts)
                  DropdownMenuItem(value: a.id, child: Text(a.name)),
              ],
              onChanged: (v) => setState(() => _destAccountId = v),
            ),
          ] else ...[
            const SizedBox(height: 12),
            // "Mục hay dùng" — most-used categories inline, no picker trip.
            if (_frequentCategories.isNotEmpty) ...[
              Text(
                'Mục hay dùng',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  for (final c in _frequentCategories)
                    ChoiceChip(
                      label: Text(c.name),
                      selected: _categoryId == c.id,
                      onSelected: (_) => setState(() => _categoryId = c.id),
                    ),
                ],
              ),
              const SizedBox(height: 8),
            ],
            // Category opens a searchable sheet — the selected name shows
            // on an input-styled row so the form reads like the old field.
            InkWell(
              onTap: _pickCategory,
              borderRadius: BorderRadius.circular(4),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Danh mục',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.arrow_drop_down),
                ),
                child: Text(
                  _categoryId == null
                      ? 'Chọn'
                      : widget.categories
                                .where((c) => c.id == _categoryId)
                                .map((c) => c.name)
                                .firstOrNull ??
                            '',
                  style: _categoryId == null
                      ? TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        )
                      : null,
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          TextField(
            controller: _note,
            decoration: const InputDecoration(
              labelText: 'Ghi chú',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _payee,
            decoration: const InputDecoration(
              labelText: 'Nơi chi / Nguồn thu (tùy chọn)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_today),
            label: Text('Ngày: ${_fmtDate(_date)}'),
          ),
          // Money Manager's inline "Lặp lại" — a monthly commitment for
          // expense/income. Transfers can't recur (no category).
          if (!isTransfer)
            CheckboxListTile(
              value: _repeatMonthly,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text('Lặp lại hàng tháng'),
              subtitle: Text('Tạo cam kết vào ngày ${_date.day} hằng tháng'),
              onChanged: (v) => setState(() => _repeatMonthly = v ?? false),
            ),
          const SizedBox(height: 8),
          if (_error != null) ...[
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.red.shade700),
            ),
            const SizedBox(height: 8),
          ],
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Đang lưu…' : 'Lưu'),
          ),
        ],
      ),
    );
  }
}
