import 'dart:async';

import 'package:flutter/material.dart';

/// Extra time granted to the snackbar's own duration before we force-close it,
/// on top of however long the entrance animation takes. The framework's
/// dismiss timer already waits for the entrance to finish; our watchdog only
/// needs to cover a stuck schedule, so a small slack avoids racing it.
const Duration _kWatchdogSlack = Duration(milliseconds: 600);

/// Extra dwell when the device reports accessibility navigation. In that case
/// the framework intentionally never auto-dismisses (screen readers need time),
/// but on devices whose a11y service is a utility rather than a reader the
/// snackbar otherwise stays forever — observed stuck for minutes on a real
/// device. We still dismiss, just after a much longer window.
const Duration _kAccessibleSlack = Duration(seconds: 10);

/// Shows a [SnackBar] that is guaranteed to eventually leave the screen.
///
/// The framework only schedules its internal dismiss timer when the entrance
/// animation completes inside a build while the messenger's own route is
/// current (ScaffoldMessengerState.build), and it never schedules one when
/// `accessibleNavigation` is on. If the snackbar was shown while a dialog or
/// route covered the messenger, or the ticker was muted, the snackbar stays
/// on screen indefinitely. Closing via the returned controller does not depend
/// on that timer, so we schedule our own watchdog.
///
/// In widget tests the watchdog is skipped: FakeAsync treats a live Timer as a
/// pending-timer failure at test end, and test pumps already drive the
/// framework's own timer deterministically.
ScaffoldFeatureController<SnackBar, SnackBarClosedReason> showTimedSnackBar(
  ScaffoldMessengerState messenger,
  SnackBar snackBar,
) {
  final controller = messenger.showSnackBar(snackBar);
  if (WidgetsBinding.instance is! WidgetsFlutterBinding) {
    return controller;
  }
  final accessible =
      MediaQuery.maybeOf(messenger.context)?.accessibleNavigation ?? false;
  final slack = accessible ? _kAccessibleSlack : _kWatchdogSlack;
  Timer(snackBar.duration + slack, () {
    // close() is a no-op if the snackbar already dismissed; messenger.mounted
    // guards against the messenger being disposed before the timer fires.
    if (messenger.mounted) {
      controller.close();
    }
  });
  return controller;
}
