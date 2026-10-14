import 'package:screen_protector/screen_protector.dart';

/// App-wide screenshot / screen-recording shield (FLAG_SECURE on
/// Android) so ledger amounts never land in casual captures or the
/// recents-screen thumbnail. Scope is deliberately the whole app — every
/// authenticated surface can show balances.
///
/// Best-effort by contract: [protect] never throws, because devices or
/// emulators without platform support must not crash app start.
class ScreenShield {
  const ScreenShield._();

  /// Enables capture protection for the app window.
  ///
  /// [apply] is the test seam — widget tests substitute a spy/failure
  /// without the plugin's platform channel. Never throws.
  static Future<void> protect({
    Future<void> Function() apply = ScreenProtector.preventScreenshotOn,
  }) async {
    try {
      await apply();
    } catch (_) {
      // Unsupported platform/emulator — the app keeps running without
      // the shield rather than refusing to start.
    }
  }
}
