import { chromium, expect, test, type TestInfo } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
    throw new Error(
      `Lighthouse failed for ${route}: ${run.stderr || run.stdout || `exit ${run.status}`}`,
    );
  }

  const result = JSON.parse(readFileSync(outputPath, "utf8")) as LighthouseResult;
  return { outputPath, summary: summarize(route, result) };
}

async function attachSummary(testInfo: TestInfo, summaries: MetricSummary[]) {
  const payload = {
    method: {
      lighthouseVersion: LIGHTHOUSE_VERSION,
      formFactor: "mobile",
      throttlingMethod: "simulate",
      chromePathSource: "Playwright chromium executable",
      appMode: "authenticated against loopback Supabase double",
      build: "playwright.auth.config.ts production next build + next start",
    },
    git: {
      githubSha: process.env.GITHUB_SHA ?? null,
      githubHeadRef: process.env.GITHUB_HEAD_REF ?? null,
    },
    summaries,
  };
  const summaryPath = join(OUTPUT_DIR, "lighthouse-summary.json");
  writeFileSync(summaryPath, JSON.stringify(payload, null, 2), "utf8");
  await testInfo.attach("lighthouse-summary", {
    body: Buffer.from(JSON.stringify(payload, null, 2)),
    contentType: "application/json",
  });
}

test("canonical root and authenticated dashboard record production-build mobile Lighthouse evidence", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const baseURL = String(testInfo.project.use.baseURL ?? "http://127.0.0.1:3300");

  // Canonical public root: authenticated build, no session cookie. The proxy must
  // retain the public fast path and render the real landing route at `/`.
  const root = runLighthouse({
    route: "/",
    url: new URL("/", baseURL).toString(),
    outputName: "lighthouse-root",
  });
  expect(new URL(root.summary.finalUrl).pathname).toBe("/");

  await seedServer();
  await signIn(page);
  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  expect(cookieHeader.length).toBeGreaterThan(0);

  // Authenticated canonical home: same production build and Lighthouse mobile
  // profile, with only the synthetic loopback harness cookie forwarded.
  const dashboard = runLighthouse({
    route: "/dashboard",
    url: new URL("/dashboard", baseURL).toString(),
    outputName: "lighthouse-dashboard",
    cookieHeader,
  });
  expect(new URL(dashboard.summary.finalUrl).pathname).toBe("/dashboard");

  await attachSummary(testInfo, [root.summary, dashboard.summary]);
  await assertNoUnservedRequests();
});
