// Port of src/lib/money.ts — integer-đồng money formatting and parsing.
// Money is ALWAYS int minor units (đồng). Never double.

enum MoneySignKind { income, expense, transfer }

const vndFractionEntryMessage =
    'Nhập số tiền nguyên, không dùng dấu thập phân.';

/// The web's Number.isSafeInteger ceiling (2^53 - 1) — every web caller
/// guards on it, so it is the shared reject bound. Dart int instead
/// wraps silently at 2^63, which let `18446744073710tr` pass the
/// `amount <= 0` guards as a small positive; the bound must be checked
/// BEFORE multiplying, never inferred from a wrapped product.
const _maxSafeInteger = 9007199254740991;

const _vndShorthandScale = <String, int>{
  'k': 1000,
  'tr': 1000000,
  'triệu': 1000000,
  'trieu': 1000000,
  'củ': 1000000,
  'tỷ': 1000000000,
  'tỉ': 1000000000,
  'ty': 1000000000,
};

// The regexes below mirror src/lib/money.ts one-to-one — same
// alternation order, same character classes, same anchors.

/// A complete unit anywhere in the entry forces the shorthand grammar.
final _vndShorthandUnit = RegExp(
  r'k|triệu|trieu|tr|củ|tỷ|tỉ|ty',
  caseSensitive: false,
  unicode: true,
);

/// A half-typed unit at the end (`1t`, `3 c`) counts as shorthand too —
/// the parser must refuse it, not read a stray partial unit as digits.
final _vndShorthandTypingTail = RegExp(
  r'(?:^|[\d.,\s\u00a0])(?:k|triệu|triệ|trieu|trie|tri|tr|tỷ|tỉ|ty|t|củ|c)$',
  caseSensitive: false,
  unicode: true,
);

/// `<number> <unit> <unit-fraction digits>` — the whole entry, nothing else.
final _vndShorthandPattern = RegExp(
  r'^([\d.,\s\u00a0]*\d[\d.,\s\u00a0]*?)[\s\u00a0]*(k|triệu|trieu|tr|củ|tỷ|tỉ|ty)(\d*)$',
  caseSensitive: false,
  unicode: true,
);

/// A separator followed by one or two digits at the end of the number.
final _fractionTail = RegExp(r'[.,\s\u00a0]\d{1,2}$', unicode: true);

final _nonNumericPortion = RegExp(r'[^\d.,\s\u00a0]', unicode: true);
final _trailingSeparators = RegExp(r'[.,\s\u00a0]+$', unicode: true);
final _nonDigit = RegExp(r'\D', unicode: true);
final _shorthandNumberStart = RegExp(r'^\d[\d.,\s\u00a0]*$', unicode: true);
final _separatorRun = RegExp(r'[.,\s\u00a0]+', unicode: true);
final _zerosOnly = RegExp(r'^0+$');

/// vi-VN thousands grouping: 1234567 -> "1.234.567"
String _group(int value) {
  final s = value.abs().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
    buf.write(s[i]);
  }
  return buf.toString();
}

String formatMoney(int amount, {bool compact = false}) {
  if (compact && amount.abs() >= 1000000) {
    final m = amount / 1000000;
    final txt = m == m.roundToDouble()
        ? m.toInt().toString()
        : m.toStringAsFixed(1).replaceAll('.', ',');
    return '$txt tr';
  }
  return '${amount < 0 ? '-' : ''}${_group(amount)} ₫';
}

String formatSignedMoney(int amount, {bool compact = false}) {
  if (amount > 0) return '+ ${formatMoney(amount, compact: compact)}';
  if (amount < 0) {
    return '− ${formatMoney(amount.abs(), compact: compact)}';
  }
  return formatMoney(0, compact: compact);
}

String moneyKindPrefix(MoneySignKind kind) => switch (kind) {
  MoneySignKind.income => '+',
  MoneySignKind.transfer => '↔',
  MoneySignKind.expense => '−',
};

String formatMoneyWithKind(
  int amount,
  MoneySignKind kind, {
  bool compact = false,
}) {
  return '${moneyKindPrefix(kind)} ${formatMoney(amount.abs(), compact: compact)}';
}

/// Parse a VND amount string into integer đồng — a faithful port of the
/// web's `parseMoneyInput` (src/lib/money.ts). Accepts: "50000",
/// "50.000", "50k", "1tr5", "1,5tr", "2 tỷ". Rejects a decimal-fraction
/// attempt and any malformed shorthand; `null` is the web's `NaN`.
///
/// One deliberate divergence: the web returns 0 when no digits remain
/// (`parseMoneyInput("cat") == 0`). Mobile callers use null as
/// "no value / reject" — the activity filter's empty min/max and the
/// account opening balance both depend on it — so a digit-less entry
/// rejects here instead.
int? parseMoneyInput(String raw) {
  final value = _foldFullwidth(raw).trim();
  if (value.isEmpty) return null;

  // Anything that looks like shorthand — a complete unit anywhere, or a
  // half-typed unit tail — answers to the shorthand grammar alone: valid
  // input scales to an integer, invalid input rejects. It never falls
  // through to the digit strip, which would silently drop the unit
  // (`k50`, `tr`, `1tr5x`, even `45.000đ trả`).
  if (_vndShorthandUnit.hasMatch(value) ||
      _vndShorthandTypingTail.hasMatch(value)) {
    return _parseVndShorthand(value);
  }

  // A separator followed by one or two digits at the end of the number
  // is a decimal-fraction attempt — rejected, never reinterpreted
  // (`12,5` is not 125). Three-or-more-digit groups are grouping
  // separators (`45.000 ₫` still parses).
  final numeric = _numericPortion(value);
  if (numeric.isNotEmpty && _fractionTail.hasMatch(numeric)) return null;

  final digits = value.replaceAll(_nonDigit, '');
  if (digits.isEmpty) return null;
  final amount = int.tryParse(digits);
  // int.tryParse only fails past 2^63; the safe-integer bound is the
  // web's caller contract (every web caller guards isSafeInteger).
  if (amount == null || amount > _maxSafeInteger) return null;
  return amount;
}

/// `<number><unit><unit-fraction digits>` → exact đồng, or null when the
/// shorthand is malformed or finer than one đồng (port of the web's
/// parseVndShorthand — the caller already saw a shorthand candidate).
///
/// Tail digits after the unit are a decimal fraction OF the unit, never
/// raw đồng: `1tr5` is 1,5 triệu = 1 500 000, and `50k5` = 50 500. All
/// scales are powers of ten, so the fraction resolves with digit
/// strings — never floats. A fraction longer than the unit expresses is
/// exact only on trailing zeros (`1tr5000000` = 1 500 000).
int? _parseVndShorthand(String value) {
  final match = _vndShorthandPattern.firstMatch(value);
  final parts = match == null
      ? null
      : _splitVndShorthandNumber(match.group(1)!);
  if (match == null || parts == null) return null;
  final tail = match.group(3)!;
  // `1,5tr5` carries two fractions — one from the separator, one after
  // the unit — and guessing either is the silent rewrite the contract
  // forbids.
  if (parts.fraction.isNotEmpty && tail.isNotEmpty) return null;
  final scale = _vndShorthandScale[match.group(2)!.toLowerCase()];
  final whole = int.tryParse(parts.whole);
  if (scale == null || whole == null || whole > _maxSafeInteger) {
    return null;
  }
  final fraction = parts.fraction.isNotEmpty ? parts.fraction : tail;
  // log10 of a power of ten: k→3, tr→6, tỷ→9.
  final shift = scale.toString().length - 1;
  var fractionUnits = 0;
  if (fraction.length > shift) {
    if (!_zerosOnly.hasMatch(fraction.substring(shift))) return null;
    fractionUnits = int.parse(fraction.substring(0, shift));
  } else if (fraction.isNotEmpty) {
    fractionUnits = int.parse(fraction) * _pow10(shift - fraction.length);
  }
  // Bound BEFORE multiplying: Dart int wraps silently at 2^63, so
  // `whole * scale` alone can overflow into a passing value
  // (`18446744073710tr` wrapped to 448384).
  if (whole > (_maxSafeInteger - fractionUnits) ~/ scale) return null;
  return whole * scale + fractionUnits;
}

/// Split the leading number of a shorthand into whole and fraction
/// digits (port of splitVndShorthandNumber). Three-digit groups keep
/// the grouping rule (`1.234tr` = 1 234 triệu); a single separator with
/// any other tail is the decimal fraction (`1,5tr`, `12,5tr`). Anything
/// messier — `1.2.3tr`, a leading separator — fails closed.
({String whole, String fraction})? _splitVndShorthandNumber(String text) {
  final cleaned = text.trim();
  if (!_shorthandNumberStart.hasMatch(cleaned)) return null;
  final groups = cleaned.split(_separatorRun);
  if (groups.length == 1) return (whole: groups[0], fraction: '');
  final head = groups.first;
  final tails = groups.sublist(1);
  if (head.length <= 3 && tails.every((g) => g.length == 3)) {
    return (whole: groups.join(), fraction: '');
  }
  if (groups.length == 2) return (whole: head, fraction: groups[1]);
  return null;
}

/// Digits and separators only — strips currency marks, signs and stray
/// letters before the fraction-tail check (port of numericPortion).
String _numericPortion(String value) => value
    .replaceAll(_nonNumericPortion, '')
    .trim()
    .replaceAll(_trailingSeparators, '');

/// 10^exp for exp in 0..9 — the shorthand unit fractions stay inside
/// int64 without touching doubles.
int _pow10(int exp) {
  var r = 1;
  for (var i = 0; i < exp; i++) {
    r *= 10;
  }
  return r;
}

/// The web normalizes NFKC before every step so fullwidth digits survive
/// the digit strip. Only the numeric alphabet needs folding here —
/// fullwidth digits, fullwidth separators and the ideographic space a
/// CJK keyboard emits.
String _foldFullwidth(String s) {
  final b = StringBuffer();
  for (final r in s.runes) {
    if (r >= 0xFF10 && r <= 0xFF19) {
      b.writeCharCode(0x30 + r - 0xFF10); // ０-９ → 0-9
    } else if (r == 0xFF0E) {
      b.write('.'); // ． → .
    } else if (r == 0xFF0C) {
      b.write(','); // ， → ,
    } else if (r == 0x3000) {
      b.write(' '); // ideographic space → space
    } else {
      b.writeCharCode(r);
    }
  }
  return b.toString();
}

/// Signed variant for statement balances — a leading '-' before the
/// usual grouped/shorthand syntax (port of the web reconciliation
/// page's parseSignedMoneyInput; "-50.000" -> -50000).
int? parseSignedMoneyInput(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty || trimmed == '-') return null;
  final negative = trimmed.startsWith('-');
  final amount = parseMoneyInput(negative ? trimmed.substring(1) : trimmed);
  return amount == null ? null : (negative ? -amount : amount);
}
