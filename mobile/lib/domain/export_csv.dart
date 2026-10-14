// Period CSV export — a byte-identical port of the web contract in
// src/lib/reports.ts (transactionsToCsv / rowsToCsv / escapeCsvCell).
// Same UTF-8 BOM, CRLF endings, header row, split expansion, sign rules
// and cell quoting, so a file from the phone reads exactly like one from
// the site. Money stays integer đồng; transfers export as positive
// "Chuyển tiền" rows and never masquerade as income or expense.

import 'models.dart';

/// UTF-8 BOM prefix — the web writes it so spreadsheet apps decode the
/// Vietnamese header as UTF-8 instead of guessing a legacy codepage.
const csvBom = '\uFEFF';

/// MIME types handed to the share sheet.
const csvMimeType = 'text/csv;charset=utf-8';
const jsonMimeType = 'application/json;charset=utf-8';

/// Header row, in column order — verbatim Vietnamese labels from the web.
const csvHeader = [
  'Ngày',
  'Loại',
  'Ghi chú',
  'Danh mục',
  'Tài khoản nguồn',
  'Tài khoản đích',
  'Số tiền (VND)',
];

/// Cell-leading characters a spreadsheet would parse as a formula — the
/// web guards injection by prefixing a single quote. It applies to *string*
/// cells only: signed amounts keep their bare minus sign.
final _formulaTrigger = RegExp(r'^[=+\-@\t\r]');

/// Escape one CSV cell exactly like `escapeCsvCell`: every cell is quoted,
/// embedded quotes double, and strings opening with a formula trigger
/// get a leading apostrophe.
String escapeCsvCell(Object value) {
  var text = '$value';
  if (value is String && _formulaTrigger.hasMatch(text)) {
    text = "'$text";
  }
  return '"${text.replaceAll('"', '""')}"';
}

/// BOM + CRLF-joined quoted rows + a trailing newline — `rowsToCsv`.
String rowsToCsv(List<String> header, List<List<Object>> rows) {
  final lines = [
    header,
    ...rows,
  ].map((row) => row.map(escapeCsvCell).join(','));
  return '$csvBom${lines.join('\r\n')}\r\n';
}

String _kindLabel(TransactionKind kind) => switch (kind) {
  TransactionKind.income => 'Thu nhập',
  TransactionKind.expense => 'Chi tiêu',
  TransactionKind.transfer => 'Chuyển tiền',
};

/// CSV body for a period — one row per transaction, except a split expense
/// which expands to one row per category line (note repeated, each line
/// amount negative, destination empty) exactly like the web.
String transactionsToCsv(List<Transaction> transactions) {
  final rows = <List<Object>>[];
  for (final item in transactions) {
    if (item.kind == TransactionKind.expense && item.splitLines.length >= 2) {
      for (final line in item.splitLines) {
        rows.add([
          item.occurredOn,
          'Chi tiêu',
          item.note,
          line.category,
          item.account,
          '',
          -line.amount,
        ]);
      }
      continue;
    }
    rows.add([
      item.occurredOn,
      _kindLabel(item.kind),
      item.note,
      item.category,
      item.account,
      item.destinationAccount ?? '',
      // Expense is negative; income and transfer stay positive — the web's
      // signedExportAmount rule.
      item.kind == TransactionKind.expense ? -item.amount : item.amount,
    ]);
  }
  return rowsToCsv(csvHeader, rows);
}

/// `moneyflow-<from>-<to>.csv` — the name the web's reports export uses,
/// embedding the period's inclusive bounds so the file names itself.
String exportCsvFilename(String from, String toInclusive) =>
    'moneyflow-$from-$toInclusive.csv';

/// `moneyflow-backup-<yyyymmdd>.json` — the full-archive download name.
String exportBackupFilename(DateTime day) {
  String two(int v) => v.toString().padLeft(2, '0');
  return 'moneyflow-backup-${day.year}${two(day.month)}${two(day.day)}.json';
}
