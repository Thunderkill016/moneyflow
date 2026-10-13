// Port of src/lib/money.dart — integer-đồng money formatting and parsing.
// Money is ALWAYS int minor units (đồng). Never double.

enum MoneySignKind { income, expense, transfer }

const vndFractionEntryMessage =
    'Nhập số tiền nguyên, không dùng dấu thập phân.';

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

/// Parse a VND amount string into integer đồng.
/// Accepts: "50000", "50.000", "50k", "1.5tr"/"1,5tr", "2 tỷ".
/// Rejects decimals for VND (fraction tail rule), non-numeric garbage.
/// Returns null on invalid input.
int? parseMoneyInput(String raw) {
  final value = raw.trim();
  if (value.isEmpty) return null;

  // Shorthand: numeric part + unit suffix (k|tr|triệu|trieu|củ|tỷ|tỉ|ty)
  final shortMatch = RegExp(
    r'^([\d.,\s ]*\d[\d.,\s ]*?)\s*(k|triệu|trieu|tr|củ|tỷ|tỉ|ty)(\d*)$',
    caseSensitive: false,
  ).firstMatch(value);
  if (shortMatch != null) {
    final scale = _vndShorthandScale[shortMatch.group(2)!.toLowerCase()];
    if (scale == null) return null;
    final numPart = shortMatch.group(1)!;
    final tailDigits = shortMatch.group(3)!;
    final whole = _parseGroupedNumber(numPart);
    if (whole == null) return null;
    var result = whole * scale;
    // Trailing digits after unit count as direct đồng (rare: "1tr500"→?) —
    // web treats them as part of the numeric tail; keep parity by appending.
    if (tailDigits.isNotEmpty) {
      final tail = int.tryParse(tailDigits);
      if (tail == null) return null;
      result += tail;
    }
    return result;
  }

  // Fraction tail = decimal entry -> reject for VND.
  if (RegExp(r'[.,\s ]\d{1,2}$').hasMatch(value)) return null;

  return _parseGroupedNumber(value);
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

/// "1.234.567" / "1,234,567" / "1234567" -> 1234567. Groups must be 3 digits.
int? _parseGroupedNumber(String text) {
  final cleaned = text.trim().replaceAll(' ', ' ');
  if (!RegExp(r'^\d[\d.,\s]*$').hasMatch(cleaned)) return null;
  final groups = cleaned.split(RegExp(r'[.,\s]+'));
  if (groups.any((g) => g.isEmpty)) return null;
  // If separated, every group after the first must be exactly 3 digits
  // (thousands separators); a lone leading group of 1-3 digits is fine.
  if (groups.length > 1) {
    for (var i = 1; i < groups.length; i++) {
      if (groups[i].length != 3) return null;
    }
  }
  final digits = groups.join();
  return int.tryParse(digits);
}
