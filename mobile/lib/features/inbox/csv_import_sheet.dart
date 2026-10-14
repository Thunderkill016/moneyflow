// "Nhập CSV hoặc Excel" — a bank-statement file becomes pending inbox
// candidates.
//
// The pipeline mirrors the web's /imports/direct: pick → client preview
// parse → choose account + per-kind categories → ONE prepare RPC. The
// difference is where it ends: the web commits straight to the ledger,
// mobile stops at prepare_direct_csv_candidates_with_rules so every row
// lands in "Cần xem" and only human review posts it. The sheet therefore
// never talks about "ghi sổ" — the copy says "nhập vào Cần xem".
//
// Both .csv (UTF-8 text) and .xlsx (binary workbook) decode into the same
// CsvParseResult/CsvParsedRow model, so everything after the pick — the
// preview, the plan, the RPC payload — is format-agnostic and shared.

import 'dart:convert';

import 'package:flutter/material.dart';

import '../../data/csv_file_source.dart';
import '../../domain/csv_import.dart';
import '../../domain/inbox.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/xlsx_import.dart';
import '../capture/category_picker.dart';

/// dd/MM/yyyy — the preview reads in the Vietnamese convention even
/// though the stored contract is YYYY-MM-DD (same as the inbox list).
String _displayDate(String occurredOn) {
  final p = occurredOn.split('-');
  if (p.length != 3) return occurredOn;
  return '${p[2]}/${p[1]}/${p[0]}';
}

/// How many ready rows the preview lists — the web shows 12; a bottom
/// sheet stays shallower so the pickers keep their place.
const _previewLimit = 8;

/// Opens the CSV/Excel import sheet; resolves to the [CsvImportResult]
/// once a batch was accepted server-side, null on cancel or failure.
Future<CsvImportResult?> showCsvImportSheet(
  BuildContext context, {
  required List<AccountSummary> accounts,
  required List<Category> categories,
  required CsvFilePicker pickFile,
  required Future<CsvImportResult> Function(CsvImportBatch) onImport,
}) => showModalBottomSheet<CsvImportResult>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (ctx) => CsvImportSheet(
    accounts: accounts,
    categories: categories,
    pickFile: pickFile,
    onImport: onImport,
  ),
);

/// The pick → preview → import sheet. The file picker and the commit RPC
/// are injected seams so tests never touch the platform channel or the
/// network.
class CsvImportSheet extends StatefulWidget {
  const CsvImportSheet({
    super.key,
    required this.accounts,
    required this.categories,
    required this.pickFile,
    required this.onImport,
  });

  final List<AccountSummary> accounts;
  final List<Category> categories;
  final CsvFilePicker pickFile;
  final Future<CsvImportResult> Function(CsvImportBatch) onImport;

  @override
  State<CsvImportSheet> createState() => _CsvImportSheetState();
}

class _CsvImportSheetState extends State<CsvImportSheet> {
  PickedCsvFile? _file;
  CsvParseResult? _parsed;
  CsvImportPlan? _plan;
  String? _error;
  bool _busy = false;

  /// Defaults mirror the web page's `accounts[0]` / first-of-kind
  /// category preselects — the user can still change them before import.
  late String _accountId = widget.accounts.firstOrNull?.id ?? '';
  late String _expenseCategoryId = _firstKind(TransactionKind.expense);
  late String _incomeCategoryId = _firstKind(TransactionKind.income);

  String _firstKind(TransactionKind kind) {
    for (final c in widget.categories) {
      if (c.kind == kind && !c.isArchived) return c.id;
    }
    return '';
  }

  List<Category> _kindCategories(TransactionKind kind) => [
    for (final c in widget.categories)
      if (!c.isArchived && c.kind == kind) c,
  ];

  void _replan() {
    final parsed = _parsed;
    if (parsed == null || !parsed.ok) {
      _plan = null;
      return;
    }
    _plan = planCsvImport(
      parsed.rows,
      accountId: _accountId,
      expenseCategoryId: _expenseCategoryId,
      incomeCategoryId: _incomeCategoryId,
      accounts: widget.accounts,
      categories: widget.categories,
    );
  }

  /// Pick → byte guards → decode (UTF-8 text for .csv, workbook for
  /// .xlsx) → parse. Every failure mode maps onto the web's own wording;
  /// nothing uploads until the preview says how many rows will land.
  Future<void> _pick() async {
    setState(() {
      _error = null;
      _busy = true;
    });
    PickedCsvFile? file;
    try {
      file = await widget.pickFile();
    } catch (_) {
      file = null;
      _error =
          'Không đọc được file. Thử CSV UTF-8 hoặc Excel (.xlsx) '
          'không quá 10 MB.';
    }
    if (!mounted) return;
    if (file == null) {
      setState(() => _busy = false);
      return;
    }

    String? error;
    CsvParseResult? parsed;
    final lowerName = file.name.toLowerCase();
    final isCsv = lowerName.endsWith('.csv');
    final isXlsx = lowerName.endsWith('.xlsx');
    if (!isCsv && !isXlsx) {
      error = 'Chỉ hỗ trợ file CSV hoặc Excel (.csv, .xlsx).';
    } else if (file.bytes.isEmpty) {
      error = 'File trống.';
    } else if (file.bytes.length > kCsvMaxUploadBytes) {
      error = 'File quá lớn; giới hạn hiện tại là 10 MB.';
    } else if (isXlsx) {
      // Binary workbook → matrix → the shared statement parser; a bad or
      // unrecognized workbook reports honestly, never garbage rows.
      parsed = parseXlsxStatement(file.bytes, fileName: file.name);
      if (!parsed.ok) error = parsed.error;
    } else {
      String text;
      try {
        // Strict UTF-8: a legacy-encoded bank export fails honestly here
        // instead of parsing into garbled merchant names.
        text = utf8.decode(file.bytes);
      } on FormatException {
        text = '';
        error =
            'Không đọc được file. Thử CSV UTF-8 hoặc Excel (.xlsx) '
            'không quá 10 MB.';
      }
      if (error == null) {
        parsed = parseCsvStatement(text, fileName: file.name);
        if (!parsed.ok) error = parsed.error;
      }
    }

    setState(() {
      _busy = false;
      _file = file;
      _parsed = error == null ? parsed : null;
      _error = error;
      _replan();
    });
  }

  Future<void> _pickCategory({
    required bool income,
    required String currentId,
    required ValueChanged<String> onPicked,
  }) async {
    final picked = await showCategoryPicker(
      context,
      categories: _kindCategories(
        income ? TransactionKind.income : TransactionKind.expense,
      ),
      selectedId: currentId.isEmpty ? null : currentId,
    );
    if (picked != null) onPicked(picked.id);
  }

  /// One RPC, one atomic batch — the server rejects the whole import on
  /// any bad row, so the client never tracks partial progress.
  Future<void> _import() async {
    final parsed = _parsed;
    final plan = _plan;
    if (_busy || parsed == null || plan == null || plan.ready.isEmpty) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await widget.onImport(toCsvImportBatch(parsed, plan));
      if (mounted) Navigator.of(context).pop(result);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = csvImportErrorMessage(e);
        });
      }
    }
  }

  Widget _categoryField({
    required String label,
    required String categoryId,
    required VoidCallback onTap,
  }) {
    final name = widget.categories
        .where((c) => c.id == categoryId)
        .map((c) => c.name)
        .firstOrNull;
    return InkWell(
      onTap: _busy ? null : onTap,
      borderRadius: BorderRadius.circular(4),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          suffixIcon: const Icon(Icons.arrow_drop_down),
        ),
        child: Text(
          name ?? 'Chọn',
          style: name == null
              ? TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)
              : null,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final plan = _plan;
    final readyRows = plan == null
        ? const <CsvImportReadyRow>[]
        : plan.ready.take(_previewLimit).toList();
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.8,
        expand: false,
        builder: (context, scroll) => ListView(
          controller: scroll,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          children: [
            Text(
              'Nhập CSV hoặc Excel',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              'Mỗi dòng thành một mục chờ duyệt trong Cần xem — '
              'chưa có gì ghi vào sổ.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            if (_parsed == null) ...[
              Text(
                'File sao kê CSV hoặc Excel (.xlsx, tối đa 10 MB) — '
                'cần cột ngày, số tiền và mô tả.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 8),
              FilledButton.tonalIcon(
                onPressed: _busy ? null : _pick,
                icon: const Icon(Icons.upload_file_outlined),
                label: const Text('Chọn file CSV hoặc Excel (.xlsx)'),
              ),
            ] else ...[
              Card(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: ListTile(
                  dense: true,
                  leading: const Icon(Icons.description_outlined),
                  title: Text(
                    _file?.name ?? _parsed!.fileName,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: plan == null ? null : Text(csvImportSummary(plan)),
                ),
              ),
              const SizedBox(height: 8),
              for (final row in readyRows)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(row.merchant, overflow: TextOverflow.ellipsis),
                  subtitle: Text(
                    '${inboxKindLabel(row.kind)} · '
                    '${_displayDate(row.occurredOn)}',
                  ),
                  trailing: Text(formatMoney(row.amountMinor)),
                ),
              if (plan != null && plan.readyCount > readyRows.length)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    '… và ${plan.readyCount - readyRows.length} dòng nữa',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              const SizedBox(height: 4),
              DropdownButtonFormField<String>(
                key: ValueKey('acc-$_accountId'),
                initialValue: _accountId.isEmpty ? null : _accountId,
                decoration: const InputDecoration(
                  labelText: 'Tài khoản',
                  border: OutlineInputBorder(),
                ),
                items: [
                  for (final a in widget.accounts)
                    DropdownMenuItem(value: a.id, child: Text(a.name)),
                ],
                onChanged: _busy
                    ? null
                    : (v) => setState(() {
                        _accountId = v ?? '';
                        _replan();
                      }),
              ),
              const SizedBox(height: 12),
              _categoryField(
                label: 'Danh mục chi',
                categoryId: _expenseCategoryId,
                onTap: () => _pickCategory(
                  income: false,
                  currentId: _expenseCategoryId,
                  onPicked: (id) => setState(() {
                    _expenseCategoryId = id;
                    _replan();
                  }),
                ),
              ),
              const SizedBox(height: 12),
              _categoryField(
                label: 'Danh mục thu',
                categoryId: _incomeCategoryId,
                onTap: () => _pickCategory(
                  income: true,
                  currentId: _incomeCategoryId,
                  onPicked: (id) => setState(() {
                    _incomeCategoryId = id;
                    _replan();
                  }),
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (_error != null) ...[
              const SizedBox(height: 4),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              const SizedBox(height: 8),
            ],
            if (_parsed != null) ...[
              FilledButton.icon(
                onPressed: _busy || plan == null || plan.readyCount == 0
                    ? null
                    : _import,
                icon: _busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.move_to_inbox),
                label: Text(
                  plan == null
                      ? 'Nhập vào Cần xem'
                      : 'Nhập ${plan.readyCount} mục vào Cần xem',
                ),
              ),
              TextButton(
                onPressed: _busy ? null : _pick,
                child: const Text('Chọn file khác'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
