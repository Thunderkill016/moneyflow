import { chromium, expect, test, type TestInfo } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  assertNoUnservedRequests,
  seedServer,
  signIn,
} from "./harness";

const LIGHTHOUSE_VERSION = "13.4.1";
const OUTPUT_DIR = join(process.cwd(), "output", "playwright-auth", "performance");

type LighthouseResult = {
  finalUrl: string;
  categories?: { performance?: { score?: number | null } };
  audits?: Record<
    string,
    {
      numericValue?: number;
      details?: { items?: Array<Record<string, unknown>> };
    }
  >;
};

type MetricSummary = {
  route: "/" | "/dashboard";
  finalUrl: string;
  performanceScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  fcpMs: number | null;
  speedIndexMs: number | null;
  transferredBytes: number | null;
  scriptTransferredBytes: number | null;
};

function numericAudit(result: LighthouseResult, id: string) {
  const value = result.audits?.[id]?.numericValue;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scriptTransferBytes(result: LighthouseResult) {
  const items = result.audits?.["resource-summary"]?.details?.items;
  if (!Array.isArray(items)) return null;
  const script = items.find((item) => item.resourceType === "script");
  const value = script?.transferSize;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function summarize(route: "/" | "/dashboard", result: LighthouseResult): MetricSummary {
  return {
    route,
    finalUrl: result.finalUrl,
    performanceScore:
      typeof result.categories?.performance?.score === "number"
        ? result.categories.performance.score * 100
        : null,
    lcpMs: numericAudit(result, "largest-contentful-paint"),
    cls: numericAudit(result, "cumulative-layout-shift"),
    tbtMs: numericAudit(result, "total-blocking-time"),
    fcpMs: numericAudit(result, "first-contentful-paint"),
    speedIndexMs: numericAudit(result, "speed-index"),
    transferredBytes: numericAudit(result, "total-byte-weight"),
    scriptTransferredBytes: scriptTransferBytes(result),
  };
}

function runLighthouse({
  route,
  url,
  outputName,
  cookieHeader,
}: {
  route: "/" | "/dashboard";
  url: string;
  outputName: string;
  cookieHeader?: string;
}) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = join(OUTPUT_DIR, `${outputName}.json`);
  const extraHeadersPath = join(OUTPUT_DIR, `${outputName}-headers.json`);
  const args = [
    "--yes",
    `lighthouse@${LIGHTHOUSE_VERSION}`,
    url,
    "--only-categories=performance",
    "--form-factor=mobile",
    "--screenEmulation.mobile",
    "--throttling-method=simulate",
    "--output=json",
    `--output-path=${outputPath}`,
    "--quiet",
    "--chrome-flags=--headless=new --no-sandbox",
  ];

  if (cookieHeader) {
    writeFileSync(extraHeadersPath, JSON.stringify({ Cookie: cookieHeader }), "utf8");
    args.push(`--extra-headers=${extraHeadersPath}`);
  }

  const run = spawnSync("npx", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      CHROME_PATH: chromium.executablePath(),
    },
    timeout: 180_000,
  });

  if (run.status !== 0) {
    /*
     * Lighthouse has runtime failures that are about Lighthouse, not about the
     * page — NO_NAVSTART ("Something went wrong with recording the trace over
     * your page load. Please run Lighthouse again.") is the common one, and its
     * own message tells you to retry.
     *
     * This harness records evidence; it is not a gate. Letting a third-party
     * tool's flake fail the whole Browser-smoke shard blocks delivery of changes
     * that have nothing to do with performance, which costs far more than the
     * sample is worth. So a failed pass returns null and the caller drops it.
     * A route that produces no usable sample at all still fails loudly.
     */
    return null;
  }

  const result = JSON.parse(readFileSync(outputPath, "utf8")) as LighthouseResult;
  return { outputPath, summary: summarize(route, result) };
}

/*
 * A single Lighthouse pass cannot support a before/after conclusion here. The
 * #403 baseline and candidate runs differed by +471 ms of LCP on `/` while `/`
 * had byte-identical script payload, i.e. the run-to-run spread was several
 * times larger than the dashboard difference being claimed. So each route is
 * sampled ITERATIONS times and reported as a median with its observed spread;
 * a reader can then see whether a difference clears the noise floor instead of
 * trusting one sample.
 *
 * Three is the routine Browser-smoke budget and is still too few to settle a
 * small LCP difference — see `docs/performance-budgets.md`. The #403 attribution
 * workflow raises it through `PERF_SAMPLES` rather than making every pull request
 * pay for a bigger sample. An invalid or absent value falls back to 3 instead of
 * silently sampling once.
 */
function resolveIterations(): number {
  const raw = Number.parseInt(process.env.PERF_SAMPLES ?? "", 10);
  return Number.isInteger(raw) && raw > 0 ? raw : 3;
}

const ITERATIONS = resolveIterations();

/*
 * The attribution workflow runs the same harness twice on one runner, once with
 * the `/dashboard` loading boundary present and once without it, so each arm
 * needs its own summary filename. Empty in ordinary runs, which keeps the
 * existing `lighthouse-summary.json` path that CI artifacts already reference.
 */
const ARM = (process.env.PERF_ARM ?? "").replace(/[^a-z0-9-]/giu, "");
const SUMMARY_FILENAME = ARM ? `lighthouse-summary-${ARM}.json` : "lighthouse-summary.json";

function median(values: number[]): number | null {
  const usable = values.filter((value): value is number => Number.isFinite(value)).sort((a, b) => a - b);
  if (usable.length === 0) return null;
  const middle = Math.floor(usable.length / 2);
  return usable.length % 2 === 1
    ? usable[middle]
    : (usable[middle - 1] + usable[middle]) / 2;
}

type SampledMetrics = {
  route: "/" | "/dashboard";
  finalUrl: string;
  iterations: number;
  /** Passes Lighthouse itself failed to complete; recorded rather than hidden. */
  droppedPasses: number;
  median: Record<string, number | null>;
  /*
   * `sampleCount` is per metric, not per route: a pass can record a route while
   * failing to report one audit. Without it a median computed from two of three
   * passes would be indistinguishable from a full one.
   */
  sampleCount: Record<string, number>;
  spread: Record<string, { min: number | null; max: number | null; range: number | null }>;
  samples: MetricSummary[];
};

const SAMPLED_KEYS = [
  "performanceScore",
  "lcpMs",
  "cls",
  "tbtMs",
  "fcpMs",
  "speedIndexMs",
  "transferredBytes",
  "scriptTransferredBytes",
] as const;

function sampleRoute(options: {
  route: "/" | "/dashboard";
  url: string;
  outputName: string;
  expectedPathname: string;
  cookieHeader?: string;
}): SampledMetrics {
  const samples: MetricSummary[] = [];
  let dropped = 0;
  for (let index = 0; index < ITERATIONS; index += 1) {
    const pass = runLighthouse({
      ...options,
      outputName: ARM
        ? `${options.outputName}-${ARM}-run${index + 1}`
        : `${options.outputName}-run${index + 1}`,
    });
    if (!pass) {
      dropped += 1;
      continue;
    }
    const { summary } = pass;
    /*
     * Every sample is checked, not just the first. If the synthetic harness
     * session lapses or the loopback double resets mid-sampling, `/dashboard`
     * redirects to the much lighter sign-in page; Lighthouse would measure that
     * happily and its low LCP would be folded into the median while the test
     * stayed green — manufacturing exactly the kind of "improvement" this
     * harness exists to detect.
     */
    expect(
      new URL(summary.finalUrl).pathname,
      `sample ${index + 1} for ${options.route} measured ${summary.finalUrl}`,
    ).toBe(options.expectedPathname);
    samples.push(summary);
  }

  const medianValues: Record<string, number | null> = {};
  const sampleCount: Record<string, number> = {};
  const spread: SampledMetrics["spread"] = {};
  for (const key of SAMPLED_KEYS) {
    const values = samples
      .map((sample) => sample[key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    medianValues[key] = median(values);
    sampleCount[key] = values.length;
    const min = values.length ? Math.min(...values) : null;
    const max = values.length ? Math.max(...values) : null;
    spread[key] = {
      min,
      max,
      range: min !== null && max !== null ? max - min : null,
    };
  }

  /*
   * A run that records no timing or no byte weight is not evidence, and an
   * attached summary full of nulls would read as one. Fail loudly instead.
   */
  for (const key of ["lcpMs", "tbtMs", "scriptTransferredBytes"] as const) {
    expect(
      sampleCount[key],
      `${options.route} recorded no usable ${key} in ${ITERATIONS} passes (${dropped} pass(es) failed inside Lighthouse itself)`,
    ).toBeGreaterThan(0);
  }

  return {
    route: options.route,
    finalUrl: samples[0].finalUrl,
    iterations: ITERATIONS,
    droppedPasses: dropped,
    median: medianValues,
    sampleCount,
    spread,
    samples,
  };
}

async function attachSummary(testInfo: TestInfo, routes: SampledMetrics[]) {
  const payload = {
    method: {
      lighthouseVersion: LIGHTHOUSE_VERSION,
      formFactor: "mobile",
      throttlingMethod: "simulate",
      chromePathSource: "Playwright chromium executable",
      appMode: "authenticated against loopback Supabase double",
      build: "playwright.auth.config.ts production next build + next start",
      iterationsPerRoute: ITERATIONS,
      arm: ARM || null,
      loadingBoundaryPresent: existsSync(
        join(process.cwd(), "src", "app", "dashboard", "loading.tsx"),
      ),
      reported:
        "each metric is medianed independently across the per-route samples, so the `median` object is a per-metric summary and not a replay of any single pass; `spread` gives the observed min/max/range and `sampleCount` the usable passes per metric, so a before/after difference can be compared against this harness's own noise floor",
    },
    git: {
      githubSha: process.env.GITHUB_SHA ?? null,
      githubHeadRef: process.env.GITHUB_HEAD_REF ?? null,
    },
    routes,
  };
  const summaryPath = join(OUTPUT_DIR, SUMMARY_FILENAME);
  writeFileSync(summaryPath, JSON.stringify(payload, null, 2), "utf8");
  await testInfo.attach(ARM ? `lighthouse-summary-${ARM}` : "lighthouse-summary", {
    body: Buffer.from(JSON.stringify(payload, null, 2)),
    contentType: "application/json",
  });
}

test("canonical root and authenticated dashboard record production-build mobile Lighthouse evidence", async ({
  page,
}, testInfo) => {
  // Each route is sampled ITERATIONS times and one Lighthouse pass is capped at
  // 180 s, so the ceiling scales with the sample count rather than a fixed guess.
  test.setTimeout(ITERATIONS * 2 * 190_000);
  const baseURL = String(testInfo.project.use.baseURL ?? "http://127.0.0.1:3300");

  // Canonical public root: authenticated build, no session cookie. The proxy must
  // retain the public fast path and render the real landing route at `/`.
  const root = sampleRoute({
    route: "/",
    url: new URL("/", baseURL).toString(),
    outputName: "lighthouse-root",
    expectedPathname: "/",
  });

  await seedServer();
  await signIn(page);
  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  expect(cookieHeader.length).toBeGreaterThan(0);

  // Authenticated canonical home: same production build and Lighthouse mobile
  // profile, with only the synthetic loopback harness cookie forwarded.
  const dashboard = sampleRoute({
    route: "/dashboard",
    url: new URL("/dashboard", baseURL).toString(),
    outputName: "lighthouse-dashboard",
    expectedPathname: "/dashboard",
    cookieHeader,
  });

  await attachSummary(testInfo, [root, dashboard]);
  await assertNoUnservedRequests();
});
