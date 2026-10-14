// Recurring-pattern detection over the loaded ledger — port of
// src/lib/planning/recurring-detection.ts (Stage-1 slice) with the mobile
// work-package knobs: >=3 day-coherent occurrences spanning >=2 distinct
// calendar months, day-of-month agreement within +-2 of the median day,
// at most 3 suggestions, and a ~6-month lookback the caller loads via
// loadTransactionsInRange (never the capped recent feed).
//
// Commitments are declared by hand; this module only suggests — nothing
// here writes to the ledger, and every suggestion is one tap away from a
// permanent dismissal.
//
// One deterministic grouping (same contract as the web): rows group on
// `expense|<normalized name text>` where the name text is the note when
// non-blank, else the payee — bank-imported rows often carry a payee and
// no note, and skipping them would miss the canonical recurring bill.
// Category, account and amount deliberately stay OUT of the key: amounts
// drift inside a tolerance (electricity bills vary monthly) and a bill's
// funding account can change without making it a different pattern. The
// false-positive guards live in the chain/day/density checks below, not
// in the grouping key — exactly like the web.

import 'models.dart';
import 'report.dart' show daysBetween, parseYmd, ymd;

/// Smallest coherent run a pattern needs — the task's `>=3 occurrences`.
const minRecurringOccurrences = 3;

/// Distinct calendar months the coherent run must span (task contract).
/// In practice >=3 occurrences spaced like a monthly bill land in three
/// months anyway; the explicit bound just makes the rule readable.
const minRecurringMonths = 2;

/// Circular day-of-month slack around the median day (task: +-2).
/// Circular means 31 vs 2 reads as 3 days, not 29 — month-end aware.
const dueDayWindowDays = 2;

/// +-10% around the median amount, applied as an integer floor (web rule —
/// utilities fluctuate; an exact-amount gate would miss them all).
const amountTolerancePercent = 10;

/// Nearer than this reads as the same billing cycle, not the next one.
const minChainGapDays = 23;

/// Farther than this means a cycle was skipped — the chain breaks.
const maxChainGapDays = 45;

/// Roughly two monthly cycles; a pattern that stopped longer ago is dead.
const recencyWindowDays = 62;

/// Bounded card list on Tổng quan (task: top 3).
const maxRecurringSuggestions = 3;

/// Ledger lookback the caller loads for detection (task: ~6 months).
const recurringDetectionWindowMonths = 6;

const _daysInLongestMonth = 31;

/// A detected pattern the user may declare as a recurring commitment.
/// Advisory only — creating, editing or deleting a commitment always goes
/// through the explicit planning actions.
class RecurringSuggestion {
  const RecurringSuggestion({
    required this.key,
    required this.name,
    required this.normalizedName,
    required this.categoryId,
    required this.accountId,
    required this.amount,
    required this.dayOfMonth,
    required this.lastSeen,
    required this.occurrenceCount,
    required this.months,
  });

  /// Stable dismissal key — 8-hex FNV-1a of `expense|<normalized name>`,
  /// amount-insensitive so a pattern keeps its key while prices drift.
  final String key;

  /// Display name + dialog prefill: the newest occurrence's note with its
  /// "tháng N" marker removed, or its payee when the note is blank.
  final String name;

  /// The normalized text the pattern grouped on.
  final String normalizedName;

  /// Newest coherent occurrence's ids — the prefill's starting pickers.
  final String categoryId;
  final String accountId;

  /// Median amount of the coherent occurrences — always an observed
  /// integer-đồng value, never an average.
  final int amount;

  /// Median day-of-month of the coherent occurrences (the task's median
  /// rule, lower median for even counts).
  final int dayOfMonth;

  /// Newest coherent occurrence, YYYY-MM-DD.
  final String lastSeen;

  /// Occurrences supporting the suggestion.
  final int occurrenceCount;

  /// Distinct 'YYYY-MM' buckets of the coherent run, ascending.
  final List<String> months;
}

/// First ledger date detection can use: day 1 of the month
/// [recurringDetectionWindowMonths]-1 before [today]'s month.
String recurringDetectionStart(DateTime today) {
  final start = DateTime(
    today.year,
    today.month - (recurringDetectionWindowMonths - 1),
    1,
  );
  return ymd(start);
}

/// Commitment-suppression key on the normalized name — a commitment the
/// user already named "Tiền điện" covers a "tiền điện tháng N" pattern.
String recurringNameKey(String rawName) => 'n|${recurringPatternText(rawName)}';

/// Commitment-suppression key on the declared (category, account, amount)
/// triple — covers rows matching a commitment the user named differently.
String recurringCoverageKey({
  required String categoryId,
  required String accountId,
  required int amountMinor,
}) => 'c|$categoryId|$accountId|$amountMinor';

/// The keys under which an active commitment suppresses suggestions.
/// Callers pass `commitments.where((c) => !c.isArchived)` through this —
/// archived rows declare nothing (web rule).
Set<String> recurringCommitmentKeys(RecurringCommitment c) => {
  if (recurringPatternText(c.name).isNotEmpty) recurringNameKey(c.name),
  recurringCoverageKey(
    categoryId: c.categoryId,
    accountId: c.accountId,
    amountMinor: c.amountMinor,
  ),
};

/// Pattern grouping text: lowercase, punctuation collapsed to spaces, and
/// "tháng N" / "thang N YYYY" month markers removed — the common
/// Vietnamese recurring-bill shape ("Tiền điện tháng 8") that would make
/// every month a different key. Diacritics are NOT folded (no NFD in
/// dart:core): "tiền" and "tien" stay separate — a missed merge is safe,
/// a false merge is a wrong suggestion.
String recurringPatternText(String raw) => _normalizeDesc(raw)
    .replaceAll(RegExp(r'\bth[aá]ng \d{1,2}( \d{4})?\b'), ' ')
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();

String _normalizeDesc(String value) => value
    .toLowerCase()
    .replaceAll(RegExp(r'[^\p{L}\p{N}]+', unicode: true), ' ')
    .trim()
    .replaceAll(RegExp(r'\s+'), ' ');

/// 8-hex FNV-1a over UTF-16 code units — same digest shape as the web's
/// fnv1aHex, so dismissal keys read identically across surfaces.
String _fnv1aHex(String input) {
  var hash = 0x811c9dc5;
  for (var i = 0; i < input.length; i++) {
    hash ^= input.codeUnitAt(i);
    hash = (hash * 0x01000193) & 0xFFFFFFFF;
  }
  return hash.toRadixString(16).padLeft(8, '0');
}

/// Strict YYYY-MM-DD — DateTime parsing would silently roll 2026-02-31
/// into March; detection treats impossible dates as unusable rows.
bool _isValidDateOnly(String s) {
  if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(s)) return false;
  final year = int.parse(s.substring(0, 4));
  final month = int.parse(s.substring(5, 7));
  final day = int.parse(s.substring(8, 10));
  if (month < 1 || month > 12 || day < 1) return false;
  // Day 0 of the next month is the last real day of this one.
  return day <= DateTime(year, month + 1, 0).day;
}

/// Calendar-day distance between two YYYY-MM-DD strings (UTC — DST-safe).
int _dayDiff(String a, String b) => daysBetween(parseYmd(a), parseYmd(b)).abs();

/// Lower median — always an observed value, so amounts stay integer đồng.
int _lowerMedian(List<int> values) {
  final sorted = [...values]..sort();
  return sorted[(sorted.length - 1) ~/ 2];
}

/// Circular distance on a 31-day dial: 31 vs 2 reads as 3 days, not 29.
int _circularDayDiff(int a, int b) {
  final diff = (a - b).abs();
  return diff < _daysInLongestMonth - diff ? diff : _daysInLongestMonth - diff;
}

/// The text a row groups on: its note when the user wrote one, else its
/// payee — payee-only ledger rows still form patterns.
String _groupingText(Transaction tx) =>
    tx.note.trim().isNotEmpty ? tx.note : (tx.payee ?? '');

/// Display name: newest note minus the "tháng N" marker so the prefill
/// reads "Tiền điện" rather than pinning one month into the commitment.
String _suggestedName(Transaction tx) {
  if (tx.note.trim().isEmpty) return (tx.payee ?? '').trim();
  final cleaned = tx.note
      .replaceAll(
        RegExp(r'\bth[aá]ng\s+\d{1,2}(\s+\d{4})?\b', caseSensitive: false),
        ' ',
      )
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  return cleaned.isEmpty ? tx.note.trim() : cleaned;
}

class _Occurrence {
  const _Occurrence(this.tx);
  final Transaction tx;

  /// 'YYYY-MM' bucket.
  String get month => tx.occurredOn.substring(0, 7);
  int get day => int.parse(tx.occurredOn.substring(8, 10));
}

/// Split sorted occurrences into chains of roughly-monthly repeats. A gap
/// below [minChainGapDays] is same-cycle noise and is absorbed without
/// moving the anchor; a gap past [maxChainGapDays] ends the chain.
List<List<_Occurrence>> _buildChains(List<_Occurrence> occurrences) {
  final chains = <List<_Occurrence>>[];
  var current = <_Occurrence>[];
  _Occurrence? anchor;
  for (final occurrence in occurrences) {
    if (anchor == null) {
      current = [occurrence];
      anchor = occurrence;
      continue;
    }
    final gap = _dayDiff(anchor.tx.occurredOn, occurrence.tx.occurredOn);
    if (gap < minChainGapDays) continue;
    if (gap > maxChainGapDays) {
      chains.add(current);
      current = [occurrence];
      anchor = occurrence;
      continue;
    }
    current.add(occurrence);
    anchor = occurrence;
  }
  if (current.isNotEmpty) chains.add(current);
  return chains;
}

/// The day-coherent core of a chain: members within [dueDayWindowDays] of
/// the chain's median day, >= [minRecurringOccurrences] rows spanning >=
/// [minRecurringMonths] distinct months. Null when the chain cannot
/// support a single suggested due day.
List<_Occurrence>? _coherentCore(List<_Occurrence> chain) {
  final months = {for (final o in chain) o.month};
  if (months.length < minRecurringMonths) return null;
  final medianDay = _lowerMedian([for (final o in chain) o.day]);
  final core = chain
      .where((o) => _circularDayDiff(o.day, medianDay) <= dueDayWindowDays)
      .toList();
  if (core.length < minRecurringOccurrences) return null;
  final coreMonths = {for (final o in core) o.month};
  return coreMonths.length >= minRecurringMonths ? core : null;
}

/// Reject chains whose span is too dense to be monthly. Kept members are
/// at least [minChainGapDays] apart, so absorbed same-cycle extras stay
/// allowed up to ~1.5 occurrences per month; weekly activity blows
/// through that bound even though only a few of its rows were kept.
bool _withinDensity(List<_Occurrence> core, List<_Occurrence> inAmount) {
  final months = {for (final o in core) o.month}.length;
  final start = core.first.tx.occurredOn;
  final end = core.last.tx.occurredOn;
  final spanCount = inAmount
      .where(
        (o) =>
            o.tx.occurredOn.compareTo(start) >= 0 &&
            o.tx.occurredOn.compareTo(end) <= 0,
      )
      .length;
  return spanCount <= months + months ~/ 2;
}

/// Detect recurring expense patterns. Deterministic: same input -> same
/// ordered output (last seen desc, occurrence count desc, key asc).
/// [existingCommitmentKeys] comes from [recurringCommitmentKeys] over the
/// active commitments — a covered pattern is never re-suggested.
///
/// Expenses only: income templates exist separately, and the commitment
/// card is the surface this detection feeds.
List<RecurringSuggestion> detectRecurring(
  List<Transaction> transactions,
  Set<String> existingCommitmentKeys, {
  required DateTime today,
}) {
  final todayYmd = ymd(today);

  final groups = <String, List<_Occurrence>>{};
  for (final tx in transactions) {
    if (tx.kind != TransactionKind.expense) continue;
    if (tx.amount <= 0) continue;
    if (!_isValidDateOnly(tx.occurredOn)) continue;
    final normalized = recurringPatternText(_groupingText(tx));
    if (normalized.isEmpty) continue;
    // Name-declared patterns are skipped before any chain work — same
    // early-out the web takes on declaredNames.
    if (existingCommitmentKeys.contains(recurringNameKey(normalized))) {
      continue;
    }
    (groups[normalized] ??= []).add(_Occurrence(tx));
  }

  final suggestions = <RecurringSuggestion>[];
  for (final entry in groups.entries) {
    final normalized = entry.key;
    final occurrences = entry.value;
    if (occurrences.length < minRecurringOccurrences) continue;
    occurrences.sort((a, b) {
      final byDate = a.tx.occurredOn.compareTo(b.tx.occurredOn);
      return byDate != 0 ? byDate : a.tx.id.compareTo(b.tx.id);
    });

    final medianAmount = _lowerMedian([
      for (final o in occurrences) o.tx.amount,
    ]);
    final tolerance = (medianAmount * amountTolerancePercent) ~/ 100;
    final inAmount = occurrences
        .where((o) => (o.tx.amount - medianAmount).abs() <= tolerance)
        .toList();
    if (inAmount.length < minRecurringOccurrences) continue;

    // Best chain = qualifying chain with the newest activity; size and
    // build order break ties so the choice never depends on input order.
    List<_Occurrence>? best;
    for (final chain in _buildChains(inAmount)) {
      final core = _coherentCore(chain);
      if (core == null || !_withinDensity(core, inAmount)) continue;
      final lastSeen = core.last.tx.occurredOn;
      if (best == null ||
          lastSeen.compareTo(best.last.tx.occurredOn) > 0 ||
          (lastSeen == best.last.tx.occurredOn && core.length > best.length)) {
        best = core;
      }
    }
    if (best == null) continue;

    final newest = best.last;
    if (_dayDiff(newest.tx.occurredOn, todayYmd) > recencyWindowDays) {
      continue;
    }

    final amount = _lowerMedian([for (final o in best) o.tx.amount]);
    // A commitment matching the detected (category, account, amount)
    // covers the pattern even when its name doesn't.
    if (existingCommitmentKeys.contains(
      recurringCoverageKey(
        categoryId: newest.tx.categoryId,
        accountId: newest.tx.accountId,
        amountMinor: amount,
      ),
    )) {
      continue;
    }

    suggestions.add(
      RecurringSuggestion(
        key: _fnv1aHex('expense|$normalized'),
        name: _suggestedName(newest.tx),
        normalizedName: normalized,
        categoryId: newest.tx.categoryId,
        accountId: newest.tx.accountId,
        amount: amount,
        dayOfMonth: _lowerMedian([for (final o in best) o.day]),
        lastSeen: newest.tx.occurredOn,
        occurrenceCount: best.length,
        months: {for (final o in best) o.month}.toList()..sort(),
      ),
    );
  }

  suggestions.sort((a, b) {
    final bySeen = b.lastSeen.compareTo(a.lastSeen);
    if (bySeen != 0) return bySeen;
    final byCount = b.occurrenceCount.compareTo(a.occurrenceCount);
    return byCount != 0 ? byCount : a.key.compareTo(b.key);
  });
  return suggestions.take(maxRecurringSuggestions).toList();
}
