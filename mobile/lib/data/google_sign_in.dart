import 'package:google_sign_in/google_sign_in.dart';

/// Source of a Google-issued id token for the Better Auth
/// /sign-in/social exchange.
///
/// Test seam: the login page never touches the plugin directly — widget
/// tests inject a fake source to drive success, cancellation and failure
/// without a platform channel.
abstract class GoogleIdTokenSource {
  /// Opens the native Google account sheet and returns its id token.
  ///
  /// Returns null when the user cancels — cancellation is user intent,
  /// not an error. Throws on real failures (Play Services absent,
  /// misconfigured OAuth clients, network).
  Future<String?> idToken();
}

/// google_sign_in v7 flow: `initialize` binds the server's web OAuth
/// client id (the Google Cloud project where Neon Auth's Google provider
/// is configured), `authenticate` shows the Credential Manager sheet and
/// the resulting account's `authentication.idToken` is what Better Auth
/// verifies server-side. No google-services.json is needed when the
/// server client id is passed directly.
class PluginGoogleIdTokenSource implements GoogleIdTokenSource {
  PluginGoogleIdTokenSource({required this.serverClientId});

  final String serverClientId;
  bool _initialized = false;

  @override
  Future<String?> idToken() async {
    if (!_initialized) {
      await GoogleSignIn.instance.initialize(serverClientId: serverClientId);
      _initialized = true;
    }
    try {
      final account = await GoogleSignIn.instance.authenticate();
      return account.authentication.idToken;
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) return null;
      rethrow;
    }
  }
}
