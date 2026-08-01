import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security-headers.ts";

const nextConfig: NextConfig = {
  // Tree-shake lucide icons (icons.tsx imports many named exports).
  experimental: {
    optimizePackageImports: ["lucide-react"],
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
