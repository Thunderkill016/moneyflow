import 'package:flutter/services.dart';

/// Bridges the MainActivity ACTION_SEND handler: cold-start shares arrive
/// through [consumeInitialShare], warm shares through [stream].
class ShareIntentReceiver {
  const ShareIntentReceiver();

  static const _method = MethodChannel('app.moneyflow/share_text');
  static const _stream = EventChannel('app.moneyflow/share_stream');

  /// Text shared into the app while it was not running. Consumed once —
  /// subsequent calls return null until a new share arrives.
  Future<String?> consumeInitialShare() async {
    try {
      return await _method.invokeMethod<String>('consumeSharedText');
    } on MissingPluginException {
      return null; // non-Android or plugin not registered
    }
  }

  /// Text shared while the app is already running.
  Stream<String> stream() =>
      _stream.receiveBroadcastStream().where((e) => e is String).cast<String>();
}
