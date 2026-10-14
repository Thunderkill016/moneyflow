// Spoken-Vietnamese form of an integer-đồng amount, for Semantics
// labels — "45.000 ₫" reads to a screen reader as digits plus a symbol;
// this gives "bốn mươi lăm nghìn đồng". Domain code (integer math,
// no framework) so it stays unit-testable like money.dart.

const _digits = [
  'không',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
];

/// Reads a three-digit group. [leading] is false when a higher group
/// precedes it — interior groups under 100 need the formal
/// "không trăm lẻ …" bridge so 1.005.000 never reads as "một triệu năm".
String _groupWords(int g, {required bool leading}) {
  final h = g ~/ 100;
  final t = (g % 100) ~/ 10;
  final o = g % 10;
  final words = <String>[];
  if (h > 0) {
    words.add('${_digits[h]} trăm');
  } else if (!leading) {
    words.add('không trăm');
  }
  // "lẻ" marks a skipped tens place, but only under an explicit or
  // implied hundreds context — a leading "lẻ năm" is wrong.
  final bridge = h > 0 || !leading;
  if (t == 0) {
    if (o > 0) words.add(bridge ? 'lẻ ${_digits[o]}' : _digits[o]);
  } else if (t == 1) {
    words.add('mười');
    if (o > 0) words.add(o == 5 ? 'lăm' : _digits[o]);
  } else {
    words.add('${_digits[t]} mươi');
    // Formal register: "mốt"/"lăm" but never colloquial "tư".
    if (o == 1) {
      words.add('mốt');
    } else if (o == 5) {
      words.add('lăm');
    } else if (o > 0) {
      words.add(_digits[o]);
    }
  }
  return words.join(' ');
}

/// Words for the absolute value, no "đồng" suffix — recursive so a
/// tỷ group above 999 still reads correctly (tỷ itself is grouped).
String _vndWords(int v) {
  if (v == 0) return 'không';
  const billion = 1000000000;
  final parts = <String>[];
  var rest = v;
  final ty = rest ~/ billion;
  rest %= billion;
  if (ty > 0) {
    parts.add('${_vndWords(ty)} tỷ');
    // Same "rưỡi" rule as the loop below: exactly half a tỷ and nothing
    // more reads "một tỷ rưỡi" instead of "một tỷ năm trăm triệu".
    if (rest == billion ~/ 2) {
      parts.add('rưỡi');
      return parts.join(' ');
    }
  }
  for (final (scale, name) in [(1000000, 'triệu'), (1000, 'nghìn'), (1, '')]) {
    final g = rest ~/ scale;
    rest %= scale;
    if (g == 0) continue;
    parts.add(
      _groupWords(g, leading: parts.isEmpty) + (name.isEmpty ? '' : ' $name'),
    );
    // "rưỡi" — exactly half the unit just emitted and nothing more:
    // 1.500.000 → "một triệu rưỡi", 2.500 → "hai nghìn rưỡi".
    if (scale > 1 && rest == scale ~/ 2) {
      parts.add('rưỡi');
      rest = 0;
      break;
    }
  }
  return parts.join(' ');
}

/// Spoken form for screen readers: 45000 → "bốn mươi lăm nghìn đồng",
/// 1500000 → "một triệu rưỡi đồng", 0 → "không đồng".
/// Negative amounts read "âm …" — callers wrapping a signed figure
/// (e.g. a debt total) get an honest word instead of a stray minus.
String spokenVnd(int amount) {
  if (amount < 0) return 'âm ${spokenVnd(-amount)}';
  return '${_vndWords(amount)} đồng';
}
