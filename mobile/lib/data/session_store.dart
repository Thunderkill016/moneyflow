import 'package:shared_preferences/shared_preferences.dart';

/// Persists the Better Auth session token across app restarts.
/// The token is a signed cookie value — treat it like a credential:
/// stored via SharedPreferences (encrypted-at-rest on Android).
/// [userId] rides along so account-scoped local stores (dashboard
/// snapshot, offline capture queue) can bind before the session is even
/// re-validated — e.g. the offline-restore path.
class SessionStore {
  static const _key = 'neon.session_token';
  static const _userIdKey = 'neon.user_id';

  /// The stored token and its owner's id, or null when signed out.
  /// Tokens written before the userId field existed read it back as null.
  static Future<({String token, String? userId})?> read() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_key);
    if (token == null) return null;
    return (token: token, userId: prefs.getString(_userIdKey));
  }

  static Future<void> write(String token, {String? userId}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, token);
    if (userId != null) await prefs.setString(_userIdKey, userId);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
    await prefs.remove(_userIdKey);
  }
}
