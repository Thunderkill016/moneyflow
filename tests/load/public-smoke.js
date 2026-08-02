import http from "k6/http";
import { check, fail, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const vus = Number.parseInt(__ENV.VUS || "10", 10);
const duration = __ENV.DURATION || "30s";

if (!Number.isInteger(vus) || vus < 1 || vus > 50) {
  throw new Error("VUS must be an integer between 1 and 50");
}

const target = new URL(baseUrl);
const isLocal = ["127.0.0.1", "localhost", "::1"].includes(target.hostname);

if (!isLocal && __ENV.ALLOW_REMOTE_LOAD_TEST !== "yes") {
  throw new Error(
    "Remote load test blocked. Set ALLOW_REMOTE_LOAD_TEST=yes only for an approved target.",
  );
}

export const options = {
  vus,
  duration,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

const routes = ["/", "/landing", "/privacy"];

export default function publicSmoke() {
  for (const route of routes) {
    const response = http.get(`${baseUrl}${route}`, {
      redirects: 0,
      tags: { route },
    });

    const passed = check(response, {
      "public route is successful": (result) => result.status === 200,
      "public route is cache-safe": (result) =>
        !/private|no-store/i.test(result.headers["Cache-Control"] || ""),
    });

    if (!passed && isLocal) {
      fail(`Public route contract failed for ${route}`);
    }
  }

  sleep(1);
}
