import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { reconciliationImportEvidenceLabel } from "./reconciliation-import-evidence.ts";

const workspace = readFileSync(
  "src/components/transactions/transactions-workspace.tsx",
  "utf8",
);
const workspaceCss = readFileSync(
  "src/components/transactions/transactions-workspace.module.css",
  "utf8",
);
const transactionsRoute = readFileSync(
  "src/app/transactions/page.tsx",
  "utf8",
);
const importEvidenceServer = readFileSync(
  "src/server/reconciliation-import-evidence.ts",
  "utf8",
);

/** First rule block for a selector — base declarations precede media overrides. */
function cssRule(selector: string) {
  const escaped = selector.replace(/\./g, "\\.");
  const match = workspaceCss.match(
    new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m"),
  );
  assert.ok(match, `CSS rule for ${selector} must exist`);
  return match[1]!;
}

/** Slice from a media query to the next one so per-breakpoint pins stay honest. */
function mediaBlock(query: string) {
  const start = workspaceCss.indexOf(`@media ${query}`);
  assert.ok(start >= 0, `media block ${query} must exist`);
  const rest = workspaceCss.slice(start);
  const next = rest.indexOf("@media", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

test("day headers stick below the measured shell topbar with the viewport as the only scroll owner", () => {
  const manager = cssRule(".manager");
  // overflow:hidden would make .manager a scroll container and freeze the
  // sticky headers inside it; clip keeps the corner rounding only.
  assert.match(manager, /overflow:\s*clip/);
  assert.doesNotMatch(manager, /overflow:\s*hidden/);
  // 64px is the measured desktop .topbar min-height (app-shell.module.css).
  assert.match(manager, /--mf-ledger-sticky-top:\s*64px/);

  const dayHeader = cssRule(".dayHeader");
  assert.match(dayHeader, /position:\s*sticky/);
  assert.match(dayHeader, /top:\s*var\(--mf-ledger-sticky-top\)/);
  assert.match(dayHeader, /z-index:\s*var\(--z-sticky\)/);
  // Opaque surface so rows never bleed through while scrolling underneath.
  assert.match(dayHeader, /background:\s*var\(--mf-surface-muted\)/);
  assert.doesNotMatch(dayHeader, /color-mix|transparent/);
  assert.match(dayHeader, /border-bottom:\s*1px solid/);

  // Mobile: the shell topbar paints 62px + safe-area-inset-top, and the old
  // static opt-out is gone — sticky works on every viewport now.
  const mobile = mediaBlock("(max-width: 760px)");
  const mobileManager = mobile.match(/\.manager\s*\{([^}]*)\}/);
  assert.ok(mobileManager, "mobile .manager override must exist");
  assert.match(
    mobileManager[1]!,
    /--mf-ledger-sticky-top:\s*calc\(62px \+ env\(safe-area-inset-top, 0px\)\)/,
  );
  assert.doesNotMatch(mobile, /\.dayHeader\s*\{[^}]*position:\s*static/);

  // Keyboard row focus (scrollIntoView + browser focus-scroll) must land
  // below the stuck header, not behind it.
  assert.match(cssRule(".row"), /scroll-margin-top:\s*calc\(var\(--mf-ledger-sticky-top\) \+ 54px\)/);
  assert.match(
    workspaceCss,
    /\.manager \.row :focus\s*\{[^}]*scroll-margin-top:\s*calc\(var\(--mf-ledger-sticky-top\) \+ 54px\)/,
  );
});

test("imported rows render an honest muted provenance subtitle from the shared evidence map", () => {
  // The page feeds the workspace the same server evidence map reconciliation
  // uses — keyed by transaction_id, never a fabricated default.
  assert.match(transactionsRoute, /getReconciliationImportEvidence/);
  assert.match(transactionsRoute, /importEvidence=\{importEvidence\}/);

  assert.match(workspace, /importEvidence\?:\s*ReconciliationImportEvidenceData/);
  assert.match(workspace, /importEvidence\?\.byTransactionId\[transaction\.id\]/);
  assert.match(workspace, /reconciliationImportEvidenceLabel\(provenance\)/);
  assert.match(workspace, /styles\.rowProvenance/);
  assert.match(workspace, /data-slot="ledger-row-provenance"/);
  // No invented source: rows without evidence render nothing, and the row
  // never claims "Nhập tay" on its own.
  assert.doesNotMatch(workspace, /Nhập tay/);

  const provenance = cssRule(".detail > .rowProvenance");
  assert.match(provenance, /color:\s*var\(--mf-text-soft\)/);
  assert.doesNotMatch(provenance, /overflow:\s*hidden|line-clamp/);

  // The server schema mirrors the live enum — 'agent' exists since
  // 20260920120000, so an agent-sourced row cannot fail the whole read.
  assert.match(
    importEvidenceServer,
    /source:\s*z\.enum\(\[[\s\S]*"email",[\s\S]*"agent",?[\s\S]*\]\)/,
  );
});

test("provenance labels stay honest for every source the helper knows", () => {
  assert.equal(
    reconciliationImportEvidenceLabel({
      source: "csv",
      sourceRowIndex: 2,
      originalDescription: "TRF",
      importBatchId: null,
    }),
    "CSV · dòng 3",
  );
  assert.equal(
    reconciliationImportEvidenceLabel({
      source: "agent",
      sourceRowIndex: null,
      originalDescription: "",
      importBatchId: null,
    }),
    "AI agent",
  );
});

test("uppercase Vietnamese labels keep enough line-height for stacked marks", () => {
  // Ố/Ứ-style stacked diacritics at 10–12px clip when the line box is tight.
  for (const selector of [".eyebrow", ".summaryItem p", ".listHeader"]) {
    const rule = cssRule(selector);
    assert.match(rule, /text-transform:\s*uppercase/, `${selector} is an uppercase label`);
    assert.match(rule, /line-height:\s*1\.4/, `${selector} keeps 1.4 line-height`);
    assert.doesNotMatch(
      rule,
      /overflow:\s*hidden|line-clamp/,
      `${selector} must not clamp Vietnamese text`,
    );
  }
});
