#!/usr/bin/env node
/*
 * #403 attribution reporter.
 *
 * Reads the two arms produced by the dispatch-only attribution workflow and
 * prints one comparison. It deliberately reports a mode split rather than a
 * single central value: `docs/performance-budgets.md` records that `/dashboard`
 * FCP is bimodal, and a mean or median over mixed modes reports whichever mode
 * happened to dominate that run.
 *
 * It draws no conclusion about budgets. The Playwright arm runs unthrottled on
 * loopback, so its absolute milliseconds are not comparable to the Lighthouse
 * mobile tables; only the split between arms carries meaning.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "output", "playwright-auth", "performance");
const ARMS = ["with-boundary", "no-boundary"];

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

function fmt(value, digits = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : "—";
}

/* An empty arm should read as one dash, not as a range between two dashes. */
function range(min, max, unit = " ms") {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "—";
  return min === max ? `${fmt(min)}${unit}` : `${fmt(min)}–${fmt(max)}${unit}`;
}

const report = { arms: {}, missing: [] };

for (const arm of ARMS) {
  const lighthouse = readJson(join(DIR, `lighthouse-summary-${arm}.json`));
  const attribution = readJson(join(DIR, `attribution-${arm}.json`));
  if (!lighthouse) report.missing.push(`lighthouse-summary-${arm}.json`);
  if (!attribution) report.missing.push(`attribution-${arm}.json`);
  report.arms[arm] = { lighthouse, attribution };
}

const lines = ["# #403 FCP attribution report", ""];

if (report.missing.length > 0) {
  lines.push(
    `**Incomplete run.** Missing artifacts: ${report.missing.join(", ")}. Any comparison below is partial and must not be read as a result.`,
    "",
  );
}

lines.push(
  "## Mechanism — did the loading boundary paint? (Playwright, unthrottled loopback)",
  "",
  "| Arm | Boundary in tree | Navigations | Boundary text seen | FCP when seen (min–max) | FCP when not seen (min–max) |",
  "|---|---|---|---|---|---|",
);

for (const arm of ARMS) {
  const a = report.arms[arm].attribution;
  if (!a) {
    lines.push(`| \`${arm}\` | — | — | — | — | — |`);
    continue;
  }
  const seen = a.modeSplit.loadingTextObserved;
  const unseen = a.modeSplit.loadingTextNotObserved;
  lines.push(
    `| \`${arm}\` | ${a.arm.loadingBoundaryPresent ? "present" : "absent"} | ${a.method.navigations} | ${seen.navigations} of ${a.method.navigations} | ${range(seen.fcpMinMs, seen.fcpMaxMs)} | ${range(unseen.fcpMinMs, unseen.fcpMaxMs)} |`,
  );
}

lines.push(
  "",
  "The attribution holds only if the boundary text is seen **exclusively** in the arm that contains it, and the low FCP mode occurs **only** on the navigations where it was seen. Anything else means the early paint is not the boundary.",
  "",
  "## Timing distribution (Lighthouse, mobile simulate)",
  "",
  "| Arm | Route | Samples | LCP median | LCP range | FCP min–max | Script bytes |",
  "|---|---|---|---|---|---|---|",
);

for (const arm of ARMS) {
  const l = report.arms[arm].lighthouse;
  if (!l) {
    lines.push(`| \`${arm}\` | — | — | — | — | — | — |`);
    continue;
  }
  for (const route of l.routes ?? []) {
    const fcpValues = (route.samples ?? [])
      .map((s) => s.fcpMs)
      .filter((v) => typeof v === "number" && Number.isFinite(v));
    lines.push(
      `| \`${arm}\` | \`${route.route}\` | ${route.iterations} | ${fmt(route.median.lcpMs)} ms | ${fmt(route.spread.lcpMs?.range)} ms | ${fcpValues.length ? range(Math.min(...fcpValues), Math.max(...fcpValues)) : "—"} | ${route.median.scriptTransferredBytes ?? "—"} B |`,
    );
  }
}

lines.push(
  "",
  "Read LCP against its own range before calling any difference real. Script bytes are the only metric this harness has shown to be stable across runs.",
  "",
);

const markdown = lines.join("\n");
writeFileSync(join(DIR, "attribution-report.md"), markdown, "utf8");
writeFileSync(
  join(DIR, "attribution-report.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);
process.stdout.write(`${markdown}\n`);

if (report.missing.length > 0) {
  process.exitCode = 1;
}
