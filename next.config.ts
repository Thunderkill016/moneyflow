import type { NextConfig } from "next";
import { resolveBuildCommit } from "./src/lib/build-identity.ts";
import { buildSecurityHeaders } from "./src/lib/security-headers.ts";

/*
 * The deployed commit, baked in so the app can name its own build.
 *
 * Resolution lives in `resolveBuildCommit`: platform git variables first,
 * explicit MF_BUILD_COMMIT for manual CLI/prebuilt deploys, fail-closed
 * when a Vercel production build would otherwise ship without provenance.
 */
const resolvedBuildCommit = resolveBuildCommit(process.env);
if (resolvedBuildCommit.error) {
  throw new Error(resolvedBuildCommit.error);
}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_COMMIT: resolvedBuildCommit.commit ?? "" },
  // Tree-shake lucide icons (icons.tsx imports many named exports).
  experimental: {
    optimizePackageImports: ["lucide-react"],
    /* A restore uploads a whole MoneyFlow archive through a server action, and
       the 1 MB default would cap that at roughly 1,300 transactions. 4 MB is as
       far as this is worth raising: the hosting platform caps serverless request
       bodies at about 4.5 MB, so anything larger fails in transit no matter what
       this says. The Backup surface refuses a bigger file up front. */
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Production: fewer source maps shipped to browser tooling by default.
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...buildSecurityHeaders()],
      },
      {
        // Voice capture is the only surface that uses the microphone
        // (browser Web Speech API recognition). Every other route keeps it blocked.
        // Later matching rules override earlier ones for the same key.
        source: "/capture/voice",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
