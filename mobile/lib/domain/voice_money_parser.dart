import 'models.dart' show TransactionKind;

/// Vietnamese money-expression parser for voice capture — a faithful port of
/// src/lib/voice/vi-money-parser.ts. Same cases, same shorthand semantics.
///
/// This parser PROPOSES, never posts: the result feeds a mandatory confirm
/// card; nothing here writes to the ledger.
class VoiceAmountParse {
  const VoiceAmountParse({
    required this.amount,
    required this.amountText,
    required this.shorthand,
    required this.rest,
    required this.transcript,
  });

  /// Proposed VND integer, or null when no amount could be parsed.
  final int? amount;

  /// Raw matched substring (normalized), or null.
  final String? amountText;

  /// True when the ×1000 price-shorthand was applied.
  final bool shorthand;

  /// Transcript with the amount span removed — used for category matching.
  final String rest;

  /// Normalized transcript (lowercase, collapsed whitespace).
  final String transcript;
}

const _digitValues = {
  'không': 0,
  'một': 1,
  'hai': 2,
  'ba': 3,
  'bốn': 4,
  'năm': 5,
  'sáu': 6,
  'bảy': 7,
  'tám': 8,
  'chín': 9,
};

/// Ones-words valid after "mươi" / tens (includes colloquial variants).
const _onesValues = {..._digitValues, 'mốt': 1, 'tư': 4, 'lăm': 5};

const _bigScales = {
  'tỷ': 1000000000,
  'triệu': 1000000,
  'nghìn': 1000,
  'ngàn': 1000,
};

final _amountVocab = <String>{
  ..._digitValues.keys,
  'mốt',
  'tư',
  'lăm',
  'mười',
  'mươi',
  'chục',
  'trăm',
  'linh',
  'lẻ',
  'rưỡi',
  ..._bigScales.keys,
  'đồng',
};

bool _isDigitToken(String token) => RegExp(
  r'^(\d{1,3}(\.\d{3})+|\d{1,3}(,\d{3})+|\d+[.,]\d+|\d+)$',
).hasMatch(token);

/// Returns a double — digit tokens may be decimal ("2,5" -> 2.5) and the
/// fraction must survive until the final round (2,5 × triệu = 2_500_000).
double _parseDigitToken(String token) {
  if (RegExp(r'^\d{1,3}(\.\d{3})+$').hasMatch(token)) {
    return double.parse(token.replaceAll('.', ''));
  }
  if (RegExp(r'^\d{1,3}(,\d{3})+$').hasMatch(token)) {
    return double.parse(token.replaceAll(',', ''));
  }
  if (RegExp(r'^\d+[.,]\d+$').hasMatch(token)) {
    return double.parse(token.replaceAll(',', '.'));
  }
  return double.parse(token);
}

bool _isDigitWord(String token) => _digitValues.containsKey(token);
bool _isOnesWord(String token) => _onesValues.containsKey(token);

String _normalizeTranscript(String raw) {
  var text = raw.toLowerCase();
  // Collapse digit separators BEFORE stripping punctuation.
  text = text.replaceAllMapped(
    RegExp(r'\b\d{1,3}(\.\d{3})+\b'),
    (m) => m[0]!.replaceAll('.', ''),
  );
  text = text.replaceAllMapped(
    RegExp(r'\b\d{1,3}(,\d{3})+\b'),
    (m) => m[0]!.replaceAll(',', ''),
  );
  // Decimal comma: 2,5 -> 2.5. NB: Dart String.replaceAll takes literal
  // replacements — group refs require replaceAllMapped.
  text = text.replaceAllMapped(RegExp(r'(\d),(\d)'), (m) => '${m[1]}.${m[2]}');
  // Separate digits glued to letters: "20đ" -> "20 đ", "2tr" -> "2 tr".
  text = text.replaceAllMapped(
    RegExp(r'(\d)([^\d\s.,])'),
    (m) => '${m[1]} ${m[2]}',
  );
  text = text.replaceAllMapped(
    RegExp(r'([^\d\s.,])(\d)'),
    (m) => '${m[1]} ${m[2]}',
  );
  // Drop remaining punctuation (keep letters, digits, whitespace, decimal dot).
  text = text.replaceAll(RegExp(r'[^\p{L}\p{N}\s.]', unicode: true), ' ');
  text = text.replaceAll(RegExp(r'\s+'), ' ').trim();
  // "20k" -> "20 nghìn", "2tr" -> "2 triệu"
  text = text.replaceAllMapped(RegExp(r'(\d+)\s*k\b'), (m) => '${m[1]} nghìn');
  text = text.replaceAllMapped(RegExp(r'(\d+)\s*tr\b'), (m) => '${m[1]} triệu');
  // "20 đ" -> "20 đồng"
  text = text.replaceAllMapped(
    RegExp(r'(^|\s)đ(\s|$)'),
    (m) => '${m[1]}đồng${m[2]}',
  );
  text = text.replaceAll(RegExp(r'\s+'), ' ').trim();
  return text;
}

List<String> _normalizeSlang(List<String> tokens) {
  final out = [...tokens];
  const slang = {'củ': 'triệu', 'chai': 'triệu', 'xị': 'trăm nghìn'};
  for (var i = 0; i < out.length; i++) {
    final replacement = slang[out[i]];
    if (replacement == null) continue;
    final prev = i > 0 ? out[i - 1] : null;
    final next = i + 1 < out.length ? out[i + 1] : null;
    final prevIsNumber =
        prev != null && (_isDigitToken(prev) || _isDigitWord(prev));
    final nextIsScaleish =
        next == null ||
        next == 'rưỡi' ||
        _bigScales.containsKey(next) ||
        _isDigitWord(next);
    // Only treat as money slang in scale position: "2 củ", "một chai".
    // "2 chai nước" keeps "chai" as a noun so the amount span stays sane.
    if (prevIsNumber && nextIsScaleish) {
      out.replaceRange(i, i + 1, replacement.split(' '));
      i += replacement.split(' ').length - 1;
    }
  }
  return out;
}

({double value, int next})? _parseChunk(List<String> tokens) {
  var i = 0;
  var value = 0.0;
  var consumedAny = false;

  String? at(int idx) => idx < tokens.length ? tokens[idx] : null;

  // Hundreds: "[d] trăm" | "trăm"
  if (at(i) == 'trăm') {
    value = 100;
    i += 1;
    consumedAny = true;
  } else if (at(i) != null && _isDigitWord(at(i)!) && at(i + 1) == 'trăm') {
    value = _digitValues[at(i)!]! * 100;
    i += 2;
    consumedAny = true;
  }
  // "trăm rưỡi" = 150, "hai trăm rưỡi" = 250
  if (consumedAny && at(i) == 'rưỡi') {
    value += 50;
    i += 1;
  }
  // "một trăm linh/lẻ năm" = 105
  if (at(i) == 'linh' || at(i) == 'lẻ') {
    i += 1;
    final ones = at(i);
    if (ones != null && _isOnesWord(ones)) {
      value += _onesValues[ones]!;
      i += 1;
      consumedAny = true;
    }
    return consumedAny ? (value: value, next: i) : null;
  }
  // Tens
  if (at(i) == 'mười') {
    value += 10;
    i += 1;
    consumedAny = true;
    final ones = at(i);
    if (ones != null && _isOnesWord(ones)) {
      value += _onesValues[ones]!;
      i += 1;
    }
  } else if (at(i) != null && _isDigitWord(at(i)!) && at(i + 1) == 'mươi') {
    value += _digitValues[at(i)!]! * 10;
    i += 2;
    consumedAny = true;
    final ones = at(i);
    if (ones != null && _isOnesWord(ones)) {
      value += _onesValues[ones]!;
      i += 1;
    }
  } else if (at(i) != null && _isDigitWord(at(i)!) && at(i + 1) == 'chục') {
    value += _digitValues[at(i)!]! * 10;
    i += 2;
    consumedAny = true;
  } else if (at(i) == 'chục') {
    value += 10;
    i += 1;
    consumedAny = true;
  } else if (at(i) != null &&
      _isDigitWord(at(i)!) &&
      at(i + 1) != null &&
      _isOnesWord(at(i + 1)!)) {
    // Colloquial tens without "mươi": "hai mốt" = 21, "ba lăm" = 35.
    value += _digitValues[at(i)!]! * 10 + _onesValues[at(i + 1)!]!;
    i += 2;
    consumedAny = true;
  } else if (consumedAny && at(i) != null && _isOnesWord(at(i)!)) {
    // Colloquial dropped "mươi" after hundreds: "một trăm hai" = 120.
    value += _onesValues[at(i)!]! * 10;
    i += 1;
  } else if (!consumedAny && at(i) != null && _isOnesWord(at(i)!)) {
    value += _onesValues[at(i)!]!;
    i += 1;
    consumedAny = true;
  } else if (!consumedAny && at(i) != null && _isDigitToken(at(i)!)) {
    value += _parseDigitToken(at(i)!);
    i += 1;
    consumedAny = true;
  }
  if (!consumedAny) return null;
  return (value: value, next: i);
}

/// Parse a full amount token span, e.g.
/// ["hai","tỷ","ba","trăm","triệu"] -> 2_300_000_000.
({int value, bool shorthand})? _parseFullAmount(List<String> tokens) {
  var total = 0.0;
  var chunk = <String>[];
  var sawBigScale = false;

  bool flush(int scale) {
    double chunkValue;
    if (chunk.isEmpty) {
      chunkValue = 1; // bare "nghìn" = 1000
    } else {
      final parsed = _parseChunk(chunk);
      if (parsed == null || parsed.next != chunk.length) return false;
      chunkValue = parsed.value;
    }
    total += chunkValue * scale;
    chunk = [];
    return true;
  }

  for (var i = 0; i < tokens.length; i++) {
    final token = tokens[i];
    if (token == 'đồng') continue; // unit marker, no numeric meaning
    final scale = _bigScales[token];
    if (scale != null) {
      sawBigScale = true;
      if (!flush(scale)) return null;
      // "triệu rưỡi" = 1.5M — half of the just-applied scale.
      if (i + 1 < tokens.length && tokens[i + 1] == 'rưỡi') {
        total += scale / 2;
        i += 1;
      }
      continue;
    }
    chunk.add(token);
  }
  if (chunk.isNotEmpty) {
    final parsed = _parseChunk(chunk);
    if (parsed == null || parsed.next != chunk.length) return null;
    total += parsed.value;
  }

  var amount = total.round();
  if (amount <= 0) return null;
  var shorthand = false;
  if (!sawBigScale && amount < 1000) {
    // Price shorthand: "hai chục" spoken at a shop means 20.000đ, not 20đ.
    amount = amount * 1000;
    shorthand = true;
  }
  return (value: amount, shorthand: shorthand);
}

bool _isAmountToken(String token) =>
    _isDigitToken(token) || _amountVocab.contains(token);

/// Find the longest contiguous run of amount vocabulary.
({int start, int end})? _findAmountSpan(List<String> tokens) {
  ({int start, int end})? best;
  var start = -1;
  for (var i = 0; i <= tokens.length; i++) {
    final isAmount = i < tokens.length && _isAmountToken(tokens[i]);
    if (isAmount && start == -1) start = i;
    if (!isAmount && start != -1) {
      if (best == null || i - start > best.end - best.start) {
        best = (start: start, end: i);
      }
      start = -1;
    }
  }
  return best;
}

VoiceAmountParse _empty(String transcript) => VoiceAmountParse(
  amount: null,
  amountText: null,
  shorthand: false,
  rest: transcript,
  transcript: transcript,
);

VoiceAmountParse parseVietnameseMoney(String raw) {
  final transcript = _normalizeTranscript(raw);
  if (transcript.isEmpty) return _empty('');
  final tokens = _normalizeSlang(transcript.split(' '));
  final span = _findAmountSpan(tokens);
  if (span == null) return _empty(transcript);
  final spanTokens = tokens.sublist(span.start, span.end);
  final parsed = _parseFullAmount(spanTokens);
  if (parsed == null) return _empty(transcript);
  final rest = [
    ...tokens.sublist(0, span.start),
    ...tokens.sublist(span.end),
  ].join(' ').trim();
  return VoiceAmountParse(
    amount: parsed.value,
    amountText: spanTokens.join(' '),
    shorthand: parsed.shorthand,
    rest: rest,
    transcript: transcript,
  );
}

const _incomeHints = [
  'lương',
  'thưởng',
  'thưởng tết',
  'nhận được',
  'được cho',
  'tiền về',
  'thu nhập',
  'bán được',
];

/// Very small v1 heuristic: income only when an explicit income hint is present.
TransactionKind detectVoiceKind(String text) {
  final lower = text.toLowerCase();
  return _incomeHints.any(lower.contains)
      ? TransactionKind.income
      : TransactionKind.expense;
}

const _categoryKeywords = <({List<String> keywords, String category})>[
  (
    keywords: [
      'ăn sáng',
      'ăn trưa',
      'ăn tối',
      'ăn',
      'uống',
      'cơm',
      'phở',
      'bún',
      'mì',
      'cà phê',
      'cafe',
      'trà sữa',
      'trà đá',
      'nhậu',
      'bánh',
      'kẹo',
      'ăn vặt',
      'nhà hàng',
      'quán',
      'bún bò',
      'cơm tấm',
    ],
    category: 'Ăn uống',
  ),
  (
    keywords: [
      'xăng',
      'grab',
      'taxi',
      'đi lại',
      'di chuyển',
      'gửi xe',
      'rửa xe',
      'vé xe',
      'xe bus',
      'bus',
      'be',
    ],
    category: 'Di chuyển',
  ),
  (
    keywords: [
      'điện',
      'nước',
      'mạng',
      'internet',
      'wifi',
      'điện thoại',
      'cước',
    ],
    category: 'Hóa đơn',
  ),
  (
    keywords: [
      'chợ',
      'siêu thị',
      'mua sắm',
      'quần áo',
      'giày',
      'tạp hóa',
      'mua',
    ],
    category: 'Mua sắm',
  ),
  (
    keywords: ['thuốc', 'khám', 'bệnh', 'viện', 'bác sĩ', 'thuốc tây'],
    category: 'Sức khỏe',
  ),
  (
    keywords: ['học', 'trường', 'sách', 'học phí', 'đóng học'],
    category: 'Giáo dục',
  ),
  (keywords: ['nhà', 'trọ', 'thuê nhà', 'tiền nhà'], category: 'Nhà ở'),
];

/// Suggest a category NAME from free text. The caller matches it against the
/// workspace's real categories (case-insensitive); null means "user picks".
String? suggestVoiceCategory(String text) {
  final lower = ' ${text.toLowerCase()} ';
  // Longest keyword wins: "mua thuốc" -> "thuốc" (Sức khỏe), not "mua" (Mua sắm).
  ({String category, int length})? best;
  for (final entry in _categoryKeywords) {
    for (final keyword in entry.keywords) {
      // Space-boundary check (regex \b is unreliable for Vietnamese).
      if (!lower.contains(' $keyword ')) continue;
      if (best == null || keyword.length > best.length) {
        best = (category: entry.category, length: keyword.length);
      }
    }
  }
  return best?.category;
}
