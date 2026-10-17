import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart' as launcher;

/// Public privacy policy — Play requires it reachable in-app, and the
/// hosted page is the same document the web app links, so mobile and web
/// stay on one source of truth.
const kPrivacyPolicyUrl = 'https://mfvn.vercel.app/privacy';

/// External-link seam — the real impl wraps url_launcher; tests inject a
/// fake instead of firing a platform channel at a nonexistent browser.
abstract class UrlOpener {
  /// Opens [uri] outside the app (system browser). False means no
  /// handler could take it.
  Future<bool> open(Uri uri);

  /// Opens [uri] in an in-app browser view (Chrome Custom Tab on
  /// Android) so the OAuth round-trip stays visually inside the app.
  /// False means no handler could take it.
  Future<bool> openInApp(Uri uri);
}

/// Device-backed opener — externalApplication so the policy page leaves
/// the app's task instead of covering the ledger in an in-app sheet.
class DeviceUrlOpener implements UrlOpener {
  const DeviceUrlOpener();

  @override
  Future<bool> open(Uri uri) =>
      launcher.launchUrl(uri, mode: launcher.LaunchMode.externalApplication);

  /// Custom Tab for the auth round-trip — Google blocks embedded
  /// WebViews for OAuth but allows Custom Tabs (a real Chrome context),
  /// which keeps the consent page inside MoneyFlow's chrome and lets the
  /// loopback `intent://` page bounce back automatically. Devices with
  /// no Custom-Tab-capable browser fall back to the external browser.
  @override
  Future<bool> openInApp(Uri uri) async {
    try {
      return await launcher.launchUrl(
        uri,
        mode: launcher.LaunchMode.inAppBrowserView,
      );
    } on PlatformException {
      return open(uri);
    }
  }
}
