import { NextResponse } from "next/server";
import { BUILD_COMMIT, shortBuildId } from "@/lib/build-identity";

export const runtime = "nodejs";
/*
 * Never cached. A health check served from a cache reports the health of
 * whatever was true when it was cached, which is the one thing it must not do.
 */
export const dynamic = "force-dynamic";

/*
 * Liveness endpoint.
 *
 * Deliberately shallow: it answers "is this deployment serving requests", not
 * "is everything working". A check that touched the database would fail during
 * provider maintenance and page someone about a problem they cannot fix, and it
 * would also hand an unauthenticated caller a way to probe database health.
 *
 * It carries the build id so an uptime monitor's history records which build
 * was live at any moment — the join between a user's bug report and the code
 * that produced it.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    {
      status: "ok",
      build: shortBuildId(),
      commit: BUILD_COMMIT ?? null,
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
