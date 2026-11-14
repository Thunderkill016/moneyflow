import type { NextConfig } from "next";
import { resolveBuildCommit, buildSecurityHeaders } from "./src/shared/build-security.ts";

const resolution = resolveBuildCommit(process.env);
if (resolution.error) {
  throw new Error(resolution.error);
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: resolution.commit ?? "",
  },
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
