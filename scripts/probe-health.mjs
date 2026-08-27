/*
 * Uptime probe for the deployed health endpoint.
 *
 * `/api/health` has existed since PR #498 and nothing called it. A health check
 * nobody reads is the same as no health check: if the site stops serving at 2am,
 * the thing that tells the owner is a user.
 *
 * The judgement lives in `evaluateHealthProbe`, which is pure and unit-tested, so
 * the reasons a deployment is called unhealthy are readable without a network.
 */

/** Default origin is the deployment the project actually serves from today. */
export const DEFAULT_PROBE_ORIGIN = "https://mfvn.vercel.app";

/** A build id is either a 7-char commit prefix or the literal stand-in for "unset". */
const BUILD_ID = /^[0-9a-f]{7}$/u;

/**
 * @param {{ status: number, headers: Record<string, string>, body: string }} response
 * @returns {{ ok: boolean, failures: string[], build: string | null }}
 */
export function evaluateHealthProbe(response) {
  const failures = [];

  if (response.status !== 200) {
    failures.push(`expected HTTP 200, got ${response.status}`);
  }

  /*
   * A cached "ok" is worse than no probe: it keeps reporting the health of
   * whatever was true when it was stored, so an outage reads as healthy.
   */
  const cacheControl = String(response.headers["cache-control"] ?? "");
  if (!/no-store/u.test(cacheControl)) {
    failures.push(`cache-control must contain no-store, got "${cacheControl || "(absent)"}"`);
  }

  let payload = null;
  try {
    payload = JSON.parse(response.body);
  } catch {
    failures.push("body is not JSON");
  }

  let build = null;
  if (payload && typeof payload === "object") {
    if (payload.status !== "ok") {
      failures.push(`status must be "ok", got ${JSON.stringify(payload.status ?? null)}`);
    }
    build = typeof payload.build === "string" ? payload.build : null;
    if (build === null) {
      failures.push("build id is missing");
    } else if (build === "dev") {
      // Not an outage, but the deployment cannot be traced back to a commit, so a
      // problem report from it names nothing. Worth waking someone for.
      failures.push('build id is "dev": the deployment was built without a commit');
    } else if (!BUILD_ID.test(build)) {
      failures.push(`build id "${build}" is not a 7-character commit prefix`);
    }
  }

  return { ok: failures.length === 0, failures, build };
}

async function runCli() {
  const origin = (process.env.PRODUCTION_ORIGIN || DEFAULT_PROBE_ORIGIN).replace(/\/+$/u, "");
  const url = `${origin}/api/health`;
  // Long enough that a slow cold start is not called an outage, short enough that
  // a hung deployment is reported rather than waited on.
  const TIMEOUT_MS = 20_000;

  let response;
  try {
    const raw = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    response = {
      status: raw.status,
      headers: Object.fromEntries(raw.headers),
      body: await raw.text(),
    };
  } catch (error) {
    console.error(`health probe ${url} — unreachable: ${String(error)}`);
    process.exitCode = 1;
    return;
  }

  const result = evaluateHealthProbe(response);
  console.log(
    `health probe ${url} — ${result.ok ? "HEALTHY" : "UNHEALTHY"}; build: ${result.build ?? "none"}`,
  );
  for (const failure of result.failures) console.error(`failure: ${failure}`);
  process.exitCode = result.ok ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await runCli();
