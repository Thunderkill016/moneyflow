import 'dart:async';

import 'package:flutter/material.dart';

import 'app/app.dart';
import 'app/screen_shield.dart';

/// Dev-only escape hatch: `--dart-define=MF_ALLOW_CAPTURE=true` skips the
/// screenshot shield so QA can capture screens on a debug build. Never set
/// in release; the flag defaults to protected.
const _kAllowCapture = bool.fromEnvironment('MF_ALLOW_CAPTURE');

/// Dev-only demo entry: `--dart-define=MF_ALLOW_DEMO=true` surfaces the
/// "Xem bản demo" button so QA can inspect screens without credentials.
/// Defaults off — shipped builds never offer the demo gate.
const _kAllowDemo = bool.fromEnvironment('MF_ALLOW_DEMO');

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Ledger screens are sensitive: block screenshots/screen recording
  // app-wide (FLAG_SECURE). Best-effort — never blocks startup.
  if (!_kAllowCapture) unawaited(ScreenShield.protect());
  runApp(const MoneyFlowApp(allowDemo: _kAllowDemo));
}
