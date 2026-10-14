import 'package:shared_preferences/shared_preferences.dart';

/// Remembers the last account/category the user saved with so the next
/// capture can prefill them — the "default wallet" pattern from reference
/// apps. A stale id is ignored when it no longer exists in the list.
class CapturePrefs {
  static const _accountKey = 'mf_last_capture_account';
  static const _categoryKey = 'mf_last_capture_category';

  static Future<void> saveLastCapture({
    required String accountId,
    String? categoryId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accountKey, accountId);
    if (categoryId != null) {
      await prefs.setString(_categoryKey, categoryId);
    }
  }

  static Future<({String? accountId, String? categoryId})>
  loadLastCapture() async {
    final prefs = await SharedPreferences.getInstance();
    return (
      accountId: prefs.getString(_accountKey),
      categoryId: prefs.getString(_categoryKey),
    );
  }
}
