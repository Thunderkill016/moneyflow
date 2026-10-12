// Best-effort extraction of a capture prefill from arbitrary shared text
// (VN bank SMS, e-wallet notifications, casual notes). Pure Dart — money
// stays integer đồng, matching the domain money rules in domain/money.dart.

import 'package:moneyflow/domain/models.dart';

/// Fields extracted by [parseSharedText] for the capture form.
///
/// A non-null result always has [amount] set. [kind] may be null (the
/// caller defaults to expense); [note] falls back to a trimmed copy of
/// the input when no merchant-like snippet is found.
class SharedTextPrefill {
  const SharedTextPrefill({this.amount, this.note, this.kind});

  /// Minor đồng, always positive when set.
  final int? amount;

  /// Cleaned merchant/description snippet (<= 200 chars).
  final String? note;

  /// income | expense | transfer from domain/models.dart.
  final TransactionKind? kind;
}

/// JS safe-integer ceiling — anything larger is a mistyped id, not money.
const _maxSafeAmount = 9007199254740991;

/// Real VND movements are >= 1k đồng; smaller bare numbers are counts,
/// dates or times ("mua 2 cai", "luc 5 gio").
const _minPlausibleAmount = 1000;

/// Unseparated digit runs longer than this are account/phone ids.
const _bareDigitLimit = 9;

/// Note snippets are capped like the capture form's note field.
const _noteMaxLength = 200;

/// Keyword cues after the amount lose to cues before it by this margin.
const _afterAmountPenalty = 1000000;

/// Vietnamese shorthand units, keyed by their diacritic-stripped form
/// (matching happens on the normalized text — see [_normalize]).
const _unitScale = <String, int>{
  'k': 1000,
  'tr': 1000000,
  'trieu': 1000000,
  'cu': 1000000, // củ
  'ty': 1000000000, // tỷ
  'ti': 1000000000, // tỉ
};

/// Direction keywords, keyed by diacritic-stripped form. Nearest cue to
/// the amount wins; a bare "chuyen"/"transfer" maps to transfer.
const _kindWords = <String, TransactionKind>{
  'tru': TransactionKind.expense, // trừ
  'thanh toan': TransactionKind.expense, // thanh toán
  'chi': TransactionKind.expense, // chi
  'mua': TransactionKind.expense, // mua
  'rut': TransactionKind.expense, // rút
  'phi': TransactionKind.expense, // phí
  'giam': TransactionKind.expense, // số dư giảm
  'debit': TransactionKind.expense,
  'nhan': TransactionKind.income, // nhận / nhận được
  'luong': TransactionKind.income, // lương
  'cong': TransactionKind.income, // cộng
  'thuong': TransactionKind.income, // thưởng
  'credit': TransactionKind.income,
  'chuyen': TransactionKind.transfer, // chuyển (khoản)
  'transfer': TransactionKind.transfer,
  'ck': TransactionKind.transfer, // chuyển khoản
};

/// Words that introduce a merchant/payee ("tại", "từ", "đến", "at", ...).
/// The snippet after the marker becomes the note when it looks usable.
const _merchantMarkers = [
  'tai', // tại
  'tu', // từ
  'at',
  'from',
  'den', // đến
  'to',
  'qua', // qua
  'cho',
  'payee',
  'merchant',
];

/// Trailing words stripped from a merchant snippet — keywords that got
/// swept in when the capture ran past the merchant name.
const _noteStopWords = {
  'vnd',
  'dong',
  'gd',
  'tk',
  'so',
  'du',
  'khoan',
  'tru',
  'nhan',
  'chi',
  'mua',
  'thanh',
  'toan',
  'cong',
  'luong',
  'debit',
  'credit',
  'rut',
  'phi',
  'chuyen',
  'transfer',
  'ck',
};

/// Optional sign (with any space after it folded in so an unsigned match
/// starts at the first digit), digits with grouping separators, optional
/// shorthand unit and optional currency marker ("vnd", "đồng"→"dong",
/// "đ"→"d", "₫").
final _amountPattern = RegExp(
  r'(([+\-])\s*)?(\d[\d.,]*\d|\d)'
  r'(?:\s*(k|trieu|tr|cu|ty|ti)(?![a-z]))?'
  r'(?:\s*(vnd|dong|d|₫)(?![a-z]))?',
);

final _kindPatterns = <RegExp, TransactionKind>{
  for (final e in _kindWords.entries)
    RegExp('\\b${e.key.replaceAll(' ', r'\s+')}\\b'): e.value,
};

final _merchantPattern = RegExp('\\b(${_merchantMarkers.join('|')})\\b');

final _longDigitRun = RegExp(r'\d{4,}');
final _letterRe = RegExp(r'[^\W\d_]', unicode: true);
final _whitespaceRe = RegExp(r'\s+');

/// Parse a shared text into a [SharedTextPrefill].
///
/// Returns null for null/empty input or when no plausible VND amount is
/// found. The first plausible amount wins; "plausible" means it parses
/// as a VND-format number, stays under [_maxSafeAmount], and bare digit
/// runs look like money rather than ids (no leading zero, <= 9 digits,
/// >= [_minPlausibleAmount]).
SharedTextPrefill? parseSharedText(String? text) {
  if (text == null) return null;
  final trimmed = text.trim();
  if (trimmed.isEmpty) return null;

  // Work on a diacritic-stripped copy; positions map 1:1 back onto the
  // original because every substitution is a single character.
  final normalized = _normalize(trimmed);

  for (final m in _amountPattern.allMatches(normalized)) {
    final value = _matchValue(m);
    if (value == null || !_plausibleAmount(m, value, normalized)) {
      continue;
    }
    return SharedTextPrefill(
      amount: value,
      kind: _detectKind(normalized, m),
      note: _buildNote(trimmed, normalized, m),
    );
  }
  return null;
}

/// Numeric value of an amount match: grouped digits, or digits x unit.
int? _matchValue(RegExpMatch m) {
  final digits = m.group(3)!;
  final unit = m.group(4);
  if (unit == null) return _parseGrouped(digits);
  final scale = _unitScale[unit];
  if (scale == null) return null;
  final whole = _parseGrouped(digits);
  if (whole != null) return whole * scale;
  // "1.5tr"/"2,5tr" style decimal multipliers of the unit.
  final dotDigits = digits.replaceAll(',', '.');
  if (!RegExp(r'^\d+(\.\d+)?$').hasMatch(dotDigits)) return null;
  return (double.parse(dotDigits) * scale).round();
}

/// "1.234.567" / "1,234,567" / "1234567" -> int; commas/dots only count
/// as thousands separators when every trailing group is exactly 3 digits
/// (so "1,5" and "15,25" are rejected, never treated as decimals).
int? _parseGrouped(String digits) {
  final groups = digits.split(RegExp(r'[.,]+'));
  if (groups.any((g) => g.isEmpty)) return null;
  for (var i = 1; i < groups.length; i++) {
    if (groups[i].length != 3) return null;
  }
  return int.tryParse(groups.join());
}

bool _plausibleAmount(RegExpMatch m, int value, String normalized) {
  if (value <= 0 || value > _maxSafeAmount) return false;
  final digits = m.group(3)!;
  final marked = m.group(4) != null || m.group(5) != null;
  final bare = !marked && !digits.contains('.') && !digits.contains(',');
  if (bare) {
    // "TK 0123..." ids have leading zeros or run long; counts/years are
    // tiny. Only an unmarked, unseparated run gets this scrutiny.
    if (digits.startsWith('0')) return false;
    if (digits.length > _bareDigitLimit) return false;
    if (value < _minPlausibleAmount) return false;
  }
  // A number glued to a word/id char isn't an amount ("abc123").
  if (m.start > 0) {
    final prev = normalized[m.start - 1];
    if (RegExp(r'[a-z0-9]').hasMatch(prev)) return false;
  }
  return true;
}

/// Sign on the amount token first ("GD: -1.250.000d", "+15.000.000"),
/// otherwise the direction keyword nearest the amount wins.
TransactionKind? _detectKind(String normalized, RegExpMatch amount) {
  switch (amount.group(2)) {
    case '-':
      return TransactionKind.expense;
    case '+':
      return TransactionKind.income;
  }
  TransactionKind? best;
  var bestDist = 1 << 62;
  for (final e in _kindPatterns.entries) {
    for (final m in e.key.allMatches(normalized)) {
      var d = (m.start - amount.start).abs();
      if (m.start > amount.start) d += _afterAmountPenalty;
      if (d < bestDist) {
        bestDist = d;
        best = e.value;
      }
    }
  }
  return best;
}

/// Merchant snippet after "tại"/"từ"/"at"/... when one is usable,
/// else the input trimmed to <= 200 chars.
String _buildNote(String original, String normalized, RegExpMatch amount) {
  final markers = _merchantPattern.allMatches(normalized).toList()
    ..sort((a, b) {
      // Markers after the amount are likelier payees ("tại Circle K");
      // stable order keeps the earliest within each side.
      final aAfter = a.start >= amount.end ? 0 : 1;
      final bAfter = b.start >= amount.end ? 0 : 1;
      return aAfter.compareTo(bAfter);
    });
  for (final marker in markers) {
    final note = _snippetNote(original, normalized, marker, amount);
    if (note != null) return note;
  }
  return _fallbackNote(original);
}

/// Try to cut a usable snippet after a merchant marker, or return null.
String? _snippetNote(
  String original,
  String normalized,
  RegExpMatch marker,
  RegExpMatch amount,
) {
  final rest = normalized.substring(marker.end);
  // "tài khoản ..." is an account mention, not a merchant.
  if (rest.trimLeft().startsWith('khoan')) return null;

  // The snippet ends at the first clause break, long digit run (account
  // tails, balances) or a repeat of the amount token itself.
  var cut = rest.length;
  for (final sep in const ['.', ';', '|', '\n']) {
    final i = rest.indexOf(sep);
    if (i >= 0 && i < cut) cut = i;
  }
  final digitRun = _longDigitRun.firstMatch(rest);
  if (digitRun != null && digitRun.start < cut) cut = digitRun.start;
  final amountPos = rest.indexOf(amount.group(0)!);
  if (amountPos >= 0 && amountPos < cut) cut = amountPos;

  return _cleanSnippet(
    original.substring(marker.end, marker.end + cut),
    normalized.substring(marker.end, marker.end + cut),
  );
}

/// Trim a candidate snippet; drop keyword words that trailed into it.
/// Positions stay aligned because normalization is 1:1 per character.
String? _cleanSnippet(String snippet, String normalizedSnippet) {
  var o = snippet.trim();
  var n = normalizedSnippet.trim();
  o = o.replaceAll(RegExp(r'^[.,:;|+\-]+'), '');
  n = n.replaceAll(RegExp(r'^[.,:;|+\-]+'), '');
  o = o.replaceAll(_whitespaceRe, ' ').trim();
  n = n.replaceAll(_whitespaceRe, ' ').trim();
  while (true) {
    final lastSpace = n.lastIndexOf(' ');
    if (lastSpace < 0) break;
    final lastWord = n.substring(lastSpace + 1);
    if (!_noteStopWords.contains(lastWord)) break;
    n = n.substring(0, lastSpace).trimRight();
    o = o.substring(0, lastSpace).trimRight();
  }
  if (o.length < 2 || !_letterRe.hasMatch(o)) return null;
  if (o.length > _noteMaxLength) o = o.substring(0, _noteMaxLength);
  return o;
}

String _fallbackNote(String original) {
  var s = original.replaceAll(_whitespaceRe, ' ').trim();
  if (s.length > _noteMaxLength) {
    s = s.substring(0, _noteMaxLength).trimRight();
  }
  return s;
}

/// Lowercase + strip Vietnamese diacritics + unify dash signs.
/// Every substitution is one character, so offsets stay aligned with
/// the original string.
String _normalize(String s) {
  final b = StringBuffer();
  for (final ch in s.toLowerCase().split('')) {
    b.write(_stripMap[ch] ?? ch);
  }
  return b.toString();
}

const _stripMap = <String, String>{
  'à': 'a',
  'á': 'a',
  'ạ': 'a',
  'ả': 'a',
  'ã': 'a',
  'â': 'a',
  'ầ': 'a',
  'ấ': 'a',
  'ậ': 'a',
  'ẩ': 'a',
  'ẫ': 'a',
  'ă': 'a',
  'ằ': 'a',
  'ắ': 'a',
  'ặ': 'a',
  'ẳ': 'a',
  'ẵ': 'a',
  'è': 'e',
  'é': 'e',
  'ẹ': 'e',
  'ẻ': 'e',
  'ẽ': 'e',
  'ê': 'e',
  'ề': 'e',
  'ế': 'e',
  'ệ': 'e',
  'ể': 'e',
  'ễ': 'e',
  'ì': 'i',
  'í': 'i',
  'ị': 'i',
  'ỉ': 'i',
  'ĩ': 'i',
  'ò': 'o',
  'ó': 'o',
  'ọ': 'o',
  'ỏ': 'o',
  'õ': 'o',
  'ô': 'o',
  'ồ': 'o',
  'ố': 'o',
  'ộ': 'o',
  'ổ': 'o',
  'ỗ': 'o',
  'ơ': 'o',
  'ờ': 'o',
  'ớ': 'o',
  'ợ': 'o',
  'ở': 'o',
  'ỡ': 'o',
  'ù': 'u',
  'ú': 'u',
  'ụ': 'u',
  'ủ': 'u',
  'ũ': 'u',
  'ư': 'u',
  'ừ': 'u',
  'ứ': 'u',
  'ự': 'u',
  'ử': 'u',
  'ữ': 'u',
  'ỳ': 'y',
  'ý': 'y',
  'ỵ': 'y',
  'ỷ': 'y',
  'ỹ': 'y',
  'đ': 'd',
  '−': '-',
  '–': '-',
  '—': '-',
};
