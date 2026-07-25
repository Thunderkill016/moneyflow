const isVercelBuild = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);

if (!isVercelBuild) {
  console.log("Deployment env guard skipped outside Vercel.");
  process.exit(0);
}

const required = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

const invalidNames = Object.entries(required)
  .filter(([, value]) => {
    const normalized = value?.trim().toLowerCase() ?? "";
    return (
      !normalized ||
      normalized.includes("placeholder") ||
      normalized.includes("replace_me") ||
      normalized === "changeme"
    );
  })
  .map(([name]) => name);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
let siteUrlInvalid = false;
try {
  const parsed = new URL(siteUrl);
  siteUrlInvalid =
    parsed.protocol !== "https:" ||
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.pathname !== "/" ||
    Boolean(parsed.search || parsed.hash);
} catch {
  siteUrlInvalid = true;
}

if (siteUrlInvalid && !invalidNames.includes("NEXT_PUBLIC_SITE_URL")) {
  invalidNames.push("NEXT_PUBLIC_SITE_URL");
}

if (invalidNames.length > 0) {
  console.error(
    `Authenticated deployment blocked: configure ${invalidNames.join(", ")} in Vercel Project Settings.`,
  );
  process.exit(1);
}

console.log("Authenticated deployment environment is configured.");
