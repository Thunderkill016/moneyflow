// Post-write refresh contract — the Data API can serve a pre-write
// snapshot right after a mutation, so each trigger must refresh now AND
// once more after the settle delay, never unboundedly.

import 'package:moneyflow/app/post_write_refresher.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const delay = Duration(milliseconds: 60);

  test('refreshes immediately and once more after the delay', () async {
    var calls = 0;
    final refresher = PostWriteRefresher(delay: delay);
    refresher.call(() => calls++);
    expect(calls, 1);
    await Future<void>.delayed(delay * 3);
    expect(calls, 2);
    refresher.dispose();
  });

  test('a new trigger reschedules the pending follow-up — one wave', () async {
    var calls = 0;
    final refresher = PostWriteRefresher(delay: delay);
    refresher.call(() => calls++);
    refresher.call(() => calls++);
    expect(calls, 2);
    await Future<void>.delayed(delay * 3);
    // Not 4: the burst coalesces into a single trailing re-read.
    expect(calls, 3);
    refresher.dispose();
  });

  test('dispose suppresses the pending follow-up', () async {
    var calls = 0;
    final refresher = PostWriteRefresher(delay: delay);
    refresher.call(() => calls++);
    refresher.dispose();
    await Future<void>.delayed(delay * 3);
    expect(calls, 1);
  });

  test('no second pass when nothing was triggered after the first', () async {
    var calls = 0;
    final refresher = PostWriteRefresher(delay: delay);
    refresher.call(() => calls++);
    await Future<void>.delayed(delay * 4);
    expect(calls, 2);
    refresher.dispose();
  });
}
