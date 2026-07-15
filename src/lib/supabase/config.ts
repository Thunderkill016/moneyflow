/** Values from `.env.example` / CI that mean “demo mode, no real Supabase”. */
const PLACEHOLDER_URLS = new Set([
  "https://your-project-ref.supabase.co",
  "placeholder",
  "http://placeholder",
  "https://placeholder",
  "https://placeholder.supabase.co",
]);

const PLACEHOLDER_KEYS = new Set([
  "sb_publishable_replace_me",
  "placeholder",
]);

function isPlaceholderValue(value: string, known: Set<string>): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (known.has(trimmed) || known.has(lower)) return true;
  // Generic “placeholder*” / “changeme” / “replace_me” used in docs & CI.
  // Also catches https://placeholder.supabase.co and eyJ….placeholder JWT stubs.
  if (
    lower === "changeme" ||
    lower.includes("replace_me") ||
    lower.includes("placeholder")
  ) {
    return true;
  }
  return false;
}

/**
 * Real Supabase URL + publishable key, or `null` for demo / local without backend.
 * Treats missing env and common placeholder strings as unconfigured so
 * `NEXT_PUBLIC_SUPABASE_URL=placeholder` style builds run in demo mode.
 */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !url ||
    !publishableKey ||
    isPlaceholderValue(url, PLACEHOLDER_URLS) ||
    isPlaceholderValue(publishableKey, PLACEHOLDER_KEYS)
  ) {
    return null;
  }

  return { url: url.trim(), publishableKey: publishableKey.trim() };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
