export function normalizeDisplayName(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 80);
  return normalized || null;
}

export function resolveDisplayName(profileName: unknown, userMetadata: unknown) {
  const profile = normalizeDisplayName(profileName);
  if (profile) return profile;
  if (!userMetadata || typeof userMetadata !== "object") return null;
  const metadata = userMetadata as Record<string, unknown>;
  return normalizeDisplayName(metadata.full_name) ?? normalizeDisplayName(metadata.name);
}
