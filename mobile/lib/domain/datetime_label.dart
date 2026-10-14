/// "HH:MM · DD/MM/YYYY" in Vietnam time for the "Đã xóa lúc …" line —
/// mirrors the web's formatDeletedAtLabel (Asia/Ho_Chi_Minh = UTC+7,
/// no DST, so a fixed offset is exact).
String formatDeletedAtLabel(String iso) {
  final dt = DateTime.tryParse(iso);
  if (dt == null) return '';
  final vn = dt.toUtc().add(const Duration(hours: 7));
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(vn.hour)}:${two(vn.minute)} · '
      '${two(vn.day)}/${two(vn.month)}/${vn.year}';
}
