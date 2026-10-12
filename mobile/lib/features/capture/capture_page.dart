import 'package:flutter/material.dart';

import '../../data/neon/real_store.dart' show newIdempotencyKey;
import '../../domain/models.dart';
import '../../domain/money.dart';

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
}

/// Manual capture: Chi / Thu / Chuyển — mirrors the web's three action
/// shapes (create_money_transaction, create_account_transfer).
class CapturePage extends StatefulWidget {
  const CapturePage({
    super.key,
    required this.accounts,
    required this.categories,
    required this.onSubmit,
  });

  final List<AccountSummary> accounts;
  final List<Category> categories;
  final Future<void> Function(CaptureIntent intent) onSubmit;

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
  String? _error;

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
    try {
      await widget.onSubmit(CaptureIntent(
        kind: _kind,
        accountId: _accountId!,
        destinationAccountId: _destAccountId,
        categoryId: _categoryId,
        amount: amount,
        occurredOn: _fmtDate(_date),
        note: _note.text.trim(),
        payee: _payee.text.trim(),
        idempotencyKey: _idempotencyKey,
      ));
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() {
        _busy = false;
        _error = 'Không lưu được — thử lại';
      });
    }
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
          SegmentedButton<TransactionKind>(
            segments: const [
              ButtonSegment(
                  value: TransactionKind.expense,
                  label: Text('Chi'),
                  icon: Icon(Icons.remove)),
              ButtonSegment(
                  value: TransactionKind.income,
                  label: Text('Thu'),
                  icon: Icon(Icons.add)),
              ButtonSegment(
                  value: TransactionKind.transfer,
                  label: Text('Chuyển'),
                  icon: Icon(Icons.swap_horiz)),
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
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
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
            DropdownButtonFormField<String>(
              initialValue: _categoryId,
              decoration: const InputDecoration(
                labelText: 'Danh mục',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final c in _kindCategories)
                  DropdownMenuItem(value: c.id, child: Text(c.name)),
              ],
              onChanged: (v) => setState(() => _categoryId = v),
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
          const SizedBox(height: 16),
          if (_error != null) ...[
            Text(_error!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.red.shade700)),
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
