import 'package:shared_preferences/shared_preferences.dart';

/// Persists the Better Auth session token across app restarts.
/// The token is a signed cookie value — treat it like a credential:
/// stored via SharedPreferences (encrypted-at-rest on Android).
class SessionStore {
  static const _key = 'neon.session_token';

  static Future<String?> read() async =>
      (await SharedPreferences.getInstance()).getString(_key);

  static Future<void> write(String token) async =>
      (await SharedPreferences.getInstance()).setString(_key, token);

  static Future<void> clear() async =>
      (await SharedPreferences.getInstance()).remove(_key);
}
