import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:screen_protector/screen_protector.dart';

import 'fintech/fintech_shell.dart';

/// Dev-only escape hatch: `--dart-define=MF_ALLOW_CAPTURE=true` skips the
/// screenshot shield so QA can capture screens on a debug build.
const _kAllowCapture = bool.fromEnvironment('MF_ALLOW_CAPTURE');

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF080B14),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  if (!_kAllowCapture) {
    unawaited(_protectWindowBestEffort());
  }
  runApp(const FintechApp());
}

Future<void> _protectWindowBestEffort() async {
  try {
    await ScreenProtector.preventScreenshotOn();
  } catch (_) {
    // Unsupported platform/emulator keeps running cleanly.
  }
}
