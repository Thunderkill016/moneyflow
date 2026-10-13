// XLSX statement import — a Dart port of src/lib/inbox/parse-xlsx.ts plus
// the layout-pilot slice of src/lib/inbox/xlsx-pilot.ts.
//
// The `excel` package decodes the workbook (it is number-format aware:
// date-formatted cells arrive as DateCellValue/DateTimeCellValue, amounts
// as IntCellValue/DoubleCellValue). Sheets are then flattened to the same
// string matrix the CSV parser consumes, the pilot header scan finds the
// transactions table behind a bank's title/account preamble, and
// parseStatementFromMatrix emits the SAME CsvParsedRow model — so the
// preview → prepare RPC → "Cần xem" flow is reused unchanged.
//
// Deliberately absent, mirroring the web's conservative posture:
//  - no evidence/inspection payload (structural metadata the web gathers
//    for future strict adapters — mobile sends only the shared contract);
//  - no user column-map override seam (the web has one, mobile doesn't);
//  - legacy .xls (BIFF/OLE compound) is out of scope — the excel package
//    reads OOXML only, and a failed decode gets the same honest error.
//
// Money stays integer VND đồng. A numeric cell with a real fractional part
// stringifies to a bare decimal, which parseCsvAmountCell refuses — float
// money never reaches the wire.

import 'dart:typed_data';

import 'package:excel/excel.dart';

import 'csv_import.dart';

/// Port of HEADER_SCAN_LIMIT — the pilot only looks for a header row in
/// the first 25 worksheet rows; a table deeper than that is not a bank
/// statement layout this parser vouches for.
const _headerScanLimit = 25;

/// Port of HEADER_CONFIDENCE_FLOOR — below 0.85 the heuristic column map
/// is not trusted to skip a preamble row.
const _headerConfidenceFloor = 0.85;

/// Port of TRANSACTION_DATE_HEADERS — when a statement offers both an
/// accounting/effective date and a real transaction date, the transaction
/// date wins `occurred_on` (the ACB/VietinBank layout evidence).
final _transactionDateHeaders = RegExp(
  r'^(transaction\s*date|trans\s*date|txn\s*date|ngay\s*giao\s*dich|'
  r'ngày\s*giao\s*dịch|ngay\s*phat\s*sinh\s*giao\s*dich|'
  r'ngày\s*phát\s*sinh\s*giao\s*dịch|ngay\s*gd|ngày\s*gd)$',
  caseSensitive: false,
);

/// Port of PILOT_DEBIT_HEADERS — observed "Số tiền ghi nợ" (VCB) and
/// "Số tiền rút ra" (ACB) columns, plus the bare bilingual "Nợ".
final _pilotDebitHeaders = RegExp(
  r'^(debit|nợ|ghi\s*no|ghi\s*nợ|so\s*tien\s*ghi\s*no|'
  r'số\s*tiền\s*ghi\s*nợ|so\s*tien\s*rut\s*ra|số\s*tiền\s*rút\s*ra)$',
  caseSensitive: false,
);

/// Port of PILOT_CREDIT_HEADERS — "Số tiền ghi có" / "Số tiền gửi vào" /
/// the bare bilingual "Có".
final _pilotCreditHeaders = RegExp(
  r'^(credit|có|ghi\s*co|ghi\s*có|so\s*tien\s*ghi\s*co|'
  r'số\s*tiền\s*ghi\s*có|so\s*tien\s*gui\s*vao|số\s*tiền\s*gửi\s*vào)$',
  caseSensitive: false,
);

/// Port of PILOT_DESCRIPTION_HEADERS.
final _pilotDescriptionHeaders = RegExp(
  r'^(transaction\s*description|description|mo\s*ta\s*giao\s*dich|'
  r'mô\s*tả\s*giao\s*dịch|noi\s*dung\s*giao\s*dich|'
  r'nội\s*dung\s*giao\s*dịch)$',
  caseSensitive: false,
);

/// Port of STANDALONE_DIRECTION_HEADERS — a dedicated "+"/"-" column
/// (VCB's "Thay đổi") that qualifies an unsigned amount column.
final _standaloneDirectionHeaders = RegExp(
  r'^(change|direction|sign|thay\s*doi|thay\s*đổi)$',
  caseSensitive: false,
);

final _headerLetter = RegExp(r'[a-zA-ZÀ-ỹ]');
final _leadingSign = RegExp(r'^[+\-–—]');
final _parenWrapped = RegExp(r'^\(.+\)$');

/// The honest failure the task contract requires: an unrecognized workbook
/// layout must never degrade into guessed garbage rows.
const kXlsxFormatError = 'Không đọc được định dạng file — gửi CSV hoặc báo lỗi';

CsvParseResult _xlsxFail(String fileName, String error) => CsvParseResult(
  ok: false,
  fileName: fileName,
  headers: const [],
  columnMap: emptyCsvColumnMap,
  mapConfidence: 0,
  rows: const [],
  skippedRows: 0,
  warningCount: 0,
  error: error,
);

String _two(int v) => v.toString().padLeft(2, '0');

/// Port of xlsxCellToString — a typed cell becomes the same text the CSV
/// path would have seen. Dates → YYYY-MM-DD (the web drops the time part
/// for Date cells; DateTime cells follow suit), whole numbers → integer
/// text, booleans → TRUE/FALSE. Formula cells have no exposed cached
/// value in the excel package, so they read as empty — a formula never
/// turns into money or a merchant guess.
String _cellToString(CellValue? value) {
  switch (value) {
    case null:
      return '';
    case TextCellValue v:
      return v.value.toString().trim();
    case IntCellValue v:
      return v.value.toString();
    case DoubleCellValue v:
      final d = v.value;
      if (!d.isFinite) return '';
      return d == d.truncateToDouble() ? d.truncate().toString() : '$d';
    case BoolCellValue v:
      return v.value ? 'TRUE' : 'FALSE';
    case DateCellValue v:
      return '${v.year}-${_two(v.month)}-${_two(v.day)}';
    case DateTimeCellValue v:
      return '${v.year}-${_two(v.month)}-${_two(v.day)}';
    case TimeCellValue v:
      return v.toString();
    case FormulaCellValue _:
      return '';
  }
}

/// Flatten a worksheet to a dense string matrix. Sheet.rows is already
/// rectangular and index-aligned with the worksheet (row i ↔ Excel row
/// i+1), and blank rows are KEPT — dropping them would drift `row_index`
/// provenance, exactly why the web pilot keeps its indexed matrix.
List<List<String>> _sheetToMatrix(Sheet sheet) => [
  for (final row in sheet.rows)
    [for (final cell in row) _cellToString(cell?.value)],
];

/// Port of normalizePilotHeader + pilotHeaderSegments — bilingual headers
/// like "Nợ/ Debit" split on '/' so each segment can match a role.
String _normalizePilotHeader(String header) =>
    header.trim().replaceAll(RegExp(r'[_\s]+'), ' ');

List<String> _pilotHeaderSegments(String header) => [
  for (final segment in _normalizePilotHeader(header).split('/'))
    if (segment.trim().isNotEmpty) segment.trim(),
];

int _findPilotRoleIndex(List<String> headers, RegExp pattern) {
  for (var i = 0; i < headers.length; i++) {
    for (final segment in _pilotHeaderSegments(headers[i])) {
      if (pattern.hasMatch(segment)) return i;
    }
  }
  return -1;
}

/// Port of preferExplicitPilotRoles — explicit statement roles beat the
/// generic heuristic: a transaction-date column wins over effective date;
/// observed debit/credit headers null out a guessed single amount column
/// so a balance/reference column is never mistaken for the amount.
CsvColumnMap _preferExplicitPilotRoles(List<String> headers, CsvColumnMap map) {
  final transactionDate = _findPilotRoleIndex(headers, _transactionDateHeaders);
  final debit = _findPilotRoleIndex(headers, _pilotDebitHeaders);
  final credit = _findPilotRoleIndex(headers, _pilotCreditHeaders);
  final description = _findPilotRoleIndex(headers, _pilotDescriptionHeaders);
  final hasDebitCredit = debit >= 0 || credit >= 0;

  return CsvColumnMap(
    date: transactionDate >= 0 ? transactionDate : map.date,
    amount: hasDebitCredit ? null : map.amount,
    desc: description >= 0 ? description : map.desc,
    debit: debit >= 0 ? debit : map.debit,
    credit: credit >= 0 ? credit : map.credit,
  );
}

/// Port of findLikelyXlsxHeaderRow — within the scan window a row counts
/// as the header when ≥2 cells hold letters and the shared column
/// heuristic maps it at ≥0.85 confidence. Highest confidence wins.
({int index, CsvColumnMap map, double confidence})? findLikelyXlsxHeaderRow(
  List<List<String>> matrix,
) {
  ({int index, CsvColumnMap map, double confidence})? best;
  final limit = matrix.length < _headerScanLimit
      ? matrix.length
      : _headerScanLimit;

  for (var index = 0; index < limit; index++) {
    final row = matrix[index];
    var nonEmptyTextCells = 0;
    for (final cell in row) {
      if (cell.trim().isNotEmpty && _headerLetter.hasMatch(cell)) {
        nonEmptyTextCells += 1;
      }
    }
    if (nonEmptyTextCells < 2) continue;

    final mapped = mapCsvColumns(row);
    if (mapped.confidence < _headerConfidenceFloor) continue;

    if (best == null || mapped.confidence > best.confidence) {
      best = (
        index: index,
        map: _preferExplicitPilotRoles(row, mapped.map),
        confidence: mapped.confidence,
      );
    }
  }

  return best;
}

/// Port of applyStandaloneDirectionToAmount — a standalone "+"/"-"
/// direction column signs an otherwise unsigned amount. It only applies
/// with an exact direction-style header and standalone sign cells; a
/// reference number's hyphen is never direction (web pilot evidence).
List<List<String>> _applyStandaloneDirectionToAmount(
  List<List<String>> matrix,
  CsvColumnMap map,
) {
  if (matrix.length < 2 ||
      map.amount == null ||
      map.debit != null ||
      map.credit != null) {
    return matrix;
  }

  final headers = matrix.first;
  var directionIndex = -1;
  for (var i = 0; i < headers.length; i++) {
    if (_standaloneDirectionHeaders.hasMatch(
      _normalizePilotHeader(headers[i]),
    )) {
      directionIndex = i;
      break;
    }
  }
  if (directionIndex < 0) return matrix;

  String cellAt(List<String> row, int index) =>
      index >= 0 && index < row.length ? row[index].trim() : '';

  var changed = false;
  final next = <List<String>>[
    matrix.first,
    for (var index = 1; index < matrix.length; index++)
      _applyDirectionCell(
        matrix[index],
        directionIndex: directionIndex,
        amountIndex: map.amount!,
        cellAt: cellAt,
        onChanged: () => changed = true,
      ),
  ];
  return changed ? next : matrix;
}

List<String> _applyDirectionCell(
  List<String> row, {
  required int directionIndex,
  required int amountIndex,
  required String Function(List<String>, int) cellAt,
  required void Function() onChanged,
}) {
  final direction = cellAt(row, directionIndex);
  if (direction != '+' && direction != '-') return row;

  final amount = cellAt(row, amountIndex);
  if (amount.isEmpty ||
      _leadingSign.hasMatch(amount) ||
      _parenWrapped.hasMatch(amount)) {
    return row;
  }

  onChanged();
  return [
    for (var i = 0; i < row.length; i++)
      i == amountIndex ? '$direction$amount' : row[i],
  ];
}

/// Port of parseXlsxPilotStatement's file-first flow, minus the
/// structural-inspection payload mobile never sends. Every sheet is
/// scanned in order; the first one with a confident header row is the
/// transactions sheet. When no sheet maps confidently — or the workbook
/// will not decode at all — the result is the honest format error, never
/// positional-guessed garbage rows.
CsvParseResult parseXlsxStatement(
  Uint8List bytes, {
  String fileName = 'statement.xlsx',
  String? today,
  int maxRows = kCsvMaxRows,
}) {
  if (bytes.isEmpty) {
    return _xlsxFail(fileName, 'File Excel trống hoặc không đọc được.');
  }

  final Excel workbook;
  try {
    workbook = Excel.decodeBytes(bytes);
  } catch (_) {
    return _xlsxFail(fileName, kXlsxFormatError);
  }
  if (workbook.tables.isEmpty) {
    return _xlsxFail(fileName, 'File Excel không có sheet nào.');
  }

  CsvParseResult? firstFailure;
  var firstFailureSheet = '';
  for (final entry in workbook.tables.entries) {
    final matrix = _sheetToMatrix(entry.value);
    if (matrix.isEmpty) continue;

    final header = findLikelyXlsxHeaderRow(matrix);
    if (header == null) continue;

    final statement = _applyStandaloneDirectionToAmount(
      matrix.sublist(header.index),
      header.map,
    );
    final result = parseStatementFromMatrix(
      statement,
      fileName: fileName,
      today: today,
      maxRows: maxRows,
      columnMap: header.map,
      // The map is heuristic-derived, not user-confirmed — report the
      // real scan score rather than the web's blanket 1.
      mapConfidence: header.confidence,
      // matrix index ↔ worksheet row − 1, so the header's matrix index is
      // exactly the web's `headerRowNumber - 1` offset.
      rowIndexOffset: header.index,
    );
    if (result.ok) return result;

    // A sheet that mapped confidently but produced no parseable rows is
    // still the best explanation we have — keep its error, keep looking.
    if (firstFailure == null) {
      firstFailure = result;
      firstFailureSheet = entry.key;
    }
  }

  if (firstFailure != null) {
    final error = firstFailure.error;
    if (error != null) {
      return CsvParseResult(
        ok: false,
        fileName: firstFailure.fileName,
        headers: firstFailure.headers,
        columnMap: firstFailure.columnMap,
        mapConfidence: firstFailure.mapConfidence,
        rows: const [],
        skippedRows: firstFailure.skippedRows,
        warningCount: firstFailure.warningCount,
        error: '$error (sheet "$firstFailureSheet").',
      );
    }
    return firstFailure;
  }

  return _xlsxFail(fileName, kXlsxFormatError);
}
