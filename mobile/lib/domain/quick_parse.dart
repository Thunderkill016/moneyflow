// Port of src/lib/voice/vi-money-parser.ts — Vietnamese money-expression
// parsing for the "gõ nhanh" quick-capture field. Turns a typed phrase like
// "ăn trưa 45k" into a proposed integer-đồng draft for the capture form.
//
// Deliberate divergences from the web parser (all documented, all narrowing
// or extending — never a different amount for the same unambiguous input):
//
// 1. DIACRITIC FOLDING. The web parses the NFC-lowered transcript, so ASCII
//    input never matches "nghìn"/"triệu". Mobile users (and adb input) often
//    type without diacritics, so every token is folded via
//    foldVietnameseText before matching and the vocabulary below is the
//    folded spelling. Consequences of the fold:
//    - "mười"/"mươi" both become "muoi": "hai muoi" parses as 20k where the
//      web rejects it — in ASCII input that is the only sensible reading.
//    - "một"/"mốt" both become "mot": "mot tram" parses as 100k.
// 2. DATE HINTS. The web parser has none. "hôm qua"/"hôm kia"/"tối qua"…
//    yield a dateHint and are stripped from the note, matching the inbox
//    paste parser's relative-day convention.
// 3. TRANSFER KIND. Web returns expense|income only; here tight transfer
//    phrases ("chuyển khoản", "chuyển tiền", "ck", "sang tài khoản") hint a
//    transfer. Bare "chuyện" (story) is excluded on purpose.
// 4. SAFE-INTEGER + GARBAGE GUARDS. Amounts above the JS safe-integer
//    ceiling reject, and a bare >=1000 digit remainder after a big scale
//    ("1tr5000001" -> 1 triệu + 5000001) rejects as garbage typing instead
//    of summing to 6000001 like the web.
//
// Everything else is a faithful port: chunk grammar, slang-in-scale-
// position normalization, longest amount span, and the <1000 no-scale
// price shorthand ("hai chục" = 20.000đ). The parser PROPOSES, never
// posts — the capture form keeps every prefilled field editable.

import '../data/share/share_text_parser.dart' show foldVietnameseText;
import 'models.dart' show TransactionKind;

/// A structured quick-capture proposal. [amountMinor] is always set — a
/// parse without an amount returns null from [parseQuickCapture] instead
/// of a half-draft.
class QuickParseDraft {
  const QuickParseDraft({
    required this.kind,
    required this.amountMinor,
    required this.note,
    this.categoryHint,
    this.dateHint,
    this.shorthand = false,
    this.amountText = '',
  });

  /// expense by default (web semantics); income/transfer only on explicit
  /// hint words. Always editable in the form.
  final TransactionKind kind;

  /// Integer đồng — never floating point.
  final int amountMinor;

  /// Remaining text with amount/date spans removed — the note prefill.
  /// Diacritics are preserved (lowercased), unlike the folded match text.
  final String note;

  /// Canonical Vietnamese category name ("Ăn uống", "Di chuyển", …) — the
  /// caller matches it against the workspace's real categories.
  final String? categoryHint;

  /// 'today' | 'yesterday' | 'dayBeforeYesterday' — relative so the parse
  /// stays deterministic; the UI resolves it against the current date.
  final String? dateHint;

  /// True when the x1000 price shorthand was applied ("hai chục" -> 20k).
  final bool shorthand;

  /// The normalized amount span ("hai chục", "45 nghìn") for display.
  final String amountText;
}

// -- Vocabulary (folded spellings — see header note 1) ---------------------

const _digitValues = <String, int>{
  'khong': 0,
  'mot': 1,
  'hai': 2,
  'ba': 3,
  'bon': 4,
  'nam': 5,
  'sau': 6,
  'bay': 7,
  'tam': 8,
  'chin': 9,
};

/// Ones-words valid after tens — folded "một"/"mốt" collide into 'mot',
/// "tư" -> 'tu', "lăm" -> 'lam' (web keeps the same values).
const _onesValues = <String, int>{..._digitValues, 'tu': 4, 'lam': 5};

const _bigScales = <String, int>{
  'ty': 1000000000, // tỷ
  'trieu': 1000000, // triệu
  'nghin': 1000, // nghìn
  'ngan': 1000, // ngàn
};

// Not const: map.keys is not a const expression in a set literal.
final _amountVocab = <String>{
  ..._digitValues.keys,
  'tu', 'lam',
  'muoi', // mười AND mươi — one folded token, two web roles (header note 1)
  'chuc', // chục
  'tram', // trăm
  'linh', 'le', // linh / lẻ
  'ruoi', // rưỡi
  ..._bigScales.keys,
  'dong', // đồng
};

/// JS safe-integer ceiling — anything larger is a mistyped id, not money
/// (same bound as share_text_parser's _maxSafeAmount).
const _maxSafeAmount = 9007199254740991;

/// After a big scale a remainder chunk must stay under 1000 — every legit
/// form is sub-thousand ("hai triệu ba trăm" = 2.000.300). A bare digit
/// run >= 1000 there ("1tr5000001") is garbage typing; reject, don't sum.
const _maxScaleRemainder = 1000;

// -- Normalization ---------------------------------------------------------

final _dotGroup = RegExp(r'\b\d{1,3}(\.\d{3})+\b');
final _commaGroup = RegExp(r'\b\d{1,3}(,\d{3})+\b');
final _decimalComma = RegExp(r'(\d),(\d)');
final _digitLetter = RegExp(r'(\d)([^\d\s.,])');
final _letterDigit = RegExp(r'([^\d\s.,])(\d)');
final _dropFolded = RegExp('[^a-z0-9\\s.]');
final _dropDiacritic = RegExp('[^a-z0-9\\s.$_vnDiacriticLetters]');
final _whitespace = RegExp(r'\s+');
final _kUnit = RegExp(r'(\d+)\s*k\b');
final _trUnit = RegExp(r'(\d+)\s*tr\b');
final _dUnitFolded = RegExp(r'(^|\s)d(\s|$)');
final _dUnitDiacritic = RegExp('(^|\\s)đ(\\s|\$)');

/// The diacritic alphabet kept in the display copy — the same letters
/// foldVietnameseText maps onto a-z, so folded/display token runs stay
/// index-aligned (each normalization step preserves token boundaries).
const _vnDiacriticLetters =
    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';

/// One shared pipeline for the folded match text and the lowered display
/// text. [fold] picks the char set and the injected unit words; every step
/// mirrors normalizeTranscript in the web parser in the same order.
String _normalizeTranscript(String raw, {required bool fold}) {
  var text = fold ? foldVietnameseText(raw) : raw.toLowerCase();
  // Collapse digit separators BEFORE stripping punctuation.
  text = text.replaceAllMapped(
    _dotGroup,
    (m) => m[0]!.replaceAll('.', ''),
  ); // 20.000 -> 20000
  text = text.replaceAllMapped(
    _commaGroup,
    (m) => m[0]!.replaceAll(',', ''),
  ); // 20,000 -> 20000
  text = text.replaceAllMapped(
    _decimalComma,
    (m) => '${m[1]}.${m[2]}',
  ); // 2,5 -> 2.5
  // Separate digits glued to letters: "20đ" -> "20 đ", "2tr" -> "2 tr".
  text = text.replaceAllMapped(_digitLetter, (m) => '${m[1]} ${m[2]}');
  text = text.replaceAllMapped(_letterDigit, (m) => '${m[1]} ${m[2]}');
  // Drop remaining punctuation (keep letters, digits, whitespace, '.').
  text = text.replaceAll(fold ? _dropFolded : _dropDiacritic, ' ');
  text = text.replaceAll(_whitespace, ' ').trim();
  // "20k" -> "20 nghìn", "2tr" -> "2 triệu", "20 đ" -> "20 đồng".
  text = text.replaceAllMapped(
    _kUnit,
    (m) => '${m[1]} ${fold ? 'nghin' : 'nghìn'}',
  );
  text = text.replaceAllMapped(
    _trUnit,
    (m) => '${m[1]} ${fold ? 'trieu' : 'triệu'}',
  );
  text = text.replaceAllMapped(
    fold ? _dUnitFolded : _dUnitDiacritic,
    (m) => '${m[1]}${fold ? 'dong' : 'đồng'}${m[2]}',
  );
  return text.replaceAll(_whitespace, ' ').trim();
}

/// Slang rewrites only in scale position (a number word before, a scale
/// or nothing after) so "2 chai nước" keeps "chai" the noun. Port of
/// normalizeSlang; folded keys: củ->'cu', xị->'xi'. Web maps "chai" to
/// triệu and has no 'lít'/'chai'=100k reading — kept as-is.
List<String> _normalizeSlang(List<String> tokens, {required bool fold}) {
  final slang = fold
      ? const {'cu': 'trieu', 'chai': 'trieu', 'xi': 'tram nghin'}
      : const {'củ': 'triệu', 'chai': 'triệu', 'xị': 'trăm nghìn'};
  // The scale-position test unions BOTH spellings so the folded and
  // display passes splice identically — token indices must stay aligned
  // for the note/amountText slice below.
  final out = List.of(tokens);
  for (var i = 0; i < out.length; i++) {
    final replacement = slang[out[i]];
    if (replacement == null) continue;
    final prev = i > 0 ? out[i - 1] : null;
    final next = i + 1 < out.length ? out[i + 1] : null;
    final prevIsNumber = prev != null && _isDigitWordEither(prev);
    final nextIsScaleish =
        next == null ||
        next == 'ruoi' ||
        next == 'rưỡi' ||
        _bigScales.containsKey(next) ||
        _bigScalesDiacritic.containsKey(next) ||
        _isDigitWordEither(next);
    if (prevIsNumber && nextIsScaleish) {
      out.replaceRange(i, i + 1, replacement.split(' '));
    }
  }
  return out;
}

/// Digit-token or digit-word in either spelling.
bool _isDigitWordEither(String t) =>
    _isDigitToken(t) ||
    _digitValues.containsKey(t) ||
    _digitValuesDiacritic.containsKey(t);

const _bigScalesDiacritic = <String, int>{
  'tỷ': 1000000000,
  'triệu': 1000000,
  'nghìn': 1000,
  'ngàn': 1000,
};

const _digitValuesDiacritic = <String, int>{
  'không': 0,
  'một': 1,
  'mốt': 1,
  'hai': 2,
  'ba': 3,
  'bốn': 4,
  'năm': 5,
  'sáu': 6,
  'bảy': 7,
  'tám': 8,
  'chín': 9,
};

// -- Amount grammar --------------------------------------------------------

final _digitTokenRe = RegExp(
  r'^(\d{1,3}(\.\d{3})+|\d{1,3}(,\d{3})+|\d+[.,]\d+|\d+)$',
);
final _dotGroupToken = RegExp(r'^\d{1,3}(\.\d{3})+$');
final _commaGroupToken = RegExp(r'^\d{1,3}(,\d{3})+$');
final _decimalToken = RegExp(r'^\d+[.,]\d+$');

bool _isDigitToken(String token) => _digitTokenRe.hasMatch(token);

/// Port of parseDigitToken — can be fractional ("2,5" -> 2.5), so the
/// chunk grammar accumulates in double like the web's Number.
double _parseDigitToken(String token) {
  if (_dotGroupToken.hasMatch(token)) {
    return double.parse(token.replaceAll('.', ''));
  }
  if (_commaGroupToken.hasMatch(token)) {
    return double.parse(token.replaceAll(',', ''));
  }
  if (_decimalToken.hasMatch(token)) {
    return double.parse(token.replaceAll(',', '.'));
  }
  return double.parse(token);
}

String? _at(List<String> tokens, int i) => i < tokens.length ? tokens[i] : null;

/// Port of parseChunk — a sub-thousand run like ["một","trăm","hai","mươi","ba"]
/// (folded: "mot tram hai muoi ba"). Single left-to-right pass; the caller
/// requires the chunk to be consumed completely.
({double value, int next})? _parseChunk(List<String> tokens) {
  var i = 0;
  var value = 0.0;
  var consumed = false;

  double? digitOf(String? t) => t == null ? null : _digitValues[t]?.toDouble();
  double? onesOf(String? t) => t == null ? null : _onesValues[t]?.toDouble();

  // Hundreds: "[d] trăm" | bare "trăm".
  if (_at(tokens, i) == 'tram') {
    value = 100;
    i += 1;
    consumed = true;
  } else if (digitOf(_at(tokens, i)) != null && _at(tokens, i + 1) == 'tram') {
    value = digitOf(_at(tokens, i))! * 100;
    i += 2;
    consumed = true;
  }
  // "trăm rưỡi" = 150, "hai trăm rưỡi" = 250.
  if (consumed && _at(tokens, i) == 'ruoi') {
    value += 50;
    i += 1;
  }
  // "một trăm linh/lẻ năm" = 105.
  if (_at(tokens, i) == 'linh' || _at(tokens, i) == 'le') {
    i += 1;
    final ones = onesOf(_at(tokens, i));
    if (ones != null) {
      value += ones;
      i += 1;
      consumed = true;
    }
    return consumed ? (value: value, next: i) : null;
  }
  // Tens. Web checks "mười" first, then "[d] mươi"; folding merges both
  // into 'muoi', and the same order still resolves correctly: a head
  // 'muoi' is the standalone 10, while "[d] muoi" is digit x 10.
  if (_at(tokens, i) == 'muoi') {
    value += 10;
    i += 1;
    consumed = true;
    final ones = onesOf(_at(tokens, i));
    if (ones != null) {
      value += ones;
      i += 1;
    }
  } else if (digitOf(_at(tokens, i)) != null && _at(tokens, i + 1) == 'muoi') {
    value += digitOf(_at(tokens, i))! * 10;
    i += 2;
    consumed = true;
    final ones = onesOf(_at(tokens, i));
    if (ones != null) {
      value += ones;
      i += 1;
    }
  } else if (digitOf(_at(tokens, i)) != null && _at(tokens, i + 1) == 'chuc') {
    value += digitOf(_at(tokens, i))! * 10;
    i += 2;
    consumed = true;
  } else if (_at(tokens, i) == 'chuc') {
    value += 10;
    i += 1;
    consumed = true;
  } else if (digitOf(_at(tokens, i)) != null &&
      onesOf(_at(tokens, i + 1)) != null) {
    // Colloquial tens without "mươi": "hai mốt" = 21, "ba lăm" = 35.
    value += digitOf(_at(tokens, i))! * 10 + onesOf(_at(tokens, i + 1))!;
    i += 2;
    consumed = true;
  } else if (consumed && onesOf(_at(tokens, i)) != null) {
    // Colloquial dropped "mươi" after hundreds: "một trăm hai" = 120.
    value += onesOf(_at(tokens, i))! * 10;
    i += 1;
  } else if (!consumed && onesOf(_at(tokens, i)) != null) {
    value += onesOf(_at(tokens, i))!;
    i += 1;
    consumed = true;
  } else if (!consumed && _isDigitToken(_at(tokens, i) ?? '')) {
    value += _parseDigitToken(_at(tokens, i)!);
    i += 1;
    consumed = true;
  }
  if (!consumed) return null;
  return (value: value, next: i);
}

/// Port of parseFullAmount — sum chunk*scale over the span; a chunk that
/// does not consume fully fails the whole parse. Returns null on zero,
/// overflow past the safe-integer bound, or the garbage-remainder guard.
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
    if (token == 'dong') continue; // unit marker, no numeric meaning
    final scale = _bigScales[token];
    if (scale != null) {
      sawBigScale = true;
      if (!flush(scale)) return null;
      // "triệu rưỡi" = 1.5M — half of the just-applied scale.
      if (_at(tokens, i + 1) == 'ruoi') {
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
    if (sawBigScale && parsed.value >= _maxScaleRemainder) return null;
    total += parsed.value;
  }

  var amount = total.round();
  if (amount <= 0 || amount > _maxSafeAmount) return null;
  var shorthand = false;
  if (!sawBigScale && amount < 1000) {
    // Price shorthand: "hai chục" at a shop means 20.000đ, not 20đ.
    amount = amount * 1000;
    shorthand = true;
  }
  return (value: amount, shorthand: shorthand);
}

bool _isAmountToken(String token) =>
    _isDigitToken(token) || _amountVocab.contains(token);

/// Longest contiguous run of amount vocabulary — first longest wins, same
/// as the web's findAmountSpan.
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

// -- Direction / category / date hints --------------------------------------

/// Income phrases (folded). Web list plus single-word forms mobile users
/// type ("nhận 500k", "lãnh lương"); kind stays word-boundary matched.
const _incomePhrases = [
  'luong',
  'thuong',
  'thuong tet',
  'nhan duoc',
  'duoc cho',
  'tien ve',
  'thu nhap',
  'ban duoc',
  'nhan',
  'lanh',
];

/// 'thu' is an income word ("thu 500k") but "thứ hai…" names a weekday —
/// skip it when a day-name token follows (spec direction hint, guarded).
const _dayNameTokens = {
  'hai',
  'ba',
  'bon',
  'tu',
  'nam',
  'sau',
  'bay',
  'chu',
  'nhat',
};

/// Tight transfer phrases only — bare "chuyện" (story) must not fire.
const _transferPhrases = [
  'chuyen khoan',
  'chuyen tien',
  'sang tai khoan',
  'sang vi',
  'ck',
];

bool _hasPhrase(List<String> tokens, String phrase) {
  final need = phrase.split(' ');
  outer:
  for (var i = 0; i + need.length <= tokens.length; i++) {
    for (var j = 0; j < need.length; j++) {
      if (tokens[i + j] != need[j]) continue outer;
    }
    return true;
  }
  return false;
}

TransactionKind _detectKind(List<String> tokens) {
  var income = false;
  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i] == 'thu') {
      final next = _at(tokens, i + 1);
      final n = next != null && _isDigitToken(next) ? int.tryParse(next) : null;
      // "thứ hai"/"thứ 2-7" name a weekday; "thu 500k" collects money —
      // a scale word after the digits means the number is the amount.
      final isWeekday =
          _dayNameTokens.contains(next) ||
          (n != null &&
              n >= 2 &&
              n <= 7 &&
              !_bigScales.containsKey(_at(tokens, i + 2)));
      if (!isWeekday) income = true;
    }
  }
  for (final p in _incomePhrases) {
    if (_hasPhrase(tokens, p)) {
      income = true;
      break;
    }
  }
  // Income wins over transfer: "nhận chuyển khoản 500k" is money IN.
  if (income) return TransactionKind.income;
  for (final p in _transferPhrases) {
    if (_hasPhrase(tokens, p)) return TransactionKind.transfer;
  }
  return TransactionKind.expense;
}

/// Port of CATEGORY_KEYWORDS — folded keywords, same canonical category
/// names. 'luong' -> 'Lương' is a mobile addition so an income hint can
/// also propose the matching income category.
const _categoryKeywords = <String, List<String>>{
  'Ăn uống': [
    'an sang',
    'an trua',
    'an toi',
    'an',
    'uong',
    'com',
    'pho',
    'bun',
    'mi',
    'ca phe',
    'cafe',
    'tra sua',
    'tra da',
    'nhau',
    'banh',
    'keo',
    'an vat',
    'nha hang',
    'quan',
    'bun bo',
    'com tam',
  ],
  'Di chuyển': [
    'xang',
    'grab',
    'taxi',
    'di lai',
    'di chuyen',
    'gui xe',
    'rua xe',
    've xe',
    'xe bus',
    'bus',
    'be',
  ],
  'Hóa đơn': ['dien', 'nuoc', 'mang', 'internet', 'wifi', 'dien thoai', 'cuoc'],
  'Mua sắm': [
    'cho',
    'sieu thi',
    'mua sam',
    'quan ao',
    'giay',
    'tap hoa',
    'mua',
  ],
  'Sức khỏe': ['thuoc', 'kham', 'benh', 'vien', 'bac si', 'thuoc tay'],
  'Giáo dục': ['hoc', 'truong', 'sach', 'hoc phi', 'dong hoc'],
  'Nhà ở': ['nha', 'tro', 'thue nha', 'tien nha'],
  'Lương': ['luong', 'tien luong'],
};

/// Port of suggestVoiceCategory — space-boundary keyword match on the
/// folded rest, longest keyword wins ("mua thuốc" -> Sức khỏe, not Mua sắm).
String? _suggestCategory(List<String> restTokens) {
  final rest = ' ${restTokens.join(' ')} ';
  String? best;
  var bestLen = 0;
  for (final e in _categoryKeywords.entries) {
    for (final keyword in e.value) {
      if (!rest.contains(' $keyword ')) continue;
      if (keyword.length > bestLen) {
        best = e.key;
        bestLen = keyword.length;
      }
    }
  }
  return best;
}

/// Folded 2-word date phrases -> a relative hint. Mirrors the inbox paste
/// parser's hom nay/qua/kia handling; the web parser has no date support.
const _datePhrases = <String, String>{
  'hom nay': 'today',
  'sang nay': 'today',
  'trua nay': 'today',
  'chieu nay': 'today',
  'toi nay': 'today',
  'hom qua': 'yesterday',
  'toi qua': 'yesterday',
  'dem qua': 'yesterday',
  'sang qua': 'yesterday',
  'hom kia': 'dayBeforeYesterday',
};

/// Find the first date phrase; returns its hint and token indices so the
/// words can be kept out of the note ("ăn trưa hôm qua" -> note "ăn trưa").
({String hint, Set<int> indices})? _findDateHint(List<String> tokens) {
  for (var i = 0; i + 1 < tokens.length; i++) {
    final hint = _datePhrases['${tokens[i]} ${tokens[i + 1]}'];
    if (hint != null) return (hint: hint, indices: {i, i + 1});
  }
  return null;
}

/// Parse a quick-capture phrase into a [QuickParseDraft], or null when no
/// amount is readable. Deterministic — a draft is a PROPOSAL for the form,
/// never a posted fact.
QuickParseDraft? parseQuickCapture(String raw) {
  final folded = _normalizeTranscript(raw, fold: true);
  if (folded.isEmpty) return null;

  final foldedTokens = _normalizeSlang(folded.split(' '), fold: true);
  final display = _normalizeTranscript(raw, fold: false);
  final displayTokens = display.isEmpty
      ? const <String>[]
      : _normalizeSlang(display.split(' '), fold: false);

  final date = _findDateHint(foldedTokens);
  final dateIndices = date?.indices ?? const <int>{};

  final span = _findAmountSpan(foldedTokens);
  if (span == null) return null;
  final parsed = _parseFullAmount(foldedTokens.sublist(span.start, span.end));
  if (parsed == null) return null;

  // Display and folded token runs are index-aligned (each normalization
  // step preserves token boundaries) so the same indices slice both.
  String displaySpan(int start, int end) =>
      start < displayTokens.length && end <= displayTokens.length
      ? displayTokens.sublist(start, end).join(' ')
      : foldedTokens.sublist(start, end).join(' ');
  final restTokens = [
    for (var i = 0; i < foldedTokens.length; i++)
      if ((i < span.start || i >= span.end) && !dateIndices.contains(i))
        foldedTokens[i],
  ];
  final restDisplay = displayTokens.length == foldedTokens.length
      ? [
          for (var i = 0; i < displayTokens.length; i++)
            if ((i < span.start || i >= span.end) && !dateIndices.contains(i))
              displayTokens[i],
        ].join(' ')
      : restTokens.join(' ');

  return QuickParseDraft(
    kind: _detectKind(foldedTokens),
    amountMinor: parsed.value,
    note: restDisplay.trim(),
    categoryHint: _suggestCategory(restTokens),
    dateHint: date?.hint,
    shorthand: parsed.shorthand,
    amountText: displaySpan(span.start, span.end),
  );
}
