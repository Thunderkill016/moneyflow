import http from "k6/http";
import { check, fail, sleep } from "k6";

function requireEnv(name) {
  const value = __ENV[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function parseDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must use YYYY-MM-DD`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${name} is not a valid date`);
  }
  return parsed;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
const publishableKey = requireEnv("SUPABASE_PUBLISHABLE_KEY");
const email = requireEnv("LOAD_TEST_USER_EMAIL");
const password = requireEnv("LOAD_TEST_USER_PASSWORD");
const deploymentSha = requireEnv("DEPLOYMENT_SHA");
const targetKind = __ENV.LOAD_TEST_TARGET || "local";
const profileName = __ENV.LOAD_PROFILE || "smoke";
const today = parseDate(requireEnv("DASHBOARD_TODAY"), "DASHBOARD_TODAY");
const transactionStart = new Date(today);
transactionStart.setUTCDate(transactionStart.getUTCDate() - 45);

const target = new URL(supabaseUrl);
const isLocal = ["127.0.0.1", "localhost", "::1"].includes(target.hostname);
const approvedTargetHost = __ENV.APPROVED_TARGET_HOST || "";

if (__ENV.LOAD_TEST_USER_CONFIRMED_SYNTHETIC !== "yes") {
  throw new Error(
    "LOAD_TEST_USER_CONFIRMED_SYNTHETIC=yes is required; never use a real user account",
  );
}

if (!/^[0-9a-f]{7,40}$/i.test(deploymentSha)) {
  throw new Error("DEPLOYMENT_SHA must be the exact 7-40 character Git commit SHA");
}

if (isLocal) {
  if (targetKind !== "local") {
    throw new Error("Local Supabase targets must use LOAD_TEST_TARGET=local");
  }
} else {
  if (__ENV.ALLOW_REMOTE_LOAD_TEST !== "yes") {
    throw new Error("Remote load test blocked; set ALLOW_REMOTE_LOAD_TEST=yes after approval");
  }
  if (!['preview', 'staging'].includes(targetKind)) {
    throw new Error("Remote authenticated load tests are limited to preview or staging");
  }
  if (!approvedTargetHost || approvedTargetHost !== target.hostname) {
    throw new Error("APPROVED_TARGET_HOST must exactly match the Supabase target hostname");
  }
}

const profiles = {
  smoke: [
    { duration: "15s", target: 1 },
    { duration: "5s", target: 0 },
  ],
  baseline: [
    { duration: "30s", target: 5 },
    { duration: "1m", target: 10 },
    { duration: "30s", target: 0 },
  ],
  ramp: [
    { duration: "30s", target: 5 },
    { duration: "1m", target: 10 },
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
    dashboard_rpc: {
      executor: "ramping-vus",
      startVUs: 0,
      stages,
      gracefulRampDown: "15s",
      gracefulStop: "15s",
    },
  },
  thresholds: {
    "http_req_failed{endpoint:dashboard_rpc}": [
      { threshold: "rate<0.01", abortOnFail: true, delayAbortEval: "30s" },
    ],
    "http_req_duration{endpoint:dashboard_rpc}": ["p(95)<800", "p(99)<1500"],
    "checks{endpoint:dashboard_rpc}": ["rate>0.99"],
  },
};

export function setup() {
  const response = http.post(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        apikey: publishableKey,
        "Content-Type": "application/json",
        "X-MoneyFlow-Load-Deployment": deploymentSha,
      },
      tags: { endpoint: "auth_setup" },
    },
  );

  let body = null;
  try {
    body = response.json();
  } catch {
    body = null;
  }

  const authenticated = check(response, {
    "synthetic user authentication succeeds": (result) => result.status === 200,
    "authentication returns an access token": () =>
      typeof body?.access_token === "string" && body.access_token.length > 0,
  });

  if (!authenticated) {
    fail("Synthetic-user authentication failed; dashboard load did not start");
  }

  return { accessToken: body.access_token };
}

export default function dashboardRpc(data) {
  const response = http.post(
    `${supabaseUrl}/rest/v1/rpc/get_dashboard_bundle`,
    JSON.stringify({
      p_today: formatDate(today),
      p_transaction_start: formatDate(transactionStart),
      p_recent_limit: 5,
    }),
    {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${data.accessToken}`,
        "Content-Type": "application/json",
        "X-MoneyFlow-Load-Deployment": deploymentSha,
      },
      tags: { endpoint: "dashboard_rpc", profile: profileName },
    },
  );

  let payload = null;
  try {
    payload = response.json();
  } catch {
    payload = null;
  }

  check(
    response,
    {
      "dashboard RPC returns HTTP 200": (result) => result.status === 200,
      "dashboard RPC returns the bounded bundle": () =>
        payload !== null &&
        Array.isArray(payload.transactions) &&
        Array.isArray(payload.accounts) &&
        Array.isArray(payload.categories) &&
        Array.isArray(payload.budgets) &&
        Array.isArray(payload.commitments) &&
        Array.isArray(payload.income_templates) &&
        Array.isArray(payload.goals) &&
        Number.isInteger(payload.pending_inbox_count),
    },
    { endpoint: "dashboard_rpc" },
  );

  sleep(1);
}
