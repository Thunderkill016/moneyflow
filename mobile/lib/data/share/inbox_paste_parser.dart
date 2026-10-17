// Paste-to-candidate parser — a Dart port of src/lib/inbox/parse-text.ts.
// Each pasted line (bank SMS, wallet notification, casual note) becomes one
// InboxPasteDraft. NOTHING here touches the ledger: drafts are inserted as
// pending inbox_candidates rows and only become transactions after review.
//
// Money stays integer VND đồng — the same money-marker guards as the web
// (a bare digit run like "TK 1234" is an account tail, not an amount).

import '../../domain/inbox.dart';
import '../../domain/models.dart';
import '../../domain/report.dart' show vnToday;
import 'share_text_parser.dart';

/// JS safe-integer ceiling — same bound the web schema enforces on
/// amount_minor.
const _maxSafeAmount = 9007199254740991;

/// Raw snippets are clipped like the web parser (160 chars).
const _snippetMaxLength = 160;

/// Merchant phrases are clipped like the web's 48-char window.
const _merchantMaxLength = 48;

/// Amount token: -45k / 1.5tr / 45.000 / 45,000₫ / -120000 VND — verbatim
/// port of AMOUNT_TOKEN (the unit list includes accented forms).
final _amountToken = RegExp(
  r'([+-])?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*'
  r'(k|nghìn|nghin|ngàn|ngan|triệu|trieu|tr|m)?\s*'
  r'(đ|d|vnd|₫)?',
  caseSensitive: false,
);

final _groupedNumber = RegExp(r'^\d{1,3}([.,]\d{3})+$');
final _plainDigits = RegExp(r'^\d+$');
final _looseDecimal = RegExp(r'^\d+[.,]\d+$');

/// Kind hints — evaluated on the diacritic-folded line like the web.
final _incomeHint = RegExp(
  r'\b(luong|salary|thu\s+nhap|nhan|cong|hoan\s+tien|refund)\b',
  caseSensitive: false,
);
final _transferHint = RegExp(r'\b(ck|chuyen|transfer)\b', caseSensitive: false);
final _internalTransferHint = RegExp(
  r'\b(noi\s+bo|giua\s+(?:cac\s+)?tai\s+khoan\s+cua\s+minh)\b',
  caseSensitive: false,
);
final _expenseHint = RegExp(
  r'\b(chi|thanh\s+toan|mua|cafe|ca\s+phe|grab|an\s+uong|tien\s+an|do\s+xang)\b',
  caseSensitive: false,
);

/// Date token for extraction AND merchant cleanup — ISO or D/M[/YY..YYYY]
/// with a consistent separator (the \2 backreference is the web's port too).
final _dateToken = RegExp(
  r'\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}([/.\-])\d{1,2}(?:\2\d{2,4})?)\b',
);
final _relativeDay = RegExp(r'\bhom\s+(nay|qua|kia)\b', caseSensitive: false);

/// Date shapes stripped from merchant text (the web's second, looser pass).
final _merchantDateToken = RegExp(
  r'\b(20\d{2}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}(?:[/.]20\d{2})?)\b',
);

/// Noise words removed before a merchant guess — same mixed accented /
/// unaccented list as the web (JS/Dart `\b` treat accented letters as
/// non-word chars identically, so the quirks port together).
final _merchantNoise = RegExp(
  r'\b(vnd|đ|tien mat|tiền mặt|cash|sms|nh|vi|ví|so du|số dư|tk|gd|'
  r'tai|tại|phat sinh|phát sinh)\b',
  caseSensitive: false,
);
final _merchantSeparators = RegExp(r'[|•·:;,+\-–—]+');
final _whitespace = RegExp(r'\s+');
final _hasLetter = RegExp(r'[a-zA-ZÀ-ỹ]');
final _genericMerchant = RegExp(
  r'^(chi|thu|giao dich|giao dịch|note|ghi chu|ghi chú)$',
  caseSensitive: false,
);

/// Bounded field labels let a real transaction outrank a closing balance —
/// "SD: 1.000.000" is balance/fee evidence, "GD: -50.000" is the movement.
final _noteLabelPrefix = RegExp(
  r'\b(?:nd|noi\s+dung|ghi\s+chu|description|note)\s*[:=]',
  caseSensitive: false,
);
final _nonTransactionPrefix = RegExp(
  r'(?:^|[|;\n:])\s*(?:sd|so\s+du|phi(?:\s+(?:gd|giao\s+dich))?)\s*[:=]\s*$',
  caseSensitive: false,
);
final _transactionPrefix = RegExp(
  r'(?:^|[|;\n:])\s*(?:gd|giao\s+dich|so\s+tien\s+giao\s+dich)\s*[:=]\s*$',
  caseSensitive: false,
);

/// Bank feed noise before a bare amount: "TK ****1234" style tails.
final _maskedTail = RegExp(r'[*#xX]$');
final _starsTail = RegExp(r'\*{2,}$');

final _knownMerchants = <(RegExp, String)>[
  (RegExp(r'\bhighlands?\b', caseSensitive: false), 'Highlands Coffee'),
  (RegExp(r'\bcircle\s*k\b', caseSensitive: false), 'Circle K'),
  (RegExp(r'\bgrab\b', caseSensitive: false), 'Grab'),
  (RegExp(r'\bshopee\b', caseSensitive: false), 'Shopee'),
  (RegExp(r'\blazada\b', caseSensitive: false), 'Lazada'),
  (RegExp(r'\bmomo\b', caseSensitive: false), 'MoMo'),
  (RegExp(r'\bzalo\s*pay\b', caseSensitive: false), 'ZaloPay'),
  (RegExp(r'\bvinmart|winmart\b', caseSensitive: false), 'WinMart'),
  (RegExp(r'\bgs25\b', caseSensitive: false), 'GS25'),
  (RegExp(r'\b7\s*-\s*eleven|7eleven\b', caseSensitive: false), '7-Eleven'),
];

class _Amount {
  const _Amount({
    required this.amount,
    required this.index,
    required this.length,
    required this.signedNegative,
    required this.hasMoneyMarker,
  });

  final int amount;
  final int index;
  final int length;
  final bool signedNegative;

  /// Sign, magnitude unit or currency marker — direct evidence of money
  /// (a bare digit run can still be an account number, so marked tokens
  /// outrank unmarked ones when the primary amount is picked).
  final bool hasMoneyMarker;
}

/// Null on a failed parse (int.tryParse returns null past int64 — a
/// 20+-digit run is an account tail or reference, never a VND amount),
/// a non-positive value or anything above the JS safe-integer ceiling.
int? _safeInt(int? value) =>
    (value != null && value > 0 && value <= _maxSafeAmount) ? value : null;

double? _parseDecimalLoose(String value) {
  if (_looseDecimal.hasMatch(value)) {
    return double.tryParse(value.replaceAll(',', '.'));
  }
  if (_plainDigits.hasMatch(value)) return double.tryParse(value);
  return null;
}

/// Port of parseVndAmountToken: unit multipliers first, then grouped
/// thousands, then a plain integer. A bare decimal ("45.5") is ambiguous —
/// never money.
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
    // a 20+-digit string; the overflow token falls to null like every
    // other non-match instead of crashing the parse.
    return _safeInt(int.tryParse(cleaned));
  }
  return null;
}

/// Port of extractAmounts — bare integers need extra evidence they are
/// money (not years, counts or account tails).
List<_Amount> _extractAmounts(String line) {
  final results = <_Amount>[];
  for (final m in _amountToken.allMatches(line)) {
    final sign = m.group(1) ?? '';
    final num = m.group(2) ?? '';
    final unit = m.group(3) ?? '';
    final currency = m.group(4) ?? '';
    final amount = _parseVndAmountToken(num, unit.isEmpty ? null : unit);
    if (amount == null) continue;

    final marked = unit.isNotEmpty || currency.isNotEmpty || sign.isNotEmpty;
    if (!marked) {
      if (amount < 1000) continue;
      if (amount >= 1900 && amount <= 2100) continue;
      final before = line.substring(m.start - 4 < 0 ? 0 : m.start - 4, m.start);
      if (_maskedTail.hasMatch(before) || _starsTail.hasMatch(before)) {
        continue;
      }
      if (!_groupedNumber.hasMatch(num) && amount < 10000) continue;
    }
    results.add(
      _Amount(
        amount: amount,
        index: m.start,
        length: m.end - m.start,
        signedNegative: sign == '-',
        hasMoneyMarker: marked,
      ),
    );
  }
  return results;
}

/// "SD:"/"Phí:" prefixes demote a token to non-transaction; "GD:" promotes
/// it. Anything after a note label stays unclassified (the note text itself
/// can contain separators).
String _labelledAmountRole(String line, _Amount amount) {
  if (!amount.hasMoneyMarker) return 'unknown';
  final prefix = foldVietnameseText(line.substring(0, amount.index));
  if (_noteLabelPrefix.hasMatch(prefix)) return 'unknown';
  if (_nonTransactionPrefix.hasMatch(prefix)) return 'non-transaction';
  if (_transactionPrefix.hasMatch(prefix)) return 'transaction';
  return 'unknown';
}

({_Amount primary, bool ambiguous})? _selectPrimaryAmount(
  List<_Amount> amounts,
  String line,
) {
  if (amounts.isEmpty) return null;
  final marked = [
    for (final a in amounts)
      if (a.hasMoneyMarker) a,
  ];
  final tier = marked.isNotEmpty ? marked : amounts;

  final labelled = [
    for (final a in tier) (amount: a, role: _labelledAmountRole(line, a)),
  ];
  final transactions = [
    for (final l in labelled)
      if (l.role == 'transaction') l.amount,
  ];
  if (transactions.isNotEmpty) {
    return (
      primary: transactions.first,
      ambiguous:
          transactions.length > 1 || labelled.any((l) => l.role == 'unknown'),
    );
  }
  return (primary: tier.first, ambiguous: tier.length > 1);
}

/// Strict D/M/Y (or ISO) validation — a candidate date must be a real
/// calendar day. Two-digit years are rejected, matching the web's strict
/// normalization (a bad year becomes a review flag, never a silent guess).
String? _validYmd(int year, int month, int day) {
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return null;
  final dt = DateTime.utc(year, month, day);
  if (dt.year != year || dt.month != month || dt.day != day) return null;
  String two(int v) => v.toString().padLeft(2, '0');
  return '$year-${two(month)}-${two(day)}';
}

class _DateResult {
  const _DateResult(this.date, [this.issue]);
  final String date;

  /// missing | invalid | conflicting | inferred-year
  final String? issue;
}

/// Port of extractDate: explicit dates win; "hôm nay/quà/kia" shift off the
/// Vietnam-today anchor; conflicts and bad dates fall back to today with a
/// review flag rather than guessing.
_DateResult _extractDate(String line, String today) {
  final dates = <String>{};
  var invalid = false;
  var inferredYear = false;

  for (final m in _dateToken.allMatches(line)) {
    final raw = m.group(1)!;
    final iso = RegExp(r'^\d{4}-').hasMatch(raw);
    if (iso) {
      final p = raw.split('-');
      final v = _validYmd(int.parse(p[0]), int.parse(p[1]), int.parse(p[2]));
      if (v == null) {
        invalid = true;
      } else {
        dates.add(v);
      }
      continue;
    }
    final parts = raw.split(RegExp(r'[/.\-]'));
    final missingYear = parts.length == 2;
    final year = missingYear
        ? int.parse(today.substring(0, 4))
        : int.parse(parts[2]);
    // D/M/Y order — Vietnamese convention (not M/D/Y).
    final v = _validYmd(year, int.parse(parts[1]), int.parse(parts[0]));
    if (v == null) {
      invalid = true;
    } else {
      dates.add(v);
    }
    inferredYear = inferredYear || missingYear;
  }

  for (final m in _relativeDay.allMatches(foldVietnameseText(line))) {
    final daysAgo = switch (m.group(1)!.toLowerCase()) {
      'qua' => 1,
      'kia' => 2,
      _ => 0,
    };
    final anchor = DateTime.parse('${today}T00:00:00Z');
    final shifted = anchor.subtract(Duration(days: daysAgo));
    dates.add(shifted.toIso8601String().substring(0, 10));
  }

  if (invalid) return _DateResult(today, 'invalid');
  if (dates.length > 1) return _DateResult(today, 'conflicting');
  if (dates.isEmpty) return _DateResult(today, 'missing');
  return _DateResult(dates.first, inferredYear ? 'inferred-year' : null);
}

(TransactionKind, bool) _detectKind(String line, bool signedNegative) {
  final folded = foldVietnameseText(line);
  final internal = _internalTransferHint.hasMatch(folded);
  final expense = _expenseHint.hasMatch(folded);
  final income =
      _incomeHint.hasMatch(folded) || (line.contains('+') && !signedNegative);
  if (internal) return (TransactionKind.transfer, expense || income);
  if (expense && !income) return (TransactionKind.expense, false);
  if (income && !expense) return (TransactionKind.income, signedNegative);
  if (_transferHint.hasMatch(folded)) {
    return (TransactionKind.expense, true);
  }
  if (signedNegative && !income) return (TransactionKind.expense, false);
  // An unsigned, unhinted row keeps the expense suggestion but stays
  // uncertain — the reviewer decides (same posture as the web).
  return (TransactionKind.expense, true);
}

String _capitalizeWords(String value) => value
    .split(' ')
    .map((w) {
      if (w.isEmpty) return w;
      // Keep short all-caps bank codes ("VCB", "POS").
      if (w.length <= 4 && w == w.toUpperCase()) return w;
      return w[0].toUpperCase() + w.substring(1);
    })
    .join(' ');

/// Port of extractMerchant: known brands first, else strip amounts, dates,
/// noise words and separators, drop non-word fragments, title-case.
(String, bool) _extractMerchant(String line) {
  for (final (pattern, name) in _knownMerchants) {
    if (pattern.hasMatch(line)) return (name, false);
  }

  var rest = line
      .replaceAll(_amountToken, ' ')
      .replaceAll(_merchantDateToken, ' ')
      .replaceAll(_merchantNoise, ' ')
      .replaceAll(_merchantSeparators, ' ')
      .replaceAll(_whitespace, ' ')
      .trim();

  // Drop leftover noise words — keep anything longer than one char or
  // containing a real letter (web's filter).
  rest = rest
      .split(' ')
      .where((w) => w.length > 1 || _hasLetter.hasMatch(w))
      .join(' ')
      .trim();

  if (rest.isEmpty) return ('Không rõ', true);
  final merchant = rest.length > _merchantMaxLength
      ? rest.substring(0, _merchantMaxLength).trim()
      : rest;
  final uncertain = _genericMerchant.hasMatch(merchant) || merchant.length < 2;
  return (_capitalizeWords(merchant), uncertain);
}

/// confidence scoring — web's scoreConfidence plus its forced-low cases
/// (uncertain kind, or an invalid/conflicting date).
String _confidence(Set<String> uncertain, String? dateIssue, bool kindFlag) {
  if (kindFlag || (dateIssue != null && dateIssue != 'missing')) return 'low';
  if (uncertain.isEmpty) return 'high';
  if (uncertain.length == 1 && uncertain.first == 'date') return 'medium';
  if (uncertain.contains('amount') || uncertain.contains('merchant')) {
    return 'low';
  }
  if (uncertain.length >= 2) return 'low';
  return 'medium';
}

/// Parse one non-empty line into at most one draft (primary amount wins).
InboxPasteDraft? parseInboxPasteLine(String line, {String? today}) {
  final trimmed = line.trim();
  if (trimmed.isEmpty) return null;
  final anchor = today ?? vnToday();

  final selected = _selectPrimaryAmount(_extractAmounts(trimmed), trimmed);
  if (selected == null) return null;
  final primary = selected.primary;

  final uncertain = <String>{};
  if (selected.ambiguous) uncertain.add('amount');

  final date = _extractDate(trimmed, anchor);
  if (date.issue != null) uncertain.add('date');

  final (kind, kindUncertain) = _detectKind(trimmed, primary.signedNegative);
  if (kindUncertain) uncertain.add('kind');

  final (merchant, merchantUncertain) = _extractMerchant(trimmed);
  if (merchantUncertain) uncertain.add('merchant');

  return InboxPasteDraft(
    kind: kind,
    amountMinor: primary.amount,
    merchant: merchant,
    occurredOn: date.date,
    confidence: _confidence(uncertain, date.issue, kindUncertain),
    uncertainFields: uncertain.toList(),
    rawSnippet: trimmed.length > _snippetMaxLength
        ? '${trimmed.substring(0, _snippetMaxLength - 3)}…'
        : trimmed,
  );
}

/// One draft per non-empty line. A single paragraph carrying several
/// amounts is split around each amount's ±24-char window — same fallback
/// as the web's parsePasteText.
List<InboxPasteDraft> parseInboxPasteText(String text, {String? today}) {
  final lines = [
    for (final raw in text.split(RegExp(r'\r?\n')))
      if (raw.trim().isNotEmpty) raw.trim(),
  ];

  final drafts = <InboxPasteDraft>[];
  for (final line in lines) {
    final parsed = parseInboxPasteLine(line, today: today);
    if (parsed != null) drafts.add(parsed);
  }

  if (drafts.isEmpty && lines.length == 1) {
    final line = lines.first;
    final amounts = _extractAmounts(line);
    if (amounts.length > 1) {
      for (final a in amounts) {
        final start = a.index - 24 < 0 ? 0 : a.index - 24;
        final end = (a.index + a.length + 24).clamp(0, line.length);
        final parsed = parseInboxPasteLine(
          line.substring(start, end),
          today: today,
        );
        if (parsed != null) {
          drafts.add(
            InboxPasteDraft(
              kind: parsed.kind,
              amountMinor: a.amount,
              merchant: parsed.merchant,
              occurredOn: parsed.occurredOn,
              confidence: parsed.confidence,
              uncertainFields: parsed.uncertainFields,
              rawSnippet: line.length > _snippetMaxLength
                  ? '${line.substring(0, _snippetMaxLength - 3)}…'
                  : line,
            ),
          );
        }
      }
    }
  }
  return drafts;
}

// "Hôm nay" anchors on the shared VN-today rule (domain/report.dart) —
// the same calendar the web parser uses, so a pasted "hôm nay" resolves
// identically on device and web.
