import type { NextConfig } from "next";

// The browser only ever talks to this Next app. These rewrites forward API calls to the
// Python gateways server-side, so there is no CORS to configure.
const APPRENTICE_URL = (process.env.APPRENTICE_URL || "http://localhost:8000").replace(/\/+$/, "");
const SUPPORT_URL = (process.env.SUPPORT_URL || "http://localhost:8001").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  devIndicators: false,
  // Shown in "Gateway not reachable at ..." messages.
  env: {
    NEXT_PUBLIC_APPRENTICE_URL: APPRENTICE_URL,
    NEXT_PUBLIC_SUPPORT_URL: SUPPORT_URL,
  },
  async rewrites() {
    return [
      { source: "/gw/:path*", destination: `${APPRENTICE_URL}/:path*` },
      { source: "/support-gw/:path*", destination: `${SUPPORT_URL}/:path*` },
    ];
  },
};

export default nextConfig;
