import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export',
  // distDir: 'dist',
  trailingSlash: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
    ],
  },
};

export default nextConfig;
