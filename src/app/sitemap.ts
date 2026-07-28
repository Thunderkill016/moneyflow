import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

// See robots.ts: getSiteOrigin() must validate the deployment's real runtime
// env, not whatever happens to be present on the build machine.
export const dynamic = "force-dynamic";

/** Only genuinely public, indexable marketing/auth pages — see robots.ts for the matching disallow list. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  const now = new Date();

  return [
    { url: origin, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${origin}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
