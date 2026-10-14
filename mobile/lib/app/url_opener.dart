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
}

/// Device-backed opener — externalApplication so the policy page leaves
/// the app's task instead of covering the ledger in an in-app sheet.
class DeviceUrlOpener implements UrlOpener {
  const DeviceUrlOpener();

  @override
  Future<bool> open(Uri uri) =>
      launcher.launchUrl(uri, mode: launcher.LaunchMode.externalApplication);
}
