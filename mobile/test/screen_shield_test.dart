import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/screen_shield.dart';

void main() {
  test('ScreenShield.protect invokes the platform shield', () async {
    var applied = 0;
    await ScreenShield.protect(apply: () async => applied++);
    expect(applied, 1);
  });

  test('ScreenShield.protect swallows platform failures', () async {
    // Emulators/devices without FLAG_SECURE support must never crash
    // app start — the shield degrades to off.
    await ScreenShield.protect(apply: () async => throw Exception('nope'));
  });

  testWidgets('the real plugin call resolves even when unsupported', (t) async {
    // Mock the plugin channel to answer like a device without the
    // feature — protect() must still complete and must not throw.
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    const channel = MethodChannel('screen_protector');
    messenger.setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'preventScreenshotOn') {
        throw MissingPluginException('no handler');
      }
      return null;
    });
    addTearDown(() => messenger.setMockMethodCallHandler(channel, null));

    await ScreenShield.protect();
  });
}
