import 'report.dart' show vnNow;

/// "HH:MM · DD/MM/YYYY" in Vietnam time for the "Đã xóa lúc …" line —
/// mirrors the web's formatDeletedAtLabel (Asia/Ho_Chi_Minh = UTC+7,
/// no DST, so a fixed offset is exact). Uses the shared VN clock —
/// audit P1-6 consolidates every +7 shift on domain/report.dart.
String formatDeletedAtLabel(String iso) {
  final dt = DateTime.tryParse(iso);
  if (dt == null) return '';
  final vn = vnNow(dt);
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(vn.hour)}:${two(vn.minute)} · '
      '${two(vn.day)}/${two(vn.month)}/${vn.year}';
}

/// "YYYY-MM-DD" ledger date → "DD/MM/YYYY". Returns the input unchanged
/// for anything not shaped like a ledger date — the caller decides what
/// to show rather than inventing a date.
String formatYmdAsDmy(String ymd) {
  final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(ymd);
  if (m == null) return ymd;
  return '${m[3]}/${m[2]}/${m[1]}';
}
