// D6 — rule suggestion from repeated corrections (RESEARCH_TOP_FINANCE_APPS
// §10; deterministic ADAPT of YNAB's "two-of-three" payee rule, the same
// substitute the research prescribes for Copilot Intelligence). A manual
// re-categorization of a payee-bearing row is counted per (payee →
// category) pair; once a pair repeats, the app offers a rule DRAFT through
// the shipped edit→rule write path. The counter never auto-applies —
// MoneyFlow law: a suggestion that isn't a user-approved rule must never
// post, and even the prefill only lands on pending candidates a human
// still approves.

import '../data/share/share_text_parser.dart' show foldVietnameseText;
import 'inbox.dart';

/// Identical (payee → category) corrections before the app offers a rule
/// draft. Two agreeing fixes already establish intent — YNAB's
/// two-of-three in deterministic form — while a single fix stays a
/// one-off correction, not a pattern.
const ruleSuggestionThreshold = 2;

/// One pending rule-draft offer: everything the dialog needs to describe
/// the rule it would create, and for the host to build the
/// [InboxRuleDraft] on accept.
class RuleSuggestion {
  const RuleSuggestion({
    required this.payee,
    required this.categoryId,
    required this.times,
  });

  /// The payee as the user typed it — becomes the draft's merchant
  /// contains text verbatim (the server matcher owns casing rules).
  final String payee;
  final String categoryId;

  /// Corrections counted for this pair so far (≥ [ruleSuggestionThreshold]
  /// when an offer is made).
  final int times;
}

/// The pair key a correction is counted under: payee folded the same way
/// the rule matcher reads text (case + diacritics-insensitive), joined to
/// the target category — the category id keeps an expense pairing distinct
/// from an income one and stops "same payee, other category" noise from
/// sharing a counter.
String ruleCorrectionKey(String payee, String categoryId) =>
    '${foldVietnameseText(payee.trim())}|$categoryId';

/// True when an enabled rule would already fire on a future pending
/// candidate whose merchant is [payee] — the same case-insensitive
/// substring the server applies for match_field merchant/any. A covering
/// rule makes an offer pure noise (a duplicate would just shadow or be
/// shadowed by priority), so the suggestion stays quiet.
bool ruleAlreadyCoversPayee(List<InboxRule> rules, String payee) {
  final haystack = payee.trim().toLowerCase();
  if (haystack.isEmpty) return false;
  for (final r in rules) {
    if (!r.enabled) continue;
    if (r.matchField != RuleMatchField.merchant &&
        r.matchField != RuleMatchField.any) {
      continue;
    }
    final needle = r.containsText.trim().toLowerCase();
    if (needle.isNotEmpty && haystack.contains(needle)) return true;
  }
  return false;
}
