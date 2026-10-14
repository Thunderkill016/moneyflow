import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../domain/weekly_digest.dart' show weeklyDigestHour, weeklyDigestMinute;

/// Device-level settings — SharedPreferences under the `mf_` prefix so the
/// local-data wipe sweeps them, while an ordinary sign-out leaves them:
/// the user opted in on this device, not on this account (same contract
/// as `mf_biometric_enabled` / `mf_weekly_digest_enabled`).
class SettingsPrefs {
  SettingsPrefs._();

  /// 'system' | 'light' | 'dark' — a string, not the enum index, so a
  /// reordered ThemeMode can never reinterpret a stored value.
  static const _themeModeKey = 'mf_theme_mode';

  /// Weekly-digest fire time as minutes since midnight — one key keeps
  /// hour and minute atomic (no half-written clock face).
  static const _digestMinutesKey = 'mf_weekly_digest_minutes';

  /// The historical fixed digest time — 19:00 Sunday evening.
  static const defaultDigestMinutes =
      weeklyDigestHour * 60 + weeklyDigestMinute;

  /// Live theme mode the MaterialApp listens to — `loadThemeMode` fills
  /// it at startup and `saveThemeMode` keeps it in sync. A notifier (not
  /// a callback threaded through the tree) because the settings page sits
  /// several routes deep.
  static final themeMode = ValueNotifier<ThemeMode>(ThemeMode.light);

  /// Reads the stored mode and publishes it on [themeMode]. Anything
  /// unrecognised falls back to system — the app can never trap itself
  /// in a theme the user can't leave.
  static Future<ThemeMode> loadThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    final mode = switch (prefs.getString(_themeModeKey)) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      'system' => ThemeMode.system,
      _ => ThemeMode.light,
    };
    themeMode.value = mode;
    return mode;
  }

  static Future<void> saveThemeMode(ThemeMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeModeKey, switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    });
    themeMode.value = mode;
  }

  /// The digest's fire time — defaults to [defaultDigestMinutes] when
  /// unset or corrupt (a persisted out-of-range value reads as the
  /// default, never a crash on the scheduling path).
  static Future<({int hour, int minute})> loadDigestTime() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getInt(_digestMinutesKey);
    final minutes = raw == null || raw < 0 || raw >= 24 * 60
        ? defaultDigestMinutes
        : raw;
    return (hour: minutes ~/ 60, minute: minutes % 60);
  }

  static Future<void> saveDigestTime({
    required int hour,
    required int minute,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_digestMinutesKey, hour * 60 + minute);
  }
}
