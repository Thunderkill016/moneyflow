import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

// googleSignInIsUserCancel is part of this file's API and takes the
// plugin's exception type — re-export it so callers/tests don't import
// the plugin package themselves.
export 'package:google_sign_in/google_sign_in.dart'
    show GoogleSignInException, GoogleSignInExceptionCode;

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
      debugPrint(
        'google_sign_in: exception code=${e.code} desc=${e.description} details=${e.details}',
      );
      if (googleSignInIsUserCancel(e)) return null;
      rethrow;
    }
  }
}

/// True only for a genuine user cancel. "[16] Account reauth failed"
/// arrives under `canceled` but is a configuration failure — the Android
/// app isn't registered in the server client's Google Cloud project. A
/// silent return would misreport it as user intent; surface it as a
/// real error.
bool googleSignInIsUserCancel(GoogleSignInException e) =>
    e.code == GoogleSignInExceptionCode.canceled &&
    !(e.description ?? '').contains('[16]');
