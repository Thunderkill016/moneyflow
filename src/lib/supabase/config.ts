const PLACEHOLDER_URL = "https://your-project-ref.supabase.co";
const PLACEHOLDER_KEY = "sb_publishable_replace_me";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !url ||
    !publishableKey ||
    url === PLACEHOLDER_URL ||
    publishableKey === PLACEHOLDER_KEY
  ) {
    return null;
  }

  return { url, publishableKey };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
