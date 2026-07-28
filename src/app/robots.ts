import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

// getSiteOrigin() validates its production HTTPS requirement against the
// deployment's actual env, which only exists at request time — a build-time
// evaluation would validate the wrong (build machine) environment instead.
export const dynamic = "force-dynamic";

/**
 * Only the public marketing/auth surface is crawlable. Everything past
 * auth shows a user's own (or demo) financial data, not marketing content,
 * so it is disallowed rather than given per-page noindex metadata.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/privacy"],
      disallow: [
        "/dashboard",
        "/insights",
        "/transactions",
        "/accounts",
        "/budgets",
        "/commitments",
        "/goals",
        "/income-templates",
        "/capture",
        "/categories",
        "/imports",
        "/inbox",
        "/onboarding",
        "/reports",
        "/rules",
        "/settings",
        "/timeline",
        "/landing",
        "/auth",
        "/forgot-password",
        "/update-password",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
