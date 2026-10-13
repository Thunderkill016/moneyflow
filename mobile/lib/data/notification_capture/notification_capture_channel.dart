// Platform-channel seam for the Android notification-listener pilot.
// [NotificationCaptureChannel] is the production bridge to MainActivity +
// NotificationCaptureService; tests substitute the abstract gateway so the
// whole pipeline runs without a device.

import 'package:flutter/services.dart';

/// One whitelisted notification event as forwarded by the listener service —
/// the map keys are the Kotlin side's contract.
class RawBankNotification {
  const RawBankNotification({
    required this.packageName,
    required this.sourceLabel,
    required this.title,
    required this.text,
    required this.postTimeMs,
  });

  factory RawBankNotification.fromMap(Map<Object?, Object?> map) =>
      RawBankNotification(
        packageName: map['packageName'] as String? ?? '',
        sourceLabel: map['sourceLabel'] as String? ?? '',
        title: map['title'] as String? ?? '',
        text: map['text'] as String? ?? '',
        postTimeMs: (map['postTime'] as num?)?.toInt() ?? 0,
      );

  final String packageName;
  final String sourceLabel;
  final String title;
  final String text;
  final int postTimeMs;
}

/// Everything the capture pipeline needs from the platform. Every method
/// fails soft — a device without the engine-side channel (wrong platform,
/// plugin not registered) answers with the disabled/empty default, never an
/// exception the caller must special-case.
abstract class NotificationCaptureGateway {
  const NotificationCaptureGateway();

  /// True only when the OS-level Notification Access switch is on — there
  /// is no runtime prompt, this is the only honest signal.
  Future<bool> isAccessEnabled();

  /// Deep-link into the system Notification Access screen. False when the
  /// device exposes no handler.
  Future<bool> openAccessSettings();

  /// Display labels of the whitelisted bank/wallet packages — the honest
  /// coverage list the settings sheet shows.
  Future<List<String>> supportedSources();

  /// Events parked while Dart was detached — returned once, then cleared
  /// on the Kotlin side.
  Future<List<RawBankNotification>> consumePending();

  /// Live events while Dart is attached.
  Stream<RawBankNotification> stream();

  /// Drop every parked event (sign-out / data wipe — raw notification text
  /// must not outlive the account it was captured for).
  Future<void> clearPending();
}

class NotificationCaptureChannel extends NotificationCaptureGateway {
  const NotificationCaptureChannel();

  static const _method = MethodChannel('app.moneyflow/notification_capture');
  static const _stream = EventChannel(
    'app.moneyflow/notification_capture_stream',
  );

  Future<T?> _call<T>(String method) async {
    try {
      return await _method.invokeMethod<T>(method);
    } on MissingPluginException {
      return null;
    } on PlatformException {
      return null;
    }
  }

  @override
  Future<bool> isAccessEnabled() async =>
      await _call<bool>('isAccessEnabled') ?? false;

  @override
  Future<bool> openAccessSettings() async =>
      await _call<bool>('openAccessSettings') ?? false;

  @override
  Future<List<String>> supportedSources() async =>
      (await _call<List<Object?>>(
        'supportedSources',
      ))?.whereType<String>().toList() ??
      const [];

  @override
  Future<List<RawBankNotification>> consumePending() async =>
      (await _call<List<Object?>>('consumePendingCaptures'))
          ?.whereType<Map<Object?, Object?>>()
          .map(RawBankNotification.fromMap)
          .toList() ??
      const [];

  @override
  Stream<RawBankNotification> stream() => _stream
      .receiveBroadcastStream()
      .where((e) => e is Map)
      .map(
        (e) => RawBankNotification.fromMap((e as Map).cast<Object?, Object?>()),
      );

  @override
  Future<void> clearPending() async {
    await _call<bool>('clearPendingCaptures');
  }
}
