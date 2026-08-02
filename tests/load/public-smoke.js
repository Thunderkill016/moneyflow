import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const profileName = __ENV.LOAD_PROFILE || "smoke";
const targetKind = __ENV.LOAD_TEST_TARGET || "local";
const target = new URL(baseUrl);
const isLocal = ["127.0.0.1", "localhost", "::1"].includes(target.hostname);
const approvedTargetHost = __ENV.APPROVED_TARGET_HOST || "";
const deploymentSha = __ENV.DEPLOYMENT_SHA || "local";

if (isLocal) {
  if (targetKind !== "local") {
    throw new Error("Local targets must use LOAD_TEST_TARGET=local");
  }
} else {
  if (__ENV.ALLOW_REMOTE_LOAD_TEST !== "yes") {
    throw new Error("Remote load test blocked; set ALLOW_REMOTE_LOAD_TEST=yes after approval");
  }
  if (!["preview", "staging"].includes(targetKind)) {
    throw new Error("Remote public load tests are limited to preview or staging");
  }
  if (!approvedTargetHost || approvedTargetHost !== target.hostname) {
    throw new Error("APPROVED_TARGET_HOST must exactly match the target hostname");
  }
  if (!/^[0-9a-f]{7,40}$/i.test(deploymentSha)) {
    throw new Error("DEPLOYMENT_SHA must be the exact 7-40 character Git commit SHA");
  }
}

const profiles = {
  smoke: [
    { duration: "15s", target: 5 },
    { duration: "15s", target: 0 },
  ],
  baseline: [
    { duration: "30s", target: 5 },
    { duration: "1m", target: 10 },
    { duration: "30s", target: 0 },
  ],
  ramp: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 25 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
};

const stages = profiles[profileName];
if (!stages) {
  throw new Error("LOAD_PROFILE must be smoke, baseline, or ramp");
}

export const options = {
  scenarios: {
    public_routes: {
      executor: "ramping-vus",
      startVUs: 0,
      stages,
      gracefulRampDown: "15s",
      gracefulStop: "15s",
    },
  },
  thresholds: {
    "http_req_failed{surface:public_route}": [
      { threshold: "rate<0.01", abortOnFail: true, delayAbortEval: "30s" },
    ],
    "http_req_duration{surface:public_route}": ["p(95)<800", "p(99)<1500"],
    "checks{surface:public_route}": ["rate>0.99"],
  },
};

const routes = ["/", "/landing", "/privacy"];

export default function publicRoutes() {
  for (const route of routes) {
    const response = http.get(`${baseUrl}${route}`, {
      redirects: 0,
      headers: {
        "X-MoneyFlow-Load-Deployment": deploymentSha,
      },
      tags: {
        surface: "public_route",
        route,
        profile: profileName,
      },
    });

    check(
      response,
      {
        "public route returns HTTP 200": (result) => result.status === 200,
        "public route remains cache-safe": (result) =>
          !/private|no-store/i.test(result.headers["Cache-Control"] || ""),
      },
      { surface: "public_route", route },
    );
  }

  sleep(1);
}
