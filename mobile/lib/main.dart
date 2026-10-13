import 'dart:async';

import 'package:flutter/material.dart';

import 'app/app.dart';
import 'app/screen_shield.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Ledger screens are sensitive: block screenshots/screen recording
  // app-wide (FLAG_SECURE). Best-effort — never blocks startup.
  unawaited(ScreenShield.protect());
  runApp(const MoneyFlowApp());
}
