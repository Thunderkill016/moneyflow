import 'package:flutter/services.dart';

/// Action value carried by MainActivity's `quick` intent extra — the
/// launcher shortcut and the home-screen widget both send this to mean
/// "open the capture form".
const kQuickActionCapture = 'capture';

/// The widget's "Chờ duyệt" row sends this to mean "open the inbox"
/// (D18) — the review queue the count on that row tallies. The Kotlin
/// allowlist (QuickActionContract) must carry the same literal.
const kQuickActionReview = 'review';

/// Intent-extra seam for one-tap entry points (launcher shortcut,
/// home-screen widget). Mirrors [ShareIntentReceiver]'s contract:
/// cold-start actions arrive through [consumeInitialAction], warm ones
/// through [stream]. Tests inject a fake instead of the channel pair.
abstract class QuickActionSource {
  const QuickActionSource();

  /// Action delivered by the launch intent, consumed once — subsequent
  /// calls return null until a new action arrives.
  Future<String?> consumeInitialAction();

  /// Actions delivered while the app is already running.
  Stream<String> stream();
}

/// Platform-backed source bridging MainActivity: the MethodChannel
/// answers the pending cold-start action; the EventChannel streams
/// `onNewIntent` deliveries (singleTop warm path).
class QuickActionReceiver extends QuickActionSource {
  const QuickActionReceiver();

  static const _method = MethodChannel('app.moneyflow/quick_action');
  static const _stream = EventChannel('app.moneyflow/quick_action_stream');

  @override
  Future<String?> consumeInitialAction() async {
    try {
      return await _method.invokeMethod<String>('consumeQuickAction');
    } on MissingPluginException {
      return null; // non-Android or plugin not registered
    }
  }

  @override
  Stream<String> stream() =>
      _stream.receiveBroadcastStream().where((e) => e is String).cast<String>();
}
