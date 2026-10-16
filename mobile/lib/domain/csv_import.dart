// CSV statement import — a Dart port of src/lib/inbox/parse-csv.ts plus the
// planning slice of src/lib/inbox/direct-csv-import.ts.
//
// The pipeline mirrors the web's direct CSV import: file text → heuristic
// column map → parsed rows → ready rows → prepare_direct_csv_candidates_
// with_rules → pending inbox_candidates. What changes on mobile is the
// END of the pipeline: the web commits through approve_inbox_candidates_
// batch in the same action, while mobile stops after preparation — every
// row lands in "Cần xem" and only the review queue can post it to the
// ledger (product law: imported data never posts automatically).
//
// Two web-side steps are deliberately absent here:
//  - ledger fingerprint dedupe needs the loaded ledger, which this surface
//    never reads; duplicates still surface at review time through
//    plan_inbox_candidate, so nothing unsafe slips through;
//  - deterministic inbox rules have no mobile engine yet, so no
//    applied_rule_id evidence is ever sent.
//
// Money stays integer VND đồng. No float ever reaches the wire.

import 'inbox.dart';
import 'models.dart';
import 'report.dart' show vnToday;

/// MAX_UPLOAD_BYTES from the web parser — the same 10 MB cap the web page
/// enforces before it even reads the file.
const kCsvMaxUploadBytes = 10 * 1024 * 1024;

/// Server-side candidate cap (invalid_direct_csv_candidate_count above
/// 5000) and the web parser's own maxRows default.
const kCsvMaxRows = 5000;

/// Column roles the heuristic maps — same field set as the web's
/// CsvColumnMap; the RPC stores it verbatim as `column_map`.
class CsvColumnMap {
  const CsvColumnMap({
    this.date,
    this.amount,
    this.desc,
    this.debit,
    this.credit,
  });

  final int? date;
  final int? amount;
  final int? desc;
  final int? debit;
  final int? credit;

  /// The jsonb object `p_batch.column_map` expects — every key present,
  /// unmapped roles as null, exactly like the web payload.
  Map<String, Object?> toWire() => {
    'date': date,
    'amount': amount,
    'desc': desc,
    'debit': debit,
    'credit': credit,
  };
}

const emptyCsvColumnMap = CsvColumnMap();

/// One parsed CSV data row — port of ParsedCsvRow (source-adapter evidence
/// fields stay unset: ordinary CSV has no stable source id, and the RPC
/// rejects candidates that carry `source_external_id`).
class CsvParsedRow {
  const CsvParsedRow({
    required this.kind,
    required this.amountMinor,
    required this.merchant,
    required this.note,
    required this.occurredOn,
    required this.confidence,
    required this.uncertainFields,
    required this.rawSnippet,
    required this.rowIndex,
  });

  final TransactionKind kind;

  /// Absolute amount in integer đồng, always > 0.
  final int amountMinor;
  final String merchant;
  final String note;

  /// YYYY-MM-DD.
  final String occurredOn;

  /// 'high' | 'medium' | 'low' — the inbox_candidate_confidence enum.
  final String confidence;

  /// 'amount' | 'merchant' | 'date' | 'kind' — preview-only like the web.
  final List<String> uncertainFields;
  final String rawSnippet;

  /// 1-based source row number in the original file (header counts), sent
  /// as `row_index` — the web's same inspectability-only convention.
  final int rowIndex;
}

/// Port of ParseCsvResult — `ok` gates every downstream step; `error`
/// carries the web's Vietnamese wording verbatim.
class CsvParseResult {
  const CsvParseResult({
    required this.ok,
    required this.fileName,
    required this.headers,
    required this.columnMap,
    required this.mapConfidence,
    required this.rows,
    required this.skippedRows,
    required this.warningCount,
    this.error,
  });

  final bool ok;
  final String fileName;
  final List<String> headers;
  final CsvColumnMap columnMap;

  /// 0..1 — heuristic auto-map confidence, stored on the batch row.
  final double mapConfidence;
  final List<CsvParsedRow> rows;
  final int skippedRows;
  final int warningCount;
  final String? error;
}

final _dateHeaders = RegExp(
  r'^(date|ngay|ngày|transaction\s*date|posted|posting\s*date|trans\s*date|'
  r'thoi\s*gian|thời\s*gian|ngay\s*gd|ngày\s*gd|txn\s*date|value\s*date)$',
  caseSensitive: false,
);
final _amountHeaders = RegExp(
  r'^(amount|so\s*tien|số\s*tiền|money|value|giao\s*dich|phat\s*sinh|'
  r'phát\s*sinh|so_tien|sotien|amt|transaction\s*amount|tong|tổng)$',
  caseSensitive: false,
);
final _debitHeaders = RegExp(
  r'^(debit|chi|withdraw|withdrawal|ps\s*no|phat\s*sinh\s*no|'
  r'phát\s*sinh\s*nợ|ghi\s*no|ghi\s*nợ)$',
  caseSensitive: false,
);
final _creditHeaders = RegExp(
  r'^(credit|thu|deposit|ps\s*co|phat\s*sinh\s*co|phát\s*sinh\s*có|'
  r'ghi\s*co|ghi\s*có)$',
  caseSensitive: false,
);
final _descHeaders = RegExp(
  r'^(desc|description|mo\s*ta|mô\s*tả|content|noi\s*dung|nội\s*dung|'
  r'merchant|narration|detail|details|dien\s*giai|diễn\s*giải|memo|note|'
  r'ghi\s*chu|ghi\s*chú|remark|remarks|transaction\s*details?)$',
  caseSensitive: false,
);

/// Loose fallback patterns from scoreHeader's second tier — kept separate
/// so the port does not need JS's `pattern.source.includes(...)` trick.
final _amountLoose = RegExp(r'amount|số tiền|so tien|tiền|tien');
final _dateLoose = RegExp(r'date|ngày|ngay');
final _descLoose = RegExp(
  r'mô tả|mo ta|nội dung|noi dung|diễn giải|dien giai|description|'
  r'merchant|memo',
);

final _incomeHint = RegExp(
  r'\b(luong|lương|salary|thu\s*nhập|thu nhap|nhận|nhan|hoàn\s*tiền|'
  r'hoan tien|refund|\+|deposit|credit)\b',
  caseSensitive: false,
);
final _transferHint = RegExp(
  r'\b(ck|chuyen|chuyển|transfer|nội\s*bộ|noi bo|chuyển\s*khoản|'
  r'chuyen khoan)\b',
  caseSensitive: false,
);

final _whitespace = RegExp(r'\s+');
final _headerLetter = RegExp(r'[a-zA-ZÀ-ỹ]');
final _plainNumberCell = RegExp(r'^\d+[.,]?\d*$');
final _dashOnly = RegExp(r'^[-–—]$');
final _parenAmount = RegExp(r'^\((.+)\)$');
final _leadingSign = RegExp(r'^[-–—]\s*');
final _currencyWord = RegExp(r'\b(vnd|vnđ|đồng|dong)\b', caseSensitive: false);
final _currencySymbol = RegExp('[₫đ]');
final _unitSuffix = RegExp(
  r'^(.+?)\s*(k|tr|triệu|trieu|m)$',
  caseSensitive: false,
);

final _isoDate = RegExp(r'\b(20\d{2})-(\d{2})-(\d{2})\b');
final _dmyDate = RegExp(r'\b(\d{1,2})[/.−-](\d{1,2})[/.−-](20\d{2})\b');
final _ymdDate = RegExp(r'\b(20\d{2})[/.](\d{1,2})[/.](\d{1,2})\b');
final _dmDate = RegExp(r'\b(\d{1,2})[/.](\d{1,2})\b');

final _groupedNumber = RegExp(r'^\d{1,3}([.,]\d{3})+$');
final _plainDigits = RegExp(r'^\d+$');
final _looseDecimal = RegExp(r'^\d+[.,]\d+$');

/// JS safe-integer ceiling — the same bound the RPC enforces on
/// amount_minor.
const _maxSafeAmount = 9007199254740991;

/// Raw snippets are clipped like the web parser (160 chars).
const _snippetMaxLength = 160;

/// Merchant guesses cap at 64 chars like the web.
const _merchantMaxLength = 64;

// The "missing year / hôm nay" anchor shares the one VN-today rule in
// domain/report.dart — todayInHoChiMinh in the web.

/// Split CSV text into rows of cells — a verbatim port of parseCsvMatrix
/// (RFC4180-ish: quotes, escaped quotes, commas, CRLF; UTF-8 BOM stripped;
/// blank rows dropped, cells trimmed).
List<List<String>> parseCsvMatrix(String text) {
  final rows = <List<String>>[];
  var row = <String>[];
  final cell = StringBuffer();
  var i = 0;
  var inQuotes = false;
  final input = text.startsWith('\uFEFF') ? text.substring(1) : text;

  while (i < input.length) {
    final ch = input[i];
    if (inQuotes) {
      if (ch == '"') {
        if (i + 1 < input.length && input[i + 1] == '"') {
          cell.write('"');
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell.write(ch);
      i += 1;
      continue;
    }

    if (ch == '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch == ',') {
      row.add(cell.toString());
      cell.clear();
      i += 1;
      continue;
    }
    if (ch == '\r') {
      i += 1;
      continue;
    }
    if (ch == '\n') {
      row.add(cell.toString());
      cell.clear();
      rows.add(row);
      row = [];
      i += 1;
      continue;
    }
    cell.write(ch);
    i += 1;
  }

  if (cell.isNotEmpty || row.isNotEmpty) {
    row.add(cell.toString());
    rows.add(row);
  }

  return [
    for (final r in rows)
      if (r.map((c) => c.trim()).any((c) => c.isNotEmpty))
        [for (final c in r) c.trim()],
  ];
}

String _normalizeHeader(String h) =>
    (h.startsWith('\uFEFF') ? h.substring(1) : h).trim().replaceAll(
      _whitespace,
      ' ',
    );

/// Port of scoreHeader: exact header match scores 3, a loose
/// role-specific substring scores 2, anything else 0.
int _scoreHeader(String header, RegExp pattern, String role) {
  final h = _normalizeHeader(header);
  if (h.isEmpty) return 0;
  if (pattern.hasMatch(h)) return 3;
  final compact = h.toLowerCase().replaceAll(RegExp(r'[_\s]+'), ' ');
  if (role == 'amount' && _amountLoose.hasMatch(compact)) return 2;
  if (role == 'date' && _dateLoose.hasMatch(compact)) return 2;
  if (role == 'desc' && _descLoose.hasMatch(compact)) return 2;
  return 0;
}

/// Port of mapCsvColumns — highest-scoring column per role wins (earliest
/// on a tie), then positional fallbacks, then the 0.55/0.45 confidence
/// blend.
({CsvColumnMap map, double confidence}) mapCsvColumns(List<String> headers) {
  int? date, amount, desc, debit, credit;
  var bestDate = 0;
  var bestAmount = 0;
  var bestDesc = 0;
  var bestDebit = 0;
  var bestCredit = 0;

  for (var index = 0; index < headers.length; index++) {
    final header = headers[index];
    final d = _scoreHeader(header, _dateHeaders, 'date');
    if (d > bestDate) {
      bestDate = d;
      date = index;
    }
    final a = _scoreHeader(header, _amountHeaders, 'amount');
    if (a > bestAmount) {
      bestAmount = a;
      amount = index;
    }
    final deb = _scoreHeader(header, _debitHeaders, 'debit');
    if (deb > bestDebit) {
      bestDebit = deb;
      debit = index;
    }
    final cre = _scoreHeader(header, _creditHeaders, 'credit');
    if (cre > bestCredit) {
      bestCredit = cre;
      credit = index;
    }
    final de = _scoreHeader(header, _descHeaders, 'desc');
    if (de > bestDesc) {
      bestDesc = de;
      desc = index;
    }
  }

  if (date == null && headers.isNotEmpty) {
    date = 0;
    bestDate = bestDate < 1 ? 1 : bestDate;
  }
  if (amount == null && debit == null && credit == null) {
    if (headers.length >= 3) {
      amount = headers.length - 1;
      bestAmount = bestAmount < 1 ? 1 : bestAmount;
    } else if (headers.length == 2) {
      amount = 1;
      bestAmount = bestAmount < 1 ? 1 : bestAmount;
    }
  }
  if (desc == null && headers.length >= 2) {
    if (headers.length >= 3) {
      desc = 1;
      bestDesc = bestDesc < 1 ? 1 : bestDesc;
    } else {
      desc = date == 0 ? 1 : 0;
      bestDesc = bestDesc < 1 ? 1 : bestDesc;
    }
  }

  final rolesHit =
      (date != null ? 1 : 0) +
      (amount != null || debit != null || credit != null ? 1 : 0) +
      (desc != null ? 1 : 0);
  final nameHits =
      (bestDate >= 2 ? 1 : 0) +
      (bestAmount >= 2 || bestDebit >= 2 || bestCredit >= 2 ? 1 : 0) +
      (bestDesc >= 2 ? 1 : 0);
  final confidence = (rolesHit / 3) * 0.55 + (nameHits / 3) * 0.45;
  return (
    map: CsvColumnMap(
      date: date,
      amount: amount,
      desc: desc,
      debit: debit,
      credit: credit,
    ),
    confidence: confidence > 1 ? 1 : confidence,
  );
}

/// Null on a failed parse (int.tryParse returns null past int64 — a
/// 20+-digit run is a reference/account number, never a VND amount), a
/// non-positive value or anything above the JS safe-integer ceiling.
int? _safeInt(int? value) =>
    (value != null && value > 0 && value <= _maxSafeAmount) ? value : null;

double? _parseDecimalLoose(String value) {
  if (_looseDecimal.hasMatch(value)) {
    return double.tryParse(value.replaceAll(',', '.'));
  }
  if (_plainDigits.hasMatch(value)) return double.tryParse(value);
  return null;
}

/// Port of parseVndAmountToken (src/lib/inbox/parse-text.ts) — the same
/// private copy the paste parser keeps; unit multipliers first, then
/// grouped thousands, then a plain integer. A bare decimal ("45.5") is
/// ambiguous — never money.
int? _parseVndAmountToken(String rawNumber, String? unit) {
  final unitNorm = (unit ?? '').toLowerCase().trim();
  final cleaned = rawNumber.trim();
  if (cleaned.isEmpty) return null;

  if (const {'k', 'nghìn', 'nghin', 'ngàn', 'ngan'}.contains(unitNorm)) {
    final base = _parseDecimalLoose(cleaned);
    if (base == null) return null;
    return _safeInt((base * 1000).round());
  }
  if (const {'tr', 'triệu', 'trieu', 'm'}.contains(unitNorm)) {
    final base = _parseDecimalLoose(cleaned);
    if (base == null) return null;
    return _safeInt((base * 1000000).round());
  }
  if (_groupedNumber.hasMatch(cleaned)) {
    return _safeInt(int.tryParse(cleaned.replaceAll(RegExp(r'[.,]'), '')));
  }
  if (_plainDigits.hasMatch(cleaned)) {
    // tryParse — the regex allows unbounded runs and int.parse throws on
    // a 20+-digit string; a bad cell must cost one row, not the import.
    return _safeInt(int.tryParse(cleaned));
  }
  return null;
}

/// Port of parseCsvAmountCell: parens and leading dash mark the sign,
/// currency markers are stripped, k/tr/M suffixes scale. Returns the
/// absolute integer amount plus whether the cell read negative.
({int? amount, bool signedNegative}) parseCsvAmountCell(String raw) {
  final text = raw.trim();
  if (text.isEmpty || _dashOnly.hasMatch(text) || text == '0') {
    return (amount: null, signedNegative: false);
  }

  var signedNegative = false;
  var body = text;

  final paren = _parenAmount.firstMatch(body);
  if (paren != null) {
    signedNegative = true;
    body = paren.group(1)!.trim();
  }
  if (_leadingSign.hasMatch(body)) {
    signedNegative = true;
    body = body.replaceAll(_leadingSign, '');
  }
  if (body.startsWith('+')) {
    body = body.substring(1).trim();
  }

  body = body
      .replaceAll(_currencyWord, '')
      .replaceAll(_currencySymbol, '')
      .trim();

  final unitMatch = _unitSuffix.firstMatch(body);
  if (unitMatch != null) {
    final amount = _parseVndAmountToken(
      unitMatch.group(1)!.trim(),
      unitMatch.group(2),
    );
    return (amount: amount, signedNegative: signedNegative);
  }

  body = body.replaceAll(RegExp(r'\s'), '');
  final amount = _parseVndAmountToken(body, null);
  return (amount: amount, signedNegative: signedNegative);
}

/// Strict calendar check — a regex-shaped date can still be impossible
/// (31/02, 30/02, non-leap 29/02). A supplied-but-impossible date is an
/// invalid row, never a normalized one: it reports `found: false` so the
/// row is flagged, not silently re-dated.
bool _isRealDate(int year, int month, int day) {
  if (month < 1 || month > 12 || day < 1) return false;
  final dt = DateTime.utc(year, month, day);
  return dt.year == year && dt.month == month && dt.day == day;
}

/// Port of parseCsvDateCell: ISO first, then D/M/Y (Vietnamese order),
/// Y.M.D, and bare D/M which borrows the year from [today]. Anything else
/// falls back to [today] with `found: false` — never a guessed date.
({String date, bool found}) parseCsvDateCell(String raw, String today) {
  final text = raw.trim();
  if (text.isEmpty) return (date: today, found: false);

  final iso = _isoDate.firstMatch(text);
  if (iso != null &&
      _isRealDate(
        int.parse(iso.group(1)!),
        int.parse(iso.group(2)!),
        int.parse(iso.group(3)!),
      )) {
    return (
      date: '${iso.group(1)}-${iso.group(2)}-${iso.group(3)}',
      found: true,
    );
  }

  final dmyFull = _dmyDate.firstMatch(text);
  if (dmyFull != null &&
      _isRealDate(
        int.parse(dmyFull.group(3)!),
        int.parse(dmyFull.group(2)!),
        int.parse(dmyFull.group(1)!),
      )) {
    final dd = dmyFull.group(1)!.padLeft(2, '0');
    final mm = dmyFull.group(2)!.padLeft(2, '0');
    return (date: '${dmyFull.group(3)}-$mm-$dd', found: true);
  }

  final ymd = _ymdDate.firstMatch(text);
  if (ymd != null &&
      _isRealDate(
        int.parse(ymd.group(1)!),
        int.parse(ymd.group(2)!),
        int.parse(ymd.group(3)!),
      )) {
    final mm = ymd.group(2)!.padLeft(2, '0');
    final dd = ymd.group(3)!.padLeft(2, '0');
    return (date: '${ymd.group(1)}-$mm-$dd', found: true);
  }

  final dmy = _dmDate.firstMatch(text);
  if (dmy != null) {
    final year = int.parse(today.substring(0, 4));
    if (_isRealDate(year, int.parse(dmy.group(2)!), int.parse(dmy.group(1)!))) {
      final dd = dmy.group(1)!.padLeft(2, '0');
      final mm = dmy.group(2)!.padLeft(2, '0');
      return (date: '${today.substring(0, 4)}-$mm-$dd', found: true);
    }
  }

  return (date: today, found: false);
}

/// Port of detectKindFromText — a transfer hint wins, then debit/credit
/// column evidence, then income hints and the sign. An unhinted unsigned
/// row stays an uncertain expense; the reviewer decides.
(TransactionKind, bool) _detectKind(
  String text, {
  required bool signedNegative,
  required bool fromCredit,
  required bool fromDebit,
}) {
  if (_transferHint.hasMatch(text)) {
    return (TransactionKind.transfer, false);
  }
  if (fromCredit && !fromDebit) return (TransactionKind.income, false);
  if (fromDebit && !fromCredit) return (TransactionKind.expense, false);
  if (_incomeHint.hasMatch(text) || (text.contains('+') && !signedNegative)) {
    return (TransactionKind.income, false);
  }
  if (signedNegative) return (TransactionKind.expense, false);
  return (TransactionKind.expense, true);
}

/// Port of scoreConfidence.
String _confidence(List<String> fields) {
  if (fields.isEmpty) return 'high';
  if (fields.length == 1 && fields.first == 'date') return 'medium';
  if (fields.contains('amount') || fields.contains('merchant')) return 'low';
  if (fields.length >= 2) return 'low';
  return 'medium';
}

String _cellAt(List<String> row, int? index) {
  if (index == null || index < 0 || index >= row.length) return '';
  return row[index];
}

/// Port of merchantFromDesc — collapse whitespace, cap at 64 chars, empty
/// or single-char descriptions mark the merchant uncertain.
(String, bool) _merchantFromDesc(String desc) {
  final cleaned = desc.replaceAll(_whitespace, ' ').trim();
  if (cleaned.isEmpty) return ('Không rõ', true);
  final merchant = cleaned.length > _merchantMaxLength
      ? '${cleaned.substring(0, _merchantMaxLength - 3).trim()}…'
      : cleaned;
  return (merchant, cleaned.length < 2);
}

/// Port of looksLikeHeaderRow — a row reads as a header when at least half
/// its cells are text-ish and none look like money.
bool _looksLikeHeaderRow(List<String> row) {
  if (row.isEmpty) return false;
  var textish = 0;
  var moneyish = 0;
  for (final cell in row) {
    final t = cell.trim();
    if (t.isEmpty) continue;
    if (parseCsvAmountCell(t).amount != null && RegExp(r'\d').hasMatch(t)) {
      moneyish += 1;
      continue;
    }
    if (_headerLetter.hasMatch(t) && !_plainNumberCell.hasMatch(t)) {
      textish += 1;
    }
  }
  return textish >= (row.length / 2).ceil().clamp(1, 1 << 62) && moneyish == 0;
}

CsvParseResult _emptyFail(String fileName, String error) => CsvParseResult(
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

CsvParsedRow? _parseDataRow(
  List<String> rawRow,
  CsvColumnMap map,
  String today,
  int rowIndex,
) {
  final uncertain = <String>[];

  int? amount;
  var signedNegative = false;
  var fromDebit = false;
  var fromCredit = false;

  if (map.amount != null) {
    final parsed = parseCsvAmountCell(_cellAt(rawRow, map.amount));
    amount = parsed.amount;
    signedNegative = parsed.signedNegative;
  } else {
    final debit = parseCsvAmountCell(_cellAt(rawRow, map.debit));
    final credit = parseCsvAmountCell(_cellAt(rawRow, map.credit));
    if (debit.amount != null && debit.amount! > 0) {
      amount = debit.amount;
      signedNegative = true;
      fromDebit = true;
    } else if (credit.amount != null && credit.amount! > 0) {
      amount = credit.amount;
      fromCredit = true;
    }
  }

  if (amount == null || amount <= 0) {
    return null;
  }

  final dateResult = parseCsvDateCell(_cellAt(rawRow, map.date), today);
  if (!dateResult.found) uncertain.add('date');

  final desc = _cellAt(rawRow, map.desc);
  final (merchant, merchantUncertain) = _merchantFromDesc(desc);
  if (merchantUncertain) uncertain.add('merchant');

  final kindText = [desc, ...rawRow].join(' ');
  final (kind, kindUncertain) = _detectKind(
    kindText,
    signedNegative: signedNegative,
    fromCredit: fromCredit,
    fromDebit: fromDebit,
  );
  if (kindUncertain) uncertain.add('kind');

  final unique = uncertain.toSet().toList();
  final confidence = _confidence(unique);
  final rawSnippet = rawRow.join(' | ');
  final snippet = rawSnippet.length > _snippetMaxLength
      ? '${rawSnippet.substring(0, _snippetMaxLength - 3)}…'
      : rawSnippet;

  return CsvParsedRow(
    kind: kind,
    amountMinor: amount,
    merchant: merchant,
    note: '',
    occurredOn: dateResult.date,
    confidence: confidence,
    uncertainFields: unique,
    rawSnippet: snippet,
    rowIndex: rowIndex,
  );
}

/// Port of parseCsvStatement — text → matrix → header guess → column map →
/// rows, with the web's exact failure wording.
CsvParseResult parseCsvStatement(
  String text, {
  String fileName = 'statement.csv',
  String? today,
  int maxRows = kCsvMaxRows,
}) {
  if (text.trim().isEmpty) {
    return _emptyFail(fileName, 'File trống hoặc không đọc được nội dung.');
  }

  final matrix = parseCsvMatrix(text);
  if (matrix.isEmpty) {
    return _emptyFail(fileName, 'Không tìm thấy dòng dữ liệu trong CSV.');
  }

  return parseStatementFromMatrix(
    matrix,
    fileName: fileName,
    today: today,
    maxRows: maxRows,
  );
}

/// Port of the web's parseStatementFromMatrix — the matrix-level entry the
/// XLSX reader reuses after it decodes a sheet into strings.
///
/// [columnMap] is the web's `options.columnMap` seam: when given (the XLSX
/// pilot's header-scan result) it overrides the row-0 heuristic. The web
/// then hard-codes confidence to 1; [mapConfidence] lets the XLSX path
/// report its real scan score instead, which is more honest provenance for
/// a heuristic map — the server only range-checks 0..1.
///
/// [rowIndexOffset] shifts reported `row_index` so XLSX rows keep their
/// real worksheet numbers even when the parsed matrix starts mid-sheet
/// (the web's offsetParsedRows convention).
CsvParseResult parseStatementFromMatrix(
  List<List<String>> matrix, {
  String fileName = 'statement.csv',
  String? today,
  int maxRows = kCsvMaxRows,
  CsvColumnMap? columnMap,
  double? mapConfidence,
  int rowIndexOffset = 0,
}) {
  if (matrix.isEmpty) {
    return _emptyFail(fileName, 'Không tìm thấy dòng dữ liệu trong file.');
  }

  final anchor = today ?? vnToday();
  final first = matrix.first;
  final hasHeader = _looksLikeHeaderRow(first);
  final headers = hasHeader
      ? [
          for (var i = 0; i < first.length; i++)
            _normalizeHeader(first[i]).isEmpty
                ? 'Cột ${i + 1}'
                : _normalizeHeader(first[i]),
        ]
      : [for (var i = 0; i < first.length; i++) 'Cột ${i + 1}'];
  final dataRows = hasHeader ? matrix.sublist(1) : matrix;

  if (dataRows.isEmpty) {
    return _emptyFail(
      fileName,
      'File chỉ có tiêu đề, không có dòng giao dịch.',
    );
  }

  final auto = mapCsvColumns(hasHeader ? first : headers);
  final map = columnMap ?? auto.map;
  final confidence = columnMap == null ? auto.confidence : (mapConfidence ?? 1);

  if (map.amount == null && map.debit == null && map.credit == null) {
    return CsvParseResult(
      ok: false,
      fileName: fileName,
      headers: headers,
      columnMap: map,
      mapConfidence: confidence,
      rows: const [],
      skippedRows: dataRows.length,
      warningCount: 0,
      error:
          'Không nhận ra cột số tiền. Kiểm tra file có cột Amount / Số tiền.',
    );
  }

  final rows = <CsvParsedRow>[];
  var skippedRows = 0;
  final limit = dataRows.length < maxRows ? dataRows.length : maxRows;

  for (var i = 0; i < limit; i++) {
    final rawRow = dataRows[i];
    final parsed = _parseDataRow(
      rawRow,
      map,
      anchor,
      i + (hasHeader ? 2 : 1) + rowIndexOffset,
    );
    if (parsed == null) {
      skippedRows += 1;
      continue;
    }
    rows.add(parsed);
  }

  if (dataRows.length > maxRows) {
    skippedRows += dataRows.length - maxRows;
  }

  if (rows.isEmpty) {
    return CsvParseResult(
      ok: false,
      fileName: fileName,
      headers: headers,
      columnMap: map,
      mapConfidence: confidence,
      rows: const [],
      skippedRows: skippedRows,
      warningCount: 0,
      error:
          'Không trích được giao dịch hợp lệ. Cần cột ngày, số tiền và mô tả.',
    );
  }

  final warningCount = rows
      .where((r) => r.confidence == 'low' || r.uncertainFields.isNotEmpty)
      .length;

  return CsvParseResult(
    ok: true,
    fileName: fileName,
    headers: headers,
    columnMap: map,
    mapConfidence: confidence,
    rows: rows,
    skippedRows: skippedRows,
    warningCount: warningCount,
  );
}

// ---- Planning: parsed rows → the candidate payload the RPC accepts ----

/// A row that is safe to send — `kind` is always income or expense because
/// the RPC rejects transfers, and `categoryId`/`accountId` are always
/// resolved real rows (the RPC fails the whole batch otherwise).
class CsvImportReadyRow {
  const CsvImportReadyRow({
    required this.rowIndex,
    required this.kind,
    required this.amountMinor,
    required this.occurredOn,
    required this.note,
    required this.merchant,
    required this.categoryId,
    required this.accountId,
    required this.confidence,
    required this.rawSnippet,
  });

  final int rowIndex;
  final TransactionKind kind;
  final int amountMinor;
  final String occurredOn;
  final String note;
  final String merchant;
  final String categoryId;
  final String accountId;
  final String confidence;
  final String rawSnippet;
}

/// Preview counts — the mobile counterpart of the web's DirectImportPlan,
/// without ledger/duplicate buckets (no ledger rows are loaded here; the
/// review-time dry-run flags real duplicates before anything posts).
class CsvImportPlan {
  const CsvImportPlan({
    required this.ready,
    required this.transferSkipped,
    required this.invalidSkipped,
    required this.totalParsed,
  });

  final List<CsvImportReadyRow> ready;
  final int transferSkipped;
  final int invalidSkipped;
  final int totalParsed;

  int get readyCount => ready.length;
}

final _isoDateShape = RegExp(r'^\d{4}-\d{2}-\d{2}$');

/// Ready-batch date gate: ISO shape plus a real calendar day — the same
/// strictness parseCsvDateCell enforces, kept here so any producer of a
/// CsvParsedRow meets the contract before an atomic server commit.
bool _validImportDate(String date) {
  if (!_isoDateShape.hasMatch(date)) return false;
  return _isRealDate(
    int.parse(date.substring(0, 4)),
    int.parse(date.substring(5, 7)),
    int.parse(date.substring(8, 10)),
  );
}

String? _resolveCategoryId(
  TransactionKind kind, {
  required String expenseCategoryId,
  required String incomeCategoryId,
  required List<Category> categories,
}) {
  final id = kind == TransactionKind.income
      ? incomeCategoryId
      : expenseCategoryId;
  for (final c in categories) {
    if (c.id == id && c.kind == kind) return c.id;
  }
  return null;
}

/// Port of planDirectCsvImport minus the pieces mobile deliberately lacks
/// (see the file header): transfer rows are skipped — a transfer needs two
/// accounts and the RPC only accepts income/expense; invalid rows are
/// skipped the same way; everything else is ready with the chosen
/// account and the per-kind category. Returns null when any required
/// picker is empty, exactly like the web page's plan gate.
CsvImportPlan? planCsvImport(
  List<CsvParsedRow> parsed, {
  required String accountId,
  required String expenseCategoryId,
  required String incomeCategoryId,
  required List<AccountSummary> accounts,
  required List<Category> categories,
}) {
  if (accountId.isEmpty ||
      expenseCategoryId.isEmpty ||
      incomeCategoryId.isEmpty) {
    return null;
  }
  var accountFound = false;
  for (final a in accounts) {
    if (a.id == accountId) {
      accountFound = true;
      break;
    }
  }
  if (!accountFound) {
    return CsvImportPlan(
      ready: const [],
      transferSkipped: 0,
      invalidSkipped: parsed.length,
      totalParsed: parsed.length,
    );
  }

  final ready = <CsvImportReadyRow>[];
  var transferSkipped = 0;
  var invalidSkipped = 0;

  for (final item in parsed) {
    if (item.kind == TransactionKind.transfer) {
      transferSkipped += 1;
      continue;
    }
    final safeAmount =
        item.amountMinor > 0 && item.amountMinor <= _maxSafeAmount;
    // Shape AND calendar — a date that cannot exist never enters the
    // ready batch; the row reports invalid instead of breaking the
    // atomic server commit downstream.
    if (!safeAmount || !_validImportDate(item.occurredOn)) {
      invalidSkipped += 1;
      continue;
    }
    final categoryId = _resolveCategoryId(
      item.kind,
      expenseCategoryId: expenseCategoryId,
      incomeCategoryId: incomeCategoryId,
      categories: categories,
    );
    if (categoryId == null) {
      invalidSkipped += 1;
      continue;
    }
    final note = item.note.trim().isNotEmpty
        ? item.note.trim()
        : item.merchant.trim().isNotEmpty
        ? item.merchant.trim()
        : (item.kind == TransactionKind.income
              ? 'Thu nhập import'
              : 'Chi tiêu import');
    ready.add(
      CsvImportReadyRow(
        rowIndex: item.rowIndex,
        kind: item.kind,
        amountMinor: item.amountMinor,
        occurredOn: item.occurredOn,
        note: note,
        merchant: item.merchant,
        categoryId: categoryId,
        accountId: accountId,
        confidence: item.confidence,
        rawSnippet: item.rawSnippet,
      ),
    );
  }

  return CsvImportPlan(
    ready: ready,
    transferSkipped: transferSkipped,
    invalidSkipped: invalidSkipped,
    totalParsed: parsed.length,
  );
}

/// The commit input handed to the store — mirrors the web's
/// DirectCsvCommitInput minus `mappingEvidence`/`allowHeuristicDuplicates`
/// (no rules or ledger dedupe exist on this surface, so there is no
/// evidence to send and nothing to override).
class CsvImportBatch {
  const CsvImportBatch({
    required this.fileName,
    required this.warningCount,
    required this.skippedRows,
    required this.mapConfidence,
    required this.headers,
    required this.columnMap,
    required this.rows,
  });

  final String fileName;
  final int warningCount;
  final int skippedRows;
  final double mapConfidence;
  final List<String> headers;
  final CsvColumnMap columnMap;
  final List<CsvImportReadyRow> rows;
}

/// Batch metadata + ready rows — `skipped_rows` totals parse-level skips
/// plus plan-level transfer/invalid skips, the same accounting the web
/// action reports.
CsvImportBatch toCsvImportBatch(CsvParseResult parsed, CsvImportPlan plan) =>
    CsvImportBatch(
      fileName: parsed.fileName,
      warningCount: parsed.warningCount,
      skippedRows:
          parsed.skippedRows + plan.transferSkipped + plan.invalidSkipped,
      mapConfidence: parsed.mapConfidence,
      headers: parsed.headers,
      columnMap: parsed.columnMap,
      rows: plan.ready,
    );

/// Human preview line — adapted from formatDirectImportSummary: on mobile
/// these rows land in the review queue, never straight in the ledger, so
/// the wording says "sẽ nhập", not "sẽ ghi vào sổ".
String csvImportSummary(CsvImportPlan plan) {
  final parts = <String>['${plan.readyCount} dòng sẽ nhập'];
  if (plan.transferSkipped > 0) {
    parts.add('${plan.transferSkipped} chuyển khoản (bỏ qua)');
  }
  if (plan.invalidSkipped > 0) {
    parts.add('${plan.invalidSkipped} không hợp lệ');
  }
  return parts.join(' · ');
}

// ---- Paste: pasted lines planned through the same prepare contract ----
//
// The hosted backend accepts user-table writes only through SECURITY
// DEFINER RPCs — direct INSERTs on inbox_candidates fail 42501. The paste
// flow therefore rides the same prepare_direct_csv_candidates_with_rules
// contract the CSV sheet uses: one synthetic batch carries provenance in
// `file_name`, and each parsed line becomes one `p_candidates` entry. The
// RPC validates kind/account/category exactly like the CSV path (transfer
// rows are rejected, unresolved ids fail the whole batch), so the drafts
// reuse planCsvImport's guards unchanged instead of growing a second
// planner.

/// Adapt paste drafts to the shared ready-row plan — a pasted line carries
/// no account/category evidence, so it borrows the same user-picked
/// defaults the CSV sheet collects. Drafts are projected onto
/// [CsvParsedRow] so every check (transfer skip, invalid skip, per-kind
/// category resolution) is literally the code the CSV import runs.
CsvImportPlan? planPasteImport(
  List<InboxPasteDraft> drafts, {
  required String accountId,
  required String expenseCategoryId,
  required String incomeCategoryId,
  required List<AccountSummary> accounts,
  required List<Category> categories,
}) => planCsvImport(
  [
    for (var i = 0; i < drafts.length; i++)
      CsvParsedRow(
        kind: drafts[i].kind,
        amountMinor: drafts[i].amountMinor,
        merchant: drafts[i].merchant,
        note: '',
        occurredOn: drafts[i].occurredOn,
        confidence: drafts[i].confidence,
        uncertainFields: drafts[i].uncertainFields,
        rawSnippet: drafts[i].rawSnippet,
        rowIndex: i + 1,
      ),
  ],
  accountId: accountId,
  expenseCategoryId: expenseCategoryId,
  incomeCategoryId: incomeCategoryId,
  accounts: accounts,
  categories: categories,
);

/// The batch metadata a paste honestly reports to the RPC:
///  - `file_name` carries the provenance ("paste-…txt") — the function
///    only bounds its length (1..260), it never checks an extension;
///  - `headers`/`column_map` are empty because a paste has no columns;
///  - `map_confidence` is 0 — no column mapping ever ran;
///  - `warning_count` is the parsed-line count minus the produced
///    candidate count: how many input lines did NOT become a reviewable
///    row (clamped at 0 — the single-line multi-amount fallback can emit
///    more drafts than lines);
///  - `skipped_rows` totals unparseable lines plus the plan-level
///    transfer/invalid skips — the same accounting [toCsvImportBatch]
///    reports for a file.
CsvImportBatch toPasteImportBatch({
  required String fileName,
  required int lineCount,
  required int unparseableLines,
  required CsvImportPlan plan,
}) => CsvImportBatch(
  fileName: fileName,
  warningCount: lineCount > plan.readyCount ? lineCount - plan.readyCount : 0,
  skippedRows: unparseableLines + plan.transferSkipped + plan.invalidSkipped,
  mapConfidence: 0,
  headers: const [],
  columnMap: emptyCsvColumnMap,
  rows: plan.ready,
);

/// Result of a successful preparation — what the RPC actually returned.
class CsvImportResult {
  const CsvImportResult({required this.batchId, required this.candidateCount});

  final String batchId;
  final int candidateCount;
}

/// Vietnamese message for a failed prepare RPC — a port of the web
/// action's calmPreparationError; the Data API surfaces the raised token
/// in the response body, so substring matching hits the same words.
String csvImportErrorMessage(Object error) {
  final message = error.toString();
  if (message.contains('incomplete_result')) {
    return 'Lượt nhập đã được chuẩn bị nhưng phản hồi máy chủ không đầy đủ. '
        'Hãy mở Cần xem để kiểm tra trước khi thử lại.';
  }
  if (message.contains('invalid_direct_csv_rule_evidence') ||
      message.contains('rule_not_available') ||
      message.contains('rule_no_longer_matches') ||
      message.contains('rule_category_kind_mismatch')) {
    return 'Quy tắc đã thay đổi hoặc không còn khớp. Chưa lưu lượt nhập '
        'nào; hãy tải lại và kiểm tra trước khi nhập.';
  }
  if (message.contains('account_not_found') ||
      message.contains('category_kind_mismatch') ||
      message.contains('category_archived')) {
    return 'Tài khoản hoặc danh mục đã thay đổi. Chưa lưu lượt nhập nào; '
        'hãy tải lại và thử lại.';
  }
  if (message.contains('authentication_required')) {
    return 'Hết phiên đăng nhập — đăng nhập lại rồi thử lại.';
  }
  return 'Không chuẩn bị được lượt nhập. Chưa có mục nào được tạo; '
      'hãy kiểm tra CSV và thử lại.';
}
