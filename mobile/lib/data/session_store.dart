import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists the Better Auth session token across app restarts.
/// The token is a signed cookie value — treat it like a credential:
/// it lives in `flutter_secure_storage`, where the value is AES-GCM
/// encrypted under a KeyStore-wrapped key (never plaintext at rest).
/// [userId] rides along so account-scoped local stores (dashboard
/// snapshot, offline capture queue) can bind before the session is even
/// re-validated — e.g. the offline-restore path.
///
/// Migration: tokens written before secure storage still sit in plain
/// SharedPreferences. [read] moves a found legacy copy across, then
/// deletes the plaintext; [write] and [clear] sweep the legacy keys too.
class SessionStore {
  static const _key = 'neon.session_token';
  static const _userIdKey = 'neon.user_id';

  /// Default Android options: RSA-OAEP key cipher + AES-GCM storage
  /// cipher, `resetOnError` on — a corrupted entry deletes itself rather
  /// than failing every read forever.
  static const _secure = FlutterSecureStorage();

  /// The stored token and its owner's id, or null when signed out.
  /// Tokens written before the userId field existed read it back as null.
  static Future<({String token, String? userId})?> read() async {
    // A broken keystore (backup restored onto another device, lock
    // credential change) reads as "no session" — falling through to
    // login is the honest fallback; trapping the boot on a PlatformException
    // is not. The legacy path below can still rescue an unmigrated copy.
    try {
      final token = await _secure.read(key: _key);
      if (token != null) {
        return (token: token, userId: await _secure.read(key: _userIdKey));
      }
    } on PlatformException {
      /* treated as absent — see comment above */
    }
    // One-shot upgrade path: move the plaintext copy into secure storage,
    // then delete it. If the secure write fails the legacy copy stays —
    // the session still restores and the move retries on the next launch.
    final prefs = await SharedPreferences.getInstance();
    final legacyToken = prefs.getString(_key);
    if (legacyToken == null) return null;
    final legacyUserId = prefs.getString(_userIdKey);
    try {
      await _secure.write(key: _key, value: legacyToken);
      if (legacyUserId != null) {
        await _secure.write(key: _userIdKey, value: legacyUserId);
      }
      await prefs.remove(_key);
      await prefs.remove(_userIdKey);
    } on PlatformException {
      /* plaintext survives so the session is not stranded — retried later */
    }
    return (token: legacyToken, userId: legacyUserId);
  }

  static Future<void> write(String token, {String? userId}) async {
    try {
      await _secure.write(key: _key, value: token);
      if (userId != null) await _secure.write(key: _userIdKey, value: userId);
    } on PlatformException {
      // Persisting failed but the in-memory session is valid — the caller
      // proceeds to the signed-in shell; worst case the next launch asks
      // for credentials again instead of trapping this one.
    }
    // Drop any pre-migration plaintext copy — the credential may never
    // exist in both stores at once.
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
    await prefs.remove(_userIdKey);
  }

  static Future<void> clear() async {
    // Two independent stores — a failure in one must not skip the other.
    try {
      await _secure.delete(key: _key);
      await _secure.delete(key: _userIdKey);
    } on PlatformException {
      /* a dead keystore means the remnant is unreadable anyway */
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
    await prefs.remove(_userIdKey);
  }
}
