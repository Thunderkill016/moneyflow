import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security-headers.ts";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
