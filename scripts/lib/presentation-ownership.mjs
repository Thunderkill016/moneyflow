/**
 * Ownership semantics for `check:code-css-ownership`.
 *
 * Pure, so the negative contracts can drive it with CSS fixtures instead of
 * needing a production build.
 *
 * The rule that matters
 * ---------------------
 * A selector certifies a class only if it can match that class *without*
 * requiring another application class the checker has not proven.
 *
 *   .secondary-button              certifies      (nothing else required)
 *   .secondary-button:hover        certifies      (pseudo-class, not a class)
 *   html[data-theme="dark"] .x     certifies      (element + attribute)
 *   @media (...) { .x { } }        certifies      (at-rule condition)
 *   .dashboardHash .secondary-button   does NOT   (needs an unproven ancestor)
 *   .x.is-active                       does NOT   (needs a second class)
 *
 * The last two are the false green this module exists to remove: a class styled
 * only beneath a hashed dashboard ancestor is not styled for the empty-state,
 * reconciliation, capture and route-error surfaces that emit it elsewhere.
 *
 * Proving a contextual owner would mean proving every emission site renders
 * under the required ancestor. That needs a component/route graph this PR
 * deliberately does not build, so contextual owners are reported as
 * CONTEXTUAL_UNPROVEN. A false positive is recoverable; a false green is the
 * defect being fixed.
 */

/** Unescape a CSS identifier: `hover\:bg-muted` → `hover:bg-muted`. */
export function unescapeCssIdent(value) {
  return value.replace(/\\(.)/g, "$1");
}

/**
 * Class tokens in one complex selector, in source order.
 * Escapes are honoured so Tailwind's variant utilities survive intact.
 */
export function selectorClassTokens(selector) {
  const tokens = [];
  for (const match of selector.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)) {
    tokens.push(unescapeCssIdent(match[1]));
  }
  return tokens;
}

/** Split a selector list on top-level commas, ignoring commas inside (), [] and strings. */
export function splitSelectorList(selectorList) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = "";
  for (let i = 0; i < selectorList.length; i += 1) {
    const char = selectorList[i];
    if (quote) {
      current += char;
      if (char === quote && selectorList[i - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Owner candidates for one selector.
 *
 * `unconditional` is true only when the token is the sole class in the whole
 * complex selector. Everything else about the selector — elements, attributes,
 * pseudo-classes, pseudo-elements, combinators, and any enclosing at-rule — is
 * allowed, because none of them requires another application class.
 */
export function ownerCandidatesForSelector(selector, context = {}) {
  const tokens = selectorClassTokens(selector);
  const distinct = new Set(tokens);
  return [...distinct].map((token) => ({
    token,
    selector,
    stylesheet: context.stylesheet ?? null,
    conditionalContext: context.conditionalContext ?? null,
    unconditionalForToken: distinct.size === 1,
    sourceKind: context.sourceKind ?? "bundle",
  }));
}

/**
 * Fold owner candidates into the two proven-ownership sets plus the contextual
 * evidence we refuse to treat as ownership.
 */
export function indexOwnerCandidates(candidates) {
  const unconditional = new Set();
  const contextual = new Map();
  const variantPrefixes = new Set();

  for (const candidate of candidates) {
    if (candidate.unconditionalForToken) {
      unconditional.add(candidate.token);
    } else {
      if (!contextual.has(candidate.token)) contextual.set(candidate.token, []);
      contextual.get(candidate.token).push(candidate.selector);
    }
  }

  /*
   * The source scanner splits `hover:bg-muted` into `hover` and `bg-muted`.
   * When the bundle unconditionally owns the full utility, the emitted string
   * really is styled, so the tail counts as owned and the head is recorded as a
   * variant prefix rather than a class. This only applies to tokens containing
   * `:`, which application class names do not.
   */
  const utilityTails = new Set();
  for (const token of unconditional) {
    const lastColon = token.lastIndexOf(":");
    if (lastColon === -1) continue;
    utilityTails.add(token.slice(lastColon + 1));
    for (const segment of token.slice(0, lastColon).split(":")) variantPrefixes.add(segment);
  }

  /*
   * The source tokenizer also splits on `.` and `/`, so a fractional or opacity
   * utility arrives in pieces: `gap-0.5` becomes `gap-0`, `bg-black/50` becomes
   * `bg-black`, `-translate-y-1/2` becomes `-translate-y-1`.
   *
   * Those fragments are not classes anyone emits. Resolving them by asking
   * whether a bare `.gap-0` rule happens to exist made the gate flap between
   * otherwise identical builds, so they are resolved against the owner they were
   * truncated from instead.
   */
  const utilityFragments = new Set();
  for (const token of [...unconditional, ...utilityTails]) {
    for (let i = 0; i < token.length; i += 1) {
      if (token[i] === "." || token[i] === "/") utilityFragments.add(token.slice(0, i));
    }
  }

  return { unconditional, utilityTails, utilityFragments, contextual, variantPrefixes };
}

/** Compound semantic name vs bare token — see the gate for why they differ. */
export function isConfirmedSemantic(token) {
  return token.includes("-") && token.length > 3;
}

export const NOT_PRESENTATION = new Map([
  ["undefined", "a class builder stringified a missing value"],
  ["null", "same as undefined"],
  ["true", "a boolean leaked through a class builder"],
  ["false", "a boolean leaked through a class builder"],
]);

/**
 * Classify every emitted token against the owner index.
 * `runtimePrefixes` are the finite dynamic families the source scanner resolved.
 */
export function classifyEmittedTokens(emitted, index, runtimePrefixes = []) {
  const buckets = {
    ownedUnconditional: [],
    ownedUtility: [],
    variantPrefix: [],
    contextualUnproven: [],
    dynamic: [],
    notPresentation: [],
    confirmedUnowned: [],
    unknown: [],
  };

  for (const token of [...emitted].sort()) {
    if (NOT_PRESENTATION.has(token)) buckets.notPresentation.push(token);
    else if (index.unconditional.has(token)) buckets.ownedUnconditional.push(token);
    else if (index.utilityTails.has(token)) buckets.ownedUtility.push(token);
    else if (index.utilityFragments.has(token)) buckets.ownedUtility.push(token);
    else if (index.variantPrefixes.has(token)) buckets.variantPrefix.push(token);
    else if (index.contextual.has(token)) buckets.contextualUnproven.push(token);
    else if (runtimePrefixes.some((prefix) => token.startsWith(prefix))) buckets.dynamic.push(token);
    else if (isConfirmedSemantic(token)) buckets.confirmedUnowned.push(token);
    else buckets.unknown.push(token);
  }

  return buckets;
}

/**
 * Everything the gate must fail on.
 *
 * `contextualUnproven` counts as debt: the class is emitted somewhere the
 * required ancestor is not proven, which is exactly the reported defect.
 */
export function violationsFrom(buckets) {
  return [...buckets.contextualUnproven, ...buckets.confirmedUnowned, ...buckets.unknown].sort();
}

/**
 * Shrink-only, measured against approved history rather than the mutable file
 * in the working tree.
 *
 * Without the `approved` set, a branch could add a broken class and a matching
 * allowance in one commit and stay green — which is how the previous version
 * failed.
 */
export function auditBaseline({ violations, currentBaseline, approvedBaseline }) {
  const violationSet = new Set(violations);
  const current = new Set(currentBaseline);
  const approved = approvedBaseline === null ? null : new Set(approvedBaseline);

  return {
    unexpected: violations.filter((token) => !current.has(token)),
    stale: [...current].filter((token) => !violationSet.has(token)).sort(),
    added: approved === null ? [] : [...current].filter((token) => !approved.has(token)).sort(),
    removed: approved === null ? [] : [...approved].filter((token) => !current.has(token)).sort(),
  };
}
