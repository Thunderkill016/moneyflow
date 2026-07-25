const force = process.argv.includes("--force");
const isVercelBuild = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
const requiresHttps = isVercelBuild || process.env.NODE_ENV === "production";

if (!isVercelBuild && !force) {
  console.log("Deployment env guard skipped outside Vercel. Use --force to validate explicitly.");
  process.exit(0);
}

const required = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

function isMissingOrTemplate(value) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return (
    !normalized ||
    normalized.includes("placeholder") ||
    normalized.includes("replace_me") ||
    normalized === "changeme"
  );
}

function parseOrigin(value) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (url.pathname !== "/" || url.search || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

function parseLegacyHosts(value) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[\s,]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

const errors = [];
for (const [name, value] of Object.entries(required)) {
  if (isMissingOrTemplate(value)) errors.push(`${name} is missing or still a template value`);
}

const supabaseUrl = parseOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
if (!supabaseUrl && !isMissingOrTemplate(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
  errors.push("NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTP(S) origin");
} else if (supabaseUrl && supabaseUrl.protocol !== "https:") {
  errors.push("NEXT_PUBLIC_SUPABASE_URL must use HTTPS");
}

const siteUrl = parseOrigin(process.env.NEXT_PUBLIC_SITE_URL);
if (!siteUrl && !isMissingOrTemplate(process.env.NEXT_PUBLIC_SITE_URL)) {
  errors.push("NEXT_PUBLIC_SITE_URL must be an absolute origin without a path, query string or hash");
} else if (siteUrl && requiresHttps && siteUrl.protocol !== "https:") {
  errors.push("NEXT_PUBLIC_SITE_URL must use HTTPS for hosted or production builds");
}

const legacyHosts = parseLegacyHosts(process.env.LEGACY_SITE_HOSTS);
for (const host of legacyHosts) {
  if (host.includes("://") || host.includes("/") || host.includes("@") || host.includes(":")) {
    errors.push(`LEGACY_SITE_HOSTS contains an invalid hostname: ${host}`);
  }
}
if (siteUrl && legacyHosts.includes(siteUrl.hostname.toLowerCase())) {
  errors.push("LEGACY_SITE_HOSTS must not contain the configured site hostname");
}

if (errors.length > 0) {
  console.error("Deployment configuration is invalid:");
  for (const error of errors) console.error(`- ${error}`);
  console.error("Configure deployment values in Vercel Project Settings, not in source control.");
  process.exit(1);
}

console.log("Deployment configuration contract passed.");
