import type { NextConfig } from "next";

// Where relative /api/* calls are proxied to. Set BACKEND_URL on Vercel to the
// Render backend URL; docker-compose sets it to http://backend:8000.
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // FastAPI routes like /api/portfolios/ need their trailing slash. By default
  // Next strips it (308), FastAPI then redirects to its own host, and the
  // browser blocks that cross-origin redirect. Keep slashes as sent.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*/",
        destination: `${BACKEND_URL}/api/:path*/`,
      },
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
