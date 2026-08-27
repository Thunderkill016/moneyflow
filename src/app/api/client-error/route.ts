import { NextResponse } from "next/server";
import {
  MAX_REPORT_BYTES,
  reportTooLarge,
  sanitizeIncomingReport,
} from "@/lib/client-error-report";

export const runtime = "nodejs";

/*
 * Where a client error goes to be seen.
 *
 * Before this route, `logClientError` wrote to `console.error` in the browser —
 * a place nobody reads. A user hitting a bug in production was invisible.
 *
 * The report is written to the server console so it lands in the deployment
 * platform's runtime logs. That is deliberately unglamorous: no error-tracking
 * vendor, so no new dependency, no new data processor to disclose, and a
 * finance app's error payloads never leave for a third party.
 *
 * The route is public because errors happen before and outside authentication.
 * That makes it a write amplification surface, so it accepts a small body,
 * re-sanitises everything, and returns 204 in every case — an attacker learns
 * nothing from the response, and a legitimate client never has an error path
 * for its own error reporting.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (reportTooLarge(request.headers.get("content-length"))) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const text = await request.text();
    if (text.length > MAX_REPORT_BYTES) return new NextResponse(null, { status: 204 });

    const report = sanitizeIncomingReport(JSON.parse(text));
    if (!report) return new NextResponse(null, { status: 204 });

    /*
     * One line, structured, prefixed so it can be filtered out of the noise.
     * `console.error` on the server is the platform's log ingestion path.
     */
    console.error("[client-error]", JSON.stringify(report));
  } catch {
    // Malformed JSON, an aborted body, anything else — reporting an error must
    // never itself become an error the user sees.
  }

  return new NextResponse(null, { status: 204 });
}
