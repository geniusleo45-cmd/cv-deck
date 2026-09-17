import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vendor listings can use any HTTPS image host. HTTP sources remain blocked.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
