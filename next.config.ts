import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Allow remote dev origins (for example, tailscale funnel/proxy hostnames)
  // to request internal /_next/* assets during local development.
  allowedDevOrigins: ["tzeusy.parrot-hen.ts.net"],
  basePath: process.env.BASE_PATH || "",
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.BASE_PATH || "",
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
