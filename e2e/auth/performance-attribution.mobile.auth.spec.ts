import { expect, test, type TestInfo } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertNoUnservedRequests, seedServer, signIn } from "./harness";

/*
 * #403 attribution probe — mechanism, not timing.
 *
 * `docs/performance-budgets.md` records that `/dashboard` FCP is bimodal: a low
 * mode near 1077 ms and a high mode near 1690 ms with nothing between, appearing
 * on some runs and not others while the code is unchanged. Lighthouse can show
 * that split but cannot explain it: Lighthouse 13.4.1 ships no
 * `largest-contentful-paint-element` or first-paint-element audit at all — 165
 * audits, none of them naming a paint node — so the harness genuinely cannot
 * record which element painted. The mechanism has to be observed with a
 * different instrument.
 *
 * This spec is that instrument. It navigates `/dashboard` repeatedly and records,
 * per navigation, whether the loading boundary's own text actually rendered and
 * when first paint happened. Correlating those two answers the real question —
 * is the early mode the loading text, or something else — which no amount of
 * extra Lighthouse sampling can settle.
 *
 * It does NOT run in ordinary CI. `PERF_ATTRIBUTION` gates it, so the routine
 * Browser-smoke shard is unaffected; the dispatch-only attribution workflow sets
 * the flag. Skipped rather than excluded by filename because it needs the
 * authenticated config's production build and loopback double.
 */

const OUTPUT_DIR = join(process.cwd(), "output", "playwright-auth", "performance");
const LOADING_TEXT = "Đang tải sổ thu chi";
const LOADING_BOUNDARY_PATH = join(process.cwd(), "src", "app", "dashboard", "loading.tsx");

function resolveNavigations(): number {
  const raw = Number.parseInt(process.env.PERF_ATTRIBUTION_NAVIGATIONS ?? "", 10);
  return Number.isInteger(raw) && raw > 0 ? raw : 10;
}

type Observation = {
  index: number;
  /*
   * Whether the boundary's text was ever present in the DOM during this
   * navigation. This is the attribution signal: the low FCP mode should coincide
   * with the boundary having rendered, and the high mode with it never appearing.
   */
  loadingTextObserved: boolean;
  firstPaintMs: number | null;
  firstContentfulPaintMs: number | null;
  domContentLoadedMs: number | null;
  finalPathname: string;
};

test.describe("#403 FCP attribution", () => {
  test.skip(
    !process.env.PERF_ATTRIBUTION,
    "attribution probe runs only in the dispatch-only #403 workflow (set PERF_ATTRIBUTION)",
  );

  test("records whether the dashboard loading boundary is what paints first", async ({
    page,
  }, testInfo: TestInfo) => {
    const navigations = resolveNavigations();
    // Each navigation is a full document load against a throttle-free loopback
    // server; 20 s per navigation is generous and keeps the ceiling proportional.
    test.setTimeout(navigations * 20_000 + 120_000);

    await seedServer();
    await signIn(page);

    const boundaryPresent = existsSync(LOADING_BOUNDARY_PATH);
    const observations: Observation[] = [];

    for (let index = 1; index <= navigations; index += 1) {
      /*
       * Watch for the boundary text from before navigation starts. Polling after
       * load would miss it entirely, because the boundary is replaced as soon as
       * the server data resolves — which is exactly the case being measured.
       */
      const sawLoadingText = page
        .getByText(LOADING_TEXT, { exact: false })
        .waitFor({ state: "attached", timeout: 15_000 })
        .then(() => true)
        .catch(() => false);

      await page.goto("/dashboard", { waitUntil: "load" });
      const loadingTextObserved = await sawLoadingText;

      const paint = await page.evaluate(() => {
        const entries = performance.getEntriesByType("paint");
        const byName = (name: string) =>
          entries.find((entry) => entry.name === name)?.startTime ?? null;
        const nav = performance.getEntriesByType("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined;
        return {
          firstPaint: byName("first-paint"),
          firstContentfulPaint: byName("first-contentful-paint"),
          domContentLoaded: nav?.domContentLoadedEventEnd ?? null,
        };
      });

      observations.push({
        index,
        loadingTextObserved,
        firstPaintMs: paint.firstPaint,
        firstContentfulPaintMs: paint.firstContentfulPaint,
        domContentLoadedMs: paint.domContentLoaded,
        finalPathname: new URL(page.url()).pathname,
      });

      /*
       * Same guard as the Lighthouse harness: a lapsed session would silently
       * redirect to the much lighter sign-in page and its fast paint would be
       * recorded as a dashboard observation.
       */
      expect(
        observations[observations.length - 1].finalPathname,
        `navigation ${index} ended on an unexpected route`,
      ).toBe("/dashboard");

      // Force a cold document load for the next sample rather than a warm
      // client-side transition, which would not exercise the boundary at all.
      await page.goto("about:blank");
    }

    const withText = observations.filter((o) => o.loadingTextObserved);
    const withoutText = observations.filter((o) => !o.loadingTextObserved);
    const fcpValues = (list: Observation[]) =>
      list
        .map((o) => o.firstContentfulPaintMs)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const summarise = (list: Observation[]) => {
      const values = fcpValues(list);
      return {
        navigations: list.length,
        fcpSampleCount: values.length,
        fcpMinMs: values.length ? Math.min(...values) : null,
        fcpMaxMs: values.length ? Math.max(...values) : null,
        fcpMeanMs: values.length
          ? values.reduce((sum, v) => sum + v, 0) / values.length
          : null,
      };
    };

    const payload = {
      method: {
        instrument:
          "Playwright navigation with PerformanceObserver paint entries — NOT Lighthouse, and not comparable to the Lighthouse tables in docs/performance-budgets.md",
        why: "Lighthouse 13.4.1 exposes no paint-element audit, so which element paints first cannot be read from its reports",
        throttling:
          "none — loopback server, no CPU or network emulation, so absolute values are not budget evidence; only the split between arms is",
        build: "playwright.auth.config.ts production next build + next start",
        appMode: "authenticated against loopback Supabase double",
        navigations,
      },
      arm: {
        label: process.env.PERF_ARM ?? null,
        loadingBoundaryPresent: boundaryPresent,
      },
      git: {
        githubSha: process.env.GITHUB_SHA ?? null,
        githubHeadRef: process.env.GITHUB_HEAD_REF ?? null,
      },
      modeSplit: {
        loadingTextObserved: summarise(withText),
        loadingTextNotObserved: summarise(withoutText),
      },
      observations,
    };

    /*
     * The control arm must genuinely lack the boundary. If the file is present
     * and its text never rendered in any navigation, the run cannot attribute
     * anything and saying so beats attaching an ambiguous artifact.
     */
    if (boundaryPresent) {
      expect(
        withText.length,
        `the loading boundary exists but never rendered in ${navigations} navigations, so this arm cannot attribute the FCP mode`,
      ).toBeGreaterThan(0);
    } else {
      expect(
        withText.length,
        "the boundary file is absent yet its text was observed, so the arms are not what they claim",
      ).toBe(0);
    }

    mkdirSync(OUTPUT_DIR, { recursive: true });
    const name = process.env.PERF_ARM
      ? `attribution-${process.env.PERF_ARM.replace(/[^a-z0-9-]/giu, "")}.json`
      : "attribution.json";
    const body = JSON.stringify(payload, null, 2);
    writeFileSync(join(OUTPUT_DIR, name), body, "utf8");
    await testInfo.attach(name, { body: Buffer.from(body), contentType: "application/json" });

    await assertNoUnservedRequests();
  });
});
